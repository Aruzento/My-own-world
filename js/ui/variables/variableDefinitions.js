// Единый каталог переменных. Здесь живут системные переменные и готовые наборы,
// чтобы блок "Переменные" не хранил правила прямо в DOM.

export const VARIABLE_DEFINITIONS = [
  { key: 'level', title: 'Уровень', type: 'number', defaultValue: '1' },
  { key: 'experience', title: 'Опыт', type: 'number', defaultValue: '0' },
  { key: 'race', title: 'Раса', type: 'pageSelect', tag: 'race' },
  { key: 'class', title: 'Класс', type: 'pageSelect', tag: 'class' },
  { key: 'species', title: 'Вид', type: 'pageSelect', tag: 'type' },
  { key: 'subclass', title: 'Подкласс', type: 'pageSelect', tag: 'subclass' },
  { key: 'str', title: 'Сила', type: 'number', defaultValue: '10' },
  { key: 'dex', title: 'Ловкость', type: 'number', defaultValue: '10' },
  { key: 'con', title: 'Телосложение', type: 'number', defaultValue: '10' },
  { key: 'int', title: 'Интеллект', type: 'number', defaultValue: '10' },
  { key: 'wis', title: 'Мудрость', type: 'number', defaultValue: '10' },
  { key: 'cha', title: 'Харизма', type: 'number', defaultValue: '10' },
  { key: 'ac', title: 'Класс защиты', type: 'number', defaultValue: '10' },
  { key: 'hpCurrent', title: 'Хиты: факт', type: 'number', defaultValue: '10' },
  { key: 'hpMax', title: 'Хиты: макс', type: 'number', defaultValue: '10' },
  { key: 'hpTemp', title: 'Хиты: временные', type: 'number', defaultValue: '0' },
  { key: 'speed', title: 'Скорость', type: 'number', defaultValue: '30' },
  { key: 'proficiency', title: 'Бонус мастерства', type: 'number', defaultValue: '2' },
  { key: 'hitDie', title: 'Кость хитов', type: 'text', defaultValue: 'd8' },
  { key: 'initiative', title: 'Инициатива', type: 'number', defaultValue: '0' },
  { key: 'strTotal', title: 'Сила (расчет)', type: 'calculation', ability: 'str' },
  { key: 'dexTotal', title: 'Ловкость (расчет)', type: 'calculation', ability: 'dex' },
  { key: 'conTotal', title: 'Телосложение (расчет)', type: 'calculation', ability: 'con' },
  { key: 'intTotal', title: 'Интеллект (расчет)', type: 'calculation', ability: 'int' },
  { key: 'wisTotal', title: 'Мудрость (расчет)', type: 'calculation', ability: 'wis' },
  { key: 'chaTotal', title: 'Харизма (расчет)', type: 'calculation', ability: 'cha' }
];


export const VARIABLE_GROUPS = [
  {
    key: 'identity',
    title: 'Происхождение',
    variables: ['race', 'class', 'species', 'subclass', 'level', 'experience']
  },
  {
    key: 'abilities',
    title: 'Характеристики',
    variables: ['str', 'dex', 'con', 'int', 'wis', 'cha']
  },
  {
    key: 'abilityTotals',
    title: 'Характеристики (расчет)',
    variables: ['strTotal', 'dexTotal', 'conTotal', 'intTotal', 'wisTotal', 'chaTotal']
  },
  {
    key: 'combat',
    title: 'Боевые показатели',
    variables: ['ac', 'initiative', 'speed', 'proficiency', 'hitDie']
  },
  {
    key: 'health',
    title: 'Хиты',
    variables: ['hpCurrent', 'hpMax', 'hpTemp']
  }
];


export function getVariableDefinition(
  key
) {

  return VARIABLE_DEFINITIONS.find(variable =>
    variable.key === key
  ) || null;
}


export function getVariableGroup(
  key
) {

  return VARIABLE_GROUPS.find(group =>
    group.key === key
  ) || null;
}
