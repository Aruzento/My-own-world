import { state } from '../state.js';

import {
  setCurrentPage
} from '../stateActions.js';

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
let treeDragPreview = null;
let treeDropPlacement = null;

/* Ловит drop по промежутку между строками: placeholder не принимает события мыши, чтобы не вызывать дрожание layout. */
document.addEventListener(
  'dragover',
  event => {

    if (
      !isPointerOverTreePlaceholder(
        event
      )
    ) return;

    event.preventDefault();

    event.dataTransfer.dropEffect =
      'move';
  }
);


document.addEventListener(
  'drop',
  event => {

    if (
      !isPointerOverTreePlaceholder(
        event
      )
    ) return;

    handlePlaceholderDrop(
      event
    );
  }
);


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

      showTreeDragPreview(
        item,
        event
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
      removeTreeDragPreview();

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

      updateTreeDragPreview(
        event
      );

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


      if (ratio < 0.18) {

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

      } else if (ratio > 0.82) {

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
      removeTreeDragPreview();


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


      await reloadTreeAfterMove(
        renderTree
      );
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

  const placementKey =
    `${targetItem.dataset.pageId || 'root'}:${position}:${level}`;

  if (
    treeDropPlacement?.key === placementKey
  ) {

    treeDropContext =
      context;

    return;
  }

  treeDropContext =
    context;

  treeDropPlacement = {
    key: placementKey
  };

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

  treeDropPlacement =
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


function showTreeDragPreview(
  item,
  event
) {

  removeTreeDragPreview();

  const rect =
    item.getBoundingClientRect();

  treeDragPreview =
    item.cloneNode(
      true
    );

  treeDragPreview.classList.add(
    'tree-drag-preview'
  );

  treeDragPreview.style.width =
    `${rect.width}px`;

  document.body.appendChild(
    treeDragPreview
  );

  updateTreeDragPreview(
    event
  );
}


function updateTreeDragPreview(
  event
) {

  if (!treeDragPreview) return;

  treeDragPreview.style.left =
    `${event.clientX + 12}px`;

  treeDragPreview.style.top =
    `${event.clientY + 12}px`;
}


function removeTreeDragPreview() {

  treeDragPreview?.remove();

  treeDragPreview =
    null;
}


function isPointerOverTreePlaceholder(
  event
) {

  if (
    !treeDropContext ||
    !treeDropPlaceholder?.isConnected
  ) return false;

  const rect =
    treeDropPlaceholder.getBoundingClientRect();

  const verticalPadding =
    10;

  return event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top - verticalPadding &&
    event.clientY <= rect.bottom + verticalPadding;
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
  removeTreeDragPreview();

  await reloadTreeAfterMove(
    renderTree
  );
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


async function reloadTreeAfterMove(
  renderTree
) {

  const currentPageId =
    state.currentPage?.id;

  await loadWorkspace();

  if (currentPageId) {

    const refreshedCurrentPage =
      state.pages.find(page =>
        page.id === currentPageId
      );

    if (refreshedCurrentPage) {

      setCurrentPage(
        refreshedCurrentPage
      );
    }
  }

  renderTree();
}
