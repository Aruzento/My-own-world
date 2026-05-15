import {
  saveCurrentPage
} from '../editor/editor.js';


const STAT_ORDER = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha'
];


export function setupDndStats() {

  document.addEventListener(
    'input',
    event => {

      const scoreInput =
        event.target.closest('.dnd-stat-score');

      if (scoreInput) {

        updateStatModifier(
          scoreInput
        );

        updateAutoChecksForStat(
          scoreInput
        );

        saveCurrentPage();
        return;
      }

      const checkValue =
        event.target.closest('.dnd-check-value');

      if (checkValue) {

        handleCheckManualInput(
          checkValue
        );

        saveCurrentPage();
        return;
      }

      const dndField =
        event.target.closest(
          '.dnd-stats-block input'
        );

      if (dndField) {

        saveCurrentPage();
      }
    }
  );


  document.addEventListener(
    'change',
    event => {

      const checkbox =
        event.target.closest(
          '.dnd-check-point'
        );

      if (!checkbox) return;

      saveCurrentPage();
    }
  );
}


export function renderDndStats() {

  document
    .querySelectorAll('.dnd-stat-score')
    .forEach(input => {

      updateStatModifier(
        input
      );
    });

  document
    .querySelectorAll('.dnd-stats-block')
    .forEach(updateAutoChecks);
}


function handleCheckManualInput(
  input
) {

  if (input.value.trim() === '') {

    input.dataset.manualValue =
      'false';

    input.classList.remove(
      'is-manual'
    );

    updateSingleAutoCheck(
      input
    );

    return;
  }

  input.dataset.manualValue =
    'true';

  input.classList.add(
    'is-manual'
  );
}


function updateAutoChecks(
  block
) {

  block
    .querySelectorAll('.dnd-check-group')
    .forEach((group, index) => {

      const statKey =
        STAT_ORDER[index];

      if (!statKey) return;

      const statInput =
        block.querySelector(
          `.dnd-stat-row[data-stat="${statKey}"] .dnd-stat-score`
        );

      if (!statInput) return;

      const modifier =
        getModifierForScore(
          statInput.value
        );

      group
        .querySelectorAll('.dnd-check-value')
        .forEach(input => {

          updateAutoCheckValue(
            input,
            modifier
          );
        });
    });
}


function updateAutoChecksForStat(
  statInput
) {

  const block =
    statInput.closest('.dnd-stats-block');

  const row =
    statInput.closest('.dnd-stat-row');

  if (!block || !row) return;

  const statIndex =
    STAT_ORDER.indexOf(
      row.dataset.stat
    );

  if (statIndex < 0) return;

  const group =
    block.querySelectorAll('.dnd-check-group')[statIndex];

  if (!group) return;

  const modifier =
    getModifierForScore(
      statInput.value
    );

  group
    .querySelectorAll('.dnd-check-value')
    .forEach(input => {

      updateAutoCheckValue(
        input,
        modifier
      );
    });
}


function updateSingleAutoCheck(
  input
) {

  const block =
    input.closest('.dnd-stats-block');

  const group =
    input.closest('.dnd-check-group');

  if (!block || !group) return;

  const groups =
    [...block.querySelectorAll('.dnd-check-group')];

  const statKey =
    STAT_ORDER[groups.indexOf(group)];

  if (!statKey) return;

  const statInput =
    block.querySelector(
      `.dnd-stat-row[data-stat="${statKey}"] .dnd-stat-score`
    );

  if (!statInput) return;

  updateAutoCheckValue(
    input,
    getModifierForScore(statInput.value)
  );
}


function updateAutoCheckValue(
  input,
  modifier
) {

  if (
    input.dataset.manualValue === 'true'
  ) {

    input.classList.add(
      'is-manual'
    );

    return;
  }

  input.dataset.manualValue =
    'false';

  input.classList.remove(
    'is-manual'
  );

  input.value =
    String(modifier);
}


function updateStatModifier(
  input
) {

  const row =
    input.closest('.dnd-stat-row');

  if (!row) return;

  const modifierElement =
    row.querySelector('.dnd-stat-modifier');

  if (!modifierElement) return;

  const modifier =
    getModifierForScore(
      input.value
    );

  modifierElement.textContent =
    formatModifier(
      modifier
    );
}


function getModifierForScore(
  value
) {

  const score =
    Number(value);

  if (!Number.isFinite(score)) return 0;

  return Math.floor(
    (Math.max(1, Math.min(30, score)) - 10) / 2
  );
}


function formatModifier(
  value
) {

  return value >= 0
    ? `+${value}`
    : String(value);
}
