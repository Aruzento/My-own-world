import {
  openPopupNearAnchor,
  registerPopup
} from '../ui/popupManager.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  MAP_POPUP_UI_MIGRATION
} from './campaignMapPopupMarkup.js';


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
    'campaign-map-popup mow-popover hidden';

  popup.dataset.mapPopupUiMigration =
    MAP_POPUP_UI_MIGRATION;

  popup.setAttribute(
    'aria-label',
    'Настройки карты'
  );

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
      close: hideMapPopup,
      anchors: mapPopupAnchors,
      key: 'campaign-map-popup',
      kind: 'dialog',
      modal: true
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

  popup.dataset.mapPopupUiMigration =
    MAP_POPUP_UI_MIGRATION;

  popup.setAttribute(
    'aria-label',
    getMapPopupLabel(
      key
    )
  );

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

      avoidMapInspectorOverlap(
        popup
      );
    }
  );
}


function getMapPopupLabel(
  key
) {

  const labels =
    {
      add:
        'Добавление на карту',
      picker:
        'Выбор карточек для карты',
      grid:
        'Настройки сетки карты',
      drawing:
        'Инструменты рисования карты',
      fog:
        'Настройки тумана карты',
      shapes:
        'Фигуры карты',
      layers:
        'Слои карты',
      initiative:
        'Инициатива карты',
      music:
        'Музыка карты'
    };

  return labels[key] ||
    'Настройки карты';
}


export function closeMapPopup() {

  if (popupController) {

    popupController.close();
    return;
  }

  hideMapPopup();
}


function hideMapPopup() {

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


function avoidMapInspectorOverlap(
  popup
) {

  const inspector =
    document.querySelector('.campaign-map-properties-panel:not(.hidden)');

  if (
    !isVisibleElement(popup) ||
    !isVisibleElement(inspector)
  ) {

    return;
  }

  const popupRect =
    popup.getBoundingClientRect();

  const inspectorRect =
    inspector.getBoundingClientRect();

  if (
    !rectsOverlap(
      popupRect,
      inspectorRect
    )
  ) {

    return;
  }

  const gap =
    12;

  const nextLeft =
    clamp(
      inspectorRect.left - popupRect.width - gap,
      gap,
      window.innerWidth - popupRect.width - gap
    );

  popup.style.left =
    `${nextLeft}px`;
}


function rectsOverlap(
  first,
  second
) {

  return first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top;
}


function isVisibleElement(
  element
) {

  if (!element) return false;

  const style =
    getComputedStyle(element);

  const rect =
    element.getBoundingClientRect();

  return style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    !element.hasAttribute('hidden') &&
    !element.classList.contains('hidden') &&
    rect.width > 0 &&
    rect.height > 0;
}


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      value,
      Math.max(min, max)
    )
  );
}
