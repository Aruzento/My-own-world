import {
  readTransactionRecords
} from './eventStore.js';


export const EVENT_QUERY_VERSION =
  1;

export const EVENT_QUERY_RESULT_KIND =
  'mow-event-query-result';

export const EVENT_QUERY_ITEM_KIND =
  'mow-event-query-item';

export const EVENT_QUERY_CURSOR_PREFIX =
  'event-query-offset:';

export const EVENT_QUERY_DEFAULT_LIMIT =
  50;

export const EVENT_QUERY_MAX_LIMIT =
  200;

export const EVENT_QUERY_ERROR_CODES =
  Object.freeze({
    INVALID_INPUT:
      'EVENT_QUERY_INVALID_INPUT',
    INVALID_CURSOR:
      'EVENT_QUERY_INVALID_CURSOR',
    AMBIGUOUS_TRANSACTION_ID:
      'EVENT_QUERY_AMBIGUOUS_TRANSACTION_ID'
  });


const ENTITY_ID_CONTEXT_FIELDS =
  Object.freeze([
    'actorId',
    'actorPageId',
    'targetId',
    'targetPageId',
    'mapPageId',
    'tokenId',
    'actionId',
    'ruleId'
  ]);


export class EventQueryError extends Error {

  constructor(
    message,
    {
      code =
        EVENT_QUERY_ERROR_CODES.INVALID_INPUT,
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
      'EventQueryError';

    this.code =
      code;

    this.field =
      field;

    this.details =
      details === null
        ? null
        : deepFreeze(
          cloneJsonValue(
            details
          )
        );
  }
}


export async function queryEventLog(
  input = {},
  options = {}
) {

  const snapshot =
    await readTransactionRecords({
      storageAdapter:
        options.storageAdapter,
      strict:
        Boolean(
          options.strict
      )
    });

  return queryEventLogFromSnapshot(
    snapshot,
    input
  );
}


export function queryEventLogFromSnapshot(
  snapshot,
  input = {}
) {

  const query =
    normalizeEventQueryInput(
      input
    );

  const normalizedSnapshot =
    normalizeEventStoreSnapshot(
      snapshot
    );

  const allItems =
    createEventQueryItems(
      normalizedSnapshot.transactions
    );

  const matched =
    allItems.filter(item =>
      matchesQuery(
        item,
        query
      )
    );

  const ordered =
    query.direction === 'asc'
      ? matched
      : [
        ...matched
      ].reverse();

  const offset =
    query.offset;

  const items =
    ordered.slice(
      offset,
      offset + query.limit
    );

  const nextOffset =
    offset + items.length;

  const hasMore =
    nextOffset < ordered.length;

  return deepFreeze({
    kind:
      EVENT_QUERY_RESULT_KIND,
    version:
      EVENT_QUERY_VERSION,
    query:
      serializeQuery(
        query
      ),
    items:
      items.map(
        serializeQueryItem
      ),
    totalMatched:
      ordered.length,
    returnedCount:
      items.length,
    hasMore,
    nextCursor:
      hasMore
        ? createCursor(
          nextOffset
        )
        : null,
    invalidRecordCount:
      normalizedSnapshot.invalidRecordCount
  });
}


export async function getEventTransactionById(
  transactionId,
  options = {}
) {

  const id =
    requiredString(
      transactionId,
      'transactionId'
    );

  const snapshot =
    await readTransactionRecords({
      storageAdapter:
        options.storageAdapter,
      strict:
        Boolean(
          options.strict
      )
    });

  return getEventTransactionByIdFromSnapshot(
    snapshot,
    id
  );
}


export function getEventTransactionByIdFromSnapshot(
  snapshot,
  transactionId
) {

  const id =
    requiredString(
      transactionId,
      'transactionId'
    );

  const normalizedSnapshot =
    normalizeEventStoreSnapshot(
      snapshot
    );

  const matches =
    normalizedSnapshot.transactions.filter(item =>
      item.transactionId === id
    );

  if (matches.length > 1) {

    throw new EventQueryError(
      `Event transaction id ${id} is ambiguous in durable history.`,
      {
        code:
          EVENT_QUERY_ERROR_CODES.AMBIGUOUS_TRANSACTION_ID,
        field:
          'transactionId',
        details:
          {
            transactionId:
              id,
            matchCount:
              matches.length
          }
      }
    );
  }

  const transaction =
    matches[0];

  return transaction
    ? deepFreeze(
      cloneJsonValue(
        transaction
      )
    )
    : null;
}


function normalizeEventStoreSnapshot(
  snapshot
) {

  if (
    !snapshot ||
    typeof snapshot !== 'object' ||
    Array.isArray(
      snapshot
    )
  ) {

    throwInvalidInput(
      'snapshot',
      'Event query snapshot must be a normalized EventStore snapshot.'
    );
  }

  if (
    !Array.isArray(
      snapshot.transactions
    )
  ) {

    throwInvalidInput(
      'snapshot.transactions',
      'Event query snapshot must include transactions.'
    );
  }

  return {
    transactions:
      snapshot.transactions,
    invalidRecordCount:
      Number.isSafeInteger(
        snapshot.invalidRecordCount
      ) && snapshot.invalidRecordCount >= 0
        ? snapshot.invalidRecordCount
        : Array.isArray(
          snapshot.invalidRecords
        )
          ? snapshot.invalidRecords.length
          : 0
  };
}


function createEventQueryItems(
  transactions
) {

  const items =
    [];

  let logOrder =
    1;

  transactions.forEach((transaction, transactionIndex) => {

    for (const event of transaction.events) {

      items.push({
        kind:
          EVENT_QUERY_ITEM_KIND,
        version:
          EVENT_QUERY_VERSION,
        logOrder,
        transactionIndex,
        transaction:
          createTransactionSummary(
            transaction
          ),
        event,
        entityIds:
          collectEntityIds(
            event
          )
      });

      logOrder +=
        1;
    }
  });

  return items;
}


function createTransactionSummary(
  transaction
) {

  return {
    transactionId:
      transaction.transactionId,
    intentType:
      transaction.intentType,
    label:
      transaction.label,
    source:
      transaction.source,
    reason:
      transaction.reason,
    createdAt:
      transaction.createdAt,
    order:
      transaction.order,
    status:
      transaction.status,
    reversesTransactionId:
      transaction.reversesTransactionId,
    reversedByTransactionId:
      transaction.reversedByTransactionId,
    completedAt:
      transaction.completedAt,
    failedAt:
      transaction.failedAt,
    failure:
      transaction.failure === null
        ? null
        : cloneJsonValue(
          transaction.failure
        )
  };
}


function serializeQueryItem(
  item
) {

  return {
    kind:
      item.kind,
    version:
      item.version,
    logOrder:
      item.logOrder,
    transaction:
      cloneJsonValue(
        item.transaction
      ),
    event:
      cloneJsonValue(
        item.event
      ),
    entityIds:
      [
        ...item.entityIds
      ]
  };
}


function matchesQuery(
  item,
  query
) {

  if (
    query.transactionId &&
    item.transaction.transactionId !== query.transactionId
  ) {

    return false;
  }

  if (
    query.eventType &&
    item.event.type !== query.eventType
  ) {

    return false;
  }

  if (
    query.entityId &&
    !item.entityIds.includes(
      query.entityId
    )
  ) {

    return false;
  }

  if (
    query.orderFrom !== null &&
    item.logOrder < query.orderFrom
  ) {

    return false;
  }

  if (
    query.orderTo !== null &&
    item.logOrder > query.orderTo
  ) {

    return false;
  }

  if (
    query.createdAtFromMs !== null ||
    query.createdAtToMs !== null
  ) {

    const eventCreatedAtMs =
      parseTimestampMs(
        item.event.createdAt,
        'event.createdAt'
      );

    if (
      query.createdAtFromMs !== null &&
      eventCreatedAtMs < query.createdAtFromMs
    ) {

      return false;
    }

    if (
      query.createdAtToMs !== null &&
      eventCreatedAtMs > query.createdAtToMs
    ) {

      return false;
    }

  }

  return true;
}


function collectEntityIds(
  event
) {

  const ids =
    new Set();

  addSubjectId(
    ids,
    event.payload?.resource
  );

  addSubjectId(
    ids,
    event.payload?.subject
  );

  const context =
    event.payload?.context;

  if (
    context &&
    typeof context === 'object' &&
    !Array.isArray(
      context
    )
  ) {

    for (const key of ENTITY_ID_CONTEXT_FIELDS) {

      addStringId(
        ids,
        context[key]
      );
    }
  }

  return [
    ...ids
  ];
}


function addSubjectId(
  ids,
  subject
) {

  if (
    !subject ||
    typeof subject !== 'object' ||
    Array.isArray(
      subject
    )
  ) {

    return;
  }

  addStringId(
    ids,
    subject.id
  );
}


function addStringId(
  ids,
  value
) {

  if (typeof value !== 'string') {

    return;
  }

  const normalized =
    value.trim();

  if (normalized) {

    ids.add(
      normalized
    );
  }
}


function normalizeEventQueryInput(
  input
) {

  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(
      input
    )
  ) {

    throw new EventQueryError(
      'Event query input must be an object.',
      {
        field:
          'query'
      }
    );
  }

  assertAllowedKeys(
    input,
    [
      'limit',
      'cursor',
      'direction',
      'transactionId',
      'eventType',
      'entityId',
      'createdAtFrom',
      'createdAtTo',
      'orderFrom',
      'orderTo'
    ],
    'event query'
  );

  const createdAtFrom =
    optionalString(
      input.createdAtFrom,
      'createdAtFrom'
    );

  const createdAtTo =
    optionalString(
      input.createdAtTo,
      'createdAtTo'
    );

  const normalized = {
    limit:
      normalizeLimit(
        input.limit
      ),
    offset:
      parseCursor(
        input.cursor
      ),
    cursor:
      input.cursor === undefined ||
      input.cursor === null
        ? null
        : requiredString(
          input.cursor,
          'cursor'
        ),
    direction:
      normalizeDirection(
        input.direction
      ),
    transactionId:
      optionalString(
        input.transactionId,
        'transactionId'
      ),
    eventType:
      optionalString(
        input.eventType,
        'eventType'
      ),
    entityId:
      optionalString(
        input.entityId,
        'entityId'
      ),
    createdAtFrom:
      createdAtFrom || null,
    createdAtTo:
      createdAtTo || null,
    createdAtFromMs:
      createdAtFrom
        ? parseTimestampMs(
          createdAtFrom,
          'createdAtFrom'
        )
        : null,
    createdAtToMs:
      createdAtTo
        ? parseTimestampMs(
          createdAtTo,
          'createdAtTo'
        )
        : null,
    orderFrom:
      normalizeOptionalOrder(
        input.orderFrom,
        'orderFrom'
      ),
    orderTo:
      normalizeOptionalOrder(
        input.orderTo,
        'orderTo'
      )
  };

  if (
    normalized.createdAtFromMs !== null &&
    normalized.createdAtToMs !== null &&
    normalized.createdAtFromMs > normalized.createdAtToMs
  ) {

    throwInvalidInput(
      'createdAtFrom',
      'createdAtFrom must be before or equal to createdAtTo.'
    );
  }

  if (
    normalized.orderFrom !== null &&
    normalized.orderTo !== null &&
    normalized.orderFrom > normalized.orderTo
  ) {

    throwInvalidInput(
      'orderFrom',
      'orderFrom must be less than or equal to orderTo.'
    );
  }

  return normalized;
}


function serializeQuery(
  query
) {

  return {
    limit:
      query.limit,
    cursor:
      query.cursor,
    direction:
      query.direction,
    transactionId:
      query.transactionId || null,
    eventType:
      query.eventType || null,
    entityId:
      query.entityId || null,
    createdAtFrom:
      query.createdAtFrom,
    createdAtTo:
      query.createdAtTo,
    orderFrom:
      query.orderFrom,
    orderTo:
      query.orderTo
  };
}


function normalizeLimit(
  value
) {

  if (
    value === undefined ||
    value === null
  ) {

    return EVENT_QUERY_DEFAULT_LIMIT;
  }

  if (
    !Number.isSafeInteger(
      value
    ) ||
    value < 1
  ) {

    throwInvalidInput(
      'limit',
      'Event query limit must be a positive safe integer.'
    );
  }

  if (value > EVENT_QUERY_MAX_LIMIT) {

    throwInvalidInput(
      'limit',
      `Event query limit must not exceed ${EVENT_QUERY_MAX_LIMIT}.`,
      {
        maximum:
          EVENT_QUERY_MAX_LIMIT,
        observed:
          value
      }
    );
  }

  return value;
}


function parseCursor(
  cursor
) {

  if (
    cursor === undefined ||
    cursor === null
  ) {

    return 0;
  }

  const normalized =
    requiredString(
      cursor,
      'cursor'
    );

  if (
    !normalized.startsWith(
      EVENT_QUERY_CURSOR_PREFIX
    )
  ) {

    throw new EventQueryError(
      'Event query cursor is not recognized.',
      {
        code:
          EVENT_QUERY_ERROR_CODES.INVALID_CURSOR,
        field:
          'cursor'
      }
    );
  }

  const offsetText =
    normalized.slice(
      EVENT_QUERY_CURSOR_PREFIX.length
    );

  const offset =
    Number(
      offsetText
    );

  if (
    !Number.isSafeInteger(
      offset
    ) ||
    offset < 0
  ) {

    throw new EventQueryError(
      'Event query cursor offset is invalid.',
      {
        code:
          EVENT_QUERY_ERROR_CODES.INVALID_CURSOR,
        field:
          'cursor'
      }
    );
  }

  return offset;
}


function createCursor(
  offset
) {

  return `${EVENT_QUERY_CURSOR_PREFIX}${offset}`;
}


function normalizeDirection(
  value
) {

  const normalized =
    optionalString(
      value,
      'direction'
    ) || 'desc';

  if (
    normalized !== 'asc' &&
    normalized !== 'desc'
  ) {

    throwInvalidInput(
      'direction',
      'Event query direction must be asc or desc.'
    );
  }

  return normalized;
}


function normalizeOptionalOrder(
  value,
  field
) {

  if (
    value === undefined ||
    value === null
  ) {

    return null;
  }

  if (
    !Number.isSafeInteger(
      value
    ) ||
    value < 1
  ) {

    throwInvalidInput(
      field,
      `${field} must be a positive safe integer.`
    );
  }

  return value;
}


function parseTimestampMs(
  value,
  field
) {

  const normalized =
    requiredString(
      value,
      field
    );

  const parsed =
    Date.parse(
      normalized
    );

  if (!Number.isFinite(parsed)) {

    throwInvalidInput(
      field,
      `${field} must be a valid timestamp.`
    );
  }

  return parsed;
}


function requiredString(
  value,
  field
) {

  if (typeof value !== 'string') {

    throwInvalidInput(
      field,
      `${field} must be a string.`
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {

    throwInvalidInput(
      field,
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

  return requiredString(
    value,
    field
  );
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

    throwInvalidInput(
      key,
      `${owner} does not support field ${key}.`
    );
  }
}


function throwInvalidInput(
  field,
  message,
  details =
    null
) {

  throw new EventQueryError(
    message,
    {
      field,
      details
    }
  );
}


function cloneJsonValue(
  value
) {

  if (value === null) return null;

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {

    return value;
  }

  if (Array.isArray(value)) {

    return value.map(
      cloneJsonValue
    );
  }

  if (typeof value === 'object') {

    const cloned =
      {};

    for (const key of Object.keys(value)) {

      cloned[key] =
        cloneJsonValue(
          value[key]
        );
    }

    return cloned;
  }

  return null;
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
