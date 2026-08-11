import test from 'node:test';
import assert from 'node:assert/strict';

import '../js/repository/pageRepository.js';

import {
  buildPageRecordContent
} from '../js/core/pageRecord.js';

import {
  getPageById
} from '../js/repository/pageRepository.js';

import {
  state
} from '../js/state.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  collectAssetReferencesFromPages
} from '../js/storage/assetReferenceScanner.js';

import {
  normalizeWorkspacePath
} from '../js/storage/storageAdapterContract.js';

import {
  loadWorkspace
} from '../js/storage/workspaceStorage.js';


test(
  'loadWorkspace keeps the newer workspace when an older storage scan finishes later',
  async () => {

    resetWorkspaceState();

    let releaseSlowRead;

    const slowRead =
      new Promise(resolve => {

        releaseSlowRead =
          resolve;
      });

    const workspaceA =
      createWorkspaceLoadAdapter({
        root:
          'workspace-a',
        files: {
          'pages/a-page.md':
            createPageMarkdown({
              id:
                'a-page',
              title:
                'Workspace A Page',
              asset:
                'assets/a-only.png'
            })
        },
        async beforeReadText(path) {

          if (path === 'pages/a-page.md') {

            await slowRead;
          }
        }
      });

    const workspaceB =
      createWorkspaceLoadAdapter({
        root:
          'workspace-b',
        files: {
          'pages/b-page.md':
            createPageMarkdown({
              id:
                'b-page',
              title:
                'Workspace B Page',
              asset:
                'assets/b-only.png'
            })
        }
      });

    setStorageAdapter(
      workspaceA
    );

    const loadA =
      loadWorkspace();

    await Promise.resolve();

    setStorageAdapter(
      workspaceB
    );

    await loadWorkspace();

    releaseSlowRead();

    await loadA;

    assert.deepEqual(
      state.pages.map(page => page.id),
      [
        'b-page'
      ]
    );

    assert.equal(
      state.pages[0].title,
      'Workspace B Page'
    );

    assert.equal(
      getPageById('a-page'),
      null
    );

    assert.equal(
      getPageById('b-page')?.title,
      'Workspace B Page'
    );

    assert.deepEqual(
      collectAssetReferencesFromPages(
        state.pages
      ).map(reference => reference.path),
      [
        'assets/b-only.png'
      ]
    );
  }
);


function resetWorkspaceState() {

  setPages([]);

  state.currentPage =
    null;

  state.workspaceValidation =
    null;

  state.workspaceRecoveryReport =
    null;
}


function createWorkspaceLoadAdapter({
  root,
  files,
  beforeReadText = async () => {}
}) {

  return {
    kind:
      'desktop',
    getWorkspaceRoot() {

      return root;
    },
    async pickWorkspace() {

      return root;
    },
    async restoreWorkspace() {

      return root;
    },
    async ensureDirectory() {},
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

      await beforeReadText(
        normalized
      );

      const value =
        files[normalized];

      if (value === undefined) {

        throw new Error(
          `File not found: ${path}`
        );
      }

      return value;
    },
    async writeText() {},
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

      return Object.keys(files)
        .filter(filePath => filePath.startsWith(prefix))
        .map(filePath => filePath.slice(prefix.length))
        .filter(rest => rest && !rest.includes('/'))
        .map(name => ({
          name,
          kind:
            'file'
        }));
    },
    async removeFile() {},
    async removeDirectory() {}
  };
}


function createPageMarkdown({
  id,
  title,
  asset
}) {

  return buildPageRecordContent({
    id,
    updatedAt:
      '2026-08-11T12:00:00.000Z',
    parent:
      null,
    order:
      1,
    tags:
      [],
    template:
      'card',
    type:
      'note',
    aliases:
      [],
    body:
      `<div class="entity-layout card-shell" data-asset="${asset}">
  <h1>${title}</h1>
</div>`
  });
}
