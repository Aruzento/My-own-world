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
