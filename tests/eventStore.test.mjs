import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';

import {
  appendTransactionEvent,
  completeTransaction,
  createTransaction,
  EVENT_TRANSACTION_MODEL_VERSION,
  failTransaction,
  TRANSACTION_KIND,
  TRANSACTION_STATUSES
} from '../js/events/transactionModel.js';

import {
  rollDice
} from '../js/dice/diceEngine.js';

import {
  appendTransactionRecord,
  createTransactionRecord,
  EVENT_STORE_ERROR_CODES,
  EVENT_STORE_ROOT,
  EVENT_TRANSACTION_LOG_PATH,
  EventStoreError,
  readEventTransactions,
  readTransactionRecords
} from '../js/events/eventStore.js';

import {
  EVENT_TYPE_ERROR_CODES,
  EVENT_TYPES_V1,
  EventTypeValidationError
} from '../js/events/eventTypes.js';

import {
  normalizeWorkspacePath
} from '../js/storage/storageAdapterContract.js';

import {
  createDiceSequenceRandomInt
} from './fixtures/diceSequenceRandomInt.mjs';


const CREATED_AT =
  '2026-08-26T12:00:00.000Z';

const COMPLETED_AT =
  '2026-08-26T12:00:01.000Z';


test(
  'EventStore appends one durable transaction record outside page HTML',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const transaction =
      createCompletedTransaction({
        transactionId:
          'txn-event-store-append',
        eventId:
          'evt-event-store-append',
        order:
          1,
        total:
          18
      });

    const result =
      await appendTransactionRecord(
        transaction,
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      result.status,
      'durable'
    );

    assert.equal(
      result.path,
      EVENT_TRANSACTION_LOG_PATH
    );

    assert.deepEqual(
      adapter.writePaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.equal(
      adapter.ensureDirectoryPaths.includes(EVENT_STORE_ROOT),
      true
    );

    assert.equal(
      adapter.writePaths.some(path =>
        path.startsWith('pages/')
      ),
      false
    );

    const raw =
      await adapter.readText(
        EVENT_TRANSACTION_LOG_PATH
      );

    const lines =
      raw.trim().split('\n');

    assert.equal(
      lines.length,
      1
    );

    const record =
      JSON.parse(
        lines[0]
      );

    assert.equal(
      record.kind,
      'mow-transaction-record'
    );

    assert.equal(
      record.transaction.transactionId,
      'txn-event-store-append'
    );

    assert.equal(
      Object.hasOwn(record.transaction, 'events'),
      false
    );

    assert.equal(
      record.events[0].eventId,
      'evt-event-store-append'
    );
  }
);


test(
  'EventStore uses appendText after one identity initialization read',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    await adapter.writeText(
      EVENT_TRANSACTION_LOG_PATH,
      'existing-record\n'
    );

    adapter.readPaths.length =
      0;

    adapter.writePaths.length =
      0;

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-append-capable',
        eventId:
          'evt-append-capable',
        order:
          2,
        total:
          13
      }),
      {
        storageAdapter:
          adapter
      }
    );

    assert.deepEqual(
      adapter.appendPaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.deepEqual(
      adapter.readPaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.deepEqual(
      adapter.writePaths,
      []
    );

    assert.match(
      adapter.files.get(EVENT_TRANSACTION_LOG_PATH),
      /^existing-record\n\{/
    );
  }
);


test(
  'EventStore appendText path preserves ordering across multiple appends',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-append-text-1',
        eventId:
          'evt-append-text-1',
        order:
          1,
        total:
          6
      }),
      {
        storageAdapter:
          adapter
      }
    );

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-append-text-2',
        eventId:
          'evt-append-text-2',
        order:
          2,
        total:
          14
      }),
      {
        storageAdapter:
          adapter
      }
    );

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-append-text-3',
        eventId:
          'evt-append-text-3',
        order:
          3,
        total:
          19
      }),
      {
        storageAdapter:
          adapter
      }
    );

    assert.deepEqual(
      adapter.appendPaths,
      [
        EVENT_TRANSACTION_LOG_PATH,
        EVENT_TRANSACTION_LOG_PATH,
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.deepEqual(
      adapter.writePaths,
      []
    );

    const snapshot =
      await readTransactionRecords({
        storageAdapter:
          adapter
      });

    assert.deepEqual(
      snapshot.transactions.map(transaction =>
        transaction.transactionId
      ),
      [
        'txn-append-text-1',
        'txn-append-text-2',
        'txn-append-text-3'
      ]
    );
  }
);


test(
  'EventStore append-capable identity initialization reads once per workspace runtime',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    adapter.readPaths.length =
      0;

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-read-count-1',
        eventId:
          'evt-read-count-1',
        order:
          1,
        total:
          6
      }),
      {
        storageAdapter:
          adapter
      }
    );

    assert.deepEqual(
      adapter.readPaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-read-count-2',
        eventId:
          'evt-read-count-2',
        order:
          2,
        total:
          14
      }),
      {
        storageAdapter:
          adapter
      }
    );

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-read-count-3',
        eventId:
          'evt-read-count-3',
        order:
          3,
        total:
          19
      }),
      {
        storageAdapter:
          adapter
      }
    );

    assert.deepEqual(
      adapter.readPaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.deepEqual(
      adapter.appendPaths,
      [
        EVENT_TRANSACTION_LOG_PATH,
        EVENT_TRANSACTION_LOG_PATH,
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.deepEqual(
      adapter.writePaths,
      []
    );
  }
);


test(
  'EventStore reports appendText failure without hidden read-write fallback',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true,
        failAppendPath:
          EVENT_TRANSACTION_LOG_PATH
      });

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-append-text-failure',
          eventId:
            'evt-append-text-failure',
          order:
            1,
          total:
            2
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error =>
        error instanceof EventStoreError &&
        error.code === EVENT_STORE_ERROR_CODES.WRITE_FAILED
    );

    assert.deepEqual(
      adapter.appendPaths,
      []
    );

    assert.deepEqual(
      adapter.readPaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.deepEqual(
      adapter.writePaths,
      []
    );
  }
);


test(
  'EventStore rejects duplicate transaction ids before durable append',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-duplicate-transaction',
        eventId:
          'evt-duplicate-transaction-a',
        order:
          1,
        total:
          8
      }),
      {
        storageAdapter:
          adapter
      }
    );

    const appendCount =
      adapter.appendPaths.length;

    const rawBefore =
      adapter.files.get(
        EVENT_TRANSACTION_LOG_PATH
      );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-duplicate-transaction',
          eventId:
            'evt-duplicate-transaction-b',
          order:
            2,
          total:
            12
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'transactionId',
        'txn-duplicate-transaction'
      )
    );

    assert.equal(
      adapter.appendPaths.length,
      appendCount
    );

    assert.equal(
      adapter.files.get(EVENT_TRANSACTION_LOG_PATH),
      rawBefore
    );
  }
);


test(
  'EventStore rejects duplicate event ids before durable append',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-duplicate-event-a',
        eventId:
          'evt-duplicate-event',
        order:
          1,
        total:
          8
      }),
      {
        storageAdapter:
          adapter
      }
    );

    const appendCount =
      adapter.appendPaths.length;

    const rawBefore =
      adapter.files.get(
        EVENT_TRANSACTION_LOG_PATH
      );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-duplicate-event-b',
          eventId:
            'evt-duplicate-event',
          order:
            2,
          total:
            12
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'eventId',
        'evt-duplicate-event'
      )
    );

    assert.equal(
      adapter.appendPaths.length,
      appendCount
    );

    assert.equal(
      adapter.files.get(EVENT_TRANSACTION_LOG_PATH),
      rawBefore
    );
  }
);


test(
  'EventStore rebuilds identity state from durable history after reload',
  async () => {

    const originalAdapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-reload-duplicate',
        eventId:
          'evt-reload-duplicate',
        order:
          1,
        total:
          8
      }),
      {
        storageAdapter:
          originalAdapter
      }
    );

    const reloadedAdapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    reloadedAdapter.files.set(
      EVENT_TRANSACTION_LOG_PATH,
      originalAdapter.files.get(EVENT_TRANSACTION_LOG_PATH)
    );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-reload-duplicate',
          eventId:
            'evt-reload-new-event',
          order:
            2,
          total:
            12
        }),
        {
          storageAdapter:
            reloadedAdapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'transactionId',
        'txn-reload-duplicate'
      )
    );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-reload-new-transaction',
          eventId:
            'evt-reload-duplicate',
          order:
            3,
          total:
            16
        }),
        {
          storageAdapter:
            reloadedAdapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'eventId',
        'evt-reload-duplicate'
      )
    );

    assert.deepEqual(
      reloadedAdapter.appendPaths,
      []
    );
  }
);


test(
  'EventStore fails closed when existing valid durable history contains duplicate identities',
  async () => {

    const duplicateTransactionAdapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    await seedTransactionRecords(
      duplicateTransactionAdapter,
      [
        createCompletedTransaction({
          transactionId:
            'txn-existing-duplicate',
          eventId:
            'evt-existing-duplicate-a',
          order:
            1,
          total:
            4
        }),
        createCompletedTransaction({
          transactionId:
            'txn-existing-duplicate',
          eventId:
            'evt-existing-duplicate-b',
          order:
            2,
          total:
            6
        })
      ]
    );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-existing-duplicate-new',
          eventId:
            'evt-existing-duplicate-new',
          order:
            3,
          total:
            8
        }),
        {
          storageAdapter:
            duplicateTransactionAdapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'transactionId',
        'txn-existing-duplicate'
      )
    );

    assert.deepEqual(
      duplicateTransactionAdapter.appendPaths,
      []
    );

    const duplicateEventAdapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    await seedTransactionRecords(
      duplicateEventAdapter,
      [
        createCompletedTransaction({
          transactionId:
            'txn-existing-event-a',
          eventId:
            'evt-existing-event-duplicate',
          order:
            1,
          total:
            4
        }),
        createCompletedTransaction({
          transactionId:
            'txn-existing-event-b',
          eventId:
            'evt-existing-event-duplicate',
          order:
            2,
          total:
            6
        })
      ]
    );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-existing-event-new',
          eventId:
            'evt-existing-event-new',
          order:
            3,
          total:
            8
        }),
        {
          storageAdapter:
            duplicateEventAdapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'eventId',
        'evt-existing-event-duplicate'
      )
    );

    assert.deepEqual(
      duplicateEventAdapter.appendPaths,
      []
    );
  }
);


test(
  'EventStore isolates identity state when one desktop adapter switches workspaces',
  async () => {

    const adapter =
      createSwitchableEventStorageAdapter({
        identityKind:
          'root'
      });

    adapter.switchToWorkspace(
      'workspace-a'
    );

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-workspace-reuse',
        eventId:
          'evt-workspace-reuse',
        order:
          1,
        total:
          7
      }),
      {
        storageAdapter:
          adapter
      }
    );

    adapter.switchToWorkspace(
      'workspace-b'
    );

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-workspace-reuse',
        eventId:
          'evt-workspace-reuse',
        order:
          1,
        total:
          7
      }),
      {
        storageAdapter:
          adapter
      }
    );

    assert.equal(
      countLogLines(
        adapter.getWorkspaceLog('workspace-a')
      ),
      1
    );

    assert.equal(
      countLogLines(
        adapter.getWorkspaceLog('workspace-b')
      ),
      1
    );

    adapter.switchToWorkspace(
      'workspace-a'
    );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-workspace-reuse',
          eventId:
            'evt-workspace-new',
          order:
            2,
          total:
            12
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'transactionId',
        'txn-workspace-reuse'
      )
    );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-workspace-new',
          eventId:
            'evt-workspace-reuse',
          order:
            3,
          total:
            14
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'eventId',
        'evt-workspace-reuse'
      )
    );
  }
);


test(
  'EventStore isolates identity state when one browser adapter switches handles',
  async () => {

    const adapter =
      createSwitchableEventStorageAdapter({
        identityKind:
          'handle'
      });

    adapter.switchToHandle(
      adapter.handles.a
    );

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-browser-handle-reuse',
        eventId:
          'evt-browser-handle-reuse',
        order:
          1,
        total:
          7
      }),
      {
        storageAdapter:
          adapter
      }
    );

    adapter.switchToHandle(
      adapter.handles.b
    );

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-browser-handle-reuse',
        eventId:
          'evt-browser-handle-reuse',
        order:
          1,
        total:
          7
      }),
      {
        storageAdapter:
          adapter
      }
    );

    adapter.switchToHandle(
      adapter.handles.a
    );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-browser-handle-reuse',
          eventId:
            'evt-browser-handle-new',
          order:
            2,
          total:
            12
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'transactionId',
        'txn-browser-handle-reuse'
      )
    );

    assert.equal(
      countLogLines(
        adapter.getWorkspaceLog(adapter.handles.a)
      ),
      1
    );

    assert.equal(
      countLogLines(
        adapter.getWorkspaceLog(adapter.handles.b)
      ),
      1
    );
  }
);


test(
  'EventStore serializes concurrent duplicate transaction id claims',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true,
        appendDelayMs:
          2
      });

    const settled =
      await Promise.allSettled([
        appendTransactionRecord(
          createCompletedTransaction({
            transactionId:
              'txn-concurrent-duplicate',
            eventId:
              'evt-concurrent-duplicate-a',
            order:
              1,
            total:
              4
          }),
          {
            storageAdapter:
              adapter
          }
        ),
        appendTransactionRecord(
          createCompletedTransaction({
            transactionId:
              'txn-concurrent-duplicate',
            eventId:
              'evt-concurrent-duplicate-b',
            order:
              2,
            total:
              12
          }),
          {
            storageAdapter:
              adapter
          }
        )
      ]);

    assert.equal(
      settled.filter(result => result.status === 'fulfilled').length,
      1
    );

    assert.equal(
      settled.filter(result => result.status === 'rejected').length,
      1
    );

    const rejected =
      settled.find(result =>
        result.status === 'rejected'
      );

    assert.equal(
      isDuplicateIdentityError(
        rejected.reason,
        'transactionId',
        'txn-concurrent-duplicate'
      ),
      true
    );

    const snapshot =
      await readTransactionRecords({
        storageAdapter:
          adapter
      });

    assert.deepEqual(
      snapshot.transactions.map(transaction =>
        transaction.transactionId
      ),
      [
        'txn-concurrent-duplicate'
      ]
    );
  }
);


test(
  'EventStore serializes concurrent duplicate event id claims',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true,
        appendDelayMs:
          2
      });

    const settled =
      await Promise.allSettled([
        appendTransactionRecord(
          createCompletedTransaction({
            transactionId:
              'txn-concurrent-event-a',
            eventId:
              'evt-concurrent-event-duplicate',
            order:
              1,
            total:
              4
          }),
          {
            storageAdapter:
              adapter
          }
        ),
        appendTransactionRecord(
          createCompletedTransaction({
            transactionId:
              'txn-concurrent-event-b',
            eventId:
              'evt-concurrent-event-duplicate',
            order:
              2,
            total:
              12
          }),
          {
            storageAdapter:
              adapter
          }
        )
      ]);

    assert.equal(
      settled.filter(result => result.status === 'fulfilled').length,
      1
    );

    assert.equal(
      settled.filter(result => result.status === 'rejected').length,
      1
    );

    const rejected =
      settled.find(result =>
        result.status === 'rejected'
      );

    assert.equal(
      isDuplicateIdentityError(
        rejected.reason,
        'eventId',
        'evt-concurrent-event-duplicate'
      ),
      true
    );

    const snapshot =
      await readTransactionRecords({
        storageAdapter:
          adapter
      });

    assert.deepEqual(
      snapshot.transactions.flatMap(transaction =>
        transaction.events.map(event => event.eventId)
      ),
      [
        'evt-concurrent-event-duplicate'
      ]
    );
  }
);


test(
  'EventStore failed append does not reserve incoming identities',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    adapter.controls.failAppendPath =
      EVENT_TRANSACTION_LOG_PATH;

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-failed-not-reserved',
          eventId:
            'evt-failed-not-reserved',
          order:
            1,
          total:
            6
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error =>
        error instanceof EventStoreError &&
        error.code === EVENT_STORE_ERROR_CODES.WRITE_FAILED
    );

    adapter.controls.failAppendPath =
      '';

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-failed-not-reserved',
        eventId:
          'evt-failed-not-reserved',
        order:
          1,
        total:
          6
      }),
      {
        storageAdapter:
          adapter
      }
    );

    const snapshot =
      await readTransactionRecords({
        storageAdapter:
          adapter
      });

    assert.deepEqual(
      snapshot.transactions.map(transaction =>
        transaction.transactionId
      ),
      [
        'txn-failed-not-reserved'
      ]
    );

    assert.equal(
      adapter.appendPaths.length,
      1
    );
  }
);


test(
  'EventStore uncertain append failure invalidates runtime identity state',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        withAppendText:
          true
      });

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-before-uncertain-failure',
        eventId:
          'evt-before-uncertain-failure',
        order:
          1,
        total:
          5
      }),
      {
        storageAdapter:
          adapter
      }
    );

    adapter.readPaths.length =
      0;

    adapter.controls.failAppendAfterWritePath =
      EVENT_TRANSACTION_LOG_PATH;

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-uncertain-failure',
          eventId:
            'evt-uncertain-failure',
          order:
            2,
          total:
            11
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error =>
        error instanceof EventStoreError &&
        error.code === EVENT_STORE_ERROR_CODES.WRITE_FAILED
    );

    adapter.controls.failAppendAfterWritePath =
      '';

    assert.deepEqual(
      adapter.readPaths,
      []
    );

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-uncertain-failure',
          eventId:
            'evt-uncertain-failure-retry',
          order:
            3,
          total:
            13
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error => isDuplicateIdentityError(
        error,
        'transactionId',
        'txn-uncertain-failure'
      )
    );

    assert.deepEqual(
      adapter.readPaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.equal(
      adapter.appendPaths.length,
      2
    );
  }
);


test(
  'EventStore compatibility fallback still works without appendText',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-fallback-append',
        eventId:
          'evt-fallback-append',
        order:
          1,
        total:
          10
      }),
      {
        storageAdapter:
          adapter
      }
    );

    assert.equal(
      typeof adapter.appendText,
      'undefined'
    );

    assert.deepEqual(
      adapter.readPaths,
      [
        EVENT_TRANSACTION_LOG_PATH,
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.deepEqual(
      adapter.writePaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    const transactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.equal(
      transactions[0].transactionId,
      'txn-fallback-append'
    );
  }
);


test(
  'EventStore reloads transactions after a fresh read owner is created',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    await appendTransactionRecord(
      createCompletedTransaction({
        transactionId:
          'txn-reload-1',
        eventId:
          'evt-reload-1',
        order:
          1,
        total:
          7
      }),
      {
        storageAdapter:
          adapter
      }
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
      'txn-reload-1'
    );

    assert.equal(
      transactions[0].events[0].payload.roll.total,
      7
    );

    const snapshot =
      await readTransactionRecords({
        storageAdapter:
          adapter
      });

    assert.equal(
      snapshot.recordCount,
      1
    );

    assert.equal(
      snapshot.invalidRecordCount,
      0
    );
  }
);


test(
  'EventStore preserves multiple transaction append order and event order',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const first =
      createCompletedTransaction({
        transactionId:
          'txn-order-1',
        eventId:
          'evt-order-1',
        order:
          1,
        total:
          11
      });

    const second =
      completeTransaction(
        appendTransactionEvent(
          appendTransactionEvent(
            createTransaction({
              transactionId:
                'txn-order-2',
              intentType:
                'manual-resource-adjustment',
              label:
                'Correct resource',
              source:
                'event-store-test',
              reason:
                'test',
              createdAt:
                CREATED_AT,
              order:
                2
            }),
            {
              eventId:
                'evt-order-2a',
              type:
                EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED,
              createdAt:
                CREATED_AT,
              payload:
                {
                  subject:
                    {
                      kind:
                        'character',
                      id:
                        'character-a',
                      label:
                        'Aria'
                    },
                  field:
                    'initiative.total',
                  before:
                    10,
                  after:
                    18,
                  reason:
                    'test'
                }
            }
          ),
          {
            eventId:
              'evt-order-2b',
            type:
              EVENT_TYPES_V1.RESOURCE_CHANGED,
            createdAt:
              COMPLETED_AT,
            payload:
              {
                resource:
                  {
                    kind:
                      'page-property',
                    id:
                      'page-a:gold',
                    label:
                      'Gold'
                  },
                before:
                  20,
                after:
                  17,
                delta:
                  -3,
                unit:
                  'gp',
                reason:
                  'test'
              }
          }
        ),
        {
          completedAt:
            COMPLETED_AT
        }
      );

    await appendTransactionRecord(
      first,
      {
        storageAdapter:
          adapter
      }
    );

    const firstRawLine =
      (
        await adapter.readText(
          EVENT_TRANSACTION_LOG_PATH
        )
      ).trim();

    await appendTransactionRecord(
      second,
      {
        storageAdapter:
          adapter
      }
    );

    const rawLines =
      (
        await adapter.readText(
          EVENT_TRANSACTION_LOG_PATH
        )
      ).trim().split('\n');

    assert.equal(
      rawLines.length,
      2
    );

    assert.equal(
      rawLines[0],
      firstRawLine
    );

    const snapshot =
      await readTransactionRecords({
        storageAdapter:
          adapter
      });

    assert.deepEqual(
      snapshot.transactions.map(transaction =>
        transaction.transactionId
      ),
      [
        'txn-order-1',
        'txn-order-2'
      ]
    );

    assert.deepEqual(
      snapshot.transactions[1].events.map(event =>
        [
          event.eventId,
          event.order
        ]
      ),
      [
        [
          'evt-order-2a',
          1
        ],
        [
          'evt-order-2b',
          2
        ]
      ]
    );
  }
);


test(
  'EventStore serializes concurrent appends against the same log file',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        writeDelayMs:
          2
      });

    await Promise.all([
      appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-concurrent-1',
          eventId:
            'evt-concurrent-1',
          order:
            1,
          total:
            4
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-concurrent-2',
          eventId:
            'evt-concurrent-2',
          order:
            2,
          total:
            12
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-concurrent-3',
          eventId:
            'evt-concurrent-3',
          order:
            3,
          total:
            20
        }),
        {
          storageAdapter:
            adapter
        }
      )
    ]);

    const transactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.deepEqual(
      transactions.map(transaction =>
        transaction.transactionId
      ),
      [
        'txn-concurrent-1',
        'txn-concurrent-2',
        'txn-concurrent-3'
      ]
    );
  }
);


test(
  'EventStore write failure is reported and not durable success',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        failWritePath:
          EVENT_TRANSACTION_LOG_PATH
      });

    await assert.rejects(
      () => appendTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-write-failure',
          eventId:
            'evt-write-failure',
          order:
            1,
          total:
            3
        }),
        {
          storageAdapter:
            adapter
        }
      ),
      error =>
        error instanceof EventStoreError &&
        error.code === EVENT_STORE_ERROR_CODES.WRITE_FAILED
    );

    assert.equal(
      adapter.files.has(EVENT_TRANSACTION_LOG_PATH),
      false
    );
  }
);


test(
  'EventStore keeps corrupt records visible without deleting valid history',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const validA =
      createTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-corrupt-valid-a',
          eventId:
            'evt-corrupt-valid-a',
          order:
            1,
          total:
            5
        })
      );

    const validB =
      createTransactionRecord(
        createCompletedTransaction({
          transactionId:
            'txn-corrupt-valid-b',
          eventId:
            'evt-corrupt-valid-b',
          order:
            2,
          total:
            9
        })
      );

    await adapter.ensureDirectory(
      EVENT_STORE_ROOT
    );

    await adapter.writeText(
      EVENT_TRANSACTION_LOG_PATH,
      [
        JSON.stringify(validA),
        '{ not json',
        JSON.stringify({
          kind:
            'not-an-event-record',
          version:
            1,
          transaction:
            {},
          events:
            []
        }),
        JSON.stringify({
          ...validB,
          events:
            [
              {
                ...validB.events[0],
                order:
                  2
              },
              {
                ...validB.events[0],
                eventId:
                  'evt-corrupt-invalid-order',
                order:
                  1
              }
            ]
        }),
        JSON.stringify(validB)
      ].join('\n')
    );

    const snapshot =
      await readTransactionRecords({
        storageAdapter:
          adapter
      });

    assert.deepEqual(
      snapshot.transactions.map(transaction =>
        transaction.transactionId
      ),
      [
        'txn-corrupt-valid-a',
        'txn-corrupt-valid-b'
      ]
    );

    assert.deepEqual(
      snapshot.invalidRecords.map(record =>
        record.lineNumber
      ),
      [
        2,
        3,
        4
      ]
    );

    assert.equal(
      adapter.removePaths.length,
      0
    );

    await assert.rejects(
      () => readTransactionRecords({
        storageAdapter:
          adapter,
        strict:
          true
      }),
      error =>
        error instanceof EventStoreError &&
        error.lineNumber === 2
    );
  }
);


test(
  'EventStore rejects invalid durable transaction records before append',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const started =
      createTransaction({
        transactionId:
          'txn-started-runtime-only',
        intentType:
          'roll-check',
        label:
          'Started only',
        source:
          'test',
        reason:
          'test',
        createdAt:
          CREATED_AT,
        order:
          1
      });

    await assert.rejects(
      () => appendTransactionRecord(
        started,
        {
          storageAdapter:
            adapter
        }
      ),
      error =>
        error instanceof EventStoreError &&
        error.code === EVENT_STORE_ERROR_CODES.INVALID_TRANSACTION
    );

    assert.deepEqual(
      adapter.writePaths,
      []
    );

    const completedWithoutEvents = {
      kind:
        TRANSACTION_KIND,
      version:
        EVENT_TRANSACTION_MODEL_VERSION,
      transactionId:
        'txn-completed-without-events',
      intentType:
        'empty-success',
      label:
        'Empty success',
      source:
        'test',
      reason:
        'test',
      createdAt:
        CREATED_AT,
      order:
        2,
      status:
        TRANSACTION_STATUSES.COMPLETED,
      events:
        [],
      reversesTransactionId:
        null,
      reversedByTransactionId:
        null,
      completedAt:
        COMPLETED_AT,
      failedAt:
        null,
      failure:
        null
    };

    await assert.rejects(
      () => appendTransactionRecord(
        completedWithoutEvents,
        {
          storageAdapter:
            adapter
        }
      ),
      error =>
        error instanceof EventStoreError &&
        error.code === EVENT_STORE_ERROR_CODES.INVALID_TRANSACTION
    );

    assert.deepEqual(
      adapter.writePaths,
      []
    );
  }
);


test(
  'EventStore rejects transactions outside the v1 event vocabulary before append',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const transaction =
      completeTransaction(
        appendTransactionEvent(
          createTransaction({
            transactionId:
              'txn-unknown-event-type',
            intentType:
              'map-token-update',
            label:
              'Old arbitrary map event',
            source:
              'test',
            reason:
              'test',
            createdAt:
              CREATED_AT,
            order:
              1
          }),
          {
            eventId:
              'evt-unknown-event-type',
            type:
              'map.token.moved',
            createdAt:
              CREATED_AT,
            payload:
              {
                tokenId:
                  'token-a'
              }
          }
        ),
        {
          completedAt:
            COMPLETED_AT
        }
      );

    await assert.rejects(
      () => appendTransactionRecord(
        transaction,
        {
          storageAdapter:
            adapter
        }
      ),
      error =>
        error instanceof EventTypeValidationError &&
        error.code === EVENT_TYPE_ERROR_CODES.UNKNOWN_TYPE
    );

    assert.deepEqual(
      adapter.writePaths,
      []
    );
  }
);


test(
  'EventStore supports failed transaction records as auditable outcomes',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const failed =
      failTransaction(
        createTransaction({
          transactionId:
            'txn-failed-outcome',
          intentType:
            'page-command',
          label:
            'Failed command',
          source:
            'editor',
          reason:
            'test',
          createdAt:
            CREATED_AT,
          order:
            3
        }),
        {
          failedAt:
            COMPLETED_AT,
          code:
            'WRITE_FAILED',
          error:
            'durable write failed'
        }
      );

    await appendTransactionRecord(
      failed,
      {
        storageAdapter:
          adapter
      }
    );

    const transactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.equal(
      transactions[0].status,
      'failed'
    );

    assert.equal(
      transactions[0].failure.code,
      'WRITE_FAILED'
    );
  }
);


test(
  'EventStore has no UI or page-storage ownership',
  async () => {

    const source =
      await readFile(
        new URL(
          '../js/events/eventStore.js',
          import.meta.url
        ),
        'utf8'
      );

    for (const forbidden of [
      '../ui/',
      'document.',
      'window.',
      'PageCommandService',
      'pageCommandService',
      'pages/'
    ]) {

      assert.equal(
        source.includes(forbidden),
        false,
        `eventStore must not reference ${forbidden}`
      );
    }
  }
);


function createCompletedTransaction({
  transactionId,
  eventId,
  order,
  total
}) {

  return completeTransaction(
    appendTransactionEvent(
      createTransaction({
        transactionId,
        intentType:
          'roll-check',
        label:
          `Roll ${transactionId}`,
        source:
          'test',
        reason:
          'unit-test',
        createdAt:
          CREATED_AT,
        order
      }),
      {
        eventId,
        type:
          EVENT_TYPES_V1.ROLL_PERFORMED,
        createdAt:
          CREATED_AT,
        payload:
          createRollEventPayload(
            total
          )
      }
    ),
    {
      completedAt:
        COMPLETED_AT
    }
  );
}


function createRollEventPayload(
  total
) {

  const rng =
    createDiceSequenceRandomInt([
      total
    ]);

  return {
    roll:
      rollDice(
        {
          formula:
            'd20',
          mode:
            'normal',
          criticalPolicy:
            'none'
        },
        {
          randomInt:
            rng.randomInt
        }
      ),
    context:
      {
        source:
          'event-store-test'
      }
  };
}


function isDuplicateIdentityError(
  error,
  identityType,
  identity
) {

  assert.equal(
    error instanceof EventStoreError,
    true
  );

  assert.equal(
    error.code,
    EVENT_STORE_ERROR_CODES.DUPLICATE_IDENTITY
  );

  assert.equal(
    error.identityType,
    identityType
  );

  assert.equal(
    error.identity,
    identity
  );

  return true;
}


async function seedTransactionRecords(
  adapter,
  transactions
) {

  await adapter.ensureDirectory(
    EVENT_STORE_ROOT
  );

  await adapter.writeText(
    EVENT_TRANSACTION_LOG_PATH,
    `${transactions
      .map(transaction =>
        JSON.stringify(
          createTransactionRecord(
            transaction
          )
        )
      )
      .join('\n')}\n`
  );
}


function countLogLines(
  content
) {

  const trimmed =
    String(content || '').trim();

  return trimmed
    ? trimmed.split('\n').length
    : 0;
}


function createSwitchableEventStorageAdapter({
  identityKind =
    'root'
} = {}) {

  const handles = {
    a:
      {
        name:
          'workspace-a'
      },
    b:
      {
        name:
          'workspace-b'
      }
  };

  const buckets =
    new Map();

  let currentRoot =
    'workspace-a';

  let currentHandle =
    handles.a;

  const readPaths =
    [];

  const appendPaths =
    [];

  const writePaths =
    [];

  const ensureDirectoryPaths =
    [];

  function getCurrentKey() {

    return identityKind === 'handle'
      ? currentHandle
      : currentRoot;
  }

  function getCurrentLabel() {

    return identityKind === 'handle'
      ? currentHandle.name
      : currentRoot;
  }

  function getBucket(
    key
  ) {

    if (!buckets.has(key)) {

      buckets.set(
        key,
        {
          files:
            new Map(),
          directories:
            new Set([
              ''
            ])
        }
      );
    }

    return buckets.get(
      key
    );
  }

  function getCurrentBucket() {

    return getBucket(
      getCurrentKey()
    );
  }

  return {
    kind:
      identityKind === 'handle'
        ? 'browser'
        : 'desktop',

    handles,

    readPaths,
    appendPaths,
    writePaths,
    ensureDirectoryPaths,

    switchToWorkspace(root) {

      currentRoot =
        String(root || '');
    },

    switchToHandle(handle) {

      currentHandle =
        handle;
    },

    getWorkspaceRoot() {

      return identityKind === 'root'
        ? currentRoot
        : '';
    },

    getWorkspaceHandle() {

      return identityKind === 'handle'
        ? currentHandle
        : null;
    },

    getWorkspaceLog(workspaceIdentity) {

      return getBucket(
        workspaceIdentity
      ).files.get(
        EVENT_TRANSACTION_LOG_PATH
      ) || '';
    },

    async ensureDirectory(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      ensureDirectoryPaths.push({
        workspace:
          getCurrentLabel(),
        path:
          normalized
      });

      ensureDirectoryPath(
        getCurrentBucket().directories,
        normalized
      );
    },

    async readText(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      readPaths.push({
        workspace:
          getCurrentLabel(),
        path:
          normalized
      });

      const {
        files
      } =
        getCurrentBucket();

      if (!files.has(normalized)) {

        throw new Error(
          `File not found: ${path}`
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

      writePaths.push({
        workspace:
          getCurrentLabel(),
        path:
          normalized
      });

      const bucket =
        getCurrentBucket();

      ensureDirectoryPath(
        bucket.directories,
        getParentPath(
          normalized
        )
      );

      bucket.files.set(
        normalized,
        String(content)
      );
    },

    async appendText(path, content) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      appendPaths.push({
        workspace:
          getCurrentLabel(),
        path:
          normalized
      });

      const bucket =
        getCurrentBucket();

      ensureDirectoryPath(
        bucket.directories,
        getParentPath(
          normalized
        )
      );

      bucket.files.set(
        normalized,
        `${bucket.files.get(normalized) || ''}${String(content)}`
      );
    }
  };
}


function createMemoryStorageAdapter(
  options = {}
) {

  const controls = {
    failWritePath:
      options.failWritePath || '',
    failAppendPath:
      options.failAppendPath || '',
    failAppendAfterWritePath:
      options.failAppendAfterWritePath || '',
    writeDelayMs:
      options.writeDelayMs || 0,
    appendDelayMs:
      options.appendDelayMs || 0,
    workspaceRoot:
      options.workspaceRoot || 'memory-event-store'
  };

  const files =
    new Map();

  const directories =
    new Set([
      ''
    ]);

  const writePaths =
    [];

  const readPaths =
    [];

  const appendPaths =
    [];

  const ensureDirectoryPaths =
    [];

  const removePaths =
    [];

  const adapter = {
    kind:
      'desktop',

    controls,

    files,

    writePaths,

    readPaths,

    appendPaths,

    ensureDirectoryPaths,

    removePaths,

    getWorkspaceRoot() {

      return controls.workspaceRoot;
    },

    setWorkspaceRoot(root) {

      controls.workspaceRoot =
        String(root || '');
    },

    async pickWorkspace() {

      return controls.workspaceRoot;
    },

    async restoreWorkspace() {

      return controls.workspaceRoot;
    },

    async ensureDirectory(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      ensureDirectoryPaths.push(
        normalized
      );

      ensureDirectoryPath(
        directories,
        normalized
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

      readPaths.push(
        normalized
      );

      if (!files.has(normalized)) {

        throw new Error(
          `File not found: ${path}`
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

      if (normalized === controls.failWritePath) {

        throw new Error(
          'forced event log write failure'
        );
      }

      writePaths.push(
        normalized
      );

      if (controls.writeDelayMs) {

        await new Promise(resolve =>
          setTimeout(
            resolve,
            controls.writeDelayMs
          )
        );
      }

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

    async readBinary(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      if (!files.has(normalized)) {

        throw new Error(
          `File not found: ${path}`
        );
      }

      const value =
        files.get(
          normalized
        );

      return typeof value === 'string'
        ? new TextEncoder().encode(value).buffer
        : value;
    },

    async writeBinary(path, content) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      writePaths.push(
        normalized
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

      const normalized =
        normalizeWorkspacePath(
          path
        );

      removePaths.push(
        normalized
      );

      files.delete(
        normalized
      );
    },

    async removeDirectory(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      removePaths.push(
        normalized
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

  if (options.withAppendText) {

    adapter.appendText =
      async (
        path,
        content
      ) => {

        const normalized =
          normalizeWorkspacePath(
            path
          );

        if (normalized === controls.failAppendPath) {

          throw new Error(
            'forced event log append failure'
          );
        }

        if (controls.appendDelayMs) {

          await new Promise(resolve =>
            setTimeout(
              resolve,
              controls.appendDelayMs
            )
          );
        }

        appendPaths.push(
          normalized
        );

        ensureDirectoryPath(
          directories,
          getParentPath(
            normalized
          )
        );

        files.set(
          normalized,
          `${files.get(normalized) || ''}${String(content)}`
        );

        if (normalized === controls.failAppendAfterWritePath) {

          throw new Error(
            'forced event log append close failure'
          );
        }
      };
  }

  return adapter;
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
