import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWorkspaceBackup,
  listIncompleteWorkspaceBackups,
  listWorkspaceBackups,
  restoreWorkspaceBackup
} from '../js/storage/backupService.js';

import {
  findBrokenAssetReferences
} from '../js/storage/assetBrokenChecker.js';

import {
  findOrphanAssetPaths
} from '../js/storage/assetOrphanDetector.js';

import {
  createWorkspaceRecoveryReport
} from '../js/schema/schemaRecovery.js';

import {
  validateWorkspaceSnapshot
} from '../js/schema/workspaceSchema.js';

import {
  state
} from '../js/state.js';

import {
  DATA_SAFETY_FIXTURE_CASES,
  createAssetDiagnosticsFixture,
  createBackupWithPagesAndAssetsFixture,
  createBrokenInternalWikiLinkFixture,
  createBrokenRelationshipTargetFixture,
  createChangedAfterBackupFixture,
  createCleanWorkspaceFixture,
  createDataSafetyPage,
  createMalformedIncompleteBackupFixture,
  createMemoryWorkspaceAdapter,
  createMissingBackupAssetFixture,
  createMissingBackupPageFileFixture,
  seedBackupSnapshot,
  seedWorkspace
} from './fixtures/dataSafetyFixtures.mjs';


test(
  'data safety fixtures cover the Phase 12 recovery input matrix',
  () => {

    assert.deepEqual(
      Object.values(
        DATA_SAFETY_FIXTURE_CASES
      ),
      [
        'A.clean-workspace',
        'B.changed-after-backup',
        'C.backup-with-pages-and-assets',
        'D.missing-backup-page-file',
        'E.missing-backup-asset',
        'F.broken-internal-wiki-link',
        'G.broken-relationship-target',
        'H.broken-asset-reference',
        'I.orphan-asset',
        'J.malformed-incomplete-backup'
      ]
    );

    const clean =
      createCleanWorkspaceFixture();

    const changed =
      createChangedAfterBackupFixture();

    const brokenWiki =
      createBrokenInternalWikiLinkFixture();

    const brokenRelationship =
      createBrokenRelationshipTargetFixture();

    const assetDiagnostics =
      createAssetDiagnosticsFixture();

    assert.equal(
      validateWorkspaceSnapshot({
        pages:
          clean.pages
      }).ok,
      true
    );

    assert.notEqual(
      changed.backupPages.find(page => page.id === 'hero').content,
      changed.currentPages.find(page => page.id === 'hero').content
    );

    assert.match(
      brokenWiki.pages[0].content,
      /data-page-id="missing-page"/
    );

    assert.equal(
      brokenRelationship.pages[0].relationships[0].targetId,
      'missing-ally'
    );

    assert.deepEqual(
      assetDiagnostics.assetPaths,
      [
        'assets/portraits/used.png',
        'assets/portraits/unused.png'
      ]
    );
  }
);


test(
  'backup baseline creates a readable manifest and full restore returns saved fixture content',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const backupFixture =
      createBackupWithPagesAndAssetsFixture();

    await seedWorkspace(
      adapter,
      backupFixture
    );

    const manifest =
      await createWorkspaceBackup({
        storageAdapter:
          adapter,
        pages:
          backupFixture.pages,
        id:
          'baseline-backup',
        cleanup:
          false
      });

    assert.equal(
      manifest.pageCount,
      3
    );

    assert.equal(
      manifest.assetCount,
      3
    );

    assert.deepEqual(
      (
        await listWorkspaceBackups(
          adapter
        )
      ).map(backup => backup.id),
      [
        'baseline-backup'
      ]
    );

    const changed =
      createChangedAfterBackupFixture();

    await seedWorkspace(
      adapter,
      {
        pages:
          changed.currentPages,
        assets:
          changed.currentAssets
      }
    );

    state.pages =
      changed.currentPages;

    try {

      const result =
        await restoreWorkspaceBackup(
          'baseline-backup',
          adapter,
          {
            preRestoreBackupId:
              'baseline-pre-restore'
          }
        );

      assert.equal(
        result.restoredPages,
        3
      );

      assert.equal(
        result.restoredAssets,
        3
      );

      assert.equal(
        await adapter.readText('/pages/hero.md'),
        backupFixture.pages.find(page => page.id === 'hero').content
      );

      assert.equal(
        decodeFixtureBinary(
          await adapter.readBinary(
            'assets/portraits/hero.png'
          )
        ),
        'hero-image'
      );

      assert.ok(
        (
          await listWorkspaceBackups(
            adapter
          )
        ).some(backup =>
          backup.id === 'baseline-pre-restore' &&
          backup.reason === 'pre-restore'
        )
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'restore baseline rejects missing or corrupt manifest before workspace writes',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const currentPage =
      createDataSafetyPage({
        id:
          'current',
        title:
          'Current',
        body:
          '<h1>Current</h1><p>Keep this content.</p>'
      });

    await seedWorkspace(
      adapter,
      {
        pages:
          [
            currentPage
          ]
      }
    );

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'corrupt-backup',
        pages:
          [
            currentPage
          ],
        corruptManifest:
          true
      }
    );

    await withMutedConsoleWarn(async () => {

      await assert.rejects(
        () => restoreWorkspaceBackup(
          'corrupt-backup',
          adapter
        ),
        /Manifest backup/
      );

      await assert.rejects(
        () => restoreWorkspaceBackup(
          'missing-backup',
          adapter
        ),
        /Manifest backup/
      );
    });

    assert.equal(
      await adapter.readText('/pages/current.md'),
      currentPage.content
    );
  }
);


test(
  'pre-restore backup failure blocks destructive restore writes',
  async () => {

    const baseAdapter =
      createMemoryWorkspaceAdapter();

    const source =
      createCleanWorkspaceFixture();

    const current =
      createChangedAfterBackupFixture();

    await seedBackupSnapshot(
      baseAdapter,
      {
        id:
          'restore-source',
        pages:
          source.pages,
        assets:
          source.assets
      }
    );

    await seedWorkspace(
      baseAdapter,
      {
        pages:
          current.currentPages,
        assets:
          current.currentAssets
      }
    );

    let restorePageWrites =
      0;

    const adapter =
      {
        ...baseAdapter,

        async ensureDirectory(
          path
        ) {

          if (
            String(path).includes(
              'blocked-pre-restore'
            )
          ) {

            throw new Error(
              'pre-restore fixture failure'
            );
          }

          return baseAdapter.ensureDirectory(
            path
          );
        },

        async writeText(
          path,
          content
        ) {

          if (
            String(path)
              .replace(/^\/+/, '')
              .startsWith('pages/')
          ) {

            restorePageWrites +=
              1;
          }

          return baseAdapter.writeText(
            path,
            content
          );
        }
      };

    state.pages =
      current.currentPages;

    try {

      await withMutedConsoleWarn(async () => {

        await assert.rejects(
          () => restoreWorkspaceBackup(
            'restore-source',
            adapter,
            {
              preRestoreBackupId:
                'blocked-pre-restore'
            }
          ),
          /pre-restore|backup/i
        );
      });

      assert.equal(
        restorePageWrites,
        0
      );

      assert.equal(
        await baseAdapter.readText('/pages/hero.md'),
        current.currentPages.find(page => page.id === 'hero').content
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'backup fixtures expose current missing page and missing asset restore behavior',
  async () => {

    const missingPageAdapter =
      createMemoryWorkspaceAdapter();

    const missingPage =
      createMissingBackupPageFileFixture();

    const current =
      createChangedAfterBackupFixture();

    await seedBackupSnapshot(
      missingPageAdapter,
      {
        ...missingPage,
        id:
          missingPage.backupId
      }
    );

    await seedWorkspace(
      missingPageAdapter,
      {
        pages:
          current.currentPages,
        assets:
          current.currentAssets
      }
    );

    state.pages =
      current.currentPages;

    try {

      await assert.rejects(
        () => restoreWorkspaceBackup(
          missingPage.backupId,
          missingPageAdapter,
          {
            preRestoreBackupId:
              'pre-before-missing-page'
          }
        ),
        /File not found/
      );

      assert.equal(
        await missingPageAdapter.readText('/pages/world.md'),
        current.currentPages.find(page => page.id === 'world').content
      );

    } finally {

      state.pages =
        [];
    }

    const missingAssetAdapter =
      createMemoryWorkspaceAdapter();

    const missingAsset =
      createMissingBackupAssetFixture();

    await seedBackupSnapshot(
      missingAssetAdapter,
      {
        ...missingAsset,
        id:
          missingAsset.backupId
      }
    );

    await seedWorkspace(
      missingAssetAdapter,
      {
        pages:
          current.currentPages,
        assets:
          current.currentAssets
      }
    );

    state.pages =
      current.currentPages;

    try {

      const result =
        await withMutedConsoleWarn(() =>
          restoreWorkspaceBackup(
            missingAsset.backupId,
            missingAssetAdapter,
            {
              preRestoreBackupId:
                'pre-before-missing-asset'
            }
          )
        );

      assert.equal(
        result.restoredPages,
        3
      );

      assert.equal(
        result.restoredAssets,
        2
      );

      assert.equal(
        decodeFixtureBinary(
          await missingAssetAdapter.readBinary(
            'assets/portraits/hero.png'
          )
        ),
        'changed-hero-image'
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'asset diagnostics baseline classifies supported cases without repair',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const fixture =
      createAssetDiagnosticsFixture();

    await seedWorkspace(
      adapter,
      {
        pages:
          fixture.pages,
        assets:
          fixture.assets
      }
    );

    await createMalformedIncompleteBackupFixture(
      adapter
    );

    const broken =
      findBrokenAssetReferences(
        fixture.pages,
        fixture.assetPaths
      );

    const orphan =
      findOrphanAssetPaths(
        fixture.pages,
        fixture.assetPaths
      );

    assert.deepEqual(
      broken.map(reference => reference.path),
      [
        'assets/portraits/missing.png'
      ]
    );

    assert.deepEqual(
      orphan,
      [
        'assets/portraits/unused.png'
      ]
    );

    const incomplete =
      await listIncompleteWorkspaceBackups({
        storageAdapter:
          adapter
      });

    assert.deepEqual(
      incomplete.map(backup => backup.id),
      [
        'fixture-incomplete-backup'
      ]
    );

    assert.equal(
      incomplete[0].reason,
      'manifest-missing'
    );
  }
);


test(
  'current schema recovery baseline does not yet diagnose broken wiki or relationship targets',
  () => {

    const brokenWiki =
      createBrokenInternalWikiLinkFixture();

    const brokenRelationship =
      createBrokenRelationshipTargetFixture();

    const validation =
      validateWorkspaceSnapshot({
        pages:
          [
            ...brokenWiki.pages,
            ...brokenRelationship.pages
          ]
      });

    const report =
      createWorkspaceRecoveryReport(
        validation
      );

    assert.equal(
      validation.ok,
      true
    );

    assert.deepEqual(
      report.actions,
      []
    );
  }
);


function decodeFixtureBinary(
  value
) {

  return new TextDecoder()
    .decode(
      value
    );
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
