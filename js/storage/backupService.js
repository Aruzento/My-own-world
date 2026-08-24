import {
  state
} from '../state.js';

import {
  collectAssetReferencesFromPages
} from './assetReferenceScanner.js';

import {
  getStorageAdapter
} from './storageAdapter.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';

import {
  measureWorkspaceOperation
} from '../performance/workspacePerformance.js';


export const BACKUP_ROOT_DIR =
  '.my-own-world-backups';

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

  const pages =
    options.pages || state.pages || [];

  const includeAssets =
    options.includeAssets !== false;

  const assetReferences =
    includeAssets
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

  for (
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
  }

  const copiedAssets =
    await copyAssetsToBackup({
      storageAdapter,
      snapshotPath,
      assetReferences,
      onProgress:
        progress => reportProgress(
          options,
          progress
        )
    });

  manifest.assetCount =
    copiedAssets;

  await storageAdapter.writeText(
    `${snapshotPath}/manifest.json`,
    JSON.stringify(
      manifest,
      null,
      2
    )
  );

  if (options.cleanup !== false) {

    await cleanupWorkspaceBackups({
      storageAdapter,
      keepLatest:
        options.keepLatest ?? getBackupRetentionLimit()
    });
  }

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

    if (!backup) {

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

  const restorePlan =
    await createRestoreWritePlan({
      storageAdapter,
      snapshotPath,
      manifest,
      restoreSelection:
        options.restoreSelection
    });

  const preRestoreManifest =
    await createAndVerifyPreRestoreBackup({
      storageAdapter,
      options
    });

  await storageAdapter.ensureDirectory(
    'pages'
  );

  let restoredPages =
    0;

  const pages =
    restorePlan.pages;

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
      restorePlan.pageContentByName?.get(
        fileName
      ) ??
      await storageAdapter.readText(
        `${snapshotPath}/${BACKUP_PAGES_DIR}/${fileName}`
      );

    await storageAdapter.writeText(
      `pages/${fileName}`,
      content
    );

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

  const restoredAssets =
    await restoreBackupAssets({
      storageAdapter,
      snapshotPath,
      manifest,
      assets:
        restorePlan.assets,
      assetContentByPath:
        restorePlan.assetContentByPath,
      onProgress:
        progress => reportProgress(
          options,
          progress
        )
    });

  return {
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
    unresolvedAssetReferences:
      restorePlan.unresolvedAssetReferences
  };
}


async function createRestoreWritePlan({
  storageAdapter,
  snapshotPath,
  manifest,
  restoreSelection = null
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

    return {
      partial:
        false,
      pages,
      assets,
      pageContentByName:
        null,
      assetContentByPath:
        null,
      selectedPageNames:
        pages
          .map(page => page.name)
          .filter(Boolean),
      selectedAssetPaths:
        assets
          .map(asset => normalizeAssetPath(asset.path || ''))
          .filter(Boolean),
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
    await preflightSelectedBackupPages({
      storageAdapter,
      snapshotPath,
      pages:
        selectedPages
    });

  const selectedAssetPlan =
    await preflightSelectedBackupAssets({
      storageAdapter,
      snapshotPath,
      manifestAssets:
        assets,
      selectedPages,
      pageContentByName
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
      pageNamesInput
        .map(normalizeSelectedPageName)
        .filter(Boolean)
    );

  const pageIds =
    new Set(
      pageIdsInput
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


async function preflightSelectedBackupPages({
  storageAdapter,
  snapshotPath,
  pages
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

    } catch (error) {

      throw new Error(
        `Partial restore blocked: selected backup page file is unavailable: ${fileName}`,
        {
          cause:
            error
        }
      );
    }
  }

  return pageContentByName;
}


async function preflightSelectedBackupAssets({
  storageAdapter,
  snapshotPath,
  manifestAssets,
  selectedPages,
  pageContentByName
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
        }))
      )
        .map(reference =>
          normalizeAssetPath(
            reference.path || ''
          )
        )
        .filter(Boolean)
    );

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

  const assetContentByPath =
    new Map();

  for (const asset of assets) {

    const normalizedPath =
      normalizeAssetPath(
        asset.path || ''
      );

    try {

      assetContentByPath.set(
        normalizedPath,
        await storageAdapter.readBinary(
          `${snapshotPath}/${BACKUP_ASSETS_DIR}/${normalizedPath}`
        )
      );

    } catch (error) {

      throw new Error(
        `Partial restore blocked: selected backup asset is unavailable: assets/${normalizedPath}`,
        {
          cause:
            error
        }
      );
    }
  }

  return {
    assets,
    assetContentByPath,
    unresolvedAssetReferences
  };
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

  const verified =
    await readAndValidateBackupManifest(
      storageAdapter,
      `${BACKUP_ROOT_DIR}/${manifest.id}`,
      {
        backupId:
          manifest.id
      }
    );

  if (
    verified.restoreBlocking ||
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

  let removed =
    0;

  for (
    let index = 0;
    index < toRemove.length;
    index += 1
  ) {

    const backup =
      toRemove[index];

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

  if (manifest.version !== BACKUP_MANIFEST_SUPPORTED_VERSION) {

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
  snapshotPath,
  manifest,
  assets = null,
  assetContentByPath = null,
  onProgress = null
}) {

  let restored =
    0;

  const restoreAssets =
    assets ||
    manifest.assets || [];

  for (
    let index = 0;
    index < restoreAssets.length;
    index += 1
  ) {

    const reference =
      restoreAssets[index];

    if (!reference?.path) continue;

    try {

      const normalizedPath =
        normalizeAssetPath(
          reference.path
        );

      const buffer =
        assetContentByPath?.get(
          normalizedPath
        ) ??
        await storageAdapter.readBinary(
          `${snapshotPath}/${BACKUP_ASSETS_DIR}/${normalizedPath}`
        );

      await storageAdapter.writeBinary(
        `assets/${normalizedPath}`,
        buffer
      );

      restored += 1;

      onProgress?.({
        label: 'Restore',
        stage: 'assets',
        current: index + 1,
        total: restoreAssets.length
      });

    } catch (error) {

      console.warn(
        'Не удалось восстановить asset из backup.',
        reference.path,
        error
      );
    }
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
