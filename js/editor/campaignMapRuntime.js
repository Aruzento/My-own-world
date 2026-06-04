import {
  getRenderableImageURL,
  saveAssetFile
} from '../storage/assetStorage.js';

import {
  clearMapBackgroundCache,
  updateMapBackgroundQuality
} from './campaignMapBackground.js';

import {
  DEFAULT_SHAPE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  clamp,
  getStageView,
  getVisibleSpawnPoint
} from './campaignMapGeometry.js';

import {
  createMapShapeElement,
  createMapTokenElement
} from './campaignMapElementFactory.js';

import {
  getCampaignMapStore,
  refreshCampaignMapStore
} from './campaignMapStore.js';

import {
  applyCampaignMapLayers
} from './campaignMapLayers.js';

import {
  renderMapShapeElement,
  renderMapTokenElement
} from './campaignMapRenderer.js';

import {
  createPageLookup
} from './campaignMapTreeIntegration.js';

import {
  getPageById
} from '../repository/pageRepository.js';

import {
  getHealthColor,
  getPageDndHealth
} from './campaignMapHealth.js';

import {
  getPagePortraitAsset
} from './campaignMapTokens.js';

import {
  rememberMapAssetSettings,
  restoreFogCanvas,
  restoreMapAssetSettings
} from './campaignMapContract.js';


const tokenHealthCache = new WeakMap();


// Runtime-слой карты держит операции, которые создают или восстанавливают
// видимые DOM-элементы. Основной файл карты только вызывает эти сценарии.

export async function addMapToken(
  map,
  type,
  page = null,
  spawnIndex = 0,
  options = {}
) {

  const layer =
    map.querySelector('.campaign-map-object-layer');

  if (!layer) return;

  const index =
    layer.querySelectorAll(`[data-token-type="${type}"]`).length + 1;

  const store =
    getCampaignMapStore(
      map
    );

  const spawnPoint =
    options.worldPoint ||
    getVisibleSpawnPoint(
      map,
      spawnIndex
    );

  const imageAsset =
    page
      ? getPagePortraitAsset(
        page
      )
      : '';

  const isPlayerToken =
    Array.isArray(page?.tags) &&
    page.tags.includes('player');

  const tokenData =
    store.addToken({
      type,
      pageId: page?.id || '',
      imageAsset,
      x: ((spawnPoint.x / WORLD_WIDTH) * 100).toFixed(3),
      y: ((spawnPoint.y / WORLD_HEIGHT) * 100).toFixed(3),
      name: page?.title ||
        (
          type === 'creature'
            ? `Существо ${index}`
            : `Объект ${index}`
        ),
      size: 1,
      rotation: 0,
      sourceMode: options.sourceMode === 'original'
        ? 'original'
        : 'copy',
      isPlayerToken
    });

  const token =
    createMapTokenElement(
      tokenData,
      store.getModel()
    );

  layer.appendChild(
    token
  );

  await renderMapTokenElement(
    token,
    {
      applyHealth: applyTokenHealthState
    }
  );

  refreshCampaignMapStore(
    map
  );

  applyCampaignMapLayers(
    map
  );
}


export async function restoreMapTokens(
  map
) {

  const pageLookup =
    createPageLookup();

  const tokens =
    [...map.querySelectorAll('.campaign-map-token')];

  let playerTokenStateChanged =
    false;

  for (const token of tokens) {

    const page =
      pageLookup.get(
        token.dataset.pageId
      );

    if (!token.dataset.imageAsset) {

      const imageAsset =
        page
          ? getPagePortraitAsset(page)
          : '';

      if (imageAsset) {

        token.dataset.imageAsset =
          imageAsset;
      }
    }

    const isPlayerToken =
      Array.isArray(page?.tags) &&
      page.tags.includes('player');

    if (
      isPlayerToken &&
      token.dataset.playerToken !== 'true'
    ) {

      token.dataset.playerToken =
        'true';

      playerTokenStateChanged =
        true;
    }

    await renderMapTokenElement(
      token,
      {
        applyHealth: applyTokenHealthState,
        pageLookup
      }
    );
  }

  if (playerTokenStateChanged) {

    refreshCampaignMapStore(
      map
    );
  }
}


export function applyTokenHealthState(
  token,
  pageLookup = null
) {

  if (
    token.dataset.tokenType !== 'creature'
  ) {

    clearTokenHealthState(
      token
    );

    return;
  }

  const page =
    pageLookup
      ? pageLookup.get(token.dataset.pageId)
      : getPageById(
        token.dataset.pageId
      );

  const health =
    getPageDndHealth(
      page
    );

  const cacheKey =
    health
      ? `${health.current}/${health.max}/${health.temp || 0}`
      : 'none';

  if (
    tokenHealthCache.get(token) === cacheKey
  ) return;

  tokenHealthCache.set(
    token,
    cacheKey
  );

  if (!health) {

    clearTokenHealthState(
      token
    );

    return;
  }

  const percent =
    clamp(
      health.current / health.max,
      0,
      1
    );

  token.dataset.hpPercent =
    String(
      Math.round(percent * 100)
    );

  token.dataset.hpState =
    health.current <= 0
      ? 'dead'
      : 'alive';

  token.style.setProperty(
    '--token-health-color',
    getHealthColor(
      percent
    )
  );
}


export function selectMapToken(
  token,
  options = {}
) {

  const map =
    token.closest('.campaign-map-document');

  if (!options.additive) {

    clearSelectedMapTokens(
      map
    );

    clearSelectedMapShapes(
      map
    );
  }

  token.classList.toggle(
    'is-selected',
    options.additive
      ? !token.classList.contains('is-selected')
      : true
  );
}


export function clearSelectedMapTokens(
  map
) {

  map
    ?.querySelectorAll('.campaign-map-token.is-selected')
    .forEach(token => {

      token.classList.remove(
        'is-selected'
      );
    });
}


export function clearSelectedMapShapes(
  map
) {

  map
    ?.querySelectorAll('.campaign-map-shape.is-selected')
    .forEach(shape => {

      shape.classList.remove(
        'is-selected'
      );
    });
}


export function restoreMapShapes(
  map
) {

  map
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      renderMapShapeElement(
        shape
      );
    });
}


export function addMapShape(
  map,
  type
) {

  const layer =
    map.querySelector('.campaign-map-object-layer');

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!layer || !stage) return;

  const view =
    getStageView(
      stage
    );

  const x =
    clamp(
      (stage.clientWidth / 2 - view.x) / view.zoom - DEFAULT_SHAPE_SIZE / 2,
      0,
      WORLD_WIDTH - DEFAULT_SHAPE_SIZE
    );

  const y =
    clamp(
      (stage.clientHeight / 2 - view.y) / view.zoom - DEFAULT_SHAPE_SIZE / 2,
      0,
      WORLD_HEIGHT - DEFAULT_SHAPE_SIZE
    );

  const store =
    getCampaignMapStore(
      map
    );

  const shapeData =
    store.addShape({
      type,
      x: Math.round(x),
      y: Math.round(y),
      width: DEFAULT_SHAPE_SIZE,
      height: DEFAULT_SHAPE_SIZE,
      points: type === 'triangle'
        ? '50,6 94,94 6,94'
        : ''
    });

  const shape =
    createMapShapeElement(
      shapeData,
      store.getModel()
    );

  layer.appendChild(
    shape
  );

  renderMapShapeElement(
    shape
  );

  selectMapShape(
    shape
  );

  refreshCampaignMapStore(
    map
  );

  applyCampaignMapLayers(
    map
  );
}


export function selectMapShape(
  shape,
  options = {}
) {

  const map =
    shape.closest('.campaign-map-document');

  if (!options.additive) {

    clearSelectedMapTokens(
      map
    );

    clearSelectedMapShapes(
      map
    );
  }

  shape.classList.toggle(
    'is-selected',
    options.additive
      ? !shape.classList.contains('is-selected')
      : true
  );
}


export async function changeMapImage(
  map
) {

  const [fileHandle] =
    await window.showOpenFilePicker({
      types: [{
        description: 'Images',
        accept: {
          'image/*': [
            '.png',
            '.jpg',
            '.jpeg',
            '.webp'
          ]
        }
      }]
    });

  const imageFile =
    await fileHandle.getFile();

  const asset =
    await saveAssetFile(
      imageFile
    );

  clearMapBackgroundCache(
    asset.path
  );


  const stage =
    map.querySelector('.campaign-map-stage');

  rememberMapAssetSettings(
    stage
  );

  stage.dataset.mapAsset =
    asset.path;

  restoreMapAssetSettings(
    stage
  );

  await restoreMapBackground(
    map
  );

  await restoreFogCanvas(
    map
  );
}


export async function restoreMapBackground(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const background =
    map.querySelector('.campaign-map-background');

  const asset =
    stage?.dataset.mapAsset;

  if (!stage || !background || !asset) return;

  try {

    const url =
      await getRenderableImageURL(
        asset
      );

    background.style.backgroundImage =
      `url("${url}")`;

    await updateMapBackgroundQuality(
      map
    );

  } catch (error) {

    background.style.backgroundImage =
      '';
  }
}


function clearTokenHealthState(
  token
) {

  delete token.dataset.hpPercent;
  delete token.dataset.hpState;

  token.style.removeProperty(
    '--token-health-color'
  );
}
