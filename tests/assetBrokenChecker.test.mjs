import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findBrokenAssetReferences,
  findBrokenReferences
} from '../js/storage/assetBrokenChecker.js';


test(
  'broken asset checker находит отсутствующие файлы с владельцем',
  () => {

    const broken =
      findBrokenAssetReferences(
        [
          {
            id: 'page-1',
            type: 'card',
            body: '<img data-asset="portraits/hero.png"><img data-asset="missing.png">'
          }
        ],
        [
          'portraits/hero.png'
        ]
      );

    assert.deepEqual(
      broken.map(reference => ({
        path:
          reference.path,
        pageId:
          reference.owner.pageId,
        missing:
          reference.missing
      })),
      [
        {
          path: 'missing.png',
          pageId: 'page-1',
          missing: true
        }
      ]
    );
  }
);


test(
  'broken asset checker нормализует пути перед сравнением',
  () => {

    const broken =
      findBrokenReferences(
        [
          {
            id: 'asset-1',
            path: '\\assets\\portraits\\hero.png',
            type: 'portrait',
            owner: {
              pageId: 'page-1',
              scope: 'card'
            }
          }
        ],
        [
          'assets/portraits/hero.png'
        ]
      );

    assert.deepEqual(
      broken,
      []
    );
  }
);
