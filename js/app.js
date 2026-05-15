/* Импортирует глобальное состояние приложения */
import {
  state
} from './state.js';


/* Импорт функций работы с workspace и страницами */
import {
  openWorkspace,   /* Открыть папку workspace через File System Access API */
  loadWorkspace,   /* Загрузить страницы из workspace */
  restoreWorkspace,/* Попытка восстановить последнюю открытую папку */
} from './storage/storage.js';


/* Импорт рендера дерева страниц */
import {
  renderTree,
} from './tree/tree.js';


/* Импорт инициализации editor */
import {
  setupEditor,
} from './editor/editor.js';


/* Импорт поиска */
import {
  setupSearch,
} from './search/search.js';



/* Импорт системы тегов */
import {
  setupTags,
} from './ui/tags.js';

/* Импорт поведения таблиц */
import {
  setupTables
} from './ui/tables.js';

/* Импорт поведения DnD stat block */
import {
  setupDndStats
} from './ui/dndStats.js';

/* Импорт backlinks */
import {
  setupBacklinks
} from './ui/backlinks.js';

/* Импорт aliases */
import {
  setupAliases
} from './ui/aliases.js';

/* Импорт popup создания карточек */
import {
  setupCreateModal
} from './ui/createModal.js';

/* Импорт item sets */
import {
  setupItemSets
} from './ui/itemSets.js';

import {
  setupCardType
} from './ui/cardType.js';

import {
  setupProfile
} from './ui/profile.js';



document
  .getElementById('openWorkspaceBtn') /* Находит кнопку открытия workspace. Она создается в index.html*/

  /* Вешает обработчик клика */
  .addEventListener(
    'click',

    /* Асинхронный обработчик */
    async () => {

      /* Открывает системный picker папки */
      const success =
        await openWorkspace(); /* Функция из storage.js

      /* Если пользователь отменил выбор папки — выходим */
      if (!success) return;

      /* Загружает все страницы workspace */
      await loadWorkspace();

      /* Перерисовывает дерево */
      renderTree();
    }
  );



/* Инициализация editor */
setupEditor();

/* Инициализация поиска */
setupSearch();

/* Инициализация тегов */
setupTags();

/* Инициализация aliases */
setupAliases();

setupCardType();

/* Инициализация backlinks */
setupBacklinks();

/* Инициализация item sets */
setupItemSets();

/* Инициализация DnD stat block */
setupDndStats();

/* Инициализация поведения таблиц */
setupTables();

/* Инициализация popup создания карточек */
setupCreateModal();

/* Инициализация нижнего блока профиля */
setupProfile();



/* Самовызывающаяся async функция */
(async () => {

  /* Пытается восстановить последнюю открытую workspace */
  const restored =
    await restoreWorkspace();

  /* Если восстановление невозможно — ничего не делаем */
  if (!restored) return;

  /* Загружает страницы */
  await loadWorkspace();

  /* Рендерит дерево */
  renderTree();

})();
