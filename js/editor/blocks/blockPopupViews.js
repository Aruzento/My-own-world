import {
  hasPropertyBlockDefinition
} from '../../templates/propertyBlockDefinitions.js';


const PRIMARY_BLOCK_TYPE_ORDER = [
  'text',
  'list',
  'table',
  'image',
  'properties'
];


const PRIMARY_BLOCK_TYPE_OPTIONS = {
  text: {
    icon: 'T',
    title: 'Текстовый блок',
    description: 'Обычный блок с заголовком и текстом'
  },
  list: {
    icon: '◆',
    title: 'Блок списка',
    description: 'Один блок для предметов, заклинаний, навыков и сущностей'
  },
  table: {
    icon: '▦',
    title: 'Таблица',
    description: 'Таблица с заданным числом строк и столбцов'
  },
  image: {
    icon: '▧',
    title: 'Картинка',
    description: 'Изображение на всю ширину блока'
  }
};


export function getVisibleBlockTypesForCardType(
  cardType
) {

  return PRIMARY_BLOCK_TYPE_ORDER
    .filter(type =>
      type !== 'properties' ||
      hasPropertyBlockDefinition(
        cardType
      )
    );
}


export function isVisibleBlockTypeForCardType(
  type,
  cardType
) {

  return getVisibleBlockTypesForCardType(
    cardType
  ).includes(
    type
  );
}


export function renderTypePicker(
  popup,
  cardType
) {

  popup.querySelector('.block-popup-title').textContent =
    'Выбери тип блока';

  popup
    .querySelector('.block-popup-actions')
    .classList.add('hidden');

  const optionsHTML =
    getVisibleBlockTypesForCardType(
      cardType
    )
      .map(type =>
        createTypeOptionHTML({
          type,
          ...getTypeOptionConfig(
            type,
            cardType
          )
        })
      )
      .join('');

  popup.querySelector('.block-popup-body').innerHTML =
    `<div class="block-type-list">${optionsHTML}</div>`;
}


export function renderDeletePrompt(
  popup
) {

  popup.querySelector('.block-popup-title').textContent =
    'Удалить блок';

  popup.querySelector('.block-popup-body').innerHTML = `
    <div class="block-popup-message">
      Текст внутри блока тоже будет удалён.
    </div>
  `;

  showActions(
    popup,
    'Удалить',
    true
  );
}


export function renderNameForm({
  popup,
  title,
  inputValue,
  confirmText
}) {

  popup.querySelector('.block-popup-title').textContent =
    title;

  popup.querySelector('.block-popup-body').innerHTML = `
    <input
      class="block-popup-input"
      type="text"
      placeholder="Название блока"
    >
  `;

  const input =
    popup.querySelector('.block-popup-input');

  input.value =
    inputValue;

  showActions(
    popup,
    confirmText
  );

  return input;
}


export function renderTableForm(
  popup
) {

  popup.querySelector('.block-popup-title').textContent =
    'Создать таблицу';

  popup.querySelector('.block-popup-body').innerHTML = `
    <div class="table-config-form">

      <label class="table-config-field">
        <span>Название</span>
        <input
          class="table-title-input"
          type="text"
          value="Таблица"
        >
      </label>

      <label class="table-config-field">
        <span>Столбцы</span>
        <input
          class="table-columns-input"
          type="number"
          min="1"
          max="12"
          value="3"
        >
      </label>

      <label class="table-config-field">
        <span>Строки</span>
        <input
          class="table-rows-input"
          type="number"
          min="1"
          max="50"
          value="3"
        >
      </label>

    </div>
  `;

  showActions(
    popup,
    'Создать'
  );

  return popup.querySelector(
    '.table-title-input'
  );
}


export function getBlockPopupTitle(
  type
) {

  if (type === 'characterEffects') {

    return 'Название блока состояний и эффектов';
  }

  if (type === 'characterSheet') {

    return 'Название листа персонажа';
  }

  const titles = {
    list: 'Название блока списка',
    items: 'Название блока с предметами',
    spells: 'Название блока с заклинаниями',
    skills: 'Название блока с навыками',
    properties: 'Название блока свойств',
    characterStats: 'Название блока статистики персонажа',
    dndStats: 'Название DnD stat block',
    text: 'Название текстового блока'
  };

  return titles[type] ||
    titles.text;
}


export function getDefaultBlockTitle(
  type
) {

  if (type === 'characterEffects') {

    return 'Состояния и эффекты';
  }

  if (type === 'characterSheet') {

    return 'Лист персонажа';
  }

  const titles = {
    list: 'Блок списка',
    items: 'Набор',
    spells: 'Заклинания',
    skills: 'Навыки',
    properties: 'Свойства',
    characterStats: 'Статистика персонажа',
    dndStats: 'Стат. блок DnD',
    text: 'Новый блок'
  };

  return titles[type] ||
    titles.text;
}


function createTypeOptionHTML({
  type,
  icon,
  title,
  description
}) {

  return `
    <button class="block-type-option" type="button" data-block-type="${type}">
      <span class="block-type-icon">${icon}</span>
      <span>
        <strong>${title}</strong>
        <small>${description}</small>
      </span>
    </button>
  `;
}


function getTypeOptionConfig(
  type,
  cardType
) {

  if (type === 'properties') {

    return {
      icon: 'P',
      title: 'Свойства',
      description: `Поля для типа "${getCardTypeLabel(cardType)}"`
    };
  }

  return PRIMARY_BLOCK_TYPE_OPTIONS[type] ||
    PRIMARY_BLOCK_TYPE_OPTIONS.text;
}


function getCardTypeLabel(
  cardType
) {

  const labels = {
    character: 'Персонаж',
    skill: 'Навык',
    magic: 'Магия',
    item: 'Предмет'
  };

  return labels[cardType] || cardType || 'карточка';
}


function showActions(
  popup,
  confirmText,
  isDanger = false
) {

  const actions =
    popup.querySelector('.block-popup-actions');

  actions.classList.remove(
    'hidden'
  );

  const confirm =
    popup.querySelector('.block-popup-confirm');

  confirm.textContent =
    confirmText;

  confirm.classList.toggle(
    'danger',
    isDanger
  );
}
