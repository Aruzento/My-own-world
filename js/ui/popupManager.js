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

const FOCUSABLE_POPUP_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(',');

const MENU_OVERLAY_KINDS =
  new Set([
    'menu',
    'dropdown-menu',
    'context-menu'
  ]);

const MENU_ITEM_SELECTOR = [
  'a[href]',
  'button',
  '[role="menuitem"]',
  '[data-overlay-menu-item="true"]'
].join(',');

const TEXT_ENTRY_SELECTOR =
  'input, textarea, select, [contenteditable="true"]';

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
  modal = false,
  kind = ''
}) {

  if (!popup) return null;

  const popupKey =
    key || popup.id || `popup-${managedPopups.size + 1}`;

  const overlayKind =
    normalizeOverlayKind(
      modal
        ? 'dialog'
        : kind || popup.dataset.overlayKind || 'popover'
    );

  ensureOverlayContract(
    popup,
    {
      modal,
      kind:
        overlayKind
    }
  );

  const closeHandler =
    close || (() => closePopup(popup));

  const entry = {
    popup,
    close:
      () => {

        closeHandler();

        syncPopupOverlayState(
          popup
        );

        restorePopupFocus(
          entry
        );
      },
    anchors,
    key: popupKey,
    modal,
    kind:
      overlayKind,
    restoreFocusElement:
      null
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

  popup.dataset.overlayState =
    'closed';

  if (
    activeDrag?.popup === popup
  ) {

    stopPopupDrag();
  }

  restorePopupFocus(
    getPopupEntry(
      popup
    )
  );
}


export function openPopup(
  popup
) {

  if (!popup) return;

  const entry =
    getPopupEntry(
      popup
    );

  const wasClosed =
    popup.classList.contains(
      'hidden'
    );

  ensureOverlayContract(
    popup,
    {
      modal:
        Boolean(
          entry?.modal
        ),
      kind:
        entry?.kind || popup.dataset.overlayKind || ''
    }
  );

  if (
    shouldRestorePopupFocus(entry) &&
    wasClosed
  ) {

    capturePopupRestoreFocus(
      entry
    );
  }

  popup.classList.remove(
    'hidden'
  );

  popup.dataset.popupOpen =
    'true';

  popup.dataset.overlayState =
    'open';

  popup.style.zIndex =
    String(
      ++popupZIndex
    );

  if (entry?.modal) {

    focusInitialPopupElement(
      entry
    );
  }

  if (
    isMenuPopupEntry(entry) &&
    wasClosed
  ) {

    focusInitialMenuItem(
      entry
    );
  }
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


function ensureOverlayContract(
  popup,
  {
    modal = false,
    kind = ''
  } = {}
) {

  if (!popup) return;

  const overlayKind =
    normalizeOverlayKind(
      kind ||
      (modal ? 'dialog' : popup.dataset.overlayKind || 'popover')
    );

  if (!popup.dataset.overlayLifecycle) {

    popup.dataset.overlayLifecycle =
      'popup-manager';
  }

  if (modal) {

    popup.dataset.overlayKind =
      'dialog';

  } else if (
    kind ||
    !popup.dataset.overlayKind
  ) {

    popup.dataset.overlayKind =
      overlayKind;
  }

  if (
    modal ||
    !popup.dataset.overlayModal
  ) {

    popup.dataset.overlayModal =
      String(
        Boolean(
          modal
        )
      );
  }

  if (modal) {

    if (!popup.hasAttribute('tabindex')) {

      popup.tabIndex =
        -1;
    }

    if (!popup.hasAttribute('role')) {

      popup.setAttribute(
        'role',
        'dialog'
      );
    }

    if (!popup.hasAttribute('aria-modal')) {

      popup.setAttribute(
        'aria-modal',
        'true'
      );
    }
  }

  if (
    isMenuOverlayKind(
      popup.dataset.overlayKind
    )
  ) {

    ensureMenuOverlayContract(
      popup
    );
  }

  if (!popup.dataset.overlayState) {

    syncPopupOverlayState(
      popup
    );
  }
}


function normalizeOverlayKind(
  kind
) {

  const normalized =
    String(
      kind || ''
    )
      .trim()
      .toLowerCase();

  if (
    normalized === 'dropdownmenu'
  ) {

    return 'dropdown-menu';
  }

  if (
    normalized === 'contextmenu'
  ) {

    return 'context-menu';
  }

  return normalized || 'popover';
}


function isMenuOverlayKind(
  kind
) {

  return MENU_OVERLAY_KINDS.has(
    normalizeOverlayKind(
      kind
    )
  );
}


function isMenuPopupEntry(
  entry
) {

  return Boolean(
    entry &&
    isMenuOverlayKind(
      entry.kind || entry.popup?.dataset.overlayKind
    )
  );
}


function ensureMenuOverlayContract(
  popup
) {

  if (!popup.hasAttribute('role')) {

    popup.setAttribute(
      'role',
      'menu'
    );
  }

  if (!popup.hasAttribute('aria-orientation')) {

    popup.setAttribute(
      'aria-orientation',
      'vertical'
    );
  }

  refreshMenuOverlayItems(
    popup
  );
}


function refreshMenuOverlayItems(
  popup
) {

  getMenuItemCandidates(
    popup
  ).forEach(item => {

    if (
      isDisabledMenuItem(
        item
      )
    ) {

      item.tabIndex =
        -1;

      if (!item.hasAttribute('aria-disabled')) {

        item.setAttribute(
          'aria-disabled',
          'true'
        );
      }

      return;
    }

    if (!item.hasAttribute('role')) {

      item.setAttribute(
        'role',
        'menuitem'
      );
    }

    if (!item.hasAttribute('tabindex')) {

      item.tabIndex =
        -1;
    }
  });
}


function syncPopupOverlayState(
  popup
) {

  if (!popup) return;

  const isOpen =
    !popup.classList.contains('hidden');

  popup.dataset.popupOpen =
    String(isOpen);

  popup.dataset.overlayState =
    isOpen ? 'open' : 'closed';
}


function capturePopupRestoreFocus(
  entry
) {

  const activeElement =
    document.activeElement;

  entry.restoreFocusElement =
    activeElement &&
    activeElement !== document.body &&
    activeElement !== document.documentElement &&
    !entry.popup.contains(activeElement) &&
    typeof activeElement.focus === 'function'
      ? activeElement
      : null;
}


function focusInitialPopupElement(
  entry
) {

  if (
    !entry?.modal ||
    !isPopupOpen(entry.popup)
  ) return;

  const autofocusElement =
    entry.popup.querySelector(
      '[data-overlay-autofocus="true"], [autofocus]'
    );

  const focusTarget =
    isFocusableElement(
      autofocusElement
    )
      ? autofocusElement
      : getFocusablePopupElements(
        entry.popup
      )[0] || entry.popup;

  focusPopupElement(
    focusTarget
  );
}


function focusInitialMenuItem(
  entry
) {

  if (
    !isMenuPopupEntry(entry) ||
    !isPopupOpen(entry.popup)
  ) return;

  refreshMenuOverlayItems(
    entry.popup
  );

  const firstItem =
    getMenuItemElements(
      entry.popup
    )[0];

  if (!firstItem) return;

  focusPopupElement(
    firstItem
  );
}


function shouldRestorePopupFocus(
  entry
) {

  return Boolean(
    entry?.modal ||
    isMenuPopupEntry(
      entry
    )
  );
}


function restorePopupFocus(
  entry
) {

  if (
    !shouldRestorePopupFocus(
      entry
    )
  ) return;

  const restoreTarget =
    entry.restoreFocusElement?.isConnected
      ? entry.restoreFocusElement
      : entry.anchors.find(anchor =>
        anchor?.isConnected &&
        typeof anchor.focus === 'function'
      );

  entry.restoreFocusElement =
    null;

  if (!restoreTarget) return;

  focusPopupElement(
    restoreTarget
  );
}


function handlePopupTabKey(
  event
) {

  const entry =
    getTopmostOpenModalEntry();

  if (!entry) return;

  trapModalFocus(
    entry,
    event
  );
}


function handlePopupMenuKey(
  event
) {

  const entry =
    getTopmostOpenMenuEntry();

  if (!entry) return false;

  const menuKeys =
    ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '];

  if (
    !menuKeys.includes(event.key)
  ) return false;

  const target =
    event.target;

  const isTextEntry =
    target?.nodeType === 1 &&
    typeof target.closest === 'function' &&
    entry.popup.contains(target) &&
    Boolean(
      target.closest(
        TEXT_ENTRY_SELECTOR
      )
    );

  if (
    isTextEntry &&
    event.key !== 'ArrowDown' &&
    event.key !== 'ArrowUp'
  ) return false;

  const items =
    getMenuItemElements(
      entry.popup
    );

  if (!items.length) return false;

  const activeElement =
    document.activeElement;

  const activeIndex =
    items.indexOf(
      activeElement
    );

  if (
    event.key === 'ArrowDown'
  ) {

    event.preventDefault();

    focusMenuItemByIndex(
      items,
      activeIndex === -1 ? 0 : activeIndex + 1
    );

    return true;
  }

  if (
    event.key === 'ArrowUp'
  ) {

    event.preventDefault();

    focusMenuItemByIndex(
      items,
      activeIndex === -1 ? items.length - 1 : activeIndex - 1
    );

    return true;
  }

  if (
    event.key === 'Home'
  ) {

    event.preventDefault();

    focusMenuItemByIndex(
      items,
      0
    );

    return true;
  }

  if (
    event.key === 'End'
  ) {

    event.preventDefault();

    focusMenuItemByIndex(
      items,
      items.length - 1
    );

    return true;
  }

  if (
    activeIndex === -1
  ) return false;

  event.preventDefault();

  activeElement.click();

  return true;
}


function trapModalFocus(
  entry,
  event
) {

  const focusableElements =
    getFocusablePopupElements(
      entry.popup
    );

  if (!focusableElements.length) {

    event.preventDefault();

    focusPopupElement(
      entry.popup
    );

    return;
  }

  const activeElement =
    document.activeElement;

  const activeIndex =
    focusableElements.indexOf(
      activeElement
    );

  if (activeIndex === -1) {

    event.preventDefault();

    focusPopupElement(
      event.shiftKey
        ? focusableElements[focusableElements.length - 1]
        : focusableElements[0]
    );

    return;
  }

  if (
    event.shiftKey &&
    activeIndex === 0
  ) {

    event.preventDefault();

    focusPopupElement(
      focusableElements[focusableElements.length - 1]
    );

    return;
  }

  if (
    !event.shiftKey &&
    activeIndex === focusableElements.length - 1
  ) {

    event.preventDefault();

    focusPopupElement(
      focusableElements[0]
    );
  }
}


function getTopmostOpenModalEntry() {

  let topEntry =
    null;

  let topZIndex =
    -Infinity;

  managedPopups.forEach(entry => {

    if (
      !entry.modal ||
      entry.popup.classList.contains('hidden')
    ) return;

    const zIndex =
      Number(
        entry.popup.style.zIndex
      ) || 0;

    if (
      !topEntry ||
      zIndex >= topZIndex
    ) {

      topEntry =
        entry;

      topZIndex =
        zIndex;
    }
  });

  return topEntry;
}


function getTopmostOpenMenuEntry() {

  let topEntry =
    null;

  let topZIndex =
    -Infinity;

  managedPopups.forEach(entry => {

    if (
      !isMenuPopupEntry(entry) ||
      entry.popup.classList.contains('hidden')
    ) return;

    const zIndex =
      Number(
        entry.popup.style.zIndex
      ) || 0;

    if (
      !topEntry ||
      zIndex >= topZIndex
    ) {

      topEntry =
        entry;

      topZIndex =
        zIndex;
    }
  });

  return topEntry;
}


function getMenuItemCandidates(
  popup
) {

  if (!popup) return [];

  return Array.from(
    popup.querySelectorAll(
      MENU_ITEM_SELECTOR
    )
  );
}


function getMenuItemElements(
  popup
) {

  return getMenuItemCandidates(
    popup
  ).filter(item =>
    !isDisabledMenuItem(item) &&
    isFocusableElement(item)
  );
}


function isDisabledMenuItem(
  item
) {

  return Boolean(
    item?.disabled ||
    item?.getAttribute?.('aria-disabled') === 'true' ||
    item?.classList?.contains('is-disabled')
  );
}


function focusMenuItemByIndex(
  items,
  index
) {

  if (!items.length) return;

  const nextIndex =
    (index + items.length) % items.length;

  focusPopupElement(
    items[nextIndex]
  );
}


function getFocusablePopupElements(
  popup
) {

  if (!popup) return [];

  return Array.from(
    popup.querySelectorAll(
      FOCUSABLE_POPUP_SELECTOR
    )
  ).filter(
    isFocusableElement
  );
}


function isFocusableElement(
  element
) {

  if (
    !element ||
    typeof element.focus !== 'function'
  ) return false;

  const style =
    window.getComputedStyle(
      element
    );

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getClientRects().length > 0
  );
}


function focusPopupElement(
  element
) {

  if (
    !element ||
    typeof element.focus !== 'function'
  ) return;

  try {

    element.focus({
      preventScroll:
        true
    });

  } catch {

    element.focus();
  }
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

      if (event.key === 'Tab') {

        handlePopupTabKey(
          event
        );

        return;
      }

      if (
        handlePopupMenuKey(
          event
        )
      ) return;

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
    open() {

      openPopup(
        entry.popup
      );
    },

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
