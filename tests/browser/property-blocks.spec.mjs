import {
  expect,
  test
} from '@playwright/test';


test(
  'property-block-picker-is-limited-by-card-type',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            renderTypePicker
          } = await import('/js/editor/blocks/blockPopupViews.js');

          const popup =
            document.createElement('div');

          popup.innerHTML = `
            <div class="block-popup-title"></div>
            <div class="block-popup-body"></div>
            <div class="block-popup-actions"></div>
          `;

          renderTypePicker(
            popup,
            'item'
          );

          const itemTypes =
            [...popup.querySelectorAll('.block-type-option')]
              .map(option => option.dataset.blockType);

          renderTypePicker(
            popup,
            'location'
          );

          const locationTypes =
            [...popup.querySelectorAll('.block-type-option')]
              .map(option => option.dataset.blockType);

          renderTypePicker(
            popup,
            'note'
          );

          const noteTypes =
            [...popup.querySelectorAll('.block-type-option')]
              .map(option => option.dataset.blockType);

          return {
            itemTypes,
            locationTypes,
            noteTypes
          };
        }
      );

    expect(
      result.itemTypes
    ).toContain(
      'properties'
    );

    expect(
      result.locationTypes
    ).toContain(
      'properties'
    );

    expect(
      result.noteTypes
    ).not.toContain(
      'properties'
    );
  }
);
