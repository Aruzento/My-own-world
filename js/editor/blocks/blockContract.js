export const BLOCK_VERSIONS = {
  text: 1,
  items: 1,
  spells: 1,
  skills: 1,
  image: 1,
  characterStats: 2,
  dndStats: 3,
  table: 2
};

const RUNTIME_SELECTOR = [
  '[data-runtime="true"]'
].join(',');

const LEGACY_RUNTIME_SELECTOR = [
  // Fallback for pages saved before runtime controls received data-runtime.
  '.block-actions',
  '.blocks-toolbar',
  '.block-drop-placeholder',
  '.add-block-row',
  '.backlinks-list',
  '.card-type-custom',
  '.item-set-add-btn',
  '.item-set-remove',
  '.spell-set-add-btn',
  '.spell-set-remove',
  '.skill-set-add-btn',
  '.skill-set-remove',
  '.inline-tag-input',
  '.inline-add-tag-btn',
  '.inline-alias-input',
  '.inline-add-alias-btn',
  '.upload-portrait-btn',
  '.image-upload-btn',
  '.image-runtime-actions',
  '.table-row-controls'
].join(',');

const RUNTIME_OR_LEGACY_SELECTOR = [
  RUNTIME_SELECTOR,
  LEGACY_RUNTIME_SELECTOR
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

  clearRuntimeTableState(
    clone
  );

  clearRuntimeMirrorLists(
    clone
  );

  stripRuntimeAssetSources(
    clone
  );

  stripRuntimeMapBackgrounds(
    clone
  );

  clearRuntimeMapState(
    clone
  );

  return clone.innerHTML;
}


function clearRuntimeTableState(
  root
) {

  root
    .querySelectorAll('.table-cell.is-selected')
    .forEach(cell => {

      cell.classList.remove(
        'is-selected'
      );
    });

  root
    .querySelectorAll('.custom-table.is-resizing-column')
    .forEach(table => {

      table.classList.remove(
        'is-resizing-column'
      );
    });
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
        currentVersion < 3
      ) {

        changed =
          upgradeDndStatsToV3Fixed(
            block
          ) || changed;
      }

      if (
        type === 'characterStats' &&
        currentVersion < 2
      ) {

        changed =
          upgradeCharacterStatsToV2(
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

      if (
        type === 'table' &&
        currentVersion < 2
      ) {

        changed =
          upgradeTableBlock(
            block
          ) || changed;

        block.dataset.blockVersion =
          '2';
      }
    });

  return changed;
}


function upgradeCharacterStatsToV2(
  block
) {

  const labels = [
    'Уровень',
    'Опыт',
    'ЗМ',
    'СМ',
    'ММ'
  ];

  let changed =
    false;

  block
    .querySelectorAll('.character-stat-field span')
    .forEach((label, index) => {

      if (!labels[index]) return;

      if (
        label.textContent.trim() === labels[index]
      ) return;

      label.textContent =
        labels[index];

      changed =
        true;
    });

  return changed;
}


function upgradeDndStatsToV3Fixed(
  block
) {

  let changed =
    false;

  block
    .querySelectorAll('.dnd-analysis-field')
    .forEach(field => {

      field.remove();
      changed =
        true;
    });

  changed =
    ensureDndAnalysisSkill(
      block
    ) || changed;

  changed =
    normalizeDndStatsLabels(
      block
    ) || changed;

  return changed;
}


function ensureDndAnalysisSkill(
  block
) {

  const groups =
    block.querySelectorAll('.dnd-check-group');

  const intelligenceGroup =
    groups[3];

  if (!intelligenceGroup) {

    return false;
  }

  const hasAnalysis =
    [...intelligenceGroup.querySelectorAll('.dnd-check-name')]
      .some(name =>
        name.textContent.trim().toLowerCase() === 'анализ'
      );

  if (hasAnalysis) {

    return false;
  }

  const list =
    intelligenceGroup.querySelector('.dnd-check-group-list');

  if (!list) {

    return false;
  }

  const referenceRow =
    list.querySelectorAll('.dnd-check-row')[2];

  if (referenceRow) {

    referenceRow.insertAdjacentHTML(
      'beforebegin',
      createDndCheckRowHTML(
        'Анализ'
      )
    );

  } else {

    list.insertAdjacentHTML(
      'beforeend',
      createDndCheckRowHTML(
        'Анализ'
      )
    );
  }

  return true;
}


function normalizeDndStatsLabels(
  block
) {

  let changed =
    false;

  const combatLabels = [
    'Класс защиты',
    'Хиты',
    'Инициатива',
    'Скорость',
    'Бонус мастерства'
  ];

  block
    .querySelectorAll('.dnd-combat-field > span')
    .forEach((label, index) => {

      if (!combatLabels[index]) return;

      if (
        label.textContent.trim() === combatLabels[index]
      ) return;

      label.textContent =
        combatLabels[index];

      changed =
        true;
    });

  const placeholders = [
    ['.dnd-current-hp', 'текущие'],
    ['.dnd-max-hp', 'макс.']
  ];

  placeholders.forEach(([selector, value]) => {

    const input =
      block.querySelector(selector);

    if (!input) return;

    if (
      input.getAttribute('placeholder') === value
    ) return;

    input.setAttribute(
      'placeholder',
      value
    );

    changed =
      true;
  });

  const speed =
    block.querySelector('.dnd-speed');

  if (
    speed &&
    !speed.value
  ) {

    speed.value =
      '30 фт.';

    changed =
      true;
  }

  const statLabels = [
    'СИЛ',
    'ЛВК',
    'ТЕЛ',
    'ИНТ',
    'МДР',
    'ХАР'
  ];

  block
    .querySelectorAll('.dnd-stat-label')
    .forEach((label, index) => {

      if (!statLabels[index]) return;

      if (
        label.textContent.trim() === statLabels[index]
      ) return;

      label.textContent =
        statLabels[index];

      changed =
        true;
    });

  const groupLabels = [
    'СИЛ',
    'ЛВК',
    'ТЕЛ',
    'ИНТ',
    'МДР',
    'ХАР'
  ];

  block
    .querySelectorAll('.dnd-check-group-title')
    .forEach((label, index) => {

      if (!groupLabels[index]) return;

      if (
        label.textContent.trim() === groupLabels[index]
      ) return;

      label.textContent =
        groupLabels[index];

      changed =
        true;
    });

  const checkNames = [
    ['Спасбросок СИЛ', 'Атлетика'],
    ['Спасбросок ЛВК', 'Акробатика', 'Ловкость рук', 'Скрытность'],
    ['Спасбросок ТЕЛ'],
    ['Спасбросок ИНТ', 'История', 'Анализ', 'Магия', 'Природа', 'Религия'],
    ['Спасбросок МДР', 'Внимательность', 'Выживание', 'Медицина', 'Проницательность', 'Уход за животными'],
    ['Спасбросок ХАР', 'Выступление', 'Запугивание', 'Обман', 'Убеждение']
  ];

  block
    .querySelectorAll('.dnd-check-group')
    .forEach((group, groupIndex) => {

      group
        .querySelectorAll('.dnd-check-name')
        .forEach((name, nameIndex) => {

          const expected =
            checkNames[groupIndex]?.[nameIndex];

          if (!expected) return;

          if (
            name.textContent.trim() === expected
          ) return;

          name.textContent =
            expected;

          changed =
            true;
        });
    });

  const title =
    block.querySelector('.dnd-checks-title');

  if (
    title &&
    title.textContent.trim() !== 'Навыки и спасброски'
  ) {

    title.textContent =
      'Навыки и спасброски';

    changed =
      true;
  }

  return changed;
}


function createDndCheckRowHTML(
  name
) {

  return `
    <label class="dnd-check-row">
      <input
        type="checkbox"
        class="dnd-check-point"
      >

      <span class="dnd-check-name">
        ${name}
      </span>

      <input
        type="number"
        class="dnd-check-value"
        value="0"
      >
    </label>
  `;
}


function ensureRuntimeControls(
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


function ensureRuntimeInput(
  container,
  selector,
  className,
  placeholder
) {

  const existingInput =
    container.querySelector(selector);

  if (existingInput) {

    markRuntime(
      existingInput
    );

    return;
  }

  const input =
    document.createElement('input');

  input.className =
    className;

  input.placeholder =
    placeholder;

  markRuntime(
    input
  );

  container.appendChild(
    input
  );
}


function ensureRuntimeButton(
  container,
  selector,
  className,
  text
) {

  const existingButton =
    container.querySelector(selector);

  if (existingButton) {

    markRuntime(
      existingButton
    );

    return;
  }

  const button =
    document.createElement('button');

  button.className =
    className;

  button.type =
    'button';

  button.textContent =
    text;

  markRuntime(
    button
  );

  container.appendChild(
    button
  );
}


function ensureItemSetControls(
  editor
) {

  getMatchingElements(
    editor,
    '.item-set-block'
  )
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

  getMatchingElements(
    editor,
    '.item-set-chip'
  )
    .forEach(chip => {

      ensureItemCountInput(
        chip
      );

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

      const existingButton =
        block.querySelector('.spell-set-add-btn');

      if (existingButton) {

        markRuntime(
          existingButton
        );

        return;
      }

      const button =
        document.createElement('button');

      button.className =
        'spell-set-add-btn';

      button.type =
        'button';

      button.textContent =
        '+ Добавить заклинание';

      markRuntime(
        button
      );

      block.appendChild(
        button
      );
    });

  getMatchingElements(
    editor,
    '.spell-set-chip'
  )
    .forEach(chip => {

      const existingRemove =
        chip.querySelector('.spell-set-remove');

      if (existingRemove) {

        markRuntime(
          existingRemove
        );

        return;
      }

      const remove =
        document.createElement('span');

      remove.className =
        'spell-set-remove';

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


function ensureSkillSetControls(
  editor
) {

  getMatchingElements(
    editor,
    '.skill-set-block'
  )
    .forEach(block => {

      const existingButton =
        block.querySelector('.skill-set-add-btn');

      if (existingButton) {

        markRuntime(
          existingButton
        );

        return;
      }

      const button =
        document.createElement('button');

      button.className =
        'skill-set-add-btn';

      button.type =
        'button';

      button.textContent =
        '+ Добавить навык';

      markRuntime(
        button
      );

      block.appendChild(
        button
      );
    });

  getMatchingElements(
    editor,
    '.skill-set-chip'
  )
    .forEach(chip => {

      const existingRemove =
        chip.querySelector('.skill-set-remove');

      if (existingRemove) {

        markRuntime(
          existingRemove
        );

        return;
      }

      const remove =
        document.createElement('span');

      remove.className =
        'skill-set-remove';

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


function getMatchingElements(
  root,
  selector
) {

  const elements =
    [...root.querySelectorAll(selector)];

  if (
    root.matches?.(selector)
  ) {

    elements.unshift(
      root
    );
  }

  return elements;
}


function ensureTableControls(
  editor
) {

  editor
    .querySelectorAll('.custom-table')
    .forEach(table => {

      ensureTableColumns(
        table
      );
    });

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


function upgradeTableBlock(
  block
) {

  const table =
    block.querySelector(
      '.custom-table'
    );

  if (!table) return false;

  return ensureTableColumns(
    table
  );
}


function ensureTableColumns(
  table
) {

  const firstRow =
    table.querySelector('tr');

  if (!firstRow) return false;

  const columnCount =
    firstRow.querySelectorAll('.table-cell').length;

  if (columnCount <= 0) return false;

  let colgroup =
    table.querySelector('colgroup');

  let changed =
    false;

  if (!colgroup) {

    colgroup =
      document.createElement('colgroup');

    table.insertBefore(
      colgroup,
      table.firstChild
    );

    changed =
      true;
  }

  while (colgroup.children.length < columnCount) {

    const column =
      document.createElement('col');

    column.style.width =
      '160px';

    colgroup.appendChild(
      column
    );

    changed =
      true;
  }

  while (colgroup.children.length > columnCount) {

    colgroup.lastElementChild.remove();

    changed =
      true;
  }

  [...colgroup.children]
    .forEach(column => {

      if (column.style.width) return;

      column.style.width =
        '160px';

      changed =
        true;
    });

  return changed;
}


function removeRuntimeControls(
  root
) {

  const elements =
    root.querySelectorAll(RUNTIME_OR_LEGACY_SELECTOR);

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


function stripRuntimeMapBackgrounds(
  root
) {

  root
    .querySelectorAll('.campaign-map-background')
    .forEach(background => {

      background.removeAttribute(
        'style'
      );
    });

  root
    .querySelectorAll('.campaign-map-token-image')
    .forEach(image => {

      image.removeAttribute(
        'src'
      );
    });
}


function clearRuntimeMapState(
  root
) {

  root
    .querySelectorAll(
      '.campaign-map-token.is-offscreen, .campaign-map-shape.is-offscreen'
    )
    .forEach(element => {

      element.classList.remove(
        'is-offscreen'
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
      RUNTIME_OR_LEGACY_SELECTOR
    )
  );
}
