import {
  expect,
  test
} from '@playwright/test';


// P1 performance smoke: большая сцена не должна превращать presentation sync в полный стопор.

test(
  'campaign-map-performance-smoke-keeps-heavy-presentation-sync-bounded',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const popupPromise =
      page.waitForEvent(
        'popup'
      );

    const result =
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

          const {
            createCampaignMapPerformanceSnapshot,
            findCampaignMapBudgetWarnings
          } = await import('/js/editor/campaignMapPerformance.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-topbar" contenteditable="false">
                <h1 class="campaign-map-title singleline-field" contenteditable="true">Performance Map</h1>
              </div>

              <div class="campaign-map-stage" data-grid="true" data-grid-size="48" data-fog-mode="draw" data-fog-image="" contenteditable="false">
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

          const layer =
            map.querySelector('.campaign-map-object-layer');

          const store =
            getCampaignMapStore(
              map
            );

          for (let index = 0; index < 120; index += 1) {

            const token =
              store.addToken({
                tokenId:
                  `perf-token-${index}`,
                pageId:
                  `page-${index}`,
                type:
                  index % 4 === 0
                    ? 'object'
                    : 'creature',
                name:
                  `Token ${index}`,
                x:
                  40 + (index % 20) * 48,
                y:
                  60 + Math.floor(index / 20) * 48,
                size:
                  1,
                rotation:
                  0
              });

            layer.appendChild(
              createMapTokenElement(
                token,
                store.getModel()
              )
            );
          }

          for (let index = 0; index < 40; index += 1) {

            const shape =
              store.addShape({
                shapeId:
                  `perf-shape-${index}`,
                type:
                  index % 2 === 0
                    ? 'square'
                    : 'circle',
                x:
                  120 + (index % 10) * 96,
                y:
                  420 + Math.floor(index / 10) * 88,
                width:
                  72,
                height:
                  72
              });

            layer.appendChild(
              createMapShapeElement(
                shape,
                store.getModel()
              )
            );
          }

          store.commitToDOM();

          openPresentationWindow();

          const fullSyncStartedAt =
            performance.now();

          syncPresentation();

          const fullSyncTimeMs =
            performance.now() - fullSyncStartedAt;

          const itemSyncStartedAt =
            performance.now();

          for (let index = 0; index < 12; index += 1) {

            store.moveToken(
              `perf-token-${index}`,
              {
                x:
                  80 + index * 24,
                y:
                  120 + index * 12
              }
            );

            syncPresentationItemById(
              map,
              'token',
              `perf-token-${index}`
            );
          }

          const itemSyncTimeMs =
            performance.now() - itemSyncStartedAt;

          const snapshot =
            createCampaignMapPerformanceSnapshot(
              store.getModel().toJSON(),
              {
                fullSyncTimeMs,
                syncTimeMs:
                  itemSyncTimeMs / 12
              }
            );

          return {
            fullSyncTimeMs,
            itemSyncTimeMs,
            warnings:
              findCampaignMapBudgetWarnings(
                snapshot,
                {
                  visibleTokenCount: 200,
                  visibleShapeCount: 100,
                  fullSyncTimeMs: 1000,
                  syncTimeMs: 50
                }
              ),
            snapshot
          };
        }
      );

    const popup =
      await popupPromise;

    await popup.waitForLoadState(
      'domcontentloaded'
    );

    const presentationCounts =
      await popup.evaluate(
        () => ({
          tokens:
            document.querySelectorAll('.campaign-map-token').length,
          shapes:
            document.querySelectorAll('.campaign-map-shape').length
        })
      );

    expect(
      presentationCounts
    ).toEqual({
      tokens: 120,
      shapes: 40
    });

    expect(
      result.warnings
    ).toEqual([]);

    expect(
      result.snapshot.visibleTokenCount
    ).toBe(120);

    expect(
      result.snapshot.visibleShapeCount
    ).toBe(40);

    await popup.close();
  }
);
