import {
  notifyPageUpdated
} from '../repository/pageRepository.js';

import {
  createWriteRevision,
  getPageWriteKey,
  markWriteRevisionState,
  writePageContent
} from './writeQueue.js';

import {
  parsePageRecordContent,
  updatePageRecordContent
} from '../core/pageRecord.js';

import {
  createPageWriteExpectedBase,
  evaluatePageWritePrecondition,
  readCurrentDurablePageContent,
  shouldBlockPageWriteForPrecondition
} from './pageWritePreconditions.js';


const pageCommandEvents =
  [];

const pageUndoEntries =
  [];

const MAX_PAGE_UNDO_ENTRIES =
  30;

const SUPPORTED_STRUCTURED_PAGE_RECORD_FIELDS =
  new Map([
    [
      'aliases',
      'aliases'
    ],
    [
      'metadata.aliases',
      'aliases'
    ],
    [
      'page-record.aliases',
      'aliases'
    ],
    [
      'tags',
      'tags'
    ],
    [
      'metadata.tags',
      'tags'
    ],
    [
      'page-record.tags',
      'tags'
    ],
    [
      'type',
      'type'
    ],
    [
      'metadata.type',
      'type'
    ],
    [
      'page-record.type',
      'type'
    ]
  ]);

const PAGE_COMMAND_PHASES =
  Object.freeze([
    'validate',
    'createRollback',
    'apply',
    'persist',
    'updateIndexes',
    'publishEvent'
  ]);


export async function executePageCommand(
  command = {}
) {

  const context =
    createPageCommandContext(
      command
    );

  const event =
    createPageCommandEvent(
      command,
      context
    );

  pageCommandEvents.push(
    event
  );

  try {

    for (const phase of PAGE_COMMAND_PHASES) {

      const handler =
        command[phase];

      if (typeof handler !== 'function') continue;

      event.phases.push(
        phase
      );

      const phaseResult =
        await handler(
          context
        );

      if (phase === 'createRollback') {

        context.rollbackData =
          phaseResult;
      } else if (phaseResult !== undefined) {

        context.phaseResults[phase] =
          phaseResult;
      }
    }

    event.status =
      'completed';

    event.completedAt =
      new Date().toISOString();

    event.durationMs =
      Date.now() - context.startedAtMs;

    return typeof command.getResult === 'function'
      ? command.getResult(
        context
      )
      : context.result;

  } catch (error) {

    event.status =
      'failed';

    event.failedAt =
      new Date().toISOString();

    event.durationMs =
      Date.now() - context.startedAtMs;

    event.error =
      String(
        error?.message || error || 'Unknown page command error'
      );

    if (typeof command.rollback === 'function') {

      event.phases.push(
        'rollback'
      );

      await command.rollback(
        error,
        context
      );
    }

    throw error;
  }
}


export async function persistPageContentCommand({
  page,
  content,
  previousPage = null,
  type = 'update-page-content',
  reason = type,
  expectedBase = undefined,
  structuredMutation = null
} = {}) {

  const beforePage =
    previousPage ||
    snapshotPageForCommand(
      page
    );

  const writeRevision =
    createWriteRevision(
      getPageWriteKey(
        page
      ),
      {
        pageId:
          page?.id || null,
        type,
        reason
      }
    );

  return executePageCommand({
    type,
    writeRevision,
    affectedPages:
      page?.id
        ? [
          page.id
        ]
        : [],
    validate() {

      if (!page?.id) {

        throw new Error(
          'Page command requires a page id.'
        );
      }

      if (typeof content !== 'string') {

        throw new Error(
          'Page command content must be a string.'
        );
      }
    },
    createRollback() {

      return {
        beforePage,
        beforeContent:
          page.content
      };
    },
    async persist(context) {

      context.phaseResults.precondition =
        await evaluatePageWritePrecondition({
          page,
          expectedBase:
            expectedBase === undefined
              ? beforePage?.pageStateIdentity || null
              : expectedBase
        });

      let contentToPersist =
        content;

      if (
        shouldBlockPageWriteForPrecondition(
          context.phaseResults.precondition
        )
      ) {

        const preservation =
          await createStructuredPageChangePreservation({
            page,
            content,
            beforePage,
            precondition:
              context.phaseResults.precondition,
            structuredMutation
          });

        context.phaseResults.structuredPreservation =
          preservation;

        if (preservation.ok) {

          contentToPersist =
            preservation.content;

          context.phaseResults.precondition =
            createPreservedPreconditionResult({
              precondition:
                context.phaseResults.precondition,
              preservation
            });

        } else {

          markWriteRevisionState(
            writeRevision,
            getPreconditionBlockedRevisionState(
              context.phaseResults.precondition
            ),
            {
              error:
                getPreconditionBlockedMessage(
                  context.phaseResults.precondition
                )
            }
          );

          return createPreconditionBlockedWriteResult({
            page,
            type,
            reason,
            writeRevision,
            precondition:
              context.phaseResults.precondition
          });
        }
      }

      const writeResult =
        await writePageContent(
        page,
        contentToPersist,
        {
          revision:
            writeRevision
        }
      );

      return writeResult;
    },
    updateIndexes(context) {

      const writeResult =
        context.phaseResults.persist;

      const precondition =
        context.phaseResults.precondition || null;

      if (
        isPreconditionBlockedWriteResult(
          writeResult
        ) ||
        isSupersededWriteResult(
          writeResult
        )
      ) {

        context.result = {
          page,
          reason,
          writeStatus:
            writeResult.state,
          stale:
            Boolean(
              isSupersededWriteResult(
                writeResult
              )
            ),
          conflict:
            Boolean(
              writeResult.conflict
            ),
          blocked:
            Boolean(
              writeResult.blocked
            ),
          written:
            Boolean(writeResult.written),
          precondition,
          blockReason:
            writeResult.blockReason || null,
          conflictEvidence:
            writeResult.conflictEvidence || null,
          preservedUnrelatedChanges:
            false,
          structuredPreservation:
            omitStructuredPreservationContent(
              context.phaseResults.structuredPreservation
            )
        };

        return;
      }

      if (
        context.phaseResults.structuredPreservation?.preserved
      ) {

        applyPageRecordContentToRuntimePage(
          page,
          context.phaseResults.structuredPreservation.content
        );

      } else {

        page.content =
          content;
      }

      notifyPageUpdated(
        beforePage,
        page
      );
    },
    publishEvent(context) {

      const writeResult =
        context.phaseResults.persist;

      const precondition =
        context.phaseResults.precondition || null;

      if (
        !isPreconditionBlockedWriteResult(
          writeResult
        ) &&
        !isSupersededWriteResult(
          writeResult
        )
      ) {

        registerRenameUndoEntry({
          type,
          page,
          beforePage,
          beforeContent:
            context.rollbackData?.beforeContent
        });
      }

      context.result = {
        page,
        reason,
        writeStatus:
          writeResult?.state || 'saved',
        stale:
          Boolean(
            isSupersededWriteResult(
              writeResult
            )
          ),
        conflict:
          Boolean(
            writeResult?.conflict
          ),
        blocked:
          Boolean(
            writeResult?.blocked
          ),
        written:
          Boolean(
            writeResult?.written
          ),
        precondition,
        blockReason:
          writeResult?.blockReason || null,
        conflictEvidence:
          writeResult?.conflictEvidence || null,
        preservedUnrelatedChanges:
          Boolean(
            context.phaseResults.structuredPreservation?.preserved
          ),
        structuredPreservation:
          omitStructuredPreservationContent(
            context.phaseResults.structuredPreservation
          )
      };
    },
    rollback(
      error,
      context
    ) {

      if (
        context.rollbackData?.beforeContent !== undefined
      ) {

        page.content =
          context.rollbackData.beforeContent;
      }

      markWriteRevisionState(
        writeRevision,
        'error',
        {
          error:
            error?.message || error
        }
      );

      if (context.rollbackData?.beforePage) {

        restorePageMetadata(
          page,
          context.rollbackData.beforePage
        );

        notifyPageUpdated(
          context.rollbackData.beforePage,
          page
        );
      }
    },
    getResult(context) {

      return context.result;
    }
  });
}


function isSupersededWriteResult(
  writeResult
) {

  if (
    isPreconditionBlockedWriteResult(
      writeResult
    )
  ) return false;

  return writeResult?.state === 'stale' ||
    writeResult?.state === 'superseded-after-write' ||
    writeResult?.skipped === true;
}


function isPreconditionBlockedWriteResult(
  writeResult
) {

  return Boolean(
    writeResult?.blocked === true &&
    writeResult?.preconditionBlocked === true
  );
}


function createPreconditionBlockedWriteResult({
  page,
  type,
  reason,
  writeRevision,
  precondition
}) {

  const conflict =
    precondition?.status === 'mismatch';

  const blockReason =
    conflict
      ? 'page-state-conflict'
      : (
        precondition?.failureKind ||
        'page-state-precondition-unavailable'
      );

  return {
    key:
      getPageWriteKey(
        page
      ),
    revision:
      writeRevision?.revision ?? null,
    state:
      conflict
        ? 'conflict'
        : 'precondition-blocked',
    written:
      false,
    skipped:
      true,
    current:
      true,
    blocked:
      true,
    preconditionBlocked:
      true,
    conflict,
    blockReason,
    operationKind:
      type || null,
    reason:
      reason || null,
    precondition,
    conflictEvidence:
      createPageWriteConflictEvidence({
        page,
        type,
        reason,
        precondition,
        blockReason,
        conflict
      })
  };
}


function createPageWriteConflictEvidence({
  page,
  type,
  reason,
  precondition,
  blockReason,
  conflict
}) {

  return {
    kind:
      conflict
        ? 'page-write-conflict'
        : 'page-write-precondition-block',
    pageId:
      page?.id ||
      precondition?.currentBase?.pageId ||
      precondition?.expectedBase?.pageId ||
      null,
    operationKind:
      type || null,
    reason:
      reason || null,
    blockReason:
      blockReason || null,
    expectedBase:
      precondition?.expectedBase || null,
    currentBase:
      precondition?.currentBase || null,
    preconditionStatus:
      precondition?.status || null
  };
}


function getPreconditionBlockedRevisionState(
  precondition
) {

  return precondition?.status === 'mismatch'
    ? 'conflict'
    : 'precondition-blocked';
}


function getPreconditionBlockedMessage(
  precondition
) {

  if (precondition?.status === 'mismatch') {

    return 'Page write precondition conflict.';
  }

  return precondition?.error ||
    'Page write precondition could not be verified.';
}


async function createStructuredPageChangePreservation({
  page,
  content,
  beforePage,
  precondition,
  structuredMutation
} = {}) {

  if (precondition?.status !== 'mismatch') {

    return createStructuredPreservationResult({
      ok:
        false,
      reason:
        'precondition-not-mismatch'
    });
  }

  const mutation =
    normalizeStructuredMutation(
      structuredMutation
    );

  if (!mutation.ok) {

    return createStructuredPreservationResult({
      ok:
        false,
      reason:
        mutation.reason,
      fields:
        mutation.fields
    });
  }

  if (!beforePage) {

    return createStructuredPreservationResult({
      ok:
        false,
      reason:
        'missing-base-page-snapshot',
      fields:
        mutation.fields
    });
  }

  const currentContent =
    await readCurrentDurablePageContent(
      page
    );

  const currentParsed =
    parsePageRecordContent(
      currentContent || '',
      {
        generateId:
          false
      }
    );

  const requestedParsed =
    parsePageRecordContent(
      content || '',
      {
        generateId:
          false
      }
    );

  if (
    !isSameStructuredPageRecordIdentity(
      currentParsed,
      beforePage,
      page
    ) ||
    !isSameStructuredPageRecordIdentity(
      requestedParsed,
      beforePage,
      page
    )
  ) {

    return createStructuredPreservationResult({
      ok:
        false,
      reason:
        'page-identity-changed',
      fields:
        mutation.fields
    });
  }

  for (const field of mutation.fields) {

    const currentValue =
      getStructuredPageRecordFieldValue(
        currentParsed,
        field
      );

    const expectedValue =
      getStructuredPageRecordFieldValue(
        beforePage,
        field
      );

    if (
      !areStructuredPageRecordFieldValuesEqual(
        field,
        currentValue,
        expectedValue
      )
    ) {

      return createStructuredPreservationResult({
        ok:
          false,
        reason:
          'owned-field-changed',
        fields:
          mutation.fields,
        conflictingField:
          field
      });
    }
  }

  const patch =
    {};

  mutation.fields.forEach(field => {

    patch[field] =
      cloneStructuredPageRecordFieldValue(
        getStructuredPageRecordFieldValue(
          requestedParsed,
          field
        )
      );
  });

  return createStructuredPreservationResult({
    ok:
      true,
    reason:
      'disjoint-structured-page-record-fields',
    fields:
      mutation.fields,
    content:
      updatePageRecordContent(
        currentContent || '',
        patch
      )
  });
}


function normalizeStructuredMutation(
  structuredMutation
) {

  if (!structuredMutation || typeof structuredMutation !== 'object') {

    return {
      ok:
        false,
      reason:
        'not-structured',
      fields:
        []
    };
  }

  const kind =
    structuredMutation.kind || 'page-record-fields';

  if (
    kind !== 'page-record-fields' &&
    kind !== 'page-record-metadata'
  ) {

    return {
      ok:
        false,
      reason:
        'unsupported-structured-kind',
      fields:
        []
    };
  }

  const fields =
    normalizeStructuredFields(
      structuredMutation.fields
    );

  if (fields.unsupported.length > 0) {

    return {
      ok:
        false,
      reason:
        'unsupported-structured-field',
      fields:
        fields.supported
    };
  }

  if (fields.supported.length === 0) {

    return {
      ok:
        false,
      reason:
        'missing-structured-fields',
      fields:
        []
    };
  }

  return {
    ok:
      true,
    reason:
      'supported',
    kind,
    fields:
      fields.supported
  };
}


function normalizeStructuredFields(
  fields
) {

  const supported =
    [];

  const unsupported =
    [];

  (Array.isArray(fields) ? fields : [])
    .map(field =>
      String(field || '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean)
    .forEach(field => {

      const normalized =
        SUPPORTED_STRUCTURED_PAGE_RECORD_FIELDS.get(
          field
        );

      if (!normalized) {

        unsupported.push(
          field
        );

        return;
      }

      if (!supported.includes(normalized)) {

        supported.push(
          normalized
        );
      }
    });

  return {
    supported,
    unsupported
  };
}


function createPreservedPreconditionResult({
  precondition,
  preservation
} = {}) {

  return {
    ...precondition,
    status:
      'mismatch-preserved',
    ok:
      true,
    preserved:
      true,
    preservation:
      omitStructuredPreservationContent(
        preservation
      )
  };
}


function createStructuredPreservationResult({
  ok,
  reason,
  fields = [],
  conflictingField = null,
  content = null
} = {}) {

  return {
    ok:
      Boolean(ok),
    preserved:
      Boolean(ok),
    reason:
      reason || null,
    fields:
      [
        ...fields
      ],
    conflictingField,
    content
  };
}


function omitStructuredPreservationContent(
  preservation
) {

  if (!preservation) return null;

  return {
    ok:
      Boolean(
        preservation.ok
      ),
    preserved:
      Boolean(
        preservation.preserved
      ),
    reason:
      preservation.reason || null,
    fields:
      Array.isArray(preservation.fields)
        ? [
          ...preservation.fields
        ]
        : [],
    conflictingField:
      preservation.conflictingField || null
  };
}


function getStructuredPageRecordFieldValue(
  record,
  field
) {

  if (!record) return null;

  if (field === 'aliases') {

    return Array.isArray(record.aliases)
      ? [
        ...record.aliases
      ]
      : [];
  }

  if (field === 'tags') {

    return Array.isArray(record.tags)
      ? [
        ...record.tags
      ]
      : [];
  }

  if (field === 'type') {

    return record.type || '';
  }

  return null;
}


function isSameStructuredPageRecordIdentity(
  record,
  beforePage,
  page
) {

  const recordId =
    String(record?.id || '').trim();

  const expectedId =
    String(beforePage?.id || page?.id || '').trim();

  return Boolean(
    recordId &&
    expectedId &&
    recordId === expectedId
  );
}


function cloneStructuredPageRecordFieldValue(
  value
) {

  return Array.isArray(value)
    ? [
      ...value
    ]
    : value;
}


function areStructuredPageRecordFieldValuesEqual(
  field,
  left,
  right
) {

  return stableStringify(
    normalizeStructuredPageRecordFieldValue(
      field,
      left
    )
  ) === stableStringify(
    normalizeStructuredPageRecordFieldValue(
      field,
      right
    )
  );
}


function normalizeStructuredPageRecordFieldValue(
  field,
  value
) {

  if (
    field === 'aliases' ||
    field === 'tags'
  ) {

    return normalizeStringList(
      Array.isArray(value)
        ? value
        : []
    );
  }

  if (field === 'type') {

    return String(value || '').trim();
  }

  return value ?? null;
}


function applyPageRecordContentToRuntimePage(
  page,
  content
) {

  const parsed =
    parsePageRecordContent(
      content || '',
      {
        generateId:
          false
      }
    );

  page.schemaVersion =
    parsed.schemaVersion;

  page.updatedAt =
    parsed.updatedAt;

  page.contentHash =
    parsed.contentHash;

  page.pageRecordStatus =
    parsed.pageRecordStatus;

  page.parent =
    parsed.parent;

  page.order =
    parsed.order;

  page.title =
    parsed.title;

  page.template =
    parsed.template;

  page.type =
    parsed.type;

  page.tags =
    Array.isArray(parsed.tags)
      ? [
        ...parsed.tags
      ]
      : [];

  page.aliases =
    Array.isArray(parsed.aliases)
      ? [
        ...parsed.aliases
      ]
      : [];

  page.relationships =
    clonePageRelationships(
      parsed.relationships
    );

  page.content =
    content;
}


function stableStringify(
  value
) {

  if (Array.isArray(value)) {

    return `[${value.map(item =>
      stableStringify(
        item
      )
    ).join(',')}]`;
  }

  if (value && typeof value === 'object') {

    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    ).join(',')}}`;
  }

  return JSON.stringify(
    value ?? null
  );
}


export function snapshotPageForCommand(
  page
) {

  if (!page) return null;

  return {
    id:
      page.id,
    path:
      page.path,
    parent:
      page.parent ?? null,
    order:
      page.order ?? 0,
    title:
      page.title || '',
    template:
      page.template || '',
    type:
      page.type || '',
    tags:
      Array.isArray(page.tags)
        ? [
          ...page.tags
        ]
        : [],
    aliases:
      Array.isArray(page.aliases)
        ? [
          ...page.aliases
        ]
        : [],
    relationships:
      clonePageRelationships(
        page.relationships
      ),
    pageStateIdentity:
      createPageWriteExpectedBase(
        page
      )
  };
}


function restorePageMetadata(
  page,
  snapshot
) {

  if (!page || !snapshot) return;

  page.parent =
    snapshot.parent ?? null;

  page.order =
    snapshot.order ?? 0;

  page.title =
    snapshot.title || '';

  page.template =
    snapshot.template || '';

  page.type =
    snapshot.type || '';

  page.tags =
    Array.isArray(snapshot.tags)
      ? [
        ...snapshot.tags
      ]
      : [];

  page.aliases =
    Array.isArray(snapshot.aliases)
      ? [
        ...snapshot.aliases
      ]
      : [];

  page.relationships =
    clonePageRelationships(
      snapshot.relationships
    );
}


function clonePageRelationships(
  relationships
) {

  return Array.isArray(relationships)
    ? relationships.map(relationship => ({
        ...relationship
      }))
    : [];
}


export function registerPageUndoEntry(
  entry = {}
) {

  if (
    typeof entry.undo !== 'function'
  ) {

    return null;
  }

  const undoEntry = {
    id:
      entry.id ||
      createPageCommandId(
        entry.type || 'page-undo'
      ),
    type:
      entry.type || 'page-undo',
    label:
      entry.label || entry.type || 'Undo page operation',
    createdAt:
      entry.createdAt ||
      new Date().toISOString(),
    affectedPages:
      normalizeStringList(
        entry.affectedPages
      ),
    source:
      entry.source || 'page-command-service',
    undo:
      entry.undo
  };

  pageUndoEntries.push(
    undoEntry
  );

  while (
    pageUndoEntries.length > MAX_PAGE_UNDO_ENTRIES
  ) {

    pageUndoEntries.shift();
  }

  return serializePageUndoEntry(
    undoEntry
  );
}


export async function undoLastPageCommand(
  options = {}
) {

  const type =
    options.type
      ? String(options.type)
      : '';

  const index =
    type
      ? pageUndoEntries.findLastIndex(entry =>
        entry.type === type
      )
      : pageUndoEntries.length - 1;

  if (index < 0) {

    return {
      undone:
        false,
      reason:
        'empty'
    };
  }

  const [
    entry
  ] =
    pageUndoEntries.splice(
      index,
      1
    );

  const result =
    await entry.undo(
      serializePageUndoEntry(
        entry
      )
    );

  return {
    undone:
      true,
    entry:
      serializePageUndoEntry(
        entry
      ),
    result
  };
}


export function getPageUndoEntries() {

  return pageUndoEntries.map(
    serializePageUndoEntry
  );
}


export function clearPageUndoEntries() {

  pageUndoEntries.length =
    0;
}


export function getPageCommandEvents() {

  return pageCommandEvents.map(event => ({
    ...event,
    phases:
      [
        ...event.phases
      ],
    affectedPages:
      [
        ...event.affectedPages
      ]
  }));
}


export function clearPageCommandEvents() {

  pageCommandEvents.length =
    0;
}


function registerRenameUndoEntry({
  type,
  page,
  beforePage,
  beforeContent
}) {

  if (
    type !== 'rename-page' ||
    !page?.id ||
    !beforePage ||
    typeof beforeContent !== 'string'
  ) {

    return null;
  }

  return registerPageUndoEntry({
    type:
      'undo-rename-page',
    label:
      `Undo rename: ${beforePage.title || page.title || page.id}`,
    affectedPages:
      [
        page.id
      ],
    async undo() {

      const currentPage =
        snapshotPageForCommand(
          page
        );

      restorePageMetadata(
        page,
        beforePage
      );

      await writePageContent(
        page,
        beforeContent
      );

      page.content =
        beforeContent;

      notifyPageUpdated(
        currentPage,
        page
      );

      return {
        restoredPages:
          1,
        type:
          'rename-page'
      };
    }
  });
}


function serializePageUndoEntry(
  entry
) {

  return {
    id:
      entry.id,
    type:
      entry.type,
    label:
      entry.label,
    createdAt:
      entry.createdAt,
    affectedPages:
      [
        ...entry.affectedPages
      ],
    source:
      entry.source
  };
}


function createPageCommandContext(
  command
) {

  return {
    id:
      command.id ||
      createPageCommandId(
        command.type
      ),
    type:
      command.type || 'page-command',
    startedAt:
      new Date().toISOString(),
    startedAtMs:
      Date.now(),
    affectedPages:
      normalizeStringList(
        command.affectedPages
      ),
    writeRevision:
      command.writeRevision || null,
    rollbackData:
      null,
    phaseResults:
      {},
    result:
      undefined
  };
}


function createPageCommandEvent(
  command,
  context
) {

  return {
    id:
      context.id,
    type:
      context.type,
    status:
      'running',
    startedAt:
      context.startedAt,
    completedAt:
      null,
    failedAt:
      null,
    durationMs:
      null,
    affectedPages:
      context.affectedPages,
    phases:
      [],
    source:
      command.source || 'page-command-service',
    writeRevision:
      context.writeRevision
        ? {
          ...context.writeRevision
        }
        : null,
    error:
      null
  };
}


function createPageCommandId(
  type = 'page-command'
) {

  const safeType =
    String(type || 'page-command')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    'page-command';

  const timestamp =
    new Date()
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-');

  const randomSuffix =
    crypto.randomUUID
      ? crypto.randomUUID().slice(
        0,
        8
      )
      : Math.random().toString(36).slice(
        2,
        10
      );

  return `${timestamp}-${safeType}-${randomSuffix}`;
}


function normalizeStringList(
  values
) {

  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map(value =>
          String(value || '').trim()
        )
        .filter(Boolean)
    )
  ];
}
