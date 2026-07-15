import test from 'node:test';
import assert from 'node:assert/strict';

import {
  state
} from '../js/state.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  clearBackgroundCheckpointQueue,
  flushBackgroundCheckpoints,
  getBackgroundCheckpointSnapshot
} from '../js/performance/backgroundCheckpointQueue.js';

import {
  scheduleWorkspaceCheckpoint
} from '../js/storage/workspaceCheckpointTasks.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';


test(
  'workspace checkpoint validates schema tree and pending operations in background',
  async () => {

    clearBackgroundCheckpointQueue();

    setStorageAdapter(
      createEmptyStorageAdapter()
    );

    setPages([
      {
        id: 'child',
        parent: 'missing-parent',
        order: 1,
        title: 'Child',
        template: 'card',
        type: 'note',
        tags: [],
        aliases: [],
        content: ''
      }
    ]);

    scheduleWorkspaceCheckpoint({
      reason: 'test-mutation',
      workspaceId: 'test-workspace'
    });

    assert.equal(
      getBackgroundCheckpointSnapshot().queued.length,
      1
    );

    await flushBackgroundCheckpoints();

    const recent =
      getBackgroundCheckpointSnapshot().recent[0];

    assert.equal(
      recent.status,
      'completed'
    );

    assert.equal(
      recent.result.ok,
      false
    );

    assert.ok(
      recent.result.schemaErrors > 0 ||
      recent.result.treeErrors > 0
    );

    assert.equal(
      state.workspaceCheckpoint.reason,
      undefined
    );

    assert.deepEqual(
      state.workspaceCheckpoint.reasons,
      [
        'test-mutation'
      ]
    );
  }
);


function createEmptyStorageAdapter() {

  return {
    kind: 'test',
    getWorkspaceRoot() {

      return 'test-workspace';
    },
    async pickWorkspace() {},
    async restoreWorkspace() {},
    async ensureDirectory() {},
    async getDirectoryHandle() {

      return {};
    },
    async readText() {

      return '';
    },
    async writeText() {},
    async readBinary() {

      return new ArrayBuffer(0);
    },
    async writeBinary() {},
    async listFiles() {

      return [];
    },
    async removeFile() {},
    async removeDirectory() {}
  };
}
