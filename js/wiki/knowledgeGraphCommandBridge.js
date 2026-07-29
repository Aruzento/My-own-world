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
  createWriteRevision,
  getPageWriteKey,
  markWriteRevisionState,
  writePageContent
} from '../storage/writeQueue.js';


export async function persistKnowledgeGraphRelationshipsCommand({
  page,
  relationships,
  reason = 'knowledge-graph-relationships'
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
    apply() {

      page.relationships =
        cloneRelationships(
          nextRelationships
        );

      page.content =
        content;
    },
    async persist() {

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

      notifyPageUpdated(
        beforePage,
        page
      );
    },
    publishEvent(context) {

      const writeResult =
        context.phaseResults.persist;

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

  return writeResult?.state === 'stale' ||
    writeResult?.state === 'superseded-after-write' ||
    writeResult?.skipped === true;
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
