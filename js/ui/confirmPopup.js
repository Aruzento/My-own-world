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
  container = null,
  choices = [],
  waitForConfirm = false
}) {

  const instance =
    getConfirmInstance({
      modal
    });
  if (instance.busy) return;
  instance.waitForConfirm = waitForConfirm;
  instance.element.removeAttribute('aria-busy');
  instance.element.querySelector('.confirm-popup-confirm').disabled = false;
  instance.element.querySelector('.confirm-popup-cancel').disabled = false;
  instance.element.querySelector('.confirm-popup-progress').hidden = true;

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
    () => onConfirm?.([...instance.element.querySelectorAll('[data-confirm-choice]:checked')].map(input => input.value), {
      setProgress: message => {
        const progress = instance.element.querySelector('.confirm-popup-progress');
        progress.hidden = false; progress.textContent = message;
      }
    });

  let choiceHost = instance.element.querySelector('.confirm-popup-choices');
  if (!choiceHost) {
    choiceHost = document.createElement('div'); choiceHost.className = 'confirm-popup-choices';
    instance.element.querySelector('.confirm-popup-message').after(choiceHost);
  }
  choiceHost.replaceChildren();
  for (const choice of choices) {
    const label = document.createElement('label'), input = document.createElement('input');
    input.type = 'checkbox'; input.value = String(choice.value); input.dataset.confirmChoice = 'true';
    label.append(input, document.createTextNode(choice.label)); choiceHost.append(label);
  }

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
    <div class="confirm-popup-progress" role="status" aria-live="polite" hidden></div>

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
    modal,
    busy: false,
    waitForConfirm: false
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
        if (instance.busy) return;

        const handler =
          instance.confirmHandler;

        if (!instance.waitForConfirm) {
          instance.controller?.close();
          await handler?.();
          return;
        }
        instance.busy = true;
        element.setAttribute('aria-busy', 'true');
        const confirm = element.querySelector('.confirm-popup-confirm'), cancel = element.querySelector('.confirm-popup-cancel');
        confirm.disabled = true; cancel.disabled = true; confirm.textContent = 'Изменение…';
        element.querySelectorAll('[data-confirm-choice]').forEach(input => { input.disabled = true; });
        const progress = element.querySelector('.confirm-popup-progress');
        progress.hidden = false; progress.textContent = 'Подготовка смены типа…';
        // Paint the operation state before starting schema/storage work.
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
        let close = false;
        try { close = await handler?.() !== false; }
        catch (error) { progress.textContent = `Не выполнено: ${error.message}`; }
        finally {
          instance.busy = false; element.setAttribute('aria-busy', 'false');
          if (close) instance.controller?.close();
          else { cancel.disabled = false; cancel.textContent = 'Закрыть'; confirm.textContent = 'Не выполнено'; }
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
  if (instance.busy) return;

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
