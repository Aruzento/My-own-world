import {
  buildPageRecordContent,
  createRuntimePageFromContent
} from '../core/pageRecord.js';
import { portablePageContent } from '../core/portablePageRecord.js';
import { rewriteTypedPage } from '../variables/typedPageTraversal.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog, activateCardTypeDefinitions } from '../storage/cardTypeCatalogStorage.js';
import { CardTypeRegistry } from '../cardTypes/cardTypeRegistry.js';
import { consumeCreatedBackupVerification } from '../storage/backupService.js';

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
  getStorageAdapter, captureStorageWorkspaceContext, assertStorageWorkspaceContext
} from '../storage/storageAdapter.js';

import {
  collectAssetReferencesFromPages, rewriteBodyAssetPaths
} from '../storage/assetReferenceScanner.js';

import {
  normalizeWorkspacePath
} from '../storage/storageAdapterContract.js';

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
  normalizeBase64PayloadBytes,
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

  const workspace = storageAdapter === getStorageAdapter() && (storageAdapter.getWorkspaceRoot?.() || storageAdapter.getWorkspaceHandle?.())
    ? captureStorageWorkspaceContext() : null;
  const guard = () => { if (workspace) assertStorageWorkspaceContext(workspace); };

  if (!backupManifest?.id) {

    throw new Error(
      'World Package import requires a completed backup manifest.'
    );
  }

  const pkg =
    normalizeWorldPackageData(
      packageData
    );

  if (pkg.contents.pages.some(page => page.variablesJson)) {
    const protection = await consumeCreatedBackupVerification(backupManifest, { storageAdapter });
    if (protection.manifest.version !== 2) throw new Error('Structured package import requires verified definition-aware backup');
  }

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

  const assetPlan =
    await createWorldPackageAssetImportPlan({
      packageData:
        pkg,
      storageAdapter
    });

  const pagesToImport =
    importPlan.pagesToImport;

  const currentCatalog = await readCardTypeCatalog({ storageAdapter });
  const definitions = pkg.contents.cardTypes || { types: [], fieldSets: [] };
  // Collision and all remaps are preflighted before the first asset/page write.
  const registry = new CardTypeRegistry({ bundledTypes: [], bundledFieldSets: [],
    activatedTypes: currentCatalog.catalog.types, activatedFieldSets: currentCatalog.catalog.fieldSets,
    candidateTypes: definitions.types, candidateFieldSets: definitions.fieldSets });
  const pageIds = new Map(importPlan.entries.filter(entry => entry.action !== 'skip').map(entry => [entry.sourceId, entry.finalId]));
  for (const entry of pagesToImport) if (pkg.version === 2) {
    const body = rewriteImportedPageAssetPaths(entry.page.body, assetPlan.pathMap);
    const relationships = (entry.page.relationships || []).map(relation => ({ ...relation,
      ...(pageIds.has(relation.targetId) ? { targetId: pageIds.get(relation.targetId) } : {}) }));
    const content = portablePageContent(entry.page, { id: entry.finalId, parent: entry.finalParent, relationships,
      body: sanitizeBody(entry.titleChanged ? updateImportedPageTitleInBody(body, entry.finalTitle) : body) },
      { newIdentity: entry.finalId !== entry.sourceId });
    entry.structuredContent = rewriteTypedPage({ content }, registry, { pageIds, assetPaths: assetPlan.pathMap });
  }

  const rulePackagesToImport =
    rulePackagePlan.rulePackagesToImport;

  const assetsToImport =
    assetPlan.assetsToImport;

  const createdPages =
    [];

  const createdPaths =
    [];

  const createdAssetPaths =
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
        rulePackagesToImport.length === 0 &&
        assetsToImport.length === 0
      ) {

        throw new Error(
          'World Package has no pages, rule packages or assets to import.'
        );
      }
    },
    createRollback() {

      return {
        previousPages,
        createdPaths: [
          ...createdPaths
        ],
        createdAssetPaths: [
          ...createdAssetPaths
        ],
        createdRulePackagePaths: [
          ...createdRulePackagePaths
        ]
      };
    },
    async persist() {

      guard();
      if (JSON.stringify((await readCardTypeCatalog({ storageAdapter })).identity) !== JSON.stringify(currentCatalog.identity)) throw new Error('Package catalog changed after preflight');

      if (pkg.version === 2 && (definitions.types.length || definitions.fieldSets.length)) await activateCardTypeDefinitions({
        ...definitions, expectedIdentity: currentCatalog.identity, storageAdapter, bundledTypes: [], bundledFieldSets: [] });

      for (const entry of assetsToImport) {

        guard();

        const parentPath =
          getParentPath(
            entry.storagePath
          );

        if (parentPath) {

          await storageAdapter.ensureDirectory(
            parentPath
          );
        }

        guard();
        createdAssetPaths.push(entry.storagePath);
        const expectedBytes = new Uint8Array(decodeAssetPayloadToArrayBuffer(entry.payload));
        await storageAdapter.writeBinary(
          entry.storagePath,
          expectedBytes.buffer
        );
        guard();
        const bytes = new Uint8Array(await storageAdapter.readBinary(entry.storagePath));
        if (bytes.length !== expectedBytes.length || bytes.some((byte, index) => byte !== expectedBytes[index])) throw new Error('Package asset durable readback mismatch');
      }

      if (pagesToImport.length > 0) {

        await storageAdapter.ensureDirectory(
          'pages'
        );
      }

      for (const entry of pagesToImport) {

        guard();

        const path =
          createImportedPagePath();

        const page =
          entry.page;

        const rewrittenBody =
          rewriteImportedPageAssetPaths(
            page.body,
            assetPlan.pathMap
          );

        const body =
          entry.titleChanged
            ? updateImportedPageTitleInBody(
              rewrittenBody,
              entry.finalTitle
            )
            : rewrittenBody;

        const content =
          entry.structuredContent || buildPageRecordContent({
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

        createdPaths.push(path);
        await storageAdapter.writeText(
          path,
          content
        );
        guard();
        if (await storageAdapter.readText(path) !== content) throw new Error('Package page durable readback mismatch');

        const name =
          path.split('/').pop();

        const runtimePage =
          createRuntimePageFromContent({
            content,
            name,
            path:
              `/${path}`
          });

        createdPages.push(
          runtimePage
        );
      }

      for (const entry of rulePackagesToImport) {

        guard();

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

      guard();

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
        importedAssets:
          assetsToImport.length,
        copiedAssets:
          assetPlan.copiedAssets.length,
        reusedAssets:
          assetPlan.reusedAssets.length,
        rewrittenAssetReferences:
          assetPlan.rewrittenAssets.length,
        missingOptionalAssets:
          assetReport.missingOptional.length,
        conflictStrategy:
          strategy,
        backupId:
          backupManifest.id,
        paths: [
          ...createdPaths
        ],
        assetPaths: [
          ...createdAssetPaths
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

      if (!workspace || storageAdapter === getStorageAdapter()) setPages(context.rollbackData?.previousPages || previousPages);
      const incomplete = [];

      for (const path of createdPaths) {

        try {

          await storageAdapter.removeFile(
            path
          );

        } catch {
          incomplete.push(path);
        }
      }

      for (const path of createdAssetPaths) {

        try {

          await storageAdapter.removeFile(
            path
          );

        } catch {
          incomplete.push(path);
        }
      }

      for (const path of createdRulePackagePaths) {

        try {

          await storageAdapter.removeFile(
            path
          );

        } catch {
          incomplete.push(path);
        }
      }
      if (incomplete.length) { error.incompleteImport = { backupId: backupManifest.id, paths: incomplete }; }
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

    const payload =
      validateAssetPayload(
        asset.payload
      );

    const payloadAvailable =
      Boolean(availability.storagePath) &&
      payload.available;

    entries.push({
      ...asset,
      available:
        availability.available ||
        payloadAvailable,
      workspaceAvailable:
        availability.available,
      payloadAvailable:
        payloadAvailable,
      storagePath:
        availability.storagePath,
      error:
        availability.error,
      payloadError:
        availability.storagePath
          ? payload.error
          : availability.error
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
    payloadAssets:
      entries.filter(asset =>
        asset.payloadAvailable
      ),
    workspaceAssets:
      entries.filter(asset =>
        asset.workspaceAvailable
      ),
    missingRequired,
    missingOptional,
    entries
  };
}


export async function createWorldPackageAssetPayloadExportReport({
  pages = [],
  storageAdapter = getStorageAdapter(), registry = null
} = {}) {

  if (!registry) registry = createCardTypeRegistryFromCatalog((await readCardTypeCatalog({ storageAdapter })).catalog,
    { bundledTypes: [], bundledFieldSets: [] });
  const collected = collectAssetReferencesFromPages(pages, { registry });
  if (collected.some(reference => reference.incomplete)) throw new Error('Package export blocked: incomplete typed asset closure');

  const references =
    dedupeAssetReferences(
      collected
    );

  const assets =
    [];

  const embedded =
    [];

  const missing =
    [];

  for (const reference of references) {

    const asset =
      {
        path:
          reference.path,
        type:
          reference.type,
        owner:
          reference.owner,
        required:
          true,
        payload:
          null
      };

    try {

      const storagePath =
        getAssetStoragePath(
          reference.path
        );

      const buffer =
        await storageAdapter.readBinary(
          storagePath
        );

      asset.payload =
        {
          encoding:
            'base64',
          mediaType:
            inferMimeType(
              storagePath
            ),
          bytes:
            arrayBufferToBase64(
              buffer
            )
        };

      embedded.push(
        asset
      );

    } catch (error) {

      missing.push({
        path:
          reference.path,
        type:
          reference.type,
        error:
          String(
            error?.message || error || 'Asset is not readable.'
          )
      });
    }

    assets.push(
      asset
    );
  }

  return {
    total:
      references.length,
    embedded,
    missing,
    assets
  };
}


export async function createWorldPackageAssetImportPlan({
  packageData,
  storageAdapter = getStorageAdapter()
} = {}) {

  const pkg =
    normalizeWorldPackageData(
      packageData
    );

  const usedStoragePaths =
    new Set();

  const entries =
    [];

  const pathMap =
    new Map();

  for (const asset of pkg.contents.assets) {

    const availability =
      await checkAssetAvailability({
        storageAdapter,
        path:
          asset.path
      });

    const payload =
      validateAssetPayload(
        asset.payload
      );

    const payloadAvailable =
      Boolean(availability.storagePath) &&
      payload.available;

    if (payloadAvailable) {

      const finalPath =
        availability.available
          ? await createUniqueAssetReferencePath({
            sourcePath:
              asset.path,
            usedStoragePaths,
            storageAdapter
          })
          : asset.path;

      const storagePath =
        getAssetStoragePath(
          finalPath
        );

      usedStoragePaths.add(
        storagePath
      );

      if (finalPath !== asset.path) {

        pathMap.set(
          asset.path,
          finalPath
        );
      }

      entries.push({
        ...asset,
        action:
          'copy',
        sourcePath:
          asset.path,
        finalPath,
        storagePath,
        conflict:
          availability.available,
        payload:
          asset.payload
      });

      continue;
    }

    if (availability.available) {

      entries.push({
        ...asset,
        action:
          'reuse',
        sourcePath:
          asset.path,
        finalPath:
          asset.path,
        storagePath:
          availability.storagePath,
        conflict:
          false,
        payload:
          null
      });

      continue;
    }

    entries.push({
      ...asset,
      action:
        asset.required === false
          ? 'missingOptional'
          : 'missingRequired',
      sourcePath:
        asset.path,
      finalPath:
        asset.path,
      storagePath:
        availability.storagePath,
      conflict:
        false,
      payload:
        null,
      error:
        payload.error ||
        availability.error
    });
  }

  const assetsToImport =
    entries.filter(entry =>
      entry.action === 'copy'
    );

  const copiedAssets =
    assetsToImport.filter(entry =>
      entry.conflict
    );

  const reusedAssets =
    entries.filter(entry =>
      entry.action === 'reuse'
    );

  const rewrittenAssets =
    [...pathMap.entries()]
      .map(([sourcePath, finalPath]) => ({
        sourcePath,
        finalPath
      }));

  return {
    packageId:
      pkg.packageId,
    assetsToImport,
    copiedAssets,
    reusedAssets,
    missingRequired:
      entries.filter(entry =>
        entry.action === 'missingRequired'
      ),
    missingOptional:
      entries.filter(entry =>
        entry.action === 'missingOptional'
      ),
    rewrittenAssets,
    pathMap,
    entries,
    counts: {
      assets:
        entries.length,
      assetsToImport:
        assetsToImport.length,
      copied:
        copiedAssets.length,
      reused:
        reusedAssets.length
    }
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

  let storagePath =
    '';

  try {

    storagePath =
      getAssetStoragePath(
        path
      );

  } catch (error) {

    return {
      available:
        false,
      storagePath:
        '',
      error:
        String(
          error?.message || error || 'Asset path is not safe.'
        )
    };
  }

  if (
    !storageAdapter ||
    typeof storageAdapter.readBinary !== 'function'
  ) {

    return {
      available:
        false,
      storagePath,
      error:
        'Storage adapter cannot read binary assets.'
    };
  }

  try {

    await storageAdapter.readBinary(
      storagePath
    );

    return {
      available:
        true,
      storagePath,
      error:
        null
    };

  } catch (error) {

    return {
      available:
        false,
      storagePath,
      error:
        String(
          error?.message || error || 'Asset is not readable.'
        )
    };
  }
}


function getAssetStoragePath(
  path
) {

  const normalized =
    normalizeSafeAssetReferencePath(
      path
    );

  const assetRelativePath =
    normalized.replace(
      /^assets\//,
      ''
    );

  if (!assetRelativePath) {

    throw new Error(
      'Asset path is empty.'
    );
  }

  return `assets/${assetRelativePath}`;
}


function normalizeSafeAssetReferencePath(
  path
) {

  const normalized =
    normalizeWorkspacePath(
      path
    );

  const parts =
    normalized.split('/');

  if (
    !normalized ||
    normalized.startsWith('.') ||
    normalized.includes(':') ||
    parts.some(part =>
      part === '..' ||
      part === '.'
    )
  ) {

    throw new Error(
      'Asset path must be a safe workspace-relative path.'
    );
  }

  return normalized;
}


async function createUniqueAssetReferencePath({
  sourcePath,
  usedStoragePaths,
  storageAdapter
}) {

  const normalized =
    normalizeSafeAssetReferencePath(
      sourcePath || 'asset'
    );

  const keepsAssetPrefix =
    normalized.startsWith(
      'assets/'
    );

  const assetRelativePath =
    normalized.replace(
      /^assets\//,
      ''
    );

  const parts =
    assetRelativePath.split('/');

  const filename =
    parts.pop() ||
    'asset';

  const directory =
    parts.join('/');

  const {
    base,
    extension
  } =
    splitFilename(
      filename
    );

  let index =
    1;

  let candidateRelative =
    joinPath(
      directory,
      `${base}-import${extension}`
    );

  while (
    usedStoragePaths.has(
      `assets/${candidateRelative}`
    ) ||
    (
      await assetExistsAtStoragePath({
        storageAdapter,
        storagePath:
          `assets/${candidateRelative}`
      })
    )
  ) {

    index += 1;

    candidateRelative =
      joinPath(
        directory,
        `${base}-import-${index}${extension}`
      );
  }

  return keepsAssetPrefix
    ? `assets/${candidateRelative}`
    : candidateRelative;
}


async function assetExistsAtStoragePath({
  storageAdapter,
  storagePath
}) {

  if (
    !storageAdapter ||
    typeof storageAdapter.readBinary !== 'function'
  ) {

    return false;
  }

  try {

    await storageAdapter.readBinary(
      storagePath
    );

    return true;

  } catch {

    return false;
  }
}


function splitFilename(
  filename
) {

  const safeFilename =
    String(filename || 'asset');

  const index =
    safeFilename.lastIndexOf('.');

  if (index <= 0) {

    return {
      base:
        safeFilename,
      extension:
        ''
    };
  }

  return {
    base:
      safeFilename.slice(
        0,
        index
      ),
    extension:
      safeFilename.slice(
        index
      )
  };
}


function joinPath(
  directory,
  filename
) {

  return [
    directory,
    filename
  ]
    .filter(Boolean)
    .join('/');
}


function getParentPath(
  path
) {

  const parts =
    normalizeWorkspacePath(
      path
    )
      .split('/');

  parts.pop();

  return parts.join('/');
}


function validateAssetPayload(
  payload
) {

  if (!payload) {

    return {
      available:
        false,
      error:
        null
    };
  }

  if (payload.encoding !== 'base64') {

    return {
      available:
        false,
      error:
        'Asset payload encoding is not supported.'
    };
  }

  try {

    decodeAssetPayloadToArrayBuffer(
      payload
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
          error?.message || error || 'Asset payload is not readable.'
        )
    };
  }
}


function decodeAssetPayloadToArrayBuffer(
  payload
) {

  if (
    !payload ||
    payload.encoding !== 'base64'
  ) {

    throw new Error(
      'Asset payload must use base64 encoding.'
    );
  }

  const base64 =
    normalizeBase64PayloadBytes(
      payload.bytes
    );

  if (base64 === null) {

    throw new Error(
      'Asset payload bytes must be valid base64.'
    );
  }

  if (typeof Buffer !== 'undefined') {

    const buffer =
      Buffer.from(
        base64,
        'base64'
      );

    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  }

  if (typeof atob !== 'function') {

    throw new Error(
      'Base64 decoder is not available.'
    );
  }

  const binary =
    atob(
      base64
    );

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {

    bytes[index] =
      binary.charCodeAt(
        index
      );
  }

  return bytes.buffer;
}


function arrayBufferToBase64(
  buffer
) {

  const bytes =
    new Uint8Array(
      buffer
    );

  if (typeof Buffer !== 'undefined') {

    return Buffer.from(
      bytes
    )
      .toString(
        'base64'
      );
  }

  let binary =
    '';

  const chunkSize =
    0x8000;

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(
        index,
        index + chunkSize
      )
    );
  }

  return btoa(
    binary
  );
}


function inferMimeType(
  path
) {

  const extension =
    String(path || '')
      .split('.')
      .pop()
      .toLowerCase();

  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'svg') return 'image/svg+xml';
  if (extension === 'mp3') return 'audio/mpeg';
  if (extension === 'wav') return 'audio/wav';
  if (extension === 'ogg') return 'audio/ogg';
  if (extension === 'm4a') return 'audio/mp4';
  if (extension === 'aac') return 'audio/aac';
  if (extension === 'flac') return 'audio/flac';
  if (extension === 'webm') return 'audio/webm';

  return 'application/octet-stream';
}


function dedupeAssetReferences(
  references
) {

  const byPath =
    new Map();

  for (const reference of references) {

    if (
      !reference?.path ||
      byPath.has(
        reference.path
      )
    ) {

      continue;
    }

    byPath.set(
      reference.path,
      reference
    );
  }

  return [
    ...byPath.values()
  ];
}


function rewriteImportedPageAssetPaths(body, pathMap) {
  return rewriteBodyAssetPaths(body, pathMap || new Map());
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
