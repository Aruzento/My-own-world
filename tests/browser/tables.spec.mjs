import {
  expect,
  test
} from '@playwright/test';


test(
  'tables-resize-selection-paste-and-keyboard-stay-stable',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            getColumnWidth
          } = await import('/js/ui/tables/tableColumns.js');

          const {
            finishColumnResize,
            resizeColumnToPointer,
            startColumnResize
          } = await import('/js/ui/tables/tableResize.js');

          const {
            pasteTextIntoTable
          } = await import('/js/ui/tables/tableClipboard.js');

          const {
            focusCellBelow
          } = await import('/js/ui/tables/tableRows.js');

          const {
            clearTableSelection,
            finishTableSelectionDrag,
            getCellsInSelection,
            getNormalizedSelection,
            startTableSelection,
            updateTableSelectionPointer
          } = await import('/js/ui/tables/tableSelectionState.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <table class="custom-table" style="width: 240px">
              <colgroup>
                <col style="width: 100px">
                <col style="width: 140px">
              </colgroup>
              <tbody>
                <tr>
                  <td class="table-cell" contenteditable="false">
                    <div class="table-cell-content" contenteditable="true"></div>
                  </td>
                  <td class="table-cell" contenteditable="false">
                    <div class="table-cell-content" contenteditable="true"></div>
                  </td>
                </tr>
                <tr>
                  <td class="table-cell" contenteditable="false">
                    <div class="table-cell-content" contenteditable="true"></div>
                  </td>
                  <td class="table-cell" contenteditable="false">
                    <div class="table-cell-content" contenteditable="true"></div>
                  </td>
                </tr>
              </tbody>
            </table>
          `;

          const table =
            editor.querySelector('.custom-table');

          startColumnResize(
            { clientX: 100 },
            table,
            0
          );

          resizeColumnToPointer(
            { clientX: 135 }
          );

          const resizeFinished =
            finishColumnResize();

          const columnsAfterResize =
            [...table.querySelectorAll('col')]
              .map(column => column.style.width);

          const tableWidthAfterResize =
            table.style.width;

          const firstColumnWidth =
            getColumnWidth(
              table,
              0
            );

          const secondColumnWidth =
            getColumnWidth(
              table,
              1
            );

          const cells =
            table.querySelectorAll('.table-cell');

          startTableSelection(
            cells[0]
          );

          updateTableSelectionPointer(
            cells[3]
          );

          const selectionMoved =
            finishTableSelectionDrag();

          const normalizedSelection =
            getNormalizedSelection();

          const selectedCount =
            getCellsInSelection(
              normalizedSelection
            ).length;

          const domSelectedCount =
            table.querySelectorAll('.table-cell.is-selected').length;

          clearTableSelection();

          pasteTextIntoTable(
            table.querySelector('.table-cell-content'),
            'A\tB\nC\tD'
          );

          const pastedValues =
            [...table.querySelectorAll('.table-cell-content')]
              .map(cell => cell.textContent);

          const bottomLeftCell =
            table.querySelectorAll('.table-cell-content')[2];

          focusCellBelow(
            bottomLeftCell
          );

          const rowsAfterEnter =
            table.querySelectorAll('tr').length;

          const activeCellIndex =
            [...table.querySelectorAll('.table-cell-content')]
              .indexOf(document.activeElement);

          return {
            activeCellIndex,
            columnsAfterResize,
            domSelectedCount,
            firstColumnWidth,
            normalizedSelection,
            pastedValues,
            resizeFinished,
            rowsAfterEnter,
            secondColumnWidth,
            selectedCount,
            selectionMoved,
            tableWidthAfterResize
          };
        }
      );

    expect(
      result.resizeFinished
    ).toBe(
      true
    );

    expect(
      result.columnsAfterResize
    ).toEqual([
      '135px',
      '140px'
    ]);

    expect(
      result.firstColumnWidth
    ).toBe(
      135
    );

    expect(
      result.secondColumnWidth
    ).toBe(
      140
    );

    expect(
      result.tableWidthAfterResize
    ).toBe(
      '275px'
    );

    expect(
      result.selectionMoved
    ).toBe(
      true
    );

    expect(
      result.normalizedSelection
    ).toMatchObject({
      rowStart: 0,
      rowEnd: 1,
      columnStart: 0,
      columnEnd: 1
    });

    expect(
      result.selectedCount
    ).toBe(
      4
    );

    expect(
      result.domSelectedCount
    ).toBe(
      4
    );

    expect(
      result.pastedValues.slice(0, 4)
    ).toEqual([
      'A',
      'B',
      'C',
      'D'
    ]);

    expect(
      result.rowsAfterEnter
    ).toBe(
      3
    );

    expect(
      result.activeCellIndex
    ).toBe(
      4
    );
  }
);
