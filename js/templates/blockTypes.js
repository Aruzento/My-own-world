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


export function createDndStatsV2Block({
  title = 'Стат. блок DnD v 2.0'
}) {

  const abilities = [
    ['str', 'Сила', 'СИЛ'],
    ['dex', 'Ловкость', 'ЛВК'],
    ['con', 'Телосложение', 'ТЛС'],
    ['int', 'Интеллект', 'ИНТ'],
    ['wis', 'Мудрость', 'МДР'],
    ['cha', 'Харизма', 'ХАР']
  ];

  const skillGroups = [
    ['str', 'СИЛ', ['Спасбросок СИЛ', 'Атлетика']],
    ['dex', 'ЛВК', ['Спасбросок ЛВК', 'Акробатика', 'Ловкость рук', 'Скрытность']],
    ['con', 'ТЛС', ['Спасбросок ТЛС']],
    ['int', 'ИНТ', ['Спасбросок ИНТ', 'Анализ', 'История', 'Магия', 'Природа', 'Религия']],
    ['wis', 'МДР', ['Спасбросок МДР', 'Внимательность', 'Выживание', 'Медицина', 'Проницательность', 'Уход за животными']],
    ['cha', 'ХАР', ['Спасбросок ХАР', 'Выступление', 'Запугивание', 'Обман', 'Убеждение']]
  ];

  const abilityRows =
    abilities
      .map(([key, titleText, shortText]) => `
        <section class="dnd2-ability-card" data-ability="${key}">
          <div class="dnd2-ability-heading">
            <span class="dnd2-ability-name">${titleText}</span>
            <span class="dnd2-ability-short">${shortText}</span>
          </div>

          <label class="dnd2-mini-field">
            <span>Модификатор</span>
            <input
              class="dnd2-ability-mod-input"
              type="number"
              value="0"
              data-manual-value="false"
            >
          </label>

          <label class="dnd2-mini-field">
            <span>Число</span>
            <input class="dnd2-ability-score" type="number" min="1" max="30" value="10">
          </label>
        </section>
      `)
      .join('');

  const skillRows =
    skillGroups
      .map(([ability, titleText, names]) => `
        <section class="dnd2-skill-group" data-ability="${ability}">
          <h4>${titleText}</h4>
          ${names.map(name => `
            <label class="dnd2-skill-row">
              <input class="dnd2-proficiency-check" type="checkbox">
              <span>${name}</span>
              <input class="dnd2-skill-value" type="number" value="0" data-manual-value="false">
            </label>
          `).join('')}
        </section>
      `)
      .join('');

  return `
    <div
      class="template-block dnd2-stats-block"
      data-block-type="dndStatsV2"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div class="dnd2-note">
        Бонус мастерства DnD 5e: уровни 1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6.
        Модификатор считается от значения характеристики с бонусом расы/класса. Навыки и спасброски считаются как модификатор характеристики + бонус мастерства, если отмечено владение.
      </div>

      <section class="dnd2-section dnd2-identity-section">
        <h3>Происхождение и развитие</h3>

        <div class="dnd2-identity-grid">
          <label class="dnd2-field">
            <span>Раса</span>
            <select class="dnd2-card-select dnd2-race-select" data-card-tag="race"></select>
          </label>

          <label class="dnd2-field">
            <span>Класс</span>
            <select class="dnd2-card-select dnd2-class-select" data-card-tag="class"></select>
          </label>

          <div class="dnd2-field dnd2-exhaustion-field">
            <span>Истощение</span>
            <div class="dnd2-exhaustion-track">
              ${[1, 2, 3, 4, 5, 6].map(index => `
                <label class="dnd2-exhaustion-point">
                  <input class="dnd2-exhaustion-check" type="checkbox" aria-label="Истощение ${index}">
                  <span>${index}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <label class="dnd2-field">
            <span>Вид</span>
            <select class="dnd2-card-select dnd2-type-select" data-card-tag="type"></select>
          </label>

          <label class="dnd2-field">
            <span>Подкласс</span>
            <select class="dnd2-card-select dnd2-subclass-select" data-card-tag="subclass"></select>
          </label>

          <label class="dnd2-field">
            <span>Бонус мастерства</span>
            <input class="dnd2-proficiency-bonus" type="number" value="2" readonly>
          </label>
        </div>
      </section>

      <section class="dnd2-section">
        <h3>Боевые показатели</h3>

        <div class="dnd2-combat-grid">
          <label class="dnd2-field dnd2-ac-field">
            <span>КЗ</span>
            <input class="dnd2-ac" type="number" value="10">
          </label>

          <label class="dnd2-field is-hitpoints dnd2-hp-field">
            <span>Хиты</span>
            <div class="dnd2-inline-inputs is-hitpoints">
              <label class="dnd2-subfield">
                <span>факт</span>
                <input class="dnd2-hp-current" type="number" min="0" value="10">
              </label>
              <label class="dnd2-subfield">
                <span>макс</span>
                <input class="dnd2-hp-max" type="number" min="1" value="10">
              </label>
              <label class="dnd2-subfield">
                <span>врем.</span>
                <input class="dnd2-hp-temp" type="number" min="0" value="0">
              </label>
            </div>
          </label>

          <label class="dnd2-field dnd2-hit-die-field">
            <span>Кость хитов</span>
            <input class="dnd2-hit-die" type="text" value="d8">
          </label>

          <label class="dnd2-field dnd2-speed-field">
            <span>Скорость</span>
            <input class="dnd2-speed" type="number" value="30">
          </label>

          <label class="dnd2-field dnd2-level-field">
            <span>Уровень</span>
            <div class="dnd2-inline-inputs">
              <label class="dnd2-subfield">
                <span>уровень</span>
                <input class="dnd2-level" type="number" min="1" max="20" value="1">
              </label>
              <label class="dnd2-subfield">
                <span>опыт</span>
                <input class="dnd2-experience" type="number" min="0" value="0">
              </label>
            </div>
          </label>

          <div class="dnd2-field dnd2-death-saves">
            <span>Хиты от смерти</span>
            <div class="dnd2-death-save-grid">
              ${[1, 2, 3].map(index => `
                <label class="dnd2-death-save is-fail">
                  <input class="dnd2-death-fail" type="checkbox" aria-label="Провал ${index}">
                  <span>☠</span>
                </label>
              `).join('')}
              ${[1, 2, 3].map(index => `
                <label class="dnd2-death-save is-success">
                  <input class="dnd2-death-success" type="checkbox" aria-label="Успех ${index}">
                  <span>♥</span>
                </label>
              `).join('')}
            </div>
          </div>

          <label class="dnd2-field dnd2-hit-dice-field">
            <span>Кости хитов</span>
            <div class="dnd2-inline-inputs">
              <label class="dnd2-subfield">
                <span>факт</span>
                <input class="dnd2-hit-dice-current" type="number" min="0" value="1">
              </label>
              <label class="dnd2-subfield">
                <span>макс</span>
                <input class="dnd2-hit-dice-max" type="number" min="1" value="1">
              </label>
            </div>
          </label>
        </div>
      </section>

      <section class="dnd2-section">
        <h3>Владения</h3>

        <div class="dnd2-proficiencies">
          ${['Лёгкая броня', 'Средняя броня', 'Тяжёлая броня', 'Щиты', 'Простое оружие', 'Воинское оружие', 'Инструменты', 'Языки'].map(label => `
            <label class="dnd2-proficiency-item">
              <input type="checkbox">
              <span>${label}</span>
            </label>
          `).join('')}
        </div>
      </section>

      <section class="dnd2-section dnd2-abilities-section">
        <h3>Характеристики, навыки и спасброски</h3>

        <div class="dnd2-abilities">
          ${abilityRows}
        </div>

        <div class="dnd2-skills">
          ${skillRows}
        </div>
      </section>
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
