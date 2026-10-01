import { createCardVariableSnapshot } from './cardVariableStore.js';
import { deepCloneData } from '../cardTypes/definitionIdentity.js';
import { parsePageRecordContent, updatePageRecordContent } from '../core/pageRecord.js';
import { CARD_TYPE_DATATYPES } from '../cardTypes/cardTypeSchema.js';
import { validateVariableValue } from '../schema/cardVariablesSchema.js';

// Общая data-only граница portability, assets и индекса. Никогда не читает defaults.
export function traverseTypedPage(page, registry, visit) {
  const record = parsePageRecordContent(page.content || '');
  if (record.variablesStatus.mode === 'legacy') return { complete: true, diagnostics: [] };
  const snapshot = createCardVariableSnapshot({ id: record.id, content: page.content }, registry);
  const diagnostics = [];
  if (snapshot.mode !== 'structured' || snapshot.diagnostics.some(issue => issue.severity === 'error')) {
    return { complete: false, diagnostics: snapshot.diagnostics };
  }
  function walk(value, field, path, collection) {
    if (!CARD_TYPE_DATATYPES.includes(field.datatype)) {
      diagnostics.push({ code: 'unsupported_typed_value', path });
      return;
    }
    visit({ value, field, path, collection });
    if (value === null) return;
    if (field.datatype === 'array') value.forEach((entry, index) => walk(entry, field.items, [...path, index], collection));
    if (field.datatype === 'object') {
      const fields = new Map((field.properties || []).map(child => [child.key, child]));
      for (const [key, entry] of Object.entries(value)) {
        if (fields.has(key)) walk(entry, fields.get(key), [...path, key], collection);
        else if (key !== field.rowIdentityKey) diagnostics.push({ code: 'unknown_nested_value', path: [...path, key] });
      }
    }
  }
  for (const collection of ['values', 'overrides']) for (const [key, value] of Object.entries(snapshot.envelope[collection] || {})) {
    const field = snapshot.definition.fieldsByKey[key];
    if (field) walk(value, field, [collection, key], collection);
    else diagnostics.push({ code: 'unknown_value', path: [collection, key] });
  }
  for (const [index, entry] of (snapshot.inactive || []).entries()) {
    if (entry.definition?.datatype && Object.hasOwn(entry, 'value')) walk(entry.value, entry.definition, ['inactive', index, 'value'], 'inactive');
    // Stage 7 raw controls are recovery evidence, not an arbitrary typed value.
    else if (!entry.status || !['preserved-inactive', 'common-owner', 'incompatible-type'].includes(entry.status)) diagnostics.push({ code: 'unknown_inactive', path: ['inactive', index] });
  }
  for (const field of snapshot.definition.fields) if (field.datatype === 'asset' && field.binding?.owner === 'page') {
    const entries = record.frontMatter.entries.filter(entry => entry.normalizedKey === field.binding.path.toLowerCase());
    if (!entries.length) continue;
    try {
      const value = JSON.parse(entries[0].value);
      if (entries.length !== 1 || !validateVariableValue(value, field).ok) throw new Error('Invalid metadata asset');
      walk(value, field, ['metadata', field.binding.path], 'metadata');
    } catch { diagnostics.push({ code: 'invalid_metadata_asset', path: [field.binding.path] }); }
  }
  return { complete: diagnostics.length === 0, diagnostics, snapshot };
}

export function rewriteTypedPage(page, registry, { pageIds = new Map(), assetPaths = new Map() } = {}) {
  const record = parsePageRecordContent(page.content);
  if (record.variablesStatus.mode === 'legacy') return page.content;
  const envelope = deepCloneData(record.variablesJson);
  if (pageIds.size) {
    const ids = [...pageIds.keys()];
    const potentiallyReferences = value => typeof value === 'string' ? ids.some(id => value.includes(id))
      : value && typeof value === 'object' ? Object.values(value).some(potentiallyReferences) : false;
    const safeEnvelopeKeys = ['formatVersion', 'schemaVersion', 'schemaDigest', 'values', 'overrides', 'extensions', 'inactive', 'migration'];
    if (Object.entries(envelope).some(([key, value]) => !safeEnvelopeKeys.includes(key) && potentiallyReferences(value)) ||
        record.frontMatter.entries.some(entry => !['id', 'schemaversion', 'updatedat', 'contenthash', 'parent', 'order', 'tags', 'template', 'type', 'aliases', 'relationshipsjson', 'variablesjson', 'iconjson', 'archived'].includes(entry.normalizedKey) && potentiallyReferences(entry.value)) ||
        (envelope.inactive || []).some(entry => !entry.definition && !entry.reason?.includes('migration-provenance') && potentiallyReferences(entry))) throw new Error('Typed copy blocked: unknown reference-bearing recovery/metadata payload');
  }
  const metadata = [];
  const result = traverseTypedPage(page, registry, ({ value, field, path }) => {
    let replacement;
    if (field.datatype === 'reference' && pageIds.has(value?.pageId)) replacement = { pageId: pageIds.get(value.pageId) };
    if (field.datatype === 'asset' && assetPaths.has(value?.path)) replacement = { ...value, path: assetPaths.get(value.path) };
    if (replacement) {
      if (path[0] === 'metadata') { metadata.push([path[1], replacement]); return; }
      let parent = envelope;
      for (const key of path.slice(0, -1)) parent = parent[key];
      parent[path.at(-1)] = replacement;
    }
  });
  if (!result.complete) throw new Error('Typed copy blocked: incomplete definition/value traversal');
  let content = updatePageRecordContent(page.content, { variablesJson: envelope }, { preserveUnchangedMetadata: true });
  for (const [key, value] of metadata) {
    const entry = record.frontMatter.entries.find(entry => entry.normalizedKey === key.toLowerCase());
    content = content.replace(entry.raw, `${entry.key}: ${JSON.stringify(value)}`);
  }
  return content;
}

export function collectPageDefinitionClosure(pages, registry) {
  const types = new Map(), fieldSets = new Map();
  const add = (kind, id, version) => {
    for (const entry of registry.getDefinitionClosure(kind, id, version)) {
      (entry.kind === 'type' ? types : fieldSets).set(`${entry.identity.id}@${entry.identity.version}`, entry.definition);
    }
  };
  for (const page of pages) {
    const record = parsePageRecordContent(page.content);
    if (record.variablesStatus.mode === 'legacy') continue;
    const snapshot = createCardVariableSnapshot({ id: record.id, content: page.content }, registry);
    if (snapshot.mode !== 'structured' || snapshot.diagnostics.some(issue => issue.severity === 'error')) throw new Error('Portable page definition unavailable');
    add('type', record.type, snapshot.schemaVersion);
    for (const extension of snapshot.extensions?.fields || []) if (!extension.key) add('fieldSet', extension.id, extension.version);
    for (const entry of snapshot.inactive || []) if (entry.definition && entry.origin?.type && entry.origin.version) {
      add('type', entry.origin.type, entry.origin.version);
      if (registry.getResolvedType(entry.origin.type, entry.origin.version).digest !== entry.origin.digest) throw new Error('Inactive definition identity mismatch');
    }
  }
  return { types: [...types.values()], fieldSets: [...fieldSets.values()] };
}
