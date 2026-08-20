/* Импортирует глобальное состояние приложения */
import {
  state
} from './state.js';

// Подключает живой индекс страниц: он подписывается на изменения state.pages.
import './repository/pageRepository.js';


/* Импорт функций работы с workspace и страницами */
import {
  openWorkspace,   /* Открыть папку workspace через File System Access API */
  loadWorkspace,   /* Загрузить страницы из workspace */
  restoreWorkspace,/* Попытка восстановить последнюю открытую папку */
} from './storage/storage.js';


/* Импорт рендера дерева страниц */
import {
  renderTree,
  restoreWorkspaceTreeExpansionState,
} from './tree/tree.js';


/* Импорт инициализации editor */
import {
  setupEditor,
  renderEmptyEditor,
  renderWorkspaceRecoveryEditor,
  saveCurrentPage,
} from './editor/editor.js';

import {
  shouldShowWorkspaceRecovery
} from './schema/schemaRecovery.js';


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

import {
  setupAppTopbar
} from './ui/appTopbar.js';

import {
  setupAppShell
} from './ui/appShell.js';

import {
  setupCommandPalette
} from './ui/commandPalette.js';

import {
  setupOnboardingGuide
} from './ui/onboardingGuide.js';

import {
  setupWorldPackageManager
} from './ui/worldPackageManager.js';

import {
  loadPageTemplates
} from './templates/pageTemplateStorage.js';

import {
  loadInternalRulesWorkspaceContent
} from './rulesWorkspace/rulesWorkspaceIndex.js';


// Внутренние правила - program-owned content. Загружаем JSON из assets,
// но оставляем JS seed как fallback, чтобы пользовательский workspace
// открывался даже при ошибке поставляемого файла.
void loadInternalRulesWorkspaceContent();



document.addEventListener(
  'click',
  async event => {

    const openWorkspaceButton =
      event.target.closest?.(
        '[data-open-workspace]'
      );

    if (!openWorkspaceButton) return;

    event.preventDefault();

    await openSelectedWorkspace();
  }
);


async function openSelectedWorkspace() {

  try {

    await saveCurrentPage();

  } catch (error) {

    console.error(
      'Workspace switch stopped because current page save failed.',
      error
    );

    return;
  }

  const success =
    await openWorkspace();

  if (!success) return;

  const loaded =
    await loadWorkspace();

  if (loaded === false) return;

  await loadPageTemplates();

  await restoreWorkspaceTreeExpansionState();

  if (
    shouldShowWorkspaceRecovery(
      state.workspaceRecoveryReport
    )
  ) {

    renderWorkspaceRecoveryEditor(
      state.workspaceRecoveryReport
    );

    return;
  }

  renderEmptyEditor();
}



/* Инициализация editor */
setupEditor();

/* Инициализация верхней панели приложения */
setupAppTopbar();

/* Инициализация пользовательского менеджера World Packages. */
setupWorldPackageManager();

/* Запускает встроенную справку и стартовый onboarding. */
setupOnboardingGuide();

/* Инициализация поиска */
setupSearch();

setupAppShell();

setupCommandPalette();

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

/* Показывает стартовый экран до выбора workspace или страницы */
renderEmptyEditor();



/* Самовызывающаяся async функция */
(async () => {

  /* Пытается восстановить последнюю открытую workspace */
  const restored =
    await restoreWorkspace();

  /* Если восстановление невозможно — ничего не делаем */
  if (!restored) return;

  /* Загружает страницы */
  await loadWorkspace();

  await loadPageTemplates();

  await restoreWorkspaceTreeExpansionState();

  /* Рендерит дерево */
  renderTree();

  if (
    shouldShowWorkspaceRecovery(
      state.workspaceRecoveryReport
    )
  ) {

    renderWorkspaceRecoveryEditor(
      state.workspaceRecoveryReport
    );

    return;
  }

  if (state.pages.length === 0) {

    renderEmptyEditor();
  }

})();
