import {
  positionPopupAtPoint,
  positionPopupNearAnchor
} from './popupPosition.js';


const managedPopups =
  new Map();

let popupZIndex =
  10_000;

let isListening =
  false;


// PopupManager задает общий lifecycle для popup-ов приложения:
// register -> open/toggle -> close -> destroy. Старые helper-функции оставлены
// совместимыми, но новые popup лучше подключать через controller.

export function registerPopup({
  popup,
  close,
  anchors = [],
  key = '',
  modal = false
}) {

  if (!popup) return null;

  const popupKey =
    key || popup.id || `popup-${managedPopups.size + 1}`;

  const entry = {
    popup,
    close:
      close || (() => closePopup(popup)),
    anchors,
    key: popupKey,
    modal
  };

  managedPopups.set(
    popupKey,
    entry
  );

  ensurePopupManagerListeners();

  return createPopupController(
    entry
  );
}


export function openPopupNearAnchor(
  popup,
  anchor,
  options = {}
) {

  openPopup(
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

  openPopup(
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

  if (!popup) return;

  popup.classList.add(
    'hidden'
  );

  popup.dataset.popupOpen =
    'false';
}


export function openPopup(
  popup
) {

  if (!popup) return;

  popup.classList.remove(
    'hidden'
  );

  popup.dataset.popupOpen =
    'true';

  popup.style.zIndex =
    String(
      ++popupZIndex
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


export function togglePopupAtPoint(
  popup,
  x,
  y,
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

  openPopupAtPoint(
    popup,
    x,
    y,
    options
  );

  return true;
}


export function closeAllPopups(
  exceptPopup = null
) {

  managedPopups.forEach(entry => {

    if (entry.popup === exceptPopup) return;

    if (
      !entry.popup.classList.contains('hidden')
    ) {

      entry.close();
    }
  });
}


export function destroyPopup(
  popupOrKey
) {

  const entry =
    getPopupEntry(
      popupOrKey
    );

  if (!entry) return;

  closePopup(
    entry.popup
  );

  entry.popup.remove();

  managedPopups.delete(
    entry.key
  );
}


export function isPopupOpen(
  popup
) {

  return Boolean(
    popup &&
    !popup.classList.contains('hidden')
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


function createPopupController(
  entry
) {

  return {
    openNearAnchor(anchor, options = {}) {

      openPopupNearAnchor(
        entry.popup,
        anchor,
        options
      );
    },

    openAtPoint(x, y, options = {}) {

      openPopupAtPoint(
        entry.popup,
        x,
        y,
        options
      );
    },

    toggleNearAnchor(anchor, options = {}) {

      return togglePopupNearAnchor(
        entry.popup,
        anchor,
        options
      );
    },

    toggleAtPoint(x, y, options = {}) {

      return togglePopupAtPoint(
        entry.popup,
        x,
        y,
        options
      );
    },

    close() {

      entry.close();
    },

    destroy() {

      destroyPopup(
        entry.key
      );
    },

    isOpen() {

      return isPopupOpen(
        entry.popup
      );
    }
  };
}


function getPopupEntry(
  popupOrKey
) {

  if (typeof popupOrKey === 'string') {

    return managedPopups.get(
      popupOrKey
    );
  }

  for (const entry of managedPopups.values()) {

    if (entry.popup === popupOrKey) return entry;
  }

  return null;
}
