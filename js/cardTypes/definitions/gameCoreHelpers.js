import { deepFreeze } from '../definitionIdentity.js';

export const ALL_CARD_TYPE_IDS = Object.freeze([
  'player', 'character', 'location', 'region', 'country', 'organization', 'item',
  'skill', 'spell', 'effect', 'lore', 'folder', 'project', 'race', 'class'
]);

export const FORMULA_CONTRACT = Object.freeze({
  grammarId: 'dnd.formula',
  version: 1
});

export function option(value, label = value) {
  return { value, label };
}

export function options(entries) {
  return entries.map(entry => Array.isArray(entry) ? option(entry[0], entry[1]) : option(entry));
}

export function variableField(key, label, datatype = 'string', extra = {}, sourcePath = null) {
  return field(key, label, datatype, { binding: { owner: 'variables' }, ...extra }, sourcePath);
}

export function boundField(key, label, datatype, binding, extra = {}, sourcePath = null) {
  return field(key, label, datatype, { binding, readonly: true, ...extra }, sourcePath);
}

export function nestedField(key, label, datatype = 'string', extra = {}, sourcePath = null) {
  return field(key, label, datatype, extra, sourcePath);
}

export function objectField(key, label, properties, extra = {}, sourcePath = null, nested = false) {
  const factory = nested ? nestedField : variableField;
  return factory(key, label, 'object', { properties, ...extra }, sourcePath);
}

export function stringArrayField(key, label, extra = {}, sourcePath = null, nested = false) {
  const factory = nested ? nestedField : variableField;
  return factory(key, label, 'array', { items: { datatype: 'string' }, ...extra }, sourcePath);
}

export function enumArrayField(key, label, enumOptions, extra = {}, sourcePath = null, nested = false) {
  const factory = nested ? nestedField : variableField;
  return factory(key, label, 'array', { items: { datatype: 'enum', options: enumOptions }, ...extra }, sourcePath);
}

export function referenceField(key, label, targetTypes, extra = {}, sourcePath = null, nested = false) {
  const factory = nested ? nestedField : variableField;
  return factory(key, label, 'reference', { targetTypes, ...extra }, sourcePath);
}

export function referenceArrayField(key, label, targetTypes, extra = {}, sourcePath = null, nested = false) {
  const factory = nested ? nestedField : variableField;
  return factory(key, label, 'array', { items: { datatype: 'reference', targetTypes }, ...extra }, sourcePath);
}

export function formulaField(key, label, extra = {}, sourcePath = null, nested = false) {
  const factory = nested ? nestedField : variableField;
  return factory(key, label, 'string', {
    format: 'formula',
    formula: FORMULA_CONTRACT,
    ...extra
  }, sourcePath);
}

export function repeatableField(key, label, properties, extra = {}, sourcePath = null, nested = false) {
  const factory = nested ? nestedField : variableField;
  const rowKey = `${key}.rowId`;
  return factory(key, label, 'array', {
    items: {
      datatype: 'object',
      rowIdentityKey: rowKey,
      properties: [
        nestedField(rowKey, 'ID строки', 'string', {
          required: true,
          readonly: true
        }),
        ...properties
      ]
    },
    ...extra
  }, sourcePath);
}

export function namedDetailsRows(key, label, sourcePath = null, nested = false, extra = {}) {
  return repeatableField(key, label, [
    nestedField(`${key}.name`, 'Название'),
    nestedField(`${key}.details`, 'Данные', 'string', { format: 'multiline' })
  ], extra, sourcePath, nested);
}

export function formulaOrReferenceObject(key, label, targetTypes, sourcePath = null, nested = false) {
  return objectField(key, label, [
    referenceField(`${key}.reference`, 'Карточка', targetTypes, {}, null, true),
    nestedField(`${key}.text`, 'Текстовое значение', 'string', { format: 'multiline' })
  ], {}, sourcePath, nested);
}

export function source(type, ...segments) {
  return [type, ...segments].join('/');
}

export function section(id, label, order) {
  return { id, label, order };
}

export function freezeDefinitions(value) {
  return deepFreeze(value);
}

function field(key, label, datatype, extra, sourcePath) {
  const validation = {
    ...(extra.validation || {})
  };
  const definition = { key, label, datatype, ...extra };
  if (Object.keys(validation).length) definition.validation = validation;
  return definition;
}
