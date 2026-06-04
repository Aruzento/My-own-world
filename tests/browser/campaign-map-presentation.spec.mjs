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
      fogZ: 10000,
      tokenZ: 40,
      lockedFogExists: true,
      lockedFogZ: 10001
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
                }
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
      measureText: '10 ft',
      measureZ: 10002,
      fogZ: 10000
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
