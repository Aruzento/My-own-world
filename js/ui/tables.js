import {
  saveCurrentPage
} from '../editor/editor.js';

import {
  pushEditorHistorySnapshot
} from '../editor/editorHistory.js';

import {
  sanitizePlainTextPaste
} from '../editor/safeHtmlSanitizer.js';

import {
  pasteTextIntoTable,
  insertPlainTextAtCaret
} from './tables/tableClipboard.js';

import {
  getActiveTableCell
} from './tables/tableCells.js';

import {
  getResizeColumnIndex,
  updateTableResizeCursor
} from './tables/tableColumns.js';

import {
  addRowBelow,
  focusCellBelow,
  removeTableRow
} from './tables/tableRows.js';

import {
  finishColumnResize,
  isColumnResizeActive,
  resizeColumnToPointer,
  startColumnResize
} from './tables/tableResize.js';

import {
  clearTableSelection,
  finishTableSelectionDrag,
  getNormalizedSelection,
  isTableSelectionDragging,
  startTableSelection,
  updateTableSelectionPointer
} from './tables/tableSelectionState.js';

import {
  hideTableToolbar,
  setTableToolbarSelectionProvider,
  showTableToolbar
} from './tables/tableToolbar.js';


export function setupTables() {

  setTableToolbarSelectionProvider(
    getNormalizedSelection
  );

  document.addEventListener(
    'click',
    handleTableClick
  );

  document.addEventListener(
    'pointerdown',
    handleTablePointerDown
  );

  document.addEventListener(
    'pointermove',
    handleTablePointerMove
  );

  document.addEventListener(
    'pointerup',
    handleTablePointerUp
  );

  document.addEventListener(
    'keydown',
    handleTableKeydown
  );

  document.addEventListener(
    'paste',
    handleTablePaste
  );

  document.addEventListener(
    'input',
    handleTableInput
  );
}


function handleTableClick(
  event
) {

  const addRowButton =
    event.target.closest(
      '.table-add-row-btn'
    );

  const deleteRowButton =
    event.target.closest(
      '.table-delete-row-btn'
    );

  if (deleteRowButton) {

    event.preventDefault();
    event.stopPropagation();

    pushEditorHistorySnapshot(
      document.getElementById('editorArea'),
      'Удаление строки таблицы'
    );

    removeTableRow(
      deleteRowButton
    );

    saveCurrentPage();
    return;
  }

  if (!addRowButton) return;

  event.preventDefault();
  event.stopPropagation();

  pushEditorHistorySnapshot(
    document.getElementById('editorArea'),
    'Добавление строки таблицы'
  );

  addRowBelow(
    addRowButton
  );

  saveCurrentPage();
}


function handleTablePointerDown(
  event
) {

  const cell =
    event.target.closest(
      '.custom-table .table-cell'
    );

  if (!cell) {

    if (
      !event.target.closest('.table-selection-toolbar')
    ) {

      clearTableSelection();
      hideTableToolbar();
    }

    return;
  }

  const table =
    cell.closest(
      '.custom-table'
    );

  if (!table) return;

  const resizeColumnIndex =
    getResizeColumnIndex(
      event,
      cell
    );

  if (resizeColumnIndex !== null) {

    event.preventDefault();
    event.stopPropagation();

    startColumnResize(
      event,
      table,
      resizeColumnIndex
    );

    return;
  }

  if (
    event.button !== 0 ||
    event.target.closest('.table-row-controls')
  ) return;

  startTableSelection(
    cell
  );
}


function handleTablePointerMove(
  event
) {

  if (isColumnResizeActive()) {

    resizeColumnToPointer(
      event
    );

    return;
  }

  if (isTableSelectionDragging()) {

    updateTableSelectionPointer(
      event.target.closest(
        '.custom-table .table-cell'
      )
    );

    return;
  }

  updateTableResizeCursor(
    event
  );
}


async function handleTablePointerUp() {

  if (finishColumnResize()) {

    await saveCurrentPage();
  }

  if (!finishTableSelectionDrag()) {

    hideTableToolbar();
    return;
  }

  showTableToolbar(
    getNormalizedSelection()
  );
}


function handleTableKeydown(
  event
) {

  const cell =
    getActiveTableCell(
      event
    );

  if (!cell) return;

  /* Enter переводит курсор в ячейку ниже, а Shift+Enter оставляет обычный
     перенос строки внутри текущей ячейки. */
  if (
    event.key !== 'Enter' ||
    event.shiftKey
  ) return;

  event.preventDefault();

  focusCellBelow(
    cell
  );
}


function handleTablePaste(
  event
) {

  const cell =
    getActiveTableCell(
      event
    );

  if (!cell) return;

  const text =
    sanitizePlainTextPaste(
      event.clipboardData
        ?.getData('text/plain')
    );

  if (!text) return;

  event.preventDefault();

  pushEditorHistorySnapshot(
    document.getElementById('editorArea'),
    text.includes('\n') || text.includes('\t')
      ? 'Вставка в таблицу'
      : 'Вставка в ячейку таблицы'
  );

  if (
    text.includes('\n') ||
    text.includes('\t')
  ) {

    pasteTextIntoTable(
      cell,
      text
    );

  } else {

    insertPlainTextAtCaret(
      text
    );
  }

  saveCurrentPage();
}


function handleTableInput(
  event
) {

  const cell =
    getActiveTableCell(
      event
    );

  if (!cell) return;

  saveCurrentPage();
}
