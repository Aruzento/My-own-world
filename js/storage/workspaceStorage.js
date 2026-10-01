import {
  state
} from '../state.js';

import {
  setPages,
  setWorkspaceHandle
} from '../stateActions.js';

import {
  scanWorkspacePagesByAdapter
} from './pageStorage.js';

import {
  logWorkspaceValidationResult,
  validateWorkspaceSnapshot
} from '../schema/workspaceSchema.js';

import {
  createWorkspaceRecoveryReport
} from '../schema/schemaRecovery.js';

import {
  collectAssetReferencesFromPages
} from './assetReferenceScanner.js';

import {
  getStorageAdapter
} from './storageAdapter.js';

import {
  syncAssetAdapterWorkspaceRoot
} from './assetAdapter.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from './cardTypeCatalogStorage.js';
import { setPageRepositoryRegistry } from '../repository/pageRepository.js';


let workspaceLoadGeneration =
  0;


// Открывает workspace через активный storage adapter.
export async function openWorkspace() {

  try {

    const storageAdapter =
      getStorageAdapter();

    const handle =
      await storageAdapter.pickWorkspace();

    setWorkspaceHandle(
      handle
    );

    syncAssetAdapterWorkspaceRoot(
      storageAdapter.getWorkspaceRoot?.() ||
      handle
    );

    await ensureFolders();

    return true;

  } catch (err) {

    console.log(
      'Выбор папки отменен'
    );

    return false;
  }
}


// Восстанавливает последний workspace через активный storage adapter.
export async function restoreWorkspace() {

  const storageAdapter =
    getStorageAdapter();

  const handle =
    await storageAdapter.restoreWorkspace();

  if (!handle) return false;

  setWorkspaceHandle(
    handle
  );

  syncAssetAdapterWorkspaceRoot(
    storageAdapter.getWorkspaceRoot?.() ||
    handle
  );

  await ensureFolders();

  return true;
}


// Создает базовые папки workspace. Для browser это FileSystemHandle, для desktop - backend command.
async function ensureFolders() {

  const storageAdapter =
    getStorageAdapter();

  await storageAdapter.ensureDirectory(
    'pages'
  );

  await storageAdapter.ensureDirectory(
    'assets'
  );

  await storageAdapter.ensureDirectory(
    'rule-packages'
  );

  await storageAdapter.ensureDirectory(
    'world-packages'
  );
}


// Полностью загружает workspace в память и запускает schema validation.
export async function loadWorkspace() {

  const storageAdapter =
    getStorageAdapter();

  if (
    storageAdapter.kind === 'desktop' &&
    !storageAdapter.getWorkspaceRoot?.()
  ) {

    return;
  }

  if (
    storageAdapter.kind === 'browser' &&
    !storageAdapter.getWorkspaceHandle?.()
  ) {

    return;
  }

  const loadGeneration =
    ++workspaceLoadGeneration;

  const isLoadCurrent =
    () => loadGeneration === workspaceLoadGeneration;

  setPages([]);

  const pages =
    await scanWorkspacePagesByAdapter(
      storageAdapter,
      {
        shouldContinue:
          isLoadCurrent
      }
  );

  if (!isLoadCurrent()) return false;

  await finishWorkspaceLoad(
    pages, storageAdapter, isLoadCurrent
  );

  return true;
}


async function finishWorkspaceLoad(
  pages, storageAdapter, isLoadCurrent
) {

  let registry = null;
  try { registry = createCardTypeRegistryFromCatalog((await readCardTypeCatalog({ storageAdapter })).catalog, { bundledTypes: [], bundledFieldSets: [] }); }
  catch { /* Invalid catalogs stay diagnostic/read-only; never use bundled fallback. */ }
  if (!isLoadCurrent()) return;
  setPageRepositoryRegistry(registry);

  setPages(
    pages
  );

  const validation =
    validateWorkspaceSnapshot({
      pages: state.pages,
      assetReferences:
        collectAssetReferencesFromPages(
          state.pages, { registry }
        )
    });

  state.workspaceValidation =
    validation;

  state.workspaceRecoveryReport =
    createWorkspaceRecoveryReport(
      validation
    );

  logWorkspaceValidationResult(
    validation
  );
}
