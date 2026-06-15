import {
  createTableRowControlsHTML
} from '../editor/blocks/blockContract.js';

import {
  getPropertyBlockDefinition,
  PROPERTY_SHAPE_OPTIONS
} from './propertyBlockDefinitions.js';

import {
  serializePropertyLayout
} from '../properties/propertyLayoutModel.js';


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


export function createListBlock({
  title = 'Блок списка',
  kind = 'items'
} = {}) {

  const normalizedKind =
    normalizeListKind(
      kind
    );

  return `
    <div
      class="template-block universal-list-block item-set-block"
      data-block-type="list"
      data-block-version="1"
      data-list-kind="${normalizedKind}"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <label class="universal-list-kind-field">
        <span>Тип списка</span>
        <select class="universal-list-kind-select" data-list-kind-control>
          ${createListKindOptionsHTML(
            normalizedKind
          )}
        </select>
      </label>

      <div class="universal-list-list item-set-list"></div>

      <button
        class="item-set-add-btn universal-list-add-btn"
        data-runtime="true"
        type="button"
      >
        + Добавить
      </button>
    </div>
  `;
}


export function createCharacterEffectsBlock({
  title = 'Состояния и эффекты'
} = {}) {

  return `
    <div
      class="template-block character-effects-block"
      data-block-type="characterEffects"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <script
        type="application/json"
        class="character-effects-data"
        data-character-effects
      >{"version":1,"conditions":[],"effects":[]}</script>

      <div class="character-effects-summary" data-runtime="true"></div>
      <div class="character-effects-controls" data-runtime="true"></div>
    </div>
  `;
}


export function createCharacterSheetBlock({
  title = 'Лист персонажа'
} = {}) {

  return `
    <div
      class="template-block character-sheet-block"
      data-block-type="characterSheet"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div
        class="character-sheet-runtime"
        data-runtime="true"
        contenteditable="false"
      ></div>
    </div>
  `;
}


export function createPropertiesBlock({
  title,
  cardType
}) {

  const definition =
    getPropertyBlockDefinition(
      cardType
    );

  if (!definition) {

    return createTextBlock({
      title: title || 'Свойства',
      placeholder: 'Для этого типа карточки нет отдельной схемы свойств.'
    });
  }

  const layoutPlan =
    createPropertyLayoutPlan(
      definition.fields,
      cardType
    );

  return `
    <div
      class="template-block card-properties-block card-properties-${cardType}"
      data-block-type="properties"
      data-block-version="1"
      data-card-type="${cardType}"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title || definition.title}</h2>

      <div class="card-properties-grid">
        ${definition.fields
          .map((field, index) =>
            createPropertyFieldHTML(
              field,
              {
                cardType,
                index,
                layout:
                  layoutPlan[index]
              }
            )
          )
          .join('')}
      </div>
    </div>
  `;
}


export function createVariablesBlock({
  title = 'Переменные'
}) {

  return `
    <div
      class="template-block variables-block"
      data-block-type="variables"
      data-block-version="1"
      contenteditable="false"
    >
      <h2 contenteditable="false">${title}</h2>

      <div class="variables-list"></div>

      <button
        class="variables-add-btn"
        data-runtime="true"
        type="button"
      >
        + Добавить переменную
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


function createPropertyFieldHTML(
  field,
  context = {}
) {

  const normalizedField =
    normalizePropertyField(
      field
    );

  const {
    name,
    label,
    type,
    placeholder,
    options = [],
    min,
    max,
    assetType
  } = normalizedField;

  const layout =
    createInitialPropertyLayout(
      normalizedField,
      context
    );

  const layoutAttributes =
    createPropertyLayoutAttributes(
      layout
    );

  const assetAttributes =
    createPropertyAssetAttributes(
      assetType
    );

  if (type === 'textarea') {

    return `
      <label class="card-property-field card-property-field-wide" ${layoutAttributes}>
        <span>${label}</span>
        <div
          class="card-property-textarea rich-text-field"
          contenteditable="true"
          data-persistent-editable="true"
          data-property-name="${name}"
          ${assetAttributes}
          data-placeholder="${placeholder || ''}"
        ></div>
      </label>
    `;
  }

  if (type === 'skillGroup') {

    return `
      <section
        class="card-property-field card-property-field-wide card-property-skill-group"
        data-property-id="${name}"
        data-property-group-name="${name}"
        ${layoutAttributes}
      >
        <span>${label}</span>
        <div class="card-property-skill-list">
          ${(normalizedField.items || [])
            .map(item =>
              createPropertySkillRowHTML(
                item
              )
            )
            .join('')}
        </div>
      </section>
    `;
  }

  if (type === 'select') {

    return `
      <label class="card-property-field" ${layoutAttributes}>
        <span>${label}</span>
        <select class="card-property-select" data-property-name="${name}">
          ${(options.length > 0 ? options : PROPERTY_SHAPE_OPTIONS)
            .map(option =>
              `<option value="${option}">${option}</option>`
            )
            .join('')}
        </select>
      </label>
    `;
  }

  if (
    type === 'entity' &&
    name === 'armorItem'
  ) {

    return `
      <label class="card-property-field" ${layoutAttributes}>
        <span>${label}</span>
        <select
          class="card-property-select card-property-entity-select"
          data-property-name="${name}"
          data-property-type="entity"
          data-property-filter-type="item"
          data-property-placeholder="${placeholder || ''}"
        >
          <option value="">Без доспеха</option>
        </select>
      </label>
    `;
  }

  return `
    <label class="card-property-field" ${layoutAttributes}>
      <span>${label}</span>
      <input
        type="${type === 'entity' ? 'text' : type || 'text'}"
        data-property-name="${name}"
        data-property-type="${type || 'text'}"
        ${assetAttributes}
        placeholder="${placeholder || ''}"
        ${min !== undefined ? `min="${min}"` : ''}
        ${max !== undefined ? `max="${max}"` : ''}
      >
    </label>
  `;
}


function createPropertyAssetAttributes(
  assetType
) {

  if (!assetType) {

    return '';
  }

  return `data-property-asset-type="${assetType}"`;
}


function createPropertySkillRowHTML(
  item
) {

  return `
    <label class="card-property-skill-row">
      <input
        class="card-property-skill-proficiency"
        type="hidden"
        value="0"
        data-property-name="${item.proficientName}"
        data-property-type="number"
        data-skill-proficiency-level="0"
      >
      <span>${item.label}</span>
      <input
        class="card-property-skill-value"
        type="number"
        value="0"
        data-property-name="${item.name}"
        data-property-type="number"
      >
    </label>
  `;
}


function createInitialPropertyLayout(
  field,
  {
    cardType,
    index = 0,
    layout
  } = {}
) {

  if (layout) {

    return {
      ...layout,
      order:
        index
    };
  }

  const preset =
    getInitialPropertyLayoutPreset(
      cardType,
      field,
      index
    );

  if (preset) {

    return {
      x:
        preset.x,
      y:
        preset.y,
      w:
        preset.w,
      h:
        preset.h,
      order:
        index,
      collapsed: false,
      groupId: null
    };
  }

  const wide =
    field.type === 'textarea' ||
    field.type === 'skillGroup';

  return {
    x: 0,
    y: 0,
    w:
      wide
        ? 12
        : 3,
    h:
      field.type === 'skillGroup'
        ? Math.max(
          2,
          Math.ceil(
            (field.items?.length || 1) / 2
          )
        )
      : wide
        ? 2
        : 1,
    order: index,
    collapsed: false,
    groupId: null
  };
}


function createPropertyLayoutPlan(
  fields,
  cardType
) {

  const layouts = [];
  let cursorX =
    0;
  let cursorY =
    0;
  let rowHeight =
    1;

  fields
    .map(normalizePropertyField)
    .forEach((field, index) => {

      const preset =
        getInitialPropertyLayoutPreset(
          cardType,
          field,
          index
        );

      if (preset) {

        layouts[index] = {
          ...preset,
          order:
            index
        };

        return;
      }

      const wide =
        field.type === 'textarea' ||
        field.type === 'skillGroup';

      const width =
        wide
          ? 12
          : 3;

      const height =
        field.type === 'skillGroup'
          ? Math.max(
            2,
            Math.ceil(
              (field.items?.length || 1) / 2
            )
          )
          : wide
          ? 2
          : 1;

      if (
        cursorX > 0 &&
        cursorX + width > 12
      ) {

        cursorX =
          0;

        cursorY +=
          rowHeight;

        rowHeight =
          1;
      }

      layouts[index] = {
        x:
          cursorX,
        y:
          cursorY,
        w:
          width,
        h:
          height,
        order:
          index,
        collapsed: false,
        groupId: null
      };

      cursorX +=
        width;

      rowHeight =
        Math.max(
          rowHeight,
          height
        );

      if (
        wide ||
        cursorX >= 12
      ) {

        cursorX =
          0;

        cursorY +=
          rowHeight;

        rowHeight =
          1;
      }
    });

  return layouts;
}


function getInitialPropertyLayoutPreset(
  cardType,
  field,
  index
) {

  if (
    cardType !== 'character' &&
    cardType !== 'creature'
  ) return null;

  const compactTop = {
    level: [0, 0, 1, 2],
    armorClass: [1, 0, 1, 2],
    hpCurrent: [3, 0, 1, 2],
    hpMax: [4, 0, 1, 2],
    hpTemp: [5, 0, 2, 2],
    deathSaveSuccesses: [8, 0, 2, 2],
    deathSaveFailures: [10, 0, 2, 2],
    speed: [0, 2, 2, 2],
    armorItem: [3, 2, 2, 2],
    str: [0, 5, 2, 2],
    dex: [2, 5, 2, 2],
    int: [4, 5, 2, 2],
    wis: [6, 5, 2, 2],
    con: [8, 5, 2, 2],
    cha: [10, 5, 2, 2],
    strSkills: [0, 7, 2, 4],
    dexSkills: [2, 7, 2, 6],
    intSkills: [4, 7, 2, 6],
    wisSkills: [6, 7, 2, 6],
    conSkills: [8, 7, 2, 2],
    chaSkills: [10, 7, 2, 6],
    conditions: [0, 10, 6, 3],
    effects: [6, 10, 6, 3],
    senses: [0, 10, 4, 1],
    effect: [4, 10, 8, 3]
  };

  const value =
    compactTop[field.name];

  if (!value) return null;

  const [
    x,
    y,
    w,
    h
  ] = value;

  return {
    x,
    y,
    w,
    h,
    order:
      index
  };
}


function createPropertyLayoutAttributes(
  layout
) {

  return [
    `data-property-layout='${serializePropertyLayout(layout)}'`,
    `data-property-x="${layout.x}"`,
    `data-property-y="${layout.y}"`,
    `data-property-span="${layout.w}"`,
    `data-property-rows="${layout.h}"`,
    `data-property-order="${layout.order}"`,
    'data-property-collapsed="false"'
  ].join(' ');
}


function normalizePropertyField(
  field
) {

  if (!Array.isArray(field)) return field;

  const [
    name,
    label,
    type,
    placeholder
  ] = field;

  return {
    name,
    label,
    type,
    placeholder
  };
}


function createListKindOptionsHTML(
  selectedKind
) {

  return [
    ['items', 'Предметы'],
    ['spells', 'Заклинания'],
    ['skills', 'Навыки'],
    ['characters', 'Персонажи'],
    ['creatures', 'Существа'],
    ['objects', 'Объекты']
  ]
    .map(([value, label]) => `
      <option value="${value}" ${value === selectedKind ? 'selected' : ''}>
        ${label}
      </option>
    `)
    .join('');
}


function normalizeListKind(
  kind
) {

  return [
    'items',
    'spells',
    'skills',
    'characters',
    'creatures',
    'objects'
  ].includes(kind)
    ? kind
    : 'items';
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
