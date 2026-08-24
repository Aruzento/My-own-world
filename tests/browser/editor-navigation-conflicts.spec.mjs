import {
  expect,
  test
} from '@playwright/test';


async function installEditorNavigationConflictHarness(
  page,
  options = {}
) {

  await page.evaluate(
    async config => {

      const {
        buildPageRecordContent,
        updatePageRecordContent
      } = await import('/js/core/pageRecord.js');

      const {
        openPage
      } = await import('/js/editor/editor.js');

      const {
        getCurrentEditorPageBase
      } = await import('/js/editor/editorSessionBase.js');

      const {
        renderTree
      } = await import('/js/tree/tree.js');

      const {
        setPages
      } = await import('/js/stateActions.js');

      const {
        state
      } = await import('/js/state.js');

      const {
        persistPageContentCommand,
        snapshotPageForCommand
      } = await import('/js/storage/storage.js');

      const {
        setStorageAdapter
      } = await import('/js/storage/storageAdapter.js');

      const files =
        new Map();

      const writes =
        [];

      const normalize =
        path => String(path || '')
          .replace(/\\/g, '/')
          .replace(/^\/+/, '')
          .replace(/\/+/g, '/');

      setStorageAdapter({
        kind:
          'memory',
        getWorkspaceHandle() {
          return {
            name:
              'Editor navigation conflict workspace'
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
        async getDirectoryHandle(path) {
          return {
            kind:
              'directory',
            path:
              normalize(path)
          };
        },
        async readText(path) {
          return files.get(
            normalize(path)
          ) || '';
        },
        async writeText(path, content) {
          const normalized =
            normalize(path);

          const text =
            String(content);

          files.set(
            normalized,
            text
          );

          writes.push({
            path:
              normalized,
            content:
              text
          });
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

      const createCardBody =
        (
          title,
          body
        ) => `<div class="entity-layout card-shell" contenteditable="false">
  <h1>${title}</h1>
  <div
    class="rich-text-field"
    contenteditable="true"
    data-persistent-editable="true"
  >${body}</div>
</div>`;

      const createCardPage =
        (
          id,
          title,
          body,
          order
        ) => {

          const content =
            buildPageRecordContent({
              id,
              parent:
                null,
              order,
              tags:
                [
                  'card'
                ],
              template:
                'card',
              type:
                'note',
              aliases:
                [],
              relationships:
                [],
              body:
                createCardBody(
                  title,
                  body
                ),
              now:
                `2026-08-24T10:00:0${order}.000Z`
            });

          return {
            id,
            name:
              `${id}.md`,
            path:
              `/pages/${id}.md`,
            parent:
              null,
            order,
            title,
            template:
              'card',
            type:
              'note',
            tags:
              [
                'card'
              ],
            aliases:
              [],
            relationships:
              [],
            content
          };
        };

      const createMapBody =
        title => `<div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
  <div class="campaign-map-topbar" contenteditable="false">
    <h1 class="campaign-map-title singleline-field" contenteditable="true">${title}</h1>
  </div>
  <div class="campaign-map-stage" data-grid="false" data-fog-mode="draw" data-fog-image="" data-map-asset="" data-map-music-state="" contenteditable="false">
    <div class="campaign-map-viewport">
      <div class="campaign-map-background"></div>
      <div class="campaign-map-object-layer"></div>
      <canvas class="campaign-map-fog-canvas"></canvas>
    </div>
  </div>
</div>`;

      const alpha =
        createCardPage(
          'nav-conflict-alpha',
          'Navigation Conflict Alpha',
          'base-a-token',
          1
        );

      const beta =
        createCardPage(
          'nav-conflict-beta',
          'Navigation Conflict Beta',
          'beta-target-token',
          2
        );

      const pages =
        [
          alpha,
          beta
        ];

      if (config.includeMap) {

        const mapContent =
          buildPageRecordContent({
            id:
              'nav-conflict-map',
            parent:
              null,
            order:
              3,
            tags:
              [
                'campaign-map'
              ],
            template:
              'campaignMap',
            type:
              'campaignMap',
            aliases:
              [],
            relationships:
              [],
            body:
              createMapBody(
                'Navigation Conflict Map'
              ),
            now:
              '2026-08-24T10:00:03.000Z'
          });

        pages.push({
          id:
            'nav-conflict-map',
          name:
            'nav-conflict-map.md',
          path:
            '/pages/nav-conflict-map.md',
          parent:
            null,
          order:
            3,
          title:
            'Navigation Conflict Map',
          template:
            'campaignMap',
          type:
            'campaignMap',
          tags:
            [
              'campaign-map'
            ],
          aliases:
            [],
          relationships:
            [],
          content:
            mapContent
        });
      }

      for (const pageRecord of pages) {

        files.set(
          normalize(pageRecord.path),
          pageRecord.content
        );
      }

      setPages(
        pages
      );

      renderTree();

      const getPage =
        pageId => state.pages.find(candidate =>
          candidate.id === pageId
        );

      const wait =
        ms => new Promise(resolve => {

          setTimeout(
            resolve,
            ms
          );
        });

      async function waitForEditorTitle(
        title
      ) {

        const editor =
          document.querySelector(
            '#editorArea'
          );

        for (let attempt = 0; attempt < 40; attempt += 1) {

          if (
            editor?.querySelector('h1')?.textContent?.trim() === title
          ) {

            return true;
          }

          await wait(
            25
          );
        }

        return false;
      }

      window.__editorNavigationConflictTest = {
        files,
        writes,
        async open(pageId) {
          const pageRecord =
            getPage(pageId);

          const result =
            await openPage(
              pageRecord
            );

          await wait(
            0
          );

          return result;
        },
        async openAndWait(
          pageId,
          title
        ) {

          await this.open(
            pageId
          );

          return waitForEditorTitle(
            title
          );
        },
        async externalWriteCurrentAlpha(
          body,
          now = '2026-08-24T10:05:00.000Z'
        ) {

          const pageRecord =
            getPage(
              'nav-conflict-alpha'
            );

          const expectedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          const content =
            updatePageRecordContent(
              pageRecord.content,
              {
                body:
                  createCardBody(
                    'Navigation Conflict Alpha',
                    body
                  )
              },
              {
                now
              }
            );

          return persistPageContentCommand({
            page:
              pageRecord,
            content,
            previousPage:
              snapshotPageForCommand(
                pageRecord
              ),
            reason:
              'browser-external-current-write',
            expectedBase
          });
        },
        async externalWriteCurrentMap(
          title,
          now = '2026-08-24T10:06:00.000Z'
        ) {

          const pageRecord =
            getPage(
              'nav-conflict-map'
            );

          const expectedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          const content =
            updatePageRecordContent(
              pageRecord.content,
              {
                body:
                  createMapBody(
                    title
                  )
              },
              {
                now
              }
            );

          return persistPageContentCommand({
            page:
              pageRecord,
            content,
            previousPage:
              snapshotPageForCommand(
                pageRecord
              ),
            reason:
              'browser-external-current-map-write',
            expectedBase
          });
        },
        editBody(
          text,
          dispatchInput = true
        ) {

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const body =
            editor?.querySelector(
              '.rich-text-field'
            );

          if (!body) return false;

          body.focus();

          body.textContent =
            text;

          if (dispatchInput) {

            body.dispatchEvent(
              new InputEvent(
                'input',
                {
                  bubbles:
                    true,
                  inputType:
                    'insertText',
                  data:
                    text
                }
              )
            );
          }

          return true;
        },
        editMapTitle(
          text,
          dispatchInput = true
        ) {

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const title =
            editor?.querySelector(
              '.campaign-map-title'
            );

          if (!title) return false;

          title.focus();

          title.textContent =
            text;

          if (dispatchInput) {

            title.dispatchEvent(
              new InputEvent(
                'input',
                {
                  bubbles:
                    true,
                  inputType:
                    'insertText',
                  data:
                    text
                }
              )
            );
          }

          return true;
        },
        async openSettings() {
          document
            .querySelector('#appSettingsBtn')
            ?.click();

          await wait(
            50
          );

          return !document
            .querySelector('#appSettingsPopup')
            ?.classList.contains(
              'hidden'
            );
        },
        wait,
        snapshot() {

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const conflictDialog =
            document.querySelector(
              '.edit-conflict-dialog'
            );

          const settingsPopup =
            document.querySelector(
              '#appSettingsPopup'
            );

          return {
            currentPageId:
              state.currentPage?.id || '',
            editorTitle:
              editor?.querySelector('h1')?.textContent?.trim() || '',
            editorBody:
              editor?.querySelector('.rich-text-field')?.textContent || '',
            hasCampaignMap:
              Boolean(
                editor?.querySelector('.campaign-map-document')
              ),
            alphaFile:
              files.get('pages/nav-conflict-alpha.md') || '',
            betaFile:
              files.get('pages/nav-conflict-beta.md') || '',
            mapFile:
              files.get('pages/nav-conflict-map.md') || '',
            writeCount:
              writes.length,
            staleDraftWrites:
              writes.filter(write =>
                write.content.includes(
                  'stale-c-draft-token'
                )
              ).length,
            dialogOpen:
              Boolean(
                document.querySelector('.edit-conflict-dialog:not(.hidden)')
              ),
            dialogCount:
              document.querySelectorAll(
                '.edit-conflict-dialog'
              ).length,
            dialogText:
              conflictDialog?.textContent || '',
            status:
              document.querySelector('#statusbar')?.textContent || '',
            settingsOpen:
              Boolean(
                settingsPopup &&
                !settingsPopup.classList.contains('hidden')
              )
          };
        }
      };
    },
    {
      includeMap:
        Boolean(options.includeMap)
    }
  );
}


async function installWorkspaceSwitchConflictHarness(
  page
) {

  await page.evaluate(
    async () => {

      const {
        buildPageRecordContent,
        updatePageRecordContent
      } = await import('/js/core/pageRecord.js');

      const {
        getCurrentEditorPageBase
      } = await import('/js/editor/editorSessionBase.js');

      const {
        persistPageContentCommand,
        snapshotPageForCommand
      } = await import('/js/storage/storage.js');

      const {
        state
      } = await import('/js/state.js');

      const {
        setStorageAdapter
      } = await import('/js/storage/storageAdapter.js');

      const normalize =
        path => String(path || '')
          .replace(/\\/g, '/')
          .replace(/^\/+/, '')
          .replace(/\/+/g, '/');

      const getParentPath =
        path => {

          const parts =
            normalize(path)
              .split('/');

          parts.pop();

          return parts.join('/');
        };

      const ensureDirectoryPath =
        (
          directories,
          path
        ) => {

          const parts =
            normalize(path)
              .split('/')
              .filter(Boolean);

          let current =
            '';

          for (const part of parts) {

            current =
              current
                ? `${current}/${part}`
                : part;

            directories.add(
              current
            );
          }
        };

      const listWorkspaceEntries =
        (
          workspace,
          path = ''
        ) => {

          const normalized =
            normalize(path);

          const prefix =
            normalized
              ? `${normalized}/`
              : '';

          const entries =
            new Map();

          for (const directory of workspace.directories) {

            if (!directory.startsWith(prefix)) continue;

            const rest =
              directory.slice(prefix.length);

            if (!rest || rest.includes('/')) continue;

            entries.set(
              rest,
              'directory'
            );
          }

          for (const filePath of workspace.files.keys()) {

            if (!filePath.startsWith(prefix)) continue;

            const rest =
              filePath.slice(prefix.length);

            if (!rest || rest.includes('/')) continue;

            entries.set(
              rest,
              'file'
            );
          }

          return [...entries].map(([name, kind]) => ({
            name,
            kind
          }));
        };

      const createPageBody =
        (
          title,
          body
        ) => `<div class="entity-layout card-shell" contenteditable="false">
  <h1>${title}</h1>
  <div class="rich-text-field" contenteditable="true" data-persistent-editable="true">${body}</div>
</div>`;

      const createPageContent =
        ({
          id,
          title,
          body
        }) => buildPageRecordContent({
          id,
          parent:
            null,
          order:
            1,
          tags:
            [
              'card'
            ],
          template:
            'card',
          type:
            'note',
          aliases:
            [],
          relationships:
            [],
          body:
            createPageBody(
              title,
              body
            ),
          now:
            '2026-08-24T11:00:00.000Z'
        });

      const createWorkspace =
        (
          key,
          pageRecord
        ) => {

          const workspace = {
            key,
            directories:
              new Set([
                '',
                'pages',
                'assets',
                'rule-packages',
                'world-packages'
              ]),
            files:
              new Map(),
            writes:
              []
          };

          workspace.files.set(
            `pages/${pageRecord.id}.md`,
            createPageContent(
              pageRecord
            )
          );

          return workspace;
        };

      const workspaces =
        new Map([
          [
            'workspace-a',
            createWorkspace(
              'workspace-a',
              {
                id:
                  'workspace-a-conflict-page',
                title:
                  'Workspace A Conflict',
                body:
                  'workspace-a-base-token'
              }
            )
          ],
          [
            'workspace-b',
            createWorkspace(
              'workspace-b',
              {
                id:
                  'workspace-b-target-page',
                title:
                  'Workspace B Target',
                body:
                  'workspace-b-body-token'
              }
            )
          ]
        ]);

      const pickQueue =
        [];

      let activeWorkspaceKey =
        null;

      const getActiveWorkspace =
        () => {

          if (!activeWorkspaceKey) {

            throw new Error(
              'No active workspace.'
            );
          }

          return workspaces.get(
            activeWorkspaceKey
          );
        };

      const adapter = {
        kind:
          'desktop',
        getWorkspaceRoot() {
          return activeWorkspaceKey;
        },
        setWorkspaceRoot(root) {
          activeWorkspaceKey =
            String(root || '') ||
            null;
        },
        getWorkspaceHandle() {
          return activeWorkspaceKey;
        },
        setWorkspaceHandle(handle) {
          activeWorkspaceKey =
            String(handle || '') ||
            null;
        },
        async pickWorkspace() {

          const next =
            pickQueue.shift();

          if (!workspaces.has(next)) {

            throw new Error(
              `Unknown test workspace: ${next}`
            );
          }

          activeWorkspaceKey =
            next;

          return next;
        },
        async restoreWorkspace() {
          return null;
        },
        async ensureDirectory(path) {
          ensureDirectoryPath(
            getActiveWorkspace().directories,
            path
          );
        },
        async getDirectoryHandle(path) {
          return {
            kind:
              'directory',
            path:
              normalize(path)
          };
        },
        async readText(path) {

          const value =
            getActiveWorkspace().files.get(
              normalize(path)
            );

          if (value === undefined) {

            throw new Error(
              `File not found: ${path}`
            );
          }

          return String(value);
        },
        async writeText(path, content) {

          const workspace =
            getActiveWorkspace();

          const normalized =
            normalize(path);

          ensureDirectoryPath(
            workspace.directories,
            getParentPath(
              normalized
            )
          );

          const text =
            String(content);

          workspace.files.set(
            normalized,
            text
          );

          workspace.writes.push({
            path:
              normalized,
            content:
              text
          });
        },
        async readBinary() {
          return new ArrayBuffer(0);
        },
        async writeBinary() {},
        async listFiles(path = '') {
          return listWorkspaceEntries(
            getActiveWorkspace(),
            path
          );
        },
        async removeFile(path) {
          getActiveWorkspace().files.delete(
            normalize(path)
          );
        },
        async removeDirectory(path) {
          getActiveWorkspace().directories.delete(
            normalize(path)
          );
        }
      };

      setStorageAdapter(
        adapter
      );

      window.__workspaceSwitchConflictTest = {
        pickQueue,
        async externalWriteA(
          body
        ) {

          const pageRecord =
            state.pages.find(candidate =>
              candidate.id === 'workspace-a-conflict-page'
            );

          const expectedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          const content =
            updatePageRecordContent(
              pageRecord.content,
              {
                body:
                  createPageBody(
                    'Workspace A Conflict',
                    body
                  )
              },
              {
                now:
                  '2026-08-24T11:05:00.000Z'
              }
            );

          return persistPageContentCommand({
            page:
              pageRecord,
            content,
            previousPage:
              snapshotPageForCommand(
                pageRecord
              ),
            reason:
              'workspace-switch-current-write',
            expectedBase
          });
        },
        snapshot() {

          const editor =
            document.querySelector(
              '#editorArea'
            );

          return {
            activeWorkspaceKey,
            currentPageId:
              state.currentPage?.id || '',
            pageIds:
              state.pages.map(pageRecord => pageRecord.id),
            pickQueueLength:
              pickQueue.length,
            editorTitle:
              editor?.querySelector('h1')?.textContent?.trim() || '',
            editorBody:
              editor?.querySelector('.rich-text-field')?.textContent || '',
            aFile:
              workspaces.get('workspace-a')
                .files.get('pages/workspace-a-conflict-page.md') || '',
            bFile:
              workspaces.get('workspace-b')
                .files.get('pages/workspace-b-target-page.md') || '',
            aWrites:
              workspaces.get('workspace-a').writes,
            bWrites:
              workspaces.get('workspace-b').writes,
            dialogOpen:
              Boolean(
                document.querySelector('.edit-conflict-dialog:not(.hidden)')
              ),
            dialogText:
              document.querySelector('.edit-conflict-dialog')?.textContent || ''
          };
        }
      };
    }
  );
}


test(
  'editor-navigation-conflict-blocks-page-switch-and-preserves-draft',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installEditorNavigationConflictHarness(
      page
    );

    const result =
      await page.evaluate(
        async () => {

          const harness =
            window.__editorNavigationConflictTest;

          await harness.openAndWait(
            'nav-conflict-alpha',
            'Navigation Conflict Alpha'
          );

          await harness.externalWriteCurrentAlpha(
            'current-b-token'
          );

          harness.editBody(
            'stale-c-draft-token',
            true
          );

          const beforeTransition =
            harness.snapshot();

          await harness.open(
            'nav-conflict-beta'
          );

          await harness.wait(
            50
          );

          return {
            beforeTransition,
            afterTransition:
              harness.snapshot()
          };
        }
      );

    expect(
      result.afterTransition.currentPageId
    ).toBe(
      'nav-conflict-alpha'
    );

    expect(
      result.afterTransition.editorTitle
    ).toBe(
      'Navigation Conflict Alpha'
    );

    expect(
      result.afterTransition.editorBody
    ).toBe(
      'stale-c-draft-token'
    );

    expect(
      result.afterTransition.alphaFile
    ).toContain(
      'current-b-token'
    );

    expect(
      result.afterTransition.alphaFile
    ).not.toContain(
      'stale-c-draft-token'
    );

    expect(
      result.afterTransition.betaFile
    ).not.toContain(
      'stale-c-draft-token'
    );

    expect(
      result.afterTransition.staleDraftWrites
    ).toBe(
      0
    );

    expect(
      result.afterTransition.dialogOpen
    ).toBe(
      true
    );

    expect(
      result.afterTransition.dialogText
    ).toContain(
      'Страница изменилась после того, как вы её открыли'
    );

    expect(
      result.afterTransition.status
    ).toContain(
      'Сохранение остановлено'
    );

    expect(
      result.beforeTransition.currentPageId
    ).toBe(
      'nav-conflict-alpha'
    );
  }
);


test(
  'editor-navigation-conflict-blocks-campaign-map-open',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installEditorNavigationConflictHarness(
      page,
      {
        includeMap:
          true
      }
    );

    const result =
      await page.evaluate(
        async () => {

          const harness =
            window.__editorNavigationConflictTest;

          await harness.openAndWait(
            'nav-conflict-alpha',
            'Navigation Conflict Alpha'
          );

          await harness.externalWriteCurrentAlpha(
            'current-b-token'
          );

          harness.editBody(
            'stale-c-draft-token',
            true
          );

          await harness.open(
            'nav-conflict-map'
          );

          await harness.wait(
            50
          );

          return harness.snapshot();
        }
      );

    expect(
      result.currentPageId
    ).toBe(
      'nav-conflict-alpha'
    );

    expect(
      result.hasCampaignMap
    ).toBe(
      false
    );

    expect(
      result.editorBody
    ).toBe(
      'stale-c-draft-token'
    );

    expect(
      result.alphaFile
    ).toContain(
      'current-b-token'
    );

    expect(
      result.alphaFile
    ).not.toContain(
      'stale-c-draft-token'
    );

    expect(
      result.dialogOpen
    ).toBe(
      true
    );
  }
);


test(
  'editor-navigation-conflict-blocks-special-campaign-map-save-before-page-switch',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installEditorNavigationConflictHarness(
      page,
      {
        includeMap:
          true
      }
    );

    const result =
      await page.evaluate(
        async () => {

          const harness =
            window.__editorNavigationConflictTest;

          await harness.openAndWait(
            'nav-conflict-map',
            'Navigation Conflict Map'
          );

          await harness.externalWriteCurrentMap(
            'Navigation Conflict Map Current'
          );

          harness.editMapTitle(
            'Navigation Conflict Map Stale Draft',
            true
          );

          await harness.open(
            'nav-conflict-beta'
          );

          await harness.wait(
            50
          );

          return harness.snapshot();
        }
      );

    expect(
      result.currentPageId
    ).toBe(
      'nav-conflict-map'
    );

    expect(
      result.editorTitle
    ).toBe(
      'Navigation Conflict Map Stale Draft'
    );

    expect(
      result.mapFile
    ).toContain(
      'Navigation Conflict Map Current'
    );

    expect(
      result.mapFile
    ).not.toContain(
      'Navigation Conflict Map Stale Draft'
    );

    expect(
      result.betaFile
    ).not.toContain(
      'Navigation Conflict Map Stale Draft'
    );

    expect(
      result.dialogOpen
    ).toBe(
      true
    );
  }
);


test(
  'editor-late-debounced-autosave-conflicts-at-execution-time',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installEditorNavigationConflictHarness(
      page
    );

    const result =
      await page.evaluate(
        async () => {

          const harness =
            window.__editorNavigationConflictTest;

          await harness.openAndWait(
            'nav-conflict-alpha',
            'Navigation Conflict Alpha'
          );

          await harness.externalWriteCurrentAlpha(
            'current-b-token'
          );

          harness.editBody(
            'stale-c-draft-token',
            true
          );

          const settingsOpened =
            await harness.openSettings();

          await harness.wait(
            650
          );

          return {
            settingsOpened,
            afterAutosave:
              harness.snapshot()
          };
        }
      );

    expect(
      result.settingsOpened
    ).toBe(
      true
    );

    expect(
      result.afterAutosave.currentPageId
    ).toBe(
      'nav-conflict-alpha'
    );

    expect(
      result.afterAutosave.editorBody
    ).toBe(
      'stale-c-draft-token'
    );

    expect(
      result.afterAutosave.alphaFile
    ).toContain(
      'current-b-token'
    );

    expect(
      result.afterAutosave.alphaFile
    ).not.toContain(
      'stale-c-draft-token'
    );

    expect(
      result.afterAutosave.staleDraftWrites
    ).toBe(
      0
    );

    expect(
      result.afterAutosave.dialogOpen
    ).toBe(
      true
    );

    expect(
      result.afterAutosave.dialogCount
    ).toBe(
      1
    );
  }
);


test(
  'workspace-switch-conflict-stops-before-picker-and-preserves-workspace-a-draft',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installWorkspaceSwitchConflictHarness(
      page
    );

    await page.evaluate(
      () => window.__workspaceSwitchConflictTest.pickQueue.push(
        'workspace-a'
      )
    );

    await page
      .locator('[data-tree-empty-workspace="true"] [data-open-workspace]')
      .click();

    await expect(
      page.locator('.tree-item[data-page-id="workspace-a-conflict-page"]')
    ).toBeVisible();

    await page
      .locator('.tree-item[data-page-id="workspace-a-conflict-page"] .tree-title')
      .click();

    await expect(
      page.locator('#editorArea h1')
    ).toHaveText(
      'Workspace A Conflict'
    );

    await page.evaluate(
      async () => {

        await window.__workspaceSwitchConflictTest.externalWriteA(
          'workspace-a-current-b-token'
        );
      }
    );

    await page
      .locator('#editorArea .rich-text-field')
      .fill(
        'workspace-a-stale-c-draft-token'
      );

    await page.evaluate(
      () => window.__workspaceSwitchConflictTest.pickQueue.push(
        'workspace-b'
      )
    );

    await page
      .locator('#appWorkspaceSwitchBtn[data-open-workspace]')
      .click();

    await expect(
      page.locator('.edit-conflict-dialog')
    ).toBeVisible();

    const result =
      await page.evaluate(
        () => window.__workspaceSwitchConflictTest.snapshot()
      );

    expect(
      result.activeWorkspaceKey
    ).toBe(
      'workspace-a'
    );

    expect(
      result.currentPageId
    ).toBe(
      'workspace-a-conflict-page'
    );

    expect(
      result.pageIds
    ).toEqual([
      'workspace-a-conflict-page'
    ]);

    expect(
      result.pickQueueLength
    ).toBe(
      1
    );

    expect(
      result.editorBody
    ).toBe(
      'workspace-a-stale-c-draft-token'
    );

    expect(
      result.aFile
    ).toContain(
      'workspace-a-current-b-token'
    );

    expect(
      result.aFile
    ).not.toContain(
      'workspace-a-stale-c-draft-token'
    );

    expect(
      result.bFile
    ).not.toContain(
      'workspace-a-stale-c-draft-token'
    );

    expect(
      result.aWrites.some(write =>
        write.content.includes(
          'workspace-a-stale-c-draft-token'
        )
      )
    ).toBe(
      false
    );

    expect(
      result.bWrites.length
    ).toBe(
      0
    );

    expect(
      result.dialogText
    ).toContain(
      'Страница изменилась после того, как вы её открыли'
    );
  }
);
