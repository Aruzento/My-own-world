import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendTransactionEvent,
  completeTransaction,
  createReversalTransaction,
  createTransaction,
  createTransactionEvent,
  failTransaction,
  markTransactionReversed,
  serializeTransaction,
  TransactionModelError,
  TRANSACTION_MODEL_ERROR_CODES,
  TRANSACTION_STATUSES
} from '../js/events/transactionModel.js';


const CREATED_AT =
  '2026-08-26T08:30:00.000Z';

const COMPLETED_AT =
  '2026-08-26T08:30:01.000Z';


test(
  'TransactionModel creates a one-event completed transaction',
  () => {

    const started =
      createTransaction({
        transactionId:
          'txn-roll-check-1',
        intentType:
          'roll-check',
        label:
          'Roll perception',
        source:
          'character-sheet',
        reason:
          'user-roll',
        createdAt:
          CREATED_AT,
        order:
          1
      });

    const withEvent =
      appendTransactionEvent(
        started,
        {
          eventId:
            'evt-roll-1',
          type:
            'roll.performed',
          createdAt:
            CREATED_AT,
          payload:
            {
              context:
                {
                  actorId:
                    'character-a'
                },
              roll:
                {
                  kind:
                    'dice-roll-result',
                  version:
                    1,
                  total:
                    17
                }
            }
        }
      );

    const completed =
      completeTransaction(
        withEvent,
        {
          completedAt:
            COMPLETED_AT
        }
      );

    assert.equal(
      completed.status,
      TRANSACTION_STATUSES.COMPLETED
    );

    assert.equal(
      completed.transactionId,
      'txn-roll-check-1'
    );

    assert.equal(
      completed.events.length,
      1
    );

    assert.equal(
      completed.events[0].transactionId,
      completed.transactionId
    );

    assert.equal(
      completed.events[0].order,
      1
    );

    assert.equal(
      completed.events[0].payload.roll.total,
      17
    );
  }
);


test(
  'TransactionModel preserves deterministic multi-event ordering',
  () => {

    let transaction =
      createTransaction({
        transactionId:
          'txn-map-operation-1',
        intentType:
          'map-token-update',
        label:
          'Move token',
        source:
          'campaign-map',
        reason:
          'drag',
        createdAt:
          CREATED_AT,
        order:
          2
      });

    transaction =
      appendTransactionEvent(
        transaction,
        {
          eventId:
            'evt-map-before',
          type:
            'map.token.move-requested',
          createdAt:
            CREATED_AT,
          payload:
            {
              tokenId:
                'token-a',
              x:
                10,
              y:
                20
            }
        }
      );

    transaction =
      appendTransactionEvent(
        transaction,
        {
          eventId:
            'evt-map-after',
          type:
            'map.token.moved',
          createdAt:
            COMPLETED_AT,
          payload:
            {
              tokenId:
                'token-a',
              x:
                16,
              y:
                24
            }
        }
      );

    assert.deepEqual(
      transaction.events.map(event =>
        [
          event.eventId,
          event.order
        ]
      ),
      [
        [
          'evt-map-before',
          1
        ],
        [
          'evt-map-after',
          2
        ]
      ]
    );

    assert.throws(
      () => appendTransactionEvent(
        transaction,
        {
          eventId:
            'evt-map-duplicate-order',
          type:
            'map.token.audit',
          createdAt:
            COMPLETED_AT,
          order:
            2,
          payload:
            {}
        }
      ),
      error =>
        error instanceof TransactionModelError &&
        error.code === TRANSACTION_MODEL_ERROR_CODES.EVENT_ORDER
    );
  }
);


test(
  'TransactionModel records failed state without allowing later mutation',
  () => {

    const started =
      createTransaction({
        transactionId:
          'txn-failed-1',
        intentType:
          'page-command',
        label:
          'Save page',
        source:
          'editor',
        reason:
          'manual-save',
        createdAt:
          CREATED_AT,
        order:
          3
      });

    const failed =
      failTransaction(
        started,
        {
          failedAt:
            COMPLETED_AT,
          code:
            'WRITE_FAILED',
          error:
            new Error(
              'disk unavailable'
            )
        }
      );

    assert.equal(
      failed.status,
      TRANSACTION_STATUSES.FAILED
    );

    assert.equal(
      failed.failedAt,
      COMPLETED_AT
    );

    assert.deepEqual(
      failed.failure,
      {
        code:
          'WRITE_FAILED',
        message:
          'disk unavailable'
      }
    );

    assert.throws(
      () => appendTransactionEvent(
        failed,
        {
          eventId:
            'evt-after-failure',
          type:
            'page.changed',
          createdAt:
            COMPLETED_AT,
          payload:
            {}
        }
      ),
      /transaction is failed/
    );

    assert.throws(
      () => completeTransaction(
        failed,
        {
          completedAt:
            COMPLETED_AT
        }
      ),
      /transaction is failed/
    );
  }
);


test(
  'TransactionModel completed transactions are immutable',
  () => {

    const completed =
      completeTransaction(
        appendTransactionEvent(
          createTransaction({
            transactionId:
              'txn-immutable-1',
            intentType:
              'roll-check',
            label:
              'Immutable roll',
            source:
              'dice',
            reason:
              'test',
            createdAt:
              CREATED_AT,
            order:
              4
          }),
          {
            eventId:
              'evt-immutable-1',
            type:
              'roll.performed',
            createdAt:
              CREATED_AT,
            payload:
              {
                roll:
                  {
                    total:
                      20
                  }
              }
          }
        ),
        {
          completedAt:
            COMPLETED_AT
        }
      );

    assert.equal(
      Object.isFrozen(completed),
      true
    );

    assert.equal(
      Object.isFrozen(completed.events),
      true
    );

    assert.equal(
      Object.isFrozen(completed.events[0].payload.roll),
      true
    );

    assert.throws(
      () => {
        completed.events.push(
          createTransactionEvent({
            eventId:
              'evt-late',
            transactionId:
              completed.transactionId,
            type:
              'late.event',
            createdAt:
              COMPLETED_AT,
            order:
              2,
            payload:
              {}
          })
        );
      },
      TypeError
    );

    assert.throws(
      () => appendTransactionEvent(
        completed,
        {
          eventId:
            'evt-late-2',
          type:
            'late.event',
          createdAt:
            COMPLETED_AT,
          payload:
            {}
        }
      ),
      /transaction is completed/
    );
  }
);


test(
  'TransactionModel supports reversal and undo linkage',
  () => {

    const original =
      completeTransaction(
        appendTransactionEvent(
          createTransaction({
            transactionId:
              'txn-original',
            intentType:
              'roll-check',
            label:
              'Original roll',
            source:
              'quick-roll',
            reason:
              'user-roll',
            createdAt:
              CREATED_AT,
            order:
              5
          }),
          {
            eventId:
              'evt-original',
            type:
              'roll.performed',
            createdAt:
              CREATED_AT,
            payload:
              {
                total:
                  12
              }
          }
        ),
        {
          completedAt:
            COMPLETED_AT
        }
      );

    const reversal =
      createReversalTransaction({
        transactionId:
          'txn-undo-original',
        targetTransaction:
          original,
        intentType:
          'undo-roll',
        label:
          'Undo original roll',
        source:
          'history',
        reason:
          'user-undo',
        createdAt:
          '2026-08-26T08:30:02.000Z',
        order:
          6
      });

    assert.equal(
      reversal.reversesTransactionId,
      original.transactionId
    );

    const reversed =
      markTransactionReversed(
        original,
        {
          reversedByTransactionId:
            reversal.transactionId
        }
      );

    assert.equal(
      reversed.reversedByTransactionId,
      reversal.transactionId
    );

    const undoEvent =
      createTransactionEvent({
        eventId:
          'evt-undo-original',
        transactionId:
          reversal.transactionId,
        type:
          'roll.reversed',
        createdAt:
          '2026-08-26T08:30:02.000Z',
        order:
          1,
        payload:
          {
            originalEventId:
              'evt-original'
          },
        reversesEventId:
          'evt-original'
      });

    assert.equal(
      undoEvent.reversesEventId,
      'evt-original'
    );

    assert.throws(
      () => createReversalTransaction({
        transactionId:
          'txn-undo-started',
        targetTransaction:
          createTransaction({
            transactionId:
              'txn-started',
            intentType:
              'roll-check',
            label:
              'Started roll',
            source:
              'quick-roll',
            reason:
              'user-roll',
            createdAt:
              CREATED_AT,
            order:
              7
          }),
        createdAt:
          '2026-08-26T08:30:03.000Z',
        order:
          8
      }),
      error =>
        error instanceof TransactionModelError &&
        error.code === TRANSACTION_MODEL_ERROR_CODES.INVALID_STATE
    );
  }
);


test(
  'TransactionModel serialization has a stable subsystem-neutral shape',
  () => {

    const completed =
      completeTransaction(
        appendTransactionEvent(
          createTransaction({
            transactionId:
              'txn-serialize-1',
            intentType:
              'roll-check',
            label:
              'Serialize roll',
            source:
              'character-sheet',
            reason:
              'keyboard-shortcut',
            createdAt:
              CREATED_AT,
            order:
              7
          }),
          {
            eventId:
              'evt-serialize-1',
            type:
              'roll.performed',
            createdAt:
              CREATED_AT,
            payload:
              {
                zeta:
                  true,
                actorId:
                  'character-a',
                roll:
                  {
                    total:
                      15,
                    faces:
                      [
                        10
                      ]
                  }
              }
          }
        ),
        {
          completedAt:
            COMPLETED_AT
        }
      );

    assert.deepEqual(
      serializeTransaction(
        completed
      ),
      {
        kind:
          'mow-transaction',
        version:
          1,
        transactionId:
          'txn-serialize-1',
        intentType:
          'roll-check',
        label:
          'Serialize roll',
        source:
          'character-sheet',
        reason:
          'keyboard-shortcut',
        createdAt:
          CREATED_AT,
        order:
          7,
        status:
          'completed',
        events:
          [
            {
              kind:
                'mow-event',
              version:
                1,
              eventId:
                'evt-serialize-1',
              transactionId:
                'txn-serialize-1',
              type:
                'roll.performed',
              createdAt:
                CREATED_AT,
              order:
                1,
              payloadVersion:
                1,
              payload:
                {
                  actorId:
                    'character-a',
                  roll:
                    {
                      faces:
                        [
                          10
                        ],
                      total:
                        15
                    },
                  zeta:
                    true
                },
              reversesEventId:
                null,
              reversedByEventId:
                null
            }
          ],
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
      }
    );
  }
);


test(
  'TransactionModel rejects live or non-serializable payload data',
  () => {

    const transaction =
      createTransaction({
        transactionId:
          'txn-payload-1',
        intentType:
          'roll-check',
        label:
          'Payload guard',
        source:
          'test',
        reason:
          'test',
        createdAt:
          CREATED_AT,
        order:
          8
      });

    assert.throws(
      () => appendTransactionEvent(
        transaction,
        {
          eventId:
            'evt-function-payload',
          type:
            'roll.performed',
          createdAt:
            CREATED_AT,
          payload:
            {
              callback() {}
            }
        }
      ),
      error =>
        error instanceof TransactionModelError &&
        error.code ===
          TRANSACTION_MODEL_ERROR_CODES.PAYLOAD_NOT_SERIALIZABLE
    );

    assert.throws(
      () => createTransaction({
        transactionId:
          'txn-domain-object',
        intentType:
          'roll-check',
        label:
          'Bad transaction',
        source:
          'test',
        reason:
          'test',
        createdAt:
          CREATED_AT,
        order:
          9,
        character:
          {
            pageId:
              'character-a'
          }
      }),
      error =>
        error instanceof TransactionModelError &&
        error.field === 'character'
    );
  }
);
