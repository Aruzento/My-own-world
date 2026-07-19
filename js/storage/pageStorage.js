import {
  state
} from '../state.js';

import {
  setPages
} from '../stateActions.js';

import {
  parseMarkdown
} from '../core/markdown.js';

import {
  buildPageRecordContent,
  createRuntimePageFromContent,
  updatePageRecordContent
} from '../core/pageRecord.js';

import {
  templates
} from '../templates/templates.js';

import {
  writePageContent
} from './writeQueue.js';

import {
  executePageCommand,
  registerPageUndoEntry
} from './pageCommandService.js';

import {
  requireWorkspaceBackupBeforeRiskyOperation
} from './backupService.js';

import {
  beginWorkspaceOperation,
  commitWorkspaceOperation,
  failWorkspaceOperation
} from './operationJournal.js';

import {
  measureWorkspaceOperation
} from '../performance/workspacePerformance.js';

import {
  enqueueBackgroundCheckpoint
} from '../performance/backgroundCheckpointQueue.js';

import {
  getStorageAdapter,
  requestWorkspaceWritePermission
} from './storageAdapter.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';

import {
  notifyPageCreated,
  notifyPageDeleted,
  notifyPageMoved,
  notifyPageUpdated
} from '../repository/pageRepository.js';

import {
  scheduleWorkspaceCheckpoint
} from './workspaceCheckpointTasks.js';

import {
  createOrderCompactionPlan,
  getOrderCompactionNeed
} from '../tree/treeOrderCompaction.js';


const PAGE_TRASH_ROOT =
  '.my-own-world-trash/page-deletes';


export async function createPage(
  templateKey,
  parentId = null,
  initialTitle = ''
) {

  const template =
    templates[templateKey];

  const pageId =
    crypto.randomUUID();

  const templateContent =
    applyInitialTitle(
      template.content,
      initialTitle
    );

  const content =
    buildPageContent({
      id:
        pageId,
      parent:
        parentId,
      tags:
        template.tags,
      template:
        template.template || templateKey,
      type:
        template.type || 'note',
      aliases:
        [],
      body:
        templateContent
    });

  return writePageFile(
    content
  );
}


export async function createFolderPage(
  title,
  parentId
) {

  const template =
    templates.card;

  const content =
    buildPageContent({
      id: crypto.randomUUID(),
      parent: parentId,
      tags: ['card', 'folder'],
      template: 'card',
      type: 'folder',
      aliases: [],
      body: applyInitialTitle(
        template.content,
        title
      )
    });

  return writePageFile(
    content
  );
}


export async function duplicatePageAsChild(
  sourcePage,
  parentId,
  initialTitle = ''
) {

  const parsed =
    parseMarkdown(
      sourcePage.content
    );

  const body =
    initialTitle
      ? applyInitialTitle(
        parsed.body,
        initialTitle
      )
      : parsed.body;

  const content =
    buildPageContent({
      id: crypto.randomUUID(),
      parent: parentId,
      tags: parsed.tags,
      template: parsed.template || 'card',
      type: parsed.type || 'note',
      aliases: parsed.aliases || [],
      relationships:
        parsed.relationships || [],
      body
    });

  return writePageFile(
    content
  );
}


export async function duplicatePageAtSameLevel(
  sourcePage,
  title
) {

  return duplicatePageAsChild(
    sourcePage,
    sourcePage.parent,
    title
  );
}


async function writePageFile(
  content
) {

  const storageAdapter =
    getReadyStorageAdapter();

  await storageAdapter.ensureDirectory(
    'pages'
  );

  const fileName =
    `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.md`;

  const path =
    `/pages/${fileName}`;

  const page =
    createPageRecord({
      name: fileName,
      path,
      content
    });

  let journalEntry =
    null;

  const previousPages =
    [
      ...state.pages
    ];

  return executePageCommand({
    type:
      'create-page',
    affectedPages:
      [
        page.id
      ],
    validate() {

      if (!page.id) {

        throw new Error(
          'Create page command requires a page id.'
        );
      }
    },
    createRollback() {

      return {
        previousPages,
        createdPath:
          path,
        page:
          createPageJournalSnapshot(
            page
          )
      };
    },
    async apply() {

      journalEntry =
        await beginWorkspaceOperation({
          type:
            'create-page',
          affectedPages:
            [
              page.id
            ],
          before:
            {},
          after: {
            [page.id]:
              createPageJournalSnapshot(
                page
              )
          }
        });
    },
    async persist() {

      await storageAdapter.writeText(
        path,
        content
      );
    },
    updateIndexes() {

      setPages(
        [
          ...state.pages,
          page
        ]
      );

      notifyPageCreated(
        page
      );
    },
    async publishEvent(context) {

      await commitWorkspaceOperation(
        journalEntry
      );

      scheduleWorkspaceCheckpoint({
        reason:
          'after-create-page'
      });

      context.result =
        page;
    },
    async rollback(
      error,
      context
    ) {

      setPages(
        context.rollbackData?.previousPages || previousPages
      );

      if (journalEntry) {

        await failWorkspaceOperation(
          journalEntry,
          error
        );
      }

      try {

        await storageAdapter.removeFile(
          path
        );

      } catch (removeError) {

        if (!isMissingFileDeleteError(removeError)) {

          console.warn(
            'Could not remove partially created page after command failure.',
            removeError
          );
        }
      }
    },
    getResult(context) {

      return context.result;
    }
  });
}


function buildPageContent({
  id,
  parent,
  order = Date.now(),
  tags,
  template,
  type,
  aliases,
  relationships = [],
  body,
  frontMatter = null,
  invalidFrontMatter = {}
}) {

  return buildPageRecordContent({
    id,
    parent,
    order,
    tags,
    template,
    type,
    aliases,
    relationships,
    body,
    frontMatter,
    invalidFrontMatter
  });
}


// Удаляет страницу и все дочерние страницы.
export async function deletePageBranch(
  page,
  options = {}
) {

  const livePage =
    getLivePage(
      page
    ) || page;

  const pagesToDelete =
    livePage?.id
      ? collectPageBranch(
        livePage
      )
      : [];

  return measureWorkspaceOperation(
    'tree.deleteBranch',
    () => executePageCommand({
      type:
        'delete-page-branch',
      affectedPages:
        pagesToDelete.map(targetPage =>
          targetPage.id
        ),
      validate() {

        if (!livePage?.id) {

          throw new Error(
            'Delete page command requires a page id.'
          );
        }
      },
      createRollback() {

        return {
          pages:
            pagesToDelete.map(targetPage =>
              createPageJournalSnapshot(
                targetPage
              )
            )
        };
      },
      async apply(context) {

        context.result =
          await deletePageBranchMeasured(
            livePage,
            options
          );
      },
      getResult(context) {

        return context.result;
      }
    }),
    {
      counts: result => ({
        pages:
          result?.deletedPages || 0,
        failed:
          result?.failedPages || 0
      })
    }
  );
}


async function deletePageBranchMeasured(
  page,
  options = {}
) {

  const livePage =
    getLivePage(
      page
    ) || page;

  if (!livePage?.id) return;

  const pagesToDelete =
    collectPageBranch(
      livePage
    );

  await ensureWorkspaceCanWrite();

  const trashEntry =
    await createPageTrashEntry(
      pagesToDelete,
      {
        type:
          'delete-page-branch'
      }
    );

  const deletedPages =
    [];

  const failedPages =
    [];

  const deleteStartedAt =
    Date.now();

  for (
    let index = 0;
    index < pagesToDelete.length;
    index += 1
  ) {

    const targetPage =
      pagesToDelete[index];

    try {

      await deletePageFile(
        targetPage
      );

      deletedPages.push(
        targetPage
      );

      options.onProgress?.({
        label: 'Удаление',
        stage: 'страницы',
        current: index + 1,
        total: pagesToDelete.length,
        elapsedMs:
          Date.now() - deleteStartedAt
      });

    } catch (error) {

      failedPages.push({
        page: targetPage,
        error
      });

      console.error(
        `Не удалось удалить ${targetPage.name}`,
        error
      );
    }
  }

  const deletedPageIds =
    new Set(
      deletedPages.map(
        deletedPage => deletedPage.id
      )
    );

  if (failedPages.length > 0) {

    await restorePageTrashManifest(
      trashEntry,
      {
        pageIds:
          deletedPageIds,
        overwriteExisting:
          true,
        updateState:
          false,
        scheduleCheckpoint:
          false
      }
    );

    throw new Error(
      `Could not delete page files: ${failedPages.length}`
    );
  }

  setPages(
    state.pages.filter(
      existingPage =>
        !deletedPageIds.has(
          existingPage.id
        )
    )
  );

  notifyPageDeleted(
    deletedPages
  );

  scheduleWorkspaceCheckpoint({
    reason: 'after-delete-page-branch'
  });

  if (failedPages.length > 0) {

    throw new Error(
      `Не удалось удалить файлов: ${failedPages.length}`
    );
  }

  registerPageUndoEntry({
    type:
      'undo-delete-page-branch',
    label:
      `Restore deleted branch: ${livePage.title || livePage.id}`,
    affectedPages:
      pagesToDelete.map(targetPage =>
        targetPage.id
      ),
    undo:
      async () =>
        restorePageTrashEntry(
          trashEntry.trashId
        )
  });

  return {
    deletedPages:
      deletedPages.length,
    failedPages:
      failedPages.length,
    trashId:
      trashEntry.trashId
  };
}


async function createPageTrashEntry(
  pages,
  options = {}
) {

  const storageAdapter =
    getReadyStorageAdapter();

  const trashId =
    createPageTrashId(
      options.type
    );

  const trashRoot =
    `${PAGE_TRASH_ROOT}/${trashId}`;

  const trashPagesRoot =
    `${trashRoot}/pages`;

  await storageAdapter.ensureDirectory(
    trashPagesRoot
  );

  const trashPages =
    [];

  for (
    let index = 0;
    index < pages.length;
    index += 1
  ) {

    const page =
      pages[index];

    const originalPath =
      getPageStoragePath(
        page
      );

    const content =
      await readPageContentForTrash(
        storageAdapter,
        page,
        originalPath
      );

    const trashPath =
      `${trashPagesRoot}/${createTrashPageFileName(
        index,
        page
      )}`;

    await storageAdapter.writeText(
      trashPath,
      content
    );

    trashPages.push({
      ...createPageJournalSnapshot(
        page
      ),
      name:
        page.name || getFileNameFromPath(
          originalPath
        ),
      originalPath:
        ensureDisplayPath(
          originalPath
        ),
      trashPath:
        normalizeWorkspacePath(
          trashPath
        )
    });
  }

  const manifest = {
    schemaVersion:
      1,
    trashId,
    type:
      options.type || 'page-delete',
    createdAt:
      new Date().toISOString(),
    pageCount:
      trashPages.length,
    pages:
      trashPages
  };

  await storageAdapter.writeText(
    `${trashRoot}/manifest.json`,
    JSON.stringify(
      manifest,
      null,
      2
    )
  );

  return manifest;
}


export async function restorePageTrashEntry(
  trashId,
  options = {}
) {

  const manifest =
    await readPageTrashManifest(
      trashId
    );

  return restorePageTrashManifest(
    manifest,
    options
  );
}


async function readPageTrashManifest(
  trashId
) {

  const safeTrashId =
    normalizeTrashId(
      trashId
    );

  if (!safeTrashId) {

    throw new Error(
      'Page trash id is required.'
    );
  }

  const storageAdapter =
    getReadyStorageAdapter();

  return JSON.parse(
    await storageAdapter.readText(
      `${PAGE_TRASH_ROOT}/${safeTrashId}/manifest.json`
    )
  );
}


async function restorePageTrashManifest(
  manifest,
  options = {}
) {

  const storageAdapter =
    getReadyStorageAdapter();

  const pageIds =
    options.pageIds instanceof Set
      ? options.pageIds
      : null;

  const manifestPages =
    Array.isArray(manifest?.pages)
      ? manifest.pages
      : [];

  const pagesToRestore =
    pageIds
      ? manifestPages.filter(page =>
        pageIds.has(
          page.id
        )
      )
      : manifestPages;

  if (!options.overwriteExisting) {

    assertTrashRestoreTargetsAreFree(
      pagesToRestore
    );
  }

  const restoredPages =
    [];

  for (const pageInfo of pagesToRestore) {

    const originalPath =
      pageInfo.originalPath || pageInfo.path;

    const content =
      await storageAdapter.readText(
        pageInfo.trashPath
      );

    if (!options.overwriteExisting) {

      await assertRestorePathIsFree(
        storageAdapter,
        originalPath
      );
    }

    await storageAdapter.writeText(
      originalPath,
      content
    );

    restoredPages.push(
      createPageRecord({
        name:
          pageInfo.name || getFileNameFromPath(
            originalPath
          ),
        path:
          ensureDisplayPath(
            originalPath
          ),
        content
      })
    );
  }

  if (options.updateState !== false) {

    setPages([
      ...state.pages,
      ...restoredPages
    ]);
  }

  if (options.scheduleCheckpoint !== false) {

    scheduleWorkspaceCheckpoint({
      reason:
        'after-page-trash-restore'
    });
  }

  return {
    trashId:
      manifest.trashId || null,
    restoredPages:
      restoredPages.length
  };
}


function assertTrashRestoreTargetsAreFree(
  pagesToRestore
) {

  const existingIds =
    new Set(
      state.pages.map(page =>
        page.id
      )
    );

  const conflictingPage =
    pagesToRestore.find(page =>
      page.id &&
      existingIds.has(
        page.id
      )
    );

  if (conflictingPage) {

    throw new Error(
      `Cannot restore page ${conflictingPage.id}: page already exists.`
    );
  }
}


async function assertRestorePathIsFree(
  storageAdapter,
  path
) {

  try {

    await storageAdapter.readText(
      path
    );

  } catch (error) {

    if (isMissingFileDeleteError(error)) {

      return;
    }

    throw error;
  }

  throw new Error(
    `Cannot restore page file ${path}: file already exists.`
  );
}


async function readPageContentForTrash(
  storageAdapter,
  page,
  path
) {

  try {

    return await storageAdapter.readText(
      path
    );

  } catch (error) {

    if (
      isMissingFileDeleteError(error) &&
      typeof page.content === 'string'
    ) {

      return page.content;
    }

    throw error;
  }
}


function createPageTrashId(
  type = 'page-delete'
) {

  const safeType =
    String(type || 'page-delete')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    'page-delete';

  const timestamp =
    new Date()
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-');

  const suffix =
    crypto.randomUUID
      ? crypto.randomUUID().slice(
        0,
        8
      )
      : Math.random().toString(36).slice(
        2,
        10
      );

  return `${timestamp}-${safeType}-${suffix}`;
}


function createTrashPageFileName(
  index,
  page
) {

  const id =
    String(page?.id || page?.name || `page-${index}`)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    `page-${index}`;

  return `${String(index).padStart(4, '0')}-${id}.md`;
}


function normalizeTrashId(
  trashId
) {

  return String(trashId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, '');
}


function getPageStoragePath(
  page
) {

  const path =
    page?.path ||
    (
      page?.name
        ? `/pages/${page.name}`
        : ''
    );

  if (!path) {

    throw new Error(
      'Page path is required for trash.'
    );
  }

  return ensureDisplayPath(
    path
  );
}


function ensureDisplayPath(
  path
) {

  const normalized =
    normalizeWorkspacePath(
      path
    );

  return normalized
    ? `/${normalized}`
    : '';
}


function getFileNameFromPath(
  path
) {

  return normalizeWorkspacePath(
    path
  )
    .split('/')
    .filter(Boolean)
    .pop() ||
    'page.md';
}


async function ensureWorkspaceCanWrite() {

  const storageAdapter =
    getReadyStorageAdapter();

  const canWrite =
    await requestWorkspaceWritePermission(
      storageAdapter
    );

  if (!canWrite) {

    throw new Error(
      'Workspace не выбран или нет прав на запись'
    );
  }
}


async function deletePageFile(
  targetPage
) {

  const storageAdapter =
    getReadyStorageAdapter();

  if (targetPage.path) {

    try {

      await storageAdapter.removeFile(
        targetPage.path
      );

    } catch (error) {

      if (
        isMissingFileDeleteError(
          error
        )
      ) {

        console.warn(
          'Page file was already missing during delete.',
          targetPage.path
        );

        return;
      }

      throw error;
    }

    return;
  }

  if (!targetPage.handle) {

    throw new Error(
      'У страницы нет file handle'
    );
  }

  const parentDir =
    targetPage.parentDirHandle ||
    await storageAdapter.getDirectoryHandle(
      'pages'
    );

  await parentDir.removeEntry(
    targetPage.name
  );
}


function isMissingFileDeleteError(
  error
) {

  const name =
    String(error?.name || '');

  const code =
    String(error?.code || '');

  const message =
    String(error?.message || error || '')
      .toLowerCase();

  return name === 'NotFoundError' ||
    code === 'ENOENT' ||
    code === 'desktop.file_not_found' ||
    message.includes('missing ') ||
    message.includes('\u0444\u0430\u0439\u043b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d') ||
    message.includes('not found') ||
    message.includes('cannot find') ||
    message.includes('no such file');
}


function collectPageBranch(
  rootPage
) {

  const childrenByParent =
    new Map();

  state.pages.forEach(page => {

    if (!page?.parent) return;

    if (!childrenByParent.has(page.parent)) {

      childrenByParent.set(
        page.parent,
        []
      );
    }

    childrenByParent.get(page.parent).push(
      page
    );
  });

  const result = [
    rootPage
  ];

  for (
    let index = 0;
    index < result.length;
    index += 1
  ) {

    const currentPage =
      result[index];

    const children =
      childrenByParent.get(
        currentPage.id
      ) || [];

    result.push(
      ...children
    );
  }

  return result;
}

function getLivePage(
  page
) {

  if (!page?.id) return null;

  return state.pages.find(candidate =>
    candidate.id === page.id
  ) || null;
}

export async function updatePageParent(
  page,
  parentId
) {

  const livePage =
    getLivePage(
      page
    ) || page;

  const previousPage =
    snapshotPageForIndex(
      livePage
    );

  const previousContent =
    livePage.content;

  let journalEntry =
    null;

  return executePageCommand({
    type:
      'move-page-parent',
    affectedPages:
      [
        livePage.id
      ],
    validate() {

      if (!livePage?.id) {

        throw new Error(
          'Move parent command requires a page id.'
        );
      }
    },
    createRollback() {

      return {
        before:
          createPageJournalSnapshot(
            previousPage
          ),
        previousContent
      };
    },
    async apply() {

      journalEntry =
        await beginWorkspaceOperation(
          createTreeOperationJournalData(
            [
              {
                livePage,
                previousPage,
                parentId,
                order:
                  livePage.order
              }
            ],
            'move-page-parent'
          )
        );
    },
    async persist() {

      livePage.parent =
        parentId;

      const updatedContent =
        updatePageRecordContent(
          livePage.content,
          {
            parent:
              parentId
          }
        );

      await writePageContent(
        livePage,
        updatedContent
      );

      livePage.content =
        updatedContent;
    },
    updateIndexes() {

      notifyPageMoved(
        previousPage,
        livePage
      );
    },
    async publishEvent() {

      await commitWorkspaceOperation(
        journalEntry
      );

      scheduleWorkspaceCheckpoint({
        reason:
          'after-move-page-parent'
      });

      scheduleTreeOrderCompaction({
        parentId,
        reason:
          'after-move-page-parent'
      });

      registerTreeMoveUndoEntry(
        [
          {
            livePage,
            previousPage,
            parentId,
            order:
              livePage.order
          }
        ],
        'undo-page-move'
      );
    },
    async rollback(error) {

      livePage.parent =
        previousPage.parent;

      livePage.content =
        previousContent;

      if (journalEntry) {

        await failWorkspaceOperation(
          journalEntry,
          error
        );
      }
    }
  });
}


export async function updatePageTreePosition(
  page,
  parentId,
  order
) {

  const change =
    preparePageTreePositionChange({
      page,
      parentId,
      order
    });

  if (!change) return;

  return executePageCommand({
    type:
      'move-page-tree-position',
    affectedPages:
      [
        change.livePage.id
      ],
    validate() {

      if (!change.livePage?.id) {

        throw new Error(
          'Move page command requires a page id.'
        );
      }
    },
    createRollback() {

      return {
        before:
          createPageJournalSnapshot(
            change.previousPage
          ),
        after:
          createPageJournalSnapshot({
            ...change.livePage,
            parent:
              change.parentId,
            order:
              change.order
          })
      };
    },
      async apply(context) {

        await applyPageTreePositionChanges(
          [
            change
        ],
        {
          reason:
            'after-tree-position-update'
        }
      );

      registerTreeMoveUndoEntry(
        [
          change
        ],
        'undo-page-move'
      );

      context.result = {
        changedPages:
          1
      };
    },
    getResult(context) {

      return context.result;
    }
  });
}


export async function updatePageTreePositions(
  updates = [],
  options = {}
) {

  return measureWorkspaceOperation(
    'tree.moveBatch',
    () => executePageCommand({
      type:
        'move-page-tree-position-batch',
      affectedPages:
        updates
          .map(update =>
            update?.page?.id
          )
          .filter(Boolean),
      validate() {

        if (!Array.isArray(updates)) {

          throw new Error(
            'Batch move command requires an updates array.'
          );
        }
      },
      createRollback() {

        return {
          before:
            updates
              .map(update =>
                getLivePage(update?.page) || update?.page
              )
              .filter(Boolean)
              .map(targetPage =>
                createPageJournalSnapshot(
                  targetPage
                )
              )
        };
      },
      async apply(context) {

        context.result =
          await updatePageTreePositionsMeasured(
            updates,
            options
          );
      },
      getResult(context) {

        return context.result;
      }
    }),
    {
      counts: result => ({
        changedPages:
          result?.changedPages || 0
      })
    }
  );
}


async function updatePageTreePositionsMeasured(
  updates = [],
  options = {}
) {

  const changes =
    updates
      .map(update =>
        preparePageTreePositionChange(
          update
        )
      )
      .filter(Boolean);

  if (changes.length === 0) return;

  const moveStartedAt =
    Date.now();

  if (
    shouldBackupTreePositionChanges(
      changes
    )
  ) {

    await requireWorkspaceBackupBeforeRiskyOperation(
      'move-page-tree-position',
      {
        onProgress:
          options.onProgress
      }
    );
  }

  const journalEntry =
    shouldJournalTreePositionChanges(
      changes
    )
      ? await beginWorkspaceOperation(
        createTreeOperationJournalData(
          changes,
          'move-page-tree-position'
        )
      )
      : null;

  try {

  for (
    let index = 0;
    index < changes.length;
    index += 1
  ) {

    const change =
      changes[index];

    await applyPageTreePositionChange(
      change
    );

    options.onProgress?.({
      label: 'Перенос',
      stage: 'страницы',
      current: index + 1,
      total: changes.length,
      elapsedMs:
        Date.now() - moveStartedAt
    });
  }

  } catch (error) {

    rollbackPageTreePositionChanges(
      changes
    );

    if (journalEntry) {

      await failWorkspaceOperation(
        journalEntry,
        error
      );
    }

    throw error;
  }

  if (journalEntry) {

    await commitWorkspaceOperation(
      journalEntry
    );
  }

  if (!options.skipUndo) {

    registerTreeMoveUndoEntry(
      changes,
      'undo-page-move-batch'
    );
  }

  const checkpointReason =
    shouldJournalTreePositionChanges(
      changes
    )
      ? 'after-tree-parent-move'
      : 'after-tree-reorder';

  if (!options.skipCheckpoint) {

    scheduleWorkspaceCheckpoint({
      reason:
        checkpointReason
    });

    scheduleTreeOrderCompactionForChanges(
      changes,
      checkpointReason
    );
  }

  return {
    changedPages:
      changes.length
  };
}


function shouldBackupTreePositionChanges(
  changes
) {

  return changes.length > 1 &&
    changes.some(change =>
      change.previousPage?.parent !== change.parentId
    );
}


function shouldJournalTreePositionChanges(
  changes
) {

  return changes.some(change =>
    change.previousPage?.parent !== change.parentId
  );
}


async function applyPageTreePositionChanges(
  changes,
  options = {}
) {

  const journalEntry =
    shouldJournalTreePositionChanges(
      changes
    )
      ? await beginWorkspaceOperation(
        createTreeOperationJournalData(
          changes,
          'move-page-tree-position'
        )
      )
      : null;

  try {

    for (const change of changes) {

      await applyPageTreePositionChange(
        change
      );
    }

  } catch (error) {

    rollbackPageTreePositionChanges(
      changes
    );

    if (journalEntry) {

      await failWorkspaceOperation(
        journalEntry,
        error
      );
    }

    throw error;
  }

  if (journalEntry) {

    await commitWorkspaceOperation(
      journalEntry
    );
  }

  const checkpointReason =
    options.reason ||
    (
      shouldJournalTreePositionChanges(
        changes
      )
        ? 'after-tree-parent-move'
        : 'after-tree-reorder'
    );

  if (!options.skipCheckpoint) {

    scheduleWorkspaceCheckpoint({
      reason:
        checkpointReason
    });

    scheduleTreeOrderCompactionForChanges(
      changes,
      checkpointReason
    );
  }
}


export function scheduleTreeOrderCompaction({
  parentId = null,
  reason = 'after-tree-reorder'
} = {}) {

  const need =
    getOrderCompactionNeed(
      state.pages,
      parentId
    );

  if (!need.needed) {

    return {
      scheduled:
        false,
      ...need
    };
  }

  const workspaceId =
    getWorkspaceIdForBackgroundJob();

  const job =
    enqueueBackgroundCheckpoint({
      type:
        `tree.order-compaction:${need.parentId ?? 'root'}`,
      workspaceId,
      reason,
      payload: {
        parentId:
          need.parentId
      },
      run:
        async ({ payload }) =>
          compactTreeOrderForParent(
            payload.parentId,
            {
              skipCheckpoint:
                true
            }
          )
    });

  return {
    scheduled:
      true,
    ...need,
    job
  };
}


export async function compactTreeOrderForParent(
  parentId = null,
  options = {}
) {

  const plan =
    createOrderCompactionPlan(
      state.pages,
      parentId
    );

  if (plan.length === 0) {

    return {
      needed:
        false,
      changedPages:
        0,
      parentId:
        parentId ?? null
    };
  }

  await updatePageTreePositions(
    plan,
    {
      ...options,
      skipCheckpoint:
        true
    }
  );

  if (!options.skipCheckpoint) {

    scheduleWorkspaceCheckpoint({
      reason:
        'after-tree-order-compaction'
    });
  }

  return {
    needed:
      true,
    changedPages:
      plan.length,
    parentId:
      parentId ?? null
  };
}


function scheduleTreeOrderCompactionForChanges(
  changes,
  reason
) {

  const parentIds =
    new Set();

  changes.forEach(change => {

    parentIds.add(
      change.parentId ?? null
    );
  });

  parentIds.forEach(parentId => {

    scheduleTreeOrderCompaction({
      parentId,
      reason
    });
  });
}


function registerTreeMoveUndoEntry(
  changes,
  type
) {

  const rollbackTargets =
    changes
      .map(change => ({
        id:
          change.livePage?.id,
        parent:
          change.previousPage?.parent ?? null,
        order:
          change.previousPage?.order ?? 0
      }))
      .filter(target =>
        target.id
      );

  if (rollbackTargets.length === 0) return;

  registerPageUndoEntry({
    type,
    label:
      rollbackTargets.length === 1
        ? 'Undo page move'
        : `Undo page move: ${rollbackTargets.length} pages`,
    affectedPages:
      rollbackTargets.map(target =>
        target.id
      ),
    undo:
      async () =>
        undoTreePositionChanges(
          rollbackTargets
        )
  });
}


async function undoTreePositionChanges(
  rollbackTargets
) {

  const changes =
    rollbackTargets
      .map(target => {

        const livePage =
          getLivePage({
            id:
              target.id
          });

        if (!livePage) return null;

        return {
          livePage,
          previousPage:
            snapshotPageForIndex(
              livePage
            ),
          previousContent:
            livePage.content,
          parentId:
            target.parent,
          order:
            target.order
        };
      })
      .filter(Boolean);

  if (changes.length === 0) {

    return {
      changedPages:
        0
    };
  }

  await applyPageTreePositionChanges(
    changes,
    {
      reason:
        'after-page-move-undo'
    }
  );

  return {
    changedPages:
      changes.length
  };
}


function getWorkspaceIdForBackgroundJob() {

  const storageAdapter =
    getStorageAdapter();

  return String(
    storageAdapter.getWorkspaceRoot?.() ||
    storageAdapter.getWorkspaceHandle?.()?.name ||
    storageAdapter.kind ||
    'current-workspace'
  );
}


function preparePageTreePositionChange({
  page,
  parentId,
  order
}) {

  const livePage =
    getLivePage(
      page
    ) || page;

  if (!livePage?.id) return null;

  const previousPage =
    snapshotPageForIndex(
      livePage
    );

  return {
    livePage,
    previousPage,
    previousContent:
      livePage.content,
    parentId,
    order
  };
}


async function applyPageTreePositionChange({
  livePage,
  previousPage,
  parentId,
  order
}) {

  livePage.parent =
    parentId;

  livePage.order =
    order;

  const updatedContent =
    updatePageRecordContent(
      livePage.content,
      {
        parent:
          parentId,
        order
      }
    );

  await writePageContent(
    livePage,
    updatedContent
  );

  livePage.content =
    updatedContent;

  notifyPageMoved(
    previousPage,
    livePage
  );
}


function rollbackPageTreePositionChanges(
  changes
) {

  changes.forEach(change => {

    const rollbackFrom =
      snapshotPageForIndex(
        change.livePage
      );

    change.livePage.parent =
      change.previousPage.parent;

    change.livePage.order =
      change.previousPage.order;

    if (
      typeof change.previousContent === 'string'
    ) {

      change.livePage.content =
        change.previousContent;
    }

    notifyPageMoved(
      rollbackFrom,
      change.livePage
    );
  });
}


function createTreeOperationJournalData(
  changes,
  type
) {

  const before =
    {};

  const after =
    {};

  changes.forEach(change => {

    const pageId =
      change.livePage.id;

    before[pageId] =
      createPageJournalSnapshot(
        change.previousPage
      );

    after[pageId] =
      createPageJournalSnapshot({
        ...change.livePage,
        parent:
          change.parentId,
        order:
          change.order
      });
  });

  return {
    type,
    affectedPages:
      changes.map(change =>
        change.livePage.id
      ),
    before,
    after
  };
}


function createPageJournalSnapshot(
  page
) {

  return {
    id:
      page?.id || null,
    path:
      page?.path || null,
    parent:
      page?.parent ?? null,
    order:
      page?.order ?? 0,
    title:
      page?.title || '',
    template:
      page?.template || '',
    type:
      page?.type || ''
  };
}


export async function updatePageAliases(
  page,
  aliases
) {

  const previousPage =
    snapshotPageForIndex(
      page
    );

  const previousContent =
    page.content;

  return executePageCommand({
    type:
      'update-page-aliases',
    affectedPages:
      page?.id
        ? [
          page.id
        ]
        : [],
    validate() {

      if (!page?.id) {

        throw new Error(
          'Update aliases command requires a page id.'
        );
      }
    },
    createRollback() {

      return {
        before:
          createPageJournalSnapshot(
            previousPage
          ),
        previousContent
      };
    },
    async persist() {

      const nextAliases =
        Array.isArray(aliases)
          ? aliases
          : [];

      page.aliases =
        nextAliases;

      const updatedContent =
        updatePageRecordContent(
          page.content,
          {
            aliases:
              nextAliases
          }
        );

      await writePageContent(
        page,
        updatedContent
      );

      page.content =
        updatedContent;
    },
    updateIndexes() {

      notifyPageUpdated(
        previousPage,
        page
      );
    },
    rollback() {

      page.aliases =
        previousPage.aliases || [];

      page.content =
        previousContent;
    }
  });
}


function snapshotPageForIndex(
  page
) {

  if (!page) return null;

  return {
    id: page.id,
    path: page.path,
    parent: page.parent,
    order: page.order,
    title: page.title,
    template: page.template,
    type: page.type,
    tags: Array.isArray(page.tags)
      ? [...page.tags]
      : [],
    aliases: Array.isArray(page.aliases)
      ? [...page.aliases]
      : []
  };
}


export async function scanDirectory(
  dirHandle,
  path = ''
) {

  for await (const entry of dirHandle.values()) {

    const currentPath =
      `${path}/${entry.name}`;

    if (entry.kind === 'directory') {

      await scanDirectory(
        entry,
        currentPath
      );

      continue;
    }

    if (!entry.name.endsWith('.md')) {

      continue;
    }

    const file =
      await entry.getFile();

    const content =
      await file.text();

    state.pages.push(
      createPageRecord({
        name: entry.name,
        path: currentPath,
        handle: entry,
        parentDirHandle: dirHandle,
        content
      })
    );
  }
}


export async function scanWorkspacePagesByAdapter(
  storageAdapter
) {

  await scanAdapterDirectory(
    storageAdapter,
    'pages',
    '/pages'
  );
}


async function scanAdapterDirectory(
  storageAdapter,
  adapterPath,
  displayPath
) {

  const entries =
    await storageAdapter.listFiles(
      adapterPath
    );

  for (const entry of entries) {

    const currentAdapterPath =
      `${adapterPath}/${entry.name}`;

    const currentDisplayPath =
      `${displayPath}/${entry.name}`;

    if (entry.kind === 'directory') {

      await scanAdapterDirectory(
        storageAdapter,
        currentAdapterPath,
        currentDisplayPath
      );

      continue;
    }

    if (!entry.name.endsWith('.md')) {

      continue;
    }

    const content =
      await storageAdapter.readText(
        currentAdapterPath
      );

    state.pages.push(
      createPageRecord({
        name: entry.name,
        path: currentDisplayPath,
        content
      })
    );
  }
}


function createPageRecord({
  name,
  path,
  handle = null,
  parentDirHandle = null,
  content
}) {

  return createRuntimePageFromContent({
    content,
    name,
    path,
    handle,
    parentDirHandle
  });
}


function getReadyStorageAdapter() {

  return getStorageAdapter();
}


function applyInitialTitle(
  html,
  title
) {

  if (!title) return html;

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    html;

  const heading =
    wrapper.querySelector('h1');

  if (!heading) return html;

  heading.textContent =
    title;

  return wrapper.innerHTML;
}
