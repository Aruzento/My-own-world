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
  getGridPopupHTML,
  getShapesPopupHTML
} from './campaignMapToolbar.js';

import {
  toggleGrid,
  updateGridSize
} from './campaignMapViewport.js';

import {
  clearFog,
  fillFog,
  updateFogButtons
} from './campaignMapFog.js';

import {
  rememberMapAssetSettings
} from './campaignMapContract.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';


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

  return false;
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
