import {
  expect,
  test
} from '@playwright/test';


// P0 smoke: презентация должна получать изменения token/shape по id из модели.

test(
  'campaign-map-presentation-model-renderer-builds-view-from-model-payload',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const state =
      await page.evaluate(
        async () => {

          const {
            renderCampaignMapPresentationModel
          } = await import('/js/presentation/campaignMapPresentationRenderer.js');

          const {
            getPresentationCSS
          } = await import('/js/editor/campaignMapPresentationStyle.js');

          const style =
            document.createElement(
              'style'
            );

          style.textContent =
            getPresentationCSS();

          document.head.appendChild(
            style
          );

          const root =
            document.createElement(
              'div'
            );

          document.body.appendChild(
            root
          );

          renderCampaignMapPresentationModel(
            root,
            {
              model: {
                grid: {
                  enabled: true,
                  size: 50,
                  color: '#ece392'
                },
                layers: [
                  {
                    layerId: 'map-creatures',
                    visible: true
                  }
                ],
                tokens: [
                  {
                    tokenId: 'player',
                    type: 'creature',
                    name: 'Player',
                    x: 20,
                    y: 30,
                    size: 1,
                    rotation: 0,
                    layerId: 'map-creatures',
                    zIndex: 40,
                    sourceMode: 'original',
                    isPlayerToken: true,
                    presentationHidden: true
                  },
                  {
                    tokenId: 'npc',
                    type: 'creature',
                    name: 'NPC',
                    x: 40,
                    y: 50,
                    size: 1,
                    rotation: 0,
                    layerId: 'map-creatures',
                    zIndex: 40,
                    presentationHidden: true
                  }
                ],
                shapes: [
                  {
                    shapeId: 'hidden-shape',
                    type: 'square',
                    x: 10,
                    y: 12,
                    width: 30,
                    height: 40,
                    layerId: 'map-creatures',
                    zIndex: 80,
                    presentationHidden: true
                  }
                ],
                fog: {
                  lockedZones: [
                    {
                      id: 'locked-zone',
                      x: 120,
                      y: 140,
                      width: 90,
                      height: 70
                    }
                  ]
                }
              },
              assets: {
                background: '',
                tokens: {
                  player: 'data:image/png;base64,iVBORw0KGgo='
                }
              },
              fogImage: '',
              tokenView: {
                player: {
                  hpPercent: '50',
              hpState: 'alive',
              healthColor: '#ece392'
            }
          },
          fogImage: 'data:image/png;base64,iVBORw0KGgo='
        }
      );

          const player =
            root.querySelector('[data-token-id="player"]');

          return {
            playerExists:
              Boolean(player),
            playerImage:
              player?.querySelector('img')?.getAttribute('src') || '',
            playerHidden:
              player?.dataset.presentationHidden || '',
            playerHp:
              player?.dataset.hpPercent || '',
            playerBadge:
              getComputedStyle(player, '::before').content,
            npcExists:
              Boolean(root.querySelector('[data-token-id="npc"]')),
            hiddenShapeExists:
              Boolean(root.querySelector('[data-shape-id="hidden-shape"]')),
            fogZ:
              Number(getComputedStyle(root.querySelector('.campaign-map-fog-image')).zIndex),
            tokenZ:
              Number(getComputedStyle(player).zIndex),
            lockedFogExists:
              Boolean(root.querySelector('.campaign-presentation-locked-fog-zone')),
            lockedFogZ:
              Number(getComputedStyle(root.querySelector('.campaign-presentation-locked-fog-zone')).zIndex)
          };
        }
      );

    expect(
      state
    ).toEqual({
      playerExists: true,
      playerImage: 'data:image/png;base64,iVBORw0KGgo=',
      playerHidden: 'true',
      playerHp: '50',
      playerBadge: '"скрыт"',
      npcExists: false,
      hiddenShapeExists: false,
      fogZ: 120,
      tokenZ: 40,
      lockedFogExists: true,
      lockedFogZ: 130
    });
  }
);


test(
  'campaign-map-presentation-applies-delta-patches-without-full-rerender',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            applyCampaignMapPresentationPatch,
            renderCampaignMapPresentationModel
          } = await import('/js/presentation/campaignMapPresentationRenderer.js');

          const {
            getPresentationCSS
          } = await import('/js/editor/campaignMapPresentationStyle.js');

          const style =
            document.createElement(
              'style'
            );

          style.textContent =
            getPresentationCSS();

          document.head.appendChild(
            style
          );

          const root =
            document.createElement(
              'div'
            );

          document.body.appendChild(
            root
          );

          renderCampaignMapPresentationModel(
            root,
            {
              model: {
                grid: {
                  enabled: true,
                  size: 40,
                  color: '#ffffff'
                },
                layers: [
                  {
                    layerId: 'tokens',
                    visible: true
                  }
                ],
                tokens: [
                  {
                    tokenId: 'hero',
                    type: 'creature',
                    name: 'Hero',
                    x: 20,
                    y: 20,
                    size: 1,
                    rotation: 0,
                    layerId: 'tokens',
                    zIndex: 10
                  }
                ],
                shapes: [],
                fog: {
                  lockedZones: []
                }
              },
              assets: {
                background: '',
                tokens: {}
              },
              fogImage: '',
              tokenView: {}
            }
          );

          const stageBefore =
            root.querySelector(
              '.campaign-map-stage'
            );

          const tokenBefore =
            root.querySelector(
              '[data-token-id="hero"]'
            );

          const gridColorBefore =
            getComputedStyle(stageBefore)
              .getPropertyValue('--campaign-grid-color')
              .trim();

          applyCampaignMapPresentationPatch(
            root,
            {
              type: 'update-items',
              model: {
                grid: {
                  enabled: true,
                  size: 52,
                  color: '#ff0000'
                },
                layers: [
                  {
                    layerId: 'tokens',
                    visible: true
                  }
                ]
              },
              assets: {
                tokens: {}
              },
              tokenView: {
                hero: {
                  hpPercent: '25',
                  hpState: 'alive',
                  healthColor: '#ff0000'
                }
              },
              items: [
                {
                  kind: 'token',
                  itemId: 'hero',
                  record: {
                    tokenId: 'hero',
                    type: 'creature',
                    name: 'Hero',
                    x: 45,
                    y: 55,
                    size: 2,
                    rotation: 15,
                    layerId: 'tokens',
                    zIndex: 30
                  }
                }
              ]
            }
          );

          applyCampaignMapPresentationPatch(
            root,
            {
              type: 'update-fog',
              fogImage: 'data:image/png;base64,deltafog',
              model: {
                fog: {
                  lockedZones: [
                    {
                      id: 'locked',
                      x: 12,
                      y: 14,
                      width: 20,
                      height: 22
                    }
                  ]
                },
                layers: [
                  {
                    layerId: 'map-fog',
                    visible: true,
                    zIndex: 120
                  },
                  {
                    layerId: 'map-locked-fog',
                    visible: true,
                    zIndex: 130
                  }
                ]
              }
            }
          );

          applyCampaignMapPresentationPatch(
            root,
            {
              type: 'drag-measure',
              measure: {
                active: true,
                x1: 0,
                y1: 0,
                x2: 100,
                y2: 0,
                labelX: 50,
                labelY: -12,
                label: '10 ft'
              }
            }
          );

          const stageAfter =
            root.querySelector(
              '.campaign-map-stage'
            );

          const tokenAfter =
            root.querySelector(
              '[data-token-id="hero"]'
            );

          return {
            sameStage:
              stageBefore === stageAfter,
            tokenReplacedOnly:
              tokenBefore !== tokenAfter,
            tokenLeft:
              tokenAfter.style.left,
            tokenSize:
              tokenAfter.style.getPropertyValue('--token-size'),
            tokenHp:
              tokenAfter.dataset.hpPercent,
            gridSize:
              stageAfter.style.getPropertyValue('--campaign-grid-size'),
            gridColorBefore,
            gridColorAfter:
              stageAfter.style.getPropertyValue('--campaign-grid-color'),
            fogSrc:
              root.querySelector('.campaign-map-fog-image')?.getAttribute('src'),
            lockedZones:
              root.querySelectorAll('.campaign-presentation-locked-fog-zone').length,
            lockedFogHidden:
              root.querySelector('.campaign-presentation-locked-fog-zone')?.dataset.layerHidden,
            measureText:
              root.querySelector('.campaign-map-drag-measure text')?.textContent,
            measureZ:
              Number(getComputedStyle(root.querySelector('.campaign-map-drag-measure')).zIndex),
            fogZ:
              Number(getComputedStyle(root.querySelector('.campaign-map-fog-image')).zIndex)
          };
        }
      );

    expect(
      result
    ).toEqual({
      sameStage: true,
      tokenReplacedOnly: true,
      tokenLeft: '45%',
      tokenSize: '2',
      tokenHp: '25',
      gridSize: '52px',
      gridColorBefore: 'rgba(255,255,255,0.22)',
      gridColorAfter: 'rgba(255,0,0,0.22)',
      fogSrc: 'data:image/png;base64,deltafog',
      lockedZones: 1,
      lockedFogHidden: 'false',
      measureText: '10 ft',
      measureZ: 10002,
      fogZ: 120
    });
  }
);


test(
  'campaign-map-presentation-applies-dirty-fog-region-patch',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            applyCampaignMapPresentationPatch,
            renderCampaignMapPresentationModel
          } = await import('/js/presentation/campaignMapPresentationRenderer.js');

          const {
            getPresentationCSS
          } = await import('/js/editor/campaignMapPresentationStyle.js');

          const style =
            document.createElement(
              'style'
            );

          style.textContent =
            getPresentationCSS();

          document.head.appendChild(
            style
          );

          const root =
            document.createElement(
              'div'
            );

          document.body.appendChild(
            root
          );

          renderCampaignMapPresentationModel(
            root,
            {
              model: {
                grid: {
                  enabled: false,
                  size: 40
                },
                layers: [],
                tokens: [],
                shapes: [],
                fog: {
                  lockedZones: []
                }
              },
              assets: {
                background: '',
                tokens: {}
              },
              fogImage: '',
              tokenView: {}
            }
          );

          const patchCanvas =
            document.createElement(
              'canvas'
            );

          patchCanvas.width =
            4;

          patchCanvas.height =
            4;

          const patchContext =
            patchCanvas.getContext(
              '2d'
            );

          patchContext.fillStyle =
            'rgba(0,0,0,1)';

          patchContext.fillRect(
            0,
            0,
            4,
            4
          );

          applyCampaignMapPresentationPatch(
            root,
            {
              type: 'update-fog',
              fogPatch: {
                x: 8,
                y: 9,
                width: 4,
                height: 4,
                image:
                  patchCanvas.toDataURL(
                    'image/png'
                  )
              },
              model: {
                fog: {
                  lockedZones: []
                }
              }
            }
          );

          await new Promise(resolve => setTimeout(resolve, 50));

          const fog =
            root.querySelector(
              '.campaign-map-fog-image'
            );

          const pixel =
            fog
              .getContext('2d')
              .getImageData(
                9,
                10,
                1,
                1
              )
              .data;

          return {
            tagName:
              fog.tagName,
            alpha:
              pixel[3],
            srcAttribute:
              fog.getAttribute('src')
          };
        }
      );

    expect(
      result
    ).toEqual({
      tagName: 'CANVAS',
      alpha: 255,
      srcAttribute: null
    });
  }
);


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
  'campaign-map-presentation-representative-map-workflow-stays-current',
  async ({ page }, testInfo) => {

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
          syncPresentationDragMeasure,
          syncPresentationFog,
          syncPresentationItemById
        } = await import('/js/editor/campaignMapPresentation.js');

        const {
          fillFog
        } = await import('/js/editor/campaignMapFog.js');

        const {
          createMapShapeElement,
          createMapTokenElement
        } = await import('/js/editor/campaignMapElementFactory.js');

        const {
          renderMapShape
        } = await import('/js/editor/campaignMapShapes.js');

        const {
          applyTokenRotation,
          applyTokenSize,
          positionToken
        } = await import('/js/editor/campaignMapTokens.js');

        const {
          updateGridSize
        } = await import('/js/editor/campaignMapViewport.js');

        const {
          applyCampaignMapLayers,
          setCampaignMapLayerVisibility
        } = await import('/js/editor/campaignMapLayers.js');

        const {
          getCampaignMapStore
        } = await import('/js/editor/campaignMapStore.js');

        document.querySelector('#editorArea').innerHTML = `
          <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
            <div class="campaign-map-topbar" contenteditable="false">
              <h1 class="campaign-map-title singleline-field" contenteditable="true">Representative Presentation Matrix</h1>
            </div>

            <div class="campaign-map-stage" data-grid="true" data-grid-size="64" data-grid-color="#ffffff" data-fog-mode="draw" data-fog-image="" contenteditable="false" style="position: relative; width: 1000px; height: 740px;">
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
            tokenId: 'matrix-player',
            type: 'creature',
            name: 'Player Token',
            x: 12,
            y: 18,
            size: 1,
            rotation: 0,
            sourceMode: 'original',
            isPlayerToken: true
          });

        const npcToken =
          store.addToken({
            tokenId: 'matrix-npc',
            type: 'creature',
            name: 'Hidden NPC',
            x: 34,
            y: 22,
            size: 1,
            rotation: 0,
            presentationHidden: true
          });

        const shape =
          store.addShape({
            shapeId: 'matrix-shape',
            type: 'square',
            x: 140,
            y: 180,
            width: 90,
            height: 70,
            fillColor: '#2b87ff'
          });

        store.addLockedFogZone({
          id: 'matrix-locked-fog',
          x: 220,
          y: 240,
          width: 110,
          height: 90
        });

        layer.append(
          createMapTokenElement(
            playerToken,
            store.getModel()
          ),
          createMapTokenElement(
            npcToken,
            store.getModel()
          ),
          createMapShapeElement(
            shape,
            store.getModel()
          )
        );

        applyCampaignMapLayers(
          map
        );

        updateGridSize(
          map
        );

        fillFog(
          map
        );

        openPresentationWindow();
        syncPresentation();

        window.__presentationMatrix = {
          applySourceToken(record) {

            const token =
              map.querySelector(
                `.campaign-map-token[data-token-id="${CSS.escape(record.tokenId)}"]`
              );

            token.dataset.x =
              record.x.toFixed(3);

            token.dataset.y =
              record.y.toFixed(3);

            token.dataset.size =
              record.size.toFixed(3);

            token.dataset.rotation =
              String(record.rotation || 0);

            token.dataset.presentationHidden =
              record.presentationHidden
                ? 'true'
                : 'false';

            token.dataset.layerId =
              record.layerId;

            token.dataset.zIndex =
              String(record.zIndex);

            token.style.zIndex =
              String(record.zIndex);

            positionToken(
              token
            );

            applyTokenSize(
              token
            );

            applyTokenRotation(
              token
            );
          },

          applySourceShape(record) {

            const shapeElement =
              map.querySelector(
                `.campaign-map-shape[data-shape-id="${CSS.escape(record.shapeId)}"]`
              );

            shapeElement.dataset.x =
              String(Math.round(record.x));

            shapeElement.dataset.y =
              String(Math.round(record.y));

            shapeElement.dataset.w =
              String(Math.round(record.width));

            shapeElement.dataset.h =
              String(Math.round(record.height));

            shapeElement.dataset.layerId =
              record.layerId;

            shapeElement.dataset.zIndex =
              String(record.zIndex);

            shapeElement.style.zIndex =
              String(record.zIndex);

            renderMapShape(
              shapeElement
            );
          },

          movePlayerToken() {

            const record =
              store.moveToken(
                'matrix-player',
                {
                  x: 46,
                  y: 52
                }
              );

            this.applySourceToken(
              record
            );

            syncPresentationItemById(
              map,
              'token',
              'matrix-player'
            );
          },

          hidePlayerToken() {

            const record =
              store.updateToken(
                'matrix-player',
                {
                  presentationHidden: true
                }
              );

            this.applySourceToken(
              record
            );

            syncPresentationItemById(
              map,
              'token',
              'matrix-player'
            );
          },

          updateFogAndLockedZone() {

            fillFog(
              map
            );

            store.updateLockedFogZone(
              'matrix-locked-fog',
              {
                x: 300,
                y: 320,
                width: 150,
                height: 96
              }
            );

            syncPresentationFog(
              map
            );
          },

          hideShapeLayer() {

            setCampaignMapLayerVisibility(
              map,
              'map-shapes',
              false
            );

            const shapeRecord =
              store.getModel().getShape(
                'matrix-shape'
              );

            this.applySourceShape(
              shapeRecord
            );

            applyCampaignMapLayers(
              map
            );

            syncPresentation();
          },

          changeGridAndMeasure() {

            store.setGrid({
              enabled: false,
              size: 72,
              color: '#00ff00'
            });

            updateGridSize(
              map
            );

            syncPresentation();

            syncPresentationDragMeasure({
              active: true,
              x1: 100,
              y1: 100,
              x2: 340,
              y2: 100,
              labelX: 220,
              labelY: 86,
              label: '30 ft'
            });

            syncPresentation();
          },

          reopenPresentation() {

            openPresentationWindow();
            syncPresentation();
          }
        };
      }
    );

    const popup =
      await popupPromise;

    await popup.waitForLoadState(
      'domcontentloaded'
    );

    await expect
      .poll(
        async () =>
          popup.evaluate(
            () => {

              const player =
                document.querySelector('[data-token-id="matrix-player"]');

              const npc =
                document.querySelector('[data-token-id="matrix-npc"]');

              const fog =
                document.querySelector('.campaign-map-fog-image');

              const lockedFog =
                document.querySelector('.campaign-presentation-locked-fog-zone');

              return {
                stage:
                  Boolean(document.querySelector('.campaign-map-stage')),
                player:
                  Boolean(player),
                npc:
                  Boolean(npc),
                fogAbovePlayer:
                  Number(getComputedStyle(fog).zIndex) >
                  Number(getComputedStyle(player).zIndex),
                lockedFogAbovePlayer:
                  Number(getComputedStyle(lockedFog).zIndex) >
                  Number(getComputedStyle(player).zIndex),
                grid:
                  document.querySelector('.campaign-map-stage')?.dataset.grid,
                gridSize:
                  document.querySelector('.campaign-map-stage')?.style.getPropertyValue('--campaign-grid-size')
              };
            }
          )
      )
      .toEqual({
        stage: true,
        player: true,
        npc: false,
        fogAbovePlayer: true,
        lockedFogAbovePlayer: true,
        grid: 'true',
        gridSize: '64px'
      });

    await page.evaluate(
      () => window.__presentationMatrix.movePlayerToken()
    );

    await expect
      .poll(
        async () =>
          popup.evaluate(
            () => {

              const player =
                document.querySelector('[data-token-id="matrix-player"]');

              return {
                x:
                  player?.dataset.x,
                y:
                  player?.dataset.y,
                left:
                  player?.style.left,
                top:
                  player?.style.top
              };
            }
          )
      )
      .toEqual({
        x: '46.000',
        y: '52.000',
        left: '46%',
        top: '52%'
      });

    await page.evaluate(
      () => window.__presentationMatrix.hidePlayerToken()
    );

    await expect
      .poll(
        async () =>
          popup.evaluate(
            () => {

              const player =
                document.querySelector('[data-token-id="matrix-player"]');

              return {
                player:
                  Boolean(player),
                hidden:
                  player?.dataset.presentationHidden,
                playerFlag:
                  player?.dataset.playerToken,
                badge:
                  getComputedStyle(player, '::before').content
              };
            }
          )
      )
      .toEqual({
        player: true,
        hidden: 'true',
        playerFlag: 'true',
        badge: '"скрыт"'
      });

    await page.evaluate(
      () => window.__presentationMatrix.updateFogAndLockedZone()
    );

    await expect
      .poll(
        async () =>
          popup.evaluate(
            () => {

              const lockedFog =
                document.querySelector('.campaign-presentation-locked-fog-zone');

              return {
                left:
                  lockedFog?.style.left,
                top:
                  lockedFog?.style.top,
                width:
                  lockedFog?.style.width,
                height:
                  lockedFog?.style.height,
                layerHidden:
                  lockedFog?.dataset.layerHidden
              };
            }
          )
      )
      .toEqual({
        left: '300px',
        top: '320px',
        width: '150px',
        height: '96px',
        layerHidden: 'false'
      });

    await page.evaluate(
      () => window.__presentationMatrix.hideShapeLayer()
    );

    await expect
      .poll(
        async () =>
          popup.evaluate(
            () => {

              const player =
                document.querySelector('[data-token-id="matrix-player"]');

              const shape =
                document.querySelector('[data-shape-id="matrix-shape"]');

              const fog =
                document.querySelector('.campaign-map-fog-image');

              return {
                shapeLayerHidden:
                  shape?.dataset.layerHidden,
                shapeDisplay:
                  getComputedStyle(shape).display,
                shapeAbovePlayer:
                  Number(getComputedStyle(shape).zIndex) >
                  Number(getComputedStyle(player).zIndex),
                fogAboveShape:
                  Number(getComputedStyle(fog).zIndex) >
                  Number(getComputedStyle(shape).zIndex)
              };
            }
          )
      )
      .toEqual({
        shapeLayerHidden: 'true',
        shapeDisplay: 'none',
        shapeAbovePlayer: true,
        fogAboveShape: true
      });

    await page.evaluate(
      () => window.__presentationMatrix.changeGridAndMeasure()
    );

    await expect
      .poll(
        async () =>
          popup.evaluate(
            () => {

              const stage =
                document.querySelector('.campaign-map-stage');

              const measure =
                document.querySelector('.campaign-map-drag-measure');

              return {
                grid:
                  stage?.dataset.grid,
                gridSize:
                  stage?.style.getPropertyValue('--campaign-grid-size'),
                gridColor:
                  stage?.style.getPropertyValue('--campaign-grid-color'),
                measureText:
                  measure?.querySelector('text')?.textContent,
                markerEnd:
                  measure
                    ? getComputedStyle(measure.querySelector('line')).markerEnd
                    : '',
                measureZ:
                  measure
                    ? Number(getComputedStyle(measure).zIndex)
                    : 0
              };
            }
          )
      )
      .toEqual({
        grid: 'false',
        gridSize: '72px',
        gridColor: 'rgba(0,255,0,0.22)',
        measureText: '30 ft',
        markerEnd: 'url("#campaign-drag-arrow")',
        measureZ: 10002
      });

    await testInfo.attach(
      'campaign-map-presentation-representative-matrix',
      {
        body:
          await popup.screenshot(),
        contentType:
          'image/png'
      }
    );

    await popup.close();

    const reopenedPromise =
      page.waitForEvent(
        'popup'
      );

    await page.evaluate(
      () => window.__presentationMatrix.reopenPresentation()
    );

    const reopened =
      await reopenedPromise;

    await reopened.waitForLoadState(
      'domcontentloaded'
    );

    await expect
      .poll(
        async () =>
          reopened.evaluate(
            () => {

              const player =
                document.querySelector('[data-token-id="matrix-player"]');

              const measure =
                document.querySelector('.campaign-map-drag-measure');

              const stage =
                document.querySelector('.campaign-map-stage');

              return {
                playerX:
                  player?.dataset.x,
                playerY:
                  player?.dataset.y,
                playerHidden:
                  player?.dataset.presentationHidden,
                grid:
                  stage?.dataset.grid,
                gridSize:
                  stage?.style.getPropertyValue('--campaign-grid-size'),
                staleMeasure:
                  Boolean(measure)
              };
            }
          )
      )
      .toEqual({
        playerX: '46.000',
        playerY: '52.000',
        playerHidden: 'true',
        grid: 'false',
        gridSize: '72px',
        staleMeasure: false
      });

    await reopened.close();
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

    await page.evaluate(
      async () => {

        const {
          syncPresentationFog
        } = await import('/js/editor/campaignMapPresentation.js');

        const {
          getCampaignMapStore
        } = await import('/js/editor/campaignMapStore.js');

        const map =
          document.querySelector('.campaign-map-document');

        getCampaignMapStore(
          map
        ).updateLockedFogZone(
          'locked-fog-zone',
          {
            x: 260,
            y: 280,
            width: 120,
            height: 96
          }
        );

        syncPresentationFog(
          map
        );
      }
    );

    await expect
      .poll(
        async () =>
          popup.evaluate(
            () => {

              const lockedFog =
                document.querySelector('.campaign-presentation-locked-fog-zone');

              return {
                left:
                  lockedFog?.style.left,
                top:
                  lockedFog?.style.top,
                width:
                  lockedFog?.style.width,
                height:
                  lockedFog?.style.height
              };
            }
          )
      )
      .toEqual({
        left: '260px',
        top: '280px',
        width: '120px',
        height: '96px'
      });

    await popup.close();
  }
);


test(
  'campaign-map-presentation-entry-shows-loading-until-first-render',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const state =
      await page.evaluate(
        async () => {

          const root =
            document.createElement(
              'div'
            );

          root.id =
            'presentationMap';

          document.body.appendChild(
            root
          );

          await import(
            `/js/presentation/presentationEntry.js?presentation-loading=${Date.now()}`
          );

          const before = {
            status:
              root.dataset.presentationStatus,
            loading:
              root.querySelector('.presentation-loading')?.textContent || ''
          };

          const channel =
            new BroadcastChannel(
              'my-own-world-campaign-map-presentation'
            );

          channel.postMessage({
            type: 'render-model',
            css: '',
            model: {
              grid: {
                enabled: false,
                size: 48
              },
              layers: [],
              tokens: [],
              shapes: [],
              fog: {
                lockedZones: []
              }
            },
            assets: {
              background: '',
              tokens: {}
            },
            fogImage: '',
            tokenView: {}
          });

          await new Promise(resolve =>
            setTimeout(
              resolve,
              50
            )
          );

          const after = {
            status:
              root.dataset.presentationStatus,
            loadingExists:
              Boolean(root.querySelector('.presentation-loading')),
            stageExists:
              Boolean(root.querySelector('.campaign-map-stage'))
          };

          channel.close();

          return {
            before,
            after
          };
        }
      );

    expect(
      state
    ).toEqual({
      before: {
        status: 'waiting',
        loading: 'Ожидание карты...'
      },
      after: {
        status: 'ready',
        loadingExists: false,
        stageExists: true
      }
    });
  }
);
