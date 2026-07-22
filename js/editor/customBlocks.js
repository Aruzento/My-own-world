import {
  ensureBlocksToolbar,
  ensureBlockControls,
  startInlineRename
} from './blocks/blockControls.js';

import {
  setupBlockPopup,
  openTypePicker,
  openDeletePopup
} from './blocks/blockPopup.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  pushEditorHistorySnapshot
} from './editorHistory.js';


let draggedBlock = null;
let blockDropPlaceholder = null;
let blockDropReference = null;
let blockDragState = null;

const BLOCK_DRAG_START_DISTANCE =
  5;


export function setupCustomBlocks(
  editor,
  saveCurrentPage
) {

  setupBlockPopup();

  editor.addEventListener(
    'click',
    event => {

      const addButton =
        event.target.closest('.add-block-btn');

      const renameButton =
        event.target.closest('.block-rename-btn');

      const deleteButton =
        event.target.closest('.block-delete-btn');

      if (addButton) {

        event.preventDefault();
        event.stopPropagation();

        openTypePicker(
          addButton,
          saveCurrentPage
        );

        return;
      }

      if (renameButton) {

        event.preventDefault();
        event.stopPropagation();

        startInlineRename(
          renameButton,
          saveCurrentPage
        );

        return;
      }

      if (deleteButton) {

        event.preventDefault();
        event.stopPropagation();

        openDeletePopup(
          deleteButton,
          saveCurrentPage
        );
      }
    }
  );

  setupBlockDragAndDrop(
    editor,
    saveCurrentPage
  );
}


export function renderCustomBlocks(
  editor
) {

  const main =
    editor.querySelector('.entity-main');

  if (!main) return;

  ensureBlocksToolbar(
    main
  );

  main
    .querySelectorAll('.template-block')
    .forEach(block => {

      ensureBlockControls(
        block
      );
    });
}


function setupBlockDragAndDrop(
  editor,
  saveCurrentPage
) {

  editor.addEventListener(
    'pointerdown',
    event => {

      const handle =
        event.target.closest('.block-drag-handle');

      if (!handle) return;

      if (
        event.button !== 0 ||
        event.isPrimary === false
      ) return;

      if (blockDragState) {

        clearDraggedBlock();
      }

      const block =
        handle.closest('.template-block');

      const main =
        block?.closest('.entity-main');

      if (
        !block ||
        !main ||
        block.classList.contains('hero-block') ||
        !editor.contains(main)
      ) return;

      const rect =
        block.getBoundingClientRect();

      event.preventDefault();
      event.stopPropagation();

      blockDragState = {
        editor,
        saveCurrentPage,
        handle,
        block,
        main,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        pointerOffsetX: event.clientX - rect.left,
        pointerOffsetY: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        moved: false,
        preview: null
      };

      handle.setAttribute(
        'aria-pressed',
        'true'
      );

      handle.setPointerCapture?.(
        event.pointerId
      );

      window.addEventListener(
        'pointermove',
        handleBlockPointerMove,
        true
      );

      window.addEventListener(
        'pointerup',
        handleBlockPointerUp,
        true
      );

      window.addEventListener(
        'pointercancel',
        cancelBlockPointerDrag,
        true
      );
    }
  );

  editor.addEventListener(
    'dragstart',
    event => {

      const handle =
        event.target.closest('.block-drag-handle');

      if (!handle) return;

      const block =
        handle.closest('.template-block');

      /* Hero-блок закреплён в шапке карточки; перетаскиваются только
         пользовательские блоки внутри .entity-main. */
      if (
        !block ||
        block.classList.contains('hero-block')
      ) return;

      draggedBlock =
        block;

      const rect =
        block.getBoundingClientRect();

      getBlockDropPlaceholder(
        rect.height
      );

      block.classList.add(
        'is-dragging'
      );

      event.dataTransfer.effectAllowed =
        'move';

      event.dataTransfer.setData(
        'text/plain',
        ''
      );

      /* Даём браузеру начать native drag, а затем делаем исходный блок
         полупрозрачным. Так layout остаётся стабильным до первого hover. */
      requestAnimationFrame(
        () => {
          block.classList.add(
            'is-dragging-active'
          );
        }
      );
    }
  );

  editor.addEventListener(
    'dragover',
    event => {

      if (!draggedBlock) return;

      const main =
        draggedBlock.closest('.entity-main');

      if (!main) return;

      event.preventDefault();

      moveBlockPlaceholderToPointer(
        main,
        event.clientY
      );
    }
  );

  editor.addEventListener(
    'drop',
    event => {

      if (!draggedBlock) return;

      const placeholder =
        blockDropPlaceholder;

      if (
        !placeholder ||
        !placeholder.parentNode
      ) return;

      event.preventDefault();

      pushEditorHistorySnapshot(
        editor,
        'Перемещение блока'
      );

      placeholder.before(
        draggedBlock
      );

      clearDraggedBlock();
      saveCurrentPage();
    }
  );

  editor.addEventListener(
    'dragend',
    clearDraggedBlock
  );
}


function handleBlockPointerMove(
  event
) {

  if (
    !blockDragState ||
    event.pointerId !== blockDragState.pointerId
  ) return;

  const distance =
    Math.hypot(
      event.clientX - blockDragState.startX,
      event.clientY - blockDragState.startY
    );

  if (
    !blockDragState.moved &&
    distance < BLOCK_DRAG_START_DISTANCE
  ) return;

  event.preventDefault();
  event.stopPropagation();

  if (!blockDragState.moved) {

    startBlockPointerDrag();
  }

  updateBlockDragPreview(
    event.clientX,
    event.clientY
  );

  moveBlockPlaceholderToPointer(
    blockDragState.main,
    event.clientY
  );
}


function handleBlockPointerUp(
  event
) {

  if (
    !blockDragState ||
    event.pointerId !== blockDragState.pointerId
  ) return;

  event.preventDefault();
  event.stopPropagation();

  const state =
    blockDragState;

  if (state.moved) {

    commitBlockPointerDrag(
      state
    );
  }

  clearDraggedBlock();
}


function cancelBlockPointerDrag(
  event
) {

  if (
    blockDragState &&
    event.pointerId !== blockDragState.pointerId
  ) return;

  clearDraggedBlock();
}


function startBlockPointerDrag() {

  const state =
    blockDragState;

  if (!state) return;

  draggedBlock =
    state.block;

  getBlockDropPlaceholder(
    state.height
  );

  state.block.classList.add(
    'is-dragging',
    'is-dragging-active'
  );

  state.preview =
    createBlockDragPreview(
      state.block,
      state.width
    );

  document.body.appendChild(
    state.preview
  );

  state.moved =
    true;
}


function commitBlockPointerDrag(
  state
) {

  const placeholder =
    blockDropPlaceholder;

  if (
    !placeholder ||
    !placeholder.parentNode
  ) return;

  if (
    isBlockPlaceholderNoop(
      placeholder,
      state.block
    )
  ) return;

  pushEditorHistorySnapshot(
    state.editor,
    'Перемещение блока'
  );

  placeholder.before(
    state.block
  );

  state.saveCurrentPage();
}


function clearDraggedBlock() {

  if (draggedBlock) {

    draggedBlock.classList.remove(
      'is-dragging',
      'is-dragging-active'
    );
  }

  draggedBlock =
    null;

  if (blockDragState) {

    blockDragState.handle?.removeAttribute(
      'aria-pressed'
    );

    blockDragState.preview?.remove();

    if (
      blockDragState.handle?.hasPointerCapture?.(
        blockDragState.pointerId
      )
    ) {

      blockDragState.handle.releasePointerCapture(
        blockDragState.pointerId
      );
    }
  }

  blockDragState =
    null;

  window.removeEventListener(
    'pointermove',
    handleBlockPointerMove,
    true
  );

  window.removeEventListener(
    'pointerup',
    handleBlockPointerUp,
    true
  );

  window.removeEventListener(
    'pointercancel',
    cancelBlockPointerDrag,
    true
  );

  clearDropMarkers();
}


function clearDropMarkers() {

  removeBlockDropPlaceholder();
}


function moveBlockPlaceholderToPointer(
  main,
  pointerY
) {

  const placeholder =
    getBlockDropPlaceholder();

  const referenceBlock =
    getBlockInsertionReference(
      main,
      pointerY
    );

  /* Если позиция уже правильная, не трогаем DOM. Иначе браузер
     перезапускает анимацию placeholder на каждом dragover. */
  if (
    blockDropReference === referenceBlock &&
    placeholder.parentNode === main
  ) {

    return;
  }

  blockDropReference =
    referenceBlock;

  if (referenceBlock) {

    main.insertBefore(
      placeholder,
      referenceBlock
    );

    return;
  }

  main.appendChild(
    placeholder
  );
}


function getBlockInsertionReference(
  main,
  pointerY
) {

  const blocks =
    [...main.children]
      .filter(element =>
        element.classList.contains('template-block') &&
        element !== draggedBlock
      );

  return blocks.find(block => {

    const rect =
      block.getBoundingClientRect();

    return pointerY <
      rect.top + rect.height / 2;
  }) || null;
}


function isBlockPlaceholderNoop(
  placeholder,
  block
) {

  return (
    placeholder.previousElementSibling === block ||
    placeholder.nextElementSibling === block
  );
}


function createBlockDragPreview(
  block,
  width
) {

  const preview =
    block.cloneNode(
      true
    );

  preview.classList.remove(
    'is-dragging',
    'is-dragging-active'
  );

  preview.classList.add(
    'block-drag-preview'
  );

  preview.setAttribute(
    'aria-hidden',
    'true'
  );

  preview.querySelectorAll(
    '[data-runtime="true"]'
  ).forEach(element =>
    element.remove()
  );

  preview.style.width =
    `${Math.max(220, Math.min(width, 720))}px`;

  markRuntime(
    preview
  );

  return preview;
}


function updateBlockDragPreview(
  clientX,
  clientY
) {

  const state =
    blockDragState;

  if (!state?.preview) return;

  state.preview.style.transform =
    `translate3d(${clientX - state.pointerOffsetX}px, ${clientY - state.pointerOffsetY}px, 0)`;
}


function getBlockDropPlaceholder(
  height
) {

  if (!blockDropPlaceholder) {

    blockDropPlaceholder =
      document.createElement('div');

    blockDropPlaceholder.className =
      'block-drop-placeholder';

    markRuntime(
      blockDropPlaceholder
    );

    blockDropPlaceholder.innerHTML = `
      <div class="block-drop-placeholder-inner">
        <span class="block-drop-placeholder-line"></span>
        <span class="block-drop-placeholder-text">Блок будет здесь</span>
      </div>
    `;
  }

  if (height) {

    blockDropPlaceholder.style.setProperty(
      '--dragged-block-height',
      `${Math.max(48, Math.min(height, 220))}px`
    );
  }

  return blockDropPlaceholder;
}


function removeBlockDropPlaceholder() {

  if (
    blockDropPlaceholder &&
    blockDropPlaceholder.parentNode
  ) {

    blockDropPlaceholder.remove();
  }

  blockDropReference =
    null;
}
