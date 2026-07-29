import {
  buildPageRecordContent,
  createRuntimePageFromContent
} from '../core/pageRecord.js';

import {
  sanitizePersistentHTMLOnSave
} from '../editor/safeHtmlSanitizer.js';

import {
  notifyPageCreated
} from '../repository/pageRepository.js';

import {
  executePageCommand
} from '../storage/pageCommandService.js';

import {
  getStorageAdapter
} from '../storage/storageAdapter.js';

import {
  scheduleWorkspaceCheckpoint
} from '../storage/workspaceCheckpointTasks.js';

import {
  state
} from '../state.js';

import {
  setPages
} from '../stateActions.js';

import {
  createWorldPackageImportPreview,
  normalizeWorldPackageData
} from './worldPackageModel.js';


export async function applyWorldPackagePageImport({
  packageData,
  backupManifest,
  existingPages = state.pages,
  storageAdapter = getStorageAdapter(),
  sanitizeBody = getDefaultImportBodySanitizer()
} = {}) {

  if (!backupManifest?.id) {

    throw new Error(
      'World Package import requires a completed backup manifest.'
    );
  }

  const pkg =
    normalizeWorldPackageData(
      packageData
    );

  const preview =
    createWorldPackageImportPreview({
      packageData:
        pkg,
      existingPages
    });

  if (!preview.ok) {

    throw new Error(
      'World Package import preview has validation errors.'
    );
  }

  if (preview.counts.conflicts > 0) {

    throw new Error(
      'World Package import is blocked until page conflicts are resolved.'
    );
  }

  if (
    preview.counts.assets > 0 ||
    preview.counts.rulePackages > 0
  ) {

    throw new Error(
      'World Package import can apply page-only packages in this UI slice.'
    );
  }

  const pagesToImport =
    pkg.contents.pages;

  const createdPages =
    [];

  const createdPaths =
    [];

  const previousPages =
    [
      ...state.pages
    ];

  const pageIds =
    new Set(
      pagesToImport
        .map(page => page.id)
        .filter(Boolean)
    );

  const existingIds =
    new Set(
      existingPages
        .map(page => page?.id)
        .filter(Boolean)
    );

  return executePageCommand({
    type:
      'world-package-import-pages',
    affectedPages:
      pagesToImport.map(page => page.id),
    validate() {

      if (pagesToImport.length === 0) {

        throw new Error(
          'World Package has no pages to import.'
        );
      }
    },
    createRollback() {

      return {
        previousPages,
        createdPaths: [
          ...createdPaths
        ]
      };
    },
    async persist() {

      await storageAdapter.ensureDirectory(
        'pages'
      );

      for (const page of pagesToImport) {

        const path =
          createImportedPagePath();

        const parent =
          page.parent &&
          (
            pageIds.has(page.parent) ||
            existingIds.has(page.parent)
          )
            ? page.parent
            : null;

        const content =
          buildPageRecordContent({
            id:
              page.id,
            parent,
            order:
              page.order,
            tags:
              page.tags,
            template:
              page.template,
            type:
              page.type,
            aliases:
              page.aliases,
            body:
              page.body,
            sanitizeBody
          });

        await storageAdapter.writeText(
          path,
          content
        );

        const name =
          path.split('/').pop();

        const runtimePage =
          createRuntimePageFromContent({
            content,
            name,
            path:
              `/${path}`
          });

        createdPaths.push(
          path
        );

        createdPages.push(
          runtimePage
        );
      }
    },
    updateIndexes() {

      setPages([
        ...state.pages,
        ...createdPages
      ]);

      createdPages.forEach(page =>
        notifyPageCreated(
          page
        )
      );
    },
    publishEvent(context) {

      scheduleWorkspaceCheckpoint({
        reason:
          'after-world-package-import'
      });

      context.result = {
        packageId:
          pkg.packageId,
        importedPages:
          createdPages.length,
        backupId:
          backupManifest.id,
        paths: [
          ...createdPaths
        ]
      };
    },
    async rollback(
      error,
      context
    ) {

      setPages(
        context.rollbackData?.previousPages || previousPages
      );

      for (const path of createdPaths) {

        try {

          await storageAdapter.removeFile(
            path
          );

        } catch {
          // Best-effort cleanup after a failed bulk import.
        }
      }
    },
    getResult(context) {

      return context.result;
    }
  });
}


function createImportedPagePath() {

  return `pages/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.md`;
}


function getDefaultImportBodySanitizer() {

  if (globalThis.document?.createElement) {

    return sanitizePersistentHTMLOnSave;
  }

  return body => String(body || '');
}
