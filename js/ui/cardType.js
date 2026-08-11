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
  registerPopup
} from './popupManager.js';

import {
  markRuntime
} from '../editor/blocks/blockContract.js';

import {
  getPageIcon
} from '../core/icons.js';

const CARD_TYPE_LABELS = {
  character: 'Персонаж',
  creature: 'Существо',
  location: 'Локация',
  region: 'Регион',
  folder: 'Папка',
  magic: 'Магия',
  skill: 'Навык',
  object: 'Объект',
  item: 'Предмет',
  lore: 'Лор',
  note: 'Заметка'
};

let nextCardTypeControlId =
  0;


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

  document.addEventListener(
    'keydown',
    handleCardTypeKeyDown
  );
}


export function renderCardType() {

  if (!state.currentPage) return;

  const select =
    document.querySelector(
      '.card-type-select'
    );

  if (!select) return;

  cleanupDetachedCardTypeMenus();

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

    const custom =
      select.nextElementSibling;

    markRuntime(
      custom
    );

    ensureCardTypeControlContract(
      select,
      custom
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
    <div class="card-type-trigger">
      <span class="card-type-current"></span>
      <span class="card-type-arrow"></span>
    </div>

    <div class="card-type-menu hidden">
      ${Object
        .entries(CARD_TYPE_LABELS)
        .map(([value, label]) => `
          <div
            class="card-type-option"
            data-value="${value}"
            data-popup-drag-ignore="true"
          >
            ${getPageIcon([value])}
            <span class="card-type-option-label">${label}</span>
          </div>
        `)
        .join('')}
    </div>
  `;

  ensureCardTypeControlContract(
    select,
    custom
  );

  select.after(
    custom
  );
}


function syncCustomCardType(
  select
) {

  const custom =
    select?.nextElementSibling;

  if (
    !custom?.classList.contains('card-type-custom')
  ) return;

  const value =
    select.value || 'note';

  const trigger =
    custom.querySelector('.card-type-trigger');

  const isOpen =
    custom.classList.contains('is-open');

  custom
    .querySelector('.card-type-current')
    .textContent =
      CARD_TYPE_LABELS[value] || CARD_TYPE_LABELS.note;

  getCardTypeOptions(
    custom
  )
    .forEach(option => {

      const isSelected =
        option.dataset.value === value;

      option.classList.toggle(
        'is-selected',
        isSelected
      );

      if (!isOpen) {

        option.classList.remove(
          'is-active'
        );

        option.setAttribute(
          'aria-selected',
          String(isSelected)
        );
      }
    });

  if (
    trigger &&
    !isOpen
  ) {

    trigger.setAttribute(
      'aria-expanded',
      'false'
    );

    trigger.removeAttribute(
      'aria-activedescendant'
    );
  }
}


function toggleCustomCardType(
  custom
) {

  if (!custom) return;

  const menu =
    getCardTypeMenu(
      custom
    );

  const willOpen =
    menu?.classList.contains('hidden');

  if (!willOpen) {

    closeCardTypeDropdown(
      custom,
      {
        restoreFocus:
          true
      }
    );

    return;
  }

  openCardTypeDropdown(
    custom
  );
}


function openCardTypeDropdown(
  custom,
  {
    activeValue = null
  } = {}
) {

  if (!custom) return;

  const select =
    custom.previousElementSibling;

  const trigger =
    custom.querySelector('.card-type-trigger');

  const menu =
    getCardTypeMenu(
      custom
    );

  if (
    !select ||
    !trigger ||
    !menu
  ) return;

  closeAllCardTypeDropdowns(
    custom
  );

  custom.classList.add(
    'is-open'
  );

  trigger.setAttribute(
    'aria-expanded',
    'true'
  );

  setActiveCardTypeOption(
    custom,
    activeValue || select.value || 'note'
  );

  attachCardTypeMenuToOverlayLayer(
    custom
  );

  const controller =
    ensureCardTypePopupController(
      custom
    );

  const positioningOptions = {
    gap:
      6,
    fallbackWidth:
      360,
    fallbackHeight:
      280
  };

  controller?.openNearAnchor(
    custom
      .querySelector('.card-type-trigger'),
    positioningOptions
  );

  requestAnimationFrame(
    () => {

      if (
        !custom.classList.contains('is-open')
      ) return;

      controller?.openNearAnchor(
        trigger,
        positioningOptions
      );
    }
  );
}


function closeCardTypeDropdown(
  custom,
  {
    restoreFocus = false
  } = {}
) {

  if (!custom) return;

  const trigger =
    custom.querySelector('.card-type-trigger');

  const menu =
    getCardTypeMenu(
      custom
    );

  custom.classList.remove(
    'is-open'
  );

  menu?.classList.add(
    'hidden'
  );

  if (menu) {

    menu.dataset.popupOpen =
      'false';

    menu.dataset.overlayState =
      'closed';
  }

  trigger?.setAttribute(
    'aria-expanded',
    'false'
  );

  trigger?.removeAttribute(
    'aria-activedescendant'
  );

  syncCustomCardType(
    custom.previousElementSibling
  );

  if (
    restoreFocus &&
    trigger &&
    typeof trigger.focus === 'function'
  ) {

    trigger.focus({
      preventScroll:
        true
    });
  }
}


function selectCustomCardType(
  option
) {

  const custom =
    option
      .closest('.card-type-menu')
      ?.__cardTypeCustom ||
    option.closest('.card-type-custom');

  const select =
    custom?.previousElementSibling;

  if (!select) return;

  select.value =
    option.dataset.value;

  syncCustomCardType(
    select
  );

  select.dispatchEvent(
    new Event(
      'change',
      {
        bubbles: true
      }
    )
  );

  closeCardTypeDropdown(
    custom,
    {
      restoreFocus:
        true
    }
  );
}


function closeAllCardTypeDropdowns(
  exceptCustom = null
) {

  document
    .querySelectorAll('.card-type-custom')
    .forEach(custom => {

      if (custom === exceptCustom) return;

      closeCardTypeDropdown(
        custom
      );
    });
}


function getCardTypeMenu(
  custom
) {

  return custom?.__cardTypeMenu ||
    custom?.querySelector('.card-type-menu') ||
    null;
}


function attachCardTypeMenuToOverlayLayer(
  custom
) {

  const menu =
    getCardTypeMenu(
      custom
    );

  if (!menu) return null;

  custom.__cardTypeMenu =
    menu;

  menu.__cardTypeCustom =
    custom;

  menu.dataset.cardTypeOverlay =
    'true';

  if (menu.parentElement !== document.body) {

    document.body.appendChild(
      menu
    );
  }

  return menu;
}


function cleanupDetachedCardTypeMenus() {

  document
    .querySelectorAll('.card-type-menu[data-card-type-overlay="true"]')
    .forEach(menu => {

      if (
        menu.__cardTypeCustom?.isConnected
      ) return;

      menu.remove();
    });
}


function ensureCardTypeControlContract(
  select,
  custom
) {

  if (
    !select ||
    !custom
  ) return;

  const controlId =
    select.dataset.cardTypeControlId ||
    `card-type-${++nextCardTypeControlId}`;

  select.dataset.cardTypeControlId =
    controlId;

  select.tabIndex =
    -1;

  select.setAttribute(
    'aria-hidden',
    'true'
  );

  const row =
    select.closest('.card-type-row');

  const label =
    row?.querySelector('.card-type-label');

  if (
    label &&
    !label.id
  ) {

    label.id =
      `${controlId}-label`;
  }

  const trigger =
    custom.querySelector('.card-type-trigger');

  const menu =
    getCardTypeMenu(
      custom
    );

  if (
    !trigger ||
    !menu
  ) return;

  custom.__cardTypeMenu =
    menu;

  menu.__cardTypeCustom =
    custom;

  menu.dataset.cardTypeOverlay =
    'true';

  trigger.id =
    `${controlId}-combobox`;

  trigger.tabIndex =
    0;

  trigger.setAttribute(
    'role',
    'combobox'
  );

  trigger.setAttribute(
    'aria-haspopup',
    'listbox'
  );

  trigger.setAttribute(
    'aria-expanded',
    'false'
  );

  trigger.setAttribute(
    'aria-controls',
    `${controlId}-listbox`
  );

  if (label?.id) {

    trigger.setAttribute(
      'aria-labelledby',
      label.id
    );

  } else {

    trigger.setAttribute(
      'aria-label',
      'Тип карточки'
    );
  }

  menu.id =
    `${controlId}-listbox`;

  menu.setAttribute(
    'role',
    'listbox'
  );

  menu.dataset.overlayKind =
    'popover';

  menu.dataset.overlayModal =
    'false';

  if (label?.id) {

    menu.setAttribute(
      'aria-labelledby',
      label.id
    );

  } else {

    menu.setAttribute(
      'aria-label',
      'Тип карточки'
    );
  }

  getCardTypeOptions(
    custom
  )
    .forEach(option => {

      const value =
        option.dataset.value || 'note';

      option.id =
        `${controlId}-option-${value}`;

      option.setAttribute(
        'role',
        'option'
      );

      option.setAttribute(
        'aria-selected',
        'false'
      );

      option.setAttribute(
        'data-popup-drag-ignore',
        'true'
      );
    });

  ensureCardTypePopupController(
    custom
  );
}


function ensureCardTypePopupController(
  custom
) {

  if (!custom) return null;

  if (custom.__cardTypePopupController) {

    return custom.__cardTypePopupController;
  }

  const trigger =
    custom.querySelector('.card-type-trigger');

  const menu =
    getCardTypeMenu(
      custom
    );

  if (
    !trigger ||
    !menu
  ) return null;

  custom.__cardTypePopupController =
    registerPopup({
      popup:
        menu,
      close:
        () => closeCardTypeDropdown(
          custom
        ),
      anchors:
        [
          trigger
        ],
      key:
        menu.id,
      kind:
        'popover'
    });

  return custom.__cardTypePopupController;
}


function handleCardTypeKeyDown(
  event
) {

  const trigger =
    event.target?.closest?.('.card-type-trigger');

  if (!trigger) return;

  const custom =
    trigger.closest('.card-type-custom');

  if (!custom) return;

  const isOpen =
    custom.classList.contains('is-open');

  if (
    event.key === 'ArrowDown'
  ) {

    event.preventDefault();

    if (!isOpen) {

      openCardTypeDropdown(
        custom
      );

      return;
    }

    moveActiveCardTypeOption(
      custom,
      1
    );

    return;
  }

  if (
    event.key === 'ArrowUp'
  ) {

    event.preventDefault();

    if (!isOpen) {

      openCardTypeDropdown(
        custom
      );

      return;
    }

    moveActiveCardTypeOption(
      custom,
      -1
    );

    return;
  }

  if (
    event.key === 'Home' &&
    isOpen
  ) {

    event.preventDefault();

    setActiveCardTypeOptionByIndex(
      custom,
      0
    );

    return;
  }

  if (
    event.key === 'End' &&
    isOpen
  ) {

    event.preventDefault();

    const options =
      getCardTypeOptions(
        custom
      );

    setActiveCardTypeOptionByIndex(
      custom,
      options.length - 1
    );

    return;
  }

  if (
    event.key === 'Escape' &&
    isOpen
  ) {

    event.preventDefault();

    closeCardTypeDropdown(
      custom,
      {
        restoreFocus:
          true
      }
    );

    return;
  }

  if (
    event.key === 'Enter' ||
    event.key === ' '
  ) {

    event.preventDefault();

    if (!isOpen) {

      openCardTypeDropdown(
        custom
      );

      return;
    }

    selectActiveCardTypeOption(
      custom
    );

    return;
  }

  if (
    event.key === 'Tab' &&
    isOpen
  ) {

    selectActiveCardTypeOption(
      custom,
      {
        restoreFocus:
          false
      }
    );

    return;
  }

  if (
    isPrintableKey(
      event
    )
  ) {

    event.preventDefault();

    focusCardTypeOptionByPrefix(
      custom,
      event.key
    );
  }
}


function selectActiveCardTypeOption(
  custom,
  {
    restoreFocus = true
  } = {}
) {

  const trigger =
    custom?.querySelector('.card-type-trigger');

  const activeId =
    trigger?.getAttribute('aria-activedescendant');

  const option =
    activeId
      ? document.getElementById(activeId)
      : getSelectedCardTypeOption(custom);

  if (!option) return;

  if (!restoreFocus) {

    const select =
      custom.previousElementSibling;

    select.value =
      option.dataset.value;

    syncCustomCardType(
      select
    );

    select.dispatchEvent(
      new Event(
        'change',
        {
          bubbles:
            true
        }
      )
    );

    closeCardTypeDropdown(
      custom
    );

    return;
  }

  selectCustomCardType(
    option
  );
}


function moveActiveCardTypeOption(
  custom,
  direction
) {

  const options =
    getCardTypeOptions(
      custom
    );

  if (!options.length) return;

  const trigger =
    custom.querySelector('.card-type-trigger');

  const activeId =
    trigger?.getAttribute('aria-activedescendant');

  const activeIndex =
    options.findIndex(option =>
      option.id === activeId
    );

  const selectedIndex =
    options.indexOf(
      getSelectedCardTypeOption(
        custom
      )
    );

  const baseIndex =
    activeIndex >= 0
      ? activeIndex
      : Math.max(0, selectedIndex);

  setActiveCardTypeOptionByIndex(
    custom,
    baseIndex + direction
  );
}


function setActiveCardTypeOptionByIndex(
  custom,
  index
) {

  const options =
    getCardTypeOptions(
      custom
    );

  if (!options.length) return;

  const nextIndex =
    (index + options.length) % options.length;

  setActiveCardTypeOption(
    custom,
    options[nextIndex].dataset.value
  );
}


function setActiveCardTypeOption(
  custom,
  value
) {

  const trigger =
    custom?.querySelector('.card-type-trigger');

  const options =
    getCardTypeOptions(
      custom
    );

  const activeOption =
    options.find(option =>
      option.dataset.value === value
    ) || options[0];

  if (
    !trigger ||
    !activeOption
  ) return;

  options.forEach(option => {

    const isActive =
      option === activeOption;

    option.classList.toggle(
      'is-active',
      isActive
    );

    option.setAttribute(
      'aria-selected',
      String(isActive)
    );
  });

  trigger.setAttribute(
    'aria-activedescendant',
    activeOption.id
  );

  activeOption.scrollIntoView({
    block:
      'nearest',
    inline:
      'nearest'
  });
}


function getCardTypeOptions(
  custom
) {

  return Array.from(
    getCardTypeMenu(
      custom
    )?.querySelectorAll('.card-type-option') || []
  );
}


function getSelectedCardTypeOption(
  custom
) {

  const select =
    custom?.previousElementSibling;

  const value =
    select?.value || 'note';

  return getCardTypeOptions(
    custom
  ).find(option =>
    option.dataset.value === value
  );
}


function focusCardTypeOptionByPrefix(
  custom,
  prefix
) {

  if (
    !custom.classList.contains('is-open')
  ) {

    openCardTypeDropdown(
      custom
    );
  }

  const normalizedPrefix =
    String(prefix || '')
      .trim()
      .toLocaleLowerCase();

  if (!normalizedPrefix) return;

  const option =
    getCardTypeOptions(
      custom
    ).find(candidate => {

      const label =
        candidate
          .querySelector('.card-type-option-label')
          ?.textContent
          ?.trim()
          ?.toLocaleLowerCase() || '';

      return label.startsWith(
        normalizedPrefix
      );
    });

  if (!option) return;

  setActiveCardTypeOption(
    custom,
    option.dataset.value
  );
}


function isPrintableKey(
  event
) {

  return event.key?.length === 1 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey;
}
