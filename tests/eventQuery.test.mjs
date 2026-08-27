import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendTransactionRecord,
  EVENT_TRANSACTION_LOG_PATH
} from '../js/events/eventStore.js';

import {
  EVENT_TYPES_V1
} from '../js/events/eventTypes.js';

import {
  appendTransactionEvent,
  completeTransaction,
  createTransaction
} from '../js/events/transactionModel.js';

import {
  EVENT_QUERY_ERROR_CODES,
  EVENT_QUERY_MAX_LIMIT,
  EventQueryError,
  getEventTransactionById,
  queryEventLog
} from '../js/events/eventQuery.js';

import {
  rollDice
} from '../js/dice/diceEngine.js';

import {
  normalizeWorkspacePath
} from '../js/storage/storageAdapterContract.js';

import {
  createDiceSequenceRandomInt
} from './fixtures/diceSequenceRandomInt.mjs';


const BASE_TIME =
  '2026-08-27T12:00:00.000Z';


test(
  'EventQuery returns recent events in durable log order without exposing storage records',
  async () => {

    const adapter =
      await createPopulatedEventLog();

    const result =
      await queryEventLog(
        {
          limit:
            3
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      result.kind,
      'mow-event-query-result'
    );

    assert.equal(
      result.items.length,
      3
    );

    assert.deepEqual(
      result.items.map(item => item.event.eventId),
      [
        'evt-reversal-metadata',
        'evt-undo-resource',
        'evt-manual-token'
      ]
    );

    assert.deepEqual(
      result.items.map(item => item.logOrder),
      [
        5,
        4,
        3
      ]
    );

    assert.equal(
      result.totalMatched,
      5
    );

    assert.equal(
      result.hasMore,
      true
    );

    assert.equal(
      typeof result.nextCursor,
      'string'
    );

    assert.equal(
      Object.hasOwn(result.items[0], 'record'),
      false
    );

    assert.equal(
      Object.hasOwn(result.items[0].transaction, 'events'),
      false
    );
  }
);


test(
  'EventQuery paginates bounded results with a stable cursor',
  async () => {

    const adapter =
      await createPopulatedEventLog();

    const firstPage =
      await queryEventLog(
        {
          limit:
            2
        },
        {
          storageAdapter:
            adapter
        }
      );

    const secondPage =
      await queryEventLog(
        {
          limit:
            2,
          cursor:
            firstPage.nextCursor
        },
        {
          storageAdapter:
            adapter
        }
      );

    const thirdPage =
      await queryEventLog(
        {
          limit:
            2,
          cursor:
            secondPage.nextCursor
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      firstPage.items.map(item => item.event.eventId),
      [
        'evt-reversal-metadata',
        'evt-undo-resource'
      ]
    );

    assert.deepEqual(
      secondPage.items.map(item => item.event.eventId),
      [
        'evt-manual-token',
        'evt-resource-gold'
      ]
    );

    assert.deepEqual(
      thirdPage.items.map(item => item.event.eventId),
      [
        'evt-roll-actor'
      ]
    );

    assert.equal(
      thirdPage.hasMore,
      false
    );

    assert.equal(
      thirdPage.nextCursor,
      null
    );
  }
);


test(
  'EventQuery supports chronological ordering and bounded order ranges',
  async () => {

    const adapter =
      await createPopulatedEventLog();

    const result =
      await queryEventLog(
        {
          direction:
            'asc',
          orderFrom:
            2,
          orderTo:
            4,
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      result.items.map(item => [
        item.logOrder,
        item.event.eventId
      ]),
      [
        [
          2,
          'evt-resource-gold'
        ],
        [
          3,
          'evt-manual-token'
        ],
        [
          4,
          'evt-undo-resource'
        ]
      ]
    );
  }
);


test(
  'EventQuery filters by transaction id and reads a transaction by id',
  async () => {

    const adapter =
      await createPopulatedEventLog();

    const result =
      await queryEventLog(
        {
          transactionId:
            'txn-undo-resource',
          direction:
            'asc',
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      result.items.map(item => item.event.eventId),
      [
        'evt-undo-resource',
        'evt-reversal-metadata'
      ]
    );

    const transaction =
      await getEventTransactionById(
        'txn-undo-resource',
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      transaction.transactionId,
      'txn-undo-resource'
    );

    assert.deepEqual(
      transaction.events.map(event => event.eventId),
      [
        'evt-undo-resource',
        'evt-reversal-metadata'
      ]
    );
  }
);


test(
  'EventQuery filters by event type and entity id where payloads expose targets',
  async () => {

    const adapter =
      await createPopulatedEventLog();

    const resourceEvents =
      await queryEventLog(
        {
          eventType:
            EVENT_TYPES_V1.RESOURCE_CHANGED,
          direction:
            'asc',
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      resourceEvents.items.map(item => item.event.eventId),
      [
        'evt-resource-gold',
        'evt-undo-resource'
      ]
    );

    const rollByActor =
      await queryEventLog(
        {
          entityId:
            'actor-a',
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      rollByActor.items.map(item => item.event.eventId),
      [
        'evt-roll-actor'
      ]
    );

    const resourceById =
      await queryEventLog(
        {
          entityId:
            'page-a:gold',
          direction:
            'asc',
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      resourceById.items.map(item => item.event.eventId),
      [
        'evt-resource-gold',
        'evt-undo-resource'
      ]
    );

    const manualBySubject =
      await queryEventLog(
        {
          entityId:
            'token-a',
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      manualBySubject.items.map(item => item.event.eventId),
      [
        'evt-manual-token'
      ]
    );
  }
);


test(
  'EventQuery filters by event createdAt range',
  async () => {

    const adapter =
      await createPopulatedEventLog();

    const result =
      await queryEventLog(
        {
          direction:
            'asc',
          createdAtFrom:
            timestamp(2),
          createdAtTo:
            timestamp(3),
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      result.items.map(item => item.event.eventId),
      [
        'evt-resource-gold',
        'evt-manual-token'
      ]
    );
  }
);


test(
  'EventQuery returns empty results for empty history and unknown ids',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const empty =
      await queryEventLog(
        {
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      empty.items,
      []
    );

    assert.equal(
      empty.totalMatched,
      0
    );

    assert.equal(
      empty.hasMore,
      false
    );

    const missingEvents =
      await queryEventLog(
        {
          transactionId:
            'txn-missing',
          eventType:
            EVENT_TYPES_V1.ROLL_PERFORMED,
          entityId:
            'missing-entity',
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      missingEvents.items,
      []
    );

    const missingTransaction =
      await getEventTransactionById(
        'txn-missing',
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      missingTransaction,
      null
    );
  }
);


test(
  'EventQuery rejects over-limit requests instead of silently returning an unbounded log',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    await assert.rejects(
      () => queryEventLog(
        {
          limit:
            EVENT_QUERY_MAX_LIMIT + 1
        },
        {
          storageAdapter:
            adapter
        }
      ),
      error =>
        error instanceof EventQueryError &&
        error.code === EVENT_QUERY_ERROR_CODES.INVALID_INPUT &&
        error.field === 'limit'
    );
  }
);


test(
  'EventQuery reloads durable events through the public read facade',
  async () => {

    const adapter =
      await createPopulatedEventLog();

    const firstRead =
      await queryEventLog(
        {
          entityId:
            'target-a',
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    const secondRead =
      await queryEventLog(
        {
          entityId:
            'target-a',
          limit:
            10
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      secondRead,
      firstRead
    );

    assert.equal(
      adapter.files.has(EVENT_TRANSACTION_LOG_PATH),
      true
    );
  }
);


async function createPopulatedEventLog() {

  const adapter =
    createMemoryStorageAdapter();

  for (const transaction of createFixtureTransactions()) {

    await appendTransactionRecord(
      transaction,
      {
        storageAdapter:
          adapter
      }
    );
  }

  return adapter;
}


function createFixtureTransactions() {

  return [
    createSingleEventTransaction({
      transactionId:
        'txn-roll-actor',
      eventId:
        'evt-roll-actor',
      eventType:
        EVENT_TYPES_V1.ROLL_PERFORMED,
      createdAt:
        timestamp(1),
      order:
        1,
      payload:
        {
          roll:
            rollDice(
              {
                formula:
                  'd20 + 2',
                mode:
                  'normal',
                criticalPolicy:
                  'none'
              },
              {
                randomInt:
                  createDiceSequenceRandomInt([
                    13
                  ]).randomInt
              }
            ),
          context:
            {
              actorId:
                'actor-a',
              targetId:
                'target-a',
              label:
                'Perception'
            }
        }
    }),
    createSingleEventTransaction({
      transactionId:
        'txn-resource-gold',
      eventId:
        'evt-resource-gold',
      eventType:
        EVENT_TYPES_V1.RESOURCE_CHANGED,
      createdAt:
        timestamp(2),
      order:
        2,
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
            8,
          after:
            5,
          delta:
            -3,
          unit:
            'gp',
          reason:
            'spend'
        }
    }),
    createSingleEventTransaction({
      transactionId:
        'txn-manual-token',
      eventId:
        'evt-manual-token',
      eventType:
        EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED,
      createdAt:
        timestamp(3),
      order:
        3,
      payload:
        {
          subject:
            {
              kind:
                'campaign-map-token',
              id:
                'token-a',
              label:
                'Guard'
            },
          field:
            'initiative.total',
          before:
            11,
          after:
            15,
          reason:
            'gm-correction'
        }
    }),
    completeTransaction(
      appendTransactionEvent(
        appendTransactionEvent(
          createTransaction({
            transactionId:
              'txn-undo-resource',
            intentType:
              'undo',
            label:
              'Undo resource',
            source:
              'unit-test',
            reason:
              'undo',
            createdAt:
              timestamp(4),
            order:
              4,
            reversesTransactionId:
              'txn-resource-gold'
          }),
          {
            eventId:
              'evt-undo-resource',
            type:
              EVENT_TYPES_V1.RESOURCE_CHANGED,
            createdAt:
              timestamp(4),
            reversesEventId:
              'evt-resource-gold',
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
                  5,
                after:
                  8,
                delta:
                  3,
                unit:
                  'gp',
                reason:
                  'undo'
              }
          }
        ),
        {
          eventId:
            'evt-reversal-metadata',
          type:
            EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED,
          createdAt:
            timestamp(5),
          payload:
            {
              originalTransactionId:
                'txn-resource-gold',
              reversalTransactionId:
                'txn-undo-resource',
              reversedEventIds:
                [
                  'evt-resource-gold'
                ],
              reason:
                'undo'
            }
        }
      ),
      {
        completedAt:
          timestamp(5)
      }
    )
  ];
}


function createSingleEventTransaction({
  transactionId,
  eventId,
  eventType,
  createdAt,
  order,
  payload
}) {

  return completeTransaction(
    appendTransactionEvent(
      createTransaction({
        transactionId,
        intentType:
          eventType,
        label:
          transactionId,
        source:
          'unit-test',
        reason:
          'query-fixture',
        createdAt,
        order
      }),
      {
        eventId,
        type:
          eventType,
        createdAt,
        payload
      }
    ),
    {
      completedAt:
        createdAt
    }
  );
}


function timestamp(
  minute
) {

  const date =
    new Date(
      BASE_TIME
    );

  date.setUTCMinutes(
    date.getUTCMinutes() + minute
  );

  return date.toISOString();
}


function createMemoryStorageAdapter() {

  const files =
    new Map();

  return {
    kind:
      'desktop',

    files,

    getWorkspaceRoot() {

      return 'memory-event-query';
    },

    async ensureDirectory() {},

    async readText(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      if (!files.has(normalized)) {

        throw new Error(
          `File not found: ${normalized}`
        );
      }

      return files.get(
        normalized
      );
    },

    async writeText(path, content) {

      files.set(
        normalizeWorkspacePath(
          path
        ),
        String(content)
      );
    },

    async appendText(path, content) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      files.set(
        normalized,
        `${files.get(normalized) || ''}${content}`
      );
    }
  };
}
