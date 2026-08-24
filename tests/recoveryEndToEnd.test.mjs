import './setup.mjs';

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
  validateWorkspaceSnapshot
} from '../js/schema/workspaceSchema.js';

import {
  isRestoreIncompleteError,
  restoreWorkspaceBackup,
  restoreWorkspaceBackupSelection
} from '../js/storage/backupService.js';

import {
  buildWorkspaceRestorePreview
} from '../js/storage/backupRestorePreview.js';

import {
  buildAssetVerificationReport
} from '../js/storage/assetVerificationReport.js';

import {
  INTERNAL_LINK_TYPES,
  buildBrokenInternalLinkReport
} from '../js/storage/internalLinkDiagnostics.js';

import {
  ORPHAN_REVIEW_TYPES,
  buildOrphanReviewReport
} from '../js/storage/orphanReview.js';

import {
  applyRepairPreviewPlan,
  buildRepairPreviewModel,
  createRepairPreviewPlan,
  REPAIR_PREVIEW_CONFLICTS
} from '../js/storage/repairPreview.js';

import {
  persistPageContentCommand
} from '../js/storage/pageCommandService.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  createCleanWorkspaceFixture,
  createDataSafetyPage,
  createMemoryWorkspaceAdapter,
  seedBackupSnapshot,
  seedWorkspace
} from './fixtures/dataSafetyFixtures.mjs';


const E2E_BACKUP_ID =
  'e2e-recovery-source';


test(
  'recovery e2e scenario A previews restore changes and cancel leaves disk unchanged',
  async () => {

    const {
      adapter,
      backup
    } =
      await setupRecoveryScenario();

    const before =
      serializeAdapterSnapshot(
        adapter
      );

    const preview =
      await buildWorkspaceRestorePreview(
        E2E_BACKUP_ID,
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      preview.status,
      'ready'
    );

    assert.deepEqual(
      pageStatuses(
        preview
      ),
      {
        'world.md':
          'would-replace',
        'hero.md':
          'would-replace',
        'map.md':
          'unchanged'
      }
    );

    assert.deepEqual(
      preview.summary.pages,
      {
        total:
          3,
        wouldAdd:
          0,
        wouldReplace:
          2,
        unchanged:
          1,
        backupProblems:
          0
      }
    );

    assert.deepEqual(
      assetStatuses(
        preview
      ),
      {
        'assets/portraits/hero.png':
          'would-replace',
        'assets/maps/castle.png':
          'unchanged',
        'assets/music/town.mp3':
          'unchanged'
      }
    );

    assert.equal(
      preview.manifest.pageCount,
      backup.pages.length
    );

    assert.deepEqual(
      serializeAdapterSnapshot(
        adapter
      ),
      before
    );
  }
);


test(
  'recovery e2e scenario B partially restores one page and reload keeps unrelated data',
  async () => {

    const {
      adapter,
      backup,
      currentWorld,
      currentTarget,
      currentAssetSource
    } =
      await setupRecoveryScenario();

    const result =
      await withMutedConsoleWarn(() =>
        restoreWorkspaceBackupSelection(
        E2E_BACKUP_ID,
        {
          pageNames:
            [
              'hero.md'
            ]
        },
        adapter,
        {
          preRestoreBackupId:
            'e2e-pre-partial'
        }
      ));

    assert.equal(
      result.partial,
      true
    );

    assert.equal(
      result.restoredPages,
      1
    );

    assert.deepEqual(
      result.selectedPageNames,
      [
        'hero.md'
      ]
    );

    assert.equal(
      adapter.hasFile(
        '.my-own-world-backups/e2e-pre-partial/manifest.json'
      ),
      true
    );

    assert.equal(
      await adapter.readText(
        'pages/hero.md'
      ),
      backup.pages.find(page =>
        page.id === 'hero'
      ).content
    );

    assert.equal(
      await adapter.readText(
        'pages/world.md'
      ),
      currentWorld.content
    );

    assert.equal(
      await adapter.readText(
        'pages/found-ally.md'
      ),
      currentTarget.content
    );

    assert.equal(
      await adapter.readText(
        'pages/asset-source.md'
      ),
      currentAssetSource.content
    );

    assert.equal(
      await readTextAsset(
        adapter,
        'assets/portraits/hero.png'
      ),
      'hero-image'
    );

    const reloaded =
      await reloadPages(
        adapter,
        [
          'world.md',
          'hero.md',
          'map.md',
          'found-ally.md',
          'asset-source.md'
        ]
      );

    setPages(
      reloaded
    );

    assert.equal(
      getPageById(
        'hero'
      )?.content,
      backup.pages.find(page =>
        page.id === 'hero'
      ).content
    );

    assert.equal(
      getPageById(
        'world'
      )?.content,
      currentWorld.content
    );
  }
);


test(
  'recovery e2e scenario C reports restore failure with identifiable safety backup',
  async () => {

    const base =
      createMemoryWorkspaceAdapter();

    const {
      currentHero
    } =
      await setupRecoveryScenario({
        adapter:
          base
      });

    const adapter =
      createHookedAdapter(
        base,
        {
          async writeText(path) {

            if (
              normalizeTestPath(
                path
              ) === 'pages/hero.md'
            ) {

              throw new Error(
                'e2e restore write denied'
              );
            }
          }
        }
      );

    const error =
      await catchError(() =>
        withMutedConsoleWarn(() =>
        restoreWorkspaceBackup(
          E2E_BACKUP_ID,
          adapter,
          {
            preRestoreBackupId:
            'e2e-pre-failure'
          }
        ))
      );

    assert.equal(
      isRestoreIncompleteError(
        error
      ),
      true
    );

    assert.equal(
      error.stage,
      'pages'
    );

    assert.equal(
      error.preRestoreBackupId,
      'e2e-pre-failure'
    );

    assert.equal(
      error.restoredPages,
      1
    );

    assert.equal(
      base.hasFile(
        '.my-own-world-backups/e2e-pre-failure/manifest.json'
      ),
      true
    );

    assert.equal(
      await base.readText(
        'pages/hero.md'
      ),
      currentHero.content
    );
  }
);


test(
  'recovery e2e scenario D groups broken links assets and orphan candidates',
  async () => {

    const {
      currentPages,
      assetPaths
    } =
      await setupRecoveryScenario();

    const internalLinks =
      buildBrokenInternalLinkReport({
        pages:
          currentPages
      });

    const assetVerification =
      buildAssetVerificationReport({
        pages:
          currentPages,
        assetPaths
      });

    const schema =
      validateWorkspaceSnapshot({
        pages:
          currentPages
      });

    const orphanReview =
      buildOrphanReviewReport({
        assetVerification,
        internalLinkDiagnostics:
          internalLinks,
        schema
      });

    assert.equal(
      internalLinks.summary.issueCount,
      2
    );

    assert.deepEqual(
      internalLinks.summary.byType,
      {
        [INTERNAL_LINK_TYPES.relationship]:
          1,
        [INTERNAL_LINK_TYPES.wiki]:
          1
      }
    );

    assert.deepEqual(
      assetVerification.referencedMissing.map(reference =>
        reference.path
      ),
      [
        'assets/portraits/missing.png'
      ]
    );

    assert.deepEqual(
      assetVerification.orphanCandidates.map(candidate =>
        candidate.path
      ),
      [
        'assets/portraits/unused.png'
      ]
    );

    assert.equal(
      schema.ok,
      true
    );

    assert.deepEqual(
      new Set(
        orphanReview.groups.map(group =>
          group.type
        )
      ),
      new Set([
        ORPHAN_REVIEW_TYPES.relationshipTarget,
        ORPHAN_REVIEW_TYPES.internalReferenceTarget,
        ORPHAN_REVIEW_TYPES.assetUnused
      ])
    );
  }
);


test(
  'recovery e2e scenario E applies supported repair after backup and reload resolves diagnostic',
  async () => {

    const {
      adapter,
      currentPages,
      currentWorld,
      currentAssetSource
    } =
      await setupRecoveryScenario();

    const beforeLinks =
      buildBrokenInternalLinkReport({
        pages:
          currentPages
      });

    const model =
      buildRepairPreviewModel({
        pages:
          currentPages,
        internalLinkDiagnostics:
          beforeLinks
      });

    const diagnostic =
      model.diagnostics.find(candidate =>
        candidate.diagnostic.linkType === INTERNAL_LINK_TYPES.wiki
      );

    const plan =
      createRepairPreviewPlan({
        model,
        diagnosticId:
          diagnostic.id,
        targetPageId:
          'found-ally'
      });

    const result =
      await withMutedConsoleWarn(() =>
        applyRepairPreviewPlan({
        plan,
        pages:
          currentPages
      }));

    assert.equal(
      result.status,
      'applied'
    );

    assert.ok(
      result.backupManifest?.id
    );

    assert.equal(
      adapter.hasFile(
        `.my-own-world-backups/${result.backupManifest.id}/manifest.json`
      ),
      true
    );

    const reloaded =
      await reloadPages(
        adapter,
        [
          'world.md',
          'hero.md',
          'map.md',
          'found-ally.md',
          'asset-source.md'
        ]
      );

    setPages(
      reloaded
    );

    const afterLinks =
      buildBrokenInternalLinkReport({
        pages:
          reloaded
      });

    assert.equal(
      afterLinks.issues.some(issue =>
        issue.linkType === INTERNAL_LINK_TYPES.wiki &&
        issue.originalTarget === 'Missing Ally'
      ),
      false
    );

    assert.equal(
      afterLinks.issues.some(issue =>
        issue.linkType === INTERNAL_LINK_TYPES.relationship
      ),
      true
    );

    assert.match(
      getPageById(
        'hero'
      )?.content || '',
      /\[\[Found Ally\]\]/
    );

    assert.equal(
      getPageById(
        'world'
      )?.content,
      currentWorld.content
    );

    assert.equal(
      getPageById(
        'asset-source'
      )?.content,
      currentAssetSource.content
    );
  }
);


test(
  'recovery e2e scenario F blocks stale repair preview after normal page write',
  async () => {

    const {
      currentPages,
      currentHero
    } =
      await setupRecoveryScenario();

    const model =
      buildRepairPreviewModel({
        pages:
          currentPages
      });

    const diagnostic =
      model.diagnostics.find(candidate =>
        candidate.diagnostic.linkType === INTERNAL_LINK_TYPES.wiki
      );

    const plan =
      createRepairPreviewPlan({
        model,
        diagnosticId:
          diagnostic.id,
        targetPageId:
          'found-ally'
      });

    const normalEditContent =
      updatePageRecordContent(
        currentHero.content,
        {
          body:
            '<h1>Hero</h1><p>Normal edit before apply. [[Missing Ally]]</p><img data-asset="assets/portraits/hero.png">'
        }
      );

    await persistPageContentCommand({
      page:
        currentHero,
      content:
        normalEditContent,
      type:
        'e2e-normal-edit-before-repair',
      reason:
        'e2e-stale-repair-preview'
    });

    let backupCalls =
      0;

    await assert.rejects(
      () => applyRepairPreviewPlan({
        plan,
        pages:
          currentPages,
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
        /устарел/.test(
          error.message
        )
    );

    assert.equal(
      backupCalls,
      0
    );
  }
);


async function setupRecoveryScenario({
  adapter = createMemoryWorkspaceAdapter()
} = {}) {

  const backup =
    createCleanWorkspaceFixture();

  const backupMap =
    backup.pages.find(page =>
      page.id === 'map'
    );

  const currentWorld =
    createDataSafetyPage({
      id:
        'world',
      title:
        'World',
      body:
        '<h1>World</h1><p>Current world changed after backup.</p>'
    });

  const currentHero =
    createDataSafetyPage({
      id:
        'hero',
      title:
        'Hero',
      parent:
        'world',
      order:
        2000,
      type:
        'character',
      tags:
        [
          'card',
          'character'
        ],
      aliases:
        [
          'Champion'
        ],
      relationships:
        [
          {
            type:
              'ally',
            targetId:
              'missing-ally',
            label:
              'Lost Ally'
          }
        ],
      body:
        '<h1>Hero</h1><p>Current hero changed after backup. [[Missing Ally]]</p><img data-asset="assets/portraits/hero.png">'
    });

  const currentTarget =
    createDataSafetyPage({
      id:
        'found-ally',
      title:
        'Found Ally',
      parent:
        'world',
      order:
        4000,
      body:
        '<h1>Found Ally</h1><p>Explicit repair target.</p>'
    });

  const currentAssetSource =
    createDataSafetyPage({
      id:
        'asset-source',
      title:
        'Asset Source',
      parent:
        'world',
      order:
        5000,
      body:
        '<h1>Asset Source</h1><img data-asset="assets/portraits/used.png"><img data-asset="assets/portraits/missing.png">'
    });

  const currentPages =
    [
      currentWorld,
      currentHero,
      clonePage(
        backupMap
      ),
      currentTarget,
      currentAssetSource
    ];

  const currentAssets =
    {
      'assets/portraits/hero.png':
        'changed-hero-image',
      'assets/maps/castle.png':
        'castle-map',
      'assets/music/town.mp3':
        'town-music',
      'assets/portraits/used.png':
        'used-image',
      'assets/portraits/unused.png':
        'unused-image'
    };

  await seedBackupSnapshot(
    adapter,
    {
      id:
        E2E_BACKUP_ID,
      pages:
        backup.pages,
      assets:
        backup.assets
    }
  );

  await seedWorkspace(
    adapter,
    {
      pages:
        currentPages,
      assets:
        currentAssets
    }
  );

  setStorageAdapter(
    adapter
  );

  setPages(
    currentPages
  );

  return {
    adapter,
    backup,
    currentPages,
    currentWorld,
    currentHero,
    currentTarget,
    currentAssetSource,
    assetPaths:
      Object.keys(
        currentAssets
      )
  };
}


async function reloadPages(
  adapter,
  names
) {

  const pages =
    [];

  for (const name of names) {

    const path =
      `pages/${name}`;

    pages.push(
      createRuntimePageFromContent({
        content:
          await adapter.readText(
            path
          ),
        name,
        path:
          `/${path}`
      })
    );
  }

  return pages;
}


function createHookedAdapter(
  base,
  hooks = {}
) {

  return {
    ...base,
    async ensureDirectory(path) {

      await hooks.ensureDirectory?.(
        path
      );

      return base.ensureDirectory(
        path
      );
    },
    async readText(path) {

      await hooks.readText?.(
        path
      );

      return base.readText(
        path
      );
    },
    async writeText(path, content) {

      await hooks.writeText?.(
        path,
        content
      );

      return base.writeText(
        path,
        content
      );
    },
    async readBinary(path) {

      await hooks.readBinary?.(
        path
      );

      return base.readBinary(
        path
      );
    },
    async writeBinary(path, content) {

      await hooks.writeBinary?.(
        path,
        content
      );

      return base.writeBinary(
        path,
        content
      );
    }
  };
}


async function catchError(
  callback
) {

  try {

    await callback();

  } catch (error) {

    return error;
  }

  assert.fail(
    'Expected operation to reject.'
  );
}


function pageStatuses(
  preview
) {

  return Object.fromEntries(
    preview.pages.map(page => [
      page.name,
      page.status
    ])
  );
}


function assetStatuses(
  preview
) {

  return Object.fromEntries(
    preview.assets.map(asset => [
      asset.path,
      asset.status
    ])
  );
}


function serializeAdapterSnapshot(
  adapter
) {

  return [
    ...adapter.snapshotFiles()
  ]
    .map(([path, content]) => [
      path,
      serializeFileContent(
        content
      )
    ])
    .sort((left, right) =>
      left[0].localeCompare(
        right[0]
      )
    );
}


function serializeFileContent(
  content
) {

  if (typeof content === 'string') return content;

  return new TextDecoder().decode(
    content
  );
}


async function readTextAsset(
  adapter,
  path
) {

  return new TextDecoder().decode(
    await adapter.readBinary(
      path
    )
  );
}


function clonePage(
  page
) {

  return {
    ...page,
    tags:
      [
        ...(page.tags || [])
      ],
    aliases:
      [
        ...(page.aliases || [])
      ],
    relationships:
      (page.relationships || []).map(relationship => ({
        ...relationship
      }))
  };
}


function normalizeTestPath(
  path
) {

  return String(path || '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}


async function withMutedConsoleWarn(
  callback
) {

  const previousWarn =
    console.warn;

  console.warn =
    () => {};

  try {

    return await callback();

  } finally {

    console.warn =
      previousWarn;
  }
}
