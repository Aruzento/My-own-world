import {
  getDraggedTreePageId
} from '../tree/tree.js';

import {
  setStatus
} from '../ui/ui.js';

import {
  getWorldPointFromEvent
} from './campaignMapGeometry.js';

import {
  addPageToMap,
  canAddPageToCampaignMap
} from './campaignMapPicker.js';

import {
  getPageById
} from '../repository/pageRepository.js';


// Внешний drop карты отвечает только за сценарий:
// взять карточку в дереве, отпустить на карте и создать дочерний дубль с токеном.

export function setupCampaignMapExternalDrop(
  editor,
  deps
) {

  editor.addEventListener(
    'dragover',
    event => handleMapDragOver(
      event,
      deps
    )
  );

  editor.addEventListener(
    'dragleave',
    handleMapDragLeave
  );

  editor.addEventListener(
    'drop',
    event => handleMapDrop(
      event,
      deps
    )
  );

  window.addEventListener(
    'my-own-world:tree-page-pointer-drop',
    event => handlePointerTreePageDrop(
      event,
      deps
    )
  );
}


function handleMapDragOver(
  event
) {

  const stage =
    event.target.closest('.campaign-map-stage');

  const map =
    event.target.closest('.campaign-map-document');

  const page =
    getDraggedTreePage(
      event
    );

  if (
    !stage ||
    !map ||
    !canAddPageToCampaignMap(page)
  ) return;

  event.preventDefault();
  event.stopPropagation();

  stage.classList.add(
    'is-tree-card-over'
  );

  event.dataTransfer.dropEffect =
    'copy';
}


function handleMapDragLeave(
  event
) {

  const stage =
    event.target.closest('.campaign-map-stage');

  if (
    !stage ||
    stage.contains(event.relatedTarget)
  ) return;

  stage.classList.remove(
    'is-tree-card-over'
  );
}


async function handleMapDrop(
  event,
  deps
) {

  const stage =
    event.target.closest('.campaign-map-stage');

  const map =
    event.target.closest('.campaign-map-document');

  if (!stage || !map) return;

  const page =
    getDraggedTreePage(
      event
    );

  if (
    !canAddPageToCampaignMap(
      page
    )
  ) return;

  event.preventDefault();
  event.stopPropagation();

  stage.classList.remove(
    'is-tree-card-over'
  );

  const duplicate =
    await addPageToMap(
      map,
      page,
      deps.getMapPickerDeps(),
      {
        worldPoint: getWorldPointFromEvent(
          event,
          stage
        )
      }
    );

  if (duplicate) {

    setStatus(
      `Добавлено на карту: ${duplicate.title || 'Без названия'}`
    );
  }
}


async function handlePointerTreePageDrop(
  event,
  deps
) {

  const {
    pageId,
    clientX,
    clientY
  } =
    event.detail || {};

  const stage =
    document
      .elementFromPoint(
        clientX,
        clientY
      )
      ?.closest(
        '.campaign-map-stage'
      );

  const map =
    stage?.closest(
      '.campaign-map-document'
    );

  if (!stage || !map || !pageId) return;

  const page =
    getPageById(
      pageId
    );

  if (
    !canAddPageToCampaignMap(
      page
    )
  ) return;

  stage.classList.remove(
    'is-tree-card-over'
  );

  const duplicate =
    await addPageToMap(
      map,
      page,
      deps.getMapPickerDeps(),
      {
        worldPoint: getWorldPointFromEvent(
          {
            clientX,
            clientY
          },
          stage
        )
      }
    );

  if (duplicate) {

    setStatus(
      `Добавлено на карту: ${duplicate.title || 'Без названия'}`
    );
  }
}


function getDraggedTreePage(
  event
) {

  const pageId =
    getDraggedTreePageId() ||
    event.dataTransfer?.getData('text/plain');

  if (!pageId) return null;

  return getPageById(
    pageId
  );
}
