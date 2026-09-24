import { parsePageRecordContent, createPageStateIdentityFromContent } from '../core/pageRecord.js';
import { deepCloneData, deepFreeze } from '../cardTypes/definitionIdentity.js';
import { validateCardTypeDefinition } from '../cardTypes/cardTypeSchema.js';
import { validateEntityValues, valueIssue } from '../schema/cardVariablesSchema.js';

export function createCardVariableSnapshot(page, registry) {
  if (!page) return deepFreeze({ mode: 'missing', pageId: null, diagnostics: [valueIssue('missing_page', {}, null)] });
  const record = parsePageRecordContent(page.content, { generateId: false });
  const wire = record.variablesStatus;
  let mode = wire.mode;
  let definition = null;
  const diagnostics = [...wire.issues];
  if (mode === 'structured') {
    try {
      definition = registry?.getResolvedType(record.type, wire.envelope.schemaVersion);
      if (!definition) { mode = 'missing-definition'; diagnostics.push(valueIssue('missing_catalog', { pageId: page.id }, null)); }
      else if (definition.digest !== wire.envelope.schemaDigest) {
        mode = 'unsupported'; diagnostics.push(valueIssue('schema_digest_mismatch', { pageId: page.id }, wire.envelope.schemaDigest));
      } else {
        definition = resolveExtensions(definition, wire.envelope.extensions, registry);
        diagnostics.push(...validateEntityValues({ envelope: wire.envelope, definition, pageId: page.id }).issues);
      }
    } catch (error) {
      mode = error.code === 'CARD_TYPE_DEFINITION_MISSING' ? 'missing-definition' : 'unsupported';
      diagnostics.push(valueIssue(error.code || 'unsupported_definition', { pageId: page.id }, error.message));
    }
  }
  if (record.pageRecordStatus.schemaVersionState.isFuture) {
    mode = 'unsupported'; diagnostics.push(valueIssue('future_page_version', { pageId: page.id }, record.schemaVersion));
  }
  if (wire.mode === 'structured' && record.schemaVersion < 2) {
    mode = 'unsupported'; diagnostics.push(valueIssue('structured_page_version_required', { pageId: page.id }, record.schemaVersion));
  }
  if (record.id !== page.id) {
    mode = 'invalid'; diagnostics.push(valueIssue('page_identity_mismatch', { pageId: page.id }, record.id));
  }
  return deepFreeze(deepCloneData({
    pageId: record.id, mode, content: page.content,
    pageIdentity: createPageStateIdentityFromContent(page.content),
    type: record.type, schemaVersion: wire.envelope?.schemaVersion ?? null,
    schemaDigest: wire.envelope?.schemaDigest ?? null,
    envelope: wire.envelope, values: wire.envelope?.values || {}, overrides: wire.envelope?.overrides || {},
    extensions: wire.envelope?.extensions || null, inactive: wire.envelope?.inactive || [],
    raw: wire.raw, definition, diagnostics,
    metadata: { id: record.id, type: record.type, template: record.template, tags: record.tags,
      aliases: record.aliases, parent: record.parent, order: record.order, relationships: record.relationships },
    freeContent: { title: record.title, content: record.rawBody, blocks: record.rawBody }
  }));
}

function resolveExtensions(definition, extensions, registry) {
  if (!extensions?.fields.length) return definition;
  const fields = [...definition.fields];
  const fieldsByKey = { ...definition.fieldsByKey };
  for (const entry of extensions.fields) {
    let additions;
    if (entry.key) {
      if (!entry.key.startsWith('custom.')) throw new Error('Card extension requires custom.<uuid> key');
      const validation = validateCardTypeDefinition({ id: 'extension', version: 1, label: 'Extension',
        fields: [entry], includes: [], sections: [] });
      if (!validation.ok) throw new Error('Invalid card extension definition');
      additions = [{ ...entry, provenance: { kind: 'extension', revision: extensions.revision } }];
    } else additions = registry.getResolvedFieldSet(entry.id, entry.version).fields;
    for (const field of additions) {
      if (fieldsByKey[field.key]) throw new Error('Extension key conflict');
      fields.push(field); fieldsByKey[field.key] = field;
    }
  }
  return { ...definition, fields, fieldsByKey };
}
