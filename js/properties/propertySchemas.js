// Единый каталог схем свойств. UI читает отсюда поля, а расчетные слои
// получают стабильные ключи вместо ручного поиска по русским подписям.

export const PROPERTY_SHAPE_OPTIONS = [
  'Точка',
  'Линия',
  'Конус',
  'Круг',
  'Куб',
  'Сфера'
];

export const PROPERTY_ACTION_OPTIONS = [
  'Действие',
  'Бонусное действие',
  'Реакция',
  'Отдых',
  'Пассивно'
];

export const PROPERTY_ARMOR_KIND_OPTIONS = [
  'Нет',
  'Легкий',
  'Средний',
  'Тяжелый',
  'Щит'
];

export const DND_SKILL_GROUPS = [
  skillGroupField(
    'strSkills',
    'Навыки СИЛ',
    'str',
    [
      skillCheck('saveStr', 'Спасбросок СИЛ'),
      skillCheck('skillAthletics', 'Атлетика')
    ]
  ),
  skillGroupField(
    'dexSkills',
    'Навыки ЛОВ',
    'dex',
    [
      skillCheck('saveDex', 'Спасбросок ЛОВ'),
      skillCheck('skillAcrobatics', 'Акробатика'),
      skillCheck('skillSleightOfHand', 'Ловкость рук'),
      skillCheck('skillStealth', 'Скрытность')
    ]
  ),
  skillGroupField(
    'conSkills',
    'Навыки ТЛС',
    'con',
    [
      skillCheck('saveCon', 'Спасбросок ТЛС')
    ]
  ),
  skillGroupField(
    'intSkills',
    'Навыки ИНТ',
    'int',
    [
      skillCheck('saveInt', 'Спасбросок ИНТ'),
      skillCheck('skillInvestigation', 'Анализ'),
      skillCheck('skillHistory', 'История'),
      skillCheck('skillArcana', 'Магия'),
      skillCheck('skillNature', 'Природа'),
      skillCheck('skillReligion', 'Религия')
    ]
  ),
  skillGroupField(
    'wisSkills',
    'Навыки МДР',
    'wis',
    [
      skillCheck('saveWis', 'Спасбросок МДР'),
      skillCheck('skillPerception', 'Внимательность'),
      skillCheck('skillSurvival', 'Выживание'),
      skillCheck('skillMedicine', 'Медицина'),
      skillCheck('skillInsight', 'Проницательность'),
      skillCheck('skillAnimalHandling', 'Уход за животными')
    ]
  ),
  skillGroupField(
    'chaSkills',
    'Навыки ХАР',
    'cha',
    [
      skillCheck('saveCha', 'Спасбросок ХАР'),
      skillCheck('skillPerformance', 'Выступление'),
      skillCheck('skillIntimidation', 'Запугивание'),
      skillCheck('skillDeception', 'Обман'),
      skillCheck('skillPersuasion', 'Убеждение')
    ]
  )
];

export const PROPERTY_BLOCK_SCHEMAS = {
  character: {
    cardType: 'character',
    label: 'Персонаж',
    title: 'Свойства персонажа',
    fields: [
      numberField('level', 'Уровень', '1', {
        min: 1,
        max: 20
      }),
      numberField('armorClass', 'КЗ', '10'),
      entityField('armorItem', 'Доспех', 'Название или id предмета-доспеха'),
      numberField('hpCurrent', 'Хиты факт', '10'),
      numberField('hpMax', 'Хиты макс.', '10'),
      numberField('hpTemp', 'Временные хиты', '0'),
      numberField('speed', 'Скорость', '30'),
      ...abilityFields(),
      ...DND_SKILL_GROUPS,
      numberField('deathSaveSuccesses', 'Хиты от смерти: успехи', '0', {
        min: 0,
        max: 3
      }),
      numberField('deathSaveFailures', 'Хиты от смерти: провалы', '0', {
        min: 0,
        max: 3
      }),
    ]
  },

  creature: {
    cardType: 'creature',
    label: 'Существо',
    title: 'Свойства существа',
    fields: [
      numberField('level', 'Уровень', '1', {
        min: 0,
        max: 30
      }),
      numberField('armorClass', 'КЗ', '10'),
      entityField('armorItem', 'Доспех', 'Название или id предмета-доспеха'),
      numberField('hpCurrent', 'Хиты факт', '10'),
      numberField('hpMax', 'Хиты макс.', '10'),
      numberField('hpTemp', 'Временные хиты', '0'),
      numberField('speed', 'Скорость', '30'),
      ...abilityFields(),
      ...DND_SKILL_GROUPS,
      textField('senses', 'Чувства', 'Темное зрение 60 фт.'),
      textareaField('effect', 'Особенности', 'Что важно помнить мастеру')
    ]
  },

  object: {
    cardType: 'object',
    label: 'Объект',
    title: 'Свойства объекта',
    fields: [
      textField('size', 'Размер', '1 клетка, 10x10 фт.'),
      textField('material', 'Материал', 'Дерево, камень, металл'),
      numberField('durability', 'Прочность', '10'),
      textField('interaction', 'Взаимодействие', 'Открыть, сломать, активировать'),
      textareaField('effect', 'Эффект', 'Что происходит при использовании')
    ]
  },

  location: {
    cardType: 'location',
    label: 'Локация',
    title: 'Свойства локации',
    fields: [
      textField('scale', 'Масштаб', 'Комната, деревня, город'),
      textField('climate', 'Климат', 'Холодный, влажный, сухой'),
      textField('danger', 'Опасность', 'Низкая, средняя, высокая'),
      textField('musicAudioAsset', 'Музыка: audio asset', 'assets/audio/location.ogg', {
        assetType: 'audio'
      }),
      textField('musicPlaylistAsset', 'Музыка: playlist asset', 'assets/playlists/location.json', {
        assetType: 'playlist'
      }),
      numberField('musicVolume', 'Громкость музыки', '0.7', {
        min: 0,
        max: 1
      }),
      textareaField('effect', 'Особенности', 'Слухи, правила места, угрозы')
    ]
  },

  region: {
    cardType: 'region',
    label: 'Регион',
    title: 'Свойства региона',
    fields: [
      textField('terrain', 'Рельеф', 'Лес, горы, болота'),
      textField('capital', 'Центр', 'Главный город или место'),
      textField('factions', 'Фракции', 'Кто влияет на регион'),
      textareaField('effect', 'Особенности', 'Что отличает регион')
    ]
  },

  magic: {
    cardType: 'magic',
    label: 'Магия',
    title: 'Свойства заклинания',
    fields: [
      numberField('level', 'Уровень', '0', {
        min: 0,
        max: 9
      }),
      selectField('actionType', 'Вид действия', PROPERTY_ACTION_OPTIONS),
      textField('damage', 'Урон', '1к8 огнем'),
      textField('range', 'Диапазон', '60 фт.'),
      textField('size', 'Размер', '15-футовый куб'),
      selectField('shape', 'Форма', PROPERTY_SHAPE_OPTIONS),
      textareaField('effect', 'Эффект', 'Что делает заклинание')
    ]
  },

  skill: {
    cardType: 'skill',
    label: 'Навык',
    title: 'Свойства навыка',
    fields: [
      numberField('skillLevel', 'Уровень навыка', '1', {
        min: 0,
        max: 20
      }),
      selectField('actionType', 'Вид действия', PROPERTY_ACTION_OPTIONS),
      textField('damage', 'Урон', '1к6, 2к8 + модификатор'),
      textField('range', 'Диапазон', '5 фт., 30/120 фт.'),
      textField('size', 'Размер', '1 клетка, 20 фт.'),
      selectField('shape', 'Форма', PROPERTY_SHAPE_OPTIONS),
      textareaField('effect', 'Эффект', 'Что происходит при применении навыка')
    ]
  },

  item: {
    cardType: 'item',
    label: 'Предмет',
    title: 'Свойства предмета',
    fields: [
      numberField('gold', 'ЗМ', '0', {
        min: 0
      }),
      numberField('silver', 'СМ', '0', {
        min: 0
      }),
      numberField('copper', 'ММ', '0', {
        min: 0
      }),
      textField('weight', 'Вес', '1 фнт.'),
      selectField('armorKind', 'Тип доспеха', PROPERTY_ARMOR_KIND_OPTIONS),
      numberField('armorBaseAc', 'Базовая КЗ доспеха', '', {
        min: 0
      }),
      numberField('armorDexMax', 'Лимит ЛОВ к КЗ', '', {
        min: 0
      }),
      textareaField('effect', 'Эффект', 'Что делает предмет')
    ]
  }
};


export function hasPropertySchema(
  cardType
) {

  return Boolean(
    getPropertySchema(cardType)
  );
}


export function getPropertySchema(
  cardType
) {

  return PROPERTY_BLOCK_SCHEMAS[cardType] || null;
}


export function getPropertyFields(
  cardType
) {

  return getPropertySchema(cardType)?.fields || [];
}


export function getPropertyValueFields(
  cardType
) {

  return getSchemaValueFields(
    getPropertySchema(
      cardType
    )
  );
}


export function getSchemaValueFields(
  schema
) {

  return (schema?.fields || [])
    .flatMap(field => {

      if (field.type !== 'skillGroup') {

        return field;
      }

      return (field.items || [])
        .flatMap(item => [
          numberField(
            item.name,
            item.label,
            '0'
          ),
          numberField(
            item.proficientName,
            `${item.label}: владение`,
            '0',
            {
              min: 0,
              max: 2
            }
          )
        ]);
    });
}


function textField(
  name,
  label,
  placeholder = '',
  options = {}
) {

  return {
    name,
    label,
    type: 'text',
    placeholder,
    assetType:
      options.assetType
  };
}


function numberField(
  name,
  label,
  placeholder = '',
  options = {}
) {

  return {
    name,
    label,
    type: 'number',
    placeholder,
    min: options.min,
    max: options.max
  };
}


function textareaField(
  name,
  label,
  placeholder = ''
) {

  return {
    name,
    label,
    type: 'textarea',
    placeholder
  };
}


function selectField(
  name,
  label,
  options
) {

  return {
    name,
    label,
    type: 'select',
    options
  };
}


function entityField(
  name,
  label,
  placeholder = ''
) {

  return {
    name,
    label,
    type: 'entity',
    placeholder
  };
}


function skillGroupField(
  name,
  label,
  ability,
  items
) {

  return {
    name,
    label,
    ability,
    type: 'skillGroup',
    items
  };
}


function skillCheck(
  name,
  label
) {

  return {
    name,
    label,
    proficientName:
      `${name}Proficient`
  };
}


function abilityFields() {

  return [
    numberField('str', 'СИЛ', '10', {
      min: 1,
      max: 30
    }),
    numberField('dex', 'ЛОВ', '10', {
      min: 1,
      max: 30
    }),
    numberField('con', 'ТЛС', '10', {
      min: 1,
      max: 30
    }),
    numberField('int', 'ИНТ', '10', {
      min: 1,
      max: 30
    }),
    numberField('wis', 'МДР', '10', {
      min: 1,
      max: 30
    }),
    numberField('cha', 'ХАР', '10', {
      min: 1,
      max: 30
    })
  ];
}
