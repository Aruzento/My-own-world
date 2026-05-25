import {
  expect,
  test
} from '@playwright/test';


// P0 smoke: добавление карточки на карту должно создавать bucket, дочерний дубль и токен.

test(
  'campaign-map-add-page-flow-creates-bucket-duplicate-and-token',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const { state } =
            await import('/js/state.js');

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
                  <h1 class="campaign-map-title singleline-field" contenteditable="true">Пещера</h1>
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

              nextState.workspaceHandle = {
                async getDirectoryHandle() {

                  return {
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
                  };
                }
              };
            };

          setupFakeWorkspace(
            state
          );

          const mapPage =
            createPageRecord({
              id: 'map-page',
              title: 'Пещера',
              type: 'campaignMap',
              template: 'campaignMap',
              tags: ['campaign-map']
            });

          const source =
            createPageRecord({
              id: 'source-creature',
              title: 'Гоблин',
              type: 'creature',
              tags: ['card', 'creature']
            });

          const player =
            createPageRecord({
              id: 'player-character',
              title: 'Лазарь',
              type: 'character',
              tags: ['card', 'character', 'player']
            });

          const mapChild =
            createPageRecord({
              id: 'map-child-creature',
              title: 'Гоблин.Пещера',
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
              candidate.title === 'Существа.Пещера'
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
      'Гоблин'
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
      'Существа.Пещера'
    );

    expect(
      result.duplicateTitle
    ).toBe(
      'Гоблин - сущность.Пещера'
    );

    expect(
      result.duplicateParent
    ).toBeTruthy();

    expect(
      result.tokenPageId
    ).toBe(
      result.duplicateParent
        ? result.writtenFiles.at(-1).id
        : ''
    );

    expect(
      result.tokenName
    ).toBe(
      'Гоблин - сущность.Пещера'
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
