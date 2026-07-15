import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync
} from 'node:fs';

import {
  assertStorageAdapterContract,
  normalizeWorkspacePath,
  REQUIRED_STORAGE_ADAPTER_METHODS
} from '../js/storage/storageAdapterContract.js';

import {
  assertAssetAdapterContract,
  REQUIRED_ASSET_ADAPTER_METHODS
} from '../js/storage/assetAdapterContract.js';

import {
  createDesktopStorageAdapter
} from '../js/storage/desktopStorageAdapter.js';

import {
  createDesktopAssetAdapter
} from '../js/storage/desktopAssetAdapter.js';

import {
  normalizeTauriCommandError
} from '../js/storage/tauriBridge.js';

import {
  createBrowserAssetAdapter
} from '../js/storage/browserAssetAdapter.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  setAssetAdapter,
  syncAssetAdapterWorkspaceRoot
} from '../js/storage/assetAdapter.js';

import {
  compactTreeOrderForParent,
  deletePageBranch,
  scheduleTreeOrderCompaction,
  updatePageTreePosition,
  updatePageTreePositions
} from '../js/storage/pageStorage.js';

import {
  writePageContent
} from '../js/storage/writeQueue.js';

import {
  createWorkspaceBackup,
  restoreWorkspaceBackup
} from '../js/storage/backupService.js';

import {
  createMissingAssetPlaceholderURL,
  getRenderableImageURL
} from '../js/storage/assetStorage.js';

import {
  clearWorkspacePerformanceEvents,
  getWorkspacePerformanceEvents
} from '../js/performance/workspacePerformance.js';

import {
  clearBackgroundCheckpointQueue,
  flushBackgroundCheckpoints,
  getBackgroundCheckpointSnapshot
} from '../js/performance/backgroundCheckpointQueue.js';


test(
  'StorageAdapter contract requires the full public API',
  () => {

    const adapter =
      Object.fromEntries(
        REQUIRED_STORAGE_ADAPTER_METHODS.map(
          methodName => [
            methodName,
            () => {}
          ]
        )
      );

    assert.equal(
      assertStorageAdapterContract(adapter),
      adapter
    );

    assert.throws(
      () => assertStorageAdapterContract({}),
      /pickWorkspace/
    );
  }
);


test(
  'Tauri structured command errors keep code and path on JS Error',
  () => {

    const error =
      normalizeTauriCommandError({
        code:
          'desktop.path_outside_workspace',
        message:
          'Path points outside workspace.',
        path:
          'C:/World/../secret.md'
      });

    assert.equal(
      error.message,
      'Path points outside workspace.'
    );

    assert.equal(
      error.code,
      'desktop.path_outside_workspace'
    );

    assert.equal(
      error.path,
      'C:/World/../secret.md'
    );
  }
);


test(
  'normalizeWorkspacePath keeps paths workspace-relative',
  () => {

    assert.equal(
      normalizeWorkspacePath('\\pages//card.md'),
      'pages/card.md'
    );

    assert.equal(
      normalizeWorkspacePath('/assets/token.png'),
      'assets/token.png'
    );
  }
);


test(
  'DesktopStorageAdapter exposes root state without invoking Tauri during construction',
  () => {

    const adapter =
      createDesktopStorageAdapter({
        workspaceRoot: 'C:/World'
      });

    assert.equal(
      adapter.kind,
      'desktop'
    );

    assert.equal(
      adapter.getWorkspaceRoot(),
      'C:/World'
    );

    adapter.setWorkspaceRoot(
      'D:/Campaign'
    );

    assert.equal(
      adapter.getWorkspaceRoot(),
      'D:/Campaign'
    );
  }
);


test(
  'DesktopStorageAdapter выбирает workspace через глобальный Tauri dialog API',
  async () => {

    const previousTauri =
      globalThis.__TAURI__;

    const previousLocalStorage =
      globalThis.localStorage;

    const storage =
      new Map();

    globalThis.localStorage = {
      getItem(key) {

        return storage.get(key) || null;
      },

      setItem(key, value) {

        storage.set(
          key,
          String(value)
        );
      }
    };

    globalThis.__TAURI__ = {
      dialog: {
        async open(options) {

          assert.equal(
            options.directory,
            true
          );

          return 'C:/World/Desktop';
        }
      },
      core: {
        async invoke() {

          throw new Error(
            'Файловые команды не нужны для выбора workspace.'
          );
        }
      }
    };

    try {

      const adapter =
        createDesktopStorageAdapter();

      const selected =
        await adapter.pickWorkspace();

      assert.equal(
        selected,
        'C:/World/Desktop'
      );

      assert.equal(
        adapter.getWorkspaceRoot(),
        'C:/World/Desktop'
      );

    } finally {

      globalThis.__TAURI__ =
        previousTauri;

      globalThis.localStorage =
        previousLocalStorage;
    }
  }
);


test(
  'AssetAdapter contract requires asset lifecycle methods',
  () => {

    const adapter =
      Object.fromEntries(
        REQUIRED_ASSET_ADAPTER_METHODS.map(
          methodName => [
            methodName,
            () => {}
          ]
        )
      );

    assert.equal(
      assertAssetAdapterContract(adapter),
      adapter
    );

    assert.throws(
      () => assertAssetAdapterContract({}),
      /importFile/
    );
  }
);


test(
  'DesktopAssetAdapter превращает absolute path в Tauri asset URL',
  async () => {

    const previousTauri =
      globalThis.__TAURI__;

    globalThis.__TAURI__ = {
      core: {
        async invoke(command, payload) {

          assert.equal(
            command,
            'resolve_asset_url'
          );

          assert.equal(
            payload.path,
            'assets/portraits/hero.png'
          );

          return 'C:\\World\\assets\\portraits\\hero.png';
        },

        convertFileSrc(path, protocol) {

          assert.equal(
            path,
            'C:\\World\\assets\\portraits\\hero.png'
          );

          assert.equal(
            protocol,
            'asset'
          );

          return 'http://asset.localhost/C%3A%5CWorld%5Cassets%5Cportraits%5Chero.png';
        }
      }
    };

    try {

      setStorageAdapter(
        createMemoryStorageAdapter()
      );

      const adapter =
        createDesktopAssetAdapter({
          workspaceRoot: 'C:/World'
        });

      const url =
        await adapter.resolveUrl(
          'portraits/hero.png'
        );

      assert.equal(
        url,
        'http://asset.localhost/C%3A%5CWorld%5Cassets%5Cportraits%5Chero.png'
      );

    } finally {

      globalThis.__TAURI__ =
        previousTauri;
    }
  }
);


test(
  'DesktopAssetAdapter использует внутренний Tauri asset converter, если global API не отдал convertFileSrc',
  async () => {

    const previousTauri =
      globalThis.__TAURI__;

    const previousInternals =
      globalThis.__TAURI_INTERNALS__;

    globalThis.__TAURI__ = {
      core: {
        async invoke(command) {

          assert.equal(
            command,
            'resolve_asset_url'
          );

          return 'C:\\World\\assets\\maps\\castle.png';
        }
      }
    };

    globalThis.__TAURI_INTERNALS__ = {
      convertFileSrc(path, protocol) {

        assert.equal(
          path,
          'C:\\World\\assets\\maps\\castle.png'
        );

        assert.equal(
          protocol,
          'asset'
        );

        return 'http://asset.localhost/C%3A%5CWorld%5Cassets%5Cmaps%5Ccastle.png';
      }
    };

    try {

      setStorageAdapter(
        createMemoryStorageAdapter()
      );

      const adapter =
        createDesktopAssetAdapter({
          workspaceRoot: 'C:/World'
        });

      const url =
        await adapter.resolveUrl(
          'maps/castle.png'
        );

      assert.equal(
        url,
        'http://asset.localhost/C%3A%5CWorld%5Cassets%5Cmaps%5Ccastle.png'
      );

    } finally {

      globalThis.__TAURI__ =
        previousTauri;

      globalThis.__TAURI_INTERNALS__ =
        previousInternals;
    }
  }
);


test(
  'DesktopAssetAdapter обновляет workspace root после выбора desktop workspace',
  async () => {

    const previousTauri =
      globalThis.__TAURI__;

    const invokedPayloads =
      [];

    globalThis.__TAURI__ = {
      core: {
        async invoke(command, payload) {

          invokedPayloads.push(
            payload
          );

          assert.equal(
            command,
            'resolve_asset_url'
          );

          return `${payload.workspaceRoot}\\${payload.path.replaceAll('/', '\\')}`;
        },

        convertFileSrc(path, protocol) {

          assert.equal(
            protocol,
            'asset'
          );

          return `asset:${path}`;
        }
      }
    };

    try {

      setStorageAdapter(
        createMemoryStorageAdapter()
      );

      const adapter =
        createDesktopAssetAdapter({
          workspaceRoot: 'C:/OldWorld'
        });

      setAssetAdapter(
        adapter
      );

      syncAssetAdapterWorkspaceRoot.call(
        null,
        'C:/NewWorld'
      );

      await adapter.resolveUrl(
        'portraits/hero.png'
      );

      assert.equal(
        invokedPayloads.at(-1).workspaceRoot,
        'C:/NewWorld'
      );

    } finally {

      globalThis.__TAURI__ =
        previousTauri;
    }
  }
);


test(
  'Tauri CSP allows audio playback from asset protocol',
  () => {

    const config =
      JSON.parse(
        readFileSync(
          new URL(
            '../src-tauri/tauri.conf.json',
            import.meta.url
          ),
          'utf8'
        )
      );

    const csp =
      config.app?.security?.csp || '';

    assert.match(
      csp,
      /media-src[^;]*asset:/
    );

    assert.match(
      csp,
      /media-src[^;]*http:\/\/asset\.localhost/
    );
  }
);


test(
  'AssetAdapter importFile can skip immediate URL resolving for audio playlist imports',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const assetAdapter =
      createBrowserAssetAdapter();

    const file =
      new File(
        [
          new Uint8Array([
            1,
            2,
            3
          ])
        ],
        'battle.mp3',
        {
          type:
            'audio/mpeg'
        }
      );

    const asset =
      await assetAdapter.importFile(
        file,
        {
          filename:
            'music/battle.mp3',
          resolveUrl:
            false
        }
      );

    assert.equal(
      asset.path,
      'music/battle.mp3'
    );

    assert.equal(
      asset.url,
      ''
    );

    assert.deepEqual(
      Array.from(
        new Uint8Array(
          await adapter.readBinary(
            'assets/music/battle.mp3'
          )
        )
      ),
      [
        1,
        2,
        3
      ]
    );
  }
);


test(
  'getRenderableImageURL возвращает data URL, если primary asset URL не отрисовался',
  async () => {

    const previousImage =
      globalThis.Image;

    const adapter =
      createMemoryStorageAdapter();

    await adapter.writeBinary(
      'assets/portraits/hero.png',
      new Uint8Array([
        137,
        80,
        78,
        71
      ]).buffer
    );

    setStorageAdapter(
      adapter
    );

    setAssetAdapter({
      kind: 'broken-primary',

      async importFile() {},

      async resolveUrl() {

        return 'asset://broken/portraits/hero.png';
      },

      async exists() {

        return true;
      },

      async remove() {},

      async findOrphans() {

        return [];
      }
    });

    globalThis.Image =
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

    try {

      const url =
        await getRenderableImageURL(
          'portraits/hero.png'
        );

      assert.equal(
        url,
        'data:image/png;base64,iVBORw=='
      );

    } finally {

      globalThis.Image =
        previousImage;
    }
  }
);


test(
  'getRenderableImageURL returns visible missing placeholder when asset file is absent',
  async () => {

    const previousImage =
      globalThis.Image;

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    setAssetAdapter({
      kind: 'broken-primary',

      async importFile() {},

      async resolveUrl() {

        return 'asset://broken/portraits/missing.png';
      },

      async exists() {

        return false;
      },

      async remove() {},

      async findOrphans() {

        return [];
      }
    });

    globalThis.Image =
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

    try {

      const url =
        await getRenderableImageURL(
          'portraits/missing.png'
        );

      assert.match(
        url,
        /^data:image\/svg\+xml;base64,/
      );

    } finally {

      globalThis.Image =
        previousImage;
    }
  }
);


test(
  'createMissingAssetPlaceholderURL creates a renderable svg data url',
  () => {

    assert.match(
      createMissingAssetPlaceholderURL(
        'assets/missing.png'
      ),
      /^data:image\/svg\+xml;base64,/
    );
  }
);


test(
  'writePageContent пишет desktop-style страницу через StorageAdapter path',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const page =
      {
        id: 'page-1',
        path: '/pages/card.md',
        name: 'card.md',
        content: 'old'
      };

    await writePageContent(
      page,
      'new content'
    );

    assert.equal(
      await adapter.readText('/pages/card.md'),
      'new content'
    );
  }
);


test(
  'deletePageBranch removes stale page records when file is already missing',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    adapter.removeFile =
      async () => {

        const error =
          new Error('File was not found.');

        error.code =
          'desktop.file_not_found';

        throw error;
      };

    setStorageAdapter(
      adapter
    );

    const page =
      {
        id: 'stale-page',
        path: '/pages/missing.md',
        name: 'missing.md',
        parent: null,
        title: 'Stale Page',
        type: 'note',
        template: 'card',
        tags: [],
        aliases: [],
        content: '<h1>Stale Page</h1>'
      };

    setPages([
      page
    ]);

    await deletePageBranch(
      page
    );

    const {
      state
    } =
      await import('../js/state.js');

    assert.deepEqual(
      state.pages,
      []
    );
  }
);


test(
  'deletePageBranch removes page record by id even when caller has stale object',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    await adapter.writeText(
      '/pages/stale-object.md',
      '<h1>Old Object</h1>'
    );

    const statePage =
      {
        id: 'stale-object-page',
        path: '/pages/stale-object.md',
        name: 'stale-object.md',
        parent: null,
        title: 'Old Object',
        type: 'note',
        template: 'card',
        tags: [],
        aliases: [],
        content: '<h1>Old Object</h1>'
      };

    const menuPageSnapshot =
      {
        ...statePage
      };

    setPages([
      statePage
    ]);

    await deletePageBranch(
      menuPageSnapshot
    );

    const {
      state
    } =
      await import('../js/state.js');

    assert.deepEqual(
      state.pages,
      []
    );
  }
);


test(
  'deletePageBranch backs up only the deleted branch pages',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const pages =
      [
        {
          id: 'delete-root',
          path: '/pages/delete-root.md',
          name: 'delete-root.md',
          parent: null,
          order: 1,
          title: 'Delete Root',
          type: 'note',
          template: 'card',
          tags: [],
          aliases: [],
          content: '<h1>Delete Root</h1>'
        },
        {
          id: 'delete-child',
          path: '/pages/delete-child.md',
          name: 'delete-child.md',
          parent: 'delete-root',
          order: 2,
          title: 'Delete Child',
          type: 'note',
          template: 'card',
          tags: [],
          aliases: [],
          content: '<h1>Delete Child</h1>'
        },
        {
          id: 'unrelated',
          path: '/pages/unrelated.md',
          name: 'unrelated.md',
          parent: null,
          order: 3,
          title: 'Unrelated',
          type: 'note',
          template: 'card',
          tags: [],
          aliases: [],
          content: '<h1>Unrelated</h1>'
        }
      ];

    for (const page of pages) {

      await adapter.writeText(
        page.path,
        page.content
      );
    }

    setPages(
      pages
    );

    await deletePageBranch(
      pages[0]
    );

    const backupEntries =
      await adapter.listFiles(
        '.my-own-world-backups'
      );

    assert.equal(
      backupEntries.length,
      1
    );

    const manifest =
      JSON.parse(
        await adapter.readText(
          `.my-own-world-backups/${backupEntries[0].name}/manifest.json`
        )
      );

    assert.equal(
      manifest.pageCount,
      2
    );

    assert.deepEqual(
      manifest.pages.map(page => page.id).sort(),
      [
        'delete-child',
        'delete-root'
      ]
    );

    await assert.rejects(
      () => adapter.readText(
        `.my-own-world-backups/${backupEntries[0].name}/pages/unrelated.md`
      )
    );

    assert.equal(
      await adapter.readText('/pages/unrelated.md'),
      '<h1>Unrelated</h1>'
    );
  }
);


test(
  'deletePageBranch removes a large nested branch without quadratic tree scan',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const pages =
      [];

    const pageCount =
      750;

    for (
      let index = 0;
      index < pageCount;
      index += 1
    ) {

      const id =
        `large-branch-${index}`;

      const parent =
        index === 0
          ? null
          : `large-branch-${index - 1}`;

      const path =
        `/pages/${id}.md`;

      const content =
        `---
id: ${id}
parent: ${parent ?? 'null'}
order: ${index}
tags: [card]
template: card
type: note
aliases: []
---

<h1>${id}</h1>
`;

      await adapter.writeText(
        path,
        content
      );

      pages.push({
        id,
        path,
        name: `${id}.md`,
        parent,
        order: index,
        title: id,
        type: 'note',
        template: 'card',
        tags: ['card'],
        aliases: [],
        content
      });
    }

    setPages(
      pages
    );

    const progressEvents =
      [];

    clearWorkspacePerformanceEvents();

    await deletePageBranch(
      {
        ...pages[0]
      },
      {
        onProgress:
          progressEvents.push.bind(
            progressEvents
          )
      }
    );

    const {
      state
    } =
      await import('../js/state.js');

    assert.deepEqual(
      state.pages,
      []
    );

    assert.ok(
      progressEvents.some(progress =>
        progress.label === 'Удаление' &&
        progress.current === pageCount &&
        Number.isFinite(progress.elapsedMs)
      )
    );

    assert.ok(
      getWorkspacePerformanceEvents().some(event =>
        event.operation === 'tree.deleteBranch' &&
        event.counts.pages === pageCount
      )
    );
  }
);


test(
  'updatePageTreePosition writes through the live page when caller has stale object',
  async () => {

    const writes =
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
      async readText() {
        return '';
      },
      async writeText(path, content) {
        writes.push({
          path,
          content:
            String(content)
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

    setPages([
      {
        id: 'move-me',
        name: 'move-me.md',
        path: '/pages/move-me.md',
        order: 1,
        parent: null,
        title: 'Move me',
        template: 'card',
        type: 'note',
        tags: ['card'],
        aliases: [],
        content: `---
id: move-me
parent: null
order: 1
tags: [card]
template: card
type: note
aliases: []
---

<h1>Move me</h1>
`
      }
    ]);

    const {
      state
    } = await import('../js/state.js');

    const staleSnapshot = {
      ...state.pages[0],
      path: '/pages/stale.md',
      content: `---
id: move-me
parent: stale-parent
order: 999
tags: [card]
template: card
type: note
aliases: []
---

<h1>Stale</h1>
`
    };

    await updatePageTreePosition(
      staleSnapshot,
      'new-parent',
      42
    );

    const pageWrites =
      writes.filter(write =>
        write.path === '/pages/move-me.md'
      );

    assert.equal(
      pageWrites.length,
      1
    );

    assert.match(
      pageWrites[0].content,
      /parent:\s*new-parent/
    );

    assert.match(
      pageWrites[0].content,
      /order:\s*42/
    );

    assert.equal(
      state.pages[0].parent,
      'new-parent'
    );

    assert.equal(
      state.pages[0].order,
      42
    );
  }
);


test(
  'single parent-changing tree move uses operation journal without full backup',
  async () => {

    clearBackgroundCheckpointQueue();

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const page = {
      id: 'single-move',
      name: 'single-move.md',
      path: '/pages/single-move.md',
      parent: null,
      order: 1,
      title: 'Single move',
      template: 'card',
      type: 'note',
      tags: ['card'],
      aliases: [],
      content: `---
id: single-move
parent: null
order: 1
tags: [card]
template: card
type: note
aliases: []
---

<h1>Single move</h1>
`
    };

    await adapter.writeText(
      page.path,
      page.content
    );

    setPages([
      page
    ]);

    await updatePageTreePosition(
      page,
      'new-parent',
      25
    );

    const backupEntries =
      await adapter.listFiles(
        '.my-own-world-backups'
      );

    assert.equal(
      backupEntries.length,
      0
    );

    const committedEntries =
      await adapter.listFiles(
        '.my-own-world-ops/committed'
      );

    assert.equal(
      committedEntries.filter(entry =>
        entry.kind === 'file'
      ).length,
      1
    );

    assert.match(
      await adapter.readText('/pages/single-move.md'),
      /parent:\s*new-parent/
    );

    assert.equal(
      page.parent,
      'new-parent'
    );

    assert.equal(
      getBackgroundCheckpointSnapshot().queued.length,
      1
    );

    await flushBackgroundCheckpoints();

    assert.equal(
      getBackgroundCheckpointSnapshot().recent[0].status,
      'completed'
    );
  }
);


test(
  'updatePageTreePositions batches tree writes behind one risky-operation backup',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const pages =
      [
        {
          id: 'batch-a',
          name: 'batch-a.md',
          path: '/pages/batch-a.md',
          parent: null,
          order: 1,
          title: 'Batch A',
          template: 'card',
          type: 'note',
          tags: ['card'],
          aliases: [],
          content: `---
id: batch-a
parent: null
order: 1
tags: [card]
template: card
type: note
aliases: []
---

<h1>Batch A</h1>
`
        },
        {
          id: 'batch-b',
          name: 'batch-b.md',
          path: '/pages/batch-b.md',
          parent: null,
          order: 2,
          title: 'Batch B',
          template: 'card',
          type: 'note',
          tags: ['card'],
          aliases: [],
          content: `---
id: batch-b
parent: null
order: 2
tags: [card]
template: card
type: note
aliases: []
---

<h1>Batch B</h1>
`
        }
      ];

    for (const page of pages) {

      await adapter.writeText(
        page.path,
        page.content
      );
    }

    setPages(
      pages
    );

    const progressEvents =
      [];

    clearWorkspacePerformanceEvents();

    await updatePageTreePositions(
      [
        {
          page: pages[0],
          parentId: 'new-parent',
          order: 10
        },
        {
          page: pages[1],
          parentId: 'new-parent',
          order: 20
        }
      ],
      {
        onProgress:
          progressEvents.push.bind(
            progressEvents
          )
      }
    );

    const backupEntries =
      await adapter.listFiles(
        '.my-own-world-backups'
      );

    assert.equal(
      backupEntries.filter(entry =>
        entry.kind === 'directory'
      ).length,
      1
    );

    assert.match(
      await adapter.readText('/pages/batch-a.md'),
      /parent:\s*new-parent/
    );

    assert.match(
      await adapter.readText('/pages/batch-b.md'),
      /order:\s*20/
    );

    assert.ok(
      progressEvents.some(progress =>
        progress.label === 'Перенос' &&
        progress.current === 2 &&
        progress.total === 2 &&
        Number.isFinite(progress.elapsedMs)
      )
    );

    assert.ok(
      getWorkspacePerformanceEvents().some(event =>
        event.operation === 'tree.moveBatch' &&
        event.counts.changedPages === 2
      )
    );
  }
);


test(
  'tree order compaction rewrites one sibling set in the background without full backup',
  async () => {

    clearBackgroundCheckpointQueue();

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const pages =
      [
        createTreePage(
          'compact-a',
          'parent',
          1
        ),
        createTreePage(
          'compact-b',
          'parent',
          1.0000000001
        ),
        createTreePage(
          'compact-c',
          'parent',
          2
        ),
        createTreePage(
          'compact-other',
          'other-parent',
          1.00000000001
        )
      ];

    for (const page of pages) {

      await adapter.writeText(
        page.path,
        page.content
      );
    }

    setPages(
      pages
    );

    const scheduled =
      scheduleTreeOrderCompaction({
        parentId:
          'parent',
        reason:
          'test-dense-tree-order'
      });

    assert.equal(
      scheduled.scheduled,
      true
    );

    await flushBackgroundCheckpoints();

    assert.match(
      await adapter.readText('/pages/compact-a.md'),
      /order:\s*1000/
    );

    assert.match(
      await adapter.readText('/pages/compact-b.md'),
      /order:\s*2000/
    );

    assert.match(
      await adapter.readText('/pages/compact-c.md'),
      /order:\s*3000/
    );

    assert.match(
      await adapter.readText('/pages/compact-other.md'),
      /order:\s*1\.00000000001/
    );

    const backupEntries =
      await adapter.listFiles(
        '.my-own-world-backups'
      );

    assert.equal(
      backupEntries.length,
      0
    );

    assert.equal(
      getBackgroundCheckpointSnapshot().recent[0].status,
      'completed'
    );

    assert.equal(
      getBackgroundCheckpointSnapshot().recent[0].result.changedPages,
      3
    );
  }
);


test(
  'manual tree order compaction reports no-op for healthy siblings',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    setPages(
      [
        createTreePage(
          'healthy-a',
          null,
          1000
        ),
        createTreePage(
          'healthy-b',
          null,
          2000
        )
      ]
    );

    const result =
      await compactTreeOrderForParent(
        null
      );

    assert.equal(
      result.needed,
      false
    );

    assert.equal(
      result.changedPages,
      0
    );
  }
);

test(
  'backup и restore работают через чистый StorageAdapter без FileSystemHandle',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    await adapter.writeText(
      '/pages/card.md',
      'before'
    );

    await adapter.writeBinary(
      '/assets/portraits/hero.png',
      new TextEncoder().encode(
        'image-before'
      ).buffer
    );

    const manifest =
      await createWorkspaceBackup({
        storageAdapter:
          adapter,
        pages: [
          {
            id: 'card-1',
            title: 'Карточка',
            type: 'character',
            template: 'card',
            name: 'card.md',
            path: '/pages/card.md',
            content: '<div data-asset="portraits/hero.png">before</div>'
          }
        ],
        id: 'backup-adapter',
        cleanup: false
      });

    assert.equal(
      manifest.assetCount,
      1
    );

    await adapter.writeText(
      '/pages/card.md',
      'after'
    );

    await adapter.writeBinary(
      '/assets/portraits/hero.png',
      new TextEncoder().encode(
        'image-after'
      ).buffer
    );

    const result =
      await restoreWorkspaceBackup(
        'backup-adapter',
        adapter
      );

    assert.equal(
      result.restoredPages,
      1
    );

    assert.equal(
      result.restoredAssets,
      1
    );

    assert.equal(
      await adapter.readText('/pages/card.md'),
      '<div data-asset="portraits/hero.png">before</div>'
    );

    assert.equal(
      new TextDecoder().decode(
        await adapter.readBinary(
          '/assets/portraits/hero.png'
        )
      ),
      'image-before'
    );
  }
);


function createTreePage(
  id,
  parent,
  order
) {

  const content =
`---
id: ${id}
parent: ${parent ?? 'null'}
order: ${order}
tags: [card]
template: card
type: note
aliases: []
---

<h1>${id}</h1>
`;

  return {
    id,
    path:
      `/pages/${id}.md`,
    name:
      `${id}.md`,
    parent,
    order,
    title:
      id,
    type:
      'note',
    template:
      'card',
    tags:
      [
        'card'
      ],
    aliases:
      [],
    content
  };
}


function createMemoryStorageAdapter() {

  const files =
    new Map();

  const directories =
    new Set([
      ''
    ]);

  return {
    kind: 'desktop',

    getWorkspaceRoot() {

      return 'memory-workspace';
    },

    async pickWorkspace() {

      return 'memory-workspace';
    },

    async restoreWorkspace() {

      return 'memory-workspace';
    },

    async ensureDirectory(
      path
    ) {

      ensureDirectoryPath(
        directories,
        normalizeWorkspacePath(
          path
        )
      );
    },

    async getDirectoryHandle(
      path
    ) {

      return {
        kind: 'directory',
        path: normalizeWorkspacePath(
          path
        )
      };
    },

    async readText(
      path
    ) {

      const value =
        files.get(
          normalizeWorkspacePath(
            path
          )
        );

      if (value === undefined) {

        throw new Error(
          `Файл не найден: ${path}`
        );
      }

      return typeof value === 'string'
        ? value
        : new TextDecoder().decode(
          value
        );
    },

    async writeText(
      path,
      content
    ) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      ensureDirectoryPath(
        directories,
        getParentPath(
          normalized
        )
      );

      files.set(
        normalized,
        String(content)
      );
    },

    async readBinary(
      path
    ) {

      const value =
        files.get(
          normalizeWorkspacePath(
            path
          )
        );

      if (value === undefined) {

        throw new Error(
          `Файл не найден: ${path}`
        );
      }

      return typeof value === 'string'
        ? new TextEncoder().encode(value).buffer
        : value;
    },

    async writeBinary(
      path,
      content
    ) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      ensureDirectoryPath(
        directories,
        getParentPath(
          normalized
        )
      );

      files.set(
        normalized,
        content
      );
    },

    async listFiles(
      path = ''
    ) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      const prefix =
        normalized
          ? `${normalized}/`
          : '';

      const entries =
        new Map();

      for (const directory of directories) {

        if (!directory.startsWith(prefix)) continue;

        const rest =
          directory.slice(prefix.length);

        if (!rest || rest.includes('/')) continue;

        entries.set(
          rest,
          'directory'
        );
      }

      for (const filePath of files.keys()) {

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
    },

    async removeFile(
      path
    ) {

      files.delete(
        normalizeWorkspacePath(
          path
        )
      );
    },

    async removeDirectory(
      path
    ) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      for (const filePath of [...files.keys()]) {

        if (
          filePath === normalized ||
          filePath.startsWith(`${normalized}/`)
        ) {

          files.delete(
            filePath
          );
        }
      }

      for (const directory of [...directories]) {

        if (
          directory === normalized ||
          directory.startsWith(`${normalized}/`)
        ) {

          directories.delete(
            directory
          );
        }
      }
    }
  };
}


function ensureDirectoryPath(
  directories,
  path
) {

  const parts =
    normalizeWorkspacePath(
      path
    )
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
}


function getParentPath(
  path
) {

  const parts =
    normalizeWorkspacePath(
      path
    )
      .split('/');

  parts.pop();

  return parts.join('/');
}
