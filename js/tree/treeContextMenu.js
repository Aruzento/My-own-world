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
  openConfirmPopup
} from '../ui/confirmPopup.js';

import {
  setStatus
} from '../ui/ui.js';


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
    'Удалить карточку';

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
        title: 'Удалить карточку',
        message: `Удалить "${page.title}" и все дочерние карточки?`,
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


  /* Ставит меню по X координате клика */
  contextMenu.style.left =
    `${event.clientX}px`;

  /* Ставит меню по Y координате клика */
  contextMenu.style.top =
    `${event.clientY}px`;


  /* Показывает меню */
  contextMenu.classList.remove(
    'hidden'
  );
}


async function removePageBranch(
  page,
  renderTree
) {

  closeTreeContextMenu();

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

    renderTree();
    refreshCurrentEditorWikiLinks();

    setStatus(
      'Карточка удалена'
    );

  } catch (error) {

    console.error(
      'Не удалось удалить карточку:',
      error
    );

    setStatus(
      'Не удалось удалить карточку. Переоткрой workspace через кнопку ⊞.'
    );
  }
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
