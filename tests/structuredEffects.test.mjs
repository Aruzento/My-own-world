import './setup.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createEffectsModel, createSerializableEffectsData, readEffectsModelFromPage, CHARACTER_CONDITION_KEYS } from '../js/character/effectsModel.js';
import { encodeOwnEffects, decodeOwnEffects, OWN_EFFECTS_KEY, OWN_EFFECTS_FIELD_SET } from '../js/character/ownEffectsDefinition.js';
import { prepareEffectsContext, prepareStructuredEffectsChange, commitStructuredEffectsChange } from '../js/character/structuredEffects.js';
import { readCharacterModelFromPage } from '../js/character/characterModel.js';
import { CardTypeRegistry } from '../js/cardTypes/cardTypeRegistry.js';
import { BUNDLED_CARD_TYPE_DEFINITIONS as types, BUNDLED_FIELD_SET_DEFINITIONS as fieldSets } from '../js/cardTypes/definitions/bundledDefinitions.js';
import { createRuntimePageFromContent, buildPageRecordContent, parsePageRecordContent, createPageStateIdentityFromContent } from '../js/core/pageRecord.js';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog, activateCardTypeDefinitions, readCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { createMemoryStorageAdapter, createEditConflictFixture } from './fixtures/editConflictFixtures.mjs';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import { setPages } from '../js/stateActions.js';
import * as repository from '../js/repository/pageRepository.js';
import { validateFieldSetDefinition } from '../js/cardTypes/cardTypeSchema.js';
import { canonicalJSON } from '../js/core/pageVariablesCodec.js';

const registry = new CardTypeRegistry();
const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
const body = '<h1>Actor</h1><script type="application/json" data-character-effects>{"conditions":["unconscious"],"effects":[{"id":"old","modifiers":{"armorClass":99}}],"selectedRuleIds":["old-rule"]}</script>';
const extension = { revision: 1, fields: [{ id: 'dnd.own-effects', version: 1 }] };
const own = () => createSerializableEffectsData({ conditions: ['poisoned', { key: 'exhaustion', level: 3, note: 'kept' }],
  effects: [{ id: 'own', title: 'Own buff', sourcePageId: 'historical-id', sourcePackageId: 'pack', ruleId: 'rule-1', duration: 'data only', note: 'note',
    modifiers: { armorClass: 2, initiative: 1, speed: 5, abilityScores: { str: 2 }, abilityChecks: { custom: 3 }, savingThrows: { dex: 1 }, skills: { 'custom-skill': 4 } }, flags: { magical: true } }],
  selectedRuleIds: ['rule-1'] });
function actor({ type = 'character', values = { [OWN_EFFECTS_KEY]: encodeOwnEffects(own()) }, extensions = extension, legacy = false } = {}) {
  return createRuntimePageFromContent({ path: '/pages/actor.md', name: 'actor.md', content: buildPageRecordContent({
    id: 'actor', type, template: 'card', body, schemaVersion: legacy ? 1 : 2,
    ...(!legacy ? { variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: registry.getResolvedType(type, 1).digest,
      values, extensions, overrides: {} } } : {}) }) });
}
async function fixture(options = {}) {
  const base = await createEditConflictFixture();
  const page = actor(options);
  await base.adapter.writeText(page.path, page.content);
  if (!options.noCatalog) await base.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
  setPages([page]);
  const context = await prepareEffectsContext({ page, repository });
  const writes = [];
  const write = base.adapter.writeText.bind(base.adapter);
  base.adapter.writeText = async (path, content) => { writes.push(path); return write(path, content); };
  return { ...base, page, context, writes };
}
const prepare = (f, effects = { ...own(), conditions: ['restrained'] }) => prepareStructuredEffectsChange({
  pageId: 'actor', expectedBase: createPageStateIdentityFromContent(f.page.content), effects, context: f.context });

test('versioned opt-in Field Set is declarative and losslessly projects all existing own data', () => {
  assert.equal(validateFieldSetDefinition(OWN_EFFECTS_FIELD_SET).ok, true);
  const data = own();
  assert.deepEqual(decodeOwnEffects(encodeOwnEffects(data)), { conditions: data.conditions, effects: data.effects, selectedRuleIds: data.selectedRuleIds });
  for (const key of CHARACTER_CONDITION_KEYS) {
    const sample = createSerializableEffectsData({ conditions: [key], effects: [], selectedRuleIds: [] });
    assert.deepEqual(createSerializableEffectsData(decodeOwnEffects(encodeOwnEffects(sample))), sample);
  }
  const normalized = createEffectsModel({ effects: [{ id: 'x', modifiers: { armorClass: 1 } }, { id: 'x', modifiers: { armorClass: 3 } }], selectedRuleIds: ['r', 'r', ''] });
  assert.equal(normalized.effects.length, 1);
  assert.deepEqual(createSerializableEffectsData(decodeOwnEffects(encodeOwnEffects(createSerializableEffectsData(normalized)))), createSerializableEffectsData(normalized));
});
test('optional extension activation preserves immutable v1 types and does not upgrade pages', async () => {
  const adapter = createMemoryStorageAdapter();
  const empty = await readCardTypeCatalog({ storageAdapter: adapter });
  const activated = await activateCardTypeDefinitions({ storageAdapter: adapter, expectedIdentity: empty.identity, types: [types.find(x => x.id === 'character')], fieldSets: [OWN_EFFECTS_FIELD_SET] });
  assert.equal(activated.catalog.types[0].version, 1);
  assert.deepEqual(activated.catalog.types[0], types.find(x => x.id === 'character'));
  assert.equal(activated.catalog.fieldSets.some(x => x.id === 'dnd.own-effects'), true);
});
test('Character and Player explicit state ignores legacy HTML; empty is Entity-owned', async () => {
  for (const type of ['character', 'player']) {
    const f = await fixture({ type });
    const model = readEffectsModelFromPage(f.page, f.context);
    assert.equal(model.source, 'entity');
    assert.equal(model.modifiers.armorClass, 2);
    assert.equal(model.flags.exhaustionLevel, 3);
    assert.deepEqual(model.selectedRuleIds, ['rule-1']);
    assert.equal(readCharacterModelFromPage(f.page, f.context).provenance.ownEffects.source, 'entity');
    const empty = await fixture({ type, values: { [OWN_EFFECTS_KEY]: encodeOwnEffects(createSerializableEffectsData({})) } });
    assert.equal(readEffectsModelFromPage(empty.page, empty.context).source, 'entity');
    assert.equal(readEffectsModelFromPage(empty.page, empty.context).effects.length, 0);
  }
});
test('absent retains legacy domain; partial/invalid/future/missing catalog never mix sources', async () => {
  const absent = await fixture({ values: {}, extensions: { revision: 1, fields: [] } });
  assert.notEqual(readEffectsModelFromPage(absent.page, absent.context).source, 'entity');
  for (const options of [
    { values: { [OWN_EFFECTS_KEY]: {} } }, { values: { [OWN_EFFECTS_KEY]: encodeOwnEffects(own()) }, extensions: { revision: 1, fields: [] } }, { noCatalog: true }
  ]) {
    const f = await fixture(options);
    assert.equal(readEffectsModelFromPage(f.page, f.context).source, 'unavailable');
    assert.throws(() => prepare(f));
    assert.equal(f.writes.length, 0);
  }
  const f = await fixture();
  for (const wire of ['{broken', '{"formatVersion":2}']) {
    const content = f.page.content.replace(/^variablesJson:.*$/m, 'variablesJson: ' + wire);
    assert.equal(readEffectsModelFromPage({ ...f.page, content }, { ...f.context, repository: null }).source, 'unavailable');
  }
  const legacy = await fixture({ legacy: true, noCatalog: true });
  assert.equal(legacy.context.mode, 'legacy');
  assert.notEqual(readEffectsModelFromPage(legacy.page).source, 'unavailable');
  const unregistered = { getPageById() { throw new Error('Legacy Effects do not need repository/catalog'); } };
  assert.equal(readEffectsModelFromPage({ id: 'draft', type: 'character' }, { repository: unregistered }).status, 'legacy');
  const malformed = readEffectsModelFromPage({ id: 'draft', content: '<script type="application/json" data-character-effects>{broken</script>' }, { repository: unregistered });
  assert.equal(malformed.status, 'legacy');
  assert.deepEqual(malformed.effects, []);
});
test('write/readback preserves body and unrelated Variables; no-op and reuse never write twice', async () => {
  const f = await fixture({ values: { [OWN_EFFECTS_KEY]: encodeOwnEffects(own()), 'dnd.level': 5 } });
  const before = f.page.content;
  const plan = prepare(f);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(f.page.content, before);
  const result = await commitStructuredEffectsChange(plan);
  assert.equal(result.status, 'saved', JSON.stringify(result));
  assert.deepEqual(result.after.conditions.map(x => x.key), ['restrained']);
  assert.deepEqual(f.writes, [f.page.path]);
  const durable = parsePageRecordContent(await f.adapter.readText(f.page.path));
  assert.equal(durable.rawBody, parsePageRecordContent(before).rawBody);
  assert.equal(durable.variablesJson.values['dnd.level'], 5);
  assert.equal((await commitStructuredEffectsChange(plan)).status, 'blocked');
  const noOp = prepare(f, createSerializableEffectsData(result.after));
  assert.equal((await commitStructuredEffectsChange(noOp)).status, 'unchanged');
  assert.equal(f.writes.length, 1);
  const reload = createRuntimePageFromContent({ content: await f.adapter.readText(f.page.path), path: f.page.path });
  assert.equal(readEffectsModelFromPage(reload, { ...f.context, repository: null }).flags.speedIsZero, true);
});
for (const scenario of ['stale', 'workspace', 'catalog', 'schema', 'missing', 'write-failure', 'readback']) test(`Effects guard ${scenario}`, async () => {
  const f = await fixture();
  const plan = prepare(f);
  if (scenario === 'stale') await f.adapter.writeText(f.page.path, f.page.content + 'concurrent body');
  if (scenario === 'workspace') setStorageAdapter(createMemoryStorageAdapter());
  if (scenario === 'catalog') await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...catalog, revision: 2 }));
  if (scenario === 'schema') {
    const modified = JSON.parse(JSON.stringify(catalog));
    modified.fieldSets.find(field => field.id === 'dnd.own-effects').metadata.representationVersion = 2;
    await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(modified));
  }
  if (scenario === 'missing') await f.adapter.removeFile(f.page.path);
  if (scenario === 'write-failure') f.adapter.writeText = async () => { throw new Error('write failed'); };
  if (scenario === 'readback') {
    const write = f.adapter.writeText;
    f.adapter.writeText = async (path, content) => { await write(path, content + '\nreadback mismatch'); };
  }
  const result = await commitStructuredEffectsChange(plan);
  assert.notEqual(result.status, 'saved');
  if (scenario === 'readback') assert.equal(result.status, 'uncertain');
  assert.notEqual((await commitStructuredEffectsChange(plan)).status, 'saved');
});
test('no-op still checks durable base; requests are data-only and cannot persist aggregate models', async () => {
  const f = await fixture();
  const p1 = prepare(f, own());
  const p2 = prepare(f, own());
  // Generic candidates carry creation timestamps; domain facts and guards are deterministic.
  const semanticPlan = plan => ({ pageId: plan.pageId, before: plan.before, after: plan.after,
    expectedBase: plan.expectedBase, guards: plan.guards, noOp: plan.noOp,
    values: plan.variables.after.values });
  assert.equal(canonicalJSON(semanticPlan(p1)), canonicalJSON(semanticPlan(p2)));
  await f.adapter.writeText(f.page.path, f.page.content + 'external change');
  assert.equal((await commitStructuredEffectsChange(p1)).status, 'blocked');
  const aggregate = createEffectsModel({ ...own(), source: 'merged' });
  assert.throws(() => prepare(f, aggregate), { code: 'EFFECTS_INVALID_REQUEST' });
  let evaluated = false;
  const untrusted = { effects: [], selectedRuleIds: [] };
  Object.defineProperty(untrusted, 'conditions', { get() { evaluated = true; return []; }, enumerable: true });
  // Reject before accessing request members.
  assert.throws(() => prepare(f, untrusted));
  assert.equal(evaluated, false);
});
test('undeclared/future/incompatible own state and unrelated card capability never become own Effects', async () => {
  const f = await fixture();
  const base = parsePageRecordContent(f.page.content).variablesJson;
  for (const envelope of [
    { ...base, schemaVersion: 99 },
    { ...base, extensions: { revision: 1, fields: [{ id: 'dnd.own-effects', version: 99 }] } },
    { ...base, values: { [OWN_EFFECTS_KEY]: { ...base.values[OWN_EFFECTS_KEY], 'unknown.member': true } } }
  ]) {
    const content = f.page.content.replace(/^variablesJson:.*$/m, 'variablesJson: ' + JSON.stringify(envelope));
    assert.equal(readEffectsModelFromPage({ ...f.page, content }, { ...f.context, repository: null }).source, 'unavailable');
  }
  const unrelated = await fixture({ type: 'item' });
  assert.equal(readEffectsModelFromPage(unrelated.page, unrelated.context).source, 'unavailable');
  assert.throws(() => prepare(unrelated), { code: 'EFFECTS_SOURCE_UNAVAILABLE' });
});
