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

let resizedColumn = null;


export function isColumnResizeActive() {

  return Boolean(
    resizedColumn
  );
}


export function startColumnResize(
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


export function resizeColumnToPointer(
  event
) {

  if (!resizedColumn) return;

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


export function finishColumnResize() {

  if (!resizedColumn) return false;

  resizedColumn.table.classList.remove(
    'is-resizing-column'
  );

  resizedColumn =
    null;

  return true;
}
