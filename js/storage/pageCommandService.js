import {
  notifyPageUpdated
} from '../repository/pageRepository.js';

import {
  createWriteRevision,
  getPageWriteKey,
  markWriteRevisionState,
  writePageContent
} from './writeQueue.js';


const pageCommandEvents =
  [];

const pageUndoEntries =
  [];

const MAX_PAGE_UNDO_ENTRIES =
  30;

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
  reason = type
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
    async persist() {

      const writeResult =
        await writePageContent(
        page,
        content,
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

      if (
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
            true,
          written:
            Boolean(writeResult.written)
        };

        return;
      }

      page.content =
        content;

      notifyPageUpdated(
        beforePage,
        page
      );
    },
    publishEvent(context) {

      const writeResult =
        context.phaseResults.persist;

      if (
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
        written:
          Boolean(
            writeResult?.written
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
          snapshotPageForCommand(
            page
          ),
          context.rollbackData.beforePage
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

  return writeResult?.state === 'stale' ||
    writeResult?.state === 'superseded-after-write' ||
    writeResult?.skipped === true;
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
        : []
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
