import test from 'node:test';
import assert from 'node:assert/strict';
import {
  performance
} from 'node:perf_hooks';

import {
  state
} from '../js/state.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  getPageIndex,
  getTreeIndex,
  rebuildPageRepository
} from '../js/repository/pageRepository.js';

import {
  createPage,
  updatePageTreePosition
} from '../js/storage/pageStorage.js';

import {
  beginWorkspaceOperation,
  listPendingWorkspaceOperations
} from '../js/storage/operationJournal.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  normalizeWorkspacePath
} from '../js/storage/storageAdapterContract.js';

import {
  clearBackgroundCheckpointQueue,
  flushBackgroundCheckpoints,
  getBackgroundCheckpointSnapshot
} from '../js/performance/backgroundCheckpointQueue.js';

import {
  buildVisibleTreeRows
} from '../js/tree/treeVirtualization.js';


const GATE_BUDGETS =
  Object.freeze({
    indexBuildMs:
      100,
    visibleRowsMs:
      100,
    createPageMs:
      150,
    sameLevelReorderMs:
      150,
    parentMoveMs:
      200
  });


test(
  'lightweight operations gate keeps create reorder move journal and checkpoint paths bounded',
  async () => {

    clearBackgroundCheckpointQueue();

    const adapter =
      createCountingMemoryStorageAdapter();

    setStorageAdapter(
      adapter
    );

    const pages =
      [
        createGatePage(
          'parent',
          null,
          1000
        ),
        createGatePage(
          'child-a',
          'parent',
          1000
        ),
        createGatePage(
          'child-b',
          'parent',
          2000
        ),
        createGatePage(
          'child-c',
          'parent',
          3000
        ),
        createGatePage(
          'new-parent',
          null,
          2000
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

    const indexDuration =
      measure(
        () => rebuildPageRepository(
          state.pages
        )
      );

    assertWithinBudget(
      indexDuration,
      GATE_BUDGETS.indexBuildMs,
      'startup index build'
    );

    assert.deepEqual(
      getTreeIndex()
        .getChildren('parent')
        .map(page => page.id),
      [
        'child-a',
        'child-b',
        'child-c'
      ]
    );

    let createdPage =
      null;

    const createDuration =
      await measureAsync(
        async () => {

          createdPage =
            await createPage(
              'card',
              'parent'
            );
        }
      );

    assertWithinBudget(
      createDuration,
      GATE_BUDGETS.createPageMs,
      'create page hot path'
    );

    assert.equal(
      adapter.countWritesIn('.my-own-world-backups'),
      0
    );

    assert.equal(
      getTreeIndex()
        .getChildren('parent')
        .some(page => page.id === createdPage.id),
      true
    );

    const sameLevelWritesBefore =
      adapter.countWritesIn('pages');

    const sameLevelDuration =
      await measureAsync(
        () => updatePageTreePosition(
          pages[1],
          'parent',
          2500
        )
      );

    assertWithinBudget(
      sameLevelDuration,
      GATE_BUDGETS.sameLevelReorderMs,
      'same-level reorder hot path'
    );

    assert.equal(
      adapter.countWritesIn('pages') - sameLevelWritesBefore,
      1
    );

    assert.equal(
      adapter.countWritesIn('.my-own-world-backups'),
      0
    );

    const committedBefore =
      adapter.countWritesIn('.my-own-world-ops/committed');

    const parentMoveDuration =
      await measureAsync(
        () => updatePageTreePosition(
          pages[2],
          'new-parent',
          1000
        )
      );

    assertWithinBudget(
      parentMoveDuration,
      GATE_BUDGETS.parentMoveMs,
      'parent-changing move hot path'
    );

    assert.equal(
      adapter.countWritesIn('.my-own-world-backups'),
      0
    );

    assert.equal(
      adapter.countWritesIn('.my-own-world-ops/committed'),
      committedBefore + 1
    );

    assert.ok(
      getBackgroundCheckpointSnapshot().queued.length > 0
    );

    await flushBackgroundCheckpoints();

    assert.ok(
      getBackgroundCheckpointSnapshot().recent.some(job =>
        job.status === 'completed'
      )
    );

    await beginWorkspaceOperation({
      id:
        'gate-pending-recovery',
      type:
        'move-page-tree-position',
      affectedPages:
        [
          'child-c'
        ]
    });

    assert.deepEqual(
      (await listPendingWorkspaceOperations(adapter)).map(entry => entry.id),
      [
        'gate-pending-recovery'
      ]
    );
  }
);


test(
  'large lightweight read models stay inside timing budgets',
  () => {

    const pages =
      createLargePageSet(
        1200
      );

    setPages(
      pages
    );

    const indexDuration =
      measure(
        () => rebuildPageRepository(
          pages
        )
      );

    assertWithinBudget(
      indexDuration,
      GATE_BUDGETS.indexBuildMs,
      'large PageIndex/TreeIndex build'
    );

    const rowsDuration =
      measure(
        () => buildVisibleTreeRows(
          pages,
          new Set()
        )
      );

    assertWithinBudget(
      rowsDuration,
      GATE_BUDGETS.visibleRowsMs,
      'large visible tree rows'
    );

    assert.equal(
      getPageIndex().getAllPages().length,
      1200
    );

    assert.equal(
      getTreeIndex().getChildren(null).length,
      1
    );
  }
);


function measure(
  callback
) {

  const started =
    performance.now();

  callback();

  return performance.now() - started;
}


async function measureAsync(
  callback
) {

  const started =
    performance.now();

  await callback();

  return performance.now() - started;
}


function assertWithinBudget(
  durationMs,
  budgetMs,
  label
) {

  assert.ok(
    durationMs <= budgetMs,
    `${label} took ${durationMs.toFixed(1)}ms, budget ${budgetMs}ms`
  );
}


function createLargePageSet(
  count
) {

  return Array.from(
    {
      length:
        count
    },
    (_, index) => {

      const id =
        `large-gate-${index}`;

      return createGatePage(
        id,
        index === 0
          ? null
          : `large-gate-${index - 1}`,
        index * 1000
      );
    }
  );
}


function createGatePage(
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


function createCountingMemoryStorageAdapter() {

  const files =
    new Map();

  const directories =
    new Set([
      ''
    ]);

  const writes =
    [];

  return {
    kind:
      'desktop',

    getWorkspaceRoot() {

      return 'memory-lightweight-gate';
    },

    countWritesIn(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      return writes.filter(writePath =>
        writePath === normalized ||
        writePath.startsWith(`${normalized}/`)
      ).length;
    },

    async pickWorkspace() {

      return 'memory-lightweight-gate';
    },

    async restoreWorkspace() {

      return 'memory-lightweight-gate';
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

      return typeof value === 'string'
        ? value
        : new TextDecoder().decode(
          value
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

      writes.push(
        normalized
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
