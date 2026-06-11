import {
  positionPopupAtPoint,
  positionPopupNearAnchor
} from './popupPosition.js';


const managedPopups =
  new Map();

const INTERACTIVE_POPUP_SELECTOR = [
  'button',
  'input',
  'select',
  'textarea',
  'a',
  '[contenteditable="true"]',
  '[data-popup-drag-ignore="true"]'
].join(',');

let popupZIndex =
  10_000;

let isListening =
  false;

let activeDrag =
  null;


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

  enablePopupDragging(
    popup
  );

  ensurePopupManagerListeners();

  return createPopupController(
    entry
  );
}


export function enablePopupDragging(
  popup
) {

  if (!popup) return;

  ensurePopupDragHandle(
    popup
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

  if (
    activeDrag?.popup === popup
  ) {

    stopPopupDrag();
  }
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

  document.addEventListener(
    'pointermove',
    movePopupDrag
  );

  document.addEventListener(
    'pointerup',
    stopPopupDrag
  );

  document.addEventListener(
    'pointercancel',
    stopPopupDrag
  );
}


function ensurePopupDragHandle(
  popup
) {

  if (
    popup.dataset.popupDragReady === 'true'
  ) return;

  popup.dataset.popupDragReady =
    'true';

  popup.addEventListener(
    'pointerdown',
    event => {

      startPopupDrag(
        popup,
        event
      );
    }
  );
}


function startPopupDrag(
  popup,
  event
) {

  if (
    event.button !== 0 ||
    popup.classList.contains('hidden') ||
    shouldIgnorePopupDrag(
      popup,
      event.target
    )
  ) return;

  const rect =
    popup.getBoundingClientRect();

  activeDrag = {
    popup:
      popup,
    pointerId:
      event.pointerId,
    startX:
      event.clientX,
    startY:
      event.clientY,
    left:
      rect.left,
    top:
      rect.top,
    width:
      rect.width,
    height:
      rect.height
  };

  popup.classList.add(
    'is-popup-dragging'
  );

  popup.style.position =
    'fixed';

  popup.style.left =
    `${rect.left}px`;

  popup.style.top =
    `${rect.top}px`;

  popup.style.zIndex =
    String(
      ++popupZIndex
    );

  event.preventDefault();
}


function movePopupDrag(
  event
) {

  if (!activeDrag) return;

  if (
    event.pointerId !== activeDrag.pointerId
  ) return;

  const nextLeft =
    activeDrag.left +
    event.clientX -
    activeDrag.startX;

  const nextTop =
    activeDrag.top +
    event.clientY -
    activeDrag.startY;

  activeDrag.popup.style.left =
    `${clampToViewport(
      nextLeft,
      activeDrag.width,
      window.innerWidth
    )}px`;

  activeDrag.popup.style.top =
    `${clampToViewport(
      nextTop,
      activeDrag.height,
      window.innerHeight
    )}px`;

  event.preventDefault();
}


function stopPopupDrag() {

  if (!activeDrag) return;

  activeDrag.popup.classList.remove(
    'is-popup-dragging'
  );

  activeDrag =
    null;
}


function shouldIgnorePopupDrag(
  popup,
  target
) {

  if (!target || !popup.contains(target)) {

    return true;
  }

  return Boolean(
    target.closest(
      INTERACTIVE_POPUP_SELECTOR
    )
  );
}


function clampToViewport(
  value,
  size,
  viewportSize
) {

  const padding =
    12;

  return Math.max(
    padding,
    Math.min(
      value,
      Math.max(
        padding,
        viewportSize - size - padding
      )
    )
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
