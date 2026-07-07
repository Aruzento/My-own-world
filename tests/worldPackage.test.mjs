import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWorldPackageDependencyReport,
  createWorldPackageFromPages,
  createWorldPackageImportPreview,
  createSafeWorldPackageId,
  normalizeWorldPackageData,
  validateWorldPackageData
} from '../js/worldPackage/worldPackageModel.js';

import {
  createWorldPackagePath,
  listWorldPackageFiles,
  loadWorldPackageFile,
  removeWorldPackageFile,
  saveWorldPackageFile
} from '../js/worldPackage/worldPackageStorage.js';

import {
  validateWorkspaceSnapshot
} from '../js/schema/workspaceSchema.js';


test(
  'World Package normalizes selected pages into portable data',
  () => {

    const pkg =
      createWorldPackageFromPages(
        [
          {
            id: 'hero',
            title: 'Hero',
            parent: null,
            order: 2,
            template: 'card',
            type: 'character',
            tags: [
              'player'
            ],
            aliases: [
              'Olaf'
            ],
            body: '<h1>Hero</h1>'
          }
        ],
        {
          title: 'Starter Heroes',
          scope: 'character',
          metadata: {
            author: 'GM',
            tags: [
              'starter'
            ]
          }
        }
      );

    assert.equal(
      pkg.packageId,
      'starter-heroes'
    );

    assert.equal(
      pkg.scope,
      'character'
    );

    assert.equal(
      pkg.contents.pages[0].id,
      'hero'
    );

    assert.equal(
      pkg.contents.pages[0].body,
      '<h1>Hero</h1>'
    );

    assert.deepEqual(
      validateWorldPackageData(
        pkg
      ).errors,
      []
    );
  }
);


test(
  'World Package storage saves, lists, loads and removes package files',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const path =
      await saveWorldPackageFile(
        adapter,
        'Starter Heroes',
        normalizeWorldPackageData({
          packageId: 'Starter Heroes',
          title: 'Starter Heroes',
          contents: {
            pages: [
              {
                id: 'hero',
                title: 'Hero',
                body: '<h1>Hero</h1>'
              }
            ]
          }
        })
      );

    assert.equal(
      path,
      'world-packages/starter-heroes.world-package.json'
    );

    assert.deepEqual(
      await listWorldPackageFiles(
        adapter
      ),
      [
        {
          id: 'starter-heroes',
          name: 'starter-heroes.world-package.json',
          path: 'world-packages/starter-heroes.world-package.json'
        }
      ]
    );

    const loaded =
      await loadWorldPackageFile(
        adapter,
        'starter-heroes'
      );

    assert.equal(
      loaded.contents.pages[0].title,
      'Hero'
    );

    await removeWorldPackageFile(
      adapter,
      'starter-heroes'
    );

    assert.deepEqual(
      await listWorldPackageFiles(
        adapter
      ),
      []
    );
  }
);


test(
  'World Package import preview reports conflicts before workspace write',
  () => {

    const preview =
      createWorldPackageImportPreview({
        packageData: {
          packageId: 'starter',
          title: 'Starter',
          contents: {
            pages: [
              {
                id: 'hero',
                title: 'Hero'
              },
              {
                id: 'villain',
                title: 'Villain'
              }
            ],
            assets: [
              {
                path: 'assets/portraits/hero.png',
                type: 'portrait'
              }
            ]
          }
        },
        existingPages: [
          {
            id: 'hero',
            title: 'Old Hero'
          }
        ]
      });

    assert.equal(
      preview.requiresBackup,
      true
    );

    assert.equal(
      preview.counts.pages,
      2
    );

    assert.equal(
      preview.counts.conflicts,
      1
    );

    assert.deepEqual(
      preview.newPages.map(page => page.id),
      [
        'villain'
      ]
    );

    assert.equal(
      preview.conflicts.pages[0].reason,
      'id'
    );
  }
);


test(
  'World Package dependency report marks unresolved required packages',
  () => {

    const report =
      createWorldPackageDependencyReport({
        packageId: 'campaign',
        dependencies: [
          {
            packageId: 'core-rules',
            required: true,
            resolved: false
          },
          {
            packageId: 'optional-music',
            required: false,
            resolved: false
          }
        ]
      });

    assert.deepEqual(
      report.missingRequired.map(item => item.packageId),
      [
        'core-rules'
      ]
    );
  }
);


test(
  'Workspace schema validates embedded world packages',
  () => {

    const result =
      validateWorkspaceSnapshot({
        pages: [],
        worldPackages: [
          {
            packageId: 'starter',
            title: 'Starter',
            contents: {
              pages: [
                {
                  id: 'hero',
                  title: 'Hero'
                }
              ]
            }
          },
          {
            packageId: 'starter',
            title: 'Duplicate'
          }
        ]
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.errors[0].code,
      'worldPackages.duplicate_package_id'
    );
  }
);


test(
  'createWorldPackagePath keeps package paths workspace-relative',
  () => {

    assert.equal(
      createSafeWorldPackageId(
        '../Bad Package'
      ),
      'bad-package'
    );

    assert.equal(
      createWorldPackagePath(
        '../Bad Package'
      ),
      'world-packages/bad-package.world-package.json'
    );
  }
);


function createMemoryStorageAdapter() {

  const files =
    new Map();

  const directories =
    new Set([
      ''
    ]);

  return {
    async ensureDirectory(path) {

      directories.add(
        normalize(path)
      );
    },

    async writeText(path, content) {

      const normalized =
        normalize(path);

      directories.add(
        normalized.split('/').slice(0, -1).join('/')
      );

      files.set(
        normalized,
        String(content)
      );
    },

    async readText(path) {

      return files.get(
        normalize(path)
      );
    },

    async listFiles(path) {

      const prefix =
        `${normalize(path)}/`;

      return [...files.keys()]
        .filter(filePath =>
          filePath.startsWith(
            prefix
          )
        )
        .map(filePath => ({
          kind: 'file',
          name:
            filePath.slice(
              prefix.length
            )
        }));
    },

    async removeFile(path) {

      files.delete(
        normalize(path)
      );
    }
  };
}


function normalize(
  path
) {

  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replaceAll('..', '')
    .replace(/^-+|-+$/g, '');
}
