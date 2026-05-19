import { state } from '../state.js';

import {
  saveCurrentPage
} from '../editor/editor.js';

import {
  calculateVariableValue
} from './variables/variableCalculations.js';

import {
  getVariableDefinition,
  getVariableGroup,
  VARIABLE_DEFINITIONS,
  VARIABLE_GROUPS
} from './variables/variableDefinitions.js';


// Архивный эксперимент: блок "Переменные" временно не подключен в app/editor.
// Причина описана в docs/ARCHIVED_EXPERIMENTS.md.

let variablePopup = null;


// Блок "Переменные" — MVP будущей расчетной системы.
// Persistent-часть хранит строки переменных, runtime-кнопки дорисовываются при render.

export function setupVariables() {

  document.addEventListener(
    'click',
    handleVariablesClick
  );

  document.addEventListener(
    'input',
    handleVariablesInput
  );

  document.addEventListener(
    'change',
    handleVariablesChange
  );
}


export function renderVariables() {

  document
    .querySelectorAll('.variables-block')
    .forEach(block => {

      ensureVariablesRuntime(
        block
      );

      renderVariableRows(
        block
      );

      updateCalculatedVariables(
        block
      );
    });
}


function handleVariablesClick(
  event
) {

  const addButton =
    event.target.closest('.variables-add-btn');

  if (addButton) {

    event.preventDefault();

    openVariablePicker(
      addButton.closest('.variables-block'),
      addButton
    );

    return;
  }

  const removeButton =
    event.target.closest('.variable-remove-btn');

  if (removeButton) {

    event.preventDefault();

    removeButton
      .closest('.variable-row')
      ?.remove();

    saveCurrentPage();
  }
}


function handleVariablesInput(
  event
) {

  const block =
    event.target.closest('.variables-block');

  if (!block) return;

  syncVariableValue(
    event.target
  );

  updateCalculatedVariables(
    block
  );

  saveCurrentPage();
}


function handleVariablesChange(
  event
) {

  const block =
    event.target.closest('.variables-block');

  if (!block) return;

  syncVariableValue(
    event.target
  );

  updateCalculatedVariables(
    block
  );

  saveCurrentPage();
}


function ensureVariablesRuntime(
  block
) {

  if (
    !block.querySelector('.variables-list')
  ) {

    const list =
      document.createElement('div');

    list.className =
      'variables-list';

    block.appendChild(
      list
    );
  }

  if (
    !block.querySelector('.variables-add-btn')
  ) {

    const button =
      document.createElement('button');

    button.className =
      'variables-add-btn';

    button.type =
      'button';

    button.dataset.runtime =
      'true';

    button.textContent =
      '+ Добавить переменную';

    block.appendChild(
      button
    );
  }
}


function renderVariableRows(
  block
) {

  block
    .querySelectorAll('.variable-row')
    .forEach(row => {

      const definition =
        getVariableDefinition(
          row.dataset.variableKey
        );

      if (!definition) return;

      renderVariableInput(
        row,
        definition
      );

      ensureRemoveButton(
        row
      );
    });
}


function renderVariableInput(
  row,
  definition
) {

  const value =
    row.dataset.value ||
    row.querySelector('.variable-input')?.value ||
    definition.defaultValue ||
    '';

  row.dataset.variableType =
    definition.type;

  row.querySelector('.variable-title').textContent =
    definition.title;

  const body =
    row.querySelector('.variable-control');

  if (!body) return;

  if (definition.type === 'pageSelect') {

    body.innerHTML =
      createPageSelectHTML(
        definition,
        value
      );

  } else if (definition.type === 'calculation') {

    body.innerHTML = `
      <input
        class="variable-input"
        type="number"
        value="${escapeAttribute(value)}"
        readonly
      >
    `;

  } else {

    body.innerHTML = `
      <input
        class="variable-input"
        type="${definition.type === 'number' ? 'number' : 'text'}"
        value="${escapeAttribute(value)}"
      >
    `;
  }

  row.dataset.value =
    value;
}


function createPageSelectHTML(
  definition,
  value
) {

  const pages =
    state.pages
      .filter(page =>
        (page.tags || []).includes(
          definition.tag
        )
      )
      .sort((first, second) =>
        String(first.title || '').localeCompare(
          String(second.title || ''),
          'ru'
        )
      );

  return `
    <select class="variable-input">
      <option value="">Не выбрано</option>
      ${pages.map(page => `
        <option
          value="${escapeAttribute(page.id)}"
          ${page.id === value ? 'selected' : ''}
        >
          ${escapeHtml(page.title || 'Без названия')}
        </option>
      `).join('')}
    </select>
  `;
}


function ensureRemoveButton(
  row
) {

  if (
    row.querySelector('.variable-remove-btn')
  ) return;

  const button =
    document.createElement('button');

  button.className =
    'variable-remove-btn';

  button.type =
    'button';

  button.dataset.runtime =
    'true';

  button.title =
    'Удалить переменную';

  button.textContent =
    '×';

  row.appendChild(
    button
  );
}


function openVariablePicker(
  block,
  anchor
) {

  if (!block) return;

  const popup =
    getVariablePopup();

  popup.innerHTML = `
    <div class="variable-picker-title">Добавить переменную</div>
    <input class="variable-picker-search" type="search" placeholder="Поиск">
    <div class="variable-picker-list"></div>
  `;

  const search =
    popup.querySelector('.variable-picker-search');

  const list =
    popup.querySelector('.variable-picker-list');

  const render = () => {

    renderVariablePickerList(
      list,
      search.value,
      block
    );
  };

  search.addEventListener(
    'input',
    render
  );

  list.addEventListener(
    'click',
    event => {

      const button =
        event.target.closest('[data-variable-key], [data-variable-group]');

      if (!button) return;

      if (button.dataset.variableKey) {

        addVariableRow(
          block,
          button.dataset.variableKey
        );

      } else {

        addVariableGroup(
          block,
          button.dataset.variableGroup
        );
      }

      closeVariablePopup();
      saveCurrentPage();
    }
  );

  render();
  positionVariablePopup(
    popup,
    anchor
  );

  popup.classList.remove(
    'hidden'
  );

  search.focus();
}


function renderVariablePickerList(
  list,
  query,
  block
) {

  const normalizedQuery =
    normalizeText(
      query
    );

  const selectedKeys =
    new Set(
      [...block.querySelectorAll('.variable-row')]
        .map(row => row.dataset.variableKey)
    );

  const groups =
    VARIABLE_GROUPS.filter(group =>
      normalizeText(group.title).includes(normalizedQuery)
    );

  const variables =
    VARIABLE_DEFINITIONS.filter(variable =>
      !selectedKeys.has(variable.key) &&
      normalizeText(variable.title).includes(normalizedQuery)
    );

  list.innerHTML = `
    <div class="variable-picker-section-title">Саб-блоки</div>
    ${groups.map(group => `
      <button class="variable-picker-option" type="button" data-variable-group="${group.key}">
        <strong>${group.title}</strong>
        <small>${group.variables.length} перем.</small>
      </button>
    `).join('') || '<div class="variable-picker-empty">Нет саб-блоков</div>'}

    <div class="variable-picker-section-title">Переменные</div>
    ${variables.map(variable => `
      <button class="variable-picker-option" type="button" data-variable-key="${variable.key}">
        <strong>${variable.title}</strong>
        <small>${getVariableTypeLabel(variable)}</small>
      </button>
    `).join('') || '<div class="variable-picker-empty">Нет переменных</div>'}
  `;
}


function addVariableGroup(
  block,
  groupKey
) {

  const group =
    getVariableGroup(
      groupKey
    );

  if (!group) return;

  group.variables.forEach(key => {

    addVariableRow(
      block,
      key
    );
  });
}


function addVariableRow(
  block,
  key
) {

  const definition =
    getVariableDefinition(
      key
    );

  if (!definition) return;

  if (
    block.querySelector(
      `.variable-row[data-variable-key="${key}"]`
    )
  ) return;

  const row =
    document.createElement('div');

  row.className =
    'variable-row';

  row.dataset.variableKey =
    definition.key;

  row.dataset.variableType =
    definition.type;

  row.dataset.value =
    definition.defaultValue || '';

  row.innerHTML = `
    <span class="variable-title">${escapeHtml(definition.title)}</span>
    <span class="variable-control"></span>
  `;

  block
    .querySelector('.variables-list')
    .appendChild(
      row
    );

  renderVariableInput(
    row,
    definition
  );

  ensureRemoveButton(
    row
  );

  updateCalculatedVariables(
    block
  );
}


function updateCalculatedVariables(
  block
) {

  block
    .querySelectorAll('.variable-row[data-variable-type="calculation"]')
    .forEach(row => {

      const definition =
        getVariableDefinition(
          row.dataset.variableKey
        );

      const value =
        calculateVariableValue(
          block,
          definition
        );

      row.dataset.value =
        value;

      const input =
        row.querySelector('.variable-input');

      if (input) {

        input.value =
          value;
      }
    });
}


function syncVariableValue(
  target
) {

  if (
    !target.classList.contains('variable-input')
  ) return;

  const row =
    target.closest('.variable-row');

  if (!row) return;

  row.dataset.value =
    target.value;

  target.setAttribute(
    'value',
    target.value
  );
}


function getVariablePopup() {

  if (variablePopup) return variablePopup;

  variablePopup =
    document.createElement('div');

  variablePopup.className =
    'variable-picker-popup hidden';

  variablePopup.dataset.runtime =
    'true';

  document.body.appendChild(
    variablePopup
  );

  document.addEventListener(
    'mousedown',
    event => {

      if (
        variablePopup.classList.contains('hidden') ||
        variablePopup.contains(event.target) ||
        event.target.closest('.variables-add-btn')
      ) return;

      closeVariablePopup();
    }
  );

  return variablePopup;
}


function closeVariablePopup() {

  variablePopup?.classList.add(
    'hidden'
  );
}


function positionVariablePopup(
  popup,
  anchor
) {

  const rect =
    anchor.getBoundingClientRect();

  const margin =
    10;

  const width =
    320;

  const height =
    430;

  const left =
    clamp(
      rect.left,
      margin,
      window.innerWidth - width - margin
    );

  const below =
    rect.bottom + 8;

  const top =
    below + height > window.innerHeight - margin
      ? rect.top - height - 8
      : below;

  popup.style.left =
    `${left}px`;

  popup.style.top =
    `${clamp(top, margin, window.innerHeight - height - margin)}px`;
}


function getVariableTypeLabel(
  variable
) {

  const labels = {
    number: 'число',
    text: 'текст',
    pageSelect: `карточки #${variable.tag}`,
    calculation: 'расчет'
  };

  return labels[variable.type] || variable.type;
}


function normalizeText(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      value
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
