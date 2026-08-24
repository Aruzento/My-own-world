import {
  expect,
  test
} from '@playwright/test';


test(
  'editor-autosave-flushes-pending-edit-before-page-switch',
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
            state
          } = await import('/js/state.js');

          const {
            openPage
          } = await import('/js/editor/editor.js');

          const {
            renderTree
          } = await import('/js/tree/tree.js');

          const files =
            new Map();

          setStorageAdapter({
            kind:
              'memory',
            getWorkspaceHandle() {
              return {
                name:
                  'Autosave test workspace'
              };
            },
            setWorkspaceHandle() {},
            async pickWorkspace() {
              return {};
            },
            async restoreWorkspace() {
              return {};
            },
            async ensureDirectory() {},
            async getDirectoryHandle() {
              return {};
            },
            async readText(path) {
              return files.get(path) || '';
            },
            async writeText(path, content) {
              files.set(
                path,
                String(content)
              );
            },
            async readBinary() {
              return new ArrayBuffer(0);
            },
            async writeBinary() {},
            async listFiles() {
              return [];
            },
            async removeFile() {},
            async removeDirectory() {}
          });

          const createContent =
            (
              id,
              title,
              body
            ) => `---
id: ${id}
parent: null
order: 1
tags: []
template: card
type: note
aliases: []
---

<div class="entity-layout card-shell" contenteditable="false">
  <h1>${title}</h1>
  <div
    class="rich-text-field"
    contenteditable="true"
    data-persistent-editable="true"
  >${body}</div>
</div>`;

          const createPage =
            (
              key,
              title,
              body,
              order
            ) => ({
              id:
                `autosave-${key}`,
              name:
                `autosave-${key}.md`,
              path:
                `/pages/autosave-${key}.md`,
              order,
              title,
              parent:
                null,
              template:
                'card',
              type:
                'note',
              tags:
                [],
              aliases:
                [],
              relationships:
                [],
              content:
                createContent(
                  `autosave-${key}`,
                  title,
                  body
                )
            });

          const alphaPage =
            createPage(
              'alpha',
              'Autosave Alpha',
              'Original alpha body',
              1
            );

          const betaPage =
            createPage(
              'beta',
              'Autosave Beta',
              'Original beta body',
              2
            );

          const gammaPage =
            createPage(
              'gamma',
              'Autosave Gamma',
              'Original gamma body',
              3
            );

          state.pages = [
            alphaPage,
            betaPage,
            gammaPage
          ];

          renderTree();

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const wait =
            ms => new Promise(resolve => {

              setTimeout(
                resolve,
                ms
              );
            });

          const waitForEditorTitle =
            async title => {

              for (let attempt = 0; attempt < 30; attempt += 1) {

                const heading =
                  editor.querySelector(
                    'h1'
                  );

                if (
                  heading?.textContent?.trim() === title
                ) {

                  return true;
                }

                await wait(
                  25
                );
              }

              return false;
            };

          const openAndWait =
            async pageRecord => {

              await openPage(
                pageRecord
              );

              return waitForEditorTitle(
                pageRecord.title
              );
            };

          const getBody =
            () => editor.querySelector(
              '.rich-text-field'
            );

          const editOpenBody =
            text => {

              const body =
                getBody();

              if (!body) return false;

              body.textContent =
                text;

              body.dispatchEvent(
                new InputEvent(
                  'input',
                  {
                    bubbles:
                      true,
                    data:
                      'x',
                    inputType:
                      'insertText'
                  }
                )
              );

              return true;
            };

          const alphaOpened =
            await openAndWait(
              alphaPage
            );

          const alphaEdited =
            editOpenBody(
              'Pending alpha edit saved before navigation'
            );

          const betaOpenedAfterAlpha =
            await openAndWait(
              betaPage
            );

          await wait(
            650
          );

          const alphaReopened =
            await openAndWait(
              alphaPage
            );

          const alphaReopenedText =
            getBody()?.textContent || '';

          const betaOpened =
            await openAndWait(
              betaPage
            );

          const betaEdited =
            editOpenBody(
              'Pending beta edit saved before gamma'
            );

          const gammaOpenedAfterBeta =
            await openAndWait(
              gammaPage
            );

          const gammaEdited =
            editOpenBody(
              'Pending gamma edit saved before alpha'
            );

          const alphaOpenedAfterGamma =
            await openAndWait(
              alphaPage
            );

          await wait(
            650
          );

          return {
            alphaEdited,
            alphaOpened,
            betaOpenedAfterAlpha,
            alphaReopened,
            alphaReopenedText,
            betaOpened,
            betaEdited,
            gammaOpenedAfterBeta,
            gammaEdited,
            alphaOpenedAfterGamma,
            currentPageId:
              state.currentPage?.id || '',
            savedAlpha:
              files.get(
                '/pages/autosave-alpha.md'
              ) || '',
            savedBeta:
              files.get(
                '/pages/autosave-beta.md'
              ) || '',
            savedGamma:
              files.get(
                '/pages/autosave-gamma.md'
              ) || '',
            editorHtml:
              editor.innerHTML
          };
        }
      );

    expect(
      result.alphaOpened,
      result.editorHtml
    ).toBe(
      true
    );

    expect(
      result.alphaEdited
    ).toBe(
      true
    );

    expect(
      result.betaOpenedAfterAlpha,
      result.editorHtml
    ).toBe(
      true
    );

    expect(
      result.savedAlpha
    ).toContain(
      'Pending alpha edit saved before navigation'
    );

    expect(
      result.savedBeta
    ).not.toContain(
      'Pending alpha edit saved before navigation'
    );

    expect(
      result.alphaReopened
    ).toBe(
      true
    );

    expect(
      result.alphaReopenedText
    ).toContain(
      'Pending alpha edit saved before navigation'
    );

    expect(
      result.betaOpened
    ).toBe(
      true
    );

    expect(
      result.betaEdited
    ).toBe(
      true
    );

    expect(
      result.gammaOpenedAfterBeta
    ).toBe(
      true
    );

    expect(
      result.gammaEdited
    ).toBe(
      true
    );

    expect(
      result.alphaOpenedAfterGamma
    ).toBe(
      true
    );

    expect(
      result.currentPageId
    ).toBe(
      'autosave-alpha'
    );

    expect(
      result.savedBeta
    ).toContain(
      'Pending beta edit saved before gamma'
    );

    expect(
      result.savedGamma
    ).toContain(
      'Pending gamma edit saved before alpha'
    );

    expect(
      result.savedAlpha
    ).not.toContain(
      'Pending beta edit saved before gamma'
    );

    expect(
      result.savedAlpha
    ).not.toContain(
      'Pending gamma edit saved before alpha'
    );

    expect(
      result.savedBeta
    ).not.toContain(
      'Pending gamma edit saved before alpha'
    );
  }
);


test(
  'editor-open-save-captures-and-advances-page-base-identity',
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
            state
          } = await import('/js/state.js');

          const {
            openPage,
            saveCurrentPage
          } = await import('/js/editor/editor.js');

          const {
            getCurrentEditorPageBase
          } = await import('/js/editor/editorSessionBase.js');

          const {
            createPageStateIdentityFromContent,
            arePageStateIdentitiesEqual
          } = await import('/js/core/pageRecord.js');

          const files =
            new Map();

          setStorageAdapter({
            kind:
              'memory',
            getWorkspaceHandle() {
              return {
                name:
                  'Editor base identity workspace'
              };
            },
            setWorkspaceHandle() {},
            async pickWorkspace() {
              return {};
            },
            async restoreWorkspace() {
              return {};
            },
            async ensureDirectory() {},
            async getDirectoryHandle() {
              return {};
            },
            async readText(path) {
              return files.get(path) || '';
            },
            async writeText(path, content) {
              files.set(
                path,
                String(content)
              );
            },
            async readBinary() {
              return new ArrayBuffer(0);
            },
            async writeBinary() {},
            async listFiles() {
              return [];
            },
            async removeFile() {},
            async removeDirectory() {}
          });

          const content =
`---
id: editor-base-page
parent: null
order: 1
tags: []
template: card
type: note
aliases: []
---

<div class="entity-layout card-shell" contenteditable="false">
  <h1>Editor Base</h1>
  <div
    class="rich-text-field"
    contenteditable="true"
    data-persistent-editable="true"
  >Original base</div>
</div>`;

          const pageRecord =
            {
              id:
                'editor-base-page',
              name:
                'editor-base-page.md',
              path:
                '/pages/editor-base-page.md',
              order:
                1,
              title:
                'Editor Base',
              parent:
                null,
              template:
                'card',
              type:
                'note',
              tags:
                [],
              aliases:
                [],
              relationships:
                [],
              content
            };

          files.set(
            pageRecord.path,
            pageRecord.content
          );

          state.pages =
            [
              pageRecord
            ];

          await openPage(
            pageRecord
          );

          const openedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const body =
            editor.querySelector(
              '.rich-text-field'
            );

          body.textContent =
            'Saved base';

          body.dispatchEvent(
            new InputEvent(
              'input',
              {
                bubbles:
                  true,
                data:
                  'x',
                inputType:
                  'insertText'
              }
            )
          );

          await saveCurrentPage();

          const savedContent =
            files.get(
              pageRecord.path
            );

          const advancedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          await openPage(
            pageRecord
          );

          const reopenedContent =
            files.get(
              pageRecord.path
            );

          const reopenedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          return {
            openedMatchesOriginal:
              arePageStateIdentitiesEqual(
                openedBase,
                createPageStateIdentityFromContent(
                  content,
                  {
                    pageId:
                      pageRecord.id
                  }
                )
              ),
            advancedMatchesDurable:
              arePageStateIdentitiesEqual(
                advancedBase,
                createPageStateIdentityFromContent(
                  savedContent,
                  {
                    pageId:
                      pageRecord.id
                  }
                )
              ),
            reopenedMatchesDurable:
              arePageStateIdentitiesEqual(
                reopenedBase,
                createPageStateIdentityFromContent(
                  reopenedContent,
                  {
                    pageId:
                      pageRecord.id
                  }
                )
              ),
            baseChangedAfterSave:
              !arePageStateIdentitiesEqual(
                openedBase,
                advancedBase
              ),
            savedContent
          };
        }
      );

    expect(
      result.openedMatchesOriginal
    ).toBe(
      true
    );

    expect(
      result.advancedMatchesDurable
    ).toBe(
      true
    );

    expect(
      result.reopenedMatchesDurable
    ).toBe(
      true
    );

    expect(
      result.baseChangedAfterSave
    ).toBe(
      true
    );

    expect(
      result.savedContent
    ).toContain(
      'Saved base'
    );
  }
);


test(
  'editor-open-page-ignores-stale-async-campaign-map-completion',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            setAssetAdapter
          } = await import('/js/storage/assetAdapter.js');

          const {
            setStorageAdapter
          } = await import('/js/storage/storageAdapter.js');

          const {
            state
          } = await import('/js/state.js');

          const {
            openPage
          } = await import('/js/editor/editor.js');

          const {
            renderTree
          } = await import('/js/tree/tree.js');

          const files =
            new Map();

          setStorageAdapter({
            kind:
              'memory',
            getWorkspaceHandle() {
              return {
                name:
                  'Async open test workspace'
              };
            },
            setWorkspaceHandle() {},
            async pickWorkspace() {
              return {};
            },
            async restoreWorkspace() {
              return {};
            },
            async ensureDirectory() {},
            async getDirectoryHandle() {
              return {};
            },
            async readText(path) {
              return files.get(path) || '';
            },
            async writeText(path, content) {
              files.set(
                path,
                String(content)
              );
            },
            async readBinary() {
              return new TextEncoder()
                .encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
                .buffer;
            },
            async writeBinary() {},
            async listFiles() {
              return [];
            },
            async removeFile() {},
            async removeDirectory() {}
          });

          let releaseSlowAsset;

          const slowAssetReleased =
            new Promise(resolve => {

              releaseSlowAsset =
                resolve;
            });

          setAssetAdapter({
            async importFile() {
              return {
                path:
                  'unused.png',
                url:
                  ''
              };
            },
            async resolveUrl(path) {

              if (path === 'slow-bg.png') {

                await slowAssetReleased;
              }

              return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
            },
            async exists() {
              return true;
            },
            async remove() {},
            async findOrphans() {
              return [];
            }
          });

          const createMapContent =
            title => `---
id: slow-map
parent: null
order: 1
tags: [campaign-map]
template: campaignMap
type: campaignMap
aliases: []
---

<div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
  <div class="campaign-map-topbar" contenteditable="false">
    <h1 class="campaign-map-title singleline-field" contenteditable="true">${title}</h1>
  </div>
  <div class="campaign-map-stage" data-grid="false" data-fog-mode="draw" data-fog-image="" data-map-asset="slow-bg.png" data-map-music-state="" contenteditable="false">
    <div class="campaign-map-viewport">
      <div class="campaign-map-background"></div>
      <div class="campaign-map-object-layer"></div>
      <canvas class="campaign-map-fog-canvas"></canvas>
    </div>
  </div>
</div>`;

          const createCardContent =
            title => `---
id: fast-card
parent: null
order: 2
tags: []
template: card
type: note
aliases: []
---

<div class="entity-layout card-shell" contenteditable="false">
  <h1>${title}</h1>
  <div class="rich-text-field" contenteditable="true" data-persistent-editable="true">Fast card body</div>
</div>`;

          const slowMap =
            {
              id:
                'slow-map',
              name:
                'slow-map.md',
              path:
                '/pages/slow-map.md',
              parent:
                null,
              order:
                1,
              title:
                'Slow Map',
              template:
                'campaignMap',
              type:
                'campaignMap',
              tags:
                ['campaign-map'],
              aliases:
                [],
              relationships:
                [],
              content:
                createMapContent(
                  'Slow Map'
                )
            };

          const fastCard =
            {
              id:
                'fast-card',
              name:
                'fast-card.md',
              path:
                '/pages/fast-card.md',
              parent:
                null,
              order:
                2,
              title:
                'Fast Card',
              template:
                'card',
              type:
                'note',
              tags:
                [],
              aliases:
                [],
              relationships:
                [],
              content:
                createCardContent(
                  'Fast Card'
                )
            };

          state.pages =
            [
              slowMap,
              fastCard
            ];

          renderTree();

          const slowOpen =
            openPage(
              slowMap
            );

          await Promise.resolve();

          await openPage(
            fastCard
          );

          releaseSlowAsset();

          await slowOpen;

          await new Promise(resolve => {

            requestAnimationFrame(
              () => requestAnimationFrame(
                resolve
              )
            );
          });

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const statusbar =
            document.querySelector(
              '#statusbar'
            );

          return {
            currentPageId:
              state.currentPage?.id || '',
            editorTitle:
              editor.querySelector('h1')?.textContent?.trim() || '',
            hasStaleCampaignMap:
              Boolean(
                editor.querySelector(
                  '.campaign-map-document'
                )
              ),
            status:
              statusbar?.textContent || '',
            currentTreeItem:
              document.querySelector(
                '[role="treeitem"][aria-current="page"]'
              )?.textContent || ''
          };
        }
      );

    expect(
      result.currentPageId
    ).toBe(
      'fast-card'
    );

    expect(
      result.editorTitle
    ).toBe(
      'Fast Card'
    );

    expect(
      result.hasStaleCampaignMap
    ).toBe(
      false
    );

    expect(
      result.status
    ).toContain(
      'fast-card.md'
    );

    expect(
      result.status
    ).not.toContain(
      'slow-map.md'
    );

    expect(
      result.currentTreeItem
    ).toContain(
      'Fast Card'
    );
  }
);
