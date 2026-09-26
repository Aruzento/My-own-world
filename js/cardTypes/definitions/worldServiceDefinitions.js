import {
  ALL_CARD_TYPE_IDS,
  CARD_TYPE_OPTIONS,
  anyCardOrExternalRows,
  namedDetailsRows,
  nestedField,
  objectField,
  options,
  referenceArrayField,
  referenceField,
  repeatableField,
  resourceRows,
  stringArrayField,
  temporalValue,
  textOrReferenceRows
} from './worldServiceShared.js';
import { enumArrayField, section, variableField } from './gameCoreHelpers.js';

const includes = [{ id: 'core.card-metadata', version: 1 }];
const sections = [
  section('card', 'Карточка', 0), section('identity', 'Основное', 10),
  section('relations', 'Связи', 20), section('schedule', 'Сроки', 30),
  section('structure', 'Структура', 40), section('presentation', 'Представление', 50)
];
const v = (key, label, datatype = 'string', extra = {}) => variableField(key, label, datatype, extra);

export const LORE_DEFINITION = {
  id: 'lore', version: 1, label: 'Лор', includes, sections,
  fields: [
    v('lore.category', 'Категория', 'enum', { options: options([
      ['fact', 'Факт'], ['event', 'Событие'], ['history', 'История'], ['chronicle', 'Хроника'],
      ['legend', 'Легенда'], ['myth', 'Миф'], ['rumor', 'Слух'], ['secret', 'Тайна'],
      ['note', 'Заметка'], ['world-rule', 'Правило мира'], ['other', 'Другое']
    ]), section: 'identity' }),
    objectField('lore.date', 'Дата', [
      temporalValue('lore.date.start', 'Начало', {}, true), temporalValue('lore.date.end', 'Окончание', {}, true)
    ], { section: 'schedule' }),
    v('lore.chronologyOrder', 'Порядок в хронологии', 'integer', { section: 'schedule' }),
    referenceField('lore.era', 'Эра', ['lore'], { section: 'schedule', nullable: true }),
    referenceArrayField('lore.places', 'Места', ['location'], { section: 'relations' }),
    referenceArrayField('lore.regions', 'Регионы', ['region'], { section: 'relations' }),
    referenceArrayField('lore.countries', 'Страны', ['country'], { section: 'relations' }),
    referenceArrayField('lore.characters', 'Персонажи', ['character'], { section: 'relations' }),
    referenceArrayField('lore.players', 'Игроки', ['player'], { section: 'relations' }),
    referenceArrayField('lore.organizations', 'Организации', ['organization'], { section: 'relations' }),
    referenceArrayField('lore.items', 'Предметы', ['item'], { section: 'relations' }),
    referenceArrayField('lore.events', 'События/лор', ['lore'], { section: 'relations' }),
    referenceArrayField('lore.causes', 'Причины', ['lore'], { section: 'relations' }),
    referenceArrayField('lore.consequences', 'Последствия', ['lore'], { section: 'relations' }),
    anyCardOrExternalRows('lore.informationSources', 'Источники информации', { section: 'relations' }),
    repeatableField('lore.knownBy', 'Кто знает', [
      referenceArrayField('lore.knownBy.characters', 'Персонажи', ['character'], {}, null, true),
      referenceArrayField('lore.knownBy.organizations', 'Организации', ['organization'], {}, null, true),
      referenceArrayField('lore.knownBy.players', 'Игроки', ['player'], {}, null, true)
    ], { section: 'relations' }),
    v('lore.reliability', 'Достоверность', 'enum', { options: options([
      ['confirmed', 'Подтверждено'], ['probable', 'Вероятно'], ['disputed', 'Спорно'],
      ['false', 'Ложно'], ['unknown', 'Неизвестно']
    ]), section: 'identity' }),
    v('lore.secrecy', 'Секретность', 'enum', { options: options([
      ['public', 'Публично'], ['limited', 'Ограниченно'], ['secret', 'Секретно'], ['master-only', 'Только мастер']
    ]), section: 'presentation' }),
    v('lore.knownToPlayers', 'Известно игрокам', 'boolean', { default: false, section: 'presentation' }),
    v('lore.discoveredByPlayers', 'Обнаружено игроками', 'boolean', { default: false, section: 'presentation' }),
    temporalValue('lore.disclosureDate', 'Дата раскрытия', { section: 'schedule' }),
    referenceArrayField('lore.relatedSecrets', 'Связанные тайны', ['lore'], { section: 'relations' })
  ],
  capabilities: { worldEntity: true, lore: true }, metadata: { stage: 6, catalog: 'world-service' }
};

export const FOLDER_DEFINITION = {
  id: 'folder', version: 1, label: 'Папка', includes, sections,
  fields: [
    referenceField('folder.parentFolder', 'Родительская папка', ['folder'], { section: 'structure', nullable: true }),
    enumArrayField('folder.allowedTypes', 'Разрешённые типы', CARD_TYPE_OPTIONS, { section: 'structure' }),
    v('folder.defaultCardType', 'Тип карточки по умолчанию', 'string', { section: 'structure' }),
    v('folder.sorting', 'Сортировка', 'enum', { options: options([
      ['manual', 'Вручную'], ['name', 'По имени'], ['type', 'По типу'], ['date', 'По дате']
    ]), section: 'structure' }),
    v('folder.sortingDirection', 'Направление сортировки', 'enum', { options: options([
      ['ascending', 'По возрастанию'], ['descending', 'По убыванию']
    ]), section: 'structure' }),
    v('folder.icon', 'Иконка', 'asset', { section: 'presentation' }),
    v('folder.color', 'Цвет', 'color', { section: 'presentation' }),
    v('folder.visibility', 'Видимость', 'enum', { options: options([
      ['visible', 'Видима'], ['hidden', 'Скрыта'], ['master', 'Только мастер'], ['inherited', 'Наследуется']
    ]), section: 'presentation' }),
    v('folder.pinned', 'Закреплена', 'boolean', { default: false, section: 'presentation' }),
    v('folder.archived', 'Архивирована', 'boolean', { default: false, section: 'presentation' })
  ],
  capabilities: { serviceEntity: true, groupingCard: true }, metadata: { stage: 6, catalog: 'world-service' }
};

export const PROJECT_DEFINITION = {
  id: 'project', version: 1, label: 'Проект', includes, sections,
  fields: [
    v('project.category', 'Категория', 'enum', { options: options([
      ['development', 'Разработка'], ['research', 'Исследование'], ['campaign', 'Кампания'],
      ['worldbuilding', 'Миростроение'], ['content', 'Контент'], ['organizational', 'Организационный'], ['custom', 'Пользовательский']
    ]), section: 'identity' }),
    v('project.status', 'Статус', 'enum', { options: options([
      ['idea', 'Идея'], ['planned', 'Запланирован'], ['active', 'Активен'], ['paused', 'Приостановлен'],
      ['completed', 'Завершён'], ['cancelled', 'Отменён']
    ]), section: 'identity' }),
    v('project.priority', 'Приоритет', 'enum', { options: options([
      ['low', 'Низкий'], ['normal', 'Обычный'], ['high', 'Высокий'], ['critical', 'Критический']
    ]), section: 'identity' }),
    referenceField('project.owner', 'Владелец', ['player', 'character', 'organization'], { section: 'relations', nullable: true }),
    referenceArrayField('project.participants', 'Участники', ['player', 'character'], { section: 'relations' }),
    temporalValue('project.startDate', 'Дата начала', { section: 'schedule' }),
    temporalValue('project.completionDate', 'Дата завершения', { section: 'schedule' }),
    temporalValue('project.deadline', 'Дедлайн', { section: 'schedule' }),
    v('project.progress', 'Прогресс', 'number', { min: 0, max: 100, section: 'schedule' }),
    namedDetailsRows('project.stages', 'Этапы', { section: 'structure' }),
    repeatableField('project.milestones', 'Вехи', [
      nestedField('project.milestones.name', 'Название'),
      nestedField('project.milestones.status', 'Статус', 'enum', { options: options([
        ['idea', 'Идея'], ['planned', 'Запланирована'], ['active', 'Активна'],
        ['paused', 'Приостановлена'], ['completed', 'Завершена'], ['cancelled', 'Отменена']
      ]) }),
      temporalValue('project.milestones.date', 'Дата', {}, true)
    ], { section: 'structure' }),
    namedDetailsRows('project.tasks', 'Задачи', { section: 'structure' }),
    referenceArrayField('project.subprojects', 'Подпроекты', ['project'], { section: 'relations' }),
    referenceField('project.parentProject', 'Родительский проект', ['project'], { section: 'relations', nullable: true }),
    referenceArrayField('project.dependencies', 'Зависимости', ['project'], { section: 'relations' }),
    textOrReferenceRows('project.blockers', 'Блокеры', ['project'], { section: 'relations' }),
    referenceArrayField('project.relatedCards', 'Связанные карточки', ALL_CARD_TYPE_IDS, { section: 'relations' }),
    referenceArrayField('project.relatedLocations', 'Связанные локации', ['location'], { section: 'relations' }),
    referenceArrayField('project.relatedCharacters', 'Связанные персонажи', ['character', 'player'], { section: 'relations' }),
    referenceArrayField('project.relatedOrganizations', 'Связанные организации', ['organization'], { section: 'relations' }),
    resourceRows('project.resources', 'Ресурсы', { section: 'relations' }),
    objectField('project.budget', 'Бюджет', [
      nestedField('project.budget.planned', 'План', 'number'),
      nestedField('project.budget.actual', 'Факт', 'number'),
      nestedField('project.budget.currency', 'Валюта')
    ], { section: 'structure' }),
    namedDetailsRows('project.results', 'Результаты', { section: 'structure' }),
    repeatableField('project.attachments', 'Вложения', [
      nestedField('project.attachments.name', 'Название'), nestedField('project.attachments.asset', 'Файл', 'asset'),
      nestedField('project.attachments.notes', 'Примечание', 'string', { format: 'multiline' })
    ], { section: 'structure' }),
    referenceArrayField('project.responsibles', 'Ответственные', ['player', 'character'], { section: 'relations' }),
    stringArrayField('project.tags', 'Теги проекта', { section: 'identity' }),
    v('project.archived', 'Архивный', 'boolean', { default: false, section: 'presentation' })
  ],
  capabilities: { serviceEntity: true, projectCard: true }, metadata: { stage: 6, catalog: 'world-service' }
};
