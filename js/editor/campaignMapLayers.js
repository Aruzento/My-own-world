import {
  getCampaignMapStore
} from './campaignMapStore.js';


// Runtime helper слоев: применяет видимость и меняет порядок через model/store.

export function applyCampaignMapLayers(
  map
) {

  const model =
    getCampaignMapStore(
      map
    )?.getModel();

  if (!model) return;

  const visibility =
    new Map(
      model.layers.map(layer => [
        layer.layerId,
        layer.visible !== false
      ])
    );

  map
    .querySelectorAll('.campaign-map-token, .campaign-map-shape')
    .forEach(element => {

      const isVisible =
        visibility.get(
          element.dataset.layerId
        ) !== false;

      element.dataset.layerHidden =
        isVisible
          ? 'false'
          : 'true';
    });

  const fogLayer =
    model.layers.find(layer =>
      layer.layerId === 'map-fog'
    );

  const fogCanvas =
    map.querySelector('.campaign-map-fog-canvas');

  if (fogCanvas && fogLayer) {

    fogCanvas.dataset.layerHidden =
      fogLayer.visible === false
        ? 'true'
        : 'false';

    fogCanvas.style.zIndex =
      String(fogLayer.zIndex);
  }
}


export function setCampaignMapLayerVisibility(
  map,
  layerId,
  visible
) {

  const store =
    getCampaignMapStore(
      map
    );

  const model =
    store?.getModel();

  if (!store || !model) return [];

  const layers =
    model.layers.map(layer =>
      layer.layerId === layerId
        ? {
          ...layer,
          visible: Boolean(visible)
        }
        : layer
    );

  return applyLayerUpdate(
    map,
    store,
    layers
  );
}


export function moveCampaignMapLayer(
  map,
  layerId,
  direction
) {

  const store =
    getCampaignMapStore(
      map
    );

  const model =
    store?.getModel();

  if (!store || !model) return [];

  const layers =
    [...model.layers].sort((left, right) =>
      left.zIndex - right.zIndex
    );

  const index =
    layers.findIndex(layer =>
      layer.layerId === layerId
    );

  const targetIndex =
    direction === 'up'
      ? index + 1
      : index - 1;

  if (
    index < 0 ||
    targetIndex < 0 ||
    targetIndex >= layers.length ||
    layers[index].locked ||
    layers[targetIndex].locked
  ) {

    return model.layers;
  }

  const currentZIndex =
    layers[index].zIndex;

  layers[index] = {
    ...layers[index],
    zIndex: layers[targetIndex].zIndex
  };

  layers[targetIndex] = {
    ...layers[targetIndex],
    zIndex: currentZIndex
  };

  return applyLayerUpdate(
    map,
    store,
    layers
  );
}


function applyLayerUpdate(
  map,
  store,
  layers
) {

  const nextLayers =
    store.setLayers(
      layers
    );

  syncElementZIndexes(
    map,
    store.getModel()
  );

  applyCampaignMapLayers(
    map
  );

  return nextLayers;
}


function syncElementZIndexes(
  map,
  model
) {

  model.tokens.forEach(token => {

    const element =
      map.querySelector(
        `.campaign-map-token[data-token-id="${CSS.escape(token.tokenId)}"]`
      );

    if (!element) return;

    element.dataset.layerId =
      token.layerId;

    element.dataset.zIndex =
      String(token.zIndex);

    element.style.zIndex =
      String(token.zIndex);
  });

  model.shapes.forEach(shape => {

    const element =
      map.querySelector(
        `.campaign-map-shape[data-shape-id="${CSS.escape(shape.shapeId)}"]`
      );

    if (!element) return;

    element.dataset.layerId =
      shape.layerId;

    element.dataset.zIndex =
      String(shape.zIndex);

    element.style.zIndex =
      String(shape.zIndex);
  });
}
