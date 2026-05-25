import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSET_TYPES
} from '../js/storage/assetReference.js';

import {
  collectAssetReferencesFromHTML,
  collectAssetReferencesFromPages
} from '../js/storage/assetReferenceScanner.js';


test(
  'asset scanner собирает persistent-ссылки из карточки и карты',
  () => {

    const references =
      collectAssetReferencesFromPages([
        {
          id: 'card-1',
          type: 'card',
          body: `
            <img data-asset="portraits/hero.png">
            <section data-asset-path="images/scene.png"></section>
          `
        },
        {
          id: 'map-1',
          type: 'campaignMap',
          body: `
            <div data-map-asset="maps/castle.png">
              <button data-image-asset="objects/barrel.png"></button>
            </div>
          `
        }
      ]);

    assert.deepEqual(
      references.map(reference => [
        reference.path,
        reference.type,
        reference.owner.pageId
      ]),
      [
        ['portraits/hero.png', ASSET_TYPES.image, 'card-1'],
        ['images/scene.png', ASSET_TYPES.image, 'card-1'],
        ['maps/castle.png', ASSET_TYPES.mapBackground, 'map-1'],
        ['objects/barrel.png', ASSET_TYPES.mapObjectPng, 'map-1']
      ]
    );
  }
);


test(
  'asset scanner понимает будущие audio и playlist ссылки',
  () => {

    const references =
      collectAssetReferencesFromHTML(
        `
          <div data-audio-asset="audio/tavern.mp3"></div>
          <div data-playlist-asset="playlists/tavern.json"></div>
        `,
        {
          pageId: 'location-1',
          scope: 'location'
        }
      );

    assert.deepEqual(
      references.map(reference => [
        reference.path,
        reference.type
      ]),
      [
        ['audio/tavern.mp3', ASSET_TYPES.audio],
        ['playlists/tavern.json', ASSET_TYPES.playlist]
      ]
    );
  }
);
