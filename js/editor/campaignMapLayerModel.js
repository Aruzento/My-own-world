// CampaignMapLayerModel описывает порядок слоев карты без привязки к DOM.
// UI управления слоями появится позже, а модель уже дает единый контракт.

export const DEFAULT_CAMPAIGN_MAP_LAYERS = [
  {
    layerId: 'map-objects',
    title: '\u041e\u0431\u044a\u0435\u043a\u0442\u044b',
    kind: 'object',
    zIndex: 20,
    visible: true,
    locked: false
  },
  {
    layerId: 'map-creatures',
    title: '\u0421\u0443\u0449\u0435\u0441\u0442\u0432\u0430',
    kind: 'creature',
    zIndex: 40,
    visible: true,
    locked: false
  },
  {
    layerId: 'map-shapes',
    title: '\u0424\u0438\u0433\u0443\u0440\u044b',
    kind: 'shape',
    zIndex: 80,
    visible: true,
    locked: false
  },
  {
    layerId: 'map-drawing',
    title: '\u0420\u0438\u0441\u043e\u0432\u0430\u043d\u0438\u0435',
    kind: 'drawing',
    zIndex: 90,
    visible: true,
    locked: false
  },
  {
    layerId: 'map-fog',
    title: '\u0422\u0443\u043c\u0430\u043d',
    kind: 'fog',
    zIndex: 120,
    visible: true,
    locked: true
  },
  {
    layerId: 'map-locked-fog',
    title: '\u0417\u0430\u043f\u0440\u0435\u0442\u043d\u044b\u0435 \u0437\u043e\u043d\u044b \u0442\u0443\u043c\u0430\u043d\u0430',
    kind: 'lockedFog',
    zIndex: 130,
    visible: true,
    locked: true
  }
];

export class CampaignMapLayerModel {

  constructor(
    layers = []
  ) {

    this.layers =
      normalizeCampaignMapLayers(
        layers
      );
  }


  getLayer(
    layerId
  ) {

    return this.layers.find(layer =>
      layer.layerId === layerId
    ) || null;
  }


  getDefaultLayerForItem(
    itemKind,
    itemType
  ) {

    return getDefaultLayerIdForMapItem(
      itemKind,
      itemType
    );
  }


  getZIndex(
    layerId
  ) {

    return getLayerZIndex(
      this.layers,
      layerId
    );
  }


  assignItem(
    itemKind,
    itemType,
    patch = {}
  ) {

    const layerId =
      patch.layerId ||
      this.getDefaultLayerForItem(
        itemKind,
        itemType
      );

    return {
      layerId,
      zIndex: normalizeZIndex(
        patch.zIndex,
        this.getZIndex(layerId)
      )
    };
  }


  toJSON() {

    return this.layers.map(layer => ({
      ...layer
    }));
  }
}


export function normalizeCampaignMapLayers(
  layers = []
) {

  const normalized =
    new Map();

  DEFAULT_CAMPAIGN_MAP_LAYERS.forEach(layer => {

    normalized.set(
      layer.layerId,
      {
        ...layer
      }
    );
  });

  layers
    .map(normalizeLayer)
    .filter(Boolean)
    .forEach(layer => {

      normalized.set(
        layer.layerId,
        {
          ...normalized.get(layer.layerId),
          ...layer
        }
      );
    });

  return normalizeSystemLayerOrder(
    [...normalized.values()]
  )
    .sort((left, right) =>
      left.zIndex - right.zIndex
    );
}


export function getDefaultLayerIdForMapItem(
  itemKind,
  itemType
) {

  if (itemKind === 'drawing') return 'map-drawing';

  if (itemKind === 'shape') return 'map-shapes';

  if (itemType === 'object') return 'map-objects';

  return 'map-creatures';
}


export function getLayerZIndex(
  layers,
  layerId
) {

  const layer =
    (layers || []).find(item =>
      item.layerId === layerId
    );

  return normalizeZIndex(
    layer?.zIndex,
    0
  );
}


export function normalizeLayer(
  layer = {}
) {

  const layerId =
    String(layer.layerId || '')
      .trim();

  if (!layerId) return null;

  return {
    layerId,
    title: String(layer.title || layerId),
    kind: normalizeLayerKind(
      layer.kind
    ),
    zIndex: normalizeZIndex(
      layer.zIndex,
      0
    ),
    visible: layer.visible !== false,
    locked: Boolean(layer.locked)
  };
}


export function normalizeZIndex(
  value,
  fallback
) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.round(
    number
  );
}


function normalizeLayerKind(
  kind
) {

  if (
    kind === 'object' ||
    kind === 'creature' ||
    kind === 'shape' ||
    kind === 'drawing' ||
    kind === 'fog' ||
    kind === 'lockedFog' ||
    kind === 'custom'
  ) {

    return kind;
  }

  return 'custom';
}


function normalizeSystemLayerOrder(
  layers
) {

  const maxRegularZIndex =
    layers
      .filter(layer =>
        layer.layerId !== 'map-fog' &&
        layer.layerId !== 'map-locked-fog'
      )
      .reduce(
        (max, layer) =>
          Math.max(
            max,
            Number(layer.zIndex || 0)
          ),
        0
      );

  const fogLayer =
    layers.find(layer =>
      layer.layerId === 'map-fog'
    );

  const lockedFogLayer =
    layers.find(layer =>
      layer.layerId === 'map-locked-fog'
    );

  if (fogLayer) {

    fogLayer.zIndex =
      Math.max(
        Number(fogLayer.zIndex || 0),
        maxRegularZIndex + 20,
        120
      );

    fogLayer.locked =
      true;
  }

  if (lockedFogLayer) {

    lockedFogLayer.zIndex =
      Math.max(
        Number(lockedFogLayer.zIndex || 0),
        Number(fogLayer?.zIndex || 120) + 10,
        130
      );

    lockedFogLayer.locked =
      true;
  }

  return layers;
}
