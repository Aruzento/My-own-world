import { state } from '../state.js';

import {
  loadWorkspace,
  updatePageParent
} from '../storage/storage.js';


export function renderRootDropZone(
  container,
  draggedPageState,
  renderTree
) {

  const rootZone =
    document.createElement('div');

  rootZone.className =
    'tree-root-drop-zone';

  rootZone.textContent =
    'Корень';


  rootZone.addEventListener(
    'dragover',
    event => {

      event.preventDefault();

      const draggedId =
        draggedPageState.id;

      const draggedPage =
        state.pages.find(
          page =>
            page.id === draggedId
        );

      if (
        !draggedPage
        ||
        draggedPage.parent === null
      ) {

        return;
      }

      rootZone.classList.add(
        'is-drop-target'
      );

      event.dataTransfer.dropEffect =
        'move';
    }
  );


  rootZone.addEventListener(
    'dragleave',
    () => {

      rootZone.classList.remove(
        'is-drop-target'
      );
    }
  );


  rootZone.addEventListener(
    'drop',
    async event => {

      event.preventDefault();

      event.stopPropagation();

      rootZone.classList.remove(
        'is-drop-target'
      );


      const draggedId =
        draggedPageState.id;

      const draggedPage =
        state.pages.find(
          page =>
            page.id === draggedId
        );

      if (
        !draggedPage
        ||
        draggedPage.parent === null
      ) {

        return;
      }


      await updatePageParent(
        draggedPage,
        null
      );


      await loadWorkspace();

      renderTree();
    }
  );


  container.appendChild(
    rootZone
  );
}