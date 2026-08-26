export const EVENT_TRANSACTION_MODEL_VERSION =
  1;

export const TRANSACTION_KIND =
  'mow-transaction';

export const EVENT_KIND =
  'mow-event';

export const TRANSACTION_STATUSES =
  Object.freeze({
    STARTED:
      'started',
    COMPLETED:
      'completed',
    FAILED:
      'failed'
  });

export const TRANSACTION_MODEL_ERROR_CODES =
  Object.freeze({
    INVALID_FIELD:
      'TRANSACTION_INVALID_FIELD',
    INVALID_STATE:
      'TRANSACTION_INVALID_STATE',
    EVENT_ORDER:
      'TRANSACTION_EVENT_ORDER',
    PAYLOAD_NOT_SERIALIZABLE:
      'TRANSACTION_PAYLOAD_NOT_SERIALIZABLE'
  });


export class TransactionModelError extends Error {

  constructor(
    message,
    {
      code =
        TRANSACTION_MODEL_ERROR_CODES.INVALID_FIELD,
      field =
        '',
      details =
        null
    } = {}
  ) {

    super(
      message
    );

    this.name =
      'TransactionModelError';

    this.code =
      code;

    this.field =
      field;

    this.details =
      details === null
        ? null
        : deepFreeze(
          cloneJsonValue(
            details,
            'details'
          )
        );
  }
}


export function createTransaction(
  input = {}
) {

  assertAllowedKeys(
    input,
    [
      'transactionId',
      'intentType',
      'label',
      'source',
      'reason',
      'createdAt',
      'order',
      'reversesTransactionId',
      'reversedByTransactionId'
    ],
    'transaction'
  );

  return deepFreeze({
    kind:
      TRANSACTION_KIND,
    version:
      EVENT_TRANSACTION_MODEL_VERSION,
    transactionId:
      normalizeRequiredString(
        input.transactionId,
        'transactionId'
      ),
    intentType:
      normalizeRequiredString(
        input.intentType,
        'intentType'
      ),
    label:
      normalizeOptionalText(
        input.label,
        'label'
      ),
    source:
      normalizeOptionalText(
        input.source,
        'source'
      ),
    reason:
      normalizeOptionalText(
        input.reason,
        'reason'
      ),
    createdAt:
      normalizeRequiredString(
        input.createdAt,
        'createdAt'
      ),
    order:
      normalizeSafeInteger(
        input.order ?? 0,
        'order',
        {
          min:
            0
        }
      ),
    status:
      TRANSACTION_STATUSES.STARTED,
    events:
      [],
    reversesTransactionId:
      normalizeOptionalId(
        input.reversesTransactionId,
        'reversesTransactionId'
      ),
    reversedByTransactionId:
      normalizeOptionalId(
        input.reversedByTransactionId,
        'reversedByTransactionId'
      ),
    completedAt:
      null,
    failedAt:
      null,
    failure:
      null
  });
}


export function createTransactionEvent(
  input = {}
) {

  assertAllowedKeys(
    input,
    [
      'kind',
      'version',
      'eventId',
      'transactionId',
      'type',
      'createdAt',
      'order',
      'payload',
      'payloadVersion',
      'reversesEventId',
      'reversedByEventId'
    ],
    'event'
  );

  if (
    input.kind !== undefined &&
    input.kind !== EVENT_KIND
  ) {

    throwInvalidField(
      'kind',
      `Event kind must be ${EVENT_KIND}.`
    );
  }

  if (
    input.version !== undefined &&
    input.version !== EVENT_TRANSACTION_MODEL_VERSION
  ) {

    throwInvalidField(
      'version',
      `Event version must be ${EVENT_TRANSACTION_MODEL_VERSION}.`
    );
  }

  return deepFreeze({
    kind:
      EVENT_KIND,
    version:
      EVENT_TRANSACTION_MODEL_VERSION,
    eventId:
      normalizeRequiredString(
        input.eventId,
        'eventId'
      ),
    transactionId:
      normalizeRequiredString(
        input.transactionId,
        'transactionId'
      ),
    type:
      normalizeRequiredString(
        input.type,
        'type'
      ),
    createdAt:
      normalizeRequiredString(
        input.createdAt,
        'createdAt'
      ),
    order:
      normalizeSafeInteger(
        input.order,
        'order',
        {
          min:
            1
        }
      ),
    payloadVersion:
      normalizeSafeInteger(
        input.payloadVersion ?? 1,
        'payloadVersion',
        {
          min:
            1
        }
      ),
    payload:
      cloneJsonValue(
        input.payload ?? {},
        'payload'
      ),
    reversesEventId:
      normalizeOptionalId(
        input.reversesEventId,
        'reversesEventId'
      ),
    reversedByEventId:
      normalizeOptionalId(
        input.reversedByEventId,
        'reversedByEventId'
      )
  });
}


export function appendTransactionEvent(
  transaction,
  eventInput = {}
) {

  const current =
    normalizeTransaction(
      transaction
    );

  assertTransactionStarted(
    current,
    'append event'
  );

  const explicitTransactionId =
    eventInput.transactionId === undefined
      ? current.transactionId
      : normalizeRequiredString(
        eventInput.transactionId,
        'transactionId'
      );

  if (explicitTransactionId !== current.transactionId) {

    throwInvalidField(
      'transactionId',
      'Event transactionId must match the parent transaction.'
    );
  }

  const nextOrder =
    getNextEventOrder(
      current
    );

  const event =
    createTransactionEvent({
      ...eventInput,
      transactionId:
        current.transactionId,
      order:
        eventInput.order ?? nextOrder
    });

  assertEventCanAppend(
    current,
    event
  );

  return deepFreeze({
    ...current,
    events:
      [
        ...current.events,
        event
      ]
  });
}


export function completeTransaction(
  transaction,
  {
    completedAt
  } = {}
) {

  const current =
    normalizeTransaction(
      transaction
    );

  assertTransactionStarted(
    current,
    'complete transaction'
  );

  if (current.events.length < 1) {

    throw new TransactionModelError(
      'A completed transaction must contain at least one event.',
      {
        code:
          TRANSACTION_MODEL_ERROR_CODES.INVALID_STATE,
        field:
          'events'
      }
    );
  }

  return deepFreeze({
    ...current,
    status:
      TRANSACTION_STATUSES.COMPLETED,
    completedAt:
      normalizeRequiredString(
        completedAt,
        'completedAt'
      ),
    failedAt:
      null,
    failure:
      null
  });
}


export function failTransaction(
  transaction,
  input = {}
) {

  assertAllowedKeys(
    input,
    [
      'failedAt',
      'error',
      'code'
    ],
    'failure'
  );

  const current =
    normalizeTransaction(
      transaction
    );

  assertTransactionStarted(
    current,
    'fail transaction'
  );

  return deepFreeze({
    ...current,
    status:
      TRANSACTION_STATUSES.FAILED,
    completedAt:
      null,
    failedAt:
      normalizeRequiredString(
        input.failedAt,
        'failedAt'
      ),
    failure:
      normalizeFailure(
        input.error,
        input.code
      )
  });
}


export function createReversalTransaction(
  input = {}
) {

  assertAllowedKeys(
    input,
    [
      'transactionId',
      'targetTransaction',
      'intentType',
      'label',
      'source',
      'reason',
      'createdAt',
      'order'
    ],
    'reversal'
  );

  const target =
    normalizeTransaction(
      input.targetTransaction
    );

  if (target.status !== TRANSACTION_STATUSES.COMPLETED) {

    throw new TransactionModelError(
      'Only completed transactions can be reversed.',
      {
        code:
          TRANSACTION_MODEL_ERROR_CODES.INVALID_STATE,
        field:
          'targetTransaction.status'
      }
    );
  }

  return createTransaction({
    transactionId:
      input.transactionId,
    intentType:
      input.intentType || 'undo',
    label:
      input.label || `Undo ${target.intentType}`,
    source:
      input.source,
    reason:
      input.reason,
    createdAt:
      input.createdAt,
    order:
      input.order,
    reversesTransactionId:
      target.transactionId
  });
}


export function markTransactionReversed(
  transaction,
  {
    reversedByTransactionId
  } = {}
) {

  const current =
    normalizeTransaction(
      transaction
    );

  if (current.status !== TRANSACTION_STATUSES.COMPLETED) {

    throw new TransactionModelError(
      'Only completed transactions can be marked as reversed.',
      {
        code:
          TRANSACTION_MODEL_ERROR_CODES.INVALID_STATE,
        field:
          'status'
      }
    );
  }

  return deepFreeze({
    ...current,
    reversedByTransactionId:
      normalizeRequiredString(
        reversedByTransactionId,
        'reversedByTransactionId'
      )
  });
}


export function serializeTransaction(
  transaction
) {

  const current =
    normalizeTransaction(
      transaction
    );

  return {
    kind:
      current.kind,
    version:
      current.version,
    transactionId:
      current.transactionId,
    intentType:
      current.intentType,
    label:
      current.label,
    source:
      current.source,
    reason:
      current.reason,
    createdAt:
      current.createdAt,
    order:
      current.order,
    status:
      current.status,
    events:
      current.events.map(
        serializeTransactionEvent
      ),
    reversesTransactionId:
      current.reversesTransactionId,
    reversedByTransactionId:
      current.reversedByTransactionId,
    completedAt:
      current.completedAt,
    failedAt:
      current.failedAt,
    failure:
      current.failure === null
        ? null
        : cloneJsonValue(
          current.failure,
          'failure'
        )
  };
}


export function serializeTransactionEvent(
  event
) {

  const current =
    normalizeTransactionEvent(
      event
    );

  return {
    kind:
      current.kind,
    version:
      current.version,
    eventId:
      current.eventId,
    transactionId:
      current.transactionId,
    type:
      current.type,
    createdAt:
      current.createdAt,
    order:
      current.order,
    payloadVersion:
      current.payloadVersion,
    payload:
      cloneJsonValue(
        current.payload,
        'payload'
      ),
    reversesEventId:
      current.reversesEventId,
    reversedByEventId:
      current.reversedByEventId
  };
}


function normalizeTransaction(
  transaction
) {

  if (
    !transaction ||
    typeof transaction !== 'object'
  ) {

    throwInvalidField(
      'transaction',
      'Transaction must be an object.'
    );
  }

  if (transaction.kind !== TRANSACTION_KIND) {

    throwInvalidField(
      'kind',
      `Transaction kind must be ${TRANSACTION_KIND}.`
    );
  }

  if (
    transaction.version !== EVENT_TRANSACTION_MODEL_VERSION
  ) {

    throwInvalidField(
      'version',
      `Transaction version must be ${EVENT_TRANSACTION_MODEL_VERSION}.`
    );
  }

  const events =
    Array.isArray(
      transaction.events
    )
      ? transaction.events.map(
        normalizeTransactionEvent
      )
      : throwInvalidField(
        'events',
        'Transaction events must be an array.'
      );

  assertEventOrder(
    events
  );

  return deepFreeze({
    kind:
      TRANSACTION_KIND,
    version:
      EVENT_TRANSACTION_MODEL_VERSION,
    transactionId:
      normalizeRequiredString(
        transaction.transactionId,
        'transactionId'
      ),
    intentType:
      normalizeRequiredString(
        transaction.intentType,
        'intentType'
      ),
    label:
      normalizeOptionalText(
        transaction.label,
        'label'
      ),
    source:
      normalizeOptionalText(
        transaction.source,
        'source'
      ),
    reason:
      normalizeOptionalText(
        transaction.reason,
        'reason'
      ),
    createdAt:
      normalizeRequiredString(
        transaction.createdAt,
        'createdAt'
      ),
    order:
      normalizeSafeInteger(
        transaction.order,
        'order',
        {
          min:
            0
        }
      ),
    status:
      normalizeTransactionStatus(
        transaction.status
      ),
    events,
    reversesTransactionId:
      normalizeOptionalId(
        transaction.reversesTransactionId,
        'reversesTransactionId'
      ),
    reversedByTransactionId:
      normalizeOptionalId(
        transaction.reversedByTransactionId,
        'reversedByTransactionId'
      ),
    completedAt:
      normalizeNullableText(
        transaction.completedAt,
        'completedAt'
      ),
    failedAt:
      normalizeNullableText(
        transaction.failedAt,
        'failedAt'
      ),
    failure:
      transaction.failure === null ||
      transaction.failure === undefined
        ? null
        : normalizeFailure(
          transaction.failure,
          transaction.failure.code
        )
  });
}


function normalizeTransactionEvent(
  event
) {

  return createTransactionEvent(
    event
  );
}


function assertTransactionStarted(
  transaction,
  action
) {

  if (
    transaction.status !== TRANSACTION_STATUSES.STARTED
  ) {

    throw new TransactionModelError(
      `Cannot ${action}: transaction is ${transaction.status}.`,
      {
        code:
          TRANSACTION_MODEL_ERROR_CODES.INVALID_STATE,
        field:
          'status'
      }
    );
  }
}


function assertEventCanAppend(
  transaction,
  event
) {

  if (
    transaction.events.some(item =>
      item.eventId === event.eventId
    )
  ) {

    throwInvalidField(
      'eventId',
      'Event ids must be unique within a transaction.'
    );
  }

  const lastOrder =
    transaction.events.length
      ? transaction.events[transaction.events.length - 1].order
      : 0;

  if (event.order <= lastOrder) {

    throw new TransactionModelError(
      'Transaction events must be appended in increasing order.',
      {
        code:
          TRANSACTION_MODEL_ERROR_CODES.EVENT_ORDER,
        field:
          'order',
        details:
          {
            lastOrder,
            eventOrder:
              event.order
          }
      }
    );
  }
}


function assertEventOrder(
  events
) {

  let previous =
    0;

  for (const event of events) {

    if (event.order <= previous) {

      throw new TransactionModelError(
        'Transaction events must be ordered.',
        {
          code:
            TRANSACTION_MODEL_ERROR_CODES.EVENT_ORDER,
          field:
            'events'
        }
      );
    }

    previous =
      event.order;
  }
}


function getNextEventOrder(
  transaction
) {

  return transaction.events.length
    ? transaction.events[transaction.events.length - 1].order + 1
    : 1;
}


function normalizeTransactionStatus(
  status
) {

  const normalized =
    normalizeRequiredString(
      status,
      'status'
    );

  if (
    !Object.values(
      TRANSACTION_STATUSES
    ).includes(
      normalized
    )
  ) {

    throwInvalidField(
      'status',
      `Unsupported transaction status: ${normalized}.`
    );
  }

  return normalized;
}


function normalizeFailure(
  error,
  code =
    null
) {

  const fallbackCode =
    normalizeOptionalText(
      code,
      'code'
    ) || 'TRANSACTION_FAILED';

  if (
    error &&
    typeof error === 'object' &&
    !Array.isArray(error)
  ) {

    return deepFreeze({
      code:
        normalizeOptionalText(
          error.code,
          'failure.code'
        ) || fallbackCode,
      message:
        normalizeOptionalText(
          error.message,
          'failure.message'
        ) || 'Transaction failed.'
    });
  }

  return deepFreeze({
    code:
      fallbackCode,
    message:
      normalizeOptionalText(
        error,
        'failure.message'
      ) || 'Transaction failed.'
  });
}


function normalizeRequiredString(
  value,
  field
) {

  if (typeof value !== 'string') {

    throwInvalidField(
      field,
      `${field} must be a string.`
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {

    throwInvalidField(
      field,
      `${field} must not be empty.`
    );
  }

  return normalized;
}


function normalizeOptionalText(
  value,
  field
) {

  if (value === undefined || value === null) {

    return '';
  }

  if (typeof value !== 'string') {

    throwInvalidField(
      field,
      `${field} must be a string.`
    );
  }

  return value.trim();
}


function normalizeNullableText(
  value,
  field
) {

  if (value === undefined || value === null) {

    return null;
  }

  return normalizeRequiredString(
    value,
    field
  );
}


function normalizeOptionalId(
  value,
  field
) {

  if (value === undefined || value === null) {

    return null;
  }

  return normalizeRequiredString(
    value,
    field
  );
}


function normalizeSafeInteger(
  value,
  field,
  {
    min =
      Number.MIN_SAFE_INTEGER
  } = {}
) {

  if (!Number.isSafeInteger(value)) {

    throwInvalidField(
      field,
      `${field} must be a safe integer.`
    );
  }

  if (value < min) {

    throwInvalidField(
      field,
      `${field} must be at least ${min}.`
    );
  }

  return value;
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

    throwInvalidField(
      key,
      `${owner} does not support field ${key}.`
    );
  }
}


function cloneJsonValue(
  value,
  path,
  seen =
    new WeakSet()
) {

  if (value === null) return null;

  if (
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {

    return value;
  }

  if (typeof value === 'number') {

    if (!Number.isFinite(value)) {

      throw new TransactionModelError(
        `${path} contains a non-finite number.`,
        {
          code:
            TRANSACTION_MODEL_ERROR_CODES.PAYLOAD_NOT_SERIALIZABLE,
          field:
            path
        }
      );
    }

    return value;
  }

  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {

    throw new TransactionModelError(
      `${path} must be JSON-serializable data.`,
      {
        code:
          TRANSACTION_MODEL_ERROR_CODES.PAYLOAD_NOT_SERIALIZABLE,
        field:
          path
      }
    );
  }

  if (
    typeof value !== 'object'
  ) {

    throw new TransactionModelError(
      `${path} must be JSON-serializable data.`,
      {
        code:
          TRANSACTION_MODEL_ERROR_CODES.PAYLOAD_NOT_SERIALIZABLE,
        field:
          path
      }
    );
  }

  if (seen.has(value)) {

    throw new TransactionModelError(
      `${path} must not contain circular data.`,
      {
        code:
          TRANSACTION_MODEL_ERROR_CODES.PAYLOAD_NOT_SERIALIZABLE,
        field:
          path
      }
    );
  }

  seen.add(
    value
  );

  if (Array.isArray(value)) {

    const cloned =
      value.map((item, index) =>
        cloneJsonValue(
          item,
          `${path}[${index}]`,
          seen
        )
      );

    seen.delete(
      value
    );

    return cloned;
  }

  const prototype =
    Object.getPrototypeOf(
      value
    );

  if (
    prototype !== Object.prototype &&
    prototype !== null
  ) {

    throw new TransactionModelError(
      `${path} must contain plain JSON objects only.`,
      {
        code:
          TRANSACTION_MODEL_ERROR_CODES.PAYLOAD_NOT_SERIALIZABLE,
        field:
          path
      }
    );
  }

  const cloned =
    {};

  for (const key of Object.keys(value).sort()) {

    cloned[key] =
      cloneJsonValue(
        value[key],
        `${path}.${key}`,
        seen
      );
  }

  seen.delete(
    value
  );

  return cloned;
}


function deepFreeze(
  value,
  seen =
    new WeakSet()
) {

  if (
    !value ||
    typeof value !== 'object' ||
    seen.has(value)
  ) {

    return value;
  }

  seen.add(
    value
  );

  Object.freeze(
    value
  );

  for (const item of Object.values(value)) {

    deepFreeze(
      item,
      seen
    );
  }

  return value;
}


function throwInvalidField(
  field,
  message
) {

  throw new TransactionModelError(
    message,
    {
      field
    }
  );
}
