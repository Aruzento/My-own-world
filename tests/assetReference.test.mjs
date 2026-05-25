import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSET_TYPES,
  createAssetReference,
  isAssetReference,
  normalizeAssetPath,
  normalizeAssetReference,
  normalizeAssetType
} from '../js/storage/assetReference.js';


test(
  'AssetReference нормализует путь, тип, владельца и missing state',
  () => {

    const reference =
      normalizeAssetReference({
        id: ' asset-1 ',
        path: '\\assets\\portraits\\hero.png',
        type: ASSET_TYPES.portrait,
        owner: {
          pageId: ' page-1 ',
          entityId: ' block-1 ',
          scope: ' card '
        },
        fallback: '/assets/fallback.png',
        missing: 1
      });

    assert.deepEqual(
      reference,
      {
        id: 'asset-1',
        path: 'assets/portraits/hero.png',
        type: ASSET_TYPES.portrait,
        owner: {
          pageId: 'page-1',
          entityId: 'block-1',
          scope: 'card'
        },
        fallback: 'assets/fallback.png',
        missing: true
      }
    );

    assert.equal(
      isAssetReference(
        reference
      ),
      true
    );
  }
);


test(
  'AssetReference создает id и переводит неизвестные типы в futureMedia',
  () => {

    const reference =
      createAssetReference({
        path: 'assets/map.png',
        type: 'unknown',
        owner: {
          pageId: 'map-1',
          scope: 'campaignMap'
        }
      });

    assert.match(
      reference.id,
      /^asset-/
    );

    assert.equal(
      reference.type,
      ASSET_TYPES.futureMedia
    );
  }
);


test(
  'AssetReference helper отдельно нормализует тип и workspace path',
  () => {

    assert.equal(
      normalizeAssetType(
        'mapObjectPng'
      ),
      ASSET_TYPES.mapObjectPng
    );

    assert.equal(
      normalizeAssetPath(
        ' /assets/maps/castle.png '
      ),
      'assets/maps/castle.png'
    );
  }
);
