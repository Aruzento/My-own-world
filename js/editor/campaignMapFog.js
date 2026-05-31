import {
  markRuntime
} from './blocks/blockRuntime.js';

import {
  ensureCanvasSize,
  persistFogCanvas
} from './campaignMapContract.js';

import {
  DEFAULT_BRUSH_SIZE,
  FOG_PAINT_COLOR,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  clamp,
  getStageView,
  getWorldPointFromEvent
} from './campaignMapGeometry.js';

import {
  schedulePresentationSync
} from './campaignMapPresentationSync.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';


// Fog of war держится отдельно от token/shape логики:
// здесь только canvas, режим кисти и UI-состояние fog-кнопок.

export function fillFog(
  map
) {

  const canvas =
    map.querySelector('.campaign-map-fog-canvas');

  if (!canvas) return;

  ensureCanvasSize(
    canvas
  );

  const context =
    canvas.getContext('2d');

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.fillStyle =
    FOG_PAINT_COLOR;

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  persistFogCanvas(
    map
  );

  schedulePresentationSync();
}


export function clearFog(
  map
) {

  const canvas =
    map.querySelector('.campaign-map-fog-canvas');

  if (!canvas) return;

  ensureCanvasSize(
    canvas
  );

  canvas
    .getContext('2d')
    .clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

  persistFogCanvas(
    map
  );

  schedulePresentationSync();
}


export function createFogDrawing(
  stage
) {

  const map =
    stage.closest('.campaign-map-document');

  const canvas =
    stage.querySelector('.campaign-map-fog-canvas');

  if (!map || !canvas) return null;

  ensureCanvasSize(
    canvas
  );

  return {
    map,
    stage,
    canvas,
    context: canvas.getContext('2d'),
    mode: stage.dataset.fogMode || 'draw'
  };
}


export function drawFogAtPointer(
  event,
  fogDrawing
) {

  if (!fogDrawing) return;

  const {
    stage,
    context,
    mode
  } = fogDrawing;

  const point =
    getWorldPointFromEvent(
      event,
      stage
    );

  if (
    isPointInsideLockedFogZone(
      point,
      stage
    )
  ) return;

  context.save();

  context.globalCompositeOperation =
    mode === 'erase'
      ? 'destination-out'
      : 'source-over';

  context.fillStyle =
    FOG_PAINT_COLOR;

  const size =
    Number(stage.dataset.brushSize || DEFAULT_BRUSH_SIZE);

  if (stage.dataset.brushShape === 'square') {

    context.fillRect(
      point.x - size,
      point.y - size,
      size * 2,
      size * 2
    );

  } else {

    context.beginPath();
    context.arc(
      point.x,
      point.y,
      size,
      0,
      Math.PI * 2
    );

    context.fill();
  }
  context.restore();

  stage.dataset.fogVersion =
    String(
      Number(stage.dataset.fogVersion || 0) + 1
    );

  schedulePresentationSync();
}


export function addLockedFogZone(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return null;

  const store =
    getCampaignMapStore(
      map
    );

  const size =
    Number(stage.dataset.gridSize || DEFAULT_BRUSH_SIZE);

  const view =
    getStageView(
      stage
    );

  const zone =
    store?.addLockedFogZone({
      id: crypto.randomUUID(),
      x: clamp(
        (stage.clientWidth / 2 - view.x) / view.zoom - size,
        0,
        WORLD_WIDTH - size * 2
      ),
      y: clamp(
        (stage.clientHeight / 2 - view.y) / view.zoom - size,
        0,
        WORLD_HEIGHT - size * 2
      ),
      width: size * 2,
      height: size * 2
    });

  renderLockedFogZones(
    map
  );

  return zone;
}


export function renderLockedFogZones(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const viewport =
    map.querySelector('.campaign-map-viewport');

  if (!stage || !viewport) return;

  viewport
    .querySelectorAll('.campaign-fog-locked-zone')
    .forEach(zone =>
      zone.remove()
    );

  const zones =
    getCampaignMapStore(
      map
    )?.getModel().fog.lockedZones || [];

  zones.forEach(zone => {

    const element =
      document.createElement('button');

    element.className =
      'campaign-fog-locked-zone';

    markRuntime(
      element
    );

    element.type =
      'button';

    element.dataset.lockedFogZoneId =
      zone.id;

    element.style.left =
      `${zone.x}px`;

    element.style.top =
      `${zone.y}px`;

    element.style.width =
      `${zone.width}px`;

    element.style.height =
      `${zone.height}px`;

    element.title =
      'Удалить запретную зону тумана';

    element.addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        getCampaignMapStore(
          map
        )?.removeLockedFogZone(
          zone.id
        );

        renderLockedFogZones(
          map
        );

        map.dispatchEvent(
          new CustomEvent(
            'campaign-map-save-request',
            {
              bubbles: true
            }
          )
        );

        schedulePresentationSync();
      }
    );

    viewport.appendChild(
      element
    );
  });
}


export function setFogMode(
  map,
  mode,
  options = {}
) {

  setMapTool(
    map,
    mode,
    options
  );

  updateFogButtons(
    map
  );
}


export function setMapTool(
  map,
  tool,
  options = {}
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  stage.dataset.tool =
    tool;

  if (
    tool === 'draw' ||
    tool === 'erase'
  ) {

    const store =
      getCampaignMapStore(
        map
      );

    store?.updateFog({
      mode: tool
    });
  }

  updateFogButtons(
    map
  );

  updatePanButton(
    map
  );

  if (
    tool === 'pan'
  ) {

    options.hideBrushPreview?.(
      stage
    );
  }
}


export function updateFogButtons(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const mode =
    stage?.dataset.tool || stage?.dataset.fogMode || 'draw';

  map
    .querySelector('.campaign-fog-btn')
    ?.classList.toggle(
      'is-active',
      mode === 'draw' ||
      mode === 'erase'
    );

  document
    .getElementById('campaignMapPopup')
    ?.querySelector('.campaign-fog-draw-btn')
    ?.classList.toggle(
      'is-active',
      mode === 'draw'
    );

  document
    .getElementById('campaignMapPopup')
    ?.querySelector('.campaign-fog-erase-btn')
    ?.classList.toggle(
      'is-active',
      mode === 'erase'
    );
}


export function updatePanButton(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const active =
    stage?.dataset.tool === 'pan';

  map
    .querySelector('.campaign-pan-btn')
    ?.classList.toggle(
      'is-active',
      active
    );
}


function isPointInsideLockedFogZone(
  point,
  stage
) {

  const zones =
    readLockedZones(
      stage
    );

  return zones.some(zone =>
    point.x >= zone.x &&
    point.x <= zone.x + zone.width &&
    point.y >= zone.y &&
    point.y <= zone.y + zone.height
  );
}


function readLockedZones(
  stage
) {

  try {

    return JSON.parse(
      decodeURIComponent(
        stage.dataset.fogLockedZones || '[]'
      )
    );

  } catch {

    return [];
  }
}
