import { extractLegacyProperties } from './legacyPropertiesExtraction.js';
import { LEGACY_TYPE_MAPPING, LEGACY_FIELD_MAPPING, LEGACY_MANUAL_TARGETS, PROPERTIES_MIGRATION_VERSION, isLegacyCalculatedKey } from './legacyPropertiesMapping.js';
import { parsePageRecordContent, updatePageRecordContent, createPageStateIdentityFromContent } from '../core/pageRecord.js';
import { deepCloneData, deepFreeze, digestCanonicalData } from '../cardTypes/definitionIdentity.js';
import { CardTypeRegistry } from '../cardTypes/cardTypeRegistry.js';
import { BUNDLED_CARD_TYPE_DEFINITIONS, BUNDLED_FIELD_SET_DEFINITIONS } from '../cardTypes/definitions/bundledDefinitions.js';
import { validateVariableValue } from '../schema/cardVariablesSchema.js';
import { createCardVariableSnapshot } from '../variables/cardVariableStore.js';
import { createLegacyCustomIdentities } from './legacyCustomFields.js';

export function migrationRegistry() {
  return new CardTypeRegistry({ bundledTypes: BUNDLED_CARD_TYPE_DEFINITIONS, bundledFieldSets: BUNDLED_FIELD_SET_DEFINITIONS });
}

export async function preparePropertiesMigration(page, { pages = [], registry = migrationRegistry(), ...reader } = {}) {
  const extraction = extractLegacyProperties(page, reader);
  const customIdentities = await createLegacyCustomIdentities(page.id, extraction);
  return planExtractedProperties(page, extraction, { pages, registry, customIdentities });
}

// Pure mapping boundary; the orchestration always supplies the real extractor.
export function planExtractedProperties(page, extraction, { pages = [], registry = migrationRegistry(), customIdentities = {} } = {}) {
  const record = parsePageRecordContent(page.content, { generateId: false });
  const plan = { kind: 'PropertiesMigrationPlan', version: PROPERTIES_MIGRATION_VERSION,
    pageId: record.id, path: page.path || null, sourceType: record.type,
    expectedBase: extraction.sourceIdentity, sourceContent: page.content,
    targetType: Object.hasOwn(LEGACY_TYPE_MAPPING, record.type) ? LEGACY_TYPE_MAPPING[record.type] : null, schemaVersion: 1,
    status: 'ready', issues: [...extraction.issues], evidence: [], referenceGuards: [], envelope: null };
  const block = code => { plan.issues.push({ code }); plan.status = 'blocked'; };
  if (extraction.mode !== 'legacy') {
    const snapshot = createCardVariableSnapshot(page, registry);
    plan.status = snapshot.mode === 'structured' && !snapshot.diagnostics.some(x => x.severity === 'error') ?
      record.variablesJson?.migration?.version === 1 ? 'already-migrated' : 'structured-skip' : 'blocked';
    plan.issues.push({ code: snapshot.mode });
    return deepFreeze(plan);
  }
  if (!plan.path || record.id !== page.id || record.pageRecordStatus.schemaVersionState.isFuture) block('invalid-source-page');
  if (record.pageRecordStatus.schemaVersionInvalid || record.parseIssues.length) block('invalid-source-metadata');
  const metadataKeys = record.frontMatter.entries.filter(entry => entry.normalizedKey).map(entry => entry.normalizedKey);
  if (new Set(metadataKeys).size !== metadataKeys.length) block('duplicate-source-metadata');
  if (record.template && record.template !== 'card') block('special-page');
  if (!plan.targetType) block('unknown-legacy-type');
  if (!extraction.blocks.length) { plan.status = plan.issues.length ? 'blocked' : 'no-properties'; return deepFreeze(plan); }
  const source = extraction.blocks[0];
  if (source.cardType !== record.type) block('page-block-type-mismatch');
  plan.issues.push(...source.issues);
  if (plan.issues.length) plan.status = 'blocked';
  if (!plan.targetType) return deepFreeze(plan);
  const definition = registry.getResolvedType(plan.targetType, 1);
  const envelope = { formatVersion: 1, schemaVersion: 1, schemaDigest: definition.digest,
    values: {}, overrides: {}, inactive: [] };
  plan.schemaDigest = definition.digest;
  const manualValues = new Map();
  for (const control of source.controls) {
    const table = Object.hasOwn(LEGACY_FIELD_MAPPING, record.type) ? LEGACY_FIELD_MAPPING[record.type] : {};
    const path = Object.hasOwn(table, control.key) ? table[control.key] : null;
    const evidence = { ...deepCloneData(control), block: source.index, targetPath: path || null, status: 'preserved-inactive' };
    if (!control.present) evidence.status = 'absent';
    else if (control.manual || control.key.startsWith('override-')) {
      const key = control.key.replace(/^override-/, '');
      evidence.reason = 'manual-override-awaits-compatible-computed-contract';
      if (control.raw === '' && !control.manual) evidence.reason = 'disabled-hidden-override';
      else {
        let numeric = NaN;
        try { numeric = convert(control.raw, { datatype: 'number' }, [], record.id); } catch { /* Raw evidence remains inactive. */ }
        if (!Number.isFinite(numeric)) block(`invalid-manual-override:${key}`);
        if (manualValues.has(key) && manualValues.get(key) !== numeric) block(`conflicting-manual-overrides:${key}`);
        manualValues.set(key, numeric);
        const targetPath = Object.hasOwn(LEGACY_MANUAL_TARGETS, key) ? LEGACY_MANUAL_TARGETS[key] : [];
        const field = targetPath.length === 1 ? definition.fieldsByKey[targetPath[0]] : null;
        if (field?.computed?.allowOverride && Number.isFinite(numeric)) {
          if (!validateVariableValue(numeric, field).ok) block(`invalid-manual-target:${key}`);
          else { envelope.overrides[field.key] = numeric; evidence.status = 'mapped-override'; evidence.targetPath = targetPath; evidence.value = numeric; }
        }
      }
    }
    else if (control.custom) {
      const key = customIdentities[`${source.index}:${control.key}`];
      const datatypes = { text: 'string', input: 'string', textarea: 'string', number: 'number', checkbox: 'boolean' };
      const datatype = Object.hasOwn(datatypes, control.type) ? datatypes[control.type] : null;
      if (!key || !datatype) evidence.reason = 'custom-definition-requires-review';
      else {
        const field = { key, label: control.label || control.key, datatype, binding: { owner: 'variables' },
          ...(control.type === 'textarea' ? { format: 'multiline' } : {}) };
        try {
          const value = convert(control.raw, field, pages, record.id);
          if (!validateVariableValue(value, field).ok) throw new Error('invalid-custom-value');
          envelope.extensions ||= { revision: 1, fields: [] };
          envelope.extensions.fields.push(field);
          envelope.values[key] = value;
          evidence.status = 'mapped-custom'; evidence.targetPath = [key]; evidence.value = value;
        } catch (error) { evidence.status = 'invalid'; evidence.reason = error.message; block(`invalid-custom:${control.key}`); }
      }
    }
    else if (isLegacyCalculatedKey(control.key)) {
      if (control.manualState === 'false') evidence.status = 'derived-not-migrated';
      else if (control.raw === '') evidence.reason = 'empty-calculated-control';
      else { evidence.status = 'ambiguous'; evidence.reason = 'calculated-mode-unknown'; block(`ambiguous-calculation:${control.key}`); }
    }
    else if (['type', 'tags', 'aliases', 'parent', 'order', 'relationships', 'icon', 'archived', 'body', 'blocks'].includes(control.key)) {
      evidence.status = 'common-owner'; evidence.reason = 'PageRecord/content remains authoritative';
    } else if (path) {
      let field = definition.fieldsByKey[path[0]];
      for (const key of path.slice(1)) field = field?.properties?.find(x => x.key === key);
      try {
        if (!field) throw new Error('mapping-definition-mismatch');
        if (field.datatype === 'reference' && control.raw === '') {
          evidence.status = 'absent'; evidence.reason = 'explicit-no-reference';
          plan.evidence.push(evidence); continue;
        }
        const value = convert(control.raw, field, pages, record.id);
        const validation = validateVariableValue(value, field, { pageId: record.id, key: control.key });
        if (!validation.ok) throw new Error(validation.issues[0].code);
        let target = envelope.values;
        path.slice(0, -1).forEach(key => { target = target[key] ||= {}; });
        target[path.at(-1)] = value;
        evidence.status = 'mapped'; evidence.value = value;
        if (field.datatype === 'reference') {
          const targetPage = pages.find(page => page.id === value.pageId);
          plan.referenceGuards.push({ pageId: value.pageId, path: targetPage.path || null, targetTypes: field.targetTypes });
        }
      } catch (error) { evidence.status = 'invalid'; evidence.reason = error.message; block(`invalid:${control.key}:${error.message}`); }
    }
    if (evidence.status === 'preserved-inactive') evidence.reason ||= 'no-approved-active-mapping';
    if (!['mapped', 'mapped-custom', 'mapped-override', 'absent'].includes(evidence.status)) envelope.inactive.push(evidence);
    plan.evidence.push(evidence);
  }
  if (['object', 'note'].includes(record.type)) envelope.values['item.isObject'] = true;
  plan.envelope = envelope;
  try {
    const candidate = updatePageRecordContent(page.content, { type: plan.targetType, schemaVersion: 2, variablesJson: envelope }, { preserveUnchangedMetadata: true });
    const snapshot = createCardVariableSnapshot({ id: page.id, content: candidate }, registry);
    if (snapshot.mode !== 'structured' || snapshot.diagnostics.some(x => x.severity === 'error')) block('target-validation-failed');
    if (parsePageRecordContent(candidate).rawBody !== record.rawBody) block('body-preservation-failed');
  } catch (error) { block(`candidate:${error.message}`); }
  plan.planDigest = digestCanonicalData(plan);
  return deepFreeze(plan);
}

function convert(raw, field, pages, sourceId) {
  if (field.datatype === 'number' || field.datatype === 'integer') {
    if (typeof raw !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim())) throw new Error('invalid-numeric-source');
    return Number(raw);
  }
  if (field.datatype === 'reference') {
    const exact = pages.filter(page => page.id === raw);
    const matches = exact.length ? exact : pages.filter(page => page.title === raw || page.aliases?.includes(raw));
    if (matches.length !== 1) throw new Error(matches.length ? 'ambiguous-reference' : 'missing-reference');
    const target = matches[0];
    if (!field.targetTypes.includes(target.type)) throw new Error('wrong-reference-type-or-target-migration-required');
    if (target.id === sourceId && field.validation?.allowSelf === false) throw new Error('self-reference');
    return { pageId: target.id };
  }
  return raw;
}

export function materializeMigrationCandidate(plan, { operationId, backupId }) {
  if (plan.status !== 'ready' || !operationId || !backupId) throw new Error('Ready plan, operation and verified backup required');
  const migration = { version: PROPERTIES_MIGRATION_VERSION, operationId, backupId,
    sourceIdentity: plan.expectedBase, sourceType: plan.sourceType, planDigest: plan.planDigest,
    target: { type: plan.targetType, version: plan.schemaVersion, digest: plan.schemaDigest }, rollout: 'staged-no-domain-cutover',
    customKeys: Object.fromEntries(plan.evidence.filter(entry => entry.status === 'mapped-custom').map(entry => [entry.key, entry.targetPath[0]])) };
  const content = updatePageRecordContent(plan.sourceContent, { type: plan.targetType, schemaVersion: 2,
    variablesJson: { ...deepCloneData(plan.envelope), migration } }, { preserveUnchangedMetadata: true });
  return deepFreeze({ content, identity: createPageStateIdentityFromContent(content), migration });
}

export function previewPropertiesMigration(plans) {
  return deepFreeze(plans.map(plan => ({ pageId: plan.pageId, status: plan.status,
    sourceType: plan.sourceType, targetType: plan.targetType, issues: plan.issues,
    preserved: plan.evidence.filter(entry => ['preserved-inactive', 'common-owner'].includes(entry.status)).map(entry => ({ key: entry.key, reason: entry.reason })),
    counts: plan.evidence.reduce((counts, entry) => { counts[entry.status] = (counts[entry.status] || 0) + 1; return counts; }, {}) })));
}
