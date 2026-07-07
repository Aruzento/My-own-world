import {
  normalizeWorkspacePath
} from '../storage/storageAdapterContract.js';

import {
  createSafeWorldPackageId,
  normalizeWorldPackageData
} from './worldPackageModel.js';


export const WORLD_PACKAGE_DIRECTORY =
  'world-packages';

export const WORLD_PACKAGE_EXTENSION =
  '.world-package.json';


export async function ensureWorldPackageDirectory(
  storageAdapter
) {

  await storageAdapter.ensureDirectory(
    WORLD_PACKAGE_DIRECTORY
  );
}


export async function saveWorldPackageFile(
  storageAdapter,
  packageId,
  packageData
) {

  await ensureWorldPackageDirectory(
    storageAdapter
  );

  const path =
    createWorldPackagePath(
      packageId ||
      packageData?.packageId
    );

  await storageAdapter.writeText(
    path,
    JSON.stringify(
      normalizeWorldPackageData(
        packageData
      ),
      null,
      2
    )
  );

  return path;
}


export async function loadWorldPackageFile(
  storageAdapter,
  packageId
) {

  const raw =
    await storageAdapter.readText(
      createWorldPackagePath(
        packageId
      )
    );

  return normalizeWorldPackageData(
    JSON.parse(
      raw
    )
  );
}


export async function listWorldPackageFiles(
  storageAdapter
) {

  try {

    await ensureWorldPackageDirectory(
      storageAdapter
    );

    const entries =
      await storageAdapter.listFiles(
        WORLD_PACKAGE_DIRECTORY
      );

    return entries
      .filter(entry =>
        entry.kind === 'file' &&
        entry.name.endsWith(
          WORLD_PACKAGE_EXTENSION
        )
      )
      .map(entry => ({
        id:
          entry.name.slice(
            0,
            -WORLD_PACKAGE_EXTENSION.length
          ),
        name:
          entry.name,
        path:
          normalizeWorkspacePath(
            `${WORLD_PACKAGE_DIRECTORY}/${entry.name}`
          )
      }));

  } catch {

    return [];
  }
}


export async function removeWorldPackageFile(
  storageAdapter,
  packageId
) {

  await storageAdapter.removeFile(
    createWorldPackagePath(
      packageId
    )
  );
}


export function createWorldPackagePath(
  packageId
) {

  return normalizeWorkspacePath(
    `${WORLD_PACKAGE_DIRECTORY}/${createSafeWorldPackageId(packageId)}${WORLD_PACKAGE_EXTENSION}`
  );
}
