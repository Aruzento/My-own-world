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
  createCampaignMapPresentationFogPayload,
  createCampaignMapPresentationItemsPayload,
  createCampaignMapPresentationPayload
} from './campaignMapPresentationPayload.js';

import {
  applyPresentationItemRecord,
  getPresentationItemSelector,
  removeHiddenPresentationItems
} from './campaignMapPresentationItemSync.js';

import {
  isTauriRuntime,
  openTauriWebviewWindow
} from '../storage/tauriBridge.js';

import {
  nowMs,
  recordWorkspacePerformance
} from '../performance/workspacePerformance.js';

let presentationWindow = null;
let presentationMode = 'browser';
let presentationChannel = null;
let pendingTauriPresentationRender = false;
let pendingTauriImagePreview = null;
const fogImageCache = new WeakMap();

const PRESENTATION_CHANNEL_NAME =
  'my-own-world-campaign-map-presentation';

const presentationState = {
  x: 0,
  y: 0,
  zoom: 1,
  isPanning: false,
  lastX: 0,
  lastY: 0
};

export function openPresentationWindow() {

  const startedAt =
    nowMs();

  if (isTauriRuntime()) {

    openTauriPresentationWindow(
      startedAt
    );
    return;
  }

  if (
    presentationWindow &&
    !presentationWindow.closed
  ) {

    presentationWindow.focus();

    recordPresentationOpenPerformance(
      startedAt,
      'browser',
      'completed'
    );

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

  recordPresentationOpenPerformance(
    startedAt,
    'browser',
    'completed'
  );
}

export function syncPresentation() {

  if (presentationMode === 'tauri') {

    sendTauriPresentationRender();
    return;
  }

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
  itemId,
  options = {}
) {

  if (presentationMode === 'tauri') {

    sendTauriPresentationItemsPatch(
      sourceMap,
      [
        {
          itemType,
          itemId
        }
      ]
    );

    return true;
  }

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
    (
      record.presentationHidden &&
      !isPlayerPresentationToken(record)
    )
  ) {

    targetItem?.remove();
    return true;
  }

  if (!targetItem) {

    if (options.fallbackFullSync !== false) {

      syncPresentation();
    }

    return false;
  }

  applyPresentationItemRecord(
    targetItem,
    itemType,
    record
  );

  return true;
}


export function syncPresentationItemsById(
  sourceMap,
  items = []
) {

  if (!items.length) return true;

  if (presentationMode === 'tauri') {

    sendTauriPresentationItemsPatch(
      sourceMap,
      items
    );

    return true;
  }

  let needsFullSync =
    false;

  items.forEach(item => {

    const synced =
      syncPresentationItemById(
        sourceMap,
        item.itemType,
        item.itemId,
        {
          fallbackFullSync:
            false
        }
      );

    if (!synced) {

      needsFullSync =
        true;
    }
  });

  if (needsFullSync) {

    syncPresentation();
  }

  return !needsFullSync;
}


export function syncPresentationFog(
  sourceMap
) {

  if (presentationMode === 'tauri') {

    sendTauriPresentationFogPatch(
      sourceMap
    );

    return true;
  }

  if (
    !sourceMap ||
    !presentationWindow ||
    presentationWindow.closed
  ) return false;

  const sourceStage =
    sourceMap.querySelector('.campaign-map-stage') ||
    sourceMap;

  const store =
    getCampaignMapStore(
      sourceStage.closest('.campaign-map-document')
    );

  const model =
    store?.getModel();

  const sourceCanvas =
    sourceStage.querySelector('.campaign-map-fog-canvas');

  const targetViewport =
    presentationWindow.document.querySelector('.campaign-map-viewport');

  const targetFog =
    targetViewport?.querySelector('.campaign-map-fog-image');

  if (!sourceCanvas || !targetFog || !targetViewport) {

    syncPresentation();

    return false;
  }

  targetFog.src =
    getPresentationFogImage(
      sourceStage,
      sourceCanvas
    );

  applyPresentationSystemLayerState(
    targetFog,
    model,
    'map-fog'
  );

  renderPresentationLockedFogZones(
    targetViewport,
    model
  );

  return true;
}

export function syncPresentationDragMeasure(
  payload
) {

  if (presentationMode === 'tauri') {

    sendTauriPresentationMeasurePatch(
      payload
    );

    return true;
  }

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


function openTauriPresentationWindow(
  startedAt = nowMs()
) {

  presentationMode =
    'tauri';

  ensureTauriPresentationChannel();

  if (presentationWindow) {

    presentationWindow.setFocus?.();
    sendTauriPresentationRender();

    recordPresentationOpenPerformance(
      startedAt,
      'tauri',
      'completed'
    );

    return;
  }

  openTauriWebviewWindow(
    'campaign-map-presentation',
    {
      url: '/presentation.html',
      title: 'Карта кампании',
      width: 1280,
      height: 720,
      resizable: true
    }
  )
    .then(windowHandle => {

      presentationWindow =
        windowHandle;

      windowHandle.once?.(
        'tauri://created',
        () => {

          pendingTauriPresentationRender =
            false;

          sendTauriPresentationRender();

          recordPresentationOpenPerformance(
            startedAt,
            'tauri',
            'completed'
          );
        }
      );

      windowHandle.once?.(
        'tauri://error',
        event => {

          console.error(
            'Не удалось создать Tauri-окно презентации.',
            event
          );

          presentationMode =
            'browser';

          presentationWindow =
            null;

          pendingTauriPresentationRender =
            false;

          recordPresentationOpenPerformance(
            startedAt,
            'tauri',
            'failed'
          );
        }
      );

      windowHandle.once?.(
        'tauri://destroyed',
        () => {

          presentationWindow =
            null;

          pendingTauriPresentationRender =
            false;
        }
      );

      setTimeout(
        sendTauriPresentationRender,
        250
      );
    })
    .catch(error => {

      console.error(
        'Не удалось открыть Tauri-окно презентации.',
        error
      );

      presentationMode =
        'browser';

      presentationWindow =
        null;

      recordPresentationOpenPerformance(
        startedAt,
        'tauri',
        'failed'
      );
    });
}


function recordPresentationOpenPerformance(
  startedAt,
  mode,
  status
) {

  const endedAt =
    nowMs();

  recordWorkspacePerformance({
    operation:
      'campaign-map-presentation-open',
    startedAt,
    endedAt,
    durationMs:
      endedAt - startedAt,
    counts: {
      mode
    },
    status
  });
}


function ensureTauriPresentationChannel() {

  if (presentationChannel) return presentationChannel;

  presentationChannel =
    new BroadcastChannel(
      PRESENTATION_CHANNEL_NAME
    );

  presentationChannel.addEventListener(
    'message',
    event => {

      if (event.data?.type === 'ready') {

        pendingTauriPresentationRender =
          false;

        sendTauriPresentationRender();

        if (pendingTauriImagePreview) {

          postTauriPresentationImagePreview(
            pendingTauriImagePreview
          );
        }
      }
    }
  );

  return presentationChannel;
}


function sendTauriPresentationRender() {

  if (presentationMode !== 'tauri') return false;

  const channel =
    ensureTauriPresentationChannel();

  createPresentationRenderPayload()
    .then(payload => {

      if (!payload) return;

      channel.postMessage(
        payload
      );

      pendingTauriPresentationRender =
        true;
    })
    .catch(error => {

      console.error(
        'Не удалось подготовить model-first payload презентации.',
        error
      );
    });

  return true;
}


function sendTauriPresentationImagePreview(
  imageSrc,
  title
) {

  if (presentationMode !== 'tauri') return false;

  pendingTauriImagePreview = {
    imageSrc,
    title: title || 'Изображение'
  };

  return postTauriPresentationImagePreview(
    pendingTauriImagePreview
  );
}


function postTauriPresentationImagePreview(
  payload
) {

  const channel =
    ensureTauriPresentationChannel();

  channel.postMessage({
    type: 'image-preview',
    imageSrc: payload.imageSrc,
    title: payload.title
  });

  return true;
}


function sendTauriPresentationItemsPatch(
  sourceMap,
  items
) {

  if (
    presentationMode !== 'tauri' ||
    !items?.length
  ) return false;

  const sourceStage =
    sourceMap?.querySelector?.('.campaign-map-stage') ||
    sourceMap;

  if (!sourceStage) return false;

  const store =
    getCampaignMapStore(
      sourceStage.closest('.campaign-map-document')
    );

  const model =
    store?.getModel();

  if (!model) return false;

  createCampaignMapPresentationItemsPayload(
    sourceStage,
    model,
    items
  )
    .then(payload => {

      if (!payload) return;

      ensureTauriPresentationChannel()
        .postMessage(
          payload
        );
    })
    .catch(error => {

      console.error(
        'Не удалось подготовить частичное обновление презентации.',
        error
      );
    });

  return true;
}


function sendTauriPresentationFogPatch(
  sourceMap
) {

  if (presentationMode !== 'tauri') return false;

  const sourceStage =
    sourceMap?.querySelector?.('.campaign-map-stage') ||
    sourceMap;

  if (!sourceStage) return false;

  const store =
    getCampaignMapStore(
      sourceStage.closest('.campaign-map-document')
    );

  const model =
    store?.getModel();

  const payload =
    createCampaignMapPresentationFogPayload(
      sourceStage,
      model
    );

  if (!payload) return false;

  ensureTauriPresentationChannel()
    .postMessage(
      payload
    );

  return true;
}


function sendTauriPresentationMeasurePatch(
  measure
) {

  if (presentationMode !== 'tauri') return false;

  ensureTauriPresentationChannel()
    .postMessage({
      type: 'drag-measure',
      measure
    });

  return true;
}


async function createPresentationRenderPayload() {

  const source =
    document.querySelector(
      '.campaign-map-stage'
    );

  if (!source) return null;

  const store =
    getCampaignMapStore(
      source.closest('.campaign-map-document')
    );

  const model =
    store?.getModel();

  const modelPayload =
    await createCampaignMapPresentationPayload(
      source,
      model
    );

  if (modelPayload) return modelPayload;

  const clone =
    preparePresentationClone(
      source,
      model
    );

  return {
    type: 'render',
    html: clone.outerHTML,
    css: getPresentationCSS()
  };
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
    fogImageSrc,
    model
  );

  renderPresentationLockedFogZones(
    clone,
    model
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
  fogImageSrc,
  model
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

      applyPresentationSystemLayerState(
        image,
        model,
        'map-fog'
      );

      canvas.replaceWith(
        image
      );
    });
}


function renderPresentationLockedFogZones(
  target,
  model
) {

  const viewport =
    target.classList?.contains('campaign-map-viewport')
      ? target
      : target.querySelector('.campaign-map-viewport');

  if (!viewport) return;

  viewport
    .querySelectorAll('.campaign-presentation-locked-fog-zone')
    .forEach(zone => zone.remove());

  (model?.fog?.lockedZones || [])
    .forEach(zone => {

      const element =
        document.createElement('div');

      element.className =
        'campaign-presentation-locked-fog-zone';

      element.dataset.layerId =
        'map-locked-fog';

      element.style.left =
        `${Number(zone.x || 0)}px`;

      element.style.top =
        `${Number(zone.y || 0)}px`;

      element.style.width =
        `${Number(zone.width || 0)}px`;

      element.style.height =
        `${Number(zone.height || 0)}px`;

      applyPresentationSystemLayerState(
        element,
        model,
        'map-locked-fog'
      );

      viewport.appendChild(
        element
      );
    });
}


function applyPresentationSystemLayerState(
  element,
  model,
  layerId
) {

  if (!element) return;

  const layer =
    (model?.layers || []).find(item =>
      item.layerId === layerId
    );

  element.dataset.layerId =
    layerId;

  element.dataset.layerHidden =
    layer?.visible === false
      ? 'true'
      : 'false';

  element.style.zIndex =
    String(
      layer?.zIndex ||
      (
        layerId === 'map-locked-fog'
          ? 130
          : 120
      )
    );
}


export function openPresentationImagePreview(
  imageSrc,
  title
) {

  if (
    !imageSrc
  ) return false;

  if (presentationMode === 'tauri') {

    if (!presentationWindow) {

      openPresentationWindow();
      syncPresentation();
    }

    return sendTauriPresentationImagePreview(
      imageSrc,
      title
    );
  }

  if (
    !presentationWindow ||
    presentationWindow.closed
  ) {

    openPresentationWindow();
    syncPresentation();
  }

  const document =
    presentationWindow.document;

  const existingPreview =
    document.querySelector('.presentation-image-preview');

  if (
    existingPreview?.dataset.imageSrc === imageSrc
  ) {

    existingPreview.remove();
    presentationWindow.focus();

    return false;
  }

  existingPreview?.remove();

  const preview =
    document.createElement('div');

  preview.className =
    'presentation-image-preview';

  preview.dataset.imageSrc =
    imageSrc;

  preview.innerHTML = `
    <button class="presentation-image-preview-close" type="button">×</button>
    <div class="presentation-image-preview-title">${escapeHtml(title || 'Изображение')}</div>
    <img src="${imageSrc}" alt="">
  `;

  preview
    .querySelector('button')
    .addEventListener(
      'click',
      () => preview.remove()
    );

  document.body.appendChild(
    preview
  );

  presentationWindow.focus();

  return true;
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


function isPlayerPresentationToken(
  token
) {

  return token?.sourceMode === 'original' ||
    token?.isPlayerToken === true;
}


function escapeHtml(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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
