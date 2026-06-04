import {
  getRenderableImageURL
} from '../storage/assetStorage.js';

import {
  getPresentationCSS
} from './campaignMapPresentationStyle.js';


const fogImageCache =
  new WeakMap();


// Payload для desktop-презентации строится из CampaignMapModel, а не из HTML-клона.
// DOM мастера используется только как источник runtime-деталей: текущая картинка тумана и здоровье токенов.
export async function createCampaignMapPresentationPayload(
  stage,
  model
) {

  if (!stage || !model) return null;

  const data =
    model.toJSON();

  return {
    type: 'render-model',
    css: getPresentationCSS(),
    model: data,
    assets:
      await resolvePresentationAssets(
        data
      ),
    fogImage:
      getPresentationFogImage(
        stage,
        stage.querySelector('.campaign-map-fog-canvas')
      ),
    tokenView:
      readTokenViewState(
        stage
      )
  };
}


export async function createCampaignMapPresentationItemsPayload(
  stage,
  model,
  items
) {

  if (!stage || !model || !items?.length) return null;

  const itemRecords =
    [];

  const tokenAssets =
    {};

  const tokenView =
    readTokenViewState(
      stage
    );

  for (const item of items) {

    const record =
      item.itemType === 'shape'
        ? model.getShape?.(item.itemId)
        : model.getToken?.(item.itemId);

    itemRecords.push({
      kind: item.itemType,
      itemId: item.itemId,
      record: record || null
    });

    if (
      item.itemType === 'token' &&
      record?.imageAsset
    ) {

      tokenAssets[record.tokenId] =
        await resolvePresentationImage(
          record.imageAsset
        );
    }
  }

  return {
    type: 'update-items',
    model: {
      grid: model.grid,
      layers: model.layers || []
    },
    assets: {
      tokens: tokenAssets
    },
    tokenView,
    items: itemRecords
  };
}


export function createCampaignMapPresentationFogPayload(
  stage,
  model
) {

  if (!stage || !model) return null;

  const fogPatch =
    createPresentationFogPatch(
      stage,
      stage.querySelector('.campaign-map-fog-canvas')
    );

  return {
    type: 'update-fog',
    fogImage:
      fogPatch
        ? ''
        : getPresentationFogImage(
          stage,
          stage.querySelector('.campaign-map-fog-canvas')
        ),
    fogPatch,
    model: {
      fog: model.fog
    }
  };
}


async function resolvePresentationAssets(
  data
) {

  const assets = {
    background: '',
    tokens: {}
  };

  if (data.asset) {

    assets.background =
      await resolvePresentationImage(
        data.asset
      );
  }

  for (const token of data.tokens || []) {

    if (!token.imageAsset) continue;

    assets.tokens[token.tokenId] =
      await resolvePresentationImage(
        token.imageAsset
      );
  }

  return assets;
}


async function resolvePresentationImage(
  asset
) {

  try {

    return await getRenderableImageURL(
      asset
    );

  } catch {

    return '';
  }
}


function readTokenViewState(
  stage
) {

  const state =
    {};

  stage
    .querySelectorAll('.campaign-map-token')
    .forEach(token => {

      const tokenId =
        token.dataset.tokenId;

      if (!tokenId) return;

      state[tokenId] = {
        hpPercent: token.dataset.hpPercent || '',
        hpState: token.dataset.hpState || '',
        healthColor:
          token.style.getPropertyValue(
            '--token-health-color'
          ) || ''
      };
    });

  return state;
}


function getPresentationFogImage(
  source,
  canvas
) {

  if (!canvas) return source.dataset.fogImage || '';

  const version =
    source.dataset.fogVersion || '0';

  const cached =
    fogImageCache.get(
      canvas
    );

  if (
    cached &&
    cached.version === version
  ) {

    return cached.url;
  }

  const url =
    canvas.toDataURL(
      'image/png'
    );

  fogImageCache.set(
    canvas,
    {
      version,
      url
    }
  );

  return url;
}


function createPresentationFogPatch(
  source,
  canvas
) {

  // Patch отправляется только для кисти. Fog all / clear fog остаются полным
  // изображением, потому что там меняется весь canvas и dirty-region не выгоден.
  if (!source || !canvas) return null;

  const region =
    readFogDirtyRegion(
      source
    );

  if (!region) return null;

  const x =
    Math.max(
      0,
      Math.min(
        canvas.width - 1,
        region.x
      )
    );

  const y =
    Math.max(
      0,
      Math.min(
        canvas.height - 1,
        region.y
      )
    );

  const width =
    Math.max(
      1,
      Math.min(
        canvas.width - x,
        region.width
      )
    );

  const height =
    Math.max(
      1,
      Math.min(
        canvas.height - y,
        region.height
      )
    );

  const patch =
    document.createElement(
      'canvas'
    );

  patch.width =
    width;

  patch.height =
    height;

  patch
    .getContext('2d')
    .drawImage(
      canvas,
      x,
      y,
      width,
      height,
      0,
      0,
      width,
      height
    );

  return {
    x,
    y,
    width,
    height,
    image:
      patch.toDataURL(
        'image/png'
      )
  };
}


function readFogDirtyRegion(
  source
) {

  const raw =
    source.dataset.fogDirtyRegion;

  if (!raw) return null;

  try {

    const region =
      JSON.parse(
        decodeURIComponent(
          raw
        )
      );

    return {
      x:
        Math.max(
          0,
          Number(region.x || 0)
        ),
      y:
        Math.max(
          0,
          Number(region.y || 0)
        ),
      width:
        Math.max(
          1,
          Number(region.width || 1)
        ),
      height:
        Math.max(
          1,
          Number(region.height || 1)
        )
    };

  } catch {

    return null;
  }
}
