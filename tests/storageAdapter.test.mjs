import test from 'node:test';
import assert from 'node:assert/strict';

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
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  writePageContent
} from '../js/storage/writeQueue.js';

import {
  createWorkspaceBackup,
  restoreWorkspaceBackup
} from '../js/storage/backupService.js';


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

        convertFileSrc(path) {

          assert.equal(
            path,
            'C:\\World\\assets\\portraits\\hero.png'
          );

          return 'asset://localhost/C:/World/assets/portraits/hero.png';
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
        'asset://localhost/C:/World/assets/portraits/hero.png'
      );

    } finally {

      globalThis.__TAURI__ =
        previousTauri;
    }
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
