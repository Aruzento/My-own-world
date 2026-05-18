import {
  ensureCanvasSize,
  persistFogCanvas
} from './campaignMapContract.js';

import {
  DEFAULT_BRUSH_SIZE,
  FOG_PAINT_COLOR
} from './campaignMapConstants.js';

import {
  getWorldPointFromEvent
} from './campaignMapGeometry.js';

import {
  getCampaignMapModel
} from './campaignMapModel.js';

import {
  schedulePresentationSync
} from './campaignMapPresentationSync.js';


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

  context.save();

  context.globalCompositeOperation =
    mode === 'erase'
      ? 'destination-out'
      : 'source-over';

  context.fillStyle =
    FOG_PAINT_COLOR;

  context.beginPath();
  context.arc(
    point.x,
    point.y,
    Number(stage.dataset.brushSize || DEFAULT_BRUSH_SIZE),
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();

  stage.dataset.fogVersion =
    String(
      Number(stage.dataset.fogVersion || 0) + 1
    );

  schedulePresentationSync();
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

    const model =
      getCampaignMapModel(
        map
      );

    model?.updateFog({
      mode: tool
    });

    model?.commitToElement(
      map
    );
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
