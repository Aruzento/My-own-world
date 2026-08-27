import {
  getPageById
} from '../repository/pageRepository.js';

import {
  readEventTransactions
} from './eventStore.js';

import {
  EVENT_TYPES_V1
} from './eventTypes.js';

import {
  PAGE_PROPERTY_RESOURCE_ERROR_CODES,
  PagePropertyResourceTransactionError,
  logPagePropertyResourceChange,
  readPageNumericPropertyResource
} from './pagePropertyResourceTransaction.js';

import {
  TRANSACTION_STATUSES
} from './transactionModel.js';


export const TRANSACTION_REVERSAL_VERSION =
  1;

export const TRANSACTION_REVERSAL_RESULT_KIND =
  'mow-transaction-reversal-result';

export const TRANSACTION_REVERSAL_ERROR_CODES =
  Object.freeze({
    INVALID_INPUT:
      'TRANSACTION_REVERSAL_INVALID_INPUT',
    TRANSACTION_NOT_FOUND:
      'TRANSACTION_REVERSAL_TRANSACTION_NOT_FOUND',
    TARGET_NOT_FOUND:
      'TRANSACTION_REVERSAL_TARGET_NOT_FOUND',
    NOT_REVERSIBLE:
      'TRANSACTION_REVERSAL_NOT_REVERSIBLE',
    ALREADY_REVERSED:
      'TRANSACTION_REVERSAL_ALREADY_REVERSED',
    CURRENT_STATE_CONFLICT:
      'TRANSACTION_REVERSAL_CURRENT_STATE_CONFLICT',
    COMPENSATION_FAILED:
      'TRANSACTION_REVERSAL_COMPENSATION_FAILED'
  });


export class TransactionReversalError extends Error {

  constructor(
    message,
    {
      code =
        TRANSACTION_REVERSAL_ERROR_CODES.INVALID_INPUT,
      transactionId =
        '',
      targetTransactionId =
        '',
      pageId =
        '',
      field =
        '',
      details =
        null,
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
      'TransactionReversalError';

    this.code =
      code;

    this.transactionId =
      transactionId;

    this.targetTransactionId =
      targetTransactionId;

    this.pageId =
      pageId;

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


export function classifyTransactionReversibility(
  transaction,
  transactions = []
) {

  const original =
    normalizeTransactionRecord(
      transaction
    );

  if (!original) {

    return createReversibilityResult({
      reversible:
        false,
      reason:
        'transaction-not-found'
    });
  }

  if (original.status !== TRANSACTION_STATUSES.COMPLETED) {

    return createReversibilityResult({
      reversible:
        false,
      transactionId:
        original.transactionId,
      reason:
        'transaction-not-completed'
    });
  }

  if (original.reversesTransactionId) {

    return createReversibilityResult({
      reversible:
        false,
      transactionId:
        original.transactionId,
      reason:
        'reversal-transaction-not-reversible'
    });
  }

  const existingReversal =
    findExistingReversalTransaction(
      original,
      transactions
    );

  if (existingReversal) {

    return createReversibilityResult({
      reversible:
        false,
      transactionId:
        original.transactionId,
      reason:
        'already-reversed',
      reversedByTransactionId:
        existingReversal.transactionId
    });
  }

  const resourceEvents =
    original.events.filter(event =>
      event.type === EVENT_TYPES_V1.RESOURCE_CHANGED
    );

  if (resourceEvents.length !== 1) {

    return createReversibilityResult({
      reversible:
        false,
      transactionId:
        original.transactionId,
      reason:
        resourceEvents.length === 0
          ? 'no-reversible-resource-event'
          : 'multiple-resource-events-not-supported'
    });
  }

  const event =
    resourceEvents[0];

  const payload =
    event.payload || {};

  const resource =
    payload.resource || {};

  if (resource.kind !== 'page-property') {

    return createReversibilityResult({
      reversible:
        false,
      transactionId:
        original.transactionId,
      reason:
        'unsupported-resource-kind'
    });
  }

  const identity =
    parsePagePropertyResourceId(
      resource.id
    );

  if (!identity) {

    return createReversibilityResult({
      reversible:
        false,
      transactionId:
        original.transactionId,
      reason:
        'invalid-page-property-resource-id'
    });
  }

  if (
    !Number.isFinite(payload.before) ||
    !Number.isFinite(payload.after)
  ) {

    return createReversibilityResult({
      reversible:
        false,
      transactionId:
        original.transactionId,
      reason:
        'resource-values-not-finite'
    });
  }

  return createReversibilityResult({
    reversible:
      true,
    transactionId:
      original.transactionId,
    reason:
      'page-property-resource-change',
    pageId:
      identity.pageId,
    field:
      identity.field,
    originalEventId:
      event.eventId,
    resource,
    before:
      payload.before,
    after:
      payload.after,
    unit:
      payload.unit || ''
  });
}


export async function undoTransaction(
  input = {},
  options = {}
) {

  const normalized =
    normalizeUndoInput(
      input
    );

  const transactions =
    await readEventTransactions({
      storageAdapter:
        options.storageAdapter
    });

  const original =
    transactions.find(transaction =>
      transaction.transactionId === normalized.transactionId
    ) || null;

  if (!original) {

    throw new TransactionReversalError(
      `Transaction ${normalized.transactionId} was not found.`,
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.TRANSACTION_NOT_FOUND,
        targetTransactionId:
          normalized.transactionId
      }
    );
  }

  const reversibility =
    classifyTransactionReversibility(
      original,
      transactions
    );

  if (!reversibility.reversible) {

    throw createReversibilityError(
      reversibility,
      normalized.transactionId
    );
  }

  const page =
    await resolvePageForReversal(
      reversibility.pageId,
      options
    );

  if (!page) {

    throw new TransactionReversalError(
      `Undo target page ${reversibility.pageId} was not found.`,
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.TARGET_NOT_FOUND,
        targetTransactionId:
          normalized.transactionId,
        pageId:
          reversibility.pageId,
        field:
          reversibility.field
      }
    );
  }

  const currentResource =
    readPageNumericPropertyResource(
      page,
      {
        field:
          reversibility.field
      }
    );

  if (!currentResource.found) {

    throw new TransactionReversalError(
      `Undo target resource ${reversibility.field} was not found.`,
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.TARGET_NOT_FOUND,
        targetTransactionId:
          normalized.transactionId,
        pageId:
          reversibility.pageId,
        field:
          reversibility.field,
        details:
          {
            reason:
              currentResource.reason || 'resource-not-found'
          }
      }
    );
  }

  if (currentResource.value !== reversibility.after) {

    throw new TransactionReversalError(
      'Transaction undo cannot proceed because the current resource state no longer matches the original transaction after value.',
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.CURRENT_STATE_CONFLICT,
        targetTransactionId:
          normalized.transactionId,
        pageId:
          reversibility.pageId,
        field:
          reversibility.field,
        details:
          {
            expectedCurrent:
              reversibility.after,
            actualCurrent:
              currentResource.value
          }
      }
    );
  }

  let compensation;

  try {

    compensation =
      await logPagePropertyResourceChange({
        page,
        field:
          reversibility.field,
        after:
          reversibility.before,
        transactionId:
          normalized.reversalTransactionId,
        eventId:
          normalized.reversalEventId,
        createdAt:
          normalized.createdAt,
        eventCreatedAt:
          normalized.eventCreatedAt,
        completedAt:
          normalized.completedAt,
        order:
          normalized.order,
        intentType:
          'transaction-reversal',
        label:
          normalized.label ||
          `Undo ${original.label || original.transactionId}`,
        source:
          normalized.source,
        reason:
          createCompensationReason(
            normalized.reason
          ),
        unit:
          reversibility.unit,
        resource:
          reversibility.resource,
        reversesTransactionId:
          original.transactionId,
        reversesEventId:
          reversibility.originalEventId,
        reversalMetadataEventId:
          normalized.reversalMetadataEventId,
        reversalMetadataReason:
          normalized.reason || 'undo'
      },
      {
        storageAdapter:
          options.storageAdapter
      });

  } catch (error) {

    if (error instanceof PagePropertyResourceTransactionError) {

      throw new TransactionReversalError(
        'Transaction undo compensation failed; no reversal was reported as successful.',
        {
          code:
            error.code === PAGE_PROPERTY_RESOURCE_ERROR_CODES.STATE_WRITE_BLOCKED
              ? TRANSACTION_REVERSAL_ERROR_CODES.CURRENT_STATE_CONFLICT
              : TRANSACTION_REVERSAL_ERROR_CODES.COMPENSATION_FAILED,
          targetTransactionId:
            normalized.transactionId,
          transactionId:
            normalized.reversalTransactionId,
          pageId:
            reversibility.pageId,
          field:
            reversibility.field,
          cause:
            error
        }
      );
    }

    throw error;
  }

  return deepFreeze({
    kind:
      TRANSACTION_REVERSAL_RESULT_KIND,
    version:
      TRANSACTION_REVERSAL_VERSION,
    status:
      compensation.status,
    originalTransactionId:
      original.transactionId,
    reversesTransactionId:
      original.transactionId,
    reversalTransactionId:
      normalized.reversalTransactionId,
    pageId:
      reversibility.pageId,
    field:
      reversibility.field,
    before:
      compensation.before,
    after:
      compensation.after,
    delta:
      compensation.delta,
    transaction:
      compensation.transaction,
    event:
      compensation.event,
    reversalEvent:
      compensation.reversalEvent,
    pageWrite:
      compensation.pageWrite,
    record:
      compensation.record
  });
}


function createReversibilityResult(
  input
) {

  return deepFreeze({
    kind:
      'mow-transaction-reversibility',
    version:
      TRANSACTION_REVERSAL_VERSION,
    reversible:
      Boolean(
        input.reversible
      ),
    transactionId:
      input.transactionId || null,
    reason:
      input.reason || null,
    reversedByTransactionId:
      input.reversedByTransactionId || null,
    pageId:
      input.pageId || null,
    field:
      input.field || null,
    originalEventId:
      input.originalEventId || null,
    resource:
      input.resource || null,
    before:
      input.before ?? null,
    after:
      input.after ?? null,
    unit:
      input.unit || ''
  });
}


function createReversibilityError(
  reversibility,
  targetTransactionId
) {

  const alreadyReversed =
    reversibility.reason === 'already-reversed';

  return new TransactionReversalError(
    alreadyReversed
      ? `Transaction ${targetTransactionId} has already been reversed.`
      : `Transaction ${targetTransactionId} is not reversible in the v1 undo contract.`,
    {
      code:
        alreadyReversed
          ? TRANSACTION_REVERSAL_ERROR_CODES.ALREADY_REVERSED
          : TRANSACTION_REVERSAL_ERROR_CODES.NOT_REVERSIBLE,
      targetTransactionId,
      details:
        {
          reason:
            reversibility.reason,
          reversedByTransactionId:
            reversibility.reversedByTransactionId || null
        }
    }
  );
}


function findExistingReversalTransaction(
  original,
  transactions
) {

  if (original.reversedByTransactionId) {

    return {
      transactionId:
        original.reversedByTransactionId
    };
  }

  return transactions.find(transaction => {

    if (transaction.transactionId === original.transactionId) return false;

    if (
      transaction.status === TRANSACTION_STATUSES.COMPLETED &&
      transaction.reversesTransactionId === original.transactionId
    ) {

      return true;
    }

    return transaction.events?.some(event =>
      event.type === EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED &&
      event.payload?.originalTransactionId === original.transactionId
    );
  }) || null;
}


function parsePagePropertyResourceId(
  value
) {

  const text =
    typeof value === 'string'
      ? value.trim()
      : '';

  const index =
    text.indexOf(':');

  if (
    index <= 0 ||
    index >= text.length - 1
  ) {

    return null;
  }

  return {
    pageId:
      text.slice(
        0,
        index
      ),
    field:
      text.slice(
        index + 1
      )
  };
}


async function resolvePageForReversal(
  pageId,
  options
) {

  if (typeof options.pageResolver === 'function') {

    return options.pageResolver(
      pageId
    );
  }

  return getPageById(
    pageId
  );
}


function normalizeUndoInput(
  input
) {

  assertPlainObject(
    input,
    'transaction undo input'
  );

  assertAllowedKeys(
    input,
    [
      'transactionId',
      'reversalTransactionId',
      'reversalEventId',
      'reversalMetadataEventId',
      'createdAt',
      'eventCreatedAt',
      'completedAt',
      'order',
      'label',
      'source',
      'reason'
    ],
    'transaction undo input'
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
    transactionId:
      requiredString(
        input.transactionId,
        'transactionId'
      ),
    reversalTransactionId:
      requiredString(
        input.reversalTransactionId,
        'reversalTransactionId'
      ),
    reversalEventId:
      requiredString(
        input.reversalEventId,
        'reversalEventId'
      ),
    reversalMetadataEventId:
      requiredString(
        input.reversalMetadataEventId,
        'reversalMetadataEventId'
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
      )
  };
}


function normalizeTransactionRecord(
  transaction
) {

  if (
    !transaction ||
    typeof transaction !== 'object' ||
    Array.isArray(
      transaction
    )
  ) {

    return null;
  }

  return transaction;
}


function createCompensationReason(
  reason
) {

  return reason
    ? `undo: ${reason}`
    : 'undo';
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
    !Number.isSafeInteger(value) ||
    value < 0
  ) {

    throw new TransactionReversalError(
      'Transaction undo order must be a non-negative safe integer.',
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.INVALID_INPUT,
        field:
          'order'
      }
    );
  }

  return value;
}


function requiredString(
  value,
  field
) {

  if (typeof value !== 'string') {

    throw new TransactionReversalError(
      `${field} must be a string.`,
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.INVALID_INPUT,
        field
      }
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {

    throw new TransactionReversalError(
      `${field} must not be empty.`,
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.INVALID_INPUT,
        field
      }
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

    throw new TransactionReversalError(
      `${field} must be a string.`,
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.INVALID_INPUT,
        field
      }
    );
  }

  return value.trim();
}


function assertPlainObject(
  value,
  owner
) {

  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(
      value
    )
  ) {

    throw new TransactionReversalError(
      `${owner} must be an object.`,
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.INVALID_INPUT
      }
    );
  }
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

    throw new TransactionReversalError(
      `${owner} does not support field ${key}.`,
      {
        code:
          TRANSACTION_REVERSAL_ERROR_CODES.INVALID_INPUT,
        field:
          key
      }
    );
  }
}


function cloneJsonValue(
  value
) {

  if (value === undefined) return null;

  return JSON.parse(
    JSON.stringify(
      value
    )
  );
}


function deepFreeze(
  value,
  seen =
    new WeakSet()
) {

  if (
    value === null ||
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

  for (const child of Object.values(value)) {

    deepFreeze(
      child,
      seen
    );
  }

  return value;
}
