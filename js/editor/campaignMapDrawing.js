import {
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  getWorldPointFromEvent
} from './campaignMapGeometry.js';

import {
  createMapShapeElement
} from './campaignMapElementFactory.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  applyShapeRecordToElement
} from './campaignMapRenderAdapter.js';

import {
  renderMapShapeElement
} from './campaignMapRenderer.js';

import {
  applyCampaignMapLayers
} from './campaignMapLayers.js';

import {
  scheduleLivePresentationSync
} from './campaignMapPresentationSync.js';


const DEFAULT_DRAWING_COLOR =
  '#f1d38e';

const DRAWING_POINT_THRESHOLD =
  3;

const PEN_CONTINUE_DISTANCE =
  28;

let activeDrawing =
  null;

const lastPenShapeByMap =
  new WeakMap();

let lastPenShapeId =
  '';


export function setDrawingTool(
  map,
  tool
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) return;

  const normalized =
    normalizeDrawingTool(
      tool
    );

  stage.dataset.drawingTool =
    normalized;

  stage.dataset.tool =
    `drawing-${normalized}`;

  updateDrawingButtons(
    map
  );
}


export function setDrawingColor(
  map,
  color
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  const normalized =
    normalizeHexColor(
      color,
      DEFAULT_DRAWING_COLOR
    );

  if (!stage) return normalized;

  stage.dataset.drawingColor =
    normalized;

  stage.dataset.drawingRecentColors =
    encodeURIComponent(
      JSON.stringify(
        rememberRecentColor(
          stage,
          normalized
        )
      )
    );

  return normalized;
}


export function updateDrawingButtons(
  map
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  const active =
    String(stage?.dataset.tool || '').startsWith('drawing-');

  map
    ?.querySelector('.campaign-drawing-btn')
    ?.classList.toggle(
      'is-active',
      active
    );
}


export function isDrawingTool(
  stage
) {

  return String(stage?.dataset.tool || '').startsWith('drawing-');
}


export function startCampaignMapDrawing(
  event,
  stage
) {

  if (!stage || !isDrawingTool(stage)) return false;

  const tool =
    normalizeDrawingTool(
      stage.dataset.drawingTool ||
      String(stage.dataset.tool || '').replace('drawing-', '')
    );

  if (tool === 'eraser') {

    eraseDrawingAtPointer(
      event,
      stage
    );

    return true;
  }

  event.preventDefault();
  event.stopPropagation();

  const map =
    stage.closest('.campaign-map-document');

  const store =
    getCampaignMapStore(
      map
    );

  if (!store) return false;

  const color =
    setDrawingColor(
      map,
      stage.dataset.drawingColor || DEFAULT_DRAWING_COLOR
    );

  const point =
    getWorldPointFromEvent(
      event,
      stage
    );

  if (tool === 'fill') {

    if (
      fillDrawingAtPointer(
        event,
        stage,
        map,
        store,
        color
      )
    ) {

      return true;
    }

    addFillShape(
      map,
      store,
      color
    );

    return true;
  }

  if (tool === 'pen') {

    const continuation =
      findPenContinuationTarget(
        map,
        store,
        point
      ) ||
      findLastPenContinuationTarget(
        map,
        store,
        point
      );

    if (continuation) {

      activeDrawing = {
        map,
        stage,
        store,
        element:
          continuation.element,
        shapeId:
          continuation.element.dataset.shapeId,
        tool,
        color,
        points: [
          ...continuation.points,
          point
        ],
        moved:
          false
      };

      updateDrawingShapeFromPoints(
        activeDrawing
      );

      return true;
    }
  }

  const shape =
    store.addShape(
      createInitialDrawingShape(
        tool,
        color,
        point
      )
    );

  const element =
    createMapShapeElement(
      shape
    );

  map
    .querySelector('.campaign-map-object-layer')
    ?.appendChild(
      element
    );

  renderMapShapeElement(
    element
  );

  applyCampaignMapLayers(
    map
  );

  activeDrawing = {
    map,
    stage,
    store,
    element,
    shapeId:
      shape.shapeId,
    tool,
    color,
    points: [
      point
    ],
    moved:
      false
  };

  scheduleDrawingSync(
    activeDrawing
  );

  return true;
}


export function moveCampaignMapDrawing(
  event
) {

  if (!activeDrawing) return;

  const point =
    getWorldPointFromEvent(
      event,
      activeDrawing.stage
    );

  const last =
    activeDrawing.points.at(-1);

  if (
    activeDrawing.tool === 'pencil' &&
    last &&
    Math.hypot(
      point.x - last.x,
      point.y - last.y
    ) < DRAWING_POINT_THRESHOLD
  ) return;

  activeDrawing.moved =
    true;

  if (activeDrawing.tool === 'pen') {

    if (activeDrawing.points.length <= 1) {

      activeDrawing.points.push(
        point
      );

    } else {

      activeDrawing.points =
        [
          ...activeDrawing.points.slice(0, -1),
          point
        ];
    }

  } else {

    activeDrawing.points.push(
      point
    );
  }

  updateDrawingShapeFromPoints(
    activeDrawing
  );
}


export function finishCampaignMapDrawing() {

  if (!activeDrawing) return null;

  const finished =
    activeDrawing;

  if (!finished.moved) {

    const start =
      finished.points[0];

    finished.points.push({
      x: start.x + 1,
      y: start.y + 1
    });

    updateDrawingShapeFromPoints(
      finished
    );
  }

  activeDrawing =
    null;

  if (finished.tool === 'pen') {

    lastPenShapeByMap.set(
      finished.map,
      finished.shapeId
    );

    lastPenShapeId =
      finished.shapeId;
  }

  return finished.map;
}


function addFillShape(
  map,
  store,
  color
) {

  const shape =
    store.addShape({
      type: 'fill',
      x: 0,
      y: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      strokeColor: color,
      fillColor: color,
      strokeWidth: 0
    });

  const element =
    createMapShapeElement(
      shape
    );

  map
    .querySelector('.campaign-map-object-layer')
    ?.appendChild(
      element
    );

  renderMapShapeElement(
    element
  );

  applyCampaignMapLayers(
    map
  );

  scheduleLivePresentationSync({
    map,
    itemType: 'shape',
    itemId: shape.shapeId
  });
}


function fillDrawingAtPointer(
  event,
  stage,
  map,
  store,
  color
) {

  const point =
    getWorldPointFromEvent(
      event,
      stage
    );

  const target =
    [
      ...map.querySelectorAll('.campaign-map-shape[data-shape-type="freehand"]')
    ]
      .reverse()
      .find(shape =>
        pointInsideShapeBox(
          point,
          shape
        )
      );

  if (!target) return false;

  const shapeId =
    target.dataset.shapeId;

  const record =
    store.updateShape(
      shapeId,
      {
        fillColor:
          color
      }
    );

  applyShapeRecordToElement(
    target,
    record
  );

  renderMapShapeElement(
    target
  );

  scheduleLivePresentationSync({
    map,
    itemType: 'shape',
    itemId: shapeId
  });

  return true;
}


function eraseDrawingAtPointer(
  event,
  stage
) {

  event.preventDefault();
  event.stopPropagation();

  const map =
    stage.closest('.campaign-map-document');

  const point =
    getWorldPointFromEvent(
      event,
      stage
    );

  const target =
    findEraserTarget(
      map,
      point
    );

  if (!target) return;

  const store =
    getCampaignMapStore(
      map
    );

  const shapeId =
    target.dataset.shapeId;

  store?.removeShape(
    shapeId
  );

  target.remove();

  scheduleLivePresentationSync({
    map,
    itemType: 'shape',
    itemId: shapeId
  });
}


function findEraserTarget(
  map,
  point
) {

  const strokes =
    [
      ...map.querySelectorAll('.campaign-map-shape[data-shape-type="freehand"], .campaign-map-shape[data-shape-type="line"]')
    ]
      .reverse()
      .find(shape =>
        pointInsideShapeBox(
          point,
          shape
        )
      );

  if (strokes) return strokes;

  return [
    ...map.querySelectorAll('.campaign-map-shape[data-shape-type="fill"]')
  ]
    .reverse()
    .find(shape =>
      pointInsideShapeBox(
        point,
        shape
      )
    );
}


function findPenContinuationTarget(
  map,
  store,
  point
) {

  const candidates =
    [
      ...(store?.getModel()?.shapes || [])
    ]
      .filter(shape =>
        shape.type === 'line'
      )
      .reverse();

  for (const record of candidates) {

    const points =
      getWorldPointsFromShapeRecord(
        record
      );

    if (points.length < 2) continue;

    const first =
      points[0];

    const last =
      points.at(-1);

    if (
      getPointDistance(
        point,
        last
      ) <= PEN_CONTINUE_DISTANCE
    ) {

      return createContinuationResult(
        map,
        record,
        points
      );
    }

    if (
      getPointDistance(
        point,
        first
      ) <= PEN_CONTINUE_DISTANCE
    ) {

      return createContinuationResult(
        map,
        record,
        [...points].reverse()
      );
    }
  }

  return null;
}


function findLastPenContinuationTarget(
  map,
  store,
  point
) {

  const shapeId =
    lastPenShapeByMap.get(
      map
    ) ||
    lastPenShapeId;

  if (!shapeId) return null;

  const record =
    store?.getModel()?.getShape?.(
      shapeId
    );

  if (
    !record ||
    record.type !== 'line'
  ) return null;

  const points =
    getWorldPointsFromShapeRecord(
      record
    );

  if (points.length < 2) return null;

  const last =
    points.at(-1);

  if (
    getPointDistance(
      point,
      last
    ) > PEN_CONTINUE_DISTANCE
  ) return null;

  return createContinuationResult(
    map,
    record,
    points
  );
}


function createContinuationResult(
  map,
  record,
  points
) {

  let element =
    getShapeElementById(
      map,
      record.shapeId
    );

  if (!element) {

    element =
      createMapShapeElement(
        record
      );

    map
      .querySelector('.campaign-map-object-layer')
      ?.appendChild(
        element
      );

    renderMapShapeElement(
      element
    );
  }

  return {
    element,
    points
  };
}


function getWorldPointsFromShapeRecord(
  shape
) {

  const x =
    Number(shape.x || 0);

  const y =
    Number(shape.y || 0);

  return String(shape.points || '')
    .trim()
    .split(/\s+/)
    .map(point => {

      const [localX, localY] =
        point.split(',').map(Number);

      if (
        !Number.isFinite(localX) ||
        !Number.isFinite(localY)
      ) return null;

      return {
        x:
          x + localX,
        y:
          y + localY
      };
    })
    .filter(Boolean);
}


function getShapeElementById(
  map,
  shapeId
) {

  if (!shapeId) return null;

  return map.querySelector(
    `.campaign-map-shape[data-shape-id="${CSS.escape(shapeId)}"]`
  );
}


function getPointDistance(
  left,
  right
) {

  if (!left || !right) return Infinity;

  return Math.hypot(
    left.x - right.x,
    left.y - right.y
  );
}


function updateDrawingShapeFromPoints(
  drawing
) {

  const next =
    createDrawingShapePatch(
      drawing.tool,
      drawing.color,
      drawing.points
    );

  const record =
    drawing.store.updateShape(
      drawing.shapeId,
      next
    );

  applyShapeRecordToElement(
    drawing.element,
    record
  );

  renderMapShapeElement(
    drawing.element
  );

  scheduleDrawingSync(
    drawing
  );
}


function scheduleDrawingSync(
  drawing
) {

  scheduleLivePresentationSync({
    map:
      drawing.map,
    itemType:
      'shape',
    itemId:
      drawing.shapeId
  });
}


function createInitialDrawingShape(
  tool,
  color,
  point
) {

  return {
    ...createDrawingShapePatch(
      tool,
      color,
      [
        point
      ]
    ),
    type:
      tool === 'pen'
        ? 'line'
        : 'freehand'
  };
}


function createDrawingShapePatch(
  tool,
  color,
  points
) {

  const bounds =
    getPointBounds(
      points
    );

  const localPoints =
    points.map(point =>
      `${Math.round(point.x - bounds.x)},${Math.round(point.y - bounds.y)}`
    ).join(' ');

  return {
    type:
      tool === 'pen'
        ? 'line'
        : 'freehand',
    x:
      Math.round(bounds.x),
    y:
      Math.round(bounds.y),
    width:
      Math.max(
        1,
        Math.round(bounds.width)
      ),
    height:
      Math.max(
        1,
        Math.round(bounds.height)
      ),
    points:
      localPoints,
    strokeColor:
      color,
    fillColor:
      'transparent',
    strokeWidth:
      tool === 'pen'
        ? 3
        : 4
  };
}


function getPointBounds(
  points
) {

  const xs =
    points.map(point => point.x);

  const ys =
    points.map(point => point.y);

  const minX =
    Math.max(
      0,
      Math.min(...xs)
    );

  const minY =
    Math.max(
      0,
      Math.min(...ys)
    );

  const maxX =
    Math.min(
      WORLD_WIDTH,
      Math.max(...xs)
    );

  const maxY =
    Math.min(
      WORLD_HEIGHT,
      Math.max(...ys)
    );

  return {
    x: minX,
    y: minY,
    width:
      Math.max(
        1,
        maxX - minX
      ),
    height:
      Math.max(
        1,
        maxY - minY
      )
  };
}


function pointInsideShapeBox(
  point,
  shape
) {

  const x =
    Number(shape.dataset.x || 0);

  const y =
    Number(shape.dataset.y || 0);

  const width =
    Number(shape.dataset.w || 0);

  const height =
    Number(shape.dataset.h || 0);

  return point.x >= x &&
    point.y >= y &&
    point.x <= x + width &&
    point.y <= y + height;
}


function rememberRecentColor(
  stage,
  color
) {

  const existing =
    readRecentColors(
      stage
    );

  return [
    color,
    ...existing
  ]
    .filter((item, index, list) =>
      list.indexOf(item) === index
    )
    .slice(0, 6);
}


function readRecentColors(
  stage
) {

  try {

    const parsed =
      JSON.parse(
        decodeURIComponent(
          stage?.dataset.drawingRecentColors || ''
        )
      );

    return Array.isArray(parsed)
      ? parsed.filter(item =>
        /^#[0-9a-f]{6}$/i.test(
          item
        )
      )
      : [];

  } catch {

    return [];
  }
}


function normalizeDrawingTool(
  value
) {

  return [
    'pencil',
    'pen',
    'eraser',
    'fill'
  ].includes(value)
    ? value
    : 'pencil';
}


function normalizeHexColor(
  value,
  fallback
) {

  const color =
    String(value || '').trim();

  return /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : fallback;
}
