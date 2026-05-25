import {
  expect,
  test
} from '@playwright/test';


// P1 smoke: popup инициативы должен записывать выбранных участников в model/save state карты.

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
            initiativeModifier: 2
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
            .querySelector('.campaign-initiative-checkbox')
            .checked =
              true;

          popup
            .querySelector('.campaign-initiative-roll-btn')
            .click();

          await Promise.resolve();

          return {
            saveCount,
            initiative:
              store.getModel().initiative,
            decoded:
              decodeURIComponent(
                map.querySelector('.campaign-map-stage').dataset.initiativeState
              )
          };
        }
      );

    expect(
      result.saveCount
    ).toBe(1);

    expect(
      result.initiative.participants
    ).toHaveLength(1);

    expect(
      result.initiative.participants[0].tokenId
    ).toBe('initiative-hero');

    expect(
      result.initiative.participants[0].roll
    ).toBeGreaterThanOrEqual(1);

    expect(
      result.decoded
    ).toContain('initiative-hero');
  }
);
