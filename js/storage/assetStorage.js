import {
  getAssetAdapter
} from './assetAdapter.js';

import {
  getStorageAdapter
} from './storageAdapter.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';


const renderableImageUrlCache =
  new Map();


export async function getImageURL(
  filename
) {

  return getAssetAdapter()
    .resolveUrl(
      filename
    );
}


export async function getRenderableImageURL(
  filename
) {

  const cacheKey =
    normalizeWorkspacePath(
      filename
    );

  if (
    renderableImageUrlCache.has(
      cacheKey
    )
  ) {

    return renderableImageUrlCache.get(
      cacheKey
    );
  }

  const primaryUrl =
    await getImageURL(
      filename
    );

  if (
    await canRenderImageURL(
      primaryUrl
    )
  ) {

    renderableImageUrlCache.set(
      cacheKey,
      primaryUrl
    );

    return primaryUrl;
  }

  const fallbackUrl =
    await readAssetAsDataURL(
    filename
  );

  renderableImageUrlCache.set(
    cacheKey,
    fallbackUrl
  );

  return fallbackUrl;
}


export async function saveAssetFile(
  file,
  options = {}
) {

  return getAssetAdapter()
    .importFile(
      file,
      options
    );
}


async function canRenderImageURL(
  url
) {

  if (
    typeof Image !== 'function'
  ) {

    return true;
  }

  return new Promise(resolve => {

    const image =
      new Image();

    image.onload =
      () => resolve(true);

    image.onerror =
      () => resolve(false);

    image.src =
      url;
  });
}


async function readAssetAsDataURL(
  filename
) {

  const path =
    normalizeWorkspacePath(
      filename
    )
      .replace(/^assets\//, '');

  const buffer =
    await getStorageAdapter()
      .readBinary(
        `assets/${path}`
      );

  return `data:${getMimeType(path)};base64,${arrayBufferToBase64(buffer)}`;
}


function arrayBufferToBase64(
  buffer
) {

  const bytes =
    new Uint8Array(
      buffer
    );

  let binary =
    '';

  const chunkSize =
    0x8000;

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(
        index,
        index + chunkSize
      )
    );
  }

  return btoa(
    binary
  );
}


function getMimeType(
  path
) {

  const extension =
    String(path)
      .split('.')
      .pop()
      .toLowerCase();

  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'svg') return 'image/svg+xml';

  return 'application/octet-stream';
}
