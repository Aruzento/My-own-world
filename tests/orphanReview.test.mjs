import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAssetVerificationReport
} from '../js/storage/assetVerificationReport.js';

import {
  buildBrokenInternalLinkReport
} from '../js/storage/internalLinkDiagnostics.js';

import {
  ORPHAN_REVIEW_CLASSIFICATIONS,
  ORPHAN_REVIEW_TYPES,
  buildOrphanReviewReport
} from '../js/storage/orphanReview.js';

import {
  validateWorkspaceSnapshot
} from '../js/schema/workspaceSchema.js';

import {
  createDataSafetyPage
} from './fixtures/dataSafetyFixtures.mjs';


test(
  'orphan review does not flag valid root or isolated pages',
  () => {

    const pages =
      [
        createDataSafetyPage({
          id:
            'root',
          title:
            'Root',
          parent:
            null
        }),
        createDataSafetyPage({
          id:
            'isolated-note',
          title:
            'Isolated Note',
          parent:
            null
        }),
        createDataSafetyPage({
          id:
            'child',
          title:
            'Child',
          parent:
            'root'
        })
      ];

    const report =
      buildOrphanReviewReport({
        assetVerification:
          buildAssetVerificationReport({
            pages,
            assetPaths:
              []
          }),
        internalLinkDiagnostics:
          buildBrokenInternalLinkReport({
            pages
          }),
        schema:
          validateWorkspaceSnapshot({
            pages
          })
      });

    assert.equal(
      report.status,
      'ok'
    );

    assert.equal(
      report.summary.candidateCount,
      0
    );
  }
);


test(
  'orphan review composes asset, relationship and schema disconnected diagnostics',
  () => {

    const pages =
      [
        createDataSafetyPage({
          id:
            'root',
          title:
            'Root',
          parent:
            null
        }),
        createDataSafetyPage({
          id:
            'lost-child',
          title:
            'Lost Child',
          parent:
            'missing-parent'
        }),
        createDataSafetyPage({
          id:
            'hero',
          title:
            'Hero',
          relationships:
            [
              {
                type:
                  'ally',
                targetId:
                  'missing-ally',
                label:
                  'Lost ally'
              }
            ],
          body:
            '<h1>Hero</h1><img data-asset="assets/portraits/used.png">'
        })
      ];

    const report =
      buildOrphanReviewReport({
        assetVerification:
          buildAssetVerificationReport({
            pages,
            assetPaths:
              [
                'assets/portraits/used.png',
                'assets/portraits/unused.png'
              ]
          }),
        internalLinkDiagnostics:
          buildBrokenInternalLinkReport({
            pages
          }),
        schema:
          validateWorkspaceSnapshot({
            pages
          })
      });

    assert.equal(
      report.status,
      'needs-review'
    );

    assert.equal(
      report.summary.candidateCount,
      3
    );

    assert.deepEqual(
      report.summary.byType,
      {
        [ORPHAN_REVIEW_TYPES.assetUnused]: 1,
        [ORPHAN_REVIEW_TYPES.pageParentMissing]: 1,
        [ORPHAN_REVIEW_TYPES.relationshipTarget]: 1
      }
    );

    const asset =
      report.candidates.find(candidate =>
        candidate.type === ORPHAN_REVIEW_TYPES.assetUnused
      );

    assert.equal(
      asset.item,
      'assets/portraits/unused.png'
    );

    assert.equal(
      asset.sourceReferenceCount,
      0
    );

    assert.equal(
      asset.classification,
      ORPHAN_REVIEW_CLASSIFICATIONS.diagnostic
    );

    const parent =
      report.candidates.find(candidate =>
        candidate.type === ORPHAN_REVIEW_TYPES.pageParentMissing
      );

    assert.equal(
      parent.classification,
      ORPHAN_REVIEW_CLASSIFICATIONS.schemaError
    );

    assert.equal(
      parent.details.parent,
      'missing-parent'
    );

    const relation =
      report.candidates.find(candidate =>
        candidate.type === ORPHAN_REVIEW_TYPES.relationshipTarget
      );

    assert.equal(
      relation.source.pageId,
      'hero'
    );

    assert.equal(
      relation.item,
      'missing-ally'
    );
  }
);


test(
  'orphan review reports ambiguous internal references without choosing a target',
  () => {

    const pages =
      [
        createDataSafetyPage({
          id:
            'castle-a',
          title:
            'Castle'
        }),
        createDataSafetyPage({
          id:
            'castle-b',
          title:
            'Castle'
        }),
        createDataSafetyPage({
          id:
            'source',
          title:
            'Source',
          body:
            '<h1>Source</h1><p>[[Castle]]</p>'
        })
      ];

    const report =
      buildOrphanReviewReport({
        assetVerification:
          buildAssetVerificationReport({
            pages,
            assetPaths:
              []
          }),
        internalLinkDiagnostics:
          buildBrokenInternalLinkReport({
            pages
          }),
        schema:
          validateWorkspaceSnapshot({
            pages
          })
      });

    assert.equal(
      report.summary.candidateCount,
      1
    );

    assert.equal(
      report.candidates[0].type,
      ORPHAN_REVIEW_TYPES.internalReferenceTarget
    );

    assert.equal(
      report.candidates[0].item,
      'Castle'
    );

    assert.equal(
      report.candidates[0].details.candidateCount,
      2
    );

    assert.equal(
      report.candidates[0].details.targetId,
      ''
    );
  }
);
