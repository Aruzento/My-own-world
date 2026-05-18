import {
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  serializePersistentEditorHTML
} from './blocks/blockContract.js';

import {
  syncPresentation
} from './campaignMapPresentation.js';

import {
  refreshCampaignMapModel
} from './campaignMapModel.js';


export function isCampaignMapPage(
  parsed
) {

  return parsed?.template === 'campaignMap' ||
    parsed?.type === 'campaignMap';
}


export function isCampaignMapRecord(
  page
) {

  return page?.template === 'campaignMap' ||
    page?.type === 'campaignMap' ||
    (page?.tags || []).includes('campaign-map');
}


export function serializeCampaignMapHTML(
  editor
) {

  const map =
    editor.querySelector('.campaign-map-document');

  if (map) {

    refreshCampaignMapModel(
      map
    );

    persistFogCanvas(
      map
    );
  }

  return serializePersistentEditorHTML(
    editor
  );
}


export function restoreFogCanvas(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const canvas =
    map.querySelector('.campaign-map-fog-canvas');

  if (!stage || !canvas) return Promise.resolve();

  ensureCanvasSize(
    canvas
  );

  const context =
    canvas.getContext('2d');

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const fogImage =
    stage.dataset.fogImage;

  if (!fogImage) {

    syncPresentation();
    return Promise.resolve();
  }

  const image =
    new Image();

  return new Promise(resolve => {

    image.onload = () => {

      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      syncPresentation();
      resolve();
    };

    image.onerror = () => {

      syncPresentation();
      resolve();
    };

    image.src =
      fogImage;
  });
}


export function persistFogCanvas(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const canvas =
    map.querySelector('.campaign-map-fog-canvas');

  if (!stage || !canvas) return;

  stage.dataset.fogImage =
    canvas.toDataURL('image/png');

  rememberMapAssetSettings(
    stage
  );
}


export function rememberMapAssetSettings(
  stage
) {

  const asset =
    stage?.dataset.mapAsset;

  if (!stage || !asset) return;

  stage.dataset[getFogKey(asset)] =
    stage.dataset.fogImage || '';

  stage.dataset[getGridKey(asset)] =
    stage.dataset.gridSize || String(DEFAULT_GRID_SIZE);

  stage.dataset[getGridColorKey(asset)] =
    stage.dataset.gridColor || DEFAULT_GRID_COLOR;
}


export function restoreMapAssetSettings(
  stage
) {

  const asset =
    stage?.dataset.mapAsset;

  if (!stage || !asset) return;

  stage.dataset.fogImage =
    stage.dataset[getFogKey(asset)] || '';

  stage.dataset.gridSize =
    stage.dataset[getGridKey(asset)] || String(DEFAULT_GRID_SIZE);

  stage.dataset.gridColor =
    stage.dataset[getGridColorKey(asset)] || DEFAULT_GRID_COLOR;
}


export function ensureCanvasSize(
  canvas
) {

  const width =
    WORLD_WIDTH;

  const height =
    WORLD_HEIGHT;

  if (
    canvas.width === width &&
    canvas.height === height
  ) return;

  const previous =
    canvas.toDataURL('image/png');

  canvas.width =
    width;

  canvas.height =
    height;

  if (!previous) return;

  const image =
    new Image();

  image.onload = () => {
    canvas
      .getContext('2d')
      .drawImage(
        image,
        0,
        0,
        width,
        height
      );
  };

  image.src =
    previous;
}


function getFogKey(
  asset
) {

  return `fog${hashString(asset)}`;
}


function getGridKey(
  asset
) {

  return `grid${hashString(asset)}`;
}


function getGridColorKey(
  asset
) {

  return `gridColor${hashString(asset)}`;
}


function hashString(
  value
) {

  let hash =
    0;

  String(value || '')
    .split('')
    .forEach(char => {

      hash =
        ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    });

  return Math.abs(hash);
}
