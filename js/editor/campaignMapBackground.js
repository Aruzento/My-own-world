import {
  getRenderableImageURL
} from '../storage/assetStorage.js';

import {
  LOW_DETAIL_INTERACTION_ZOOM_THRESHOLD,
  LOW_DETAIL_MAX_SIZE,
  LOW_DETAIL_ZOOM_THRESHOLD
} from './campaignMapConstants.js';

import {
  getStageView
} from './campaignMapGeometry.js';


const backgroundQualityState = new WeakMap();
const fullDetailBackgroundCache = new Map();
const lowDetailBackgroundCache = new Map();
const interactionQualityTimers = new WeakMap();


// Этот модуль держит только качество фонового изображения карты:
// полный фон, облегченный фон и отложенное переключение во время drag/pan.

export async function updateMapBackgroundQuality(
  map
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  const background =
    map?.querySelector('.campaign-map-background');

  const asset =
    stage?.dataset.mapAsset;

  if (!stage || !background || !asset) return;

  const quality =
    shouldUseLowDetailMap(
      map
    )
      ? 'low'
      : 'full';

  const state =
    getBackgroundQualityState(
      map
    );

  if (
    state.asset === asset &&
    state.quality === quality
  ) return;

  state.asset =
    asset;

  state.quality =
    quality;

  const url =
    await getMapBackgroundURL(
      asset,
      quality
    );

  const latest =
    getBackgroundQualityState(
      map
    );

  if (
    latest.asset !== asset ||
    latest.quality !== quality
  ) return;

  background.style.backgroundImage =
    `url("${url}")`;
}


export function setMapInteractionQuality(
  map,
  isInteracting,
  options = {}
) {

  const state =
    getBackgroundQualityState(
      map
    );

  state.forceLowDetail =
    Boolean(isInteracting);

  if (
    !options.skipVisibleUpdate
  ) {

    options.scheduleVisibleMapObjectsUpdate?.(
      map
    );
  }

  const existingTimer =
    interactionQualityTimers.get(
      map
    );

  if (existingTimer) {

    clearTimeout(
      existingTimer
    );

    interactionQualityTimers.delete(
      map
    );
  }

  if (
    options.deferBackgroundUpdate
  ) {

    const timer =
      setTimeout(
        () => {

          interactionQualityTimers.delete(
            map
          );

          updateMapBackgroundQuality(
            map
          );
        },
        80
      );

    interactionQualityTimers.set(
      map,
      timer
    );

    return;
  }

  updateMapBackgroundQuality(
    map
  );
}


export function clearMapBackgroundCache(
  asset
) {

  // При замене файла с тем же именем нужно сбросить оба кэша,
  // иначе карта может продолжить показывать старую картинку.
  fullDetailBackgroundCache.delete(
    asset
  );

  lowDetailBackgroundCache.delete(
    asset
  );
}


async function getMapBackgroundURL(
  asset,
  quality
) {

  if (quality !== 'low') {

    return getFullDetailBackgroundURL(
      asset
    );
  }

  try {

    return await getLowDetailBackgroundURL(
      asset
    );

  } catch (error) {

    return getFullDetailBackgroundURL(
      asset
    );
  }
}


async function getFullDetailBackgroundURL(
  asset
) {

  if (!fullDetailBackgroundCache.has(asset)) {

    fullDetailBackgroundCache.set(
      asset,
      getRenderableImageURL(
        asset
      )
    );
  }

  return fullDetailBackgroundCache.get(
    asset
  );
}


function shouldUseLowDetailMap(
  map
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) return false;

  const state =
    getBackgroundQualityState(
      map
    );

  const zoom =
    getStageView(
      stage
    ).zoom;

  if (zoom < LOW_DETAIL_ZOOM_THRESHOLD) return true;

  return state.forceLowDetail &&
    zoom < LOW_DETAIL_INTERACTION_ZOOM_THRESHOLD;
}


function getBackgroundQualityState(
  map
) {

  if (!backgroundQualityState.has(map)) {

    backgroundQualityState.set(
      map,
      {
        asset: '',
        quality: '',
        forceLowDetail: false
      }
    );
  }

  return backgroundQualityState.get(
    map
  );
}


async function getLowDetailBackgroundURL(
  asset
) {

  if (!lowDetailBackgroundCache.has(asset)) {

    lowDetailBackgroundCache.set(
      asset,
      createLowDetailBackgroundURL(
        asset
      )
    );
  }

  return lowDetailBackgroundCache.get(
    asset
  );
}


async function createLowDetailBackgroundURL(
  asset
) {

  const url =
    await getFullDetailBackgroundURL(
      asset
    );

  const image =
    await loadImage(
      url
    );

  const scale =
    Math.min(
      1,
      LOW_DETAIL_MAX_SIZE / Math.max(
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
        1
      )
    );

  if (scale >= 1) return url;

  const canvas =
    document.createElement('canvas');

  canvas.width =
    Math.max(
      1,
      Math.round((image.naturalWidth || image.width) * scale)
    );

  canvas.height =
    Math.max(
      1,
      Math.round((image.naturalHeight || image.height) * scale)
    );

  canvas
    .getContext('2d')
    .drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

  return new Promise(resolve => {

    canvas.toBlob(
      blob => {

        resolve(
          blob
            ? URL.createObjectURL(blob)
            : url
        );
      },
      'image/jpeg',
      0.72
    );
  });
}


function loadImage(
  url
) {

  return new Promise((resolve, reject) => {

    const image =
      new Image();

    image.onload =
      () => resolve(image);

    image.onerror =
      reject;

    image.src =
      url;
  });
}
