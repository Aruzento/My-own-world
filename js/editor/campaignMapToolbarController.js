import {
  DEFAULT_GRID_COLOR
} from './campaignMapConstants.js';

import {
  closeMapPopup,
  getMapPopup,
  showMapPopup,
  toggleMapPopupForAnchor
} from './campaignMapPopupController.js';

import {
  getFogPopupHTML,
  getDrawingPopupHTML,
  getGridPopupHTML,
  getLayersPopupHTML,
  getShapesPopupHTML
} from './campaignMapToolbar.js';

import {
  openInitiativePopup
} from './campaignMapInitiativePopup.js';

import {
  toggleGrid,
  updateGridSize
} from './campaignMapViewport.js';

import {
  addLockedFogZone,
  clearFog,
  fillFog,
  renderLockedFogZones,
  updateFogButtons
} from './campaignMapFog.js';

import {
  setDrawingColor,
  setDrawingTool,
  updateDrawingButtons
} from './campaignMapDrawing.js';

import {
  rememberMapAssetSettings
} from './campaignMapContract.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  applyCampaignMapLayers,
  moveCampaignMapLayer,
  setCampaignMapLayerVisibility
} from './campaignMapLayers.js';


// Controller тулбара карты: маршрутизирует клики по кнопкам и управляет
// popup-ами сетки, тумана и фигур.

export async function handleCampaignMapToolbarClick(
  event,
  map,
  deps
) {

  if (
    event.target.closest('.campaign-add-btn')
  ) {

    const anchor =
      event.target.closest('.campaign-add-btn');

    if (
      toggleMapPopupForAnchor(
        anchor,
        'add'
      )
    ) return true;

    deps.openAddKindPopup(
      map,
      anchor,
      deps.mapPickerDeps
    );

    return true;
  }

  if (
    event.target.closest('.campaign-pan-btn')
  ) {

    deps.setMapTool(
      map,
      'pan'
    );

    await deps.saveAndSync();
    return true;
  }

  if (
    event.target.closest('.campaign-grid-btn')
  ) {

    const anchor =
      event.target.closest('.campaign-grid-btn');

    if (
      toggleMapPopupForAnchor(
        anchor,
        'grid'
      )
    ) return true;

    openGridPopup(
      map,
      anchor,
      deps
    );

    return true;
  }

  if (
    event.target.closest('.campaign-change-map-btn')
  ) {

    await deps.changeMapImage(
      map
    );

    await deps.saveAndSync();
    return true;
  }

  if (
    event.target.closest('.campaign-open-presentation-btn')
  ) {

    deps.openPresentationWindow();
    deps.syncPresentation();
    return true;
  }

  if (
    event.target.closest('.campaign-shapes-btn')
  ) {

    const anchor =
      event.target.closest('.campaign-shapes-btn');

    if (
      toggleMapPopupForAnchor(
        anchor,
        'shapes'
      )
    ) return true;

    openShapesPopup(
      map,
      anchor,
      deps
    );

    return true;
  }

  if (
    event.target.closest('.campaign-fog-btn')
  ) {

    const anchor =
      event.target.closest('.campaign-fog-btn');

    if (
      toggleMapPopupForAnchor(
        anchor,
        'fog'
      )
    ) return true;

    openFogPopup(
      map,
      anchor,
      deps
    );

    return true;
  }

  if (
    event.target.closest('.campaign-drawing-btn')
  ) {

    const anchor =
      event.target.closest('.campaign-drawing-btn');

    if (
      toggleMapPopupForAnchor(
        anchor,
        'drawing'
      )
    ) return true;

    openDrawingPopup(
      map,
      anchor,
      deps
    );

    return true;
  }

  if (
    event.target.closest('.campaign-layers-btn')
  ) {

    const anchor =
      event.target.closest('.campaign-layers-btn');

    if (
      toggleMapPopupForAnchor(
        anchor,
        'layers'
      )
    ) return true;

    openLayersPopup(
      map,
      anchor,
      deps
    );

    return true;
  }

  if (
    event.target.closest('.campaign-initiative-btn')
  ) {

    const anchor =
      event.target.closest('.campaign-initiative-btn');

    if (
      toggleMapPopupForAnchor(
        anchor,
        'initiative'
      )
    ) return true;

    openInitiativePopup(
      map,
      anchor,
      deps
    );

    return true;
  }

  return false;
}


function openDrawingPopup(
  map,
  anchor,
  deps
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const popup =
    getMapPopup();

  popup.innerHTML =
    getDrawingPopupHTML(
      stage
    );

  popup
    .querySelectorAll('.campaign-drawing-tool-btn')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          setDrawingTool(
            map,
            button.dataset.drawingTool
          );

          openDrawingPopup(
            map,
            anchor,
            deps
          );

          await deps.saveAndSync();
        }
      );
    });

  popup
    .querySelector('.campaign-drawing-color')
    ?.addEventListener(
      'input',
      async event => {

        setDrawingColor(
          map,
          event.target.value
        );

        await deps.saveAndSync();
      }
    );

  popup
    .querySelectorAll('.campaign-drawing-swatch')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          setDrawingColor(
            map,
            button.dataset.color
          );

          openDrawingPopup(
            map,
            anchor,
            deps
          );

          await deps.saveAndSync();
        }
      );
    });

  updateDrawingButtons(
    map
  );

  showMapPopup(
    popup,
    anchor,
    'drawing'
  );
}


function openLayersPopup(
  map,
  anchor,
  deps
) {

  const popup =
    getMapPopup();

  const render =
    () => {

      const model =
        getCampaignMapStore(
          map
        )?.getModel();

      popup.innerHTML =
        getLayersPopupHTML(
          model?.layers || []
        );

      bindLayerPopupEvents(
        popup,
        map,
        deps,
        render
      );
    };

  render();

  showMapPopup(
    popup,
    anchor,
    'layers'
  );
}


function bindLayerPopupEvents(
  popup,
  map,
  deps,
  render
) {

  popup
    .querySelectorAll('.campaign-layer-row')
    .forEach(row => {

      row
        .querySelector('.campaign-layer-visible')
        ?.addEventListener(
          'change',
          async event => {

            setCampaignMapLayerVisibility(
              map,
              row.dataset.layerId,
              event.target.checked
            );

            await deps.saveAndSync();
          }
        );

      row
        .querySelector('.campaign-layer-up')
        ?.addEventListener(
          'click',
          async event => {

            event.preventDefault();

            moveCampaignMapLayer(
              map,
              row.dataset.layerId,
              'up'
            );

            applyCampaignMapLayers(
              map
            );

            render();
            await deps.saveAndSync();
          }
        );

      row
        .querySelector('.campaign-layer-down')
        ?.addEventListener(
          'click',
          async event => {

            event.preventDefault();

            moveCampaignMapLayer(
              map,
              row.dataset.layerId,
              'down'
            );

            applyCampaignMapLayers(
              map
            );

            render();
            await deps.saveAndSync();
          }
        );
    });
}


function openGridPopup(
  map,
  anchor,
  deps
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

        await deps.saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-grid-size-range')
    .addEventListener(
      'input',
      async event => {

        const store =
          getCampaignMapStore(
            map
          );

        store?.setGrid({
          size: event.target.value
        });

        rememberMapAssetSettings(
          stage
        );

        updateGridSize(
          map
        );

        await deps.saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-grid-color-input')
    .addEventListener(
      'input',
      async event => {

        const store =
          getCampaignMapStore(
            map
          );

        store?.setGrid({
          color: event.target.value || DEFAULT_GRID_COLOR
        });

        rememberMapAssetSettings(
          stage
        );

        updateGridSize(
          map
        );

        await deps.saveAndSync();
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
  anchor,
  deps
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
        deps.setFogMode(
          map,
          'draw'
        );
        await deps.saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-erase-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        deps.setFogMode(
          map,
          'erase'
        );
        await deps.saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-map-range')
    .addEventListener(
      'input',
      async event => {

        const store =
          getCampaignMapStore(
            map
          );

        store?.updateFog({
          brushSize: event.target.value
        });

        await deps.saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-circle-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        getCampaignMapStore(
          map
        )?.updateFog({
          brushShape: 'circle'
        });

        openFogPopup(
          map,
          anchor,
          deps
        );

        await deps.saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-square-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        getCampaignMapStore(
          map
        )?.updateFog({
          brushShape: 'square'
        });

        openFogPopup(
          map,
          anchor,
          deps
        );

        await deps.saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-lock-zone-btn')
    ?.addEventListener(
      'click',
      async event => {

        event.preventDefault();

        addLockedFogZone(
          map
        );

        renderLockedFogZones(
          map
        );

        await deps.saveAndSync();
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
        await deps.saveAndSync();
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
        await deps.saveAndSync();
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
  anchor,
  deps
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

          deps.addMapShape(
            map,
            button.dataset.shape
          );

          closeMapPopup();
          await deps.saveAndSync();
        }
      );
    });

  showMapPopup(
    popup,
    anchor,
    'shapes'
  );
}
