import {
  ALL_CARD_TYPE_IDS,
  enumArrayField,
  freezeDefinitions,
  nestedField,
  objectField,
  options,
  referenceArrayField,
  referenceField,
  repeatableField,
  stringArrayField
} from './gameCoreHelpers.js';
import { LANGUAGE_OPTIONS } from './gameCoreShared.js';
import { CAMPAIGN_MAP_REFERENCE_TARGET } from '../cardReferenceTargets.js';

export const MAP_PAGE_TYPE_IDS = freezeDefinitions([CAMPAIGN_MAP_REFERENCE_TARGET]);

export const VISIBILITY_OPTIONS = freezeDefinitions(options([
  ['master', 'Только мастер'], ['owners', 'Владельцы'], ['players', 'Игроки'],
  ['everyone', 'Все'], ['hidden', 'Скрыто']
]));

export const CARD_TYPE_OPTIONS = freezeDefinitions(options([
  ['player', 'Игрок'], ['character', 'Персонаж'], ['location', 'Локация'],
  ['region', 'Регион'], ['country', 'Страна'], ['organization', 'Организация'],
  ['item', 'Предмет'], ['skill', 'Навык'], ['spell', 'Заклинание'],
  ['effect', 'Эффект'], ['lore', 'Лор'], ['folder', 'Папка'],
  ['project', 'Проект'], ['race', 'Раса'], ['class', 'Класс']
]));

export function temporalValue(key, label, extra = {}, nested = false) {
  return objectField(key, label, [
    nestedField(`${key}.precision`, 'Точность', 'enum', {
      options: options([['date', 'Дата'], ['datetime', 'Дата и время']])
    }),
    nestedField(`${key}.date`, 'Дата', 'date'),
    nestedField(`${key}.datetime`, 'Дата и время', 'datetime')
  ], extra, null, nested);
}

export function languageValues(key, label, extra = {}, nested = false) {
  return repeatableField(key, label, [
    nestedField(`${key}.kind`, 'Вид', 'enum', {
      options: options([['catalog', 'Из каталога'], ['custom', 'Свободное значение']])
    }),
    nestedField(`${key}.catalog`, 'Язык', 'enum', { options: LANGUAGE_OPTIONS }),
    nestedField(`${key}.custom`, 'Свой язык')
  ], extra, null, nested);
}

export function textOrReferenceRows(key, label, targetTypes, extra = {}, nested = false) {
  return repeatableField(key, label, [
    nestedField(`${key}.kind`, 'Вид', 'enum', {
      options: options([['card', 'Карточка'], ['text', 'Текст']])
    }),
    referenceField(`${key}.card`, 'Карточка', targetTypes, { nullable: true }, null, true),
    nestedField(`${key}.text`, 'Текст', 'string', { format: 'multiline' })
  ], extra, null, nested);
}

export function anyCardOrExternalRows(key, label, extra = {}, nested = false) {
  return repeatableField(key, label, [
    nestedField(`${key}.kind`, 'Вид', 'enum', {
      options: options([['card', 'Карточка'], ['external', 'Внешний источник']])
    }),
    referenceField(`${key}.card`, 'Карточка', ALL_CARD_TYPE_IDS, { nullable: true }, null, true),
    nestedField(`${key}.external`, 'Внешний источник', 'string', { format: 'multiline' })
  ], extra, null, nested);
}

export function resourceRows(key, label, extra = {}, nested = false) {
  return textOrReferenceRows(key, label, ['item', 'lore'], extra, nested);
}

export function mapReference(key, label = 'Карта/сцена', extra = {}, nested = false) {
  return referenceField(key, label, MAP_PAGE_TYPE_IDS, extra, null, nested);
}

export function namedDetailsRows(key, label, extra = {}, nested = false) {
  return repeatableField(key, label, [
    nestedField(`${key}.name`, 'Название'),
    nestedField(`${key}.details`, 'Описание', 'string', { format: 'multiline' })
  ], extra, null, nested);
}

export { ALL_CARD_TYPE_IDS, enumArrayField, nestedField, objectField, options,
  referenceArrayField, referenceField, repeatableField, stringArrayField };
