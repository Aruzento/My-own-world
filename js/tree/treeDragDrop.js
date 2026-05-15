import { state } from '../state.js';

import {
  loadWorkspace,
  updatePageTreePosition
} from '../storage/storage.js';

import {
  canMovePage,
  getPageOrder
} from './treeUtils.js';


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
        'move';
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

      draggedPageState.dropMode =
        null;


      document
        .querySelectorAll(
          '.tree-item.is-drop-target, .tree-item.is-drop-before, .tree-item.is-drop-after, .tree-root-drop-zone.is-drop-target'
        )
        .forEach(el => {

          el.classList.remove(
            'is-drop-target',
            'is-drop-before',
            'is-drop-after'
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


      item.classList.remove(
        'is-drop-before',
        'is-drop-after',
        'is-drop-target'
      );


      if (ratio < 0.28) {

        draggedPageState.dropMode =
          'before';

        item.classList.add(
          'is-drop-before'
        );

      } else if (ratio > 0.72) {

        draggedPageState.dropMode =
          'after';

        item.classList.add(
          'is-drop-after'
        );

      } else {

        draggedPageState.dropMode =
          'inside';

        item.classList.add(
          'is-drop-target'
        );
      }


      event.dataTransfer.dropEffect =
        'move';
    }
  );


  item.addEventListener(
    'dragleave',
    () => {

      item.classList.remove(
        'is-drop-target',
        'is-drop-before',
        'is-drop-after'
      );
    }
  );


  item.addEventListener(
    'drop',
    async event => {

      event.preventDefault();

      event.stopPropagation();

      item.classList.remove(
        'is-drop-target'
      );


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

    if (
      sibling.id === draggedPage.id
    ) {

      await updatePageTreePosition(
        sibling,
        targetPage.parent,
        index + 1
      );

    } else {

      sibling.order =
        index + 1;
    }
  }
}