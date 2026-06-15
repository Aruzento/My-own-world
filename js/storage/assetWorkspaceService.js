import {
  getStorageAdapter
} from './storageAdapter.js';


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
