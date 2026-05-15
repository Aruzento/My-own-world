import { state } from '../state.js';

import {
  saveCurrentPage
} from '../editor/editor.js';

import {
  getPageIcon
} from '../core/icons.js';


let activeSetList = null;


export function setupItemSets() {

  setupItemSetPicker();

  document.addEventListener(
    'click',
    async event => {

      const addButton =
        event.target.closest(
          '.item-set-add-btn'
        );

      const chip =
        event.target.closest(
          '.item-set-chip'
        );

      const removeButton =
        event.target.closest(
          '.item-set-remove'
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
          '.item-set-add-btn'
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
      '.item-set-block'
    );

  if (!block) return;

  activeSetList =
    block.querySelector(
      '.item-set-list'
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


  const rect =
    button.getBoundingClientRect();

  picker.style.left =
    `${Math.min(rect.left, window.innerWidth - 280)}px`;

  picker.style.top =
    `${rect.bottom + 8}px`;

  picker.classList.remove(
    'hidden'
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
      ? [...activeSetList.querySelectorAll('.item-set-chip')]
          .map(chip => chip.dataset.pageId)
      : [];


  const items =
    state.pages.filter(page => {

      if (
        !page.tags ||
        !page.tags.includes('item')
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
      'Предметы не найдены';

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

    button.innerHTML = `
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
    'item-set-chip';

  chip.dataset.pageId =
    page.id;

  chip.innerHTML = `
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
      '.item-set-chip'
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