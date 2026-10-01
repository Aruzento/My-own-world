import {
  getStorageAdapter
} from './storageAdapter.js';
import { getAllPages } from '../repository/pageRepository.js';
import { collectAssetReferencesFromPages } from './assetReferenceScanner.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from './cardTypeCatalogStorage.js';
import { normalizeAssetPath } from './assetReference.js';


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

  const active = options.storageAdapter || getStorageAdapter();
  const registry = createCardTypeRegistryFromCatalog((await readCardTypeCatalog({ storageAdapter: active })).catalog, { bundledTypes: [], bundledFieldSets: [] });
  const references = collectAssetReferencesFromPages(options.pages || getAllPages(), { registry });
  if (references.some(reference => reference.incomplete || normalizeAssetPath(reference.path) === normalizeAssetPath(path))) throw new Error('Asset deletion blocked: referenced or incomplete typed closure');

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
