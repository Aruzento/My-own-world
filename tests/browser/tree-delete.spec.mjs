import {
  expect,
  test
} from '@playwright/test';


test(
  'tree-context-delete-removes-page-branch-after-trash-snapshot',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const setup =
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
            renderTree
          } = await import('/js/tree/tree.js');

          const files =
            new Map();

          files.set(
            '/pages/parent.md',
            '<h1>Parent</h1>'
          );

          files.set(
            '/pages/child.md',
            '<h1>Child</h1>'
          );

          const removedPaths =
            [];

          setStorageAdapter({
            kind: 'browser',
            getWorkspaceHandle() {
              return {};
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
              if (!files.has(path)) {
                throw new Error(`missing ${path}`);
              }

              return files.get(path);
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
            async removeFile(path) {
              removedPaths.push(
                path
              );
              files.delete(
                path
              );
            },
            async removeDirectory() {}
          });

          setPages([
            {
              id: 'parent',
              name: 'parent.md',
              path: '/pages/parent.md',
              order: 1,
              title: 'Parent',
              parent: null,
              template: 'card',
              type: 'note',
              tags: [],
              aliases: [],
              content: '<h1>Parent</h1>'
            },
            {
              id: 'child',
              name: 'child.md',
              path: '/pages/child.md',
              order: 2,
              title: 'Child',
              parent: 'parent',
              template: 'card',
              type: 'note',
              tags: [],
              aliases: [],
              content: '<h1>Child</h1>'
            }
          ]);

          state.__treeDeleteTest =
            {
              files,
              removedPaths
            };

          renderTree();

          return {
            pageCount:
              state.pages.length
          };
        }
      );

    expect(
      setup.pageCount
    ).toBe(
      2
    );

    await page
      .locator('.tree-item[data-page-id="parent"] .tree-actions')
      .click();

    await expect(
      page.locator('.tree-context-menu button.danger')
    ).toBeVisible();

    await page
      .locator('.tree-context-menu button.danger')
      .click();

    await expect(
      page.locator('.confirm-popup-confirm')
    ).toBeVisible();

    await page
      .locator('.confirm-popup-confirm')
      .click();

    await expect(
      page.locator('.tree-item[data-page-id="parent"]')
    ).toHaveCount(
      0
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const testState =
            state.__treeDeleteTest;

          return {
            pageIds:
              state.pages.map(candidate => candidate.id),
            removedPaths:
              testState.removedPaths,
            trashFiles:
              Array
                .from(testState.files.keys())
                .filter(path => path.includes('.my-own-world-trash/page-deletes/'))
          };
        }
      );

    expect(
      result.pageIds
    ).toEqual(
      []
    );

    expect(
      result.removedPaths.sort()
    ).toEqual([
      '/pages/child.md',
      '/pages/parent.md'
    ]);

    expect(
      result.trashFiles.length
    ).toBeGreaterThan(
      0
    );
  }
);


test(
  'tree-context-delete-keeps-page-deleted-when-map-token-cleanup-fails',
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
          setPages,
          setCurrentPage
        } = await import('/js/stateActions.js');

        const {
          setStorageAdapter
        } = await import('/js/storage/storageAdapter.js');

        const {
          renderTree
        } = await import('/js/tree/tree.js');

        const files =
          new Map();

        files.set(
          '/pages/entity.md',
          '<h1>Entity</h1>'
        );

        files.set(
          '/pages/map.md',
          `
---
id: map
parent: null
order: 1
tags: [campaign-map]
template: campaignMap
type: campaignMap
aliases: []
---

<div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
  <div class="campaign-map-stage" data-grid="false" data-fog-mode="draw" data-fog-image="" contenteditable="false">
    <div class="campaign-map-viewport">
      <div class="campaign-map-background"></div>
      <div class="campaign-map-object-layer">
        <button class="campaign-map-token is-creature" type="button" data-token-id="token-entity" data-page-id="entity" data-token-type="creature" data-name="Entity" data-x="50" data-y="50"></button>
      </div>
      <canvas class="campaign-map-fog-canvas"></canvas>
    </div>
  </div>
</div>
`
        );

        const removedPaths =
          [];

        setStorageAdapter({
          kind: 'browser',
          getWorkspaceHandle() {
            return {};
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
            if (!files.has(path)) {
              throw new Error(`missing ${path}`);
            }

            return files.get(path);
          },
          async writeText(path, content) {
            if (path === '/pages/map.md') {
              throw new Error('map write failed');
            }

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
          async removeFile(path) {
            removedPaths.push(
              path
            );
            files.delete(
              path
            );
          },
          async removeDirectory() {}
        });

        const entity = {
          id: 'entity',
          name: 'entity.md',
          path: '/pages/entity.md',
          order: 1,
          title: 'Entity',
          parent: null,
          template: 'card',
          type: 'creature',
          tags: ['card', 'creature'],
          aliases: [],
          content: '<h1>Entity</h1>'
        };

        const map = {
          id: 'map',
          name: 'map.md',
          path: '/pages/map.md',
          order: 2,
          title: 'Map',
          parent: null,
          template: 'campaignMap',
          type: 'campaignMap',
          tags: ['campaign-map'],
          aliases: [],
          content: files.get('/pages/map.md')
        };

        setPages([
          entity,
          map
        ]);

        setCurrentPage(
          map
        );

        state.__treeDeleteCleanupTest = {
          removedPaths
        };

        renderTree();
      }
    );

    await page
      .locator('.tree-item[data-page-id="entity"] .tree-actions')
      .click();

    await page
      .locator('.tree-context-menu button.danger')
      .click();

    await page
      .locator('.confirm-popup-confirm')
      .click();

    await expect(
      page.locator('.tree-item[data-page-id="entity"]')
    ).toHaveCount(
      0
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          return {
            pageIds:
              state.pages.map(candidate => candidate.id),
            removedPaths:
              state.__treeDeleteCleanupTest.removedPaths,
            status:
              document.querySelector('#statusbar')?.textContent || ''
          };
        }
      );

    expect(
      result.pageIds
    ).toEqual([
      'map'
    ]);

    expect(
      result.removedPaths
    ).toEqual([
      '/pages/entity.md'
    ]);

    expect(
      result.status
    ).not.toContain(
      'Не удалось удалить'
    );
  }
);
