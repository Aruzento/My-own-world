import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanupIncompleteWorkspaceBackups,
  cleanupWorkspaceBackups,
  createBackupId,
  createBackupManifest,
  getBackupRetentionLimit,
  listIncompleteWorkspaceBackups,
  normalizeBackupRetentionLimit,
  requireWorkspaceBackupBeforeRiskyOperation,
  createWorkspaceBackup,
  restoreWorkspaceBackup,
  setBackupRetentionLimit
} from '../js/storage/backupService.js';


test(
  'createBackupId создает безопасное имя snapshot',
  () => {

    const id =
      createBackupId(
        'Delete Page Branch!',
        new Date('2026-06-01T10:20:30.000Z')
      );

    assert.equal(
      id,
      '2026-06-01T10-20-30-000Z-delete-page-branch'
    );
  }
);


test(
  'createBackupManifest сохраняет метаданные страниц',
  () => {

    const manifest =
      createBackupManifest({
        id: 'backup-1',
        reason: 'test',
        createdAt: '2026-06-01T10:20:30.000Z',
        pages: [
          {
            id: 'page-1',
            title: 'Остров',
            parent: null,
            type: 'location',
            template: 'card',
        name: 'page.md',
        path: '/pages/page.md'
      }
    ]
  });

    assert.equal(
      manifest.version,
      1
    );

    assert.equal(
      manifest.pageCount,
      1
    );

    assert.deepEqual(
      manifest.pages[0],
      {
        id: 'page-1',
        title: 'Остров',
        parent: null,
        type: 'location',
        template: 'card',
        name: 'page.md',
        path: '/pages/page.md'
      }
    );
  }
);


test(
  'backup и restore восстанавливают карточку, карту и таск-трекер',
  async () => {

    const workspace =
      new MemoryDirectoryHandle();

    const pages =
      [
        {
          id: 'card-1',
          title: 'Карточка',
          type: 'note',
          template: 'card',
          name: 'card.md',
          content: '<section data-card-shell="v1">old card</section>'
        },
        {
          id: 'map-1',
          title: 'Карта',
          type: 'campaignMap',
          template: 'campaignMap',
          name: 'map.md',
          content: '<section data-campaign-map-shell="v1"><script type="application/json" data-campaign-map-data>{"version":1,"tokens":[],"shapes":[]}</script></section>'
        },
        {
          id: 'tasks-1',
          title: 'Задачи',
          type: 'taskTracker',
          template: 'taskTracker',
          name: 'tasks.md',
          content: '<section data-task-tracker-shell="v1"><script type="application/json" data-task-tracker-data>{"version":1,"columns":[],"tasks":[]}</script></section>'
        }
      ];

    const manifest =
      await createWorkspaceBackup({
        workspaceHandle:
          workspace,
        pages,
        id:
          'backup-main',
        cleanup:
          false
      });

    assert.equal(
      manifest.pageCount,
      3
    );

    await writeWorkspacePage(
      workspace,
      'card.md',
      'broken card'
    );

    await writeWorkspacePage(
      workspace,
      'map.md',
      'broken map'
    );

    await writeWorkspacePage(
      workspace,
      'tasks.md',
      'broken tasks'
    );

    const result =
      await restoreWorkspaceBackup(
        'backup-main',
        workspace
      );

    assert.equal(
      result.restoredPages,
      3
    );

    assert.equal(
      await readWorkspacePage(
        workspace,
        'card.md'
      ),
      pages[0].content
    );

    assert.equal(
      await readWorkspacePage(
        workspace,
        'map.md'
      ),
      pages[1].content
    );

    assert.equal(
      await readWorkspacePage(
        workspace,
        'tasks.md'
      ),
      pages[2].content
    );
  }
);


test(
  'backup копирует и восстанавливает assets по AssetReference',
  async () => {

    const workspace =
      new MemoryDirectoryHandle();

    await writeWorkspaceAsset(
      workspace,
      'portraits/hero.png',
      'original-image'
    );

    const page =
      {
        id: 'hero',
        title: 'Герой',
        type: 'character',
        template: 'card',
        name: 'hero.md',
        content: '<div data-asset="portraits/hero.png"></div>'
      };

    const manifest =
      await createWorkspaceBackup({
        workspaceHandle:
          workspace,
        pages:
          [page],
        id:
          'backup-assets',
        cleanup:
          false
      });

    assert.equal(
      manifest.assetCount,
      1
    );

    await writeWorkspaceAsset(
      workspace,
      'portraits/hero.png',
      'changed-image'
    );

    const result =
      await restoreWorkspaceBackup(
        'backup-assets',
        workspace
      );

    assert.equal(
      result.restoredAssets,
      1
    );

    assert.equal(
      await readWorkspaceAsset(
        workspace,
        'portraits/hero.png'
      ),
      'original-image'
    );
  }
);


test(
  'risky-operation backup stores pages without blocking on assets',
  async () => {

    const workspace =
      new MemoryDirectoryHandle();

    const page =
      {
        id: 'map',
        title: 'Map',
        type: 'campaignMap',
        template: 'campaignMap',
        name: 'map.md',
        content: '<section data-map-asset="missing-huge-map.png"></section>'
      };

    await writeWorkspacePage(
      workspace,
      page.name,
      page.content
    );

    const manifest =
      await requireWorkspaceBackupBeforeRiskyOperation(
        'move-page-tree-position',
        {
          workspaceHandle:
            workspace,
          pages:
            [page],
          id:
            'risky-pages-only'
        }
      );

    assert.equal(
      manifest.pageCount,
      1
    );

    assert.equal(
      manifest.assetCount,
      0
    );

    const backupDir =
      await getBackupDirectory(
        workspace,
        'risky-pages-only'
      );

    await backupDir.getFileHandle(
      'manifest.json'
    );
  }
);


test(
  'cleanupWorkspaceBackups оставляет последние backup',
  async () => {

    const workspace =
      new MemoryDirectoryHandle();

    for (const id of ['backup-1', 'backup-2', 'backup-3']) {

      await createWorkspaceBackup({
        workspaceHandle:
          workspace,
        pages:
          [],
        id,
        cleanup:
          false
      });
    }

    const result =
      await cleanupWorkspaceBackups({
        workspaceHandle:
          workspace,
        keepLatest:
          2
      });

    assert.equal(
      result.removed,
      1
    );

    await assert.rejects(
      () => getBackupDirectory(
        workspace,
        'backup-1'
      )
    );

    await getBackupDirectory(
      workspace,
      'backup-2'
    );

    await getBackupDirectory(
      workspace,
      'backup-3'
    );
  }
);


test(
  'cleanupIncompleteWorkspaceBackups удаляет только backup без manifest',
  async () => {

    const workspace =
      new MemoryDirectoryHandle();

    await createWorkspaceBackup({
      workspaceHandle:
        workspace,
      pages:
        [],
      id:
        'backup-valid',
      cleanup:
        false
    });

    await createIncompleteBackupDirectory(
      workspace,
      'backup-broken'
    );

    const incomplete =
      await listIncompleteWorkspaceBackups({
        workspaceHandle:
          workspace
      });

    assert.deepEqual(
      incomplete.map(backup => backup.id),
      ['backup-broken']
    );

    assert.equal(
      incomplete[0].fileCount,
      1
    );

    const result =
      await cleanupIncompleteWorkspaceBackups({
        workspaceHandle:
          workspace,
        backupIds:
          [
            'backup-valid',
            'backup-broken'
          ]
      });

    assert.equal(
      result.removed,
      1
    );

    assert.equal(
      result.skipped,
      1
    );

    await getBackupDirectory(
      workspace,
      'backup-valid'
    );

    await assert.rejects(
      () => getBackupDirectory(
        workspace,
        'backup-broken'
      )
    );
  }
);


test(
  'backup retention settings normalize and persist the user limit',
  () => {

    const storage =
      new MemoryKeyValueStorage();

    assert.equal(
      normalizeBackupRetentionLimit(
        'bad'
      ),
      20
    );

    assert.equal(
      normalizeBackupRetentionLimit(
        0
      ),
      1
    );

    assert.equal(
      normalizeBackupRetentionLimit(
        999
      ),
      200
    );

    assert.equal(
      setBackupRetentionLimit(
        7,
        storage
      ),
      7
    );

    assert.equal(
      getBackupRetentionLimit(
        storage
      ),
      7
    );
  }
);


test(
  'required risky-operation backup blocks when snapshot cannot be created',
  async () => {

    await assert.rejects(
      () => requireWorkspaceBackupBeforeRiskyOperation(
        'delete-page-branch',
        {
          storageAdapter:
            createFailingStorageAdapter()
        }
      ),
      /Risky operation blocked/
    );
  }
);


async function writeWorkspacePage(
  workspace,
  fileName,
  content
) {

  const pagesDir =
    await workspace.getDirectoryHandle(
      'pages',
      {
        create: true
      }
    );

  await writeMemoryFile(
    await pagesDir.getFileHandle(
      fileName,
      {
        create: true
      }
    ),
    content
  );
}


async function readWorkspacePage(
  workspace,
  fileName
) {

  const pagesDir =
    await workspace.getDirectoryHandle(
      'pages'
    );

  const fileHandle =
    await pagesDir.getFileHandle(
      fileName
    );

  return (
    await fileHandle.getFile()
  ).text();
}


async function writeWorkspaceAsset(
  workspace,
  path,
  content
) {

  const assetsDir =
    await workspace.getDirectoryHandle(
      'assets',
      {
        create: true
      }
    );

  const fileHandle =
    await getNestedMemoryFileHandle(
      assetsDir,
      path,
      {
        create: true
      }
    );

  await writeMemoryFile(
    fileHandle,
    content
  );
}


async function readWorkspaceAsset(
  workspace,
  path
) {

  const assetsDir =
    await workspace.getDirectoryHandle(
      'assets'
    );

  const fileHandle =
    await getNestedMemoryFileHandle(
      assetsDir,
      path
    );

  return (
    await fileHandle.getFile()
  ).text();
}


async function getBackupDirectory(
  workspace,
  id
) {

  const root =
    await workspace.getDirectoryHandle(
      '.my-own-world-backups'
    );

  return root.getDirectoryHandle(
    id
  );
}


async function createIncompleteBackupDirectory(
  workspace,
  id
) {

  const root =
    await workspace.getDirectoryHandle(
      '.my-own-world-backups',
      {
        create: true
      }
    );

  const backupDir =
    await root.getDirectoryHandle(
      id,
      {
        create: true
      }
    );

  const pagesDir =
    await backupDir.getDirectoryHandle(
      'pages',
      {
        create: true
      }
    );

  await writeMemoryFile(
    await pagesDir.getFileHandle(
      'partial.md',
      {
        create: true
      }
    ),
    'partial backup'
  );
}


async function getNestedMemoryFileHandle(
  rootDir,
  path,
  options = {}
) {

  const parts =
    path
      .split('/')
      .filter(Boolean);

  let current =
    rootDir;

  for (const part of parts.slice(0, -1)) {

    current =
      await current.getDirectoryHandle(
        part,
        {
          create:
            Boolean(options.create)
        }
      );
  }

  return current.getFileHandle(
    parts.at(-1),
    options
  );
}


async function writeMemoryFile(
  fileHandle,
  content
) {

  const writable =
    await fileHandle.createWritable();

  await writable.write(
    content
  );

  await writable.close();
}


class MemoryDirectoryHandle {

  constructor(
    name = ''
  ) {

    this.kind =
      'directory';

    this.name =
      name;

    this.entries =
      new Map();
  }

  async getDirectoryHandle(
    name,
    options = {}
  ) {

    const existing =
      this.entries.get(
        name
      );

    if (existing?.kind === 'directory') return existing;

    if (!options.create) {

      throw new Error(
        `Directory not found: ${name}`
      );
    }

    const directory =
      new MemoryDirectoryHandle(
        name
      );

    this.entries.set(
      name,
      directory
    );

    return directory;
  }

  async getFileHandle(
    name,
    options = {}
  ) {

    const existing =
      this.entries.get(
        name
      );

    if (existing?.kind === 'file') return existing;

    if (!options.create) {

      throw new Error(
        `File not found: ${name}`
      );
    }

    const file =
      new MemoryFileHandle(
        name
      );

    this.entries.set(
      name,
      file
    );

    return file;
  }

  async removeEntry(
    name
  ) {

    if (!this.entries.has(name)) {

      throw new Error(
        `Entry not found: ${name}`
      );
    }

    this.entries.delete(
      name
    );
  }

  async *values() {

    for (const value of this.entries.values()) {

      yield value;
    }
  }
}


class MemoryFileHandle {

  constructor(
    name
  ) {

    this.kind =
      'file';

    this.name =
      name;

    this.content =
      '';
  }

  async getFile() {

    const content =
      this.content;

    return {
      async text() {

        if (content instanceof ArrayBuffer) {

          return new TextDecoder().decode(
            content
          );
        }

        return String(
          content
        );
      },
      async arrayBuffer() {

        if (content instanceof ArrayBuffer) {

          return content;
        }

        return new TextEncoder()
          .encode(
            String(content)
          )
          .buffer;
      }
    };
  }

  async createWritable() {

    return {
      write:
        async content => {

          this.content =
            content;
        },
      close:
        async () => {}
    };
  }
}


class MemoryKeyValueStorage {

  constructor() {

    this.values =
      new Map();
  }

  getItem(
    key
  ) {

    return this.values.has(
      key
    )
      ? this.values.get(
        key
      )
      : null;
  }

  setItem(
    key,
    value
  ) {

    this.values.set(
      key,
      String(value)
    );
  }
}


function createFailingStorageAdapter() {

  return {
    kind:
      'desktop',
    getWorkspaceRoot:
      () => 'X:/world',
    async ensureDirectory() {

      throw new Error(
        'disk full'
      );
    },
    async listFiles() {

      return [];
    },
    async readText() {

      throw new Error(
        'not implemented'
      );
    },
    async writeText() {

      throw new Error(
        'not implemented'
      );
    },
    async readBinary() {

      throw new Error(
        'not implemented'
      );
    },
    async writeBinary() {

      throw new Error(
        'not implemented'
      );
    },
    async removeFile() {},
    async removeDirectory() {},
    async restoreWorkspace() {}
  };
}
