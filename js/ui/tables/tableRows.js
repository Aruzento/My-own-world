import {
  saveCurrentPage
} from '../../editor/editor.js';


export function addRowBelow(
  button
) {

  const currentRow =
    button.closest('tr');

  if (!currentRow) return;

  const cellCount =
    currentRow.querySelectorAll(
      '.table-cell'
    ).length;

  const newRow =
    createTableRow(
      cellCount
    );

  currentRow.after(
    newRow
  );

  newRow
    .querySelector('.table-cell-content')
    ?.focus();
}


export function removeTableRow(
  button
) {

  const row =
    button.closest('tr');

  if (!row) return;

  const tbody =
    row.parentElement;

  if (!tbody) return;

  /* Последнюю строку оставляем, чтобы таблица не превращалась в пустой
     каркас без точки входа для редактирования. */
  if (
    tbody.querySelectorAll('tr').length <= 1
  ) return;

  row.remove();
}


export function focusCellBelow(
  cell
) {

  const row =
    cell.closest('tr');

  if (!row) return;

  const cellIndex =
    getTableCellIndex(
      cell
    );

  let nextRow =
    row.nextElementSibling;

  if (!nextRow) {

    nextRow =
      createTableRow(
        row.querySelectorAll('.table-cell').length
      );

    row.after(
      nextRow
    );
  }

  const nextCell =
    nextRow.querySelectorAll(
      '.table-cell-content'
    )[cellIndex];

  if (nextCell) {

    nextCell.focus();
    placeCaretAtEnd(
      nextCell
    );
  }

  saveCurrentPage();
}


export function ensureTableRow(
  table,
  rowIndex,
  columnCount
) {

  let rows =
    table.querySelectorAll('tr');

  while (rows.length <= rowIndex) {

    const row =
      createTableRow(
        columnCount
      );

    table
      .querySelector('tbody')
      .appendChild(
        row
      );

    rows =
      table.querySelectorAll('tr');
  }

  return rows[rowIndex];
}


export function getTableCellIndex(
  cell
) {

  const cells =
    [...cell
      .closest('tr')
      .querySelectorAll('.table-cell-content')];

  return cells.indexOf(
    cell
  );
}


function createTableRow(
  cellCount
) {

  const row =
    document.createElement('tr');

  Array
    .from({ length: cellCount })
    .forEach((_, index) => {

      row.appendChild(
        createTableCell(
          index === 0
        )
      );
    });

  return row;
}


function createTableCell(
  withRowControls
) {

  const cell =
    document.createElement('td');

  cell.className =
    'table-cell';

  cell.setAttribute(
    'contenteditable',
    'false'
  );

  cell.innerHTML = `
    ${withRowControls ? createRowControlsHTML() : ''}
    <div class="table-cell-content" contenteditable="true"></div>
  `;

  return cell;
}


function createRowControlsHTML() {

  return `
    <div
      class="table-row-controls"
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
        ×
      </button>
    </div>
  `;
}


function placeCaretAtEnd(
  element
) {

  const range =
    document.createRange();

  const selection =
    window.getSelection();

  range.selectNodeContents(
    element
  );

  range.collapse(
    false
  );

  selection.removeAllRanges();

  selection.addRange(
    range
  );
}
