import {
  openPopupNearAnchor,
  registerPopup
} from '../ui/popupManager.js';

import {
  markRuntime
} from './blocks/blockContract.js';


// Общий controller для popup-ов карты. Он отвечает только за контейнер,
// позиционирование, повторный клик по кнопке и закрытие по клику снаружи.

let popupController =
  null;

const mapPopupAnchors =
  [];

export function toggleMapPopupForAnchor(
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


export function getMapPopup() {

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

  popup.addEventListener(
    'click',
    event => {

      event.stopPropagation();
    }
  );

  popupController =
    registerPopup({
      popup,
      close: closeMapPopup,
      anchors: mapPopupAnchors,
      key: 'campaign-map-popup'
    });

  return popup;
}


export function showMapPopup(
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

  mapPopupAnchors.splice(
    0,
    mapPopupAnchors.length
  );

  if (anchor) {

    mapPopupAnchors.push(
      anchor
    );
  }

  requestAnimationFrame(
    () => {

      openPopupNearAnchor(
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


export function closeMapPopup() {

  const popup =
    document.getElementById('campaignMapPopup');

  if (!popup) return;

  popup.classList.add(
    'hidden'
  );

  popup.dataset.popupKey =
    '';

  popup.dataset.anchorKey =
    '';

  mapPopupAnchors.splice(
    0,
    mapPopupAnchors.length
  );
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
