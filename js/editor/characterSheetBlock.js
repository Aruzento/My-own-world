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


const ABILITY_LABELS = {
  str: 'СИЛ',
  dex: 'ЛВК',
  con: 'ТЕЛ',
  int: 'ИНТ',
  wis: 'МДР',
  cha: 'ХАР'
};


// Лист персонажа - runtime-витрина CharacterModel.
// Он не хранит свои числа, а каждый раз собирает картину из свойств,
// инвентаря, эффектов и старых DnD-блоков текущей карточки.
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
      <div class="character-sheet-level">Ур. ${model.level}</div>
      <div class="character-sheet-pb">БМ ${formatSigned(model.proficiencyBonus)}</div>
    </section>

    <section class="character-sheet-combat">
      ${createMetricHTML('КЗ', getCharacterEffectiveArmorClass(model))}
      ${createMetricHTML('Скорость', `${getCharacterEffectiveSpeed(model)} фт.`)}
      ${createMetricHTML('Инициатива', formatSigned(getCharacterInitiativeModifier(model)))}
      ${createMetricHTML('Хиты', `${health.current}/${health.max}`)}
      ${createMetricHTML('Врем.', health.temp)}
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


function createAbilityHTML(
  key,
  ability
) {

  return `
    <div class="character-sheet-ability">
      <span>${ABILITY_LABELS[key]}</span>
      <strong>${ability.score}</strong>
      <small>${formatSigned(ability.modifier)}</small>
    </div>
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
