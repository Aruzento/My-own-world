import {
  expect,
  test
} from '@playwright/test';


// Browser regression: проверяет чистую логику дерева в реальной browser-среде.
// Это защищает pointer-DnD от повторных поломок в режимах above / inside / below / root.

test(
  'tree-pointer-dnd-planner-keeps-stable-drop-intents-and-order',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createTreeMovePlan
          } = await import('/js/tree/treeMovePlanner.js');

          const {
            getTreeDropIntentFromRatio
          } = await import('/js/tree/treeDropIntent.js');

          const pages = [
            {
              id: 'folder-a',
              parent: null,
              order: 1
            },
            {
              id: 'page-a',
              parent: 'folder-a',
              order: 1
            },
            {
              id: 'page-b',
              parent: 'folder-a',
              order: 2
            },
            {
              id: 'page-c',
              parent: 'folder-a',
              order: 3
            },
            {
              id: 'folder-b',
              parent: null,
              order: 2
            }
          ];

          const beforeIntent =
            getTreeDropIntentFromRatio(
              0.1
            );

          const insideIntent =
            getTreeDropIntentFromRatio(
              0.5
            );

          const afterIntent =
            getTreeDropIntentFromRatio(
              0.9
            );

          const sameLevelPlan =
            createTreeMovePlan({
              pages,
              draggedId: 'page-c',
              targetId: 'page-a',
              mode: 'before'
            });

          const insidePlan =
            createTreeMovePlan({
              pages,
              draggedId: 'page-b',
              targetId: 'folder-b',
              mode: 'inside',
              orderValue: 77
            });

          const rootPlan =
            createTreeMovePlan({
              pages,
              draggedId: 'page-b',
              mode: 'root',
              orderValue: 88
            });

          return {
            intents: [
              beforeIntent,
              insideIntent,
              afterIntent
            ],
            sameLevel: sameLevelPlan.map(item => ({
              id: item.page.id,
              parentId: item.parentId,
              order: item.order
            })),
            inside: insidePlan.map(item => ({
              id: item.page.id,
              parentId: item.parentId,
              order: item.order
            })),
            root: rootPlan.map(item => ({
              id: item.page.id,
              parentId: item.parentId,
              order: item.order
            }))
          };
        }
      );

    expect(
      result.intents
    ).toEqual([
      'before',
      'inside',
      'after'
    ]);

    expect(
      result.sameLevel
    ).toEqual([
      {
        id: 'page-c',
        parentId: 'folder-a',
        order: 0
      }
    ]);

    expect(
      result.inside
    ).toEqual([
      {
        id: 'page-b',
        parentId: 'folder-b',
        order: 77
      }
    ]);

    expect(
      result.root
    ).toEqual([
      {
        id: 'page-b',
        parentId: null,
        order: 88
      }
    ]);
  }
);


test(
  'tree-pointer-dnd-real-ui-uses-batch-move-and-progress-panel',
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
          renderTree
        } = await import('/js/tree/tree.js');

        const files =
          new Map();

        const writePaths =
          [];

        const createPageFile =
          page => `---
id: ${page.id}
title: ${page.title}
parent: ${page.parent ?? 'null'}
order: ${page.order}
template: card
type: note
aliases: []
tags: []
---

<h1>${page.title}</h1>
`;

        const pages = [
          {
            id: 'folder-a',
            name: 'folder-a.md',
            path: '/pages/folder-a.md',
            title: 'Folder A',
            parent: null,
            order: 1,
            template: 'card',
            type: 'folder',
            tags: [],
            aliases: [],
            content: '<h1>Folder A</h1>'
          },
          {
            id: 'page-a',
            name: 'page-a.md',
            path: '/pages/page-a.md',
            title: 'Page A',
            parent: 'folder-a',
            order: 1,
            template: 'card',
            type: 'note',
            tags: [],
            aliases: [],
            content: '<h1>Page A</h1>'
          },
          {
            id: 'page-b',
            name: 'page-b.md',
            path: '/pages/page-b.md',
            title: 'Page B',
            parent: 'folder-a',
            order: 2,
            template: 'card',
            type: 'note',
            tags: [],
            aliases: [],
            content: '<h1>Page B</h1>'
          },
          {
            id: 'folder-b',
            name: 'folder-b.md',
            path: '/pages/folder-b.md',
            title: 'Folder B',
            parent: null,
            order: 2,
            template: 'card',
            type: 'folder',
            tags: [],
            aliases: [],
            content: '<h1>Folder B</h1>'
          }
        ];

        for (const candidate of pages) {

          files.set(
            candidate.path,
            createPageFile(
              candidate
            )
          );
        }

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
            writePaths.push(
              path
            );

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
            files.delete(
              path
            );
          },
          async removeDirectory() {}
        });

        setPages(
          pages
        );

        state.__treeDndUiTest =
          {
            files,
            writePaths
          };

        renderTree();
      }
    );

    const source =
      page.locator('.tree-item[data-page-id="page-b"] .tree-title');

    const target =
      page.locator('.tree-item[data-page-id="folder-b"]');

    const sourceBox =
      await source.boundingBox();

    const targetBox =
      await target.boundingBox();

    expect(
      sourceBox
    ).not.toBeNull();

    expect(
      targetBox
    ).not.toBeNull();

    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );

    await page.mouse.down();

    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      {
        steps:
          8
      }
    );

    await page.mouse.up();

    await expect(
      page.locator('.operation-progress')
    ).toBeVisible();

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'Перенос завершен'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const testState =
            state.__treeDndUiTest;

          return {
            pageB:
              state.pages.find(candidate =>
                candidate.id === 'page-b'
              ),
            writePaths:
              testState.writePaths,
            backupWrites:
              testState.writePaths.filter(path =>
                path.includes('.my-own-world-backups')
              ),
            journalWrites:
              testState.writePaths.filter(path =>
                path.includes('.my-own-world-ops')
              )
          };
        }
      );

    expect(
      result.pageB.parent
    ).toBe(
      'folder-b'
    );

    expect(
      result.writePaths
        .filter(path =>
          path === '/pages/page-b.md'
        )
        .length
    ).toBe(
      1
    );

    expect(
      result.backupWrites.length
    ).toBe(
      0
    );

    expect(
      result.journalWrites.length
    ).toBeGreaterThan(
      0
    );
  }
);


test(
  'tree-pointer-dnd-same-level-reorder-skips-backup-and-writes-one-page',
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
          renderTree
        } = await import('/js/tree/tree.js');

        const files =
          new Map();

        const writePaths =
          [];

        const createPageFile =
          page => `---
id: ${page.id}
title: ${page.title}
parent: ${page.parent ?? 'null'}
order: ${page.order}
template: card
type: note
aliases: []
tags: []
---

<h1>${page.title}</h1>
`;

        const pages = [
          {
            id: 'folder-a',
            name: 'folder-a.md',
            path: '/pages/folder-a.md',
            title: 'Folder A',
            parent: null,
            order: 1,
            template: 'card',
            type: 'folder',
            tags: [],
            aliases: [],
            content: '<h1>Folder A</h1>'
          },
          {
            id: 'page-a',
            name: 'page-a.md',
            path: '/pages/page-a.md',
            title: 'Page A',
            parent: 'folder-a',
            order: 1,
            template: 'card',
            type: 'note',
            tags: [],
            aliases: [],
            content: '<h1>Page A</h1>'
          },
          {
            id: 'page-b',
            name: 'page-b.md',
            path: '/pages/page-b.md',
            title: 'Page B',
            parent: 'folder-a',
            order: 2,
            template: 'card',
            type: 'note',
            tags: [],
            aliases: [],
            content: '<h1>Page B</h1>'
          }
        ];

        for (const candidate of pages) {

          files.set(
            candidate.path,
            createPageFile(
              candidate
            )
          );
        }

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
            writePaths.push(
              path
            );

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
            files.delete(
              path
            );
          },
          async removeDirectory() {}
        });

        setPages(
          pages
        );

        state.__treeDndReorderUiTest =
          {
            files,
            writePaths
          };

        renderTree();
      }
    );

    const source =
      page.locator('.tree-item[data-page-id="page-b"] .tree-title');

    const target =
      page.locator('.tree-item[data-page-id="page-a"]');

    const sourceBox =
      await source.boundingBox();

    const targetBox =
      await target.boundingBox();

    expect(
      sourceBox
    ).not.toBeNull();

    expect(
      targetBox
    ).not.toBeNull();

    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );

    await page.mouse.down();

    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + 2,
      {
        steps:
          8
      }
    );

    await page.mouse.up();

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const testState =
            state.__treeDndReorderUiTest;

          return {
            pageA:
              state.pages.find(candidate =>
                candidate.id === 'page-a'
              ),
            pageB:
              state.pages.find(candidate =>
                candidate.id === 'page-b'
              ),
            writePaths:
              testState.writePaths,
            backupWrites:
              testState.writePaths.filter(path =>
                path.includes('.my-own-world-backups')
              )
          };
        }
      );

    expect(
      result.pageB.parent
    ).toBe(
      'folder-a'
    );

    expect(
      result.pageB.order
    ).toBeLessThan(
      result.pageA.order
    );

    expect(
      result.writePaths
    ).toEqual(
      [
        '/pages/page-b.md'
      ]
    );

    expect(
      result.backupWrites
    ).toEqual(
      []
    );
  }
);
