import { deepFreeze } from '../cardTypes/definitionIdentity.js';

export const PROPERTIES_MIGRATION_VERSION = 1;
export const LEGACY_TYPE_MAPPING = deepFreeze({
  player: 'player', character: 'character', creature: 'character', magic: 'spell',
  object: 'item', note: 'item', item: 'item', skill: 'skill', spell: 'spell', effect: 'effect',
  race: 'race', class: 'class', location: 'location', region: 'region', country: 'country',
  organization: 'organization', lore: 'lore', folder: 'folder', project: 'project'
});

const actor = {
  level: ['dnd.level'], hpCurrent: ['dnd.health', 'dnd.hpCurrent'],
  hpMax: ['dnd.health', 'dnd.hpMax'], hpTemp: ['dnd.health', 'dnd.hpTemporary'],
  armorItem: ['dnd.armorClass', 'dnd.armorClass.source', 'dnd.armorClass.source.reference'],
  str: ['character.abilities', 'character.abilities.strength'],
  dex: ['character.abilities', 'character.abilities.dexterity'],
  con: ['character.abilities', 'character.abilities.constitution'],
  int: ['character.abilities', 'character.abilities.intelligence'],
  wis: ['character.abilities', 'character.abilities.wisdom'],
  cha: ['character.abilities', 'character.abilities.charisma']
};
const item = { gold: ['item.cost', 'item.cost.gold'], silver: ['item.cost', 'item.cost.silver'],
  copper: ['item.cost', 'item.cost.copper'], armorKind: ['item.armor', 'item.armor.type'], armorBaseAc: ['item.armor', 'item.armor.baseAc'],
  armorDexMax: ['item.armor', 'item.armor.maxDexterity'] };
// No fuzzy label inference. Unsupported shapes/units remain inactive evidence.
export const LEGACY_FIELD_MAPPING = deepFreeze({
  character: actor, creature: actor, item,
  object: { durability: ['item.durability', 'item.durability.current'] },
  magic: { level: ['spell.level'] }, spell: { level: ['spell.level'] },
  skill: { skillLevel: ['skill.level'] }
});

// Versioned source-value mapping. Keys are legacy persisted values, never labels
// resolved at runtime from the new catalog. Unknown values must remain evidence.
export const LEGACY_ENUM_VALUE_MAPPING = deepFreeze({
  item: { armorKind: { 'Нет': 'none', 'Легкий': 'light', 'Средний': 'medium', 'Тяжелый': 'heavy', 'Щит': 'shield' } }
});

export function mapLegacyEnumValue(type, key, raw) {
  const values = LEGACY_ENUM_VALUE_MAPPING[type]?.[key];
  if (!values) return { mapped: true, value: raw };
  return Object.hasOwn(values, raw) ? { mapped: true, value: values[raw] } : { mapped: false };
}

export const LEGACY_MANUAL_TARGETS = deepFreeze({
  proficiencyBonus: ['dnd.proficiencyBonus'],
  armorClass: ['dnd.armorClass', 'dnd.armorClass.value'],
  initiative: ['dnd.initiative', 'dnd.initiative.modifier']
});

export function isLegacyCalculatedKey(key) {
  return ['proficiencyBonus', 'initiative', 'armorClass'].includes(key) ||
    /^(?:save(?:Str|Dex|Con|Int|Wis|Cha)|skill[A-Z][a-zA-Z]*|(?:str|dex|con|int|wis|cha)Modifier)$/.test(key) && !key.endsWith('Proficient');
}
