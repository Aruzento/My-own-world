import {
  getStorageAdapter
} from './storageAdapter.js';
import { getAllPages } from '../repository/pageRepository.js';
import { assertLegacyPortability, assertLegacyBackupCatalog } from './structuredPagePolicy.js';


export async function listWorkspaceAssetPaths(
  options = {}
) {

  if (options.listAssetPaths) {

    return options.listAssetPaths();
  }

  const adapter =
    options.storageAdapter ||
    getStorageAdapter();

  return listWorkspaceFilesRecursively(
    adapter,
    'assets'
  );
}


export async function deleteWorkspaceAssetPath(
  path,
  options = {}
) {

  // Старый orphan preview не является разрешением удалять assets нового envelope.
  (options.pages || getAllPages()).forEach(page => assertLegacyPortability(page, 'Asset deletion'));
  await assertLegacyBackupCatalog(options.storageAdapter || getStorageAdapter());

  if (options.deleteAssetPath) {

    await options.deleteAssetPath(
      path
    );

    return;
  }

  const adapter =
    options.storageAdapter ||
    getStorageAdapter();

  await adapter.removeFile(
    path
  );
}


export async function listWorkspaceFilesRecursively(
  adapter,
  rootPath
) {

  const result =
    [];

  await walkDirectory(
    adapter,
    rootPath,
    result
  );

  return result;
}


async function walkDirectory(
  adapter,
  directoryPath,
  result
) {

  let entries =
    [];

  try {

    entries =
      await adapter.listFiles(
        directoryPath
      );

  } catch (error) {

    if (directoryPath === 'assets') {

      return;
    }

    throw error;
  }

  for (const entry of entries) {

    const entryPath =
      `${directoryPath}/${entry.name}`;

    if (entry.kind === 'directory') {

      await walkDirectory(
        adapter,
        entryPath,
        result
      );

      continue;
    }

    result.push(
      entryPath
    );
  }
}
