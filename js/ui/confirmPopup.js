import {
  registerPopup
} from './popupManager.js';

const confirmInstances =
  new Map();


export function openConfirmPopup({
  anchor,
  title,
  message,
  confirmText = 'Удалить',
  cancelText = 'Отмена',
  onConfirm,
  modal = false,
  container = null
}) {

  const instance =
    getConfirmInstance({
      modal
    });

  mountConfirmInstance(
    instance,
    container
  );

  if (
    instance.activeAnchor === anchor &&
    !instance.element.classList.contains('hidden')
  ) {

    instance.controller?.close();

    return;
  }

  instance.activeAnchor =
    anchor;

  instance.popupAnchors.splice(
    0,
    instance.popupAnchors.length,
    ...(
      anchor
        ? [anchor]
        : []
    )
  );

  instance.confirmHandler =
    onConfirm;

  instance.element.querySelector('.confirm-popup-title').textContent =
    title;

  instance.element.querySelector('.confirm-popup-message').textContent =
    message;

  instance.element.querySelector('.confirm-popup-confirm').textContent =
    confirmText;

  instance.element.querySelector('.confirm-popup-cancel').textContent =
    cancelText;

  instance.controller?.openNearAnchor(
    anchor || instance.element,
    {
      fallbackWidth:
        modal ? 320 : 260,
      fallbackHeight:
        modal ? 170 : 140
    }
  );
}


export function closeConfirmPopup(
  {
    modal = null
  } = {}
) {

  if (typeof modal === 'boolean') {

    const instance =
      confirmInstances.get(
        getConfirmInstanceKey(
          modal
        )
      );

    instance?.controller?.close();

    return;
  }

  confirmInstances.forEach(instance =>
    instance.controller?.close()
  );
}


function getConfirmInstance({
  modal
}) {

  const key =
    getConfirmInstanceKey(
      modal
    );

  const existing =
    confirmInstances.get(
      key
    );

  if (existing) return existing;

  const element =
    document.createElement('div');

  element.className =
    modal
      ? 'confirm-popup confirm-popup-modal hidden'
      : 'confirm-popup hidden';

  element.dataset.confirmPopupMode =
    modal ? 'modal' : 'popover';

  const titleId =
    `${key}-title`;

  const messageId =
    `${key}-message`;

  element.setAttribute(
    'aria-labelledby',
    titleId
  );

  element.setAttribute(
    'aria-describedby',
    messageId
  );

  element.innerHTML = `
    <div class="confirm-popup-title" id="${titleId}"></div>
    <div class="confirm-popup-message" id="${messageId}"></div>

    <div class="confirm-popup-actions">
      <button class="confirm-popup-cancel" type="button" data-overlay-autofocus="true">Отмена</button>
      <button class="confirm-popup-confirm" type="button">Удалить</button>
    </div>
  `;

  const instance = {
    element,
    popupAnchors:
      [],
    confirmHandler:
      null,
    activeAnchor:
      null,
    controller:
      null,
    modal
  };

  document.body.appendChild(
    element
  );

  element
    .querySelector('.confirm-popup-cancel')
    .addEventListener(
      'click',
      () => {

        instance.controller?.close();
      }
    );

  element
    .querySelector('.confirm-popup-confirm')
    .addEventListener(
      'click',
      async () => {

        const handler =
          instance.confirmHandler;

        instance.controller?.close();

        if (handler) {

          await handler();
        }
      }
    );

  instance.controller =
    registerPopup({
      popup:
        element,
      close:
        () => closeConfirmInstance(
          instance
        ),
      anchors:
        instance.popupAnchors,
      key,
      kind:
        modal ? 'dialog' : 'popover',
      modal
    });

  confirmInstances.set(
    key,
    instance
  );

  return instance;
}


function closeConfirmInstance(
  instance
) {

  instance.element.classList.add(
    'hidden'
  );

  instance.confirmHandler =
    null;

  instance.activeAnchor =
    null;

  instance.popupAnchors.splice(
    0,
    instance.popupAnchors.length
  );
}


function mountConfirmInstance(
  instance,
  container
) {

  const parent =
    container || document.body;

  if (
    instance.element.parentElement === parent
  ) return;

  parent.appendChild(
    instance.element
  );
}


function getConfirmInstanceKey(
  modal
) {

  return modal
    ? 'confirm-popup-modal'
    : 'confirm-popup';
}
