import {
  updatePageRecordContent
} from '../core/pageRecord.js';

import {
  notifyPageUpdated
} from '../repository/pageRepository.js';

import {
  executePageCommand,
  snapshotPageForCommand
} from '../storage/pageCommandService.js';

import {
  createPageWritePreconditionBlockedResult,
  evaluatePageWritePrecondition,
  getPageWritePreconditionMessage,
  getPageWritePreconditionRevisionState,
  shouldBlockPageWriteForPrecondition
} from '../storage/pageWritePreconditions.js';

import {
  createWriteRevision,
  getPageWriteKey,
  markWriteRevisionState,
  writePageContent
} from '../storage/writeQueue.js';


export async function persistKnowledgeGraphRelationshipsCommand({
  page,
  relationships,
  reason = 'knowledge-graph-relationships',
  expectedBase = undefined
} = {}) {

  const beforePage =
    snapshotPageForCommand(
      page
    );

  const beforeContent =
    page?.content;

  const nextRelationships =
    Array.isArray(relationships)
      ? relationships.map(relationship => ({
          ...relationship
        }))
      : [];

  const content =
    updatePageRecordContent(
      page?.content || '',
      {
        relationships:
          nextRelationships
      }
    );

  const writeRevision =
    createWriteRevision(
      getPageWriteKey(
        page
      ),
      {
        pageId:
          page?.id || null,
        type:
          'update-knowledge-graph-relationships',
        reason
      }
    );

  return executePageCommand({
    type:
      'update-knowledge-graph-relationships',
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
          'Knowledge graph relationship command requires a page id.'
        );
      }

      if (typeof page.content !== 'string') {

        throw new Error(
          'Knowledge graph relationship command requires page content.'
        );
      }
    },
    createRollback() {

      return {
        beforePage,
        beforeContent
      };
    },
    async persist(context) {

      context.phaseResults.precondition =
        await evaluatePageWritePrecondition({
          page,
          expectedBase:
            expectedBase
        });

      if (
        shouldBlockPageWriteForPrecondition(
          context.phaseResults.precondition
        )
      ) {

        markWriteRevisionState(
          writeRevision,
          getPageWritePreconditionRevisionState(
            context.phaseResults.precondition
          ),
          {
            error:
              getPageWritePreconditionMessage(
                context.phaseResults.precondition
              )
          }
        );

        return createPreconditionBlockedRelationshipResult({
          page,
          reason,
          writeRevision,
          precondition:
            context.phaseResults.precondition
        });
      }

      return writePageContent(
        page,
        content,
        {
          revision:
            writeRevision
        }
      );
    },
    updateIndexes(context) {

      const writeResult =
        context.phaseResults.persist;

      if (
        isPreconditionBlockedWriteResult(
          writeResult
        )
      ) {

        context.result =
          createRelationshipCommandResult({
            page,
            reason,
            writeResult,
            precondition:
              context.phaseResults.precondition
          });

        return;
      }

      if (
        isSupersededWriteResult(
          writeResult
        )
      ) {

        context.result =
          createRelationshipCommandResult({
            page,
            reason,
            writeResult,
            precondition:
              context.phaseResults.precondition
          });

        return;
      }

      page.relationships =
        cloneRelationships(
          nextRelationships
        );

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

      context.result =
        context.result ||
        createRelationshipCommandResult({
          page,
          reason,
          writeResult,
          precondition:
            context.phaseResults.precondition
        });
    },
    rollback(
      error,
      context
    ) {

      const failedPage =
        snapshotPageForCommand(
          page
        );

      page.content =
        context.rollbackData?.beforeContent || beforeContent || '';

      page.relationships =
        cloneRelationships(
          context.rollbackData?.beforePage?.relationships ||
            beforePage?.relationships ||
            []
        );

      markWriteRevisionState(
        writeRevision,
        'error',
        {
          error:
            error?.message || error
        }
      );

      notifyPageUpdated(
        failedPage,
        page
      );
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


function createPreconditionBlockedRelationshipResult({
  page,
  reason,
  writeRevision,
  precondition
}) {

  return createPageWritePreconditionBlockedResult({
    writeKey:
      getPageWriteKey(
        page
      ),
    writeRevision,
    pageId:
      page?.id || null,
    operationKind:
      'update-knowledge-graph-relationships',
    reason,
    precondition
  });
}


function createRelationshipCommandResult({
  page,
  reason,
  writeResult,
  precondition = null
}) {

  return {
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
      writeResult?.conflictEvidence || null
  };
}


function cloneRelationships(
  relationships
) {

  return Array.isArray(relationships)
    ? relationships.map(relationship => ({
        ...relationship
      }))
    : [];
}
