import { parsePageRecordContent, createPageStateIdentityFromContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from './cardTypeCatalogStorage.js';
import { createCardVariableSnapshot } from '../variables/cardVariableStore.js';
import { OWN_EFFECTS_KEY, OWN_EFFECTS_FIELD_SET_ID } from '../character/ownEffectsDefinition.js';

export function hasStructuredPageData(page) {
  return page?.variablesJson !== undefined || page?.variablesStatus?.mode && page.variablesStatus.mode !== 'legacy' ||
    (typeof page === 'string' ? parsePageRecordContent(page) : parsePageRecordContent(page?.content || page?.body || '')).variablesStatus.mode !== 'legacy';
}
export function assertLegacyPortability(page, operation) {
  if (!hasStructuredPageData(page)) return;
  const error = new Error(`${operation} blocked: structured card data requires definition/asset closure support.`);
  error.code = 'STRUCTURED_PORTABILITY_BLOCKED';
  throw error;
}

export async function validateStructuredPageWrite({ beforeContent, content, expectedBase, variablesCommand, migrationCommand = false, effectsAdoptionCommand = false, storageAdapter }) {
  if (!hasStructuredPageData(beforeContent) && !hasStructuredPageData(content)) return;
  if (!expectedBase?.stateHash) throw new Error('Structured page requires whole-page expectedBase');
  const before = parsePageRecordContent(beforeContent);
  const after = parsePageRecordContent(content);
  if (migrationCommand) {
    const receipt = after.variablesJson?.migration;
    if (before.variablesStatus.mode !== 'legacy' || after.variablesStatus.mode !== 'structured' ||
        receipt?.version !== 1 || !receipt.operationId || !receipt.backupId ||
        receipt.sourceType !== before.type || receipt.target?.type !== after.type ||
        receipt.target?.version !== after.variablesJson.schemaVersion || receipt.target?.digest !== after.variablesJson.schemaDigest ||
        !arePageStateIdentitiesEqual(receipt.sourceIdentity, createPageStateIdentityFromContent(beforeContent)) ||
        !arePageStateIdentitiesEqual(expectedBase, receipt.sourceIdentity) || before.rawBody !== after.rawBody) throw new Error('Invalid migration transition');
    const unrelatedMetadata = record => record.frontMatter.entries
      .filter(entry => entry.raw && !['schemaversion', 'type', 'variablesjson'].includes(entry.normalizedKey)).map(entry => entry.raw);
    if (canonicalJSON(unrelatedMetadata(before)) !== canonicalJSON(unrelatedMetadata(after))) throw new Error('Migration must preserve unrelated raw metadata');
  } else if (before.variablesStatus.mode !== 'structured' || after.variablesStatus.mode !== 'structured') throw new Error('Legacy conversion or invalid/future structured payload is read-only');
  if (before.id !== after.id) throw new Error('Structured page identity cannot change');
  if (!migrationCommand && before.type !== after.type) throw new Error('Structured type switching requires conversion workflow');
  if (effectsAdoptionCommand) {
    // Explicit bounded transition, not a generic extension-edit bypass.
    const source = before.variablesJson, target = after.variablesJson;
    const fields = source.extensions?.fields || [];
    const expected = { ...source, values: { ...source.values, [OWN_EFFECTS_KEY]: target.values[OWN_EFFECTS_KEY] },
      extensions: { ...(source.extensions || {}), revision: (source.extensions?.revision || 0) + 1,
        fields: [...fields, { id: OWN_EFFECTS_FIELD_SET_ID, version: 1 }] } };
    if (!['character', 'player'].includes(before.type) || Object.hasOwn(source.values, OWN_EFFECTS_KEY) ||
        fields.some(field => field.id === OWN_EFFECTS_FIELD_SET_ID) || !Object.hasOwn(target.values, OWN_EFFECTS_KEY) ||
        canonicalJSON(expected) !== canonicalJSON(target) || before.rawBody !== after.rawBody ||
        canonicalJSON(before.frontMatter.entries.filter(entry => entry.normalizedKey !== 'variablesjson')) !==
        canonicalJSON(after.frontMatter.entries.filter(entry => entry.normalizedKey !== 'variablesjson'))) throw new Error('Invalid own Effects adoption transition');
  }
  if (!variablesCommand && !migrationCommand && !effectsAdoptionCommand && canonicalJSON(before.variablesJson) !== canonicalJSON(after.variablesJson)) throw new Error('Variable edits require Variables commands');
  const { catalog, exists } = await readCardTypeCatalog({ storageAdapter });
  if (!exists) throw new Error('Structured page requires activated catalog');
  const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
  const snapshot = createCardVariableSnapshot({ id: after.id, content }, registry);
  if (snapshot.mode !== 'structured' || snapshot.diagnostics.some(issue => issue.severity === 'error')) throw new Error('Structured page schema/values are read-only until repaired');
}

export async function assertLegacyBackupCatalog(storageAdapter) {
  const { exists } = await readCardTypeCatalog({ storageAdapter });
  if (exists) {
    const error = new Error('Backup/restore v1 blocked: activated definition catalog requires v2 coverage.');
    error.code = 'STRUCTURED_PORTABILITY_BLOCKED';
    throw error;
  }
}
