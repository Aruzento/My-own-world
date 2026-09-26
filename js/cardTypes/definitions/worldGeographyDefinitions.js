import {
  ALL_CARD_TYPE_IDS,
  VISIBILITY_OPTIONS,
  languageValues,
  mapReference,
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
import { section, variableField } from './gameCoreHelpers.js';

const includes = [{ id: 'core.card-metadata', version: 1 }];
const sections = [
  section('card', 'Карточка', 0), section('identity', 'Основное', 10),
  section('geography', 'География', 20), section('relations', 'Связи', 30),
  section('society', 'Общество', 40), section('economy', 'Экономика', 50),
  section('governance', 'Управление', 60), section('presentation', 'Представление', 70)
];
const v = (key, label, datatype = 'string', extra = {}) => variableField(key, label, datatype, extra);

const LOCATION_CATEGORY = options([
  ['continental-point', 'Континентальная точка'], ['city', 'Город'], ['settlement', 'Поселение'],
  ['district', 'Район'], ['building', 'Здание'], ['room', 'Комната'], ['dungeon', 'Подземелье'],
  ['cave', 'Пещера'], ['ruins', 'Руины'], ['camp', 'Лагерь'], ['road', 'Дорога'],
  ['point-of-interest', 'Точка интереса'], ['other', 'Другое']
]);

export const LOCATION_DEFINITION = {
  id: 'location', version: 1, label: 'Локация', includes, sections,
  fields: [
    v('location.category', 'Категория', 'enum', { options: LOCATION_CATEGORY, section: 'identity' }),
    referenceField('location.parentLocation', 'Родительская локация', ['location'], { section: 'geography', nullable: true }),
    referenceField('location.region', 'Регион', ['region'], { section: 'geography', nullable: true }),
    referenceField('location.country', 'Страна', ['country'], { section: 'geography', nullable: true }),
    referenceArrayField('location.organizations', 'Организации', ['organization'], { section: 'relations' }),
    referenceArrayField('location.characters', 'Персонажи', ['character'], { section: 'relations' }),
    referenceArrayField('location.connectedLocations', 'Связанные локации', ['location'], { section: 'relations' }),
    referenceArrayField('location.entrancesExits', 'Входы/выходы', ['location'], { section: 'relations' }),
    referenceArrayField('location.portals', 'Переходы/порталы', ['location'], { section: 'relations' }),
    mapReference('location.mapScene', 'Карта/сцена', { section: 'presentation', nullable: true }),
    repeatableField('location.music', 'Музыка', [
      nestedField('location.music.kind', 'Вид', 'enum', { options: options([['audio', 'Аудио'], ['playlist', 'Плейлист']]) }),
      nestedField('location.music.asset', 'Аудиофайл', 'asset'),
      nestedField('location.music.playlist', 'Плейлист')
    ], { section: 'presentation' }),
    v('location.openToPlayers', 'Открыта игрокам', 'boolean', { default: false, section: 'presentation' }),
    v('location.visitedByPlayers', 'Посещена игроками', 'boolean', { default: false, section: 'presentation' }),
    v('location.discoveredByPlayers', 'Обнаружена игроками', 'boolean', { default: false, section: 'presentation' })
  ],
  capabilities: { worldEntity: true, place: true }, metadata: { stage: 6, catalog: 'world-service' }
};

export const REGION_DEFINITION = {
  id: 'region', version: 1, label: 'Регион', includes, sections,
  fields: [
    referenceField('region.country', 'Страна', ['country'], { section: 'geography', nullable: true }),
    referenceField('region.parentRegion', 'Родительский регион', ['region'], { section: 'geography', nullable: true }),
    referenceArrayField('region.locations', 'Локации', ['location'], { section: 'geography' }),
    referenceArrayField('region.neighboringRegions', 'Соседние регионы', ['region'], { section: 'geography' }),
    mapReference('region.mapScene', 'Карта/сцена', { section: 'presentation', nullable: true }),
    referenceArrayField('region.organizations', 'Организации', ['organization'], { section: 'relations' }),
    referenceField('region.rulerOwner', 'Правитель/владелец', ['character', 'player', 'organization'], { section: 'relations', nullable: true }),
    referenceArrayField('region.peoplesRaces', 'Народы/расы', ['race'], { section: 'society' }),
    languageValues('region.languages', 'Языки', { section: 'society' }),
    referenceArrayField('region.religions', 'Религии', ['lore', 'organization'], { section: 'society' }),
    resourceRows('region.resources', 'Ресурсы', { section: 'economy' })
  ],
  capabilities: { worldEntity: true, territory: true }, metadata: { stage: 6, catalog: 'world-service' }
};

const COUNTRY_FORM = options([
  ['unitary', 'Унитарное'], ['federation', 'Федерация'], ['confederation', 'Конфедерация'],
  ['empire', 'Империя'], ['city-state', 'Город-государство'], ['tribal-clan', 'Племенное/клановое'], ['other', 'Другое']
]);
const COUNTRY_STATUS = options([
  ['exists', 'Существует'], ['dependent', 'Вассальное/зависимое'], ['occupied', 'Оккупировано'],
  ['at-war', 'В состоянии войны'], ['collapsed', 'Распалось'], ['historical', 'Историческое'], ['other', 'Другое']
]);
const GOVERNMENT_FORM = options([
  ['monarchy', 'Монархия'], ['republic', 'Республика'], ['oligarchy', 'Олигархия'],
  ['theocracy', 'Теократия'], ['magocracy', 'Магократия'], ['military-junta', 'Военная хунта'],
  ['council', 'Совет'], ['anarchy', 'Анархия'], ['mixed', 'Смешанная'], ['other', 'Другая']
]);

export const COUNTRY_DEFINITION = {
  id: 'country', version: 1, label: 'Страна', includes, sections,
  fields: [
    v('country.form', 'Форма государства', 'enum', { options: COUNTRY_FORM, section: 'identity' }),
    v('country.status', 'Статус', 'enum', { options: COUNTRY_STATUS, section: 'identity' }),
    referenceField('country.capital', 'Столица', ['location'], { section: 'geography', nullable: true }),
    referenceField('country.ruler', 'Правитель', ['character', 'player'], { section: 'governance', nullable: true }),
    referenceField('country.government', 'Правительство', ['organization'], { section: 'governance', nullable: true }),
    referenceField('country.rulingOrganization', 'Правящая организация', ['organization'], { section: 'governance', nullable: true }),
    referenceField('country.dynasty', 'Династия', ['organization'], { section: 'governance', nullable: true }),
    referenceArrayField('country.regions', 'Регионы', ['region'], { section: 'geography' }),
    referenceArrayField('country.locations', 'Локации', ['location'], { section: 'geography' }),
    referenceArrayField('country.neighborCountries', 'Соседние страны', ['country'], { section: 'geography' }),
    mapReference('country.mapScene', 'Карта/сцена', { section: 'presentation', nullable: true }),
    v('country.mapColor', 'Цвет на карте', 'color', { section: 'presentation' }),
    v('country.flag', 'Флаг/герб', 'asset', { section: 'presentation' }),
    v('country.population', 'Население', 'number', { min: 0, section: 'society' }),
    referenceArrayField('country.races', 'Расы/народы', ['race'], { section: 'society' }),
    languageValues('country.languages', 'Языки', { section: 'society' }),
    languageValues('country.officialLanguages', 'Официальные языки', { section: 'society' }),
    referenceArrayField('country.religions', 'Религии', ['lore', 'organization'], { section: 'society' }),
    referenceField('country.stateReligion', 'Государственная религия', ['lore', 'organization'], { section: 'society', nullable: true }),
    repeatableField('country.currency', 'Валюта', [
      nestedField('country.currency.name', 'Название'), nestedField('country.currency.symbol', 'Символ'),
      nestedField('country.currency.rate', 'Курс', 'number'),
      referenceField('country.currency.card', 'Карточка', ALL_CARD_TYPE_IDS, { nullable: true }, null, true)
    ], { section: 'economy' }),
    objectField('country.economy', 'Экономика', [
      nestedField('country.economy.level', 'Уровень', 'integer'),
      textOrReferenceRows('country.economy.mainResources', 'Основные ресурсы', ALL_CARD_TYPE_IDS, {}, true),
      textOrReferenceRows('country.economy.export', 'Экспорт', ALL_CARD_TYPE_IDS, {}, true),
      textOrReferenceRows('country.economy.import', 'Импорт', ALL_CARD_TYPE_IDS, {}, true)
    ], { section: 'economy' }),
    textOrReferenceRows('country.laws', 'Законы', ['lore'], { section: 'governance' }),
    v('country.governmentForm', 'Форма правления', 'enum', { options: GOVERNMENT_FORM, section: 'governance' }),
    referenceArrayField('country.authorities', 'Органы власти', ['organization'], { section: 'governance' }),
    referenceArrayField('country.organizations', 'Организации', ['organization'], { section: 'relations' }),
    referenceArrayField('country.army', 'Армия', ['organization'], { section: 'relations' }),
    referenceArrayField('country.allies', 'Союзники', ['organization', 'country', 'character'], { section: 'relations' }),
    referenceArrayField('country.enemies', 'Враги', ['organization', 'country', 'character'], { section: 'relations' }),
    repeatableField('country.diplomaticRelations', 'Дипломатические отношения', [
      referenceField('country.diplomaticRelations.country', 'Страна', ['country'], {}, null, true),
      nestedField('country.diplomaticRelations.details', 'Отношения', 'string', { format: 'multiline' })
    ], { section: 'relations' }),
    repeatableField('country.tradeRelations', 'Торговые отношения', [
      referenceField('country.tradeRelations.country', 'Страна', ['country'], {}, null, true),
      nestedField('country.tradeRelations.details', 'Отношения', 'string', { format: 'multiline' })
    ], { section: 'relations' }),
    referenceArrayField('country.warsConflicts', 'Войны/конфликты', ['lore'], { section: 'relations' }),
    v('country.securityLevel', 'Уровень безопасности', 'number', { section: 'society' }),
    v('country.magicLevel', 'Уровень магии', 'number', { section: 'society' }),
    v('country.technologyLevel', 'Уровень технологий', 'number', { section: 'society' }),
    referenceArrayField('country.calendar', 'Календарь', ['lore'], { section: 'society' }),
    objectField('country.time', 'Часовой пояс/время', [
      nestedField('country.time.text', 'Текст'), namedDetailsRows('country.time.properties', 'Параметры', {}, true)
    ], { section: 'society' }),
    v('country.visibility', 'Видимость', 'enum', { options: VISIBILITY_OPTIONS, section: 'presentation' })
  ],
  capabilities: { worldEntity: true, territory: true }, metadata: { stage: 6, catalog: 'world-service' }
};

const ORGANIZATION_CATEGORY = options([
  ['state', 'Государственная'], ['military', 'Военная'], ['religious', 'Религиозная'],
  ['guild', 'Гильдия'], ['order', 'Орден'], ['cult', 'Культ'], ['trade', 'Торговая'],
  ['criminal', 'Преступная'], ['scientific', 'Научная'], ['magical', 'Магическая'],
  ['family', 'Семья'], ['clan', 'Клан'], ['secret-society', 'Тайное общество'], ['other', 'Другое']
]);
const ORGANIZATION_STATUS = options([
  ['active', 'Активна'], ['hidden', 'Скрыта'], ['dormant', 'Спит'], ['disbanded', 'Распущена'],
  ['destroyed', 'Уничтожена'], ['historical', 'Историческая'], ['other', 'Другое']
]);

export const ORGANIZATION_DEFINITION = {
  id: 'organization', version: 1, label: 'Организация', includes, sections,
  fields: [
    v('organization.category', 'Категория', 'enum', { options: ORGANIZATION_CATEGORY, section: 'identity' }),
    v('organization.status', 'Статус', 'enum', { options: ORGANIZATION_STATUS, section: 'identity' }),
    referenceField('organization.parentOrganization', 'Родительская организация', ['organization'], { section: 'relations', nullable: true }),
    referenceArrayField('organization.childOrganizations', 'Дочерние организации', ['organization'], { section: 'relations' }),
    referenceField('organization.headquarters', 'Штаб-квартира', ['location'], { section: 'geography', nullable: true }),
    referenceArrayField('organization.territories', 'Территории', ['country', 'region', 'location'], { section: 'geography' }),
    referenceArrayField('organization.countries', 'Страны', ['country'], { section: 'geography' }),
    referenceArrayField('organization.regions', 'Регионы', ['region'], { section: 'geography' }),
    referenceArrayField('organization.locations', 'Локации', ['location'], { section: 'geography' }),
    referenceField('organization.leader', 'Лидер', ['character', 'player'], { section: 'relations', nullable: true }),
    referenceArrayField('organization.deputies', 'Заместители', ['character', 'player'], { section: 'relations' }),
    referenceArrayField('organization.members', 'Участники', ['player', 'character'], { section: 'relations' }),
    repeatableField('organization.ranks', 'Ранги', [
      nestedField('organization.ranks.name', 'Название'), nestedField('organization.ranks.level', 'Уровень', 'integer'),
      nestedField('organization.ranks.rights', 'Права', 'string', { format: 'multiline' })
    ], { section: 'relations' }),
    stringArrayField('organization.roles', 'Роли', { section: 'relations' }),
    stringArrayField('organization.entryRequirements', 'Требования для вступления', { section: 'relations' }),
    referenceArrayField('organization.allies', 'Союзники', ['organization', 'country', 'character'], { section: 'relations' }),
    referenceArrayField('organization.enemies', 'Враги', ['organization', 'country', 'character'], { section: 'relations' }),
    referenceArrayField('organization.organizationRelations', 'Отношения с организациями', ['organization'], { section: 'relations' }),
    referenceArrayField('organization.countryRelations', 'Отношения со странами', ['country'], { section: 'relations' }),
    v('organization.reputation', 'Репутация', 'number', { section: 'society' }),
    v('organization.influence', 'Влияние', 'number', { section: 'society' }),
    resourceRows('organization.resources', 'Ресурсы', { section: 'economy' }),
    v('organization.treasury', 'Казна', 'number', { section: 'economy' }),
    v('organization.symbol', 'Символ', 'asset', { section: 'presentation' }),
    v('organization.color', 'Цвет', 'color', { section: 'presentation' }),
    v('organization.hidden', 'Скрытая организация', 'boolean', { default: false, section: 'presentation' }),
    v('organization.knownToPlayers', 'Известна игрокам', 'boolean', { default: false, section: 'presentation' }),
    textOrReferenceRows('organization.goals', 'Цели', ALL_CARD_TYPE_IDS, { section: 'identity' }),
    referenceArrayField('organization.activeProjects', 'Активные проекты', ['project'], { section: 'relations' }),
    referenceArrayField('organization.relatedEvents', 'Связанные события', ['lore'], { section: 'relations' })
  ],
  capabilities: { worldEntity: true, organization: true }, metadata: { stage: 6, catalog: 'world-service' }
};
