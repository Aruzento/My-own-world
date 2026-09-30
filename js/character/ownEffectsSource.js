import { readEntity, getValue } from '../variables/entityVariables.js';
import { createEffectsModel, createSerializableEffectsData, readEffectsModelFromHTML } from './effectsModel.js';
import { OWN_EFFECTS_KEY, OWN_EFFECTS_FIELD_SET_ID, OWN_EFFECTS_FIELD_SET, encodeOwnEffects, decodeOwnEffects } from './ownEffectsDefinition.js';
import { canonicalJSON, assertJSONData } from '../core/pageVariablesCodec.js';
import { createDefinitionIdentity } from '../cardTypes/definitionIdentity.js';
import { parsePageRecordContent } from '../core/pageRecord.js';

const expectedIdentity = createDefinitionIdentity('fieldSet', OWN_EFFECTS_FIELD_SET);
export function readOwnEffectsSource(page, { registry, repository, pages = [] } = {}) {
  const record = parsePageRecordContent(page?.content || '', { generateId: false });
  const legacy = () => ({ ...readEffectsModelFromHTML(page?.content), status: 'legacy', provenance: { owner: 'legacy-effects' } });
  // Legacy Effects читались и из draft/body-only pages до регистрации в repository.
  // Только structured source требует exact Entity identity/catalog boundary.
  if (record.variablesStatus.mode === 'legacy' && !record.pageRecordStatus.schemaVersionState.isFuture) return legacy();
  const exactRepository = repository || { getPageById: id => id === page?.id ? page : pages.find(entry => entry.id === id) };
  const snapshot = readEntity(page?.id, { registry, repository: exactRepository });
  const unavailable = reason => ({ ...createEffectsModel(), source: 'unavailable', status: 'unavailable',
    diagnostics: [{ reason }], provenance: { mode: snapshot.mode, pageId: snapshot.pageId } });
  if (snapshot.mode !== 'structured' || snapshot.diagnostics.some(issue => issue.severity === 'error')) {
    return unavailable('structured-effects-source-unavailable');
  }
  if (!['character', 'player'].includes(snapshot.type)) {
    return Object.hasOwn(snapshot.values, OWN_EFFECTS_KEY) || snapshot.extensions?.fields.some(entry => entry.id === OWN_EFFECTS_FIELD_SET_ID)
      ? unavailable('unsupported-effects-actor') : legacy();
  }
  if (snapshot.definition?.definition?.capabilities?.characterProjection !== true) return unavailable('unsupported-effects-actor');
  const stored = getValue(snapshot, OWN_EFFECTS_KEY, 'stored');
  const declared = snapshot.extensions?.fields.some(entry => entry.id === OWN_EFFECTS_FIELD_SET_ID && entry.version === 1);
  if (snapshot.extensions?.fields.some(entry => entry.id === OWN_EFFECTS_FIELD_SET_ID && entry.version !== 1)) return unavailable('own-effects-version-unsupported');
  try {
    if (declared) {
      const actual = createDefinitionIdentity('fieldSet', registry.getFieldSetDefinition(OWN_EFFECTS_FIELD_SET_ID, 1));
      if (canonicalJSON(actual) !== canonicalJSON(expectedIdentity)) return unavailable('own-effects-definition-incompatible');
    }
    if (!Object.hasOwn(snapshot.values, OWN_EFFECTS_KEY)) return declared ? unavailable('own-effects-state-incomplete-or-unsupported') : legacy();
    if (!declared || stored.status !== 'value') return unavailable('own-effects-state-incomplete-or-unsupported');
    const data = decodeOwnEffects(stored.value);
    assertJSONData(data);
    const model = createEffectsModel(data);
    if (canonicalJSON(encodeOwnEffects(createSerializableEffectsData(model))) !== canonicalJSON(stored.value)) return unavailable('own-effects-state-noncanonical');
    return { ...model, source: 'entity', status: 'ready', diagnostics: [],
      provenance: { pageId: snapshot.pageId, schemaVersion: snapshot.schemaVersion, schemaDigest: snapshot.schemaDigest,
        fieldSet: expectedIdentity, stored: true } };
  } catch {
    return unavailable('own-effects-state-malformed');
  }
}
