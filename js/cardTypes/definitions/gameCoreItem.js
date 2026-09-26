import {
  ABILITY_WITH_AUTO_OPTIONS,
  CONDITION_OPTIONS,
  DAMAGE_TYPE_OPTIONS,
  RESTORE_OPTIONS,
  SIZE_OPTIONS
} from './gameCoreShared.js';
import {
  ALL_CARD_TYPE_IDS,
  enumArrayField,
  formulaField,
  namedDetailsRows,
  nestedField,
  objectField,
  options,
  referenceArrayField,
  referenceField,
  repeatableField,
  section,
  source,
  stringArrayField,
  variableField
} from './gameCoreHelpers.js';

const itemPath = (...parts) => source('Предмет', ...parts);

const itemFields = [
  variableField('item.category', 'Категория', 'enum', {
    options: options([
      ['weapon', 'Оружие'], ['armor', 'Доспех'], ['shield', 'Щит'], ['ammunition', 'Боеприпас'],
      ['consumable', 'Расходник'], ['tool', 'Инструмент'], ['container', 'Контейнер'],
      ['equipment', 'Снаряжение'], ['treasure', 'Сокровище'], ['magic-item', 'Магический предмет'],
      ['quest-item', 'Квестовый предмет'], ['other', 'Другое']
    ]), section: 'identity'
  }, itemPath('Категория')),
  variableField('item.subcategory', 'Подкатегория', 'enum', {
    options: options([['custom', 'Пользовательское значение']]), section: 'identity'
  }, itemPath('Подкатегория')),
  variableField('item.quantity', 'Количество', 'integer', { min: 0, section: 'identity' }, itemPath('Количество')),
  variableField('item.size', 'Размер', 'enum', { options: SIZE_OPTIONS, section: 'identity' }, itemPath('Размер')),
  variableField('item.weight', 'Вес', 'number', { min: 0, section: 'identity' }, itemPath('Вес')),
  objectField('item.cost', 'Стоимость', [
    nestedField('item.cost.copper', 'Медь', 'number', {}, itemPath('Стоимость', 'Медь')),
    nestedField('item.cost.silver', 'Серебро', 'number', {}, itemPath('Стоимость', 'Серебро')),
    nestedField('item.cost.electrum', 'Электрум', 'number', {}, itemPath('Стоимость', 'Электрум')),
    nestedField('item.cost.gold', 'Золото', 'number', {}, itemPath('Стоимость', 'Золото')),
    nestedField('item.cost.platinum', 'Платина', 'number', {}, itemPath('Стоимость', 'Платина')),
    repeatableField('item.cost.otherCurrencies', 'Другая валюта', [
      nestedField('item.cost.otherCurrencies.name', 'Валюта'),
      nestedField('item.cost.otherCurrencies.amount', 'Сумма', 'number')
    ], {}, itemPath('Стоимость', 'Другая валюта'), true)
  ], { section: 'identity' }, itemPath('Стоимость')),
  variableField('item.rarity', 'Редкость', 'enum', {
    options: options([
      ['none', 'Без редкости'], ['common', 'Обычный'], ['uncommon', 'Необычный'], ['rare', 'Редкий'],
      ['very-rare', 'Очень редкий'], ['legendary', 'Легендарный'], ['artifact', 'Артефакт'], ['custom', 'Пользовательская']
    ]), section: 'magic'
  }, itemPath('Редкость')),
  variableField('item.magical', 'Магический', 'boolean', { section: 'magic' }, itemPath('Магический')),
  variableField('item.requiresAttunement', 'Требует настройки', 'boolean', { section: 'magic' }, itemPath('Требует настройки')),
  variableField('item.attuned', 'Настроен', 'boolean', { section: 'magic' }, itemPath('Настроен')),
  stringArrayField('item.attunementRequirements', 'Требования настройки', { section: 'magic' }, itemPath('Требования настройки')),
  variableField('item.identified', 'Опознан', 'boolean', { section: 'magic' }, itemPath('Опознан')),
  variableField('item.equippable', 'Экипируемый', 'boolean', { section: 'equipment' }, itemPath('Экипируемый')),
  variableField('item.equipped', 'Экипирован', 'boolean', { section: 'equipment' }, itemPath('Экипирован')),
  variableField('item.equipmentSlot', 'Слот экипировки', 'enum', {
    options: options([
      ['head', 'Голова'], ['neck', 'Шея'], ['body', 'Тело'], ['shoulders', 'Плечи/плащ'],
      ['hands', 'Руки'], ['belt', 'Пояс'], ['legs', 'Ноги'], ['feet', 'Ступни'],
      ['ring', 'Кольцо'], ['main-hand', 'Основная рука'], ['off-hand', 'Вторая рука'],
      ['two-hands', 'Две руки'], ['ammunition', 'Боеприпас'], ['other', 'Прочее']
    ]), section: 'equipment'
  }, itemPath('Слот экипировки')),
  variableField('item.requiresProficiency', 'Требует владения', 'boolean', { section: 'equipment' }, itemPath('Требует владения')),
  objectField('item.durability', 'Прочность', [
    nestedField('item.durability.current', 'Текущая', 'integer', { min: 0 }, itemPath('Прочность', 'Текущая')),
    nestedField('item.durability.maximum', 'Максимальная', 'integer', { min: 0 }, itemPath('Прочность', 'Максимальная'))
  ], { section: 'equipment' }, itemPath('Прочность')),
  objectField('item.charges', 'Использования/заряды', [
    nestedField('item.charges.current', 'Текущие', 'integer', { min: 0 }, itemPath('Использования/заряды', 'Текущие')),
    nestedField('item.charges.maximum', 'Максимальные', 'integer', { min: 0 }, itemPath('Использования/заряды', 'Максимальные')),
    nestedField('item.charges.recovery', 'Восстановление', 'enum', { options: RESTORE_OPTIONS }, itemPath('Использования/заряды', 'Восстановление')),
    formulaField('item.charges.recoveryFormula', 'Формула восстановления', {}, itemPath('Использования/заряды', 'Формула восстановления'), true)
  ], { section: 'equipment' }, itemPath('Использования/заряды')),
  objectField('item.weapon', 'Оружие', [
    nestedField('item.weapon.type', 'Тип оружия', 'enum', { options: options([
      ['simple-melee', 'Простое рукопашное'], ['simple-ranged', 'Простое дальнобойное'],
      ['martial-melee', 'Воинское рукопашное'], ['martial-ranged', 'Воинское дальнобойное'],
      ['natural', 'Естественное'], ['improvised', 'Импровизированное'], ['special', 'Особое'], ['custom', 'Пользовательское']
    ]) }, itemPath('Оружие', 'Тип оружия')),
    nestedField('item.weapon.rangeMode', 'Ближнее/дальнее', 'enum', { options: options([['melee', 'Ближнее'], ['ranged', 'Дальнее']]) }, itemPath('Оружие', 'Ближнее/дальнее')),
    nestedField('item.weapon.ability', 'Базовая характеристика', 'enum', { options: ABILITY_WITH_AUTO_OPTIONS }, itemPath('Оружие', 'Базовая характеристика')),
    repeatableField('item.weapon.damage', 'Урон', [
      formulaField('item.weapon.damage.formula', 'Формула', {}, itemPath('Оружие', 'Урон', 'Формула'), true),
      nestedField('item.weapon.damage.type', 'Тип урона', 'enum', { options: DAMAGE_TYPE_OPTIONS }, itemPath('Оружие', 'Урон', 'Тип урона'))
    ], {}, itemPath('Оружие', 'Урон'), true),
    objectField('item.weapon.critical', 'Крит', [
      nestedField('item.weapon.critical.threshold', 'Порог', 'number', {}, itemPath('Оружие', 'Крит', 'Порог')),
      formulaField('item.weapon.critical.extraDamage', 'Дополнительный урон', {}, itemPath('Оружие', 'Крит', 'Дополнительный урон'), true)
    ], {}, itemPath('Оружие', 'Крит'), true),
    nestedField('item.weapon.reach', 'Досягаемость', 'number', { min: 0 }, itemPath('Оружие', 'Досягаемость')),
    objectField('item.weapon.range', 'Дальность', [
      nestedField('item.weapon.range.normal', 'Нормальная', 'number', { min: 0 }, itemPath('Оружие', 'Дальность', 'Нормальная')),
      nestedField('item.weapon.range.maximum', 'Максимальная', 'integer', { min: 0 }, itemPath('Оружие', 'Дальность', 'Максимальная'))
    ], {}, itemPath('Оружие', 'Дальность'), true),
    enumArrayField('item.weapon.properties', 'Свойства', options([
      ['ammunition', 'Боеприпас'], ['finesse', 'Фехтовальное'], ['heavy', 'Тяжёлое'], ['light', 'Лёгкое'],
      ['loading', 'Перезарядка'], ['reach', 'Досягаемость'], ['special', 'Особое'],
      ['thrown', 'Метательное'], ['two-handed', 'Двуручное'], ['versatile', 'Универсальное'], ['custom', 'Пользовательское']
    ]), {}, itemPath('Оружие', 'Свойства'), true),
    objectField('item.weapon.mastery', 'Мастерство', [
      referenceField('item.weapon.mastery.skill', 'Навык', ['skill'], {}, null, true),
      nestedField('item.weapon.mastery.text', 'Текст')
    ], {}, itemPath('Оружие', 'Мастерство'), true),
    referenceField('item.weapon.ammunition', 'Боеприпас', ['item'], {}, itemPath('Оружие', 'Боеприпас'), true),
    formulaField('item.weapon.alternativeDamage', 'Альтернативный урон', {}, itemPath('Оружие', 'Альтернативный урон'), true)
  ], { section: 'weapon' }, itemPath('Оружие')),
  objectField('item.armor', 'Доспех', [
    nestedField('item.armor.type', 'Тип доспеха', 'enum', { options: options([
      ['none', 'Нет'], ['light', 'Лёгкий'], ['medium', 'Средний'], ['heavy', 'Тяжёлый'],
      ['shield', 'Щит'], ['natural', 'Естественная броня'], ['custom', 'Пользовательский']
    ]) }, itemPath('Доспех', 'Тип доспеха')),
    nestedField('item.armor.baseAc', 'Базовый КД', 'number', {}, itemPath('Доспех', 'Базовый КД')),
    nestedField('item.armor.addDexterity', 'Модификатор ловкости', 'boolean', {}, itemPath('Доспех', 'Модификатор ловкости')),
    nestedField('item.armor.maxDexterity', 'Максимум модификатора ловкости', 'number', {}, itemPath('Доспех', 'Максимум модификатора ловкости')),
    nestedField('item.armor.minimumStrength', 'Минимальная сила', 'number', {}, itemPath('Доспех', 'Минимальная сила')),
    nestedField('item.armor.stealthDisadvantage', 'Помеха скрытности', 'boolean', {}, itemPath('Доспех', 'Помеха скрытности'))
  ], { section: 'armor' }, itemPath('Доспех')),
  objectField('item.container', 'Контейнер', [
    nestedField('item.container.capacity', 'Вместимость', 'number', { min: 0 }, itemPath('Контейнер', 'Вместимость')),
    nestedField('item.container.capacityUnit', 'Единицы вместимости', 'enum', { options: options([
      ['weight', 'Вес'], ['items', 'Количество предметов'], ['slots', 'Слоты'], ['volume', 'Объём'], ['custom', 'Пользовательская']
    ]) }, itemPath('Контейнер', 'Единицы вместимости')),
    referenceArrayField('item.container.contents', 'Содержимое', ['item'], {}, itemPath('Контейнер', 'Содержимое'), true),
    nestedField('item.container.reducesContentWeight', 'Снижает вес содержимого', 'boolean', {}, itemPath('Контейнер', 'Снижает вес содержимого'))
  ], { section: 'container' }, itemPath('Контейнер')),
  referenceArrayField('item.actions', 'Навыки/действия', ['skill'], { section: 'relations' }, itemPath('Навыки/действия')),
  referenceArrayField('item.effects', 'Эффекты', ['effect'], { section: 'relations' }, itemPath('Эффекты')),
  referenceArrayField('item.conditions', 'Состояния', ['effect'], { section: 'relations' }, itemPath('Состояния')),
  namedDetailsRows('item.modifiers', 'Модификаторы', itemPath('Модификаторы'), false, { section: 'grants' }),
  enumArrayField('item.grantedProficiencies', 'Предоставляемые владения', options([
    ['armor', 'Доспехи'], ['weapons', 'Оружие'], ['tools', 'Инструменты'], ['skills', 'Навыки'],
    ['saving-throws', 'Спасброски'], ['languages', 'Языки']
  ]), { section: 'grants' }, itemPath('Предоставляемые владения')),
  enumArrayField('item.grantedResistances', 'Предоставляемые сопротивления', DAMAGE_TYPE_OPTIONS, { section: 'grants' }, itemPath('Предоставляемые сопротивления')),
  enumArrayField('item.grantedImmunities', 'Предоставляемые иммунитеты', [
    ...DAMAGE_TYPE_OPTIONS,
    ...CONDITION_OPTIONS.filter(entry => !DAMAGE_TYPE_OPTIONS.some(existing => existing.value === entry.value))
  ], { section: 'grants' }, itemPath('Предоставляемые иммунитеты')),
  referenceArrayField('item.relatedItems', 'Связанные предметы', ['item'], { section: 'relations' }, itemPath('Связанные предметы')),
  referenceField('item.creationSource', 'Источник создания', ALL_CARD_TYPE_IDS, { section: 'relations' }, itemPath('Источник создания')),
  referenceField('item.owner', 'Владелец', ['player', 'character', 'organization'], { section: 'relations' }, itemPath('Владелец')),
  variableField('item.isObject', 'Является объектом', 'boolean', { default: false, section: 'map' }, itemPath('Является объектом')),
  variableField('item.tokenModel', 'Моделька токена', 'asset', { section: 'map' }, itemPath('Моделька токена'))
];

export const ITEM_DEFINITION = {
  id: 'item', version: 1, label: 'Предмет',
  includes: [{ id: 'core.card-metadata', version: 1 }],
  fields: itemFields,
  sections: [
    section('card', 'Карточка', 0), section('identity', 'Основное', 10), section('magic', 'Магические свойства', 20),
    section('equipment', 'Экипировка', 30), section('weapon', 'Оружие', 40), section('armor', 'Доспех', 50),
    section('container', 'Контейнер', 60), section('grants', 'Предоставляемые свойства', 70),
    section('relations', 'Связи', 80), section('map', 'Карта', 90)
  ],
  capabilities: { gameplayEntity: true, inventoryItem: true, mapObject: true },
  metadata: { stage: 5, catalog: 'game-core' }
};
