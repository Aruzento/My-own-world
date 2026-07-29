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
  createSafeWorldPackageId,
  normalizeWorldPackageData
} from './worldPackageModel.js';

import {
  normalizePageTitle
} from '../validation/pageTitleValidation.js';


const WORLD_PACKAGE_CONFLICT_STRATEGIES =
  new Set([
    'block',
    'skip',
    'copy'
  ]);


export async function applyWorldPackagePageImport({
  packageData,
  backupManifest,
  existingPages = state.pages,
  storageAdapter = getStorageAdapter(),
  sanitizeBody = getDefaultImportBodySanitizer(),
  conflictStrategy = 'block'
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

  const strategy =
    normalizeImportConflictStrategy(
      conflictStrategy
    );

  if (
    strategy === 'block' &&
    preview.counts.conflicts > 0
  ) {

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

  const importPlan =
    createWorldPackagePageImportPlan({
      packageData:
        pkg,
      existingPages,
      preview,
      conflictStrategy:
        strategy
    });

  const pagesToImport =
    importPlan.pagesToImport;

  const createdPages =
    [];

  const createdPaths =
    [];

  const previousPages =
    [
      ...state.pages
    ];

  return executePageCommand({
    type:
      'world-package-import-pages',
    affectedPages:
      importPlan.entries
        .filter(entry =>
          entry.action !== 'skip'
        )
        .map(entry =>
          entry.finalId
        ),
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

      for (const entry of pagesToImport) {

        const path =
          createImportedPagePath();

        const page =
          entry.page;

        const body =
          entry.titleChanged
            ? updateImportedPageTitleInBody(
              page.body,
              entry.finalTitle
            )
            : page.body;

        const content =
          buildPageRecordContent({
            id:
              entry.finalId,
            parent:
              entry.finalParent,
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
              body,
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
        skippedPages:
          importPlan.skippedPages.length,
        copiedPages:
          importPlan.copiedPages.length,
        renamedPages:
          importPlan.renamedPages.length,
        conflictStrategy:
          strategy,
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


export function createWorldPackagePageImportPlan({
  packageData,
  existingPages = state.pages,
  preview = null,
  conflictStrategy = 'block'
} = {}) {

  const pkg =
    normalizeWorldPackageData(
      packageData
    );

  const previewData =
    preview ||
    createWorldPackageImportPreview({
      packageData:
        pkg,
      existingPages
    });

  const strategy =
    normalizeImportConflictStrategy(
      conflictStrategy
    );

  const conflictsById =
    new Map(
      previewData.conflicts.pages.map(conflict => [
        conflict.pageId,
        conflict
      ])
    );

  const existingIds =
    new Set(
      existingPages
        .map(page => page?.id)
        .filter(Boolean)
    );

  const usedIds =
    new Set(
      existingIds
    );

  const usedTitles =
    new Set();

  for (const page of existingPages) {

    const title =
      normalizePageTitle(
        page?.title
      );

    if (title) {

      usedTitles.add(
        title
      );
    }
  }

  const idMap =
    new Map();

  const entries =
    [];

  for (const page of pkg.contents.pages) {

    const conflict =
      conflictsById.get(
        page.id
      ) || null;

    if (
      conflict &&
      strategy === 'skip'
    ) {

      entries.push({
        page,
        sourceId:
          page.id,
        sourceTitle:
          page.title,
        finalId:
          null,
        finalTitle:
          page.title,
        finalParent:
          null,
        action:
          'skip',
        reason:
          conflict.reason,
        existingPageId:
          conflict.existingPageId || null,
        titleChanged:
          false
      });

      continue;
    }

    const shouldCopy =
      Boolean(conflict) &&
      strategy === 'copy';

    const finalId =
      shouldCopy
        ? createUniqueImportedPageId(
          page.id,
          usedIds
        )
        : page.id;

    const finalTitle =
      shouldCopy
        ? createUniqueImportedPageTitle(
          page.title,
          usedTitles
        )
        : page.title;

    usedIds.add(
      finalId
    );

    const normalizedTitle =
      normalizePageTitle(
        finalTitle
      );

    if (normalizedTitle) {

      usedTitles.add(
        normalizedTitle
      );
    }

    idMap.set(
      page.id,
      finalId
    );

    entries.push({
      page,
      sourceId:
        page.id,
      sourceTitle:
        page.title,
      finalId,
      finalTitle,
      finalParent:
        null,
      action:
        shouldCopy
          ? 'copy'
          : 'import',
      reason:
        conflict?.reason || null,
      existingPageId:
        conflict?.existingPageId || null,
      titleChanged:
        finalTitle !== page.title
    });
  }

  for (const entry of entries) {

    if (entry.action === 'skip') continue;

    const sourceParent =
      entry.page.parent;

    const mappedParent =
      sourceParent
        ? idMap.get(
          sourceParent
        )
        : null;

    entry.finalParent =
      mappedParent ||
      (
        existingIds.has(
          sourceParent
        )
          ? sourceParent
          : null
      );
  }

  const pagesToImport =
    entries.filter(entry =>
      entry.action !== 'skip'
    );

  const skippedPages =
    entries.filter(entry =>
      entry.action === 'skip'
    );

  const copiedPages =
    entries.filter(entry =>
      entry.action === 'copy'
    );

  const renamedPages =
    entries.filter(entry =>
      entry.titleChanged
    );

  return {
    packageId:
      pkg.packageId,
    conflictStrategy:
      strategy,
    pagesToImport,
    skippedPages,
    copiedPages,
    renamedPages,
    entries,
    counts: {
      pages:
        pkg.contents.pages.length,
      pagesToImport:
        pagesToImport.length,
      skipped:
        skippedPages.length,
      copied:
        copiedPages.length,
      renamed:
        renamedPages.length
    }
  };
}


function createImportedPagePath() {

  return `pages/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.md`;
}


function normalizeImportConflictStrategy(
  value
) {

  const strategy =
    String(value || 'block').trim();

  return WORLD_PACKAGE_CONFLICT_STRATEGIES.has(
    strategy
  )
    ? strategy
    : 'block';
}


function createUniqueImportedPageId(
  sourceId,
  usedIds
) {

  const base =
    createSafeWorldPackageId(
      sourceId || 'imported-page'
    );

  let index =
    1;

  let candidate =
    `${base}-import`;

  while (
    usedIds.has(
      candidate
    )
  ) {

    index += 1;

    candidate =
      `${base}-import-${index}`;
  }

  return candidate;
}


function createUniqueImportedPageTitle(
  sourceTitle,
  usedTitles
) {

  const base =
    String(sourceTitle || 'Imported page').trim() ||
    'Imported page';

  if (
    !usedTitles.has(
      normalizePageTitle(
        base
      )
    )
  ) {

    return base;
  }

  let index =
    1;

  let candidate =
    `${base} (import)`;

  while (
    usedTitles.has(
      normalizePageTitle(
        candidate
      )
    )
  ) {

    index += 1;

    candidate =
      `${base} (import ${index})`;
  }

  return candidate;
}


function updateImportedPageTitleInBody(
  body,
  title
) {

  const safeTitle =
    escapeHtml(
      title
    );

  const source =
    String(body || '');

  if (/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(source)) {

    return source.replace(
      /<h1\b([^>]*)>[\s\S]*?<\/h1>/i,
      `<h1$1>${safeTitle}</h1>`
    );
  }

  return `<h1>${safeTitle}</h1>\n${source}`;
}


function escapeHtml(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}


function getDefaultImportBodySanitizer() {

  if (globalThis.document?.createElement) {

    return sanitizePersistentHTMLOnSave;
  }

  return body => String(body || '');
}
