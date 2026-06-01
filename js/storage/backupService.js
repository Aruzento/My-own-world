import {
  state
} from '../state.js';

import {
  writeTextFile
} from './writeQueue.js';

import {
  collectAssetReferencesFromPages
} from './assetReferenceScanner.js';


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
        id:
          reference.id || null,
        path:
          reference.path || '',
        type:
          reference.type || '',
        owner:
          reference.owner || null,
        fallback:
          reference.fallback || null
      })),
    pages: pageRecords
  };
}


export async function createWorkspaceBackup(
  options = {}
) {

  const workspaceHandle =
    options.workspaceHandle || state.workspaceHandle;

  if (!workspaceHandle) {

    throw new Error(
      'Workspace не выбран, backup невозможен.'
    );
  }

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

  const rootDir =
    await workspaceHandle.getDirectoryHandle(
      BACKUP_ROOT_DIR,
      {
        create: true
      }
    );

  const snapshotDir =
    await rootDir.getDirectoryHandle(
      id,
      {
        create: true
      }
    );

  const pagesDir =
    await snapshotDir.getDirectoryHandle(
      BACKUP_PAGES_DIR,
      {
        create: true
      }
    );

  const assetsDir =
    await snapshotDir.getDirectoryHandle(
      BACKUP_ASSETS_DIR,
      {
        create: true
      }
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

    const fileHandle =
      await pagesDir.getFileHandle(
        fileName,
        {
          create: true
        }
      );

    await writeTextFile(
      fileHandle,
      await readPageBackupContent(
        page
      ),
      `backup:${id}:${fileName}`
    );
  }

  const copiedAssets =
    await copyAssetsToBackup({
      workspaceHandle,
      backupAssetsDir: assetsDir,
      assetReferences,
      backupId: id
    });

  manifest.assetCount =
    copiedAssets;

  const manifestHandle =
    await snapshotDir.getFileHandle(
      'manifest.json',
      {
        create: true
      }
    );

  await writeTextFile(
    manifestHandle,
    JSON.stringify(
      manifest,
      null,
      2
    ),
    `backup:${id}:manifest`
  );

  if (options.cleanup !== false) {

    await cleanupWorkspaceBackups({
      workspaceHandle,
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
  workspaceHandle = state.workspaceHandle
) {

  if (!workspaceHandle) return [];

  let rootDir;

  try {

    rootDir =
      await workspaceHandle.getDirectoryHandle(
        BACKUP_ROOT_DIR
      );

  } catch (error) {

    return [];
  }

  const backups = [];

  for await (const entry of rootDir.values()) {

    if (entry.kind !== 'directory') continue;

    const manifest =
      await readBackupManifest(
        entry
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
  workspaceHandle = state.workspaceHandle
) {

  if (!workspaceHandle) {

    throw new Error(
      'Workspace не выбран, restore невозможен.'
    );
  }

  const rootDir =
    await workspaceHandle.getDirectoryHandle(
      BACKUP_ROOT_DIR
    );

  const snapshotDir =
    await rootDir.getDirectoryHandle(
      backupId
    );

  const manifest =
    await readBackupManifest(
      snapshotDir
    );

  if (!manifest) {

    throw new Error(
      'Manifest backup не найден или поврежден.'
    );
  }

  const backupPagesDir =
    await snapshotDir.getDirectoryHandle(
      BACKUP_PAGES_DIR
    );

  const workspacePagesDir =
    await workspaceHandle.getDirectoryHandle(
      'pages',
      {
        create: true
      }
    );

  let restoredPages =
    0;

  for (const page of manifest.pages || []) {

    const fileName =
      page.name;

    if (!fileName) continue;

    const backupPageHandle =
      await backupPagesDir.getFileHandle(
        fileName
      );

    const backupFile =
      await backupPageHandle.getFile();

    const content =
      await backupFile.text();

    const targetHandle =
      await workspacePagesDir.getFileHandle(
        fileName,
        {
          create: true
        }
      );

    await writeTextFile(
      targetHandle,
      content,
      `restore:${backupId}:${fileName}`
    );

    restoredPages += 1;
  }

  const restoredAssets =
    await restoreBackupAssets({
      workspaceHandle,
      snapshotDir,
      manifest,
      backupId
    });

  return {
    backupId,
    restoredPages,
    restoredAssets
  };
}


export async function cleanupWorkspaceBackups({
  workspaceHandle = state.workspaceHandle,
  keepLatest = BACKUP_DEFAULT_RETENTION
} = {}) {

  if (!workspaceHandle) return {
    removed: 0,
    kept: 0
  };

  if (!Number.isFinite(keepLatest) || keepLatest < 1) {

    throw new Error(
      'Нельзя очищать backup без хотя бы одной сохраняемой точки.'
    );
  }

  let rootDir;

  try {

    rootDir =
      await workspaceHandle.getDirectoryHandle(
        BACKUP_ROOT_DIR
      );

  } catch (error) {

    return {
      removed: 0,
      kept: 0
    };
  }

  const backups =
    await listWorkspaceBackups(
      workspaceHandle
    );

  const toRemove =
    backups.slice(
      keepLatest
    );

  let removed =
    0;

  for (const backup of toRemove) {

    try {

      await rootDir.removeEntry(
        backup.id,
        {
          recursive: true
        }
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
  snapshotDir
) {

  try {

    const manifestHandle =
      await snapshotDir.getFileHandle(
        'manifest.json'
      );

    const file =
      await manifestHandle.getFile();

    return JSON.parse(
      await file.text()
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
  page
) {

  if (typeof page?.content === 'string') {

    return page.content;
  }

  if (page?.handle?.getFile) {

    const file =
      await page.handle.getFile();

    return file.text();
  }

  return '';
}


async function copyAssetsToBackup({
  workspaceHandle,
  backupAssetsDir,
  assetReferences,
  backupId
}) {

  let copied =
    0;

  for (const reference of assetReferences) {

    if (!reference?.path) continue;

    try {

      const sourceHandle =
        await getWorkspaceAssetFileHandle(
          workspaceHandle,
          reference.path
        );

      const sourceFile =
        await sourceHandle.getFile();

      const targetHandle =
        await getNestedFileHandle(
          backupAssetsDir,
          normalizeBackupAssetPath(
            reference.path
          ),
          {
            create: true
          }
        );

      await writeFileFromBlob(
        targetHandle,
        sourceFile,
        `backup:${backupId}:asset:${reference.path}`
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
  workspaceHandle,
  snapshotDir,
  manifest,
  backupId
}) {

  let backupAssetsDir;

  try {

    backupAssetsDir =
      await snapshotDir.getDirectoryHandle(
        BACKUP_ASSETS_DIR
      );

  } catch (error) {

    return 0;
  }

  const assetsDir =
    await workspaceHandle.getDirectoryHandle(
      'assets',
      {
        create: true
      }
    );

  let restored =
    0;

  for (const reference of manifest.assets || []) {

    if (!reference?.path) continue;

    try {

      const backupAssetHandle =
        await getNestedFileHandle(
          backupAssetsDir,
          normalizeBackupAssetPath(
            reference.path
          )
        );

      const backupFile =
        await backupAssetHandle.getFile();

      const targetHandle =
        await getNestedFileHandle(
          assetsDir,
          normalizeWorkspaceAssetPath(
            reference.path
          ),
          {
            create: true
          }
        );

      await writeFileFromBlob(
        targetHandle,
        backupFile,
        `restore:${backupId}:asset:${reference.path}`
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


async function getWorkspaceAssetFileHandle(
  workspaceHandle,
  assetPath
) {

  const assetsDir =
    await workspaceHandle.getDirectoryHandle(
      'assets'
    );

  return getNestedFileHandle(
    assetsDir,
    normalizeWorkspaceAssetPath(
      assetPath
    )
  );
}


async function getNestedFileHandle(
  rootDir,
  path,
  options = {}
) {

  const parts =
    String(path || '')
      .split('/')
      .filter(Boolean);

  if (parts.length === 0) {

    throw new Error(
      'Пустой путь файла.'
    );
  }

  let currentDir =
    rootDir;

  for (const part of parts.slice(0, -1)) {

    currentDir =
      await currentDir.getDirectoryHandle(
        part,
        {
          create:
            Boolean(options.create)
        }
      );
  }

  return currentDir.getFileHandle(
    parts.at(-1),
    options
  );
}


function normalizeWorkspaceAssetPath(
  path
) {

  const normalized =
    normalizeBackupAssetPath(
      path
    );

  return normalized.startsWith('assets/')
    ? normalized.slice('assets/'.length)
    : normalized;
}


function normalizeBackupAssetPath(
  path
) {

  return String(path || '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\.\.(\/|$)/g, '')
    .replace(/^assets\//, '');
}


async function writeFileFromBlob(
  handle,
  file,
  key
) {

  const buffer =
    file?.arrayBuffer
      ? await file.arrayBuffer()
      : new TextEncoder().encode(
        await file.text()
      ).buffer;

  await writeBinaryFile(
    handle,
    buffer,
    key
  );
}


async function writeBinaryFile(
  handle,
  buffer,
  key
) {

  const writable =
    await handle.createWritable();

  await writable.write(
    buffer
  );

  await writable.close();
}
