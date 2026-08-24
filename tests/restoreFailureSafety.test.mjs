import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isRestoreIncompleteError,
  restoreWorkspaceBackup,
  restoreWorkspaceBackupSelection
} from '../js/storage/backupService.js';

import {
  state
} from '../js/state.js';

import {
  createChangedAfterBackupFixture,
  createCleanWorkspaceFixture,
  createMemoryWorkspaceAdapter,
  seedBackupSnapshot,
  seedWorkspace
} from './fixtures/dataSafetyFixtures.mjs';


test(
  'restore blocks unreadable manifest before safety backup or workspace writes',
  async () => {

    const base =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    const current =
      createChangedAfterBackupFixture();

    await seedBackupSnapshot(
      base,
      {
        id:
          'restore-manifest-read-fails',
        pages:
          backup.pages,
        assets:
          backup.assets
      }
    );

    await seedWorkspace(
      base,
      {
        pages:
          current.currentPages,
        assets:
          current.currentAssets
      }
    );

    const writes =
      [];

    const adapter =
      createHookedAdapter(
        base,
        {
          async readText(path) {

            if (
              normalizeTestPath(path) ===
              '.my-own-world-backups/restore-manifest-read-fails/manifest.json'
            ) {

              throw new Error(
                'manifest read failed'
              );
            }
          },
          async writeText(path) {
            writes.push(
              normalizeTestPath(path)
            );
          },
          async writeBinary(path) {
            writes.push(
              normalizeTestPath(path)
            );
          }
        }
      );

    state.pages =
      current.currentPages;

    try {

      await assert.rejects(
        () => restoreWorkspaceBackup(
          'restore-manifest-read-fails',
          adapter,
          {
            preRestoreBackupId:
              'pre-manifest-read-fails'
          }
        ),
        /Restore blocked/
      );

      assert.deepEqual(
        writes,
        []
      );

      assert.equal(
        base.hasFile(
          '.my-own-world-backups/pre-manifest-read-fails/manifest.json'
        ),
        false
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        current.currentPages.find(page => page.id === 'hero').content
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'restore blocks when pre-restore backup creation fails before restore writes',
  async () => {

    const {
      base,
      backup,
      current
    } =
      await setupRestoreFixture({
        backupId:
          'restore-prebackup-create-source'
      });

    const restoreWrites =
      [];

    const adapter =
      createHookedAdapter(
        base,
        {
          async ensureDirectory(path) {

            if (
              normalizeTestPath(path).includes(
                'pre-create-failure'
              )
            ) {

              throw new Error(
                'pre-restore backup create failed'
              );
            }
          },
          async writeText(path) {

            if (
              normalizeTestPath(path).startsWith(
                'pages/'
              )
            ) {

              restoreWrites.push(
                normalizeTestPath(path)
              );
            }
          }
        }
      );

    state.pages =
      current.currentPages;

    try {

      await assert.rejects(
        () => restoreWorkspaceBackup(
          'restore-prebackup-create-source',
          adapter,
          {
            preRestoreBackupId:
              'pre-create-failure'
          }
        ),
        /pre-restore|backup/i
      );

      assert.deepEqual(
        restoreWrites,
        []
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        current.currentPages.find(page => page.id === 'hero').content
      );

      assert.notEqual(
        await base.readText('pages/hero.md'),
        backup.pages.find(page => page.id === 'hero').content
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'restore blocks when pre-restore backup verification fails before restore writes',
  async () => {

    const {
      base,
      current
    } =
      await setupRestoreFixture({
        backupId:
          'restore-prebackup-verify-source'
      });

    const restoreWrites =
      [];

    const adapter =
      createHookedAdapter(
        base,
        {
          async readText(path) {

            if (
              normalizeTestPath(path) ===
              '.my-own-world-backups/pre-verify-failure/manifest.json'
            ) {

              throw new Error(
                'pre-restore verify read failed'
              );
            }
          },
          async writeText(path) {

            if (
              normalizeTestPath(path).startsWith(
                'pages/'
              )
            ) {

              restoreWrites.push(
                normalizeTestPath(path)
              );
            }
          }
        }
      );

    state.pages =
      current.currentPages;

    try {

      await assert.rejects(
        () => restoreWorkspaceBackup(
          'restore-prebackup-verify-source',
          adapter,
          {
            preRestoreBackupId:
              'pre-verify-failure'
          }
        ),
        /verified|verify|pre-restore|backup/i
      );

      assert.deepEqual(
        restoreWrites,
        []
      );

      assert.equal(
        base.hasFile(
          '.my-own-world-backups/pre-verify-failure/manifest.json'
        ),
        true
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        current.currentPages.find(page => page.id === 'hero').content
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'partial restore source page read failure blocks before safety backup and writes',
  async () => {

    const base =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    const current =
      createChangedAfterBackupFixture();

    await seedBackupSnapshot(
      base,
      {
        id:
          'partial-source-page-read-fails',
        pages:
          backup.pages,
        assets:
          backup.assets
      }
    );

    await seedWorkspace(
      base,
      {
        pages:
          current.currentPages,
        assets:
          current.currentAssets
      }
    );

    let heroSourceReads =
      0;

    const writes =
      [];

    const adapter =
      createHookedAdapter(
        base,
        {
          async readText(path) {

            if (
              normalizeTestPath(path) ===
              '.my-own-world-backups/partial-source-page-read-fails/pages/hero.md'
            ) {

              heroSourceReads += 1;

              if (heroSourceReads > 1) {

                throw new Error(
                  'selected backup page read failed'
                );
              }
            }
          },
          async writeText(path) {
            writes.push(
              normalizeTestPath(path)
            );
          },
          async writeBinary(path) {
            writes.push(
              normalizeTestPath(path)
            );
          }
        }
      );

    state.pages =
      current.currentPages;

    try {

      await assert.rejects(
        () => restoreWorkspaceBackupSelection(
          'partial-source-page-read-fails',
          {
            pageNames:
              [
                'hero.md'
              ]
          },
          adapter,
          {
            preRestoreBackupId:
              'pre-selected-source-read-fails'
          }
        ),
        /selected backup page|backup page file/i
      );

      assert.equal(
        heroSourceReads,
        2
      );

      assert.deepEqual(
        writes,
        []
      );

      assert.equal(
        base.hasFile(
          '.my-own-world-backups/pre-selected-source-read-fails/manifest.json'
        ),
        false
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        current.currentPages.find(page => page.id === 'hero').content
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'full restore source asset read failure blocks before safety backup and writes',
  async () => {

    const {
      base,
      current
    } =
      await setupRestoreFixture({
        backupId:
          'restore-source-asset-read-fails',
        pages:
          [
            createCleanWorkspaceFixture()
              .pages
              .find(page => page.id === 'hero')
          ]
      });

    let assetSourceReads =
      0;

    const writes =
      [];

    const adapter =
      createHookedAdapter(
        base,
        {
          async readBinary(path) {

            if (
              normalizeTestPath(path) ===
              '.my-own-world-backups/restore-source-asset-read-fails/assets/portraits/hero.png'
            ) {

              assetSourceReads += 1;

              if (assetSourceReads > 1) {

                throw new Error(
                  'backup asset read failed'
                );
              }
            }
          },
          async writeText(path) {
            writes.push(
              normalizeTestPath(path)
            );
          },
          async writeBinary(path) {
            writes.push(
              normalizeTestPath(path)
            );
          }
        }
      );

    state.pages =
      current.currentPages;

    try {

      await assert.rejects(
        () => restoreWorkspaceBackup(
          'restore-source-asset-read-fails',
          adapter,
          {
            preRestoreBackupId:
              'pre-asset-source-read-fails'
          }
        ),
        /backup asset is unavailable/i
      );

      assert.equal(
        assetSourceReads,
        2
      );

      assert.deepEqual(
        writes,
        []
      );

      assert.equal(
        base.hasFile(
          '.my-own-world-backups/pre-asset-source-read-fails/manifest.json'
        ),
        false
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        current.currentPages.find(page => page.id === 'hero').content
      );

      assert.equal(
        await readTextAsset(
          base,
          'assets/portraits/hero.png'
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
  'workspace page write failure reports incomplete restore with recovery backup',
  async () => {

    const backup =
      createCleanWorkspaceFixture();

    const pages =
      [
        backup.pages.find(page => page.id === 'hero'),
        backup.pages.find(page => page.id === 'world')
      ];

    const {
      base,
      current
    } =
      await setupRestoreFixture({
        backupId:
          'restore-page-write-fails',
        pages,
        assets:
          {}
      });

    const adapter =
      createHookedAdapter(
        base,
        {
          async writeText(path) {

            if (
              normalizeTestPath(path) === 'pages/world.md'
            ) {

              throw new Error(
                'workspace page write failed'
              );
            }
          }
        }
      );

    state.pages =
      current.currentPages;

    try {

      const error =
        await catchError(() =>
          restoreWorkspaceBackup(
            'restore-page-write-fails',
            adapter,
            {
              preRestoreBackupId:
                'pre-page-write-fails'
            }
          )
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
        'pre-page-write-fails'
      );

      assert.equal(
        error.restoredPages,
        1
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        pages[0].content
      );

      assert.equal(
        await base.readText('pages/world.md'),
        current.currentPages.find(page => page.id === 'world').content
      );

      assert.equal(
        base.hasFile(
          '.my-own-world-backups/pre-page-write-fails/manifest.json'
        ),
        true
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'workspace asset write failure reports incomplete restore without claiming success',
  async () => {

    const backup =
      createCleanWorkspaceFixture();

    const heroPage =
      backup.pages.find(page => page.id === 'hero');

    const {
      base,
      current
    } =
      await setupRestoreFixture({
        backupId:
          'restore-asset-write-fails',
        pages:
          [
            heroPage
          ],
        assets: {
          'assets/portraits/hero.png':
            'hero-image'
        }
      });

    const adapter =
      createHookedAdapter(
        base,
        {
          async writeBinary(path) {

            if (
              normalizeTestPath(path) === 'assets/portraits/hero.png'
            ) {

              throw new Error(
                'workspace asset write failed'
              );
            }
          }
        }
      );

    state.pages =
      current.currentPages;

    try {

      const error =
        await catchError(() =>
          restoreWorkspaceBackup(
            'restore-asset-write-fails',
            adapter,
            {
              preRestoreBackupId:
                'pre-asset-write-fails'
            }
          )
        );

      assert.equal(
        isRestoreIncompleteError(
          error
        ),
        true
      );

      assert.equal(
        error.stage,
        'assets'
      );

      assert.equal(
        error.preRestoreBackupId,
        'pre-asset-write-fails'
      );

      assert.equal(
        error.restoredPages,
        1
      );

      assert.equal(
        error.restoredAssets,
        0
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        heroPage.content
      );

      assert.equal(
        await readTextAsset(
          base,
          'assets/portraits/hero.png'
        ),
        'changed-hero-image'
      );

      assert.equal(
        base.hasFile(
          '.my-own-world-backups/pre-asset-write-fails/manifest.json'
        ),
        true
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'legacy v1 partial asset backup skips missing asset source before restore writes',
  async () => {

    const base =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    const current =
      createChangedAfterBackupFixture();

    await seedBackupSnapshot(
      base,
      {
        id:
          'legacy-partial-assets',
        pages:
          [
            backup.pages.find(page => page.id === 'hero')
          ],
        assets:
          backup.assets,
        missingAssetPaths:
          [
            'assets/portraits/hero.png'
          ]
      }
    );

    const manifest =
      JSON.parse(
        await base.readText(
          '.my-own-world-backups/legacy-partial-assets/manifest.json'
        )
      );

    manifest.assetCount =
      manifest.assets.length - 1;

    await base.writeText(
      '.my-own-world-backups/legacy-partial-assets/manifest.json',
      JSON.stringify(
        manifest,
        null,
        2
      )
    );

    await seedWorkspace(
      base,
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
        await restoreWorkspaceBackup(
          'legacy-partial-assets',
          base,
          {
            preRestoreBackupId:
              'pre-legacy-partial-assets'
          }
        );

      assert.equal(
        result.restoredPages,
        1
      );

      assert.deepEqual(
        result.skippedAssetPaths,
        [
          'portraits/hero.png'
        ]
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        backup.pages.find(page => page.id === 'hero').content
      );

      assert.equal(
        await readTextAsset(
          base,
          'assets/portraits/hero.png'
        ),
        'changed-hero-image'
      );

    } finally {

      state.pages =
        [];
    }
  }
);


async function setupRestoreFixture({
  backupId,
  pages = null,
  assets = null
}) {

  const base =
    createMemoryWorkspaceAdapter();

  const backup =
    createCleanWorkspaceFixture();

  const current =
    createChangedAfterBackupFixture();

  await seedBackupSnapshot(
    base,
    {
      id:
        backupId,
      pages:
        pages || backup.pages,
      assets:
        assets || backup.assets
    }
  );

  await seedWorkspace(
    base,
    {
      pages:
        current.currentPages,
      assets:
        current.currentAssets
    }
  );

  return {
    base,
    backup,
    current
  };
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
    'Expected restore to reject.'
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


function normalizeTestPath(
  path
) {

  return String(path || '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}
