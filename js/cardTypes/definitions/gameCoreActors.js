import {
  ALIGNMENT_OPTIONS,
  ABILITY_OPTIONS,
  ABILITY_WITH_AUTO_OPTIONS,
  CREATURE_TYPE_OPTIONS,
  LANGUAGE_OPTIONS,
  RESTORE_OPTIONS,
  SIZE_OPTIONS
} from './gameCoreShared.js';
import {
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
  variableField
} from './gameCoreHelpers.js';

const SKILLS = [
  ['acrobatics', 'Акробатика'], ['investigation', 'Анализ'], ['athletics', 'Атлетика'],
  ['perception', 'Внимательность'], ['survival', 'Выживание'], ['performance', 'Выступление'],
  ['intimidation', 'Запугивание'], ['history', 'История'], ['sleightOfHand', 'Ловкость рук'],
  ['arcana', 'Магия'], ['medicine', 'Медицина'], ['deception', 'Обман'],
  ['nature', 'Природа'], ['insight', 'Проницательность'], ['religion', 'Религия'],
  ['stealth', 'Скрытность'], ['persuasion', 'Убеждение'], ['animalHandling', 'Уход за животными']
];

const ABILITIES = [
  ['strength', 'Сила'], ['dexterity', 'Ловкость'], ['constitution', 'Телосложение'],
  ['intelligence', 'Интеллект'], ['wisdom', 'Мудрость'], ['charisma', 'Харизма']
];

const movementOptions = options([
  ['walk', 'Ходьба'], ['fly', 'Полёт'], ['swim', 'Плавание'], ['climb', 'Лазание'],
  ['burrow', 'Рытьё'], ['hover', 'Парение']
]);
const distanceUnits = options([['feet', 'Футы'], ['meters', 'Метры'], ['squares', 'Клетки']]);
const advantageOptions = options([['normal', 'Обычный'], ['advantage', 'Преимущество'], ['disadvantage', 'Помеха']]);
const armorProficiencyOptions = options([
  ['light', 'Лёгкие'], ['medium', 'Средние'], ['heavy', 'Тяжёлые'], ['shields', 'Щиты'],
  ['specific', 'Отдельные виды'], ['custom', 'Пользовательские']
]);
const weaponProficiencyOptions = options([
  ['simple', 'Простое'], ['martial', 'Воинское'], ['specific', 'Отдельные виды оружия'], ['custom', 'Пользовательские']
]);
const toolProficiencyOptions = options([
  ['thieves-tools', 'Воровские инструменты'], ['artisan-tools', 'Наборы ремесленника'],
  ['gaming-sets', 'Игровые наборы'], ['musical-instruments', 'Музыкальные инструменты'],
  ['vehicles', 'Транспорт'], ['custom', 'Пользовательские']
]);

const playerPath = (...parts) => source('Игрок', ...parts);
const characterPath = (...parts) => source('Персонаж', ...parts);

function playerAbilityFields() {
  return ABILITIES.map(([id, label]) => objectField(`player.abilities.${id}`, label, [
    nestedField(`player.abilities.${id}.score`, 'Значение', 'number', {}, playerPath('Характеристики', label, 'Значение')),
    nestedField(`player.abilities.${id}.modifier`, 'Модификатор', 'number', {}, playerPath('Характеристики', label, 'Модификатор')),
    nestedField(`player.abilities.${id}.saveProficient`, 'Владение спасброском', 'boolean', {}, playerPath('Характеристики', label, 'Владение спасброском')),
    nestedField(`player.abilities.${id}.saveBonus`, 'Бонус спасброска', 'number', {}, playerPath('Характеристики', label, 'Бонус спасброска'))
  ], {}, playerPath('Характеристики', label), true));
}

function playerSkillFields() {
  return SKILLS.map(([id, label]) => objectField(`player.skills.${id}`, label, [
    nestedField(`player.skills.${id}.proficient`, 'Владение', 'boolean', {}, playerPath('Навыки', label, 'Владение')),
    nestedField(`player.skills.${id}.expertise`, 'Экспертиза', 'boolean', {}, playerPath('Навыки', label, 'Экспертиза')),
    nestedField(`player.skills.${id}.bonus`, 'Бонус', 'number', {}, playerPath('Навыки', label, 'Бонус'))
  ], {}, playerPath('Навыки', label), true));
}

const playerFields = [
  objectField('player.identity', 'Идентичность', [
    referenceField('player.identity.race', 'Раса', ['race'], {}, playerPath('Идентичность', 'Раса'), true),
    referenceField('player.identity.subrace', 'Подраса', ['race'], {}, playerPath('Идентичность', 'Подраса'), true),
    referenceField('player.identity.class', 'Класс', ['class'], {}, playerPath('Идентичность', 'Класс'), true),
    referenceField('player.identity.subclass', 'Подкласс', ['class'], {}, playerPath('Идентичность', 'Подкласс'), true),
    nestedField('player.identity.alignment', 'Мировоззрение', 'enum', { options: ALIGNMENT_OPTIONS }, playerPath('Идентичность', 'Мировоззрение')),
    nestedField('player.identity.size', 'Размер', 'enum', { options: SIZE_OPTIONS }, playerPath('Идентичность', 'Размер')),
    nestedField('player.identity.creatureType', 'Тип существа', 'enum', { options: CREATURE_TYPE_OPTIONS }, playerPath('Идентичность', 'Тип существа')),
    nestedField('player.identity.age', 'Возраст', 'number', {}, playerPath('Идентичность', 'Возраст')),
    nestedField('player.identity.gender', 'Пол', 'string', {}, playerPath('Идентичность', 'Пол'))
  ], { section: 'identity' }, playerPath('Идентичность')),
  objectField('player.progression', 'Прогрессия', [
    nestedField('dnd.level', 'Общий уровень', 'integer', { min: 0 }, playerPath('Прогрессия', 'Общий уровень')),
    repeatableField('player.progression.classLevels', 'Уровни классов', [
      referenceField('player.progression.classLevels.class', 'Класс', ['class'], {}, null, true),
      nestedField('player.progression.classLevels.level', 'Уровень', 'integer', { min: 1 })
    ], {}, playerPath('Прогрессия', 'Уровни классов'), true),
    objectField('player.progression.experience', 'Опыт', [
      nestedField('player.progression.experience.current', 'Текущий', 'integer', { min: 0 }, playerPath('Прогрессия', 'Опыт', 'Текущий')),
      nestedField('player.progression.experience.toNextLevel', 'До следующего уровня', 'integer', { min: 0 }, playerPath('Прогрессия', 'Опыт', 'До следующего уровня'))
    ], {}, playerPath('Прогрессия', 'Опыт'), true),
    nestedField('dnd.proficiencyBonus', 'Бонус мастерства', 'integer', {}, playerPath('Прогрессия', 'Бонус мастерства')),
    nestedField('player.progression.inspiration', 'Вдохновение', 'boolean', {}, playerPath('Прогрессия', 'Вдохновение'))
  ], { section: 'progression' }, playerPath('Прогрессия')),
  objectField('player.abilities', 'Характеристики', playerAbilityFields(), { section: 'abilities' }, playerPath('Характеристики')),
  objectField('dnd.health', 'Хиты', [
    nestedField('dnd.hpCurrent', 'Текущие', 'integer', { min: 0 }, playerPath('Хиты', 'Текущие')),
    nestedField('dnd.hpMax', 'Максимальные', 'integer', { min: 0 }, playerPath('Хиты', 'Максимальные')),
    nestedField('dnd.hpTemporary', 'Временные', 'integer', { min: 0 }, playerPath('Хиты', 'Временные')),
    repeatableField('player.health.hitDice', 'Кости хитов', [
      nestedField('player.health.hitDice.die', 'Кость', 'enum', { options: options([['d6', 'к6'], ['d8', 'к8'], ['d10', 'к10'], ['d12', 'к12'], ['custom', 'Пользовательская']]) }),
      referenceField('player.health.hitDice.class', 'Класс', ['class'], {}, null, true),
      nestedField('player.health.hitDice.current', 'Текущие', 'integer', { min: 0 }),
      nestedField('player.health.hitDice.maximum', 'Максимальные', 'integer', { min: 0 })
    ], {}, playerPath('Хиты', 'Кости хитов'), true),
    nestedField('player.health.criticalThreshold', 'Порог тяжёлого состояния', 'integer', {}, playerPath('Хиты', 'Порог тяжёлого состояния'))
  ], { section: 'combat' }, playerPath('Хиты')),
  objectField('player.deathSaves', 'Спасброски от смерти', [
    nestedField('player.deathSaves.successes', 'Успехи', 'integer', { min: 0, max: 3 }, playerPath('Спасброски от смерти', 'Успехи')),
    nestedField('player.deathSaves.failures', 'Провалы', 'integer', { min: 0, max: 3 }, playerPath('Спасброски от смерти', 'Провалы'))
  ], { section: 'combat' }, playerPath('Спасброски от смерти')),
  objectField('dnd.armorClass', 'Защита', [
    nestedField('dnd.armorClass.value', 'Класс доспеха', 'number', {}, playerPath('Защита', 'Класс доспеха')),
    objectField('dnd.armorClass.source', 'Источник КД', [
      referenceField('dnd.armorClass.source.reference', 'Карточка', ['item', 'class', 'race', 'effect'], {}, null, true),
      nestedField('dnd.armorClass.source.manual', 'Ручное значение')
    ], {}, playerPath('Защита', 'Источник КД'), true),
    formulaField('dnd.armorClass.formula', 'Формула КД', {}, playerPath('Защита', 'Формула КД'), true),
    referenceField('dnd.armorClass.shield', 'Щит', ['item'], {}, playerPath('Защита', 'Щит'), true)
  ], { section: 'combat' }, playerPath('Защита')),
  objectField('dnd.initiative', 'Инициатива', [
    nestedField('dnd.initiative.modifier', 'Модификатор', 'number', {}, playerPath('Инициатива', 'Модификатор')),
    nestedField('dnd.initiative.bonus', 'Бонус', 'number', {}, playerPath('Инициатива', 'Бонус')),
    nestedField('dnd.initiative.mode', 'Преимущество/помеха', 'enum', { options: advantageOptions }, playerPath('Инициатива', 'Преимущество/помеха'))
  ], { section: 'combat' }, playerPath('Инициатива')),
  repeatableField('dnd.movement', 'Передвижение тип', [
    nestedField('dnd.movement.type', 'Тип', 'enum', { options: movementOptions }),
    nestedField('dnd.movement.speed', 'Скорость', 'number', { min: 0 }),
    nestedField('dnd.movement.units', 'Единицы', 'enum', { options: distanceUnits })
  ], { section: 'combat' }, playerPath('Передвижение тип')),
  objectField('player.skills', 'Навыки', playerSkillFields(), { section: 'skills' }, playerPath('Навыки')),
  objectField('dnd.proficiencies', 'Владения', [
    enumArrayField('dnd.proficiencies.armor', 'Доспехи', armorProficiencyOptions, {}, playerPath('Владения', 'Доспехи'), true),
    enumArrayField('dnd.proficiencies.weapons', 'Оружие', weaponProficiencyOptions, {}, playerPath('Владения', 'Оружие'), true),
    enumArrayField('dnd.proficiencies.tools', 'Инструменты', toolProficiencyOptions, {}, playerPath('Владения', 'Инструменты'), true),
    enumArrayField('dnd.proficiencies.languages', 'Языки', LANGUAGE_OPTIONS, {}, playerPath('Владения', 'Языки'), true)
  ], { section: 'skills' }, playerPath('Владения')),
  objectField('player.exhaustion', 'Истощение', [
    nestedField('player.exhaustion.level', 'Уровень', 'integer', { min: 0 }, playerPath('Истощение', 'Уровень'))
  ], { section: 'defense' }, playerPath('Истощение')),
  repeatableField('dnd.resources', 'Ресурсы', [
    nestedField('dnd.resources.name', 'Название', 'string', {}, playerPath('Ресурсы', 'Название')),
    nestedField('dnd.resources.current', 'Текущее значение', 'integer', {}, playerPath('Ресурсы', 'Текущее значение')),
    nestedField('dnd.resources.maximum', 'Максимум', 'integer', {}, playerPath('Ресурсы', 'Максимум')),
    nestedField('dnd.resources.recovery', 'Восстановление', 'enum', { options: RESTORE_OPTIONS }, playerPath('Ресурсы', 'Восстановление')),
    formulaField('dnd.resources.recoveryFormula', 'Формула восстановления', {}, playerPath('Ресурсы', 'Формула восстановления'), true)
  ], { section: 'inventory' }, playerPath('Ресурсы')),
  objectField('dnd.money', 'Деньги', [
    nestedField('dnd.money.copper', 'Медь', 'number', {}, playerPath('Деньги', 'Медь')),
    nestedField('dnd.money.silver', 'Серебро', 'number', {}, playerPath('Деньги', 'Серебро')),
    nestedField('dnd.money.electrum', 'Электрум', 'number', {}, playerPath('Деньги', 'Электрум')),
    nestedField('dnd.money.gold', 'Золото', 'number', {}, playerPath('Деньги', 'Золото')),
    nestedField('dnd.money.platinum', 'Платина', 'number', {}, playerPath('Деньги', 'Платина'))
  ], { section: 'inventory' }, playerPath('Деньги')),
  objectField('player.encumbrance', 'Груз', [
    nestedField('player.encumbrance.currentWeight', 'Текущий вес', 'integer', { min: 0 }, playerPath('Груз', 'Текущий вес')),
    nestedField('player.encumbrance.maximumWeight', 'Максимальный вес', 'integer', { min: 0 }, playerPath('Груз', 'Максимальный вес')),
    nestedField('player.encumbrance.overloaded', 'Перегруз', 'boolean', {}, playerPath('Груз', 'Перегруз'))
  ], { section: 'inventory' }, playerPath('Груз')),
  referenceArrayField('player.attunedItems', 'Настроенные предметы', ['item'], { section: 'relations' }, playerPath('Настроенные предметы')),
  objectField('dnd.magic', 'Магия', [
    nestedField('dnd.magic.ability', 'Базовая характеристика', 'enum', { options: ABILITY_WITH_AUTO_OPTIONS }, playerPath('Магия', 'Базовая характеристика')),
    nestedField('dnd.magic.saveDc', 'Сл спасброска', 'integer', {}, playerPath('Магия', 'Сл спасброска')),
    nestedField('dnd.magic.attackBonus', 'Бонус атаки заклинанием', 'number', {}, playerPath('Магия', 'Бонус атаки заклинанием')),
    repeatableField('dnd.magic.spellSlots', 'Ячейки заклинаний', [
      nestedField('dnd.magic.spellSlots.level', 'Уровень', 'integer', { min: 1, max: 9 }, playerPath('Магия', 'Ячейки заклинаний', 'Уровень')),
      nestedField('dnd.magic.spellSlots.current', 'Текущие', 'integer', { min: 0 }, playerPath('Магия', 'Ячейки заклинаний', 'Текущие')),
      nestedField('dnd.magic.spellSlots.maximum', 'Максимальные', 'integer', { min: 0 }, playerPath('Магия', 'Ячейки заклинаний', 'Максимальные'))
    ], {}, playerPath('Магия', 'Ячейки заклинаний'), true),
    namedDetailsRows('dnd.magic.otherResources', 'Другие магические ресурсы', playerPath('Магия', 'Другие магические ресурсы'), true)
  ], { section: 'magic' }, playerPath('Магия')),
  objectField('dnd.map', 'Карта', [
    nestedField('dnd.map.tokenSize', 'Размер токена', 'number', { min: 0 }, playerPath('Карта', 'Размер токена')),
    nestedField('dnd.map.tokenIcon', 'Иконка токена', 'asset', {}, playerPath('Карта', 'Иконка токена')),
    nestedField('dnd.map.hasVision', 'Зрение', 'boolean', {}, playerPath('Карта', 'Зрение')),
    nestedField('dnd.map.visionRange', 'Дальность зрения', 'number', { min: 0 }, playerPath('Карта', 'Дальность зрения')),
    namedDetailsRows('dnd.map.lightSources', 'Источники света', playerPath('Карта', 'Источники света'), true)
  ], { section: 'map' }, playerPath('Карта'))
];

const characterFields = [
  variableField('character.category', 'Категория', 'enum', {
    options: options([['npc', 'NPC'], ['monster', 'Монстр'], ['animal', 'Животное'], ['summon', 'Призванное существо'], ['companion', 'Спутник'], ['other', 'Другое']]),
    section: 'identity'
  }, characterPath('Категория')),
  variableField('dnd.creatureType', 'Тип существа', 'enum', { options: CREATURE_TYPE_OPTIONS, section: 'identity' }, characterPath('Тип существа')),
  variableField('character.creatureSubtype', 'Подтип существа', 'string', { section: 'identity' }, characterPath('Подтип существа')),
  variableField('dnd.size', 'Размер', 'enum', { options: SIZE_OPTIONS, section: 'identity' }, characterPath('Размер')),
  variableField('dnd.alignment', 'Мировоззрение', 'enum', { options: ALIGNMENT_OPTIONS, section: 'identity' }, characterPath('Мировоззрение')),
  variableField('character.named', 'Именной персонаж', 'boolean', { section: 'identity' }, characterPath('Именной персонаж')),
  variableField('dnd.level', 'Уровень', 'integer', { min: 0, section: 'progression' }, characterPath('Уровень')),
  variableField('character.challengeRating', 'Уровень опасности', 'integer', { min: 0, section: 'progression' }, characterPath('Уровень опасности')),
  variableField('character.experienceReward', 'Опыт за победу', 'integer', { min: 0, section: 'progression' }, characterPath('Опыт за победу')),
  variableField('dnd.proficiencyBonus', 'Бонус мастерства', 'integer', { section: 'progression' }, characterPath('Бонус мастерства')),
  referenceArrayField('character.organizations', 'Организации', ['organization'], { section: 'relations' }, characterPath('Организации')),
  objectField('character.abilities', 'Характеристики', ABILITIES.map(([id, label]) =>
    nestedField(`character.abilities.${id}`, label, 'integer', {}, characterPath('Характеристики', label))
  ), { section: 'abilities' }, characterPath('Характеристики')),
  enumArrayField('character.savingThrows', 'Спасброски', ABILITY_OPTIONS, { section: 'abilities' }, characterPath('Спасброски')),
  objectField('dnd.health', 'Хиты', [
    nestedField('dnd.hpCurrent', 'Текущие', 'integer', { min: 0 }, characterPath('Хиты', 'Текущие')),
    nestedField('dnd.hpMax', 'Максимальные', 'integer', { min: 0 }, characterPath('Хиты', 'Максимальные')),
    nestedField('dnd.hpTemporary', 'Временные', 'integer', { min: 0 }, characterPath('Хиты', 'Временные')),
    formulaField('character.health.formula', 'Формула', {}, characterPath('Хиты', 'Формула'), true),
    nestedField('character.health.hitDice', 'Кости хитов', 'string', {}, characterPath('Хиты', 'Кости хитов'))
  ], { section: 'combat' }, characterPath('Хиты')),
  objectField('dnd.armorClass', 'Класс доспеха', [
    nestedField('dnd.armorClass.value', 'Значение', 'number', {}, characterPath('Класс доспеха', 'Значение')),
    objectField('dnd.armorClass.source', 'Источник', [
      referenceField('dnd.armorClass.source.reference', 'Карточка', ['item', 'class', 'race', 'effect'], {}, null, true),
      nestedField('dnd.armorClass.source.manual', 'Ручной источник')
    ], {}, characterPath('Класс доспеха', 'Источник'), true),
    formulaField('dnd.armorClass.formula', 'Формула', {}, characterPath('Класс доспеха', 'Формула'), true)
  ], { section: 'combat' }, characterPath('Класс доспеха')),
  objectField('dnd.initiative', 'Инициатива', [
    nestedField('dnd.initiative.modifier', 'Модификатор', 'number', {}, characterPath('Инициатива', 'Модификатор')),
    nestedField('dnd.initiative.bonus', 'Бонус', 'number', {}, characterPath('Инициатива', 'Бонус')),
    nestedField('dnd.initiative.mode', 'Преимущество/помеха', 'enum', { options: advantageOptions }, characterPath('Инициатива', 'Преимущество/помеха'))
  ], { section: 'combat' }, characterPath('Инициатива')),
  repeatableField('dnd.movement', 'Передвижение тип', [
    nestedField('dnd.movement.type', 'Тип', 'enum', { options: movementOptions }),
    nestedField('dnd.movement.speed', 'Скорость', 'number', { min: 0 }),
    nestedField('dnd.movement.units', 'Единицы', 'enum', { options: distanceUnits })
  ], { section: 'combat' }, characterPath('Передвижение тип')),
  namedDetailsRows('character.skills', 'Навыки', characterPath('Навыки')),
  enumArrayField('dnd.languages', 'Языки', LANGUAGE_OPTIONS, { section: 'skills' }, characterPath('Языки')),
  referenceArrayField('character.resources', 'Ресурсы', ['player', 'character', 'class', 'item', 'lore'], { section: 'relations' }, characterPath('Ресурсы')),
  ...[
    ['character.actions', 'Действия', 'Действия'],
    ['character.bonusActions', 'Бонусные действия', 'Бонусные действия'],
    ['character.reactions', 'Реакции', 'Реакции'],
    ['character.legendaryActions', 'Легендарные действия', 'Легендарные действия'],
    ['character.lairActions', 'Логовные действия', 'Логовные действия'],
    ['character.mythicActions', 'Мифические действия', 'Мифические действия']
  ].map(([key, label, path]) => referenceArrayField(key, label, ['skill'], { section: 'actions' }, characterPath(path))),
  objectField('dnd.magic', 'Магия', [
    nestedField('dnd.magic.ability', 'Базовая характеристика', 'enum', { options: ABILITY_WITH_AUTO_OPTIONS }, characterPath('Магия', 'Базовая характеристика')),
    nestedField('dnd.magic.saveDc', 'Сл спасброска', 'integer', {}, characterPath('Магия', 'Сл спасброска')),
    nestedField('dnd.magic.attackBonus', 'Бонус атаки заклинанием', 'number', {}, characterPath('Магия', 'Бонус атаки заклинанием')),
    nestedField('dnd.magic.casterLevel', 'Уровень заклинателя', 'integer', { min: 0 }, characterPath('Магия', 'Уровень заклинателя')),
    repeatableField('dnd.magic.spellSlots', 'Ячейки', [
      nestedField('dnd.magic.spellSlots.level', 'Уровень', 'integer', { min: 1, max: 9 }),
      nestedField('dnd.magic.spellSlots.current', 'Текущие', 'integer', { min: 0 }),
      nestedField('dnd.magic.spellSlots.maximum', 'Максимальные', 'integer', { min: 0 })
    ], {}, characterPath('Магия', 'Ячейки'), true)
  ], { section: 'magic' }, characterPath('Магия')),
  objectField('dnd.map', 'Карта', [
    nestedField('dnd.map.tokenSize', 'Размер токена', 'number', { min: 0 }, characterPath('Карта', 'Размер токена')),
    nestedField('dnd.map.tokenIcon', 'Иконка токена', 'asset', {}, characterPath('Карта', 'Иконка токена')),
    nestedField('dnd.map.attitude', 'Отношение', 'enum', { options: options([['friendly', 'Союзный'], ['neutral', 'Нейтральный'], ['hostile', 'Враждебный'], ['hidden', 'Скрытый']]) }, characterPath('Карта', 'Отношение')),
    nestedField('dnd.map.hasVision', 'Зрение', 'boolean', {}, characterPath('Карта', 'Зрение')),
    nestedField('dnd.map.visionRange', 'Дальность зрения', 'number', { min: 0 }, characterPath('Карта', 'Дальность зрения')),
    namedDetailsRows('dnd.map.lightSources', 'Источники света', characterPath('Карта', 'Источники света'), true)
  ], { section: 'map' }, characterPath('Карта'))
];

const actorSections = [
  section('card', 'Карточка', 0), section('identity', 'Идентичность', 10),
  section('progression', 'Прогрессия', 20), section('abilities', 'Характеристики', 30),
  section('combat', 'Бой', 40), section('defense', 'Защиты', 50), section('skills', 'Навыки и владения', 60),
  section('inventory', 'Ресурсы и инвентарь', 70), section('relations', 'Связи', 80),
  section('actions', 'Действия', 90), section('magic', 'Магия', 100), section('map', 'Карта', 110)
];

export const PLAYER_DEFINITION = {
  id: 'player', version: 1, label: 'Игрок',
  includes: [
    { id: 'core.card-metadata', version: 1 },
    { id: 'dnd.actor-links', version: 1 },
    { id: 'dnd.actor-defenses', version: 1 }
  ],
  fields: playerFields,
  sections: actorSections,
  capabilities: { gameplayEntity: true, characterProjection: true, inventory: true, combat: true, mapToken: true },
  metadata: { stage: 5, catalog: 'game-core' }
};

export const CHARACTER_DEFINITION = {
  id: 'character', version: 1, label: 'Персонаж',
  includes: [
    { id: 'core.card-metadata', version: 1 },
    { id: 'dnd.actor-links', version: 1 },
    { id: 'dnd.actor-defenses', version: 1 }
  ],
  fields: characterFields,
  sections: actorSections,
  capabilities: { gameplayEntity: true, characterProjection: true, combat: true, mapToken: true },
  metadata: { stage: 5, catalog: 'game-core' }
};
