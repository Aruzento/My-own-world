import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSET_TYPES,
  createAssetReference,
  isAudioAssetType,
  isAssetReference,
  isFirstClassAssetType,
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
  'audio and playlist are first-class asset types',
  () => {

    assert.equal(
      normalizeAssetType(
        'audio'
      ),
      ASSET_TYPES.audio
    );

    assert.equal(
      normalizeAssetType(
        'playlist'
      ),
      ASSET_TYPES.playlist
    );

    assert.equal(
      isAudioAssetType(
        ASSET_TYPES.audio
      ),
      true
    );

    assert.equal(
      isAudioAssetType(
        ASSET_TYPES.playlist
      ),
      true
    );

    assert.equal(
      isFirstClassAssetType(
        ASSET_TYPES.futureMedia
      ),
      false
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
