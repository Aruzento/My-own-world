import './setup.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareCharacterSheetContext, readCharacterSheetCharacter, prepareStructuredCharacterSheetChange, commitStructuredCharacterSheetChange } from '../js/editor/characterSheetCharacter.js';
import { createPageStateIdentityFromContent, parsePageRecordContent, updatePageRecordContent } from '../js/core/pageRecord.js';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import { DND_SKILL_GROUPS } from '../js/properties/propertySchemas.js';
import { createPlayerSheetFixture, playerValues, playerCatalog, PLAYER_ABILITIES } from './fixtures/playerSheetFixtures.mjs';

async function fixture(options) {
  const f = await createPlayerSheetFixture(options);
  f.context = await prepareCharacterSheetContext({ page: f.page, pages: f.pages });
  f.prepare = (field, value) => prepareStructuredCharacterSheetChange({ page: f.page, field, value,
    expectedBase: createPageStateIdentityFromContent(f.page.content), pages: f.pages, context: f.context });
  f.model = () => readCharacterSheetCharacter(f.page, { pages: f.pages, context: f.context }).model;
  f.values = async () => parsePageRecordContent(await f.adapter.readText(f.page.path)).variablesJson.values;
  return f;
}

test('Player Sheet source is Entity-only; legacy Player, invalid/future and missing catalog never get Properties owners', async () => {
  const f = await fixture();
  assert.equal(f.context.mode, 'source-aware');
  assert.equal(f.model().source, 'entity');
  assert.equal(f.model().sources.properties, false);
  assert.equal(f.model().level, 5);
  assert.equal(f.model().inventory.source, 'entity');
  assert.equal(f.model().effects.effects.some(effect => effect.title === 'Player own effect'), true);
  assert.equal(f.model().inventory.items[0].pageId, 'player-item'); // DOM-backed Item Effects integration is covered in Chromium.
  assert.equal(readCharacterSheetCharacter(f.page, { pages: f.pages, context: f.context }).presentation.identity.class, 'Exact Player Class');
  for (const options of [{ legacy: true }, { noCatalog: true }]) {
    const blocked = await fixture(options);
    assert.equal(readCharacterSheetCharacter(blocked.page, { context: blocked.context }).status, 'unavailable');
    assert.throws(() => blocked.prepare('level', 6));
    assert.equal(blocked.writes.length, 0);
  }
  for (const wire of ['{broken', '{"formatVersion":2}']) {
    const invalid = await fixture();
    invalid.page.content = invalid.page.content.replace(/^variablesJson:.*$/m, `variablesJson: ${wire}`);
    assert.equal(readCharacterSheetCharacter(invalid.page, { context: invalid.context }).status, 'unavailable');
    assert.throws(() => invalid.prepare('level', 6));
  }
});

test('Player level and all six score writes preserve nested owners, metadata, recovery and siblings', async () => {
  const f = await fixture();
  const before = parsePageRecordContent(f.page.content);
  const progression = structuredClone(before.variablesJson.values['player.progression']);
  const expectedAbilities = structuredClone(before.variablesJson.values['player.abilities']);
  for (const [field, value] of [['level', 21], ...['str', 'dex', 'con', 'int', 'wis', 'cha'].map(key => [key, 20])]) {
    const plan = f.prepare(field, value);
    assert.equal(Object.isFrozen(plan), true);
    const result = await commitStructuredCharacterSheetChange(plan);
    assert.equal(result.status, 'saved', JSON.stringify(result));
    assert.equal(result.verification.value, value);
    assert.equal((await commitStructuredCharacterSheetChange(plan)).status, 'blocked');
  }
  const after = parsePageRecordContent(await f.adapter.readText(f.page.path));
  progression['dnd.level'] = 21;
  assert.deepEqual(after.variablesJson.values['player.progression'], progression);
  assert.equal(Object.hasOwn(after.variablesJson.values, 'dnd.level'), false);
  for (const id of PLAYER_ABILITIES) expectedAbilities[`player.abilities.${id}`][`player.abilities.${id}.score`] = 20;
  assert.deepEqual(after.variablesJson.values['player.abilities'], expectedAbilities);
  assert.equal(f.model().abilities.str.modifier, 5); // stored modifier 99 remains data, not override
  assert.equal(after.rawBody, before.rawBody);
  assert.match(await f.adapter.readText(f.page.path), /playerEvidence: preserved/);
  assert.deepEqual(after.variablesJson.extensions, before.variablesJson.extensions);
  assert.deepEqual(after.variablesJson.inactive, before.variablesJson.inactive);
  for (const key of Object.keys(before.variablesJson.values).filter(key => !['player.progression', 'player.abilities'].includes(key))) {
    assert.deepEqual(after.variablesJson.values[key], before.variablesJson.values[key]);
  }
  assert.equal((await commitStructuredCharacterSheetChange(f.prepare('level', 21))).status, 'unchanged');
  assert.equal(f.writes.length, 7);
  assert.throws(() => f.prepare('level', -1), /validation/);
  for (const value of [1.5, '', 'x']) assert.throws(() => f.prepare('level', value));
  for (const value of [0, 31, 1.5, '', 'x']) assert.throws(() => f.prepare('str', value));
});

test('Player explicit core owners are required; presentation defaults never materialize', async () => {
  for (const [key, field, value] of [['player.progression', 'level', 6], ['player.abilities', 'str', 18], ['player.deathSaves', 'deathSaveSuccesses', 1]]) {
    const values = playerValues(); delete values[key];
    const f = await fixture({ values });
    assert.equal(f.context.mode, 'source-aware');
    assert.throws(() => f.prepare(field, value), /explicit/);
    assert.equal(f.writes.length, 0);
    assert.equal(Object.hasOwn(await f.values(), key), false);
  }
  const values = playerValues(); values['player.abilities']['player.abilities.strength'] = { 'player.abilities.strength.saveBonus': 3 };
  const f = await fixture({ values });
  assert.throws(() => f.prepare('str', 18), /explicit/);
  const invalid = playerValues(); invalid['player.deathSaves']['player.deathSaves.successes'] = 4;
  assert.equal((await fixture({ values: invalid })).context.mode, 'structured-unavailable');
});

test('Player HP delegates all three fields to canonical health and death saves preserve the other counter', async () => {
  const f = await fixture();
  const health = structuredClone((await f.values())['dnd.health']);
  for (const [field, value] of [['hpCurrent', 7], ['hpTemp', 4], ['hpMax', 30]]) {
    assert.equal((await commitStructuredCharacterSheetChange(f.prepare(field, value))).status, 'saved');
  }
  assert.throws(() => f.prepare('hpMax', 6), error => error.reason === 'max-below-current');
  health['dnd.hpCurrent'] = 7; health['dnd.hpTemporary'] = 4; health['dnd.hpMax'] = 30;
  assert.deepEqual((await f.values())['dnd.health'], health);
  for (const [field, other] of [['deathSaveSuccesses', 'failures'], ['deathSaveFailures', 'successes']]) {
    const originalOther = f.model().deathSaves[other];
    for (const value of [0, 1, 2, 3]) {
      const result = await commitStructuredCharacterSheetChange(f.prepare(field, value));
      assert.equal(result.status, 'saved');
      assert.equal(result.verification.value, value);
      assert.equal(f.model().deathSaves[other], originalOther);
    }
    for (const value of [-1, 4, 1.5]) assert.throws(() => f.prepare(field, value));
    const writeCount = f.writes.length;
    assert.equal((await commitStructuredCharacterSheetChange(f.prepare(field, 3))).status, 'unchanged');
    assert.equal(f.writes.length, writeCount);
  }
});

test('Player identity presentation resolves only exact ids and validates target type/state', async () => {
  const values = playerValues();
  values['player.identity'] = {
    'player.identity.class': { pageId: 'player-class' },
    'player.identity.race': { pageId: 'player-item' },
    'player.identity.subrace': { pageId: 'missing-id' }
  };
  const f = await fixture({ values });
  const source = readCharacterSheetCharacter(f.page, { context: f.context, pages: f.pages });
  assert.equal(source.presentation.identity.class, 'Exact Player Class');
  assert.equal(source.presentation.identity.race, undefined);
  assert.equal(source.presentation.identity.subrace, undefined);
  assert.deepEqual(source.presentation.diagnostics.map(issue => issue.pageId), ['player-item', 'missing-id']);
  f.classPage.content = f.classPage.content.replace('type: class', 'type: item');
  assert.equal(readCharacterSheetCharacter(f.page, { context: f.context, pages: f.pages }).presentation.identity.class, undefined);
  assert.equal(f.writes.length, 0);
});

test('Player Sheet domain reread failure after confirmed Variables persistence is uncertain, without rollback/retry', async () => {
  const f = await fixture();
  const plan = f.prepare('level', 6);
  const read = f.adapter.readText.bind(f.adapter);
  const write = f.adapter.writeText.bind(f.adapter);
  let written = false; let rereads = 0;
  f.adapter.writeText = async (path, content) => { await write(path, content); if (path === f.page.path) written = true; };
  f.adapter.readText = async path => {
    const content = await read(path);
    if (path === f.page.path && written && ++rereads === 2) throw new Error('domain reread unavailable');
    return content;
  };
  const result = await commitStructuredCharacterSheetChange(plan);
  assert.equal(result.status, 'uncertain');
  assert.equal(result.written, true);
  assert.equal(result.code, 'CHARACTER_SHEET_DOMAIN_READBACK_FAILED');
  assert.equal(parsePageRecordContent(await read(f.page.path)).variablesJson.values['player.progression']['dnd.level'], 6);
  assert.equal(f.writes.length, 1);
  assert.equal((await commitStructuredCharacterSheetChange(plan)).status, 'blocked');
});

test('Player saves and all 18 skills reuse stable check keys, score-derived modifiers, proficiency, expertise and data bonuses', async () => {
  const values = playerValues();
  const groups = DND_SKILL_GROUPS;
  let index = 0;
  for (const group of groups) for (const item of group.items.filter(item => item.name.startsWith('skill'))) {
    const name = item.name.slice(5); const id = name[0].toLowerCase() + name.slice(1); const key = `player.skills.${id}`;
    values['player.skills'][key] = { [`${key}.proficient`]: index % 3 === 1, [`${key}.expertise`]: index % 3 === 2, [`${key}.bonus`]: index++ };
  }
  const f = await fixture({ values }); const model = f.model();
  assert.equal(Object.keys(model.calculations.checks.byKey).length, 24);
  for (const [idx, [ability, key]] of Object.entries({ str: 'saveStr', dex: 'saveDex', con: 'saveCon', int: 'saveInt', wis: 'saveWis', cha: 'saveCha' }).entries()) {
    const check = model.calculations.checks.byKey[key];
    assert.equal(check.value, model.abilities[ability].modifier + (idx % 2 === 0 ? 3 : 0) + idx);
    assert.equal(check.proficient, idx % 2 === 0);
    assert.equal(model.calculations.byKey[key], check);
  }
  index = 0;
  for (const group of groups) for (const item of group.items.filter(item => item.name.startsWith('skill'))) {
    const check = model.calculations.checks.byKey[item.name]; const level = index % 3;
    assert.equal(check.value, model.abilities[group.ability].modifier + level * 3 + index++);
    assert.equal(check.proficiencyLevel, level); assert.equal(check.expertise, level === 2);
    assert.equal(model.calculations.byKey[item.name], check);
  }
  assert.equal(f.writes.length, 0);
  const absent = playerValues(); delete absent['player.skills'];
  for (const id of PLAYER_ABILITIES) { delete absent['player.abilities'][`player.abilities.${id}`][`player.abilities.${id}.saveBonus`]; delete absent['player.abilities'][`player.abilities.${id}`][`player.abilities.${id}.saveProficient`]; }
  const empty = await fixture({ values: absent });
  for (const group of groups) for (const item of group.items) assert.equal(empty.model().calculations.checks.byKey[item.name].value, empty.model().abilities[group.ability].modifier);
  assert.equal(empty.writes.length, 0); assert.equal(Object.hasOwn(await empty.values(), 'player.skills'), false);
});

test('Player Sheet keeps generic Variables stale/workspace/catalog/missing-page/write/readback guards', async t => {
  for (const scenario of ['stale', 'workspace', 'catalog', 'moved', 'missing', 'write', 'readback']) await t.test(scenario, async () => {
    const f = await fixture(); const plan = f.prepare('level', 6);
    if (scenario === 'stale') await f.adapter.writeText(f.page.path, updatePageRecordContent(f.page.content, { body: '<p>external</p>' }));
    if (scenario === 'workspace') setStorageAdapter((await createPlayerSheetFixture()).adapter);
    if (scenario === 'catalog') await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...playerCatalog, types: playerCatalog.types.filter(type => type.id !== 'player') }));
    if (scenario === 'moved') f.page.path += '.moved';
    if (scenario === 'missing') await f.adapter.removeFile(f.page.path);
    if (scenario === 'write') f.adapter.writeText = async () => { throw new Error('write failure'); };
    if (scenario === 'readback') { const write = f.adapter.writeText.bind(f.adapter); f.adapter.writeText = async (path, content) => write(path, content.replace('"dnd.level":6', '"dnd.level":7')); }
    const result = await commitStructuredCharacterSheetChange(plan);
    assert.notEqual(result.status, 'saved');
    assert.equal((await commitStructuredCharacterSheetChange(plan)).status, 'blocked');
  });
});
