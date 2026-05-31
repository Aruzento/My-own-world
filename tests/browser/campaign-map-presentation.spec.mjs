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


test(
  'campaign-map-presentation-keeps-hidden-player-token-visible',
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
          syncPresentation
        } = await import('/js/editor/campaignMapPresentation.js');

        const {
          getCampaignMapStore
        } = await import('/js/editor/campaignMapStore.js');

        const {
          createMapTokenElement
        } = await import('/js/editor/campaignMapElementFactory.js');

        document.querySelector('#editorArea').innerHTML = `
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

        const layer =
          map.querySelector('.campaign-map-object-layer');

        const store =
          getCampaignMapStore(
            map
          );

        const playerToken =
          store.addToken({
            tokenId: 'hidden-player',
            type: 'creature',
            name: 'Игрок',
            isPlayerToken: true,
            presentationHidden: true
          });

        const npcToken =
          store.addToken({
            tokenId: 'hidden-npc',
            type: 'creature',
            name: 'NPC',
            presentationHidden: true
          });

        layer.append(
          createMapTokenElement(
            playerToken
          ),
          createMapTokenElement(
            npcToken
          )
        );

        store.commitToDOM();

        openPresentationWindow();
        syncPresentation();
      }
    );

    const popup =
      await popupPromise;

    await popup.waitForLoadState(
      'domcontentloaded'
    );

    const state =
      await popup.evaluate(
        () => ({
          playerExists:
            Boolean(document.querySelector('[data-token-id="hidden-player"]')),
          playerHidden:
            document.querySelector('[data-token-id="hidden-player"]')?.dataset.presentationHidden,
          playerFlag:
            document.querySelector('[data-token-id="hidden-player"]')?.dataset.playerToken,
          npcExists:
            Boolean(document.querySelector('[data-token-id="hidden-npc"]'))
        })
      );

    expect(
      state
    ).toEqual({
      playerExists: true,
      playerHidden: 'true',
      playerFlag: 'true',
      npcExists: false
    });

    await popup.close();
  }
);


test(
  'campaign-map-presentation-renders-fog-above-tokens-and-locked-zones-as-fog',
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
          syncPresentation
        } = await import('/js/editor/campaignMapPresentation.js');

        const {
          getCampaignMapStore
        } = await import('/js/editor/campaignMapStore.js');

        const {
          createMapTokenElement
        } = await import('/js/editor/campaignMapElementFactory.js');

        const {
          fillFog
        } = await import('/js/editor/campaignMapFog.js');

        document.querySelector('#editorArea').innerHTML = `
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

        const layer =
          map.querySelector('.campaign-map-object-layer');

        const store =
          getCampaignMapStore(
            map
          );

        store.addLockedFogZone({
          id: 'locked-fog-zone',
          x: 120,
          y: 140,
          width: 90,
          height: 70
        });

        const token =
          store.addToken({
            tokenId: 'fog-covered-token',
            type: 'creature',
            name: 'В тумане',
            x: 10,
            y: 10
          });

        layer.appendChild(
          createMapTokenElement(
            token
          )
        );

        fillFog(
          map
        );

        openPresentationWindow();
        syncPresentation();
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
            document.querySelector('[data-token-id="fog-covered-token"]');

          const fog =
            document.querySelector('.campaign-map-fog-image');

          const lockedFog =
            document.querySelector('.campaign-presentation-locked-fog-zone');

          return {
            tokenZ:
              Number(getComputedStyle(token).zIndex),
            fogZ:
              Number(getComputedStyle(fog).zIndex),
            fogSrcLength:
              fog?.getAttribute('src')?.length || 0,
            lockedFogExists:
              Boolean(lockedFog),
            lockedFogZ:
              Number(getComputedStyle(lockedFog).zIndex),
            lockedFogBackground:
              getComputedStyle(lockedFog).backgroundColor
          };
        }
      );

    expect(
      state.fogZ
    ).toBeGreaterThan(
      state.tokenZ
    );

    expect(
      state.fogSrcLength
    ).toBeGreaterThan(
      100
    );

    expect(
      state.lockedFogExists
    ).toBe(
      true
    );

    expect(
      state.lockedFogZ
    ).toBeGreaterThan(
      state.tokenZ
    );

    expect(
      state.lockedFogBackground
    ).toBe(
      'rgb(0, 0, 0)'
    );

    await popup.close();
  }
);
