import {
  updatePageRecordContent,
  parsePageRecordContent
} from '../core/pageRecord.js';

import {
  persistPageContentCommand,
  snapshotPageForCommand
} from '../storage/pageCommandService.js';

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


export const PAGE_PROPERTY_RESOURCE_TRANSACTION_VERSION =
  1;

export const PAGE_PROPERTY_RESOURCE_TRANSACTION_KIND =
  'mow-page-property-resource-transaction';

export const PAGE_PROPERTY_RESOURCE_TRANSACTION_RESULT_KIND =
  'mow-page-property-resource-transaction-result';

export const PAGE_PROPERTY_RESOURCE_ERROR_CODES =
  Object.freeze({
    INVALID_INPUT:
      'RESOURCE_TRANSACTION_INVALID_INPUT',
    TARGET_NOT_FOUND:
      'RESOURCE_TARGET_NOT_FOUND',
    VALUE_INVALID:
      'RESOURCE_VALUE_INVALID',
    STATE_WRITE_FAILED:
      'RESOURCE_STATE_WRITE_FAILED',
    STATE_WRITE_BLOCKED:
      'RESOURCE_STATE_WRITE_BLOCKED',
    EVENT_APPEND_FAILED:
      'RESOURCE_EVENT_APPEND_FAILED',
    EVENT_APPEND_ROLLBACK_FAILED:
      'RESOURCE_EVENT_APPEND_ROLLBACK_FAILED'
  });


export class PagePropertyResourceTransactionError extends Error {

  constructor(
    message,
    {
      code =
        PAGE_PROPERTY_RESOURCE_ERROR_CODES.INVALID_INPUT,
      field =
        '',
      pageId =
        '',
      cause =
        null,
      rollback =
        null,
      rollbackError =
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
      'PagePropertyResourceTransactionError';

    this.code =
      code;

    this.field =
      field;

    this.pageId =
      pageId;

    this.rollback =
      rollback;

    this.rollbackError =
      rollbackError;
  }
}


export function readPageNumericPropertyResource(
  page,
  input = {}
) {

  const field =
    normalizeField(
      input.field
    );

  const pageId =
    normalizePageId(
      page
    );

  if (!page?.content) {

    return createMissingResourceRead({
      pageId,
      field,
      reason:
        'page-content-missing'
    });
  }

  const parsed =
    parsePageRecordContent(
      page.content,
      {
        generateId:
          false
      }
    );

  const match =
    findNumericPropertyInput(
      parsed.rawBody || parsed.body || '',
      field
    );

  if (!match.found) {

    return createMissingResourceRead({
      pageId,
      field,
      reason:
        match.reason
    });
  }

  const value =
    parseResourceNumber(
      match.value,
      {
        pageId,
        field,
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.VALUE_INVALID,
        message:
          `Page property ${field} does not contain a finite numeric value.`
      }
    );

  return deepFreeze({
    kind:
      'mow-page-property-resource-read',
    version:
      PAGE_PROPERTY_RESOURCE_TRANSACTION_VERSION,
    found:
      true,
    pageId,
    field,
    value
  });
}


export function createPagePropertyResourceChangeTransaction(
  input = {}
) {

  const normalized =
    normalizeResourceChangeInput(
      input
    );

  const event =
    createTypedEvent({
      eventId:
        normalized.eventId,
      transactionId:
        normalized.transactionId,
      type:
        EVENT_TYPES_V1.RESOURCE_CHANGED,
      createdAt:
        normalized.eventCreatedAt,
      order:
        1,
      reversesEventId:
        normalized.reversesEventId || undefined,
      payload:
        createResourceChangePayload({
          resource:
            normalized.resource,
          before:
            normalized.before,
          after:
            normalized.after,
          delta:
            normalized.delta,
          unit:
            normalized.unit,
          reason:
            normalized.reason
        })
    });

  let transaction =
    appendTransactionEvent(
      createTransaction({
        transactionId:
          normalized.transactionId,
        intentType:
          normalized.intentType,
        label:
          normalized.label ||
          `Change ${normalized.resource.label || normalized.resource.id}`,
        source:
          normalized.source,
        reason:
          normalized.reason,
        createdAt:
          normalized.createdAt,
        order:
          normalized.order,
        reversesTransactionId:
          normalized.reversesTransactionId || undefined
      }),
      event
    );

  let reversalEvent =
    null;

  if (normalized.reversalMetadataEventId) {

    reversalEvent =
      createTypedEvent({
        eventId:
          normalized.reversalMetadataEventId,
        transactionId:
          normalized.transactionId,
        type:
          EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED,
        createdAt:
          normalized.eventCreatedAt,
        order:
          2,
        payload:
          createTransactionReversalPayload({
            originalTransactionId:
              normalized.reversesTransactionId,
            reversalTransactionId:
              normalized.transactionId,
            reversedEventIds:
              [
                normalized.reversesEventId
              ],
            reason:
              normalized.reversalMetadataReason || normalized.reason
          })
      });

    transaction =
      appendTransactionEvent(
        transaction,
        reversalEvent
      );
  }

  transaction =
    completeTransaction(
      transaction,
      {
        completedAt:
          normalized.completedAt
      }
    );

  return deepFreeze({
    kind:
      PAGE_PROPERTY_RESOURCE_TRANSACTION_KIND,
    version:
      PAGE_PROPERTY_RESOURCE_TRANSACTION_VERSION,
    transaction,
    event,
    reversalEvent,
    before:
      normalized.before,
    after:
      normalized.after,
    delta:
      normalized.delta,
    resource:
      normalized.resource
  });
}


export async function logPagePropertyResourceChange(
  input = {},
  options = {}
) {

  const normalized =
    normalizeStatefulResourceInput(
      input
    );

  const previousPage =
    snapshotPageForCommand(
      normalized.page
    );

  const previousContent =
    normalized.page.content;

  const mutation =
    createPageNumericPropertyResourceContent({
      page:
        normalized.page,
      field:
        normalized.field,
      after:
        normalized.after
    });

  const resource =
    createPagePropertyResourceReference({
      page:
        normalized.page,
      field:
        normalized.field,
      resource:
        normalized.resource
    });

  const resourceTransaction =
    createPagePropertyResourceChangeTransaction({
      ...normalized,
      before:
        mutation.before,
      delta:
        mutation.after - mutation.before,
      resource
    });

  let pageWrite;

  try {

    pageWrite =
      await persistPageContentCommand({
        page:
          normalized.page,
        content:
          mutation.content,
        previousPage,
        type:
          'page-property-resource-change',
        reason:
          normalized.reason || 'page-property-resource-change',
        expectedBase:
          normalized.expectedBase
      });

  } catch (error) {

    throw new PagePropertyResourceTransactionError(
      'Page resource state write failed before the event was appended.',
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.STATE_WRITE_FAILED,
        field:
          normalized.field,
        pageId:
          normalized.page.id,
        cause:
          error
      }
    );
  }

  if (!isSavedPageWrite(pageWrite)) {

    throw new PagePropertyResourceTransactionError(
      'Page resource state write was blocked before the event was appended.',
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.STATE_WRITE_BLOCKED,
        field:
          normalized.field,
        pageId:
          normalized.page.id
      }
    );
  }

  let appendResult;

  try {

    appendResult =
      await appendTransactionRecord(
        resourceTransaction.transaction,
        {
          storageAdapter:
            options.storageAdapter
        }
      );

  } catch (error) {

    let rollback =
      null;

    try {

      rollback =
        await rollbackPageContentAfterEventFailure({
          page:
            normalized.page,
          content:
            previousContent,
          reason:
            normalized.reason || 'page-property-resource-change'
        });

    } catch (rollbackError) {

      throw new PagePropertyResourceTransactionError(
        'Page resource event append failed, and rollback also failed.',
        {
          code:
            PAGE_PROPERTY_RESOURCE_ERROR_CODES.EVENT_APPEND_ROLLBACK_FAILED,
          field:
            normalized.field,
          pageId:
            normalized.page.id,
          cause:
            error,
          rollbackError
        }
      );
    }

    throw new PagePropertyResourceTransactionError(
      'Page resource event append failed; page state was rolled back.',
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.EVENT_APPEND_FAILED,
        field:
          normalized.field,
        pageId:
          normalized.page.id,
        cause:
          error,
        rollback
      }
    );
  }

  return deepFreeze({
    kind:
      PAGE_PROPERTY_RESOURCE_TRANSACTION_RESULT_KIND,
    version:
      PAGE_PROPERTY_RESOURCE_TRANSACTION_VERSION,
    status:
      appendResult.status,
    path:
      appendResult.path,
    pageId:
      normalized.page.id,
    field:
      normalized.field,
    before:
      resourceTransaction.before,
    after:
      resourceTransaction.after,
    delta:
      resourceTransaction.delta,
    resource:
      resourceTransaction.resource,
    pageWrite:
      serializePageWriteResult(
        pageWrite
      ),
    transaction:
      resourceTransaction.transaction,
    event:
      resourceTransaction.event,
    reversalEvent:
      resourceTransaction.reversalEvent,
    record:
      appendResult.record
  });
}


function createPageNumericPropertyResourceContent({
  page,
  field,
  after
}) {

  const current =
    readPageNumericPropertyResource(
      page,
      {
        field
      }
    );

  if (!current.found) {

    throw new PagePropertyResourceTransactionError(
      `Page property ${field} was not found.`,
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.TARGET_NOT_FOUND,
        field,
        pageId:
          normalizePageId(
            page
          )
      }
    );
  }

  const parsed =
    parsePageRecordContent(
      page.content,
      {
        generateId:
          false
      }
    );

  const body =
    parsed.rawBody || parsed.body || '';

  const match =
    findNumericPropertyInput(
      body,
      field
    );

  const nextTag =
    setInputValueAttribute(
      match.tag,
      formatResourceNumber(
        after
      )
    );

  const nextBody =
    `${body.slice(0, match.index)}${nextTag}${body.slice(match.index + match.tag.length)}`;

  return {
    before:
      current.value,
    after,
    content:
      updatePageRecordContent(
        page.content,
        {
          body:
            nextBody
        }
      )
  };
}


async function rollbackPageContentAfterEventFailure({
  page,
  content,
  reason
}) {

  return persistPageContentCommand({
    page,
    content,
    previousPage:
      snapshotPageForCommand(
        page
      ),
    type:
      'page-property-resource-event-rollback',
    reason:
      `${reason}:event-append-rollback`
  });
}


function normalizeStatefulResourceInput(
  input
) {

  assertPlainObject(
    input,
    'Page property resource transaction input'
  );

  assertAllowedKeys(
    input,
    [
      'page',
      'field',
      'after',
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
      'unit',
      'resource',
      'reversesTransactionId',
      'reversesEventId',
      'reversalMetadataEventId',
      'reversalMetadataReason',
      'expectedBase'
    ],
    'page property resource transaction input'
  );

  if (
    !input.page ||
    typeof input.page !== 'object' ||
    !input.page.id ||
    typeof input.page.content !== 'string'
  ) {

    throw new PagePropertyResourceTransactionError(
      'Page property resource transaction requires a live page with content.',
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.INVALID_INPUT
      }
    );
  }

  const field =
    normalizeField(
      input.field
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
    page:
      input.page,
    field,
    after:
      parseResourceNumber(
        input.after,
        {
          pageId:
            input.page.id,
          field,
          code:
            PAGE_PROPERTY_RESOURCE_ERROR_CODES.VALUE_INVALID,
          message:
            'Page property resource after value must be finite.'
        }
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
      ) || 'page-property-resource-change',
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
    unit:
      optionalString(
        input.unit,
        'unit'
      ),
    resource:
      normalizeOptionalResourceReference(
        input.resource
      ),
    reversesTransactionId:
      optionalString(
        input.reversesTransactionId,
        'reversesTransactionId'
      ),
    reversesEventId:
      optionalString(
        input.reversesEventId,
        'reversesEventId'
      ),
    reversalMetadataEventId:
      optionalString(
        input.reversalMetadataEventId,
        'reversalMetadataEventId'
      ),
    reversalMetadataReason:
      optionalString(
        input.reversalMetadataReason,
        'reversalMetadataReason'
      ),
    expectedBase:
      input.expectedBase
  };
}


function normalizeResourceChangeInput(
  input
) {

  assertPlainObject(
    input,
    'Page property resource change transaction input'
  );

  assertAllowedKeys(
    input,
    [
      'field',
      'before',
      'after',
      'delta',
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
      'unit',
      'resource',
      'reversesTransactionId',
      'reversesEventId',
      'reversalMetadataEventId',
      'reversalMetadataReason',
      'page',
      'expectedBase'
    ],
    'page property resource change transaction input'
  );

  const field =
    normalizeField(
      input.field
    );

  const pageId =
    normalizePageId(
      input.page
    );

  const before =
    parseResourceNumber(
      input.before,
      {
        pageId,
        field,
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.VALUE_INVALID,
        message:
          'Page property resource before value must be finite.'
      }
    );

  const after =
    parseResourceNumber(
      input.after,
      {
        pageId,
        field,
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.VALUE_INVALID,
        message:
          'Page property resource after value must be finite.'
      }
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

  const reversesTransactionId =
    optionalString(
      input.reversesTransactionId,
      'reversesTransactionId'
    );

  const reversesEventId =
    optionalString(
      input.reversesEventId,
      'reversesEventId'
    );

  const reversalMetadataEventId =
    optionalString(
      input.reversalMetadataEventId,
      'reversalMetadataEventId'
    );

  assertReversalInput({
    reversesTransactionId,
    reversesEventId,
    reversalMetadataEventId
  });

  return {
    ...input,
    field,
    before,
    after,
    delta:
      parseResourceNumber(
        input.delta,
        {
          pageId,
          field,
          code:
            PAGE_PROPERTY_RESOURCE_ERROR_CODES.VALUE_INVALID,
          message:
            'Page property resource delta value must be finite.'
        }
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
      ) || 'page-property-resource-change',
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
    unit:
      optionalString(
        input.unit,
        'unit'
      ),
    resource:
      input.resource,
    reversesTransactionId,
    reversesEventId,
    reversalMetadataEventId,
    reversalMetadataReason:
      optionalString(
        input.reversalMetadataReason,
        'reversalMetadataReason'
      )
  };
}


function createPagePropertyResourceReference({
  page,
  field,
  resource = null
}) {

  if (resource) {

    return resource;
  }

  const pageId =
    normalizePageId(
      page
    );

  return {
    kind:
      'page-property',
    id:
      `${pageId}:${field}`,
    label:
      `${page?.title || pageId} · ${field}`
  };
}


function createResourceChangePayload({
  resource,
  before,
  after,
  delta,
  unit,
  reason
}) {

  const payload = {
    resource,
    before,
    after,
    delta
  };

  if (unit) {

    payload.unit =
      unit;
  }

  if (reason) {

    payload.reason =
      reason;
  }

  return payload;
}


function createTransactionReversalPayload({
  originalTransactionId,
  reversalTransactionId,
  reversedEventIds,
  reason
}) {

  const payload = {
    originalTransactionId,
    reversalTransactionId,
    reversedEventIds
  };

  if (reason) {

    payload.reason =
      reason;
  }

  return payload;
}


function assertReversalInput({
  reversesTransactionId,
  reversesEventId,
  reversalMetadataEventId
}) {

  const hasAny =
    Boolean(
      reversesTransactionId ||
      reversesEventId ||
      reversalMetadataEventId
    );

  if (!hasAny) return;

  if (
    !reversesTransactionId ||
    !reversesEventId ||
    !reversalMetadataEventId
  ) {

    throw new PagePropertyResourceTransactionError(
      'A page property resource reversal requires transaction, event and metadata event links.',
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.INVALID_INPUT
      }
    );
  }
}


function findNumericPropertyInput(
  body,
  field
) {

  const inputPattern =
    /<input\b[^>]*>/gi;

  let match;

  while (
    (match = inputPattern.exec(String(body || '')))
  ) {

    const tag =
      match[0];

    const attributes =
      parseAttributes(
        tag
      );

    if (attributes['data-property-name'] !== field) continue;

    const type =
      String(attributes.type || '')
        .toLowerCase();

    const propertyType =
      String(attributes['data-property-type'] || '')
        .toLowerCase();

    if (
      type !== 'number' &&
      propertyType !== 'number'
    ) {

      return {
        found:
          false,
        reason:
          'property-not-numeric'
      };
    }

    return {
      found:
        true,
      index:
        match.index,
      tag,
      value:
        attributes.value ?? ''
    };
  }

  return {
    found:
      false,
    reason:
      'property-not-found'
  };
}


function parseAttributes(
  tag
) {

  const attributes =
    {};

  const source =
    String(tag || '')
      .replace(/^<input\b/i, '')
      .replace(/\/?>$/i, '');

  const attributePattern =
    /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  let match;

  while (
    (match = attributePattern.exec(source))
  ) {

    attributes[match[1].toLowerCase()] =
      match[2] ?? match[3] ?? match[4] ?? '';
  }

  return attributes;
}


function setInputValueAttribute(
  tag,
  value
) {

  const serializedValue =
    escapeAttribute(
      value
    );

  if (/\svalue\s*=/.test(tag)) {

    return tag.replace(
      /(\svalue\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/,
      `$1"${serializedValue}"`
    );
  }

  return tag.replace(
    /\s*\/?>$/,
    match =>
      ` value="${serializedValue}"${match}`
  );
}


function createMissingResourceRead({
  pageId,
  field,
  reason
}) {

  return deepFreeze({
    kind:
      'mow-page-property-resource-read',
    version:
      PAGE_PROPERTY_RESOURCE_TRANSACTION_VERSION,
    found:
      false,
    pageId,
    field,
    value:
      null,
    reason
  });
}


function isSavedPageWrite(
  pageWrite
) {

  return Boolean(
    pageWrite?.writeStatus === 'saved' &&
    pageWrite?.written === true
  );
}


function serializePageWriteResult(
  pageWrite
) {

  return {
    writeStatus:
      pageWrite?.writeStatus || null,
    written:
      Boolean(
        pageWrite?.written
      ),
    stale:
      Boolean(
        pageWrite?.stale
      ),
    conflict:
      Boolean(
        pageWrite?.conflict
      ),
    blocked:
      Boolean(
        pageWrite?.blocked
      ),
    reason:
      pageWrite?.reason || null
  };
}


function normalizeOptionalResourceReference(
  resource
) {

  if (
    resource === undefined ||
    resource === null
  ) {

    return null;
  }

  assertPlainObject(
    resource,
    'resource reference'
  );

  assertAllowedKeys(
    resource,
    [
      'kind',
      'id',
      'label'
    ],
    'resource reference'
  );

  return {
    kind:
      requiredString(
        resource.kind,
        'resource.kind'
      ),
    id:
      requiredString(
        resource.id,
        'resource.id'
      ),
    label:
      optionalString(
        resource.label,
        'resource.label'
      )
  };
}


function normalizeField(
  field
) {

  return requiredString(
    field,
    'field'
  );
}


function normalizePageId(
  page
) {

  return typeof page?.id === 'string'
    ? page.id.trim()
    : '';
}


function parseResourceNumber(
  value,
  {
    pageId,
    field,
    code,
    message
  }
) {

  const number =
    Number(
      value
    );

  if (!Number.isFinite(number)) {

    throw new PagePropertyResourceTransactionError(
      message,
      {
        code,
        pageId,
        field
      }
    );
  }

  return number;
}


function formatResourceNumber(
  value
) {

  if (Number.isInteger(value)) {

    return String(
      value
    );
  }

  return String(
    value
  );
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

    throw new PagePropertyResourceTransactionError(
      'Page property resource transaction order must be a non-negative safe integer.',
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.INVALID_INPUT
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

    throw new PagePropertyResourceTransactionError(
      `${field} must be a string.`,
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.INVALID_INPUT,
        field
      }
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {

    throw new PagePropertyResourceTransactionError(
      `${field} must not be empty.`,
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.INVALID_INPUT,
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

    throw new PagePropertyResourceTransactionError(
      `${field} must be a string.`,
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.INVALID_INPUT,
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

    throw new PagePropertyResourceTransactionError(
      `${owner} must be an object.`,
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.INVALID_INPUT
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

    throw new PagePropertyResourceTransactionError(
      `${owner} does not support field ${key}.`,
      {
        code:
          PAGE_PROPERTY_RESOURCE_ERROR_CODES.INVALID_INPUT,
        field:
          key
      }
    );
  }
}


function escapeAttribute(
  value
) {

  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
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
