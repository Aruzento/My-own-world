import {
  state
} from '../state.js';

import {
  saveCurrentPage
} from '../editor/editor.js';


// Архивный эксперимент: DnD stat block v2 временно не подключен в app/editor.
// Причина описана в docs/ARCHIVED_EXPERIMENTS.md.

const ABILITY_ORDER = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha'
];


// DnD v2 stat block не мигрирует старый dndStats: это отдельная версия блока.
// Расчёты основаны на DnD 5e: модификатор характеристики + владение.

export function setupDndStatsV2() {

  document.addEventListener(
    'input',
    event => {

      const block =
        event.target.closest('.dnd2-stats-block');

      if (!block) return;

      handleDnd2Input(
        block,
        event.target
      );

      saveCurrentPage();
    }
  );

  document.addEventListener(
    'change',
    event => {

      const block =
        event.target.closest('.dnd2-stats-block');

      if (!block) return;

      handleDnd2Change(
        block,
        event.target
      );

      saveCurrentPage();
    }
  );
}


export function renderDndStatsV2() {

  document
    .querySelectorAll('.dnd2-stats-block')
    .forEach(block => {

      populateDnd2Selects(
        block
      );

      updateDnd2Block(
        block
      );
    });
}


function handleDnd2Input(
  block,
  target
) {

  if (
    target.closest('.dnd2-level')
  ) {

    updateProficiencyBonus(
      block
    );

    updateAllSkillValues(
      block
    );

    return;
  }

  if (
    target.closest('.dnd2-ability-score')
  ) {

    updateAbilityModifier(
      target.closest('.dnd2-ability-card')
    );

    updateAllSkillValues(
      block
    );

    return;
  }

  if (
    target.closest('.dnd2-ability-mod-input')
  ) {

    handleManualModifierInput(
      block,
      target
    );

    return;
  }

  if (
    target.closest('.dnd2-skill-value')
  ) {

    handleManualSkillInput(
      target
    );
  }
}


function handleDnd2Change(
  block,
  target
) {

  if (
    target.closest('.dnd2-race-select') ||
    target.closest('.dnd2-class-select')
  ) {

    populateDnd2Selects(
      block
    );
  }

  if (
    target.closest('.dnd2-proficiency-check')
  ) {

    updateAllSkillValues(
      block
    );

    return;
  }

  updateDnd2Block(
    block
  );
}


function populateDnd2Selects(
  block
) {

  const raceSelect =
    block.querySelector('.dnd2-race-select');

  const classSelect =
    block.querySelector('.dnd2-class-select');

  const typeSelect =
    block.querySelector('.dnd2-type-select');

  const subclassSelect =
    block.querySelector('.dnd2-subclass-select');

  populateCardSelect(
    raceSelect,
    getPagesByTag('race')
  );

  populateCardSelect(
    classSelect,
    getPagesByTag('class')
  );

  populateCardSelect(
    typeSelect,
    getPagesByTagAndParent(
      'type',
      raceSelect?.value
    )
  );

  populateCardSelect(
    subclassSelect,
    getPagesByTagAndParent(
      'subclass',
      classSelect?.value
    )
  );
}


function populateCardSelect(
  select,
  pages
) {

  if (!select) return;

  const selected =
    select.value ||
    select.getAttribute('value') ||
    '';

  select.innerHTML = `
    <option value="">Не выбрано</option>
    ${pages.map(page => `
      <option value="${escapeAttribute(page.id)}">${escapeHtml(page.title)}</option>
    `).join('')}
  `;

  select.value =
    pages.some(page => page.id === selected)
      ? selected
      : '';

  select.setAttribute(
    'value',
    select.value
  );
}


function updateDnd2Block(
  block
) {

  updateProficiencyBonus(
    block
  );

  block
    .querySelectorAll('.dnd2-ability-card')
    .forEach(updateAbilityModifier);

  updateAllSkillValues(
    block
  );
}


function updateProficiencyBonus(
  block
) {

  const level =
    clampNumber(
      block.querySelector('.dnd2-level')?.value,
      1,
      20,
      1
    );

  const bonus =
    getProficiencyBonusForLevel(
      level
    );

  const input =
    block.querySelector('.dnd2-proficiency-bonus');

  if (input) {

    input.value =
      String(bonus);

    input.setAttribute(
      'value',
      input.value
    );
  }
}


function updateAbilityModifier(
  card
) {

  if (!card) return;

  const score =
    card.querySelector('.dnd2-ability-score')?.value;

  const modifier =
    getModifierForScore(
      score
    );

  const input =
    card.querySelector('.dnd2-ability-mod-input');

  if (!input) return;

  if (
    input.dataset.manualValue === 'true'
  ) {

    input.classList.add(
      'is-manual'
    );

    return;
  }

  input.value =
    String(modifier);

  input.dataset.manualValue =
    'false';

  input.classList.remove(
    'is-manual'
  );
}


function updateAllSkillValues(
  block
) {

  const proficiency =
    Number(
      block.querySelector('.dnd2-proficiency-bonus')?.value || 2
    );

  block
    .querySelectorAll('.dnd2-skill-group')
    .forEach(group => {

      const ability =
        group.dataset.ability;

      const modifier =
        getAbilityModifier(
          block,
          ability
        );

      group
        .querySelectorAll('.dnd2-skill-row')
        .forEach(row => {

          const input =
            row.querySelector('.dnd2-skill-value');

          if (!input) return;

          if (
            input.dataset.manualValue === 'true'
          ) {

            input.classList.add(
              'is-manual'
            );

            return;
          }

          const hasProficiency =
            row.querySelector('.dnd2-proficiency-check')?.checked;

          input.dataset.manualValue =
            'false';

          input.classList.remove(
            'is-manual'
          );

          input.value =
            String(
              modifier + (hasProficiency ? proficiency : 0)
            );
        });
    });
}


function handleManualSkillInput(
  input
) {

  if (
    input.value.trim() === ''
  ) {

    input.dataset.manualValue =
      'false';

    input.classList.remove(
      'is-manual'
    );

    updateAllSkillValues(
      input.closest('.dnd2-stats-block')
    );

    return;
  }

  input.dataset.manualValue =
    'true';

  input.classList.add(
    'is-manual'
  );
}


function handleManualModifierInput(
  block,
  input
) {

  if (
    input.value.trim() === ''
  ) {

    input.dataset.manualValue =
      'false';

    input.classList.remove(
      'is-manual'
    );

    updateAbilityModifier(
      input.closest('.dnd2-ability-card')
    );

    updateAllSkillValues(
      block
    );

    return;
  }

  input.dataset.manualValue =
    'true';

  input.classList.add(
    'is-manual'
  );

  updateAllSkillValues(
    block
  );
}


function getAbilityModifier(
  block,
  ability
) {

  const modifierInput =
    block.querySelector(
      `.dnd2-ability-card[data-ability="${ability}"] .dnd2-ability-mod-input`
    );

  if (
    modifierInput &&
    modifierInput.dataset.manualValue === 'true'
  ) {

    return Number(modifierInput.value) || 0;
  }

  const scoreInput =
    block.querySelector(
      `.dnd2-ability-card[data-ability="${ability}"] .dnd2-ability-score`
    );

  return getModifierForScore(
    scoreInput?.value
  );
}


function getProficiencyBonusForLevel(
  level
) {

  return Math.min(
    6,
    Math.max(
      2,
      Math.ceil(level / 4) + 1
    )
  );
}


function getModifierForScore(
  value
) {

  const score =
    clampNumber(
      value,
      1,
      30,
      10
    );

  return Math.floor(
    (score - 10) / 2
  );
}


function getPagesByTag(
  tag
) {

  return state.pages
    .filter(page =>
      (page.tags || []).includes(tag)
    )
    .sort(comparePageTitles);
}


function getPagesByTagAndParent(
  tag,
  parentId
) {

  if (!parentId) return [];

  return getPagesByTag(tag)
    .filter(page =>
      page.parent === parentId
    );
}


function comparePageTitles(
  first,
  second
) {

  return String(first.title || '')
    .localeCompare(
      String(second.title || ''),
      'ru'
    );
}


function clampNumber(
  value,
  min,
  max,
  fallback
) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.max(
    min,
    Math.min(
      max,
      number
    )
  );
}


function escapeHtml(
  value
) {

  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function escapeAttribute(
  value
) {

  return escapeHtml(
    value
  );
}
