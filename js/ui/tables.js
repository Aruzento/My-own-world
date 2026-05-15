import {
  saveCurrentPage
} from '../editor/editor.js';

import {
  addRowBelow,
  removeTableRow,
  focusCellBelow
} from './tables/tableRows.js';

import {
  pasteTextIntoTable,
  insertPlainTextAtCaret
} from './tables/tableClipboard.js';


export function setupTables() {

  document.addEventListener(
    'click',
    handleTableClick
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

    removeTableRow(
      deleteRowButton
    );

    saveCurrentPage();
    return;
  }

  if (!addRowButton) return;

  event.preventDefault();
  event.stopPropagation();

  addRowBelow(
    addRowButton
  );

  saveCurrentPage();
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
    event.clipboardData
      ?.getData('text/plain');

  if (!text) return;

  event.preventDefault();

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
