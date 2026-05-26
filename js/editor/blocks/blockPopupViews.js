import {
  hasPropertyBlockDefinition
} from '../../templates/propertyBlockDefinitions.js';


export function renderTypePicker(
  popup,
  cardType
) {

  popup.querySelector('.block-popup-title').textContent =
    'Выбери тип блока';

  popup
    .querySelector('.block-popup-actions')
    .classList.add('hidden');

  popup.querySelector('.block-popup-body').innerHTML = `
    <div class="block-type-list">
      ${createTypeOptionHTML({
        type: 'text',
        icon: 'T',
        title: 'Текстовый блок',
        description: 'Обычный блок с заголовком и текстом'
      })}

      ${createTypeOptionHTML({
        type: 'items',
        icon: '◆',
        title: 'Предметы',
        description: 'Список связанных предметов'
      })}

      ${createTypeOptionHTML({
        type: 'spells',
        icon: '✦',
        title: 'Заклинания',
        description: 'Список связанных заклинаний'
      })}

      ${createTypeOptionHTML({
        type: 'skills',
        icon: '✧',
        title: 'Навыки',
        description: 'Список связанных навыков'
      })}

      ${hasPropertyBlockDefinition(cardType)
        ? createTypeOptionHTML({
          type: 'properties',
          icon: 'P',
          title: 'Свойства',
          description: `Поля для типа "${getCardTypeLabel(cardType)}"`
        })
        : ''}

      ${createTypeOptionHTML({
        type: 'image',
        icon: '▧',
        title: 'Картинка',
        description: 'Изображение на всю ширину блока'
      })}

      ${createTypeOptionHTML({
        type: 'characterStats',
        icon: '★',
        title: 'Статистика персонажа',
        description: 'Уровень, опыт и деньги'
      })}

      ${createTypeOptionHTML({
        type: 'dndStats',
        icon: '6',
        title: 'Стат. блок DnD',
        description: 'Характеристики и модификаторы'
      })}

      ${createTypeOptionHTML({
        type: 'table',
        icon: '▦',
        title: 'Таблица',
        description: 'Таблица с заданным числом строк и столбцов'
      })}
    </div>
  `;
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

  const titles = {
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

  const titles = {
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
