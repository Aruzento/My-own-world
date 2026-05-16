import {
  MAX_ZOOM,
  MIN_ZOOM,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';


let presentationWindow = null;

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

  const sourceCanvas =
    source.querySelector('.campaign-map-fog-canvas');

  const fogImageSrc =
    sourceCanvas
      ? sourceCanvas.toDataURL('image/png')
      : source.dataset.fogImage;

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
        'is-rotating'
      );
    });

  clone
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      shape.classList.remove(
        'is-selected',
        'is-resizing'
      );
    });

  clone
    .querySelectorAll('.campaign-map-shape[data-presentation-hidden="true"]')
    .forEach(shape => {

      shape.remove();
    });

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

  const style =
    presentationWindow.document.getElementById('campaign-map-presentation-style') ||
    presentationWindow.document.createElement('style');

  style.id =
    'campaign-map-presentation-style';

  style.textContent =
    getPresentationCSS();

  presentationWindow.document.head.appendChild(
    style
  );
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

  syncPresentation();
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
      MAX_ZOOM
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

  syncPresentation();
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
        linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px);
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
      transform: translate(-50%, -50%) rotate(var(--token-rotation, 0deg));
      z-index: 4;
      pointer-events: auto;
      width: calc(var(--campaign-grid-size, 48px) * var(--token-size, 1));
      height: calc(var(--campaign-grid-size, 48px) * var(--token-size, 1));
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
      display: none;
    }

    .campaign-map-token.is-creature[data-hp-state="dead"]::after {
      content: "RIP";
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background:
        radial-gradient(circle at 50% 35%, rgba(255,255,255,0.10), transparent 48%),
        rgba(24,18,18,0.92);
      font: 900 15px/1 system-ui, sans-serif;
      letter-spacing: 0;
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
