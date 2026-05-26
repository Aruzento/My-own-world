import {
  TABLE_DEFAULT_COLUMN_WIDTH,
  TABLE_MIN_COLUMN_WIDTH,
  TABLE_RESIZE_EDGE
} from './tableConstants.js';

import {
  getTableCellPosition
} from './tableCells.js';


export function getResizeColumnIndex(
  event,
  cell
) {

  const rect =
    cell.getBoundingClientRect();

  if (
    Math.abs(event.clientX - rect.right) > TABLE_RESIZE_EDGE
  ) return null;

  return getTableCellPosition(
    cell
  ).column;
}


export function updateTableResizeCursor(
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


export function getColumnWidth(
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
    table.querySelector(
      `tr:first-child .table-cell:nth-child(${columnIndex + 1})`
    );

  return firstCell?.getBoundingClientRect().width || TABLE_DEFAULT_COLUMN_WIDTH;
}


export function ensureTableColumns(
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
      `${TABLE_DEFAULT_COLUMN_WIDTH}px`;

    colgroup.appendChild(
      col
    );
  }

  lockTableWidthToColumns(
    table
  );
}


export function lockTableWidthToColumns(
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
          : TABLE_DEFAULT_COLUMN_WIDTH
      );
    }, 0);

  table.style.width =
    `${Math.round(total)}px`;
}
