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


let draggedBlock = null;
let blockDropPlaceholder = null;
let blockDropReference = null;


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


function clearDraggedBlock() {

  if (draggedBlock) {

    draggedBlock.classList.remove(
      'is-dragging',
      'is-dragging-active'
    );
  }

  draggedBlock =
    null;

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


function getBlockDropPlaceholder(
  height
) {

  if (!blockDropPlaceholder) {

    blockDropPlaceholder =
      document.createElement('div');

    blockDropPlaceholder.className =
      'block-drop-placeholder';

    blockDropPlaceholder.setAttribute(
      'contenteditable',
      'false'
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
