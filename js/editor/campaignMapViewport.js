import {
  markRuntime
} from './blocks/blockContract.js';

import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  clamp,
  getShapeWorldRect,
  getStageView,
  getTokenWorldRect,
  getVisibleWorldRect,
  isActiveMapObject,
  rectsIntersect,
  setStageView
} from './campaignMapGeometry.js';

import {
  updateMapBackgroundQuality
} from './campaignMapBackground.js';

import {
  getCampaignMapModel
} from './campaignMapModel.js';

import {
  renderMapShapeElement
} from './campaignMapRenderer.js';


let visibleObjectsFrame = null;
let pendingVisibleObjectsMap = null;
let pendingVisibleObjectsView = null;
let panningMap = null;


// Viewport-модуль отвечает за вид карты: структура viewport, pan/zoom,
// culling объектов вне экрана и визуальные параметры сетки.

export function ensureViewportStructure(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  let viewport =
    stage.querySelector('.campaign-map-viewport');

  if (!viewport) {

    viewport =
      document.createElement('div');

    viewport.className =
      'campaign-map-viewport';

    [
      '.campaign-map-background',
      '.campaign-map-object-layer',
      '.campaign-map-fog-canvas'
    ]
      .map(selector => stage.querySelector(selector))
      .filter(Boolean)
      .forEach(element => {

        viewport.appendChild(
          element
        );
      });

    stage.appendChild(
      viewport
    );
  }

  viewport.style.width =
    `${WORLD_WIDTH}px`;

  viewport.style.height =
    `${WORLD_HEIGHT}px`;

  ensureBrushPreview(
    stage
  );
}


export function ensureBrushPreview(
  stage
) {

  let preview =
    stage.querySelector('.campaign-brush-preview');

  if (preview) {

    markRuntime(
      preview
    );

    return preview;
  }

  preview =
    document.createElement('div');

  preview.className =
    'campaign-brush-preview';

  markRuntime(
    preview
  );

  stage.appendChild(
    preview
  );

  return preview;
}


export function ensureMapViewState(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  if (!stage.dataset.viewX) {
    stage.dataset.viewX =
      '0';
  }

  if (!stage.dataset.viewY) {
    stage.dataset.viewY =
      '0';
  }

  if (!stage.dataset.viewZoom) {
    stage.dataset.viewZoom =
      '1';
  }

  stage.dataset.tool =
    'pan';

  stage.dataset.fogMode =
    'draw';

  if (!stage.dataset.gridSize) {
    stage.dataset.gridSize =
      String(DEFAULT_GRID_SIZE);
  }

  if (!stage.dataset.gridColor) {
    stage.dataset.gridColor =
      DEFAULT_GRID_COLOR;
  }

  if (!stage.dataset.brushSize) {
    stage.dataset.brushSize =
      String(DEFAULT_BRUSH_SIZE);
  }
}


export function applyViewportTransform(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const viewport =
    map.querySelector('.campaign-map-viewport');

  if (!stage || !viewport) return;

  const view =
    getStageView(
      stage
    );

  viewport.style.transform =
    `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;

  scheduleVisibleMapObjectsUpdate(
    map,
    view
  );

  updateMapBackgroundQuality(
    map
  );
}


export function zoomMap(
  map,
  factor,
  anchor = null
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  const rect =
    stage.getBoundingClientRect();

  const view =
    getStageView(
      stage
    );

  const nextZoom =
    clamp(
      view.zoom * factor,
      MIN_ZOOM,
      MAX_ZOOM
    );

  const point =
    anchor || {
      x: rect.width / 2,
      y: rect.height / 2
    };

  const worldX =
    (point.x - view.x) / view.zoom;

  const worldY =
    (point.y - view.y) / view.zoom;

  setMapView(
    map,
    {
      zoom: nextZoom,
      x: point.x - worldX * nextZoom,
      y: point.y - worldY * nextZoom
    }
  );

  applyViewportTransform(
    map
  );
}


export function setMapView(
  map,
  view
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  const model =
    getCampaignMapModel(
      map
    );

  const nextView =
    model?.setView(
      view
    ) || view;

  model?.commitToElement(
    map
  );

  setStageView(
    stage,
    nextView
  );
}


export function toggleGrid(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  const enabled =
    stage.dataset.grid === 'true';

  const model =
    getCampaignMapModel(
      map
    );

  model?.setGrid({
    enabled: !enabled
  });

  model?.commitToElement(
    map
  );

  updateGridButton(
    map
  );
}


export function updateGridButton(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const button =
    map.querySelector('.campaign-grid-btn');

  if (!stage || !button) return;

  const enabled =
    stage.dataset.grid === 'true';

  button.title =
    enabled
      ? 'Выключить сетку'
      : 'Включить сетку';

  button.classList.toggle(
    'is-active',
    enabled
  );
}


export function updateGridSize(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  const gridSize =
    Number(stage.dataset.gridSize || DEFAULT_GRID_SIZE);

  stage.style.setProperty(
    '--campaign-grid-size',
    `${gridSize}px`
  );

  stage.style.setProperty(
    '--campaign-grid-color',
    hexToGridColor(
      stage.dataset.gridColor || DEFAULT_GRID_COLOR
    )
  );

  map
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      renderMapShapeElement(
        shape
      );
    });
}


export function startMapPan(
  event,
  stage,
  deps
) {

  event.preventDefault();

  panningMap = {
    map: stage.closest('.campaign-map-document'),
    stage,
    lastX: event.clientX,
    lastY: event.clientY
  };

  deps.setMapInteractionQuality(
    panningMap.map,
    true
  );

  stage.classList.add(
    'is-panning'
  );
}


export function moveMapPan(
  event
) {

  if (!panningMap) return;

  const {
    map,
    stage
  } = panningMap;

  const view =
    getStageView(
      stage
    );

  setMapView(
    map,
    {
      ...view,
      x: view.x + event.clientX - panningMap.lastX,
      y: view.y + event.clientY - panningMap.lastY
    }
  );

  panningMap.lastX =
    event.clientX;

  panningMap.lastY =
    event.clientY;

  stage.classList.remove(
    'is-panning'
  );

  stage.classList.add(
    'is-panning'
  );

  applyViewportTransform(
    map
  );
}


export async function finishMapPan(
  deps
) {

  if (!panningMap) return false;

  const map =
    panningMap.map;

  panningMap.stage.classList.remove(
    'is-panning'
  );

  panningMap =
    null;

  deps.setMapInteractionQuality(
    map,
    false
  );

  await deps.saveAndSync();

  return true;
}


export function hasActiveMapPan() {

  return Boolean(
    panningMap
  );
}


export function scheduleVisibleMapObjectsUpdate(
  map,
  view = null
) {

  pendingVisibleObjectsMap =
    map;

  pendingVisibleObjectsView =
    view
      ? { ...view }
      : null;

  if (visibleObjectsFrame) return;

  visibleObjectsFrame =
    requestAnimationFrame(
      () => {

        visibleObjectsFrame =
          null;

        const nextMap =
          pendingVisibleObjectsMap;

        const nextView =
          pendingVisibleObjectsView;

        pendingVisibleObjectsMap =
          null;

        pendingVisibleObjectsView =
          null;

        updateVisibleMapObjects(
          nextMap,
          nextView
        );
      }
    );
}


function updateVisibleMapObjects(
  map,
  view = null
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) return;

  const activeView =
    view ||
    getStageView(
      stage
    );

  const visibleRect =
    getVisibleWorldRect(
      stage,
      activeView
    );

  map
    .querySelectorAll('.campaign-map-token')
    .forEach(token => {

      const tokenRect =
        getTokenWorldRect(
          token,
          stage
        );

      token.classList.toggle(
        'is-offscreen',
        !isActiveMapObject(token) &&
        !rectsIntersect(
          visibleRect,
          tokenRect
        )
      );
    });

  map
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      const shapeRect =
        getShapeWorldRect(
          shape
        );

      shape.classList.toggle(
        'is-offscreen',
        !isActiveMapObject(shape) &&
        !rectsIntersect(
          visibleRect,
          shapeRect
        )
      );
    });
}


function hexToGridColor(
  value
) {

  const normalized =
    String(value || DEFAULT_GRID_COLOR).trim();

  if (
    !/^#[0-9a-f]{6}$/i.test(normalized)
  ) {

    return 'rgba(255,255,255,0.10)';
  }

  const red =
    parseInt(normalized.slice(1, 3), 16);

  const green =
    parseInt(normalized.slice(3, 5), 16);

  const blue =
    parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red},${green},${blue},0.34)`;
}
