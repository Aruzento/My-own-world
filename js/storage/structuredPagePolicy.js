import { parsePageRecordContent } from '../core/pageRecord.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from './cardTypeCatalogStorage.js';
import { createCardVariableSnapshot } from '../variables/cardVariableStore.js';

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

export async function validateStructuredPageWrite({ beforeContent, content, expectedBase, variablesCommand, storageAdapter }) {
  if (!hasStructuredPageData(beforeContent) && !hasStructuredPageData(content)) return;
  if (!expectedBase?.stateHash) throw new Error('Structured page requires whole-page expectedBase');
  const before = parsePageRecordContent(beforeContent);
  const after = parsePageRecordContent(content);
  if (before.variablesStatus.mode !== 'structured' || after.variablesStatus.mode !== 'structured') throw new Error('Legacy conversion or invalid/future structured payload is read-only');
  if (before.id !== after.id) throw new Error('Structured page identity cannot change');
  if (before.type !== after.type) throw new Error('Structured type switching requires conversion workflow');
  if (!variablesCommand && canonicalJSON(before.variablesJson) !== canonicalJSON(after.variablesJson)) throw new Error('Variable edits require Variables commands');
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
