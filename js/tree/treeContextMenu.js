/* Импорт глобального состояния приложения */
import { state } from '../state.js';

/* Импорт функции удаления ветки страниц */
import {
  deletePageBranch
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
  setStatus
} from '../ui/ui.js';

import {
  positionPopupAtPoint
} from '../ui/popupPosition.js';


/* Находит DOM-элемент контекстного меню дерева */
const contextMenu =
  document.getElementById(
    'treeContextMenu'
  );


/* Открывает контекстное меню дерева для конкретной страницы */
export function openTreeContextMenu(
  event,
  page,
  renderTree
) {

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
    event => {

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


  /* Добавляет кнопку добавления в меню */
  contextMenu.appendChild(
    addChild
  );

  /* Добавляет кнопку удаления в меню */
  contextMenu.appendChild(
    remove
  );


  /* Показывает меню */
  contextMenu.classList.remove(
    'hidden'
  );

  requestAnimationFrame(
    () => {

      positionPopupAtPoint(
        contextMenu,
        event.clientX,
        event.clientY,
        {
          fallbackWidth: 220,
          fallbackHeight: 120
        }
      );
    }
  );
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

    await deletePageBranch(
      page
    );

    const campaignMapModule =
      await import('../editor/campaignMap.js');

    await campaignMapModule.removeDeletedCampaignMapTokens(
      deletedIds
    );

    if (deletedCurrentPage) {

      openFallbackPageAfterDelete(
        page,
        deletedIds
      );
    }

    renderTree();
    refreshCurrentEditorWikiLinks();

    setStatus(
      'Элемент удалён'
    );

  } catch (error) {

    console.error(
      'Не удалось удалить карточку:',
      error
    );

    renderTree();

    setStatus(
      'Не удалось удалить элемент. Переоткрой workspace через кнопку ⊞.'
    );
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


/* Закрывает контекстное меню дерева */
export function closeTreeContextMenu() {

  /* Прячет меню */
  contextMenu.classList.add(
    'hidden'
  );
}


/* Проверяет права workspace на запись */
async function ensureWorkspaceWritePermission() {

  /* Если workspace не выбран — прав нет */
  if (!state.workspaceHandle) return false;

  /* Если браузер не поддерживает permissions API для handle — считаем, что можно пробовать */
  if (!state.workspaceHandle.queryPermission) return true;

  /* Проверяет текущие права */
  const currentPermission =
    await state.workspaceHandle.queryPermission({
      mode: 'readwrite'
    });

  /* Если права уже есть — всё хорошо */
  if (currentPermission === 'granted') return true;

  /* Запрашивает права на запись */
  const requestedPermission =
    await state.workspaceHandle.requestPermission({
      mode: 'readwrite'
    });

  /* Возвращает true только если права выданы */
  return requestedPermission === 'granted';
}


/* Закрывает меню при клике вне него */
document.addEventListener(
  'click',
  event => {

    /* Если клик был не внутри меню */
    if (
      !contextMenu.contains(event.target)
    ) {

      /* Закрываем меню */
      closeTreeContextMenu();
    }
  }
);
