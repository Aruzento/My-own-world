import {
  positionPopupAtPoint,
  positionPopupNearAnchor
} from './popupPosition.js';


const managedPopups =
  new Set();

let isListening =
  false;


export function registerPopup({
  popup,
  close,
  anchors = []
}) {

  if (!popup || !close) return;

  managedPopups.add({
    popup,
    close,
    anchors
  });

  ensurePopupManagerListeners();
}


export function openPopupNearAnchor(
  popup,
  anchor,
  options = {}
) {

  showPopup(
    popup
  );

  positionPopupNearAnchor(
    popup,
    anchor,
    options
  );
}


export function openPopupAtPoint(
  popup,
  x,
  y,
  options = {}
) {

  showPopup(
    popup
  );

  positionPopupAtPoint(
    popup,
    x,
    y,
    options
  );
}


export function closePopup(
  popup
) {

  popup?.classList.add(
    'hidden'
  );
}


export function togglePopupNearAnchor(
  popup,
  anchor,
  options = {}
) {

  if (
    popup &&
    !popup.classList.contains('hidden')
  ) {

    closePopup(
      popup
    );

    return false;
  }

  openPopupNearAnchor(
    popup,
    anchor,
    options
  );

  return true;
}


function showPopup(
  popup
) {

  popup?.classList.remove(
    'hidden'
  );
}


function ensurePopupManagerListeners() {

  if (isListening) return;

  isListening =
    true;

  document.addEventListener(
    'pointerdown',
    event => {

      managedPopups.forEach(entry => {

        if (
          entry.popup.classList.contains('hidden')
        ) return;

        if (
          entry.popup.contains(event.target)
        ) return;

        if (
          entry.anchors.some(anchor =>
            anchor?.contains?.(event.target)
          )
        ) return;

        entry.close();
      });
    }
  );

  document.addEventListener(
    'keydown',
    event => {

      if (event.key !== 'Escape') return;

      managedPopups.forEach(entry => {

        if (
          !entry.popup.classList.contains('hidden')
        ) {

          entry.close();
        }
      });
    }
  );
}
