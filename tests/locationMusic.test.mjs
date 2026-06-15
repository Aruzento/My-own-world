import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSET_TYPES
} from '../js/storage/assetReference.js';

import {
  createLocationMusicHTML,
  normalizeLocationMusic,
  readLocationMusicFromHTML
} from '../js/storage/locationMusic.js';

import {
  collectAssetReferencesFromHTML
} from '../js/storage/assetReferenceScanner.js';


test(
  'location music normalizes audio and playlist assets',
  () => {

    const music =
      normalizeLocationMusic({
        pageId: 'loc-1',
        title: 'Tavern',
        volume: 2,
        loop: true,
        audioAsset: '\\assets\\audio\\tavern.ogg',
        playlistAsset: 'assets/playlists/tavern.json'
      });

    assert.equal(
      music.volume,
      1
    );

    assert.equal(
      music.audioAsset,
      'assets/audio/tavern.ogg'
    );

    assert.equal(
      music.playlistAsset,
      'assets/playlists/tavern.json'
    );

    assert.deepEqual(
      music.references.map(reference => reference.type),
      [
        ASSET_TYPES.audio,
        ASSET_TYPES.playlist
      ]
    );
  }
);


test(
  'location music HTML participates in asset scanner and can be read back',
  () => {

    const html =
      createLocationMusicHTML({
        pageId: 'loc-2',
        audioAsset: 'assets/audio/cave.mp3',
        playlistAsset: 'assets/playlists/cave.json',
        autoplay: true
      });

    const references =
      collectAssetReferencesFromHTML(
        html,
        {
          pageId: 'loc-2',
          scope: 'location'
        }
      );

    assert.deepEqual(
      references.map(reference => reference.type),
      [
        ASSET_TYPES.audio,
        ASSET_TYPES.playlist
      ]
    );

    const restored =
      readLocationMusicFromHTML(
        html
      );

    assert.equal(
      restored.autoplay,
      true
    );

    assert.equal(
      restored.audioAsset,
      'assets/audio/cave.mp3'
    );
  }
);
