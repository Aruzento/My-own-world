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
    await readAssetAsDataURLOrMissingPlaceholder(
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


export async function readAssetAsDataURLOrMissingPlaceholder(
  filename
) {

  try {

    return await readAssetAsDataURL(
      filename
    );

  } catch (error) {

    console.warn(
      'Asset file is missing, using placeholder.',
      filename
    );

    return createMissingAssetPlaceholderURL(
      filename
    );
  }
}


export function createMissingAssetPlaceholderURL(
  filename
) {

  const safeName =
    String(filename || 'missing asset')
      .replace(/[<>&"]/g, '');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <rect width="640" height="360" fill="#211f1b"/>
      <rect x="24" y="24" width="592" height="312" rx="18" fill="#332f28" stroke="#d6b35c" stroke-width="2" stroke-dasharray="10 8"/>
      <text x="320" y="160" text-anchor="middle" fill="#f7ecd0" font-family="Arial, sans-serif" font-size="28" font-weight="700">Asset missing</text>
      <text x="320" y="205" text-anchor="middle" fill="#d6b35c" font-family="Arial, sans-serif" font-size="18">${safeName}</text>
    </svg>`;

  return `data:image/svg+xml;base64,${encodeBase64(svg)}`;
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

  return encodeBase64(
    binary
  );
}


function encodeBase64(
  value
) {

  if (
    typeof btoa === 'function'
  ) {

    return btoa(
      value
    );
  }

  return Buffer
    .from(
      value,
      'utf8'
    )
    .toString(
      'base64'
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
  if (extension === 'mp3') return 'audio/mpeg';
  if (extension === 'wav') return 'audio/wav';
  if (extension === 'ogg') return 'audio/ogg';
  if (extension === 'm4a') return 'audio/mp4';
  if (extension === 'aac') return 'audio/aac';
  if (extension === 'flac') return 'audio/flac';
  if (extension === 'webm') return 'audio/webm';

  return 'application/octet-stream';
}
