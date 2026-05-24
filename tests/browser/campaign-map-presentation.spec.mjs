import {
  expect,
  test
} from '@playwright/test';


// P0 smoke: презентация должна получать изменения token/shape по id из модели.

test(
  'campaign-map-presentation-syncs-token-and-shape-by-id',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const popupPromise =
      page.waitForEvent(
        'popup'
      );

    await page.evaluate(
      async () => {

        const {
          openPresentationWindow,
          syncPresentation,
          syncPresentationItemById
        } = await import('/js/editor/campaignMapPresentation.js');

        const {
          getCampaignMapStore
        } = await import('/js/editor/campaignMapStore.js');

        const {
          createMapShapeElement,
          createMapTokenElement
        } = await import('/js/editor/campaignMapElementFactory.js');

        const createMapShellHTML =
          () => `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-topbar" contenteditable="false">
                <h1 class="campaign-map-title singleline-field" contenteditable="true">Презентация</h1>
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

        document.querySelector('#editorArea').innerHTML =
          createMapShellHTML();

        const map =
          document.querySelector('.campaign-map-document');

        const layer =
          map.querySelector('.campaign-map-object-layer');

        const store =
          getCampaignMapStore(
            map
          );

        const tokenData =
          store.addToken({
            tokenId: 'presentation-token',
            type: 'creature',
            name: 'Синхронизируемый',
            x: 10,
            y: 15,
            size: 1
          });

        const shapeData =
          store.addShape({
            shapeId: 'presentation-shape',
            type: 'square',
            x: 100,
            y: 120,
            width: 60,
            height: 70
          });

        layer.appendChild(
          createMapTokenElement(
            tokenData,
            store.getModel()
          )
        );

        layer.appendChild(
          createMapShapeElement(
            shapeData,
            store.getModel()
          )
        );

        store.commitToDOM();

        openPresentationWindow();
        syncPresentation();

        store.moveToken(
          'presentation-token',
          {
            x: 40,
            y: 45
          }
        );

        store.resizeShape(
          'presentation-shape',
          {
            x: 180,
            y: 220,
            width: 90,
            height: 110
          }
        );

        syncPresentationItemById(
          map,
          'token',
          'presentation-token'
        );

        syncPresentationItemById(
          map,
          'shape',
          'presentation-shape'
        );
      }
    );

    const popup =
      await popupPromise;

    await popup.waitForLoadState(
      'domcontentloaded'
    );

    const state =
      await popup.evaluate(
        () => {

          const token =
            document.querySelector('[data-token-id="presentation-token"]');

          const shape =
            document.querySelector('[data-shape-id="presentation-shape"]');

          return {
            tokenX: token?.dataset.x,
            tokenY: token?.dataset.y,
            shapeX: shape?.dataset.x,
            shapeY: shape?.dataset.y,
            shapeW: shape?.dataset.w,
            shapeH: shape?.dataset.h
          };
        }
      );

    expect(
      state
    ).toEqual({
      tokenX: '40.000',
      tokenY: '45.000',
      shapeX: '180',
      shapeY: '220',
      shapeW: '90',
      shapeH: '110'
    });

    await popup.close();
  }
);
