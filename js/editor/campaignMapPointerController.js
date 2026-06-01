import { state } from '../state.js';

import {
  DEFAULT_BRUSH_SIZE
} from './campaignMapConstants.js';

import {
  getStageView
} from './campaignMapGeometry.js';

import {
  clearTreeHighlight,
  highlightTreePage
} from './campaignMapTreeIntegration.js';

import {
  createFogDrawing,
  drawFogAtPointer as drawFogAtPointerOnCanvas,
  finishLockedFogZoneEdit,
  flushLiveFogPresentationSync,
  moveLockedFogZoneEdit
} from './campaignMapFog.js';

import {
  ensureBrushPreview
} from './campaignMapViewport.js';

import {
  persistFogCanvas
} from './campaignMapContract.js';

import {
  clearDraggedToken
} from './campaignMapTokenDrag.js';

import {
  finishCampaignMapSelectionBox,
  hasActiveCampaignMapSelectionBox,
  moveCampaignMapSelectionBox,
  setCampaignMapSelectionMode,
  startCampaignMapSelectionBox
} from './campaignMapSelectionBox.js';


// Pointer controller — единый маршрутизатор мыши/пера для карты.
// Он выбирает сценарий, а реальные drag/fog/pan операции делегирует модулям.

export function createCampaignMapPointerController(
  deps
) {

  let fogDrawing = null;

  return {
    handleMapPointerDown,
    handleMapDoubleClick,
    handleMapPointerOver,
    handleMapPointerOut,
    handleBrushPreviewMove,
    hideAllBrushPreviews,
    hideBrushPreview,
    handleDocumentPointerMove,
    handleDocumentPointerUp,
    handleDocumentKeyDown,
    handleDocumentKeyUp,
    handleMapWheel
  };


  function handleMapPointerDown(
    event
  ) {

    const shapeHandle =
      event.target.closest('.campaign-map-shape-handle');

    const stage =
      event.target.closest('.campaign-map-stage');

    if (
      event.button === 0 &&
      event.shiftKey &&
      stage &&
      !event.target.closest('.campaign-map-controls') &&
      !event.target.closest('.campaign-map-popup')
    ) {

      startCampaignMapSelectionBox(
        event,
        stage
      );

      return;
    }

    if (
      shapeHandle &&
      event.button === 0
    ) {

      deps.startShapeResize(
        event,
        shapeHandle.closest('.campaign-map-shape'),
        deps.getShapeDragDeps()
      );

      return;
    }

    const rotateHandle =
      event.target.closest('.campaign-map-token-rotate');

    if (
      rotateHandle &&
      event.button === 0
    ) {

      deps.startTokenRotate(
        event,
        rotateHandle.closest('.campaign-map-token'),
        deps.getTokenDragDeps()
      );

      return;
    }

    const resizeHandle =
      event.target.closest('.campaign-map-token-resize');

    if (
      resizeHandle &&
      event.button === 0
    ) {

      deps.startTokenResize(
        event,
        resizeHandle.closest('.campaign-map-token'),
        deps.getTokenDragDeps()
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

      if (isFogTool(stage)) {

        startFogDraw(
          event,
          stage
        );

        return;
      }

      deps.startShapeDrag(
        event,
        shape,
        deps.getShapeDragDeps(),
        {
          additiveSelection: isAdditiveSelectionEvent(
            event
          )
        }
      );

      return;
    }

    if (
      token &&
      event.button === 0
    ) {

      const stage =
        token.closest('.campaign-map-stage');

      if (isFogTool(stage)) {

        startFogDraw(
          event,
          stage
        );

        return;
      }

      deps.startTokenDrag(
        event,
        token,
        deps.getTokenDragDeps(),
        {
          additiveSelection: isAdditiveSelectionEvent(
            event
          )
        }
      );

      return;
    }

    const targetStage =
      event.target.closest('.campaign-map-stage');

    if (
      !targetStage ||
      event.button !== 0
    ) return;

    if (
      targetStage.dataset.tool === 'pan'
    ) {

      deps.startMapPan(
        event,
        targetStage,
        {
          setMapInteractionQuality: deps.setMapInteractionQuality
        }
      );

      return;
    }

    startFogDraw(
      event,
      targetStage
    );
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

      deps.scheduleTokenPopup(
        shape,
        deps.getTokenPopupDeps()
      );

      return;
    }

    const token =
      event.target.closest('.campaign-map-token');

    if (!token?.dataset.pageId) return;

    highlightTreePage(
      token.dataset.pageId
    );

    deps.scheduleTokenPopup(
      token,
      deps.getTokenPopupDeps()
    );
  }


  function handleMapPointerOut(
    event
  ) {

    const shape =
      event.target.closest('.campaign-map-shape');

    if (shape) {

      deps.scheduleTokenPopupClose();
      return;
    }

    const token =
      event.target.closest('.campaign-map-token');

    if (!token?.dataset.pageId) return;

    clearTreeHighlight(
      token.dataset.pageId
    );

    deps.scheduleTokenPopupClose();
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

    if (!isFogTool(stage)) {

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

    deps.moveTokenInteractions(
      event
    );

    deps.moveShapeInteractions(
      event
    );

    moveLockedFogZoneEdit(
      event
    );

    if (
      hasActiveCampaignMapSelectionBox()
    ) {

      moveCampaignMapSelectionBox(
        event
      );
    }

    if (fogDrawing) {

      drawFogAtPointer(
        event
      );
    }

    if (deps.hasActiveMapPan()) {

      deps.moveMapPan(
        event
      );
    }
  }


  async function handleDocumentPointerUp(
    event
  ) {

    finishLockedFogZoneEdit();

    finishCampaignMapSelectionBox(
      event
    );

    await deps.finishTokenInteractions(
      deps.getTokenDragDeps()
    );

    await deps.finishShapeInteractions(
      deps.getShapeDragDeps()
    );

    if (fogDrawing) {

      persistFogCanvas(
        fogDrawing.map
      );

      fogDrawing =
        null;

      flushLiveFogPresentationSync();

      await deps.saveAndSync();
    }

    await deps.finishMapPan(
      {
        setMapInteractionQuality: deps.setMapInteractionQuality,
        saveAndSync: deps.saveAndSync
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

    deps.zoomMap(
      map,
      event.deltaY < 0 ? 1.08 : 1 / 1.08,
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
    );
  }


  function handleDocumentKeyDown(
    event
  ) {

    if (event.key !== 'Shift') return;

    setCampaignMapSelectionMode(
      true
    );
  }


  function handleDocumentKeyUp(
    event
  ) {

    if (event.key !== 'Shift') return;

    setCampaignMapSelectionMode(
      false
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
}


function isFogTool(
  stage
) {

  return (
    stage?.dataset.tool === 'draw' ||
    stage?.dataset.tool === 'erase'
  );
}


function isAdditiveSelectionEvent(
  event
) {

  return Boolean(
    event.shiftKey ||
    event.ctrlKey ||
    event.metaKey
  );
}
