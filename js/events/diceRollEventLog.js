import {
  rollDice
} from '../dice/diceEngine.js';

import {
  appendTransactionRecord
} from './eventStore.js';

import {
  EVENT_TYPES_V1,
  createTypedEvent
} from './eventTypes.js';

import {
  appendTransactionEvent,
  completeTransaction,
  createTransaction
} from './transactionModel.js';


export const DICE_ROLL_EVENT_LOG_VERSION =
  1;

export const DICE_ROLL_EVENT_LOG_RESULT_KIND =
  'mow-dice-roll-event-log-result';

export const DICE_ROLL_TRANSACTION_KIND =
  'mow-dice-roll-transaction';


export function createDiceRollTransaction(
  input = {},
  options = {}
) {

  const normalized =
    normalizeDiceRollEventInput(
      input
    );

  const roll =
    rollDice(
      normalized.request,
      {
        randomInt:
          options.randomInt
      }
    );

  const transaction =
    completeTransaction(
      appendTransactionEvent(
        createTransaction({
          transactionId:
            normalized.transactionId,
          intentType:
            normalized.intentType,
          label:
            normalized.label || `Roll ${roll.request.formulaOriginal}`,
          source:
            normalized.source,
          reason:
            normalized.reason,
          createdAt:
            normalized.createdAt,
          order:
            normalized.order
        }),
        createTypedEvent({
          eventId:
            normalized.eventId,
          transactionId:
            normalized.transactionId,
          type:
            EVENT_TYPES_V1.ROLL_PERFORMED,
          createdAt:
            normalized.eventCreatedAt,
          order:
            1,
          payload:
            {
              roll,
              context:
                normalized.context
            }
        })
      ),
      {
        completedAt:
          normalized.completedAt
      }
    );

  return deepFreeze({
    kind:
      DICE_ROLL_TRANSACTION_KIND,
    version:
      DICE_ROLL_EVENT_LOG_VERSION,
    roll,
    transaction
  });
}


export async function logDiceRoll(
  input = {},
  options = {}
) {

  const diceRollTransaction =
    createDiceRollTransaction(
      input,
      {
        randomInt:
          options.randomInt
      }
    );

  const appendResult =
    await appendTransactionRecord(
      diceRollTransaction.transaction,
      {
        storageAdapter:
          options.storageAdapter
      }
    );

  return deepFreeze({
    kind:
      DICE_ROLL_EVENT_LOG_RESULT_KIND,
    version:
      DICE_ROLL_EVENT_LOG_VERSION,
    status:
      appendResult.status,
    path:
      appendResult.path,
    roll:
      diceRollTransaction.roll,
    transaction:
      diceRollTransaction.transaction,
    record:
      appendResult.record
  });
}


function normalizeDiceRollEventInput(
  input
) {

  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(
      input
    )
  ) {

    throw new TypeError(
      'Dice roll event input must be an object.'
    );
  }

  assertAllowedKeys(
    input,
    [
      'request',
      'transactionId',
      'eventId',
      'createdAt',
      'eventCreatedAt',
      'completedAt',
      'order',
      'intentType',
      'label',
      'source',
      'reason',
      'context'
    ],
    'dice roll event input'
  );

  const createdAt =
    requiredString(
      input.createdAt,
      'createdAt'
    );

  const eventCreatedAt =
    optionalString(
      input.eventCreatedAt,
      'eventCreatedAt'
    ) || createdAt;

  return {
    request:
      normalizeRollRequestReference(
        input.request
      ),
    transactionId:
      requiredString(
        input.transactionId,
        'transactionId'
      ),
    eventId:
      requiredString(
        input.eventId,
        'eventId'
      ),
    createdAt,
    eventCreatedAt,
    completedAt:
      optionalString(
        input.completedAt,
        'completedAt'
      ) || eventCreatedAt,
    order:
      normalizeOrder(
        input.order
      ),
    intentType:
      optionalString(
        input.intentType,
        'intentType'
      ) || 'dice-roll',
    label:
      optionalString(
        input.label,
        'label'
      ),
    source:
      optionalString(
        input.source,
        'source'
      ),
    reason:
      optionalString(
        input.reason,
        'reason'
      ),
    context:
      normalizeContextReference(
        input.context
      )
  };
}


function normalizeRollRequestReference(
  request
) {

  if (
    request === null ||
    typeof request !== 'object' ||
    Array.isArray(
      request
    )
  ) {

    throw new TypeError(
      'Dice roll event request must be an object.'
    );
  }

  return {
    ...request
  };
}


function normalizeContextReference(
  context
) {

  if (
    context === undefined ||
    context === null
  ) {

    return {};
  }

  if (
    typeof context !== 'object' ||
    Array.isArray(
      context
    )
  ) {

    throw new TypeError(
      'Dice roll event context must be an object.'
    );
  }

  return {
    ...context
  };
}


function normalizeOrder(
  value
) {

  if (
    value === undefined ||
    value === null
  ) {

    return 0;
  }

  if (
    !Number.isSafeInteger(
      value
    ) ||
    value < 0
  ) {

    throw new TypeError(
      'Dice roll transaction order must be a non-negative safe integer.'
    );
  }

  return value;
}


function requiredString(
  value,
  field
) {

  if (typeof value !== 'string') {

    throw new TypeError(
      `${field} must be a string.`
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {

    throw new TypeError(
      `${field} must not be empty.`
    );
  }

  return normalized;
}


function optionalString(
  value,
  field
) {

  if (
    value === undefined ||
    value === null
  ) {

    return '';
  }

  if (typeof value !== 'string') {

    throw new TypeError(
      `${field} must be a string.`
    );
  }

  return value.trim();
}


function assertAllowedKeys(
  input,
  allowedKeys,
  owner
) {

  const allowed =
    new Set(
      allowedKeys
    );

  for (const key of Object.keys(input || {})) {

    if (allowed.has(key)) continue;

    throw new TypeError(
      `${owner} does not support field ${key}.`
    );
  }
}


function deepFreeze(
  value,
  seen =
    new WeakSet()
) {

  if (
    value === null ||
    typeof value !== 'object' ||
    seen.has(
      value
    )
  ) {

    return value;
  }

  seen.add(
    value
  );

  Object.freeze(
    value
  );

  for (const child of Object.values(value)) {

    deepFreeze(
      child,
      seen
    );
  }

  return value;
}
