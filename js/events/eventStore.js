import {
  getStorageAdapter
} from '../storage/storageAdapter.js';

import {
  normalizeWorkspacePath
} from '../storage/storageAdapterContract.js';

import {
  serializeTransaction,
  TRANSACTION_STATUSES
} from './transactionModel.js';

import {
  createTypedEvent
} from './eventTypes.js';


export const EVENT_STORE_ROOT =
  '.my-own-world-events';

export const EVENT_TRANSACTION_LOG_PATH =
  `${EVENT_STORE_ROOT}/transactions.v1.jsonl`;

export const EVENT_TRANSACTION_RECORD_KIND =
  'mow-transaction-record';

export const EVENT_TRANSACTION_RECORD_VERSION =
  1;

export const EVENT_STORE_SNAPSHOT_KIND =
  'mow-event-store-snapshot';

export const EVENT_STORE_ERROR_CODES =
  Object.freeze({
    INVALID_RECORD:
      'EVENT_STORE_INVALID_RECORD',
    INVALID_TRANSACTION:
      'EVENT_STORE_INVALID_TRANSACTION',
    READ_FAILED:
      'EVENT_STORE_READ_FAILED',
    WRITE_FAILED:
      'EVENT_STORE_WRITE_FAILED',
    DUPLICATE_IDENTITY:
      'EVENT_STORE_DUPLICATE_IDENTITY'
  });


export class EventStoreError extends Error {

  constructor(
    message,
    {
      code =
        EVENT_STORE_ERROR_CODES.INVALID_RECORD,
      path =
        EVENT_TRANSACTION_LOG_PATH,
      lineNumber =
        null,
      identityType =
        '',
      identity =
        '',
      cause =
        null
    } = {}
  ) {

    super(
      message,
      cause
        ? {
          cause
        }
        : undefined
    );

    this.name =
      'EventStoreError';

    this.code =
      code;

    this.path =
      normalizeWorkspacePath(
        path
      );

    this.lineNumber =
      lineNumber;

    this.identityType =
      identityType;

    this.identity =
      identity;
  }
}


const appendQueues =
  new WeakMap();

const identityStates =
  new WeakMap();

const fallbackWorkspaceIdentities =
  new WeakMap();


export function createTransactionRecord(
  transaction
) {

  const serialized =
    serializeTransaction(
      transaction
    );

  const typedTransaction =
    serializeTransaction({
      ...serialized,
      events:
        serialized.events.map(
          createTypedEvent
        )
    });

  assertDurableTransactionState(
    typedTransaction
  );

  assertEventBelongsToTransaction(
    typedTransaction
  );

  const {
    events,
    ...transactionMetadata
  } = typedTransaction;

  return {
    kind:
      EVENT_TRANSACTION_RECORD_KIND,
    version:
      EVENT_TRANSACTION_RECORD_VERSION,
    transaction:
      transactionMetadata,
    events:
      events.map(event => ({
        ...event
      }))
  };
}


export async function appendTransactionRecord(
  transaction,
  options = {}
) {

  const storageAdapter =
    getEventStoreStorageAdapter(
      options
    );

  const path =
    EVENT_TRANSACTION_LOG_PATH;

  const record =
    createTransactionRecord(
      transaction
    );

  const line =
    `${JSON.stringify(record)}\n`;

  await queueAppend(
    storageAdapter,
    path,
    () => appendTransactionRecordInsideQueue({
      storageAdapter,
      path,
      line,
      record
    })
  );

  return {
    status:
      'durable',
    path,
    record
  };
}


async function appendTransactionRecordInsideQueue({
  storageAdapter,
  path,
  line,
  record
}) {

  const identityState =
    await ensureIdentityStateInitialized({
      storageAdapter,
      path
    });

  assertIncomingIdentityIsAvailable({
    identityState,
    record,
    path
  });

  try {

    await appendLineToLogFile({
      storageAdapter,
      path,
      line
    });

  } catch (error) {

    invalidateIdentityState(
      storageAdapter,
      path
    );

    throw error;
  }

  addRecordIdentityToState(
    identityState,
    record
  );
}


export async function readTransactionRecords(
  options = {}
) {

  const storageAdapter =
    getEventStoreStorageAdapter(
      options
    );

  const path =
    EVENT_TRANSACTION_LOG_PATH;

  const strict =
    Boolean(
      options.strict
    );

  const content =
    await readLogFileText({
      storageAdapter,
      path
    });

  const lines =
    splitJsonLines(
      content
    );

  const records =
    [];

  const transactions =
    [];

  const invalidRecords =
    [];

  for (const entry of lines) {

    try {

      const parsed =
        JSON.parse(
          entry.line
        );

      const record =
        normalizeTransactionRecord(
          parsed,
          {
            path,
            lineNumber:
              entry.lineNumber
          }
        );

      records.push({
        lineNumber:
          entry.lineNumber,
        record
      });

      transactions.push(
        recordToTransaction(
          record
        )
      );

    } catch (error) {

      const issue =
        normalizeInvalidRecordIssue({
          error,
          path,
          lineNumber:
            entry.lineNumber,
          line:
            entry.line
        });

      if (strict) {

        throw new EventStoreError(
          issue.message,
          {
            code:
              issue.code,
            path,
            lineNumber:
              issue.lineNumber,
            cause:
              error
          }
        );
      }

      invalidRecords.push(
        issue
      );
    }
  }

  return {
    kind:
      EVENT_STORE_SNAPSHOT_KIND,
    version:
      EVENT_TRANSACTION_RECORD_VERSION,
    path,
    records,
    transactions,
    invalidRecords,
    recordCount:
      records.length,
    invalidRecordCount:
      invalidRecords.length
  };
}


export async function readEventTransactions(
  options = {}
) {

  const snapshot =
    await readTransactionRecords(
      options
    );

  return snapshot.transactions;
}


async function ensureIdentityStateInitialized({
  storageAdapter,
  path
}) {

  const identityState =
    getIdentityStateForCurrentWorkspace(
      storageAdapter,
      path
    );

  if (identityState.initialized) {

    return identityState;
  }

  const snapshot =
    await readTransactionRecords({
      storageAdapter
    });

  const built =
    buildIdentitySetsFromSnapshot(
      snapshot,
      path
    );

  identityState.transactionIds =
    built.transactionIds;

  identityState.eventIds =
    built.eventIds;

  identityState.initialized =
    true;

  return identityState;
}


function getIdentityStateForCurrentWorkspace(
  storageAdapter,
  path
) {

  const normalizedPath =
    normalizeWorkspacePath(
      path
    );

  const workspaceIdentity =
    getCurrentWorkspaceIdentity(
      storageAdapter
    );

  let adapterStates =
    identityStates.get(
      storageAdapter
    );

  if (!adapterStates) {

    adapterStates =
      new Map();

    identityStates.set(
      storageAdapter,
      adapterStates
    );
  }

  const existing =
    adapterStates.get(
      normalizedPath
    );

  if (
    existing &&
    existing.workspaceIdentity === workspaceIdentity
  ) {

    return existing;
  }

  const identityState = {
    workspaceIdentity,
    initialized:
      false,
    transactionIds:
      new Set(),
    eventIds:
      new Set()
  };

  adapterStates.set(
    normalizedPath,
    identityState
  );

  return identityState;
}


function getCurrentWorkspaceIdentity(
  storageAdapter
) {

  const workspaceRoot =
    typeof storageAdapter.getWorkspaceRoot === 'function'
      ? storageAdapter.getWorkspaceRoot()
      : '';

  if (workspaceRoot) {

    return `root:${String(workspaceRoot)}`;
  }

  const workspaceHandle =
    typeof storageAdapter.getWorkspaceHandle === 'function'
      ? storageAdapter.getWorkspaceHandle()
      : null;

  if (workspaceHandle) {

    return workspaceHandle;
  }

  let fallbackIdentity =
    fallbackWorkspaceIdentities.get(
      storageAdapter
    );

  if (!fallbackIdentity) {

    fallbackIdentity = {
      kind:
        'event-store-fallback-workspace'
    };

    fallbackWorkspaceIdentities.set(
      storageAdapter,
      fallbackIdentity
    );
  }

  return fallbackIdentity;
}


function buildIdentitySetsFromSnapshot(
  snapshot,
  path
) {

  const transactionIds =
    new Set();

  const eventIds =
    new Set();

  for (const transaction of snapshot.transactions) {

    addUniqueIdentity({
      ids:
        transactionIds,
      identityType:
        'transactionId',
      identity:
        transaction.transactionId,
      path
    });

    for (const event of transaction.events) {

      addUniqueIdentity({
        ids:
          eventIds,
        identityType:
          'eventId',
        identity:
          event.eventId,
        path
      });
    }
  }

  return {
    transactionIds,
    eventIds
  };
}


function addUniqueIdentity({
  ids,
  identityType,
  identity,
  path
}) {

  if (ids.has(identity)) {

    throwDuplicateIdentity({
      identityType,
      identity,
      path
    });
  }

  ids.add(
    identity
  );
}


function assertIncomingIdentityIsAvailable({
  identityState,
  record,
  path
}) {

  const transactionId =
    record.transaction.transactionId;

  if (
    identityState.transactionIds.has(
      transactionId
    )
  ) {

    throwDuplicateIdentity({
      identityType:
        'transactionId',
      identity:
        transactionId,
      path
    });
  }

  for (const event of record.events) {

    if (
      identityState.eventIds.has(
        event.eventId
      )
    ) {

      throwDuplicateIdentity({
        identityType:
          'eventId',
        identity:
          event.eventId,
        path
      });
    }
  }
}


function addRecordIdentityToState(
  identityState,
  record
) {

  identityState.transactionIds.add(
    record.transaction.transactionId
  );

  for (const event of record.events) {

    identityState.eventIds.add(
      event.eventId
    );
  }
}


function invalidateIdentityState(
  storageAdapter,
  path
) {

  const adapterStates =
    identityStates.get(
      storageAdapter
    );

  if (!adapterStates) return;

  adapterStates.delete(
    normalizeWorkspacePath(
      path
    )
  );
}


function throwDuplicateIdentity({
  identityType,
  identity,
  path
}) {

  throw new EventStoreError(
    `Event Store duplicate ${identityType}: ${identity}.`,
    {
      code:
        EVENT_STORE_ERROR_CODES.DUPLICATE_IDENTITY,
      path,
      identityType,
      identity
    }
  );
}


function normalizeTransactionRecord(
  record,
  {
    path,
    lineNumber
  }
) {

  if (
    !record ||
    typeof record !== 'object' ||
    Array.isArray(record)
  ) {

    throwInvalidRecord(
      'Event store record must be an object.',
      {
        path,
        lineNumber
      }
    );
  }

  assertAllowedKeys(
    record,
    [
      'kind',
      'version',
      'transaction',
      'events'
    ],
    {
      path,
      lineNumber,
      owner:
        'record'
    }
  );

  if (record.kind !== EVENT_TRANSACTION_RECORD_KIND) {

    throwInvalidRecord(
      `Event store record kind must be ${EVENT_TRANSACTION_RECORD_KIND}.`,
      {
        path,
        lineNumber
      }
    );
  }

  if (record.version !== EVENT_TRANSACTION_RECORD_VERSION) {

    throwInvalidRecord(
      `Event store record version must be ${EVENT_TRANSACTION_RECORD_VERSION}.`,
      {
        path,
        lineNumber
      }
    );
  }

  if (
    !record.transaction ||
    typeof record.transaction !== 'object' ||
    Array.isArray(record.transaction)
  ) {

    throwInvalidRecord(
      'Event store record transaction must be an object.',
      {
        path,
        lineNumber
      }
    );
  }

  if (Object.hasOwn(record.transaction, 'events')) {

    throwInvalidRecord(
      'Event store record keeps events outside transaction metadata.',
      {
        path,
        lineNumber
      }
    );
  }

  if (!Array.isArray(record.events)) {

    throwInvalidRecord(
      'Event store record events must be an array.',
      {
        path,
        lineNumber
      }
    );
  }

  const typedEvents =
    record.events.map(
      createTypedEvent
    );

  const transaction =
    serializeTransaction({
      ...record.transaction,
      events:
        typedEvents
    });

  assertDurableTransactionState(
    transaction,
    {
      path,
      lineNumber
    }
  );

  assertEventBelongsToTransaction(
    transaction,
    {
      path,
      lineNumber
    }
  );

  const {
    events,
    ...transactionMetadata
  } = transaction;

  return {
    kind:
      EVENT_TRANSACTION_RECORD_KIND,
    version:
      EVENT_TRANSACTION_RECORD_VERSION,
    transaction:
      transactionMetadata,
    events
  };
}


function recordToTransaction(
  record
) {

  return serializeTransaction({
    ...record.transaction,
    events:
      record.events
  });
}


async function appendLineToLogFile({
  storageAdapter,
  path,
  line
}) {

  try {

    await storageAdapter.ensureDirectory(
      EVENT_STORE_ROOT
    );

    if (typeof storageAdapter.appendText === 'function') {

      await storageAdapter.appendText(
        path,
        line
      );

      return;
    }

    const previousContent =
      await readLogFileText({
        storageAdapter,
        path
      });

    const separator =
      previousContent &&
      !previousContent.endsWith('\n')
        ? '\n'
        : '';

    await storageAdapter.writeText(
      path,
      `${previousContent}${separator}${line}`
    );

  } catch (error) {

    throw new EventStoreError(
      'Event transaction append failed; transaction was not reported durable.',
      {
        code:
          EVENT_STORE_ERROR_CODES.WRITE_FAILED,
        path,
        cause:
          error
      }
    );
  }
}


async function readLogFileText({
  storageAdapter,
  path
}) {

  try {

    return await storageAdapter.readText(
      path
    );

  } catch (error) {

    if (isMissingFileError(error)) {

      return '';
    }

    throw new EventStoreError(
      'Event transaction log could not be read.',
      {
        code:
          EVENT_STORE_ERROR_CODES.READ_FAILED,
        path,
        cause:
          error
      }
    );
  }
}


function queueAppend(
  storageAdapter,
  path,
  task
) {

  let adapterQueues =
    appendQueues.get(
      storageAdapter
    );

  if (!adapterQueues) {

    adapterQueues =
      new Map();

    appendQueues.set(
      storageAdapter,
      adapterQueues
    );
  }

  const previous =
    adapterQueues.get(
      path
    ) || Promise.resolve();

  const queued =
    previous
      .catch(() => {})
      .then(task);

  adapterQueues.set(
    path,
    queued.catch(() => {})
  );

  return queued;
}


function splitJsonLines(
  content
) {

  return String(content || '')
    .split(/\r?\n/)
    .map((line, index) => ({
      line,
      lineNumber:
        index + 1
    }))
    .filter(entry =>
      entry.line.trim()
    );
}


function assertDurableTransactionState(
  transaction,
  context = {}
) {

  if (transaction.status === TRANSACTION_STATUSES.STARTED) {

    throw new EventStoreError(
      'Started transactions are runtime-only and cannot be appended as durable history.',
      {
        code:
          EVENT_STORE_ERROR_CODES.INVALID_TRANSACTION,
        path:
          context.path,
        lineNumber:
          context.lineNumber
      }
    );
  }

  if (
    transaction.status === TRANSACTION_STATUSES.COMPLETED &&
    transaction.events.length < 1
  ) {

    throw new EventStoreError(
      'Completed transactions must contain at least one event before they can be appended as durable history.',
      {
        code:
          EVENT_STORE_ERROR_CODES.INVALID_TRANSACTION,
        path:
          context.path,
        lineNumber:
          context.lineNumber
      }
    );
  }
}


function assertEventBelongsToTransaction(
  transaction,
  context = {}
) {

  const seenEventIds =
    new Set();

  for (const event of transaction.events) {

    if (event.transactionId !== transaction.transactionId) {

      throw new EventStoreError(
        'Event transactionId must match its durable transaction record.',
        {
          code:
            EVENT_STORE_ERROR_CODES.INVALID_TRANSACTION,
          path:
            context.path,
          lineNumber:
            context.lineNumber
        }
      );
    }

    if (seenEventIds.has(event.eventId)) {

      throw new EventStoreError(
        'Event ids must be unique inside a durable transaction record.',
        {
          code:
            EVENT_STORE_ERROR_CODES.INVALID_TRANSACTION,
          path:
            context.path,
          lineNumber:
            context.lineNumber
        }
      );
    }

    seenEventIds.add(
      event.eventId
    );
  }
}


function normalizeInvalidRecordIssue({
  error,
  path,
  lineNumber,
  line
}) {

  const code =
    error instanceof EventStoreError
      ? error.code
      : EVENT_STORE_ERROR_CODES.INVALID_RECORD;

  return {
    code,
    path,
    lineNumber,
    message:
      error?.message || 'Event store record is invalid.',
    rawSnippet:
      String(line || '').slice(
        0,
        160
      )
  };
}


function assertAllowedKeys(
  input,
  allowedKeys,
  {
    owner,
    path,
    lineNumber
  }
) {

  const allowed =
    new Set(
      allowedKeys
    );

  for (const key of Object.keys(input || {})) {

    if (allowed.has(key)) continue;

    throwInvalidRecord(
      `${owner} does not support field ${key}.`,
      {
        path,
        lineNumber
      }
    );
  }
}


function throwInvalidRecord(
  message,
  {
    path,
    lineNumber
  } = {}
) {

  throw new EventStoreError(
    message,
    {
      code:
        EVENT_STORE_ERROR_CODES.INVALID_RECORD,
      path,
      lineNumber
    }
  );
}


function getEventStoreStorageAdapter(
  options
) {

  return options.storageAdapter || getStorageAdapter();
}


function isMissingFileError(
  error
) {

  const code =
    String(error?.code || '').toLowerCase();

  const name =
    String(error?.name || '').toLowerCase();

  const message =
    String(error?.message || error || '').toLowerCase();

  return code === 'enoent' ||
    code === 'desktop.file_not_found' ||
    code === 'file_not_found' ||
    name === 'notfounderror' ||
    /\bmissing\b|\bnot found\b|\benoent\b|\bnotfound\b|не найден|не существует/.test(
      message
    );
}
