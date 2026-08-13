import {
  saveCurrentPage
} from '../../editor/editor.js';

import {
  pushEditorHistorySnapshot
} from '../../editor/editorHistory.js';

import {
  TABLE_MIN_COLUMN_WIDTH
} from './tableConstants.js';

import {
  ensureTableColumns,
  getColumnWidth,
  lockTableWidthToColumns
} from './tableColumns.js';

import {
  getCellsInSelection
} from './tableSelectionState.js';

let tableToolbar = null;
let getCurrentSelection = () => null;
let toolbarReturnFocusElement = null;


export function setTableToolbarSelectionProvider(
  provider
) {

  getCurrentSelection =
    provider;
}


export function showTableToolbar(
  selection,
  {
    focusToolbar = false,
    returnFocusElement = null
  } = {}
) {

  if (!selection) return;

  const toolbar =
    getTableToolbar();

  toolbarReturnFocusElement =
    returnFocusElement;

  const widthInput =
    toolbar.querySelector('.table-toolbar-width-input');

  widthInput.value =
    String(
      Math.round(
        getColumnWidth(
          selection.table,
          selection.columnStart
        )
      )
    );

  toolbar.classList.remove(
    'hidden'
  );

  positionTableToolbar(
    toolbar,
    getSelectionRect(selection)
  );

  if (focusToolbar) {

    focusToolbarControl(
      toolbar,
      'left'
    );
  }
}


export function hideTableToolbar(
  {
    restoreFocus = false
  } = {}
) {

  getTableToolbar(
    false
  )
    ?.classList.add(
      'hidden'
    );

  if (restoreFocus) {

    restoreToolbarFocus();
  }
}


function getTableToolbar(
  create = true
) {

  if (tableToolbar || !create) return tableToolbar;

  tableToolbar =
    document.createElement('div');

  tableToolbar.className =
    'table-selection-toolbar hidden';

  tableToolbar.dataset.runtime =
    'true';

  tableToolbar.setAttribute(
    'contenteditable',
    'false'
  );

  tableToolbar.setAttribute(
    'role',
    'toolbar'
  );

  tableToolbar.setAttribute(
    'aria-label',
    'Инструменты таблицы'
  );

  tableToolbar.setAttribute(
    'aria-orientation',
    'horizontal'
  );

  tableToolbar.innerHTML = `
    <label class="table-toolbar-width">
      <span>Ширина столбца</span>
      <input
        class="table-toolbar-width-input"
        data-table-toolbar-control
        type="number"
        min="${TABLE_MIN_COLUMN_WIDTH}"
        step="8"
        aria-label="Ширина выбранного столбца"
      >
    </label>

    <button
      type="button"
      data-table-align="left"
      data-table-toolbar-control
      title="Выровнять влево"
      aria-label="Выровнять влево"
    >L</button>
    <button
      type="button"
      data-table-align="center"
      data-table-toolbar-control
      title="Выровнять по центру"
      aria-label="Выровнять по центру"
    >C</button>
    <button
      type="button"
      data-table-align="right"
      data-table-toolbar-control
      title="Выровнять вправо"
      aria-label="Выровнять вправо"
    >R</button>
  `;

  tableToolbar.addEventListener(
    'pointerdown',
    event => {

      event.stopPropagation();
    }
  );

  tableToolbar.addEventListener(
    'change',
    handleToolbarChange
  );

  tableToolbar.addEventListener(
    'click',
    handleToolbarClick
  );

  tableToolbar.addEventListener(
    'keydown',
    handleToolbarKeydown
  );

  document.body.appendChild(
    tableToolbar
  );

  return tableToolbar;
}


async function handleToolbarChange(
  event
) {

  if (
    !event.target.classList.contains('table-toolbar-width-input')
  ) return;

  pushEditorHistorySnapshot(
    document.getElementById('editorArea'),
    'Изменение ширины столбца'
  );

  applySelectedColumnWidth(
    Number(event.target.value)
  );

  await saveCurrentPage();

  restoreToolbarFocus();
}


function handleToolbarKeydown(
  event
) {

  if (
    event.key === 'Escape'
  ) {

    event.preventDefault();

    hideTableToolbar({
      restoreFocus:
        true
    });

    return;
  }

  if (
    event.target.classList.contains('table-toolbar-width-input')
  ) return;

  if (
    event.key === 'ArrowRight'
  ) {

    event.preventDefault();

    focusAdjacentToolbarControl(
      event.target,
      1
    );

    return;
  }

  if (
    event.key === 'ArrowLeft'
  ) {

    event.preventDefault();

    focusAdjacentToolbarControl(
      event.target,
      -1
    );

    return;
  }

  if (
    event.key === 'Home'
  ) {

    event.preventDefault();

    focusToolbarControlAt(
      0
    );

    return;
  }

  if (
    event.key === 'End'
  ) {

    event.preventDefault();

    const controls =
      getToolbarControls();

    focusToolbarControlAt(
      controls.length - 1
    );
  }
}


async function handleToolbarClick(
  event
) {

  const button =
    event.target.closest('[data-table-align]');

  if (!button) return;

  pushEditorHistorySnapshot(
    document.getElementById('editorArea'),
    'Выравнивание ячеек'
  );

  applySelectedCellAlignment(
    button.dataset.tableAlign
  );

  await saveCurrentPage();

  restoreToolbarFocus();
}


function applySelectedColumnWidth(
  width
) {

  const selection =
    getCurrentSelection();

  if (
    !selection ||
    !Number.isFinite(width)
  ) return;

  ensureTableColumns(
    selection.table
  );

  const columns =
    selection.table.querySelectorAll('col');

  for (
    let index = selection.columnStart;
    index <= selection.columnEnd;
    index += 1
  ) {

    const column =
      columns[index];

    if (!column) continue;

    column.style.width =
      `${Math.max(TABLE_MIN_COLUMN_WIDTH, Math.round(width))}px`;
  }

  lockTableWidthToColumns(
    selection.table
  );

  showTableToolbar(
    selection
  );
}


function applySelectedCellAlignment(
  alignment
) {

  const selection =
    getCurrentSelection();

  if (!selection) return;

  getCellsInSelection(
    selection
  )
    .forEach(cell => {

      cell.style.textAlign =
        alignment;
    });
}


function focusToolbarControl(
  toolbar,
  preferredAlignment
) {

  const preferred =
    toolbar.querySelector(
      `[data-table-align="${preferredAlignment}"]`
    );

  const target =
    preferred ||
    toolbar.querySelector(
      '[data-table-toolbar-control]'
    );

  target?.focus({
    preventScroll:
      true
  });
}


function focusAdjacentToolbarControl(
  current,
  direction
) {

  const controls =
    getToolbarControls();

  const currentIndex =
    controls.indexOf(
      current
    );

  if (
    currentIndex < 0 ||
    controls.length === 0
  ) return;

  focusToolbarControlAt(
    currentIndex + direction
  );
}


function focusToolbarControlAt(
  index
) {

  const controls =
    getToolbarControls();

  if (!controls.length) return;

  const nextIndex =
    (index + controls.length) % controls.length;

  controls[nextIndex].focus({
    preventScroll:
      true
  });
}


function getToolbarControls() {

  return Array.from(
    getTableToolbar(false)
      ?.querySelectorAll('[data-table-toolbar-control]') ||
    []
  );
}


function restoreToolbarFocus() {

  const target =
    toolbarReturnFocusElement;

  toolbarReturnFocusElement =
    null;

  if (
    !target?.isConnected ||
    typeof target.focus !== 'function'
  ) return;

  target.focus({
    preventScroll:
      true
  });
}


function positionTableToolbar(
  toolbar,
  rect
) {

  const margin =
    8;

  const width =
    toolbar.offsetWidth || 236;

  const height =
    toolbar.offsetHeight || 42;

  const left =
    clamp(
      rect.left + rect.width / 2 - width / 2,
      margin,
      window.innerWidth - margin - width
    );

  let top =
    rect.top - height - 8;

  if (top < margin) {

    top =
      rect.bottom + 8;
  }

  toolbar.style.left =
    `${left}px`;

  toolbar.style.top =
    `${clamp(top, margin, window.innerHeight - margin - height)}px`;
}


function getSelectionRect(
  selection
) {

  const cells =
    getCellsInSelection(
      selection
    );

  const rects =
    cells.map(cell => cell.getBoundingClientRect());

  return {
    left: Math.min(...rects.map(rect => rect.left)),
    top: Math.min(...rects.map(rect => rect.top)),
    right: Math.max(...rects.map(rect => rect.right)),
    bottom: Math.max(...rects.map(rect => rect.bottom)),
    get width() {
      return this.right - this.left;
    },
    get height() {
      return this.bottom - this.top;
    }
  };
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
