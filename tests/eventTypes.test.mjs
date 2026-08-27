import assert from 'node:assert/strict';
import test from 'node:test';

import {
  rollDice
} from '../js/dice/diceEngine.js';

import {
  EVENT_TYPE_ERROR_CODES,
  EVENT_TYPE_PAYLOAD_VERSION,
  EVENT_TYPES_V1,
  EventTypeValidationError,
  RESERVED_FUTURE_EVENT_TYPES,
  createTypedEvent,
  isKnownEventType,
  isReservedFutureEventType,
  validateTypedEvent
} from '../js/events/eventTypes.js';

import {
  createDiceSequenceRandomInt
} from './fixtures/diceSequenceRandomInt.mjs';


const CREATED_AT =
  '2026-08-26T15:00:00.000Z';


test(
  'EventTypes exposes the stable v1 implemented vocabulary and reserved future groups',
  () => {

    assert.equal(
      EVENT_TYPE_PAYLOAD_VERSION,
      1
    );

    assert.deepEqual(
      EVENT_TYPES_V1,
      {
        ROLL_PERFORMED:
          'roll.performed',
        MANUAL_CORRECTION_RECORDED:
          'manual.correction.recorded',
        RESOURCE_CHANGED:
          'resource.changed',
        TRANSACTION_REVERSAL_RECORDED:
          'transaction.reversal.recorded'
      }
    );

    assert.deepEqual(
      RESERVED_FUTURE_EVENT_TYPES,
      {
        ACTION:
          'action.*',
        DAMAGE:
          'damage.*',
        HEALING:
          'healing.*',
        EFFECT:
          'effect.*',
        TURN:
          'turn.*',
        ROUND:
          'round.*',
        REST:
          'rest.*',
        MOVEMENT:
          'movement.*',
        SCENE_TRANSITION:
          'scene.transition.*'
      }
    );

    assert.equal(
      Object.isFrozen(
        EVENT_TYPES_V1
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        RESERVED_FUTURE_EVENT_TYPES
      ),
      true
    );

    assert.equal(
      isKnownEventType(
        EVENT_TYPES_V1.ROLL_PERFORMED
      ),
      true
    );

    assert.equal(
      isKnownEventType(
        'damage.applied'
      ),
      false
    );

    assert.equal(
      isReservedFutureEventType(
        'damage.applied'
      ),
      true
    );
  }
);


test(
  'EventTypes creates a validated roll event from a Dice Engine RollResult',
  () => {

    const roll =
      createRollResult();

    const event =
      createTypedEvent({
        eventId:
          'evt-roll-v1',
        transactionId:
          'txn-roll-v1',
        type:
          EVENT_TYPES_V1.ROLL_PERFORMED,
        createdAt:
          CREATED_AT,
        order:
          1,
        payload:
          {
            roll,
            context:
              {
                source:
                  'character-sheet',
                actorPageId:
                  'page-character-a',
                actionId:
                  'perception-check',
                label:
                  'Perception'
              }
          }
      });

    assert.equal(
      event.type,
      'roll.performed'
    );

    assert.equal(
      event.payloadVersion,
      1
    );

    assert.equal(
      event.payload.roll.kind,
      'dice-roll-result'
    );

    assert.equal(
      event.payload.roll.total,
      18
    );

    assert.deepEqual(
      event.payload.context,
      {
        actionId:
          'perception-check',
        actorPageId:
          'page-character-a',
        label:
          'Perception',
        source:
          'character-sheet'
      }
    );

    assert.equal(
      Object.isFrozen(
        event.payload.roll.dice[0].faces
      ),
      true
    );
  }
);


test(
  'EventTypes validates manual correction and resource change payloads',
  () => {

    const manualCorrection =
      createTypedEvent({
        eventId:
          'evt-manual-correction',
        transactionId:
          'txn-manual-correction',
        type:
          EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED,
        createdAt:
          CREATED_AT,
        order:
          1,
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
              13,
            after:
              17,
            reason:
              'GM adjustment'
          }
      });

    assert.deepEqual(
      manualCorrection.payload,
      {
        after:
          17,
        before:
          13,
        field:
          'initiative.total',
        reason:
          'GM adjustment',
        subject:
          {
            id:
              'character-a',
            kind:
              'character',
            label:
              'Aria'
          }
      }
    );

    const resourceChange =
      createTypedEvent({
        eventId:
          'evt-resource-change',
        transactionId:
          'txn-resource-change',
        type:
          EVENT_TYPES_V1.RESOURCE_CHANGED,
        createdAt:
          CREATED_AT,
        order:
          1,
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
              21,
            after:
              16,
            delta:
              -5,
            unit:
              'gp',
            reason:
              'manual resource note'
          }
      });

    assert.equal(
      resourceChange.payload.resource.kind,
      'page-property'
    );

    assert.equal(
      resourceChange.payload.delta,
      -5
    );
  }
);


test(
  'EventTypes keeps optional resource fields absent across repeated validation',
  () => {

    const event =
      createTypedEvent({
        eventId:
          'evt-resource-minimal',
        transactionId:
          'txn-resource-minimal',
        type:
          EVENT_TYPES_V1.RESOURCE_CHANGED,
        createdAt:
          CREATED_AT,
        order:
          1,
        payload:
          {
            resource:
              {
                kind:
                  'page-property',
                id:
                  'page-a:gold'
              },
            before:
              1,
            after:
              3,
            delta:
              2
          }
      });

    assert.deepEqual(
      event.payload,
      {
        after:
          3,
        before:
          1,
        delta:
          2,
        resource:
          {
            id:
              'page-a:gold',
            kind:
              'page-property'
          }
      }
    );

    assert.doesNotThrow(
      () => createTypedEvent(
        event
      )
    );
  }
);


test(
  'EventTypes validates transaction reversal metadata without deleting original history',
  () => {

    const event =
      createTypedEvent({
        eventId:
          'evt-reversal',
        transactionId:
          'txn-reversal',
        type:
          EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED,
        createdAt:
          CREATED_AT,
        order:
          1,
        reversesEventId:
          'evt-original',
        payload:
          {
            originalTransactionId:
              'txn-original',
            reversalTransactionId:
              'txn-reversal',
            reversedEventIds:
              [
                'evt-original'
              ],
            reason:
              'undo'
          }
      });

    assert.equal(
      event.reversesEventId,
      'evt-original'
    );

    assert.deepEqual(
      event.payload,
      {
        originalTransactionId:
          'txn-original',
        reason:
          'undo',
        reversalTransactionId:
          'txn-reversal',
        reversedEventIds:
          [
            'evt-original'
          ]
      }
    );
  }
);


test(
  'EventTypes rejects unknown and future-reserved event types',
  () => {

    assert.throws(
      () => createTypedEvent({
        eventId:
          'evt-unknown',
        transactionId:
          'txn-unknown',
        type:
          'map.token.moved',
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
        error.reservedFuture === false
    );

    assert.throws(
      () => createTypedEvent({
        eventId:
          'evt-future-damage',
        transactionId:
          'txn-future-damage',
        type:
          'damage.applied',
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
        error.reservedFuture === true
    );
  }
);


test(
  'EventTypes rejects unsupported payload versions without normalizing them',
  () => {

    assert.throws(
      () => createTypedEvent({
        eventId:
          'evt-version-2',
        transactionId:
          'txn-version-2',
        type:
          EVENT_TYPES_V1.RESOURCE_CHANGED,
        createdAt:
          CREATED_AT,
        order:
          1,
        payloadVersion:
          2,
        payload:
          {
            resource:
              {
                kind:
                  'page-property',
                id:
                  'page-a:gold'
              },
            before:
              3,
            after:
              4,
            delta:
              1
          }
      }),
      error =>
        error instanceof EventTypeValidationError &&
        error.code === EVENT_TYPE_ERROR_CODES.UNSUPPORTED_VERSION &&
        error.payloadVersion === 2 &&
        error.expectedVersion === 1
    );
  }
);


test(
  'EventTypes rejects arbitrary payload fields and executable-shaped values',
  () => {

    const roll =
      createRollResult();

    assert.throws(
      () => createTypedEvent({
        eventId:
          'evt-extra-roll-field',
        transactionId:
          'txn-extra-roll-field',
        type:
          EVENT_TYPES_V1.ROLL_PERFORMED,
        createdAt:
          CREATED_AT,
        order:
          1,
        payload:
          {
            roll,
            context:
              {
                source:
                  'test'
              },
            anything:
              {
                json:
                  true
              }
          }
      }),
      error =>
        error instanceof EventTypeValidationError &&
        error.code === EVENT_TYPE_ERROR_CODES.INVALID_PAYLOAD &&
        error.field === 'anything'
    );

    assert.throws(
      () => createTypedEvent({
        eventId:
          'evt-function-context',
        transactionId:
          'txn-function-context',
        type:
          EVENT_TYPES_V1.ROLL_PERFORMED,
        createdAt:
          CREATED_AT,
        order:
          1,
        payload:
          {
            roll,
            context:
              {
                source:
                  () => 'not data'
              }
          }
      }),
      error =>
        error instanceof EventTypeValidationError &&
        error.code === EVENT_TYPE_ERROR_CODES.INVALID_PAYLOAD &&
        error.field === 'payload.context.source'
    );

    assert.throws(
      () => createTypedEvent({
        eventId:
          'evt-object-before',
        transactionId:
          'txn-object-before',
        type:
          EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED,
        createdAt:
          CREATED_AT,
        order:
          1,
        payload:
          {
            subject:
              {
                kind:
                  'character',
                id:
                  'character-a'
              },
            field:
              'name',
            before:
              {
                arbitrary:
                  'object'
              },
            after:
              'Aria'
          }
      }),
      error =>
        error instanceof EventTypeValidationError &&
        error.field === 'payload.before'
    );
  }
);


test(
  'EventTypes returns structured validation results for future consumers',
  () => {

    const valid =
      validateTypedEvent({
        eventId:
          'evt-valid-result',
        transactionId:
          'txn-valid-result',
        type:
          EVENT_TYPES_V1.RESOURCE_CHANGED,
        createdAt:
          CREATED_AT,
        order:
          1,
        payload:
          {
            resource:
              {
                kind:
                  'page-property',
                id:
                  'page-a:gold'
              },
            before:
              10,
            after:
              8,
            delta:
              -2
          }
      });

    assert.deepEqual(
      valid,
      {
        kind:
          'mow-event-type-validation',
        version:
          1,
        ok:
          true,
        type:
          'resource.changed',
        payloadVersion:
          1
      }
    );

    const invalid =
      validateTypedEvent({
        eventId:
          'evt-invalid-result',
        transactionId:
          'txn-invalid-result',
        type:
          'turn.started',
        createdAt:
          CREATED_AT,
        order:
          1,
        payload:
          {}
      });

    assert.equal(
      invalid.ok,
      false
    );

    assert.equal(
      invalid.error.code,
      EVENT_TYPE_ERROR_CODES.UNKNOWN_TYPE
    );

    assert.equal(
      invalid.error.reservedFuture,
      true
    );
  }
);


function createRollResult() {

  const rng =
    createDiceSequenceRandomInt([
      18
    ]);

  return rollDice(
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
  );
}
