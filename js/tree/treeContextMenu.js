/* Импорт глобального состояния приложения */
import { state } from '../state.js';

/* Импорт функции удаления ветки страниц */
import {
  deletePageBranch,
  duplicatePageAtSameLevel
} from '../storage/storage.js';

/* Импорт popup создания карточки */
import {
  openCreateMenu
} from '../ui/createModal.js';

/* Импорт обновления wiki-links в текущем editor */
import {
  refreshCurrentEditorWikiLinks
} from '../editor/wikiLinks.js';

import {
  openPage,
  renderEmptyEditor
} from '../editor/editor.js';

import {
  openConfirmPopup
} from '../ui/confirmPopup.js';

import {
  finishProgressStatus,
  setProgressStatus,
  setStatus
} from '../ui/ui.js';

import {
  openPopupAtPoint,
  registerPopup
} from '../ui/popupManager.js';

import {
  requestWorkspaceWritePermission
} from '../storage/storageAdapter.js';

import {
  getUniqueCopyTitle
} from '../validation/pageTitleValidation.js';

import {
  savePageAsTemplate
} from '../templates/pageTemplateStorage.js';


let contextMenu =
  null;


/* Открывает контекстное меню дерева для конкретной страницы */
export function openTreeContextMenu(
  event,
  page,
  renderTree
) {

  contextMenu =
    ensureTreeContextMenu();

  /* Очищает старые кнопки меню */
  contextMenu.innerHTML = '';


  /* Создаёт кнопку добавления дочерней карточки */
  const addChild =
    document.createElement('button');

  /* Задаёт текст кнопки */
  addChild.textContent =
    'Добавить дочернюю';


  /* Обработчик клика по добавлению дочерней карточки */
  addChild.addEventListener(
    'click',
    event => {

      /* Не даёт клику всплыть выше */
      event.stopPropagation();

      /* Закрывает контекстное меню */
      closeTreeContextMenu();

      /* Открывает меню создания карточки с parentId */
      openCreateMenu(
        event.clientX,
        event.clientY,
        page.id
      );
    }
  );


  /* Создаёт кнопку удаления карточки */
  const remove =
    document.createElement('button');

  /* Задаёт текст кнопки удаления */
  remove.textContent =
    'Удалить';

  /* Добавляет danger-класс для красного hover */
  remove.className =
    'danger';

  remove.dataset.confirmAnchor =
    'true';


  /* Обработчик клика по удалению */
  remove.addEventListener(
    'click',
    async event => {

      /* Не даёт клику всплыть выше */
      event.stopPropagation();

      openConfirmPopup({
        anchor: remove,
        title: 'Удалить элемент',
        message: `Удалить "${page.title}" и все дочерние элементы?`,
        confirmText: 'Удалить',
        onConfirm: async () => {
          await removePageBranch(
            page,
            renderTree
          );
        }
      });
    }
  );

  const duplicate =
    document.createElement('button');

  duplicate.textContent =
    'Дублировать';

  duplicate.addEventListener(
    'click',
    async event => {

      event.stopPropagation();

      closeTreeContextMenu();

      await duplicatePageAtSameLevel(
        page,
        getUniqueCopyTitle(
          page.title
        )
      );

      renderTree();

      setStatus(
        'Дубль создан'
      );
    }
  );

  const openFolder =
    document.createElement('button');

  openFolder.textContent =
    'Открыть в папке';

  openFolder.addEventListener(
    'click',
    async event => {

      event.stopPropagation();

      closeTreeContextMenu();

      await openPageInFolder(
        page
      );
    }
  );

  const saveTemplate =
    document.createElement('button');

  saveTemplate.textContent =
    'Сделать шаблоном';

  saveTemplate.addEventListener(
    'click',
    async event => {

      event.stopPropagation();

      closeTreeContextMenu();

      await savePageAsTemplate(
        page
      );

      setStatus(
        'Шаблон создан'
      );
    }
  );


  /* Добавляет кнопку добавления в меню */
  contextMenu.appendChild(
    addChild
  );

  contextMenu.appendChild(
    duplicate
  );

  contextMenu.appendChild(
    openFolder
  );

  if (
    isCardTemplateSource(
      page
    )
  ) {

    contextMenu.appendChild(
      saveTemplate
    );
  }

  /* Добавляет кнопку удаления в меню */
  contextMenu.appendChild(
    remove
  );


  requestAnimationFrame(
    () => {

      openPopupAtPoint(
        contextMenu,
        event.clientX,
        event.clientY,
        {
          fallbackWidth: 220,
          fallbackHeight: 190
        }
      );
    }
  );
}


function isCardTemplateSource(
  page
) {

  return page?.template !== 'campaignMap' &&
    page?.type !== 'campaignMap' &&
    page?.template !== 'taskTracker' &&
    page?.type !== 'taskTracker' &&
    page?.template !== 'ruleTree' &&
    page?.type !== 'ruleTree';
}


async function removePageBranch(
  page,
  renderTree
) {

  closeTreeContextMenu();

  const deletedIds =
    collectBranchIds(
      page
    );

  const deletedCurrentPage =
    state.currentPage &&
    deletedIds.has(
      state.currentPage.id
    );

  /* Проверяет и запрашивает права на запись после клика по кнопке popup,
     чтобы File System Access API получил пользовательскую активацию. */
  const hasPermission =
    await ensureWorkspaceWritePermission();

  if (!hasPermission) {

    setStatus(
      'Нет прав на удаление. Открой workspace через кнопку ⊞.'
    );

    return;
  }

  try {

    setStatus(
      `Удаление: подготовка ${deletedIds.size} стр.`
    );

    await deletePageBranch(
      page,
      {
        onProgress:
          setProgressStatus
      }
    );

    if (deletedCurrentPage) {

      openFallbackPageAfterDelete(
        page,
        deletedIds
      );
    }

    renderTree();
    refreshCurrentEditorWikiLinks();

    const tokensCleanupSucceeded =
      await cleanupDeletedMapTokens(
        deletedIds
      );

    finishProgressStatus(
      tokensCleanupSucceeded
        ? 'Элемент удалён'
        : 'Элемент удалён. Токены карты будут очищены после переоткрытия workspace.'
    );

  } catch (error) {

    console.error(
      'Не удалось удалить карточку:',
      error
    );

    renderTree();

    finishProgressStatus(
      'Не удалось удалить элемент. Переоткрой workspace через кнопку ⊞.',
      {
        status:
          'failed',
        delayMs:
          3200
      }
    );
  }
}

async function cleanupDeletedMapTokens(
  deletedIds
) {

  try {

    const campaignMapModule =
      await import('../editor/campaignMap.js');

    await campaignMapModule.removeDeletedCampaignMapTokens(
      deletedIds
    );

    return true;

  } catch (error) {

    console.warn(
      'Элемент удален, но токены карты не удалось очистить:',
      error
    );

    return false;
  }
}

function collectBranchIds(
  rootPage
) {

  const ids =
    new Set([
      rootPage.id
    ]);

  state.pages
    .filter(page =>
      page.parent === rootPage.id
    )
    .forEach(child => {

      collectBranchIds(child)
        .forEach(id =>
          ids.add(id)
        );
    });

  return ids;
}


function openFallbackPageAfterDelete(
  deletedRoot,
  deletedIds
) {

  const parent =
    state.pages.find(page =>
      page.id === deletedRoot.parent &&
      !deletedIds.has(page.id)
    );

  const fallback =
    parent ||
    state.pages.find(page =>
      !deletedIds.has(page.id)
    );

  if (fallback) {

    openPage(
      fallback
    );

    return;
  }

  renderEmptyEditor();
}

async function openPageInFolder(
  page
) {

  const fileName =
    page?.name || 'страница.md';

  const filePath =
    page?.path || `/pages/${fileName}`;

  /* Браузерный File System Access API не умеет раскрывать системную папку с выделением файла, поэтому даем пользователю точное имя файла. */
  try {

    await navigator.clipboard?.writeText(
      fileName
    );

    setStatus(
      `Файл ${fileName} находится в ${filePath}. Имя файла скопировано.`
    );

  } catch (error) {

    console.warn(
      'Не удалось скопировать имя файла:',
      error
    );

    setStatus(
      `Файл ${fileName} находится в ${filePath}.`
    );
  }
}


/* Закрывает контекстное меню дерева */
export function closeTreeContextMenu() {

  /* Прячет меню */
  ensureTreeContextMenu().classList.add(
    'hidden'
  );
}


function ensureTreeContextMenu() {

  if (contextMenu) return contextMenu;

  contextMenu =
    document.getElementById(
      'treeContextMenu'
    );

  if (!contextMenu) {

    contextMenu =
      document.createElement('div');

    contextMenu.id =
      'treeContextMenu';

    contextMenu.className =
      'tree-context-menu hidden';

    document.body.appendChild(
      contextMenu
    );
  }

  registerPopup({
    popup: contextMenu,
    close: closeTreeContextMenu,
    key: 'tree-context-menu',
    kind: 'context-menu'
  });

  return contextMenu;
}


/* Проверяет права workspace на запись */
async function ensureWorkspaceWritePermission() {

  return requestWorkspaceWritePermission();
}
