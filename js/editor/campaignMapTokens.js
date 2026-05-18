import {
  getImageURL
} from '../storage/assetStorage.js';

import {
  markRuntime
} from './blocks/blockContract.js';


const restoredTokenImageAssets = new WeakMap();


// Токен на карте хранит состояние в data-* атрибутах.
// Этот модуль отвечает только за DOM-представление токена и его картинку.

export async function restoreTokenImage(
  token
) {

  const asset =
    token.dataset.imageAsset;

  if (
    asset &&
    restoredTokenImageAssets.get(token) === asset &&
    token.querySelector('.campaign-map-token-image')
  ) {

    ensureTokenResizeHandles(
      token
    );

    return;
  }

  if (!asset) {

    setTokenFallbackText(
      token,
      token.dataset.tokenType
    );

    restoredTokenImageAssets.delete(
      token
    );

    return;
  }

  try {

    const url =
      await getImageURL(
        asset
      );

    token.innerHTML = `
      <img
        class="campaign-map-token-image"
        src="${url}"
        alt=""
      >
    `;

    ensureTokenResizeHandles(
      token
    );

    restoredTokenImageAssets.set(
      token,
      asset
    );

  } catch (error) {

    console.warn(
      'Не удалось восстановить картинку токена:',
      asset
    );

    setTokenFallbackText(
      token,
      token.dataset.tokenType
    );

    restoredTokenImageAssets.delete(
      token
    );
  }
}


export function setTokenFallbackText(
  token,
  type
) {

  token.textContent =
    type === 'creature'
      ? 'С'
      : 'О';

  ensureTokenResizeHandles(
    token
  );
}


export function ensureTokenResizeHandles(
  token
) {

  if (
    token.dataset.tokenType !== 'object'
  ) return;

  ['nw', 'ne', 'sw', 'se'].forEach(corner => {

    if (
      token.querySelector(`.campaign-map-token-resize.is-${corner}`)
    ) return;

    const handle =
      document.createElement('span');

    handle.className =
      `campaign-map-token-resize is-${corner}`;

    handle.dataset.corner =
      corner;

    markRuntime(
      handle
    );

    token.appendChild(
      handle
    );
  });

  if (
    token.querySelector('.campaign-map-token-rotate')
  ) return;

  const rotateHandle =
    document.createElement('span');

  rotateHandle.className =
    'campaign-map-token-rotate';

  rotateHandle.title =
    'Повернуть';

  markRuntime(
    rotateHandle
  );

  token.appendChild(
    rotateHandle
  );
}


export function applyTokenSize(
  token
) {

  const size =
    Math.max(
      0.5,
      Number(token.dataset.size || 1)
    );

  token.style.setProperty(
    '--token-size',
    String(size)
  );
}


export function applyTokenRotation(
  token
) {

  const rotation =
    Number(token.dataset.rotation || 0);

  token.style.setProperty(
    '--token-rotation',
    `${rotation}deg`
  );
}


export function positionToken(
  token
) {

  token.style.left =
    `${Number(token.dataset.x || 50)}%`;

  token.style.top =
    `${Number(token.dataset.y || 50)}%`;

  token.title =
    token.dataset.name || '';
}


export function getPagePortraitAsset(
  page
) {

  const parsed =
    parsePageBody(
      page
    );

  const image =
    parsed.querySelector(
      '.media-box.is-portrait img[data-asset], img[data-asset]'
    );

  return image?.dataset.asset || '';
}


function parsePageBody(
  page
) {

  const wrapper =
    document.createElement('div');

  const body =
    String(page?.content || '')
      .replace(/---[\s\S]*?---/, '')
      .trim();

  wrapper.innerHTML =
    body;

  return wrapper;
}
