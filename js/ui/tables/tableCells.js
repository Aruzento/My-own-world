export function getActiveTableCell(
  event
) {

  return event.target.closest(
    '.custom-table .table-cell-content'
  );
}


export function getTableCellPosition(
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
