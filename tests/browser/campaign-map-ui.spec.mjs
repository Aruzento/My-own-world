import {
  expect,
  test
} from '@playwright/test';


// P0 smoke: adding a card to the map creates a bucket, child duplicate and token.

test(
  'campaign-map-add-page-flow-creates-bucket-duplicate-and-token',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
      async () => {

          const MAP_TITLE =
            '\u041f\u0435\u0449\u0435\u0440\u0430';

          const SOURCE_TITLE =
            '\u0413\u043e\u0431\u043b\u0438\u043d';

          const PLAYER_TITLE =
            '\u041b\u0430\u0437\u0430\u0440\u044c';

          const { state } =
            await import('/js/state.js');

          const {
            setWorkspaceHandle
          } = await import('/js/stateActions.js');

          const {
            setCurrentPage,
            setPages
          } = await import('/js/stateActions.js');

          const {
            addPageToMap,
            canAddPageToCampaignMap,
            openAddKindPopup
          } = await import('/js/editor/campaignMapPicker.js');

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const createMapShellHTML =
            () => `
              <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
                <div class="campaign-map-topbar" contenteditable="false">
                  <h1 class="campaign-map-title singleline-field" contenteditable="true">${MAP_TITLE}</h1>
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

          const createPageRecord =
            options => {

              const body =
                `<div class="entity-layout card-shell"><h1>${options.title}</h1></div>`;

              return {
                id: options.id,
                parent: options.parent || null,
                order: 1,
                title: options.title,
                type: options.type || 'note',
                template: options.template || 'card',
                tags: options.tags || ['card'],
                aliases: [],
                content: `---
id: ${options.id}
parent: ${options.parent || 'null'}
order: 1
tags: [${(options.tags || ['card']).join(', ')}]
template: ${options.template || 'card'}
type: ${options.type || 'note'}
aliases: []
---

${body}
`,
                handle: null
              };
            };

          const setupFakeWorkspace =
            nextState => {

              nextState.__testWrittenFiles =
                [];

              const createDirectoryHandle =
                () => ({
                  async getDirectoryHandle() {

                    return createDirectoryHandle();
                  },
                  async getFileHandle(name) {

                    return {
                      name,
                      async createWritable() {

                        return {
                          async write(content) {

                            const id =
                              String(content)
                                .match(/id:\s*(.+)/)?.[1]
                                ?.trim() || '';

                            nextState.__testWrittenFiles.push({
                              id,
                              name,
                              content: String(content)
                            });
                          },
                          async close() {}
                        };
                      }
                    };
                  }
                });

              setWorkspaceHandle({
                async getDirectoryHandle() {

                  return createDirectoryHandle();
                }
              });
            };

          setupFakeWorkspace(
            state
          );

          const mapPage =
            createPageRecord({
              id: 'map-page',
              title: MAP_TITLE,
              type: 'campaignMap',
              template: 'campaignMap',
              tags: ['campaign-map']
            });

          const source =
            createPageRecord({
              id: 'source-creature',
              title: SOURCE_TITLE,
              type: 'creature',
              tags: ['card', 'creature']
            });

          const player =
            createPageRecord({
              id: 'player-character',
              title: PLAYER_TITLE,
              type: 'character',
              tags: ['card', 'character', 'player']
            });

          const mapChild =
            createPageRecord({
              id: 'map-child-creature',
              title: `${SOURCE_TITLE}.${MAP_TITLE}`,
              type: 'creature',
              tags: ['card', 'creature'],
              parent: mapPage.id
            });

          setPages([
            mapPage,
            source,
            player,
            mapChild
          ]);

          setCurrentPage(
            mapPage
          );

          document.querySelector('#editorArea').innerHTML =
            createMapShellHTML();

          const map =
            document.querySelector('.campaign-map-document');

          const popup =
            document.createElement('div');

          document.body.appendChild(
            popup
          );

          const anchor =
            document.createElement('button');

          document.body.appendChild(
            anchor
          );

          openAddKindPopup(
            map,
            anchor,
            {
              getMapPopup: () => popup,
              showMapPopup: nextPopup => nextPopup.classList.remove('hidden'),
              closeMapPopup: () => popup.classList.add('hidden')
            }
          );

          popup
            .querySelector('[data-kind="creature"]')
            .click();

          const pickerLabels =
            [...popup.querySelectorAll('.campaign-map-picker-row span')]
              .map(item => item.textContent.trim());

          const duplicate =
            await addPageToMap(
              map,
              source,
              {
                async addMapToken(nextMap, kind, pageRecord, spawnIndex, options = {}) {

                  const store =
                    refreshCampaignMapStore(
                      nextMap
                    );

                  const tokenData =
                    store.addToken({
                      tokenId: `token-${pageRecord.id}`,
                      pageId: pageRecord.id,
                      type: kind,
                      name: pageRecord.title,
                      x: 50,
                      y: 50,
                      sourceMode: options.sourceMode || 'copy'
                    });

                  nextMap
                    .querySelector('.campaign-map-object-layer')
                    .appendChild(
                      createMapTokenElement(
                        tokenData,
                        store.getModel()
                      )
                    );
                },
                async saveAndSync() {}
              }
            );

          await addPageToMap(
            map,
            player,
            {
              async addMapToken(nextMap, kind, pageRecord, spawnIndex, options = {}) {

                const store =
                  refreshCampaignMapStore(
                    nextMap
                  );

                const tokenData =
                  store.addToken({
                    tokenId: `token-${pageRecord.id}`,
                    pageId: pageRecord.id,
                    type: kind,
                    name: pageRecord.title,
                    x: 52,
                    y: 52,
                    sourceMode: options.sourceMode || 'copy'
                  });

                nextMap
                  .querySelector('.campaign-map-object-layer')
                  .appendChild(
                    createMapTokenElement(
                      tokenData,
                      store.getModel()
                    )
                  );
              },
              async saveAndSync() {}
            }
          );

          const bucket =
            state.pages.find(candidate =>
              candidate.parent === mapPage.id &&
              candidate.title === `\u0421\u0443\u0449\u0435\u0441\u0442\u0432\u0430.${MAP_TITLE}`
            );

          const tokens =
            refreshCampaignMapStore(
              map
            )
              .getModel()
              .tokens;

          return {
            pickerLabels,
            canAddSource: canAddPageToCampaignMap(source),
            canAddMapChild: canAddPageToCampaignMap(mapChild),
            bucketTitle: bucket?.title || '',
            duplicateTitle: duplicate?.title || '',
            duplicateParent: duplicate?.parent || '',
            tokenPageId: tokens[0]?.pageId || '',
            tokenName: tokens[0]?.name || '',
            playerTokenPageId: tokens[1]?.pageId || '',
            playerTokenSourceMode: tokens[1]?.sourceMode || '',
            playerParentAfterAdd: player.parent || '',
            writtenFiles: state.__testWrittenFiles
          };
        }
      );

    expect(
      result.pickerLabels
    ).toEqual([
      '\u0413\u043e\u0431\u043b\u0438\u043d'
    ]);

    expect(
      result.canAddSource
    ).toBe(
      true
    );

    expect(
      result.canAddMapChild
    ).toBe(
      false
    );

    expect(
      result.bucketTitle
    ).toBe(
      '\u0421\u0443\u0449\u0435\u0441\u0442\u0432\u0430.\u041f\u0435\u0449\u0435\u0440\u0430'
    );

    expect(
      result.duplicateTitle
    ).toBe(
      '\u0413\u043e\u0431\u043b\u0438\u043d - \u0441\u0443\u0449\u043d\u043e\u0441\u0442\u044c.\u041f\u0435\u0449\u0435\u0440\u0430'
    );

    expect(
      result.duplicateParent
    ).toBeTruthy();

    expect(
      result.tokenPageId
    ).toBe(
      result.duplicateParent
        ? result.writtenFiles
          .filter(file =>
            file.name.endsWith('.md')
          )
          .at(-1).id
        : ''
    );

    expect(
      result.tokenName
    ).toBe(
      '\u0413\u043e\u0431\u043b\u0438\u043d - \u0441\u0443\u0449\u043d\u043e\u0441\u0442\u044c.\u041f\u0435\u0449\u0435\u0440\u0430'
    );

    expect(
      result.playerTokenPageId
    ).toBe(
      'player-character'
    );

    expect(
      result.playerTokenSourceMode
    ).toBe(
      'original'
    );

    expect(
      result.playerParentAfterAdd
    ).toBe(
      ''
    );
  }
);


test(
  'campaign-map-drawing-tools-create-fill-and-erase-map-shapes',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            setDrawingColor,
            setDrawingTool,
            startCampaignMapDrawing,
            moveCampaignMapDrawing,
            finishCampaignMapDrawing
          } = await import('/js/editor/campaignMapDrawing.js');

          document.querySelector('#editorArea').innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <button class="campaign-drawing-btn" type="button"></button>
              <div class="campaign-map-stage" data-grid="false" data-grid-size="80" data-fog-mode="draw" data-fog-image="" contenteditable="false" style="position: relative; width: 1000px; height: 800px;">
                <div class="campaign-map-viewport" style="position: relative; width: 100%; height: 100%;">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          const map =
            document.querySelector('.campaign-map-document');

          const stage =
            map.querySelector('.campaign-map-stage');

          const rect =
            stage.getBoundingClientRect();

          const pointer =
            (
              type,
              x,
              y
            ) => new PointerEvent(
              type,
              {
                clientX:
                  rect.left + x,
                clientY:
                  rect.top + y,
                pointerId:
                  11
              }
            );

          const store =
            refreshCampaignMapStore(
              map
            );

          setDrawingColor(
            map,
            '#aa33cc'
          );

          setDrawingTool(
            map,
            'pencil'
          );

          startCampaignMapDrawing(
            pointer(
              'pointerdown',
              120,
              140
            ),
            stage
          );

          moveCampaignMapDrawing(
            pointer(
              'pointermove',
              190,
              210
            )
          );

          finishCampaignMapDrawing();

          const hasPolylineBeforeErase =
            Boolean(
              map.querySelector('.campaign-map-drawing-svg polyline')
            );

          setDrawingTool(
            map,
            'pen'
          );

          startCampaignMapDrawing(
            pointer(
              'pointerdown',
              300,
              300
            ),
            stage
          );

          moveCampaignMapDrawing(
            pointer(
              'pointermove',
              360,
              320
            )
          );

          finishCampaignMapDrawing();

          startCampaignMapDrawing(
            pointer(
              'pointerdown',
              360,
              320
            ),
            stage
          );

          moveCampaignMapDrawing(
            pointer(
              'pointermove',
              420,
              360
            )
          );

          finishCampaignMapDrawing();

          const penShapesBeforeFill =
            store.getModel().shapes
              .filter(shape => shape.type === 'line')
              .map(shape => shape.points);

          startCampaignMapDrawing(
            pointer(
              'pointerdown',
              700,
              700
            ),
            stage
          );

          moveCampaignMapDrawing(
            pointer(
              'pointermove',
              740,
              740
            )
          );

          finishCampaignMapDrawing();

          const penShapesAfterFarClick =
            store.getModel().shapes
              .filter(shape => shape.type === 'line')
              .map(shape => shape.points);

          setDrawingTool(
            map,
            'fill'
          );

          startCampaignMapDrawing(
            pointer(
              'pointerdown',
              150,
              170
            ),
            stage
          );

          startCampaignMapDrawing(
            pointer(
              'pointerdown',
              20,
              20
            ),
            stage
          );

          const beforeErase =
            store.getModel().shapes.map(shape => ({
              type:
                shape.type,
              color:
                shape.strokeColor,
              fillColor:
                shape.fillColor,
              layerId:
                shape.layerId,
              points:
                shape.points
            }));

          setDrawingTool(
            map,
            'eraser'
          );

          startCampaignMapDrawing(
            pointer(
              'pointerdown',
              150,
              170
            ),
            stage
          );

          return {
            beforeErase,
            penShapesBeforeFill,
            penShapesAfterFarClick,
            afterErase:
              store.getModel().shapes.map(shape => shape.type),
            hasPolylineBeforeErase,
            activeButton:
              map.querySelector('.campaign-drawing-btn')?.classList.contains('is-active') || false
          };
        }
      );

    expect(
      result.beforeErase.map(item => item.type)
    ).toEqual([
      'freehand',
      'line',
      'line',
      'fill'
    ]);

    expect(
      result.penShapesBeforeFill.length
    ).toBe(
      1
    );

    expect(
      result.penShapesAfterFarClick.length
    ).toBe(
      2
    );

    expect(
      result.beforeErase[0].color
    ).toBe(
      '#aa33cc'
    );

    expect(
      result.beforeErase[0].fillColor
    ).toBe(
      '#aa33cc'
    );

    expect(
      result.beforeErase.every(item =>
        item.layerId === 'map-drawing'
      )
    ).toBe(
      true
    );

    expect(
      result.beforeErase[0].points
    ).toContain(
      ' '
    );

    expect(
      result.afterErase
    ).toEqual([
      'line',
      'line',
      'fill'
    ]);

    expect(
      result.hasPolylineBeforeErase
    ).toBe(
      true
    );

    expect(
      result.activeButton
    ).toBe(
      true
    );
  }
);


test(
  'campaign-map-delete-removes-selected-map-items',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            createMapShapeElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            renderMapShapeElement
          } = await import('/js/editor/campaignMapRenderer.js');

          const {
            removeSelectedCampaignMapItems
          } = await import('/js/editor/campaignMap.js');

          document.querySelector('#editorArea').innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-stage" data-grid="false" data-grid-size="80" data-fog-mode="draw" data-fog-image="" contenteditable="false">
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

          const store =
            refreshCampaignMapStore(
              map
            );

          const record =
            store.addShape({
              shapeId:
                'delete-me',
              type:
                'square',
              x:
                10,
              y:
                20,
              width:
                80,
              height:
                80
            });

          const shape =
            createMapShapeElement(
              record,
              store.getModel()
            );

          shape.classList.add(
            'is-selected'
          );

          map
            .querySelector('.campaign-map-object-layer')
            .appendChild(
              shape
            );

          renderMapShapeElement(
            shape
          );

          const deleted =
            removeSelectedCampaignMapItems(
              map
            );

          return {
            deleted,
            domShapes:
              map.querySelectorAll('.campaign-map-shape').length,
            modelShapes:
              store.getModel().shapes.length
          };
        }
      );

    expect(
      result
    ).toEqual({
      deleted:
        1,
      domShapes:
        0,
      modelShapes:
        0
    });
  }
);


test(
  'campaign-map-music-popup-manages-normal-and-battle-playlists',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            setPages
          } = await import('/js/stateActions.js');

          const {
            setStorageAdapter
          } = await import('/js/storage/storageAdapter.js');

          const {
            openCampaignMapMusicPopup
          } = await import('/js/editor/campaignMapMusic.js');

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          class TestAudio {

            constructor() {

              this.dataset = {};
              this.currentTime = 0;
              this.src = '';
              window.__campaignMapMusicAudio = this;
            }

            play() {

              this.dataset.played = 'true';
              return Promise.resolve();
            }

            pause() {

              this.dataset.paused = 'true';
            }
          }

          window.Audio =
            TestAudio;

          const adapter = {
            kind: 'test',
            writtenBinaryPaths: [],
            readBinaryPaths: [],
            async pickWorkspace() {},
            async restoreWorkspace() {},
            async ensureDirectory() {},
            async getDirectoryHandle() {},
            async readText() {
              return '';
            },
            async writeText() {},
            async readBinary(path) {
              this.readBinaryPaths.push(
                path
              );

              return new ArrayBuffer(8);
            },
            async writeBinary(path) {
              this.writtenBinaryPaths.push(
                path
              );
            },
            async removeFile() {},
            async removeDirectory() {},
            async listFiles(path) {

              if (path === 'assets') {

                return [
                  {
                    name: 'music',
                    kind: 'directory'
                  }
                ];
              }

              if (path === 'assets/music') {

                return [
                  {
                    name: 'town.mp3',
                    kind: 'file'
                  },
                  {
                    name: 'battle.ogg',
                    kind: 'file'
                  }
                ];
              }

              return [];
            }
          };

          setStorageAdapter(
            adapter
          );

          const copiedMusic =
            encodeURIComponent(
              JSON.stringify({
                normal: {
                  title: '\u0421\u0442\u0430\u0440\u044b\u0439 \u0433\u043e\u0440\u043e\u0434',
                  tracks: [
                    {
                      trackId: 'copy-track',
                      title: '\u0421\u0442\u0430\u0440\u044b\u0439 \u0433\u043e\u0440\u043e\u0434',
                      path: 'assets/music/town.mp3'
                    }
                  ]
                }
              })
            );

          setPages([
            {
              id: 'other-map',
              title: '\u0413\u043e\u0440\u043e\u0434',
              type: 'campaignMap',
              template: 'campaignMap',
              content: `<div class="campaign-map-stage" data-map-music-state="${copiedMusic}"></div>`
            }
          ]);

          document.body.innerHTML =
            `
              <button class="anchor" type="button">music</button>
              <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
                <div class="campaign-map-topbar" contenteditable="false">
                  <h1 class="campaign-map-title singleline-field" contenteditable="true">\u041b\u0435\u0441</h1>
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
            document.querySelector(
              '.campaign-map-document'
            );

          refreshCampaignMapStore(
            map
          );

          const testState =
            {
              saveCount:
                0,
              adapter,
              map
            };

          window.__campaignMapMusicTest =
            testState;

          await openCampaignMapMusicPopup(
            map,
            document.querySelector('.anchor'),
            {
              async saveAndSync() {
                testState.saveCount += 1;
              }
            }
          );
        }
      );

    await page
      .locator('.campaign-music-upload-input')
      .setInputFiles({
        name:
          'uploaded.mp3',
        mimeType:
          'audio/mpeg',
        buffer:
          Buffer.from([
            1,
            2,
            3
          ])
      });

    await expect(
      page.locator('.campaign-music-upload-pending')
    ).toContainText(
      '\u0412\u044b\u0431\u0440\u0430\u043d\u043e \u0444\u0430\u0439\u043b\u043e\u0432: 1'
    );

    await page
      .locator('.campaign-music-upload-add-btn')
      .click();

    await expect(
      page.locator('.campaign-music-track-list')
    ).toContainText(
      'uploaded'
    );

    await page
      .locator('.campaign-music-track-play')
      .click();

    await expect(
      page.locator('.campaign-music-track-row.is-playing')
    ).toContainText(
      'uploaded'
    );

    await expect(
      page.locator('.campaign-music-now')
    ).toContainText(
      'uploaded'
    );

    await page
      .locator('.campaign-music-play-btn')
      .click();

    await expect(
      page.locator('.campaign-music-playback-status')
    ).toContainText(
      '\u0418\u0433\u0440\u0430\u0435\u0442'
    );

    await page
      .locator('.campaign-music-mode-btn[data-music-mode="battle"]')
      .click();

    await page
      .locator('.campaign-music-upload-input')
      .setInputFiles({
        name:
          'battle-upload.ogg',
        mimeType:
          'audio/ogg',
        buffer:
          Buffer.from([
            4,
            5,
            6
          ])
      });

    await expect(
      page.locator('.campaign-music-upload-pending')
    ).toContainText(
      '\u0412\u044b\u0431\u0440\u0430\u043d\u043e \u0444\u0430\u0439\u043b\u043e\u0432: 1'
    );

    await page
      .locator('.campaign-music-upload-add-btn')
      .click();

    await expect(
      page.locator('.campaign-music-track-list')
    ).toContainText(
      'battle upload'
    );

    await page
      .locator('.campaign-music-copy-select')
      .selectOption(
        'other-map:normal'
      );

    await page
      .locator('.campaign-music-copy-btn')
      .click();

    const result =
      await page.evaluate(
        () => {

          const testState =
            window.__campaignMapMusicTest;

          const music =
            testState.map.campaignMapModel.music;

          return {
            saveCount:
              testState.saveCount,
            activeMode:
              music.activeMode,
            writtenBinaryPaths:
              testState.adapter.writtenBinaryPaths,
            readBinaryPaths:
              testState.adapter.readBinaryPaths,
            normalTracks:
              music.normal.tracks.map(track => track.path),
            battleTitle:
              music.battle.title,
            battleTracks:
              music.battle.tracks.map(track => track.path),
            audioPlayed:
              window.__campaignMapMusicAudio?.dataset?.played || '',
            audioSrc:
              window.__campaignMapMusicAudio?.src || ''
          };
        }
      );

    expect(
      result.saveCount
    ).toBeGreaterThanOrEqual(
      4
    );

    expect(
      result.activeMode
    ).toBe(
      'battle'
    );

    expect(
      result.writtenBinaryPaths
    ).toEqual([
      'assets/music/uploaded.mp3',
      'assets/music/battle-upload.ogg'
    ]);

    expect(
      result.readBinaryPaths
    ).toContain(
      'assets/music/uploaded.mp3'
    );

    expect(
      result.normalTracks
    ).toContain(
      'assets/music/uploaded.mp3'
    );

    expect(
      result.battleTitle
    ).toBe(
      '\u0421\u0442\u0430\u0440\u044b\u0439 \u0433\u043e\u0440\u043e\u0434'
    );

    expect(
      result.battleTracks
    ).toEqual([
      'assets/music/town.mp3'
    ]);

    expect(
      result.audioPlayed
    ).toBe(
      'true'
    );

    expect(
      result.audioSrc
    ).toMatch(
      /^blob:/
    );
  }
);


test(
  'campaign-map-music-starts-first-active-playlist-track-on-map-switch',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            setStorageAdapter
          } = await import('/js/storage/storageAdapter.js');

          const {
            playFirstCampaignMapMusicForMapSwitch
          } = await import('/js/editor/campaignMapMusic.js');

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const audioInstances =
            [];

          class TestAudio {

            constructor() {

              this.dataset = {};
              this.currentTime = 0;
              this.src = '';
              this.paused = false;

              audioInstances.push(
                this
              );
            }

            play() {

              this.dataset.played = 'true';
              return Promise.resolve();
            }

            pause() {

              this.paused =
                true;

              this.dataset.paused =
                'true';
            }
          }

          window.Audio =
            TestAudio;

          setStorageAdapter({
            kind:
              'test',
            async pickWorkspace() {},
            async restoreWorkspace() {},
            async ensureDirectory() {},
            async getDirectoryHandle() {},
            async readText() {
              return '';
            },
            async writeText() {},
            async readBinary() {
              return new ArrayBuffer(8);
            },
            async writeBinary() {},
            async removeFile() {},
            async removeDirectory() {},
            async listFiles() {
              return [];
            }
          });

          document.body.innerHTML =
            `
              <div class="campaign-map-document map-a" data-campaign-map="v1" contenteditable="false">
                <div class="campaign-map-stage" data-grid="false" data-fog-mode="draw" data-fog-image="" contenteditable="false">
                  <div class="campaign-map-viewport">
                    <div class="campaign-map-background"></div>
                    <div class="campaign-map-object-layer"></div>
                    <canvas class="campaign-map-fog-canvas"></canvas>
                  </div>
                </div>
              </div>
              <div class="campaign-map-document map-b" data-campaign-map="v1" contenteditable="false">
                <div class="campaign-map-stage" data-grid="false" data-fog-mode="draw" data-fog-image="" contenteditable="false">
                  <div class="campaign-map-viewport">
                    <div class="campaign-map-background"></div>
                    <div class="campaign-map-object-layer"></div>
                    <canvas class="campaign-map-fog-canvas"></canvas>
                  </div>
                </div>
              </div>
            `;

          const mapA =
            document.querySelector('.map-a');

          const mapB =
            document.querySelector('.map-b');

          refreshCampaignMapStore(
            mapA
          )
            .setMusic({
              activeMode:
                'normal',
              normal: {
                tracks: [
                  {
                    trackId:
                      'a-first',
                    title:
                      'A First',
                    path:
                      'assets/music/a-first.mp3'
                  },
                  {
                    trackId:
                      'a-second',
                    title:
                      'A Second',
                    path:
                      'assets/music/a-second.mp3'
                  }
                ]
              }
            });

          refreshCampaignMapStore(
            mapB
          )
            .setMusic({
              activeMode:
                'battle',
              battle: {
                tracks: [
                  {
                    trackId:
                      'b-first',
                    title:
                      'B First',
                    path:
                      'assets/music/b-first.mp3'
                  },
                  {
                    trackId:
                      'b-second',
                    title:
                      'B Second',
                    path:
                      'assets/music/b-second.mp3'
                  }
                ]
              }
            });

          await playFirstCampaignMapMusicForMapSwitch(
            mapA
          );

          await playFirstCampaignMapMusicForMapSwitch(
            mapB
          );

          return {
            firstTrack:
              audioInstances[0]?.dataset?.trackId || '',
            firstPaused:
              audioInstances[0]?.dataset?.paused || '',
            secondTrack:
              audioInstances[1]?.dataset?.trackId || '',
            secondPlayed:
              audioInstances[1]?.dataset?.played || ''
          };
        }
      );

    expect(
      result
    ).toEqual({
      firstTrack:
        'a-first',
      firstPaused:
        'true',
      secondTrack:
        'b-first',
      secondPlayed:
        'true'
    });
  }
);


test(
  'campaign-map-token-skill-action-uses-character-model-checks',
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
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            openTokenPopup
          } = await import('/js/editor/campaignMapTokenPopupController.js');

          const pageRecord = {
            id:
              'rogue-page',
            parent:
              null,
            order:
              1,
            title:
              'Rogue',
            type:
              'creature',
            template:
              'card',
            tags:
              [
                'card',
                'creature'
              ],
            aliases:
              [],
            content:
              `---
id: rogue-page
parent: null
order: 1
tags: [card, creature]
template: card
type: creature
aliases: []
---

<div class="template-block card-properties-block card-properties-creature" data-block-type="properties" data-card-type="creature">
  <input data-property-name="level" value="5">
  <input data-property-name="dex" value="16">
  <input data-property-name="skillStealth" value="3">
  <input data-property-name="skillStealthProficient" value="2">
</div>`,
            handle:
              null
          };

          setPages([
            pageRecord
          ]);

          document.querySelector('#editorArea').innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-stage" data-grid="false" data-grid-size="80" data-fog-mode="draw" data-fog-image="" contenteditable="false" style="position: relative; width: 1000px; height: 800px;">
                <div class="campaign-map-viewport" style="position: relative; width: 100%; height: 100%;">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          const map =
            document.querySelector('.campaign-map-document');

          const store =
            refreshCampaignMapStore(
              map
            );

          const tokenRecord =
            store.addToken({
              tokenId:
                'rogue-token',
              pageId:
                'rogue-page',
              type:
                'creature',
              name:
                'Rogue',
              x:
                50,
              y:
                50
            });

          map
            .querySelector('.campaign-map-object-layer')
            .appendChild(
              createMapTokenElement(
                tokenRecord
              )
            );

          const token =
            map.querySelector('[data-token-id="rogue-token"]');

          openTokenPopup(
            token,
            {
              hasActiveTokenInteraction() {
                return false;
              },
              hasActiveShapeInteraction() {
                return false;
              },
              getTokenActionDeps() {
                return {
                  async saveAndSync() {}
                };
              }
            }
          );

          document
            .querySelector('.campaign-token-popup-more')
            .click();

          document
            .querySelector('[data-action="skill"]')
            .click();

          const select =
            document.querySelector('.campaign-token-skill-select');

          select.value =
            'skillStealth';

          document.querySelector('.campaign-token-skill-range').value =
            '30 ft';

          document.querySelector('.campaign-token-skill-area').value =
            'cone';

          document
            .querySelector('.campaign-token-skill-apply')
            .click();

          return JSON.parse(
            decodeURIComponent(
              token.dataset.lastSkillAction
            )
          );
        }
      );

    expect(
      result.skillKey
    ).toBe(
      'skillStealth'
    );

    expect(
      result.value
    ).toBeGreaterThanOrEqual(
      6
    );

    expect(
      result.range
    ).toBe(
      '30 ft'
    );

    expect(
      result.area
    ).toBe(
      'cone'
    );
  }
);


test(
  'campaign-map-layers-control-visibility-and-z-order',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            createMapShapeElement,
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            applyCampaignMapLayers,
            moveCampaignMapLayer,
            setCampaignMapLayerVisibility
          } = await import('/js/editor/campaignMapLayers.js');

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
            refreshCampaignMapStore(
              map
            );

          store.addLockedFogZone({
            id: 'locked-zone',
            x: 40,
            y: 60,
            width: 80,
            height: 90
          });

          const token =
            store.addToken({
              tokenId: 'token-hero',
              type: 'creature',
              name: '\u0413\u0435\u0440\u043e\u0439'
            });

          const shape =
            store.addShape({
              shapeId: 'shape-zone',
              type: 'square',
              width: 120,
              height: 120
            });

          layer.append(
            createMapTokenElement(
              token
            ),
            createMapShapeElement(
              shape
            )
          );

          const {
            renderLockedFogZones
          } = await import('/js/editor/campaignMapFog.js');

          renderLockedFogZones(
            map
          );

          applyCampaignMapLayers(
            map
          );

          setCampaignMapLayerVisibility(
            map,
            'map-shapes',
            false
          );

          moveCampaignMapLayer(
            map,
            'map-shapes',
            'down'
          );

          const fogCanvas =
            map.querySelector('.campaign-map-fog-canvas');

          const lockedFogZone =
            map.querySelector('.campaign-fog-locked-zone');

          const lockedFogBeforeHide = {
            layerId:
              lockedFogZone.dataset.layerId,
            hidden:
              lockedFogZone.dataset.layerHidden,
            z:
              lockedFogZone.style.zIndex
          };

          setCampaignMapLayerVisibility(
            map,
            'map-locked-fog',
            false
          );

          const nextModel =
            refreshCampaignMapStore(
              map
            ).getModel();

          return {
            shapeHidden:
              map.querySelector('.campaign-map-shape').dataset.layerHidden,
            shapeZ:
              map.querySelector('.campaign-map-shape').dataset.zIndex,
            tokenZ:
              map.querySelector('.campaign-map-token').dataset.zIndex,
            fogZ:
              fogCanvas.style.zIndex,
            lockedFogBeforeHide,
            lockedFogHidden:
              lockedFogZone.dataset.layerHidden,
            savedLayers:
              nextModel.layers.map(item => ({
                layerId: item.layerId,
                title: item.title,
                locked: item.locked,
                visible: item.visible,
                zIndex: item.zIndex
              }))
          };
        }
      );

    expect(
      result.shapeHidden
    ).toBe(
      'true'
    );

    expect(
      Number(result.shapeZ)
    ).toBeLessThan(
      Number(result.tokenZ)
    );

    expect(
      result.savedLayers.find(layer => layer.layerId === 'map-shapes').visible
    ).toBe(
      false
    );

    expect(
      result.savedLayers.some(layer =>
        layer.layerId === 'map-drawing' &&
        layer.title === '\u0420\u0438\u0441\u043e\u0432\u0430\u043d\u0438\u0435'
      )
    ).toBe(
      true
    );

    expect(
      result.savedLayers.some(layer =>
        layer.layerId === 'map-fog' &&
        layer.locked === true
      )
    ).toBe(
      true
    );

    expect(
      result.savedLayers.some(layer =>
        layer.layerId === 'map-locked-fog' &&
        layer.locked === true &&
        layer.title === '\u0417\u0430\u043f\u0440\u0435\u0442\u043d\u044b\u0435 \u0437\u043e\u043d\u044b \u0442\u0443\u043c\u0430\u043d\u0430'
      )
    ).toBe(
      true
    );

    expect(
      Number(result.fogZ)
    ).toBeGreaterThan(
      Number(result.tokenZ)
    );

    expect(
      result.lockedFogBeforeHide
    ).toEqual({
      layerId: 'map-locked-fog',
      hidden: 'false',
      z: String(
        result.savedLayers.find(layer =>
          layer.layerId === 'map-locked-fog'
        ).zIndex
      )
    });

    expect(
      result.lockedFogHidden
    ).toBe(
      'true'
    );
  }
);


test(
  'campaign-map-locked-fog-zones-edit-and-protect-fog-paint',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            createFogDrawing,
            drawFogAtPointer,
            finishLockedFogZoneEdit,
            moveLockedFogZoneEdit,
            renderLockedFogZones
          } = await import('/js/editor/campaignMapFog.js');

          document.querySelector('#editorArea').innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-stage" data-grid="false" data-fog-mode="draw" data-fog-image="" data-brush-size="30" contenteditable="false" style="position: relative; width: 900px; height: 700px;">
                <div class="campaign-map-viewport" style="position: relative; width: 100%; height: 100%;">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          const map =
            document.querySelector('.campaign-map-document');

          const stage =
            map.querySelector('.campaign-map-stage');

          const stageRect =
            stage.getBoundingClientRect();

          const pointer =
            (
              type,
              x,
              y,
              options = {}
            ) => new PointerEvent(
              type,
              {
                ...options,
                clientX: stageRect.left + x,
                clientY: stageRect.top + y
              }
            );

          const store =
            refreshCampaignMapStore(
              map
            );

          store.addLockedFogZone({
            id: 'lock-1',
            x: 480,
            y: 480,
            width: 100,
            height: 100
          });

          renderLockedFogZones(
            map
          );

          const zoneElement =
            map.querySelector('.campaign-fog-locked-zone');

          zoneElement.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: stageRect.left + 500,
                clientY: stageRect.top + 500,
                pointerId: 1
              }
            )
          );

          moveLockedFogZoneEdit(
            new PointerEvent(
              'pointermove',
              {
                clientX: stageRect.left + 540,
                clientY: stageRect.top + 530,
                pointerId: 1
              }
            )
          );

          finishLockedFogZoneEdit();

          const moved =
            store.getModel().fog.lockedZones[0];

          zoneElement
            .querySelector('.campaign-fog-locked-zone-resize')
            .dispatchEvent(
              new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                  clientX: stageRect.left + 620,
                  clientY: stageRect.top + 610,
                  pointerId: 2
              }
            )
            );

          moveLockedFogZoneEdit(
            new PointerEvent(
              'pointermove',
              {
                clientX: stageRect.left + 660,
                clientY: stageRect.top + 650,
                pointerId: 2
              }
            )
          );

          finishLockedFogZoneEdit();

          const resized =
            store.getModel().fog.lockedZones[0];

          const fogDrawing =
            createFogDrawing(
              stage
            );

          drawFogAtPointer(
            pointer(
              'pointermove',
              resized.x + 20,
              resized.y + 20
            ),
            fogDrawing
          );

          const countAfterLockedPaint =
            Number(stage.dataset.fogDirtyRegionCount || 0);

          drawFogAtPointer(
            pointer(
              'pointermove',
              resized.x + resized.width + 100,
              resized.y + resized.height + 100
            ),
            fogDrawing
          );

          const countAfterOpenPaint =
            Number(stage.dataset.fogDirtyRegionCount || 0);

          map
            .querySelector('.campaign-fog-locked-zone')
            .dispatchEvent(
              new MouseEvent(
                'dblclick',
                {
                  bubbles: true
                }
              )
            );

          return {
            moved,
            resized,
            countAfterLockedPaint,
            countAfterOpenPaint,
            deletedCount:
              store.getModel().fog.lockedZones.length,
            savedDirtyRegion:
              store.getModel().fog.lastDirtyRegion
          };
        }
      );

    expect(
      result.moved
    ).toMatchObject({
      x: 520,
      y: 510
    });

    expect(
      result.resized.width
    ).toBeGreaterThan(
      100
    );

    expect(
      result.resized.height
    ).toBeGreaterThan(
      100
    );

    expect(
      result.countAfterLockedPaint
    ).toBe(
      0
    );

    expect(
      result.countAfterOpenPaint
    ).toBe(
      1
    );

    expect(
      result.savedDirtyRegion
    ).toEqual(
      expect.objectContaining({
        width: 64,
        height: 64
      })
    );

    expect(
      result.deletedCount
    ).toBe(
      0
    );
  }
);


test(
  'campaign-map-selection-box-selects-and-drags-token-shape-group',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            createMapShapeElement,
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            finishCampaignMapSelectionBox,
            moveCampaignMapSelectionBox,
            startCampaignMapSelectionBox
          } = await import('/js/editor/campaignMapSelectionBox.js');

          const {
            finishTokenInteractions,
            moveTokenInteractions,
            startTokenDrag
          } = await import('/js/editor/campaignMapTokenDrag.js');

          document.querySelector('#editorArea').innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-stage" data-grid="false" data-grid-size="80" data-fog-mode="draw" data-fog-image="" contenteditable="false" style="position: relative; width: 1000px; height: 800px;">
                <div class="campaign-map-viewport" style="position: relative; width: 100%; height: 100%;">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          const map =
            document.querySelector('.campaign-map-document');

          const stage =
            map.querySelector('.campaign-map-stage');

          const stageRect =
            stage.getBoundingClientRect();

          const pointer =
            (
              type,
              x,
              y,
              options = {}
            ) => new PointerEvent(
              type,
              {
                ...options,
                clientX: stageRect.left + x,
                clientY: stageRect.top + y
              }
            );

          const layer =
            map.querySelector('.campaign-map-object-layer');

          const store =
            refreshCampaignMapStore(
              map
            );

          const tokenA =
            store.addToken({
              tokenId: 'token-a',
              type: 'creature',
              name: 'A',
              x: 30,
              y: 50
            });

          const tokenB =
            store.addToken({
              tokenId: 'token-b',
              type: 'creature',
              name: 'B',
              x: 32,
              y: 52
            });

          const shape =
            store.addShape({
              shapeId: 'shape-a',
              type: 'square',
              x: 620,
              y: 620,
              width: 90,
              height: 90
            });

          layer.append(
            createMapTokenElement(
              tokenA
            ),
            createMapTokenElement(
              tokenB
            ),
            createMapShapeElement(
              shape
            )
          );

          startCampaignMapSelectionBox(
            pointer(
              'pointerdown',
              560,
              560
            ),
            stage
          );

          moveCampaignMapSelectionBox(
            pointer(
              'pointermove',
              760,
              720
            )
          );

          finishCampaignMapSelectionBox(
            pointer(
              'pointerup',
              760,
              720
            )
          );

          const selectedTokens =
            [...map.querySelectorAll('.campaign-map-token.is-selected')]
              .map(token => token.dataset.tokenId);

          const selectedShapes =
            [...map.querySelectorAll('.campaign-map-shape.is-selected')]
              .map(nextShape => nextShape.dataset.shapeId);

          const deps = {
            clearTokenPopupTimer() {},
            closeTokenPopup() {},
            selectMapToken(token) {
              token.classList.add('is-selected');
            },
            setMapInteractionQuality() {},
            async saveAndSync() {}
          };

          startTokenDrag(
            pointer(
              'pointerdown',
              600,
              600,
              {
                pointerId: 3
              }
            ),
            map.querySelector('[data-token-id="token-a"]'),
            deps
          );

          moveTokenInteractions(
            pointer(
              'pointermove',
              720,
              750,
              {
                pointerId: 3
              }
            )
          );

          await finishTokenInteractions(
            deps
          );

          return {
            selectedTokens,
            selectedShapes,
            tokenA:
              store.getModel().getToken('token-a'),
            tokenB:
              store.getModel().getToken('token-b'),
            shape:
              store.getModel().getShape('shape-a')
          };
        }
      );

    expect(
      result.selectedTokens.sort()
    ).toEqual([
      'token-a',
      'token-b'
    ]);

    expect(
      result.selectedShapes
    ).toEqual([
      'shape-a'
    ]);

    expect(
      result.tokenA.x
    ).toBeGreaterThan(
      30
    );

    expect(
      result.tokenB.x
    ).toBeGreaterThan(
      32
    );

    expect(
      result.shape.x
    ).toBeGreaterThan(
      620
    );
  }
);
