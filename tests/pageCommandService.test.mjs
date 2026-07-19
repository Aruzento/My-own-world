import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setPages
} from '../js/stateActions.js';

import {
  state
} from '../js/state.js';

import {
  clearBackgroundCheckpointQueue,
  flushBackgroundCheckpoints
} from '../js/performance/backgroundCheckpointQueue.js';

import {
  clearPageCommandEvents,
  clearPageUndoEntries,
  executePageCommand,
  getPageCommandEvents,
  getPageUndoEntries,
  persistPageContentCommand,
  snapshotPageForCommand,
  undoLastPageCommand
} from '../js/storage/pageCommandService.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  createPage,
  deletePageBranch,
  updatePageAliases,
  updatePageTreePosition,
  updatePageTreePositions
} from '../js/storage/pageStorage.js';

import {
  normalizeWorkspacePath
} from '../js/storage/storageAdapterContract.js';

import {
  clearWriteRevisions
} from '../js/storage/writeQueue.js';


test(
  'PageCommandService runs phases and calls rollback on failure',
  async () => {

    clearPageCommandEvents();

    const calls =
      [];

    await assert.rejects(
      () => executePageCommand({
        type:
          'test-command',
        affectedPages:
          [
            'page-a'
          ],
        validate() {
          calls.push('validate');
        },
        createRollback() {
          calls.push('createRollback');
          return {
            before:
              'snapshot'
          };
        },
        persist() {
          calls.push('persist');
          throw new Error('persist failed');
        },
        rollback(
          error,
          context
        ) {
          calls.push(
            `rollback:${context.rollbackData.before}:${error.message}`
          );
        }
      }),
      /persist failed/
    );

    assert.deepEqual(
      calls,
      [
        'validate',
        'createRollback',
        'persist',
        'rollback:snapshot:persist failed'
      ]
    );

    const events =
      getPageCommandEvents();

    assert.equal(
      events.length,
      1
    );

    assert.equal(
      events[0].status,
      'failed'
    );

    assert.deepEqual(
      events[0].phases,
      [
        'validate',
        'createRollback',
        'persist',
        'rollback'
      ]
    );
  }
);


test(
  'page create move batch aliases and delete route through PageCommandService',
  async () => {

    clearPageCommandEvents();
    clearPageUndoEntries();
    clearBackgroundCheckpointQueue();

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    setPages([]);

    const parent =
      createTestPage(
        'parent',
        null,
        1000
      );

    const child =
      createTestPage(
        'child',
        'parent',
        1000
      );

    const sibling =
      createTestPage(
        'sibling',
        'parent',
        2000
      );

    for (const page of [
      parent,
      child,
      sibling
    ]) {

      await adapter.writeText(
        page.path,
        page.content
      );
    }

    setPages([
      parent,
      child,
      sibling
    ]);

    await createPage(
      'card',
      'parent'
    );

    await updatePageTreePosition(
      child,
      'parent',
      1500
    );

    const movedChildContent =
      await adapter.readText(
        child.path
      );

    assert.match(
      movedChildContent,
      /^customMeta: keep-child$/m
    );

    assert.match(
      movedChildContent,
      /^schemaVersion: 1$/m
    );

    assert.match(
      movedChildContent,
      /^updatedAt: .+Z$/m
    );

    assert.match(
      movedChildContent,
      /^contentHash: fnv1a32:[0-9a-f]{8}$/m
    );

    await updatePageTreePositions([
      {
        page:
          child,
        parentId:
          null,
        order:
          3000
      },
      {
        page:
          sibling,
        parentId:
          null,
        order:
          4000
      }
    ]);

    const batchMovedChildContent =
      await adapter.readText(
        child.path
      );

    assert.match(
      batchMovedChildContent,
      /^customMeta: keep-child$/m
    );

    await updatePageAliases(
      parent,
      [
        'Root Alias'
      ]
    );

    const aliasedParentContent =
      await adapter.readText(
        parent.path
      );

    assert.match(
      aliasedParentContent,
      /^aliases: \[Root Alias\]$/m
    );

    assert.match(
      aliasedParentContent,
      /^customMeta: keep-parent$/m
    );

    assert.match(
      aliasedParentContent,
      /^contentHash: fnv1a32:[0-9a-f]{8}$/m
    );

    await deletePageBranch(
      parent
    );

    await flushBackgroundCheckpoints();

    const eventTypes =
      getPageCommandEvents().map(event =>
        event.type
      );

    assert.ok(
      eventTypes.includes('create-page')
    );

    assert.ok(
      eventTypes.includes('move-page-tree-position')
    );

    assert.ok(
      eventTypes.includes('move-page-tree-position-batch')
    );

    assert.ok(
      eventTypes.includes('update-page-aliases')
    );

    assert.ok(
      eventTypes.includes('delete-page-branch')
    );

    assert.equal(
      getPageCommandEvents().every(event =>
        event.status === 'completed'
      ),
      true
    );

    assert.equal(
      state.pages.some(page =>
        page.id === 'parent'
      ),
      false
    );
  }
);


test(
  'page delete writes trash snapshot and undo restores the branch',
  async () => {

    clearPageCommandEvents();
    clearPageUndoEntries();
    clearBackgroundCheckpointQueue();

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const parent =
      createTestPage(
        'trash-parent',
        null,
        1000
      );

    const child =
      createTestPage(
        'trash-child',
        'trash-parent',
        2000
      );

    await adapter.writeText(
      parent.path,
      parent.content
    );

    await adapter.writeText(
      child.path,
      child.content
    );

    setPages([
      parent,
      child
    ]);

    const deleteResult =
      await deletePageBranch(
        parent
      );

    assert.equal(
      deleteResult.deletedPages,
      2
    );

    assert.match(
      deleteResult.trashId,
      /delete-page-branch/
    );

    await assert.rejects(
      () => adapter.readText(
        parent.path
      )
    );

    const trashRuns =
      await adapter.listFiles(
        '.my-own-world-trash/page-deletes'
      );

    assert.equal(
      trashRuns.length,
      1
    );

    assert.equal(
      getPageUndoEntries().at(-1)?.type,
      'undo-delete-page-branch'
    );

    const undoResult =
      await undoLastPageCommand({
        type:
          'undo-delete-page-branch'
      });

    assert.equal(
      undoResult.undone,
      true
    );

    assert.deepEqual(
      state.pages.map(page => page.id).sort(),
      [
        'trash-child',
        'trash-parent'
      ]
    );

    assert.equal(
      await adapter.readText(
        parent.path
      ),
      parent.content
    );

    assert.equal(
      await adapter.readText(
        child.path
      ),
      child.content
    );
  }
);


test(
  'page move undo restores parent and order through PageRecord writes',
  async () => {

    clearPageCommandEvents();
    clearPageUndoEntries();
    clearBackgroundCheckpointQueue();

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const parent =
      createTestPage(
        'move-parent',
        null,
        1000
      );

    const child =
      createTestPage(
        'move-child',
        'move-parent',
        2000
      );

    await adapter.writeText(
      parent.path,
      parent.content
    );

    await adapter.writeText(
      child.path,
      child.content
    );

    setPages([
      parent,
      child
    ]);

    await updatePageTreePosition(
      child,
      null,
      5000
    );

    assert.equal(
      child.parent,
      null
    );

    assert.equal(
      child.order,
      5000
    );

    assert.equal(
      getPageUndoEntries().at(-1)?.type,
      'undo-page-move'
    );

    await undoLastPageCommand({
      type:
        'undo-page-move'
    });

    assert.equal(
      child.parent,
      'move-parent'
    );

    assert.equal(
      child.order,
      2000
    );

    const restoredContent =
      await adapter.readText(
        child.path
      );

    assert.match(
      restoredContent,
      /^parent: move-parent$/m
    );

    assert.match(
      restoredContent,
      /^order: 2000$/m
    );
  }
);


test(
  'page rename undo restores metadata and file content',
  async () => {

    clearPageCommandEvents();
    clearPageUndoEntries();

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const page =
      createTestPage(
        'rename-page',
        null,
        1000
      );

    await adapter.writeText(
      page.path,
      page.content
    );

    setPages([
      page
    ]);

    const previousPage =
      snapshotPageForCommand(
        page
      );

    const previousContent =
      page.content;

    page.title =
      'Renamed Page';

    const renamedContent =
      page.content.replace(
        '<h1>rename-page</h1>',
        '<h1>Renamed Page</h1>'
      );

    await persistPageContentCommand({
      page,
      content:
        renamedContent,
      previousPage,
      type:
        'rename-page',
      reason:
        'test'
    });

    assert.equal(
      page.title,
      'Renamed Page'
    );

    assert.equal(
      getPageUndoEntries().at(-1)?.type,
      'undo-rename-page'
    );

    await undoLastPageCommand({
      type:
        'undo-rename-page'
    });

    assert.equal(
      page.title,
      'rename-page'
    );

    assert.equal(
      page.content,
      previousContent
    );

    assert.equal(
      await adapter.readText(
        page.path
      ),
      previousContent
    );
  }
);


test(
  'persistPageContentCommand keeps the newest write revision as runtime truth',
  async () => {

    clearPageCommandEvents();
    clearPageUndoEntries();
    clearWriteRevisions();

    const adapter =
      createMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const page =
      createTestPage(
        'race-page',
        null,
        1000
      );

    await adapter.writeText(
      page.path,
      page.content
    );

    setPages([
      page
    ]);

    const originalWriteText =
      adapter.writeText.bind(
        adapter
      );

    let releaseFirstWrite;

    const firstWriteReleased =
      new Promise(resolve => {

        releaseFirstWrite =
          resolve;
      });

    let firstWriteStarted;

    const firstWriteStart =
      new Promise(resolve => {

        firstWriteStarted =
          resolve;
      });

    adapter.writeText =
      async (path, content) => {

        if (
          String(content).includes(
            'Old Save'
          )
        ) {

          firstWriteStarted();

          await firstWriteReleased;
        }

        await originalWriteText(
          path,
          content
        );
      };

    const oldContent =
      page.content.replace(
        '<h1>race-page</h1>',
        '<h1>Old Save</h1>'
      );

    const newContent =
      page.content.replace(
        '<h1>race-page</h1>',
        '<h1>New Save</h1>'
      );

    const firstSave =
      persistPageContentCommand({
        page,
        content:
          oldContent,
        previousPage:
          snapshotPageForCommand(
            page
          ),
        reason:
          'old-autosave'
      });

    await firstWriteStart;

    const secondSave =
      persistPageContentCommand({
        page,
        content:
          newContent,
        previousPage:
          snapshotPageForCommand(
            page
          ),
        reason:
          'new-autosave'
      });

    releaseFirstWrite();

    const [
      firstResult,
      secondResult
    ] =
      await Promise.all([
        firstSave,
        secondSave
      ]);

    assert.equal(
      firstResult.stale,
      true
    );

    assert.equal(
      firstResult.writeStatus,
      'superseded-after-write'
    );

    assert.equal(
      secondResult.writeStatus,
      'saved'
    );

    assert.equal(
      page.content,
      newContent
    );

    assert.equal(
      await adapter.readText(
        page.path
      ),
      newContent
    );
  }
);


function createTestPage(
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
customMeta: keep-${id}
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
    kind:
      'desktop',

    getWorkspaceRoot() {

      return 'memory-page-command-service';
    },

    async pickWorkspace() {

      return 'memory-page-command-service';
    },

    async restoreWorkspace() {

      return 'memory-page-command-service';
    },

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
        kind:
          'directory',
        path:
          normalizeWorkspacePath(
            path
          )
      };
    },

    async readText(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      if (!files.has(normalized)) {

        throw new Error(
          `missing ${path}`
        );
      }

      return files.get(
        normalized
      );
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

    async writeBinary(path, content) {

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
