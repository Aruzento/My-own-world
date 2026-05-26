import {
  upgradeTableBlock
} from './blockTableContract.js';

export const BLOCK_VERSIONS = {
  text: 1,
  items: 1,
  spells: 1,
  skills: 1,
  variables: 1,
  image: 1,
  characterStats: 2,
  dndStats: 3,
  dndStatsV2: 1,
  table: 2
};

export function upgradePersistentBlocks(
  editor
) {

  let changed =
    false;

  editor
    .querySelectorAll('.template-block')
    .forEach(block => {

      const type =
        block.dataset.blockType || 'text';

      const targetVersion =
        BLOCK_VERSIONS[type] || 1;

      const currentVersion =
        Number(block.dataset.blockVersion || 0);

      if (
        type === 'dndStats' &&
        currentVersion < 3
      ) {

        changed =
          upgradeDndStatsToV3Fixed(
            block
          ) || changed;
      }

      if (
        type === 'characterStats' &&
        currentVersion < 2
      ) {

        changed =
          upgradeCharacterStatsToV2(
            block
          ) || changed;
      }

      if (
        currentVersion !== targetVersion
      ) {

        block.dataset.blockVersion =
          String(targetVersion);

        changed =
          true;
      }

      if (
        type === 'table' &&
        currentVersion < 2
      ) {

        changed =
          upgradeTableBlock(
            block
          ) || changed;

        block.dataset.blockVersion =
          '2';
      }
    });

  return changed;
}

function upgradeCharacterStatsToV2(
  block
) {

  const labels = [
    'Уровень',
    'Опыт',
    'ЗМ',
    'СМ',
    'ММ'
  ];

  let changed =
    false;

  block
    .querySelectorAll('.character-stat-field span')
    .forEach((label, index) => {

      if (!labels[index]) return;

      if (
        label.textContent.trim() === labels[index]
      ) return;

      label.textContent =
        labels[index];

      changed =
        true;
    });

  return changed;
}

function upgradeDndStatsToV3Fixed(
  block
) {

  let changed =
    false;

  block
    .querySelectorAll('.dnd-analysis-field')
    .forEach(field => {

      field.remove();
      changed =
        true;
    });

  changed =
    ensureDndAnalysisSkill(
      block
    ) || changed;

  changed =
    normalizeDndStatsLabels(
      block
    ) || changed;

  return changed;
}

function ensureDndAnalysisSkill(
  block
) {

  const groups =
    block.querySelectorAll('.dnd-check-group');

  const intelligenceGroup =
    groups[3];

  if (!intelligenceGroup) {

    return false;
  }

  const hasAnalysis =
    [...intelligenceGroup.querySelectorAll('.dnd-check-name')]
      .some(name =>
        name.textContent.trim().toLowerCase() === 'анализ'
      );

  if (hasAnalysis) {

    return false;
  }

  const list =
    intelligenceGroup.querySelector('.dnd-check-group-list');

  if (!list) {

    return false;
  }

  const referenceRow =
    list.querySelectorAll('.dnd-check-row')[2];

  if (referenceRow) {

    referenceRow.insertAdjacentHTML(
      'beforebegin',
      createDndCheckRowHTML(
        'Анализ'
      )
    );

  } else {

    list.insertAdjacentHTML(
      'beforeend',
      createDndCheckRowHTML(
        'Анализ'
      )
    );
  }

  return true;
}

function normalizeDndStatsLabels(
  block
) {

  let changed =
    false;

  const combatLabels = [
    'Класс защиты',
    'Хиты',
    'Инициатива',
    'Скорость',
    'Бонус мастерства'
  ];

  block
    .querySelectorAll('.dnd-combat-field > span')
    .forEach((label, index) => {

      if (!combatLabels[index]) return;

      if (
        label.textContent.trim() === combatLabels[index]
      ) return;

      label.textContent =
        combatLabels[index];

      changed =
        true;
    });

  const placeholders = [
    ['.dnd-current-hp', 'текущие'],
    ['.dnd-max-hp', 'макс.']
  ];

  placeholders.forEach(([selector, value]) => {

    const input =
      block.querySelector(selector);

    if (!input) return;

    if (
      input.getAttribute('placeholder') === value
    ) return;

    input.setAttribute(
      'placeholder',
      value
    );

    changed =
      true;
  });

  const speed =
    block.querySelector('.dnd-speed');

  if (
    speed &&
    !speed.value
  ) {

    speed.value =
      '30 фт.';

    changed =
      true;
  }

  const statLabels = [
    'СИЛ',
    'ЛВК',
    'ТЕЛ',
    'ИНТ',
    'МДР',
    'ХАР'
  ];

  block
    .querySelectorAll('.dnd-stat-label')
    .forEach((label, index) => {

      if (!statLabels[index]) return;

      if (
        label.textContent.trim() === statLabels[index]
      ) return;

      label.textContent =
        statLabels[index];

      changed =
        true;
    });

  const groupLabels = [
    'СИЛ',
    'ЛВК',
    'ТЕЛ',
    'ИНТ',
    'МДР',
    'ХАР'
  ];

  block
    .querySelectorAll('.dnd-check-group-title')
    .forEach((label, index) => {

      if (!groupLabels[index]) return;

      if (
        label.textContent.trim() === groupLabels[index]
      ) return;

      label.textContent =
        groupLabels[index];

      changed =
        true;
    });

  const checkNames = [
    ['Спасбросок СИЛ', 'Атлетика'],
    ['Спасбросок ЛВК', 'Акробатика', 'Ловкость рук', 'Скрытность'],
    ['Спасбросок ТЕЛ'],
    ['Спасбросок ИНТ', 'История', 'Анализ', 'Магия', 'Природа', 'Религия'],
    ['Спасбросок МДР', 'Внимательность', 'Выживание', 'Медицина', 'Проницательность', 'Уход за животными'],
    ['Спасбросок ХАР', 'Выступление', 'Запугивание', 'Обман', 'Убеждение']
  ];

  block
    .querySelectorAll('.dnd-check-group')
    .forEach((group, groupIndex) => {

      group
        .querySelectorAll('.dnd-check-name')
        .forEach((name, nameIndex) => {

          const expected =
            checkNames[groupIndex]?.[nameIndex];

          if (!expected) return;

          if (
            name.textContent.trim() === expected
          ) return;

          name.textContent =
            expected;

          changed =
            true;
        });
    });

  const title =
    block.querySelector('.dnd-checks-title');

  if (
    title &&
    title.textContent.trim() !== 'Навыки и спасброски'
  ) {

    title.textContent =
      'Навыки и спасброски';

    changed =
      true;
  }

  return changed;
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
