import {
  ensureTableRow,
  getTableCellIndex
} from './tableRows.js';


export function pasteTextIntoTable(
  startCell,
  text
) {

  const rows =
    normalizeLineEndings(text)
      .split('\n');

  const startRow =
    startCell.closest('tr');

  if (!startRow) return;

  const table =
    startRow.closest(
      '.custom-table'
    );

  if (!table) return;

  const startRowIndex =
    [...table.querySelectorAll('tr')]
      .indexOf(startRow);

  const startCellIndex =
    getTableCellIndex(
      startCell
    );

  const columnCount =
    startRow.querySelectorAll(
      '.table-cell'
    ).length;

  rows.forEach((rowText, rowOffset) => {

    const targetRow =
      ensureTableRow(
        table,
        startRowIndex + rowOffset,
        columnCount
      );

    writeValuesToRow({
      targetRow,
      values: rowText.split('\t'),
      startCellIndex,
      columnCount
    });
  });
}


export function insertPlainTextAtCaret(
  text
) {

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) return;

  const range =
    selection.getRangeAt(0);

  range.deleteContents();

  const textNode =
    document.createTextNode(
      text
    );

  range.insertNode(
    textNode
  );

  range.setStartAfter(
    textNode
  );

  range.collapse(
    true
  );

  selection.removeAllRanges();

  selection.addRange(
    range
  );
}


function writeValuesToRow({
  targetRow,
  values,
  startCellIndex,
  columnCount
}) {

  values.forEach((value, columnOffset) => {

    const targetCellIndex =
      startCellIndex + columnOffset;

    if (
      targetCellIndex >= columnCount
    ) return;

    const targetCell =
      targetRow.querySelectorAll(
        '.table-cell-content'
      )[targetCellIndex];

    if (!targetCell) return;

    targetCell.textContent =
      value;
  });
}


function normalizeLineEndings(
  text
) {

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}
