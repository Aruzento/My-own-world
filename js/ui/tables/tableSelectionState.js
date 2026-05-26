import {
  getTableCellPosition
} from './tableCells.js';

let tableSelection = null;


export function startTableSelection(
  cell
) {

  const table =
    cell.closest(
      '.custom-table'
    );

  if (!table) return;

  const position =
    getTableCellPosition(
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

  markSelectedCells();
}


export function updateTableSelectionPointer(
  cell
) {

  if (
    !tableSelection?.dragging ||
    !cell ||
    cell.closest('.custom-table') !== tableSelection.table
  ) return;

  const position =
    getTableCellPosition(
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

  markSelectedCells();
}


export function finishTableSelectionDrag() {

  if (!tableSelection?.dragging) return false;

  tableSelection.dragging =
    false;

  return tableSelection.moved;
}


export function isTableSelectionDragging() {

  return Boolean(
    tableSelection?.dragging
  );
}


export function clearTableSelection() {

  tableSelection =
    null;

  document
    .querySelectorAll('.table-cell.is-selected')
    .forEach(cell => {

      cell.classList.remove(
        'is-selected'
      );
    });
}


export function getNormalizedSelection() {

  if (!tableSelection?.table) return null;

  return {
    table: tableSelection.table,
    rowStart: Math.min(tableSelection.startRow, tableSelection.endRow),
    rowEnd: Math.max(tableSelection.startRow, tableSelection.endRow),
    columnStart: Math.min(tableSelection.startColumn, tableSelection.endColumn),
    columnEnd: Math.max(tableSelection.startColumn, tableSelection.endColumn)
  };
}


export function getCellsInSelection(
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


function markSelectedCells() {

  const selection =
    getNormalizedSelection();

  document
    .querySelectorAll('.table-cell.is-selected')
    .forEach(cell => {

      cell.classList.remove(
        'is-selected'
      );
    });

  if (!selection) return;

  getCellsInSelection(
    selection
  )
    .forEach(cell => {

      cell.classList.add(
        'is-selected'
      );
    });
}
