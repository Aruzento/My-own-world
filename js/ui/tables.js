import {
  saveCurrentPage
} from '../editor/editor.js';

import {
  pushEditorHistorySnapshot
} from '../editor/editorHistory.js';

import {
  addRowBelow,
  removeTableRow,
  focusCellBelow
} from './tables/tableRows.js';

import {
  pasteTextIntoTable,
  insertPlainTextAtCaret
} from './tables/tableClipboard.js';

import {
  sanitizePlainTextPaste
} from '../editor/safeHtmlSanitizer.js';

const TABLE_RESIZE_EDGE = 6;
const TABLE_MIN_COLUMN_WIDTH = 10;

let resizedColumn = null;
let tableSelection = null;
let tableToolbar = null;


export function setupTables() {

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

  const position =
    getCellPosition(
      cell
    );

  tableSelection = {
    table,
    startRow: position.row,
    startColumn: position.column,
    endRow: position.row,
    endColumn: position.column,
    dragging: true,
    moved: false
  };

  updateTableSelection();
}


function handleTablePointerMove(
  event
) {

  if (resizedColumn) {

    resizeColumnToPointer(
      event
    );

    return;
  }

  if (tableSelection?.dragging) {

    const cell =
      event.target.closest(
        '.custom-table .table-cell'
      );

    if (
      !cell ||
      cell.closest('.custom-table') !== tableSelection.table
    ) return;

    const position =
      getCellPosition(
        cell
      );

    tableSelection.endRow =
      position.row;

    tableSelection.endColumn =
      position.column;

    if (
      position.row !== tableSelection.startRow ||
      position.column !== tableSelection.startColumn
    ) {

      tableSelection.moved =
        true;
    }

    updateTableSelection();

    return;
  }

  updateTableResizeCursor(
    event
  );
}


async function handleTablePointerUp() {

  if (resizedColumn) {

    resizedColumn.table.classList.remove(
      'is-resizing-column'
    );

    resizedColumn =
      null;

    await saveCurrentPage();
  }

  if (tableSelection?.dragging) {

    tableSelection.dragging =
      false;

    if (tableSelection.moved) {

      showTableToolbar();

    } else {

      hideTableToolbar();
    }
  }
}


function handleTableKeydown(
  event
) {

  const cell =
    getActiveTableCell(
      event
    );

  if (!cell) return;

  /* Enter переходит в ячейку ниже, Shift+Enter оставляет обычный перенос
     строки внутри текущей ячейки. */
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


function getActiveTableCell(
  event
) {

  return event.target.closest(
    '.custom-table .table-cell-content'
  );
}


function startColumnResize(
  event,
  table,
  columnIndex
) {

  ensureTableColumns(
    table
  );

  const column =
    table.querySelectorAll('col')[columnIndex];

  if (!column) return;

  resizedColumn = {
    table,
    column,
    startX: event.clientX,
    startWidth: getColumnWidth(
      table,
      columnIndex
    )
  };

  pushEditorHistorySnapshot(
    document.getElementById('editorArea'),
    'Изменение ширины столбца'
  );

  table.classList.add(
    'is-resizing-column'
  );

  lockTableWidthToColumns(
    table
  );
}


function resizeColumnToPointer(
  event
) {

  const nextWidth =
    Math.max(
      TABLE_MIN_COLUMN_WIDTH,
      resizedColumn.startWidth + event.clientX - resizedColumn.startX
    );

  resizedColumn.column.style.width =
    `${Math.round(nextWidth)}px`;

  lockTableWidthToColumns(
    resizedColumn.table
  );
}


function getResizeColumnIndex(
  event,
  cell
) {

  const rect =
    cell.getBoundingClientRect();

  if (
    Math.abs(event.clientX - rect.right) > TABLE_RESIZE_EDGE
  ) return null;

  return getCellPosition(
    cell
  ).column;
}


function updateTableResizeCursor(
  event
) {

  const cell =
    event.target.closest(
      '.custom-table .table-cell'
    );

  const table =
    cell?.closest('.custom-table');

  document.body.classList.toggle(
    'is-table-column-resize',
    Boolean(
      cell &&
      table &&
      getResizeColumnIndex(event, cell) !== null
    )
  );
}


function updateTableSelection() {

  const selection =
    getNormalizedSelection();

  document
    .querySelectorAll('.table-cell.is-selected')
    .forEach(cell => {

      cell.classList.remove(
        'is-selected'
      );
    });

  if (!selection) {

    hideTableToolbar();
    return;
  }

  getCellsInSelection(
    selection
  )
    .forEach(cell => {

      cell.classList.add(
        'is-selected'
      );
    });

  showTableToolbar();
}


function getNormalizedSelection() {

  if (!tableSelection?.table) return null;

  return {
    table: tableSelection.table,
    rowStart: Math.min(tableSelection.startRow, tableSelection.endRow),
    rowEnd: Math.max(tableSelection.startRow, tableSelection.endRow),
    columnStart: Math.min(tableSelection.startColumn, tableSelection.endColumn),
    columnEnd: Math.max(tableSelection.startColumn, tableSelection.endColumn)
  };
}


function getCellsInSelection(
  selection
) {

  const rows =
    [...selection.table.querySelectorAll('tr')];

  const cells =
    [];

  rows.forEach((row, rowIndex) => {

    if (
      rowIndex < selection.rowStart ||
      rowIndex > selection.rowEnd
    ) return;

    [...row.querySelectorAll('.table-cell')]
      .forEach((cell, columnIndex) => {

        if (
          columnIndex < selection.columnStart ||
          columnIndex > selection.columnEnd
        ) return;

        cells.push(
          cell
        );
      });
  });

  return cells;
}


function clearTableSelection() {

  tableSelection =
    null;

  document
    .querySelectorAll('.table-cell.is-selected')
    .forEach(cell => {

      cell.classList.remove(
        'is-selected'
      );
    });

  hideTableToolbar();
}


function showTableToolbar() {

  const selection =
    getNormalizedSelection();

  if (!selection) return;

  const toolbar =
    getTableToolbar();

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
}


function hideTableToolbar() {

  getTableToolbar(
    false
  )
    ?.classList.add(
      'hidden'
    );
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

  tableToolbar.innerHTML = `
    <label class="table-toolbar-width">
      <span>Ширина</span>
      <input class="table-toolbar-width-input" type="number" min="${TABLE_MIN_COLUMN_WIDTH}" step="8">
    </label>

    <button type="button" data-table-align="left" title="Выровнять влево">L</button>
    <button type="button" data-table-align="center" title="Выровнять по центру">C</button>
    <button type="button" data-table-align="right" title="Выровнять вправо">R</button>
  `;

  tableToolbar.addEventListener(
    'pointerdown',
    event => {

      event.stopPropagation();
    }
  );

  tableToolbar.addEventListener(
    'change',
    async event => {

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
    }
  );

  tableToolbar.addEventListener(
    'click',
    async event => {

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
    }
  );

  document.body.appendChild(
    tableToolbar
  );

  return tableToolbar;
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


function applySelectedColumnWidth(
  width
) {

  const selection =
    getNormalizedSelection();

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

  showTableToolbar();
}


function applySelectedCellAlignment(
  alignment
) {

  const selection =
    getNormalizedSelection();

  if (!selection) return;

  getCellsInSelection(
    selection
  )
    .forEach(cell => {

      cell.style.textAlign =
        alignment;
    });
}


function getColumnWidth(
  table,
  columnIndex
) {

  ensureTableColumns(
    table
  );

  const column =
    table.querySelectorAll('col')[columnIndex];

  const width =
    parseFloat(
      column?.style.width || ''
    );

  if (Number.isFinite(width)) return width;

  const firstCell =
    table.querySelector(`tr:first-child .table-cell:nth-child(${columnIndex + 1})`);

  return firstCell?.getBoundingClientRect().width || 160;
}


function ensureTableColumns(
  table
) {

  const firstRow =
    table.querySelector('tr');

  if (!firstRow) return;

  const columnCount =
    firstRow.querySelectorAll('.table-cell').length;

  let colgroup =
    table.querySelector('colgroup');

  if (!colgroup) {

    colgroup =
      document.createElement('colgroup');

    table.insertBefore(
      colgroup,
      table.firstChild
    );
  }

  while (colgroup.children.length < columnCount) {

    const col =
      document.createElement('col');

    col.style.width =
      '160px';

    colgroup.appendChild(
      col
    );
  }

  lockTableWidthToColumns(
    table
  );
}


function lockTableWidthToColumns(
  table
) {

  const columns =
    [...table.querySelectorAll('col')];

  if (!columns.length) return;

  const total =
    columns.reduce((sum, column) => {

      const width =
        parseFloat(
          column.style.width || ''
        );

      return sum + (
        Number.isFinite(width)
          ? Math.max(TABLE_MIN_COLUMN_WIDTH, width)
          : 160
      );
    }, 0);

  table.style.width =
    `${Math.round(total)}px`;
}


function getCellPosition(
  cell
) {

  const row =
    cell.closest('tr');

  const table =
    cell.closest('.custom-table');

  return {
    row: [...table.querySelectorAll('tr')].indexOf(row),
    column: [...row.querySelectorAll('.table-cell')].indexOf(cell)
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
