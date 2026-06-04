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
  schedulePresentationFogSync,
  schedulePresentationSync
} from './campaignMapPresentationSync.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';


// Fog of war держится отдельно от token/shape логики:
// здесь только canvas, режим кисти и UI-состояние fog-кнопок.

const LOCKED_ZONE_MIN_SIZE =
  32;

let editedLockedFogZone =
  null;

let liveFogSyncTimeout =
  null;

let liveFogSyncFrame =
  null;

let liveFogSyncMap =
  null;


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

  markFogCanvasChanged(
    map
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

  markFogCanvasChanged(
    map,
    {
      x:
        point.x - size,
      y:
        point.y - size,
      width:
        size * 2,
      height:
        size * 2
    }
  );

  persistFogCanvas(
    map
  );

  schedulePresentationFogSync(
    map
  );
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
    map,
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

  const dirtyRegion =
    getFogBrushDirtyRegion(
      point,
      size
    );

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

  markFogCanvasChanged(
    map,
    dirtyRegion
  );

  // Презентацию обновляем редко: так игроки видят свежий туман,
  // но большой canvas не сериализуется на каждом pointermove.
  scheduleLiveFogPresentationSync(
    map
  );
}


function markFogCanvasChanged(
  map,
  dirtyRegion = null
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) return;

  stage.dataset.fogVersion =
    String(
      Number(stage.dataset.fogVersion || 0) + 1
    );

  if (!dirtyRegion) return;

  stage.dataset.fogDirtyRegionCount =
    String(
      Number(stage.dataset.fogDirtyRegionCount || 0) + 1
    );

  stage.dataset.fogDirtyRegion =
    encodeURIComponent(
      JSON.stringify({
        x:
          Math.round(dirtyRegion.x),
        y:
          Math.round(dirtyRegion.y),
        width:
          Math.round(dirtyRegion.width),
        height:
          Math.round(dirtyRegion.height)
      })
    );
}


function getFogBrushDirtyRegion(
  point,
  size
) {

  // Dirty-region нужен desktop-презентации: вместо пересылки всего fog canvas
  // можно отправить только область, которую реально изменила кисть.
  const radius =
    Math.max(
      1,
      Number(size || DEFAULT_BRUSH_SIZE)
    );

  return {
    x:
      point.x - radius - 2,
    y:
      point.y - radius - 2,
    width:
      radius * 2 + 4,
    height:
      radius * 2 + 4
  };
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

  applyLockedFogZonesToStage(
    stage,
    zones
  );

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
      'Запретная зона тумана. Перетащите, потяните угол или дважды кликните для удаления';

    element.innerHTML =
      '<span class="campaign-fog-locked-zone-resize" data-runtime="true"></span>';

    element.addEventListener(
      'pointerdown',
      event => {

        startLockedFogZoneEdit(
          event,
          map,
          zone
        );
      }
    );

    element.addEventListener(
      'dblclick',
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


export function moveLockedFogZoneEdit(
  event
) {

  if (!editedLockedFogZone) return;

  const view =
    getStageView(
      editedLockedFogZone.stage
    );

  const dx =
    (event.clientX - editedLockedFogZone.startX) / view.zoom;

  const dy =
    (event.clientY - editedLockedFogZone.startY) / view.zoom;

  const patch =
    editedLockedFogZone.mode === 'resize'
      ? getLockedFogZoneResizePatch(
          dx,
          dy
        )
      : getLockedFogZoneMovePatch(
          dx,
          dy
        );

  const store =
    getCampaignMapStore(
      editedLockedFogZone.map
    );

  store?.updateLockedFogZone(
    editedLockedFogZone.zone.id,
    patch,
    {
      commit: false
    }
  );

  const zones =
    store?.getModel().fog.lockedZones || [];

  applyLockedFogZonesToStage(
    editedLockedFogZone.stage,
    zones
  );

  updateLockedFogZoneElement(
    editedLockedFogZone.map
  );
}


export function finishLockedFogZoneEdit() {

  if (!editedLockedFogZone) return false;

  const map =
    editedLockedFogZone.map;

  getCampaignMapStore(
    map
  )?.commitToDOM();

  editedLockedFogZone =
    null;

  map.dispatchEvent(
    new CustomEvent(
      'campaign-map-save-request',
      {
        bubbles: true
      }
    )
  );

  schedulePresentationFogSync(
    map
  );

  return true;
}


export function flushLiveFogPresentationSync() {

  if (liveFogSyncTimeout) {

    clearTimeout(
      liveFogSyncTimeout
    );

    liveFogSyncTimeout =
      null;
  }

  if (liveFogSyncFrame) return;

  liveFogSyncFrame =
    requestAnimationFrame(
      () => {

        liveFogSyncFrame =
          null;

        schedulePresentationFogSync(
          liveFogSyncMap
        );

        liveFogSyncMap =
          null;
      }
    );
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
    getCampaignMapStore(
      stage.closest('.campaign-map-document')
    )?.getModel().fog.lockedZones ||
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


function startLockedFogZoneEdit(
  event,
  map,
  zone
) {

  event.preventDefault();
  event.stopPropagation();

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  const currentZone =
    getLockedFogZoneById(
      map,
      zone.id
    ) ||
    zone;

  editedLockedFogZone =
    {
      map,
      stage,
      zone:
        currentZone,
      mode: event.target.closest('.campaign-fog-locked-zone-resize')
        ? 'resize'
        : 'move',
      startX: event.clientX,
      startY: event.clientY,
      startZone: {
        ...currentZone
      }
    };
}


function scheduleLiveFogPresentationSync(
  map
) {

  liveFogSyncMap =
    map;

  if (
    liveFogSyncTimeout ||
    liveFogSyncFrame
  ) return;

  liveFogSyncTimeout =
    setTimeout(
      () => {

        liveFogSyncTimeout =
          null;

        liveFogSyncFrame =
          requestAnimationFrame(
            () => {

              liveFogSyncFrame =
                null;

              schedulePresentationFogSync(
                liveFogSyncMap
              );

              liveFogSyncMap =
                null;
            }
          );
      },
      180
    );
}


function updateLockedFogZoneElement(
  map
) {

  const zone =
    getLockedFogZoneById(
      map,
      editedLockedFogZone.zone.id
    );

  const element =
    map.querySelector(
      `[data-locked-fog-zone-id="${editedLockedFogZone.zone.id}"]`
    );

  if (!zone || !element) {

    renderLockedFogZones(
      map
    );

    return;
  }

  element.style.left =
    `${zone.x}px`;

  element.style.top =
    `${zone.y}px`;

  element.style.width =
    `${zone.width}px`;

  element.style.height =
    `${zone.height}px`;
}


function getLockedFogZoneById(
  map,
  zoneId
) {

  return getCampaignMapStore(
    map
  )?.getModel().fog.lockedZones
    .find(nextZone =>
      nextZone.id === zoneId
    ) ||
    null;
}


function getLockedFogZoneMovePatch(
  dx,
  dy
) {

  const zone =
    editedLockedFogZone.startZone;

  return {
    x: Math.round(
      clamp(
        zone.x + dx,
        0,
        WORLD_WIDTH - zone.width
      )
    ),
    y: Math.round(
      clamp(
        zone.y + dy,
        0,
        WORLD_HEIGHT - zone.height
      )
    )
  };
}


function getLockedFogZoneResizePatch(
  dx,
  dy
) {

  const zone =
    editedLockedFogZone.startZone;

  return {
    width: Math.round(
      clamp(
        zone.width + dx,
        LOCKED_ZONE_MIN_SIZE,
        WORLD_WIDTH - zone.x
      )
    ),
    height: Math.round(
      clamp(
        zone.height + dy,
        LOCKED_ZONE_MIN_SIZE,
        WORLD_HEIGHT - zone.y
      )
    )
  };
}


function applyLockedFogZonesToStage(
  stage,
  zones
) {

  stage.dataset.fogLockedZones =
    encodeURIComponent(
      JSON.stringify(
        zones || []
      )
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
