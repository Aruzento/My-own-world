import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  restoreWorkspaceBackupSelection
} from '../js/storage/backupService.js';

import {
  state
} from '../js/state.js';

import {
  createChangedAfterBackupFixture,
  createCleanWorkspaceFixture,
  createDataSafetyPage,
  createMemoryWorkspaceAdapter,
  seedBackupSnapshot,
  seedWorkspace
} from './fixtures/dataSafetyFixtures.mjs';


test(
  'partial restore writes only selected page and its clearly referenced asset',
  async () => {

    const adapter =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    const changed =
      createChangedAfterBackupFixture();

    const currentWorld =
      createDataSafetyPage({
        id:
          'world',
        title:
          'World',
        body:
          '<h1>World</h1><p>Unselected current world.</p>'
      });

    const currentHero =
      changed.currentPages.find(page =>
        page.id === 'hero'
      );

    const currentMap =
      createDataSafetyPage({
        ...backup.pages.find(page =>
          page.id === 'map'
        ),
        body:
          '<h1>Map</h1><section class="campaign-map-stage" data-map-asset="assets/maps/castle.png"></section><p>Current map stays.</p>'
      });

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'partial-source',
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
            currentHero,
            currentMap
          ],
        assets: {
          'assets/portraits/hero.png':
            'changed-hero-image',
          'assets/maps/castle.png':
            'changed-castle-map',
          'assets/music/town.mp3':
            'changed-town-music'
        }
      }
    );

    state.pages =
      [
        currentWorld,
        currentHero,
        currentMap
      ];

    try {

      const result =
        await restoreWorkspaceBackupSelection(
          'partial-source',
          {
            pageNames:
              [
                'hero.md'
              ]
          },
          adapter,
          {
            preRestoreBackupId:
              'pre-partial-success'
          }
        );

      assert.equal(
        result.restoredPages,
        1
      );

      assert.equal(
        result.restoredAssets,
        1
      );

      assert.deepEqual(
        result.selectedPageNames,
        [
          'hero.md'
        ]
      );

      assert.equal(
        await adapter.readText('pages/hero.md'),
        backup.pages.find(page => page.id === 'hero').content
      );

      assert.equal(
        await adapter.readText('pages/world.md'),
        currentWorld.content
      );

      assert.equal(
        await adapter.readText('pages/map.md'),
        currentMap.content
      );

      assert.equal(
        await readTextAsset(
          adapter,
          'assets/portraits/hero.png'
        ),
        'hero-image'
      );

      assert.equal(
        await readTextAsset(
          adapter,
          'assets/maps/castle.png'
        ),
        'changed-castle-map'
      );

      assert.equal(
        await readTextAsset(
          adapter,
          'assets/music/town.mp3'
        ),
        'changed-town-music'
      );

      assert.equal(
        await adapter.readText(
          '.my-own-world-backups/pre-partial-success/pages/hero.md'
        ),
        currentHero.content
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'partial restore pre-restore backup failure blocks page writes',
  async () => {

    const base =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    const changed =
      createChangedAfterBackupFixture();

    const currentHero =
      changed.currentPages.find(page =>
        page.id === 'hero'
      );

    await seedBackupSnapshot(
      base,
      {
        id:
          'partial-prebackup-source',
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
          changed.currentPages,
        assets:
          changed.currentAssets
      }
    );

    const writes =
      [];

    let armed =
      false;

    const adapter =
      {
        ...base,

        async ensureDirectory(path) {

          if (
            armed &&
            String(path).includes(
              'pre-partial-failure'
            )
          ) {

            throw new Error(
              'pre-restore backup failed'
            );
          }

          return base.ensureDirectory(
            path
          );
        },

        async writeText(path, content) {

          if (
            armed &&
            normalizeTestPath(path) === 'pages/hero.md'
          ) {

            writes.push(
              content
            );
          }

          return base.writeText(
            path,
            content
          );
        }
      };

    state.pages =
      changed.currentPages;

    armed =
      true;

    try {

      await assert.rejects(
        () => restoreWorkspaceBackupSelection(
          'partial-prebackup-source',
          {
            pageNames:
              [
                'hero.md'
              ]
          },
          adapter,
          {
            preRestoreBackupId:
              'pre-partial-failure'
          }
        ),
        /pre-restore|backup/i
      );

      assert.deepEqual(
        writes,
        []
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        currentHero.content
      );

    } finally {

      state.pages =
        [];
    }
  }
);


test(
  'partial restore missing selected source blocks before safety backup and workspace writes',
  async () => {

    const base =
      createMemoryWorkspaceAdapter();

    const backup =
      createCleanWorkspaceFixture();

    const changed =
      createChangedAfterBackupFixture();

    const currentHero =
      changed.currentPages.find(page =>
        page.id === 'hero'
      );

    await seedBackupSnapshot(
      base,
      {
        id:
          'partial-missing-source',
        pages:
          backup.pages,
        assets:
          backup.assets,
        missingPageNames:
          [
            'hero.md'
          ]
      }
    );

    await seedWorkspace(
      base,
      {
        pages:
          changed.currentPages,
        assets:
          changed.currentAssets
      }
    );

    const writes =
      [];

    let armed =
      false;

    const adapter =
      {
        ...base,

        async ensureDirectory(path) {

          if (
            armed &&
            String(path).includes(
              'pre-partial-missing'
            )
          ) {

            writes.push(
              `ensure:${normalizeTestPath(path)}`
            );
          }

          return base.ensureDirectory(
            path
          );
        },

        async writeText(path, content) {

          if (armed) {

            writes.push(
              `write:${normalizeTestPath(path)}`
            );
          }

          return base.writeText(
            path,
            content
          );
        }
      };

    state.pages =
      changed.currentPages;

    armed =
      true;

    try {

      await assert.rejects(
        () => restoreWorkspaceBackupSelection(
          'partial-missing-source',
          {
            pageNames:
              [
                'hero.md'
              ]
          },
          adapter,
          {
            preRestoreBackupId:
              'pre-partial-missing'
          }
        ),
        /Manifest|backup|missing|поврежден|неполный/i
      );

      assert.equal(
        await base.readText('pages/hero.md'),
        currentHero.content
      );

      assert.equal(
        base.hasFile(
          '.my-own-world-backups/pre-partial-missing/manifest.json'
        ),
        false
      );

      assert.deepEqual(
        writes,
        []
      );

    } finally {

      state.pages =
        [];
    }
  }
);


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
