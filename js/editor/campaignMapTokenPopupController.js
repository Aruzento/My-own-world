import {
  iconSvg
} from '../core/icons.js';

import {
  setStatus
} from '../ui/ui.js';

import {
  positionPopupNearAnchor
} from '../ui/popupPosition.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  changeTokenHp,
  deleteMapShape,
  deleteTokenAndPage,
  duplicateMapShape,
  duplicateTokenAndPage,
  ensureTokenHasHealthBlock,
  getTokenPage,
  openTokenCard,
  toggleMapItemPresentationVisibility
} from './campaignMapTokenActions.js';


const TOKEN_POPUP_DELAY = 420;

let tokenPopupTimer = null;
let tokenPopupCloseTimer = null;
let activeTokenPopupToken = null;


// Controller hover-попапов токенов и фигур на карте.
// Он управляет только UI-меню, а изменения карты делегирует action-слою.

export function scheduleTokenPopup(
  token,
  deps
) {

  if (
    deps.hasActiveTokenInteraction() ||
    deps.hasActiveShapeInteraction() ||
    token.classList.contains('is-dragging') ||
    token.classList.contains('is-resizing')
  ) return;

  clearTimeout(
    tokenPopupTimer
  );

  clearTimeout(
    tokenPopupCloseTimer
  );

  tokenPopupTimer =
    setTimeout(
      () => {

        openTokenPopup(
          token,
          deps
        );
      },
      TOKEN_POPUP_DELAY
    );
}


export function scheduleTokenPopupClose() {

  clearTimeout(
    tokenPopupTimer
  );

  clearTimeout(
    tokenPopupCloseTimer
  );

  tokenPopupCloseTimer =
    setTimeout(
      closeTokenPopup,
      180
    );
}


export function openTokenPopup(
  token,
  deps
) {

  if (
    !token.isConnected ||
    deps.hasActiveTokenInteraction() ||
    deps.hasActiveShapeInteraction() ||
    token.classList.contains('is-dragging') ||
    token.classList.contains('is-resizing')
  ) return;

  activeTokenPopupToken =
    token;

  const popup =
    getTokenPopup();

  const isShape =
    token.classList.contains('campaign-map-shape');

  const hidden =
    token.dataset.presentationHidden === 'true';

  if (
    !isShape &&
    token.dataset.tokenType === 'creature'
  ) {

    openCreatureTokenPopup(
      token,
      popup,
      hidden,
      deps
    );

    return;
  }

  popup.className =
    'campaign-token-popup hidden';

  popup.innerHTML = `
    <button class="campaign-token-popup-icon campaign-token-popup-delete" type="button" title="Удалить">${iconSvg('trash')}</button>
    <button class="campaign-token-popup-icon campaign-token-popup-hide" type="button" title="${hidden ? 'Показать' : 'Скрыть'}">
      ${getTokenVisibilityIcon(hidden)}
    </button>
    <button class="campaign-token-popup-icon campaign-token-popup-duplicate" type="button" title="Дублировать">${iconSvg('copy')}</button>
  `;

  popup
    .querySelector('.campaign-token-popup-delete')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        if (isShape) {

          await deleteMapShape(
            token,
            deps.getTokenActionDeps()
          );

        } else {

          await deleteTokenAndPage(
            token,
            deps.getTokenActionDeps()
          );
        }
      }
    );

  popup
    .querySelector('.campaign-token-popup-hide')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await toggleMapItemPresentationVisibility(
          token,
          deps.getTokenActionDeps()
        );
      }
    );

  popup
    .querySelector('.campaign-token-popup-duplicate')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        if (isShape) {

          await duplicateMapShape(
            token,
            deps.getTokenActionDeps()
          );

        } else {

          await duplicateTokenAndPage(
            token,
            deps.getTokenActionDeps()
          );
        }
      }
    );

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 132,
      fallbackHeight: 48
    }
  );
}


export function closeTokenPopup() {

  const popup =
    document.getElementById('campaignTokenPopup');

  popup?.classList.add(
    'hidden'
  );

  activeTokenPopupToken =
    null;
}


export function clearTokenPopupTimer() {

  clearTimeout(
    tokenPopupTimer
  );
}


function openCreatureTokenPopup(
  token,
  popup,
  hidden,
  deps
) {

  popup.className =
    'campaign-token-popup campaign-token-popup-compact hidden';

  popup.innerHTML = `
    <button class="campaign-token-popup-text campaign-token-popup-hide" type="button">
      ${hidden ? 'Показать' : 'Скрыть'}
    </button>
    <button class="campaign-token-popup-more" type="button" title="Действия">${iconSvg('more')}</button>
  `;

  popup
    .querySelector('.campaign-token-popup-hide')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await toggleMapItemPresentationVisibility(
          token,
          deps.getTokenActionDeps()
        );
      }
    );

  popup
    .querySelector('.campaign-token-popup-more')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        openCreatureTokenActionsPopup(
          token,
          deps
        );
      }
    );

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 128,
      fallbackHeight: 48
    }
  );
}


function openCreatureTokenActionsPopup(
  token,
  deps
) {

  const popup =
    getTokenPopup();

  popup.className =
    'campaign-token-popup campaign-token-popup-menu hidden';

  popup.innerHTML = `
    <button type="button" data-action="duplicate">Дублировать</button>
    <button type="button" data-action="hp">Изменить хиты</button>
    <button type="button" data-action="delete">Удалить</button>
    <button type="button" data-action="open">Открыть карточку</button>
  `;

  popup
    .querySelectorAll('button[data-action]')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();
          event.stopPropagation();

          const action =
            button.dataset.action;

          if (action === 'duplicate') {

            await duplicateTokenAndPage(
              token,
              deps.getTokenActionDeps()
            );
            return;
          }

          if (action === 'hp') {

            openTokenHpPopup(
              token,
              deps
            );
            return;
          }

          if (action === 'delete') {

            await deleteTokenAndPage(
              token,
              deps.getTokenActionDeps()
            );
            return;
          }

          if (action === 'open') {

            await openTokenCard(
              token,
              deps.getTokenActionDeps()
            );
          }
        }
      );
    });

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 180,
      fallbackHeight: 170
    }
  );
}


function openTokenHpPopup(
  token,
  deps
) {

  const page =
    getTokenPage(
      token
    );

  const health =
    ensureTokenHasHealthBlock(
      token,
      deps.getTokenActionDeps()
    );

  if (!page || !health) {

    setStatus(
      'У карточки нет блока DnD с хитами'
    );

    openCreatureTokenActionsPopup(
      token,
      deps
    );

    return;
  }

  const popup =
    getTokenPopup();

  popup.className =
    'campaign-token-popup campaign-token-popup-hp hidden';

  popup.innerHTML = `
    <div class="campaign-token-hp-title">Хиты: ${health.current}/${health.max}</div>
    <label class="campaign-token-hp-temp-label">
      <span>Временные хиты</span>
      <input class="campaign-token-hp-temp" type="number" min="0" step="1" value="${health.temp || 0}">
    </label>
    <div class="campaign-token-hp-row">
      <select class="campaign-token-hp-sign" aria-label="Знак изменения хитов">
        <option value="+">+</option>
        <option value="-">-</option>
      </select>
      <input class="campaign-token-hp-value" type="number" min="0" step="1" value="1">
    </div>
    <div class="campaign-token-hp-quick-actions">
      <button class="campaign-token-hp-restore" type="button">Восстановить хиты</button>
      <button class="campaign-token-hp-kill" type="button">Убить</button>
    </div>
    <div class="campaign-token-hp-actions">
      <button class="campaign-token-hp-cancel" type="button">Отмена</button>
      <button class="campaign-token-hp-ok" type="button">Ок</button>
    </div>
  `;

  popup
    .querySelector('.campaign-token-hp-cancel')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        openCreatureTokenActionsPopup(
          token,
          deps
        );
      }
    );

  popup
    .querySelector('.campaign-token-hp-restore')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await changeTokenHp(
          token,
          page,
          {
            mode: 'restore',
            temp: getHpPopupTempValue(
              popup
            )
          },
          deps.getTokenActionDeps()
        );
      }
    );

  popup
    .querySelector('.campaign-token-hp-kill')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await changeTokenHp(
          token,
          page,
          {
            mode: 'kill',
            temp: getHpPopupTempValue(
              popup
            )
          },
          deps.getTokenActionDeps()
        );
      }
    );

  popup
    .querySelector('.campaign-token-hp-ok')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        const sign =
          popup.querySelector('.campaign-token-hp-sign').value;

        const value =
          Number(
            popup.querySelector('.campaign-token-hp-value').value || 0
          );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) return;

        await changeTokenHp(
          token,
          page,
          {
            delta: sign === '-' ? -value : value,
            temp: getHpPopupTempValue(
              popup
            )
          },
          deps.getTokenActionDeps()
        );
      }
    );

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 250,
      fallbackHeight: 238
    }
  );

  popup
    .querySelector('.campaign-token-hp-value')
    .focus();
}


function getTokenPopup() {

  let popup =
    document.getElementById('campaignTokenPopup');

  if (popup) return popup;

  popup =
    document.createElement('div');

  popup.id =
    'campaignTokenPopup';

  popup.className =
    'campaign-token-popup hidden';

  markRuntime(
    popup
  );

  popup.addEventListener(
    'pointerenter',
    () => {

      clearTimeout(
        tokenPopupCloseTimer
      );
    }
  );

  popup.addEventListener(
    'pointerleave',
    scheduleTokenPopupClose
  );

  document.body.appendChild(
    popup
  );

  return popup;
}


function getTokenVisibilityIcon(
  hidden
) {

  return iconSvg(
    hidden
      ? 'eye'
      : 'eye-off'
  );
}


function getHpPopupTempValue(
  popup
) {

  const value =
    Number(
      popup.querySelector('.campaign-token-hp-temp')?.value || 0
    );

  return Number.isFinite(value)
    ? Math.max(
      0,
      Math.floor(value)
    )
    : 0;
}
