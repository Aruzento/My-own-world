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


test(
  'campaign-map-fog-paint-large-stays-inside-budget',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            assertCampaignMapPerformanceBudget,
            createCampaignMapPerformanceReport
          } = await import('/js/editor/campaignMapPerformance.js');

          const canvas =
            document.createElement('canvas');

          canvas.width =
            2400;

          canvas.height =
            1800;

          const context =
            canvas.getContext('2d');

          context.fillStyle =
            '#000000';

          const startedAt =
            performance.now();

          for (let index = 0; index < 120; index += 1) {

            context.beginPath();
            context.arc(
              80 + (index % 30) * 72,
              80 + Math.floor(index / 30) * 72,
              36,
              0,
              Math.PI * 2
            );
            context.fill();
          }

          const fogDrawTimeMs =
            performance.now() - startedAt;

          const report =
            createCampaignMapPerformanceReport({
              scenarioId:
                'fogPaintLarge',
              measurements: {
                fogDrawTimeMs,
                fogCanvasPixels:
                  canvas.width * canvas.height,
                dirtyFogRegionCount:
                  120
              }
            });

          assertCampaignMapPerformanceBudget(
            report
          );

          return report;
        }
      );

    expect(
      result.ok
    ).toBe(
      true
    );

    expect(
      result.snapshot.fogCanvasPixels
    ).toBe(
      4_320_000
    );
  }
);


test(
  'campaign-map-real-pointer-fog-paint-stays-inside-budget',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      () => {

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML = `
          <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
            <div class="campaign-map-topbar" contenteditable="false">
              <h1 class="campaign-map-title singleline-field" contenteditable="true">Pointer Fog Stress</h1>
            </div>

            <div class="campaign-map-stage" data-tool="draw" data-grid="true" data-grid-size="48" data-fog-mode="draw" data-brush-shape="square" data-brush-size="72" data-fog-image="" contenteditable="false" style="width: 960px; height: 640px;">
              <div class="campaign-map-viewport">
                <div class="campaign-map-background"></div>
                <div class="campaign-map-object-layer"></div>
                <canvas class="campaign-map-fog-canvas"></canvas>
              </div>
            </div>
          </div>
        `;

        const stage =
          editor.querySelector('.campaign-map-stage');

        const canvas =
          editor.querySelector('.campaign-map-fog-canvas');

        canvas.width =
          2600;

        canvas.height =
          2500;

        stage.dataset.fogDirtyRegionCount =
          '0';

        stage.dataset.fogVersion =
          '0';
      }
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            assertCampaignMapPerformanceBudget,
            createCampaignMapPerformanceReport
          } = await import('/js/editor/campaignMapPerformance.js');

          const map =
            document.querySelector('.campaign-map-document');

          const stage =
            map.querySelector('.campaign-map-stage');

          const canvas =
            map.querySelector('.campaign-map-fog-canvas');

          const rect =
            stage.getBoundingClientRect();

          const startX =
            rect.left + 80;

          const startY =
            rect.top + 90;

          const dispatchPointer =
            (
              target,
              type,
              x,
              y
            ) => {

              target.dispatchEvent(
                new PointerEvent(
                  type,
                  {
                    bubbles:
                      true,
                    cancelable:
                      true,
                    pointerId:
                      1,
                    pointerType:
                      'mouse',
                    button:
                      type === 'pointermove'
                        ? -1
                        : 0,
                    buttons:
                      type === 'pointerup'
                        ? 0
                        : 1,
                    clientX:
                      x,
                    clientY:
                      y
                  }
                )
              );
            };

          const startedAt =
            performance.now();

          dispatchPointer(
            stage,
            'pointerdown',
            startX,
            startY
          );

          for (let index = 0; index < 90; index += 1) {

            dispatchPointer(
              document,
              'pointermove',
              startX + (index % 30) * 24,
              startY + Math.floor(index / 30) * 80
            );
          }

          dispatchPointer(
            document,
            'pointerup',
            startX + 29 * 24,
            startY + 2 * 80
          );

          const fogDrawTimeMs =
            performance.now() - startedAt;

          const dirtyFogRegionCount =
            Number(stage.dataset.fogDirtyRegionCount || 0);

          const report =
            createCampaignMapPerformanceReport({
              scenarioId:
                'fogPointerPaintStress',
              modelData: {
                fog: {
                  canvasPixels:
                    canvas.width * canvas.height,
                  dirtyRegionCount:
                    dirtyFogRegionCount
                }
              },
              measurements: {
                fogDrawTimeMs:
                  fogDrawTimeMs,
                fogCanvasPixels:
                  canvas.width * canvas.height,
                dirtyFogRegionCount
              }
            });

          assertCampaignMapPerformanceBudget(
            report
          );

          return {
            report,
            fogVersion:
              Number(stage.dataset.fogVersion || 0),
            dirtyFogRegionCount
          };
        }
      );

    expect(
      result.report.ok
    ).toBe(
      true
    );

    expect(
      result.fogVersion
    ).toBeGreaterThanOrEqual(
      80
    );

    expect(
      result.dirtyFogRegionCount
    ).toBeGreaterThanOrEqual(
      80
    );
  }
);


test(
  'campaign-map-large-map-stress-model-renders-within-budgets',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            CampaignMapModel
          } = await import('/js/editor/campaignMapModel.js');

          const {
            createMapShapeElement,
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            assertCampaignMapPerformanceBudget,
            createCampaignMapPerformanceReport,
            createCampaignMapStressModelData
          } = await import('/js/editor/campaignMapPerformance.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-topbar" contenteditable="false">
                <h1 class="campaign-map-title singleline-field" contenteditable="true">Large Stress Map</h1>
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

          const stressData =
            createCampaignMapStressModelData({
              tokenCount:
                260,
              shapeCount:
                120,
              layerCount:
                10,
              dirtyFogRegionCount:
                180
            });

          const model =
            new CampaignMapModel(
              stressData
            );

          const startedAt =
            performance.now();

          for (const token of model.tokens) {

            layer.appendChild(
              createMapTokenElement(
                token,
                model
              )
            );
          }

          for (const shape of model.shapes) {

            layer.appendChild(
              createMapShapeElement(
                shape,
                model
              )
            );
          }

          const fogCanvas =
            map.querySelector('.campaign-map-fog-canvas');

          fogCanvas.width =
            2600;

          fogCanvas.height =
            2500;

          map.querySelector('.campaign-map-stage').dataset.fogMode =
            model.fog.mode;

          const renderTimeMs =
            performance.now() - startedAt;

          const report =
            createCampaignMapPerformanceReport({
              scenarioId:
                'largeMapStress',
              modelData:
                model.toJSON(),
              measurements: {
                renderTimeMs,
                syncTimeMs:
                  12,
                fogCanvasPixels:
                  fogCanvas.width * fogCanvas.height,
                dirtyFogRegionCount:
                  180
              }
            });

          assertCampaignMapPerformanceBudget(
            report
          );

          return {
            report,
            domCounts: {
              tokens:
                map.querySelectorAll('.campaign-map-token').length,
              shapes:
                map.querySelectorAll('.campaign-map-shape').length
            }
          };
        }
      );

    expect(
      result.report.ok
    ).toBe(
      true
    );

    expect(
      result.domCounts
    ).toEqual({
      tokens: 260,
      shapes: 120
    });

    expect(
      result.report.snapshot.layerCount
    ).toBe(
      10
    );

    expect(
      result.report.snapshot.dirtyFogRegionCount
    ).toBe(
      180
    );
  }
);


test(
  'campaign-map-performance-diagnostics-render-only-in-debug-mode',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            renderCampaignMapPerformanceDiagnostics
          } = await import('/js/editor/campaignMapPerformanceDiagnostics.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            '<div class="campaign-map-document"><div class="campaign-map-stage"></div></div>';

          const map =
            editor.querySelector('.campaign-map-document');

          renderCampaignMapPerformanceDiagnostics(
            map
          );

          const hidden =
            !map.querySelector('.campaign-map-performance-diagnostics');

          localStorage.setItem(
            'myOwnWorld.debug.performance',
            'true'
          );

          const report =
            renderCampaignMapPerformanceDiagnostics(
              map
            );

          const visible =
            Boolean(
              map.querySelector('.campaign-map-performance-diagnostics')
            );

          localStorage.removeItem(
            'myOwnWorld.debug.performance'
          );

          return {
            hidden,
            visible,
            ok:
              report.ok
          };
        }
      );

    expect(
      result
    ).toEqual({
      hidden: true,
      visible: true,
      ok: true
    });
  }
);
