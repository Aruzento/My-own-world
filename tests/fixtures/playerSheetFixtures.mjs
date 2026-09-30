import { BUNDLED_CARD_TYPE_DEFINITIONS as types, BUNDLED_FIELD_SET_DEFINITIONS as fieldSets } from '../../js/cardTypes/definitions/bundledDefinitions.js';
import { buildPageRecordContent, createRuntimePageFromContent } from '../../js/core/pageRecord.js';
import { CARD_TYPE_CATALOG_PATH, createCardTypeRegistryFromCatalog, serializeCardTypeCatalog } from '../../js/storage/cardTypeCatalogStorage.js';
import { encodeOwnEffects, OWN_EFFECTS_KEY } from '../../js/character/ownEffectsDefinition.js';
import { createSerializableEffectsData } from '../../js/character/effectsModel.js';
import { createEditConflictFixture } from './editConflictFixtures.mjs';
import { setPages } from '../../js/stateActions.js';

export const PLAYER_ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
export const playerCatalog = { formatVersion: 1, revision: 1, types, fieldSets };
export const playerRegistry = createCardTypeRegistryFromCatalog(playerCatalog);
export const playerRecoveryBody = '<h1>Player Sheet</h1><p data-persistent-editable="true">Player recovery marker</p><section class="card-properties-block" data-block-type="properties" data-card-type="character"><input data-property-name="level" value="99"><input data-property-name="str" value="3"><input data-property-name="hpCurrent" value="99"><input data-property-name="hpMax" value="99"><input data-property-name="deathSaveSuccesses" value="3"></section>';
export function playerValues() {
  return {
    'player.progression': {
      'dnd.level': 5, 'dnd.proficiencyBonus': 3,
      'player.progression.classLevels': [{ 'player.progression.classLevels.rowId': 'class-1', 'player.progression.classLevels.class': { pageId: 'player-class' }, 'player.progression.classLevels.level': 5 }],
      'player.progression.experience': { 'player.progression.experience.current': 6500, 'player.progression.experience.toNextLevel': 7500 },
      'player.progression.inspiration': true
    },
    'player.abilities': Object.fromEntries(PLAYER_ABILITIES.map((id, index) => {
      const key = `player.abilities.${id}`;
      return [key, { [`${key}.score`]: [16, 14, 12, 10, 18, 8][index], [`${key}.modifier`]: 99,
        [`${key}.saveProficient`]: index % 2 === 0, [`${key}.saveBonus`]: index }];
    })),
    'player.skills': {
      'player.skills.athletics': { 'player.skills.athletics.proficient': true, 'player.skills.athletics.expertise': false, 'player.skills.athletics.bonus': 1 },
      'player.skills.stealth': { 'player.skills.stealth.proficient': true, 'player.skills.stealth.expertise': true, 'player.skills.stealth.bonus': 2 }
    },
    'dnd.health': { 'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 2,
      'player.health.hitDice': [{ 'player.health.hitDice.rowId': 'hd-1', 'player.health.hitDice.die': 'd8', 'player.health.hitDice.class': { pageId: 'player-class' }, 'player.health.hitDice.current': 3, 'player.health.hitDice.max': 5 }],
      'player.health.criticalThreshold': 20 },
    'player.deathSaves': { 'player.deathSaves.successes': 1, 'player.deathSaves.failures': 2 },
    'dnd.items': [{ pageId: 'player-item' }], 'dnd.equippedItems': [],
    'player.identity': { 'player.identity.class': { pageId: 'player-class' } },
    [OWN_EFFECTS_KEY]: encodeOwnEffects(createSerializableEffectsData({ effects: [{ id: 'own-player', title: 'Player own effect', modifiers: { armorClass: 1 } }] })),
    'dnd.armorClass': { 'dnd.armorClass.value': 14 }
  };
}

export async function createPlayerSheetFixture({ values = playerValues(), body = playerRecoveryBody, noCatalog = false, legacy = false } = {}) {
  const base = await createEditConflictFixture({ id: 'player-sheet', type: 'player', body });
  const content = buildPageRecordContent({ id: base.page.id, type: 'player', template: 'card', schemaVersion: legacy ? 1 : 2,
    body,
    ...(!legacy ? { variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: playerRegistry.getResolvedType('player', 1).digest,
      values, overrides: {}, extensions: { revision: 1, fields: [{ id: 'dnd.own-effects', version: 1 }] },
      inactive: [{ legacyEvidence: { hpCurrent: 99 } }] } } : {}) }).replace('template: card', 'template: card\nplayerEvidence: preserved');
  const page = createRuntimePageFromContent({ content, path: base.page.path, name: base.page.name });
  await base.adapter.writeText(page.path, content);
  if (!noCatalog) await base.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(playerCatalog));
  const item = createRuntimePageFromContent({ path: '/pages/player-item.md', name: 'player-item.md', content: buildPageRecordContent({
    id: 'player-item', type: 'item', template: 'card', schemaVersion: 2,
    body: `<h1>Player Item</h1><div data-character-effects='{"effects":[{"id":"item-player","title":"Player item effect","modifiers":{"initiative":1}}]}'></div>`,
    variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: playerRegistry.getResolvedType('item', 1).digest, values: { 'item.quantity': 3 }, overrides: {} }
  }) });
  const classPage = createRuntimePageFromContent({ path: '/pages/player-class.md', name: 'player-class.md', content: buildPageRecordContent({ id: 'player-class', type: 'class', body: '<h1>Exact Player Class</h1>' }) });
  await base.adapter.writeText(item.path, item.content);
  await base.adapter.writeText(classPage.path, classPage.content);
  const pages = [page, item, classPage];
  setPages(pages);
  const writes = [];
  const write = base.adapter.writeText.bind(base.adapter);
  base.adapter.writeText = async (path, data) => { writes.push(path); return write(path, data); };
  return { ...base, page, pages, item, classPage, writes };
}
