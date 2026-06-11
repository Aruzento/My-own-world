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
      numberField('hpCurrent', 'Хиты факт', '10'),
      numberField('hpMax', 'Хиты макс.', '10'),
      numberField('hpTemp', 'Временные хиты', '0'),
      numberField('speed', 'Скорость', '30'),
      ...abilityFields(),
      numberField('deathSaveSuccesses', 'Хиты от смерти: успехи', '0', {
        min: 0,
        max: 3
      }),
      numberField('deathSaveFailures', 'Хиты от смерти: провалы', '0', {
        min: 0,
        max: 3
      }),
      textareaField('conditions', 'Состояния', 'Например: отравлен, сбит с ног, истощение 1'),
      textareaField('effects', 'Эффекты', 'Например: +2 КЗ от щита, благословение, ускорение')
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
      numberField('hpCurrent', 'Хиты факт', '10'),
      numberField('hpMax', 'Хиты макс.', '10'),
      numberField('hpTemp', 'Временные хиты', '0'),
      numberField('speed', 'Скорость', '30'),
      ...abilityFields(),
      textField('senses', 'Чувства', 'Темное зрение 60 фт.'),
      textareaField('conditions', 'Состояния', 'Например: испуган, опутан, оглушен'),
      textareaField('effects', 'Эффекты', 'Временные бонусы, слабости, особенности боя'),
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


function textField(
  name,
  label,
  placeholder = ''
) {

  return {
    name,
    label,
    type: 'text',
    placeholder
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
