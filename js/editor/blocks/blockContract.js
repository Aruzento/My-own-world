export const BLOCK_VERSIONS = {
  text: 1,
  items: 1,
  characterStats: 1,
  dndStats: 2,
  table: 1
};

const RUNTIME_SELECTOR = [
  '[data-runtime="true"]',
  '.block-actions',
  '.blocks-toolbar',
  '.block-drop-placeholder',
  '.add-block-row',
  '.backlinks-list',
  '.card-type-custom',
  '.item-set-add-btn',
  '.item-set-remove',
  '.table-row-controls'
].join(',');

export function applyBlockSystemContract(
  editor
) {

  if (!editor) return false;

  let changed =
    false;

  changed =
    removeRuntimeControls(
      editor
    ) || changed;

  changed =
    upgradePersistentBlocks(
      editor
    ) || changed;

  ensureRuntimeControls(
    editor
  );

  return changed;
}


export function serializePersistentEditorHTML(
  editor
) {

  const clone =
    editor.cloneNode(true);

  syncPersistentFormValues(
    editor,
    clone
  );

  removeRuntimeControls(
    clone
  );

  clearRuntimeMirrorLists(
    clone
  );

  stripRuntimeAssetSources(
    clone
  );

  return clone.innerHTML;
}


export function markRuntime(
  element
) {

  if (!element) return element;

  element.dataset.runtime =
    'true';

  element.setAttribute(
    'contenteditable',
    'false'
  );

  return element;
}


export function createTableRowControlsHTML() {

  return `
    <div
      class="table-row-controls"
      data-runtime="true"
      contenteditable="false"
    >
      <button
        class="table-add-row-btn"
        type="button"
        title="Добавить строку ниже"
      >
        +
      </button>

      <button
        class="table-delete-row-btn"
        type="button"
        title="Удалить строку"
      >
        x
      </button>
    </div>
  `;
}


function upgradePersistentBlocks(
  editor
) {

  let changed =
    false;

  editor
    .querySelectorAll('.template-block')
    .forEach(block => {

      const type =
        block.dataset.blockType || 'text';

      const targetVersion =
        BLOCK_VERSIONS[type] || 1;

      const currentVersion =
        Number(block.dataset.blockVersion || 0);

      if (
        type === 'dndStats' &&
        currentVersion < 2
      ) {

        changed =
          upgradeDndStatsToV2(
            block
          ) || changed;
      }

      if (
        currentVersion !== targetVersion
      ) {

        block.dataset.blockVersion =
          String(targetVersion);

        changed =
          true;
      }
    });

  return changed;
}


function upgradeDndStatsToV2(
  block
) {

  if (
    block.querySelector('.dnd-analysis-field')
  ) {

    return false;
  }

  const section =
    document.createElement('label');

  section.className =
    'dnd-combat-field dnd-analysis-field';

  section.innerHTML = `
    <span>Анализ</span>
    <textarea
      class="dnd-analysis-input"
      rows="3"
      placeholder="Заметки, тактика, особенности"
    ></textarea>
  `;

  const checksSection =
    block.querySelector('.dnd-checks-section');

  if (checksSection) {

    checksSection.before(
      section
    );

  } else {

    block.appendChild(
      section
    );
  }

  return true;
}


function ensureRuntimeControls(
  editor
) {

  ensureItemSetControls(
    editor
  );

  ensureTableControls(
    editor
  );
}


function ensureItemSetControls(
  editor
) {

  editor
    .querySelectorAll('.item-set-block')
    .forEach(block => {

      const existingButton =
        block.querySelector('.item-set-add-btn');

      if (existingButton) {

        markRuntime(
          existingButton
        );

        return;
      }

      const button =
        document.createElement('button');

      button.className =
        'item-set-add-btn';

      button.type =
        'button';

      button.textContent =
        '+ Добавить предмет';

      markRuntime(
        button
      );

      block.appendChild(
        button
      );
    });

  editor
    .querySelectorAll('.item-set-chip')
    .forEach(chip => {

      const existingRemove =
        chip.querySelector('.item-set-remove');

      if (existingRemove) {

        markRuntime(
          existingRemove
        );

        return;
      }

      const remove =
        document.createElement('span');

      remove.className =
        'item-set-remove';

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
    });
}


function ensureTableControls(
  editor
) {

  editor
    .querySelectorAll('.custom-table tr')
    .forEach(row => {

      const firstCell =
        row.querySelector('.table-cell');

      if (!firstCell) return;

      const existingControls =
        firstCell.querySelector('.table-row-controls');

      if (existingControls) {

        markRuntime(
          existingControls
        );

        return;
      }

      firstCell.insertAdjacentHTML(
        'afterbegin',
        createTableRowControlsHTML()
      );
    });
}


function removeRuntimeControls(
  root
) {

  const elements =
    root.querySelectorAll(RUNTIME_SELECTOR);

  const removedAny =
    elements.length > 0;

  elements
    .forEach(element => {

      element.remove();
    });

  return removedAny;
}


function clearRuntimeMirrorLists(
  root
) {

  root
    .querySelectorAll(
      '.inline-tag-list, .inline-alias-list'
    )
    .forEach(element => {

      element.innerHTML =
        '';
    });
}


function stripRuntimeAssetSources(
  root
) {

  root
    .querySelectorAll('img[data-asset]')
    .forEach(img => {

      img.removeAttribute(
        'src'
      );
    });
}


function syncPersistentFormValues(
  source,
  clone
) {

  const sourceFields =
    source.querySelectorAll(
      'input, textarea, select'
    );

  const cloneFields =
    clone.querySelectorAll(
      'input, textarea, select'
    );

  sourceFields.forEach((sourceField, index) => {

    const cloneField =
      cloneFields[index];

    if (!cloneField) return;

    if (
      isRuntimeField(sourceField)
    ) {

      return;
    }

    if (
      sourceField.tagName === 'INPUT'
    ) {

      cloneField.setAttribute(
        'value',
        sourceField.value
      );

      if (
        sourceField.type === 'checkbox'
      ) {

        if (sourceField.checked) {

          cloneField.setAttribute(
            'checked',
            'checked'
          );

        } else {

          cloneField.removeAttribute(
            'checked'
          );
        }
      }
    }

    if (
      sourceField.tagName === 'TEXTAREA'
    ) {

      cloneField.textContent =
        sourceField.value;
    }

    if (
      sourceField.tagName === 'SELECT'
    ) {

      cloneField
        .querySelectorAll('option')
        .forEach(option => {

          option.removeAttribute(
            'selected'
          );

          if (
            option.value === sourceField.value
          ) {

            option.setAttribute(
              'selected',
              'selected'
            );
          }
        });
    }
  });
}


function isRuntimeField(
  field
) {

  return Boolean(
    field.closest(
      RUNTIME_SELECTOR
    )
  );
}
