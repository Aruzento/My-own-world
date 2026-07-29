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
  applyWorldPackagePageImport
} from '../js/worldPackage/worldPackageImportService.js';

import {
  state
} from '../js/state.js';

import {
  setPages
} from '../js/stateActions.js';

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
  'World Package export normalizes runtime page content to body only',
  () => {

    const pkg =
      createWorldPackageFromPages(
        [
          {
            id:
              'runtime-page',
            title:
              'Runtime Page',
            content:
              [
                '---',
                'id: runtime-page',
                'parent: null',
                'tags: card',
                'template: card',
                'type: note',
                '---',
                '',
                '<h1>Runtime Page</h1>'
              ].join('\n')
          }
        ],
        {
          title:
            'Runtime Export'
        }
      );

    assert.equal(
      pkg.contents.pages[0].body,
      '<h1>Runtime Page</h1>'
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
  'World Package page import requires backup and writes page records',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setPages(
      []
    );

    const packageData =
      createWorldPackageFromPages(
        [
          {
            id:
              'imported-page',
            title:
              'Imported Page',
            parent:
              null,
            body:
              '<h1>Imported Page</h1>'
          }
        ],
        {
          title:
            'Importable'
        }
      );

    await assert.rejects(
      () => applyWorldPackagePageImport({
        packageData,
        storageAdapter:
          adapter
      }),
      /backup manifest/
    );

    const result =
      await applyWorldPackagePageImport({
        packageData,
        backupManifest: {
          id:
            'backup-1'
        },
        storageAdapter:
          adapter
      });

    assert.equal(
      result.importedPages,
      1
    );

    assert.equal(
      state.pages[0].id,
      'imported-page'
    );

    const content =
      await adapter.readText(
        result.paths[0]
      );

    assert.match(
      content,
      /id: imported-page/
    );

    assert.match(
      content,
      /<h1>Imported Page<\/h1>/
    );
  }
);


test(
  'World Package page import skips conflicts without losing new children',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setPages([
      {
        id:
          'root',
        title:
          'Root',
        parent:
          null
      }
    ]);

    const packageData =
      createWorldPackageFromPages(
        [
          {
            id:
              'root',
            title:
              'Root',
            parent:
              null,
            body:
              '<h1>Root</h1>'
          },
          {
            id:
              'new-child',
            title:
              'New Child',
            parent:
              'root',
            body:
              '<h1>New Child</h1>'
          }
        ],
        {
          title:
            'Skip Conflicts'
        }
      );

    await assert.rejects(
      () => applyWorldPackagePageImport({
        packageData,
        backupManifest: {
          id:
            'backup-block'
        },
        storageAdapter:
          adapter
      }),
      /conflicts/
    );

    const result =
      await applyWorldPackagePageImport({
        packageData,
        backupManifest: {
          id:
            'backup-skip'
        },
        storageAdapter:
          adapter,
        conflictStrategy:
          'skip'
      });

    assert.equal(
      result.importedPages,
      1
    );

    assert.equal(
      result.skippedPages,
      1
    );

    assert.equal(
      state.pages.find(page => page.id === 'new-child').parent,
      'root'
    );

    const content =
      await adapter.readText(
        result.paths[0]
      );

    assert.match(
      content,
      /id: new-child/
    );

    assert.match(
      content,
      /parent: root/
    );
  }
);


test(
  'World Package page import copies conflicts and rewires imported children',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setPages([
      {
        id:
          'root',
        title:
          'Root',
        parent:
          null
      }
    ]);

    const packageData =
      createWorldPackageFromPages(
        [
          {
            id:
              'root',
            title:
              'Root',
            parent:
              null,
            body:
              '<h1>Root</h1><p>Package root.</p>'
          },
          {
            id:
              'copied-child',
            title:
              'Copied Child',
            parent:
              'root',
            body:
              '<h1>Copied Child</h1>'
          }
        ],
        {
          title:
            'Copy Conflicts'
        }
      );

    const result =
      await applyWorldPackagePageImport({
        packageData,
        backupManifest: {
          id:
            'backup-copy'
        },
        storageAdapter:
          adapter,
        conflictStrategy:
          'copy'
      });

    assert.equal(
      result.importedPages,
      2
    );

    assert.equal(
      result.copiedPages,
      1
    );

    assert.equal(
      result.renamedPages,
      1
    );

    const copiedRoot =
      state.pages.find(page =>
        page.id === 'root-import'
      );

    assert.equal(
      copiedRoot.title,
      'Root (import)'
    );

    assert.equal(
      state.pages.find(page => page.id === 'copied-child').parent,
      'root-import'
    );

    const copiedRootContent =
      await adapter.readText(
        result.paths[0]
      );

    assert.match(
      copiedRootContent,
      /id: root-import/
    );

    assert.match(
      copiedRootContent,
      /<h1>Root \(import\)<\/h1>/
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
