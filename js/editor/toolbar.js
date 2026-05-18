import {
  saveCurrentPage
} from './editor.js';

import {
  createLinkFromSelection
} from './links.js';

import {
  applyTextColor,
  clearInlineFormatting,
  runInlineFormattingCommand
} from './formattingService.js';

import {
  isSelectionInsidePersistentEditable
} from './contenteditablePolicy.js';

const RECENT_TEXT_COLORS_KEY =
  'myOwnWorld.recentTextColors';

const MAX_RECENT_TEXT_COLORS =
  5;

let lastSelectionRange =
  null;


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

  if (
    colorPopup &&
    colorPopup.parentElement !== document.body
  ) {

    document.body.appendChild(
      colorPopup
    );
  }

  renderRecentColors(
    recentColors,
    colorPicker
  );


  document.addEventListener(
    'selectionchange',
    () => {

      const selection =
        window.getSelection();

      if (
        !selection
        ||
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
  );


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
        colorPopup,
        colorButton
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


      const command =
        button.dataset.command;

      const block =
        button.dataset.block;

      const action =
        button.dataset.action;


      if (command) {

        runInlineFormattingCommand(
          command
        );
      }


      if (block) {

        restoreLastSelection();

        formatSelectedBlock(
          block
        );

        normalizeHeadings();
      }


      if (action === 'link') {

        restoreLastSelection();

        createLinkFromSelection();
      }

      if (action === 'clear-format') {

        restoreLastSelection();

        clearInlineFormatting();
      }

      if (action === 'color-popup') {

        return;
      }

      if (action === 'apply-color') {

        restoreLastSelection();

        applyToolbarColor(
          colorPicker,
          recentColors,
          colorPicker?.value,
          colorButton
        );

        colorPopup?.classList.add(
          'hidden'
        );
      }

      await saveCurrentPage();

      updateToolbarActiveState(
        toolbar
      );
    }
  );

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

        restoreLastSelection();

        applyToolbarColor(
          colorPicker,
          recentColors,
          colorPicker?.value,
          colorButton
        );

        colorPopup.classList.add(
          'hidden'
        );

        await saveCurrentPage();

        updateToolbarActiveState(
          toolbar
        );
      }
    );


  colorPicker
    ?.addEventListener(
      'change',
      async event => {

        restoreLastSelection();

        applyToolbarColor(
          colorPicker,
          recentColors,
          event.target.value,
          colorButton
        );

        await saveCurrentPage();

        updateToolbarActiveState(
          toolbar
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

        restoreLastSelection();

        if (colorPicker) {

          colorPicker.value =
            button.dataset.color;
        }

        applyToolbarColor(
          colorPicker,
          recentColors,
          button.dataset.color,
          colorButton
        );

        colorPopup?.classList.add(
          'hidden'
        );

        await saveCurrentPage();

        updateToolbarActiveState(
          toolbar
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


function positionToolbar(
  toolbar,
  rect
) {

  const margin =
    8;

  const width =
    toolbar.offsetWidth || 320;

  const height =
    toolbar.offsetHeight || 44;

  const center =
    rect.left + rect.width / 2;

  const left =
    clamp(
      center,
      margin + width / 2,
      window.innerWidth - margin - width / 2
    );

  let top =
    rect.top - height - 10;

  if (top < margin) {

    top =
      rect.bottom + 10;
  }

  top =
    clamp(
      top,
      margin,
      window.innerHeight - margin - height
    );

  toolbar.style.left =
    `${left}px`;

  toolbar.style.top =
    `${top}px`;
}


function updateToolbarActiveState(
  toolbar,
  selection = window.getSelection()
) {

  toolbar
    .querySelectorAll('button.active')
    .forEach(button => {

      button.classList.remove(
        'active'
      );
    });

  if (
    !selection ||
    selection.rangeCount === 0
  ) return;

  const commandStates = {
    bold: queryCommandState('bold'),
    italic: queryCommandState('italic'),
    underline: queryCommandState('underline'),
    insertUnorderedList: queryCommandState('insertUnorderedList'),
    insertOrderedList: queryCommandState('insertOrderedList')
  };

  Object
    .entries(commandStates)
    .forEach(([command, active]) => {

      if (!active) return;

      toolbar
        .querySelector(`[data-command="${command}"]`)
        ?.classList.add(
          'active'
        );
    });

  const blockName =
    getSelectionBlockName(
      selection
    );

  if (blockName) {

    toolbar
      .querySelector(`[data-block="${blockName}"]`)
      ?.classList.add(
        'active'
      );
  }

  if (
    getSelectionElement(selection)
      ?.closest('a')
  ) {

    toolbar
      .querySelector('[data-action="link"]')
      ?.classList.add(
        'active'
      );
  }
}


function queryCommandState(
  command
) {

  try {

    return document.queryCommandState(
      command
    );

  } catch {

    return false;
  }
}


function getSelectionBlockName(
  selection
) {

  const element =
    getSelectionElement(
      selection
    );

  const block =
    element?.closest(
      'h1, h2, h3, h4, p, li'
    );

  if (!block) return '';

  if (
    block.tagName.toLowerCase() === 'li'
  ) {

    return '';
  }

  return block.tagName.toLowerCase();
}


function getSelectionElement(
  selection
) {

  if (
    !selection ||
    selection.rangeCount === 0
  ) return null;

  const node =
    selection.getRangeAt(0).commonAncestorContainer;

  return node.nodeType === Node.ELEMENT_NODE
    ? node
    : node.parentElement;
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


function applyToolbarColor(
  colorPicker,
  recentColors,
  color = colorPicker?.value,
  colorButton = null
) {

  if (!color) return false;

  const applied =
    applyTextColor(
      color
    );

  if (!applied) return false;

  const nextColors =
    rememberRecentColor(
      color
    );

  renderRecentColors(
    recentColors,
    colorPicker,
    nextColors
  );

  updateColorButton(
    colorButton,
    color
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


function positionColorPopup(
  popup,
  button
) {

  const rect =
    button.getBoundingClientRect();

  const margin =
    8;

  const width =
    popup.offsetWidth || 172;

  const height =
    popup.offsetHeight || 86;

  const left =
    clamp(
      rect.left + rect.width / 2 - width / 2,
      margin,
      window.innerWidth - margin - width
    );

  let top =
    rect.bottom + 8;

  if (top + height > window.innerHeight - margin) {

    top =
      rect.top - height - 8;
  }

  popup.style.left =
    `${left}px`;

  popup.style.top =
    `${clamp(top, margin, window.innerHeight - margin - height)}px`;
}


function updateColorButton(
  button,
  color
) {

  button
    ?.querySelector('.toolbar-color-button-swatch')
    ?.style.setProperty(
      '--current-text-color',
      color
    );
}


function rememberRecentColor(
  color
) {

  const normalized =
    normalizeColor(
      color
    );

  const colors =
    getRecentColors()
      .filter(item =>
        item !== normalized
      );

  colors.unshift(
    normalized
  );

  const nextColors =
    colors.slice(
      0,
      MAX_RECENT_TEXT_COLORS
    );

  localStorage.setItem(
    RECENT_TEXT_COLORS_KEY,
    JSON.stringify(nextColors)
  );

  return nextColors;
}


function renderRecentColors(
  container,
  colorPicker,
  colors = getRecentColors()
) {

  if (!container) return;

  container.innerHTML =
    '';

  colors
    .slice(
      0,
      MAX_RECENT_TEXT_COLORS
    )
    .forEach(color => {

      const button =
        document.createElement(
          'button'
        );

      button.type =
        'button';

      button.className =
        'toolbar-color-swatch';

      button.dataset.color =
        color;

      button.title =
        `Применить ${color}`;

      button.style.setProperty(
        '--swatch-color',
        color
      );

      if (
        colorPicker?.value?.toLowerCase() === color
      ) {

        button.classList.add(
          'is-current'
        );
      }

      container.appendChild(
        button
      );
    });
}


function getRecentColors() {

  try {

    const parsed =
      JSON.parse(
        localStorage.getItem(
          RECENT_TEXT_COLORS_KEY
        ) || '[]'
      );

    return Array.isArray(parsed)
      ? parsed
        .map(normalizeColor)
        .filter(Boolean)
      : [];

  } catch {

    return [];
  }
}


function normalizeColor(
  color
) {

  const value =
    String(color || '')
      .trim()
      .toLowerCase();

  return /^#[0-9a-f]{6}$/.test(value)
    ? value
    : '';
}


function formatSelectedBlock(
  tagName
) {

  const selection =
    window.getSelection();

  if (
    !selection
    ||
    selection.rangeCount === 0
  ) {

    return;
  }


  const range =
    selection.getRangeAt(0);

  let block =
    range.startContainer;


  if (
    block.nodeType === Node.TEXT_NODE
  ) {

    block =
      block.parentElement;
  }


  block =
    block.closest(
      'h1, h2, h3, h4, p, div'
    );


  if (!block) return;


  const newBlock =
    document.createElement(
      tagName
    );


  newBlock.innerHTML =
    block.innerHTML;


  Array.from(block.attributes)
    .forEach(attribute => {

      if (
        attribute.name === 'contenteditable'
        ||
        attribute.name === 'class'
        ||
        attribute.name.startsWith('data-')
      ) {

        newBlock.setAttribute(
          attribute.name,
          attribute.value
        );
      }
    });


  block.replaceWith(
    newBlock
  );


  placeCaretAtEnd(
    newBlock
  );
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


function normalizeHeadings() {

  const editor =
    document.getElementById(
      'editorArea'
    );

  const nestedHeadings =
    editor.querySelectorAll(
      'h1 h1, h1 h2, h1 h3, h1 h4, h2 h1, h2 h2, h2 h3, h2 h4, h3 h1, h3 h2, h3 h3, h3 h4, h4 h1, h4 h2, h4 h3, h4 h4'
    );


  nestedHeadings.forEach(heading => {

    const parentHeading =
      heading.closest(
        'h1, h2, h3, h4'
      );

    if (!parentHeading) return;

    parentHeading.innerHTML =
      heading.innerHTML;
  });
}


function placeCaretAtEnd(el) {

  const range =
    document.createRange();

  const selection =
    window.getSelection();

  range.selectNodeContents(el);

  range.collapse(false);

  selection.removeAllRanges();

  selection.addRange(range);
}
