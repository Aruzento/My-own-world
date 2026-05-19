import { state } from '../state.js';

import {
  getImageURL
} from '../storage/assetStorage.js';

import {
  writeFile
} from '../storage/storage.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_SHAPE_SIZE,
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
  getStageView,
  getVisibleSpawnPoint
} from './campaignMapGeometry.js';

import {
  createMapShapeElement,
  createMapTokenElement
} from './campaignMapElementFactory.js';

import {
  renderMapShapeElement,
  renderMapTokenElement
} from './campaignMapRenderer.js';

import {
  saveCampaignMapAndSync
} from './campaignMapSaveController.js';

import {
  closeMapPopup,
  getMapPopup,
  showMapPopup
} from './campaignMapPopupController.js';

import {
  handleCampaignMapToolbarClick
} from './campaignMapToolbarController.js';

import {
  clearTokenPopupTimer,
  closeTokenPopup,
  openTokenPopup,
  scheduleTokenPopup,
  scheduleTokenPopupClose
} from './campaignMapTokenPopupController.js';

import {
  applyViewportTransform,
  ensureMapViewState,
  ensureViewportStructure,
  finishMapPan,
  hasActiveMapPan,
  moveMapPan,
  startMapPan,
  updateGridButton,
  updateGridSize,
  zoomMap
} from './campaignMapViewport.js';

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
  getMapControlsHTML
} from './campaignMapToolbar.js';

import {
  openAddKindPopup
} from './campaignMapPicker.js';

import {
  setupCampaignMapExternalDrop
} from './campaignMapExternalDrop.js';

import {
  getCampaignMapModel,
  refreshCampaignMapModel
} from './campaignMapModel.js';

import {
  getPagePortraitAsset,
} from './campaignMapTokens.js';

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
  createFogDrawing,
  drawFogAtPointer as drawFogAtPointerOnCanvas,
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
let fogDrawing = null;
const tokenHealthCache = new WeakMap();

const TOKEN_DRAG_THRESHOLD = 4;
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

  setupCampaignMapExternalDrop(
    editor,
    {
      getMapPickerDeps
    }
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

    if (openMapChanged) {

      refreshCampaignMapModel(
        openMap
      );
    }
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

  await handleCampaignMapToolbarClick(
    event,
    map,
    getToolbarControllerDeps()
  );
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


function getToolbarControllerDeps() {

  return {
    addMapShape,
    changeMapImage,
    mapPickerDeps: getMapPickerDeps(),
    openAddKindPopup,
    openPresentationWindow,
    saveAndSync,
    setFogMode,
    setMapTool,
    syncPresentation
  };
}


function getTokenActionDeps() {

  // Action-модуль получает только операции, нужные для изменения карты.
  return {
    applyTokenHealthState,
    clearDraggedToken,
    closeTokenPopup,
    openTokenPopup: token => openTokenPopup(
      token,
      getTokenPopupDeps()
    ),
    saveAndSync,
    selectMapShape
  };
}


function getTokenPopupDeps() {

  return {
    getTokenActionDeps,
    hasActiveShapeInteraction,
    hasActiveTokenInteraction
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


async function addMapToken(
  map,
  type,
  page = null,
  spawnIndex = 0,
  options = {}
) {

  const layer =
    map.querySelector('.campaign-map-object-layer');

  if (!layer) return;

  const index =
    layer.querySelectorAll(`[data-token-type="${type}"]`).length + 1;

  const model =
    getCampaignMapModel(
      map
    );

  const spawnPoint =
    options.worldPoint ||
    getVisibleSpawnPoint(
      map,
      spawnIndex
    );

  const imageAsset =
    page
      ? getPagePortraitAsset(
        page
      )
      : '';

  const tokenData =
    model.addToken({
      type,
      pageId: page?.id || '',
      imageAsset,
      x: ((spawnPoint.x / WORLD_WIDTH) * 100).toFixed(3),
      y: ((spawnPoint.y / WORLD_HEIGHT) * 100).toFixed(3),
      name: page?.title ||
        (
          type === 'creature'
            ? `Существо ${index}`
            : `Объект ${index}`
        ),
      size: 1,
      rotation: 0
    });

  const token =
    createMapTokenElement(
      tokenData,
      model
    );

  layer.appendChild(
    token
  );

  await renderMapTokenElement(
    token,
    {
      applyHealth: applyTokenHealthState
    }
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

    await renderMapTokenElement(
      token,
      {
        applyHealth: applyTokenHealthState,
        pageLookup
      }
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

      renderMapShapeElement(
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

  const model =
    getCampaignMapModel(
      map
    );

  const shapeData =
    model.addShape({
      type,
      x: Math.round(x),
      y: Math.round(y),
      width: DEFAULT_SHAPE_SIZE,
      height: DEFAULT_SHAPE_SIZE,
      points: type === 'triangle'
        ? '50,6 94,94 6,94'
        : ''
    });

  const shape =
    createMapShapeElement(
      shapeData,
      model
    );

  layer.appendChild(
    shape
  );

  renderMapShapeElement(
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
      stage,
      {
        setMapInteractionQuality
      }
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
      shape,
      getTokenPopupDeps()
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
    token,
    getTokenPopupDeps()
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

  if (hasActiveMapPan()) {

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

  await finishMapPan(
    {
      setMapInteractionQuality,
      saveAndSync
    }
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

  await saveCampaignMapAndSync({
    saveCurrentPage: saveCurrentPageCallback,
    syncCurrentMapTitle
  });
}
