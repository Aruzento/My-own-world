import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';

import {
  appendTransactionRecord,
  EVENT_TRANSACTION_LOG_PATH,
  readEventTransactions
} from '../js/events/eventStore.js';

import {
  EVENT_TYPE_ERROR_CODES,
  EVENT_TYPES_V1,
  EventTypeValidationError,
  createTypedEvent
} from '../js/events/eventTypes.js';

import {
  appendTransactionEvent,
  completeTransaction,
  createTransaction
} from '../js/events/transactionModel.js';

import {
  normalizeWorkspacePath
} from '../js/storage/storageAdapterContract.js';


const CREATED_AT =
  '2026-08-27T18:00:00.000Z';

const COMPLETED_AT =
  '2026-08-27T18:00:01.000Z';


test(
  'future-style event adapters can append through the public transaction and store boundary',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const transaction =
      createFutureAdapterStyleTransaction();

    const appendResult =
      await appendTransactionRecord(
        transaction,
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      appendResult.status,
      'durable'
    );

    assert.deepEqual(
      adapter.writePaths,
      [
        EVENT_TRANSACTION_LOG_PATH
      ]
    );

    assert.equal(
      adapter.writePaths.some(path =>
        path.startsWith('pages/')
      ),
      false
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
      transactions[0].intentType,
      'future-adapter-contract'
    );

    assert.deepEqual(
      transactions[0].events.map(event => event.type),
      [
        EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED,
        EVENT_TYPES_V1.RESOURCE_CHANGED
      ]
    );

    assert.equal(
      transactions[0].events[1].payload.resource.id,
      'future-target-a:focus'
    );
  }
);


test(
  'EventStore delegates event vocabulary to EventTypes instead of concrete adapters',
  async () => {

    const source =
      await readFile(
        new URL(
          '../js/events/eventStore.js',
          import.meta.url
        ),
        'utf8'
      );

    assert.match(
      source,
      /createTypedEvent/
    );

    for (const forbidden of [
      'EVENT_TYPES_V1',
      'ROLL_PERFORMED',
      'RESOURCE_CHANGED',
      'diceRollEventLog',
      'pagePropertyResourceTransaction',
      'transactionReversal',
      'CampaignMapStore',
      'CharacterModel',
      'combat'
    ]) {

      assert.equal(
        source.includes(forbidden),
        false,
        `eventStore must not branch on ${forbidden}`
      );
    }
  }
);


test(
  'future reserved event namespaces stay blocked until their typed payload contract exists',
  () => {

    for (const type of [
      'action.started',
      'damage.applied',
      'healing.applied',
      'effect.added',
      'turn.started',
      'round.started',
      'rest.completed',
      'movement.performed',
      'scene.transition.started'
    ]) {

      assert.throws(
        () => createTypedEvent({
          eventId:
            `evt-${type.replaceAll('.', '-')}`,
          transactionId:
            'txn-future-reserved',
          type,
          createdAt:
            CREATED_AT,
          order:
            1,
          payload:
            {}
        }),
        error =>
          error instanceof EventTypeValidationError &&
          error.code === EVENT_TYPE_ERROR_CODES.UNKNOWN_TYPE &&
          error.reservedFuture === true,
        `${type} must remain vocabulary-only until a future leaf implements the payload contract`
      );
    }
  }
);


function createFutureAdapterStyleTransaction() {

  return completeTransaction(
    appendTransactionEvent(
      appendTransactionEvent(
        createTransaction({
          transactionId:
            'txn-future-adapter-contract',
          intentType:
            'future-adapter-contract',
          label:
            'Future adapter contract fixture',
          source:
            'future-adapter-test',
          reason:
            'contract-test',
          createdAt:
            CREATED_AT,
          order:
            1
        }),
        {
          eventId:
            'evt-future-manual-context',
          type:
            EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED,
          createdAt:
            CREATED_AT,
          payload:
            {
              subject:
                {
                  kind:
                    'future-target',
                  id:
                    'future-target-a',
                  label:
                    'Future Target'
                },
              field:
                'focus.mode',
              before:
                'idle',
              after:
                'active',
              reason:
                'adapter fixture'
            }
        }
      ),
      {
        eventId:
          'evt-future-resource-context',
        type:
          EVENT_TYPES_V1.RESOURCE_CHANGED,
        createdAt:
          COMPLETED_AT,
        payload:
          {
            resource:
              {
                kind:
                  'future-resource',
                id:
                  'future-target-a:focus',
                label:
                  'Focus'
              },
            before:
              0,
            after:
              1,
            delta:
              1,
            unit:
              'step',
            reason:
              'adapter fixture'
          }
      }
    ),
    {
      completedAt:
        COMPLETED_AT
    }
  );
}


function createMemoryStorageAdapter() {

  const files =
    new Map();

  const writePaths =
    [];

  return {
    kind:
      'desktop',

    files,

    writePaths,

    getWorkspaceRoot() {

      return 'memory-event-future-adapter';
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

      const normalized =
        normalizeWorkspacePath(
          path
        );

      writePaths.push(
        normalized
      );

      files.set(
        normalized,
        String(content)
      );
    },

    async appendText(path, content) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      writePaths.push(
        normalized
      );

      files.set(
        normalized,
        `${files.get(normalized) || ''}${content}`
      );
    }
  };
}
