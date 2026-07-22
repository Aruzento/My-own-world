import {
  expect,
  test
} from '@playwright/test';


// P1 smoke: inline formatting должен применяться только к выделению внутри persistent editable.

test(
  'formatting-service-keeps-neighbour-text-unchanged',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            clearInlineFormatting,
            applyTextColor,
            formatSelectedBlockWithHistory,
            insertPlainTextFallback,
            isSupportedInlineFormattingCommand,
            queryInlineFormattingState,
            runInlineFormattingCommand
          } = await import('/js/editor/formattingService.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="entity-layout card-shell" contenteditable="false">
              <div
                class="rich-text-field"
                contenteditable="true"
                data-persistent-editable="true"
              >alpha beta gamma</div>
            </div>
          `;

          const field =
            editor.querySelector('.rich-text-field');

          const textNode =
            field.firstChild;

          const selection =
            window.getSelection();

          const range =
            document.createRange();

          range.setStart(
            textNode,
            6
          );

          range.setEnd(
            textNode,
            10
          );

          selection.removeAllRanges();
          selection.addRange(
            range
          );

          const applied =
            runInlineFormattingCommand(
              'bold'
            );

          const boldState =
            queryInlineFormattingState(
              'bold'
            );

          const htmlAfterBold =
            field.innerHTML;

          selection.removeAllRanges();

          const outsideApplied =
            clearInlineFormatting();

          editor.innerHTML = `
            <div class="entity-layout card-shell" contenteditable="false">
              <div
                class="rich-text-field"
                contenteditable="true"
                data-persistent-editable="true"
              >
                <p>first block</p>
                <p>second block</p>
                <p>third block</p>
              </div>
            </div>
          `;

          const secondBlock =
            editor.querySelectorAll('p')[1];

          const blockRange =
            document.createRange();

          blockRange.selectNodeContents(
            secondBlock
          );

          selection.removeAllRanges();
          selection.addRange(
            blockRange
          );

          const blockApplied =
            formatSelectedBlockWithHistory(
              'h2'
            );

          const blockTags =
            [
              ...editor.querySelector('.rich-text-field').children
            ].map(element =>
              element.tagName.toLowerCase()
            );

          const thirdBlock =
            editor.querySelectorAll('p')[0];

          const listRange =
            document.createRange();

          listRange.selectNodeContents(
            thirdBlock
          );

          selection.removeAllRanges();
          selection.addRange(
            listRange
          );

          const listApplied =
            runInlineFormattingCommand(
              'insertUnorderedList'
            );

          const listHtml =
            editor.querySelector('.rich-text-field').innerHTML;

          editor.innerHTML = `
            <div class="entity-layout card-shell" contenteditable="false">
              <div
                class="rich-text-field"
                contenteditable="true"
                data-persistent-editable="true"
              >red plain insert</div>
            </div>
          `;

          const colorField =
            editor.querySelector('.rich-text-field');

          const colorNode =
            colorField.firstChild;

          const colorRange =
            document.createRange();

          colorRange.setStart(
            colorNode,
            0
          );

          colorRange.setEnd(
            colorNode,
            3
          );

          selection.removeAllRanges();
          selection.addRange(
            colorRange
          );

          const colorApplied =
            applyTextColor(
              '#ff0000'
            );

          const colorHtml =
            colorField.innerHTML;

          const clearRange =
            document.createRange();

          clearRange.selectNodeContents(
            colorField
          );

          selection.removeAllRanges();
          selection.addRange(
            clearRange
          );

          const clearApplied =
            clearInlineFormatting();

          const clearedHtml =
            colorField.innerHTML;

          const insertRange =
            document.createRange();

          insertRange.selectNodeContents(
            colorField
          );

          insertRange.collapse(
            false
          );

          selection.removeAllRanges();
          selection.addRange(
            insertRange
          );

          const insertApplied =
            insertPlainTextFallback(
              ' tail'
            );

          return {
            applied,
            blockApplied,
            blockTags,
            boldState,
            clearApplied,
            clearedHtml,
            colorApplied,
            colorHtml,
            insertApplied,
            insertedText: colorField.textContent,
            listApplied,
            listHtml,
            unknownSupported: isSupportedInlineFormattingCommand('unknown-command'),
            outsideApplied,
            htmlAfterBold,
            text: field.textContent
          };
        }
      );

    expect(
      result.applied
    ).toBe(
      true
    );

    expect(
      typeof result.boldState
    ).toBe(
      'boolean'
    );

    expect(
      result.unknownSupported
    ).toBe(
      false
    );

    expect(
      result.blockApplied
    ).toBe(
      true
    );

    expect(
      result.blockTags
    ).toEqual([
      'p',
      'h2',
      'p'
    ]);

    expect(
      result.outsideApplied
    ).toBe(
      false
    );

    expect(
      result.text
    ).toBe(
      'alpha beta gamma'
    );

    expect(
      result.htmlAfterBold
    ).toContain(
      'alpha'
    );

    expect(
      result.htmlAfterBold
    ).toContain(
      'gamma'
    );

    expect(
      result.htmlAfterBold
    ).toMatch(
      /<(b|strong)>beta<\/(b|strong)>/
    );

    expect(
      result.listApplied
    ).toBe(
      true
    );

    expect(
      result.listHtml
    ).toContain(
      '<ul>'
    );

    expect(
      result.colorApplied
    ).toBe(
      true
    );

    expect(
      result.colorHtml
    ).toContain(
      'color: rgb(255, 0, 0)'
    );

    expect(
      result.clearApplied
    ).toBe(
      true
    );

    expect(
      result.clearedHtml
    ).toBe(
      'red plain insert'
    );

    expect(
      result.insertApplied
    ).toBe(
      true
    );

    expect(
      result.insertedText
    ).toBe(
      'red plain insert tail'
    );
  }
);


test(
  'editor-block-pointer-dnd-reorders-blocks-and-cleans-runtime-ui',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        const {
          setupCustomBlocks,
          renderCustomBlocks
        } = await import('/js/editor/customBlocks.js');

        state.currentPage = {
          id: 'block-dnd-regression-page',
          template: 'card',
          type: 'note'
        };

        window.__blockDndSaveCount =
          0;

        const host =
          document.createElement('div');

        host.id =
          'block-dnd-test-editor';

        host.style.cssText =
          'position:absolute;left:88px;top:96px;width:640px;padding:24px;background:#101210;color:white;z-index:20;';

        host.innerHTML = `
          <div class="entity-layout card-shell" contenteditable="false">
            <section class="entity-main" contenteditable="false">
              <div class="template-block" data-block-type="text" data-test-block-id="alpha" contenteditable="false">
                <h2 contenteditable="false">Alpha</h2>
                <div class="rich-text-field" contenteditable="true" data-persistent-editable="true">Alpha body</div>
              </div>
              <div class="template-block" data-block-type="text" data-test-block-id="beta" contenteditable="false">
                <h2 contenteditable="false">Beta</h2>
                <div class="rich-text-field" contenteditable="true" data-persistent-editable="true">Beta body</div>
              </div>
              <div class="template-block" data-block-type="text" data-test-block-id="gamma" contenteditable="false">
                <h2 contenteditable="false">Gamma</h2>
                <div class="rich-text-field" contenteditable="true" data-persistent-editable="true">Gamma body</div>
              </div>
            </section>
          </div>
        `;

        document.body.appendChild(
          host
        );

        setupCustomBlocks(
          host,
          () => {

            window.__blockDndSaveCount +=
              1;
          }
        );

        renderCustomBlocks(
          host
        );
      }
    );

    const alphaHandle =
      page.locator(
        '#block-dnd-test-editor [data-test-block-id="alpha"] .block-drag-handle'
      );

    const gammaBlock =
      page.locator(
        '#block-dnd-test-editor [data-test-block-id="gamma"]'
      );

    const handleBox =
      await alphaHandle.boundingBox();

    const gammaBox =
      await gammaBlock.boundingBox();

    expect(
      handleBox
    ).not.toBeNull();

    expect(
      gammaBox
    ).not.toBeNull();

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2
    );

    await page.mouse.down();

    await page.mouse.move(
      gammaBox.x + 24,
      gammaBox.y + gammaBox.height + 140,
      {
        steps: 10
      }
    );

    await expect(
      page.locator('.block-drag-preview')
    ).toBeVisible();

    await expect(
      page.locator('#block-dnd-test-editor .block-drop-placeholder')
    ).toBeVisible();

    await page.mouse.up();

    const result =
      await page.evaluate(
        () => ({
          order:
            [...document.querySelectorAll(
              '#block-dnd-test-editor .entity-main .template-block'
            )]
              .map(block => block.dataset.testBlockId),
          saveCount:
            window.__blockDndSaveCount,
          previewCount:
            document.querySelectorAll('.block-drag-preview').length,
          placeholderCount:
            document.querySelectorAll(
              '#block-dnd-test-editor .block-drop-placeholder'
            ).length,
          draggableHandles:
            [...document.querySelectorAll(
              '#block-dnd-test-editor .block-drag-handle[draggable]'
            )].length,
          pressedHandles:
            [...document.querySelectorAll(
              '#block-dnd-test-editor .block-drag-handle[aria-pressed]'
            )].length
        })
      );

    expect(
      result.order
    ).toEqual(
      [
        'beta',
        'gamma',
        'alpha'
      ]
    );

    expect(
      result.saveCount
    ).toBe(
      1
    );

    expect(
      result.previewCount
    ).toBe(
      0
    );

    expect(
      result.placeholderCount
    ).toBe(
      0
    );

    expect(
      result.draggableHandles
    ).toBe(
      0
    );

    expect(
      result.pressedHandles
    ).toBe(
      0
    );
  }
);


test(
  'editor-history-undo-redo-restores-persistent-html-without-runtime-ui',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            pushEditorHistorySnapshot,
            redoEditorHistory,
            undoEditorHistory
          } = await import('/js/editor/editorHistory.js');

          const {
            serializePersistentEditorHTML
          } = await import('/js/editor/blocks/blockContract.js');

          state.currentPage = {
            id: 'history-page',
            template: 'card',
            type: 'note'
          };

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="entity-layout card-shell" contenteditable="false">
              <section class="entity-main" contenteditable="false">
                <div class="template-block" data-block-type="text" data-block-version="1" contenteditable="false">
                  <button data-runtime="true" type="button">runtime</button>
                  <div
                    class="rich-text-field"
                    contenteditable="true"
                    data-persistent-editable="true"
                  >alpha</div>
                </div>
              </section>
            </div>
          `;

          const field =
            editor.querySelector('.rich-text-field');

          pushEditorHistorySnapshot(
            editor,
            'before edit'
          );

          field.textContent =
            'beta';

          const undoResult =
            await undoEditorHistory(
              editor
            );

          const afterUndoText =
            editor.querySelector('.rich-text-field')?.textContent;

          const persistentAfterUndo =
            serializePersistentEditorHTML(
              editor
            );

          const redoResult =
            await redoEditorHistory(
              editor
            );

          const afterRedoText =
            editor.querySelector('.rich-text-field')?.textContent;

          return {
            undoResult,
            redoResult,
            afterUndoText,
            afterRedoText,
            persistentAfterUndo
          };
        }
      );

    expect(
      result.undoResult
    ).toBe(
      true
    );

    expect(
      result.redoResult
    ).toBe(
      true
    );

    expect(
      result.afterUndoText
    ).toBe(
      'alpha'
    );

    expect(
      result.afterRedoText
    ).toBe(
      'beta'
    );

    expect(
      result.persistentAfterUndo
    ).not.toContain(
      'data-runtime'
    );
  }
);
