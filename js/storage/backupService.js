import {
  state
} from '../state.js';

import {
  writeTextFile
} from './writeQueue.js';


export const BACKUP_ROOT_DIR =
  '.my-own-world-backups';

export const BACKUP_PAGES_DIR =
  'pages';


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

  const manifest =
    createBackupManifest({
      id,
      reason,
      pages
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

  return {
    backupId,
    restoredPages
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
