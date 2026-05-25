import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  clamp,
  getStageView
} from './campaignMapGeometry.js';

import {
  CampaignMapInitiativeModel
} from './campaignMapInitiativeModel.js';


// CampaignMapModel — единый слой данных карты.
// DOM может быть источником входного снимка, но сохранение и синхронизация
// должны опираться на нормализованные поля модели.

export class CampaignMapModel {

  constructor(
    data = {}
  ) {

    this.version =
      1;

    this.asset =
      data.asset || '';

    this.assetSettings =
      normalizeAssetSettings(
        data.assetSettings
      );

    this.grid =
      normalizeGrid(
        data.grid
      );

    this.fog =
      normalizeFog(
        data.fog
      );

    this.view =
      normalizeView(
        data.view
      );

    this.tokens =
      (data.tokens || []).map(
        normalizeToken
      );

    this.shapes =
      (data.shapes || []).map(
        normalizeShape
      );

    this.initiative =
      new CampaignMapInitiativeModel(
        data.initiative || {}
      ).toJSON();
  }


  static fromElement(
    map
  ) {

    const stage =
      map?.querySelector('.campaign-map-stage');

    const tokens =
      [...map?.querySelectorAll('.campaign-map-token') || []]
        .map(readTokenElement);

    const shapes =
      [...map?.querySelectorAll('.campaign-map-shape') || []]
        .map(readShapeElement);

    return new CampaignMapModel({
      asset: stage?.dataset.mapAsset || '',
      assetSettings: readAssetSettings(
        stage
      ),
      grid: {
        enabled: stage?.dataset.grid === 'true',
        size: stage?.dataset.gridSize,
        color: stage?.dataset.gridColor
      },
      fog: {
        image: stage?.dataset.fogImage || '',
        mode: stage?.dataset.fogMode || 'draw',
        brushSize: stage?.dataset.brushSize || ''
      },
      view: stage
        ? getStageView(stage)
        : null,
      tokens,
      shapes,
      initiative:
        readInitiativeState(
          stage
        )
    });
  }


  commitToElement(
    map
  ) {

    const stage =
      map?.querySelector('.campaign-map-stage');

    if (!stage) return;

    stage.dataset.mapModelVersion =
      String(this.version);

    if (this.asset) {

      stage.dataset.mapAsset =
        this.asset;
    }

    Object
      .entries(this.assetSettings)
      .forEach(([key, value]) => {

        stage.dataset[key] =
          value;
      });

    stage.dataset.viewX =
      String(this.view.x);

    stage.dataset.viewY =
      String(this.view.y);

    stage.dataset.viewZoom =
      String(this.view.zoom);

    stage.dataset.grid =
      this.grid.enabled
        ? 'true'
        : 'false';

    stage.dataset.gridSize =
      String(this.grid.size);

    stage.dataset.gridColor =
      this.grid.color;

    stage.dataset.fogMode =
      this.fog.mode;

    stage.dataset.fogImage =
      this.fog.image;

    if (this.fog.brushSize) {

      stage.dataset.brushSize =
        String(this.fog.brushSize);
    }

    stage.dataset.initiativeState =
      encodeURIComponent(
        JSON.stringify(
          this.initiative
        )
      );
  }


  getToken(
    tokenId
  ) {

    return this.tokens.find(token =>
      token.tokenId === tokenId
    ) || null;
  }


  addToken(
    data = {}
  ) {

    const token =
      normalizeToken({
        ...data,
        tokenId: data.tokenId || crypto.randomUUID()
      });

    this.tokens.push(
      token
    );

    return token;
  }


  moveToken(
    tokenId,
    position
  ) {

    return this.updateToken(
      tokenId,
      {
        x: position.x,
        y: position.y
      }
    );
  }


  resizeToken(
    tokenId,
    size
  ) {

    return this.updateToken(
      tokenId,
      {
        size
      }
    );
  }


  rotateToken(
    tokenId,
    rotation
  ) {

    return this.updateToken(
      tokenId,
      {
        rotation
      }
    );
  }


  updateToken(
    tokenId,
    patch
  ) {

    const current =
      this.getToken(
        tokenId
      );

    if (!current) return null;

    Object.assign(
      current,
      normalizeToken({
        ...current,
        ...patch
      })
    );

    return current;
  }


  removeToken(
    tokenId
  ) {

    const initialLength =
      this.tokens.length;

    this.tokens =
      this.tokens.filter(token =>
        token.tokenId !== tokenId
      );

    return this.tokens.length !== initialLength;
  }


  replaceTokens(
    tokens = []
  ) {

    this.tokens =
      tokens.map(
        normalizeToken
      );

    return this.tokens;
  }


  getShape(
    shapeId
  ) {

    return this.shapes.find(shape =>
      shape.shapeId === shapeId
    ) || null;
  }


  addShape(
    data = {}
  ) {

    const shape =
      normalizeShape({
        ...data,
        shapeId: data.shapeId || crypto.randomUUID()
      });

    this.shapes.push(
      shape
    );

    return shape;
  }


  moveShape(
    shapeId,
    position
  ) {

    return this.updateShape(
      shapeId,
      {
        x: position.x,
        y: position.y
      }
    );
  }


  resizeShape(
    shapeId,
    patch
  ) {

    return this.updateShape(
      shapeId,
      patch
    );
  }


  updateShape(
    shapeId,
    patch
  ) {

    const current =
      this.getShape(
        shapeId
      );

    if (!current) return null;

    Object.assign(
      current,
      normalizeShape({
        ...current,
        ...patch
      })
    );

    return current;
  }


  removeShape(
    shapeId
  ) {

    const initialLength =
      this.shapes.length;

    this.shapes =
      this.shapes.filter(shape =>
        shape.shapeId !== shapeId
      );

    return this.shapes.length !== initialLength;
  }


  replaceShapes(
    shapes = []
  ) {

    this.shapes =
      shapes.map(
        normalizeShape
      );

    return this.shapes;
  }


  setGrid(
    patch
  ) {

    this.grid =
      normalizeGrid({
        ...this.grid,
        ...patch
      });

    return this.grid;
  }


  updateFog(
    patch
  ) {

    this.fog =
      normalizeFog({
        ...this.fog,
        ...patch
      });

    return this.fog;
  }


  setView(
    view
  ) {

    this.view =
      normalizeView({
        ...this.view,
        ...view
      });

    return this.view;
  }


  setInitiative(
    initiative
  ) {

    this.initiative =
      new CampaignMapInitiativeModel(
        initiative
      ).toJSON();

    return this.initiative;
  }


  toJSON() {

    return {
      version: this.version,
      asset: this.asset,
      assetSettings: this.assetSettings,
      grid: this.grid,
      fog: this.fog,
      view: this.view,
      tokens: this.tokens,
      shapes: this.shapes,
      initiative: this.initiative
    };
  }
}


export function getCampaignMapModel(
  map
) {

  if (!map) return null;

  if (map.campaignMapModel) {

    return map.campaignMapModel;
  }

  return refreshCampaignMapModel(
    map
  );
}


export function refreshCampaignMapModel(
  map
) {

  if (!map) return null;

  const model =
    CampaignMapModel.fromElement(
      map
    );

  model.commitToElement(
    map
  );

  map.campaignMapModel =
    model;

  return model;
}


function readTokenElement(
  token
) {

  ensureDatasetId(
    token,
    'tokenId'
  );

  return {
    tokenId: token.dataset.tokenId || '',
    pageId: token.dataset.pageId || '',
    type: token.dataset.tokenType || 'creature',
    name: token.dataset.name || '',
    x: token.dataset.x,
    y: token.dataset.y,
    size: token.dataset.size,
    width: token.dataset.w,
    height: token.dataset.h,
    rotation: token.dataset.rotation,
    imageAsset: token.dataset.imageAsset || '',
    sourceMode: token.dataset.sourceMode || '',
    presentationHidden: token.dataset.presentationHidden === 'true'
  };
}


function readShapeElement(
  shape
) {

  ensureDatasetId(
    shape,
    'shapeId'
  );

  return {
    shapeId: shape.dataset.shapeId || '',
    type: shape.dataset.shapeType || 'square',
    x: shape.dataset.x,
    y: shape.dataset.y,
    width: shape.dataset.w,
    height: shape.dataset.h,
    points: shape.dataset.points || '',
    presentationHidden: shape.dataset.presentationHidden === 'true'
  };
}


function ensureDatasetId(
  element,
  key
) {

  if (!element) return '';

  if (!element.dataset[key]) {

    element.dataset[key] =
      crypto.randomUUID();
  }

  return element.dataset[key];
}


function readAssetSettings(
  stage
) {

  if (!stage) return {};

  return Object
    .entries(stage.dataset)
    .filter(([key]) =>
      /^fog\d+$/.test(key) ||
      /^grid\d+$/.test(key) ||
      /^gridColor\d+$/.test(key)
    )
    .reduce((settings, [key, value]) => {

      settings[key] =
        String(value || '');

      return settings;
    }, {});
}


function readInitiativeState(
  stage
) {

  const raw =
    stage?.dataset.initiativeState || '';

  if (!raw) return {};

  try {

    return JSON.parse(
      decodeURIComponent(
        raw
      )
    );

  } catch {

    return {};
  }
}


function normalizeGrid(
  grid = {}
) {

  return {
    enabled: Boolean(grid.enabled),
    size: clampNumber(
      grid.size,
      10,
      400,
      DEFAULT_GRID_SIZE
    ),
    color: isHexColor(grid.color)
      ? grid.color
      : DEFAULT_GRID_COLOR
  };
}


function normalizeAssetSettings(
  settings = {}
) {

  return Object
    .entries(settings || {})
    .filter(([key]) =>
      /^fog\d+$/.test(key) ||
      /^grid\d+$/.test(key) ||
      /^gridColor\d+$/.test(key)
    )
    .reduce((normalized, [key, value]) => {

      normalized[key] =
        String(value || '');

      return normalized;
    }, {});
}


function normalizeFog(
  fog = {}
) {

  return {
    image: String(fog.image || ''),
    mode: fog.mode === 'erase'
      ? 'erase'
      : 'draw',
    brushSize: clampNumber(
      fog.brushSize,
      4,
      600,
      DEFAULT_BRUSH_SIZE
    )
  };
}


function normalizeView(
  view = {}
) {

  return {
    x: Number.isFinite(Number(view?.x))
      ? Number(view.x)
      : 0,
    y: Number.isFinite(Number(view?.y))
      ? Number(view.y)
      : 0,
    zoom: clampNumber(
      view?.zoom,
      0.1,
      8,
      1
    )
  };
}


function normalizeToken(
  token = {}
) {

  return {
    tokenId: String(token.tokenId || ''),
    pageId: String(token.pageId || ''),
    type: token.type === 'object'
      ? 'object'
      : 'creature',
    name: String(token.name || ''),
    x: clampPercent(token.x, 50),
    y: clampPercent(token.y, 50),
    size: clampNumber(token.size, 0.1, 20, 1),
    width: clampNumber(token.width, 1, WORLD_WIDTH, 0),
    height: clampNumber(token.height, 1, WORLD_HEIGHT, 0),
    rotation: Number.isFinite(Number(token.rotation))
      ? Number(token.rotation)
      : 0,
    imageAsset: String(token.imageAsset || ''),
    sourceMode: token.sourceMode === 'original'
      ? 'original'
      : 'copy',
    presentationHidden: Boolean(token.presentationHidden)
  };
}


function normalizeShape(
  shape = {}
) {

  return {
    shapeId: String(shape.shapeId || ''),
    type: ['square', 'circle', 'triangle'].includes(shape.type)
      ? shape.type
      : 'square',
    x: clampNumber(shape.x, 0, WORLD_WIDTH, 0),
    y: clampNumber(shape.y, 0, WORLD_HEIGHT, 0),
    width: clampNumber(shape.width, 1, WORLD_WIDTH, DEFAULT_GRID_SIZE),
    height: clampNumber(shape.height, 1, WORLD_HEIGHT, DEFAULT_GRID_SIZE),
    points: String(shape.points || ''),
    presentationHidden: Boolean(shape.presentationHidden)
  };
}


function clampPercent(
  value,
  fallback
) {

  return clampNumber(
    value,
    0,
    100,
    fallback
  );
}


function clampNumber(
  value,
  min,
  max,
  fallback
) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) return fallback;

  return clamp(
    number,
    min,
    max
  );
}


function isHexColor(
  value
) {

  return /^#[0-9a-f]{6}$/i.test(
    String(value || '')
  );
}
