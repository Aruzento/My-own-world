import { state } from '../state.js';

import {
  saveCurrentPage
} from '../editor/editor.js';

import {
  createPage,
  writePageContent
} from '../storage/storage.js';

import {
  getPageIcon
} from '../core/icons.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  positionPopupNearAnchor
} from './popupPosition.js';

import {
  notifyPageUpdated
} from '../repository/pageRepository.js';


let activeSetList = null;
let activeSetKind = 'items';


export function setupItemSets() {

  setupItemSetPicker();

  document.addEventListener(
    'click',
    async event => {

      const addButton =
        event.target.closest(
          '.item-set-add-btn, .spell-set-add-btn, .skill-set-add-btn, .universal-list-add-btn'
        );

      const chip =
        event.target.closest(
          '.item-set-chip, .spell-set-chip, .skill-set-chip, .universal-list-chip'
        );

      const removeButton =
        event.target.closest(
          '.item-set-remove, .spell-set-remove, .skill-set-remove'
        );

      if (
        event.target.closest('.item-set-quantity')
      ) {

        event.stopPropagation();
        return;
      }


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
    <div class="item-set-create-panel hidden">
      <button
        class="item-set-create-toggle"
        type="button"
      >
        Создать предмет
      </button>

      <div class="item-set-create-form hidden">
        <input
          class="item-set-create-title"
          type="text"
          placeholder="Название предмета"
        >

        <button
          class="item-set-create-confirm"
          type="button"
        >
          Создать
        </button>
      </div>
    </div>

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

  picker
    .querySelector('.item-set-create-toggle')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        const form =
          picker.querySelector('.item-set-create-form');

        form.classList.toggle(
          'hidden'
        );

        form
          .querySelector('.item-set-create-title')
          ?.focus();
      }
    );

  picker
    .querySelector('.item-set-create-confirm')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await createItemFromPicker();
      }
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
          '.item-set-add-btn, .spell-set-add-btn, .skill-set-add-btn'
          + ', .universal-list-add-btn'
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
      '.universal-list-block, .item-set-block, .spell-set-block, .skill-set-block'
    );

  if (!block) return;

  activeSetKind =
    getSetKindFromBlock(
      block
    );

  activeSetList =
    block.querySelector(
      getSetListSelector(
        activeSetKind,
        block
      )
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

  const createPanel =
    picker.querySelector(
      '.item-set-create-panel'
    );

  const createForm =
    picker.querySelector(
      '.item-set-create-form'
    );

  search.value = '';

  picker.querySelector('.item-set-create-title').value =
    '';

  createPanel.classList.toggle(
    'hidden',
    activeSetKind !== 'items'
  );

  createForm.classList.add(
    'hidden'
  );

  search.placeholder =
    getSearchPlaceholder(
      activeSetKind
    );

  updateUniversalListRuntimeText(
    block
  );


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


document.addEventListener(
  'change',
  async event => {

    const kindSelect =
      event.target.closest(
        '.universal-list-kind-select'
      );

    if (kindSelect) {

      const block =
        kindSelect.closest(
          '.universal-list-block'
        );

      if (!block) return;

      block.dataset.listKind =
        normalizeSetKind(
          kindSelect.value
        );

      kindSelect
        .querySelectorAll('option')
        .forEach(option => {

          option.toggleAttribute(
            'selected',
            option.value === block.dataset.listKind
          );
        });

      updateUniversalListRuntimeText(
        block
      );

      await saveCurrentPage();

      return;
    }

    const countInput =
      event.target.closest('.item-set-quantity');

    if (!countInput) return;

    const value =
      Math.max(
        1,
        Math.floor(
          Number(countInput.value) || 1
        )
      );

    countInput.value =
      String(value);

    countInput.setAttribute(
      'value',
      String(value)
    );

    await saveCurrentPage();
  }
);


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
      ? [...activeSetList.querySelectorAll('.item-set-chip, .spell-set-chip, .skill-set-chip')]
          .concat([
            ...activeSetList.querySelectorAll('.universal-list-chip')
          ])
          .map(chip => chip.dataset.pageId)
      : [];


  const items =
    state.pages.filter(page => {

      const expectedType =
        getExpectedPageType(
          activeSetKind
        );

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
      getEmptyText(
        activeSetKind
      );

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
      activeSetKind === 'spells' ||
      activeSetKind === 'skills'
        ? createSetOptionHTML(page)
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
    activeSetList.closest('.universal-list-block')
      ? `universal-list-chip ${getChipClassForKind(activeSetKind)}`
      : activeSetKind === 'spells'
      ? 'spell-set-chip'
      : activeSetKind === 'skills'
        ? 'skill-set-chip'
      : 'item-set-chip';

  chip.dataset.pageId =
    page.id;

  chip.innerHTML =
    activeSetKind === 'spells' ||
    activeSetKind === 'skills' ||
    activeSetKind === 'characters' ||
    activeSetKind === 'creatures' ||
    activeSetKind === 'objects'
      ? createSpellChipHTML(page)
      : `
        ${getPageIcon(page.tags)}

        <span class="item-set-title">
          ${page.title || 'Без названия'}
        </span>

        <label class="item-set-quantity-label" title="Количество">
          <input
            class="item-set-quantity"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            value="1"
          >
        </label>

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


async function createItemFromPicker() {

  if (
    activeSetKind !== 'items' ||
    !activeSetList
  ) return;

  const picker =
    document.getElementById(
      'itemSetPicker'
    );

  const input =
    picker.querySelector(
      '.item-set-create-title'
    );

  const title =
    input.value.trim();

  if (!title) {

    input.focus();
    return;
  }

  const page =
    await createPage(
      'card',
      null,
      title
    );

  page.type =
    'item';

  page.tags =
    ['card', 'item'];

  page.content =
    page.content
      .replace(/^tags:\s*\[[^\]]*\]/m, 'tags: [card, item]')
      .replace(/^type:\s*.*$/m, 'type: item');

  await writePageContent(
    page,
    page.content
  );

  notifyPageUpdated();

  renderTree();

  await addItemToSet(
    page
  );
}


async function removeItemFromSet(
  button
) {

  const chip =
    button.closest(
      '.item-set-chip, .spell-set-chip, .skill-set-chip'
      + ', .universal-list-chip'
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


function getSetKindFromBlock(
  block
) {

  if (block.classList.contains('spell-set-block')) return 'spells';
  if (block.classList.contains('skill-set-block')) return 'skills';
  if (block.classList.contains('universal-list-block')) {

    const selected =
      block.querySelector('.universal-list-kind-select')
        ?.value ||
      block.dataset.listKind;

    return normalizeSetKind(
      selected
    );
  }

  return 'items';
}


function getSetListSelector(
  kind,
  block = null
) {

  if (
    block?.classList?.contains(
      'universal-list-block'
    )
  ) {

    return '.universal-list-list';
  }

  if (kind === 'spells') return '.spell-set-list';
  if (kind === 'skills') return '.skill-set-list';
  return '.item-set-list';
}


function getExpectedPageType(
  kind
) {

  if (kind === 'spells') return 'magic';
  if (kind === 'skills') return 'skill';
  if (kind === 'characters') return 'character';
  if (kind === 'creatures') return 'creature';
  if (kind === 'objects') return 'object';
  return 'item';
}


function getSearchPlaceholder(
  kind
) {

  if (kind === 'spells') return 'Найти заклинание...';
  if (kind === 'skills') return 'Найти навык...';
  if (kind === 'characters') return 'Найти персонажа...';
  if (kind === 'creatures') return 'Найти существо...';
  if (kind === 'objects') return 'Найти объект...';
  return 'Найти предмет...';
}


function getEmptyText(
  kind
) {

  if (kind === 'spells') return 'Заклинания не найдены';
  if (kind === 'skills') return 'Навыки не найдены';
  if (kind === 'characters') return 'Персонажи не найдены';
  if (kind === 'creatures') return 'Существа не найдены';
  if (kind === 'objects') return 'Объекты не найдены';
  return 'Предметы не найдены';
}


function createSetOptionHTML(
  page
) {

  if (
    activeSetKind === 'skills' ||
    activeSetKind === 'characters' ||
    activeSetKind === 'creatures' ||
    activeSetKind === 'objects'
  ) {

    return `
      ${getPageIcon(page.tags)}

      <span class="item-set-option-title">
        ${page.title || 'Без названия'}
      </span>
    `;
  }

  if (activeSetKind === 'spells') {

    return `
      ${getPageIcon(page.tags)}

      <span class="item-set-option-title spell-set-option-text">
        <strong>${page.title || 'Без названия'}</strong>
      </span>
    `;
  }

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

  const textClass =
    activeSetKind === 'skills'
      ? 'skill-set-text'
      : 'spell-set-text';

  const removeClass =
    activeSetKind === 'skills'
      ? 'skill-set-remove'
      : 'spell-set-remove';

  return `
    ${getPageIcon(page.tags)}

    <span class="${textClass}">
      <strong>${page.title || 'Без названия'}</strong>
      <small>${getPageShortDescription(page) || 'Без описания'}</small>
    </span>

    <span
      class="${removeClass}"
      title="Убрать из набора"
    >
      ×
    </span>
  `;
}


function normalizeSetKind(
  kind
) {

  return [
    'items',
    'spells',
    'skills',
    'characters',
    'creatures',
    'objects'
  ].includes(kind)
    ? kind
    : 'items';
}


function getChipClassForKind(
  kind
) {

  if (kind === 'spells') return 'spell-set-chip';
  if (kind === 'skills') return 'skill-set-chip';
  return 'item-set-chip';
}


function updateUniversalListRuntimeText(
  block
) {

  if (
    !block?.classList?.contains(
      'universal-list-block'
    )
  ) return;

  const kind =
    getSetKindFromBlock(
      block
    );

  const button =
    block.querySelector(
      '.universal-list-add-btn'
    );

  if (button) {

    button.textContent =
      `+ Добавить ${getAddButtonNoun(kind)}`;
  }
}


function getAddButtonNoun(
  kind
) {

  const nouns = {
    items: 'предмет',
    spells: 'заклинание',
    skills: 'навык',
    characters: 'персонажа',
    creatures: 'существо',
    objects: 'объект'
  };

  return nouns[kind] || 'элемент';
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
