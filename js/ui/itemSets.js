import { state } from '../state.js';

import {
  saveCurrentPage
} from '../editor/editor.js';

import {
  getPageIcon
} from '../core/icons.js';

import {
  positionPopupNearAnchor
} from './popupPosition.js';


let activeSetList = null;
let activeSetKind = 'items';


export function setupItemSets() {

  setupItemSetPicker();

  document.addEventListener(
    'click',
    async event => {

      const addButton =
        event.target.closest(
          '.item-set-add-btn, .spell-set-add-btn'
        );

      const chip =
        event.target.closest(
          '.item-set-chip, .spell-set-chip'
        );

      const removeButton =
        event.target.closest(
          '.item-set-remove, .spell-set-remove'
        );


      if (addButton) {

        event.preventDefault();

        openItemSetPicker(
          addButton
        );

        return;
      }


      if (removeButton) {

        event.preventDefault();

        event.stopPropagation();

        await removeItemFromSet(
          removeButton
        );

        return;
      }


      if (chip) {

        event.preventDefault();

        const pageId =
          chip.dataset.pageId;

        const page =
          state.pages.find(candidate =>
            candidate.id === pageId
          );

        if (!page) return;

        const module =
          await import('../editor/editor.js');

        module.openPage(
          page
        );
      }
    }
  );
}


function setupItemSetPicker() {

  if (
    document.getElementById(
      'itemSetPicker'
    )
  ) return;


  const picker =
    document.createElement('div');

  picker.id =
    'itemSetPicker';

  picker.className =
    'item-set-picker hidden';

  picker.innerHTML = `
    <input
      class="item-set-search"
      type="text"
      name="item-set-search"
      placeholder="Найти предмет..."
    >

    <div class="item-set-options"></div>
  `;

  document.body.appendChild(
    picker
  );


  picker
    .querySelector('.item-set-search')
    .addEventListener(
      'input',
      renderItemSetOptions
    );


  document.addEventListener(
    'click',
    event => {

      if (
        picker.classList.contains(
          'hidden'
        )
      ) return;

      if (
        picker.contains(event.target)
      ) return;

      if (
        event.target.closest(
          '.item-set-add-btn, .spell-set-add-btn'
        )
      ) return;

      closeItemSetPicker();
    }
  );
}


function openItemSetPicker(
  button
) {

  const block =
    button.closest(
      '.item-set-block, .spell-set-block'
    );

  if (!block) return;

  activeSetKind =
    block.classList.contains('spell-set-block')
      ? 'spells'
      : 'items';

  activeSetList =
    block.querySelector(
      activeSetKind === 'spells'
        ? '.spell-set-list'
        : '.item-set-list'
    );

  if (!activeSetList) return;


  const picker =
    document.getElementById(
      'itemSetPicker'
    );

  const search =
    picker.querySelector(
      '.item-set-search'
    );

  search.value = '';

  search.placeholder =
    activeSetKind === 'spells'
      ? 'Найти заклинание...'
      : 'Найти предмет...';


  picker.classList.remove(
    'hidden'
  );

  requestAnimationFrame(
    () => {

      positionPopupNearAnchor(
        picker,
        button,
        {
          fallbackWidth: 280,
          fallbackHeight: 320
        }
      );
    }
  );

  renderItemSetOptions();

  search.focus();
}


function closeItemSetPicker() {

  const picker =
    document.getElementById(
      'itemSetPicker'
    );

  picker.classList.add(
    'hidden'
  );

  activeSetList = null;
  activeSetKind = 'items';
}


function renderItemSetOptions() {

  const picker =
    document.getElementById(
      'itemSetPicker'
    );

  const search =
    picker.querySelector(
      '.item-set-search'
    );

  const options =
    picker.querySelector(
      '.item-set-options'
    );

  const query =
    normalize(search.value);

  options.innerHTML = '';


  const selectedIds =
    activeSetList
      ? [...activeSetList.querySelectorAll('.item-set-chip, .spell-set-chip')]
          .map(chip => chip.dataset.pageId)
      : [];


  const items =
    state.pages.filter(page => {

      const expectedType =
        activeSetKind === 'spells'
          ? 'magic'
          : 'item';

      if (
        page.type !== expectedType &&
        (
          !page.tags ||
          !page.tags.includes(expectedType)
        )
      ) {

        return false;
      }

      if (
        state.currentPage &&
        page.id === state.currentPage.id
      ) {

        return false;
      }

      if (
        selectedIds.includes(page.id)
      ) {

        return false;
      }

      if (!query) return true;

      return (
        normalize(page.title).includes(query)
        ||
        (page.aliases || []).some(alias =>
          normalize(alias).includes(query)
        )
      );
    });


  if (items.length === 0) {

    const empty =
      document.createElement('div');

    empty.className =
      'item-set-empty';

    empty.textContent =
      activeSetKind === 'spells'
        ? 'Заклинания не найдены'
        : 'Предметы не найдены';

    options.appendChild(
      empty
    );

    return;
  }


  items.forEach(page => {

    const button =
      document.createElement('button');

    button.className =
      'item-set-option';

    button.type =
      'button';

    button.innerHTML =
      activeSetKind === 'spells'
        ? createSpellOptionHTML(page)
        : `
          ${getPageIcon(page.tags)}

          <span class="item-set-option-title">
            ${page.title || 'Без названия'}
          </span>
        `;

    button.addEventListener(
      'click',
      async event => {

        event.stopPropagation();

        await addItemToSet(
          page
        );
      }
    );

    options.appendChild(
      button
    );
  });
}


async function addItemToSet(
  page
) {

  if (!activeSetList) return;


  const chip =
    document.createElement('button');

  chip.type =
    'button';

  chip.className =
    activeSetKind === 'spells'
      ? 'spell-set-chip'
      : 'item-set-chip';

  chip.dataset.pageId =
    page.id;

  chip.innerHTML =
    activeSetKind === 'spells'
      ? createSpellChipHTML(page)
      : `
        ${getPageIcon(page.tags)}

        <span class="item-set-title">
          ${page.title || 'Без названия'}
        </span>

        <span
          class="item-set-remove"
          title="Убрать из набора"
        >
          ×
        </span>
      `;

  activeSetList.appendChild(
    chip
  );

  await saveCurrentPage();

  closeItemSetPicker();
}


async function removeItemFromSet(
  button
) {

  const chip =
    button.closest(
      '.item-set-chip, .spell-set-chip'
    );

  if (!chip) return;

  chip.remove();

  await saveCurrentPage();
}


function normalize(value) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


function createSpellOptionHTML(
  page
) {

  return `
    ${getPageIcon(page.tags)}

    <span class="item-set-option-title spell-set-option-text">
      <strong>${page.title || 'Без названия'}</strong>
      <small>${getPageShortDescription(page) || 'Без описания'}</small>
    </span>
  `;
}


function createSpellChipHTML(
  page
) {

  return `
    ${getPageIcon(page.tags)}

    <span class="spell-set-text">
      <strong>${page.title || 'Без названия'}</strong>
      <small>${getPageShortDescription(page) || 'Без описания'}</small>
    </span>

    <span
      class="spell-set-remove"
      title="Убрать из набора"
    >
      ×
    </span>
  `;
}


function getPageShortDescription(
  page
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    String(page.content || '')
      .replace(/---[\s\S]*?---/, '')
      .trim();

  return wrapper
    .querySelector('.card-short-description')
    ?.textContent
    .trim() || '';
}
