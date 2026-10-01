import * as PageRepository from '../repository/pageRepository.js';
import { BUNDLED_CARD_TYPE_DEFINITIONS } from '../cardTypes/definitions/bundledDefinitions.js';
import { CardTypeRegistry } from '../cardTypes/cardTypeRegistry.js';
import { deepCloneData, deepFreeze } from '../cardTypes/definitionIdentity.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { createCardVariableSnapshot } from './cardVariableStore.js';
import { validateVariableValue } from '../schema/cardVariablesSchema.js';
import { updatePageRecordContent, createPageStateIdentityFromContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog, activateCardTypeDefinitions } from '../storage/cardTypeCatalogStorage.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext } from '../storage/storageAdapter.js';
import { persistPageContentCommand } from '../storage/pageCommandService.js';
import { createWorkspaceBackup, verifyWorkspaceBackup } from '../storage/backupService.js';
import { traverseTypedPage } from './typedPageTraversal.js';
import { state } from '../state.js';
import { getCurrentEditorPageBase, advanceEditorPageBase } from '../editor/editorSessionBase.js';

const plans = new WeakMap();
export function assertCardTypeChangeCandidate(plan, beforeContent, content) {
  const captured = plans.get(plan);
  if (!captured?.used || plan.sourceContent !== beforeContent || plan.candidateContent !== content) throw new Error('Unapproved type-change candidate');
}
export async function prepareCardTypeChange({ pageId, targetType, expectedBase, restoreInactive = [], repository = PageRepository,
  workspaceContext = captureStorageWorkspaceContext() } = {}) {
  assertStorageWorkspaceContext(workspaceContext);
  const page = repository.getPageById(pageId);
  if (!page?.path || !expectedBase?.stateHash) throw new Error('Exact durable page/base required');
  const current = await readCardTypeCatalog({ storageAdapter: workspaceContext.adapter });
  const sourceRegistry = createCardTypeRegistryFromCatalog(current.catalog, { bundledTypes: [], bundledFieldSets: [] });
  const source = createCardVariableSnapshot(page, sourceRegistry);
  if (source.mode !== 'structured' || source.diagnostics.some(issue => issue.severity === 'error') ||
      !arePageStateIdentitiesEqual(expectedBase, source.pageIdentity)) throw new Error('Unavailable/stale type-change source');
  const seed = BUNDLED_CARD_TYPE_DEFINITIONS.find(definition => definition.id === targetType);
  if (!seed) throw new Error('Unsupported formal target type');
  const activated = current.catalog.types.find(definition => definition.id === targetType && definition.version === seed.version);
  const targetClosure = activated ? [] : new CardTypeRegistry().getDefinitionClosure('type', seed.id, seed.version);
  const candidateFieldSets = targetClosure.filter(entry => entry.kind === 'fieldSet' &&
    !current.catalog.fieldSets.some(field => field.id === entry.identity.id && field.version === entry.identity.version)).map(entry => entry.definition);
  const registry = new CardTypeRegistry({ bundledTypes: [], bundledFieldSets: [],
    activatedTypes: current.catalog.types, activatedFieldSets: current.catalog.fieldSets,
    candidateTypes: activated ? [] : [seed], candidateFieldSets });
  const target = registry.getResolvedType(targetType, seed.version);
  const restorationCandidates = (source.inactive || []).flatMap((entry, index) =>
    entry.reason === 'type-change' && entry.origin?.type === targetType && entry.origin.version === target.version &&
    entry.origin.digest === target.digest && ['values', 'overrides'].includes(entry.path?.[0]) && target.fieldsByKey[entry.path[1]]
      ? [{ index, path: entry.path, value: entry.value }] : []);
  const envelope = deepCloneData(source.envelope);
  const inactive = envelope.inactive ||= [];
  const displace = (value, definition, path) => inactive.push({ status: 'incompatible-type', reason: 'type-change',
    origin: { type: source.type, version: source.schemaVersion, digest: source.schemaDigest }, path, definition: deepCloneData(definition), value: deepCloneData(value) });
  function compatible(value, oldField, newField, path) {
    if (!newField || !oldField || oldField.datatype !== newField.datatype || oldField.binding?.owner !== newField.binding?.owner ||
        Boolean(oldField.computed) !== Boolean(newField.computed)) { displace(value, oldField || { datatype: 'unknown' }, path); return undefined; }
    if (oldField.datatype === 'array' && canonicalJSON(oldField.items) !== canonicalJSON(newField.items)) {
      displace(value, oldField, path); return undefined;
    }
    if (value !== null && oldField.datatype === 'object') {
      const result = {};
      for (const [key, child] of Object.entries(value)) {
        const oldChild = oldField.properties?.find(field => field.key === key);
        const newChild = newField.properties?.find(field => field.key === key);
        const kept = compatible(child, oldChild, newChild, [...path, key]);
        if (kept !== undefined) result[key] = kept;
      }
      if (validateVariableValue(result, newField).ok) return result;
    } else if (validateVariableValue(value, newField).ok && (oldField.datatype !== 'reference' ||
      canonicalJSON(oldField.targetTypes || []) === canonicalJSON(newField.targetTypes || []))) return deepCloneData(value);
    displace(value, oldField, path); return undefined;
  }
  const extensions = [];
  const extensionFields = {};
  for (const entry of envelope.extensions?.fields || []) {
    const fields = entry.key ? [entry] : registry.getResolvedFieldSet(entry.id, entry.version).fields;
    const allowed = fields.every(field => !target.fieldsByKey[field.key]) &&
      (entry.id !== 'dnd.character-gameplay' || targetType === 'character') &&
      (entry.id !== 'dnd.own-effects' || ['player', 'character'].includes(targetType));
    if (allowed) { extensions.push(entry); for (const field of fields) extensionFields[field.key] = field; }
    else inactive.push({ status: 'preserved-inactive', reason: 'type-change-extension', originType: source.type, extension: entry });
  }
  if (envelope.extensions) envelope.extensions.fields = extensions;
  for (const collection of ['values', 'overrides']) {
    const result = {};
    for (const [key, value] of Object.entries(envelope[collection] || {})) {
      const oldField = source.definition.fieldsByKey[key];
      const newField = target.fieldsByKey[key] || extensionFields[key];
      if (collection === 'overrides' && !newField?.computed?.allowOverride) { displace(value, oldField || { datatype: 'unknown' }, [collection, key]); continue; }
      const kept = compatible(value, oldField, newField, [collection, key]);
      if (kept !== undefined) result[key] = kept;
    }
    envelope[collection] = result;
  }
  envelope.schemaVersion = target.version; envelope.schemaDigest = target.digest;
  // Explicit restoration never replaces a new active value, even when it looks compatible.
  if (!Array.isArray(restoreInactive) || new Set(restoreInactive).size !== restoreInactive.length) throw new Error('Invalid inactive restoration selection');
  for (const index of restoreInactive) {
    const candidate = restorationCandidates.find(entry => entry.index === index);
    if (!candidate) throw new Error('Inactive origin is not the exact target definition');
    let parent = envelope;
    for (const key of candidate.path.slice(0, -1)) {
      if (!Object.hasOwn(parent, key)) parent[key] = {};
      if (!parent[key] || typeof parent[key] !== 'object' || Array.isArray(parent[key])) throw new Error('Inactive restoration conflicts with active value');
      parent = parent[key];
    }
    const key = candidate.path.at(-1);
    if (Object.hasOwn(parent, key)) throw new Error('Inactive restoration cannot overwrite active value');
    parent[key] = deepCloneData(candidate.value);
  }
  envelope.inactive = inactive.filter((_, index) => !restoreInactive.includes(index));
  if (envelope.migration) {
    envelope.inactive.push({ status: 'preserved-inactive', reason: 'type-change-migration-provenance', originPageId: pageId, migration: envelope.migration });
    delete envelope.migration;
  }
  const same = targetType === source.type && target.digest === source.schemaDigest && !restoreInactive.length;
  const candidateContent = same ? page.content : updatePageRecordContent(page.content, { type: targetType, variablesJson: envelope }, { preserveUnchangedMetadata: true });
  const candidate = createCardVariableSnapshot({ id: pageId, content: candidateContent }, registry);
  if (candidate.mode !== 'structured' || candidate.diagnostics.some(issue => issue.severity === 'error')) throw new Error('Target type constraints require review');
  const inbound = [];
  for (const other of repository.getAllPages()) traverseTypedPage(other, sourceRegistry, ({ value, field, path }) => {
    if (field.datatype === 'reference' && value?.pageId === pageId && field.targetTypes?.length && !field.targetTypes.includes(targetType))
      inbound.push({ pageId: other.id, sourceKey: path.join('.'), targetPageId: pageId, reason: 'incompatible-target-type' });
  });
  const plan = deepFreeze({ pageId, targetType, expectedBase, sourceContent: page.content, candidateContent,
    inactive: envelope.inactive, restorationCandidates, diagnostics: inbound, noop: same, sourceSchema: source.schemaDigest, targetSchema: target.digest });
  plans.set(plan, { used: false, path: page.path, repository, workspaceContext, catalogIdentity: current.identity,
    activation: activated ? [] : [seed], targetDefinition: canonicalJSON(candidate.definition) });
  return plan;
}

export async function commitCardTypeChange(plan, { confirm = false } = {}) {
  const captured = plans.get(plan);
  if (!confirm || !captured || captured.used) return { status: 'blocked', written: false, reason: 'explicit-current-plan-required' };
  captured.used = true;
  const { workspaceContext: workspace, repository } = captured;
  const page = repository.getPageById(plan.pageId);
  let backupId = null;
  let writeStarted = false;
  try {
    assertStorageWorkspaceContext(workspace);
    if (!page || page.path !== captured.path || await workspace.adapter.readText(page.path) !== plan.sourceContent) throw new Error('Stale/moved type-change page');
    if (state.currentPage?.id === page.id) {
      const { hasPendingAutosaveForPage } = await import('../editor/autosave.js');
      if (hasPendingAutosaveForPage(page.id) || !arePageStateIdentitiesEqual(getCurrentEditorPageBase(page.id), plan.expectedBase)) throw new Error('Pending/stale type-change editor');
    }
    const current = await readCardTypeCatalog({ storageAdapter: workspace.adapter });
    if (canonicalJSON(current.identity) !== canonicalJSON(captured.catalogIdentity)) throw new Error('Catalog changed');
    if (plan.noop) return { status: 'unchanged', written: false };
    const backup = await createWorkspaceBackup({ pages: repository.getAllPages(), storageAdapter: workspace.adapter,
      definitionCoverage: true, includeAssets: true, cleanup: false, reason: 'type-change' });
    backupId = backup.id;
    const verified = await verifyWorkspaceBackup(backupId, { storageAdapter: workspace.adapter });
    if (verified.pageContents[page.name] !== plan.sourceContent) throw new Error('Type-change backup source mismatch');
    const committedCatalog = captured.activation.length
      ? await activateCardTypeDefinitions({ types: captured.activation, expectedIdentity: current.identity, storageAdapter: workspace.adapter }) : current;
    writeStarted = true;
    const receipt = await persistPageContentCommand({ page, content: plan.candidateContent, type: 'change-card-type', expectedBase: plan.expectedBase,
      workspaceContext: workspace, typeChangePlan: plan,
      validateBeforeWrite: async () => {
        assertStorageWorkspaceContext(workspace);
        const durableCatalog = await readCardTypeCatalog({ storageAdapter: workspace.adapter });
        if (canonicalJSON(durableCatalog.identity) !== canonicalJSON(committedCatalog.identity)) throw new Error('Type-change catalog changed before write');
        const registry = createCardTypeRegistryFromCatalog(durableCatalog.catalog, { bundledTypes: [], bundledFieldSets: [] });
        const after = createCardVariableSnapshot({ id: plan.pageId, content: plan.candidateContent }, registry);
        if (canonicalJSON(after.definition) !== captured.targetDefinition) throw new Error('Type-change closure changed');
      },
      verifyPersistedContent: async () => {
        assertStorageWorkspaceContext(workspace);
        if (await workspace.adapter.readText(page.path) !== plan.candidateContent) throw new Error('Type-change durable readback mismatch');
      }
    });
    if (receipt.writeStatus === 'saved' && state.currentPage?.id === page.id) advanceEditorPageBase(page);
    return { ...receipt, status: receipt.writeStatus === 'saved' ? 'saved' : receipt.written ? 'uncertain' : 'blocked', backupId };
  } catch (error) {
    if (!writeStarted) return { status: 'blocked', written: false, backupId, reason: error.message };
    try { assertStorageWorkspaceContext(workspace); const content = await workspace.adapter.readText(captured.path);
      return { status: content === plan.sourceContent ? 'failed' : 'uncertain', written: content === plan.sourceContent ? false : null, backupId, reason: error.message };
    } catch { return { status: 'uncertain', written: null, backupId, reason: error.message }; }
  }
}
