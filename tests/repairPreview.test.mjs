import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRuntimePageFromContent,
  updatePageRecordContent
} from '../js/core/pageRecord.js';

import {
  getPageById
} from '../js/repository/pageRepository.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  INTERNAL_LINK_REASONS
} from '../js/storage/internalLinkDiagnostics.js';

import {
  applyRepairPreviewPlan,
  REPAIR_PREVIEW_CONFLICTS,
  REPAIR_PREVIEW_STATUS,
  buildRepairPreviewModel,
  createRepairPreviewPlan
} from '../js/storage/repairPreview.js';

import {
  createDataSafetyPage,
  createMemoryWorkspaceAdapter,
  seedWorkspace
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


test(
  'persistent repair applies a previewed wiki link after the safety backup and reload resolves it',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const source =
      createDataSafetyPage({
        id:
          'source',
        title:
          'Source',
        body:
          '<h1>Source</h1><p>Keep this paragraph.</p><p>[[Missing Page|lost gate]]</p>'
      });

    const target =
      createDataSafetyPage({
        id:
          'target',
        title:
          'Existing Target'
      });

    const pages =
      [
        source,
        target
      ];

    await seedWorkspace(
      adapter,
      {
        pages
      }
    );

    setPages(
      pages
    );

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

    const result =
      await applyRepairPreviewPlan({
        plan,
        pages
      });

    const durableContent =
      await adapter.readText(
        source.path
      );

    assert.equal(
      result.status,
      'applied'
    );

    assert.equal(
      result.backupManifest.reason,
      'repair-preview-apply'
    );

    assert.match(
      durableContent,
      /\[\[Existing Target\|lost gate\]\]/
    );

    assert.match(
      durableContent,
      /Keep this paragraph/
    );

    const reloadedPages =
      [
        createRuntimePageFromContent({
          content:
            durableContent,
          name:
            source.name,
          path:
            source.path
        }),
        target
      ];

    assert.equal(
      buildRepairPreviewModel({
        pages:
          reloadedPages
      }).summary.supportedDiagnosticCount,
      0
    );
  }
);


test(
  'persistent repair applies a previewed converted anchor link without losing visible label',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const source =
      createDataSafetyPage({
        id:
          'source',
        title:
          'Source',
        body:
          '<h1>Source</h1><a class="wiki-link internal-link is-missing" href="#" data-page-id="missing-page" data-page-title="Missing Page">Lost gate</a>'
      });

    const target =
      createDataSafetyPage({
        id:
          'target',
        title:
          'Existing Target'
      });

    const pages =
      [
        source,
        target
      ];

    await seedWorkspace(
      adapter,
      {
        pages
      }
    );

    setPages(
      pages
    );

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

    await applyRepairPreviewPlan({
      plan,
      pages
    });

    const durableContent =
      await adapter.readText(
        source.path
      );

    assert.match(
      durableContent,
      /data-page-id="target"/
    );

    assert.match(
      durableContent,
      /data-page-title="Existing Target"/
    );

    assert.match(
      durableContent,
      />Lost gate<\/a>/
    );

    assert.doesNotMatch(
      durableContent,
      /is-missing/
    );

    assert.equal(
      buildRepairPreviewModel({
        pages:
          [
            createRuntimePageFromContent({
              content:
                durableContent,
              name:
                source.name,
              path:
                source.path
            }),
            target
          ]
      }).summary.supportedDiagnosticCount,
      0
    );
  }
);


test(
  'persistent repair applies a previewed relationship endpoint through relationship command ownership',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const source =
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
      });

    const target =
      createDataSafetyPage({
        id:
          'ally',
        title:
          'New Ally'
      });

    const pages =
      [
        source,
        target
      ];

    await seedWorkspace(
      adapter,
      {
        pages
      }
    );

    setPages(
      pages
    );

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

    await applyRepairPreviewPlan({
      plan,
      pages
    });

    const durableContent =
      await adapter.readText(
        source.path
      );

    const reloadedSource =
      createRuntimePageFromContent({
        content:
          durableContent,
        name:
          source.name,
        path:
          source.path
      });

    assert.deepEqual(
      reloadedSource.relationships,
      [
        {
          type:
            'ally',
          targetId:
            'ally',
          targetTitle:
            'New Ally',
          label:
            'Lost ally'
        }
      ]
    );

    assert.equal(
      buildRepairPreviewModel({
        pages:
          [
            reloadedSource,
            target
          ]
      }).summary.supportedDiagnosticCount,
      0
    );
  }
);


test(
  'persistent repair blocks before writes when safety backup fails',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const source =
      createDataSafetyPage({
        id:
          'source',
        title:
          'Source',
        body:
          '<h1>Source</h1><p>[[Missing Page]]</p>'
      });

    const target =
      createDataSafetyPage({
        id:
          'target',
        title:
          'Target'
      });

    const pages =
      [
        source,
        target
      ];

    await seedWorkspace(
      adapter,
      {
        pages
      }
    );

    const originalContent =
      await adapter.readText(
        source.path
      );

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

    let writeCalls =
      0;

    await assert.rejects(
      () => applyRepairPreviewPlan({
        plan,
        pages,
        createSafetyBackup: async () => {

          throw new Error(
            'backup denied'
          );
        },
        persistContentCommand: async () => {

          writeCalls +=
            1;
        }
      }),
      error =>
        error.code === 'BACKUP_FAILED' &&
        /backup denied/.test(error.message)
    );

    assert.equal(
      writeCalls,
      0
    );

    assert.equal(
      await adapter.readText(
        source.path
      ),
      originalContent
    );
  }
);


test(
  'persistent repair blocks stale preview before backup creation',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const source =
      createDataSafetyPage({
        id:
          'source',
        title:
          'Source',
        body:
          '<h1>Source</h1><p>[[Missing Page]]</p>'
      });

    const target =
      createDataSafetyPage({
        id:
          'target',
        title:
          'Target'
      });

    const pages =
      [
        source,
        target
      ];

    await seedWorkspace(
      adapter,
      {
        pages
      }
    );

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

    source.content =
      updatePageRecordContent(
        source.content,
        {
          body:
            '<h1>Source</h1><p>Changed before apply. [[Missing Page]]</p>'
        }
      );

    let backupCalls =
      0;

    await assert.rejects(
      () => applyRepairPreviewPlan({
        plan,
        pages,
        createSafetyBackup: async () => {

          backupCalls +=
            1;

          return {
            id:
              'unexpected'
          };
        }
      }),
      error =>
        error.code === REPAIR_PREVIEW_CONFLICTS.staleSource &&
        /устарел/.test(error.message)
    );

    assert.equal(
      backupCalls,
      0
    );
  }
);


test(
  'persistent repair write failure keeps runtime repository and durable content coherent',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const source =
      createDataSafetyPage({
        id:
          'source',
        title:
          'Source',
        body:
          '<h1>Source</h1><p>[[Missing Page]]</p>'
      });

    const target =
      createDataSafetyPage({
        id:
          'target',
        title:
          'Target'
      });

    const pages =
      [
        source,
        target
      ];

    await seedWorkspace(
      adapter,
      {
        pages
      }
    );

    setPages(
      pages
    );

    const originalContent =
      source.content;

    const originalWriteText =
      adapter.writeText.bind(
        adapter
      );

    adapter.writeText =
      async (path, content) => {

        if (path === source.path) {

          throw new Error(
            'write denied'
          );
        }

        return originalWriteText(
          path,
          content
        );
      };

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

    await assert.rejects(
      () => applyRepairPreviewPlan({
        plan,
        pages,
        createSafetyBackup: async () => ({
          id:
            'backup-before-failure',
          reason:
            'repair-preview-apply'
        })
      }),
      error =>
        error.code === 'REPAIR_WRITE_FAILED' &&
        error.backupManifest?.id === 'backup-before-failure'
    );

    assert.equal(
      source.content,
      originalContent
    );

    assert.equal(
      getPageById(
        'source'
      )?.content,
      originalContent
    );

    assert.equal(
      await adapter.readText(
        source.path
      ),
      originalContent
    );

    assert.equal(
      buildRepairPreviewModel({
        pages
      }).summary.supportedDiagnosticCount,
      1
    );
  }
);


test(
  'persistent repair does not claim success when command reports non-durable write',
  async () => {

    const source =
      createDataSafetyPage({
        id:
          'source',
        title:
          'Source',
        body:
          '<h1>Source</h1><p>[[Missing Page]]</p>'
      });

    const target =
      createDataSafetyPage({
        id:
          'target',
        title:
          'Target'
      });

    const pages =
      [
        source,
        target
      ];

    const originalContent =
      source.content;

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

    await assert.rejects(
      () => applyRepairPreviewPlan({
        plan,
        pages,
        createSafetyBackup: async () => ({
          id:
            'backup-before-stale-write',
          reason:
            'repair-preview-apply'
        }),
        persistContentCommand: async () => ({
          stale:
            true,
          written:
            false,
          writeStatus:
            'stale'
        })
      }),
      error =>
        error.code === 'REPAIR_WRITE_FAILED' &&
        error.backupManifest?.id === 'backup-before-stale-write'
    );

    assert.equal(
      source.content,
      originalContent
    );

    assert.equal(
      source.body,
      '<h1>Source</h1><p>[[Missing Page]]</p>'
    );
  }
);
