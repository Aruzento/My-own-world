import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CampaignMapModel
} from '../js/editor/campaignMapModel.js';

import {
  serializeCampaignMapModelHTML
} from '../js/editor/campaignMapDataSerializer.js';


test(
  'сериализатор карты строит HTML из CampaignMapModel без runtime-элементов',
  () => {

    const model =
      new CampaignMapModel({
        asset: 'castle.png',
        assetSettings: {
          fog123: 'data:image/png;base64,fog',
          grid123: '42',
          gridColor123: '#ffcc66',
          ignoredKey: 'no'
        },
        grid: {
          enabled: true,
          size: 42,
          color: '#ffcc66'
        },
        fog: {
          image: 'data:image/png;base64,current',
          mode: 'erase',
          brushSize: 80
        },
        view: {
          x: 10,
          y: 20,
          zoom: 2
        }
      });

    model.addToken({
      tokenId: 'token-1',
      pageId: 'page-1',
      type: 'creature',
      name: 'Герой "А"',
      x: 25.12345,
      y: 75.98765,
      size: 1.5,
      rotation: 15,
      imageAsset: 'hero.png',
      presentationHidden: true
    });

    model.addShape({
      shapeId: 'shape-1',
      type: 'triangle',
      x: 12,
      y: 34,
      width: 56,
      height: 78,
      points: '50,6 94,94 6,94'
    });

    const html =
      serializeCampaignMapModelHTML({
        title: 'Карта <Острова>',
        model
      });

    assert.match(
      html,
      /data-map-asset="castle\.png"/
    );

    assert.match(
      html,
      /data-grid="true"/
    );

    assert.match(
      html,
      /data-fog-image="data:image\/png;base64,current"/
    );

    assert.match(
      html,
      /data-fog123="data:image\/png;base64,fog"/
    );

    assert.match(
      html,
      /data-grid-color123="#ffcc66"/
    );

    assert.match(
      html,
      /data-token-id="token-1"/
    );

    assert.match(
      html,
      /data-layer-state=/
    );

    assert.match(
      html,
      /data-layer-id="map-creatures"/
    );

    assert.match(
      html,
      /data-z-index="40"/
    );

    assert.match(
      html,
      /data-name="Герой &quot;А&quot;"/
    );

    assert.match(
      html,
      /data-shape-id="shape-1"/
    );

    assert.doesNotMatch(
      html,
      /campaign-map-token-resize|campaign-map-token-rotate|campaign-map-controls/
    );

    assert.match(
      html,
      /Карта &lt;Острова&gt;/
    );
  }
);
