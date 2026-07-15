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

  const manifest =
    await readBackupManifest(
      storageAdapter,
      snapshotPath
    );

  if (!manifest) {

    throw new Error(
      'Manifest backup не найден или поврежден.'
    );
  }

  await storageAdapter.ensureDirectory(
    'pages'
  );

  let restoredPages =
    0;

  const pages =
    manifest.pages || [];

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
      onProgress:
        progress => reportProgress(
          options,
          progress
        )
    });

  return {
    backupId,
    restoredPages,
    restoredAssets
  };
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


async function readBackupManifest(
  storageAdapter,
  snapshotPath
) {

  try {

    return JSON.parse(
      await storageAdapter.readText(
        `${snapshotPath}/manifest.json`
      )
    );

  } catch (error) {

    console.warn(
      'Не удалось прочитать manifest backup.',
      error
    );

    return null;
  }
}


async function readBackupManifestSilent(
  storageAdapter,
  snapshotPath
) {

  try {

    return JSON.parse(
      await storageAdapter.readText(
        `${snapshotPath}/manifest.json`
      )
    );

  } catch {

    return null;
  }
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
  onProgress = null
}) {

  let restored =
    0;

  const assets =
    manifest.assets || [];

  for (
    let index = 0;
    index < assets.length;
    index += 1
  ) {

    const reference =
      assets[index];

    if (!reference?.path) continue;

    try {

      const normalizedPath =
        normalizeAssetPath(
          reference.path
        );

      const buffer =
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
        total: assets.length
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
