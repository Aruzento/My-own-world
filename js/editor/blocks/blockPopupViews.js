import {
  hasPropertyBlockDefinition
} from '../../templates/propertyBlockDefinitions.js';

import {
  iconSvg
} from '../../core/icons.js';


const PRIMARY_BLOCK_TYPE_ORDER = [
  'text',
  'list',
  'table',
  'image',
  'properties'
];


const PRIMARY_BLOCK_TYPE_OPTIONS = {
  text: {
    iconName: 'document',
    group: 'Текст',
    title: 'Текстовый блок',
    description: 'Заголовок и свободный текст для заметок, сцен и лора'
  },
  list: {
    iconName: 'task-tracker',
    group: 'Списки',
    title: 'Список',
    description: 'Единый список для предметов, заклинаний, навыков или сущностей'
  },
  table: {
    iconName: 'grid',
    group: 'Структура',
    title: 'Таблица',
    description: 'Сетка со строками и столбцами для справочников и списков'
  },
  image: {
    iconName: 'image',
    group: 'Медиа',
    title: 'Изображение',
    description: 'Картинка на ширину карточки: портрет, сцена или артефакт'
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

  popup.dataset.blockPopupView =
    'type-picker';

  popup.querySelector('.block-popup-title').textContent =
    'Добавить блок';

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
    `
      <div class="block-type-picker" role="listbox" aria-label="Типы блоков">
        <div class="block-type-kicker">Содержимое карточки</div>
        <div class="block-type-list">${optionsHTML}</div>
      </div>
    `;
}


export function renderDeletePrompt(
  popup
) {

  delete popup.dataset.blockPopupView;

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

  delete popup.dataset.blockPopupView;

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

  delete popup.dataset.blockPopupView;

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
  iconName,
  group,
  title,
  description
}) {

  return `
    <button
      class="block-type-option"
      type="button"
      data-block-type="${escapeAttribute(type)}"
      role="option"
      aria-label="${escapeAttribute(`${title}. ${description}`)}"
    >
      <span class="block-type-icon">
        ${iconSvg(iconName, 'block-type-icon-svg')}
      </span>
      <span class="block-type-copy">
        <span class="block-type-group">${escapeHtml(group)}</span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(description)}</small>
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
      iconName: 'settings',
      group: 'Метаданные',
      title: 'Свойства',
      description: `Поля карточки: ${getCardTypeLabel(cardType)}`
    };
  }

  return PRIMARY_BLOCK_TYPE_OPTIONS[type] ||
    PRIMARY_BLOCK_TYPE_OPTIONS.text;
}


function escapeHtml(
  value
) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function escapeAttribute(
  value
) {

  return escapeHtml(
    value
  )
    .replace(/"/g, '&quot;');
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
