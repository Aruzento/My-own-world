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

    expect(
      result.itemTypes
    ).toContain(
      'list'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'characterEffects'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'items'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'spells'
    );

    expect(
      result.itemTypes
    ).not.toContain(
      'skills'
    );
  }
);


test(
  'property-settings-gear-opens-soft-settings-popup',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          applyBlockSystemContract(
            editor
          );

          const button =
            editor.querySelector('.card-properties-settings-btn');

          button.click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const popup =
            document.querySelector('.property-settings-popup');

          return {
            hasButton:
              Boolean(button),
            popupVisible:
              Boolean(popup) &&
              !popup.classList.contains('hidden'),
            rowCount:
              popup?.querySelectorAll('.property-settings-row').length || 0,
            hasAddButton:
              Boolean(
                popup?.querySelector('.property-settings-add')
              )
          };
        }
      );

    expect(
      result
    ).toEqual({
      hasButton: true,
      popupVisible: true,
      rowCount: 5,
      hasAddButton: true
    });
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


test(
  'character-model-reads-effects-data-from-persistent-json',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            getCharacterEffects,
            hasCharacterCondition,
            readCharacterModelFromPage
          } = await import('/js/character/characterModel.js');

          const model =
            readCharacterModelFromPage({
              id: 'hero',
              type: 'character',
              content: `
                <div class="entity-layout card-shell">
                  <script type="application/json" data-character-effects>
                    {
                      "conditions": [
                        "restrained"
                      ],
                      "effects": [
                        {
                          "id": "haste",
                          "title": "Ускорение",
                          "sourceType": "spell",
                          "modifiers": {
                            "armorClass": 2,
                            "speed": 30
                          }
                        }
                      ]
                    }
                  </script>
                </div>
              `
            });

          const effects =
            getCharacterEffects(
              model
            );

          return {
            hasRestrained:
              hasCharacterCondition(
                model,
                'restrained'
              ),
            speed:
              effects.modifiers.speed,
            armorClass:
              effects.modifiers.armorClass,
            attackersHaveAdvantage:
              effects.flags.attackersHaveAdvantage
          };
        }
      );

    expect(
      result
    ).toEqual({
      hasRestrained: true,
      speed: 30,
      armorClass: 2,
      attackersHaveAdvantage: true
    });
  }
);


test(
  'character-effects-block-ui-updates-persistent-json',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createCharacterEffectsBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterEffectsBlocks,
            setupCharacterEffectsBlocks
          } = await import('/js/editor/characterEffectsBlock.js');

          const editor =
            document.createElement('div');

          editor.innerHTML =
            createCharacterEffectsBlock({
              title: 'Эффекты'
            });

          let saves =
            0;

          setupCharacterEffectsBlocks(
            editor,
            () => {
              saves += 1;
            }
          );

          renderCharacterEffectsBlocks(
            editor
          );

          editor
            .querySelector('.character-effects-condition-select')
            .value =
              'poisoned';

          editor
            .querySelector('.character-effects-add-condition')
            .click();

          editor
            .querySelector('.character-effects-effect-title')
            .value =
              'Ускорение';

          editor
            .querySelector('.character-effects-initiative')
            .value =
              '2';

          editor
            .querySelector('.character-effects-add-effect')
            .click();

          const data =
            JSON.parse(
              editor.querySelector('[data-character-effects]').textContent
            );

          return {
            saves,
            condition:
              data.conditions[0].key,
            effectTitle:
              data.effects[0].title,
            initiative:
              data.effects[0].modifiers.initiative,
            visible:
              editor.querySelector('.character-effects-summary').textContent
          };
        }
      );

    expect(
      result.saves
    ).toBe(
      2
    );

    expect(
      result.condition
    ).toBe(
      'poisoned'
    );

    expect(
      result.effectTitle
    ).toBe(
      'Ускорение'
    );

    expect(
      result.initiative
    ).toBe(
      2
    );

    expect(
      result.visible
    ).toContain(
      'Отравлен'
  );
}
);


test(
  'property-settings-adds-custom-field-and-model-keeps-it-after-serialization',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract,
            serializePersistentEditorHTML
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            readPropertiesModelsFromHTML
          } = await import('/js/properties/propertiesModel.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          applyBlockSystemContract(
            editor
          );

          editor
            .querySelector('.card-properties-settings-btn')
            .click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const popup =
            document.querySelector('.property-settings-popup');

          popup
            .querySelector('.property-settings-add')
            .click();

          popup
            .querySelector('.property-settings-new-label')
            .value =
              'Радиус';

          popup
            .querySelector('.property-settings-new-type')
            .value =
              'number';

          popup
            .querySelector('.property-settings-create')
            .click();

          const customInput =
            editor.querySelector(
              '[data-property-custom-value="true"]'
            );

          customInput.value =
            '15';

          const html =
            serializePersistentEditorHTML(
              editor
            );

          const model =
            readPropertiesModelsFromHTML(
              html
            )[0];

          return {
            htmlHasRuntimeGear:
              html.includes('card-properties-settings-btn'),
            htmlHasCustomField:
              html.includes('data-property-custom="true"'),
            customLabel:
              model.customFields[0]?.label,
            customValue:
              model.customValues[model.customFields[0]?.key],
            hasCustomDragHandle:
              Boolean(
                customInput
                  .closest('.card-property-field')
                  .querySelector('.card-property-drag-handle')
              ),
            customResizeDots:
              customInput
                .closest('.card-property-field')
                .querySelectorAll('.card-property-resize-dot')
                .length
          };
        }
      );

    expect(
      result
    ).toEqual({
      htmlHasRuntimeGear: false,
      htmlHasCustomField: true,
      customLabel: 'Радиус',
      customValue: '15',
      hasCustomDragHandle: true,
      customResizeDots: 8
    });
  }
);


test(
  'property-settings-can-remove-standard-field-and-add-calculated-preset',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'character'
            });

          applyBlockSystemContract(
            editor
          );

          editor
            .querySelector('.card-properties-settings-btn')
            .click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          let popup =
            document.querySelector('.property-settings-popup');

          const deleteLevel =
            popup.querySelector(
              '.property-settings-delete[data-field-id="level"]'
            );

          deleteLevel.click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          popup =
            document.querySelector('.property-settings-popup');

          popup
            .querySelector('.property-settings-add')
            .click();

          const preset =
            popup.querySelector('.property-settings-preset');

          preset.value =
            'initiative';

          preset.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          popup
            .querySelector('.property-settings-create')
            .click();

          return {
            hasLevel:
              Boolean(
                editor.querySelector('[data-property-name="level"]')
              ),
            initiativeLabel:
              editor
                .querySelector(
                  '.card-property-field[data-property-id="initiative"] .card-property-label'
                )
                ?.textContent
                ?.trim(),
            initiativeType:
              editor
                .querySelector('[data-property-name="initiative"]')
                ?.getAttribute('type'),
            popupText:
              popup.textContent,
            hasSizeButton:
              Boolean(
                popup.querySelector(
                  '.property-settings-toggle-wide'
                )
              )
          };
        }
      );

    expect(
      result.hasLevel
    ).toBe(
      false
    );

    expect(
      result.initiativeLabel
    ).toBe(
      'Инициатива'
    );

    expect(
      result.initiativeType
    ).toBe(
      'number'
    );

    expect(
      result.popupText
    ).not.toContain(
      'свой'
    );

    expect(
      result.hasSizeButton
    ).toBe(
      false
    );
  }
);


test(
  'property-fields-support-pointer-reorder-and-edge-resize',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          applyBlockSystemContract(
            editor
          );

          const firstField =
            editor.querySelector('[data-property-name="gold"]')
              .closest('.card-property-field');

          const secondField =
            editor.querySelector('[data-property-name="silver"]')
              .closest('.card-property-field');

          const dragHandle =
            firstField.querySelector('.card-property-drag-handle');

          const secondRect =
            secondField.getBoundingClientRect();

          dragHandle.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: secondRect.left + 4,
                clientY: secondRect.top + 4,
                pointerId: 1
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                clientX: secondRect.right - 4,
                clientY: secondRect.bottom - 4,
                pointerId: 1
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 1
              }
            )
          );

          const order =
            [
              ...editor.querySelectorAll('.card-property-field [data-property-name]')
            ].map(control => control.dataset.propertyName);

          const resizeHandle =
            secondField.querySelector('.card-property-resize-dot-se');

          resizeHandle.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: 10,
                clientY: 10,
                pointerId: 2
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                clientX: 80,
                clientY: 70,
                pointerId: 2
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 2
              }
            )
          );

          const westHandle =
            firstField.querySelector('.card-property-resize-dot-w');

          westHandle.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: 120,
                clientY: 40,
                pointerId: 3
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                clientX: 40,
                clientY: 40,
                pointerId: 3
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 3
              }
            )
          );

          const orderAfterWestResize =
            [
              ...editor.querySelectorAll('.card-property-field [data-property-name]')
            ].map(control => control.dataset.propertyName);

          const grid =
            editor.querySelector('.card-properties-grid');

          grid.style.minHeight =
            '320px';

          const gridRect =
            grid.getBoundingClientRect();

          dragHandle.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: gridRect.left + 4,
                clientY: gridRect.top + 4,
                pointerId: 4
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointermove',
              {
                bubbles: true,
                clientX: gridRect.right - 8,
                clientY: gridRect.bottom - 8,
                pointerId: 4
              }
            )
          );

          editor.dispatchEvent(
            new PointerEvent(
              'pointerup',
              {
                bubbles: true,
                pointerId: 4
              }
            )
          );

          const orderAfterEmptyDrop =
            [
              ...editor.querySelectorAll('.card-property-field [data-property-name]')
            ].map(control => control.dataset.propertyName);

          return {
            order,
            dragHandleTag:
              dragHandle.tagName,
            span:
              secondField.dataset.propertySpan,
            rows:
              secondField.dataset.propertyRows,
            westSpan:
              firstField.dataset.propertySpan,
            orderAfterWestResize,
            orderAfterEmptyDrop,
            resizeDots:
              secondField.querySelectorAll('.card-property-resize-dot').length,
            dragIcon:
              Boolean(
                dragHandle.querySelector('.app-icon')
              )
          };
        }
      );

    expect(
      result.order.slice(
        0,
        2
      )
    ).toEqual([
      'silver',
      'gold'
    ]);

    expect(
      result.dragHandleTag
    ).toBe(
      'SPAN'
    );

    expect(
      Number(result.span)
    ).toBeGreaterThan(
      3
    );

    expect(
      Number(result.rows)
    ).toBeGreaterThan(
      1
    );

    expect(
      Number(result.westSpan)
    ).toBeGreaterThan(
      3
    );

    expect(
      result.orderAfterWestResize[0]
    ).toBe(
      'gold'
    );

    expect(
      result.orderAfterEmptyDrop.at(-1)
    ).toBe(
      'gold'
    );

    expect(
      result.resizeDots
    ).toBe(
      8
    );

    expect(
      result.dragIcon
    ).toBe(
      true
    );
  }
);


test(
  'character-effects-block-can-link-effect-from-source-card',
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
            createCharacterEffectsBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterEffectsBlocks,
            setupCharacterEffectsBlocks
          } = await import('/js/editor/characterEffectsBlock.js');

          state.currentPage = {
            id: 'hero',
            type: 'character'
          };

          state.pages = [
            state.currentPage,
            {
              id: 'boots',
              title: 'Сапоги скорости',
              name: 'Сапоги скорости',
              type: 'item',
              content: `
                <script type="application/json" data-character-effects>
                  {
                    "effects": [
                      {
                        "id": "speed",
                        "title": "Быстрый шаг",
                        "sourceType": "item",
                        "modifiers": {
                          "speed": 10,
                          "initiative": 1
                        }
                      }
                    ]
                  }
                </script>
              `
            }
          ];

          const editor =
            document.createElement('div');

          editor.innerHTML =
            createCharacterEffectsBlock({
              title: 'Эффекты'
            });

          setupCharacterEffectsBlocks(
            editor,
            () => {}
          );

          renderCharacterEffectsBlocks(
            editor
          );

          editor.querySelector(
            '.character-effects-source-page'
          ).value =
            'boots';

          editor.querySelector(
            '.character-effects-add-effect'
          ).click();

          const data =
            JSON.parse(
              editor.querySelector('[data-character-effects]').textContent
            );

          return {
            title:
              data.effects[0].title,
            sourcePageId:
              data.effects[0].sourcePageId,
            speed:
              data.effects[0].modifiers.speed
          };
        }
      );

    expect(
      result
    ).toEqual({
      title: 'Сапоги скорости: Быстрый шаг',
      sourcePageId: 'boots',
      speed: 10
    });
  }
);


test(
  'character-effects-block-selects-rule-tree-rule-for-character-model',
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
            getCharacterEffectiveArmorClass,
            readCharacterModelFromPage
          } = await import('/js/character/characterModel.js');

          const {
            createCharacterEffectsBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterEffectsBlocks,
            setupCharacterEffectsBlocks
          } = await import('/js/editor/characterEffectsBlock.js');

          state.currentPage = {
            id: 'hero',
            title: 'Герой',
            type: 'character'
          };

          state.pages = [
            state.currentPage,
            {
              id: 'rule-tree',
              title: 'Правила',
              template: 'ruleTree',
              type: 'ruleTree',
              tags: [
                'rule-tree'
              ],
              content: `
                <div class="rule-tree-document">
                  <script type="application/json" data-rule-tree-data>
                    {
                      "version": 1,
                      "activeRuleIds": [],
                      "rules": [
                        {
                          "id": "rule-defense",
                          "title": "Боевой стиль: оборона",
                          "effects": [
                            {
                              "id": "defense",
                              "title": "Оборона",
                              "modifiers": {
                                "armorClass": 1
                              }
                            }
                          ]
                        }
                      ]
                    }
                  </script>
                </div>
              `
            }
          ];

          const editor =
            document.createElement('div');

          editor.innerHTML =
            createCharacterEffectsBlock({
              title: 'Эффекты'
            });

          setupCharacterEffectsBlocks(
            editor,
            () => {}
          );

          renderCharacterEffectsBlocks(
            editor
          );

          editor.querySelector(
            '.character-effects-rule-select'
          ).value =
            'rule-defense';

          editor.querySelector(
            '.character-effects-add-rule'
          ).click();

          const data =
            JSON.parse(
              editor.querySelector('[data-character-effects]').textContent
            );

          const pageModel =
            {
              ...state.currentPage,
              content:
                editor.innerHTML
            };

          const character =
            readCharacterModelFromPage(
              pageModel,
              {
                pages:
                  state.pages
              }
            );

          return {
            selectedRuleIds:
              data.selectedRuleIds,
            armorClass:
              getCharacterEffectiveArmorClass(
                character
              )
          };
        }
      );

    expect(
      result.selectedRuleIds
    ).toEqual([
      'rule-defense'
    ]);

    expect(
      result.armorClass
    ).toBe(
      11
  );
}
);


test(
  'property-settings-gear-appears-when-contract-applies-to-new-block-root',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createPropertiesBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const wrapper =
            document.createElement('div');

          wrapper.innerHTML =
            createPropertiesBlock({
              cardType: 'item'
            });

          const block =
            wrapper.firstElementChild;

          applyBlockSystemContract(
            block
          );

          const button =
            block.querySelector(
              '.card-properties-settings-btn'
            );

          button?.click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const popup =
            document.querySelector('.property-settings-popup');

          return {
            hasButton:
              Boolean(button),
            popupVisible:
              Boolean(popup) &&
              !popup.classList.contains('hidden')
          };
        }
      );

    expect(
      result
    ).toEqual({
      hasButton: true,
      popupVisible: true
    });
  }
);


test(
  'character-model-auto-applies-effects-from-inventory-items',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            getCharacterEffectiveSpeed,
            getCharacterInitiativeModifier,
            readCharacterModelFromPage
          } = await import('/js/character/characterModel.js');

          const itemPage = {
            id: 'boots',
            title: 'Сапоги скорости',
            type: 'item',
            content: `
              <script type="application/json" data-character-effects>
                {
                  "effects": [
                    {
                      "id": "speed",
                      "title": "Быстрый шаг",
                      "sourceType": "item",
                      "modifiers": {
                        "speed": 10,
                        "initiative": 2
                      }
                    }
                  ]
                }
              </script>
            `
          };

          const heroPage = {
            id: 'hero',
            type: 'character',
            content: `
              <div class="entity-layout card-shell">
                <div class="template-block item-set-block" data-block-type="items">
                  <div class="item-set-list">
                    <button class="item-set-chip" data-page-id="boots">
                      <span class="item-set-title">Сапоги скорости</span>
                      <input class="item-set-quantity" value="1">
                    </button>
                  </div>
                </div>
              </div>
            `
          };

          const model =
            readCharacterModelFromPage(
              heroPage,
              {
                pages: [
                  heroPage,
                  itemPage
                ]
              }
            );

          return {
            speed:
              getCharacterEffectiveSpeed(
                model
              ),
            initiative:
              getCharacterInitiativeModifier(
                model
              ),
            effectTitle:
              model.effects.effects[0].title
          };
        }
      );

    expect(
      result
    ).toEqual({
      speed: 40,
      initiative: 2,
      effectTitle: 'Сапоги скорости: Быстрый шаг'
    });
  }
);


test(
  'character-sheet-block-renders-character-model-summary',
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
            createCharacterSheetBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterSheetBlocks
          } = await import('/js/editor/characterSheetBlock.js');

          state.currentPage = {
            id: 'hero',
            type: 'character',
            content: `
              <div class="entity-layout card-shell">
                <div class="template-block card-properties-block" data-block-type="properties" data-card-type="character">
                  <input data-property-name="level" value="5">
                  <input data-property-name="armorClass" value="15">
                  <input data-property-name="speed" value="30">
                  <input data-property-name="hpCurrent" value="12">
                  <input data-property-name="hpMax" value="20">
                  <input data-property-name="dex" value="16">
                </div>
                <script type="application/json" data-character-effects>
                  {
                    "effects": [
                      {
                        "id": "shield",
                        "title": "Щит",
                        "modifiers": {
                          "armorClass": 2
                        }
                      }
                    ]
                  }
                </script>
              </div>
            `
          };

          state.pages = [
            state.currentPage
          ];

          const editor =
            document.createElement('div');

          editor.innerHTML =
            createCharacterSheetBlock();

          renderCharacterSheetBlocks(
            editor
          );

          return editor.textContent;
        }
      );

    expect(
      result
    ).toContain(
      'КЗ'
    );

    expect(
      result
    ).toContain(
      '17'
    );

    expect(
      result
    ).toContain(
      'Щит'
    );
  }
);


test(
  'character-sheet-edit-writes-values-to-properties-block',
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
            createCharacterSheetBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterSheetBlocks,
            setupCharacterSheetBlocks
          } = await import('/js/editor/characterSheetBlock.js');

          state.currentPage = {
            id: 'hero',
            type: 'character',
            content: ''
          };

          state.pages = [
            state.currentPage
          ];

          const editor =
            document.createElement('div');

          editor.id =
            'editorArea';

          editor.innerHTML = `
            <section class="entity-main">
              <div class="blocks-toolbar" data-runtime="true"></div>
              ${createCharacterSheetBlock()}
            </section>
          `;

          let saved =
            false;

          setupCharacterSheetBlocks(
            editor,
            async () => {

              saved =
                true;
            }
          );

          renderCharacterSheetBlocks(
            editor
          );

          const levelInput =
            editor.querySelector(
              '[data-character-sheet-field="level"]'
            );

          levelInput.value =
            '7';

          levelInput.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          await new Promise(resolve =>
            setTimeout(resolve)
          );

          const propertiesBlock =
            editor.querySelector(
              '.card-properties-block[data-card-type="character"]'
            );

          return {
            saved,
            hasPropertiesBlock:
              Boolean(propertiesBlock),
            level:
              propertiesBlock
                ?.querySelector('[data-property-name="level"]')
                ?.getAttribute('value')
          };
        }
      );

    expect(
      result
    ).toEqual({
      saved: true,
      hasPropertiesBlock: true,
      level: '7'
    });
  }
);


test(
  'universal-list-block-switches-kind-without-changing-block-type',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createListBlock
          } = await import('/js/templates/blockTypes.js');

          const wrapper =
            document.createElement('div');

          wrapper.innerHTML =
            createListBlock({
              title: 'Связи',
              kind: 'items'
            });

          const block =
            wrapper.firstElementChild;

          document.body.appendChild(
            block
          );

          const select =
            block.querySelector(
              '.universal-list-kind-select'
            );

          select.value =
            'creatures';

          select.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          await new Promise(resolve =>
            setTimeout(resolve)
          );

          return {
            blockType:
              block.dataset.blockType,
            listKind:
              block.dataset.listKind,
            selected:
              block.querySelector('option[value="creatures"]')
                ?.hasAttribute('selected')
          };
        }
      );

    expect(
      result
    ).toEqual({
      blockType: 'list',
      listKind: 'creatures',
      selected: true
    });
  }
);
