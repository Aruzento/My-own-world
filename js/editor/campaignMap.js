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
  updateDrawingButtons
} from './campaignMapDrawing.js';

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
  notifyMapSelectionChanged,
  selectMapShape,
  selectMapToken
} from './campaignMapRuntime.js';

import {
  createCampaignMapPointerController
} from './campaignMapPointerController.js';

import {
  renderCampaignMapPerformanceDiagnostics
} from './campaignMapPerformanceDiagnostics.js';

import {
  playFirstCampaignMapMusicForMapSwitch
} from './campaignMapMusic.js';

import {
  ensureMapSelectionInspector
} from './campaignMapSelectionInspector.js';

import {
  updateMapLayerDock
} from './campaignMapLayerDock.js';

import {
  setStatus
} from '../ui/ui.js';

export {
  isCampaignMapPage,
  serializeCampaignMapHTML
} from './campaignMapContract.js';


let saveCurrentPageCallback = null;
let pointerController = null;
let mapToolbarTooltip = null;
let mapToolbarTooltipAnchor = null;

const MAP_TOOLBAR_TOOLTIP_SELECTOR =
  '.campaign-map-controls [data-tooltip], .campaign-map-tool-rail [data-tooltip]';

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
    'contextmenu',
    handleMapContextMenu
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
    handleMapKeyDown
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


async function handleMapKeyDown(
  event
) {

  if (
    event.key !== 'Delete' &&
    event.key !== 'Backspace'
  ) return;

  if (
    isEditableKeyTarget(
      event.target
    )
  ) return;

  const map =
    document.querySelector(
      '.campaign-map-document'
    );

  if (!map) return;

  const deletedCount =
    removeSelectedCampaignMapItems(
      map
    );

  if (!deletedCount) return;

  event.preventDefault();
  event.stopPropagation();

  closeTokenPopup();
  closeMapPopup();

  await saveAndSync();
}


export function removeSelectedCampaignMapItems(
  map
) {

  const selectedTokens =
    [
      ...map.querySelectorAll('.campaign-map-token.is-selected')
    ];

  const selectedShapes =
    [
      ...map.querySelectorAll('.campaign-map-shape.is-selected')
    ];

  if (
    selectedTokens.length === 0 &&
    selectedShapes.length === 0
  ) return 0;

  const store =
    refreshCampaignMapStore(
      map
    );

  selectedTokens.forEach(token => {

    store?.removeToken(
      token.dataset.tokenId
    );

    token.remove();
  });

  selectedShapes.forEach(shape => {

    store?.removeShape(
      shape.dataset.shapeId
    );

    shape.remove();
  });

  notifyMapSelectionChanged(
    map
  );

  updateMapLayerDock(
    map
  );

  return selectedTokens.length + selectedShapes.length;
}


function isEditableKeyTarget(
  target
) {

  const element =
    target instanceof Element
      ? target
      : null;

  if (!element) return false;

  return Boolean(
    element.closest(
      'input, textarea, select, [contenteditable="true"], [data-persistent-editable="true"]'
    )
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

  ensureMapSelectionInspector(
    map,
    getSelectionInspectorDeps()
  );

  await playFirstCampaignMapMusicForMapSwitch(
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

  const stage =
    map.querySelector('.campaign-map-stage');

  if (
    !topbar
  ) return;

  let controls =
    topbar.querySelector(
      '[data-map-toolbar-region="scene-bar"]'
    );

  if (!controls) {

    controls =
      topbar.querySelector('.campaign-map-controls');
  }

  if (!controls) {

    controls =
      document.createElement('div');

  controls.className =
    'campaign-map-controls';

  controls.dataset.mapUiMigration =
    '0.0.1.8.12.8';

  controls.setAttribute(
    'role',
    'toolbar'
  );

  controls.setAttribute(
    'aria-label',
    'Инструменты карты кампании'
  );

  markRuntime(
    controls
  );

  controls.innerHTML =
    getMapControlsHTML();

  topbar.appendChild(
    controls
  );

  }

  configureMapToolbarRegion(
    controls,
    {
      region:
        'scene-bar',
      label:
        controls.getAttribute('aria-label') ||
        'Действия сцены и сессии'
    }
  );

  markSceneToolbarGroups(
    controls
  );

  ensureMapToolRail(
    map,
    controls,
    stage
  );

  ensureMapToolbarTooltips(
    map
  );

  updateGridButton(
    map
  );

  updateFogButtons(
    map
  );

  updateDrawingButtons(
    map
  );

  updatePanButton(
    map
  );

  updateGridSize(
    map
  );
}


function ensureMapToolbarTooltips(
  map
) {

  if (
    map.dataset.mapToolbarTooltipEvents === 'true'
  ) return;

  map.dataset.mapToolbarTooltipEvents =
    'true';

  map.addEventListener(
    'pointerover',
    handleMapToolbarTooltipOver
  );

  map.addEventListener(
    'pointerout',
    handleMapToolbarTooltipOut
  );

  map.addEventListener(
    'focusin',
    handleMapToolbarTooltipFocusIn
  );

  map.addEventListener(
    'focusout',
    handleMapToolbarTooltipFocusOut
  );
}


function handleMapToolbarTooltipOver(
  event
) {

  const anchor =
    getMapToolbarTooltipAnchor(
      event.target
    );

  if (!anchor) return;

  showMapToolbarTooltip(
    anchor
  );
}


function handleMapToolbarTooltipOut(
  event
) {

  const anchor =
    getMapToolbarTooltipAnchor(
      event.target
    );

  if (!anchor) return;

  if (
    event.relatedTarget instanceof Node &&
    anchor.contains(
      event.relatedTarget
    )
  ) return;

  hideMapToolbarTooltip(
    anchor
  );
}


function handleMapToolbarTooltipFocusIn(
  event
) {

  const anchor =
    getMapToolbarTooltipAnchor(
      event.target
    );

  if (!anchor) return;

  showMapToolbarTooltip(
    anchor
  );
}


function handleMapToolbarTooltipFocusOut(
  event
) {

  const anchor =
    getMapToolbarTooltipAnchor(
      event.target
    );

  if (!anchor) return;

  hideMapToolbarTooltip(
    anchor
  );
}


function getMapToolbarTooltipAnchor(
  target
) {

  const element =
    target instanceof Element
      ? target
      : null;

  return element?.closest(
    MAP_TOOLBAR_TOOLTIP_SELECTOR
  ) || null;
}


function showMapToolbarTooltip(
  anchor
) {

  const text =
    anchor.dataset.tooltip || '';

  if (!text) return;

  const tooltip =
    ensureMapToolbarTooltip();

  mapToolbarTooltipAnchor =
    anchor;

  if (
    anchor.hasAttribute('title')
  ) {

    anchor.dataset.nativeTitle =
      anchor.getAttribute('title') || '';

    anchor.removeAttribute(
      'title'
    );
  }

  tooltip.textContent =
    text;

  positionMapToolbarTooltip(
    anchor,
    tooltip
  );

  requestAnimationFrame(
    () => {

      if (
        mapToolbarTooltipAnchor === anchor
      ) {

        tooltip.classList.add(
          'is-visible'
        );
      }
    }
  );
}


function hideMapToolbarTooltip(
  anchor = mapToolbarTooltipAnchor
) {

  if (anchor?.dataset.nativeTitle) {

    anchor.setAttribute(
      'title',
      anchor.dataset.nativeTitle
    );

    delete anchor.dataset.nativeTitle;
  }

  if (
    mapToolbarTooltipAnchor === anchor
  ) {

    mapToolbarTooltipAnchor =
      null;
  }

  mapToolbarTooltip?.classList.remove(
    'is-visible'
  );
}


function ensureMapToolbarTooltip() {

  if (mapToolbarTooltip) {

    return mapToolbarTooltip;
  }

  mapToolbarTooltip =
    document.createElement('div');

  mapToolbarTooltip.className =
    'campaign-map-toolbar-tooltip';

  markRuntime(
    mapToolbarTooltip
  );

  document.body.appendChild(
    mapToolbarTooltip
  );

  return mapToolbarTooltip;
}


function positionMapToolbarTooltip(
  anchor,
  tooltip
) {

  const anchorRect =
    anchor.getBoundingClientRect();

  const isRail =
    Boolean(
      anchor.closest('.campaign-map-tool-rail')
    );

  tooltip.style.left =
    '0';

  tooltip.style.top =
    '0';

  const tooltipRect =
    tooltip.getBoundingClientRect();

  const viewportPadding =
    10;

  const left =
    isRail
      ? anchorRect.right + 10
      : anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;

  const top =
    isRail
      ? anchorRect.top + (anchorRect.height - tooltipRect.height) / 2
      : anchorRect.bottom + 10;

  tooltip.style.left =
    `${clampViewportPosition(
      left,
      tooltipRect.width,
      viewportPadding,
      window.innerWidth
    )}px`;

  tooltip.style.top =
    `${clampViewportPosition(
      top,
      tooltipRect.height,
      viewportPadding,
      window.innerHeight
    )}px`;
}


function clampViewportPosition(
  value,
  size,
  padding,
  viewportSize
) {

  return Math.min(
    Math.max(
      value,
      padding
    ),
    Math.max(
      padding,
      viewportSize - size - padding
    )
  );
}


function configureMapToolbarRegion(
  element,
  {
    region,
    label,
    orientation = null
  }
) {

  element.dataset.mapUiMigration =
    '0.0.1.8.12.10';

  element.dataset.mapToolbarRegion =
    region;

  element.setAttribute(
    'role',
    'toolbar'
  );

  element.setAttribute(
    'aria-label',
    label
  );

  if (orientation) {

    element.setAttribute(
      'aria-orientation',
      orientation
    );
  }

  markRuntime(
    element
  );
}


function markSceneToolbarGroups(
  controls
) {

  setMapControlGroupSection(
    controls,
    'create',
    'creation'
  );

  setMapControlGroupSection(
    controls,
    'scene',
    'scene'
  );

  setMapControlGroupSection(
    controls,
    'live',
    'presentation'
  );
}


function ensureMapToolRail(
  map,
  controls,
  stage
) {

  if (!stage) return;

  let rail =
    stage.querySelector(
      '[data-map-toolbar-region="tool-rail"]'
    );

  if (!rail) {

    rail =
      document.createElement('div');

    rail.className =
      'campaign-map-tool-rail';

    stage.appendChild(
      rail
    );
  }

  configureMapToolbarRegion(
    rail,
    {
      region:
        'tool-rail',
      label:
        'Инструменты холста карты',
      orientation:
        'vertical'
    }
  );

  if (
    rail.querySelector('.campaign-map-control-group')
  ) return;

  const legacyToolGroup =
    controls.querySelector(
      '[data-map-control-group="tools"]'
    );

  [
    {
      key:
        'navigation',
      section:
        'navigation',
      label:
        'Навигация',
      selectors:
        [
          '.campaign-pan-btn'
        ]
    },
    {
      key:
        'drawing',
      section:
        'drawing',
      label:
        'Создание и рисование',
      selectors:
        [
          '.campaign-shapes-btn',
          '.campaign-drawing-btn'
        ]
    },
    {
      key:
        'fog',
      section:
        'fog',
      label:
        'Туман войны',
      selectors:
        [
          '.campaign-fog-btn'
        ]
    }
  ].forEach(group => {

    const element =
      createMapToolRailGroup(
        group
      );

    const actions =
      element.querySelector('.campaign-map-control-actions');

    group.selectors.forEach(selector => {

      const button =
        controls.querySelector(selector) ||
        map.querySelector(selector);

      if (button) {

        actions.appendChild(
          button
        );
      }
    });

    if (
      actions.children.length > 0
    ) {

      rail.appendChild(
        element
      );
    }
  });

  if (
    legacyToolGroup &&
    !legacyToolGroup.querySelector('.campaign-map-tool-button')
  ) {

    legacyToolGroup.remove();
  }
}


function createMapToolRailGroup(
  {
    key,
    section,
    label
  }
) {

  const group =
    document.createElement('div');

  group.className =
    'campaign-map-control-group';

  group.dataset.mapControlGroup =
    key;

  group.dataset.mapToolSection =
    section;

  group.setAttribute(
    'role',
    'group'
  );

  group.setAttribute(
    'aria-label',
    label
  );

  const groupLabel =
    document.createElement('span');

  groupLabel.className =
    'campaign-map-control-group-label';

  groupLabel.textContent =
    label;

  const actions =
    document.createElement('div');

  actions.className =
    'campaign-map-control-actions';

  group.append(
    groupLabel,
    actions
  );

  return group;
}


function setMapControlGroupSection(
  root,
  groupKey,
  section
) {

  root
    .querySelector(`[data-map-control-group="${groupKey}"]`)
    ?.setAttribute(
      'data-map-tool-section',
      section
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

    clearTokenPopupTimer();
    closeTokenPopup();

    selectMapToken(
      token,
      {
        additive: additiveSelection
      }
    );
  } else if (shape) {

    clearTokenPopupTimer();
    closeTokenPopup();

    selectMapShape(
      shape,
      {
        additive: additiveSelection
      }
    );
  } else if (
    !event.target.closest('.campaign-map-controls') &&
    !event.target.closest('.campaign-map-tool-rail') &&
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


function handleMapContextMenu(
  event
) {

  const map =
    event.target.closest('.campaign-map-document');

  if (!map) return;

  event.preventDefault();
  event.stopPropagation();

  const token =
    event.target.closest('.campaign-map-token');

  const shape =
    event.target.closest('.campaign-map-shape');

  const item =
    token || shape;

  if (!item) {

    closeTokenPopup();
    closeMapPopup();
    return;
  }

  clearTokenPopupTimer();
  closeMapPopup();

  if (
    !item.classList.contains('is-selected')
  ) {

    if (token) {

      selectMapToken(
        token,
        {
          additive:
            event.shiftKey ||
            event.ctrlKey ||
            event.metaKey
        }
      );

    } else {

      selectMapShape(
        shape,
        {
          additive:
            event.shiftKey ||
            event.ctrlKey ||
            event.metaKey
        }
      );
    }
  }

  openTokenPopup(
    item,
    getTokenPopupDeps()
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


function getSelectionActionDeps() {

  return {
    ...getTokenActionDeps(),
    openTokenPopup: () => {}
  };
}


function getSelectionInspectorDeps() {

  return {
    closeTokenPopup,
    getSelectionActionDeps,
    getTokenActionDeps,
    openTokenPopup: token => openTokenPopup(
      token,
      getTokenPopupDeps()
    ),
    removeSelectedCampaignMapItems,
    saveAndSync,
    setStatus
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
