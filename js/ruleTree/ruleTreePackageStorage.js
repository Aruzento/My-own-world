import {
  normalizeWorkspacePath
} from '../storage/storageAdapterContract.js';

import {
  normalizeRuleTreeData
} from './ruleTreeNormalize.js';


export const RULE_TREE_PACKAGE_DIRECTORY =
  'rule-packages';

export const RULE_TREE_PACKAGE_EXTENSION =
  '.rule-package.json';


// Package storage хранит переносимые наборы правил как workspace-файлы.
// UI может быть разным, но формат и путь должны оставаться едиными.

export async function ensureRulePackageDirectory(
  storageAdapter
) {

  await storageAdapter.ensureDirectory(
    RULE_TREE_PACKAGE_DIRECTORY
  );
}


export async function saveRulePackageFile(
  storageAdapter,
  packageId,
  packageData
) {

  await ensureRulePackageDirectory(
    storageAdapter
  );

  const path =
    createRulePackagePath(
      packageId
    );

  await storageAdapter.writeText(
    path,
    JSON.stringify(
      normalizeRuleTreeData(
        packageData
      ),
      null,
      2
    )
  );

  return path;
}


export async function loadRulePackageFile(
  storageAdapter,
  packageId
) {

  const raw =
    await storageAdapter.readText(
      createRulePackagePath(
        packageId
      )
    );

  return normalizeRuleTreeData(
    JSON.parse(
      raw
    )
  );
}


export async function listRulePackageFiles(
  storageAdapter
) {

  try {

    await ensureRulePackageDirectory(
      storageAdapter
    );

    const entries =
      await storageAdapter.listFiles(
        RULE_TREE_PACKAGE_DIRECTORY
      );

    return entries
      .filter(entry =>
        entry.kind === 'file' &&
        entry.name.endsWith(
          RULE_TREE_PACKAGE_EXTENSION
        )
      )
      .map(entry => ({
        id:
          entry.name.slice(
            0,
            -RULE_TREE_PACKAGE_EXTENSION.length
          ),
        name:
          entry.name,
        path:
          normalizeWorkspacePath(
            `${RULE_TREE_PACKAGE_DIRECTORY}/${entry.name}`
          )
      }));

  } catch {

    return [];
  }
}


export async function removeRulePackageFile(
  storageAdapter,
  packageId
) {

  await storageAdapter.removeFile(
    createRulePackagePath(
      packageId
    )
  );
}


export function createRulePackagePath(
  packageId
) {

  return normalizeWorkspacePath(
    `${RULE_TREE_PACKAGE_DIRECTORY}/${createSafePackageId(packageId)}${RULE_TREE_PACKAGE_EXTENSION}`
  );
}


function createSafePackageId(
  packageId
) {

  return String(packageId || 'rules')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё-]+/giu, '-')
    .replace(/^-+|-+$/g, '') ||
    'rules';
}
