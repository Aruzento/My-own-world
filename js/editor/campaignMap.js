import { state } from '../state.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  setMapInteractionQuality as setMapBackgroundInteractionQuality
} from './campaignMapBackground.js';

import {
  getActiveGridSize
} from './campaignMapGeometry.js';

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
  scheduleVisibleMapObjectsUpdate,
  updateGridButton,
  updateGridSize,
  zoomMap,
  finishMapPan,
  hasActiveMapPan,
  moveMapPan,
  startMapPan
} from './campaignMapViewport.js';

import {
  removeTokensFromMapElement,
  removeTokensFromMapPageContent
} from './campaignMapSerializerHelpers.js';

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
  queryPages
} from '../repository/pageRepository.js';

import {
  refreshCampaignMapStore
} from './campaignMapStore.js';

import {
  applyCampaignMapLayers
} from './campaignMapLayers.js';

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
  renderLockedFogZones,
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
  schedulePresentationSync
} from './campaignMapPresentationSync.js';

import {
  isCampaignMapRecord,
  restoreFogCanvas
} from './campaignMapContract.js';

import {
  addMapShape,
  addMapToken,
  applyTokenHealthState,
  changeMapImage,
  clearSelectedMapShapes,
  clearSelectedMapTokens,
  restoreMapBackground,
  restoreMapShapes,
  restoreMapTokens,
  selectMapShape,
  selectMapToken
} from './campaignMapRuntime.js';

import {
  createCampaignMapPointerController
} from './campaignMapPointerController.js';

import {
  renderCampaignMapPerformanceDiagnostics
} from './campaignMapPerformanceDiagnostics.js';

export {
  isCampaignMapPage,
  serializeCampaignMapHTML
} from './campaignMapContract.js';


let saveCurrentPageCallback = null;
let pointerController = null;
export function setupCampaignMaps(
  editor,
  saveCurrentPage
) {

  saveCurrentPageCallback =
    saveCurrentPage;

  pointerController =
    createCampaignMapPointerController(
      getPointerControllerDeps()
    );

  editor.addEventListener(
    'click',
    handleMapClick
  );

  editor.addEventListener(
    'dblclick',
    pointerController.handleMapDoubleClick
  );

  editor.addEventListener(
    'pointerover',
    pointerController.handleMapPointerOver
  );

  editor.addEventListener(
    'pointerout',
    pointerController.handleMapPointerOut
  );

  editor.addEventListener(
    'pointermove',
    pointerController.handleBrushPreviewMove
  );

  editor.addEventListener(
    'pointerleave',
    pointerController.hideAllBrushPreviews
  );

  editor.addEventListener(
    'pointerdown',
    pointerController.handleMapPointerDown
  );

  editor.addEventListener(
    'input',
    handleMapInput
  );

  editor.addEventListener(
    'campaign-map-save-request',
    async () => {

      await saveAndSync();
    }
  );

  document.addEventListener(
    'pointermove',
    pointerController.handleDocumentPointerMove
  );

  document.addEventListener(
    'pointerup',
    pointerController.handleDocumentPointerUp
  );

  document.addEventListener(
    'keydown',
    pointerController.handleDocumentKeyDown
  );

  document.addEventListener(
    'keyup',
    pointerController.handleDocumentKeyUp
  );

  editor.addEventListener(
    'wheel',
    pointerController.handleMapWheel,
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

  refreshCampaignMapStore(
    map
  );

  renderLockedFogZones(
    map
  );

  applyCampaignMapLayers(
    map
  );

  renderCampaignMapPerformanceDiagnostics(
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

      refreshCampaignMapStore(
        openMap
      );
    }
  }

  for (const page of queryPages({
    template: 'campaignMap'
  })) {

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

  if (map.dataset.selectionJustFinished === 'true') {

    delete map.dataset.selectionJustFinished;
    return;
  }

  const token =
    event.target.closest('.campaign-map-token');

  const shape =
    event.target.closest('.campaign-map-shape');

  const additiveSelection =
    event.shiftKey ||
    event.ctrlKey ||
    event.metaKey;

  if (token) {

    selectMapToken(
      token,
      {
        additive: additiveSelection
      }
    );
  } else if (shape) {

    selectMapShape(
      shape,
      {
        additive: additiveSelection
      }
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


function getPointerControllerDeps() {

  return {
    finishMapPan,
    finishShapeInteractions,
    finishTokenInteractions,
    getShapeDragDeps,
    getTokenDragDeps,
    getTokenPopupDeps,
    hasActiveMapPan,
    moveMapPan,
    moveShapeInteractions,
    moveTokenInteractions,
    saveAndSync,
    scheduleTokenPopup,
    scheduleTokenPopupClose,
    setMapInteractionQuality,
    startMapPan,
    startShapeDrag,
    startShapeResize,
    startTokenDrag,
    startTokenResize,
    startTokenRotate,
    zoomMap
  };
}


function setFogMode(
  map,
  mode
) {

  setCampaignFogMode(
    map,
    mode,
    {
      hideBrushPreview: pointerController?.hideBrushPreview
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
      hideBrushPreview: pointerController?.hideBrushPreview
    }
  );
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


async function saveAndSync() {

  await saveCampaignMapAndSync({
    saveCurrentPage: saveCurrentPageCallback,
    syncCurrentMapTitle
  });
}
