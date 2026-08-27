import './setup.mjs';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRuntimePageFromContent
} from '../js/core/pageRecord.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  createWorkspaceBackup,
  restoreWorkspaceBackupSelection
} from '../js/storage/backupService.js';

import {
  clearPageCommandEvents,
  clearPageUndoEntries
} from '../js/storage/pageCommandService.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  clearWriteRevisions
} from '../js/storage/writeQueue.js';

import {
  logDiceRoll
} from '../js/events/diceRollEventLog.js';

import {
  readEventTransactions
} from '../js/events/eventStore.js';

import {
  logPagePropertyResourceChange,
  readPageNumericPropertyResource
} from '../js/events/pagePropertyResourceTransaction.js';

import {
  queryEventLog
} from '../js/events/eventQuery.js';

import {
  TRANSACTION_REVERSAL_ERROR_CODES,
  TransactionReversalError,
  undoTransaction
} from '../js/events/transactionReversal.js';

import {
  createDataSafetyPage,
  createMemoryWorkspaceAdapter,
  seedWorkspace
} from './fixtures/dataSafetyFixtures.mjs';


const CREATED_AT =
  '2026-08-27T12:00:00.000Z';


test(
  'event reversal respects restored durable state instead of claiming stale undo success',
  async () => {

    resetEventSafetyState();

    const adapter =
      createMemoryWorkspaceAdapter({
        workspaceRoot:
          'memory-event-safety-restore'
      });

    setStorageAdapter(
      adapter
    );

    const page =
      createStatefulResourcePage({
        value:
          8
      });

    await seedWorkspace(
      adapter,
      {
        pages:
          [
            page
          ]
      }
    );

    setPages([
      page
    ]);

    await createWorkspaceBackup({
      storageAdapter:
        adapter,
      pages:
        [
          page
        ],
      includeAssets:
        false,
      cleanup:
        false,
      id:
        'event-safety-before-resource-change',
      reason:
        'event-safety-fixture'
    });

    await logPagePropertyResourceChange({
      page,
      field:
        'gold',
      after:
        5,
      transactionId:
        'txn-resource-before-restore',
      eventId:
        'evt-resource-before-restore',
      createdAt:
        CREATED_AT,
      completedAt:
        '2026-08-27T12:00:01.000Z',
      source:
        'unit-test',
      reason:
        'spend-before-restore',
      unit:
        'gp'
    },
    {
      storageAdapter:
        adapter
    });

    assert.equal(
      readPageNumericPropertyResource(page, {
        field:
          'gold'
      }).value,
      5
    );

    await restoreWorkspaceBackupSelection(
      'event-safety-before-resource-change',
      {
        pageNames:
          [
            'stateful-item.md'
          ]
      },
      adapter,
      {
        preRestoreBackupId:
          'event-safety-pre-restore'
      }
    );

    const restoredContent =
      await adapter.readText(
        page.path
      );

    const restoredPage =
      createRuntimePageFromContent({
        content:
          restoredContent,
        name:
          page.name,
        path:
          page.path
      });

    setPages([
      restoredPage
    ]);

    assert.equal(
      readPageNumericPropertyResource(restoredPage, {
        field:
          'gold'
      }).value,
      8
    );

    await assert.rejects(
      () => undoTransaction({
        transactionId:
          'txn-resource-before-restore',
        reversalTransactionId:
          'txn-undo-after-restore',
        reversalEventId:
          'evt-undo-after-restore',
        reversalMetadataEventId:
          'evt-undo-after-restore-metadata',
        createdAt:
          '2026-08-27T12:05:00.000Z',
        completedAt:
          '2026-08-27T12:05:01.000Z',
        source:
          'unit-test',
        reason:
          'restore-already-changed-state'
      },
      {
        storageAdapter:
          adapter
      }),
      error =>
        error instanceof TransactionReversalError &&
        error.code === TRANSACTION_REVERSAL_ERROR_CODES.CURRENT_STATE_CONFLICT
    );

    assert.equal(
      readPageNumericPropertyResource(restoredPage, {
        field:
          'gold'
      }).value,
      8
    );

    assert.equal(
      readPageNumericPropertyResource({
        ...restoredPage,
        content:
          await adapter.readText(
            restoredPage.path
          )
      },
      {
        field:
          'gold'
      }).value,
      8
    );

    const transactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.equal(
      transactions.length,
      1
    );

    assert.equal(
      transactions[0].transactionId,
      'txn-resource-before-restore'
    );
  }
);


test(
  'event query reads the active workspace event sidecar after workspace switch',
  async () => {

    resetEventSafetyState();

    const workspaceA =
      createMemoryWorkspaceAdapter({
        workspaceRoot:
          'memory-event-safety-workspace-a'
      });

    const workspaceB =
      createMemoryWorkspaceAdapter({
        workspaceRoot:
          'memory-event-safety-workspace-b'
      });

    setStorageAdapter(
      workspaceA
    );

    await logDiceRoll({
      request:
        {
          formula:
            'd20 + 3',
          mode:
            'normal',
          criticalPolicy:
            'none'
        },
      transactionId:
        'txn-workspace-a-roll',
      eventId:
        'evt-workspace-a-roll',
      createdAt:
        CREATED_AT,
      label:
        'Workspace A roll'
    },
    {
      randomInt:
        () => 12
    });

    const workspaceAQuery =
      await queryEventLog({
        limit:
          10
      });

    assert.deepEqual(
      workspaceAQuery.items.map(item =>
        item.transaction.transactionId
      ),
      [
        'txn-workspace-a-roll'
      ]
    );

    setStorageAdapter(
      workspaceB
    );

    const emptyWorkspaceBQuery =
      await queryEventLog({
        limit:
          10
      });

    assert.equal(
      emptyWorkspaceBQuery.returnedCount,
      0
    );

    await logDiceRoll({
      request:
        {
          formula:
            'd100',
          mode:
            'normal',
          criticalPolicy:
            'none'
        },
      transactionId:
        'txn-workspace-b-roll',
      eventId:
        'evt-workspace-b-roll',
      createdAt:
        '2026-08-27T12:01:00.000Z',
      label:
        'Workspace B roll'
    },
    {
      randomInt:
        () => 42
    });

    const workspaceBQuery =
      await queryEventLog({
        limit:
          10
      });

    assert.deepEqual(
      workspaceBQuery.items.map(item =>
        item.transaction.transactionId
      ),
      [
        'txn-workspace-b-roll'
      ]
    );

    setStorageAdapter(
      workspaceA
    );

    const workspaceAQueryAfterSwitchBack =
      await queryEventLog({
        limit:
          10
      });

    assert.deepEqual(
      workspaceAQueryAfterSwitchBack.items.map(item =>
        item.transaction.transactionId
      ),
      [
        'txn-workspace-a-roll'
      ]
    );
  }
);


function resetEventSafetyState() {

  clearPageCommandEvents();
  clearPageUndoEntries();
  clearWriteRevisions();
  setPages([]);
}


function createStatefulResourcePage({
  value
}) {

  return createDataSafetyPage({
    id:
      'stateful-item',
    title:
      'Stateful Item',
    type:
      'item',
    template:
      'card',
    tags:
      [
        'item'
      ],
    body:
      `
        <section class="entity-main">
          <h1>Stateful Item</h1>
          <div
            class="template-block card-properties-block card-properties-item"
            data-block-type="properties"
            data-block-version="1"
            data-card-type="item"
            contenteditable="false"
          >
            <h2 contenteditable="false">Свойства предмета</h2>
            <div class="card-properties-grid">
              <label class="card-property-field" data-property-id="gold">
                <span class="card-property-label">ЗМ</span>
                <input
                  type="number"
                  data-property-name="gold"
                  data-property-type="number"
                  value="${value}"
                >
              </label>
            </div>
          </div>
        </section>
      `
  });
}
