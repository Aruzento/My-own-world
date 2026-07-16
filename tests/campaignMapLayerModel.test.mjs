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
        'map-fog',
        'map-locked-fog'
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
  'CampaignMapLayerModel keeps fog and locked fog above custom layer order',
  () => {

    const layers =
      normalizeCampaignMapLayers([
        {
          layerId: 'map-creatures',
          zIndex: 700
        },
        {
          layerId: 'map-fog',
          zIndex: 10,
          visible: false
        },
        {
          layerId: 'map-locked-fog',
          zIndex: 11,
          visible: false
        }
      ]);

    const creatures =
      layers.find(layer =>
        layer.layerId === 'map-creatures'
      );

    const fog =
      layers.find(layer =>
        layer.layerId === 'map-fog'
      );

    const lockedFog =
      layers.find(layer =>
        layer.layerId === 'map-locked-fog'
      );

    assert.equal(
      fog.visible,
      false
    );

    assert.equal(
      lockedFog.visible,
      false
    );

    assert.equal(
      fog.locked,
      true
    );

    assert.equal(
      lockedFog.locked,
      true
    );

    assert.ok(
      fog.zIndex > creatures.zIndex
    );

    assert.ok(
      lockedFog.zIndex > fog.zIndex
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
