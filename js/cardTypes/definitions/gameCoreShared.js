import {
  ALL_CARD_TYPE_IDS,
  boundField,
  enumArrayField,
  freezeDefinitions,
  nestedField,
  objectField,
  option,
  options,
  referenceArrayField,
  referenceField,
  repeatableField,
  source,
  stringArrayField,
  variableField
} from './gameCoreHelpers.js';

export const ABILITY_OPTIONS = freezeDefinitions(options([
  ['strength', 'Сила'], ['dexterity', 'Ловкость'], ['constitution', 'Телосложение'],
  ['intelligence', 'Интеллект'], ['wisdom', 'Мудрость'], ['charisma', 'Харизма']
]));

export const ABILITY_WITH_AUTO_OPTIONS = freezeDefinitions([
  ...ABILITY_OPTIONS,
  option('automatic', 'Автоматически'),
  option('none', 'Нет')
]);

export const SIZE_OPTIONS = freezeDefinitions(options([
  ['tiny', 'Крошечный'], ['small', 'Маленький'], ['medium', 'Средний'],
  ['large', 'Большой'], ['huge', 'Огромный'], ['gargantuan', 'Громадный'],
  ['custom', 'Пользовательский']
]));

export const CREATURE_TYPE_OPTIONS = freezeDefinitions(options([
  ['aberration', 'Аберрация'], ['beast', 'Зверь'], ['celestial', 'Небожитель'],
  ['construct', 'Конструкт'], ['dragon', 'Дракон'], ['elemental', 'Элементаль'],
  ['fey', 'Фея'], ['fiend', 'Исчадие'], ['giant', 'Великан'],
  ['humanoid', 'Гуманоид'], ['monstrosity', 'Монстр'], ['ooze', 'Слизь'],
  ['plant', 'Растение'], ['undead', 'Нежить'], ['other', 'Другое']
]));

export const ALIGNMENT_OPTIONS = freezeDefinitions(options([
  ['lawful-good', 'Законно-добрый'], ['neutral-good', 'Нейтрально-добрый'],
  ['chaotic-good', 'Хаотично-добрый'], ['lawful-neutral', 'Законно-нейтральный'],
  ['true-neutral', 'Нейтральный'], ['chaotic-neutral', 'Хаотично-нейтральный'],
  ['lawful-evil', 'Законно-злой'], ['neutral-evil', 'Нейтрально-злой'],
  ['chaotic-evil', 'Хаотично-злой'], ['unaligned', 'Без мировоззения'],
  ['custom', 'Пользовательское']
]));

export const DAMAGE_TYPE_OPTIONS = freezeDefinitions(options([
  ['acid', 'Кислота'], ['bludgeoning', 'Дробящий'], ['cold', 'Холод'], ['fire', 'Огонь'],
  ['force', 'Силовой'], ['lightning', 'Электричество'], ['necrotic', 'Некротический'],
  ['piercing', 'Колющий'], ['poison', 'Яд'], ['psychic', 'Психический'],
  ['radiant', 'Излучение'], ['slashing', 'Рубящий'], ['thunder', 'Звук'],
  ['custom', 'Пользовательский']
]));

export const CONDITION_OPTIONS = freezeDefinitions(options([
  ['blinded', 'Ослеплён'], ['charmed', 'Очарован'], ['deafened', 'Оглох'],
  ['frightened', 'Испуган'], ['grappled', 'Схвачен'], ['incapacitated', 'Недееспособен'],
  ['invisible', 'Невидим'], ['paralyzed', 'Парализован'], ['petrified', 'Окаменел'],
  ['poisoned', 'Отравлен'], ['prone', 'Сбит с ног'], ['restrained', 'Опутан/скован'],
  ['stunned', 'Ошеломлён'], ['unconscious', 'Без сознания'], ['exhaustion', 'Истощение'],
  ['custom', 'Пользовательское']
]));

export const RESTORE_OPTIONS = freezeDefinitions(options([
  ['round', 'Раунд'], ['turn', 'Ход'], ['short-rest', 'Короткий отдых'],
  ['long-rest', 'Длинный отдых'], ['dawn', 'Рассвет'], ['manual', 'Вручную'],
  ['special', 'Особое/формула']
]));

export const EDITION_OPTIONS = freezeDefinitions(options([
  ['5e-2014', '5e 2014'], ['5e-2024', '5e 2024'], ['homebrew', 'Homebrew'],
  ['other', 'Иная система/редакция']
]));

export const LANGUAGE_OPTIONS = freezeDefinitions(options([
  ['common', 'Общий'], ['dwarvish', 'Дварфский'], ['elvish', 'Эльфийский'],
  ['giant', 'Великаний'], ['gnomish', 'Гномий'], ['goblin', 'Гоблинский'],
  ['halfling', 'Полуросликов'], ['orc', 'Орочий'], ['abyssal', 'Бездны'],
  ['celestial', 'Небесный'], ['draconic', 'Драконий'], ['deep-speech', 'Глубинная речь'],
  ['infernal', 'Инфернальный'], ['primordial', 'Первичный'], ['sylvan', 'Сильван'],
  ['undercommon', 'Подземный'], ['custom', 'Пользовательский']
]));

const commonPath = label => source('Общее для всех карточек', label);

const commonMetadataFields = [
  boundField('page.type', 'Тип', 'enum', { owner: 'page', path: 'type' }, {
    options: options([
      ['player', 'Игрок'], ['character', 'Персонаж'], ['location', 'Локация'],
      ['region', 'Регион'], ['country', 'Страна'], ['organization', 'Организация'],
      ['item', 'Предмет'], ['skill', 'Навык'], ['spell', 'Заклинание'], ['effect', 'Эффект'],
      ['lore', 'Лор'], ['folder', 'Папка'], ['project', 'Проект'], ['race', 'Раса'], ['class', 'Класс']
    ]), section: 'card', order: 1
  }, commonPath('Тип')),
  boundField('page.tags', 'Теги', 'array', { owner: 'page', path: 'tags' }, {
    items: { datatype: 'string' }, section: 'card', order: 2
  }, commonPath('Теги')),
  boundField('page.aliases', 'Алиасы', 'array', { owner: 'page', path: 'aliases' }, {
    items: { datatype: 'string' }, section: 'card', order: 3
  }, commonPath('Алиасы')),
  boundField('page.parent', 'Родитель', 'reference', { owner: 'page', path: 'parent', projection: 'page-id-reference' }, {
    targetTypes: ALL_CARD_TYPE_IDS, nullable: true, section: 'card', order: 4
  }, commonPath('Родитель')),
  boundField('page.relationships', 'Связи', 'array', { owner: 'page', path: 'relationships', projection: 'page-relationships-v1' }, {
    items: {
      datatype: 'object', properties: [
        nestedField('core.relationship.targetId', 'ID цели'),
        nestedField('core.relationship.targetTitle', 'Название цели'),
        nestedField('core.relationship.type', 'Тип связи'),
        nestedField('core.relationship.label', 'Подпись')
      ]
    }, section: 'card', order: 5
  }, commonPath('Связи')),
  repeatableField('core.sources', 'Источник', [
    nestedField('core.sources.kind', 'Тип источника', 'enum', { options: options([
      ['official', 'Официальный'], ['homebrew', 'Homebrew'], ['third-party', 'Сторонний'], ['user', 'Пользовательский']
    ]) }),
    nestedField('core.sources.title', 'Название'),
    nestedField('core.sources.url', 'URL'),
    referenceField('core.sources.card', 'Карточка', ALL_CARD_TYPE_IDS, {}, null, true),
    nestedField('core.sources.notes', 'Примечание', 'string', { format: 'multiline' })
  ], { section: 'card', order: 6 }, commonPath('Источник')),
  boundField('content.primaryImage', 'Изображение', 'asset', { owner: 'content', path: 'primaryImage' }, {
    section: 'card', order: 7
  }, commonPath('Изображение')),
  boundField('page.icon', 'Иконка', 'asset', { owner: 'page', path: 'iconJson' }, {
    section: 'card', order: 8
  }, commonPath('Иконка')),
  boundField('page.order', 'Порядок', 'number', { owner: 'page', path: 'order' }, {
    section: 'card', order: 9
  }, commonPath('Порядок')),
  boundField('page.archived', 'Архивный статус', 'boolean', { owner: 'page', path: 'archived' }, {
    section: 'card', order: 10
  }, commonPath('Архивный статус')),
  boundField('content.blocks', 'Блоки', 'string', { owner: 'content', path: 'blocks' }, {
    format: 'multiline', section: 'card', order: 11
  }, commonPath('Блоки'))
];

function dualPaths(label) {
  return {};
}

const actorLinkFields = [
  referenceArrayField('dnd.items', 'Предметы', ['item'], { section: 'relations', ...dualPaths('Предметы') }),
  referenceArrayField('dnd.equippedItems', 'Экипировано', ['item'], { section: 'relations', ...dualPaths('Экипировано') }),
  referenceArrayField('dnd.features', 'Навыки/способности', ['skill'], { section: 'relations', ...dualPaths('Навыки/способности') }),
  referenceArrayField('dnd.spells', 'Заклинания', ['spell'], { section: 'relations', ...dualPaths('Заклинания') }),
  referenceArrayField('dnd.effects', 'Эффекты', ['effect'], { section: 'relations', ...dualPaths('Эффекты') }),
  referenceArrayField('dnd.conditions', 'Состояния', ['effect'], { section: 'relations', ...dualPaths('Состояния') })
];

const actorDefenseFields = [
  objectField('dnd.defenses', 'Защиты', [
    enumArrayField('dnd.defenses.resistances', 'Сопротивления урону', DAMAGE_TYPE_OPTIONS, dualPaths('Защиты/Сопротивления урону'), null, true),
    enumArrayField('dnd.defenses.immunities', 'Иммунитеты к урону', DAMAGE_TYPE_OPTIONS, dualPaths('Защиты/Иммунитеты к урону'), null, true),
    enumArrayField('dnd.defenses.vulnerabilities', 'Уязвимости к урону', DAMAGE_TYPE_OPTIONS, dualPaths('Защиты/Уязвимости к урону'), null, true),
    enumArrayField('dnd.defenses.conditionImmunities', 'Иммунитеты к состояниям', CONDITION_OPTIONS, dualPaths('Защиты/Иммунитеты к состояниям'), null, true)
  ], { section: 'defense' })
];

function publicationPaths(label) {
  return {};
}

const publicationFields = [
  objectField('dnd.publicationSource', 'Источник/книга', [
    referenceField('dnd.publicationSource.lore', 'Карточка лора', ['lore'], {}, null, true),
    nestedField('dnd.publicationSource.text', 'Текстовый источник')
  ], { section: 'publication', ...publicationPaths('Источник/книга') }),
  variableField('dnd.rulesEdition', 'Редакция правил', 'enum', {
    options: EDITION_OPTIONS, section: 'publication', ...publicationPaths('Редакция правил')
  }),
  variableField('dnd.entityVersion', 'Версия', 'string', {
    section: 'publication', ...publicationPaths('Версия')
  })
];

export const GAME_CORE_FIELD_SET_DEFINITIONS = freezeDefinitions([
  {
    id: 'core.card-metadata', version: 1, label: 'Общие данные карточки', includes: [],
    fields: commonMetadataFields, sections: [], metadata: { stage: 5, owner: 'page-content-and-common-variables' }
  },
  {
    id: 'dnd.actor-links', version: 1, label: 'Связи игровой сущности', includes: [],
    fields: actorLinkFields, sections: [], metadata: { stage: 5, semanticOwner: 'actor-links' }
  },
  {
    id: 'dnd.actor-defenses', version: 1, label: 'Защиты игровой сущности', includes: [],
    fields: actorDefenseFields, sections: [], metadata: { stage: 5, semanticOwner: 'damage-and-condition-defenses' }
  },
  {
    id: 'dnd.rule-publication', version: 1, label: 'Публикация игрового правила', includes: [],
    fields: publicationFields, sections: [], metadata: { stage: 5, semanticOwner: 'rule-publication' }
  }
]);
