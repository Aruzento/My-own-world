import {
  BACKUP_ASSETS_DIR,
  BACKUP_PAGES_DIR,
  BACKUP_ROOT_DIR
} from './backupService.js';

import {
  getStorageAdapter
} from './storageAdapter.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';


export async function buildWorkspaceRestorePreview(
  backupId,
  options = {}
) {

  const storageAdapter =
    options.storageAdapter ||
    getStorageAdapter();

  const snapshotPath =
    `${BACKUP_ROOT_DIR}/${backupId}`;

  const manifestResult =
    await readPreviewManifest(
      storageAdapter,
      snapshotPath
    );

  if (!manifestResult.ok) {

    return createBlockedPreview({
      backupId,
      issue: {
        code:
          'manifest-unreadable',
        message:
          'Manifest backup не найден или поврежден.',
        details:
          manifestResult.error?.message || ''
      }
    });
  }

  const manifest =
    manifestResult.manifest;

  const pages =
    await collectPreviewPages({
      storageAdapter,
      snapshotPath,
      manifest
    });

  const assets =
    await collectPreviewAssets({
      storageAdapter,
      snapshotPath,
      manifest
    });

  const issues =
    [
      ...pages.issues,
      ...assets.issues
    ];

  return {
    backupId,
    status:
      issues.length > 0
        ? 'blocked'
        : 'ready',
    blocked:
      issues.length > 0,
    message:
      issues.length > 0
        ? 'Предпросмотр заблокирован: backup поврежден или неполный.'
        : 'Предпросмотр готов. Изменения еще не применялись.',
    manifest:
      createPreviewManifestSummary(
        manifest
      ),
    pages:
      pages.items,
    assets:
      assets.items,
    summary:
      createPreviewSummary(
        pages.items,
        assets.items,
        issues
      ),
    issues
  };
}


async function collectPreviewPages({
  storageAdapter,
  snapshotPath,
  manifest
}) {

  const items =
    [];

  const issues =
    [];

  const pages =
    Array.isArray(manifest.pages)
      ? manifest.pages
      : [];

  for (const page of pages) {

    const name =
      page?.name || '';

    const item =
      {
        id:
          page?.id || '',
        title:
          page?.title || name || 'Без названия',
        name,
        path:
          name
            ? `pages/${name}`
            : '',
        status:
          'unknown',
        backupReadable:
          false,
        currentExists:
          false,
        message:
          ''
      };

    if (!name) {

      item.status =
        'backup-entry-invalid';

      item.message =
        'Запись страницы в manifest не содержит имя файла.';

      issues.push({
        code:
          'page-entry-invalid',
        message:
          item.message,
        page:
          item
      });

      items.push(
        item
      );

      continue;
    }

    const backupContent =
      await readTextResult(
        storageAdapter,
        `${snapshotPath}/${BACKUP_PAGES_DIR}/${name}`
      );

    if (!backupContent.ok) {

      item.status =
        'backup-file-missing';

      item.message =
        'Файл страницы отсутствует в backup.';

      issues.push({
        code:
          'page-backup-file-missing',
        message:
          item.message,
        page:
          item,
        details:
          backupContent.error?.message || ''
      });

      items.push(
        item
      );

      continue;
    }

    item.backupReadable =
      true;

    const currentContent =
      await readTextResult(
        storageAdapter,
        `pages/${name}`
      );

    item.currentExists =
      currentContent.ok;

    if (!currentContent.ok) {

      item.status =
        'would-add';

      item.message =
        'Страница будет добавлена из backup.';

    } else if (
      currentContent.value === backupContent.value
    ) {

      item.status =
        'unchanged';

      item.message =
        'Содержимое совпадает, запись не изменится.';

    } else {

      item.status =
        'would-replace';

      item.message =
        'Текущий файл будет заменен содержимым из backup.';
    }

    items.push(
      item
    );
  }

  return {
    items,
    issues
  };
}


async function collectPreviewAssets({
  storageAdapter,
  snapshotPath,
  manifest
}) {

  const items =
    [];

  const issues =
    [];

  const assets =
    Array.isArray(manifest.assets)
      ? manifest.assets
      : [];

  for (const asset of assets) {

    const normalizedPath =
      normalizeAssetPath(
        asset?.path || ''
      );

    const item =
      {
        id:
          asset?.id || '',
        path:
          normalizedPath
            ? `assets/${normalizedPath}`
            : '',
        type:
          asset?.type || '',
        status:
          'unknown',
        backupAvailable:
          false,
        currentExists:
          false,
        message:
          ''
      };

    if (!normalizedPath) {

      item.status =
        'backup-entry-invalid';

      item.message =
        'Asset entry в manifest не содержит путь.';

      issues.push({
        code:
          'asset-entry-invalid',
        message:
          item.message,
        asset:
          item
      });

      items.push(
        item
      );

      continue;
    }

    const backupBytes =
      await readBinaryResult(
        storageAdapter,
        `${snapshotPath}/${BACKUP_ASSETS_DIR}/${normalizedPath}`
      );

    if (!backupBytes.ok) {

      item.status =
        'backup-file-missing';

      item.message =
        'Файл asset отсутствует в backup.';

      issues.push({
        code:
          'asset-backup-file-missing',
        message:
          item.message,
        asset:
          item,
        details:
          backupBytes.error?.message || ''
      });

      items.push(
        item
      );

      continue;
    }

    item.backupAvailable =
      true;

    const currentBytes =
      await readBinaryResult(
        storageAdapter,
        `assets/${normalizedPath}`
      );

    item.currentExists =
      currentBytes.ok;

    if (!currentBytes.ok) {

      item.status =
        'would-add';

      item.message =
        'Asset будет добавлен из backup.';

    } else if (
      buffersEqual(
        backupBytes.value,
        currentBytes.value
      )
    ) {

      item.status =
        'unchanged';

      item.message =
        'Asset уже совпадает с backup.';

    } else {

      item.status =
        'would-replace';

      item.message =
        'Текущий asset будет заменен файлом из backup.';
    }

    items.push(
      item
    );
  }

  return {
    items,
    issues
  };
}


function createBlockedPreview({
  backupId,
  issue
}) {

  return {
    backupId,
    status:
      'blocked',
    blocked:
      true,
    message:
      'Предпросмотр заблокирован: backup поврежден или неполный.',
    manifest:
      null,
    pages:
      [],
    assets:
      [],
    summary:
      {
        pages: {
          total:
            0,
          wouldAdd:
            0,
          wouldReplace:
            0,
          unchanged:
            0,
          backupProblems:
            1
        },
        assets: {
          total:
            0,
          wouldAdd:
            0,
          wouldReplace:
            0,
          unchanged:
            0,
          currentPresent:
            0,
          currentMissing:
            0,
          backupAvailable:
            0,
          backupProblems:
            0
        },
        issueCount:
          1
      },
    issues:
      [
        issue
      ]
  };
}


function createPreviewManifestSummary(
  manifest
) {

  return {
    id:
      manifest.id || '',
    reason:
      manifest.reason || '',
    createdAt:
      manifest.createdAt || '',
    pageCount:
      Number(manifest.pageCount || 0),
    assetCount:
      Number(manifest.assetCount || 0)
  };
}


function createPreviewSummary(
  pages,
  assets,
  issues
) {

  return {
    pages: {
      total:
        pages.length,
      wouldAdd:
        countStatus(
          pages,
          'would-add'
        ),
      wouldReplace:
        countStatus(
          pages,
          'would-replace'
        ),
      unchanged:
        countStatus(
          pages,
          'unchanged'
        ),
      backupProblems:
        countStatus(
          pages,
          'backup-file-missing'
        ) +
        countStatus(
          pages,
          'backup-entry-invalid'
        )
    },
    assets: {
      total:
        assets.length,
      wouldAdd:
        countStatus(
          assets,
          'would-add'
        ),
      wouldReplace:
        countStatus(
          assets,
          'would-replace'
        ),
      unchanged:
        countStatus(
          assets,
          'unchanged'
        ),
      currentPresent:
        assets.filter(asset =>
          asset.currentExists
        ).length,
      currentMissing:
        assets.filter(asset =>
          asset.backupAvailable &&
          !asset.currentExists
        ).length,
      backupAvailable:
        assets.filter(asset =>
          asset.backupAvailable
        ).length,
      backupProblems:
        countStatus(
          assets,
          'backup-file-missing'
        ) +
        countStatus(
          assets,
          'backup-entry-invalid'
        )
    },
    issueCount:
      issues.length
  };
}


async function readPreviewManifest(
  storageAdapter,
  snapshotPath
) {

  try {

    return {
      ok:
        true,
      manifest:
        JSON.parse(
          await storageAdapter.readText(
            `${snapshotPath}/manifest.json`
          )
        )
    };

  } catch (error) {

    return {
      ok:
        false,
      error
    };
  }
}


async function readTextResult(
  storageAdapter,
  path
) {

  try {

    return {
      ok:
        true,
      value:
        await storageAdapter.readText(
          path
        )
    };

  } catch (error) {

    return {
      ok:
        false,
      error
    };
  }
}


async function readBinaryResult(
  storageAdapter,
  path
) {

  try {

    return {
      ok:
        true,
      value:
        await storageAdapter.readBinary(
          path
        )
    };

  } catch (error) {

    return {
      ok:
        false,
      error
    };
  }
}


function normalizeAssetPath(
  path
) {

  return normalizeWorkspacePath(
    path
  ).replace(
    /^assets\//,
    ''
  );
}


function buffersEqual(
  a,
  b
) {

  const first =
    new Uint8Array(
      a
    );

  const second =
    new Uint8Array(
      b
    );

  if (first.byteLength !== second.byteLength) return false;

  for (
    let index = 0;
    index < first.byteLength;
    index += 1
  ) {

    if (first[index] !== second[index]) return false;
  }

  return true;
}


function countStatus(
  items,
  status
) {

  return items.filter(item =>
    item.status === status
  ).length;
}
