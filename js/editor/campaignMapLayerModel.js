// CampaignMapLayerModel описывает порядок слоев карты без привязки к DOM.
// UI управления слоями появится позже, а модель уже дает единый контракт.

export const DEFAULT_CAMPAIGN_MAP_LAYERS = [
  {
    layerId: 'map-objects',
    title: 'Объекты',
    kind: 'object',
    zIndex: 20,
    visible: true,
    locked: false
  },
  {
    layerId: 'map-creatures',
    title: 'Существа',
    kind: 'creature',
    zIndex: 40,
    visible: true,
    locked: false
  },
  {
    layerId: 'map-shapes',
    title: 'Фигуры',
    kind: 'shape',
    zIndex: 80,
    visible: true,
    locked: false
  },
  {
    layerId: 'map-fog',
    title: 'Туман',
    kind: 'fog',
    zIndex: 120,
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

  return [...normalized.values()]
    .sort((left, right) =>
      left.zIndex - right.zIndex
    );
}


export function getDefaultLayerIdForMapItem(
  itemKind,
  itemType
) {

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
    kind === 'fog' ||
    kind === 'custom'
  ) {

    return kind;
  }

  return 'custom';
}
