import {
  expect,
  test
} from '@playwright/test';


// P0 smoke: карта должна переживать цикл model -> save HTML -> reload HTML.

test(
  'campaign-map-background-falls-back-to-renderable-data-url',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const state =
      await page.evaluate(
        async () => {

          const {
            restoreMapBackground
          } = await import('/js/editor/campaignMapRuntime.js');

          const {
            setAssetAdapter
          } = await import('/js/storage/assetAdapter.js');

          const {
            setStorageAdapter
          } = await import('/js/storage/storageAdapter.js');

          const PreviousImage =
            window.Image;

          window.Image =
            class BrokenImage {

              set src(
                value
              ) {

                this.currentSrc =
                  value;

                queueMicrotask(
                  () => this.onerror?.()
                );
              }
            };

          setStorageAdapter({
            kind: 'browser',
            async pickWorkspace() {},
            async restoreWorkspace() {},
            async ensureDirectory() {},
            async getDirectoryHandle() {},
            async readText() {

              return '';
            },
            async writeText() {},
            async readBinary() {

              return new Uint8Array([
                137,
                80,
                78,
                71
              ]).buffer;
            },
            async writeBinary() {},
            async listFiles() {

              return [];
            },
            async removeFile() {},
            async removeDirectory() {}
          });

          setAssetAdapter({
            kind: 'broken-primary',
            async importFile() {},
            async resolveUrl() {

              return 'asset://broken/maps/castle.png';
            },
            async exists() {

              return true;
            },
            async remove() {},
            async findOrphans() {

              return [];
            }
          });

          document.querySelector('#editorArea').innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div
                class="campaign-map-stage"
                data-map-asset="maps/castle.png"
                data-grid="false"
                data-fog-mode="draw"
                contenteditable="false"
              >
                <div class="campaign-map-viewport">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          try {

            await restoreMapBackground(
              document.querySelector('.campaign-map-document')
            );

            return {
              backgroundImage:
                document.querySelector('.campaign-map-background')
                  .style
                  .backgroundImage
            };

          } finally {

            window.Image =
              PreviousImage;
          }
        }
      );

    expect(
      state.backgroundImage
    ).toContain(
      'data:image/png;base64,iVBORw=='
    );
  }
);


test(
  'campaign-map-data-first-save-reload',
  async ({ page }) => {

    const consoleErrors =
      [];

    page.on(
      'console',
      message => {

        if (message.type() === 'error') {

          consoleErrors.push(
            message.text()
          );
        }
      }
    );

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            getCampaignMapStore,
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            serializeCampaignMapDocumentHTML
          } = await import('/js/editor/campaignMapDataSerializer.js');

          const {
            createMapShapeElement,
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-topbar" contenteditable="false">
                <h1 class="campaign-map-title singleline-field" contenteditable="true">Тестовая карта</h1>
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

          const layer =
            map.querySelector('.campaign-map-object-layer');

          const store =
            getCampaignMapStore(
              map
            );

          const tokenData =
            store.addToken({
              tokenId: 'token-browser-1',
              pageId: 'page-creature-1',
              type: 'creature',
              name: 'Следопыт',
              x: 22.5,
              y: 33.75,
              size: 1.25,
              rotation: 45,
              imageAsset: 'ranger.png'
            });

          const shapeData =
            store.addShape({
              shapeId: 'shape-browser-1',
              type: 'circle',
              x: 120,
              y: 160,
              width: 80,
              height: 80
            });

          store.setGrid({
            enabled: true,
            size: 64,
            color: '#ffcc66'
          });

          store.updateFog({
            mode: 'erase',
            image: 'data:image/png;base64,test-fog',
            brushSize: 96
          });

          store.setView({
            x: 15,
            y: 25,
            zoom: 2.5
          });

          const token =
            createMapTokenElement(
              tokenData,
              store.getModel()
            );

          layer.appendChild(
            token
          );

          const shape =
            createMapShapeElement(
              shapeData,
              store.getModel()
            );

          layer.appendChild(
            shape
          );

          store.commitToDOM();

          const savedHTML =
            serializeCampaignMapDocumentHTML(
              map
            );

          editor.innerHTML =
            savedHTML;

          const restoredMap =
            editor.querySelector('.campaign-map-document');

          const restoredStore =
            refreshCampaignMapStore(
              restoredMap
            );

          const restored =
            restoredStore.getModel().toJSON();

          return {
            html: savedHTML,
            token: restored.tokens[0],
            shape: restored.shapes[0],
            grid: restored.grid,
            fog: restored.fog,
            view: restored.view
          };
        }
      );

    expect(
      result.token
    ).toMatchObject({
      tokenId: 'token-browser-1',
      pageId: 'page-creature-1',
      type: 'creature',
      name: 'Следопыт',
      x: 22.5,
      y: 33.75,
      size: 1.25,
      rotation: 45,
      imageAsset: 'ranger.png'
    });

    expect(
      result.shape
    ).toMatchObject({
      shapeId: 'shape-browser-1',
      type: 'circle',
      x: 120,
      y: 160,
      width: 80,
      height: 80
    });

    expect(
      result.grid
    ).toMatchObject({
      enabled: true,
      size: 64,
      color: '#ffcc66'
    });

    expect(
      result.fog
    ).toMatchObject({
      mode: 'erase',
      image: 'data:image/png;base64,test-fog',
      brushSize: 96
    });

    expect(
      result.view
    ).toMatchObject({
      x: 15,
      y: 25,
      zoom: 2.5
    });

    expect(
      result.html
    ).not.toMatch(
      /campaign-map-token-resize|campaign-map-token-rotate|data-runtime="true"/
    );

    expect(
      consoleErrors
    ).toEqual(
      []
    );
  }
);


test(
  'campaign-map-token-removal-updates-open-and-closed-map-data',
  async ({ page }) => {

    const consoleErrors =
      [];

    page.on(
      'console',
      message => {

        if (message.type() === 'error') {

          consoleErrors.push(
            message.text()
          );
        }
      }
    );

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            serializeCampaignMapDocumentHTML
          } = await import('/js/editor/campaignMapDataSerializer.js');

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            removeTokensFromMapElement,
            removeTokensFromMapPageContent
          } = await import('/js/editor/campaignMapSerializerHelpers.js');

          const editor =
            document.querySelector('#editorArea');

          const createMapShellHTML =
            () => `
              <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
                <div class="campaign-map-topbar" contenteditable="false">
                  <h1 class="campaign-map-title singleline-field" contenteditable="true">Тест удаления</h1>
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

          editor.innerHTML =
            createMapShellHTML();

          const openMap =
            editor.querySelector('.campaign-map-document');

          const openStore =
            refreshCampaignMapStore(
              openMap
            );

          const openLayer =
            openMap.querySelector('.campaign-map-object-layer');

          const removedOpenToken =
            openStore.addToken({
              tokenId: 'token-remove-open',
              pageId: 'page-remove',
              type: 'creature',
              name: 'Удаляемый'
            });

          const keptOpenToken =
            openStore.addToken({
              tokenId: 'token-keep-open',
              pageId: 'page-keep',
              type: 'creature',
              name: 'Оставшийся'
            });

          openLayer.appendChild(
            createMapTokenElement(
              removedOpenToken,
              openStore.getModel()
            )
          );

          openLayer.appendChild(
            createMapTokenElement(
              keptOpenToken,
              openStore.getModel()
            )
          );

          openStore.commitToDOM();

          const openChanged =
            removeTokensFromMapElement(
              openMap,
              new Set(['page-remove'])
            );

          const openTokenIds =
            refreshCampaignMapStore(
              openMap
            )
              .getModel()
              .tokens
              .map(token => token.tokenId);

          editor.innerHTML =
            createMapShellHTML();

          const closedMap =
            editor.querySelector('.campaign-map-document');

          const closedStore =
            refreshCampaignMapStore(
              closedMap
            );

          const closedLayer =
            closedMap.querySelector('.campaign-map-object-layer');

          const removedClosedToken =
            closedStore.addToken({
              tokenId: 'token-remove-closed',
              pageId: 'page-remove',
              type: 'creature',
              name: 'Удаляемый закрытый'
            });

          const keptClosedToken =
            closedStore.addToken({
              tokenId: 'token-keep-closed',
              pageId: 'page-keep',
              type: 'object',
              name: 'Оставшийся закрытый'
            });

          closedLayer.appendChild(
            createMapTokenElement(
              removedClosedToken,
              closedStore.getModel()
            )
          );

          closedLayer.appendChild(
            createMapTokenElement(
              keptClosedToken,
              closedStore.getModel()
            )
          );

          closedStore.commitToDOM();

          const closedHTML =
            serializeCampaignMapDocumentHTML(
              closedMap
            );

          let writtenContent =
            '';

          const closedPage =
            {
              id: 'map-page',
              title: 'Закрытая карта',
              content: `---
id: map-page
parent: null
order: 1
tags: [campaign-map]
template: campaignMap
type: campaignMap
aliases: []
---

${closedHTML}
`,
              handle: {
                name: 'map-page.md',
                async createWritable() {

                  return {
                    async write(content) {

                      writtenContent =
                        String(content);
                    },
                    async close() {}
                  };
                }
              }
            };

          const closedChanged =
            await removeTokensFromMapPageContent(
              closedPage,
              new Set(['page-remove'])
            );

          const wrapper =
            document.createElement('div');

          wrapper.innerHTML =
            closedPage.content
              .replace(/---[\s\S]*?---/, '')
              .trim();

          const patchedMap =
            wrapper.querySelector('.campaign-map-document');

          const patchedTokenIds =
            refreshCampaignMapStore(
              patchedMap
            )
              .getModel()
              .tokens
              .map(token => token.tokenId);

          return {
            openChanged,
            openTokenIds,
            closedChanged,
            closedTokenIds: patchedTokenIds,
            writtenContent,
            pageContent: closedPage.content
          };
        }
      );

    expect(
      result.openChanged
    ).toBe(
      true
    );

    expect(
      result.openTokenIds
    ).toEqual([
      'token-keep-open'
    ]);

    expect(
      result.closedChanged
    ).toBe(
      true
    );

    expect(
      result.closedTokenIds
    ).toEqual([
      'token-keep-closed'
    ]);

    expect(
      result.writtenContent
    ).toBe(
      result.pageContent
    );

    expect(
      result.pageContent
    ).not.toContain(
      'token-remove-closed'
    );

    expect(
      result.pageContent
    ).toContain(
      'token-keep-closed'
    );

    expect(
      consoleErrors
    ).toEqual(
      []
    );
  }
);
