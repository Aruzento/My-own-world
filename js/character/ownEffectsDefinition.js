import { deepFreeze } from '../cardTypes/definitionIdentity.js';

export const OWN_EFFECTS_KEY = 'dnd.ownEffects';
export const OWN_EFFECTS_FIELD_SET_ID = 'dnd.own-effects';
const scalar = (key, datatype = 'string', extra = {}) => ({ key, label: key.split('.').at(-1), datatype, required: true, ...extra });
const object = (key, properties, extra = {}) => scalar(key, 'object', { properties, ...extra });
const rows = (key, properties, identity) => scalar(key, 'array', {
  items: { datatype: 'object', rowIdentityKey: `${key}.${identity}`,
    properties: properties.map(property => property.key === `${key}.${identity}` ? { ...property, readonly: true } : property) }
});
const numericMap = key => rows(key, [scalar(`${key}.key`), scalar(`${key}.value`, 'integer')], 'key');
const conditionsKey = `${OWN_EFFECTS_KEY}.conditions`;
const effectsKey = `${OWN_EFFECTS_KEY}.effects`;
const modifiersKey = `${effectsKey}.modifiers`;
const flagsKey = `${effectsKey}.flags`;

// Opt-in versioned extension не меняет immutable Player/Character v1.
export const OWN_EFFECTS_FIELD_SET = deepFreeze({
  id: OWN_EFFECTS_FIELD_SET_ID, version: 1, label: 'Собственные активные состояния и эффекты', includes: [], sections: [],
  fields: [object(OWN_EFFECTS_KEY, [
    rows(conditionsKey, [
      scalar(`${conditionsKey}.key`),
      scalar(`${conditionsKey}.label`), scalar(`${conditionsKey}.level`, 'integer', { nullable: true, min: 1, max: 6 }),
      scalar(`${conditionsKey}.source`), scalar(`${conditionsKey}.note`)
    ], 'key'),
    rows(effectsKey, [
      ...['id', 'title', 'sourcePageId', 'sourcePackageId', 'ruleId', 'duration', 'note'].map(name => scalar(`${effectsKey}.${name}`)),
      scalar(`${effectsKey}.sourceType`, 'enum', { options: ['manual', 'condition', 'item', 'spell', 'skill', 'feature', 'rule', 'world-package'].map(value => ({ value, label: value })) }),
      object(modifiersKey, [
        ...['armorClass', 'speed', 'initiative', 'proficiencyBonus'].map(name => scalar(`${modifiersKey}.${name}`, 'integer')),
        ...['abilityScores', 'abilityChecks', 'savingThrows', 'skills'].map(name => numericMap(`${modifiersKey}.${name}`))
      ]),
      object(flagsKey, ['concentration', 'magical', 'harmful'].map(name => scalar(`${flagsKey}.${name}`, 'boolean')))
    ], 'id'),
    scalar(`${OWN_EFFECTS_KEY}.selectedRuleIds`, 'array', { items: { datatype: 'string' } })
  ], { required: false, binding: { owner: 'variables' } })],
  metadata: { semanticOwner: 'actor-own-active-effects', representationVersion: 1 }
});

// Numeric maps сохраняют произвольные ключи как stable key/value rows.
function encodeNode(value, field) {
  if (value === null) return null;
  if (field.datatype === 'object') return Object.fromEntries(field.properties.map(property => [property.key, encodeNode(value[property.key.split('.').at(-1)], property)]));
  if (field.datatype === 'array') {
    const entries = field.items.rowIdentityKey?.endsWith('.key') && !Array.isArray(value)
      ? Object.entries(value).map(([key, entry]) => ({ key, value: entry })) : value;
    return entries.map(entry => encodeNode(entry, field.items));
  }
  return value;
}
function decodeNode(value, field) {
  if (value === null) return null;
  if (field.datatype === 'object') return Object.fromEntries(field.properties.map(property => [property.key.split('.').at(-1), decodeNode(value[property.key], property)]));
  if (field.datatype === 'array') {
    const entries = value.map(entry => decodeNode(entry, field.items));
    return field.items.rowIdentityKey?.endsWith('.key') && field.items.properties?.some(property => property.key.endsWith('.value'))
      ? Object.fromEntries(entries.map(entry => [entry.key, entry.value])) : entries;
  }
  return value;
}
export const encodeOwnEffects = data => encodeNode(data, OWN_EFFECTS_FIELD_SET.fields[0]);
export const decodeOwnEffects = value => decodeNode(value, OWN_EFFECTS_FIELD_SET.fields[0]);
