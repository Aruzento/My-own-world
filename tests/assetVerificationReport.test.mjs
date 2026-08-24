import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSET_VERIFICATION_CATEGORIES,
  buildAssetVerificationReport
} from '../js/storage/assetVerificationReport.js';


test(
  'asset verification report groups existing, missing, orphan and map music assets',
  () => {

    const music =
      encodeURIComponent(
        JSON.stringify({
          normal: {
            tracks: [
              {
                trackId: 'town-theme',
                path: 'assets/music/town.mp3'
              }
            ]
          }
        })
      );

    const report =
      buildAssetVerificationReport({
        pages: [
          {
            id: 'card-1',
            title: 'Hero',
            type: 'card',
            body: `
              <img data-asset="assets/portraits/hero.png">
              <img data-asset="assets/portraits/missing.png">
            `
          },
          {
            id: 'map-1',
            title: 'Castle Map',
            type: 'campaignMap',
            body: `
              <div class="campaign-map-stage"
                data-map-asset="assets/maps/castle.png"
                data-map-music-state="${music}">
                <button data-image-asset="assets/objects/barrel.png"></button>
              </div>
            `
          }
        ],
        assetPaths: [
          'assets/portraits/hero.png',
          'assets/maps/castle.png',
          'assets/music/town.mp3',
          'assets/free/orphan.png'
        ]
      });

    assert.equal(
      report.status,
      'needs-review'
    );

    assert.deepEqual(
      report.summary,
      {
        referencedTotal: 5,
        referencedExisting: 3,
        referencedMissing: 2,
        orphanCandidates: 1,
        checkFailures: 0,
        assetFiles: 4
      }
    );

    assert.deepEqual(
      report.referencedExisting.map(reference => reference.path).sort(),
      [
        'assets/maps/castle.png',
        'assets/music/town.mp3',
        'assets/portraits/hero.png'
      ]
    );

    assert.deepEqual(
      report.referencedMissing.map(reference => [
        reference.path,
        reference.category
      ]).sort(),
      [
        [
          'assets/objects/barrel.png',
          ASSET_VERIFICATION_CATEGORIES.referencedMissing
        ],
        [
          'assets/portraits/missing.png',
          ASSET_VERIFICATION_CATEGORIES.referencedMissing
        ]
      ]
    );

    assert.deepEqual(
      report.orphanCandidates,
      [
        {
          path: 'assets/free/orphan.png',
          category: ASSET_VERIFICATION_CATEGORIES.orphanCandidate
        }
      ]
    );

    const musicReference =
      report.referencedExisting.find(reference =>
        reference.path === 'assets/music/town.mp3'
      );

    assert.deepEqual(
      musicReference.ownerDisplay,
      {
        pageId: 'map-1',
        pageTitle: 'Castle Map',
        entityId: 'town-theme',
        scope: 'campaignMapMusic'
      }
    );
  }
);


test(
  'asset verification report treats asset scan failure as check failed, not orphan',
  () => {

    const report =
      buildAssetVerificationReport({
        pages: [
          {
            id: 'card-1',
            title: 'Hero',
            type: 'card',
            body: '<img data-asset="assets/portraits/hero.png">'
          }
        ],
        assetScanError:
          new Error('assets unavailable')
      });

    assert.equal(
      report.status,
      'check-failed'
    );

    assert.equal(
      report.summary.referencedTotal,
      1
    );

    assert.equal(
      report.summary.referencedExisting,
      0
    );

    assert.equal(
      report.summary.referencedMissing,
      0
    );

    assert.equal(
      report.summary.orphanCandidates,
      0
    );

    assert.deepEqual(
      report.checkFailures,
      [
        {
          category: ASSET_VERIFICATION_CATEGORIES.checkFailed,
          path: 'assets',
          message: 'Не удалось прочитать папку assets.',
          detail: 'assets unavailable'
        }
      ]
    );
  }
);
