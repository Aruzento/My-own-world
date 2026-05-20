/* Реэкспорт функций workspace */
export {

  /* Открытие workspace через File System Access API */
  openWorkspace,

  /* Восстановление последнего workspace */
  restoreWorkspace,

  /* Загрузка workspace */
  loadWorkspace

} from './workspaceStorage.js';



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
  getPageWriteKey,
  queueWrite,
  writeFile,
  writePageContent,
  writeTextFile
} from './writeQueue.js';
