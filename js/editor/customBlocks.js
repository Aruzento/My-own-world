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

      block.classList.add(
        'is-dragging'
      );

      event.dataTransfer.effectAllowed =
        'move';

      event.dataTransfer.setData(
        'text/plain',
        ''
      );
    }
  );

  editor.addEventListener(
    'dragover',
    event => {

      if (!draggedBlock) return;

      const targetBlock =
        event.target.closest('.entity-main .template-block');

      if (
        !targetBlock ||
        targetBlock === draggedBlock
      ) return;

      event.preventDefault();

      const isAfter =
        isPointerAfterMiddle(
          event,
          targetBlock
        );

      clearDropMarkers();

      targetBlock.classList.add(
        isAfter
          ? 'is-drop-after'
          : 'is-drop-before'
      );
    }
  );

  editor.addEventListener(
    'drop',
    event => {

      if (!draggedBlock) return;

      const targetBlock =
        event.target.closest('.entity-main .template-block');

      if (
        !targetBlock ||
        targetBlock === draggedBlock
      ) return;

      event.preventDefault();

      const isAfter =
        isPointerAfterMiddle(
          event,
          targetBlock
        );

      if (isAfter) {

        targetBlock.after(
          draggedBlock
        );

      } else {

        targetBlock.before(
          draggedBlock
        );
      }

      clearDraggedBlock();
      saveCurrentPage();
    }
  );

  editor.addEventListener(
    'dragend',
    clearDraggedBlock
  );
}


function isPointerAfterMiddle(
  event,
  element
) {

  const rect =
    element.getBoundingClientRect();

  return event.clientY >
    rect.top + rect.height / 2;
}


function clearDraggedBlock() {

  if (draggedBlock) {

    draggedBlock.classList.remove(
      'is-dragging'
    );
  }

  draggedBlock =
    null;

  clearDropMarkers();
}


function clearDropMarkers() {

  document
    .querySelectorAll(
      '.template-block.is-drop-before, .template-block.is-drop-after'
    )
    .forEach(block => {

      block.classList.remove(
        'is-drop-before',
        'is-drop-after'
      );
    });
}
