import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BACKUP_MANIFEST_VALIDATION_STATUS,
  restoreWorkspaceBackup,
  validateWorkspaceBackupManifest
} from '../js/storage/backupService.js';

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
  'backup manifest validation accepts a valid v1 backup',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'valid-v1-backup',
        pages:
          backup.pages,
        assets:
          backup.assets
      }
    );

    const validation =
      await validateWorkspaceBackupManifest(
        'valid-v1-backup',
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      validation.status,
      BACKUP_MANIFEST_VALIDATION_STATUS.VALID
    );

    assert.equal(
      validation.restoreBlocking,
      false
    );

    assert.equal(
      validation.manifest.version,
      1
    );
  }
);


test(
  'backup manifest validation blocks malformed JSON without raw stack details',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'malformed-manifest',
        pages:
          [
            createDataSafetyPage({
              id:
                'page'
            })
          ],
        corruptManifest:
          true
      }
    );

    const validation =
      await validateWorkspaceBackupManifest(
        'malformed-manifest',
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      validation.status,
      BACKUP_MANIFEST_VALIDATION_STATUS.INVALID
    );

    assert.equal(
      validation.restoreBlocking,
      true
    );

    assert.deepEqual(
      validation.issues.map(issue => issue.code),
      [
        'manifest-json-malformed'
      ]
    );

    assert.match(
      validation.issues[0].message,
      /JSON/i
    );

    assert.doesNotMatch(
      validation.issues[0].message,
      /SyntaxError|at /i
    );
  }
);


test(
  'backup manifest validation blocks wrong page count',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'wrong-page-count',
        pages:
          backup.pages,
        assets:
          backup.assets
      }
    );

    const manifest =
      JSON.parse(
        await adapter.readText(
          '.my-own-world-backups/wrong-page-count/manifest.json'
        )
      );

    manifest.pageCount =
      manifest.pages.length + 1;

    await adapter.writeText(
      '.my-own-world-backups/wrong-page-count/manifest.json',
      JSON.stringify(
        manifest,
        null,
        2
      )
    );

    const validation =
      await validateWorkspaceBackupManifest(
        'wrong-page-count',
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      validation.status,
      BACKUP_MANIFEST_VALIDATION_STATUS.INVALID
    );

    assert.ok(
      validation.issues.some(issue =>
        issue.code === 'manifest-page-count-mismatch'
      )
    );
  }
);


test(
  'backup manifest validation blocks wrong asset count',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'wrong-asset-count',
        pages:
          backup.pages,
        assets:
          backup.assets
      }
    );

    const manifest =
      JSON.parse(
        await adapter.readText(
          '.my-own-world-backups/wrong-asset-count/manifest.json'
        )
      );

    manifest.assetCount =
      manifest.assets.length + 1;

    await adapter.writeText(
      '.my-own-world-backups/wrong-asset-count/manifest.json',
      JSON.stringify(
        manifest,
        null,
        2
      )
    );

    const validation =
      await validateWorkspaceBackupManifest(
        'wrong-asset-count',
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      validation.status,
      BACKUP_MANIFEST_VALIDATION_STATUS.INVALID
    );

    assert.ok(
      validation.issues.some(issue =>
        issue.code === 'manifest-asset-count-invalid'
      )
    );
  }
);


test(
  'backup manifest validation blocks missing backup page file',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const fixture =
      createMissingBackupPageFileFixture();

    await seedBackupSnapshot(
      adapter,
      {
        ...fixture,
        id:
          fixture.backupId
      }
    );

    const validation =
      await validateWorkspaceBackupManifest(
        fixture.backupId,
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      validation.status,
      BACKUP_MANIFEST_VALIDATION_STATUS.INVALID
    );

    assert.ok(
      validation.issues.some(issue =>
        issue.code === 'page-backup-file-missing'
      )
    );
  }
);


test(
  'backup manifest validation blocks unsafe page filenames',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    await adapter.ensureDirectory(
      '.my-own-world-backups/unsafe-page-name/pages'
    );

    await adapter.ensureDirectory(
      '.my-own-world-backups/unsafe-page-name/assets'
    );

    await adapter.writeText(
      '.my-own-world-backups/unsafe-page-name/manifest.json',
      JSON.stringify(
        {
          version:
            1,
          id:
            'unsafe-page-name',
          reason:
            'fixture',
          createdAt:
            '2026-08-24T00:00:00.000Z',
          pageCount:
            1,
          assetCount:
            0,
          pages:
            [
              {
                id:
                  'unsafe',
                title:
                  'Unsafe',
                name:
                  '../unsafe.md',
                path:
                  '/pages/unsafe.md'
              }
            ],
          assets:
            []
        },
        null,
        2
      )
    );

    const validation =
      await validateWorkspaceBackupManifest(
        'unsafe-page-name',
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      validation.status,
      BACKUP_MANIFEST_VALIDATION_STATUS.INVALID
    );

    assert.ok(
      validation.issues.some(issue =>
        issue.code === 'page-name-unsafe'
      )
    );
  }
);


test(
  'backup manifest validation blocks missing expected backup asset',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const fixture =
      createMissingBackupAssetFixture();

    await seedBackupSnapshot(
      adapter,
      {
        ...fixture,
        id:
          fixture.backupId
      }
    );

    const validation =
      await validateWorkspaceBackupManifest(
        fixture.backupId,
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      validation.status,
      BACKUP_MANIFEST_VALIDATION_STATUS.INVALID
    );

    assert.ok(
      validation.issues.some(issue =>
        issue.code === 'asset-backup-file-missing'
      )
    );
  }
);


test(
  'backup manifest validation keeps partial v1 asset backups as warning-compatible',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'partial-v1-assets',
        pages:
          backup.pages,
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
        await adapter.readText(
          '.my-own-world-backups/partial-v1-assets/manifest.json'
        )
      );

    manifest.assetCount =
      manifest.assets.length - 1;

    await adapter.writeText(
      '.my-own-world-backups/partial-v1-assets/manifest.json',
      JSON.stringify(
        manifest,
        null,
        2
      )
    );

    const validation =
      await validateWorkspaceBackupManifest(
        'partial-v1-assets',
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      validation.status,
      BACKUP_MANIFEST_VALIDATION_STATUS.WARNING
    );

    assert.equal(
      validation.restoreBlocking,
      false
    );
  }
);


test(
  'restore blocks invalid manifest before pre-restore backup writes',
  async () => {

    const baseAdapter =
      createMemoryWorkspaceAdapter();

    const fixture =
      createMissingBackupPageFileFixture();

    const current =
      createChangedAfterBackupFixture();

    await seedBackupSnapshot(
      baseAdapter,
      {
        ...fixture,
        id:
          fixture.backupId
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

    const writes =
      [];

    const adapter =
      {
        ...baseAdapter,
        async writeText(
          path,
          content
        ) {

          writes.push(
            String(path)
          );

          return baseAdapter.writeText(
            path,
            content
          );
        },
        async writeBinary(
          path,
          content
        ) {

          writes.push(
            String(path)
          );

          return baseAdapter.writeBinary(
            path,
            content
          );
        }
      };

    await assert.rejects(
      () => restoreWorkspaceBackup(
        fixture.backupId,
        adapter
      ),
      /Restore blocked/
    );

    assert.deepEqual(
      writes,
      []
    );
  }
);
