import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERNAL_LINK_REASONS,
  INTERNAL_LINK_TYPES,
  buildBrokenInternalLinkReport
} from '../js/storage/internalLinkDiagnostics.js';

import {
  createBrokenInternalWikiLinkFixture,
  createBrokenRelationshipTargetFixture,
  createDataSafetyPage
} from './fixtures/dataSafetyFixtures.mjs';


test(
  'internal link diagnostics ignores valid pages, aliases, internal rules and external URLs',
  () => {

    const pages =
      [
        createDataSafetyPage({
          id: 'castle',
          title: 'Castle',
          aliases: [
            'Keep'
          ],
          parent: null
        }),
        createDataSafetyPage({
          id: 'source',
          title: 'Source',
          relationships: [
            {
              type: 'ally',
              targetId: 'castle'
            },
            {
              type: 'lore',
              targetTitle: 'Keep'
            }
          ],
          body: `
            <h1>Source</h1>
            [[Castle]]
            [[Keep|the keep]]
            [[КЗ]]
            <a class="wiki-link internal-link" href="#" data-page-id="castle" data-page-title="Castle">Castle</a>
            <a class="internal-link" href="#" data-page-id="castle">ordinary page link</a>
            <a href="https://example.com/world">external</a>
            <p>Plain unfinished [[Not a link</p>
          `
        })
      ];

    const report =
      buildBrokenInternalLinkReport({
        pages
      });

    assert.equal(
      report.status,
      'ok'
    );

    assert.equal(
      report.summary.issueCount,
      0
    );
  }
);


test(
  'internal link diagnostics reports broken wiki, ordinary internal anchors and relationships',
  () => {

    const brokenWiki =
      createBrokenInternalWikiLinkFixture();

    const brokenRelationship =
      createBrokenRelationshipTargetFixture();

    const pages =
      [
        ...brokenWiki.pages,
        ...brokenRelationship.pages,
        createDataSafetyPage({
          id: 'internal-anchor-source',
          title: 'Internal Anchor Source',
          body: `
            <h1>Internal Anchor Source</h1>
            <a class="internal-link" href="#" data-page-id="missing-anchor-page">Missing anchor</a>
            <a class="internal-link" href="#">Malformed internal anchor</a>
          `
        }),
        createDataSafetyPage({
          id: 'raw-wiki-source',
          title: 'Raw Wiki Source',
          body: '<h1>Raw Wiki Source</h1><p>[[Unknown Page]]</p>'
        }),
        createDataSafetyPage({
          id: 'malformed-relationship',
          title: 'Malformed Relationship',
          relationships: [
            {
              type: 'ally',
              label: 'No target'
            }
          ]
        })
      ];

    const report =
      buildBrokenInternalLinkReport({
        pages
      });

    assert.equal(
      report.status,
      'needs-review'
    );

    assert.equal(
      report.summary.issueCount,
      6
    );

    assert.deepEqual(
      report.summary.byType,
      {
        [INTERNAL_LINK_TYPES.internalPage]: 2,
        [INTERNAL_LINK_TYPES.relationship]: 2,
        [INTERNAL_LINK_TYPES.wiki]: 2
      }
    );

    assert.deepEqual(
      report.summary.byReason,
      {
        [INTERNAL_LINK_REASONS.malformedInternalReference]: 1,
        [INTERNAL_LINK_REASONS.relationEndpointMissing]: 1,
        [INTERNAL_LINK_REASONS.targetIdUnknown]: 1,
        [INTERNAL_LINK_REASONS.targetPageMissing]: 3
      }
    );

    assert.deepEqual(
      report.issues.map(issue => [
        issue.linkType,
        issue.reason,
        issue.originalTarget
      ]),
      [
        [
          INTERNAL_LINK_TYPES.wiki,
          INTERNAL_LINK_REASONS.targetPageMissing,
          'Missing Page'
        ],
        [
          INTERNAL_LINK_TYPES.relationship,
          INTERNAL_LINK_REASONS.relationEndpointMissing,
          'missing-ally'
        ],
        [
          INTERNAL_LINK_TYPES.internalPage,
          INTERNAL_LINK_REASONS.targetPageMissing,
          'missing-anchor-page'
        ],
        [
          INTERNAL_LINK_TYPES.internalPage,
          INTERNAL_LINK_REASONS.malformedInternalReference,
          'Malformed internal anchor'
        ],
        [
          INTERNAL_LINK_TYPES.wiki,
          INTERNAL_LINK_REASONS.targetPageMissing,
          'Unknown Page'
        ],
        [
          INTERNAL_LINK_TYPES.relationship,
          INTERNAL_LINK_REASONS.targetIdUnknown,
          ''
        ]
      ]
    );
  }
);


test(
  'internal link diagnostics reports ambiguous title without selecting a candidate',
  () => {

    const pages =
      [
        createDataSafetyPage({
          id: 'castle-a',
          title: 'Castle'
        }),
        createDataSafetyPage({
          id: 'castle-b',
          title: 'Castle'
        }),
        createDataSafetyPage({
          id: 'source',
          title: 'Source',
          body: '<h1>Source</h1><p>[[Castle]]</p>'
        })
      ];

    const report =
      buildBrokenInternalLinkReport({
        pages
      });

    assert.equal(
      report.summary.issueCount,
      1
    );

    assert.equal(
      report.issues[0].reason,
      INTERNAL_LINK_REASONS.targetAmbiguous
    );

    assert.equal(
      report.issues[0].candidateCount,
      2
    );

    assert.equal(
      report.issues[0].targetId,
      ''
    );
  }
);
