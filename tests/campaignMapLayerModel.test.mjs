import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CampaignMapLayerModel,
  getDefaultLayerIdForMapItem,
  normalizeCampaignMapLayers
} from '../js/editor/campaignMapLayerModel.js';


test(
  'CampaignMapLayerModel создает базовые слои карты',
  () => {

    const model =
      new CampaignMapLayerModel();

    assert.deepEqual(
      model.toJSON().map(layer => layer.layerId),
      [
        'map-objects',
        'map-creatures',
        'map-shapes',
        'map-drawing',
        'map-fog'
      ]
    );

    assert.equal(
      getDefaultLayerIdForMapItem(
        'token',
        'object'
      ),
      'map-objects'
    );

    assert.equal(
      getDefaultLayerIdForMapItem(
        'shape',
        'circle'
      ),
      'map-shapes'
    );

    assert.equal(
      getDefaultLayerIdForMapItem(
        'drawing',
        'freehand'
      ),
      'map-drawing'
    );
  }
);


test(
  'CampaignMapLayerModel нормализует пользовательский порядок слоев',
  () => {

    const layers =
      normalizeCampaignMapLayers([
        {
          layerId: 'map-creatures',
          title: 'Герои',
          kind: 'creature',
          zIndex: 120,
          visible: false
        }
      ]);

    const creatures =
      layers.find(layer =>
        layer.layerId === 'map-creatures'
      );

    assert.equal(
      creatures.title,
      'Герои'
    );

    assert.equal(
      creatures.zIndex,
      120
    );

    assert.equal(
      creatures.visible,
      false
    );
  }
);


test(
  'CampaignMapLayerModel назначает z-index сущностям карты',
  () => {

    const model =
      new CampaignMapLayerModel([
        {
          layerId: 'map-shapes',
          zIndex: 500
        }
      ]);

    const assigned =
      model.assignItem(
        'shape',
        'shape',
        {}
      );

    assert.deepEqual(
      assigned,
      {
        layerId: 'map-shapes',
        zIndex: 500
      }
    );
  }
);
