import { state } from '../state.js';

import {
  loadWorkspace,
  updatePageParent,
  updatePageTreePosition
} from '../storage/storage.js';

import {
  canMovePage,
  getPageOrder
} from './treeUtils.js';

let treeDropPlaceholder = null;
let treeDropContext = null;


export function setupTreeDragAndDrop(
  item,
  page,
  draggedPageState,
  collapsedPages,
  renderTree
) {

  item.draggable =
    true;

  item.dataset.pageId =
    page.id;


  item.addEventListener(
    'dragstart',
    event => {

      event.stopPropagation();

      draggedPageState.id =
        page.id;

      draggedPageState.targetId =
        null;

      draggedPageState.placeholderLevel =
        Number(
          item.style.getPropertyValue('--tree-level')
        ) || 0;

      item.classList.add(
        'is-dragging'
      );


      const dragImage =
        document.createElement('div');

      dragImage.style.width =
        '1px';

      dragImage.style.height =
        '1px';

      dragImage.style.opacity =
        '0';

      document.body.appendChild(
        dragImage
      );


      event.dataTransfer.setDragImage(
        dragImage,
        0,
        0
      );


      setTimeout(
        () => {
          dragImage.remove();
        },
        0
      );


      event.dataTransfer.setData(
        'text/plain',
        page.id
      );

      event.dataTransfer.effectAllowed =
        'copyMove';
    }
  );


  item.addEventListener(
    'dragend',
    () => {

      item.classList.remove(
        'is-dragging'
      );


      draggedPageState.id =
        null;

      draggedPageState.targetId =
        null;

      draggedPageState.dropMode =
        null;

      removeTreeDropPlaceholder();

      document
        .querySelectorAll(
          '.tree-item.is-drop-target, .tree-root-drop-zone.is-drop-target'
        )
        .forEach(el => {

          el.classList.remove(
            'is-drop-target'
          );
        });
    }
  );


  item.addEventListener(
    'dragover',
    event => {

      event.preventDefault();

      const draggedId =
        draggedPageState.id;

      if (
        !canMovePage(
          draggedId,
          page.id
        )
      ) return;


      const rect =
        item.getBoundingClientRect();

      const y =
        event.clientY - rect.top;

      const ratio =
        y / rect.height;


      clearTreeDropTargets();


      if (ratio < 0.28) {

        draggedPageState.dropMode =
          'before';

        draggedPageState.targetId =
          page.id;

        moveTreeDropPlaceholder(
          item,
          'before',
          getItemLevel(item),
          {
            draggedPageState,
            targetPage: page,
            collapsedPages,
            renderTree
          }
        );

      } else if (ratio > 0.72) {

        draggedPageState.dropMode =
          'after';

        draggedPageState.targetId =
          page.id;

        moveTreeDropPlaceholder(
          item,
          'after',
          getItemLevel(item),
          {
            draggedPageState,
            targetPage: page,
            collapsedPages,
            renderTree
          }
        );

      } else {

        draggedPageState.dropMode =
          'inside';

        draggedPageState.targetId =
          page.id;

        item.classList.add(
          'is-drop-target'
        );

        /* Для создания дочерней страницы не показываем отдельный
           placeholder: сама карточка-предок является точкой drop. */
        removeTreeDropPlaceholder();
      }


      event.dataTransfer.dropEffect =
        'move';
    }
  );


  item.addEventListener(
    'drop',
    async event => {

      event.preventDefault();

      event.stopPropagation();

      clearTreeDropTargets();
      removeTreeDropPlaceholder();


      const draggedId =
        draggedPageState.id;

      if (
        !canMovePage(
          draggedId,
          page.id
        )
      ) return;


      const draggedPage =
        state.pages.find(
          candidate =>
            candidate.id === draggedId
        );

      if (!draggedPage) return;


      if (
        draggedPageState.dropMode === 'before'
        ||
        draggedPageState.dropMode === 'after'
      ) {

        await movePageNearTarget(
          draggedPage,
          page,
          draggedPageState.dropMode
        );

      } else {

        await updatePageTreePosition(
          draggedPage,
          page.id,
          Date.now()
        );

        collapsedPages.delete(
          page.id
        );
      }


      await loadWorkspace();

      renderTree();
    }
  );
}


export function moveTreeDropPlaceholder(
  targetItem,
  position,
  level = 0,
  context = null
) {

  const placeholder =
    getTreeDropPlaceholder();

  treeDropContext =
    context;

  placeholder.style.setProperty(
    '--tree-level',
    level
  );

  if (position === 'before') {

    targetItem.before(
      placeholder
    );

    return;
  }

  targetItem.after(
    placeholder
  );
}


export function removeTreeDropPlaceholder() {

  if (
    treeDropPlaceholder &&
    treeDropPlaceholder.parentNode
  ) {

    treeDropPlaceholder.remove();
  }

  treeDropContext =
    null;
}


export function clearTreeDropTargets() {

  document
    .querySelectorAll(
      '.tree-item.is-drop-target'
    )
    .forEach(element => {

      element.classList.remove(
        'is-drop-target'
      );
    });
}


function getTreeDropPlaceholder() {

  if (treeDropPlaceholder) {

    return treeDropPlaceholder;
  }

  treeDropPlaceholder =
    document.createElement('div');

  treeDropPlaceholder.className =
    'tree-drop-placeholder';

  treeDropPlaceholder.innerHTML = `
    <span class="tree-drop-placeholder-line"></span>
    <span class="tree-drop-placeholder-label">Переместить сюда</span>
  `;

  treeDropPlaceholder.addEventListener(
    'dragover',
    event => {

      event.preventDefault();

      event.dataTransfer.dropEffect =
        'move';
    }
  );

  treeDropPlaceholder.addEventListener(
    'drop',
    handlePlaceholderDrop
  );

  return treeDropPlaceholder;
}


function getItemLevel(
  item
) {

  return Number(
    item.style.getPropertyValue('--tree-level')
  ) || 0;
}


async function handlePlaceholderDrop(
  event
) {

  event.preventDefault();
  event.stopPropagation();

  if (!treeDropContext) return;

  const {
    draggedPageState,
    targetPage,
    collapsedPages,
    renderTree
  } = treeDropContext;

  const draggedPage =
    state.pages.find(
      page =>
        page.id === draggedPageState.id
    );

  if (!draggedPage) return;

  if (
    draggedPageState.dropMode === 'root'
  ) {

    await updatePageParent(
      draggedPage,
      null
    );

  } else if (
    draggedPageState.dropMode === 'before' ||
    draggedPageState.dropMode === 'after'
  ) {

    await movePageNearTarget(
      draggedPage,
      targetPage,
      draggedPageState.dropMode
    );

  } else if (targetPage) {

    await updatePageTreePosition(
      draggedPage,
      targetPage.id,
      Date.now()
    );

    collapsedPages?.delete(
      targetPage.id
    );
  }

  draggedPageState.id =
    null;

  draggedPageState.targetId =
    null;

  draggedPageState.dropMode =
    null;

  treeDropContext =
    null;

  clearTreeDropTargets();
  removeTreeDropPlaceholder();

  await loadWorkspace();

  renderTree();
}


async function movePageNearTarget(
  draggedPage,
  targetPage,
  mode
) {

  const siblings =
    state.pages
      .filter(page =>
        page.parent === targetPage.parent
        &&
        page.id !== draggedPage.id
      )
      .sort(
        (a, b) =>
          getPageOrder(a) - getPageOrder(b)
      );


  const targetIndex =
    siblings.findIndex(
      page =>
        page.id === targetPage.id
    );


  let insertIndex =
    targetIndex;

  if (mode === 'after') {

    insertIndex =
      targetIndex + 1;
  }


  siblings.splice(
    insertIndex,
    0,
    draggedPage
  );


  for (
    let index = 0;
    index < siblings.length;
    index++
  ) {

    const sibling =
      siblings[index];

    /* Порядок должен быть записан всем соседям, иначе после перезагрузки
       визуальная сортировка может откатиться к старым значениям. */
    await updatePageTreePosition(
      sibling,
      targetPage.parent,
      index + 1
    );
  }
}
