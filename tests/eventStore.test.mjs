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


function createMemoryStorageAdapter(
  options = {}
) {

  const files =
    new Map();

  const directories =
    new Set([
      ''
    ]);

  const writePaths =
    [];

  const ensureDirectoryPaths =
    [];

  const removePaths =
    [];

  return {
    kind:
      'desktop',

    files,

    writePaths,

    ensureDirectoryPaths,

    removePaths,

    getWorkspaceRoot() {

      return 'memory-event-store';
    },

    async pickWorkspace() {

      return 'memory-event-store';
    },

    async restoreWorkspace() {

      return 'memory-event-store';
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

      if (normalized === options.failWritePath) {

        throw new Error(
          'forced event log write failure'
        );
      }

      writePaths.push(
        normalized
      );

      if (options.writeDelayMs) {

        await new Promise(resolve =>
          setTimeout(
            resolve,
            options.writeDelayMs
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
