import { state } from '../state.js';

import {
  getImageURL
} from '../storage/assetStorage.js';

import {
  iconSvg
} from '../core/icons.js';

import {
  writeFile
} from '../storage/storage.js';

import {
  setStatus
} from '../ui/ui.js';

import {
  positionPopupNearAnchor
} from '../ui/popupPosition.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_SIZE,
  DEFAULT_SHAPE_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  clearMapBackgroundCache,
  setMapInteractionQuality as setMapBackgroundInteractionQuality,
  updateMapBackgroundQuality
} from './campaignMapBackground.js';

import {
  clamp,
  getActiveGridSize,
  getShapeWorldRect,
  getStageView,
  getTokenWorldRect,
  getVisibleSpawnPoint,
  getVisibleWorldRect,
  isActiveMapObject,
  rectsIntersect,
  setStageView
} from './campaignMapGeometry.js';

import {
  renderMapShape
} from './campaignMapShapes.js';

import {
  removeTokensFromMapElement,
  removeTokensFromMapPageContent
} from './campaignMapSerializerHelpers.js';

import {
  createPageLookup,
  clearTreeHighlight,
  highlightTreePage
} from './campaignMapTreeIntegration.js';

import {
  getFogPopupHTML,
  getGridPopupHTML,
  getMapControlsHTML,
  getShapesPopupHTML
} from './campaignMapToolbar.js';

import {
  openAddKindPopup
} from './campaignMapPicker.js';

import {
  refreshCampaignMapModel
} from './campaignMapModel.js';

import {
  applyTokenRotation,
  applyTokenSize,
  getPagePortraitAsset,
  positionToken,
  restoreTokenImage,
  setTokenFallbackText
} from './campaignMapTokens.js';

import {
  changeTokenHp,
  deleteMapShape,
  deleteTokenAndPage,
  duplicateMapShape,
  duplicateTokenAndPage,
  ensureTokenHasHealthBlock,
  getTokenPage,
  openTokenCard,
  toggleMapItemPresentationVisibility
} from './campaignMapTokenActions.js';

import {
  clearDraggedToken,
  finishTokenInteractions,
  hasActiveTokenInteraction,
  moveTokenInteractions,
  startTokenDrag,
  startTokenResize,
  startTokenRotate
} from './campaignMapTokenDrag.js';

import {
  finishShapeInteractions,
  hasActiveShapeInteraction,
  moveShapeInteractions,
  startShapeDrag,
  startShapeResize
} from './campaignMapShapeDrag.js';

import {
  clearFog,
  createFogDrawing,
  drawFogAtPointer as drawFogAtPointerOnCanvas,
  fillFog,
  setFogMode as setCampaignFogMode,
  setMapTool as setCampaignMapTool,
  updateFogButtons,
  updatePanButton
} from './campaignMapFog.js';

import {
  openPresentationWindow,
  syncPresentation
} from './campaignMapPresentation.js';

import {
  scheduleLivePresentationSync,
  schedulePresentationSync
} from './campaignMapPresentationSync.js';

import {
  isCampaignMapRecord,
  persistFogCanvas,
  rememberMapAssetSettings,
  restoreFogCanvas,
  restoreMapAssetSettings
} from './campaignMapContract.js';

import {
  getHealthColor,
  getPageDndHealth
} from './campaignMapHealth.js';

export {
  isCampaignMapPage,
  serializeCampaignMapHTML
} from './campaignMapContract.js';


let saveCurrentPageCallback = null;
let panningMap = null;
let fogDrawing = null;
let tokenPopupTimer = null;
let tokenPopupCloseTimer = null;
let activeTokenPopupToken = null;
let visibleObjectsFrame = null;
let pendingVisibleObjectsMap = null;
let pendingVisibleObjectsView = null;
const tokenHealthCache = new WeakMap();

const TOKEN_DRAG_THRESHOLD = 4;
const TOKEN_POPUP_DELAY = 420;
const TOKEN_RESIZE_THRESHOLD = 2;
const SHAPE_HANDLE_THRESHOLD = 2;
export function setupCampaignMaps(
  editor,
  saveCurrentPage
) {

  saveCurrentPageCallback =
    saveCurrentPage;

  editor.addEventListener(
    'click',
    handleMapClick
  );

  editor.addEventListener(
    'dblclick',
    handleMapDoubleClick
  );

  editor.addEventListener(
    'pointerover',
    handleMapPointerOver
  );

  editor.addEventListener(
    'pointerout',
    handleMapPointerOut
  );

  editor.addEventListener(
    'pointermove',
    handleBrushPreviewMove
  );

  editor.addEventListener(
    'pointerleave',
    hideAllBrushPreviews
  );

  editor.addEventListener(
    'pointerdown',
    handleMapPointerDown
  );

  editor.addEventListener(
    'input',
    handleMapInput
  );

  document.addEventListener(
    'pointermove',
    handleDocumentPointerMove
  );

  document.addEventListener(
    'pointerup',
    handleDocumentPointerUp
  );

  editor.addEventListener(
    'wheel',
    handleMapWheel,
    { passive: false }
  );
}


export async function renderCampaignMap(
  editor
) {

  const map =
    editor.querySelector('.campaign-map-document');

  if (!map) return;

  ensureMapControls(
    map
  );

  ensureViewportStructure(
    map
  );

  ensureMapViewState(
    map
  );

  await restoreMapBackground(
    map
  );

  await restoreMapTokens(
    map
  );

  await restoreFogCanvas(
    map
  );

  restoreMapShapes(
    map
  );

  applyViewportTransform(
    map
  );

  refreshCampaignMapModel(
    map
  );

  schedulePresentationSync();
}


export function syncCampaignMapPresentation() {

  schedulePresentationSync();
}


export async function removeDeletedCampaignMapTokens(
  pageIds
) {

  const ids =
    new Set(
      pageIds
    );

  if (ids.size === 0) return;

  const openMap =
    document.querySelector(
      '.campaign-map-document'
    );

  let openMapChanged =
    false;

  if (openMap) {

    openMapChanged =
      removeTokensFromMapElement(
        openMap,
        ids
      );
  }

  for (const page of state.pages) {

    if (
      ids.has(page.id) ||
      !isCampaignMapRecord(page)
    ) {

      continue;
    }

    if (
      openMapChanged &&
      state.currentPage?.id === page.id
    ) {

      continue;
    }

    await removeTokensFromMapPageContent(
      page,
      ids
    );
  }

  if (openMapChanged) {

    await saveAndSync();
  }
}


function ensureMapControls(
  map
) {

  const topbar =
    map.querySelector('.campaign-map-topbar');

  if (
    !topbar ||
    topbar.querySelector('.campaign-map-controls')
  ) return;

  const controls =
    document.createElement('div');

  controls.className =
    'campaign-map-controls';

  markRuntime(
    controls
  );

  controls.innerHTML =
    getMapControlsHTML();

  topbar.appendChild(
    controls
  );

  updateGridButton(
    map
  );

  updateFogButtons(
    map
  );

  updatePanButton(
    map
  );

  updateGridSize(
    map
  );
}


function ensureViewportStructure(
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


function ensureBrushPreview(
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


function ensureMapViewState(
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


async function handleMapClick(
  event
) {

  const map =
    event.target.closest('.campaign-map-document');

  if (!map) return;

  const token =
    event.target.closest('.campaign-map-token');

  const shape =
    event.target.closest('.campaign-map-shape');

  if (
    token &&
    token.dataset.tokenType === 'object'
  ) {

    selectMapToken(
      token
    );
  } else if (shape) {

    selectMapShape(
      shape
    );
  } else if (
    !event.target.closest('.campaign-map-controls') &&
    !event.target.closest('.campaign-map-popup')
  ) {

    clearSelectedMapTokens(
      map
    );

    clearSelectedMapShapes(
      map
    );
  }

  if (
    event.target.closest('.campaign-add-btn')
  ) {

    if (
      toggleMapPopupForAnchor(
        event.target.closest('.campaign-add-btn'),
        'add'
      )
    ) return;

    openAddKindPopup(
      map,
      event.target.closest('.campaign-add-btn'),
      getMapPickerDeps()
    );
    return;
  }

  if (
    event.target.closest('.campaign-pan-btn')
  ) {

    setMapTool(
      map,
      'pan'
    );

    await saveAndSync();
    return;
  }

  if (
    event.target.closest('.campaign-grid-btn')
  ) {

    if (
      toggleMapPopupForAnchor(
        event.target.closest('.campaign-grid-btn'),
        'grid'
      )
    ) return;

    openGridPopup(
      map,
      event.target.closest('.campaign-grid-btn')
    );

    return;
  }

  if (
    event.target.closest('.campaign-change-map-btn')
  ) {

    await changeMapImage(
      map
    );

    await saveAndSync();
    return;
  }

  if (
    event.target.closest('.campaign-open-presentation-btn')
  ) {

    openPresentationWindow();
    syncPresentation();
    return;
  }

  if (
    event.target.closest('.campaign-shapes-btn')
  ) {

    if (
      toggleMapPopupForAnchor(
        event.target.closest('.campaign-shapes-btn'),
        'shapes'
      )
    ) return;

    openShapesPopup(
      map,
      event.target.closest('.campaign-shapes-btn')
    );

    return;
  }

  if (
    event.target.closest('.campaign-fog-btn')
  ) {

    if (
      toggleMapPopupForAnchor(
        event.target.closest('.campaign-fog-btn'),
        'fog'
      )
    ) return;

    openFogPopup(
      map,
      event.target.closest('.campaign-fog-btn')
    );
  }
}


function openGridPopup(
  map,
  anchor
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const popup =
    getMapPopup();

  popup.innerHTML =
    getGridPopupHTML(
      stage
    );

  popup
    .querySelector('.campaign-grid-toggle-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();

        toggleGrid(
          map
        );

        event.currentTarget.textContent =
          stage.dataset.grid === 'true'
            ? 'Выключить сетку'
            : 'Включить сетку';

        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-grid-size-range')
    .addEventListener(
      'input',
      async event => {

        stage.dataset.gridSize =
          event.target.value;

        rememberMapAssetSettings(
          stage
        );

        updateGridSize(
          map
        );

        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-grid-color-input')
    .addEventListener(
      'input',
      async event => {

        stage.dataset.gridColor =
          event.target.value || DEFAULT_GRID_COLOR;

        rememberMapAssetSettings(
          stage
        );

        updateGridSize(
          map
        );

        await saveAndSync();
      }
    );

  showMapPopup(
    popup,
    anchor,
    'grid'
  );
}


function openFogPopup(
  map,
  anchor
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const popup =
    getMapPopup();

  popup.innerHTML =
    getFogPopupHTML(
      stage
    );

  popup
    .querySelector('.campaign-fog-draw-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        setFogMode(
          map,
          'draw'
        );
        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-erase-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        setFogMode(
          map,
          'erase'
        );
        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-map-range')
    .addEventListener(
      'input',
      async event => {

        stage.dataset.brushSize =
          event.target.value;

        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-fill-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        fillFog(
          map
        );
        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-clear-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        clearFog(
          map
        );
        await saveAndSync();
      }
    );

  updateFogButtons(
    map
  );

  showMapPopup(
    popup,
    anchor,
    'fog'
  );
}


function openShapesPopup(
  map,
  anchor
) {

  const popup =
    getMapPopup();

  popup.innerHTML =
    getShapesPopupHTML();

  popup
    .querySelectorAll('.campaign-shape-option')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();
          event.stopPropagation();

          addMapShape(
            map,
            button.dataset.shape
          );

          closeMapPopup();
          await saveAndSync();
        }
      );
    });

  showMapPopup(
    popup,
    anchor,
    'shapes'
  );
}


function toggleMapPopupForAnchor(
  anchor,
  key
) {

  const popup =
    getMapPopup();

  if (
    popup.dataset.popupKey === key &&
    popup.dataset.anchorKey === getAnchorKey(anchor) &&
    !popup.classList.contains('hidden')
  ) {

    closeMapPopup();
    return true;
  }

  return false;
}


function getMapPopup() {

  let popup =
    document.getElementById('campaignMapPopup');

  if (popup) return popup;

  popup =
    document.createElement('div');

  popup.id =
    'campaignMapPopup';

  popup.className =
    'campaign-map-popup hidden';

  markRuntime(
    popup
  );

  document.body.appendChild(
    popup
  );

  document.addEventListener(
    'click',
    event => {

      if (
        popup.classList.contains('hidden') ||
        popup.contains(event.target) ||
        event.target.closest('.campaign-map-controls')
      ) return;

      closeMapPopup();
    }
  );

  popup.addEventListener(
    'click',
    event => {

      event.stopPropagation();
    }
  );

  return popup;
}


function showMapPopup(
  popup,
  anchor,
  key = ''
) {

  popup.dataset.popupKey =
    key;

  popup.dataset.anchorKey =
    getAnchorKey(
      anchor
    );

  popup.classList.remove(
    'hidden'
  );

  requestAnimationFrame(
    () => {

      positionPopupNearAnchor(
        popup,
        anchor,
        {
          fallbackWidth: 320,
          fallbackHeight: 260
        }
      );
    }
  );
}


function closeMapPopup() {

  const popup =
    document.getElementById('campaignMapPopup');

  if (!popup) return;

  popup.classList.add('hidden');
  popup.dataset.popupKey =
    '';
  popup.dataset.anchorKey =
    '';
}


function getMapPickerDeps() {

  // Picker получает только нужные действия, а не весь модуль карты.
  return {
    addMapToken,
    closeMapPopup,
    getMapPopup,
    saveAndSync,
    showMapPopup
  };
}


function getTokenActionDeps() {

  // Action-модуль получает только операции, нужные для изменения карты.
  return {
    applyTokenHealthState,
    clearDraggedToken,
    closeTokenPopup,
    openTokenPopup,
    saveAndSync,
    selectMapShape
  };
}


function getTokenDragDeps() {

  // Drag-модуль токенов не знает popup/save/background детали напрямую.
  return {
    clearTokenPopupTimer,
    closeTokenPopup,
    saveAndSync,
    selectMapToken,
    setMapInteractionQuality
  };
}


function getShapeDragDeps() {

  // Shape drag использует те же инфраструктурные действия, что и token drag.
  return {
    clearTokenPopupTimer,
    closeTokenPopup,
    saveAndSync,
    selectMapShape,
    setMapInteractionQuality
  };
}


function getAnchorKey(
  anchor
) {

  if (!anchor) return '';

  if (!anchor.dataset.popupAnchorId) {

    anchor.dataset.popupAnchorId =
      crypto.randomUUID();
  }

  return anchor.dataset.popupAnchorId;
}


async function addMapToken(
  map,
  type,
  page = null,
  spawnIndex = 0
) {

  const layer =
    map.querySelector('.campaign-map-object-layer');

  if (!layer) return;

  const index =
    layer.querySelectorAll(`[data-token-type="${type}"]`).length + 1;

  const token =
    document.createElement('button');

  token.className =
    `campaign-map-token is-${type}`;

  token.type =
    'button';

  token.dataset.tokenId =
    crypto.randomUUID();

  token.dataset.tokenType =
    type;

  if (page) {

    token.dataset.pageId =
      page.id;

    const imageAsset =
      getPagePortraitAsset(
        page
      );

    if (imageAsset) {

      token.dataset.imageAsset =
        imageAsset;
    }
  }

  const spawnPoint =
    getVisibleSpawnPoint(
      map,
      spawnIndex
    );

  token.dataset.x =
    ((spawnPoint.x / WORLD_WIDTH) * 100).toFixed(3);

  token.dataset.y =
    ((spawnPoint.y / WORLD_HEIGHT) * 100).toFixed(3);

  token.dataset.name =
    page?.title ||
    (
      type === 'creature'
        ? `Существо ${index}`
        : `Объект ${index}`
    );

  if (!token.dataset.size) {

    token.dataset.size =
      '1';
  }

  if (!token.dataset.rotation) {

    token.dataset.rotation =
      '0';
  }

  setTokenFallbackText(
    token,
    type
  );

  layer.appendChild(
    token
  );

  positionToken(
    token
  );

  applyTokenSize(
    token
  );

  applyTokenRotation(
    token
  );

  applyTokenHealthState(
    token
  );

  await restoreTokenImage(
    token
  );

  refreshCampaignMapModel(
    map
  );
}


async function restoreMapTokens(
  map
) {

  const pageLookup =
    createPageLookup();

  const tokens =
    [...map
    .querySelectorAll('.campaign-map-token')
    ];

  for (const token of tokens) {

    positionToken(
      token
    );

    applyTokenSize(
      token
    );

    applyTokenRotation(
      token
    );

    if (!token.dataset.imageAsset) {

      const page =
        pageLookup.get(
          token.dataset.pageId
        );

      const imageAsset =
        page
          ? getPagePortraitAsset(page)
          : '';

      if (imageAsset) {

          token.dataset.imageAsset =
            imageAsset;
      }
    }

    applyTokenHealthState(
      token,
      pageLookup
    );

    await restoreTokenImage(
      token
    );
  }
}


function applyTokenHealthState(
  token,
  pageLookup = null
) {

  if (
    token.dataset.tokenType !== 'creature'
  ) {

    clearTokenHealthState(
      token
    );

    return;
  }

  const page =
    pageLookup
      ? pageLookup.get(token.dataset.pageId)
      : state.pages.find(candidate =>
        candidate.id === token.dataset.pageId
      );

  const health =
    getPageDndHealth(
      page
    );

  const cacheKey =
    health
      ? `${health.current}/${health.max}/${health.temp || 0}`
      : 'none';

  if (
    tokenHealthCache.get(token) === cacheKey
  ) return;

  tokenHealthCache.set(
    token,
    cacheKey
  );

  if (!health) {

    clearTokenHealthState(
      token
    );

    return;
  }

  const percent =
    clamp(
      health.current / health.max,
      0,
      1
    );

  token.dataset.hpPercent =
    String(
      Math.round(percent * 100)
    );

  token.dataset.hpState =
    health.current <= 0
      ? 'dead'
      : 'alive';

  token.style.setProperty(
    '--token-health-color',
    getHealthColor(
      percent
    )
  );
}


function clearTokenHealthState(
  token
) {

  delete token.dataset.hpPercent;
  delete token.dataset.hpState;

  token.style.removeProperty(
    '--token-health-color'
  );
}


function selectMapToken(
  token
) {

  const map =
    token.closest('.campaign-map-document');

  clearSelectedMapTokens(
    map
  );

  token.classList.add(
    'is-selected'
  );
}


function clearSelectedMapTokens(
  map
) {

  map
    ?.querySelectorAll('.campaign-map-token.is-selected')
    .forEach(token => {

      token.classList.remove(
        'is-selected'
      );
    });
}


function clearSelectedMapShapes(
  map
) {

  map
    ?.querySelectorAll('.campaign-map-shape.is-selected')
    .forEach(shape => {

      shape.classList.remove(
        'is-selected'
      );
    });
}


function restoreMapShapes(
  map
) {

  map
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      renderMapShape(
        shape
      );
    });
}


function addMapShape(
  map,
  type
) {

  const layer =
    map.querySelector('.campaign-map-object-layer');

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!layer || !stage) return;

  const view =
    getStageView(
      stage
    );

  const x =
    clamp(
      (stage.clientWidth / 2 - view.x) / view.zoom - DEFAULT_SHAPE_SIZE / 2,
      0,
      WORLD_WIDTH - DEFAULT_SHAPE_SIZE
    );

  const y =
    clamp(
      (stage.clientHeight / 2 - view.y) / view.zoom - DEFAULT_SHAPE_SIZE / 2,
      0,
      WORLD_HEIGHT - DEFAULT_SHAPE_SIZE
    );

  const shape =
    document.createElement('div');

  shape.className =
    'campaign-map-shape';

  shape.dataset.shapeType =
    type;

  shape.dataset.x =
    String(Math.round(x));

  shape.dataset.y =
    String(Math.round(y));

  shape.dataset.w =
    String(DEFAULT_SHAPE_SIZE);

  shape.dataset.h =
    String(DEFAULT_SHAPE_SIZE);

  if (type === 'triangle') {

    shape.dataset.points =
      '50,6 94,94 6,94';
  }

  layer.appendChild(
    shape
  );

  renderMapShape(
    shape
  );

  selectMapShape(
    shape
  );

  refreshCampaignMapModel(
    map
  );
}


function selectMapShape(
  shape
) {

  const map =
    shape.closest('.campaign-map-document');

  clearSelectedMapTokens(
    map
  );

  clearSelectedMapShapes(
    map
  );

  shape.classList.add(
    'is-selected'
  );
}


function applyViewportTransform(
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


function scheduleVisibleMapObjectsUpdate(
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


function zoomMap(
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

  setStageView(
    stage,
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


function resetMapView(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  setStageView(
    stage,
    {
      x: 0,
      y: 0,
      zoom: 1
    }
  );

  applyViewportTransform(
    map
  );
}


function toggleGrid(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const enabled =
    stage.dataset.grid === 'true';

  stage.dataset.grid =
    enabled
      ? 'false'
      : 'true';

  updateGridButton(
    map
  );
}


function updateGridButton(
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


function updateGridSize(
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

  restoreMapShapes(
    map
  );
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


function setFogMode(
  map,
  mode
) {

  setCampaignFogMode(
    map,
    mode,
    {
      hideBrushPreview
    }
  );
}


function setMapTool(
  map,
  tool
) {

  setCampaignMapTool(
    map,
    tool,
    {
      hideBrushPreview
    }
  );
}


async function changeMapImage(
  map
) {

  if (!state.workspaceHandle) return;

  const [fileHandle] =
    await window.showOpenFilePicker({
      types: [{
        description: 'Images',
        accept: {
          'image/*': [
            '.png',
            '.jpg',
            '.jpeg',
            '.webp'
          ]
        }
      }]
    });

  const imageFile =
    await fileHandle.getFile();

  const assetsDir =
    await state.workspaceHandle
      .getDirectoryHandle('assets');

  const targetHandle =
    await assetsDir.getFileHandle(
      imageFile.name,
      { create: true }
    );

  await writeFile(
    targetHandle,
    await imageFile.arrayBuffer(),
    `asset:${imageFile.name}`
  );

  clearMapBackgroundCache(
    imageFile.name
  );

  const stage =
    map.querySelector('.campaign-map-stage');

  rememberMapAssetSettings(
    stage
  );

  stage.dataset.mapAsset =
    imageFile.name;

  restoreMapAssetSettings(
    stage
  );

  await restoreMapBackground(
    map
  );

  await restoreFogCanvas(
    map
  );
}


async function restoreMapBackground(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const background =
    map.querySelector('.campaign-map-background');

  const asset =
    stage?.dataset.mapAsset;

  if (!stage || !background || !asset) return;

  try {

    const url =
      await getImageURL(
        asset
      );

    background.style.backgroundImage =
      `url("${url}")`;

    await updateMapBackgroundQuality(
      map
    );

  } catch (error) {

    background.style.backgroundImage =
      '';
  }
}


function setMapInteractionQuality(
  map,
  isInteracting,
  options = {}
) {

  // Главный файл знает, как пересчитать видимые объекты.
  // Модуль фона знает только, когда этот пересчет нужно попросить.
  setMapBackgroundInteractionQuality(
    map,
    isInteracting,
    {
      ...options,
      scheduleVisibleMapObjectsUpdate
    }
  );
}


function handleMapPointerDown(
  event
) {

  const shapeHandle =
    event.target.closest('.campaign-map-shape-handle');

  if (
    shapeHandle &&
    event.button === 0
  ) {

    startShapeResize(
      event,
      shapeHandle.closest('.campaign-map-shape'),
      getShapeDragDeps()
    );

    return;
  }

  const rotateHandle =
    event.target.closest('.campaign-map-token-rotate');

  if (
    rotateHandle &&
    event.button === 0
  ) {

    startTokenRotate(
      event,
      rotateHandle.closest('.campaign-map-token'),
      getTokenDragDeps()
    );

    return;
  }

  const resizeHandle =
    event.target.closest('.campaign-map-token-resize');

  if (
    resizeHandle &&
    event.button === 0
  ) {

    startTokenResize(
      event,
      resizeHandle.closest('.campaign-map-token'),
      getTokenDragDeps()
    );

    return;
  }

  const token =
    event.target.closest('.campaign-map-token');

  const shape =
    event.target.closest('.campaign-map-shape');

  if (
    shape &&
    event.button === 0
  ) {

    const stage =
      shape.closest('.campaign-map-stage');

    if (
      stage?.dataset.tool === 'draw' ||
      stage?.dataset.tool === 'erase'
    ) {

      startFogDraw(
        event,
        stage
      );

      return;
    }

    startShapeDrag(
      event,
      shape,
      getShapeDragDeps()
    );

    return;
  }

  if (
    token &&
    event.button === 0
  ) {

    const stage =
      token.closest('.campaign-map-stage');

    if (
      stage?.dataset.tool === 'draw' ||
      stage?.dataset.tool === 'erase'
    ) {

      startFogDraw(
        event,
        stage
      );

      return;
    }

    startTokenDrag(
      event,
      token,
      getTokenDragDeps()
    );

    return;
  }

  const stage =
    event.target.closest('.campaign-map-stage');

  if (
    !stage ||
    event.button !== 0
  ) return;

  if (
    stage.dataset.tool === 'pan'
  ) {

    startMapPan(
      event,
      stage
    );

    return;
  }

  startFogDraw(
    event,
    stage
  );
}


async function handleMapInput(
  event
) {

  if (
    !event.target.closest('.campaign-map-title')
  ) return;

  syncCurrentMapTitle();
}


function syncCurrentMapTitle() {

  if (
    !isCampaignMapRecord(
      state.currentPage
    )
  ) return;

  const titleElement =
    document.querySelector(
      '#editorArea .campaign-map-title'
    );

  if (!titleElement) return;

  state.currentPage.title =
    titleElement.textContent.trim() ||
    'Новая карта';
}


async function handleMapDoubleClick(
  event
) {

  const token =
    event.target.closest('.campaign-map-token');

  const pageId =
    token?.dataset.pageId;

  if (!pageId) return;

  const page =
    state.pages.find(candidate =>
      candidate.id === pageId
    );

  if (!page) return;

  event.preventDefault();
  event.stopPropagation();

  clearDraggedToken(
    false
  );

  const editorModule =
    await import('./editor.js');

  editorModule.openPage(
    page
  );
}


function handleMapPointerOver(
  event
) {

  const shape =
    event.target.closest('.campaign-map-shape');

  if (shape) {

    scheduleTokenPopup(
      shape
    );

    return;
  }

  const token =
    event.target.closest('.campaign-map-token');

  if (!token?.dataset.pageId) return;

  highlightTreePage(
    token.dataset.pageId
  );

  scheduleTokenPopup(
    token
  );
}


function handleMapPointerOut(
  event
) {

  const shape =
    event.target.closest('.campaign-map-shape');

  if (shape) {

    scheduleTokenPopupClose();
    return;
  }

  const token =
    event.target.closest('.campaign-map-token');

  if (!token?.dataset.pageId) return;

  clearTreeHighlight(
    token.dataset.pageId
  );

  scheduleTokenPopupClose();
}


function scheduleTokenPopup(
  token
) {

  if (
    hasActiveTokenInteraction() ||
    hasActiveShapeInteraction() ||
    token.classList.contains('is-dragging') ||
    token.classList.contains('is-resizing')
  ) return;

  clearTimeout(
    tokenPopupTimer
  );

  clearTimeout(
    tokenPopupCloseTimer
  );

  tokenPopupTimer =
    setTimeout(
      () => {

        openTokenPopup(
          token
        );
      },
      TOKEN_POPUP_DELAY
    );
}


function scheduleTokenPopupClose() {

  clearTimeout(
    tokenPopupTimer
  );

  clearTimeout(
    tokenPopupCloseTimer
  );

  tokenPopupCloseTimer =
    setTimeout(
      closeTokenPopup,
      180
    );
}


function openTokenPopup(
  token
) {

  if (
    !token.isConnected ||
    hasActiveTokenInteraction() ||
    hasActiveShapeInteraction() ||
    token.classList.contains('is-dragging') ||
    token.classList.contains('is-resizing')
  ) return;

  activeTokenPopupToken =
    token;

  const popup =
    getTokenPopup();

  const isShape =
    token.classList.contains('campaign-map-shape');

  const hidden =
    token.dataset.presentationHidden === 'true';

  if (
    !isShape &&
    token.dataset.tokenType === 'creature'
  ) {

    openCreatureTokenPopup(
      token,
      popup,
      hidden
    );

    return;
  }

  popup.className =
    'campaign-token-popup hidden';

  popup.innerHTML = `
    <button class="campaign-token-popup-icon campaign-token-popup-delete" type="button" title="Удалить">${iconSvg('trash')}</button>
    <button class="campaign-token-popup-icon campaign-token-popup-hide" type="button" title="${hidden ? 'Показать' : 'Скрыть'}">
      ${getTokenVisibilityIcon(hidden)}
    </button>
    <button class="campaign-token-popup-icon campaign-token-popup-duplicate" type="button" title="Дублировать">${iconSvg('copy')}</button>
  `;

  popup
    .querySelector('.campaign-token-popup-delete')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        if (isShape) {

          await deleteMapShape(
            token,
            getTokenActionDeps()
          );

        } else {

          await deleteTokenAndPage(
            token,
            getTokenActionDeps()
          );
        }
      }
    );

  popup
    .querySelector('.campaign-token-popup-hide')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await toggleMapItemPresentationVisibility(
          token,
          getTokenActionDeps()
        );
      }
    );

  popup
    .querySelector('.campaign-token-popup-duplicate')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        if (isShape) {

          await duplicateMapShape(
            token,
            getTokenActionDeps()
          );

        } else {

          await duplicateTokenAndPage(
            token,
            getTokenActionDeps()
          );
        }
      }
    );

  popup.classList.remove(
    'hidden'
  );

  const fallbackWidth =
    token.classList.contains('campaign-map-shape')
      ? 132
      : 132;

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth,
      fallbackHeight: 48
    }
  );
}


function openCreatureTokenPopup(
  token,
  popup,
  hidden
) {

  popup.className =
    'campaign-token-popup campaign-token-popup-compact hidden';

  popup.innerHTML = `
    <button class="campaign-token-popup-text campaign-token-popup-hide" type="button">
      ${hidden ? 'Показать' : 'Скрыть'}
    </button>
    <button class="campaign-token-popup-more" type="button" title="Действия">${iconSvg('more')}</button>
  `;

  popup
    .querySelector('.campaign-token-popup-hide')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await toggleMapItemPresentationVisibility(
          token,
          getTokenActionDeps()
        );
      }
    );

  popup
    .querySelector('.campaign-token-popup-more')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        openCreatureTokenActionsPopup(
          token
        );
      }
    );

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 128,
      fallbackHeight: 48
    }
  );
}


function openCreatureTokenActionsPopup(
  token
) {

  const popup =
    getTokenPopup();

  popup.className =
    'campaign-token-popup campaign-token-popup-menu hidden';

  popup.innerHTML = `
    <button type="button" data-action="duplicate">Дублировать</button>
    <button type="button" data-action="hp">Изменить хиты</button>
    <button type="button" data-action="delete">Удалить</button>
    <button type="button" data-action="open">Открыть карточку</button>
  `;

  popup
    .querySelectorAll('button[data-action]')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();
          event.stopPropagation();

          const action =
            button.dataset.action;

          if (action === 'duplicate') {

            await duplicateTokenAndPage(
              token,
              getTokenActionDeps()
            );
            return;
          }

          if (action === 'hp') {

            openTokenHpPopup(
              token
            );
            return;
          }

          if (action === 'delete') {

            await deleteTokenAndPage(
              token,
              getTokenActionDeps()
            );
            return;
          }

          if (action === 'open') {

            await openTokenCard(
              token,
              getTokenActionDeps()
            );
          }
        }
      );
    });

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 180,
      fallbackHeight: 170
    }
  );
}


function openTokenHpPopup(
  token
) {

  const page =
    getTokenPage(
      token
    );

  const health =
    ensureTokenHasHealthBlock(
      token,
      getTokenActionDeps()
    );

  if (!page || !health) {

    setStatus(
      'У карточки нет блока DnD с хитами'
    );

    openCreatureTokenActionsPopup(
      token
    );

    return;
  }

  const popup =
    getTokenPopup();

  popup.className =
    'campaign-token-popup campaign-token-popup-hp hidden';

  popup.innerHTML = `
    <div class="campaign-token-hp-title">Хиты: ${health.current}/${health.max}</div>
    <label class="campaign-token-hp-temp-label">
      <span>Временные хиты</span>
      <input class="campaign-token-hp-temp" type="number" min="0" step="1" value="${health.temp || 0}">
    </label>
    <div class="campaign-token-hp-row">
      <select class="campaign-token-hp-sign" aria-label="Знак изменения хитов">
        <option value="+">+</option>
        <option value="-">-</option>
      </select>
      <input class="campaign-token-hp-value" type="number" min="0" step="1" value="1">
    </div>
    <div class="campaign-token-hp-quick-actions">
      <button class="campaign-token-hp-restore" type="button">Восстановить хиты</button>
      <button class="campaign-token-hp-kill" type="button">Убить</button>
    </div>
    <div class="campaign-token-hp-actions">
      <button class="campaign-token-hp-cancel" type="button">Отмена</button>
      <button class="campaign-token-hp-ok" type="button">Ок</button>
    </div>
  `;

  popup
    .querySelector('.campaign-token-hp-cancel')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        openCreatureTokenActionsPopup(
          token
        );
      }
    );

  popup
    .querySelector('.campaign-token-hp-restore')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await changeTokenHp(
          token,
          page,
          {
            mode: 'restore',
            temp: getHpPopupTempValue(
              popup
            )
          },
          getTokenActionDeps()
        );
      }
    );

  popup
    .querySelector('.campaign-token-hp-kill')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await changeTokenHp(
          token,
          page,
          {
            mode: 'kill',
            temp: getHpPopupTempValue(
              popup
            )
          },
          getTokenActionDeps()
        );
      }
    );

  popup
    .querySelector('.campaign-token-hp-ok')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        const sign =
          popup.querySelector('.campaign-token-hp-sign').value;

        const value =
          Number(
            popup.querySelector('.campaign-token-hp-value').value || 0
          );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) return;

        await changeTokenHp(
          token,
          page,
          {
            delta: sign === '-' ? -value : value,
            temp: getHpPopupTempValue(
              popup
            )
          },
          getTokenActionDeps()
        );
      }
    );

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 250,
      fallbackHeight: 238
    }
  );

  popup
    .querySelector('.campaign-token-hp-value')
    .focus();
}


function getHpPopupTempValue(
  popup
) {

  const value =
    Number(
      popup.querySelector('.campaign-token-hp-temp')?.value || 0
    );

  return Number.isFinite(value)
    ? Math.max(
      0,
      Math.floor(value)
    )
    : 0;
}


function getTokenPopup() {

  let popup =
    document.getElementById('campaignTokenPopup');

  if (popup) return popup;

  popup =
    document.createElement('div');

  popup.id =
    'campaignTokenPopup';

  popup.className =
    'campaign-token-popup hidden';

  markRuntime(
    popup
  );

  popup.addEventListener(
    'pointerenter',
    () => {

      clearTimeout(
        tokenPopupCloseTimer
      );
    }
  );

  popup.addEventListener(
    'pointerleave',
    scheduleTokenPopupClose
  );

  document.body.appendChild(
    popup
  );

  return popup;
}


function getTokenVisibilityIcon(
  hidden
) {

  return iconSvg(
    hidden
      ? 'eye'
      : 'eye-off'
  );
}


function closeTokenPopup() {

  const popup =
    document.getElementById('campaignTokenPopup');

  popup?.classList.add(
    'hidden'
  );

  activeTokenPopupToken =
    null;
}


function clearTokenPopupTimer() {

  clearTimeout(
    tokenPopupTimer
  );
}


function handleBrushPreviewMove(
  event
) {

  const stage =
    event.target.closest('.campaign-map-stage');

  if (!stage) {

    hideAllBrushPreviews();
    return;
  }

  if (
    stage.dataset.tool !== 'draw' &&
    stage.dataset.tool !== 'erase'
  ) {

    hideBrushPreview(
      stage
    );

    return;
  }

  updateBrushPreview(
    event,
    stage
  );
}


function updateBrushPreview(
  event,
  stage
) {

  const preview =
    ensureBrushPreview(
      stage
    );

  const rect =
    stage.getBoundingClientRect();

  const view =
    getStageView(
      stage
    );

  const diameter =
    Number(stage.dataset.brushSize || DEFAULT_BRUSH_SIZE) *
    view.zoom *
    2;

  preview.style.width =
    `${diameter}px`;

  preview.style.height =
    `${diameter}px`;

  preview.style.left =
    `${event.clientX - rect.left}px`;

  preview.style.top =
    `${event.clientY - rect.top}px`;

  preview.classList.remove(
    'hidden'
  );
}


function hideBrushPreview(
  stage
) {

  stage
    ?.querySelector('.campaign-brush-preview')
    ?.classList.add('hidden');
}


function hideAllBrushPreviews() {

  document
    .querySelectorAll('.campaign-brush-preview')
    .forEach(preview => {

      preview.classList.add(
        'hidden'
      );
    });
}


function handleDocumentPointerMove(
  event
) {

  moveTokenInteractions(
    event
  );

  moveShapeInteractions(
    event
  );

  if (fogDrawing) {

    drawFogAtPointer(
      event
    );
  }

  if (panningMap) {

    moveMapPan(
      event
    );
  }
}


async function handleDocumentPointerUp() {

  await finishTokenInteractions(
    getTokenDragDeps()
  );

  await finishShapeInteractions(
    getShapeDragDeps()
  );

  if (fogDrawing) {

    persistFogCanvas(
      fogDrawing.map
    );

    fogDrawing =
      null;

    await saveAndSync();
  }

  if (panningMap) {

    const map =
      panningMap.map;

    panningMap.stage.classList.remove(
      'is-panning'
    );

    panningMap =
      null;

    setMapInteractionQuality(
      map,
      false
    );

    await saveAndSync();
  }
}


function startMapPan(
  event,
  stage
) {

  event.preventDefault();

  panningMap = {
    map: stage.closest('.campaign-map-document'),
    stage,
    lastX: event.clientX,
    lastY: event.clientY
  };

  setMapInteractionQuality(
    panningMap.map,
    true
  );

  stage.classList.add(
    'is-panning'
  );
}


function moveMapPan(
  event
) {

  const {
    map,
    stage
  } = panningMap;

  const view =
    getStageView(
      stage
    );

  setStageView(
    stage,
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


function handleMapWheel(
  event
) {

  const stage =
    event.target.closest('.campaign-map-stage');

  if (!stage) return;

  event.preventDefault();

  const map =
    stage.closest('.campaign-map-document');

  const rect =
    stage.getBoundingClientRect();

  zoomMap(
    map,
    event.deltaY < 0 ? 1.08 : 1 / 1.08,
    {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  );
}


function startFogDraw(
  event,
  stage
) {

  fogDrawing =
    createFogDrawing(
      stage
    );

  if (!fogDrawing) return;

  drawFogAtPointer(
    event
  );
}


function drawFogAtPointer(
  event
) {

  drawFogAtPointerOnCanvas(
    event,
    fogDrawing
  );
}


async function saveAndSync() {

  const openMap =
    document.querySelector(
      '#editorArea .campaign-map-document'
    );

  if (
    !openMap ||
    !isCampaignMapRecord(
      state.currentPage
    )
  ) {

    syncPresentation();
    return;
  }

  if (saveCurrentPageCallback) {

    syncCurrentMapTitle();

    refreshCampaignMapModel(
      openMap
    );

    await saveCurrentPageCallback();
  }

  syncPresentation();
}
