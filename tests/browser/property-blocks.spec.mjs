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


test(
  'character-model-reads-inventory-from-items-block',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            readCharacterModelFromPage
          } = await import('/js/character/characterModel.js');

          const model =
            readCharacterModelFromPage({
              id: 'hero',
              type: 'character',
              content: `
                <div class="entity-layout card-shell">
                  <section class="entity-main">
                    <div class="template-block item-set-block" data-block-type="items">
                      <div class="item-set-list">
                        <button class="item-set-chip" data-page-id="rapier">
                          <span class="item-set-title">Рапира</span>
                          <label class="item-set-quantity-label">
                            <input class="item-set-quantity" value="1">
                          </label>
                        </button>
                        <button class="item-set-chip" data-page-id="arrows">
                          <span class="item-set-title">Стрелы</span>
                          <label class="item-set-quantity-label">
                            <input class="item-set-quantity" value="20">
                          </label>
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              `
            });

          return model.inventory;
        }
      );

    expect(
      result.totalQuantity
    ).toBe(
      21
    );

    expect(
      result.items.map(item => item.pageId)
    ).toEqual([
      'rapier',
      'arrows'
    ]);
  }
);
