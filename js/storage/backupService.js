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


export const BACKUP_ROOT_DIR =
  '.my-own-world-backups';

export const BACKUP_PAGES_DIR =
  'pages';

export const BACKUP_ASSETS_DIR =
  'assets';

export const BACKUP_DEFAULT_RETENTION =
  20;


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

  const storageAdapter =
    getBackupStorageAdapter(
      options
    );

  const pages =
    options.pages || state.pages || [];

  const assetReferences =
    options.assetReferences ||
    collectAssetReferencesFromPages(
      pages
    );

  const reason =
    options.reason || 'manual';

  const id =
    options.id || createBackupId(
      reason
    );

  const snapshotPath =
    `${BACKUP_ROOT_DIR}/${id}`;

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

  for (const page of pages) {

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
  }

  const copiedAssets =
    await copyAssetsToBackup({
      storageAdapter,
      snapshotPath,
      assetReferences
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
        options.keepLatest ?? BACKUP_DEFAULT_RETENTION
    });
  }

  return manifest;
}


export async function createWorkspaceBackupBeforeRiskyOperation(
  reason
) {

  try {

    return await createWorkspaceBackup({
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

  for (const page of manifest.pages || []) {

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
  }

  const restoredAssets =
    await restoreBackupAssets({
      storageAdapter,
      snapshotPath,
      manifest
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
  keepLatest = BACKUP_DEFAULT_RETENTION
} = {}) {

  const adapter =
    getBackupStorageAdapter({
      storageAdapter,
      workspaceHandle
    });

  if (!Number.isFinite(keepLatest) || keepLatest < 1) {

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

  for (const backup of toRemove) {

    try {

      await adapter.removeDirectory(
        `${BACKUP_ROOT_DIR}/${backup.id}`
      );

      removed += 1;

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
  assetReferences
}) {

  let copied =
    0;

  for (const reference of assetReferences) {

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
  manifest
}) {

  let restored =
    0;

  for (const reference of manifest.assets || []) {

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

  if (
    adapter.kind === 'browser' &&
    !adapter.getWorkspaceHandle?.()
  ) {

    const handle =
      state.workspaceHandle;

    if (handle && adapter.setWorkspaceHandle) {

      adapter.setWorkspaceHandle(
        handle
      );
    }
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
