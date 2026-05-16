/* Импорт глобального состояния */
import {
  state
} from '../state.js';

import {
  setPages,
  setWorkspaceHandle
} from '../stateActions.js';


/* Импорт рекурсивного сканирования страниц */
import {
  scanDirectory
} from './pageStorage.js';


/* Импорт persistence-слоя */
import {
  saveWorkspaceHandle, /* Сохраняет доступ к workspace */
  loadWorkspaceHandle /* Загружает сохранённый доступ */
} from './persistence.js';



/* Открытие workspace вручную */
export async function openWorkspace() {

  try {

    /* Открывает системный picker папки */
    const handle =
      await window.showDirectoryPicker();

    /* Сохраняет handle в global state */
    setWorkspaceHandle(
      handle
    );

    /* Сохраняет доступ в persistent storage браузера */
    await saveWorkspaceHandle(
      handle
    );

    /* Создаёт необходимые папки */
    await ensureFolders();

    /* Сообщает об успехе */
    return true;

  } catch (err) {

    /* Пользователь отменил выбор папки */
    console.log(
      'Выбор папки отменён'
    );

    return false;
  }
}



/* Восстановление последнего workspace */
export async function restoreWorkspace() {

  /* Загружает сохранённый handle */
  const handle =
    await loadWorkspaceHandle();

  /* Если доступа нет — выходим */
  if (!handle) return false;

  /* Кладёт handle в state */
  setWorkspaceHandle(
    handle
  );

  /* Проверяет наличие нужных папок */
  await ensureFolders();

  return true;
}



/* Создаёт базовые папки workspace */
async function ensureFolders() {

  /* Проверяет/создаёт папку pages */
  await state.workspaceHandle
    .getDirectoryHandle(
      'pages',
      { create: true }
    );

  /* Проверяет/создаёт папку assets */
  await state.workspaceHandle
    .getDirectoryHandle(
      'assets',
      { create: true }
    );
}



/* Полная загрузка workspace */
export async function loadWorkspace() {

  /* Если workspace не выбран — ничего не делаем */
  if (
    !state.workspaceHandle
  ) return;

  /* Очищает текущий массив страниц */
  setPages([]);

  /* Получает handle папки pages */
  const pagesDir =
    await state.workspaceHandle
      .getDirectoryHandle(
        'pages',
        { create: true }
      );

  /* Рекурсивно сканирует pages/ */
  await scanDirectory(
    pagesDir,
    '/pages'
  );
}
