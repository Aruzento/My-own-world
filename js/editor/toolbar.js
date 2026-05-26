import {
  saveCurrentPage
} from './editor.js';

import {
  createLinkFromSelection
} from './links.js';

import {
  clearInlineFormattingWithHistory,
  formatSelectedBlockWithHistory,
  runInlineFormattingCommandWithHistory
} from './formattingService.js';

import {
  isSelectionInsidePersistentEditable
} from './contenteditablePolicy.js';

import {
  positionToolbar,
  positionColorPopup
} from './toolbarPosition.js';

import {
  updateToolbarActiveState
} from './toolbarActiveState.js';

import {
  applyToolbarColor,
  renderRecentColors
} from './toolbarTextColor.js';

let lastSelectionRange =
  null;

let isPointerSelectingText =
  false;

let hasDeferredSelectionUpdate =
  false;

export function setupFloatingToolbar() {

  const toolbar =
    document.getElementById(
      'floatingToolbar'
    );

  if (!toolbar) return;

  const colorPicker =
    document.getElementById(
      'textColorPicker'
    );

  const recentColors =
    document.getElementById(
      'toolbarRecentColors'
    );

  const colorPopup =
    document.getElementById(
      'toolbarColorPopup'
    );

  const colorButton =
    document.getElementById(
      'toolbarColorButton'
    );

  moveColorPopupToBody(
    colorPopup
  );

  renderRecentColors(
    recentColors,
    colorPicker
  );

  setupSelectionTracking(
    toolbar
  );

  setupToolbarClicks(
    toolbar,
    {
      colorPicker,
      recentColors,
      colorPopup,
      colorButton
    }
  );

  setupColorPopupClicks(
    toolbar,
    {
      colorPicker,
      recentColors,
      colorPopup,
      colorButton
    }
  );
}

function moveColorPopupToBody(
  colorPopup
) {

  if (
    colorPopup &&
    colorPopup.parentElement !== document.body
  ) {

    document.body.appendChild(
      colorPopup
    );
  }
}

function setupSelectionTracking(
  toolbar
) {

  document.addEventListener(
    'pointerdown',
    event => {

      if (
        event.button !== 0 ||
        toolbar.contains(event.target)
      ) return;

      isPointerSelectingText =
        Boolean(
          event.target.closest(
            '[contenteditable="true"]'
          )
        );

      if (isPointerSelectingText) {

        hasDeferredSelectionUpdate =
          false;

        // Toolbar показывается только после pointerup, чтобы не мешать выделению.
        toolbar.classList.add(
          'hidden'
        );
      }
    },
    true
  );

  document.addEventListener(
    'pointerup',
    () => {

      if (!isPointerSelectingText) return;

      isPointerSelectingText =
        false;

      if (hasDeferredSelectionUpdate) {

        hasDeferredSelectionUpdate =
          false;

        updateToolbarForSelection(
          toolbar
        );
      }
    },
    true
  );

  document.addEventListener(
    'selectionchange',
    () => {

      if (isPointerSelectingText) {

        hasDeferredSelectionUpdate =
          true;

        toolbar.classList.add(
          'hidden'
        );

        return;
      }

      updateToolbarForSelection(
        toolbar
      );
    }
  );
}

function setupToolbarClicks(
  toolbar,
  colorControls
) {

  toolbar.addEventListener(
    'mousedown',
    event => {

      if (
        event.target.closest(
          '.toolbar-color-popup'
        )
      ) return;

      event.preventDefault();
    }
  );

  toolbar.addEventListener(
    'pointerdown',
    event => {

      const colorButtonTarget =
        event.target.closest(
          '[data-action="color-popup"]'
        );

      if (!colorButtonTarget) return;

      event.preventDefault();
      event.stopPropagation();

      toggleColorPopup(
        colorControls.colorPopup,
        colorControls.colorButton
      );
    }
  );

  toolbar.addEventListener(
    'click',
    async event => {

      const button =
        event.target.closest(
          'button'
        );

      if (!button) return;

      await handleToolbarButtonClick(
        toolbar,
        button,
        colorControls
      );
    }
  );
}

async function handleToolbarButtonClick(
  toolbar,
  button,
  colorControls
) {

  const command =
    button.dataset.command;

  const block =
    button.dataset.block;

  const action =
    button.dataset.action;

  if (command) {

    runInlineFormattingCommandWithHistory(
      command
    );
  }

  if (block) {

    restoreLastSelection();

    formatSelectedBlockWithHistory(
      block
    );
  }

  if (action === 'link') {

    restoreLastSelection();

    createLinkFromSelection();
  }

  if (action === 'clear-format') {

    restoreLastSelection();

    clearInlineFormattingWithHistory();
  }

  if (action === 'color-popup') {

    return;
  }

  if (action === 'apply-color') {

    await applySelectedColor(
      toolbar,
      colorControls
    );

    return;
  }

  await saveCurrentPage();

  updateToolbarActiveState(
    toolbar
  );
}

function setupColorPopupClicks(
  toolbar,
  colorControls
) {

  const {
    colorPicker,
    recentColors,
    colorPopup,
    colorButton
  } = colorControls;

  colorPopup
    ?.addEventListener(
      'click',
      async event => {

        const button =
          event.target.closest(
            '[data-action="apply-color"]'
          );

        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        await applySelectedColor(
          toolbar,
          colorControls
        );
      }
    );

  colorPicker
    ?.addEventListener(
      'change',
      async event => {

        await applySelectedColor(
          toolbar,
          {
            ...colorControls,
            color: event.target.value
          }
        );
      }
    );

  recentColors
    ?.addEventListener(
      'click',
      async event => {

        const button =
          event.target.closest(
            '[data-color]'
          );

        if (!button) return;

        if (colorPicker) {

          colorPicker.value =
            button.dataset.color;
        }

        await applySelectedColor(
          toolbar,
          {
            ...colorControls,
            color: button.dataset.color
          }
        );
      }
    );

  document.addEventListener(
    'mousedown',
    event => {

      if (
        colorPopup?.classList.contains('hidden') ||
        colorPopup?.contains(event.target) ||
        colorButton?.contains(event.target)
      ) return;

      colorPopup.classList.add(
        'hidden'
      );
    }
  );
}

async function applySelectedColor(
  toolbar,
  colorControls
) {

  restoreLastSelection();

  applyToolbarColor(
    colorControls.colorPicker,
    colorControls.recentColors,
    colorControls.color || colorControls.colorPicker?.value,
    colorControls.colorButton
  );

  colorControls.colorPopup?.classList.add(
    'hidden'
  );

  await saveCurrentPage();

  updateToolbarActiveState(
    toolbar
  );
}

function updateToolbarForSelection(
  toolbar
) {

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) {

    toolbar.classList.add(
      'hidden'
    );

    return;
  }

  const text =
    selection.toString().trim();

  if (
    !text ||
    !isSelectionInsidePersistentEditable(selection)
  ) {

    toolbar.classList.add(
      'hidden'
    );

    return;
  }

  const range =
    selection.getRangeAt(0);

  lastSelectionRange =
    range.cloneRange();

  const rect =
    range.getBoundingClientRect();

  toolbar.classList.remove(
    'hidden'
  );

  updateToolbarActiveState(
    toolbar,
    selection
  );

  positionToolbar(
    toolbar,
    rect
  );
}

function restoreLastSelection() {

  if (!lastSelectionRange) return false;

  const selection =
    window.getSelection();

  if (!selection) return false;

  selection.removeAllRanges();
  selection.addRange(
    lastSelectionRange
  );

  return true;
}

function toggleColorPopup(
  popup,
  button
) {

  if (!popup || !button) return;

  const shouldOpen =
    popup.classList.contains(
      'hidden'
    );

  popup.classList.toggle(
    'hidden',
    !shouldOpen
  );

  if (shouldOpen) {

    positionColorPopup(
      popup,
      button
    );
  }
}
