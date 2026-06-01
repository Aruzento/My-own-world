import {
  getShapeWorldRect,
  getTokenWorldRect,
  getWorldPointFromEvent,
  rectsIntersect
} from './campaignMapGeometry.js';

import {
  clearSelectedMapShapes,
  clearSelectedMapTokens
} from './campaignMapRuntime.js';

import {
  markRuntime
} from './blocks/blockRuntime.js';


const SELECTION_THRESHOLD =
  4;

let selectionBox =
  null;


// Selection box отвечает только за рамку массового выделения на карте.
// Он не меняет модель карты и не сохраняет страницу: выделение является runtime-состоянием.

export function setCampaignMapSelectionMode(
  enabled
) {

  document
    .querySelectorAll('.campaign-map-stage')
    .forEach(stage => {

      stage.classList.toggle(
        'is-selection-mode',
        Boolean(enabled)
      );
    });
}


export function startCampaignMapSelectionBox(
  event,
  stage
) {

  if (!stage) return false;

  event.preventDefault();
  event.stopPropagation();

  const map =
    stage.closest('.campaign-map-document');

  if (!map) return false;

  clearSelectedMapTokens(
    map
  );

  clearSelectedMapShapes(
    map
  );

  const startWorld =
    getWorldPointFromEvent(
      event,
      stage
    );

  const startLocal =
    getStageLocalPoint(
      event,
      stage
    );

  const overlay =
    document.createElement('div');

  overlay.className =
    'campaign-map-selection';

  markRuntime(
    overlay
  );

  stage.appendChild(
    overlay
  );

  selectionBox = {
    map,
    stage,
    overlay,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startWorld,
    startLocal,
    moved: false
  };

  updateSelectionOverlay(
    startLocal
  );

  return true;
}


export function moveCampaignMapSelectionBox(
  event
) {

  if (!selectionBox) return;

  const local =
    getStageLocalPoint(
      event,
      selectionBox.stage
    );

  const distance =
    Math.hypot(
      event.clientX - selectionBox.startClientX,
      event.clientY - selectionBox.startClientY
    );

  selectionBox.moved =
    selectionBox.moved ||
    distance >= SELECTION_THRESHOLD;

  updateSelectionOverlay(
    local
  );
}


export function finishCampaignMapSelectionBox(
  event
) {

  if (!selectionBox) return false;

  const currentWorld =
    getWorldPointFromEvent(
      event,
      selectionBox.stage
    );

  const shouldSelect =
    selectionBox.moved;

  if (shouldSelect) {

    selectObjectsInWorldRect(
      getNormalizedRect(
        selectionBox.startWorld,
        currentWorld
      )
    );
  }

  selectionBox.map.dataset.selectionJustFinished =
    'true';

  selectionBox.overlay.remove();
  selectionBox =
    null;

  return shouldSelect;
}


export function hasActiveCampaignMapSelectionBox() {

  return Boolean(
    selectionBox
  );
}


function selectObjectsInWorldRect(
  worldRect
) {

  const stage =
    selectionBox.stage;

  selectionBox.map
    .querySelectorAll('.campaign-map-token')
    .forEach(token => {

      if (
        rectsIntersect(
          worldRect,
          getTokenWorldRect(
            token,
            stage
          )
        )
      ) {

        token.classList.add(
          'is-selected'
        );
      }
    });

  selectionBox.map
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      if (
        rectsIntersect(
          worldRect,
          getShapeWorldRect(
            shape
          )
        )
      ) {

        shape.classList.add(
          'is-selected'
        );
      }
    });
}


function updateSelectionOverlay(
  currentLocal
) {

  if (!selectionBox) return;

  const rect =
    getNormalizedRect(
      selectionBox.startLocal,
      currentLocal
    );

  selectionBox.overlay.style.left =
    `${rect.left}px`;

  selectionBox.overlay.style.top =
    `${rect.top}px`;

  selectionBox.overlay.style.width =
    `${rect.right - rect.left}px`;

  selectionBox.overlay.style.height =
    `${rect.bottom - rect.top}px`;
}


function getStageLocalPoint(
  event,
  stage
) {

  const rect =
    stage.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}


function getNormalizedRect(
  start,
  end
) {

  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    right: Math.max(start.x, end.x),
    bottom: Math.max(start.y, end.y)
  };
}
