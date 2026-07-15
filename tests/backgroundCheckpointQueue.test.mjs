import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearBackgroundCheckpointQueue,
  enqueueBackgroundCheckpoint,
  flushBackgroundCheckpoints,
  getBackgroundCheckpointSnapshot
} from '../js/performance/backgroundCheckpointQueue.js';


test(
  'background checkpoint queue deduplicates queued jobs by type and workspace',
  async () => {

    clearBackgroundCheckpointQueue();

    let runs =
      0;

    enqueueBackgroundCheckpoint({
      type: 'workspace.validation-checkpoint',
      workspaceId: 'world-a',
      reason: 'after-create',
      run: job => {

        runs += 1;

        return {
          reasons:
            job.reasons
        };
      }
    });

    const second =
      enqueueBackgroundCheckpoint({
        type: 'workspace.validation-checkpoint',
        workspaceId: 'world-a',
        reason: 'after-move',
        run: job => {

          runs += 1;

          return {
            reasons:
              job.reasons
          };
        }
      });

    assert.equal(
      second.deduped,
      true
    );

    assert.equal(
      runs,
      0
    );

    await flushBackgroundCheckpoints();

    const snapshot =
      getBackgroundCheckpointSnapshot();

    assert.equal(
      runs,
      1
    );

    assert.deepEqual(
      snapshot.recent[0].result.reasons,
      [
        'after-create',
        'after-move'
      ]
    );
  }
);


test(
  'background checkpoint queue keeps failures visible without throwing into callers',
  async () => {

    clearBackgroundCheckpointQueue();

    enqueueBackgroundCheckpoint({
      type: 'workspace.validation-checkpoint',
      workspaceId: 'world-b',
      reason: 'broken-checkpoint',
      run: () => {

        throw new Error(
          'checkpoint failed'
        );
      }
    });

    await flushBackgroundCheckpoints();

    const snapshot =
      getBackgroundCheckpointSnapshot();

    assert.equal(
      snapshot.recent[0].status,
      'failed'
    );

    assert.match(
      snapshot.recent[0].error,
      /checkpoint failed/
    );
  }
);
