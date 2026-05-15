import { state } from '../state.js';

import {
  saveCurrentPage
} from '../editor/editor.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  renderTags
} from './ui.js';

import {
  markRuntime
} from '../editor/blocks/blockContract.js';

import {
  getPageIcon
} from '../core/icons.js';

const CARD_TYPE_LABELS = {
  character: 'Персонаж',
  location: 'Локация',
  region: 'Регион',
  folder: 'Папка',
  magic: 'Магия',
  item: 'Предмет',
  lore: 'Лор',
  note: 'Заметка'
};


export function setupCardType() {

  document.addEventListener(
    'change',
    async event => {

      const select =
        event.target.closest(
          '.card-type-select'
        );

      if (!select) return;

      if (!state.currentPage) return;

      state.currentPage.type =
        select.value;

      state.currentPage.tags =
        [
          'card',
          select.value
        ];

      await saveCurrentPage();

      renderTags(
        state.currentPage.tags
      );

      renderTree();

      syncCustomCardType(
        select
      );
    }
  );

  document.addEventListener(
    'click',
    event => {

      const trigger =
        event.target.closest('.card-type-trigger');

      const option =
        event.target.closest('.card-type-option');

      if (trigger) {

        event.preventDefault();
        event.stopPropagation();

        toggleCustomCardType(
          trigger.closest('.card-type-custom')
        );

        return;
      }

      if (option) {

        event.preventDefault();
        event.stopPropagation();

        selectCustomCardType(
          option
        );

        return;
      }

      closeAllCardTypeDropdowns();
    }
  );
}


export function renderCardType() {

  if (!state.currentPage) return;

  const select =
    document.querySelector(
      '.card-type-select'
    );

  if (!select) return;

  ensureNativeCardTypeOptions(
    select
  );

  select.value =
    state.currentPage.type || 'note';

  ensureCustomCardType(
    select
  );

  syncCustomCardType(
    select
  );
}


function ensureNativeCardTypeOptions(
  select
) {

  Object
    .entries(CARD_TYPE_LABELS)
    .forEach(([value, label]) => {

      if (
        select.querySelector(`option[value="${value}"]`)
      ) return;

      const option =
        document.createElement('option');

      option.value =
        value;

      option.textContent =
        label;

      select.appendChild(
        option
      );
    });
}


function ensureCustomCardType(
  select
) {

  if (
    select.nextElementSibling?.classList.contains('card-type-custom')
  ) {

    markRuntime(
      select.nextElementSibling
    );

    return;
  }

  const custom =
    document.createElement('div');

  custom.className =
    'card-type-custom';

  markRuntime(
    custom
  );

  custom.innerHTML = `
    <button class="card-type-trigger" type="button">
      <span class="card-type-current"></span>
      <span class="card-type-arrow"></span>
    </button>

    <div class="card-type-menu hidden">
      ${Object
        .entries(CARD_TYPE_LABELS)
        .map(([value, label]) => `
          <button
            class="card-type-option"
            type="button"
            data-value="${value}"
          >
            ${getPageIcon([value])}
            <span class="card-type-option-label">${label}</span>
          </button>
        `)
        .join('')}
    </div>
  `;

  select.after(
    custom
  );
}


function syncCustomCardType(
  select
) {

  const custom =
    select.nextElementSibling;

  if (
    !custom?.classList.contains('card-type-custom')
  ) return;

  const value =
    select.value || 'note';

  custom.querySelector('.card-type-current').textContent =
    CARD_TYPE_LABELS[value] || CARD_TYPE_LABELS.note;

  custom
    .querySelectorAll('.card-type-option')
    .forEach(option => {

      option.classList.toggle(
        'is-selected',
        option.dataset.value === value
      );
    });
}


function toggleCustomCardType(
  custom
) {

  if (!custom) return;

  const menu =
    custom.querySelector('.card-type-menu');

  const willOpen =
    menu.classList.contains('hidden');

  closeAllCardTypeDropdowns();

  if (willOpen) {

    custom.classList.add(
      'is-open'
    );

    menu.classList.remove(
      'hidden'
    );
  }
}


function selectCustomCardType(
  option
) {

  const custom =
    option.closest('.card-type-custom');

  const select =
    custom?.previousElementSibling;

  if (!select) return;

  select.value =
    option.dataset.value;

  select.dispatchEvent(
    new Event(
      'change',
      {
        bubbles: true
      }
    )
  );

  closeAllCardTypeDropdowns();
}


function closeAllCardTypeDropdowns() {

  document
    .querySelectorAll('.card-type-custom')
    .forEach(custom => {

      custom.classList.remove(
        'is-open'
      );

      custom
        .querySelector('.card-type-menu')
        ?.classList.add(
          'hidden'
        );
    });
}
