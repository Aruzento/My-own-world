import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWorkspaceRestorePreview
} from '../js/storage/backupRestorePreview.js';

import {
  getAllPages,
  getPageById,
  rebuildPageRepository
} from '../js/repository/pageRepository.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  createChangedAfterBackupFixture,
  createCleanWorkspaceFixture,
  createDataSafetyPage,
  createMemoryWorkspaceAdapter,
  createMissingBackupAssetFixture,
  createMissingBackupPageFileFixture,
  seedBackupSnapshot,
  seedWorkspace
} from './fixtures/dataSafetyFixtures.mjs';


test(
  'restore preview classifies add replace and unchanged pages from real contents',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    const currentHero =
      createChangedAfterBackupFixture()
        .currentPages
        .find(page =>
          page.id === 'hero'
        );

    const currentWorld =
      backup.pages.find(page =>
        page.id === 'world'
      );

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'restore-preview-pages',
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
          [
            currentWorld,
            currentHero
          ],
        assets:
          {
            'assets/portraits/hero.png':
              'changed-hero-image',
            'assets/maps/castle.png':
              'castle-map'
          }
      }
    );

    const preview =
      await buildWorkspaceRestorePreview(
        'restore-preview-pages',
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
      summarizeItems(
        preview.pages
      ),
      {
        world:
          'unchanged',
        hero:
          'would-replace',
        map:
          'would-add'
      }
    );

    assert.equal(
      preview.summary.pages.unchanged,
      1
    );

    assert.equal(
      preview.summary.pages.wouldReplace,
      1
    );

    assert.equal(
      preview.summary.pages.wouldAdd,
      1
    );
  }
);


test(
  'restore preview classifies asset availability and current workspace status',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'restore-preview-assets',
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
          backup.pages,
        assets:
          {
            'assets/portraits/hero.png':
              'changed-hero-image',
            'assets/maps/castle.png':
              'castle-map'
          }
      }
    );

    const preview =
      await buildWorkspaceRestorePreview(
        'restore-preview-assets',
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
      summarizeItems(
        preview.assets,
        'path'
      ),
      {
        'assets/portraits/hero.png':
          'would-replace',
        'assets/maps/castle.png':
          'unchanged',
        'assets/music/town.mp3':
          'would-add'
      }
    );

    assert.equal(
      preview.summary.assets.backupAvailable,
      3
    );

    assert.equal(
      preview.summary.assets.currentPresent,
      2
    );

    assert.equal(
      preview.summary.assets.currentMissing,
      1
    );
  }
);


test(
  'restore preview blocks damaged backup page and missing backup asset states',
  async () => {

    const missingPageAdapter =
      createMemoryWorkspaceAdapter();

    const missingPage =
      createMissingBackupPageFileFixture();

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
          createChangedAfterBackupFixture().currentPages,
        assets:
          createChangedAfterBackupFixture().currentAssets
      }
    );

    const pagePreview =
      await buildWorkspaceRestorePreview(
        missingPage.backupId,
        {
          storageAdapter:
            missingPageAdapter
        }
      );

    assert.equal(
      pagePreview.status,
      'blocked'
    );

    assert.ok(
      pagePreview.issues.some(issue =>
        issue.code === 'page-backup-file-missing'
      )
    );

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
          createChangedAfterBackupFixture().currentPages,
        assets:
          createChangedAfterBackupFixture().currentAssets
      }
    );

    const assetPreview =
      await buildWorkspaceRestorePreview(
        missingAsset.backupId,
        {
          storageAdapter:
            missingAssetAdapter
        }
      );

    assert.equal(
      assetPreview.status,
      'blocked'
    );

    assert.ok(
      assetPreview.issues.some(issue =>
        issue.code === 'asset-backup-file-missing'
      )
    );
  }
);


test(
  'restore preview returns blocked state for missing or corrupt manifest',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const page =
      createDataSafetyPage({
        id:
          'current',
        title:
          'Current'
      });

    await seedWorkspace(
      adapter,
      {
        pages:
          [
            page
          ]
      }
    );

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'corrupt-preview',
        pages:
          [
            page
          ],
        corruptManifest:
          true
      }
    );

    const corrupt =
      await buildWorkspaceRestorePreview(
        'corrupt-preview',
        {
          storageAdapter:
            adapter
        }
      );

    const missing =
      await buildWorkspaceRestorePreview(
        'missing-preview',
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      corrupt.status,
      'blocked'
    );

    assert.equal(
      missing.status,
      'blocked'
    );

    assert.deepEqual(
      corrupt.issues.map(issue => issue.code),
      [
        'manifest-json-malformed'
      ]
    );
  }
);


test(
  'restore preview performs zero writes and does not mutate PageRepository',
  async () => {

    const baseAdapter =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    await seedBackupSnapshot(
      baseAdapter,
      {
        id:
          'zero-write-preview',
        pages:
          backup.pages,
        assets:
          backup.assets
      }
    );

    await seedWorkspace(
      baseAdapter,
      backup
    );

    const counters =
      {
        ensureDirectory:
          0,
        writeText:
          0,
        writeBinary:
          0,
        removeFile:
          0,
        removeDirectory:
          0
      };

    const adapter =
      instrumentWriteMethods(
        baseAdapter,
        counters
      );

    const repositoryPage =
      createDataSafetyPage({
        id:
          'repo-anchor',
        title:
          'Repository Anchor'
      });

    setPages([
      repositoryPage
    ]);

    rebuildPageRepository();

    const beforePage =
      getPageById(
        'repo-anchor'
      );

    const beforeAll =
      getAllPages();

    const preview =
      await buildWorkspaceRestorePreview(
        'zero-write-preview',
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
      counters,
      {
        ensureDirectory:
          0,
        writeText:
          0,
        writeBinary:
          0,
        removeFile:
          0,
        removeDirectory:
          0
      }
    );

    assert.equal(
      getPageById(
        'repo-anchor'
      ),
      beforePage
    );

    assert.deepEqual(
      getAllPages(),
      beforeAll
    );

    setPages([]);
    rebuildPageRepository();
  }
);


function summarizeItems(
  items,
  key = 'id'
) {

  return Object.fromEntries(
    items.map(item => [
      item[key],
      item.status
    ])
  );
}


function instrumentWriteMethods(
  adapter,
  counters
) {

  return {
    ...adapter,

    async ensureDirectory(
      path
    ) {

      counters.ensureDirectory +=
        1;

      return adapter.ensureDirectory(
        path
      );
    },

    async writeText(
      path,
      content
    ) {

      counters.writeText +=
        1;

      return adapter.writeText(
        path,
        content
      );
    },

    async writeBinary(
      path,
      content
    ) {

      counters.writeBinary +=
        1;

      return adapter.writeBinary(
        path,
        content
      );
    },

    async removeFile(
      path
    ) {

      counters.removeFile +=
        1;

      return adapter.removeFile(
        path
      );
    },

    async removeDirectory(
      path
    ) {

      counters.removeDirectory +=
        1;

      return adapter.removeDirectory(
        path
      );
    }
  };
}
