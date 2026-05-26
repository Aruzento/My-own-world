import {
  expect,
  test
} from '@playwright/test';


// P1 smoke: инициатива должна принимать ручные значения и открывать отдельный порядок ходов.
test(
  'campaign-map-initiative-popup-selects-rolls-and-persists-participants',
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

          let saveCount =
            0;

          openInitiativePopup(
            map,
            anchor,
            {
              saveAndSync:
                async () => {

                  saveCount += 1;
                }
            }
          );

          const popup =
            document.querySelector('.campaign-map-popup');

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

          const activeBefore =
            popup
              .querySelector('.campaign-initiative-active')
              .textContent;

          popup
            .querySelector('.campaign-initiative-next-btn')
            .click();

          await Promise.resolve();
          await new Promise(resolve => setTimeout(resolve));

          return {
            saveCount,
            initiative:
              store.getModel().initiative,
            popupTitle:
              popup.querySelector('.campaign-map-popup-title').textContent,
            visibleRows:
              [...popup.querySelectorAll('.campaign-initiative-order-row')]
                .map(row => row.textContent.replace(/\s+/g, ' ').trim()),
            activeBefore,
            activeAfter:
              popup
                .querySelector('.campaign-initiative-active')
                .textContent,
            decoded:
              decodeURIComponent(
                map.querySelector('.campaign-map-stage').dataset.initiativeState
              )
          };
        }
      );

    expect(
      result.saveCount
    ).toBe(2);

    expect(
      result.popupTitle
    ).toBe(
      'Порядок ходов'
    );

    expect(
      result.initiative.participants
    ).toHaveLength(2);

    expect(
      result.visibleRows[0]
    ).toContain(
      '17'
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
      result.decoded
    ).toContain('initiative-hero');
  }
);
