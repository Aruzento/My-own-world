import {
  DEFAULT_GRID_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  clamp,
  getPointerAngle,
  getWorldPointFromEvent,
  normalizeDegrees
} from './campaignMapGeometry.js';

import {
  applyTokenRotation,
  applyTokenSize,
  positionToken
} from './campaignMapTokens.js';

import {
  scheduleLivePresentationSync
} from './campaignMapPresentationSync.js';

import {
  commitTokenModelToElement,
  getCampaignMapModel
} from './campaignMapModel.js';


const TOKEN_DRAG_THRESHOLD = 4;
const TOKEN_RESIZE_THRESHOLD = 2;

let draggedToken = null;
let resizedToken = null;
let rotatedToken = null;


// Состояние взаимодействия с токеном отделено от общей карты: перемещение,
// изменение размера, поворот и линейка позже смогут работать поверх модели карты.

export function hasActiveTokenInteraction() {

  return Boolean(
    draggedToken ||
    resizedToken ||
    rotatedToken
  );
}


export function startTokenDrag(
  event,
  token,
  deps
) {

  event.preventDefault();

  try {

    token.setPointerCapture(
      event.pointerId
    );

  } catch (error) {

    // Pointer capture ускоряет захват, но document listeners остаются fallback.
  }

  deps.clearTokenPopupTimer();

  draggedToken = {
    token,
    stage: token.closest('.campaign-map-stage'),
    map: token.closest('.campaign-map-document'),
    startX: event.clientX,
    startY: event.clientY,
    startWorldX: Number(token.dataset.x || 50) / 100 * WORLD_WIDTH,
    startWorldY: Number(token.dataset.y || 50) / 100 * WORLD_HEIGHT,
    measure: null,
    moved: false
  };

  token.classList.add(
    'is-dragging'
  );

  deps.closeTokenPopup();

  deps.setMapInteractionQuality(
    draggedToken.map,
    true,
    {
      deferBackgroundUpdate: true,
      skipVisibleUpdate: true
    }
  );
}


export function startTokenResize(
  event,
  token,
  deps
) {

  if (!token) return;

  const stage =
    token.closest('.campaign-map-stage');

  if (
    stage?.dataset.tool === 'draw' ||
    stage?.dataset.tool === 'erase'
  ) return;

  event.preventDefault();
  event.stopPropagation();

  deps.closeTokenPopup();
  deps.selectMapToken(
    token
  );

  const rect =
    token.getBoundingClientRect();

  resizedToken = {
    token,
    stage,
    corner: event.target.dataset.corner || 'se',
    startX: event.clientX,
    startY: event.clientY,
    startSize: Math.max(
      0.5,
      Number(token.dataset.size || 1)
    ),
    startPixelSize: Math.max(
      rect.width,
      rect.height,
      1
    ),
    moved: false
  };

  deps.setMapInteractionQuality(
    token.closest('.campaign-map-document'),
    true
  );

  token.classList.add(
    'is-resizing'
  );
}


export function startTokenRotate(
  event,
  token,
  deps
) {

  if (!token) return;

  const stage =
    token.closest('.campaign-map-stage');

  if (
    stage?.dataset.tool === 'draw' ||
    stage?.dataset.tool === 'erase'
  ) return;

  event.preventDefault();
  event.stopPropagation();

  deps.closeTokenPopup();
  deps.selectMapToken(
    token
  );

  const rect =
    token.getBoundingClientRect();

  const centerX =
    rect.left + rect.width / 2;

  const centerY =
    rect.top + rect.height / 2;

  rotatedToken = {
    token,
    map: token.closest('.campaign-map-document'),
    centerX,
    centerY,
    startAngle: getPointerAngle(
      event,
      centerX,
      centerY
    ),
    startRotation: Number(token.dataset.rotation || 0),
    moved: false
  };

  deps.setMapInteractionQuality(
    rotatedToken.map,
    true
  );

  token.classList.add(
    'is-rotating'
  );
}


export function moveTokenInteractions(
  event
) {

  if (rotatedToken) {

    rotateTokenToPointer(
      event
    );
  }

  if (resizedToken) {

    resizeTokenToPointer(
      event
    );
  }

  if (draggedToken) {

    moveTokenToPointer(
      event
    );
  }
}


export async function finishTokenInteractions(
  deps
) {

  if (rotatedToken) {

    const map =
      rotatedToken.map;

    const shouldSave =
      clearRotatedToken(
        true
      );

    deps.setMapInteractionQuality(
      map,
      false
    );

    if (shouldSave) {

      await deps.saveAndSync();
    }
  }

  if (resizedToken) {

    const map =
      resizedToken.token.closest('.campaign-map-document');

    const shouldSave =
      clearResizedToken(
        true
      );

    deps.setMapInteractionQuality(
      map,
      false
    );

    if (shouldSave) {

      await deps.saveAndSync();
    }
  }

  if (draggedToken) {

    const map =
      draggedToken.map;

    const shouldSave =
      clearDraggedToken(
        true
      );

    deps.setMapInteractionQuality(
      map,
      false
    );

    if (shouldSave) {

      await deps.saveAndSync();
    }
  }
}


export function clearDraggedToken(
  keepMovedState
) {

  if (!draggedToken) return false;

  const moved =
    draggedToken.moved;

  draggedToken.token.classList.remove(
    'is-dragging'
  );

  removeDragMeasure(
    draggedToken
  );

  draggedToken =
    null;

  return keepMovedState && moved;
}


function rotateTokenToPointer(
  event
) {

  const angle =
    getPointerAngle(
      event,
      rotatedToken.centerX,
      rotatedToken.centerY
    );

  const rotation =
    normalizeDegrees(
      rotatedToken.startRotation +
      angle -
      rotatedToken.startAngle
    );

  if (
    !rotatedToken.moved &&
    Math.abs(rotation - rotatedToken.startRotation) < 1
  ) return;

  rotatedToken.moved =
    true;

  const model =
    getCampaignMapModel(
      rotatedToken.map
    );

  model?.rotateToken(
    rotatedToken.token.dataset.tokenId,
    rotation
  );

  commitTokenModelToElement(
    rotatedToken.token,
    model
  );

  applyTokenRotation(
    rotatedToken.token
  );

  scheduleLivePresentationSync(
    rotatedToken.token
  );
}


function clearRotatedToken(
  keepMovedState
) {

  if (!rotatedToken) return false;

  const moved =
    rotatedToken.moved;

  rotatedToken.token.classList.remove(
    'is-rotating'
  );

  rotatedToken =
    null;

  return keepMovedState && moved;
}


function resizeTokenToPointer(
  event
) {

  const distance =
    Math.hypot(
      event.clientX - resizedToken.startX,
      event.clientY - resizedToken.startY
    );

  if (
    !resizedToken.moved &&
    distance < TOKEN_RESIZE_THRESHOLD
  ) return;

  resizedToken.moved =
    true;

  const delta =
    getResizeDelta(
      event
    );

  const nextSize =
    clamp(
      resizedToken.startSize *
      ((resizedToken.startPixelSize + delta) / resizedToken.startPixelSize),
      0.5,
      8
    );

  const map =
    resizedToken.token.closest('.campaign-map-document');

  const model =
    getCampaignMapModel(
      map
    );

  model?.resizeToken(
    resizedToken.token.dataset.tokenId,
    nextSize
  );

  commitTokenModelToElement(
    resizedToken.token,
    model
  );

  applyTokenSize(
    resizedToken.token
  );

  scheduleLivePresentationSync(
    resizedToken.token
  );
}


function getResizeDelta(
  event
) {

  const dx =
    event.clientX - resizedToken.startX;

  const dy =
    event.clientY - resizedToken.startY;

  switch (resizedToken.corner) {

    case 'nw':
      return Math.max(
        -dx,
        -dy
      );

    case 'ne':
      return Math.max(
        dx,
        -dy
      );

    case 'sw':
      return Math.max(
        -dx,
        dy
      );

    default:
      return Math.max(
        dx,
        dy
      );
  }
}


function clearResizedToken(
  keepMovedState
) {

  if (!resizedToken) return false;

  const moved =
    resizedToken.moved;

  resizedToken.token.classList.remove(
    'is-resizing'
  );

  resizedToken =
    null;

  return keepMovedState && moved;
}


function moveTokenToPointer(
  event
) {

  const {
    token,
    stage,
    startX,
    startY
  } = draggedToken;

  const distance =
    Math.hypot(
      event.clientX - startX,
      event.clientY - startY
    );

  if (
    !draggedToken.moved &&
    distance < TOKEN_DRAG_THRESHOLD
  ) {

    return;
  }

  draggedToken.moved =
    true;

  const point =
    getWorldPointFromEvent(
      event,
      stage
    );

  const x =
    clamp(
      (point.x / WORLD_WIDTH) * 100,
      0,
      100
    );

  const y =
    clamp(
      (point.y / WORLD_HEIGHT) * 100,
      0,
      100
    );

  const model =
    getCampaignMapModel(
      draggedToken.map
    );

  model?.moveToken(
    token.dataset.tokenId,
    {
      x,
      y
    }
  );

  commitTokenModelToElement(
    token,
    model
  );

  positionToken(
    token
  );

  updateDragMeasure(
    draggedToken,
    point
  );

  scheduleLivePresentationSync(
    token,
    stage
  );
}


function updateDragMeasure(
  drag,
  point
) {

  if (drag.token?.dataset.presentationHidden === 'true') {

    removeDragMeasure(
      drag
    );

    drag.measure =
      null;

    return;
  }

  const cells =
    getDragDistanceCells(
      drag,
      point
    );

  if (cells <= 0) {

    removeDragMeasure(
      drag
    );

    drag.measure =
      null;

    return;
  }

  const viewport =
    drag.stage.querySelector('.campaign-map-viewport');

  if (!viewport) return;

  if (!drag.measure) {

    drag.measure =
      document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
      );

    drag.measure.classList.add(
      'campaign-map-drag-measure'
    );

    drag.measure.setAttribute(
      'viewBox',
      `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`
    );

    drag.measure.innerHTML = `
      <defs>
        <marker id="campaign-drag-arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
          <path d="M2,2 L10,6 L2,10 Z"></path>
        </marker>
      </defs>
      <line></line>
      <text></text>
    `;

    viewport.appendChild(
      drag.measure
    );
  }

  const line =
    drag.measure.querySelector('line');

  const label =
    drag.measure.querySelector('text');

  line.setAttribute(
    'x1',
    String(drag.startWorldX)
  );

  line.setAttribute(
    'y1',
    String(drag.startWorldY)
  );

  line.setAttribute(
    'x2',
    String(point.x)
  );

  line.setAttribute(
    'y2',
    String(point.y)
  );

  label.setAttribute(
    'x',
    String((drag.startWorldX + point.x) / 2)
  );

  label.setAttribute(
    'y',
    String((drag.startWorldY + point.y) / 2 - 12)
  );

  label.textContent =
    `${cells * 5} ft`;
}


function removeDragMeasure(
  drag
) {

  drag?.measure?.remove();
}


function getDragDistanceCells(
  drag,
  point
) {

  const gridSize =
    Math.max(
      1,
      Number(drag.stage.dataset.gridSize || DEFAULT_GRID_SIZE)
    );

  return Math.round(
    Math.max(
      Math.abs(point.x - drag.startWorldX),
      Math.abs(point.y - drag.startWorldY)
    ) / gridSize
  );
}
