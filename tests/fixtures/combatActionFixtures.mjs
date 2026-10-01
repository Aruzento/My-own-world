import { createDataSafetyPage, createMemoryWorkspaceAdapter } from './dataSafetyFixtures.mjs';
import { CampaignMapModel } from '../../js/editor/campaignMapModel.js';
import { serializeCampaignMapModelHTML } from '../../js/editor/campaignMapDataSerializer.js';
import { createPropertiesBlock } from '../../js/templates/blockTypes.js';
import { setStorageAdapter } from '../../js/storage/storageAdapter.js';
import { rebuildPageRepository } from '../../js/repository/pageRepository.js';
import { createDiceSequenceRandomInt } from './diceSequenceRandomInt.mjs';

export function attackRequest() {
  return { kind: 'CombatActionRequest', version: 1, actionId: 'action-1', mapPageId: 'map-1', sessionId: 'session-1',
    actor: { participantId: 'token:actor' }, target: { participantId: 'token:target' },
    action: { type: 'attack', definitionId: 'shortbow', label: 'Shortbow', source: { kind: 'manual' },
      hitPolicy: 'ac-total-v1', attackRoll: { formula: 'd20 + 4', mode: 'normal', criticalPolicy: 'none' },
      damageComponents: [{ componentId: 'piercing-1', damageType: 'piercing',
        roll: { formula: '1d6 + 2', mode: 'normal', criticalPolicy: 'none' } }] } };
}

// Disposable real Properties + PageRecord + map serializer fixtures; memory storage uses the shared owner fixture.
export async function createCombatActionWorld({ current = 10, max = 10, temp = 0, dice = [10, 3],
  actorName = 'actor', targetName = 'target', status = 'active', rawLegacy = false } = {}) {
  const characterPage = (id, health) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<div class="card-properties-block" data-block-type="properties" data-card-type="character">' +
      ['hpCurrent', 'hpMax', 'hpTemp', 'dex'].map(key => `<input type="number" data-property-name="${key}" value="0">`).join('') + '</div>';
    for (const [field, value] of Object.entries({ hpCurrent: health.current, hpMax: max, hpTemp: health.temp, dex: 14 })) {
      const control = wrapper.querySelector(`[data-property-name="${field}"]`);
      control.value = String(value);
      control.setAttribute('value', String(value));
    }
    return createDataSafetyPage({ id, type: 'character', body: wrapper.innerHTML + '<p>Preserved unrelated text</p>' });
  };
  const actor = characterPage('actor-page', { current: 10, temp: 0 });
  const target = characterPage('target-page', { current, temp });
  const names = { actor: actorName, target: targetName };
  const tokens = ['actor', 'target'].map(tokenId => ({ tokenId, pageId: `${tokenId}-page`, name: names[tokenId], sourceMode: 'original' }));
  const mapModel = new CampaignMapModel({ tokens,
    initiative: { participants: tokens.map(t => ({ ...t, participantId: `token:${t.tokenId}` })), activeParticipantId: 'token:actor' },
    combatSession: { sessionId: 'session-1', status, round: 3,
      participants: [{ participantId: 'token:actor' }, { participantId: 'token:target' }, { participantId: 'token:broken' }] } });
  const map = createDataSafetyPage({ id: 'map-1', type: 'campaignMap', template: 'campaignMap',
    body: serializeCampaignMapModelHTML({ title: 'Map', model: mapModel }) });
  const pages = [actor, target, map];
  const adapter = createMemoryWorkspaceAdapter();
  for (const p of pages) await adapter.writeText(p.path, p.content);
  setStorageAdapter(adapter);
  rebuildPageRepository(pages);
  if (!rawLegacy) {
    // Production parity starts with explicitly migrated and retired legacy actors.
    // Setup writes precede the combat counters and never become action evidence.
    const { previewLegacyPropertiesMigration, executeLegacyPropertiesMigration } = await import('../../js/migration/propertiesMigration.js');
    const { previewLegacySourceRetirement, executeLegacySourceRetirement } = await import('../../js/migration/legacySourceRetirement.js');
    const migrated = await executeLegacyPropertiesMigration(await previewLegacyPropertiesMigration({ pageIds: [actor.id, target.id] }), { confirm: true });
    if (migrated.status !== 'completed') throw new Error(JSON.stringify(migrated));
    const retired = await executeLegacySourceRetirement(await previewLegacySourceRetirement({ pageIds: [actor.id, target.id] }), { confirm: true });
    if (retired.status !== 'completed') throw new Error(JSON.stringify(retired));
    for (const page of [actor, target]) {
      const { createRuntimePageFromContent } = await import('../../js/core/pageRecord.js');
      Object.assign(page, createRuntimePageFromContent({ content: await adapter.readText(page.path), path: page.path, name: page.name }));
    }
    const { prepareVariablesChange, commitVariablesChange } = await import('../../js/variables/variableCommands.js');
    const { createPageStateIdentityFromContent } = await import('../../js/core/pageRecord.js');
    const { readCardTypeCatalog, createCardTypeRegistryFromCatalog } = await import('../../js/storage/cardTypeCatalogStorage.js');
    const registry = createCardTypeRegistryFromCatalog((await readCardTypeCatalog()).catalog, { bundledTypes: [], bundledFieldSets: [] });
    for (const page of [actor, target]) {
      // An explicit canonical defense is a Combat precondition, never reverse-mapped from a legacy total.
      const plan = prepareVariablesChange({ pageId: page.id, context: { registry }, expectedBase: createPageStateIdentityFromContent(page.content),
        patch: [{ op: 'set', key: 'dnd.armorClass', value: { 'dnd.armorClass.value': 12 } }] });
      const result = await commitVariablesChange(plan);
      if (result.status !== 'saved') throw new Error(JSON.stringify(result));
      const { createRuntimePageFromContent } = await import('../../js/core/pageRecord.js');
      Object.assign(page, createRuntimePageFromContent({ content: await adapter.readText(page.path), path: page.path, name: page.name }));
    }
  }
  const original = { readText: adapter.readText.bind(adapter), writeText: adapter.writeText.bind(adapter) };
  const effects = { writes: 0, appends: 0, reads: 0 };
  adapter.readText = async path => { effects.reads++; return original.readText(path); };
  adapter.writeText = async (path, content) => { effects.writes++; return original.writeText(path, content); };
  adapter.appendText = async (path, content) => {
    effects.appends++;
    let previous = '';
    try { previous = await original.readText(path); } catch { /* New fixture log. */ }
    await original.writeText(path, previous + content);
  };
  setStorageAdapter(adapter);
  rebuildPageRepository(pages);
  const rng = createDiceSequenceRandomInt(dice);
  let sequence = 0;
  const context = { mapPageId: map.id, mapModel, dirty: false };
  const { readCardTypeCatalog, createCardTypeRegistryFromCatalog } = await import('../../js/storage/cardTypeCatalogStorage.js');
  const registry = rawLegacy ? null : createCardTypeRegistryFromCatalog((await readCardTypeCatalog()).catalog, { bundledTypes: [], bundledFieldSets: [] });
  return { actor, target, map, pages, mapModel, context, adapter, original, effects, rng, registry,
    options: { getMapContext: () => context, randomInt: rng.randomInt,
      createId: () => `fixture-${++sequence}`, now: () => '2026-09-22T10:00:00.000Z' } };
}

export async function createStructuredCombatActionWorld({
  actorStructured = true, targetStructured = true, current = 8, max = 20, temp = 0,
  dice = [10, 1], contradictoryProperties = true
} = {}) {
  const world = await createCombatActionWorld({ current, max, temp, dice, rawLegacy: true });
  const { BUNDLED_CARD_TYPE_DEFINITIONS: types,
    BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('../../js/cardTypes/definitions/bundledDefinitions.js');
  const { CARD_TYPE_CATALOG_PATH, createCardTypeRegistryFromCatalog,
    serializeCardTypeCatalog } = await import('../../js/storage/cardTypeCatalogStorage.js');
  const { buildPageRecordContent, parsePageRecordContent } = await import('../../js/core/pageRecord.js');
  const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
  const registry = createCardTypeRegistryFromCatalog(catalog);
  await world.original.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));

  const makeStructured = async (page, health) => {
    const definition = registry.getResolvedType('character', 1);
    const parsed = parsePageRecordContent(page.content);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = parsed.rawBody;
    if (contradictoryProperties) {
      for (const [field, value] of Object.entries({ hpCurrent: 99, hpMax: 99, hpTemp: 0, armorClass: 77 })) {
        const control = wrapper.querySelector(`[data-property-name="${field}"]`);
        if (!control) continue;
        control.value = String(value);
        control.setAttribute('value', String(value));
      }
    }
    page.content = buildPageRecordContent({
      id: page.id, schemaVersion: 2, type: 'character', template: 'card', body: wrapper.innerHTML,
      variablesJson: {
        formatVersion: 1, schemaVersion: 1, schemaDigest: definition.digest,
        values: {
          'dnd.level': 5,
          'character.abilities': {
            'character.abilities.strength': 10, 'character.abilities.dexterity': 14,
            'character.abilities.constitution': 12, 'character.abilities.intelligence': 10,
            'character.abilities.wisdom': 10, 'character.abilities.charisma': 10
          },
          'dnd.health': {
            'dnd.hpCurrent': health.current, 'dnd.hpMax': health.max,
            'dnd.hpTemporary': health.temp, 'character.health.formula': '5d8 + 5',
            'character.health.hitDice': '5d8'
          },
          'dnd.armorClass': { 'dnd.armorClass.value': 12 },
          'dnd.initiative': {
            'dnd.initiative.modifier': 2, 'dnd.initiative.bonus': 0, 'dnd.initiative.mode': 'normal'
          },
          'dnd.movement': [{
            'dnd.movement.rowId': 'walk', 'dnd.movement.type': 'walk',
            'dnd.movement.speed': 30, 'dnd.movement.units': 'feet'
          }]
        }, overrides: {}
      },
      now: '2026-09-27T12:00:00.000Z'
    });
    page.schemaVersion = 2;
    await world.original.writeText(page.path, page.content);
  };

  if (actorStructured) await makeStructured(world.actor, { current: 10, max, temp: 0 });
  if (targetStructured) await makeStructured(world.target, { current, max, temp });
  rebuildPageRepository(world.pages);
  world.effects.writes = 0;
  world.effects.reads = 0;
  world.effects.appends = 0;
  return { ...world, registry, catalog };
}

export async function attachStructuredMediumArmor(world, { missing = false } = {}) {
  const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent,
    updatePageRecordContent } = await import('../../js/core/pageRecord.js');
  const targetEnvelope = parsePageRecordContent(world.target.content).variablesJson;
  targetEnvelope.values['dnd.armorClass'] = {
    'dnd.armorClass.source': {
      'dnd.armorClass.source.reference': { pageId: 'armor-item' }
    }
  };
  world.target.content = updatePageRecordContent(world.target.content, { variablesJson: targetEnvelope });
  await world.original.writeText(world.target.path, world.target.content);
  if (!missing) {
    const definition = world.registry.getResolvedType('item', 1);
    const content = buildPageRecordContent({ id: 'armor-item', schemaVersion: 2, type: 'item', template: 'card',
      body: '<p>Structured medium armor</p>', variablesJson: {
        formatVersion: 1, schemaVersion: 1, schemaDigest: definition.digest, overrides: {}, values: {
          'item.armor': { 'item.armor.type': 'medium', 'item.armor.baseAc': 14,
            'item.armor.maxDexterity': 2 }
        }
      }, now: '2026-09-27T12:00:00.000Z' });
    const item = createRuntimePageFromContent({ content, path: '/pages/armor-item.md', name: 'armor-item.md' });
    world.pages.push(item);
    await world.original.writeText(item.path, item.content);
  }
  rebuildPageRepository(world.pages);
  world.effects.writes = world.effects.reads = world.effects.appends = 0;
  return world;
}
