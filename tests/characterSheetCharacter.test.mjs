import './setup.mjs';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUNDLED_CARD_TYPE_DEFINITIONS,
  BUNDLED_FIELD_SET_DEFINITIONS
} from '../js/cardTypes/definitions/bundledDefinitions.js';
import {
  commitStructuredCharacterSheetChange,
  prepareCharacterSheetContext,
  prepareStructuredCharacterSheetChange,
  readCharacterSheetCharacter
} from '../js/editor/characterSheetCharacter.js';
import {
  buildPageRecordContent,
  createPageStateIdentityFromContent,
  parsePageRecordContent,
  updatePageRecordContent
} from '../js/core/pageRecord.js';
import {
  CARD_TYPE_CATALOG_PATH,
  createCardTypeRegistryFromCatalog,
  serializeCardTypeCatalog
} from '../js/storage/cardTypeCatalogStorage.js';
import { persistPageContentCommand } from '../js/storage/pageCommandService.js';
import { captureStorageWorkspaceContext, setStorageAdapter } from '../js/storage/storageAdapter.js';
import { setPages } from '../js/stateActions.js';
import { createEditConflictFixture, createMemoryStorageAdapter } from './fixtures/editConflictFixtures.mjs';


const catalog = {
  formatVersion: 1,
  revision: 1,
  types: BUNDLED_CARD_TYPE_DEFINITIONS,
  fieldSets: BUNDLED_FIELD_SET_DEFINITIONS
};

const registry = createCardTypeRegistryFromCatalog(catalog);
const propertiesBody = `
  <section class="card-properties-block" data-block-type="properties" data-card-type="character">
    <input data-property-name="level" value="99">
    <input data-property-name="str" value="3">
    <input data-property-name="hpCurrent" value="99">
    <input data-property-name="hpMax" value="99">
    <input data-property-name="hpTemp" value="0">
  </section>
  <p>Body marker</p>
`;


test('Sheet context keeps legacy catalog-independent and structured Character Entity-backed', async () => {
  const legacy = await createEditConflictFixture({
    id: 'sheet-legacy', type: 'character', body: propertiesBody
  });
  let reads = 0;
  const read = legacy.adapter.readText.bind(legacy.adapter);
  legacy.adapter.readText = async path => {
    if (path === CARD_TYPE_CATALOG_PATH) reads += 1;
    return read(path);
  };
  const legacyContext = await prepareCharacterSheetContext({
    page: legacy.page, pages: [legacy.page]
  });
  assert.equal(legacyContext.mode, 'legacy-only');
  assert.equal(reads, 0);
  assert.equal(readCharacterSheetCharacter(legacy.page, {
    pages: [legacy.page], context: legacyContext
  }).source, 'legacy');

  const structured = await fixture();
  const context = await prepareCharacterSheetContext({
    page: structured.page, pages: [structured.page]
  });
  const source = readCharacterSheetCharacter(structured.page, {
    pages: [structured.page], context
  });
  assert.equal(context.mode, 'source-aware');
  assert.equal(source.status, 'ready');
  assert.equal(source.source, 'structured');
  assert.equal(source.model.source, 'entity');
  assert.equal(source.model.level, 5);
  assert.equal(source.model.abilities.str.score, 16);
  assert.deepEqual(source.model.health, {
    current: 8, max: 20, temp: 2, percent: 0.4, isDown: false
  });
});


test('Sheet level and ability writes use Variables, preserve siblings and verify CharacterModel', async () => {
  const valueFixture = await fixture();
  const context = await prepareCharacterSheetContext({
    page: valueFixture.page, pages: [valueFixture.page]
  });
  const originalBody = parsePageRecordContent(valueFixture.page.content).rawBody;

  const level = await commitStructuredCharacterSheetChange(
    prepareStructuredCharacterSheetChange({
      page: valueFixture.page,
      field: 'level',
      value: '6',
      expectedBase: createPageStateIdentityFromContent(valueFixture.page.content),
      pages: [valueFixture.page],
      context
    })
  );
  assert.equal(level.status, 'saved', JSON.stringify(level));
  assert.equal(level.verification.value, 6);

  const strength = await commitStructuredCharacterSheetChange(
    prepareStructuredCharacterSheetChange({
      page: valueFixture.page,
      field: 'str',
      value: '18',
      expectedBase: createPageStateIdentityFromContent(valueFixture.page.content),
      pages: [valueFixture.page],
      context
    })
  );
  assert.equal(strength.status, 'saved', JSON.stringify(strength));
  assert.equal(strength.verification.value, 18);

  const parsed = parsePageRecordContent(
    await valueFixture.adapter.readText(valueFixture.page.path)
  );
  assert.equal(parsed.rawBody, originalBody);
  assert.match(parsed.rawBody, /value="99"/);
  assert.equal(parsed.variablesJson.values['dnd.level'], 6);
  assert.deepEqual(parsed.variablesJson.values['character.abilities'], {
    'character.abilities.strength': 18,
    'character.abilities.dexterity': 14,
    'character.abilities.constitution': 12,
    'character.abilities.intelligence': 10,
    'character.abilities.wisdom': 10,
    'character.abilities.charisma': 10
  });
  const model = readCharacterSheetCharacter(valueFixture.page, {
    pages: [valueFixture.page], context
  }).model;
  assert.equal(model.abilities.str.modifier, 4);
  assert.equal(model.armorClass, 12);
});


test('Sheet current/temp delegate to Stage 8.2 and preserve health siblings without dual-write', async () => {
  const healthFixture = await fixture();
  const context = await prepareCharacterSheetContext({
    page: healthFixture.page, pages: [healthFixture.page]
  });
  for (const [field, value] of [['hpCurrent', 7], ['hpTemp', 4]]) {
    const result = await commitStructuredCharacterSheetChange(
      prepareStructuredCharacterSheetChange({
        page: healthFixture.page, field, value,
        expectedBase: createPageStateIdentityFromContent(healthFixture.page.content),
        pages: [healthFixture.page], context
      })
    );
    assert.equal(result.status, 'saved', JSON.stringify(result));
  }
  const parsed = parsePageRecordContent(
    await healthFixture.adapter.readText(healthFixture.page.path)
  );
  assert.deepEqual(parsed.variablesJson.values['dnd.health'], {
    'dnd.hpCurrent': 7,
    'dnd.hpMax': 20,
    'dnd.hpTemporary': 4,
    'character.health.formula': '5d8 + 10',
    'character.health.hitDice': '5d8'
  });
  assert.equal(parsed.variablesJson.values['character.category'], 'npc');
  assert.match(parsed.rawBody, /data-property-name="hpCurrent" value="99"/);
});


test('Sheet no-op performs no write and stale/catalog/workspace failures never fall back', async t => {
  await t.test('no-op', async () => {
    const noOpFixture = await fixture();
    const context = await prepareCharacterSheetContext({ page: noOpFixture.page, pages: [noOpFixture.page] });
    let pageWrites = 0;
    const write = noOpFixture.adapter.writeText.bind(noOpFixture.adapter);
    noOpFixture.adapter.writeText = async (path, content) => {
      if (path === noOpFixture.page.path) pageWrites += 1;
      return write(path, content);
    };
    const result = await commitStructuredCharacterSheetChange(
      prepareStructuredCharacterSheetChange({
        page: noOpFixture.page, field: 'level', value: '5',
        expectedBase: createPageStateIdentityFromContent(noOpFixture.page.content),
        pages: [noOpFixture.page], context
      })
    );
    assert.equal(result.status, 'unchanged');
    assert.equal(pageWrites, 0);
  });

  await t.test('stale page', async () => {
    const staleFixture = await fixture();
    const context = await prepareCharacterSheetContext({ page: staleFixture.page, pages: [staleFixture.page] });
    const plan = prepareStructuredCharacterSheetChange({
      page: staleFixture.page, field: 'level', value: '6',
      expectedBase: createPageStateIdentityFromContent(staleFixture.page.content),
      pages: [staleFixture.page], context
    });
    await persistPageContentCommand({
      page: staleFixture.page,
      content: updatePageRecordContent(staleFixture.page.content, { body: '<p>concurrent</p>' }),
      expectedBase: createPageStateIdentityFromContent(staleFixture.page.content)
    });
    assert.notEqual((await commitStructuredCharacterSheetChange(plan)).status, 'saved');
  });

  await t.test('catalog changed', async () => {
    const catalogFixture = await fixture();
    const context = await prepareCharacterSheetContext({ page: catalogFixture.page, pages: [catalogFixture.page] });
    const plan = prepareStructuredCharacterSheetChange({
      page: catalogFixture.page, field: 'level', value: '6',
      expectedBase: createPageStateIdentityFromContent(catalogFixture.page.content),
      pages: [catalogFixture.page], context
    });
    const changed = structuredClone(catalog);
    changed.revision = 2;
    changed.types.find(type => type.id === 'character').label = 'Changed';
    await catalogFixture.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(changed));
    assert.notEqual((await commitStructuredCharacterSheetChange(plan)).status, 'saved');
  });

  await t.test('workspace changed', async () => {
    const workspaceFixture = await fixture();
    const context = await prepareCharacterSheetContext({ page: workspaceFixture.page, pages: [workspaceFixture.page] });
    const plan = prepareStructuredCharacterSheetChange({
      page: workspaceFixture.page, field: 'level', value: '6',
      expectedBase: createPageStateIdentityFromContent(workspaceFixture.page.content),
      pages: [workspaceFixture.page], context
    });
    setStorageAdapter(createMemoryStorageAdapter());
    assert.notEqual((await commitStructuredCharacterSheetChange(plan)).status, 'saved');
  });
});


test('invalid/future structured Character stays unavailable without catalog or Properties fallback', async () => {
  const invalidFixture = await fixture();
  invalidFixture.page.content = invalidFixture.page.content.replace(
    /^variablesJson:.*$/m,
    'variablesJson: {broken'
  );
  await invalidFixture.adapter.writeText(invalidFixture.page.path, invalidFixture.page.content);
  const context = await prepareCharacterSheetContext({ page: invalidFixture.page, pages: [invalidFixture.page] });
  const source = readCharacterSheetCharacter(invalidFixture.page, {
    pages: [invalidFixture.page], context
  });
  assert.equal(context.mode, 'structured-unavailable');
  assert.equal(source.status, 'unavailable');
  assert.notEqual(source.model?.source, 'properties');
});


test('structured Player does not silently expand Character Sheet eligibility', async () => {
  const base = await createEditConflictFixture({
    id: 'structured-player-sheet', type: 'player', body: propertiesBody
  });
  const definition = registry.getResolvedType('player', 1);
  base.page.content = buildPageRecordContent({
    id: base.page.id,
    schemaVersion: 2,
    type: 'player',
    template: 'card',
    body: propertiesBody,
    variablesJson: {
      formatVersion: 1,
      schemaVersion: 1,
      schemaDigest: definition.digest,
      values: {},
      overrides: {}
    }
  });
  base.page.type = 'player';
  base.page.schemaVersion = 2;
  await base.adapter.writeText(base.page.path, base.page.content);
  await base.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
  setPages([base.page]);

  const context = await prepareCharacterSheetContext({
    page: base.page,
    pages: [base.page]
  });
  const source = readCharacterSheetCharacter(base.page, {
    pages: [base.page],
    context
  });
  assert.equal(context.mode, 'structured-unavailable');
  assert.equal(source.status, 'unavailable');
  assert.notEqual(source.model?.source, 'properties');
});


test('structured Sheet rejects empty and out-of-domain numeric input before write', async () => {
  const valueFixture = await fixture();
  const context = await prepareCharacterSheetContext({
    page: valueFixture.page,
    pages: [valueFixture.page]
  });
  const attempt = (field, value) => () => prepareStructuredCharacterSheetChange({
    page: valueFixture.page,
    field,
    value,
    expectedBase: createPageStateIdentityFromContent(valueFixture.page.content),
    pages: [valueFixture.page],
    context
  });

  assert.throws(attempt('level', ''), error => error.reason === 'integer-required');
  assert.throws(attempt('level', '21'), error => error.reason === 'level-out-of-range');
  assert.throws(attempt('str', '31'), error => error.reason === 'ability-out-of-range');
  assert.throws(attempt('hpCurrent', '-1'), error => error.reason === 'health-out-of-range');
});


async function fixture() {
  const base = await createEditConflictFixture({
    id: 'structured-sheet', type: 'character', body: propertiesBody
  });
  const definition = registry.getResolvedType('character', 1);
  base.page.content = buildPageRecordContent({
    id: base.page.id,
    schemaVersion: 2,
    type: 'character',
    template: 'card',
    body: propertiesBody,
    variablesJson: {
      formatVersion: 1,
      schemaVersion: 1,
      schemaDigest: definition.digest,
      values: {
        'dnd.level': 5,
        'character.category': 'npc',
        'character.abilities': {
          'character.abilities.strength': 16,
          'character.abilities.dexterity': 14,
          'character.abilities.constitution': 12,
          'character.abilities.intelligence': 10,
          'character.abilities.wisdom': 10,
          'character.abilities.charisma': 10
        },
        'dnd.health': {
          'dnd.hpCurrent': 8,
          'dnd.hpMax': 20,
          'dnd.hpTemporary': 2,
          'character.health.formula': '5d8 + 10',
          'character.health.hitDice': '5d8'
        }
      },
      overrides: {}
    },
    now: '2026-09-29T00:00:00Z'
  });
  base.page.type = 'character';
  base.page.schemaVersion = 2;
  await base.adapter.writeText(base.page.path, base.page.content);
  await base.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
  setPages([base.page]);
  return {
    ...base,
    workspaceContext: captureStorageWorkspaceContext()
  };
}
