import { BUNDLED_CARD_TYPE_DEFINITIONS } from '../cardTypes/definitions/bundledDefinitions.js';
import { OWN_EFFECTS_FIELD_SET, OWN_EFFECTS_FIELD_SET_ID, OWN_EFFECTS_KEY, encodeOwnEffects } from '../character/ownEffectsDefinition.js';
import { readCardTypeCatalog, activateCardTypeDefinitions, createCardTypeRegistryFromCatalog } from './cardTypeCatalogStorage.js';
import { createCardVariableSnapshot } from '../variables/cardVariableStore.js';
import { parsePageRecordContent, updatePageRecordContent } from '../core/pageRecord.js';
import { getStorageAdapter, captureStorageWorkspaceContext, assertStorageWorkspaceContext } from './storageAdapter.js';

export const CANONICAL_CARD_TYPES = Object.freeze(BUNDLED_CARD_TYPE_DEFINITIONS.map(definition => Object.freeze({
  id: definition.id, label: definition.label, version: definition.version
})));

// Explicit creation activates the immutable seed. Reads never activate a catalog.
export async function prepareNewCardEnvelope(type, storageAdapter) {
  const workspace = storageAdapter === getStorageAdapter() ? captureStorageWorkspaceContext() : null;
  const guard = () => { if (workspace) assertStorageWorkspaceContext(workspace); };
  const seed = BUNDLED_CARD_TYPE_DEFINITIONS.find(definition => definition.id === type);
  if (!seed) throw new Error('Unsupported formal card type');
  let current = await readCardTypeCatalog({ storageAdapter });
  guard();
  if (!current.catalog.types.some(definition => definition.id === type && definition.version === seed.version)) {
    current = await activateCardTypeDefinitions({ types: [seed], expectedIdentity: current.identity, storageAdapter });
  }
  const actor = ['player', 'character'].includes(type);
  guard();
  if (actor && !current.catalog.fieldSets.some(definition => definition.id === OWN_EFFECTS_FIELD_SET_ID && definition.version === 1)) {
    current = await activateCardTypeDefinitions({ fieldSets: [OWN_EFFECTS_FIELD_SET], expectedIdentity: current.identity, storageAdapter });
  }
  const registry = createCardTypeRegistryFromCatalog(current.catalog, { bundledTypes: [], bundledFieldSets: [] });
  guard();
  const resolved = registry.getResolvedType(type, seed.version);
  return { formatVersion: 1, schemaVersion: seed.version, schemaDigest: resolved.digest,
    values: actor ? { 'dnd.items': [], 'dnd.equippedItems': [], [OWN_EFFECTS_KEY]: encodeOwnEffects({ conditions: [], effects: [], selectedRuleIds: [] }) } : {},
    ...(actor ? { extensions: { revision: 1, fields: [{ id: OWN_EFFECTS_FIELD_SET_ID, version: 1 }] } } : {}) };
}

export async function validateNewPageContent(content, storageAdapter) {
  const record = parsePageRecordContent(content);
  if (record.variablesStatus.mode === 'legacy') return; // Explicit historical imports/special-page formats.
  const current = await readCardTypeCatalog({ storageAdapter });
  const registry = createCardTypeRegistryFromCatalog(current.catalog, { bundledTypes: [], bundledFieldSets: [] });
  const snapshot = createCardVariableSnapshot({ id: record.id, content }, registry);
  if (!current.exists || snapshot.mode !== 'structured' || snapshot.diagnostics.some(issue => issue.severity === 'error')) throw new Error('New page structured definition/value unavailable');
}

export function copyPageContent(content, patch) {
  const record = parsePageRecordContent(content);
  if (record.variablesStatus.mode !== 'legacy' && record.variablesStatus.mode !== 'structured') throw new Error('Unavailable structured data cannot be copied');
  const envelope = record.variablesJson && structuredClone(record.variablesJson);
  // Keep evidence but never claim that a new identity completed the source operation.
  if (envelope?.migration) {
    envelope.inactive ||= [];
    envelope.inactive.push({ status: 'preserved-inactive', reason: 'copied-migration-provenance', originPageId: record.id, migration: envelope.migration });
    delete envelope.migration;
  }
  return updatePageRecordContent(content, { ...patch, ...(envelope ? { variablesJson: envelope } : {}) }, { preserveUnchangedMetadata: true });
}
