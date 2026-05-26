import {
  markRuntime
} from './blockRuntime.js';

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

export function ensureTableControls(
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

export function upgradeTableBlock(
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

export function ensureTableColumns(
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
