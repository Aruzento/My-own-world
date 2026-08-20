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
  'campaign-map-toolbar-uses-migrated-mode-action-groups',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createCampaignMapTemplate
          } = await import('/js/templates/campaignMap.js');

          const {
            renderCampaignMap
          } = await import('/js/editor/campaignMap.js');

          const {
            getMapControlsHTML
          } = await import('/js/editor/campaignMapToolbar.js');

          const {
            setDrawingTool
          } = await import('/js/editor/campaignMapDrawing.js');

          const {
            setMapTool
          } = await import('/js/editor/campaignMapFog.js');

          const {
            toggleGrid
          } = await import('/js/editor/campaignMapViewport.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createCampaignMapTemplate().content;

          await renderCampaignMap(
            editor
          );

          const map =
            editor.querySelector('.campaign-map-document');

          const sceneBar =
            map.querySelector('[data-map-toolbar-region="scene-bar"]');

          const toolRail =
            map.querySelector('[data-map-toolbar-region="tool-rail"]');

          const toolbarRegions =
            [
              sceneBar,
              toolRail
            ];

          const knownSelectors =
            [
              '.campaign-add-btn',
              '.campaign-pan-btn',
              '.campaign-grid-btn',
              '.campaign-change-map-btn',
              '.campaign-open-presentation-btn',
              '.campaign-shapes-btn',
              '.campaign-drawing-btn',
              '.campaign-layers-btn',
              '.campaign-fog-btn',
              '.campaign-initiative-btn',
              '.campaign-music-btn'
            ];

          const getButtonKey =
            button =>
              knownSelectors
                .find(selector =>
                  button.matches(selector)
                )
                ?.slice(1) || '';

          const legacyToolbar =
            document.createElement('div');

          legacyToolbar.innerHTML =
            getMapControlsHTML();

          const legacyTooltipOrder =
            [
              '.campaign-add-btn',
              '.campaign-grid-btn',
              '.campaign-change-map-btn',
              '.campaign-layers-btn',
              '.campaign-pan-btn',
              '.campaign-shapes-btn',
              '.campaign-drawing-btn',
              '.campaign-fog-btn',
              '.campaign-open-presentation-btn',
              '.campaign-initiative-btn',
              '.campaign-music-btn'
            ];

          toggleGrid(
            map
          );

          setMapTool(
            map,
            'pan'
          );

          const panPressed =
            toolRail
              .querySelector('.campaign-pan-btn')
              .getAttribute('aria-pressed');

          setDrawingTool(
            map,
            'pencil'
          );

          const drawingPressed =
            toolRail
              .querySelector('.campaign-drawing-btn')
              .getAttribute('aria-pressed');

          setMapTool(
            map,
            'draw'
          );

          const mapRect =
            map.getBoundingClientRect();

          const stageRect =
            map
              .querySelector('.campaign-map-stage')
              .getBoundingClientRect();

          const sceneBarRect =
            sceneBar.getBoundingClientRect();

          const toolRailRect =
            toolRail.getBoundingClientRect();

          const sceneButtons =
            [...sceneBar.querySelectorAll('.campaign-map-tool-button')];

          const railButtons =
            [...toolRail.querySelectorAll('.campaign-map-tool-button')];

          const allToolbarButtons =
            toolbarRegions
              .flatMap(region =>
                [...region.querySelectorAll('.campaign-map-tool-button')]
              );

          const waitFrame =
            () => new Promise(resolve =>
              requestAnimationFrame(resolve)
            );

          const tooltipAnchor =
            toolRail.querySelector('.campaign-pan-btn');

          tooltipAnchor.dispatchEvent(
            new MouseEvent(
              'pointerover',
              {
                bubbles:
                  true
              }
            )
          );

          await waitFrame();
          await waitFrame();

          const floatingTooltip =
            document.querySelector('.campaign-map-toolbar-tooltip');

          const floatingTooltipRect =
            floatingTooltip?.getBoundingClientRect();

          const sceneBarStyle =
            getComputedStyle(
              sceneBar
            );

          const toolRailStyle =
            getComputedStyle(
              toolRail
            );

          const anchorAfterStyle =
            getComputedStyle(
              tooltipAnchor,
              '::after'
            );

          return {
            migrations:
              toolbarRegions
                .map(region => region.dataset.mapUiMigration),
            regions:
              toolbarRegions
                .map(region => region.dataset.mapToolbarRegion),
            roles:
              toolbarRegions
                .map(region => region.getAttribute('role')),
            orientations:
              toolbarRegions
                .map(region => region.getAttribute('aria-orientation') || ''),
            ariaLabelsPresent:
              toolbarRegions
                .every(region => Boolean(region.getAttribute('aria-label'))),
            label:
              sceneBar.getAttribute('aria-label'),
            groupKeys:
              [...legacyToolbar.querySelectorAll('.campaign-map-control-group')]
                .map(group => group.dataset.mapControlGroup),
            groupLabels:
              [...legacyToolbar.querySelectorAll('.campaign-map-control-group-label')]
                .map(label => label.textContent.trim()),
            sceneGroupKeys:
              [...sceneBar.querySelectorAll('.campaign-map-control-group')]
                .map(group => group.dataset.mapControlGroup),
            railGroupKeys:
              [...toolRail.querySelectorAll('.campaign-map-control-group')]
                .map(group => group.dataset.mapControlGroup),
            sceneSections:
              [...sceneBar.querySelectorAll('.campaign-map-control-group')]
                .map(group => group.dataset.mapToolSection),
            railSections:
              [...toolRail.querySelectorAll('.campaign-map-control-group')]
                .map(group => group.dataset.mapToolSection),
            buttonLabels:
              toolbarRegions
                .flatMap(region =>
                  [...region.querySelectorAll('.campaign-map-button-label')]
                )
                .map(label => label.textContent.trim()),
            buttonText:
              allToolbarButtons
                .map(button => button.textContent.trim())
                .filter(Boolean),
            buttonTooltips:
              legacyTooltipOrder
                .map(selector =>
                  map.querySelector(selector)?.dataset.tooltip || ''
                ),
            buttonsWithoutTooltip:
              allToolbarButtons
                .filter(button => !button.dataset.tooltip).length,
            buttonsWithoutAria:
              toolbarRegions
                .flatMap(region =>
                  [...region.querySelectorAll('button')]
                )
                .filter(button => !button.getAttribute('aria-label')).length,
            unsectionedGroups:
              toolbarRegions
                .flatMap(region =>
                  [...region.querySelectorAll('.campaign-map-control-group')]
                )
                .filter(group => !group.dataset.mapToolSection).length,
            panGroup:
              toolRail
                .querySelector('.campaign-pan-btn')
                .closest('.campaign-map-control-group')
                .dataset.mapControlGroup,
            gridPressed:
              sceneBar
                .querySelector('.campaign-grid-btn')
                .getAttribute('aria-pressed'),
            panPressed,
            drawingPressed,
            fogPressed:
              toolRail
                .querySelector('.campaign-fog-btn')
                .getAttribute('aria-pressed'),
            drawingPressedAfterFog:
              toolRail
                .querySelector('.campaign-drawing-btn')
                .getAttribute('aria-pressed'),
            toolButtonCount:
              allToolbarButtons.length,
            sceneButtonKeys:
              sceneButtons.map(getButtonKey),
            railButtonKeys:
              railButtons.map(getButtonKey),
            toolbarHeight:
              Math.ceil(sceneBarRect.height),
            sceneBarHeight:
              Math.ceil(sceneBarRect.height),
            railWidth:
              Math.ceil(toolRailRect.width),
            sceneBarWidth:
              Math.ceil(sceneBarRect.width),
            sceneBarFillsAvailableRow:
              sceneBarRect.width >=
              mapRect.width - 330,
            railHeight:
              Math.ceil(toolRailRect.height),
            stageHeight:
              Math.ceil(stageRect.height),
            sceneBarOverflow:
              [
                sceneBarStyle.overflowX,
                sceneBarStyle.overflowY
              ],
            railOverflow:
              [
                toolRailStyle.overflowX,
                toolRailStyle.overflowY
              ],
            floatingTooltip:
              floatingTooltip
                ? {
                  parent:
                    floatingTooltip.parentElement?.tagName || '',
                  visible:
                    floatingTooltip.classList.contains('is-visible'),
                  text:
                    floatingTooltip.textContent.trim(),
                  left:
                    Math.floor(floatingTooltipRect.left),
                  right:
                    Math.ceil(floatingTooltipRect.right),
                  top:
                    Math.floor(floatingTooltipRect.top),
                  bottom:
                    Math.ceil(floatingTooltipRect.bottom)
                }
                : null,
            viewportWidth:
              window.innerWidth,
            buttonPseudoTooltip:
              anchorAfterStyle.content,
            maxButtonWidth:
              Math.max(
                ...sceneButtons
                  .map(button =>
                    Math.ceil(
                      button.getBoundingClientRect().width
                    )
                  )
              ),
            maxSceneButtonWidth:
              Math.max(
                ...sceneButtons
                  .map(button =>
                    Math.ceil(
                      button.getBoundingClientRect().width
                    )
                  )
              ),
            maxRailButtonWidth:
              Math.max(
                ...railButtons
                  .map(button =>
                    Math.ceil(
                      button.getBoundingClientRect().width
                    )
                  )
              ),
            sceneBarFitsMap:
              Math.ceil(sceneBarRect.right) <=
              Math.ceil(mapRect.right),
            toolbarFitsMap:
              Math.ceil(sceneBarRect.right) <=
              Math.ceil(mapRect.right),
            railInsideStage:
              Math.floor(toolRailRect.left) >=
              Math.floor(stageRect.left) &&
              Math.ceil(toolRailRect.right) <=
              Math.ceil(stageRect.right) &&
              Math.floor(toolRailRect.top) >=
              Math.floor(stageRect.top) &&
              Math.ceil(toolRailRect.bottom) <=
              Math.ceil(stageRect.bottom),
            duplicateRuntimePanels:
              {
                scene:
                  map.querySelectorAll('.campaign-map-scene-inspector').length,
                layers:
                  map.querySelectorAll('.campaign-map-layer-dock').length
              },
            titleWidth:
              Math.ceil(
                map
                  .querySelector('.campaign-map-title')
                  .getBoundingClientRect()
                  .width
              ),
            legacySelectorsStillPresent:
              knownSelectors.every(selector =>
                Boolean(
                  map.querySelector(selector)
                )
              )
          };
        }
      );

    expect(
      result.migrations
    ).toEqual([
      '0.0.1.8.12.10',
      '0.0.1.8.12.10'
    ]);

    expect(
      result.regions
    ).toEqual([
      'scene-bar',
      'tool-rail'
    ]);

    expect(
      result.roles
    ).toEqual([
      'toolbar',
      'toolbar'
    ]);

    expect(
      result.orientations
    ).toEqual([
      '',
      'vertical'
    ]);

    expect(
      result.ariaLabelsPresent
    ).toBe(
      true
    );

    expect(
      result.sceneGroupKeys
    ).toEqual([
      'create',
      'scene',
      'live'
    ]);

    expect(
      result.railGroupKeys
    ).toEqual([
      'navigation',
      'drawing',
      'fog'
    ]);

    expect(
      result.sceneSections
    ).toEqual([
      'creation',
      'scene',
      'presentation'
    ]);

    expect(
      result.railSections
    ).toEqual([
      'navigation',
      'drawing',
      'fog'
    ]);

    expect(
      result.sceneButtonKeys
    ).toEqual([
      'campaign-add-btn',
      'campaign-grid-btn',
      'campaign-change-map-btn',
      'campaign-layers-btn',
      'campaign-open-presentation-btn',
      'campaign-initiative-btn',
      'campaign-music-btn'
    ]);

    expect(
      result.railButtonKeys
    ).toEqual([
      'campaign-pan-btn',
      'campaign-shapes-btn',
      'campaign-drawing-btn',
      'campaign-fog-btn'
    ]);

    expect(
      result.unsectionedGroups
    ).toBe(
      0
    );

    expect(
      result.label
    ).toBe(
      'Инструменты карты кампании'
    );

    expect(
      result.groupKeys
    ).toEqual([
      'create',
      'scene',
      'tools',
      'live'
    ]);

    expect(
      result.groupLabels
    ).toEqual([
      'Создание',
      'Сцена',
      'Инструменты',
      'Live'
    ]);

    expect(
      result.buttonLabels
    ).toEqual([]);

    expect(
      result.buttonText
    ).toEqual([]);

    expect(
      result.buttonTooltips
    ).toEqual([
      'Добавить токен',
      'Выключить сетку',
      'Сменить карту',
      'Слои карты',
      'Двигать карту',
      'Фигуры',
      'Рисование',
      'Туман войны',
      'Открыть презентацию',
      'Инициатива',
      'Музыка карты'
    ]);

    expect(
      result.buttonsWithoutTooltip
    ).toBe(
      0
    );

    expect(
      result.buttonsWithoutAria
    ).toBe(
      0
    );

    expect(
      result.gridPressed
    ).toBe(
      'true'
    );

    expect(
      result.panPressed
    ).toBe(
      'true'
    );

    expect(
      result.drawingPressed
    ).toBe(
      'true'
    );

    expect(
      result.fogPressed
    ).toBe(
      'true'
    );

    expect(
      result.drawingPressedAfterFog
    ).toBe(
      'false'
    );

    expect(
      result.toolButtonCount
    ).toBe(
      11
    );

    expect(
      result.panGroup
    ).toBe(
      'navigation'
    );

    expect(
      result.toolbarHeight
    ).toBeLessThanOrEqual(
      56
    );

    expect(
      result.maxButtonWidth
    ).toBeLessThanOrEqual(
      34
    );

    expect(
      result.maxSceneButtonWidth
    ).toBeLessThanOrEqual(
      34
    );

    expect(
      result.railWidth
    ).toBeGreaterThanOrEqual(
      52
    );

    expect(
      result.railWidth
    ).toBeLessThanOrEqual(
      60
    );

    expect(
      result.maxRailButtonWidth
    ).toBeLessThanOrEqual(
      40
    );

    expect(
      result.sceneBarWidth
    ).toBeGreaterThan(
      500
    );

    expect(
      result.sceneBarFillsAvailableRow
    ).toBe(
      true
    );

    expect(
      result.railHeight
    ).toBeGreaterThanOrEqual(
      result.stageHeight - 32
    );

    expect(
      result.sceneBarOverflow
    ).toEqual([
      'visible',
      'visible'
    ]);

    expect(
      result.railOverflow[1]
    ).toBe(
      'auto'
    );

    expect(
      [
        'hidden',
        'auto'
      ]
    ).toContain(
      result.railOverflow[0]
    );

    expect(
      result.floatingTooltip
    ).toMatchObject({
      parent:
        'BODY',
      visible:
        true,
      text:
        'Двигать карту'
    });

    expect(
      result.floatingTooltip.left
    ).toBeGreaterThanOrEqual(
      0
    );

    expect(
      result.floatingTooltip.right
    ).toBeLessThanOrEqual(
      result.viewportWidth
    );

    expect(
      result.buttonPseudoTooltip
    ).toBe(
      'none'
    );

    expect(
      result.titleWidth
    ).toBeLessThanOrEqual(
      290
    );

    expect(
      result.toolbarFitsMap
    ).toBe(
      true
    );

    expect(
      result.sceneBarFitsMap
    ).toBe(
      true
    );

    expect(
      result.railInsideStage
    ).toBe(
      true
    );

    expect(
      result.duplicateRuntimePanels
    ).toEqual({
      scene:
        0,
      layers:
        0
    });

    expect(
      result.legacySelectorsStillPresent
    ).toBe(
      true
    );
  }
);


test(
  'campaign-map-toolbar-survives-page-workspace-and-presentation-lifecycle',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            setPages,
            setWorkspaceHandle
          } = await import('/js/stateActions.js');

          const {
            setStorageAdapter
          } = await import('/js/storage/storageAdapter.js');

          const {
            setAssetAdapter
          } = await import('/js/storage/assetAdapter.js');

          const {
            openWorkspace,
            loadWorkspace
          } = await import('/js/storage/workspaceStorage.js');

          const {
            openPage
          } = await import('/js/editor/editor.js');

          const {
            closeMapPopup
          } = await import('/js/editor/campaignMapPopupController.js');

          const {
            createCampaignMapTemplate
          } = await import('/js/templates/campaignMap.js');

          const {
            createTaskTrackerTemplate
          } = await import('/js/templates/taskTracker.js');

          const {
            createRuleTreeTemplate
          } = await import('/js/templates/ruleTree.js');

          const {
            renderTree
          } = await import('/js/tree/tree.js');

          const mapTemplate =
            createCampaignMapTemplate();

          const taskTemplate =
            createTaskTrackerTemplate();

          const ruleTemplate =
            createRuleTreeTemplate();

          const makeCardBody =
            title => `
              <div class="entity-layout card-shell" contenteditable="false">
                <h1>${title}</h1>
                <div class="rich-text-field" contenteditable="true" data-persistent-editable="true">Card body</div>
              </div>
            `;

          const makePageContent =
            ({
              id,
              title,
              tags = [],
              template = 'card',
              type = 'note',
              order = 1,
              body
            }) => `---
id: ${id}
parent: null
order: ${order}
tags: [${tags.join(', ')}]
template: ${template}
type: ${type}
aliases: []
---

${body}`;

          const makePage =
            options => ({
              id:
                options.id,
              name:
                `${options.id}.md`,
              path:
                `/pages/${options.id}.md`,
              parent:
                null,
              order:
                options.order || 1,
              title:
                options.title,
              template:
                options.template || 'card',
              type:
                options.type || 'note',
              tags:
                options.tags || [],
              aliases:
                [],
              relationships:
                [],
              content:
                makePageContent(
                  options
                )
            });

          const makeMapPage =
            ({
              id,
              title,
              order
            }) => makePage({
              id,
              title,
              order,
              tags:
                ['campaign-map'],
              template:
                'campaignMap',
              type:
                'campaignMap',
              body:
                mapTemplate.content.replace(
                  'Новая карта',
                  title
                )
            });

          const mapA =
            makeMapPage({
              id:
                'lifecycle-map-a',
              title:
                'Lifecycle Map A',
              order:
                1
            });

          const mapB =
            makeMapPage({
              id:
                'lifecycle-map-b',
              title:
                'Lifecycle Map B',
              order:
                2
            });

          const card =
            makePage({
              id:
                'lifecycle-card',
              title:
                'Lifecycle Card',
              order:
                3,
              body:
                makeCardBody(
                  'Lifecycle Card'
                )
            });

          const task =
            makePage({
              id:
                'lifecycle-task',
              title:
                'Lifecycle Task Tracker',
              order:
                4,
              tags:
                ['task-tracker'],
              template:
                'taskTracker',
              type:
                'taskTracker',
              body:
                taskTemplate.content.replace(
                  'Новый трекер',
                  'Lifecycle Task Tracker'
                )
            });

          const rule =
            makePage({
              id:
                'lifecycle-rule',
              title:
                'Lifecycle Rule Tree',
              order:
                5,
              tags:
                ['rule-tree'],
              template:
                'ruleTree',
              type:
                'ruleTree',
              body:
                ruleTemplate.content.replace(
                  'Новое дерево правил',
                  'Lifecycle Rule Tree'
                )
            });

          const waitFrames =
            () => new Promise(resolve => {

              requestAnimationFrame(
                () => requestAnimationFrame(
                  resolve
                )
              );
            });

          const open =
            async pageRecord => {

              await openPage(
                pageRecord
              );

              await waitFrames();
            };

          const isVisible =
            element => {

              if (!element) return false;

              const style =
                getComputedStyle(
                  element
                );

              const rect =
                element.getBoundingClientRect();

              return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                !element.hidden &&
                rect.width > 0 &&
                rect.height > 0;
            };

          const hitTestButton =
            button => {

              if (!isVisible(button) || button.disabled) return false;

              const style =
                getComputedStyle(
                  button
                );

              if (style.pointerEvents === 'none') return false;

              const rect =
                button.getBoundingClientRect();

              const hit =
                document.elementFromPoint(
                  rect.left + rect.width / 2,
                  rect.top + rect.height / 2
                );

              return button === hit ||
                button.contains(
                  hit
                );
            };

          const snapshotToolbar =
            async label => {

              closeMapPopup();

              const editor =
                document.querySelector(
                  '#editorArea'
                );

              const map =
                editor.querySelector(
                  '.campaign-map-document'
                );

              const sceneBars =
                editor.querySelectorAll(
                  '[data-map-toolbar-region="scene-bar"]'
                );

              const toolRails =
                editor.querySelectorAll(
                  '[data-map-toolbar-region="tool-rail"]'
                );

              const sceneBar =
                map?.querySelector(
                  '[data-map-toolbar-region="scene-bar"]'
                );

              const toolRail =
                map?.querySelector(
                  '[data-map-toolbar-region="tool-rail"]'
                );

              const selectors =
                [
                  '.campaign-add-btn',
                  '.campaign-grid-btn',
                  '.campaign-change-map-btn',
                  '.campaign-pan-btn',
                  '.campaign-open-presentation-btn'
                ];

              const buttons =
                selectors.map(selector =>
                  map?.querySelector(
                    selector
                  ) || null
                );

              const gridButton =
                map?.querySelector(
                  '.campaign-grid-btn'
                );

              if (hitTestButton(gridButton)) {

                gridButton.click();

                await waitFrames();
              }

              const popup =
                document.querySelector(
                  '#campaignMapPopup'
                );

              const popupOpened =
                popup?.dataset.popupKey === 'grid' &&
                !popup.classList.contains(
                  'hidden'
                );

              closeMapPopup();

              return {
                label,
                currentPageId:
                  state.currentPage?.id || '',
                mapTitle:
                  map?.querySelector('h1')?.textContent?.trim() || '',
                mapCount:
                  editor.querySelectorAll('.campaign-map-document').length,
                sceneBarCount:
                  sceneBars.length,
                toolRailCount:
                  toolRails.length,
                sceneBarVisible:
                  isVisible(
                    sceneBar
                  ),
                toolRailVisible:
                  isVisible(
                    toolRail
                  ),
                buttonCount:
                  map?.querySelectorAll('.campaign-map-tool-button').length || 0,
                expectedButtonsInteractable:
                  buttons.every(
                    hitTestButton
                  ),
                gridPopupOpened:
                  popupOpened,
                staleCardPresent:
                  Boolean(
                    editor.querySelector(
                      '#lifecycle-card'
                    )
                  ) ||
                  editor.textContent.includes(
                    'Lifecycle Card'
                  ),
                staleTaskPresent:
                  Boolean(
                    editor.querySelector(
                      '.task-tracker-document'
                    )
                  ),
                staleRulePresent:
                  Boolean(
                    editor.querySelector(
                      '.rule-tree-document'
                    )
                  )
              };
            };

          const snapshots =
            [];

          setWorkspaceHandle({
            name:
              'Lifecycle matrix workspace'
          });

          setPages([
            mapA,
            mapB,
            card,
            task,
            rule
          ]);

          renderTree();

          await open(
            mapA
          );

          await open(
            card
          );

          await open(
            mapA
          );

          snapshots.push(
            await snapshotToolbar(
              'A map-card-map'
            )
          );

          await open(
            mapB
          );

          await open(
            mapA
          );

          snapshots.push(
            await snapshotToolbar(
              'B mapA-mapB-mapA'
            )
          );

          await open(
            task
          );

          await open(
            mapA
          );

          snapshots.push(
            await snapshotToolbar(
              'C map-task-map'
            )
          );

          await open(
            rule
          );

          await open(
            mapA
          );

          snapshots.push(
            await snapshotToolbar(
              'C map-rule-map'
            )
          );

          document
            .querySelector('#appTreeRailBtn')
            ?.click();

          await waitFrames();

          document
            .querySelector('#appTreeRailBtn')
            ?.click();

          await waitFrames();

          await open(
            mapA
          );

          snapshots.push(
            await snapshotToolbar(
              'D map-hide-show-tree-map'
            )
          );

          const originalOpen =
            window.open;

          window.open =
            () => ({
              closed:
                false,
              focus() {},
              document:
                document.implementation.createHTMLDocument(
                  'presentation'
                )
            });

          mapA.content =
            state.currentPage.content;

          document
            .querySelector('.campaign-open-presentation-btn')
            ?.click();

          await waitFrames();

          window.open =
            originalOpen;

          await open(
            mapA
          );

          snapshots.push(
            await snapshotToolbar(
              'E map-presentation-return-map'
            )
          );

          const workspaces =
            new Map([
              [
                'workspace-a',
                {
                  handle:
                    'workspace-a',
                  root:
                    'workspace-a',
                  files:
                    new Map([
                      [
                        'pages/workspace-a-map.md',
                        makeMapPage({
                          id:
                            'workspace-a-map',
                          title:
                            'Workspace A Map',
                          order:
                            1
                        }).content
                      ]
                    ])
                }
              ],
              [
                'workspace-b',
                {
                  handle:
                    'workspace-b',
                  root:
                    'workspace-b',
                  files:
                    new Map([
                      [
                        'pages/workspace-b-map.md',
                        makeMapPage({
                          id:
                            'workspace-b-map',
                          title:
                            'Workspace B Map',
                          order:
                            1
                        }).content
                      ]
                    ])
                }
              ]
            ]);

          const pickQueue =
            [];

          let activeWorkspaceKey =
            'workspace-a';

          const normalize =
            path => String(path || '')
              .replaceAll(
                '\\',
                '/'
              )
              .replace(
                /^\/+/,
                ''
              );

          const getActiveWorkspace =
            () => workspaces.get(
              activeWorkspaceKey
            );

          const adapter =
            {
              kind:
                'desktop',
              getWorkspaceRoot() {
                return getActiveWorkspace().root;
              },
              setWorkspaceRoot(root) {
                if (workspaces.has(root)) {
                  activeWorkspaceKey =
                    root;
                }
              },
              async pickWorkspace() {
                const next =
                  pickQueue.shift();

                if (!next) {
                  throw new Error(
                    'No workspace queued.'
                  );
                }

                activeWorkspaceKey =
                  next;

                return getActiveWorkspace().handle;
              },
              async restoreWorkspace() {
                return getActiveWorkspace().handle;
              },
              async ensureDirectory() {},
              async getDirectoryHandle() {
                return {};
              },
              async readText(path) {
                return getActiveWorkspace().files.get(
                  normalize(
                    path
                  )
                ) || '';
              },
              async writeText(path, content) {
                getActiveWorkspace().files.set(
                  normalize(
                    path
                  ),
                  String(
                    content
                  )
                );
              },
              async readBinary() {
                return new TextEncoder()
                  .encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
                  .buffer;
              },
              async writeBinary() {},
              async listFiles(path = '') {
                const prefix =
                  normalize(
                    path
                  );

                const entries =
                  new Map();

                for (const filePath of getActiveWorkspace().files.keys()) {

                  if (
                    prefix &&
                    !filePath.startsWith(
                      `${prefix}/`
                    )
                  ) {
                    continue;
                  }

                  const relative =
                    prefix
                      ? filePath.slice(
                        prefix.length + 1
                      )
                      : filePath;

                  const [
                    name
                  ] =
                    relative.split(
                      '/'
                    );

                  if (!name) continue;

                  entries.set(
                    name,
                    {
                      name,
                      kind:
                        relative.includes('/')
                          ? 'directory'
                          : 'file'
                    }
                  );
                }

                return [
                  ...entries.values()
                ];
              },
              async removeFile(path) {
                getActiveWorkspace().files.delete(
                  normalize(
                    path
                  )
                );
              },
              async removeDirectory() {}
            };

          setStorageAdapter(
            adapter
          );

          setAssetAdapter({
            kind:
              'lifecycle-matrix-assets',
            async importFile() {},
            async resolveUrl(path) {
              return `asset://${adapter.getWorkspaceRoot()}/${normalize(path)}`;
            },
            async exists() {
              return true;
            },
            async remove() {},
            async findOrphans() {
              return [];
            }
          });

          pickQueue.push(
            'workspace-a'
          );

          await openWorkspace();
          await loadWorkspace();
          renderTree();

          const workspaceAMap =
            state.pages.find(candidate =>
              candidate.id === 'workspace-a-map'
            );

          await open(
            workspaceAMap
          );

          pickQueue.push(
            'workspace-b'
          );

          await openWorkspace();
          await loadWorkspace();
          renderTree();

          const workspaceBMap =
            state.pages.find(candidate =>
              candidate.id === 'workspace-b-map'
            );

          await open(
            workspaceBMap
          );

          snapshots.push(
            await snapshotToolbar(
              'F workspaceA-map-workspaceB-map'
            )
          );

          return {
            snapshots,
            activeWorkspaceKey,
            pageIds:
              state.pages.map(candidate => candidate.id)
          };
        }
      );

    const expectedSnapshots =
      [
        {
          label:
            'A map-card-map',
          currentPageId:
            'lifecycle-map-a',
          mapTitle:
            'Lifecycle Map A'
        },
        {
          label:
            'B mapA-mapB-mapA',
          currentPageId:
            'lifecycle-map-a',
          mapTitle:
            'Lifecycle Map A'
        },
        {
          label:
            'C map-task-map',
          currentPageId:
            'lifecycle-map-a',
          mapTitle:
            'Lifecycle Map A'
        },
        {
          label:
            'C map-rule-map',
          currentPageId:
            'lifecycle-map-a',
          mapTitle:
            'Lifecycle Map A'
        },
        {
          label:
            'D map-hide-show-tree-map',
          currentPageId:
            'lifecycle-map-a',
          mapTitle:
            'Lifecycle Map A'
        },
        {
          label:
            'E map-presentation-return-map',
          currentPageId:
            'lifecycle-map-a',
          mapTitle:
            'Lifecycle Map A'
        },
        {
          label:
            'F workspaceA-map-workspaceB-map',
          currentPageId:
            'workspace-b-map',
          mapTitle:
            'Workspace B Map'
        }
      ];

    expect(
      result.snapshots.map(snapshot => snapshot.label)
    ).toEqual(
      expectedSnapshots.map(snapshot => snapshot.label)
    );

    for (const [index, snapshot] of result.snapshots.entries()) {

      const expected =
        expectedSnapshots[index];

      expect(
        snapshot.currentPageId,
        snapshot.label
      ).toBe(
        expected.currentPageId
      );

      expect(
        snapshot.mapTitle,
        snapshot.label
      ).toBe(
        expected.mapTitle
      );

      expect(
        snapshot.mapCount,
        snapshot.label
      ).toBe(
        1
      );

      expect(
        snapshot.sceneBarCount,
        snapshot.label
      ).toBe(
        1
      );

      expect(
        snapshot.toolRailCount,
        snapshot.label
      ).toBe(
        1
      );

      expect(
        snapshot.sceneBarVisible,
        snapshot.label
      ).toBe(
        true
      );

      expect(
        snapshot.toolRailVisible,
        snapshot.label
      ).toBe(
        true
      );

      expect(
        snapshot.buttonCount,
        snapshot.label
      ).toBe(
        11
      );

      expect(
        snapshot.expectedButtonsInteractable,
        snapshot.label
      ).toBe(
        true
      );

      expect(
        snapshot.gridPopupOpened,
        snapshot.label
      ).toBe(
        true
      );

      expect(
        snapshot.staleCardPresent,
        snapshot.label
      ).toBe(
        false
      );

      expect(
        snapshot.staleTaskPresent,
        snapshot.label
      ).toBe(
        false
      );

      expect(
        snapshot.staleRulePresent,
        snapshot.label
      ).toBe(
        false
      );
    }

    expect(
      result.activeWorkspaceKey
    ).toBe(
      'workspace-b'
    );

    expect(
      result.pageIds
    ).toEqual([
      'workspace-b-map'
    ]);
  }
);


test(
  'campaign-map-contextmenu-opens-custom-object-actions',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            setupCampaignMaps
          } = await import('/js/editor/campaignMap.js');

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-stage" data-grid="false" data-grid-size="80" data-fog-mode="draw" data-fog-image="" contenteditable="false" style="position: relative; width: 1000px; height: 740px;">
                <div class="campaign-map-viewport" style="position: relative; width: 100%; height: 100%;">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          setupCampaignMaps(
            editor,
            async () => {}
          );

          const map =
            editor.querySelector('.campaign-map-document');

          const store =
            refreshCampaignMapStore(
              map
            );

          const tokenRecord =
            store.addToken({
              tokenId:
                'context-menu-token',
              type:
                'creature',
              name:
                'Context target',
              x:
                30,
              y:
                30
            });

          const token =
            createMapTokenElement(
              tokenRecord
            );

          map
            .querySelector('.campaign-map-object-layer')
            .appendChild(
              token
            );

          const event =
            new MouseEvent(
              'contextmenu',
              {
                bubbles:
                  true,
                cancelable:
                  true,
                button:
                  2,
                clientX:
                  120,
                clientY:
                  140
              }
            );

          const dispatchResult =
            token.dispatchEvent(
              event
            );

          await Promise.resolve();

          const popup =
            document.getElementById('campaignTokenPopup');

          return {
            dispatchResult,
            defaultPrevented:
              event.defaultPrevented,
            selected:
              token.classList.contains('is-selected'),
            popupHidden:
              popup?.classList.contains('hidden') ?? true,
            popupCompact:
              popup?.classList.contains('campaign-token-popup-compact') ?? false,
            hasMoreAction:
              Boolean(
                popup?.querySelector('.campaign-token-popup-more')
              )
          };
        }
      );

    expect(
      result.dispatchResult
    ).toBe(
      false
    );

    expect(
      result.defaultPrevented
    ).toBe(
      true
    );

    expect(
      result.selected
    ).toBe(
      true
    );

    expect(
      result.popupHidden
    ).toBe(
      false
    );

    expect(
      result.popupCompact
    ).toBe(
      true
    );

    expect(
      result.hasMoreAction
    ).toBe(
      true
    );
  }
);


test(
  'campaign-map-popups-use-migrated-shared-frame',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const waitFrames =
            () => new Promise(resolve =>
              requestAnimationFrame(() =>
                requestAnimationFrame(resolve)
              )
            );

          const {
            createCampaignMapTemplate
          } = await import('/js/templates/campaignMap.js');

          const {
            renderCampaignMap
          } = await import('/js/editor/campaignMap.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createCampaignMapTemplate().content;

          await renderCampaignMap(
            editor
          );

          const specs =
            [
              {
                selector:
                  '.campaign-add-btn',
                key:
                  'add',
                aria:
                  'Добавление на карту',
                sections:
                  ['kind'],
                legacy:
                  ['.campaign-map-popup-option[data-kind="player"]']
              },
              {
                selector:
                  '.campaign-grid-btn',
                key:
                  'grid',
                aria:
                  'Настройки сетки карты',
                sections:
                  ['visibility', 'settings'],
                legacy:
                  ['.campaign-grid-toggle-btn', '.campaign-grid-size-range']
              },
              {
                selector:
                  '.campaign-drawing-btn',
                key:
                  'drawing',
                aria:
                  'Инструменты рисования карты',
                sections:
                  ['tool', 'color'],
                legacy:
                  ['.campaign-drawing-tool-btn', '.campaign-drawing-color']
              },
              {
                selector:
                  '.campaign-fog-btn',
                key:
                  'fog',
                aria:
                  'Настройки тумана карты',
                sections:
                  ['mode', 'brush', 'area'],
                legacy:
                  ['.campaign-fog-draw-btn', '.campaign-fog-lock-zone-btn']
              },
              {
                selector:
                  '.campaign-shapes-btn',
                key:
                  'shapes',
                aria:
                  'Фигуры карты',
                sections:
                  ['shape'],
                legacy:
                  ['.campaign-shape-option[data-shape="square"]']
              },
              {
                selector:
                  '.campaign-layers-btn',
                key:
                  'layers',
                aria:
                  'Слои карты',
                sections:
                  ['layers'],
                legacy:
                  ['.campaign-layer-row', '.campaign-layer-visible']
              },
              {
                selector:
                  '.campaign-initiative-btn',
                key:
                  'initiative',
                aria:
                  'Инициатива карты',
                sections:
                  ['participants'],
                legacy:
                  ['.campaign-initiative-list', '.campaign-initiative-save-btn']
              },
              {
                selector:
                  '.campaign-music-btn',
                key:
                  'music',
                aria:
                  'Музыка карты',
                sections:
                  ['playlist-settings', 'playlist', 'upload', 'copy'],
                legacy:
                  ['.campaign-music-controls', '.campaign-music-track-list']
              }
            ];

          const snapshots =
            [];

          for (const spec of specs) {

            const button =
              editor.querySelector(
                spec.selector
              );

            button.click();

            await waitFrames();

            const popup =
              document.getElementById('campaignMapPopup');

            const shell =
              popup.querySelector('.campaign-map-popup-shell');

            const popupStyle =
              getComputedStyle(
                popup
              );

            snapshots.push({
              key:
                spec.key,
              visible:
                !popup.classList.contains('hidden'),
              usesSharedPopover:
                popup.classList.contains('mow-popover'),
              backgroundImage:
                popupStyle.backgroundImage,
              backgroundColor:
                popupStyle.backgroundColor,
              popupMigration:
                popup.dataset.mapPopupUiMigration,
              shellMigration:
                shell?.dataset.mapPopupUiMigration,
              aria:
                popup.getAttribute('aria-label'),
              title:
                shell?.querySelector('.campaign-map-popup-title')?.textContent.trim(),
              sections:
                [...popup.querySelectorAll('[data-map-popup-section]')]
                  .map(section => section.dataset.mapPopupSection),
              legacyPresent:
                spec.legacy.every(selector =>
                  Boolean(
                    popup.querySelector(selector)
                  )
                ),
              expected:
                {
                  aria:
                    spec.aria,
                  sections:
                    spec.sections
                }
            });
          }

          return snapshots;
        }
      );

    result.forEach(snapshot => {

      expect(
        snapshot.visible
      ).toBe(
        true
      );

      expect(
        snapshot.popupMigration
      ).toBe(
        '0.0.1.8.12.2'
      );

      expect(
        snapshot.usesSharedPopover
      ).toBe(
        true
      );

      expect(
        snapshot.backgroundImage
      ).toBe(
        'none'
      );

      expect(
        snapshot.backgroundColor.startsWith('rgb(')
      ).toBe(
        true
      );

      expect(
        snapshot.shellMigration
      ).toBe(
        '0.0.1.8.12.2'
      );

      expect(
        snapshot.aria
      ).toBe(
        snapshot.expected.aria
      );

      expect(
        snapshot.sections
      ).toEqual(
        snapshot.expected.sections
      );

      expect(
        snapshot.title.length
      ).toBeGreaterThan(
        0
      );

      expect(
        snapshot.legacyPresent
      ).toBe(
        true
      );
    });
  }
);


test(
  'campaign-map-popup-avoids-selection-inspector-through-shared-positioning',
  async ({ page }) => {

    await page.setViewportSize({
      width: 1280,
      height: 720
    });

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const waitFrames =
            () => new Promise(resolve =>
              requestAnimationFrame(() =>
                requestAnimationFrame(resolve)
              )
            );

          const isVisible =
            element => {

              if (!element) return false;

              const style =
                getComputedStyle(
                  element
                );

              return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                !element.classList.contains('hidden') &&
                element.getBoundingClientRect().width > 0 &&
                element.getBoundingClientRect().height > 0;
            };

          const rectsOverlap =
            (
              first,
              second
            ) =>
              first.left < second.right &&
              first.right > second.left &&
              first.top < second.bottom &&
              first.bottom > second.top;

          const isInsideViewport =
            rect =>
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= window.innerWidth &&
              rect.bottom <= window.innerHeight;

          const snapshot =
            () => {

              const popup =
                document.getElementById(
                  'campaignMapPopup'
                );

              const inspector =
                document.querySelector(
                  '.campaign-map-properties-panel'
                );

              const popupRect =
                popup?.getBoundingClientRect();

              const inspectorRect =
                inspector?.getBoundingClientRect();

              return {
                popupVisible:
                  isVisible(
                    popup
                  ),
                inspectorVisible:
                  isVisible(
                    inspector
                  ),
                popupInsideViewport:
                  popupRect
                    ? isInsideViewport(
                      popupRect
                    )
                    : false,
                inspectorOverlap:
                  popupRect && inspectorRect
                    ? rectsOverlap(
                      popupRect,
                      inspectorRect
                    )
                    : true,
                popupRight:
                  Math.round(
                    popupRect?.right || 0
                  ),
                inspectorLeft:
                  Math.round(
                    inspectorRect?.left || 0
                  ),
                overlayState:
                  popup?.dataset.overlayState || '',
                popupOpen:
                  popup?.dataset.popupOpen || '',
                popupKey:
                  popup?.dataset.popupKey || '',
                viewport:
                  {
                    width:
                      window.innerWidth,
                    height:
                      window.innerHeight
                  }
              };
            };

          const {
            createCampaignMapTemplate
          } = await import('/js/templates/campaignMap.js');

          const {
            renderCampaignMap
          } = await import('/js/editor/campaignMap.js');

          const {
            refreshCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            renderMapTokenElement
          } = await import('/js/editor/campaignMapRenderer.js');

          const {
            selectMapToken
          } = await import('/js/editor/campaignMapRuntime.js');

          const {
            openGridPopup
          } = await import('/js/editor/campaignMapToolbarController.js');

          const {
            toggleMapPopupForAnchor
          } = await import('/js/editor/campaignMapPopupController.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createCampaignMapTemplate().content;

          await renderCampaignMap(
            editor
          );

          const map =
            editor.querySelector('.campaign-map-document');

          const stage =
            map.querySelector('.campaign-map-stage');

          const viewport =
            map.querySelector('.campaign-map-viewport');

          stage.style.height =
            '560px';

          stage.dataset.grid =
            'true';

          viewport.style.width =
            '1900px';

          viewport.style.height =
            '1100px';

          const store =
            refreshCampaignMapStore(
              map
            );

          const tokenRecord =
            store.addToken({
              tokenId:
                'shared-positioning-token',
              type:
                'creature',
              name:
                'Sentinel',
              x:
                16,
              y:
                18,
              hp:
                8,
              hpMax:
                12,
              armorClass:
                14
            });

          const token =
            createMapTokenElement(
              tokenRecord
            );

          map
            .querySelector('.campaign-map-object-layer')
            .appendChild(
              token
            );

          await renderMapTokenElement(
            token
          );

          store.commitToDOM();

          selectMapToken(
            token
          );

          const anchor =
            map.querySelector('.campaign-grid-btn');

          const deps =
            {
              async saveAndSync() {}
            };

          openGridPopup(
            map,
            anchor,
            deps
          );

          await waitFrames();

          const open =
            snapshot();

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key:
                  'Escape',
                bubbles:
                  true,
                cancelable:
                  true
              }
            )
          );

          await waitFrames();

          const afterEscape =
            snapshot();

          openGridPopup(
            map,
            anchor,
            deps
          );

          await waitFrames();

          document.body.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles:
                  true,
                clientX:
                  24,
                clientY:
                  24
              }
            )
          );

          await waitFrames();

          const afterOutside =
            snapshot();

          openGridPopup(
            map,
            anchor,
            deps
          );

          await waitFrames();

          const repeatedTriggerClosed =
            toggleMapPopupForAnchor(
              anchor,
              'grid'
            );

          await waitFrames();

          const afterRepeatedTrigger =
            snapshot();

          return {
            open,
            afterEscape,
            afterOutside,
            repeatedTriggerClosed,
            afterRepeatedTrigger
          };
        }
      );

    expect(
      result.open
    ).toMatchObject({
      popupVisible:
        true,
      inspectorVisible:
        true,
      popupInsideViewport:
        true,
      inspectorOverlap:
        false,
      overlayState:
        'open',
      popupOpen:
        'true',
      popupKey:
        'grid',
      viewport:
        {
          width:
            1280,
          height:
            720
        }
    });

    expect(
      result.open.popupRight
    ).toBeLessThanOrEqual(
      result.open.inspectorLeft
    );

    expect(
      result.afterEscape
    ).toMatchObject({
      popupVisible:
        false,
      overlayState:
        'closed',
      popupOpen:
        'false'
    });

    expect(
      result.afterOutside
    ).toMatchObject({
      popupVisible:
        false,
      overlayState:
        'closed',
      popupOpen:
        'false'
    });

    expect(
      result.repeatedTriggerClosed
    ).toBe(
      true
    );

    expect(
      result.afterRepeatedTrigger
    ).toMatchObject({
      popupVisible:
        false,
      overlayState:
        'closed',
      popupOpen:
        'false'
    });
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
  'campaign-map-selection-inspector-shows-context-and-safe-actions',
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
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            renderMapTokenElement
          } = await import('/js/editor/campaignMapRenderer.js');

          const {
            removeSelectedCampaignMapItems
          } = await import('/js/editor/campaignMap.js');

          const {
            ensureMapSelectionInspector,
            MAP_SELECTION_UI_MIGRATION
          } = await import('/js/editor/campaignMapSelectionInspector.js');

          const {
            selectMapToken
          } = await import('/js/editor/campaignMapRuntime.js');

          document.querySelector('#editorArea').innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-stage" data-grid="false" data-grid-size="80" data-fog-mode="draw" data-fog-image="" contenteditable="false" style="position: relative; width: 1000px; height: 740px;">
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

          const record =
            store.addToken({
              tokenId:
                'selection-inspector-token',
              type:
                'creature',
              name:
                '\u0421\u0442\u0440\u0430\u0436 \u0432\u043e\u0440\u043e\u0442',
              x:
                26.4,
              y:
                37.2,
              hp:
                8,
              hpMax:
                12,
              armorClass:
                14,
              speed:
                30,
              effectsSummary:
                '\u0411\u0434\u0438\u0442'
            });

          const token =
            createMapTokenElement(
              record
            );

          map
            .querySelector('.campaign-map-object-layer')
            .appendChild(
              token
            );

          await renderMapTokenElement(
            token
          );

          const saveLog =
            [];

          const statusLog =
            [];

          const actionDeps =
            () => ({
              applyTokenHealthState() {},
              clearDraggedToken() {},
              closeTokenPopup() {},
              openTokenPopup() {},
              async saveAndSync() {

                saveLog.push(
                  'selection-action'
                );
              },
              selectMapShape(shape) {

                shape.classList.add(
                  'is-selected'
                );
              }
            });

          const flushAction =
            async () => {

              await Promise.resolve();
              await Promise.resolve();
            };

          ensureMapSelectionInspector(
            map,
            {
              closeTokenPopup() {},
              getSelectionActionDeps:
                actionDeps,
              getTokenActionDeps:
                actionDeps,
              openTokenPopup(item) {

                item.dataset.popupOpened =
                  'true';
              },
              removeSelectedCampaignMapItems,
              async saveAndSync() {

                saveLog.push(
                  'dock-remove'
                );
              },
              setStatus(text) {

                statusLog.push(
                  text
                );
              }
            }
          );

          selectMapToken(
            token
          );

          const dock =
            map.querySelector('.campaign-map-selection-dock');

          const before =
            {
              hidden:
                dock.classList.contains('hidden'),
              migration:
                dock.dataset.mapSelectionUiMigration,
              panel:
                dock.classList.contains('campaign-map-properties-panel'),
              title:
                dock.querySelector('.campaign-map-selection-dock-heading strong')
                  ?.textContent
                  ?.trim(),
              sections:
                [...dock.querySelectorAll('.campaign-map-property-section')]
                  .map(section => section.dataset.mapPropertySection),
              fields:
                [...dock.querySelectorAll('[data-map-property]')]
                  .map(field => field.dataset.mapProperty),
              actions:
                [...dock.querySelectorAll('[data-map-selection-action]')]
                  .map(button => button.dataset.mapSelectionAction),
              actionText:
                [...dock.querySelectorAll('[data-map-selection-action]')]
                  .map(button => button.textContent.trim())
                  .filter(Boolean)
            };

          const setField =
            (
              property,
              value,
              type = 'input'
            ) => {

              const field =
                dock.querySelector(`[data-map-property="${property}"]`);

              if (field.type === 'checkbox') {

                field.checked =
                  value;

              } else {

                field.value =
                  value;
              }

              field.dispatchEvent(
                new Event(
                  type,
                  {
                    bubbles:
                      true
                  }
                )
              );
            };

          setField(
            'token-name',
            '\u0421\u0442\u0440\u0430\u0436 \u0441\u0435\u0432\u0435\u0440\u0430'
          );

          setField(
            'token-x',
            '41.5'
          );

          setField(
            'token-size',
            '1.8'
          );

          setField(
            'token-rotation',
            '27'
          );

          setField(
            'item-visible',
            false,
            'change'
          );

          await flushAction();

          const afterProperties =
            {
              name:
                token.dataset.name,
              x:
                token.dataset.x,
              size:
                token.dataset.size,
              rotation:
                token.dataset.rotation,
              hidden:
                token.dataset.presentationHidden,
              model:
                store.getModel().getToken('selection-inspector-token'),
              header:
                dock.querySelector('.campaign-map-selection-dock-heading strong')
                  ?.textContent
                  ?.trim()
            };

          await dock
            .querySelector('[data-map-selection-action="remove"]')
            .click();

          await flushAction();

          const afterRemove =
            {
              hidden:
                dock.classList.contains('hidden'),
              domTokens:
                map.querySelectorAll('.campaign-map-token').length,
              modelTokens:
                store.getModel().tokens.length,
              statusLog,
              saveLog
            };

          return {
            expectedMigration:
              MAP_SELECTION_UI_MIGRATION,
            before,
            afterProperties,
            afterRemove
          };
        }
      );

    expect(
      result.before.hidden
    ).toBe(
      false
    );

    expect(
      result.before.migration
    ).toBe(
      result.expectedMigration
    );

    expect(
      result.before.title
    ).toBe(
      '\u0421\u0442\u0440\u0430\u0436 \u0432\u043e\u0440\u043e\u0442'
    );

    expect(
      result.before.panel
    ).toBe(
      true
    );

    expect(
      result.before.sections
    ).toEqual([
      'identity',
      'transform',
      'display'
    ]);

    expect(
      result.before.fields
    ).toEqual([
      'token-name',
      'token-x',
      'token-y',
      'token-size',
      'token-rotation',
      'item-visible'
    ]);

    expect(
      result.before.actionText
    ).toEqual(
      []
    );

    expect(
      result.before.actions
    ).toEqual([
      'open',
      'duplicate',
      'remove'
    ]);

    expect(
      result.afterProperties
    ).toMatchObject({
      name:
        '\u0421\u0442\u0440\u0430\u0436 \u0441\u0435\u0432\u0435\u0440\u0430',
      x:
        '41.500',
      size:
        '1.800',
      rotation:
        '27',
      hidden:
        'true',
      header:
        '\u0421\u0442\u0440\u0430\u0436 \u0441\u0435\u0432\u0435\u0440\u0430'
    });

    expect(
      result.afterProperties.model
    ).toMatchObject({
      name:
        '\u0421\u0442\u0440\u0430\u0436 \u0441\u0435\u0432\u0435\u0440\u0430',
      x:
        41.5,
      size:
        1.8,
      rotation:
        27,
      presentationHidden:
        true
    });

    expect(
      result.afterProperties.hidden
    ).toBe(
      'true'
    );

    expect(
      result.afterRemove
    ).toMatchObject({
      hidden:
        true,
      domTokens:
        0,
      modelTokens:
        0,
      saveLog:
        expect.arrayContaining([
          'dock-remove'
        ])
    });

    expect(
      result.afterRemove.saveLog.length
    ).toBeGreaterThanOrEqual(
      6
    );

    expect(
      result.afterRemove.statusLog.at(-1)
    ).toContain(
      '1'
    );
  }
);


test(
  'campaign-map-selection-inspector-edits-shape-transform-style',
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
            ensureMapSelectionInspector
          } = await import('/js/editor/campaignMapSelectionInspector.js');

          const {
            selectMapShape
          } = await import('/js/editor/campaignMapRuntime.js');

          document.querySelector('#editorArea').innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-stage" data-grid="false" data-grid-size="80" data-fog-mode="draw" data-fog-image="" contenteditable="false" style="position: relative; width: 1000px; height: 740px;">
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

          const record =
            store.addShape({
              shapeId:
                'selection-inspector-shape',
              type:
                'square',
              x:
                120,
              y:
                160,
              width:
                90,
              height:
                80,
              strokeColor:
                '#fff4d6',
              fillColor:
                '#f1d38e',
              strokeWidth:
                3
            });

          const shape =
            createMapShapeElement(
              record
            );

          map
            .querySelector('.campaign-map-object-layer')
            .appendChild(
              shape
            );

          renderMapShapeElement(
            shape
          );

          const saveLog =
            [];

          const flushAction =
            async () => {

              await Promise.resolve();
              await Promise.resolve();
            };

          ensureMapSelectionInspector(
            map,
            {
              closeTokenPopup() {},
              getSelectionActionDeps() {

                return {};
              },
              getTokenActionDeps() {

                return {};
              },
              openTokenPopup() {},
              async saveAndSync() {

                saveLog.push(
                  'shape-property'
                );
              },
              setStatus() {}
            }
          );

          selectMapShape(
            shape
          );

          const dock =
            map.querySelector('.campaign-map-selection-dock');

          const setField =
            (
              property,
              value,
              type = 'input'
            ) => {

              const field =
                dock.querySelector(`[data-map-property="${property}"]`);

              if (field.type === 'checkbox') {

                field.checked =
                  value;

              } else {

                field.value =
                  value;
              }

              field.dispatchEvent(
                new Event(
                  type,
                  {
                    bubbles:
                      true
                  }
                )
              );
            };

          setField(
            'shape-type',
            'circle',
            'change'
          );

          setField(
            'shape-width',
            '144'
          );

          setField(
            'shape-height',
            '96'
          );

          setField(
            'shape-rotation',
            '33'
          );

          setField(
            'shape-stroke-color',
            '#74c69d'
          );

          setField(
            'shape-fill-color',
            '#7db6ff'
          );

          setField(
            'item-visible',
            false,
            'change'
          );

          await flushAction();

          return {
            fields:
              [...dock.querySelectorAll('[data-map-property]')]
                .map(field => field.dataset.mapProperty),
            actions:
              [...dock.querySelectorAll('[data-map-selection-action]')]
                .map(button => button.dataset.mapSelectionAction),
            dataset: {
              type:
                shape.dataset.shapeType,
              width:
                shape.dataset.w,
              height:
                shape.dataset.h,
              rotation:
                shape.dataset.rotation,
              stroke:
                shape.dataset.strokeColor,
              fill:
                shape.dataset.fillColor,
              hidden:
                shape.dataset.presentationHidden
            },
            cssRotation:
              shape.style.getPropertyValue('--campaign-shape-rotation'),
            model:
              store.getModel().getShape('selection-inspector-shape'),
            saveCount:
              saveLog.length
          };
        }
      );

    expect(
      result.fields
    ).toEqual([
      'shape-type',
      'shape-x',
      'shape-y',
      'shape-width',
      'shape-height',
      'shape-rotation',
      'shape-stroke-color',
      'shape-fill-color',
      'shape-stroke-width',
      'item-visible'
    ]);

    expect(
      result.actions
    ).toEqual([
      'duplicate',
      'remove'
    ]);

    expect(
      result.dataset
    ).toEqual({
      type:
        'circle',
      width:
        '144',
      height:
        '96',
      rotation:
        '33',
      stroke:
        '#74c69d',
      fill:
        '#7db6ff',
      hidden:
        'true'
    });

    expect(
      result.cssRotation
    ).toBe(
      '33deg'
    );

    expect(
      result.model
    ).toMatchObject({
      type:
        'circle',
      width:
        144,
      height:
        96,
      rotation:
        33,
      strokeColor:
        '#74c69d',
      fillColor:
        '#7db6ff',
      presentationHidden:
        true
    });

    expect(
      result.saveCount
    ).toBeGreaterThanOrEqual(
      7
    );
  }
);


test(
  'campaign-map-selection-inspector-applies-group-visibility-actions',
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
            renderMapShapeElement,
            renderMapTokenElement
          } = await import('/js/editor/campaignMapRenderer.js');

          const {
            ensureMapSelectionInspector
          } = await import('/js/editor/campaignMapSelectionInspector.js');

          const {
            selectMapShape,
            selectMapToken
          } = await import('/js/editor/campaignMapRuntime.js');

          document.querySelector('#editorArea').innerHTML = `
            <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
              <div class="campaign-map-stage" data-grid="false" data-grid-size="80" data-fog-mode="draw" data-fog-image="" contenteditable="false" style="position: relative; width: 1000px; height: 740px;">
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

          const layer =
            map.querySelector('.campaign-map-object-layer');

          const store =
            refreshCampaignMapStore(
              map
            );

          const tokenRecord =
            store.addToken({
              tokenId:
                'group-action-token',
              type:
                'creature',
              name:
                '\u0420\u0430\u0437\u0432\u0435\u0434\u0447\u0438\u043a',
              x:
                24,
              y:
                34
            });

          const shapeRecord =
            store.addShape({
              shapeId:
                'group-action-shape',
              type:
                'circle',
              x:
                360,
              y:
                240,
              width:
                120,
              height:
                120,
              presentationHidden:
                true
            });

          const token =
            createMapTokenElement(
              tokenRecord
            );

          const shape =
            createMapShapeElement(
              shapeRecord,
              store.getModel()
            );

          layer.append(
            token,
            shape
          );

          await renderMapTokenElement(
            token
          );

          renderMapShapeElement(
            shape
          );

          const saveLog =
            [];

          const statusLog =
            [];

          const flushAction =
            async () => {

              await Promise.resolve();
              await Promise.resolve();
            };

          ensureMapSelectionInspector(
            map,
            {
              closeTokenPopup() {},
              getSelectionActionDeps() {

                return {};
              },
              getTokenActionDeps() {

                return {};
              },
              openTokenPopup() {},
              async saveAndSync() {

                saveLog.push(
                  'group-visibility'
                );
              },
              setStatus(text) {

                statusLog.push(
                  text
                );
              }
            }
          );

          selectMapToken(
            token
          );

          selectMapShape(
            shape,
            {
              additive:
                true
            }
          );

          const dock =
            map.querySelector('.campaign-map-selection-dock');

          const collect =
            () => ({
              actions:
                [...dock.querySelectorAll('[data-map-selection-action]')]
                  .map(button => button.dataset.mapSelectionAction),
              stats:
                [...dock.querySelectorAll('.campaign-map-selection-stat')]
                  .map(stat => [
                    stat.dataset.selectionStat,
                    stat.querySelector('strong')?.textContent?.trim()
                  ]),
              tokenHidden:
                token.dataset.presentationHidden,
              shapeHidden:
                shape.dataset.presentationHidden,
              modelTokenHidden:
                store.getModel().getToken('group-action-token')
                  ?.presentationHidden,
              modelShapeHidden:
                store.getModel().getShape('group-action-shape')
                  ?.presentationHidden
            });

          const before =
            collect();

          dock
            .querySelector('[data-map-selection-action="hide-selection"]')
            .click();

          await flushAction();

          const afterHide =
            collect();

          dock
            .querySelector('[data-map-selection-action="show-selection"]')
            .click();

          await flushAction();

          const afterShow =
            collect();

          return {
            before,
            afterHide,
            afterShow,
            saveLog,
            statusLog
          };
        }
      );

    expect(
      result.before.actions
    ).toEqual([
      'hide-selection',
      'show-selection',
      'remove'
    ]);

    expect(
      result.before.stats
    ).toEqual(
      expect.arrayContaining([
        [
          'visible',
          '1'
        ],
        [
          'hidden',
          '1'
        ]
      ])
    );

    expect(
      result.afterHide
    ).toMatchObject({
      actions:
        [
          'show-selection',
          'remove'
        ],
      tokenHidden:
        'true',
      shapeHidden:
        'true',
      modelTokenHidden:
        true,
      modelShapeHidden:
        true
    });

    expect(
      result.afterHide.stats
    ).toEqual(
      expect.arrayContaining([
        [
          'visible',
          '0'
        ],
        [
          'hidden',
          '2'
        ]
      ])
    );

    expect(
      result.afterShow
    ).toMatchObject({
      actions:
        [
          'hide-selection',
          'remove'
        ],
      tokenHidden:
        'false',
      shapeHidden:
        'false',
      modelTokenHidden:
        false,
      modelShapeHidden:
        false
    });

    expect(
      result.afterShow.stats
    ).toEqual(
      expect.arrayContaining([
        [
          'visible',
          '2'
        ],
        [
          'hidden',
          '0'
        ]
      ])
    );

    expect(
      result.saveLog
    ).toEqual([
      'group-visibility',
      'group-visibility'
    ]);

    expect(
      result.statusLog.at(-2)
    ).toContain(
      '1'
    );

    expect(
      result.statusLog.at(-1)
    ).toContain(
      '2'
    );
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
