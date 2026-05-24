import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CampaignMapStore
} from '../js/editor/campaignMapStore.js';


test(
  'CampaignMapStore меняет токены через модель и помечает карту грязной',
  () => {

    const store =
      new CampaignMapStore();

    const token =
      store.addToken({
        tokenId: 'token-1',
        type: 'creature',
        x: 10,
        y: 20
      });

    assert.equal(
      token.tokenId,
      'token-1'
    );

    assert.equal(
      store.isDirty(),
      true
    );

    store.clearDirty();

    store.moveToken(
      'token-1',
      {
        x: 30,
        y: 40
      }
    );

    assert.deepEqual(
      {
        x: store.getModel().getToken('token-1').x,
        y: store.getModel().getToken('token-1').y
      },
      {
        x: 30,
        y: 40
      }
    );

    assert.equal(
      store.isDirty(),
      true
    );
  }
);


test(
  'CampaignMapStore управляет фигурами, сеткой, туманом и viewport',
  () => {

    const store =
      new CampaignMapStore();

    const shape =
      store.addShape({
        shapeId: 'shape-1',
        type: 'square',
        x: 5,
        y: 6
      });

    store.moveShape(
      shape.shapeId,
      {
        x: 25,
        y: 36
      }
    );

    store.setGrid({
      enabled: true,
      size: 60
    });

    store.updateFog({
      mode: 'erase',
      brushSize: 90
    });

    store.setView({
      zoom: 2,
      x: 11,
      y: 22
    });

    const data =
      store.getModel().toJSON();

    assert.equal(
      data.shapes[0].x,
      25
    );

    assert.equal(
      data.grid.size,
      60
    );

    assert.equal(
      data.fog.mode,
      'erase'
    );

    assert.equal(
      data.view.zoom,
      2
    );
  }
);
