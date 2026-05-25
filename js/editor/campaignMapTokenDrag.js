import {
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
  applyTokenRecordToElement
} from './campaignMapRenderAdapter.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  removeDragMeasure,
  updateDragMeasure
} from './campaignMapDragMeasure.js';


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

  const record =
    getTokenRecord(
      token
    );

  draggedToken = {
    token,
    stage: token.closest('.campaign-map-stage'),
    map: token.closest('.campaign-map-document'),
    startX: event.clientX,
    startY: event.clientY,
    startWorldX: record.x / 100 * WORLD_WIDTH,
    startWorldY: record.y / 100 * WORLD_HEIGHT,
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

  const record =
    getTokenRecord(
      token
    );

  resizedToken = {
    token,
    stage,
    corner: event.target.dataset.corner || 'se',
    startX: event.clientX,
    startY: event.clientY,
    startSize: Math.max(
      0.5,
      record.size
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

  const record =
    getTokenRecord(
      token
    );

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
    startRotation: record.rotation,
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


function getTokenRecord(
  token
) {

  const map =
    token?.closest('.campaign-map-document');

  const store =
    getCampaignMapStore(
      map
    );

  const record =
    store
      ?.getModel()
      ?.getToken(
        token?.dataset.tokenId
      );

  return record || {
    x: 50,
    y: 50,
    size: 1,
    rotation: 0
  };
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

  const store =
    getCampaignMapStore(
      rotatedToken.map
    );

  store?.rotateToken(
    rotatedToken.token.dataset.tokenId,
    rotation
  );

  applyTokenRecordFromStore(
    rotatedToken.token,
    store
  );

  applyTokenRotation(
    rotatedToken.token
  );

  scheduleLivePresentationSync(
    {
      map: rotatedToken.map,
      itemType: 'token',
      itemId: rotatedToken.token.dataset.tokenId
    }
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

  const store =
    getCampaignMapStore(
      map
    );

  store?.resizeToken(
    resizedToken.token.dataset.tokenId,
    nextSize
  );

  applyTokenRecordFromStore(
    resizedToken.token,
    store
  );

  applyTokenSize(
    resizedToken.token
  );

  scheduleLivePresentationSync(
    {
      map,
      itemType: 'token',
      itemId: resizedToken.token.dataset.tokenId
    }
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

  const store =
    getCampaignMapStore(
      draggedToken.map
    );

  store?.moveToken(
    token.dataset.tokenId,
    {
      x,
      y
    }
  );

  applyTokenRecordFromStore(
    token,
    store
  );

  positionToken(
    token
  );

  const measure =
    updateDragMeasure(
    draggedToken,
    point
  );

  scheduleLivePresentationSync(
    {
      map: draggedToken.map,
      itemType: 'token',
      itemId: token.dataset.tokenId
    },
    {
      ...measure,
      map: draggedToken.map
    }
  );
}


function applyTokenRecordFromStore(
  token,
  store
) {

  const record =
    store
      ?.getModel()
      ?.getToken(
        token?.dataset.tokenId
      );

  applyTokenRecordToElement(
    token,
    record
  );
}
