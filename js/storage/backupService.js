import { assertLegacyPortability, assertLegacyBackupCatalog } from './structuredPagePolicy.js';
import { collectWorkspaceFiles, captureBackupDefinitions, readBackupDefinitions, assertBackupPageDefinitions, backupBytesDigest } from './backupDefinitionCoverage.js';
import { CARD_TYPE_CATALOG_PATH, readCardTypeCatalog, activateCardTypeDefinitions, createCardTypeRegistryFromCatalog } from './cardTypeCatalogStorage.js';
import { collectPageDefinitionClosure } from '../variables/typedPageTraversal.js';
import { collectProtectedOperationBackupIds } from './operationJournal.js';
import { CardTypeRegistry } from '../cardTypes/cardTypeRegistry.js';
import { hasStructuredPageData } from './structuredPagePolicy.js';
import { createRuntimePageFromContent } from '../core/pageRecord.js';
import { setPages } from '../stateActions.js';
import {
  state
} from '../state.js';

import {
  collectAssetReferencesFromPages
} from './assetReferenceScanner.js';

import {
  getStorageAdapter, captureStorageWorkspaceContext, assertStorageWorkspaceContext
} from './storageAdapter.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';

import {
  measureWorkspaceOperation, yieldWorkspaceTurn
} from '../performance/workspacePerformance.js';


export const BACKUP_ROOT_DIR =
  '.my-own-world-backups';

// Одноразовый результат уже выполненной durable verification, не cache по id.
// JSON/старый snapshot всегда проверяется заново; receipt не переживает restart.
const createdBackupVerifications = new WeakMap();

export async function consumeCreatedBackupVerification(manifest, { storageAdapter = getStorageAdapter(), ...options } = {}) {
  const receipt = createdBackupVerifications.get(manifest);
  createdBackupVerifications.delete(manifest);
  if (receipt && receipt.adapter === storageAdapter && receipt.root === (storageAdapter.getWorkspaceRoot?.() || storageAdapter.getWorkspaceHandle?.()) && receipt.identity === JSON.stringify(manifest)) {
    return receipt.verified;
  }
  return verifyWorkspaceBackup(manifest.id, { ...options, storageAdapter });
}

export const BACKUP_PAGES_DIR =
  'pages';

export const BACKUP_ASSETS_DIR =
  'assets';

export const BACKUP_DEFAULT_RETENTION =
  20;

export const BACKUP_MIN_RETENTION =
  1;

export const BACKUP_MAX_RETENTION =
  200;

export const BACKUP_RETENTION_STORAGE_KEY =
  'myOwnWorld.backup.retentionLimit';

const PRE_RESTORE_BACKUP_REASON =
  'pre-restore';

const PRE_RESTORE_BACKUP_BLOCKED_MESSAGE =
  'Restore blocked: pre-restore safety backup was not created.';

const PRE_RESTORE_BACKUP_VERIFY_MESSAGE =
  'Restore blocked: pre-restore safety backup could not be verified.';

const RESTORE_INCOMPLETE_MESSAGE =
  'Restore incomplete: workspace restore stopped after the pre-restore safety backup.';

export const BACKUP_MANIFEST_VALIDATION_STATUS =
  Object.freeze({
    VALID:
      'VALID',
    WARNING:
      'WARNING',
    INVALID:
      'INVALID'
  });

const BACKUP_MANIFEST_SUPPORTED_VERSION =
  1;


export function isRestoreIncompleteError(
  error
) {

  return Boolean(
    error &&
    error.restoreIncomplete === true
  );
}


export function createBackupId(
  reason = 'manual',
  date = new Date()
) {

  const safeReason =
    String(reason || 'manual')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё_-]+/giu, '-')
      .replace(/^-+|-+$/g, '') ||
    'manual';

  const timestamp =
    date
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-');

  return `${timestamp}-${safeReason}`;
}


export function createBackupManifest({
  id,
  reason,
  pages,
  assetReferences = [],
  createdAt = new Date().toISOString()
}) {

  const pageRecords =
    pages.map(page => ({
      id: page.id || null,
      title: page.title || '',
      parent: page.parent ?? null,
      type: page.type || '',
      template: page.template || '',
      name: page.name || `${page.id || crypto.randomUUID()}.md`,
      path: page.path || ''
    }));

  return {
    version: 1,
    id,
    reason,
    createdAt,
    pageCount: pageRecords.length,
    assetCount: assetReferences.length,
    assets:
      assetReferences.map(reference => ({
        id: reference.id || null,
        path: reference.path || '',
        type: reference.type || '',
        owner: reference.owner || null,
        fallback: reference.fallback || null
      })),
    pages: pageRecords
  };
}


export async function createWorkspaceBackup(
  options = {}
) {

  return measureWorkspaceOperation(
    'backup.create',
    () => createWorkspaceBackupMeasured(
      options
    ),
    {
      counts: result => ({
        pages:
          result?.pageCount || 0,
        assets:
          result?.assetCount || 0
      })
    }
  );
}


async function createWorkspaceBackupMeasured(
  options = {}
) {

  const storageAdapter =
    getBackupStorageAdapter(
      options
    );
  const backupRoot = storageAdapter.getWorkspaceRoot?.() || storageAdapter.getWorkspaceHandle?.();
  reportProgress(options, { label: 'Backup', stage: 'подготовка', current: 0, total: 0 });
  if (options.onProgress) await yieldWorkspaceTurn();
  if (backupRoot !== (storageAdapter.getWorkspaceRoot?.() || storageAdapter.getWorkspaceHandle?.())) throw new Error('Backup workspace changed');

  let pages =
    options.pages || state.pages || [];

  const definitionCoverage = options.definitionCoverage === true || pages.some(hasStructuredPageData) || (await readCardTypeCatalog({ storageAdapter })).exists;
  const definitions = definitionCoverage ? await measureWorkspaceOperation('backup.definition-capture', () => captureBackupDefinitions(storageAdapter)) : null;
  if (definitionCoverage) {
    if (new Set(pages.map(page => page.name)).size !== pages.length || pages.some(page => !page.path || !page.name || /[\\/]/.test(page.name) || page.path.replace(/^\//, '') !== `pages/${page.name}`)) throw new Error('Ambiguous/unsupported backup page paths');
    pages = await measureWorkspaceOperation('backup.page-reads', () => Promise.all(pages.map(async page => ({ ...page, content: page.path ? await storageAdapter.readText(page.path) : page.content }))), { counts: { pages: pages.length } });
    await measureWorkspaceOperation('backup.definition-validation', () => assertBackupPageDefinitions(pages.map(page => page.content), definitions.catalog), { counts: { pages: pages.length } });
  } else {
    await assertLegacyBackupCatalog(storageAdapter);
    pages.forEach(page => assertLegacyPortability(page, 'Backup v1'));
    for (const page of pages) assertLegacyPortability(await readPageBackupContent(page, storageAdapter), 'Backup v1 durable source');
  }

  const includeAssets =
    options.includeAssets !== false;

  const assetReferences = definitionCoverage && includeAssets
    ? (await measureWorkspaceOperation('backup.asset-enumeration', () => collectWorkspaceFiles(storageAdapter, 'assets'))).map(file => ({ path: file.path, type: 'unknown' }))
    : includeAssets
      ? (
        options.assetReferences ||
        collectAssetReferencesFromPages(
          pages
        )
      )
      : [];

  const reason =
    options.reason || 'manual';

  const id =
    options.id || createBackupId(
      reason
    );

  const snapshotPath =
    `${BACKUP_ROOT_DIR}/${id}`;

  reportProgress(
    options,
    {
      label: 'Backup',
      stage: 'подготовка',
      current: 0,
      total: pages.length
    }
  );

  await storageAdapter.ensureDirectory(
    `${snapshotPath}/${BACKUP_PAGES_DIR}`
  );

  await storageAdapter.ensureDirectory(
    `${snapshotPath}/${BACKUP_ASSETS_DIR}`
  );

  const manifest =
    createBackupManifest({
      id,
      reason,
      pages,
      assetReferences
    });

  if (definitionCoverage) {
    manifest.version = 2;
    manifest.cardTypes = definitions.entry;
    manifest.assetCoverage = includeAssets ? 'all-workspace-assets' : 'none';
    await measureWorkspaceOperation('backup.asset-digests', async () => { for (const asset of manifest.assets) {
      const bytes = await storageAdapter.readBinary(asset.path);
      asset.bytes = bytes.byteLength;
      asset.digest = await backupBytesDigest(bytes);
    } }, { counts: { assets: manifest.assets.length } });
    if (definitions.text !== null) await storageAdapter.writeText(`${snapshotPath}/${CARD_TYPE_CATALOG_PATH}`, definitions.text);
  }

  await measureWorkspaceOperation('backup.page-writes', async () => { for (
    let index = 0;
    index < pages.length;
    index += 1
  ) {

    const page =
      pages[index];

    const fileName =
      getBackupPageFileName(
        page
      );

    if (definitionCoverage) manifest.pages[index].contentDigest = await backupBytesDigest(page.content);

    await storageAdapter.writeText(
      `${snapshotPath}/${BACKUP_PAGES_DIR}/${fileName}`,
      await readPageBackupContent(
        page,
        storageAdapter
      )
    );

    reportProgress(
      options,
      {
        label: 'Backup',
        stage: 'страницы',
        current: index + 1,
        total: pages.length
      }
    );
  } }, { counts: { pages: pages.length } });

  const copiedAssets =
    await measureWorkspaceOperation('backup.asset-copy', () => copyAssetsToBackup({
      storageAdapter,
      snapshotPath,
      assetReferences,
      onProgress:
        progress => reportProgress(
          options,
          progress
        )
    }), { counts: { assets: assetReferences.length } });

  manifest.assetCount =
    copiedAssets;

  if (definitionCoverage && copiedAssets !== assetReferences.length) throw new Error('Definition-aware backup asset copy incomplete');

  await storageAdapter.writeText(
    `${snapshotPath}/manifest.json`,
    JSON.stringify(
      manifest,
      null,
      2
    )
  );

  // Creation owns full verification for every new snapshot, including legacy v1.
  const verified = await measureWorkspaceOperation('backup.verification', () => verifyWorkspaceBackup(id, {
    storageAdapter, definitionCoverage, onProgress: options.onProgress
  }));

  if (options.cleanup !== false) {

    await cleanupWorkspaceBackups({
      storageAdapter,
      keepLatest:
        options.keepLatest ?? getBackupRetentionLimit()
    });
  }

  if (backupRoot !== (storageAdapter.getWorkspaceRoot?.() || storageAdapter.getWorkspaceHandle?.())) throw new Error('Backup workspace changed');
  createdBackupVerifications.set(manifest, { adapter: storageAdapter, root: backupRoot, identity: JSON.stringify(manifest), verified });
  reportProgress(options, { label: 'Backup', stage: 'готово', current: pages.length, total: pages.length });
  return manifest;
}


export async function createWorkspaceBackupBeforeRiskyOperation(
  reason,
  options = {}
) {

  try {

    return await createWorkspaceBackup({
      ...options,
      reason
    });

  } catch (error) {

    console.warn(
      'Backup не был создан перед рискованной операцией.',
      error
    );

    return null;
  }
}


export async function requireWorkspaceBackupBeforeRiskyOperation(
  reason,
  options = {}
) {

  const manifest =
    await createWorkspaceBackupBeforeRiskyOperation(
      reason,
      {
        includeAssets:
          false,
        definitionCoverage:
          true,
        ...options
      }
    );

  if (!manifest) {

    throw new Error(
      'Risky operation blocked: backup was not created.'
    );
  }

  return manifest;
}


export function getBackupRetentionLimit(
  storage = globalThis.localStorage
) {

  const rawValue =
    storage?.getItem?.(
      BACKUP_RETENTION_STORAGE_KEY
    );

  return normalizeBackupRetentionLimit(
    rawValue
  );
}


export function setBackupRetentionLimit(
  value,
  storage = globalThis.localStorage
) {

  const limit =
    normalizeBackupRetentionLimit(
      value
    );

  storage?.setItem?.(
    BACKUP_RETENTION_STORAGE_KEY,
    String(limit)
  );

  return limit;
}


export function normalizeBackupRetentionLimit(
  value
) {

  const number =
    Number.parseInt(
      value,
      10
    );

  if (!Number.isFinite(number)) {

    return BACKUP_DEFAULT_RETENTION;
  }

  return Math.min(
    BACKUP_MAX_RETENTION,
    Math.max(
      BACKUP_MIN_RETENTION,
      number
    )
  );
}


export async function listWorkspaceBackups(
  storageAdapterOrHandle = null
) {

  const isAdapter =
    isStorageAdapter(
      storageAdapterOrHandle
    );

  const storageAdapter =
    getBackupStorageAdapter({
      storageAdapter: isAdapter
        ? storageAdapterOrHandle
        : null,
      workspaceHandle: isAdapter
        ? null
        : storageAdapterOrHandle
    });

  let entries;

  try {

    entries =
      await storageAdapter.listFiles(
        BACKUP_ROOT_DIR
      );

  } catch (error) {

    return [];
  }

  const backups =
    [];

  for (const entry of entries) {

    if (entry.kind !== 'directory') continue;

    const manifest =
      await readBackupManifest(
        storageAdapter,
        `${BACKUP_ROOT_DIR}/${entry.name}`
      );

    if (manifest) {

      backups.push(
        manifest
      );
    }
  }

  return backups.sort((a, b) =>
    String(b.createdAt).localeCompare(
      String(a.createdAt)
    ) ||
    String(b.id).localeCompare(
      String(a.id)
    )
  );
}


export async function validateWorkspaceBackupManifest(
  backupId,
  options = {}
) {

  const storageAdapter =
    getBackupStorageAdapter({
      storageAdapter:
        options.storageAdapter || null,
      workspaceHandle:
        options.workspaceHandle || null
    });

  return readAndValidateBackupManifest(
    storageAdapter,
    `${BACKUP_ROOT_DIR}/${backupId}`,
    {
      backupId
    }
  );
}


export async function restoreWorkspaceBackup(
  backupId,
  storageAdapterOrHandle = null,
  options = {}
) {

  return measureWorkspaceOperation(
    'backup.restore',
    () => restoreWorkspaceBackupMeasured(
      backupId,
      storageAdapterOrHandle,
      options
    ),
    {
      counts: result => ({
        pages:
          result?.restoredPages || 0,
        assets:
          result?.restoredAssets || 0
      })
    }
  );
}


export async function restoreWorkspaceBackupSelection(
  backupId,
  selection,
  storageAdapterOrHandle = null,
  options = {}
) {

  const restoreSelection =
    normalizeRestoreSelection(
      selection
    );

  return measureWorkspaceOperation(
    'backup.restore.partial',
    () => restoreWorkspaceBackupMeasured(
      backupId,
      storageAdapterOrHandle,
      {
        ...options,
        restoreSelection
      }
    ),
    {
      counts: result => ({
        pages:
          result?.restoredPages || 0,
        assets:
          result?.restoredAssets || 0
      })
    }
  );
}


export async function listIncompleteWorkspaceBackups({
  storageAdapter = null,
  workspaceHandle = null,
  onProgress = null
} = {}) {

  return measureWorkspaceOperation(
    'backup.listIncomplete',
    () => listIncompleteWorkspaceBackupsMeasured({
      storageAdapter,
      workspaceHandle,
      onProgress
    }),
    {
      counts: result => ({
        incomplete:
          result?.length || 0
      })
    }
  );
}


async function listIncompleteWorkspaceBackupsMeasured({
  storageAdapter = null,
  workspaceHandle = null,
  onProgress = null
} = {}) {

  const adapter =
    getBackupStorageAdapter({
      storageAdapter,
      workspaceHandle
    });

  let entries;

  try {

    entries =
      await adapter.listFiles(
        BACKUP_ROOT_DIR
      );

  } catch (error) {

    return [];
  }

  const directories =
    entries.filter(entry =>
      entry.kind === 'directory'
    );

  const incomplete =
    [];

  for (
    let index = 0;
    index < directories.length;
    index += 1
  ) {

    const entry =
      directories[index];

    const backupPath =
      `${BACKUP_ROOT_DIR}/${entry.name}`;

    const manifest =
      await readBackupManifestSilent(
        adapter,
        backupPath
      );

    reportProgress(
      {
        onProgress
      },
      {
        label: 'Backup scan',
        stage: 'проверка',
        current: index + 1,
        total: directories.length
      }
    );

    if (manifest) continue;

    const stats =
      await collectDirectoryStats(
        adapter,
        backupPath
      );

    incomplete.push({
      id:
        entry.name,
      path:
        backupPath,
      fileCount:
        stats.fileCount,
      directoryCount:
        stats.directoryCount,
      sizeBytes:
        stats.sizeBytes,
      sizeUnknown:
        stats.sizeUnknown,
      reason:
        'manifest-missing'
    });
  }

  return incomplete.sort((a, b) =>
    String(b.id).localeCompare(
      String(a.id)
    )
  );
}


export async function cleanupIncompleteWorkspaceBackups({
  storageAdapter = null,
  workspaceHandle = null,
  backupIds = [],
  onProgress = null
} = {}) {

  return measureWorkspaceOperation(
    'backup.cleanupIncomplete',
    () => cleanupIncompleteWorkspaceBackupsMeasured({
      storageAdapter,
      workspaceHandle,
      backupIds,
      onProgress
    }),
    {
      counts: result => ({
        removed:
          result?.removed || 0,
        skipped:
          result?.skipped || 0
      })
    }
  );
}


async function cleanupIncompleteWorkspaceBackupsMeasured({
  storageAdapter = null,
  workspaceHandle = null,
  backupIds = [],
  onProgress = null
} = {}) {

  const adapter =
    getBackupStorageAdapter({
      storageAdapter,
      workspaceHandle
    });
  const cleanupRoot = adapter.getWorkspaceRoot?.() || adapter.getWorkspaceHandle?.();

  const requestedIds =
    new Set(
      backupIds.map(id =>
        String(id || '')
      ).filter(Boolean)
    );

  if (requestedIds.size === 0) {

    return {
      removed: 0,
      skipped: 0
    };
  }

  const incomplete =
    await listIncompleteWorkspaceBackupsMeasured({
      storageAdapter:
        adapter
    });

  const allowed =
    new Map(
      incomplete.map(backup => [
        backup.id,
        backup
      ])
    );

  let removed =
    0;

  let skipped =
    0;

  const ids =
    [
      ...requestedIds
    ];

  await collectProtectedOperationBackupIds(adapter);

  for (
    let index = 0;
    index < ids.length;
    index += 1
  ) {

    const id =
      ids[index];

    const backup =
      allowed.get(
        id
      );

    const protectedIds = await collectProtectedOperationBackupIds(adapter);
    if (cleanupRoot !== (adapter.getWorkspaceRoot?.() || adapter.getWorkspaceHandle?.())) throw new Error('Backup cleanup blocked: workspace changed');
    if (!backup || protectedIds.has(id)) {

      skipped += 1;
      continue;
    }

    await adapter.removeDirectory(
      backup.path
    );

    removed += 1;

    reportProgress(
      {
        onProgress
      },
      {
        label: 'Backup cleanup',
        stage: 'недособранные',
        current: index + 1,
        total: ids.length
      }
    );
  }

  return {
    removed,
    skipped
  };
}


async function restoreWorkspaceBackupMeasured(
  backupId,
  storageAdapterOrHandle = null,
  options = {}
) {

  const isAdapter =
    isStorageAdapter(
      storageAdapterOrHandle
    );

  const storageAdapter =
    getBackupStorageAdapter({
      storageAdapter: isAdapter
        ? storageAdapterOrHandle
        : null,
      workspaceHandle: isAdapter
        ? null
        : storageAdapterOrHandle
    });

  const workspace = storageAdapter === getStorageAdapter() && (storageAdapter.getWorkspaceRoot?.() || storageAdapter.getWorkspaceHandle?.())
    ? captureStorageWorkspaceContext() : null;
  const guard = () => { if (workspace) assertStorageWorkspaceContext(workspace); };
  const snapshotPath =
    `${BACKUP_ROOT_DIR}/${backupId}`;

  const manifestValidation =
    await readAndValidateBackupManifest(
      storageAdapter,
      snapshotPath,
      {
        backupId
      }
    );

  if (manifestValidation.restoreBlocking) {

    throw createBackupManifestValidationError(
      manifestValidation
    );
  }

  const manifest =
    manifestValidation.manifest;

  if (options.expectedBackupReason && manifest.reason !== options.expectedBackupReason) {
    throw new Error('Recovery backup reason does not match operation');
  }

  reportProgress(options, { label: 'Restore', stage: 'проверка исходной копии', current: 0, total: manifest.pageCount });

  options = { ...options, definitionCoverage: manifest.version === 2 || options.definitionCoverage === true };
  const backupCatalog = await readBackupDefinitions(storageAdapter, snapshotPath, manifest);
  const currentCatalog = await readCardTypeCatalog({ storageAdapter });

  const restorePlan =
    await createRestoreWritePlan({
      storageAdapter,
      snapshotPath,
      manifest,
      restoreSelection:
        options.restoreSelection ? normalizeRestoreSelection(options.restoreSelection) : null,
      definitionCoverage: options.definitionCoverage || currentCatalog.exists,
      registry: createCardTypeRegistryFromCatalog(backupCatalog || currentCatalog?.catalog || { formatVersion: 1, revision: 0, types: [], fieldSets: [] }, { bundledTypes: [], bundledFieldSets: [] })
    });

  if (options.definitionCoverage || currentCatalog.exists) assertBackupPageDefinitions([...restorePlan.pageContentByName.values()], backupCatalog || currentCatalog.catalog, { requireValidValues: true });

  const restoredDefinitions = backupCatalog && options.restoreSelection
    ? collectPageDefinitionClosure([...restorePlan.pageContentByName.values()].map(content => ({ content })),
      createCardTypeRegistryFromCatalog(backupCatalog, { bundledTypes: [], bundledFieldSets: [] })) : backupCatalog;
  // Selected restore checks its own closure; unrelated snapshot definitions do not
  // replace or downgrade the live catalog. Collisions precede the safety backup.
  if (restoredDefinitions) new CardTypeRegistry({ bundledTypes: [], bundledFieldSets: [],
    activatedTypes: currentCatalog.catalog.types, activatedFieldSets: currentCatalog.catalog.fieldSets,
    candidateTypes: restoredDefinitions.types, candidateFieldSets: restoredDefinitions.fieldSets });

  guard();
  const preRestoreManifest =
    await createAndVerifyPreRestoreBackup({
      storageAdapter,
      options
    });

  let restoredPages =
    0;

  let restoredAssets =
    0;

  let restoreStage =
    'prepare';

  const pages =
    restorePlan.pages;

  try {

    guard();
    if (restoredDefinitions) await activateCardTypeDefinitions({ types: restoredDefinitions.types, fieldSets: restoredDefinitions.fieldSets,
      expectedIdentity: currentCatalog.identity, storageAdapter });

    await storageAdapter.ensureDirectory(
      'pages'
    );

    restoreStage =
      'pages';

    for (
      let index = 0;
      index < pages.length;
      index += 1
    ) {

      const page =
        pages[index];

      const fileName =
        page.name;

      if (!fileName) continue;

      const content =
        restorePlan.pageContentByName.get(
          fileName
        );

      guard();
      await storageAdapter.writeText(
        `pages/${fileName}`,
        content
      );

      guard();
      if (options.definitionCoverage && await storageAdapter.readText(`pages/${fileName}`) !== content) throw new Error('Recovery page readback mismatch');

      restoredPages += 1;

      reportProgress(
        options,
        {
          label: 'Restore',
          stage: 'страницы',
          current: index + 1,
          total: pages.length
        }
      );
    }

    restoreStage =
      'assets';

    guard();
    restoredAssets =
      await restoreBackupAssets({
        storageAdapter,
        assets:
          restorePlan.assets,
        assetContentByPath:
          restorePlan.assetContentByPath,
        verifyReadback: options.definitionCoverage === true,
        onProgress:
          progress => reportProgress(
            options,
            progress
          )
      });
    guard();

  } catch (error) {

    throw createRestoreIncompleteError({
      cause:
        error,
      backupId,
      stage:
        restoreStage,
      preRestoreBackupId:
        preRestoreManifest.id,
      partial:
        restorePlan.partial,
      restoredPages,
      restoredAssets,
      selectedPageNames:
        restorePlan.selectedPageNames,
      selectedAssetPaths:
        restorePlan.selectedAssetPaths,
      skippedAssetPaths:
        restorePlan.skippedAssetPaths
    });
  }

  let presentationRefreshFailure = null;
  if (storageAdapter === getStorageAdapter()) {
    try {
      const durablePages = [];
      for (const file of await collectWorkspaceFiles(storageAdapter, 'pages')) if (file.name.endsWith('.md')) {
        durablePages.push(createRuntimePageFromContent({ ...file, content: await storageAdapter.readText(file.path) }));
      }
      setPages(durablePages);
    } catch (error) {
      // Durable restore уже подтверждён: ошибка projection refresh не откатывает файлы.
      presentationRefreshFailure = error?.message || String(error);
    }
  }
  return {
    presentationRefreshFailure,
    backupId,
    preRestoreBackupId:
      preRestoreManifest.id,
    restoredPages,
    restoredAssets,
    partial:
      restorePlan.partial,
    selectedPageNames:
      restorePlan.selectedPageNames,
    selectedAssetPaths:
      restorePlan.selectedAssetPaths,
    skippedAssetPaths:
      restorePlan.skippedAssetPaths,
    unresolvedAssetReferences:
      restorePlan.unresolvedAssetReferences
  };
}


async function createRestoreWritePlan({
  storageAdapter,
  snapshotPath,
  manifest,
  restoreSelection = null,
  definitionCoverage = false, registry = null
}) {

  const pages =
    Array.isArray(
      manifest.pages
    )
      ? manifest.pages
      : [];

  const assets =
    Array.isArray(
      manifest.assets
    )
      ? manifest.assets
      : [];

  if (!restoreSelection) {

    const pageContentByName =
      await preflightBackupPages({
        storageAdapter,
        snapshotPath,
        pages,
        definitionCoverage,
        blockedPrefix:
          'Restore blocked'
      });

    const assetPlan =
      await preflightBackupAssets({
        storageAdapter,
        snapshotPath,
        assets,
        allowLegacyMissing:
          isLegacyPartialAssetManifest(
            manifest,
            assets
          ),
        blockedPrefix:
          'Restore blocked'
      });

    return {
      partial:
        false,
      pages,
      assets:
        assetPlan.assets,
      pageContentByName:
        pageContentByName,
      assetContentByPath:
        assetPlan.assetContentByPath,
      selectedPageNames:
        pages
          .map(page => page.name)
          .filter(Boolean),
      selectedAssetPaths:
        assetPlan.assets
          .map(asset => normalizeAssetPath(asset.path || ''))
          .filter(Boolean),
      skippedAssetPaths:
        assetPlan.skippedAssetPaths,
      unresolvedAssetReferences:
        []
    };
  }

  const selectedPages =
    selectBackupPages(
      pages,
      restoreSelection
    );

  const pageContentByName =
    await preflightBackupPages({
      storageAdapter,
      snapshotPath,
      pages:
        selectedPages,
      definitionCoverage,
      blockedPrefix:
        'Partial restore blocked'
    });

  const selectedAssetPlan =
    await preflightSelectedBackupAssets({
      storageAdapter,
      snapshotPath,
      manifestAssets:
        assets,
      selectedPages,
      pageContentByName, registry
    });

  return {
    partial:
      true,
    pages:
      selectedPages,
    assets:
      selectedAssetPlan.assets,
    pageContentByName,
    assetContentByPath:
      selectedAssetPlan.assetContentByPath,
    selectedPageNames:
      selectedPages.map(page =>
        page.name
      ),
    selectedAssetPaths:
      selectedAssetPlan.assets.map(asset =>
        normalizeAssetPath(
          asset.path || ''
        )
      ),
    skippedAssetPaths:
      [],
    unresolvedAssetReferences:
      selectedAssetPlan.unresolvedAssetReferences
  };
}


function normalizeRestoreSelection(
  selection = {}
) {

  const pageNamesInput =
    Array.isArray(
      selection
    )
      ? selection
      : selection?.pageNames || selection?.pages || [];

  const pageIdsInput =
    Array.isArray(
      selection
    )
      ? []
      : selection?.pageIds || [];

  const pageNames =
    new Set(
      [...pageNamesInput]
        .map(normalizeSelectedPageName)
        .filter(Boolean)
    );

  const pageIds =
    new Set(
      [...pageIdsInput]
        .map(value => String(value || '').trim())
        .filter(Boolean)
    );

  if (
    pageNames.size === 0 &&
    pageIds.size === 0
  ) {

    throw new Error(
      'Partial restore blocked: no backup pages were selected.'
    );
  }

  return {
    pageNames,
    pageIds
  };
}


function normalizeSelectedPageName(
  value
) {

  return normalizeWorkspacePath(
    String(value || '')
  )
    .replace(/^pages\//, '');
}


function selectBackupPages(
  pages,
  restoreSelection
) {

  const pageByName =
    new Map();

  const pageById =
    new Map();

  pages.forEach(page => {

    if (page?.name) {

      pageByName.set(
        page.name,
        page
      );
    }

    if (page?.id) {

      pageById.set(
        String(page.id),
        page
      );
    }
  });

  const selected =
    new Map();

  const missing =
    [];

  restoreSelection.pageNames.forEach(name => {

    const page =
      pageByName.get(
        name
      );

    if (!page) {

      missing.push(
        name
      );

      return;
    }

    selected.set(
      page.name,
      page
    );
  });

  restoreSelection.pageIds.forEach(id => {

    const page =
      pageById.get(
        id
      );

    if (!page) {

      missing.push(
        id
      );

      return;
    }

    selected.set(
      page.name,
      page
    );
  });

  if (missing.length > 0) {

    throw new Error(
      `Partial restore blocked: selected backup pages were not found: ${missing.join(', ')}`
    );
  }

  if (selected.size === 0) {

    throw new Error(
      'Partial restore blocked: no matching backup pages were selected.'
    );
  }

  return [
    ...selected.values()
  ];
}


async function preflightBackupPages({
  storageAdapter,
  snapshotPath,
  pages,
  definitionCoverage = false,
  blockedPrefix = 'Restore blocked'
}) {

  const pageContentByName =
    new Map();

  for (const page of pages) {

    const fileName =
      page.name;

    try {

      pageContentByName.set(
        fileName,
        await storageAdapter.readText(
          `${snapshotPath}/${BACKUP_PAGES_DIR}/${fileName}`
        )
      );
      if (!definitionCoverage) assertLegacyPortability(pageContentByName.get(fileName), 'Backup v1 restore');
      if (page.contentDigest && page.contentDigest !== await backupBytesDigest(pageContentByName.get(fileName))) throw new Error('Backup page integrity mismatch');

    } catch (error) {

      throw new Error(
        `${blockedPrefix}: backup page file is unavailable: ${fileName}`,
        {
          cause:
            error
        }
      );
    }
  }

  return pageContentByName;
}


async function preflightBackupAssets({
  storageAdapter,
  snapshotPath,
  assets,
  allowLegacyMissing = false,
  blockedPrefix = 'Restore blocked'
}) {

  const availableAssets =
    [];

  const skippedAssetPaths =
    [];

  const assetContentByPath =
    new Map();

  for (const asset of assets) {

    const normalizedPath =
      normalizeAssetPath(
        asset?.path || ''
      );

    if (!normalizedPath) continue;

    try {

      assetContentByPath.set(
        normalizedPath,
        await storageAdapter.readBinary(
          `${snapshotPath}/${BACKUP_ASSETS_DIR}/${normalizedPath}`
        )
      );
      // Verify the very bytes retained in the restore plan, not an earlier read.
      const bytes = assetContentByPath.get(normalizedPath);
      if (asset.digest && (bytes.byteLength !== asset.bytes || await backupBytesDigest(bytes) !== asset.digest)) throw new Error('Backup asset integrity mismatch');

      availableAssets.push(
        asset
      );

    } catch (error) {

      if (allowLegacyMissing) {

        skippedAssetPaths.push(
          normalizedPath
        );

        continue;
      }

      throw new Error(
        `${blockedPrefix}: backup asset is unavailable: assets/${normalizedPath}`,
        {
          cause:
            error
        }
      );
    }
  }

  return {
    assets:
      availableAssets,
    assetContentByPath,
    skippedAssetPaths
  };
}


async function preflightSelectedBackupAssets({
  storageAdapter,
  snapshotPath,
  manifestAssets,
  selectedPages,
  pageContentByName, registry
}) {

  const referencedAssetPaths =
    new Set(
      collectAssetReferencesFromPages(
        selectedPages.map(page => ({
          ...page,
          content:
            pageContentByName.get(
              page.name
            ) || ''
        })), { registry }
      )
        .map(reference =>
          normalizeAssetPath(
            reference.path || ''
          )
        )
        .filter(Boolean)
    );

  const references = collectAssetReferencesFromPages(selectedPages.map(page => ({ ...page, content: pageContentByName.get(page.name) })), { registry });
  if (references.some(reference => reference.incomplete)) throw new Error('Partial restore blocked: incomplete typed asset closure');

  const assets =
    [];

  const manifestAssetPaths =
    new Set();

  manifestAssets.forEach(asset => {

    const normalizedPath =
      normalizeAssetPath(
        asset?.path || ''
      );

    if (!normalizedPath) return;

    manifestAssetPaths.add(
      normalizedPath
    );

    if (
      referencedAssetPaths.has(
        normalizedPath
      )
    ) {

      assets.push(
        asset
      );
    }
  });

  const unresolvedAssetReferences =
    [
      ...referencedAssetPaths
    ].filter(path =>
      !manifestAssetPaths.has(
        path
      )
    );

  if (unresolvedAssetReferences.length) throw new Error('Partial restore blocked: missing asset dependency');
  const assetPlan =
    await preflightBackupAssets({
      storageAdapter,
      snapshotPath,
      assets,
      blockedPrefix:
        'Partial restore blocked'
    });

  return {
    assets:
      assetPlan.assets,
    assetContentByPath:
      assetPlan.assetContentByPath,
    unresolvedAssetReferences
  };
}


function isLegacyPartialAssetManifest(
  manifest,
  assets
) {

  if (
    manifest?.assetCount === undefined
  ) return true;

  return Number.isInteger(
    manifest.assetCount
  ) &&
  manifest.assetCount < assets.length;
}


async function createAndVerifyPreRestoreBackup({
  storageAdapter,
  options = {}
}) {

  let manifest;

  try {

    manifest =
      await requireWorkspaceBackupBeforeRiskyOperation(
        options.preRestoreBackupReason ||
          PRE_RESTORE_BACKUP_REASON,
        {
          storageAdapter,
          definitionCoverage: true,
          pages:
            options.preRestorePages ||
            options.pages ||
            state.pages ||
            [],
          assetReferences:
            options.preRestoreAssetReferences,
          includeAssets:
            options.preRestoreIncludeAssets !== false,
          cleanup:
            false,
          id:
            options.preRestoreBackupId,
          onProgress:
            options.onProgress
        }
      );

  } catch (error) {

    throw new Error(
      PRE_RESTORE_BACKUP_BLOCKED_MESSAGE,
      {
        cause:
          error
      }
    );
  }

  const verified = await consumeCreatedBackupVerification(manifest, { storageAdapter, onProgress: options.onProgress });

  if (
    !backupManifestMatches(
      verified.manifest,
      manifest
    )
  ) {

    throw new Error(
      PRE_RESTORE_BACKUP_VERIFY_MESSAGE
    );
  }

  return verified.manifest;
}

// Migration/recovery uses the same preflight as restore, including actual bytes.
export async function verifyWorkspaceBackup(backupId, { storageAdapter = getStorageAdapter(), definitionCoverage = false, onProgress = null } = {}) {
  reportProgress({ onProgress }, { label: 'Backup', stage: 'проверка', current: 0, total: 0 });
  const snapshotPath = `${BACKUP_ROOT_DIR}/${backupId}`;
  const validation = await readAndValidateBackupManifest(storageAdapter, snapshotPath, { backupId });
  if (validation.restoreBlocking) throw createBackupManifestValidationError(validation);
  const manifest = validation.manifest;
  definitionCoverage = definitionCoverage || manifest.version === 2;
  const catalog = await readBackupDefinitions(storageAdapter, snapshotPath, manifest);
  const plan = await createRestoreWritePlan({ storageAdapter, snapshotPath, manifest, definitionCoverage });
  if (definitionCoverage) assertBackupPageDefinitions([...plan.pageContentByName.values()], catalog || (await readCardTypeCatalog({ storageAdapter })).catalog);
  return { manifest, pageContents: Object.fromEntries(plan.pageContentByName) };
}


function backupManifestMatches(
  actual,
  expected
) {

  if (!actual || !expected) return false;

  return (
    actual.id === expected.id &&
    actual.reason === expected.reason &&
    actual.pageCount === expected.pageCount &&
    actual.assetCount === expected.assetCount
  );
}


export async function cleanupWorkspaceBackups({
  storageAdapter = null,
  workspaceHandle = null,
  keepLatest = BACKUP_DEFAULT_RETENTION,
  onProgress = null
} = {}) {

  return measureWorkspaceOperation(
    'backup.cleanup',
    () => cleanupWorkspaceBackupsMeasured({
      storageAdapter,
      workspaceHandle,
      keepLatest,
      onProgress
    }),
    {
      counts: result => ({
        removed:
          result?.removed || 0,
        kept:
          result?.kept || 0
      })
    }
  );
}


async function cleanupWorkspaceBackupsMeasured({
  storageAdapter = null,
  workspaceHandle = null,
  keepLatest = BACKUP_DEFAULT_RETENTION,
  onProgress = null
} = {}) {

  const adapter =
    getBackupStorageAdapter({
      storageAdapter,
      workspaceHandle
    });
  const cleanupRoot = adapter.getWorkspaceRoot?.() || adapter.getWorkspaceHandle?.();

  if (!Number.isFinite(keepLatest) || keepLatest < BACKUP_MIN_RETENTION) {

    throw new Error(
      'Нельзя очищать backup без хотя бы одной сохраняемой точки.'
    );
  }

  const backups =
    await listWorkspaceBackups(
      adapter
    );

  const toRemove =
    backups.slice(
      keepLatest
    );

  await collectProtectedOperationBackupIds(adapter);

  let removed =
    0;
  let protectedCount = 0;

  for (
    let index = 0;
    index < toRemove.length;
    index += 1
  ) {

    const backup =
      toRemove[index];

    // Recheck immediately before deletion: a new pending operation may now own it.
    const protectedIds = await collectProtectedOperationBackupIds(adapter);
    if (cleanupRoot !== (adapter.getWorkspaceRoot?.() || adapter.getWorkspaceHandle?.())) throw new Error('Backup cleanup blocked: workspace changed');
    if (protectedIds.has(backup.id)) { protectedCount += 1; continue; }

    try {

      await adapter.removeDirectory(
        `${BACKUP_ROOT_DIR}/${backup.id}`
      );

      removed += 1;

      reportProgress(
        {
          onProgress
        },
        {
          label: 'Backup cleanup',
          stage: 'удаление',
          current: index + 1,
          total: toRemove.length
        }
      );

    } catch (error) {

      console.warn(
        'Не удалось удалить старый backup.',
        backup.id,
        error
      );
    }
  }

  return {
    removed,
    protected: protectedCount,
    kept:
      backups.length - removed
  };
}


async function readAndValidateBackupManifest(
  storageAdapter,
  snapshotPath,
  options = {}
) {

  const manifestResult =
    await readBackupManifestParseResult(
      storageAdapter,
      snapshotPath
    );

  if (!manifestResult.ok) {

    return createBackupManifestValidationResult({
      manifest:
        null,
      issues:
        [
          manifestResult.issue
        ]
    });
  }

  const issues =
    validateBackupManifestStructure(
      manifestResult.manifest,
      {
        backupId:
          options.backupId || ''
      }
    );

  await validateBackupManifestFiles({
    storageAdapter,
    snapshotPath,
    manifest:
      manifestResult.manifest,
    issues
  });

  return createBackupManifestValidationResult({
    manifest:
      manifestResult.manifest,
    issues
  });
}


async function readBackupManifest(
  storageAdapter,
  snapshotPath
) {

  const result =
    await readBackupManifestParseResult(
      storageAdapter,
      snapshotPath
    );

  if (result.ok) return result.manifest;

  console.warn(
    'Не удалось прочитать manifest backup.',
    result.issue.message
  );

  return null;
}


async function readBackupManifestSilent(
  storageAdapter,
  snapshotPath
) {

  const result =
    await readBackupManifestParseResult(
      storageAdapter,
      snapshotPath
    );

  return result.ok
    ? result.manifest
    : null;
}


async function readBackupManifestParseResult(
  storageAdapter,
  snapshotPath
) {

  let rawManifest;

  try {

    rawManifest =
      await storageAdapter.readText(
        `${snapshotPath}/manifest.json`
      );

  } catch {

    return {
      ok:
        false,
      issue:
        createManifestIssue({
          code:
            'manifest-unreadable',
          severity:
            'error',
          message:
            'Manifest backup не найден или недоступен.'
        })
    };
  }

  try {

    return {
      ok:
        true,
      manifest:
        JSON.parse(
          rawManifest
        )
    };

  } catch {

    return {
      ok:
        false,
      issue:
        createManifestIssue({
          code:
            'manifest-json-malformed',
          severity:
            'error',
          message:
            'Manifest backup поврежден: JSON не читается.'
        })
    };
  }
}


function validateBackupManifestStructure(
  manifest,
  {
    backupId = ''
  } = {}
) {

  const issues =
    [];

  if (
    !manifest ||
    typeof manifest !== 'object' ||
    Array.isArray(
      manifest
    )
  ) {

    issues.push(
      createManifestIssue({
        code:
          'manifest-not-object',
        severity:
          'error',
        message:
          'Manifest backup должен быть объектом.'
      })
    );

    return issues;
  }

  if (![BACKUP_MANIFEST_SUPPORTED_VERSION, 2].includes(manifest.version)) {

    issues.push(
      createManifestIssue({
        code:
          'manifest-version-unsupported',
        severity:
          'error',
        message:
          'Версия manifest backup не поддерживается.'
      })
    );
  }

  if (manifest.version === 2 && (
    !Object.hasOwn(manifest, 'cardTypes') ||
    !['all-workspace-assets', 'none'].includes(manifest.assetCoverage) ||
    !Array.isArray(manifest.pages) || manifest.pages.some(page => !/^sha256:[a-f0-9]{64}$/.test(page?.contentDigest || '')) ||
    !Array.isArray(manifest.assets) || manifest.assets.some(asset => !/^sha256:[a-f0-9]{64}$/.test(asset?.digest || '') || !Number.isSafeInteger(asset?.bytes) || asset.bytes < 0) ||
    manifest.cardTypes !== null && (manifest.cardTypes?.path !== CARD_TYPE_CATALOG_PATH || !/^sha256:[a-f0-9]{64}$/.test(manifest.cardTypes?.digest || '') || !Number.isSafeInteger(manifest.cardTypes?.bytes))
  )) issues.push(createManifestIssue({ code: 'manifest-definition-coverage-invalid', severity: 'error', message: 'Invalid definition-aware backup coverage.' }));

  if (
    typeof manifest.id !== 'string' ||
    manifest.id.trim() === ''
  ) {

    issues.push(
      createManifestIssue({
        code:
          'manifest-id-missing',
        severity:
          'error',
        message:
          'Manifest backup не содержит id.'
      })
    );

  } else if (
    backupId &&
    manifest.id !== backupId
  ) {

    issues.push(
      createManifestIssue({
        code:
          'manifest-id-mismatch',
        severity:
          'error',
        message:
          'Manifest backup не совпадает с выбранной папкой backup.',
        path:
          backupId
      })
    );
  }

  const pages =
    Array.isArray(
      manifest.pages
    )
      ? manifest.pages
      : null;

  if (!pages) {

    issues.push(
      createManifestIssue({
        code:
          'manifest-pages-missing',
        severity:
          'error',
        message:
          'Manifest backup не содержит список страниц.'
      })
    );

  } else {

    validateManifestCount({
      issues,
      value:
        manifest.pageCount,
      expected:
        pages.length,
      invalidCode:
        'manifest-page-count-invalid',
      mismatchCode:
        'manifest-page-count-mismatch',
      invalidMessage:
        'Manifest backup содержит некорректный счетчик страниц.',
      mismatchMessage:
        'Manifest backup содержит счетчик страниц, который не совпадает со списком страниц.'
    });

    pages.forEach((page, index) => {

      if (
        !page ||
        typeof page !== 'object' ||
        Array.isArray(
          page
        )
      ) {

        issues.push(
          createManifestIssue({
            code:
              'manifest-page-entry-invalid',
            severity:
              'error',
            message:
              'Manifest backup содержит некорректную запись страницы.',
            path:
              `pages[${index}]`
          })
        );

        return;
      }

      if (
        !isSafeBackupPageFileName(
          page.name
        )
      ) {

        issues.push(
          createManifestIssue({
            code:
              'page-name-unsafe',
            severity:
              'error',
            message:
              'Manifest backup содержит небезопасное имя файла страницы.',
            path:
              String(page.name || `pages[${index}]`)
          })
        );
      }
    });
  }

  validateManifestAssetsStructure(
    manifest,
    issues
  );

  return issues;
}


function validateManifestAssetsStructure(
  manifest,
  issues
) {

  const assetsExists =
    Array.isArray(
      manifest.assets
    );

  const assets =
    assetsExists
      ? manifest.assets
      : [];

  const hasAssetCount =
    manifest.assetCount !== undefined;

  if (!assetsExists) {

    const severity =
      Number(manifest.assetCount || 0) > 0
        ? 'error'
        : 'warning';

    issues.push(
      createManifestIssue({
        code:
          'manifest-assets-missing',
        severity,
        message:
          severity === 'error'
            ? 'Manifest backup заявляет assets, но не содержит список asset entries.'
            : 'Manifest backup не содержит список asset entries; это допускается только как legacy v1 warning.'
      })
    );

    return;
  }

  if (!hasAssetCount) {

    issues.push(
      createManifestIssue({
        code:
          'manifest-asset-count-missing',
        severity:
          'warning',
        message:
          'Manifest backup не содержит счетчик assets; это допускается только как legacy v1 warning.'
      })
    );

  } else if (
    !Number.isInteger(
      manifest.assetCount
    ) ||
    manifest.assetCount < 0 ||
    manifest.assetCount > assets.length
  ) {

    issues.push(
      createManifestIssue({
        code:
          'manifest-asset-count-invalid',
        severity:
          'error',
        message:
          'Manifest backup содержит некорректный счетчик assets.'
      })
    );

  } else if (manifest.assetCount < assets.length) {

    issues.push(
      createManifestIssue({
        code:
          'manifest-asset-count-partial',
        severity:
          'warning',
        message:
          'Manifest backup содержит не все asset files из списка ссылок; v1 не указывает, какие именно assets были скопированы.'
      })
    );
  }

  assets.forEach((asset, index) => {

    if (
      !asset ||
      typeof asset !== 'object' ||
      Array.isArray(
        asset
      )
    ) {

      issues.push(
        createManifestIssue({
          code:
            'manifest-asset-entry-invalid',
          severity:
            'error',
          message:
            'Manifest backup содержит некорректную запись asset.',
          path:
            `assets[${index}]`
        })
      );

      return;
    }

    if (
      !isSafeBackupAssetPath(
        asset.path
      )
    ) {

      issues.push(
        createManifestIssue({
          code:
            'asset-path-unsafe',
          severity:
            'error',
          message:
            'Manifest backup содержит небезопасный путь asset.',
          path:
            String(asset.path || `assets[${index}]`)
        })
      );
    }
  });
}


function validateManifestCount({
  issues,
  value,
  expected,
  invalidCode,
  mismatchCode,
  invalidMessage,
  mismatchMessage
}) {

  if (
    !Number.isInteger(
      value
    ) ||
    value < 0
  ) {

    issues.push(
      createManifestIssue({
        code:
          invalidCode,
        severity:
          'error',
        message:
          invalidMessage
      })
    );

    return;
  }

  if (value !== expected) {

    issues.push(
      createManifestIssue({
        code:
          mismatchCode,
        severity:
          'error',
        message:
          mismatchMessage
      })
    );
  }
}


async function validateBackupManifestFiles({
  storageAdapter,
  snapshotPath,
  manifest,
  issues
}) {

  if (!manifest || typeof manifest !== 'object') return;

  const pages =
    Array.isArray(
      manifest.pages
    )
      ? manifest.pages
      : [];

  for (const page of pages) {

    if (
      !page ||
      !isSafeBackupPageFileName(
        page.name
      )
    ) continue;

    const exists =
      await canReadText(
        storageAdapter,
        `${snapshotPath}/${BACKUP_PAGES_DIR}/${page.name}`
      );

    if (!exists) {

      issues.push(
        createManifestIssue({
          code:
            'page-backup-file-missing',
          severity:
            'error',
          message:
            'Manifest backup ссылается на файл страницы, которого нет в backup.',
          path:
            `${BACKUP_PAGES_DIR}/${page.name}`
        })
      );
    }
  }

  const assets =
    Array.isArray(
      manifest.assets
    )
      ? manifest.assets
      : [];

  const expectsEveryAssetFile =
    Number.isInteger(
      manifest.assetCount
    ) &&
    manifest.assetCount === assets.length;

  for (const asset of assets) {

    if (
      !asset ||
      !isSafeBackupAssetPath(
        asset.path
      )
    ) continue;

    const normalizedPath =
      normalizeAssetPath(
        asset.path
      );

    const exists =
      await canReadBinary(
        storageAdapter,
        `${snapshotPath}/${BACKUP_ASSETS_DIR}/${normalizedPath}`
      );

    if (!exists) {

      issues.push(
        createManifestIssue({
          code:
            'asset-backup-file-missing',
          severity:
            expectsEveryAssetFile
              ? 'error'
              : 'warning',
          message:
            expectsEveryAssetFile
              ? 'Manifest backup ссылается на asset file, которого нет в backup.'
              : 'Manifest backup не содержит один из asset files; v1 допускает это только как partial asset warning.',
          path:
            `${BACKUP_ASSETS_DIR}/${normalizedPath}`
        })
      );
    }
  }
}


function createBackupManifestValidationResult({
  manifest,
  issues
}) {

  const hasError =
    issues.some(issue =>
      issue.severity === 'error'
    );

  const hasWarning =
    issues.some(issue =>
      issue.severity === 'warning'
    );

  const status =
    hasError
      ? BACKUP_MANIFEST_VALIDATION_STATUS.INVALID
      : hasWarning
        ? BACKUP_MANIFEST_VALIDATION_STATUS.WARNING
        : BACKUP_MANIFEST_VALIDATION_STATUS.VALID;

  return {
    status,
    valid:
      status !== BACKUP_MANIFEST_VALIDATION_STATUS.INVALID,
    restoreBlocking:
      status === BACKUP_MANIFEST_VALIDATION_STATUS.INVALID,
    manifest,
    issues
  };
}


function createManifestIssue({
  code,
  severity,
  message,
  path = ''
}) {

  return {
    code,
    severity,
    restoreBlocking:
      severity === 'error',
    message,
    path
  };
}


function createBackupManifestValidationError(
  validation
) {

  const firstIssue =
    validation.issues[0];

  const error =
    new Error(
      firstIssue
        ? `Restore blocked: ${firstIssue.message}`
        : 'Restore blocked: backup manifest failed validation.'
    );

  error.validation =
    validation;

  return error;
}


function createRestoreIncompleteError({
  cause,
  backupId,
  stage,
  preRestoreBackupId,
  partial,
  restoredPages,
  restoredAssets,
  selectedPageNames = [],
  selectedAssetPaths = [],
  skippedAssetPaths = []
}) {

  const error =
    new Error(
      `${RESTORE_INCOMPLETE_MESSAGE} Recovery backup: ${preRestoreBackupId || 'unknown'}.`,
      {
        cause
      }
    );

  error.name =
    'RestoreIncompleteError';

  error.restoreIncomplete =
    true;

  error.backupId =
    backupId;

  error.preRestoreBackupId =
    preRestoreBackupId || null;

  error.stage =
    stage || 'unknown';

  error.partial =
    Boolean(
      partial
    );

  error.restoredPages =
    restoredPages;

  error.restoredAssets =
    restoredAssets;

  error.selectedPageNames =
    [
      ...selectedPageNames
    ];

  error.selectedAssetPaths =
    [
      ...selectedAssetPaths
    ];

  error.skippedAssetPaths =
    [
      ...skippedAssetPaths
    ];

  return error;
}


async function canReadText(
  storageAdapter,
  path
) {

  try {

    await storageAdapter.readText(
      path
    );

    return true;

  } catch {

    return false;
  }
}


async function canReadBinary(
  storageAdapter,
  path
) {

  try {

    await storageAdapter.readBinary(
      path
    );

    return true;

  } catch {

    return false;
  }
}


function isSafeBackupPageFileName(
  name
) {

  if (typeof name !== 'string') return false;

  const normalized =
    normalizeWorkspacePath(
      name
    );

  if (
    !normalized ||
    normalized !== name ||
    normalized.includes('/') ||
    normalized.includes('\0') ||
    /^[a-zA-Z]:/.test(
      normalized
    )
  ) return false;

  const segments =
    normalized.split('/');

  return segments.every(segment =>
    segment &&
    segment !== '.' &&
    segment !== '..'
  );
}


function isSafeBackupAssetPath(
  path
) {

  if (typeof path !== 'string') return false;

  if (
    path.startsWith('/') ||
    path.startsWith('\\') ||
    path.includes('\0') ||
    /^[a-zA-Z]:/.test(
      path
    )
  ) return false;

  const normalized =
    normalizeAssetPath(
      path
    );

  if (!normalized) return false;

  const segments =
    normalized.split('/');

  return segments.every(segment =>
    segment &&
    segment !== '.' &&
    segment !== '..'
  );
}


async function collectDirectoryStats(
  storageAdapter,
  path
) {

  const stats =
    {
      fileCount: 0,
      directoryCount: 0,
      sizeBytes: 0,
      sizeUnknown: false
    };

  await collectDirectoryStatsInto(
    storageAdapter,
    path,
    stats
  );

  return stats;
}


async function collectDirectoryStatsInto(
  storageAdapter,
  path,
  stats
) {

  let entries;

  try {

    entries =
      await storageAdapter.listFiles(
        path
      );

  } catch {

    stats.sizeUnknown =
      true;

    return;
  }

  for (const entry of entries) {

    const childPath =
      `${path}/${entry.name}`;

    if (entry.kind === 'directory') {

      stats.directoryCount += 1;

      await collectDirectoryStatsInto(
        storageAdapter,
        childPath,
        stats
      );

      continue;
    }

    stats.fileCount += 1;

    stats.sizeBytes +=
      await readFileSize(
        storageAdapter,
        childPath
      );
  }
}


async function readFileSize(
  storageAdapter,
  path
) {

  try {

    const text =
      await storageAdapter.readText(
        path
      );

    return new TextEncoder()
      .encode(
        text
      )
      .byteLength;

  } catch {

    try {

      const buffer =
        await storageAdapter.readBinary(
          path
        );

      return buffer?.byteLength || 0;

    } catch {

      return 0;
    }
  }
}


function getBackupPageFileName(
  page
) {

  return page?.name ||
    `${page?.id || crypto.randomUUID()}.md`;
}


async function readPageBackupContent(
  page,
  storageAdapter
) {

  if (typeof page?.content === 'string') {

    return page.content;
  }

  if (page?.path) {

    return storageAdapter.readText(
      page.path
    );
  }

  if (page?.handle?.getFile) {

    const file =
      await page.handle.getFile();

    return file.text();
  }

  return '';
}


async function copyAssetsToBackup({
  storageAdapter,
  snapshotPath,
  assetReferences,
  onProgress = null
}) {

  let copied =
    0;

  for (
    let index = 0;
    index < assetReferences.length;
    index += 1
  ) {

    const reference =
      assetReferences[index];

    if (!reference?.path) continue;

    try {

      const normalizedPath =
        normalizeAssetPath(
          reference.path
        );

      const buffer =
        await storageAdapter.readBinary(
          `assets/${normalizedPath}`
        );

      await storageAdapter.writeBinary(
        `${snapshotPath}/${BACKUP_ASSETS_DIR}/${normalizedPath}`,
        buffer
      );

      copied += 1;

      onProgress?.({
        label: 'Backup',
        stage: 'assets',
        current: index + 1,
        total: assetReferences.length
      });

    } catch (error) {

      console.warn(
        'Не удалось добавить asset в backup.',
        reference.path,
        error
      );
    }
  }

  return copied;
}


async function restoreBackupAssets({
  storageAdapter,
  assets = null,
  assetContentByPath = null,
  verifyReadback = false,
  onProgress = null
}) {

  let restored =
    0;

  const restoreAssets =
    assets || [];

  for (
    let index = 0;
    index < restoreAssets.length;
    index += 1
  ) {

    const reference =
      restoreAssets[index];

    if (!reference?.path) continue;

    const normalizedPath =
      normalizeAssetPath(
        reference.path
      );

    if (
      !assetContentByPath?.has(
        normalizedPath
      )
    ) {

      throw new Error(
        `Restore blocked: preflighted asset bytes are missing: assets/${normalizedPath}`
      );
    }

    const buffer =
      assetContentByPath.get(
        normalizedPath
      );

    await storageAdapter.writeBinary(
      `assets/${normalizedPath}`,
      buffer
    );
    if (verifyReadback && await backupBytesDigest(await storageAdapter.readBinary(`assets/${normalizedPath}`)) !== await backupBytesDigest(buffer)) throw new Error('Recovery asset readback mismatch');

    restored += 1;

    onProgress?.({
      label: 'Restore',
      stage: 'assets',
      current: index + 1,
      total: restoreAssets.length
    });
  }

  return restored;
}


function reportProgress(
  options,
  progress
) {

  if (typeof options?.onProgress !== 'function') return;

  if (!options.__progressStartedAt) {

    options.__progressStartedAt =
      Date.now();
  }

  options.onProgress(
    {
      ...progress,
      elapsedMs:
        progress.elapsedMs ??
        Date.now() - options.__progressStartedAt
    }
  );
}


function normalizeAssetPath(
  path
) {

  return normalizeWorkspacePath(
    path
  )
    .replace(/^assets\//, '');
}


function getBackupStorageAdapter({
  storageAdapter = null,
  workspaceHandle = null
} = {}) {

  const adapter =
    storageAdapter || getStorageAdapter();

  if (
    adapter.kind === 'browser' &&
    workspaceHandle &&
    adapter.setWorkspaceHandle
  ) {

    adapter.setWorkspaceHandle(
      workspaceHandle
    );
  }


  const hasWorkspace =
    adapter.kind === 'desktop'
      ? Boolean(adapter.getWorkspaceRoot?.())
      : Boolean(adapter.getWorkspaceHandle?.());

  if (!hasWorkspace) {

    throw new Error(
      'Workspace не выбран, backup невозможен.'
    );
  }

  return adapter;
}


function isStorageAdapter(
  value
) {

  return Boolean(
    value &&
    typeof value.readText === 'function' &&
    typeof value.writeText === 'function' &&
    typeof value.listFiles === 'function'
  );
}
