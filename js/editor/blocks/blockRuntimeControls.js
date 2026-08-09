import {
  ensureTableControls
} from './blockTableContract.js';

import {
  ensurePropertySettingsControls
} from '../propertiesSettingsPopup.js';

import {
  refreshPropertiesAutoCalculations,
  setupPropertiesAutoCalculations
} from '../propertiesAutoCalculations.js';

import {
  ensureRuntimeButton,
  ensureRuntimeInput,
  getMatchingElements,
  markRuntime
} from './blockRuntime.js';

const CARD_SHORT_DESCRIPTION_LIMIT =
  250;

const boundShortDescriptionFields =
  new WeakSet();

export function ensureRuntimeControls(
  editor
) {

  ensureItemSetControls(
    editor
  );

  ensureSpellSetControls(
    editor
  );

  ensureSkillSetControls(
    editor
  );

  ensureTableControls(
    editor
  );

  ensureImageBlockControls(
    editor
  );

  ensurePropertySettingsControls(
    editor
  );

  setupPropertiesAutoCalculations(
    editor
  );

  refreshPropertiesAutoCalculations(
    editor
  );

  ensureCardShellControls(
    editor
  );
}

function ensureCardShellControls(
  editor
) {

  ensureCardHeaderLayout(
    editor
  );

  editor
    .querySelectorAll('.card-meta')
    .forEach(meta => {

      configureInlineMetaInput(
        ensureRuntimeInput(
          meta,
          '.inline-tag-input',
          'inline-tag-input',
          'тег'
        ),
        'Тег'
      );

      configureInlineMetaButton(
        ensureRuntimeButton(
          meta,
          '.inline-add-tag-btn',
          'inline-add-tag-btn',
          '+'
        ),
        'Добавить тег'
      );
    });

  editor
    .querySelectorAll('.aliases-meta')
    .forEach(meta => {

      configureInlineMetaInput(
        ensureRuntimeInput(
          meta,
          '.inline-alias-input',
          'inline-alias-input',
          'псевдоним'
        ),
        'Псевдоним'
      );

      configureInlineMetaButton(
        ensureRuntimeButton(
          meta,
          '.inline-add-alias-btn',
          'inline-add-alias-btn',
          '+'
        ),
        'Добавить псевдоним'
      );
    });

  ensureCardShortDescriptionLimits(
    editor
  );

  editor
    .querySelectorAll('.media-box.is-portrait')
    .forEach(mediaBox => {

      ensureRuntimeButton(
        mediaBox,
        '.upload-portrait-btn',
        'upload-portrait-btn',
        '+ Изображение'
      );
    });
}

function ensureCardHeaderLayout(
  editor
) {

  editor
    .querySelectorAll('.entity-header')
    .forEach(header => {

      const main =
        header.querySelector(':scope > .entity-header-main');

      if (!main) return;

      let toolbar =
        header.querySelector(':scope > .entity-header-toolbar');

      if (!toolbar) {

        toolbar =
          document.createElement('div');

        toolbar.className =
          'entity-header-toolbar';

        toolbar.setAttribute(
          'contenteditable',
          'false'
        );

        header.insertBefore(
          toolbar,
          main
        );
      }

      let navSlot =
        toolbar.querySelector(':scope > .entity-header-nav-slot');

      if (!navSlot) {

        navSlot =
          document.createElement('div');

        navSlot.className =
          'entity-header-nav-slot';

        navSlot.setAttribute(
          'contenteditable',
          'false'
        );

        toolbar.prepend(
          navSlot
        );
      }

      const cardMeta =
        header.querySelector('.card-meta');

      if (
        cardMeta &&
        cardMeta.parentElement !== toolbar
      ) {

        toolbar.appendChild(
          cardMeta
        );
      }

      const nav =
        header.querySelector('.editor-page-nav');

      if (
        nav &&
        nav.parentElement !== navSlot
      ) {

        navSlot.appendChild(
          nav
        );
      }
    });
}

function ensureCardShortDescriptionLimits(
  editor
) {

  editor
    .querySelectorAll('.card-short-description')
    .forEach(field => {

      field.setAttribute(
        'aria-label',
        'Краткое описание карточки, до 250 символов'
      );

      const counter =
        ensureShortDescriptionCounter(
          field
        );

      normalizeShortDescriptionField(
        field,
        counter
      );

      if (
        boundShortDescriptionFields.has(
          field
        )
      ) return;

      field.addEventListener(
        'beforeinput',
        handleShortDescriptionBeforeInput
      );

      field.addEventListener(
        'input',
        () => normalizeShortDescriptionField(
          field,
          counter
        )
      );

      boundShortDescriptionFields.add(
        field
      );
    });
}

function ensureShortDescriptionCounter(
  field
) {

  const existing =
    field.nextElementSibling?.classList?.contains(
      'card-short-description-counter'
    )
      ? field.nextElementSibling
      : null;

  if (existing) {

    return markRuntime(
      existing
    );
  }

  const counter =
    document.createElement('span');

  counter.className =
    'card-short-description-counter';

  counter.setAttribute(
    'aria-hidden',
    'true'
  );

  markRuntime(
    counter
  );

  field.after(
    counter
  );

  return counter;
}

function handleShortDescriptionBeforeInput(
  event
) {

  const field =
    event.currentTarget;

  if (
    !field ||
    isShortDescriptionDeletion(
      event.inputType
    )
  ) return;

  const incoming =
    getShortDescriptionIncomingText(
      event
    );

  if (!incoming) return;

  const currentLength =
    field.textContent.length;

  const selectedLength =
    getSelectionLengthInside(
      field
    );

  const available =
    CARD_SHORT_DESCRIPTION_LIMIT -
    (currentLength - selectedLength);

  if (
    available >= incoming.length
  ) return;

  event.preventDefault();

  if (
    available <= 0
  ) return;

  insertPlainTextAtSelection(
    field,
    incoming.slice(
      0,
      available
    )
  );

  field.dispatchEvent(
    new Event(
      'input',
      {
        bubbles:
          true
      }
    )
  );
}

function normalizeShortDescriptionField(
  field,
  counter
) {

  const text =
    field.textContent || '';

  if (
    text.length >
    CARD_SHORT_DESCRIPTION_LIMIT
  ) {

    field.textContent =
      text.slice(
        0,
        CARD_SHORT_DESCRIPTION_LIMIT
      );

    if (
      document.activeElement === field
    ) {

      placeCaretAtEnd(
        field
      );
    }
  }

  updateShortDescriptionCounter(
    field,
    counter
  );
}

function updateShortDescriptionCounter(
  field,
  counter
) {

  if (!counter) return;

  counter.textContent =
    `${field.textContent.length}/${CARD_SHORT_DESCRIPTION_LIMIT}`;
}

function isShortDescriptionDeletion(
  inputType
) {

  return String(
    inputType || ''
  ).startsWith(
    'delete'
  );
}

function getShortDescriptionIncomingText(
  event
) {

  if (event.data) {

    return event.data;
  }

  if (
    event.clipboardData
  ) {

    return event.clipboardData.getData(
      'text/plain'
    );
  }

  if (
    event.dataTransfer
  ) {

    return event.dataTransfer.getData(
      'text/plain'
    );
  }

  return '';
}

function getSelectionLengthInside(
  field
) {

  const selection =
    window.getSelection?.();

  if (
    !selection ||
    selection.rangeCount === 0 ||
    !field.contains(selection.anchorNode) ||
    !field.contains(selection.focusNode)
  ) return 0;

  return selection
    .toString()
    .length;
}

function insertPlainTextAtSelection(
  field,
  text
) {

  const selection =
    window.getSelection?.();

  if (
    !selection ||
    selection.rangeCount === 0 ||
    !field.contains(selection.anchorNode) ||
    !field.contains(selection.focusNode)
  ) {

    field.textContent =
      `${field.textContent}${text}`;

    placeCaretAtEnd(
      field
    );

    return;
  }

  const range =
    selection.getRangeAt(
      0
    );

  range.deleteContents();
  range.insertNode(
    document.createTextNode(
      text
    )
  );
  range.collapse(
    false
  );

  selection.removeAllRanges();
  selection.addRange(
    range
  );
}

function placeCaretAtEnd(
  element
) {

  const range =
    document.createRange();

  range.selectNodeContents(
    element
  );

  range.collapse(
    false
  );

  const selection =
    window.getSelection?.();

  if (!selection) return;

  selection.removeAllRanges();
  selection.addRange(
    range
  );
}

function configureInlineMetaInput(
  input,
  label
) {

  if (!input) return;

  input.classList.add(
    'mow-input'
  );

  input.dataset.size =
    'sm';

  input.type =
    'text';

  input.setAttribute(
    'aria-label',
    label
  );
}


function configureInlineMetaButton(
  button,
  label
) {

  if (!button) return;

  button.classList.add(
    'mow-icon-button'
  );

  button.dataset.size =
    'sm';

  button.type =
    'button';

  button.setAttribute(
    'aria-label',
    label
  );

  button.title =
    label;
}

function ensureImageBlockControls(
  editor
) {

  getMatchingElements(
    editor,
    '.image-block'
  )
    .forEach(block => {

      const frame =
        block.querySelector('.image-block-frame');

      if (!frame) return;

      if (
        frame.querySelector('img[data-asset]')
      ) return;

      ensureRuntimeButton(
        frame,
        '.image-upload-btn',
        'image-upload-btn',
        '+ Загрузить картинку'
      );
    });
}

function ensureItemSetControls(
  editor
) {

  getMatchingElements(
    editor,
    '.item-set-block'
  )
    .forEach(block => {

      ensureRuntimeButton(
        block,
        '.item-set-add-btn',
        'item-set-add-btn',
        '+ Добавить предмет'
      );
    });

  getMatchingElements(
    editor,
    '.item-set-chip'
  )
    .forEach(chip => {

      ensureItemCountInput(
        chip
      );

      ensureRemoveControl(
        chip,
        '.item-set-remove',
        'item-set-remove'
      );
    });
}

function ensureItemCountInput(
  chip
) {

  if (
    chip.querySelector('.item-set-quantity-label')
  ) return;

  const legacyCount =
    chip.querySelector('.item-set-count-label');

  if (legacyCount) {

    legacyCount.className =
      'item-set-quantity-label';

    const legacyInput =
      legacyCount.querySelector('.item-set-count');

    if (legacyInput) {

      legacyInput.className =
        'item-set-quantity';

      legacyInput.type =
        'text';

      legacyInput.setAttribute(
        'inputmode',
        'numeric'
      );

      legacyInput.setAttribute(
        'pattern',
        '[0-9]*'
      );
    }

    legacyCount.childNodes.forEach(node => {

      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent.trim() === 'x'
      ) {

        node.remove();
      }
    });

    return;
  }

  const title =
    chip.querySelector('.item-set-title');

  if (!title) return;

  const label =
    document.createElement('label');

  label.className =
    'item-set-quantity-label';

  label.title =
    'Количество';

  label.innerHTML = `
    <input
      class="item-set-quantity"
      type="text"
      inputmode="numeric"
      pattern="[0-9]*"
      value="1"
    >
  `;

  title.after(
    label
  );
}

function ensureSpellSetControls(
  editor
) {

  getMatchingElements(
    editor,
    '.spell-set-block'
  )
    .forEach(block => {

      ensureRuntimeButton(
        block,
        '.spell-set-add-btn',
        'spell-set-add-btn',
        '+ Добавить заклинание'
      );
    });

  getMatchingElements(
    editor,
    '.spell-set-chip'
  )
    .forEach(chip => {

      ensureRemoveControl(
        chip,
        '.spell-set-remove',
        'spell-set-remove'
      );
    });
}

function ensureSkillSetControls(
  editor
) {

  getMatchingElements(
    editor,
    '.skill-set-block'
  )
    .forEach(block => {

      ensureRuntimeButton(
        block,
        '.skill-set-add-btn',
        'skill-set-add-btn',
        '+ Добавить навык'
      );
    });

  getMatchingElements(
    editor,
    '.skill-set-chip'
  )
    .forEach(chip => {

      ensureRemoveControl(
        chip,
        '.skill-set-remove',
        'skill-set-remove'
      );
    });
}

function ensureRemoveControl(
  chip,
  selector,
  className
) {

  const existingRemove =
    chip.querySelector(selector);

  if (existingRemove) {

    markRuntime(
      existingRemove
    );

    return;
  }

  const remove =
    document.createElement('span');

  remove.className =
    className;

  remove.title =
    'Убрать из набора';

  remove.textContent =
    'x';

  markRuntime(
    remove
  );

  chip.appendChild(
    remove
  );
}
