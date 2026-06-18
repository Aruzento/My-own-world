import {
  CHARACTER_ABILITY_KEYS,
  getCharacterEffectiveArmorClass,
  getCharacterEffectiveSpeed,
  getCharacterHealth,
  getCharacterInitiativeModifier,
  readCharacterModelFromPage
} from '../character/characterModel.js';

import {
  state
} from '../state.js';

import {
  ensurePropertiesBlockForPage,
  notifyPropertiesInput,
  setCalculatedPropertyOverride,
  setPropertyFieldValue
} from '../properties/propertiesDomWriter.js';

import {
  getPropertyValue,
  readPropertiesModelsFromHTML
} from '../properties/propertiesModel.js';


const ABILITY_LABELS = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  int: 'Интеллект',
  wis: 'Мудрость',
  cha: 'Харизма'
};

const CHARACTER_SHEET_SKILLS = {
  str: [
    skillRow('saveStr', 'Спасбросок'),
    skillRow('skillAthletics', 'Атлетика')
  ],
  dex: [
    skillRow('saveDex', 'Спасбросок'),
    skillRow('skillAcrobatics', 'Акробатика'),
    skillRow('skillSleightOfHand', 'Ловкость рук'),
    skillRow('skillStealth', 'Скрытность')
  ],
  con: [
    skillRow('saveCon', 'Спасбросок')
  ],
  int: [
    skillRow('saveInt', 'Спасбросок'),
    skillRow('skillInvestigation', 'Анализ'),
    skillRow('skillHistory', 'История'),
    skillRow('skillArcana', 'Магия'),
    skillRow('skillNature', 'Природа'),
    skillRow('skillReligion', 'Религия')
  ],
  wis: [
    skillRow('saveWis', 'Спасбросок'),
    skillRow('skillPerception', 'Восприятие'),
    skillRow('skillSurvival', 'Выживание'),
    skillRow('skillMedicine', 'Медицина'),
    skillRow('skillInsight', 'Проницательность'),
    skillRow('skillAnimalHandling', 'Уход за животными')
  ],
  cha: [
    skillRow('saveCha', 'Спасбросок'),
    skillRow('skillPerformance', 'Выступление'),
    skillRow('skillIntimidation', 'Запугивание'),
    skillRow('skillDeception', 'Обман'),
    skillRow('skillPersuasion', 'Убеждение')
  ]
};

let saveCurrentPageRef =
  null;


// Лист персонажа - runtime-витрина CharacterModel.
// Он не хранит свои числа, а каждый раз собирает картину из свойств,
// инвентаря, эффектов и старых DnD-блоков текущей карточки.
export function setupCharacterSheetBlocks(
  editor,
  saveCurrentPage
) {

  saveCurrentPageRef =
    saveCurrentPage;

  editor.addEventListener(
    'change',
    async event => {

      const control =
        event.target.closest(
          '[data-character-sheet-field], [data-character-sheet-override], [data-character-sheet-death-field]'
        );

      if (!control) return;

      const block =
        control.closest(
          '.character-sheet-block'
        );

      if (!block) return;

      await updateCharacterSheetValue(
        block,
        control
      );
    }
  );

  editor.addEventListener(
    'click',
    async event => {

      const button =
        event.target.closest(
          '[data-character-sheet-clear-override]'
        );

      if (!button) return;

      const block =
        button.closest(
          '.character-sheet-block'
        );

      if (!block) return;

      await clearCharacterSheetOverride(
        block,
        button.dataset.characterSheetClearOverride
      );
    }
  );
}


export function renderCharacterSheetBlocks(
  editor
) {

  const blocks =
    [
      editor.matches?.('.character-sheet-block')
        ? editor
        : null,
      ...editor.querySelectorAll(
        '.character-sheet-block'
      )
    ].filter(Boolean);

  blocks.forEach(
    renderCharacterSheetBlock
  );
}


function renderCharacterSheetBlock(
  block
) {

  const target =
    ensureRuntimeContainer(
      block
    );

  const page =
    getCurrentPageSnapshot(
      block
    );

  if (
    !page ||
    !['character', 'creature'].includes(
      page.type
    )
  ) {

    target.innerHTML =
      '<div class="character-sheet-empty">Лист доступен для персонажей и существ.</div>';

    return;
  }

  const model =
    readCharacterModelFromPage(
      page,
      {
        pages:
          state.pages
      }
    );

  target.innerHTML =
    createCharacterSheetHTML(
      model,
      page
    );
}


function createCharacterSheetHTML(
  model,
  page
) {

  const health =
    getCharacterHealth(
      model
    );

  const properties =
    getPrimaryCharacterPropertiesModel(
      page
    );

  return `
    <section class="character-sheet-page">
      <header class="character-sheet-top">
        <section class="character-sheet-identity character-sheet-box character-sheet-corner-br">
          <span class="character-sheet-kicker">${escapeHTML(model.cardType === 'creature' ? 'Существо' : 'Персонаж')}</span>
          <strong>${escapeHTML(getCurrentCharacterTitle(model, page))}</strong>
          <div class="character-sheet-identity-grid">
            ${createReadOnlyLineHTML('Предыстория', getPropertyDisplayValue(properties, 'background'))}
            ${createReadOnlyLineHTML('Класс', getPropertyDisplayValue(properties, 'charClass'))}
            ${createReadOnlyLineHTML('Вид', getPropertyDisplayValue(properties, 'race'))}
            ${createReadOnlyLineHTML('Подкласс', getPropertyDisplayValue(properties, 'charSubclass'))}
          </div>
        </section>

        <section class="character-sheet-level-orb">
          ${createEditableMetricHTML({
            label: 'Уровень',
            value: model.level,
            field: 'level',
            className: 'character-sheet-level'
          })}
          <div class="character-sheet-pb">БМ ${formatSigned(model.proficiencyBonus)}</div>
        </section>

        <section class="character-sheet-ac-shield">
          ${createEditableMetricHTML({
            label: 'Класс защиты',
            value: getCharacterEffectiveArmorClass(model),
            field: 'armorClass',
            override: 'armorClass',
            calculation: model.calculations?.armorClass
          })}
        </section>

        <section class="character-sheet-vitals character-sheet-box">
          <div class="character-sheet-vitals-grid">
            ${createEditableMetricHTML({
              label: 'Хиты',
              value: health.current,
              field: 'hpCurrent'
            })}
            ${createEditableMetricHTML({
              label: 'Временные',
              value: health.temp,
              field: 'hpTemp'
            })}
            ${createEditableMetricHTML({
              label: 'Максимум',
              value: health.max,
              field: 'hpMax'
            })}
            ${createReadOnlyMetricHTML('Кость хитов', getPropertyDisplayValue(properties, 'hitDie') || 'd?')}
            ${createDeathSavesHTML(model)}
          </div>
        </section>
      </header>

      <section class="character-sheet-logo">Long Story Short</section>

      <section class="character-sheet-survival">
        ${createEditableMetricHTML({
          label: 'Инициатива',
          value: getCharacterInitiativeModifier(model),
          override: 'initiative',
          calculation: model.calculations?.initiative,
          signed: true
        })}
        ${createEditableMetricHTML({
          label: 'Скорость',
          value: getCharacterEffectiveSpeed(model),
          field: 'speed',
          override: 'speed',
          suffix: 'фт.',
          calculation: model.calculations?.speed
        })}
        ${createReadOnlyMetricHTML('П. восприятие', calculatePassivePerception(properties, model))}
        ${createReadOnlyMetricHTML('Состояния', getConditionsLabel(model))}
      </section>

      <main class="character-sheet-main">
        <section class="character-sheet-abilities">
          ${CHARACTER_ABILITY_KEYS.map(key =>
            createAbilityHTML(
              key,
              model.abilities[key],
              properties
            )
          ).join('')}
        </section>

        <section class="character-sheet-side">
          ${createInventoryHTML(model)}
          ${createEffectsHTML(model)}
        </section>
      </main>
    </section>
  `;
}


function createMetricHTML(
  label,
  value
) {

  return `
    <div class="character-sheet-metric">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
    </div>
  `;
}


function createEditableMetricHTML(
  {
    label,
    value,
    field = '',
    override = '',
    className = '',
    suffix = '',
    signed = false,
    calculation = null
  }
) {

  const isManual =
    calculation?.source === 'manual';

  return `
    <label class="character-sheet-metric character-sheet-editable ${className} ${isManual ? 'is-manual-override' : ''}">
      <span>${escapeHTML(label)}</span>
      ${calculation ? createCalculationHintHTML(calculation) : ''}
      <input
        type="number"
        value="${escapeAttribute(value)}"
        ${field ? `data-character-sheet-field="${escapeAttribute(field)}"` : ''}
        ${override ? `data-character-sheet-override="${escapeAttribute(override)}"` : ''}
        title="${escapeAttribute(calculation?.formula || '')}"
      >
      ${override && isManual ? `
        <button
          class="character-sheet-clear-override"
          type="button"
          data-character-sheet-clear-override="${escapeAttribute(override)}"
          title="Вернуть авторасчет"
        >×</button>
      ` : ''}
      <strong>${escapeHTML(signed ? formatSigned(value) : value)}</strong>
      ${suffix ? `<small>${escapeHTML(suffix)}</small>` : ''}
    </label>
  `;
}


function createCalculationHintHTML(
  calculation
) {

  const parts =
    (calculation.parts || [])
      .map(part =>
        `${part.label}: ${part.value}`
      )
      .join(' · ');

  const text =
    [
      calculation.source === 'manual'
        ? 'Ручное значение'
        : 'Авторасчет',
      calculation.formula,
      parts
    ]
      .filter(Boolean)
      .join(' | ');

  return `
    <em class="character-sheet-calc-hint" title="${escapeAttribute(text)}">
      ${escapeHTML(calculation.source === 'manual' ? 'ручн.' : 'авто')}
    </em>
  `;
}


function createAbilityHTML(
  key,
  ability,
  properties
) {

  return `
    <article class="character-sheet-ability character-sheet-box">
      <h3>${escapeHTML(ABILITY_LABELS[key])}</h3>
      <div class="character-sheet-ability-main">
        <span class="character-sheet-ability-mod">${formatSigned(ability.modifier)}</span>
        <label class="character-sheet-ability-score character-sheet-editable">
          <input
            type="number"
            min="1"
            max="30"
            value="${escapeAttribute(ability.score)}"
            data-character-sheet-field="${escapeAttribute(key)}"
          >
          <span>Значение</span>
        </label>
      </div>
      <div class="character-sheet-skill-list">
        ${createSkillRowsHTML(
          key,
          properties,
          ability
        )}
      </div>
    </article>
  `;
}


function createSkillRowsHTML(
  abilityKey,
  properties,
  ability
) {

  return (
    CHARACTER_SHEET_SKILLS[abilityKey] || []
  )
    .map(skill => {

      const value =
        getNumericPropertyValue(
          properties,
          skill.key,
          ability.modifier
        );

      const proficient =
        Boolean(
          getPropertyValue(
            properties,
            `${skill.key}Proficient`,
            false
          )
        );

      return `
        <div class="character-sheet-skill">
          <span class="character-sheet-skill-dot ${proficient ? 'is-active' : ''}"></span>
          <strong>${formatSigned(value)}</strong>
          <span>${escapeHTML(skill.label)}</span>
        </div>
      `;
    })
    .join('');
}


function createInventoryHTML(
  model
) {

  const items =
    model.inventory.items.length
      ? model.inventory.items.map(item => `
        <li>
          <span>${escapeHTML(item.title)}</span>
          <strong>${escapeHTML(item.quantity || 1)}</strong>
        </li>
      `).join('')
      : '<li class="is-empty">Предметов нет</li>';

  return `
    <div class="character-sheet-panel">
      <h3>Инвентарь</h3>
      <ul>${items}</ul>
    </div>
  `;
}


function createDeathSavesHTML(
  model
) {

  return `
    <div class="character-sheet-death-saves">
      <span>Хиты от смерти</span>
      ${createDeathSaveTrackHTML({
        label: 'Успехи',
        icon: '♥',
        field: 'deathSaveSuccesses',
        value: model.deathSaves?.successes || 0
      })}
      ${createDeathSaveTrackHTML({
        label: 'Провалы',
        icon: '☠',
        field: 'deathSaveFailures',
        value: model.deathSaves?.failures || 0
      })}
    </div>
  `;
}


function createReadOnlyLineHTML(
  label,
  value
) {

  return `
    <div class="character-sheet-line">
      <span>${escapeHTML(value || '—')}</span>
      <small>${escapeHTML(label)}</small>
    </div>
  `;
}


function createReadOnlyMetricHTML(
  label,
  value
) {

  return `
    <div class="character-sheet-metric character-sheet-readonly">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value ?? '—')}</strong>
    </div>
  `;
}


function createDeathSaveTrackHTML(
  {
    label,
    icon,
    field,
    value
  }
) {

  return `
    <fieldset class="character-sheet-death-track" data-character-sheet-death-track="${escapeAttribute(field)}">
      <legend>${escapeHTML(label)}</legend>
      ${[1, 2, 3].map(index => `
        <label>
          <input
            type="checkbox"
            ${index <= value ? 'checked' : ''}
            data-character-sheet-death-field="${escapeAttribute(field)}"
            data-character-sheet-death-index="${index}"
          >
          <span>${escapeHTML(icon)}</span>
        </label>
      `).join('')}
    </fieldset>
  `;
}


function createEffectsHTML(
  model
) {

  const conditionItems =
    model.effects.conditions.map(condition => `
      <li>${escapeHTML(condition.level ? `${condition.label} ${condition.level}` : condition.label)}</li>
    `);

  const effectItems =
    model.effects.effects.map(effect => `
      <li>${escapeHTML(effect.title)}</li>
    `);

  const items =
    [
      ...conditionItems,
      ...effectItems
    ];

  return `
    <div class="character-sheet-panel">
      <h3>Эффекты</h3>
      <ul>${items.length ? items.join('') : '<li class="is-empty">Эффектов нет</li>'}</ul>
    </div>
  `;
}


function ensureRuntimeContainer(
  block
) {

  const existing =
    block.querySelector(
      '.character-sheet-runtime'
    );

  if (existing) {

    existing.dataset.runtime =
      'true';

    existing.setAttribute(
      'contenteditable',
      'false'
    );

    return existing;
  }

  const element =
    document.createElement('div');

  element.className =
    'character-sheet-runtime';

  element.dataset.runtime =
    'true';

  element.setAttribute(
    'contenteditable',
    'false'
  );

  block.appendChild(
    element
  );

  return element;
}


function getCurrentPageSnapshot(
  block
) {

  const editor =
    block.closest(
      '#editorArea'
    );

  if (!state.currentPage) return null;

  return {
    ...state.currentPage,
    content:
      editor?.innerHTML ||
      state.currentPage.content ||
      ''
  };
}


async function updateCharacterSheetValue(
  block,
  control
) {

  const editor =
    block.closest(
      '#editorArea'
    );

  if (!editor || !state.currentPage) return;

  const propertiesBlock =
    ensurePropertiesBlockForPage(
      editor,
      state.currentPage
    );

  if (!propertiesBlock) return;

  const field =
    control.dataset.characterSheetField;

  const override =
    control.dataset.characterSheetOverride;

  const deathField =
    control.dataset.characterSheetDeathField;

  const value =
    deathField
      ? getDeathSaveTrackNextValue(
        control
      )
      : control.value;

  let changed =
    false;

  if (field) {

    changed =
      setPropertyFieldValue(
        propertiesBlock,
        field,
        value
      ) || changed;
  }

  if (override) {

    changed =
      setCalculatedPropertyOverride(
        propertiesBlock,
        override,
        value
      ) || changed;
  }

  if (deathField) {

    changed =
      setPropertyFieldValue(
        propertiesBlock,
        deathField,
        value
      ) || changed;
  }

  if (!changed) return;

  notifyPropertiesInput(
    propertiesBlock
  );

  await saveCurrentPageRef?.();

  renderCharacterSheetBlock(
    block
  );
}


async function clearCharacterSheetOverride(
  block,
  key
) {

  if (!key) return;

  const editor =
    block.closest(
      '#editorArea'
    );

  if (!editor || !state.currentPage) return;

  const propertiesBlock =
    ensurePropertiesBlockForPage(
      editor,
      state.currentPage
    );

  if (!propertiesBlock) return;

  const changed =
    setCalculatedPropertyOverride(
      propertiesBlock,
      key,
      ''
    );

  if (!changed) return;

  notifyPropertiesInput(
    propertiesBlock
  );

  await saveCurrentPageRef?.();

  renderCharacterSheetBlock(
    block
  );
}


function getDeathSaveTrackNextValue(
  control
) {

  const index =
    Number(
      control.dataset.characterSheetDeathIndex
    ) || 0;

  return control.checked
    ? index
    : Math.max(
      0,
      index - 1
    );
}


function getPrimaryCharacterPropertiesModel(
  page
) {

  return readPropertiesModelsFromHTML(
    page?.content || ''
  )
    .find(properties =>
      properties.cardType === 'character' ||
      properties.cardType === 'creature'
    ) || null;
}


function getCurrentCharacterTitle(
  model,
  page
) {

  return page?.title ||
    state.pages.find(item =>
      item.id === model.pageId
    )?.title ||
    'Без имени';
}


function getPropertyDisplayValue(
  properties,
  key
) {

  const value =
    getPropertyValue(
      properties,
      key,
      ''
    );

  if (
    value === null ||
    value === undefined ||
    value === false
  ) return '';

  return String(value);
}


function getNumericPropertyValue(
  properties,
  key,
  fallback = 0
) {

  const rawValue =
    getPropertyValue(
      properties,
      key,
      fallback
    );

  if (
    rawValue === '' ||
    rawValue === null ||
    rawValue === undefined
  ) return fallback;

  const value =
    Number(
      rawValue
    );

  return Number.isFinite(value)
    ? value
    : fallback;
}


function calculatePassivePerception(
  properties,
  model
) {

  const perception =
    getNumericPropertyValue(
      properties,
      'skillPerception',
      model.abilities?.wis?.modifier || 0
    );

  return 10 + perception;
}


function getConditionsLabel(
  model
) {

  const count =
    (model.effects?.conditions || []).length +
    (model.effects?.effects || []).length;

  return count > 0
    ? `${count} акт.`
    : 'нет';
}


function skillRow(
  key,
  label
) {

  return {
    key,
    label
  };
}


function formatSigned(
  value
) {

  const number =
    Number(value) || 0;

  return number >= 0
    ? `+${number}`
    : String(number);
}


function escapeHTML(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );
}
