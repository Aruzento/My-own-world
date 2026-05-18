import {
  DEFAULT_GRID_SIZE,
  DEFAULT_SHAPE_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  VIEWPORT_CULL_MARGIN,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';


// Геометрия карты вынесена отдельно, чтобы tokens, shapes, fog и viewport
// использовали одну математику и не дублировали расчеты координат.

export function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


export function getPointerAngle(
  event,
  centerX,
  centerY
) {

  return Math.atan2(
    event.clientY - centerY,
    event.clientX - centerX
  ) * 180 / Math.PI;
}


export function normalizeDegrees(
  value
) {

  return Math.round(
    ((value % 360) + 360) % 360
  );
}


export function normalizeText(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


export function roundShapePercent(
  value
) {

  return Math.round(
    value * 10
  ) / 10;
}


export function getStageView(
  stage
) {

  return {
    x: Number(stage.dataset.viewX || 0),
    y: Number(stage.dataset.viewY || 0),
    zoom: clamp(
      Number(stage.dataset.viewZoom || 1),
      MIN_ZOOM,
      MAX_ZOOM
    )
  };
}


export function setStageView(
  stage,
  view
) {

  stage.dataset.viewX =
    String(Math.round(view.x));

  stage.dataset.viewY =
    String(Math.round(view.y));

  stage.dataset.viewZoom =
    String(
      clamp(
        view.zoom,
        MIN_ZOOM,
        MAX_ZOOM
      ).toFixed(3)
    );
}


export function getWorldPointFromEvent(
  event,
  stage
) {

  const rect =
    stage.getBoundingClientRect();

  const view =
    getStageView(
      stage
    );

  return {
    x: clamp(
      (event.clientX - rect.left - view.x) / view.zoom,
      0,
      WORLD_WIDTH
    ),
    y: clamp(
      (event.clientY - rect.top - view.y) / view.zoom,
      0,
      WORLD_HEIGHT
    )
  };
}


export function getVisibleWorldRect(
  stage,
  view
) {

  return {
    left: (-view.x / view.zoom) - VIEWPORT_CULL_MARGIN,
    top: (-view.y / view.zoom) - VIEWPORT_CULL_MARGIN,
    right: ((stage.clientWidth - view.x) / view.zoom) + VIEWPORT_CULL_MARGIN,
    bottom: ((stage.clientHeight - view.y) / view.zoom) + VIEWPORT_CULL_MARGIN
  };
}


export function getVisibleSpawnPoint(
  map,
  spawnIndex = 0
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) {

    return {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2
    };
  }

  const view =
    getStageView(
      stage
    );

  const center = {
    x: (stage.clientWidth / 2 - view.x) / view.zoom,
    y: (stage.clientHeight / 2 - view.y) / view.zoom
  };

  const offset =
    getSpawnOffset(
      stage,
      spawnIndex
    );

  return {
    x: clamp(
      center.x + offset.x,
      0,
      WORLD_WIDTH
    ),
    y: clamp(
      center.y + offset.y,
      0,
      WORLD_HEIGHT
    )
  };
}


function getSpawnOffset(
  stage,
  spawnIndex
) {

  const pattern = [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1]
  ];

  const index =
    Math.max(
      0,
      Number(spawnIndex || 0)
    );

  const gridSize =
    getStageGridSize(
      stage
    );

  const [x, y] =
    pattern[index % pattern.length];

  const ring =
    Math.floor(index / pattern.length);

  const distance =
    gridSize * (ring + 1);

  return {
    x: x * distance,
    y: y * distance
  };
}


export function getTokenWorldRect(
  token,
  stage
) {

  const gridSize =
    getStageGridSize(
      stage
    );

  const size =
    gridSize *
    Math.max(
      0.5,
      Number(token.dataset.size || 1)
    );

  const x =
    Number(token.dataset.x || 50) / 100 * WORLD_WIDTH;

  const y =
    Number(token.dataset.y || 50) / 100 * WORLD_HEIGHT;

  return {
    left: x - size / 2,
    top: y - size / 2,
    right: x + size / 2,
    bottom: y + size / 2
  };
}


export function getShapeWorldRect(
  shape
) {

  const x =
    Number(shape.dataset.x || 0);

  const y =
    Number(shape.dataset.y || 0);

  const width =
    Number(shape.dataset.w || DEFAULT_SHAPE_SIZE);

  const height =
    Number(shape.dataset.h || DEFAULT_SHAPE_SIZE);

  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height
  };
}


export function rectsIntersect(
  a,
  b
) {

  return (
    a.left <= b.right &&
    a.right >= b.left &&
    a.top <= b.bottom &&
    a.bottom >= b.top
  );
}


export function isActiveMapObject(
  element
) {

  return element.classList.contains('is-selected') ||
    element.classList.contains('is-dragging') ||
    element.classList.contains('is-resizing') ||
    element.classList.contains('is-rotating');
}


export function getTrianglePoints(
  shape
) {

  return String(shape.dataset.points || '50,6 94,94 6,94')
    .split(/\s+/)
    .map(pair => {

      const [x, y] =
        pair.split(',').map(Number);

      return {
        x: Number.isFinite(x) ? x : 50,
        y: Number.isFinite(y) ? y : 50
      };
    })
    .slice(0, 3);
}


export function setTrianglePoints(
  shape,
  points
) {

  shape.dataset.points =
    points
      .map(point => `${roundShapePercent(point.x)},${roundShapePercent(point.y)}`)
      .join(' ');
}


export function getTriangleLabels(
  points,
  width,
  height
) {

  return points
    .map((point, index) => {

      const next =
        points[(index + 1) % points.length];

      const x =
        (point.x + next.x) / 2;

      const y =
        (point.y + next.y) / 2;

      const length =
        Math.hypot(
          ((next.x - point.x) / 100) * width,
          ((next.y - point.y) / 100) * height
        );

      return `
        <span
          class="campaign-map-shape-label"
          style="left:${x}%;top:${y}%"
        >
          ${getFeetLabel(length)}
        </span>
      `;
    })
    .join('');
}


export function getFeetLabel(
  pixels
) {

  const cells =
    Math.max(
      1,
      Math.round(
        pixels / getActiveGridSize()
      )
    );

  return `${cells * 5} ft`;
}


export function getActiveGridSize() {

  const stage =
    document.querySelector(
      '#editorArea .campaign-map-stage'
    );

  return getStageGridSize(
    stage
  );
}


function getStageGridSize(
  stage
) {

  return Math.max(
    1,
    Number(stage?.dataset.gridSize || DEFAULT_GRID_SIZE)
  );
}
