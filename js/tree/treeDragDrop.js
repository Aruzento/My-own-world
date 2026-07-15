import { state } from '../state.js';

import {
  setCurrentPage
} from '../stateActions.js';

import {
  updatePageTreePositions
} from '../storage/storage.js';

import {
  finishProgressStatus,
  setProgressStatus,
  setStatus
} from '../ui/ui.js';

import {
  canMovePage
} from './treeUtils.js';

import {
  getTreeDropIntentFromRatio
} from './treeDropIntent.js';

import {
  createTreeMovePlan
} from './treeMovePlanner.js';


let treeDropPlaceholder = null;
let treeDragPreview = null;
let dragState = null;
const suppressedClickPageIds =
  new Set();


// Pointer-based DnD дерева: один контроллер управляет preview, placeholder и drop.

export function setupTreeDragAndDrop(
  item,
  page,
  draggedPageState,
  collapsedPages,
  renderTree
) {

  item.dataset.pageId =
    page.id;

  item.addEventListener(
    'click',
    event => {

      if (
        !suppressedClickPageIds.has(
          page.id
        )
      ) return;

      suppressedClickPageIds.delete(
        page.id
      );

      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  item.addEventListener(
    'pointerdown',
    event => {

      if (!canStartTreePointerDrag(event)) return;

      startTreePointerDrag({
        event,
        item,
        page,
        draggedPageState,
        collapsedPages,
        renderTree
      });
    }
  );
}


export function moveTreeDropPlaceholder(
  targetItem,
  position,
  level = 0
) {

  const placeholder =
    getTreeDropPlaceholder();

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

  treeDropPlaceholder?.remove();
}


export function clearTreeDropTargets() {

  document
    .querySelectorAll(
      '.tree-item.is-drop-target, .tree-root-drop-zone.is-drop-target'
    )
    .forEach(element => {

      element.classList.remove(
        'is-drop-target'
      );
    });
}


function canStartTreePointerDrag(
  event
) {

  if (event.button !== 0) return false;

  if (
    event.target.closest(
      '.tree-actions, .tree-toggle, button, input, textarea, select, a'
    )
  ) return false;

  return Boolean(
    event.currentTarget?.classList.contains(
      'tree-item'
    )
  );
}


function startTreePointerDrag({
  event,
  item,
  page,
  draggedPageState,
  collapsedPages,
  renderTree
}) {

  const rect =
    item.getBoundingClientRect();

  dragState = {
    item,
    page,
    draggedPageState,
    collapsedPages,
    renderTree,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    moved: false,
    intent: null
  };

  draggedPageState.id =
    page.id;

  draggedPageState.targetId =
    null;

  draggedPageState.dropMode =
    null;

  try {

    item.setPointerCapture(
      event.pointerId
    );

  } catch (error) {

    // Document listeners ниже остаются fallback, если capture недоступен.
  }

  document.addEventListener(
    'pointermove',
    handleTreePointerMove
  );

  document.addEventListener(
    'pointerup',
    handleTreePointerUp
  );
}


function handleTreePointerMove(
  event
) {

  if (!dragState) return;

  const distance =
    Math.hypot(
      event.clientX - dragState.startX,
      event.clientY - dragState.startY
    );

  if (
    !dragState.moved &&
    distance < 4
  ) return;

  event.preventDefault();

  if (!dragState.moved) {

    dragState.moved =
      true;

    dragState.item.classList.add(
      'is-dragging'
    );

    showTreeDragPreview(
      dragState.item,
      event
    );
  }

  updateTreeDragPreview(
    event
  );

  updateTreeDropIntent(
    event
  );
}


async function handleTreePointerUp(
  event
) {

  if (!dragState) return;

  const stateToCommit =
    dragState;

  if (stateToCommit.moved) {

    suppressedClickPageIds.add(
      stateToCommit.page.id
    );

    await commitTreePointerDrop(
      event,
      stateToCommit
    );
  }

  clearTreePointerDrag();
}


function updateTreeDropIntent(
  event
) {

  clearTreeDropTargets();
  removeTreeDropPlaceholder();

  const element =
    document.elementFromPoint(
      event.clientX,
      event.clientY
    );

  if (!element) {

    dragState.intent =
      null;

    return;
  }

  const rootZone =
    element.closest(
      '.tree-root-drop-zone'
    );

  if (rootZone) {

    setRootDropIntent(
      rootZone
    );

    return;
  }

  const targetItem =
    element.closest(
      '.tree-item'
    );

  if (!targetItem) {

    dragState.intent =
      element.closest('.campaign-map-stage')
        ? {
          mode: 'map'
        }
        : null;

    return;
  }

  const targetPage =
    state.pages.find(page =>
      page.id === targetItem.dataset.pageId
    );

  if (
    !targetPage ||
    !canMovePage(
      dragState.page.id,
      targetPage.id
    )
  ) {

    dragState.intent =
      null;

    return;
  }

  const rect =
    targetItem.getBoundingClientRect();

  const ratio =
    (event.clientY - rect.top) / rect.height;

  const mode =
    getTreeDropIntentFromRatio(
      ratio
    );

  dragState.draggedPageState.dropMode =
    mode;

  dragState.draggedPageState.targetId =
    targetPage.id;

  dragState.intent = {
    mode,
    targetPage,
    targetItem
  };

  if (mode === 'inside') {

    targetItem.classList.add(
      'is-drop-target'
    );

    return;
  }

  moveTreeDropPlaceholder(
    targetItem,
    mode,
    getItemLevel(
      targetItem
    )
  );
}


function setRootDropIntent(
  rootZone
) {

  if (
    !dragState.page ||
    dragState.page.parent === null
  ) {

    dragState.intent =
      null;

    return;
  }

  rootZone.classList.add(
    'is-drop-target'
  );

  dragState.draggedPageState.dropMode =
    'root';

  dragState.draggedPageState.targetId =
    null;

  dragState.intent = {
    mode: 'root',
    targetPage: null,
    targetItem: rootZone
  };

  moveTreeDropPlaceholder(
    rootZone,
    'after',
    0
  );
}


async function commitTreePointerDrop(
  event,
  stateToCommit
) {

  if (
    tryDispatchMapPointerDrop(
      event,
      stateToCommit
    )
  ) return;

  const {
    intent,
    page
  } = stateToCommit;

  if (!intent) return;

  const plan =
    createTreeMovePlan({
      pages: state.pages,
      draggedId: page.id,
      targetId: intent.targetPage?.id || null,
      mode: intent.mode
    });

  if (!plan.length) return;

  setStatus(
    `Перенос в дереве: подготовка ${plan.length} стр.`
  );

  await updatePageTreePositions(
    plan,
    {
      onProgress:
        setProgressStatus
    }
  );

  if (intent.mode === 'inside') {

    stateToCommit.collapsedPages.delete(
      intent.targetPage.id
    );
  }

  refreshTreeAfterMove(
    stateToCommit.renderTree
  );

  finishProgressStatus(
    `Перенос завершен: ${plan.length} стр.`
  );
}


function tryDispatchMapPointerDrop(
  event,
  stateToCommit
) {

  const element =
    document.elementFromPoint(
      event.clientX,
      event.clientY
    );

  const stage =
    element?.closest(
      '.campaign-map-stage'
    );

  if (!stage) return false;

  window.dispatchEvent(
    new CustomEvent(
      'my-own-world:tree-page-pointer-drop',
      {
        detail: {
          pageId: stateToCommit.page.id,
          clientX: event.clientX,
          clientY: event.clientY
        }
      }
    )
  );

  return true;
}


function clearTreePointerDrag() {

  dragState?.item.classList.remove(
    'is-dragging'
  );

  if (dragState?.draggedPageState) {

    dragState.draggedPageState.id =
      null;

    dragState.draggedPageState.targetId =
      null;

    dragState.draggedPageState.dropMode =
      null;
  }

  document.removeEventListener(
    'pointermove',
    handleTreePointerMove
  );

  document.removeEventListener(
    'pointerup',
    handleTreePointerUp
  );

  clearTreeDropTargets();
  removeTreeDropPlaceholder();
  removeTreeDragPreview();

  dragState =
    null;
}


function getTreeDropPlaceholder() {

  if (treeDropPlaceholder) {

    return treeDropPlaceholder;
  }

  treeDropPlaceholder =
    document.createElement('div');

  treeDropPlaceholder.className =
    'tree-drop-placeholder';

  treeDropPlaceholder.dataset.runtime =
    'true';

  treeDropPlaceholder.innerHTML = `
    <span class="tree-drop-placeholder-line"></span>
    <span class="tree-drop-placeholder-label">Переместить сюда</span>
  `;

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

  if (!treeDragPreview || !dragState) return;

  treeDragPreview.style.left =
    `${event.clientX - dragState.offsetX}px`;

  treeDragPreview.style.top =
    `${event.clientY - dragState.offsetY}px`;
}


function removeTreeDragPreview() {

  treeDragPreview?.remove();

  treeDragPreview =
    null;
}


function getItemLevel(
  item
) {

  return Number(
    item.style.getPropertyValue('--tree-level')
  ) || 0;
}


function refreshTreeAfterMove(
  renderTree
) {

  const currentPageId =
    state.currentPage?.id;

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
