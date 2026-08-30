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
  createEventHistoryViewModel
} from '../js/ui/eventHistoryPanel.js';

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
  '2026-08-30T08:00:00.000Z';


test(
  'Event History view model uses one durable snapshot for populated refresh and transaction lookup shaping',
  async () => {

    const adapter =
      await createPopulatedEventHistoryAdapter({
        workspaceLabel:
          'Alpha'
      });

    const viewModel =
      await createEventHistoryViewModel(
        {},
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

    assert.equal(
      viewModel.returnedCount,
      6
    );

    assert.equal(
      new Set(
        viewModel.items.map(item => item.transactionId)
      ).size > 3,
      true
    );

    assert.equal(
      viewModel.items.find(item =>
        item.eventId === 'evt-alpha-resource-open'
      )?.canUndo,
      true
    );

    assert.equal(
      viewModel.items.find(item =>
        item.eventId === 'evt-alpha-resource-gold'
      )?.canUndo,
      false
    );
  }
);


test(
  'Event History filtering and pagination do not add reads inside one refresh',
  async () => {

    const adapter =
      await createPopulatedEventHistoryAdapter({
        workspaceLabel:
          'Filter'
      });

    const viewModel =
      await createEventHistoryViewModel(
        {
          eventType:
            EVENT_TYPES_V1.RESOURCE_CHANGED,
          direction:
            'asc',
          limit:
            2
        },
        {
          storageAdapter:
            adapter
        }
      );

    assert.deepEqual(
      viewModel.items.map(item => item.eventId),
      [
        'evt-filter-resource-gold',
        'evt-filter-undo-resource'
      ]
    );

    assert.equal(
      viewModel.hasMore,
      true
    );

    assert.deepEqual(
      adapter.readPaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );
  }
);


test(
  'Event History explicit refresh performs exactly one new durable read',
  async () => {

    const adapter =
      await createPopulatedEventHistoryAdapter({
        workspaceLabel:
          'Refresh'
      });

    await createEventHistoryViewModel(
      {},
      {
        storageAdapter:
          adapter
      }
    );

    await createEventHistoryViewModel(
      {},
      {
        storageAdapter:
          adapter
      }
    );

    assert.deepEqual(
      adapter.readPaths,
      [
        EVENT_TRANSACTION_LOG_PATH,
        EVENT_TRANSACTION_LOG_PATH
      ]
    );
  }
);


test(
  'Event History workspace switch reads the new workspace once and does not reuse the old snapshot',
  async () => {

    const firstAdapter =
      await createPopulatedEventHistoryAdapter({
        workspaceLabel:
          'First'
      });

    const secondAdapter =
      await createPopulatedEventHistoryAdapter({
        workspaceLabel:
          'Second'
      });

    const firstView =
      await createEventHistoryViewModel(
        {},
        {
          storageAdapter:
            firstAdapter
        }
      );

    const secondView =
      await createEventHistoryViewModel(
        {},
        {
          storageAdapter:
            secondAdapter
        }
      );

    assert.equal(
      firstAdapter.readPaths.length,
      1
    );

    assert.equal(
      secondAdapter.readPaths.length,
      1
    );

    assert.equal(
      firstView.items.some(item =>
        item.label.includes('Second')
      ),
      false
    );

    assert.equal(
      secondView.items.some(item =>
        item.label.includes('Second')
      ),
      true
    );
  }
);


test(
  'Event History invalid record reporting comes from one snapshot read',
  async () => {

    const adapter =
      await createPopulatedEventHistoryAdapter({
        workspaceLabel:
          'Invalid',
        includeInvalidRecord:
          true
      });

    const viewModel =
      await createEventHistoryViewModel(
        {},
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      viewModel.invalidRecordCount,
      1
    );

    assert.equal(
      viewModel.returnedCount,
      6
    );

    assert.deepEqual(
      adapter.readPaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );
  }
);


async function createPopulatedEventHistoryAdapter({
  workspaceLabel,
  includeInvalidRecord =
    false
}) {

  const adapter =
    createCountingEventStorageAdapter(
      workspaceLabel
    );

  for (const transaction of createFixtureTransactions(workspaceLabel)) {

    await appendTransactionRecord(
      transaction,
      {
        storageAdapter:
          adapter
      }
    );
  }

  if (includeInvalidRecord) {

    const current =
      adapter.files.get(
        EVENT_TRANSACTION_LOG_PATH
      ) || '';

    adapter.files.set(
      EVENT_TRANSACTION_LOG_PATH,
      `${current}{not-valid-json}\n`
    );
  }

  adapter.readPaths.length =
    0;

  return adapter;
}


function createFixtureTransactions(
  workspaceLabel
) {

  const idPrefix =
    workspaceLabel.toLowerCase();

  return [
    createSingleEventTransaction({
      transactionId:
        `txn-${idPrefix}-roll`,
      eventId:
        `evt-${idPrefix}-roll`,
      eventType:
        EVENT_TYPES_V1.ROLL_PERFORMED,
      createdAt:
        timestamp(1),
      order:
        1,
      label:
        `${workspaceLabel} roll`,
      payload:
        {
          roll:
            rollDice(
              {
                formula:
                  '2d6 + 3',
                mode:
                  'normal',
                criticalPolicy:
                  'none'
              },
              {
                randomInt:
                  createDiceSequenceRandomInt([
                    2,
                    5
                  ]).randomInt
              }
            ),
          context:
            {
              actorId:
                `${idPrefix}-actor`
            }
        }
    }),
    createSingleEventTransaction({
      transactionId:
        `txn-${idPrefix}-resource-gold`,
      eventId:
        `evt-${idPrefix}-resource-gold`,
      eventType:
        EVENT_TYPES_V1.RESOURCE_CHANGED,
      createdAt:
        timestamp(2),
      order:
        2,
      label:
        `${workspaceLabel} spent gold`,
      payload:
        {
          resource:
            {
              kind:
                'page-property',
              id:
                `${idPrefix}-page:gold`,
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
        `txn-${idPrefix}-manual`,
      eventId:
        `evt-${idPrefix}-manual`,
      eventType:
        EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED,
      createdAt:
        timestamp(3),
      order:
        3,
      label:
        `${workspaceLabel} correction`,
      payload:
        {
          subject:
            {
              kind:
                'campaign-map-token',
              id:
                `${idPrefix}-token`,
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
              `txn-${idPrefix}-undo-resource`,
            intentType:
              'undo',
            label:
              `${workspaceLabel} undo gold`,
            source:
              'unit-test',
            reason:
              'undo',
            createdAt:
              timestamp(4),
            order:
              4,
            reversesTransactionId:
              `txn-${idPrefix}-resource-gold`
          }),
          {
            eventId:
              `evt-${idPrefix}-undo-resource`,
            type:
              EVENT_TYPES_V1.RESOURCE_CHANGED,
            createdAt:
              timestamp(4),
            reversesEventId:
              `evt-${idPrefix}-resource-gold`,
            payload:
              {
                resource:
                  {
                    kind:
                      'page-property',
                    id:
                      `${idPrefix}-page:gold`,
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
            `evt-${idPrefix}-reversal-metadata`,
          type:
            EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED,
          createdAt:
            timestamp(5),
          payload:
            {
              originalTransactionId:
                `txn-${idPrefix}-resource-gold`,
              reversalTransactionId:
                `txn-${idPrefix}-undo-resource`,
              reversedEventIds:
                [
                  `evt-${idPrefix}-resource-gold`
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
    ),
    createSingleEventTransaction({
      transactionId:
        `txn-${idPrefix}-resource-open`,
      eventId:
        `evt-${idPrefix}-resource-open`,
      eventType:
        EVENT_TYPES_V1.RESOURCE_CHANGED,
      createdAt:
        timestamp(6),
      order:
        6,
      label:
        `${workspaceLabel} open resource`,
      payload:
        {
          resource:
            {
              kind:
                'page-property',
              id:
                `${idPrefix}-page:rations`,
              label:
                'Rations'
            },
          before:
            3,
          after:
            2,
          delta:
            -1,
          reason:
            'camp'
        }
    })
  ];
}


function createSingleEventTransaction({
  transactionId,
  eventId,
  eventType,
  createdAt,
  order,
  label,
  payload
}) {

  return completeTransaction(
    appendTransactionEvent(
      createTransaction({
        transactionId,
        intentType:
          eventType,
        label,
        source:
          'unit-test',
        reason:
          'event-history-fixture',
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


function createCountingEventStorageAdapter(
  workspaceLabel
) {

  const files =
    new Map();

  const readPaths =
    [];

  return {
    kind:
      'desktop',

    files,
    readPaths,

    getWorkspaceRoot() {

      return `memory-event-history-${workspaceLabel}`;
    },

    async ensureDirectory() {},

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
