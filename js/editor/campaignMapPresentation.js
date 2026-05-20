import {
  MIN_ZOOM,
  PRESENTATION_MAX_ZOOM,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  getCampaignMapModel,
  refreshCampaignMapModel
} from './campaignMapModel.js';

import {
  applyTokenRotation,
  applyTokenSize,
  positionToken
} from './campaignMapTokens.js';

import {
  renderMapShape
} from './campaignMapShapes.js';

import {
  renderPresentationDragMeasure
} from './campaignMapDragMeasure.js';


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

  const target =
    presentationWindow.document.querySelector('.presentation-map');

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

  const model =
    refreshCampaignMapModel(
      source.closest('.campaign-map-document')
    );

  const sourceCanvas =
    source.querySelector('.campaign-map-fog-canvas');

  const fogImageSrc =
    getPresentationFogImage(
      source,
      sourceCanvas
    );

  const clone =
    source.cloneNode(true);

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

  removeHiddenPresentationItems(
    clone,
    model
  );


  const viewport =
    clone.querySelector('.campaign-map-viewport');

  if (viewport) {

    viewport.style.transform =
      `translate(${presentationState.x}px, ${presentationState.y}px) scale(${presentationState.zoom})`;
  }

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

  target.innerHTML =
    '';

  target.appendChild(
    clone
  );

  applyPresentationViewportTransform();

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


function removeHiddenPresentationItems(
  clone,
  model
) {

  const hiddenTokenIds =
    new Set(
      (model?.tokens || [])
        .filter(token => token.presentationHidden)
        .map(token => token.tokenId)
    );

  const hiddenShapeIds =
    new Set(
      (model?.shapes || [])
        .filter(shape => shape.presentationHidden)
        .map(shape => shape.shapeId)
    );

  clone
    .querySelectorAll('.campaign-map-token')
    .forEach(token => {

      if (
        hiddenTokenIds.has(
          token.dataset.tokenId
        )
      ) {

        token.remove();
      }
    });

  clone
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      if (
        hiddenShapeIds.has(
          shape.dataset.shapeId
        )
      ) {

        shape.remove();
      }
    });
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

  const model =
    getCampaignMapModel(
      sourceMap
    );

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


function applyPresentationItemRecord(
  targetItem,
  itemType,
  record
) {

  if (itemType === 'shape') {

    targetItem.dataset.shapeId =
      record.shapeId;

    targetItem.dataset.shapeType =
      record.type;

    targetItem.dataset.x =
      String(Math.round(record.x));

    targetItem.dataset.y =
      String(Math.round(record.y));

    targetItem.dataset.w =
      String(Math.round(record.width));

    targetItem.dataset.h =
      String(Math.round(record.height));

    if (record.points) {

      targetItem.dataset.points =
        record.points;

    } else {

      delete targetItem.dataset.points;
    }

    targetItem.dataset.presentationHidden =
      record.presentationHidden
        ? 'true'
        : 'false';

    renderMapShape(
      targetItem
    );

    targetItem
      .querySelectorAll('[data-runtime="true"]')
      .forEach(element => element.remove());

    targetItem.classList.remove(
      'is-selected',
      'is-resizing',
      'is-offscreen'
    );

    return;
  }

  targetItem.dataset.tokenId =
    record.tokenId;

  targetItem.dataset.tokenType =
    record.type;

  targetItem.classList.toggle(
    'is-creature',
    record.type === 'creature'
  );

  targetItem.classList.toggle(
    'is-object',
    record.type === 'object'
  );

  targetItem.dataset.x =
    record.x.toFixed(3);

  targetItem.dataset.y =
    record.y.toFixed(3);

  targetItem.dataset.size =
    record.size.toFixed(3);

  targetItem.dataset.rotation =
    String(record.rotation);

  targetItem.dataset.name =
    record.name;

  if (record.pageId) {

    targetItem.dataset.pageId =
      record.pageId;

  } else {

    delete targetItem.dataset.pageId;
  }

  if (record.imageAsset) {

    targetItem.dataset.imageAsset =
      record.imageAsset;

  } else {

    delete targetItem.dataset.imageAsset;
  }

  targetItem.dataset.presentationHidden =
    record.presentationHidden
      ? 'true'
      : 'false';

  positionToken(
    targetItem
  );

  applyTokenSize(
    targetItem
  );

  applyTokenRotation(
    targetItem
  );

  targetItem.classList.remove(
    'is-selected',
    'is-dragging',
    'is-resizing',
    'is-rotating',
    'is-offscreen'
  );
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


function getPresentationItemSelector(
  itemType,
  key
) {

  const escapedKey =
    CSS.escape(
      key
    );

  if (itemType === 'token') {

    return `.campaign-map-token[data-token-id="${escapedKey}"]`;
  }

  if (itemType === 'shape') {

    return `.campaign-map-shape[data-shape-id="${escapedKey}"]`;
  }

  return '';
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


function getPresentationCSS() {

  return `
    .campaign-map-stage {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #161616;
      touch-action: none;
    }

    .campaign-map-viewport {
      position: absolute;
      left: 0;
      top: 0;
      width: ${WORLD_WIDTH}px;
      height: ${WORLD_HEIGHT}px;
      transform-origin: 0 0;
    }

    .campaign-map-background,
    .campaign-map-object-layer,
    .campaign-map-fog-image {
      position: absolute;
      inset: 0;
    }

    .campaign-map-background {
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
    }

    .campaign-map-stage[data-grid="true"] .campaign-map-viewport::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(var(--campaign-grid-color, rgba(255,255,255,0.12)) 1px, transparent 1px),
        linear-gradient(90deg, var(--campaign-grid-color, rgba(255,255,255,0.12)) 1px, transparent 1px);
      background-size:
        var(--campaign-grid-size, 48px)
        var(--campaign-grid-size, 48px);
      pointer-events: none;
      z-index: 3;
    }

    .campaign-map-object-layer {
      pointer-events: none;
    }

    .campaign-map-token {
      position: absolute;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      overflow: hidden;
      transform: translate(-50%, -50%) rotate(var(--token-rotation, 0deg));
      z-index: 4;
      pointer-events: auto;
      width: calc(var(--campaign-grid-size, 48px) * var(--token-size, 1));
      height: calc(var(--campaign-grid-size, 48px) * var(--token-size, 1));
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.86);
      background: #f1d38e;
      color: #201a10;
      font: 700 13px system-ui;
    }

    .campaign-map-token.is-creature[data-hp-percent] {
      border-color: var(--token-health-color, rgba(255,255,255,0.86));
      box-shadow:
        0 0 0 4px color-mix(in srgb, var(--token-health-color, #65b96b) 32%, transparent),
        0 12px 28px rgba(0,0,0,0.36);
    }

    .campaign-map-token.is-creature[data-hp-state="dead"] {
      border-color: rgba(210,58,58,0.96);
      background: rgba(24,18,18,0.92);
      color: rgba(255,238,230,0.98);
    }

    .campaign-map-token.is-creature[data-hp-state="dead"] .campaign-map-token-image {
      filter: grayscale(1) contrast(0.92) brightness(0.72);
    }

    .campaign-map-token.is-creature[data-hp-state="dead"]::after {
      content: "×";
      position: absolute;
      inset: 10%;
      display: grid;
      place-items: center;
      border-radius: inherit;
      background:
        radial-gradient(circle, rgba(120,18,18,0.34), rgba(120,18,18,0.08) 54%, transparent 68%);
      color: rgba(255,72,72,0.94);
      font: 900 clamp(22px, calc(var(--campaign-grid-size, 48px) * 0.72), 52px)/1 system-ui, sans-serif;
      letter-spacing: 0;
      text-shadow:
        0 2px 8px rgba(0,0,0,0.52),
        0 0 16px rgba(255,54,54,0.36);
      pointer-events: none;
    }

    .campaign-map-token.is-object {
      z-index: 2;
      border-radius: 0;
      border-color: transparent;
      background: transparent;
      color: #1d1d1d;
    }

    .campaign-map-token[data-presentation-hidden="true"] {
      display: none;
    }

    .campaign-map-token-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      border-radius: inherit;
      object-fit: cover;
    }

    .campaign-map-token.is-object .campaign-map-token-image {
      border-radius: 0;
      object-fit: contain;
    }

    .campaign-map-shape {
      position: absolute;
      z-index: 8;
      pointer-events: none;
    }

    .campaign-map-shape-svg {
      width: 100%;
      height: 100%;
      display: block;
      overflow: visible;
    }

    .campaign-map-shape-svg rect,
    .campaign-map-shape-svg polygon,
    .campaign-map-shape-svg ellipse {
      fill: rgba(241,211,142,0.15);
      stroke: rgba(255,244,214,0.92);
      stroke-width: 3;
      vector-effect: non-scaling-stroke;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.32));
    }

    .campaign-map-shape-label {
      position: absolute;
      padding: 3px 7px;
      border: 1px solid rgba(255,248,230,0.68);
      border-radius: 999px;
      background: rgba(20,18,14,0.76);
      color: rgba(255,250,236,0.96);
      font: 800 11px/1 system-ui, sans-serif;
      white-space: nowrap;
      pointer-events: none;
      transform: translate(-50%, -50%);
    }

    .campaign-map-shape-label.is-top {
      left: 50%;
      top: -10px;
    }

    .campaign-map-shape-label.is-right {
      left: calc(100% + 12px);
      top: 50%;
    }

    .campaign-map-drag-measure {
      position: absolute;
      inset: 0;
      z-index: 10;
      overflow: visible;
      pointer-events: none;
    }

    .campaign-map-drag-measure line {
      stroke: rgba(255,244,214,0.96);
      stroke-width: 4;
      stroke-linecap: round;
      marker-end: url(#campaign-drag-arrow);
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }

    .campaign-map-drag-measure path {
      fill: rgba(255,244,214,0.96);
    }

    .campaign-map-drag-measure text {
      fill: rgba(255,250,236,0.98);
      paint-order: stroke;
      stroke: rgba(20,18,14,0.9);
      stroke-width: 5;
      font: 700 28px system-ui, sans-serif;
      text-anchor: middle;
    }

    .campaign-map-fog-image {
      width: 100%;
      height: 100%;
      object-fit: fill;
      z-index: 5;
      opacity: 1 !important;
      pointer-events: none;
    }
  `;
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
