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


const ABILITY_LABELS = {
  str: 'СИЛ',
  dex: 'ЛВК',
  con: 'ТЕЛ',
  int: 'ИНТ',
  wis: 'МДР',
  cha: 'ХАР'
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
          '[data-character-sheet-field], [data-character-sheet-override]'
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
      model
    );
}


function createCharacterSheetHTML(
  model
) {

  const health =
    getCharacterHealth(
      model
    );

  return `
    <section class="character-sheet-hero">
      <div>
        <span class="character-sheet-kicker">Сводка</span>
        <strong>${escapeHTML(model.cardType === 'creature' ? 'Существо' : 'Персонаж')}</strong>
      </div>
      ${createEditableMetricHTML({
        label: 'Уровень',
        value: model.level,
        field: 'level',
        className: 'character-sheet-level'
      })}
      <div class="character-sheet-pb">БМ ${formatSigned(model.proficiencyBonus)}</div>
    </section>

    <section class="character-sheet-combat">
      ${createEditableMetricHTML({
        label: 'КЗ',
        value: getCharacterEffectiveArmorClass(model),
        field: 'armorClass',
        override: 'armorClass',
        calculation: model.calculations?.armorClass
      })}
      ${createEditableMetricHTML({
        label: 'Скорость',
        value: getCharacterEffectiveSpeed(model),
        field: 'speed',
        override: 'speed',
        suffix: 'фт.',
        calculation: model.calculations?.speed
      })}
      ${createEditableMetricHTML({
        label: 'Инициатива',
        value: getCharacterInitiativeModifier(model),
        override: 'initiative',
        calculation: model.calculations?.initiative,
        signed: true
      })}
      ${createEditableMetricHTML({
        label: 'Хиты',
        value: health.current,
        field: 'hpCurrent'
      })}
      ${createEditableMetricHTML({
        label: 'Макс',
        value: health.max,
        field: 'hpMax'
      })}
      ${createEditableMetricHTML({
        label: 'Врем.',
        value: health.temp,
        field: 'hpTemp'
      })}
    </section>

    <section class="character-sheet-abilities">
      ${CHARACTER_ABILITY_KEYS.map(key =>
        createAbilityHTML(
          key,
          model.abilities[key]
        )
      ).join('')}
    </section>

    <section class="character-sheet-bottom">
      ${createInventoryHTML(model)}
      ${createEffectsHTML(model)}
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
      <input
        type="number"
        value="${escapeAttribute(value)}"
        ${field ? `data-character-sheet-field="${escapeAttribute(field)}"` : ''}
        ${override ? `data-character-sheet-override="${escapeAttribute(override)}"` : ''}
        title="${escapeAttribute(calculation?.formula || '')}"
      >
      <strong>${escapeHTML(signed ? formatSigned(value) : value)}</strong>
      ${suffix ? `<small>${escapeHTML(suffix)}</small>` : ''}
    </label>
  `;
}


function createAbilityHTML(
  key,
  ability
) {

  return `
    <label class="character-sheet-ability character-sheet-editable">
      <span>${ABILITY_LABELS[key]}</span>
      <input
        type="number"
        min="1"
        max="30"
        value="${escapeAttribute(ability.score)}"
        data-character-sheet-field="${escapeAttribute(key)}"
      >
      <strong>${ability.score}</strong>
      <small>${formatSigned(ability.modifier)}</small>
    </label>
  `;
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

  const value =
    control.value;

  const field =
    control.dataset.characterSheetField;

  const override =
    control.dataset.characterSheetOverride;

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

  if (!changed) return;

  notifyPropertiesInput(
    propertiesBlock
  );

  await saveCurrentPageRef?.();

  renderCharacterSheetBlock(
    block
  );
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
