import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginWorkspaceOperation,
  commitWorkspaceOperation,
  failWorkspaceOperation,
  listPendingWorkspaceOperations,
  OPERATION_JOURNAL_COMMITTED_DIR,
  OPERATION_JOURNAL_FAILED_DIR
} from '../js/storage/operationJournal.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  normalizeWorkspacePath
} from '../js/storage/storageAdapterContract.js';


test(
  'operation journal writes pending entry and commits it durably',
  async () => {

    const adapter =
      createMemoryAdapter();

    setStorageAdapter(
      adapter
    );

    const entry =
      await beginWorkspaceOperation({
        id: 'journal-test-create',
        type: 'create-page',
        affectedPages: [
          'page-1'
        ],
        before: {},
        after: {
          'page-1': {
            parent: null
          }
        }
      });

    assert.deepEqual(
      (await listPendingWorkspaceOperations(adapter)).map(item => item.id),
      [
        'journal-test-create'
      ]
    );

    await commitWorkspaceOperation(
      entry
    );

    assert.deepEqual(
      await listPendingWorkspaceOperations(adapter),
      []
    );

    assert.equal(
      JSON.parse(
        await adapter.readText(
          `${OPERATION_JOURNAL_COMMITTED_DIR}/journal-test-create.json`
        )
      ).status,
      'committed'
    );
  }
);


test(
  'operation journal keeps failed pending entry visible for recovery',
  async () => {

    const adapter =
      createMemoryAdapter();

    setStorageAdapter(
      adapter
    );

    const entry =
      await beginWorkspaceOperation({
        id: 'journal-test-fail',
        type: 'move-page-tree-position',
        affectedPages: [
          'page-2'
        ]
      });

    await failWorkspaceOperation(
      entry,
      new Error('write failed')
    );

    assert.deepEqual(
      (await listPendingWorkspaceOperations(adapter)).map(item => item.id),
      [
        'journal-test-fail'
      ]
    );

    const failed =
      JSON.parse(
        await adapter.readText(
          `${OPERATION_JOURNAL_FAILED_DIR}/journal-test-fail.json`
        )
      );

    assert.equal(
      failed.status,
      'failed'
    );

    assert.match(
      failed.error,
      /write failed/
    );
  }
);


function createMemoryAdapter() {

  const files =
    new Map();

  const directories =
    new Set([
      ''
    ]);

  return {
    kind: 'desktop',
    async pickWorkspace() {},
    async restoreWorkspace() {},
    async ensureDirectory(path) {

      ensureDirectoryPath(
        directories,
        normalizeWorkspacePath(
          path
        )
      );
    },
    async getDirectoryHandle(path) {

      return {
        kind: 'directory',
        path
      };
    },
    async readText(path) {

      const value =
        files.get(
          normalizeWorkspacePath(
            path
          )
        );

      if (value === undefined) {

        throw new Error(
          `missing ${path}`
        );
      }

      return value;
    },
    async writeText(path, content) {

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
    async readBinary() {

      return new ArrayBuffer(0);
    },
    async writeBinary() {},
    async listFiles(path = '') {

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
          directory.slice(
            prefix.length
          );

        if (!rest || rest.includes('/')) continue;

        entries.set(
          rest,
          'directory'
        );
      }

      for (const filePath of files.keys()) {

        if (!filePath.startsWith(prefix)) continue;

        const rest =
          filePath.slice(
            prefix.length
          );

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
    async removeFile(path) {

      files.delete(
        normalizeWorkspacePath(
          path
        )
      );
    },
    async removeDirectory(path) {

      directories.delete(
        normalizeWorkspacePath(
          path
        )
      );
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

  directories.add(
    current
  );

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

  const normalized =
    normalizeWorkspacePath(
      path
    );

  const index =
    normalized.lastIndexOf(
      '/'
    );

  return index === -1
    ? ''
    : normalized.slice(
      0,
      index
    );
}
