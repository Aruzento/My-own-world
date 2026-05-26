export const PROPERTY_BLOCK_DEFINITIONS = {
  skill: {
    label: 'Навык',
    title: 'Свойства навыка',
    fields: [
      ['damage', 'Урон', 'text', '1к6, 2к8 + модификатор'],
      ['range', 'Диапазон', 'text', '5 фт., 30/120 фт.'],
      ['size', 'Размер', 'text', '1 клетка, 20 фт.'],
      ['shape', 'Форма', 'select', ''],
      ['effect', 'Эффект', 'textarea', 'Что происходит при применении навыка']
    ]
  },
  magic: {
    label: 'Магия',
    title: 'Свойства заклинания',
    fields: [
      ['damage', 'Урон', 'text', '1к8 огнем'],
      ['range', 'Диапазон', 'text', '60 фт.'],
      ['size', 'Размер', 'text', '15-футовый куб'],
      ['shape', 'Форма', 'select', '']
    ]
  },
  item: {
    label: 'Предмет',
    title: 'Свойства предмета',
    fields: [
      ['gold', 'ЗМ', 'number', '0'],
      ['silver', 'СМ', 'number', '0'],
      ['copper', 'ММ', 'number', '0'],
      ['effect', 'Эффект', 'textarea', 'Что делает предмет']
    ]
  }
};

export const PROPERTY_SHAPE_OPTIONS = [
  'Точка',
  'Линия',
  'Конус',
  'Круг',
  'Куб',
  'Сфера'
];


export function hasPropertyBlockDefinition(
  cardType
) {

  return (
    cardType === 'character' ||
    Boolean(PROPERTY_BLOCK_DEFINITIONS[cardType])
  );
}


export function getPropertyBlockDefinition(
  cardType
) {

  return PROPERTY_BLOCK_DEFINITIONS[cardType] || null;
}
