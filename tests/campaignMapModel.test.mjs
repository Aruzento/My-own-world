import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CampaignMapModel
} from '../js/editor/campaignMapModel.js';


test(
  'CampaignMapModel нормализует сетку, туман и масштаб карты',
  () => {

    const model =
      new CampaignMapModel({
        grid: {
          enabled: true,
          size: 999,
          color: 'white'
        },
        fog: {
          mode: 'erase',
          brushSize: -10
        },
        view: {
          x: '12',
          y: '24',
          zoom: 99
        }
      });

    assert.equal(
      model.grid.enabled,
      true
    );

    assert.equal(
      model.grid.size,
      400
    );

    assert.equal(
      model.grid.color,
      '#ffffff'
    );

    assert.equal(
      model.fog.mode,
      'erase'
    );

    assert.equal(
      model.fog.brushSize,
      4
    );

    assert.equal(
      model.fog.brushShape,
      'circle'
    );

    assert.equal(
      model.view.zoom,
      8
    );
  }
);


test(
  'CampaignMapModel stores fog dirty-region metadata',
  () => {

    const model =
      new CampaignMapModel({
        fog: {
          dirtyRegionCount: 3,
          lastDirtyRegion: {
            x: 10.4,
            y: 20.6,
            width: 30,
            height: 40
          }
        }
      });

    assert.equal(
      model.fog.dirtyRegionCount,
      3
    );

    assert.deepEqual(
      model.fog.lastDirtyRegion,
      {
        x: 10.4,
        y: 20.6,
        width: 30,
        height: 40
      }
    );

    const stage = {
      dataset: {},
      querySelectorAll() {
        return [];
      }
    };

    const map = {
      querySelector(selector) {
        return selector === '.campaign-map-stage'
          ? stage
          : null;
      },
      querySelectorAll() {
        return [];
      }
    };

    model.commitToElement(
      map
    );

    const reloaded =
      CampaignMapModel.fromElement(
        map
      );

    assert.equal(
      reloaded.fog.dirtyRegionCount,
      3
    );

    assert.deepEqual(
      reloaded.fog.lastDirtyRegion,
      {
        x: 10.4,
        y: 20.6,
        width: 30,
        height: 40
      }
    );
  }
);


test(
  'CampaignMapModel сохраняет квадратную кисть и locked fog zones',
  () => {

    const model =
      new CampaignMapModel({
        fog: {
          brushShape: 'square',
          lockedZones: [
            {
              id: 'lock-1',
              x: 20,
              y: 30,
              width: 40,
              height: 50
            }
          ]
        }
      });

    assert.equal(
      model.fog.brushShape,
      'square'
    );

    assert.deepEqual(
      model.fog.lockedZones[0],
      {
        id: 'lock-1',
        x: 20,
        y: 30,
        width: 40,
        height: 50
      }
    );
  }
);


test(
  'CampaignMapModel добавляет, двигает и удаляет токен',
  () => {

    const model =
      new CampaignMapModel();

    const token =
      model.addToken({
        pageId: 'page-1',
        type: 'object',
        name: 'Ключ',
        x: 120,
        y: -20,
        size: 2
      });

    assert.equal(
      token.type,
      'object'
    );

    assert.equal(
      token.x,
      100
    );

    assert.equal(
      token.y,
      0
    );

    model.moveToken(
      token.tokenId,
      {
        x: 45,
        y: 55
      }
    );

    assert.equal(
      model.getToken(token.tokenId).x,
      45
    );

    assert.equal(
      model.removeToken(token.tokenId),
      true
    );

    assert.equal(
      model.getToken(token.tokenId),
      null
    );
  }
);


test(
  'CampaignMapModel нормализует фигуры и сохраняет JSON-контракт',
  () => {

    const model =
      new CampaignMapModel();

    const shape =
      model.addShape({
        type: 'triangle',
        x: -100,
        y: 99999,
        width: 0,
        height: 99999,
        points: '50,0 100,100 0,100',
        presentationHidden: true
      });

    assert.equal(
      shape.type,
      'triangle'
    );

    assert.equal(
      shape.x,
      0
    );

    assert.equal(
      shape.y,
      1200
    );

    assert.equal(
      shape.width,
      1
    );

    assert.equal(
      shape.height,
      1200
    );

    assert.equal(
      model.toJSON().shapes[0].presentationHidden,
      true
    );
  }
);


test(
  'CampaignMapModel сохраняет и восстанавливает инициативу карты',
  () => {

    const model =
      new CampaignMapModel({
        initiative: {
          participants: [
            {
              participantId: 'token:a',
              tokenId: 'a',
              name: 'А',
              roll: 12,
              modifier: 3,
              total: 15
            }
          ],
          activeParticipantId: 'token:a'
        }
      });

    const stage =
      {
        dataset: {}
      };

    const container =
      {
        querySelector:
          selector => selector === '.campaign-map-stage'
            ? stage
            : null,
        querySelectorAll:
          () => []
      };

    model.commitToElement(
      container
    );

    const restored =
      CampaignMapModel.fromElement(
        container
      );

    assert.equal(
      restored.initiative.activeParticipantId,
      'token:a'
    );

    assert.equal(
      restored.initiative.participants[0].total,
      15
    );
  }
);


test(
  'CampaignMapModel назначает слои и z-order токенам и фигурам',
  () => {

    const model =
      new CampaignMapModel({
        layers: [
          {
            layerId: 'map-creatures',
            zIndex: 140
          },
          {
            layerId: 'map-shapes',
            zIndex: 240
          }
        ],
        tokens: [
          {
            tokenId: 'hero',
            type: 'creature'
          },
          {
            tokenId: 'chest',
            type: 'object'
          }
        ],
        shapes: [
          {
            shapeId: 'zone',
            type: 'circle'
          }
        ]
      });

    assert.equal(
      model.tokens[0].layerId,
      'map-creatures'
    );

    assert.equal(
      model.tokens[0].zIndex,
      140
    );

    assert.equal(
      model.tokens[1].layerId,
      'map-objects'
    );

    assert.equal(
      model.shapes[0].layerId,
      'map-shapes'
    );

    assert.equal(
      model.shapes[0].zIndex,
      240
    );
  }
);


test(
  'CampaignMapModel обновляет z-order сущностей при изменении слоев',
  () => {

    const model =
      new CampaignMapModel({
        tokens: [
          {
            tokenId: 'hero',
            type: 'creature'
          }
        ],
        shapes: [
          {
            shapeId: 'zone',
            type: 'square'
          }
        ]
      });

    model.setLayers([
      {
        layerId: 'map-creatures',
        zIndex: 300
      },
      {
        layerId: 'map-shapes',
        zIndex: 100
      }
    ]);

    assert.equal(
      model.getToken('hero').zIndex,
      300
    );

    assert.equal(
      model.getShape('zone').zIndex,
      100
    );
  }
);
