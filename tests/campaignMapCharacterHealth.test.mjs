import './setup.mjs';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUNDLED_CARD_TYPE_DEFINITIONS,
  BUNDLED_FIELD_SET_DEFINITIONS
} from '../js/cardTypes/definitions/bundledDefinitions.js';
import {
  getCharacterHealth,
  readCharacterModelFromPage
} from '../js/character/characterModel.js';
import {
  buildPageRecordContent,
  parsePageRecordContent
} from '../js/core/pageRecord.js';
import {
  getCampaignMapCharacterState,
  prepareCampaignMapCharacterContext
} from '../js/editor/campaignMapCharacterBridge.js';
import {
  CAMPAIGN_MAP_HEALTH_ERROR_CODES,
  commitCampaignMapCharacterHealthChange,
  prepareCampaignMapCharacterHealthChange
} from '../js/editor/campaignMapCharacterHealth.js';
import {
  CARD_TYPE_CATALOG_PATH,
  createCardTypeRegistryFromCatalog,
  serializeCardTypeCatalog
} from '../js/storage/cardTypeCatalogStorage.js';
import {
  captureStorageWorkspaceContext,
  setStorageAdapter
} from '../js/storage/storageAdapter.js';
import { setPages } from '../js/stateActions.js';
import {
  createEditConflictFixture,
  createMemoryStorageAdapter
} from './fixtures/editConflictFixtures.mjs';


const catalog = {
  formatVersion: 1,
  revision: 1,
  types: BUNDLED_CARD_TYPE_DEFINITIONS,
  fieldSets: BUNDLED_FIELD_SET_DEFINITIONS
};
const registry = createCardTypeRegistryFromCatalog(catalog);
const propertiesBody = `
  <section class="card-properties-block" data-block-type="properties" data-card-type="character">
    <input data-property-name="hpCurrent" value="99">
    <input data-property-name="hpMax" value="99">
    <input data-property-name="hpTemp" value="0">
  </section>
  <p>Map body evidence</p>
`;


test('legacy-only Map context does not require or read the CTV catalog', async () => {
  const adapter = createMemoryStorageAdapter();
  let reads = 0;
  const readText = adapter.readText.bind(adapter);
  adapter.readText = async (...args) => {
    reads += 1;
    return readText(...args);
  };
  setStorageAdapter(adapter);
  const legacy = { id: 'legacy-map-character', type: 'character', content: 'legacy' };
  const context = await prepareCampaignMapCharacterContext(null, {
    pages: [legacy], includePages: [legacy]
  });
  assert.equal(context.mode, 'legacy-only');
  assert.equal(context.registry, null);
  assert.equal(reads, 0);
});


test('structured Map projection reads Entity health and ignores conflicting Properties', async () => {
  const fixture = await structuredFixture();
  const context = await prepareCampaignMapCharacterContext(null, {
    pages: [fixture.page], includePages: [fixture.page],
    workspaceContext: fixture.workspaceContext
  });
  const state = getCampaignMapCharacterState(fixture.page, {
    context, pages: [fixture.page]
  });
  assert.equal(context.mode, 'source-aware');
  assert.equal(state.source, 'entity');
  assert.deepEqual(
    {
      current: state.health.current,
      max: state.health.max,
      temp: state.health.temp,
      percent: state.health.percent,
      isDown: state.health.isDown
    },
    {
      current: 8, max: 20, temp: 3,
      percent: 0.4, isDown: false
    }
  );
  assert.equal(state.model.sources.properties, false);
});


test('structured Player uses the same approved Character projection and health boundary', async () => {
  const fixture = await structuredFixture({ type: 'player' });
  const context = await prepareCampaignMapCharacterContext(null, {
    pages: [fixture.page], includePages: [fixture.page],
    workspaceContext: fixture.workspaceContext
  });
  const state = getCampaignMapCharacterState(fixture.page, {
    context, pages: [fixture.page]
  });
  assert.equal(state.model.cardType, 'player');
  assert.equal(state.source, 'entity');
  const plan = await prepareMapPlan(fixture, { delta: -2 });
  const result = await commitCampaignMapCharacterHealthChange(plan);
  assert.equal(result.status, 'saved');
  assert.deepEqual(result.after, { current: 8, max: 20, temp: 1 });
});


test('structured Map intents preserve delta, temp, restore and kill policy', async t => {
  const cases = [
    ['damage with temp', storedHealth(10, 20, 3), { delta: -5 }, [8, 20, 0], 'delta'],
    ['healing clamp', storedHealth(18, 20, 0), { delta: 10 }, [20, 20, 0], 'delta'],
    ['restore preserves explicit temp', storedHealth(5, 20, 3), { mode: 'restore', temp: 3 }, [20, 20, 3], 'exact'],
    ['kill preserves explicit temp', storedHealth(15, 20, 4), { mode: 'kill', temp: 4 }, [0, 20, 4], 'exact'],
    ['explicit temp', storedHealth(10, 20, 2), { delta: 0, temp: 7 }, [10, 20, 7], 'exact'],
    ['temp plus damage', storedHealth(10, 20, 2), { delta: -5, temp: 7 }, [10, 20, 2], 'exact']
  ];

  for (const [name, before, intent, expected, requestType] of cases) {
    await t.test(name, async () => {
      const fixture = await structuredFixture({ health: before });
      const plan = await prepareMapPlan(fixture, intent);
      assert.equal(plan.request.type, requestType);
      assert.deepEqual(
        [plan.after.current, plan.after.max, plan.after.temp],
        expected
      );
    });
  }
});


test('structured Map commit writes Character once, preserves body, health siblings and unrelated Variables', async () => {
  const fixture = await structuredFixture({
    health: {
      ...storedHealth(8, 20, 0),
      'dnd.health.formula': '2d8 + 4',
      'dnd.hitDice': [{
        'dnd.hitDice.rowId': 'hd-map',
        'dnd.hitDice.die': 'd8',
        'dnd.hitDice.total': 2,
        'dnd.hitDice.spent': 1
      }]
    },
    values: { 'dnd.level': 4 }
  });
  const originalBody = parsePageRecordContent(fixture.page.content).rawBody;
  let characterWrites = 0;
  const writeText = fixture.adapter.writeText.bind(fixture.adapter);
  fixture.adapter.writeText = async (path, content) => {
    if (path === fixture.page.path) characterWrites += 1;
    return writeText(path, content);
  };

  const plan = await prepareMapPlan(fixture, { delta: -3 });
  const result = await commitCampaignMapCharacterHealthChange(plan);
  assert.equal(result.status, 'saved');
  assert.equal(result.written, true);
  assert.equal(characterWrites, 1);
  assert.deepEqual(result.after, { current: 5, max: 20, temp: 0 });

  const durable = parsePageRecordContent(
    await fixture.adapter.readText(fixture.page.path)
  );
  assert.equal(durable.rawBody, originalBody);
  assert.equal(durable.variablesJson.values['dnd.level'], 4);
  assert.equal(durable.variablesJson.values['dnd.health']['dnd.health.formula'], '2d8 + 4');
  assert.equal(durable.variablesJson.values['dnd.health']['dnd.hitDice'][0]['dnd.hitDice.rowId'], 'hd-map');
  assert.equal(durable.variablesJson.values['dnd.health']['dnd.hpCurrent'], 5);

  const model = readCharacterModelFromPage(fixture.page, {
    pages: [fixture.page], registry,
    repository: { getPageById: id => id === fixture.page.id ? fixture.page : null }
  });
  assert.equal(getCharacterHealth(model).current, 5);
  assert.match(fixture.page.content, /value="99"/);
});


test('missing explicit health and missing activated catalog block without legacy materialization', async () => {
  const missingHealth = await structuredFixture({ health: null });
  await assert.rejects(
    prepareMapPlan(missingHealth, { delta: -1 }),
    error => error.code === CAMPAIGN_MAP_HEALTH_ERROR_CODES.HEALTH_UNAVAILABLE
  );
  assert.equal(missingHealth.page.content, missingHealth.originalContent);

  const noCatalog = await structuredFixture();
  await noCatalog.adapter.removeFile(CARD_TYPE_CATALOG_PATH);
  await assert.rejects(
    prepareMapPlan(noCatalog, { delta: -1 }),
    error => error.code === CAMPAIGN_MAP_HEALTH_ERROR_CODES.SOURCE_UNAVAILABLE
  );
  assert.equal(noCatalog.page.content, noCatalog.originalContent);
});


test('malformed structured Map source never falls back to contradictory Properties', async () => {
  const fixture = await structuredFixture();
  fixture.page.content = fixture.page.content.replace(
    /^variablesJson:.*$/m,
    'variablesJson: {broken'
  );
  await fixture.adapter.writeText(fixture.page.path, fixture.page.content);
  const context = await prepareCampaignMapCharacterContext(null, {
    pages: [fixture.page], includePages: [fixture.page],
    workspaceContext: fixture.workspaceContext
  });
  assert.equal(
    getCampaignMapCharacterState(fixture.page, {
      context, pages: [fixture.page]
    }),
    null
  );
  await assert.rejects(
    prepareMapPlan(fixture, { delta: -1 }),
    error => error.code === CAMPAIGN_MAP_HEALTH_ERROR_CODES.SOURCE_UNAVAILABLE ||
      error.code === CAMPAIGN_MAP_HEALTH_ERROR_CODES.HEALTH_UNAVAILABLE
  );
  assert.match(fixture.page.content, /value="99"/);
});


test('stale structured Map plan is blocked before token publication can occur', async () => {
  const fixture = await structuredFixture();
  const plan = await prepareMapPlan(fixture, { delta: -1 });
  fixture.page.content = fixture.page.content.replace('Map body evidence', 'Changed elsewhere');
  await fixture.adapter.writeText(fixture.page.path, fixture.page.content);
  const result = await commitCampaignMapCharacterHealthChange(plan);
  assert.equal(result.status, 'blocked');
  assert.equal(result.written, false);
});


test('structured Map boundary inherits catalog, workspace and missing-page guards', async t => {
  await t.test('catalog changed', async () => {
    const fixture = await structuredFixture();
    const plan = await prepareMapPlan(fixture, { delta: -1 });
    const changedCatalog = structuredClone(catalog);
    changedCatalog.types.find(type => type.id === 'character').label = 'Changed Map closure';
    await fixture.adapter.writeText(
      CARD_TYPE_CATALOG_PATH,
      serializeCardTypeCatalog(changedCatalog)
    );
    const result = await commitCampaignMapCharacterHealthChange(plan);
    assert.notEqual(result.status, 'saved');
  });

  await t.test('workspace changed', async () => {
    const fixture = await structuredFixture();
    const plan = await prepareMapPlan(fixture, { delta: -1 });
    setStorageAdapter(createMemoryStorageAdapter());
    const result = await commitCampaignMapCharacterHealthChange(plan);
    assert.equal(result.status, 'blocked');
    assert.equal(result.written, false);
  });

  await t.test('page missing', async () => {
    const fixture = await structuredFixture();
    const plan = await prepareMapPlan(fixture, { delta: -1 });
    await fixture.adapter.removeFile(fixture.page.path);
    const result = await commitCampaignMapCharacterHealthChange(plan);
    assert.notEqual(result.status, 'saved');
  });
});


async function structuredFixture({
  type = 'character',
  health = storedHealth(8, 20, 3),
  values = {}
} = {}) {
  const base = await createEditConflictFixture({
    id: `${type}-campaign-map-health-${crypto.randomUUID()}`,
    type,
    body: propertiesBody
  });
  const definition = registry.getResolvedType(type, 1);
  const structuredValues = { ...values };
  if (health) structuredValues['dnd.health'] = health;
  base.page.content = buildPageRecordContent({
    id: base.page.id, schemaVersion: 2,
    type, template: 'card', tags: ['card', type],
    body: propertiesBody,
    variablesJson: {
      formatVersion: 1, schemaVersion: 1,
      schemaDigest: definition.digest,
      values: structuredValues, overrides: {}, inactive: []
    },
    now: '2026-09-28T00:00:00Z'
  });
  base.page.type = type;
  base.page.schemaVersion = 2;
  await base.adapter.writeText(base.page.path, base.page.content);
  await base.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
  setPages([base.page]);
  return {
    ...base,
    originalContent: base.page.content,
    workspaceContext: captureStorageWorkspaceContext()
  };
}


async function prepareMapPlan(fixture, intent) {
  return prepareCampaignMapCharacterHealthChange({
    page: fixture.page,
    intent,
    pages: [fixture.page],
    workspaceContext: fixture.workspaceContext
  });
}


function storedHealth(current, max, temp) {
  return {
    'dnd.hpCurrent': current,
    'dnd.hpMax': max,
    'dnd.hpTemporary': temp
  };
}
