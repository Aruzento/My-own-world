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
  listRulePackageFiles,
  saveRulePackageFile
} from '../ruleTree/ruleTreePackageStorage.js';

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

  const assetReport =
    await createWorldPackageAssetImportReport({
      packageData:
        pkg,
      storageAdapter
    });

  if (!assetReport.ok) {

    throw new Error(
      'World Package import is blocked because required assets are missing.'
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

  const rulePackagePlan =
    await createWorldPackageRulePackageImportPlan({
      packageData:
        pkg,
      storageAdapter
    });

  const pagesToImport =
    importPlan.pagesToImport;

  const rulePackagesToImport =
    rulePackagePlan.rulePackagesToImport;

  const createdPages =
    [];

  const createdPaths =
    [];

  const createdRulePackagePaths =
    [];

  const previousPages =
    [
      ...state.pages
    ];

  return executePageCommand({
    type:
      'world-package-import',
    affectedPages:
      importPlan.entries
        .filter(entry =>
          entry.action !== 'skip'
        )
        .map(entry =>
          entry.finalId
        ),
    validate() {

      if (
        pagesToImport.length === 0 &&
        rulePackagesToImport.length === 0
      ) {

        throw new Error(
          'World Package has no pages or rule packages to import.'
        );
      }
    },
    createRollback() {

      return {
        previousPages,
        createdPaths: [
          ...createdPaths
        ],
        createdRulePackagePaths: [
          ...createdRulePackagePaths
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

      for (const entry of rulePackagesToImport) {

        const path =
          await saveRulePackageFile(
            storageAdapter,
            entry.finalId,
            entry.data
          );

        createdRulePackagePaths.push(
          path
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
        importedRulePackages:
          rulePackagesToImport.length,
        copiedRulePackages:
          rulePackagePlan.copiedRulePackages.length,
        validatedAssets:
          assetReport.available.length,
        missingOptionalAssets:
          assetReport.missingOptional.length,
        conflictStrategy:
          strategy,
        backupId:
          backupManifest.id,
        paths: [
          ...createdPaths
        ],
        rulePackagePaths: [
          ...createdRulePackagePaths
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

      for (const path of createdRulePackagePaths) {

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


export async function createWorldPackageAssetImportReport({
  packageData,
  storageAdapter = getStorageAdapter()
} = {}) {

  const pkg =
    normalizeWorldPackageData(
      packageData
    );

  const entries =
    [];

  for (const asset of pkg.contents.assets) {

    const availability =
      await checkAssetAvailability({
        storageAdapter,
        path:
          asset.path
      });

    entries.push({
      ...asset,
      available:
        availability.available,
      error:
        availability.error
    });
  }

  const available =
    entries.filter(asset =>
      asset.available
    );

  const missingRequired =
    entries.filter(asset =>
      !asset.available &&
      asset.required !== false
    );

  const missingOptional =
    entries.filter(asset =>
      !asset.available &&
      asset.required === false
    );

  return {
    ok:
      missingRequired.length === 0,
    total:
      entries.length,
    available,
    missingRequired,
    missingOptional,
    entries
  };
}


export async function createWorldPackageRulePackageImportPlan({
  packageData,
  storageAdapter = getStorageAdapter()
} = {}) {

  const pkg =
    normalizeWorldPackageData(
      packageData
    );

  const existingFiles =
    await listRulePackageFiles(
      storageAdapter
    );

  const usedIds =
    new Set(
      existingFiles
        .map(file =>
          file.id
        )
        .filter(Boolean)
    );

  const entries =
    [];

  for (const rulePackage of pkg.contents.rulePackages) {

    const sourceId =
      rulePackage.packageId;

    const finalId =
      createUniqueRulePackageId(
        sourceId,
        usedIds
      );

    usedIds.add(
      finalId
    );

    entries.push({
      sourceId,
      sourceTitle:
        rulePackage.title,
      finalId,
      action:
        finalId === sourceId
          ? 'import'
          : 'copy',
      data:
        rulePackage.data
    });
  }

  const copiedRulePackages =
    entries.filter(entry =>
      entry.action === 'copy'
    );

  return {
    packageId:
      pkg.packageId,
    rulePackagesToImport:
      entries,
    copiedRulePackages,
    counts: {
      rulePackages:
        entries.length,
      copied:
        copiedRulePackages.length
    }
  };
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


async function checkAssetAvailability({
  storageAdapter,
  path
}) {

  if (
    !storageAdapter ||
    typeof storageAdapter.readBinary !== 'function'
  ) {

    return {
      available:
        false,
      error:
        'Storage adapter cannot read binary assets.'
    };
  }

  try {

    await storageAdapter.readBinary(
      path
    );

    return {
      available:
        true,
      error:
        null
    };

  } catch (error) {

    return {
      available:
        false,
      error:
        String(
          error?.message || error || 'Asset is not readable.'
        )
    };
  }
}


function createUniqueRulePackageId(
  sourceId,
  usedIds
) {

  const base =
    createSafeWorldPackageId(
      sourceId || 'rules'
    );

  if (
    !usedIds.has(
      base
    )
  ) {

    return base;
  }

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
