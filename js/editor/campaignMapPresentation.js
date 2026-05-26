import {
  MIN_ZOOM,
  PRESENTATION_MAX_ZOOM
} from './campaignMapConstants.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  renderPresentationDragMeasure
} from './campaignMapDragMeasure.js';

import {
  getPresentationCSS
} from './campaignMapPresentationStyle.js';

import {
  applyPresentationItemRecord,
  getPresentationItemSelector,
  removeHiddenPresentationItems
} from './campaignMapPresentationItemSync.js';

let presentationWindow = null;
const fogImageCache = new WeakMap();

const presentationState = {
  x: 0,
  y: 0,
  zoom: 1,
  isPanning: false,
  lastX: 0,
  lastY: 0
};

export function openPresentationWindow() {

  if (
    presentationWindow &&
    !presentationWindow.closed
  ) {

    presentationWindow.focus();
    return;
  }

  presentationWindow =
    window.open(
      '',
      'campaign-map-presentation',
      'popup=yes,width=1280,height=720'
    );

  presentationWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Карта кампании</title>
        <style>
          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            background: #050505;
          }

          .presentation-map {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="presentation-map"></div>
      </body>
    </html>
  `);

  presentationWindow.document.close();

  bindPresentationViewportEvents(
    presentationWindow.document.querySelector('.presentation-map')
  );
}

export function syncPresentation() {

  if (
    !presentationWindow ||
    presentationWindow.closed
  ) return;

  const source =
    document.querySelector('.campaign-map-stage');

  const target =
    presentationWindow.document.querySelector('.presentation-map');

  if (!source || !target) return;

  const store =
    getCampaignMapStore(
      source.closest('.campaign-map-document')
    );

  const model =
    store?.getModel();

  const clone =
    preparePresentationClone(
      source,
      model
    );

  target.innerHTML =
    '';

  target.appendChild(
    clone
  );

  applyPresentationViewportTransform();
  ensurePresentationStyle();
}

export function syncPresentationItemById(
  sourceMap,
  itemType,
  itemId
) {

  if (
    !sourceMap ||
    !itemId ||
    !presentationWindow ||
    presentationWindow.closed
  ) return false;

  const store =
    getCampaignMapStore(
      sourceMap
    );

  const model =
    store?.getModel();

  const record =
    itemType === 'shape'
      ? model?.getShape(itemId)
      : model?.getToken(itemId);

  const targetStage =
    presentationWindow.document.querySelector('.campaign-map-stage');

  if (!targetStage) return false;

  const selector =
    getPresentationItemSelector(
      itemType,
      itemId
    );

  if (!selector) return false;

  const targetItem =
    targetStage.querySelector(
      selector
    );

  if (
    !record ||
    record.presentationHidden
  ) {

    targetItem?.remove();
    return true;
  }

  if (!targetItem) {

    syncPresentation();
    return false;
  }

  applyPresentationItemRecord(
    targetItem,
    itemType,
    record
  );

  return true;
}

export function syncPresentationDragMeasure(
  payload
) {

  if (
    !presentationWindow ||
    presentationWindow.closed
  ) return false;

  const targetStage =
    presentationWindow.document.querySelector('.campaign-map-stage');

  const targetViewport =
    targetStage?.querySelector('.campaign-map-viewport');

  return renderPresentationDragMeasure(
    targetViewport,
    payload
  );
}

function bindPresentationViewportEvents(
  target
) {

  target.addEventListener(
    'wheel',
    handlePresentationWheel,
    { passive: false }
  );

  target.addEventListener(
    'pointerdown',
    handlePresentationPointerDown
  );

  presentationWindow.document.addEventListener(
    'pointermove',
    handlePresentationPointerMove
  );

  presentationWindow.document.addEventListener(
    'pointerup',
    handlePresentationPointerUp
  );
}

function preparePresentationClone(
  source,
  model
) {

  const sourceCanvas =
    source.querySelector('.campaign-map-fog-canvas');

  const fogImageSrc =
    getPresentationFogImage(
      source,
      sourceCanvas
    );

  const clone =
    source.cloneNode(true);

  removePresentationRuntime(
    clone
  );

  removeHiddenPresentationItems(
    clone,
    model
  );

  applyCloneViewportTransform(
    clone
  );

  replaceFogCanvasWithImage(
    clone,
    fogImageSrc
  );

  return clone;
}

function removePresentationRuntime(
  clone
) {

  clone
    .querySelectorAll('[data-runtime="true"]')
    .forEach(element => element.remove());

  clone
    .querySelectorAll('.campaign-map-token')
    .forEach(token => {

      token.classList.remove(
        'is-selected',
        'is-dragging',
        'is-resizing',
        'is-rotating',
        'is-offscreen'
      );
    });

  clone
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      shape.classList.remove(
        'is-selected',
        'is-resizing',
        'is-offscreen'
      );
    });
}

function applyCloneViewportTransform(
  clone
) {

  const viewport =
    clone.querySelector('.campaign-map-viewport');

  if (!viewport) return;

  viewport.style.transform =
    `translate(${presentationState.x}px, ${presentationState.y}px) scale(${presentationState.zoom})`;
}

function replaceFogCanvasWithImage(
  clone,
  fogImageSrc
) {

  clone
    .querySelectorAll('canvas')
    .forEach(canvas => {

      const image =
        document.createElement('img');

      image.className =
        'campaign-map-fog-image';

      image.src =
        fogImageSrc || '';

      canvas.replaceWith(
        image
      );
    });
}

function ensurePresentationStyle() {

  const style =
    presentationWindow.document.getElementById('campaign-map-presentation-style') ||
    presentationWindow.document.createElement('style');

  style.id =
    'campaign-map-presentation-style';

  if (!style.textContent) {

    style.textContent =
      getPresentationCSS();
  }

  presentationWindow.document.head.appendChild(
    style
  );
}

function getPresentationFogImage(
  source,
  canvas
) {

  if (!canvas) return source.dataset.fogImage || '';

  const version =
    source.dataset.fogVersion || '0';

  const cached =
    fogImageCache.get(
      canvas
    );

  if (
    cached &&
    cached.version === version
  ) {

    return cached.url;
  }

  const url =
    canvas.toDataURL('image/png');

  fogImageCache.set(
    canvas,
    {
      version,
      url
    }
  );

  return url;
}

function handlePresentationWheel(
  event
) {

  event.preventDefault();

  const rect =
    event.currentTarget.getBoundingClientRect();

  const factor =
    event.deltaY < 0
      ? 1.08
      : 1 / 1.08;

  zoomPresentation(
    factor,
    {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  );
}

function handlePresentationPointerDown(
  event
) {

  event.preventDefault();

  presentationState.isPanning =
    true;

  presentationState.lastX =
    event.clientX;

  presentationState.lastY =
    event.clientY;
}

function handlePresentationPointerMove(
  event
) {

  if (!presentationState.isPanning) return;

  presentationState.x +=
    event.clientX - presentationState.lastX;

  presentationState.y +=
    event.clientY - presentationState.lastY;

  presentationState.lastX =
    event.clientX;

  presentationState.lastY =
    event.clientY;

  applyPresentationViewportTransform();
}

function handlePresentationPointerUp() {

  presentationState.isPanning =
    false;
}

function zoomPresentation(
  factor,
  anchor
) {

  const nextZoom =
    clamp(
      presentationState.zoom * factor,
      MIN_ZOOM,
      PRESENTATION_MAX_ZOOM
    );

  const worldX =
    (anchor.x - presentationState.x) / presentationState.zoom;

  const worldY =
    (anchor.y - presentationState.y) / presentationState.zoom;

  presentationState.zoom =
    nextZoom;

  presentationState.x =
    anchor.x - worldX * nextZoom;

  presentationState.y =
    anchor.y - worldY * nextZoom;

  applyPresentationViewportTransform();
}

function applyPresentationViewportTransform() {

  if (
    !presentationWindow ||
    presentationWindow.closed
  ) return false;

  const viewport =
    presentationWindow.document.querySelector(
      '.campaign-map-viewport'
    );

  if (!viewport) {

    syncPresentation();
    return false;
  }

  viewport.style.transform =
    `translate(${presentationState.x}px, ${presentationState.y}px) scale(${presentationState.zoom})`;

  return true;
}

function clamp(
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
