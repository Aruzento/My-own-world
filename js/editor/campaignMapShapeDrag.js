import {
  DEFAULT_SHAPE_SIZE
} from './campaignMapConstants.js';

import {
  getStageView,
  getTrianglePoints,
  setTrianglePoints
} from './campaignMapGeometry.js';

import {
  applyShapeGeometry,
  renderMapShape
} from './campaignMapShapes.js';

import {
  scheduleLivePresentationSync
} from './campaignMapPresentationSync.js';

import {
  applyShapeRecordToElement
} from './campaignMapRenderAdapter.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';


const TOKEN_DRAG_THRESHOLD = 4;
const SHAPE_HANDLE_THRESHOLD = 2;

let resizedShape = null;
let draggedShape = null;


// Состояние взаимодействия с фигурами: перемещение, изменение размеров
// прямоугольников/кругов и изменение вершин треугольника.

export function hasActiveShapeInteraction() {

  return Boolean(
    resizedShape ||
    draggedShape
  );
}


export function startShapeResize(
  event,
  shape,
  deps
) {

  if (!shape) return;

  const stage =
    shape.closest('.campaign-map-stage');

  if (
    stage?.dataset.tool === 'draw' ||
    stage?.dataset.tool === 'erase'
  ) return;

  event.preventDefault();
  event.stopPropagation();

  deps.selectMapShape(
    shape
  );

  const record =
    getShapeRecord(
      shape
    );

  resizedShape = {
    shape,
    stage,
    map: shape.closest('.campaign-map-document'),
    corner: event.target.dataset.corner || '',
    point: event.target.dataset.point || '',
    startX: event.clientX,
    startY: event.clientY,
    startLeft: record.x,
    startTop: record.y,
    startWidth: record.width,
    startHeight: record.height,
    startPoints: getTrianglePoints(shape),
    moved: false
  };

  deps.setMapInteractionQuality(
    resizedShape.map,
    true
  );

  shape.classList.add(
    'is-resizing'
  );
}


export function startShapeDrag(
  event,
  shape,
  deps,
  options = {}
) {

  if (!shape) return;

  event.preventDefault();
  event.stopPropagation();

  deps.closeTokenPopup();
  deps.clearTokenPopupTimer();
  deps.selectMapShape(
    shape,
    {
      additive: options.additiveSelection
    }
  );

  if (options.additiveSelection) {

    return;
  }

  const record =
    getShapeRecord(
      shape
    );

  draggedShape = {
    shape,
    stage: shape.closest('.campaign-map-stage'),
    map: shape.closest('.campaign-map-document'),
    startX: event.clientX,
    startY: event.clientY,
    startLeft: record.x,
    startTop: record.y,
    moved: false
  };

  deps.setMapInteractionQuality(
    draggedShape.map,
    true
  );

  shape.classList.add(
    'is-dragging'
  );
}


export function moveShapeInteractions(
  event
) {

  if (resizedShape) {

    resizeShapeToPointer(
      event
    );
  }

  if (draggedShape) {

    moveShapeToPointer(
      event
    );
  }
}


export async function finishShapeInteractions(
  deps
) {

  if (resizedShape) {

    const map =
      resizedShape.map;

    const shouldSave =
      clearResizedShape(
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

  if (draggedShape) {

    const map =
      draggedShape.map;

    const shouldSave =
      clearDraggedShape(
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


function resizeShapeToPointer(
  event
) {

  const delta =
    getWorldDeltaFromPointer(
      event,
      resizedShape
    );

  const distance =
    Math.hypot(
      delta.x,
      delta.y
    );

  if (
    !resizedShape.moved &&
    distance < SHAPE_HANDLE_THRESHOLD
  ) return;

  resizedShape.moved =
    true;

  if (resizedShape.point !== '') {

    resizeTrianglePoint(
      delta
    );

  } else {

    resizeShapeBox(
      delta
    );
  }

  renderMapShape(
    resizedShape.shape
  );

  resizedShape.shape.classList.add(
    'is-selected',
    'is-resizing'
  );

  scheduleLivePresentationSync(
    {
      map: resizedShape.map,
      itemType: 'shape',
      itemId: resizedShape.shape.dataset.shapeId
    }
  );
}


function resizeShapeBox(
  delta
) {

  const {
    shape,
    corner,
    startLeft,
    startTop,
    startWidth,
    startHeight
  } = resizedShape;

  let x =
    startLeft;

  let y =
    startTop;

  let width =
    startWidth;

  let height =
    startHeight;

  if (corner.includes('e')) width =
    startWidth + delta.x;

  if (corner.includes('s')) height =
    startHeight + delta.y;

  if (corner.includes('w')) {

    x =
      startLeft + delta.x;

    width =
      startWidth - delta.x;
  }

  if (corner.includes('n')) {

    y =
      startTop + delta.y;

    height =
      startHeight - delta.y;
  }

  width =
    Math.max(
      24,
      width
    );

  height =
    Math.max(
      24,
      height
    );

  const shapeType =
    getShapeRecord(
      shape
    ).type;

  if (shapeType === 'circle') {

    const size =
      Math.max(
        width,
        height
      );

    width =
      size;

    height =
      size;
  }

  const store =
    getCampaignMapStore(
      resizedShape.map
    );

  store?.resizeShape(
    shape.dataset.shapeId,
    {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height)
    }
  );

  applyShapeRecordFromStore(
    shape,
    store
  );
}


function getShapeRecord(
  shape
) {

  const map =
    shape?.closest('.campaign-map-document');

  const store =
    getCampaignMapStore(
      map
    );

  const record =
    store
      ?.getModel()
      ?.getShape(
        shape?.dataset.shapeId
      );

  return record || {
    type: 'square',
    x: 0,
    y: 0,
    width: DEFAULT_SHAPE_SIZE,
    height: DEFAULT_SHAPE_SIZE,
    points: ''
  };
}


function resizeTrianglePoint(
  delta
) {

  const {
    shape,
    point,
    startWidth,
    startHeight,
    startPoints
  } = resizedShape;

  const index =
    Number(point);

  const points =
    startPoints.map(item => ({ ...item }));

  if (!points[index]) return;

  points[index].x =
    points[index].x + (delta.x / startWidth) * 100;

  points[index].y =
    points[index].y + (delta.y / startHeight) * 100;

  setTrianglePoints(
    shape,
    points
  );

  const store =
    getCampaignMapStore(
      resizedShape.map
    );

  store?.resizeShape(
    shape.dataset.shapeId,
    {
      points: shape.dataset.points
    }
  );
}


function moveShapeToPointer(
  event
) {

  const delta =
    getWorldDeltaFromPointer(
      event,
      draggedShape
    );

  const distance =
    Math.hypot(
      delta.x,
      delta.y
    );

  if (
    !draggedShape.moved &&
    distance < TOKEN_DRAG_THRESHOLD
  ) return;

  draggedShape.moved =
    true;

  const store =
    getCampaignMapStore(
      draggedShape.map
    );

  store?.moveShape(
    draggedShape.shape.dataset.shapeId,
    {
      x: Math.round(
        draggedShape.startLeft + delta.x
      ),
      y: Math.round(
        draggedShape.startTop + delta.y
      )
    }
  );

  applyShapeRecordFromStore(
    draggedShape.shape,
    store
  );

  applyShapeGeometry(
    draggedShape.shape
  );

  scheduleLivePresentationSync(
    {
      map: draggedShape.map,
      itemType: 'shape',
      itemId: draggedShape.shape.dataset.shapeId
    }
  );
}


function applyShapeRecordFromStore(
  shape,
  store
) {

  const record =
    store
      ?.getModel()
      ?.getShape(
        shape?.dataset.shapeId
      );

  applyShapeRecordToElement(
    shape,
    record
  );
}


function clearResizedShape(
  keepMovedState
) {

  if (!resizedShape) return false;

  const moved =
    resizedShape.moved;

  resizedShape.shape.classList.remove(
    'is-resizing'
  );

  resizedShape =
    null;

  return keepMovedState && moved;
}


function clearDraggedShape(
  keepMovedState
) {

  if (!draggedShape) return false;

  const moved =
    draggedShape.moved;

  draggedShape.shape.classList.remove(
    'is-dragging'
  );

  draggedShape =
    null;

  return keepMovedState && moved;
}


function getWorldDeltaFromPointer(
  event,
  action
) {

  const view =
    getStageView(
      action.stage
    );

  return {
    x: (event.clientX - action.startX) / view.zoom,
    y: (event.clientY - action.startY) / view.zoom
  };
}
