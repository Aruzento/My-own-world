import {
  createTableRowControlsHTML
} from '../editor/blocks/blockContract.js';


export function createTextBlock({
  title,
  placeholder = 'Введите текст'
}) {

  return `
    <div
      class="template-block"
      data-block-type="text"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div
        contenteditable="true"
        class="rich-text-field"
        data-placeholder="${placeholder}"
      ></div>
    </div>
  `;
}


export function createItemsBlock({
  title = 'Предметы'
}) {

  return `
    <div
      class="template-block item-set-block"
      data-block-type="items"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div class="item-set-list"></div>

      <button
        class="item-set-add-btn"
        data-runtime="true"
        type="button"
      >
        + Добавить предмет
      </button>
    </div>
  `;
}


export function createSpellsBlock({
  title = 'Заклинания'
}) {

  return `
    <div
      class="template-block spell-set-block"
      data-block-type="spells"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div class="spell-set-list"></div>

      <button
        class="spell-set-add-btn"
        data-runtime="true"
        type="button"
      >
        + Добавить заклинание
      </button>
    </div>
  `;
}


export function createSkillsBlock({
  title = 'Навыки'
}) {

  return `
    <div
      class="template-block skill-set-block"
      data-block-type="skills"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div class="skill-set-list"></div>

      <button
        class="skill-set-add-btn"
        data-runtime="true"
        type="button"
      >
        + Добавить навык
      </button>
    </div>
  `;
}


export function createImageBlock() {

  return `
    <div
      class="template-block image-block"
      data-block-type="image"
      data-block-version="1"
      contenteditable="false"
    >
      <div class="image-block-frame">
        <button
          class="image-upload-btn"
          data-runtime="true"
          type="button"
        >
          + Загрузить картинку
        </button>
      </div>
    </div>
  `;
}


export function createCharacterStatsBlock({
  title = 'Статистика персонажа'
}) {

  return `
    <div
      class="template-block character-stats-block"
      data-block-type="characterStats"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div class="character-stats-grid">

        <label class="character-stat-field">
          <span>Уровень</span>
          <input type="number" class="character-level-input" min="1">
        </label>

        <label class="character-stat-field">
          <span>Опыт</span>
          <input type="number" class="character-exp-input" min="0">
        </label>

        <label class="character-stat-field">
          <span>ЗМ</span>
          <input type="number" class="character-money-input" min="0">
        </label>

        <label class="character-stat-field">
          <span>СМ</span>
          <input type="number" class="character-money-input" min="0">
        </label>

        <label class="character-stat-field">
          <span>ММ</span>
          <input type="number" class="character-money-input" min="0">
        </label>

      </div>
    </div>
  `;
}


export function createDndStatsBlock({
  title = 'Стат. блок DnD'
}) {

  const stats = [
    ['str', 'СИЛ'],
    ['dex', 'ЛВК'],
    ['con', 'ТЕЛ'],
    ['int', 'ИНТ'],
    ['wis', 'МДР'],
    ['cha', 'ХАР']
  ];

  const checks = [
    {
      title: 'СИЛ',
      items: [
        'Спасбросок СИЛ',
        'Атлетика'
      ]
    },
    {
      title: 'ЛВК',
      items: [
        'Спасбросок ЛВК',
        'Акробатика',
        'Ловкость рук',
        'Скрытность'
      ]
    },
    {
      title: 'ТЕЛ',
      items: [
        'Спасбросок ТЕЛ'
      ]
    },
    {
      title: 'ИНТ',
      items: [
        'Спасбросок ИНТ',
        'История',
        'Анализ',
        'Магия',
        'Природа',
        'Религия'
      ]
    },
    {
      title: 'МДР',
      items: [
        'Спасбросок МДР',
        'Внимательность',
        'Выживание',
        'Медицина',
        'Проницательность',
        'Уход за животными'
      ]
    },
    {
      title: 'ХАР',
      items: [
        'Спасбросок ХАР',
        'Выступление',
        'Запугивание',
        'Обман',
        'Убеждение'
      ]
    }
  ];

  const statRows =
    stats
      .map(([key, label]) => `
        <label class="dnd-stat-row" data-stat="${key}">
          <span class="dnd-stat-label">${label}</span>

          <input
            type="number"
            class="dnd-stat-score"
            value="10"
          >

          <span class="dnd-stat-modifier">+0</span>
        </label>
      `)
      .join('');

  const checkRows =
    checks
      .map(group => {

        const rows =
          group.items
            .map(name => createDndCheckRowHTML(name))
            .join('');

        return `
          <div class="dnd-check-group">

            <div class="dnd-check-group-title">
              ${group.title}
            </div>

            <div class="dnd-check-group-list">
              ${rows}
            </div>

          </div>
        `;
      })
      .join('');

  return `
    <div
      class="template-block dnd-stats-block"
      data-block-type="dndStats"
      data-block-version="3"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div class="dnd-combat-grid">

        <label class="dnd-combat-field">
          <span>Класс защиты</span>
          <input
            type="number"
            class="dnd-armor-class"
            value="10"
          >
        </label>

        <label class="dnd-combat-field dnd-hitpoints-field">
          <span>Хиты</span>

          <div class="dnd-hitpoints-inputs">
            <input
              type="text"
              class="dnd-current-hp"
              placeholder="текущие"
            >

            <input
              type="text"
              class="dnd-max-hp"
              placeholder="макс."
            >
          </div>
        </label>

      </div>

      <div class="dnd-secondary-grid">

        <label class="dnd-combat-field">
          <span>Инициатива</span>
          <input
            type="number"
            class="dnd-initiative"
            value="0"
          >
        </label>

        <label class="dnd-combat-field">
          <span>Скорость</span>
          <input
            type="text"
            class="dnd-speed"
            value="30 фт."
          >
        </label>

        <label class="dnd-combat-field">
          <span>Бонус мастерства</span>
          <input
            type="number"
            class="dnd-proficiency"
            value="2"
          >
        </label>

      </div>

      <div class="dnd-stats-list">
        ${statRows}
      </div>

      <div class="dnd-checks-section">

        <div class="dnd-checks-title">
          Навыки и спасброски
        </div>

        <div class="dnd-checks-list">
          ${checkRows}
        </div>

      </div>
    </div>
  `;
}


export function createTableBlock({
  title = 'Таблица',
  rows = 3,
  columns = 3
}) {

  const safeRows =
    Math.max(1, Number(rows) || 1);

  const safeColumns =
    Math.max(1, Number(columns) || 1);

  const tableRows =
    Array.from({ length: safeRows })
      .map(() => {

        const cells =
          Array.from({ length: safeColumns })
            .map((_, index) => {

              const rowControls =
                index === 0
                  ? createTableRowControlsHTML()
                  : '';

              return `
                <td class="table-cell" contenteditable="false">
                  ${rowControls}
                  <div class="table-cell-content" contenteditable="true"></div>
                </td>
              `;
            })
            .join('');

        return `<tr>${cells}</tr>`;
      })
      .join('');

  const tableColumns =
    Array.from({ length: safeColumns })
      .map(() => '<col style="width: 160px;">')
      .join('');

  return `
    <div
      class="template-block table-block"
      data-block-type="table"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div class="table-block-scroll">
        <table class="custom-table">
          <colgroup>
            ${tableColumns}
          </colgroup>

          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}


function createDndCheckRowHTML(
  name
) {

  return `
    <label class="dnd-check-row">
      <input
        type="checkbox"
        class="dnd-check-point"
      >

      <span class="dnd-check-name">
        ${name}
      </span>

      <input
        type="number"
        class="dnd-check-value"
        value="0"
      >
    </label>
  `;
}
