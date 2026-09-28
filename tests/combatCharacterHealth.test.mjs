import './setup.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

import { BUNDLED_CARD_TYPE_DEFINITIONS as types,
  BUNDLED_FIELD_SET_DEFINITIONS as fieldSets } from '../js/cardTypes/definitions/bundledDefinitions.js';
import { createPageStateIdentityFromContent, createRuntimePageFromContent,
  buildPageRecordContent, parsePageRecordContent } from '../js/core/pageRecord.js';
import { CARD_TYPE_CATALOG_PATH, createCardTypeRegistryFromCatalog,
  serializeCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { captureStorageWorkspaceContext, setStorageAdapter } from '../js/storage/storageAdapter.js';
import { setPages } from '../js/stateActions.js';
import { createMemoryStorageAdapter } from './fixtures/editConflictFixtures.mjs';
import { commitCombatHealthChange, createCombatCharacterContext,
  prepareCombatHealthChange, readCombatCharacter } from '../js/combat/combatCharacterHealth.js';

const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
const registry = createCardTypeRegistryFromCatalog(catalog);

test('legacy-only Combat context never requires or reads the CTV catalog', async () => {
  const page = { id: 'legacy', content: '---\nid: legacy\ntype: character\n---\n<p>legacy</p>' };
  let reads = 0;
  const context = await createCombatCharacterContext({ pages: [page], pageIds: [page.id],
    storageAdapter: { readText: async () => { reads++; throw new Error('catalog must not be read'); } } });
  assert.equal(context.mode, 'legacy-only');
  assert.equal(context.registry, null);
  assert.equal(reads, 0);
});

test('structured Combat health adapter normalizes temp-first damage and keeps logical event identities', async () => {
  const cases = [
    [{ current: 10, max: 20, temp: 8 }, -5, { hpCurrent: 10, hpMax: 20, hpTemp: 3 }, ['hpTemp']],
    [{ current: 10, max: 20, temp: 3 }, -5, { hpCurrent: 8, hpMax: 20, hpTemp: 0 }, ['hpTemp', 'hpCurrent']],
    [{ current: 2, max: 20, temp: 0 }, -10, { hpCurrent: 0, hpMax: 20, hpTemp: 0 }, ['hpCurrent']]
  ];
  for (const [before, delta, after, fields] of cases) {
    const fixture = await structuredFixture(before);
    const plan = await prepareCombatHealthChange({ page: fixture.page,
      request: { type: 'delta', delta }, pages: [fixture.page], context: fixture.context,
      storageAdapter: fixture.adapter, expectedBase: createPageStateIdentityFromContent(fixture.page.content) });
    assert.deepEqual(plan.before, { hpCurrent: before.current, hpMax: before.max, hpTemp: before.temp });
    assert.deepEqual(plan.after, after);
    assert.deepEqual(plan.changedFields.map(item => item.field), fields);
    assert.deepEqual(plan.changedFields.map(item => `structured:${item.field}`),
      fields.map(field => `structured:${field}`));
  }
});

test('structured Combat commit uses Variables, preserves Properties and health siblings', async () => {
  const fixture = await structuredFixture({ current: 8, max: 20, temp: 0 });
  const plan = await prepareCombatHealthChange({ page: fixture.page,
    request: { type: 'delta', delta: -3 }, pages: [fixture.page], context: fixture.context,
    storageAdapter: fixture.adapter, expectedBase: createPageStateIdentityFromContent(fixture.page.content) });
  const result = await commitCombatHealthChange(plan, { workspaceContext: fixture.workspaceContext });
  assert.equal(result.status, 'saved');
  assert.equal(result.state, 'persisted');
  const durable = parsePageRecordContent(await fixture.adapter.readText(fixture.page.path));
  assert.deepEqual(durable.variablesJson.values['dnd.health'], {
    'dnd.hpCurrent': 5, 'dnd.hpMax': 20, 'dnd.hpTemporary': 0,
    'character.health.formula': 'fixture', 'character.health.hitDice': '5d8'
  });
  assert.equal(durable.rawBody, fixture.rawBody);
});

test('structured Combat character uses exact activated provenance and rejects missing explicit health', async () => {
  const fixture = await structuredFixture({ current: 8, max: 20, temp: 0 });
  const active = readCombatCharacter(fixture.page, { pages: [fixture.page], context: fixture.context });
  assert.equal(active.source, 'structured');
  assert.equal(active.character.provenance.fields.armorClass.resolution, 'explicit');
  const envelope = parsePageRecordContent(fixture.page.content).variablesJson;
  delete envelope.values['dnd.health'];
  fixture.page.content = buildPageRecordContent({ id: fixture.page.id, schemaVersion: 2,
    type: 'character', template: 'card', body: fixture.body,
    variablesJson: envelope, now: '2026-09-27T12:00:00Z' });
  await fixture.adapter.writeText(fixture.page.path, fixture.page.content);
  setPages([fixture.page]);
  await assert.rejects(() => prepareCombatHealthChange({ page: fixture.page,
    request: { type: 'delta', delta: -1 }, pages: [fixture.page], context: fixture.context,
    storageAdapter: fixture.adapter, expectedBase: createPageStateIdentityFromContent(fixture.page.content) }),
  error => error.code === 'COMBAT_STRUCTURED_HEALTH_UNAVAILABLE');
});

async function structuredFixture({ current, max, temp }) {
  const adapter = createMemoryStorageAdapter();
  setStorageAdapter(adapter);
  await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
  const definition = registry.getResolvedType('character', 1);
  const body = '<section class="card-properties-block" data-block-type="properties" data-card-type="character"><input data-property-name="hpCurrent" value="99"><input data-property-name="hpMax" value="99"><input data-property-name="hpTemp" value="0"></section><p>body marker</p>';
  const content = buildPageRecordContent({ id: 'structured', schemaVersion: 2, type: 'character', template: 'card', body,
    variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: definition.digest, overrides: {}, values: {
      'dnd.level': 5,
      'character.abilities': {
        'character.abilities.strength': 10, 'character.abilities.dexterity': 14,
        'character.abilities.constitution': 12, 'character.abilities.intelligence': 10,
        'character.abilities.wisdom': 10, 'character.abilities.charisma': 10
      },
      'dnd.health': { 'dnd.hpCurrent': current, 'dnd.hpMax': max, 'dnd.hpTemporary': temp,
        'character.health.formula': 'fixture', 'character.health.hitDice': '5d8' },
      'dnd.armorClass': { 'dnd.armorClass.value': 12 }
    } }, now: '2026-09-27T12:00:00Z' });
  const page = createRuntimePageFromContent({ content, path: '/pages/structured.md', name: 'structured.md' });
  await adapter.writeText(page.path, page.content);
  setPages([page]);
  const workspaceContext = captureStorageWorkspaceContext();
  const context = await createCombatCharacterContext({ pages: [page], pageIds: [page.id],
    workspaceContext, storageAdapter: adapter });
  return { adapter, page, body, rawBody: parsePageRecordContent(page.content).rawBody,
    context, workspaceContext };
}
