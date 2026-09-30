import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerSheetFixture, playerValues, playerRegistry, playerCatalog } from './fixtures/playerSheetFixtures.mjs';
import { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent, createPageStateIdentityFromContent, updatePageRecordContent } from '../js/core/pageRecord.js';
import { prepareCharacterSheetContext, readCharacterSheetCharacter, prepareStructuredCharacterSheetChange, commitStructuredCharacterSheetChange } from '../js/editor/characterSheetCharacter.js';
import { DND_CHECKS, DND_STANDARD_SKILLS } from '../js/character/dndCheckContract.js';
import { CHARACTER_GAMEPLAY_FIELD_SET, CHARACTER_GAMEPLAY_ID, CHARACTER_SKILLS_KEY, CHARACTER_DEATH_KEY } from '../js/character/characterGameplayDefinition.js';
import { readCharacterGameplay } from '../js/character/characterGameplaySource.js';
import { ensureCharacterGameplayCatalog } from '../js/character/characterGameplayCommands.js';
import { readEntity } from '../js/variables/entityVariables.js';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import { validateFieldSetDefinition } from '../js/cardTypes/cardTypeSchema.js';
import { CardTypeRegistry } from '../js/cardTypes/cardTypeRegistry.js';
import { validateStructuredPageWrite } from '../js/storage/structuredPagePolicy.js';
import { getPageDndHealth, ensurePageDndHealth, updatePageDndHealth } from '../js/editor/campaignMapHealth.js';
import { readCharacterModelFromPage } from '../js/character/characterModel.js';
import { prepareInventoryContext, prepareInventoryChange, commitInventoryChange } from '../js/character/structuredInventory.js';
import { prepareStructuredCharacterHealthChange, commitStructuredCharacterHealthChange } from '../js/character/structuredCharacterHealth.js';

async function fixture(type = 'player', options = {}) {
  const f = await createPlayerSheetFixture(options);
  if (type === 'character') {
    const values = {
      'dnd.level': 5, 'character.abilities': Object.fromEntries(Object.entries(playerValues()['player.abilities']).map(([key, value]) => [key.replace('player.', 'character.'), value[`${key}.score`]])),
      'dnd.health': { 'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 2, 'character.health.hitDice': '5d8' },
      'character.savingThrows': ['strength'], 'character.skills': [{ 'character.skills.rowId': 'generic', 'character.skills.name': 'Perception', 'character.skills.details': 'expertise +99' }],
      'dnd.items': [], 'dnd.equippedItems': [], 'dnd.armorClass': { 'dnd.armorClass.value': 14 },
      'dnd.ownEffects': playerValues()['dnd.ownEffects'], ...(options.values || {})
    };
    const before = parsePageRecordContent(f.page.content);
    const content = buildPageRecordContent({ id: f.page.id, type, template: 'card', schemaVersion: 2, body: before.rawBody,
      variablesJson: { ...before.variablesJson, schemaDigest: playerRegistry.getResolvedType(type, 1).digest, values,
        extensions: options.extensions || before.variablesJson.extensions } });
    Object.assign(f.page, createRuntimePageFromContent({ content, path: f.page.path, name: f.page.name }));
    await f.adapter.writeText(f.page.path, content);
  }
  f.writes.length = 0;
  f.refresh = async () => f.context = await prepareCharacterSheetContext({ page: f.page, pages: f.pages });
  await f.refresh();
  f.prepare = (field, value) => prepareStructuredCharacterSheetChange({ page: f.page, pages: f.pages, context: f.context, field, value, expectedBase: createPageStateIdentityFromContent(f.page.content) });
  f.edit = async (field, value) => commitStructuredCharacterSheetChange(f.prepare(field, value));
  f.model = () => readCharacterSheetCharacter(f.page, { pages: f.pages, context: f.context }).model;
  f.record = async () => parsePageRecordContent(await f.adapter.readText(f.page.path));
  return f;
}

for (const check of DND_CHECKS.filter(item => item.isSave)) test(`Player writer ${check.key} preserves score/modifier/save siblings and projects proficiency/bonus`, async () => {
  const f = await fixture();
  const before = (await f.record()).variablesJson.values['player.abilities'];
  for (const [member, value] of [['proficient', true], ['bonus', -2.5], ['proficient', false], ['bonus', 0], ['bonus', 4]]) {
    assert.ok(['saved', 'unchanged'].includes((await f.edit(`${check.key}.${member}`, value)).status));
    const projected = f.model().calculations.checks.byKey[check.key];
    assert.equal(projected.inputs[member], value);
    assert.equal(projected.value, f.model().abilities[check.ability].modifier + (projected.inputs.proficient ? f.model().proficiencyBonus : 0) + projected.bonus);
  }
  const after = (await f.record()).variablesJson.values['player.abilities'];
  const key = `player.abilities.${check.abilityId}`;
  assert.equal(after[key][`${key}.score`], before[key][`${key}.score`]);
  assert.equal(after[key][`${key}.modifier`], 99);
  for (const other of Object.keys(before).filter(id => id !== key)) assert.deepEqual(after[other], before[other]);
});

for (const type of ['player', 'character']) for (const skill of DND_STANDARD_SKILLS) test(`${type} skill ${skill.id} shares mapping and typed proficiency/expertise/bonus writes`, async () => {
  const f = await fixture(type);
  const original = await f.record();
  for (const [member, value] of [['proficient', true], ['expertise', true], ['bonus', -2], ['proficient', false], ['expertise', false]]) {
    const result = await f.edit(`${skill.key}.${member}`, value);
    assert.ok(['saved', 'unchanged'].includes(result.status), JSON.stringify(result));
    const model = f.model(), check = model.calculations.checks.byKey[skill.key];
    assert.equal(check.inputs[member], value);
    assert.equal(check.value, model.abilities[skill.ability].modifier + model.proficiencyBonus * check.proficiencyLevel + check.bonus);
    assert.equal(model.calculations.byKey[skill.key].value, check.value);
  }
  const record = await f.record();
  assert.equal(record.rawBody, original.rawBody);
  assert.deepEqual(record.variablesJson.inactive, original.variablesJson.inactive);
  assert.deepEqual(record.variablesJson.values['dnd.health'], original.variablesJson.values['dnd.health']);
  if (type === 'character') {
    assert.equal(record.variablesJson.extensions.fields.filter(field => field.id === CHARACTER_GAMEPLAY_ID).length, 1);
    assert.equal(record.variablesJson.extensions.revision, original.variablesJson.extensions.revision + 1);
    assert.deepEqual(record.variablesJson.extensions.fields[0], original.variablesJson.extensions.fields[0]);
    assert.deepEqual(record.variablesJson.values['character.skills'], original.variablesJson.values['character.skills']);
    assert.equal(Object.hasOwn(record.variablesJson.values, CHARACTER_DEATH_KEY), false);
  }
  const count = f.writes.length;
  assert.equal((await f.edit(`${skill.key}.bonus`, -2)).status, 'unchanged');
  assert.equal(f.writes.length, count);
});

test('Character death saves first explicit action activates only death domain; all counts preserve other counter', async () => {
  const f = await fixture('character');
  const original = await f.record();
  assert.equal(f.model().deathSaves.successes, 0);
  assert.equal(f.model().calculations.checks.byKey.skillPerception.value, 4);
  assert.equal(f.writes.length, 0);
  assert.equal(Object.hasOwn(original.variablesJson.values, CHARACTER_SKILLS_KEY), false);
  for (const [field, other] of [['deathSaveSuccesses', 'failures'], ['deathSaveFailures', 'successes']]) {
    for (const value of [3, 2, 1, 0]) {
      const previous = f.model().deathSaves[other];
      assert.equal((await f.edit(field, value)).status, 'saved');
      assert.equal(f.model().deathSaves[other], previous);
    }
    for (const value of [-1, 4, 1.5, '', 'bad']) assert.throws(() => f.prepare(field, value));
  }
  const record = await f.record();
  assert.equal(Object.hasOwn(record.variablesJson.values, CHARACTER_SKILLS_KEY), false);
  assert.equal(record.rawBody, original.rawBody);
  assert.deepEqual(record.variablesJson.inactive, original.variablesJson.inactive);
});

test('optional Field Set is data-only, exact v1, no base definition mutation, no read materialization; partial source blocked', async () => {
  assert.equal(validateFieldSetDefinition(CHARACTER_GAMEPLAY_FIELD_SET).ok, true);
  assert.equal(CHARACTER_GAMEPLAY_FIELD_SET.version, 1);
  assert.deepEqual(CHARACTER_GAMEPLAY_FIELD_SET.fields.map(field => field.key), [CHARACTER_SKILLS_KEY, CHARACTER_DEATH_KEY]);
  assert.equal(DND_STANDARD_SKILLS.length, 18);
  const originalRegistry = new CardTypeRegistry({ bundledTypes: playerCatalog.types,
    bundledFieldSets: playerCatalog.fieldSets.filter(field => field.id !== CHARACTER_GAMEPLAY_ID) });
  for (const type of ['character', 'player']) assert.equal(originalRegistry.getResolvedType(type, 1).digest, playerRegistry.getResolvedType(type, 1).digest);
  for (const options of [
    { extensions: { revision: 1, fields: [{ id: CHARACTER_GAMEPLAY_ID, version: 1 }] } },
    { values: { [CHARACTER_SKILLS_KEY]: {} } },
    { extensions: { revision: 1, fields: [{ id: CHARACTER_GAMEPLAY_ID, version: 2 }] } }
  ]) {
    const f = await fixture('character', options);
    assert.equal(readCharacterSheetCharacter(f.page, { context: f.context }).status, 'unavailable');
    assert.throws(() => f.prepare('skillPerception.bonus', 2));
    assert.equal(f.writes.length, 0);
  }
});

test('bounded Character activation cannot change unrelated values/body or leave declaration/value partial', async () => {
  const f = await fixture('character');
  const before = parsePageRecordContent(f.page.content);
  const envelope = { ...before.variablesJson, values: { ...before.variablesJson.values,
    [CHARACTER_SKILLS_KEY]: { 'character.standardSkills.perception': { 'character.standardSkills.perception.bonus': 2 } } },
    extensions: { ...before.variablesJson.extensions, revision: before.variablesJson.extensions.revision + 1,
      fields: [...before.variablesJson.extensions.fields, { id: CHARACTER_GAMEPLAY_ID, version: 1 }] } };
  const validate = content => validateStructuredPageWrite({ beforeContent: f.page.content, content,
    expectedBase: createPageStateIdentityFromContent(f.page.content), characterGameplayCommand: true, storageAdapter: f.adapter });
  await validate(updatePageRecordContent(f.page.content, { variablesJson: envelope }, { preserveUnchangedMetadata: true, updateTimestamp: false }));
  for (const patch of [
    { variablesJson: { ...envelope, values: { ...envelope.values, 'dnd.level': 99 } } },
    { variablesJson: { ...envelope, values: before.variablesJson.values } },
    { variablesJson: { ...envelope, extensions: before.variablesJson.extensions } },
    { variablesJson: envelope, body: '<p>forbidden change</p>' }
  ]) await assert.rejects(validate(updatePageRecordContent(f.page.content, patch, { preserveUnchangedMetadata: true, updateTimestamp: false })));
  assert.equal(f.writes.length, 0);
});

test('structured source never uses bundled Registry fallback or legacy Map/DnD materialization', async () => {
  const f = await fixture('character');
  const original = f.page.content;
  assert.equal(readCharacterModelFromPage(f.page, { pages: f.pages }).source, 'structured-unavailable');
  assert.equal(getPageDndHealth(f.page), null);
  assert.equal(ensurePageDndHealth(f.page), null);
  assert.equal(updatePageDndHealth(f.page, { delta: -3 }), null);
  assert.equal(f.page.content, original);
  assert.equal(f.writes.length, 0);
});

test('Inventory no-op verifies physical Item target and quantity base without an owner write', async () => {
  for (const type of ['add', 'quantity']) {
    const f = await fixture();
    const context = await prepareInventoryContext({ page: f.page, repository: f.context.repository });
    const plan = prepareInventoryChange({ pageId: f.page.id, expectedBase: createPageStateIdentityFromContent(f.page.content), context,
      request: { type, pageId: f.item.id, quantity: 3, expectedItemBase: createPageStateIdentityFromContent(f.item.content) } });
    assert.equal(plan.changed, false);
    if (type === 'add') await f.adapter.removeFile(f.item.path);
    else await f.adapter.writeText(f.item.path, updatePageRecordContent(f.item.content, { body: '<p>external</p>' }));
    const count = f.writes.length;
    assert.equal((await commitInventoryChange(plan)).status, 'blocked');
    assert.equal(f.writes.length, count);
  }
});

test('canonical health no-op verifies physical whole-page source and activated schema closure', async () => {
  for (const scenario of ['stale', 'catalog', 'closure']) {
    const f = await fixture();
    const plan = prepareStructuredCharacterHealthChange({ pageId: f.page.id, context: f.context,
      expectedBase: createPageStateIdentityFromContent(f.page.content), request: { type: 'maximum', hpMax: 20 } });
    if (scenario === 'stale') await f.adapter.writeText(f.page.path, updatePageRecordContent(f.page.content, { body: '<p>external</p>' }));
    else if (scenario === 'catalog') await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...playerCatalog, revision: 8 }));
    else await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...playerCatalog, types: playerCatalog.types.filter(type => type.id !== 'player') }));
    const count = f.writes.length;
    assert.equal((await commitStructuredCharacterHealthChange(plan)).status, 'blocked');
    assert.equal(f.writes.length, count);
  }
});

test('Player read never materializes absent optional save/skill members; explicit action does', async () => {
  const values = playerValues(); delete values['player.skills']; delete values['player.abilities'];
  const f = await fixture('player', { values });
  assert.equal(f.model().calculations.checks.byKey.saveStr.value, 0);
  assert.equal(f.writes.length, 0);
  assert.equal((await f.edit('saveStr.bonus', 2)).status, 'saved');
  assert.equal((await f.edit('skillStealth.expertise', true)).status, 'saved');
  const stored = (await f.record()).variablesJson.values;
  assert.deepEqual(stored['player.abilities'], { 'player.abilities.strength': { 'player.abilities.strength.saveBonus': 2 } });
  assert.deepEqual(stored['player.skills'], { 'player.skills.stealth': { 'player.skills.stealth.expertise': true } });
  assert.equal(f.model().calculations.checks.byKey.skillStealth.proficiencyLevel, 2);
});

for (const type of ['player', 'character']) for (const scenario of ['stale', 'workspace', 'catalog', 'closure', 'moved', 'missing', 'write', 'readback', 'reuse']) test(`${type} new check writer guard ${scenario}`, async () => {
  const f = await fixture(type);
  const plan = f.prepare('skillPerception.bonus', 5);
  if (scenario === 'stale') await f.adapter.writeText(f.page.path, updatePageRecordContent(f.page.content, { body: '<p>external</p>' }));
  if (scenario === 'workspace') setStorageAdapter((await createPlayerSheetFixture()).adapter);
  if (scenario === 'catalog') await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...playerCatalog, revision: 2 }));
  if (scenario === 'closure') await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...playerCatalog, fieldSets: playerCatalog.fieldSets.filter(field => field.id !== CHARACTER_GAMEPLAY_ID) }));
  if (scenario === 'moved') f.page.path += '.moved';
  if (scenario === 'missing') await f.adapter.removeFile(f.page.path);
  if (scenario === 'write') f.adapter.writeText = async () => { throw new Error('write failed'); };
  if (scenario === 'readback') { const write = f.adapter.writeText.bind(f.adapter); f.adapter.writeText = async (path, content) => write(path, content.replace('"bonus":5', '"bonus":6').replace('.bonus":5', '.bonus":6')); }
  if (scenario === 'reuse') assert.equal((await commitStructuredCharacterSheetChange(plan)).status, 'saved');
  const result = await commitStructuredCharacterSheetChange(plan);
  assert.notEqual(result.status, 'saved', JSON.stringify(result));
  assert.equal((await commitStructuredCharacterSheetChange(plan)).status, 'blocked');
});

test('explicit edit activates missing catalog Field Set through existing catalog owner only; read does not', async () => {
  const f = await fixture('character');
  await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...playerCatalog, fieldSets: playerCatalog.fieldSets.filter(field => field.id !== CHARACTER_GAMEPLAY_ID) }));
  await f.refresh();
  const count = f.writes.length;
  f.model(); assert.equal(f.writes.length, count);
  assert.throws(() => f.prepare('skillPerception.proficient', true));
  await ensureCharacterGameplayCatalog(f.context);
  await f.refresh();
  assert.equal((await f.edit('skillPerception.proficient', true)).status, 'saved');
  const catalog = JSON.parse(await f.adapter.readText(CARD_TYPE_CATALOG_PATH));
  assert.equal(catalog.fieldSets.filter(field => field.id === CHARACTER_GAMEPLAY_ID).length, 1);
});

test('no-op rechecks durable source and catalog, while legacy overrides/inactive never become structured inputs', async () => {
  const f = await fixture('character');
  assert.equal((await f.edit('skillPerception.bonus', 0)).status, 'saved');
  const plan = f.prepare('skillPerception.bonus', 0);
  await f.adapter.writeText(f.page.path, updatePageRecordContent(f.page.content, { body: '<p>changed</p>' }));
  assert.equal((await commitStructuredCharacterSheetChange(plan)).status, 'blocked');
  const blocked = await fixture('player');
  const noOp = blocked.prepare('saveStr.proficient', true);
  await blocked.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...playerCatalog, revision: 9 }));
  assert.equal((await commitStructuredCharacterSheetChange(noOp)).status, 'blocked');
});

test('conflicting Properties and inactive manual totals cannot become structured gameplay owners', async () => {
  const fields = ['armorClass', 'initiative', 'speed', 'override-armorClass', 'override-initiative', 'override-speed', 'saveStr', 'skillPerception', 'hitDie', 'deathSaveSuccesses'];
  const body = `<section class="card-properties-block" data-block-type="properties" data-card-type="character">${fields.map(key => `<input data-property-name="${key}" value="99">`).join('')}</section><div class="dnd-stats-block">99</div>`;
  for (const type of ['character', 'player']) {
    const f = await fixture(type, { body });
    const original = await f.record();
    const inactive = [{ manualOverrides: Object.fromEntries(fields.map(key => [key, 99])) }];
    const content = updatePageRecordContent(f.page.content, { variablesJson: { ...original.variablesJson, inactive } });
    Object.assign(f.page, createRuntimePageFromContent({ content, path: f.page.path, name: f.page.name }));
    await f.adapter.writeText(f.page.path, content);
    await f.refresh();
    const model = f.model();
    assert.equal(model.source, 'entity');
    assert.equal(model.armorClass, 15);
    assert.equal(model.speed, 30);
    assert.equal(model.calculations.initiative.value, 2);
    assert.equal(model.health.current, 8);
    assert.equal(model.health.max, 20);
    assert.equal(model.deathSaves.successes, type === 'character' ? 0 : 1);
    assert.equal(model.calculations.checks.byKey.saveStr.value, 6);
    assert.equal(model.calculations.checks.byKey.skillPerception.value, 4);
    for (const field of ['armorClass', 'initiative', 'speed', 'saveStr', 'skillPerception', 'override-armorClass']) assert.throws(() => f.prepare(field, 99));
    assert.equal((await f.edit('skillPerception.bonus', 2)).status, 'saved');
    const after = await f.record();
    assert.equal(after.rawBody, original.rawBody);
    assert.deepEqual(after.variablesJson.inactive, inactive);
  }
});
