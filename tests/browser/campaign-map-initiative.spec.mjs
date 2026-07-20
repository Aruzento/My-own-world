import {
  expect,
  test
} from '@playwright/test';


test(
  'campaign-map-initiative-popup-selects-edits-and-reopens-turn-window',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            getCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            openInitiativePopup
          } = await import('/js/editor/campaignMapInitiativePopup.js');

          const {
            closeMapPopup
          } = await import('/js/editor/campaignMapPopupController.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <button id="initiativeAnchor" type="button">initiative</button>
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-topbar" contenteditable="false">
                <h1 class="campaign-map-title singleline-field" contenteditable="true">Initiative Map</h1>
              </div>

              <div class="campaign-map-stage" data-grid="false" data-fog-mode="draw" data-fog-image="" contenteditable="false">
                <div class="campaign-map-viewport">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          const map =
            editor.querySelector('.campaign-map-document');

          const anchor =
            editor.querySelector('#initiativeAnchor');

          const store =
            getCampaignMapStore(
              map
            );

          store.addToken({
            tokenId: 'initiative-hero',
            pageId: 'hero-page',
            sourceMode: 'original',
            type: 'creature',
            name: 'Hero',
            x: 10,
            y: 10,
            modifier: 2
          });

          store.addToken({
            tokenId: 'initiative-enemy',
            pageId: 'enemy-page',
            type: 'creature',
            name: 'Enemy',
            x: 12,
            y: 12,
            modifier: -1
          });

          store.addToken({
            tokenId: 'initiative-object',
            type: 'object',
            name: 'Object',
            x: 20,
            y: 20
          });

          store.addToken({
            tokenId: 'initiative-dead',
            type: 'creature',
            name: 'Dead',
            hp: 0,
            x: 22,
            y: 22,
            modifier: 4
          });

          let saveCount =
            0;

          const deps =
            {
              saveAndSync:
                async () => {

                  saveCount += 1;
                }
            };

          openInitiativePopup(
            map,
            anchor,
            deps
          );

          const popup =
            document.querySelector('.campaign-map-popup');

          const pickerNames =
            [...popup.querySelectorAll('.campaign-initiative-name')]
              .map(node =>
                node.textContent
              );

          popup
            .querySelectorAll('.campaign-initiative-checkbox')
            .forEach(input => {

              input.checked =
                true;
            });

          const values =
            popup.querySelectorAll('.campaign-initiative-value');

          values[0].value =
            '17';

          values[1].value =
            '12';

          popup
            .querySelector('.campaign-initiative-save-btn')
            .click();

          await Promise.resolve();
          await new Promise(resolve => setTimeout(resolve));

          const orderTitle =
            popup.querySelector('.campaign-map-popup-title').textContent;

          const activeBefore =
            popup
              .querySelector('.campaign-initiative-active')
              .textContent;

          popup
            .querySelector('.campaign-initiative-next-btn')
            .click();

          await Promise.resolve();
          await new Promise(resolve => setTimeout(resolve));

          const activeAfter =
            popup
              .querySelector('.campaign-initiative-active')
              .textContent;

          const orderValues =
            popup.querySelectorAll('.campaign-initiative-order-row .campaign-initiative-value');

          orderValues[1].value =
            '30';

          popup
            .querySelector('.campaign-initiative-save-order-btn')
            .click();

          await Promise.resolve();
          await new Promise(resolve => setTimeout(resolve));

          const editedRows =
            [...popup.querySelectorAll('.campaign-initiative-order-row')]
              .map(row => ({
                text:
                  row.textContent.replace(/\s+/g, ' ').trim(),
                value:
                  row.querySelector('.campaign-initiative-value')?.value || ''
              }));

          closeMapPopup();

          openInitiativePopup(
            map,
            anchor,
            deps
          );

          const reopenedTitle =
            popup.querySelector('.campaign-map-popup-title').textContent;

          return {
            saveCount,
            pickerNames,
            initiative:
              store.getModel().initiative,
            orderTitle,
            visibleRows:
              [...popup.querySelectorAll('.campaign-initiative-order-row')]
                .map(row => ({
                  text:
                    row.textContent.replace(/\s+/g, ' ').trim(),
                  value:
                    row.querySelector('.campaign-initiative-value')?.value || ''
                })),
            activeBefore,
            activeAfter,
            editedRows,
            reopenedTitle,
            decoded:
              decodeURIComponent(
                map.querySelector('.campaign-map-stage').dataset.initiativeState
              )
          };
        }
      );

    expect(
      result.saveCount
    ).toBe(
      3
    );

    expect(
      result.pickerNames
    ).not.toContain(
      'Dead'
    );

    expect(
      result.orderTitle
    ).toBe(
      'Ходы'
    );

    expect(
      result.initiative.participants
    ).toHaveLength(
      2
    );

    expect(
      result.visibleRows[0].value
    ).toBe(
      '30'
    );

    expect(
      result.activeBefore
    ).toContain(
      'Ход:'
    );

    expect(
      result.activeAfter
    ).toContain(
      'Ход:'
    );

    expect(
      result.activeAfter
    ).not.toBe(
      result.activeBefore
    );

    expect(
      result.editedRows[0].value
    ).toBe(
      '30'
    );

    expect(
      result.reopenedTitle
    ).toBe(
      'Ходы'
    );

    expect(
      result.decoded
    ).toContain(
      'initiative-hero'
    );
  }
);


test(
  'campaign-map-token-initiative-uses-character-model-dex-modifier',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            setPages
          } = await import('/js/stateActions.js');

          const {
            addMapToken
          } = await import('/js/editor/campaignMapRuntime.js');

          const {
            openInitiativePopup
          } = await import('/js/editor/campaignMapInitiativePopup.js');

          const {
            getCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const creaturePage = {
            id: 'dex-creature',
            title: 'Fast Creature',
            type: 'creature',
            template: 'card',
            tags: ['card', 'creature'],
            aliases: [],
            content: `
              <div class="entity-layout card-shell">
                <section class="entity-main">
                  <script type="application/json" data-character-effects>
                    {
                      "conditions": ["restrained"],
                      "effects": [
                        {
                          "id": "alert",
                          "title": "Alert",
                          "modifiers": {
                            "initiative": 2
                          }
                        }
                      ]
                    }
                  </script>
                  <div class="template-block card-properties-block card-properties-creature"
                    data-block-type="properties"
                    data-card-type="creature"
                    contenteditable="false">
                    <input data-property-name="hpCurrent" value="7">
                    <input data-property-name="hpMax" value="12">
                    <input data-property-name="dex" value="16">
                  </div>
                </section>
              </div>
            `
          };

          setPages([
            creaturePage
          ]);

          document.querySelector('#editorArea').innerHTML = `
            <button id="initiativeAnchor" type="button">initiative</button>
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-stage" data-grid="false" data-fog-mode="draw" data-fog-image="" contenteditable="false">
                <div class="campaign-map-viewport">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          const map =
            document.querySelector('.campaign-map-document');

          await addMapToken(
            map,
            'creature',
            creaturePage
          );

          const token =
            map.querySelector('.campaign-map-token');

          openInitiativePopup(
            map,
            document.querySelector('#initiativeAnchor'),
            {
              saveAndSync:
                async () => {}
            }
          );

          const initiativeInput =
            document.querySelector('.campaign-initiative-value');

          return {
            tokenModifier:
              token.dataset.initiativeModifier,
            tokenHp:
              token.dataset.hp,
            tokenHpMax:
              token.dataset.hpMax,
            tokenArmorClass:
              token.dataset.armorClass,
            tokenSpeed:
              token.dataset.speed,
            modelModifier:
              getCampaignMapStore(map)
                .getModel()
                .tokens[0]
                .initiativeModifier,
            modelHp:
              getCampaignMapStore(map)
                .getModel()
                .tokens[0]
                .hp,
            modelArmorClass:
              getCampaignMapStore(map)
                .getModel()
                .tokens[0]
                .armorClass,
            modelSpeed:
              getCampaignMapStore(map)
                .getModel()
                .tokens[0]
                .speed,
            popupModifier:
              initiativeInput.dataset.modifier,
            conditionCount:
              token.dataset.conditionCount,
            effectsSummary:
              token.dataset.effectsSummary
          };
        }
      );

    expect(
      result.tokenModifier
    ).toBe(
      '5'
    );

    expect(
      result.tokenHp
    ).toBe(
      '7'
    );

    expect(
      result.tokenHpMax
    ).toBe(
      '12'
    );

    expect(
      result.tokenArmorClass
    ).toBe(
      '13'
    );

    expect(
      result.tokenSpeed
    ).toBe(
      '0'
    );

    expect(
      result.modelModifier
    ).toBe(
      5
    );

    expect(
      result.modelHp
    ).toBe(
      7
    );

    expect(
      result.modelArmorClass
    ).toBe(
      13
    );

    expect(
      result.modelSpeed
    ).toBe(
      0
    );

    expect(
      result.popupModifier
    ).toBe(
      '5'
    );

    expect(
      result.conditionCount
    ).toBe(
      '1'
    );

    expect(
      result.effectsSummary
    ).toBeTruthy();
  }
);
