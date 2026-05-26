import {
  ensureTableControls
} from './blockTableContract.js';

import {
  ensureRuntimeButton,
  ensureRuntimeInput,
  getMatchingElements,
  markRuntime
} from './blockRuntime.js';

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

  ensureCardShellControls(
    editor
  );
}

function ensureCardShellControls(
  editor
) {

  editor
    .querySelectorAll('.card-meta')
    .forEach(meta => {

      ensureRuntimeInput(
        meta,
        '.inline-tag-input',
        'inline-tag-input',
        'tag'
      );

      ensureRuntimeButton(
        meta,
        '.inline-add-tag-btn',
        'inline-add-tag-btn',
        '+'
      );
    });

  editor
    .querySelectorAll('.aliases-meta')
    .forEach(meta => {

      ensureRuntimeInput(
        meta,
        '.inline-alias-input',
        'inline-alias-input',
        'alias'
      );

      ensureRuntimeButton(
        meta,
        '.inline-add-alias-btn',
        'inline-add-alias-btn',
        '+'
      );
    });

  editor
    .querySelectorAll('.media-box.is-portrait')
    .forEach(mediaBox => {

      ensureRuntimeButton(
        mediaBox,
        '.upload-portrait-btn',
        'upload-portrait-btn',
        '+ Image'
      );
    });
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
