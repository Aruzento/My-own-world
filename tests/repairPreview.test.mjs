import test from 'node:test';
import assert from 'node:assert/strict';

import {
  INTERNAL_LINK_REASONS
} from '../js/storage/internalLinkDiagnostics.js';

import {
  REPAIR_PREVIEW_CONFLICTS,
  REPAIR_PREVIEW_STATUS,
  buildRepairPreviewModel,
  createRepairPreviewPlan
} from '../js/storage/repairPreview.js';

import {
  createDataSafetyPage
} from './fixtures/dataSafetyFixtures.mjs';


test(
  'repair preview creates an explicit internal-link target plan without writes',
  () => {

    const pages =
      [
        createDataSafetyPage({
          id:
            'source',
          title:
            'Source',
          body:
            '<h1>Source</h1><p>The old path points to [[Missing Page|lost gate]].</p>'
        }),
        createDataSafetyPage({
          id:
            'target',
          title:
            'Existing Target',
          type:
            'location'
        })
      ];

    const model =
      buildRepairPreviewModel({
        pages
      });

    const plan =
      createRepairPreviewPlan({
        model,
        diagnosticId:
          model.diagnostics[0].id,
        targetPageId:
          'target'
      });

    assert.equal(
      plan.status,
      REPAIR_PREVIEW_STATUS.ready
    );

    assert.equal(
      plan.previewOnly,
      true
    );

    assert.equal(
      plan.action.kind,
      'replace-internal-link-target'
    );

    assert.equal(
      plan.action.fieldPath,
      'body.wiki[0]'
    );

    assert.equal(
      plan.before.targetTitle,
      'Missing Page'
    );

    assert.equal(
      plan.after.targetId,
      'target'
    );

    assert.equal(
      plan.after.targetTitle,
      'Existing Target'
    );

    assert.match(
      plan.before.context,
      /Missing Page/
    );

    assert.match(
      plan.after.context,
      /Existing Target/
    );

    assert.equal(
      plan.action.backupRequired,
      true
    );

    assert.deepEqual(
      plan.sideEffects,
      {
        pageWrites:
          0,
        assetWrites:
          0,
        assetDeletes:
          0,
        repositoryMutations:
          0,
        backupCreations:
          0
      }
    );

    assert.equal(
      plan.staleEvidence.sourcePageId,
      'source'
    );

    assert.match(
      plan.staleEvidence.sourceContentHash,
      /^fnv1a32:/
    );

    assert.equal(
      plan.staleEvidence.sourceUpdatedAt,
      '2026-08-24T08:00:00.000Z'
    );
  }
);


test(
  'repair preview changes the target only after explicit selection changes',
  () => {

    const pages =
      [
        createDataSafetyPage({
          id:
            'source',
          title:
            'Source',
          body:
            '<h1>Source</h1><a class="internal-link" href="#" data-page-id="missing-page">Missing anchor</a>'
        }),
        createDataSafetyPage({
          id:
            'target-a',
          title:
            'Target A'
        }),
        createDataSafetyPage({
          id:
            'target-b',
          title:
            'Target B'
        })
      ];

    const model =
      buildRepairPreviewModel({
        pages
      });

    const firstPlan =
      createRepairPreviewPlan({
        model,
        diagnosticId:
          model.diagnostics[0].id,
        targetPageId:
          'target-a'
      });

    const secondPlan =
      createRepairPreviewPlan({
        model,
        diagnosticId:
          model.diagnostics[0].id,
        targetPageId:
          'target-b'
      });

    assert.equal(
      firstPlan.after.targetId,
      'target-a'
    );

    assert.equal(
      secondPlan.after.targetId,
      'target-b'
    );

    assert.equal(
      firstPlan.staleEvidence.sourceContentHash,
      secondPlan.staleEvidence.sourceContentHash
    );
  }
);


test(
  'ambiguous target preview remains blocked until the user selects a target',
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

    const model =
      buildRepairPreviewModel({
        pages
      });

    assert.equal(
      model.diagnostics[0].diagnostic.reason,
      INTERNAL_LINK_REASONS.targetAmbiguous
    );

    const blocked =
      createRepairPreviewPlan({
        model,
        diagnosticId:
          model.diagnostics[0].id
      });

    assert.equal(
      blocked.status,
      REPAIR_PREVIEW_STATUS.blocked
    );

    assert.equal(
      blocked.conflicts[0].code,
      REPAIR_PREVIEW_CONFLICTS.targetRequired
    );

    const selected =
      createRepairPreviewPlan({
        model,
        diagnosticId:
          model.diagnostics[0].id,
        targetPageId:
          'castle-b'
      });

    assert.equal(
      selected.status,
      REPAIR_PREVIEW_STATUS.ready
    );

    assert.equal(
      selected.after.targetId,
      'castle-b'
    );
  }
);


test(
  'repair preview describes relationship endpoint replacement',
  () => {

    const pages =
      [
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
            ]
        }),
        createDataSafetyPage({
          id:
            'ally',
          title:
            'New Ally',
          type:
            'character'
        })
      ];

    const model =
      buildRepairPreviewModel({
        pages
      });

    const plan =
      createRepairPreviewPlan({
        model,
        diagnosticId:
          model.diagnostics[0].id,
        targetPageId:
          'ally'
      });

    assert.equal(
      plan.status,
      REPAIR_PREVIEW_STATUS.ready
    );

    assert.equal(
      plan.action.kind,
      'replace-relationship-target'
    );

    assert.equal(
      plan.action.fieldPath,
      'relationships[0]'
    );

    assert.equal(
      plan.before.relationshipType,
      'ally'
    );

    assert.equal(
      plan.before.targetId,
      'missing-ally'
    );

    assert.equal(
      plan.after.targetId,
      'ally'
    );

    assert.match(
      plan.after.context,
      /missing-ally -> New Ally/
    );
  }
);


test(
  'repair preview does not mutate source pages while creating, changing or cancelling plans',
  () => {

    const pages =
      [
        createDataSafetyPage({
          id:
            'source',
          title:
            'Source',
          body:
            '<h1>Source</h1><p>[[Missing Page]]</p>'
        }),
        createDataSafetyPage({
          id:
            'target',
          title:
            'Target'
        })
      ];

    const before =
      JSON.stringify(
        pages
      );

    const model =
      buildRepairPreviewModel({
        pages
      });

    createRepairPreviewPlan({
      model,
      diagnosticId:
        model.diagnostics[0].id
    });

    createRepairPreviewPlan({
      model,
      diagnosticId:
        model.diagnostics[0].id,
      targetPageId:
        'target'
    });

    createRepairPreviewPlan({
      model,
      diagnosticId:
        'cancelled-preview',
      targetPageId:
        'target'
    });

    assert.equal(
      JSON.stringify(pages),
      before
    );
  }
);
