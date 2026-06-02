/* Реэкспорт функций workspace */
export {

  /* Открытие workspace через File System Access API */
  openWorkspace,

  /* Восстановление последнего workspace */
  restoreWorkspace,

  /* Загрузка workspace */
  loadWorkspace

} from './workspaceStorage.js';


export {
  getStorageAdapter,
  setStorageAdapter
} from './storageAdapter.js';


export {
  assertStorageAdapterContract,
  normalizeWorkspacePath,
  REQUIRED_STORAGE_ADAPTER_METHODS,
  STORAGE_ADAPTER_KIND
} from './storageAdapterContract.js';


export {
  getAssetAdapter,
  setAssetAdapter
} from './assetAdapter.js';


export {
  assertAssetAdapterContract,
  REQUIRED_ASSET_ADAPTER_METHODS
} from './assetAdapterContract.js';



/* Реэкспорт функций работы со страницами */
export {

  /* Создание страницы */
  createPage,

  createFolderPage,

  duplicatePageAsChild,

  duplicatePageAtSameLevel,

  /* Удаление страницы вместе с дочерними */
  deletePageBranch,

  /* Изменение parent страницы */
  updatePageParent,

  /* Обновление позиции страницы в дереве */
  updatePageTreePosition,

  /* Обновление aliases */
  updatePageAliases,

  /* Рекурсивное сканирование папок */
  scanDirectory

} from './pageStorage.js';



/* Реэкспорт asset-функций */
export {

  /* Получение blob URL изображения */
  getImageURL

} from './assetStorage.js';


export {
  ASSET_TYPES,
  createAssetReference,
  isAssetReference,
  normalizeAssetOwner,
  normalizeAssetPath,
  normalizeAssetReference,
  normalizeAssetType
} from './assetReference.js';


export {
  collectAssetReferencesFromHTML,
  collectAssetReferencesFromPage,
  collectAssetReferencesFromPages
} from './assetReferenceScanner.js';


export {
  createAssetPathSet,
  findBrokenAssetReferences,
  findBrokenReferences
} from './assetBrokenChecker.js';


export {
  findOrphanAssetPaths,
  findOrphanPaths
} from './assetOrphanDetector.js';


export {
  getPageWriteKey,
  queueWrite,
  writeFile,
  writePageContent,
  writeTextFile
} from './writeQueue.js';
