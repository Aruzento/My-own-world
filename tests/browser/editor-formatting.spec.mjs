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

          const htmlAfterBold =
            field.innerHTML;

          selection.removeAllRanges();

          const outsideApplied =
            clearInlineFormatting();

          return {
            applied,
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
  }
);
