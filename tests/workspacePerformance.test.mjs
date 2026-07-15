import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearWorkspacePerformanceEvents,
  createProgressMessage,
  getWorkspacePerformanceEvents,
  measureWorkspaceOperation,
  recordWorkspacePerformance
} from '../js/performance/workspacePerformance.js';


test(
  'measureWorkspaceOperation records completed operations with counts',
  async () => {

    clearWorkspacePerformanceEvents();

    const result =
      await measureWorkspaceOperation(
        'workspace.test',
        async () => ({
          pages:
            12
        }),
        {
          counts:
            value => ({
              pages:
                value.pages
            })
        }
      );

    assert.deepEqual(
      result,
      {
        pages:
          12
      }
    );

    const [event] =
      getWorkspacePerformanceEvents();

    assert.equal(
      event.operation,
      'workspace.test'
    );

    assert.equal(
      event.status,
      'completed'
    );

    assert.equal(
      event.counts.pages,
      12
    );

    assert.ok(
      event.durationMs >= 0
    );
  }
);


test(
  'measureWorkspaceOperation records failed operations',
  async () => {

    clearWorkspacePerformanceEvents();

    await assert.rejects(
      () => measureWorkspaceOperation(
        'workspace.failed',
        async () => {
          throw new Error('boom');
        }
      ),
      /boom/
    );

    const [event] =
      getWorkspacePerformanceEvents();

    assert.equal(
      event.operation,
      'workspace.failed'
    );

    assert.equal(
      event.status,
      'failed'
    );
  }
);


test(
  'workspace performance keeps a bounded recent history',
  () => {

    clearWorkspacePerformanceEvents();

    for (
      let index = 0;
      index < 120;
      index += 1
    ) {

      recordWorkspacePerformance({
        operation:
          `operation-${index}`,
        durationMs:
          index
      });
    }

    const events =
      getWorkspacePerformanceEvents();

    assert.equal(
      events.length,
      100
    );

    assert.equal(
      events[0].operation,
      'operation-119'
    );
  }
);


test(
  'createProgressMessage formats human readable progress',
  () => {

    assert.equal(
      createProgressMessage({
        label:
          'Backup',
        stage:
          'страницы',
        current:
          3,
        total:
          10,
        elapsedMs:
          1250
      }),
      'Backup: страницы: 3/10 - 30% - 1.3 s'
    );

    assert.equal(
      createProgressMessage({
        label:
          'Cleanup'
      }),
      'Cleanup'
    );

    assert.equal(
      createProgressMessage({
        current:
          2,
        total:
          4
      }),
      'Операция: 2/4 - 50%'
    );
  }
);
