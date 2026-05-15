import {
  positionPopupNearAnchor
} from './popupPosition.js';

let popup = null;
let confirmHandler = null;


export function openConfirmPopup({
  anchor,
  title,
  message,
  confirmText = 'Удалить',
  cancelText = 'Отмена',
  onConfirm
}) {

  const element =
    getConfirmPopup();

  confirmHandler =
    onConfirm;

  element.querySelector('.confirm-popup-title').textContent =
    title;

  element.querySelector('.confirm-popup-message').textContent =
    message;

  element.querySelector('.confirm-popup-confirm').textContent =
    confirmText;

  element.querySelector('.confirm-popup-cancel').textContent =
    cancelText;

  element.classList.remove(
    'hidden'
  );

  positionPopup(
    element,
    anchor
  );
}


export function closeConfirmPopup() {

  if (!popup) return;

  popup.classList.add(
    'hidden'
  );

  confirmHandler =
    null;
}


function getConfirmPopup() {

  if (popup) return popup;

  popup =
    document.createElement('div');

  popup.className =
    'confirm-popup hidden';

  popup.innerHTML = `
    <div class="confirm-popup-title"></div>
    <div class="confirm-popup-message"></div>

    <div class="confirm-popup-actions">
      <button class="confirm-popup-cancel" type="button">Отмена</button>
      <button class="confirm-popup-confirm" type="button">Удалить</button>
    </div>
  `;

  document.body.appendChild(
    popup
  );

  popup
    .querySelector('.confirm-popup-cancel')
    .addEventListener(
      'click',
      closeConfirmPopup
    );

  popup
    .querySelector('.confirm-popup-confirm')
    .addEventListener(
      'click',
      async () => {

        const handler =
          confirmHandler;

        closeConfirmPopup();

        if (handler) {

          await handler();
        }
      }
    );

  document.addEventListener(
    'click',
    event => {

      if (
        popup.classList.contains('hidden') ||
        popup.contains(event.target) ||
        event.target.closest('[data-confirm-anchor="true"]')
      ) {

        return;
      }

      closeConfirmPopup();
    }
  );

  return popup;
}


function positionPopup(
  element,
  anchor
) {

  positionPopupNearAnchor(
    element,
    anchor,
    {
      fallbackWidth: 260,
      fallbackHeight: 140
    }
  );
}
