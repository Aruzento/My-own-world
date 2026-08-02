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
  applyWorldPackagePageImport,
  createWorldPackageAssetImportPlan,
  createWorldPackageAssetImportReport,
  createWorldPackageAssetPayloadExportReport
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
  'World Package import applies embedded rule packages without overwriting existing files',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setPages(
      []
    );

    await adapter.writeText(
      'rule-packages/core-rules.rule-package.json',
      JSON.stringify(
        {
          version:
            1,
          activeRuleIds:
            [
              'old-rule'
            ],
          rules:
            [
              {
                id:
                  'old-rule',
                title:
                  'Old Rule'
              }
            ]
        },
        null,
        2
      )
    );

    const packageData =
      normalizeWorldPackageData({
        packageId:
          'rules-import',
        title:
          'Rules Import',
        contents: {
          pages:
            [],
          rulePackages:
            [
              {
                packageId:
                  'core-rules',
                title:
                  'Core Rules',
                data: {
                  version:
                    1,
                  activeRuleIds:
                    [
                      'new-rule'
                    ],
                  rules:
                    [
                      {
                        id:
                          'new-rule',
                        title:
                          'New Rule'
                      }
                    ]
                }
              }
            ]
        }
      });

    const result =
      await applyWorldPackagePageImport({
        packageData,
        backupManifest: {
          id:
            'backup-rules'
        },
        storageAdapter:
          adapter
      });

    assert.equal(
      result.importedPages,
      0
    );

    assert.equal(
      result.importedRulePackages,
      1
    );

    assert.equal(
      result.copiedRulePackages,
      1
    );

    assert.deepEqual(
      result.rulePackagePaths,
      [
        'rule-packages/core-rules-import.rule-package.json'
      ]
    );

    const oldContent =
      await adapter.readText(
        'rule-packages/core-rules.rule-package.json'
      );

    const importedContent =
      await adapter.readText(
        result.rulePackagePaths[0]
      );

    assert.match(
      oldContent,
      /old-rule/
    );

    assert.doesNotMatch(
      oldContent,
      /new-rule/
    );

    assert.match(
      importedContent,
      /new-rule/
    );
  }
);


test(
  'World Package import validates asset references before writing pages',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setPages(
      []
    );

    await adapter.writeBinary(
      'assets/portraits/hero.png',
      new TextEncoder()
        .encode(
          'image-bytes'
        )
        .buffer
    );

    const report =
      await createWorldPackageAssetImportReport({
        storageAdapter:
          adapter,
        packageData: {
          packageId:
            'asset-report',
          contents: {
            assets:
              [
                {
                  path:
                    'assets/portraits/hero.png',
                  required:
                    true
                },
                {
                  path:
                    'assets/portraits/optional.png',
                  required:
                    false
                }
              ]
          }
        }
      });

    assert.equal(
      report.ok,
      true
    );

    assert.equal(
      report.available.length,
      1
    );

    assert.equal(
      report.missingOptional.length,
      1
    );

    const requiredMissingPackage =
      normalizeWorldPackageData({
        packageId:
          'required-asset',
        title:
          'Required Asset',
        contents: {
          pages:
            [
              {
                id:
                  'asset-page',
                title:
                  'Asset Page',
                body:
                  '<h1>Asset Page</h1>'
              }
            ],
          assets:
            [
              {
                path:
                  'assets/maps/missing.png',
                required:
                  true
              }
            ]
        }
      });

    await assert.rejects(
      () => applyWorldPackagePageImport({
        packageData:
          requiredMissingPackage,
        backupManifest: {
          id:
            'backup-asset-block'
        },
        storageAdapter:
          adapter
      }),
      /required assets are missing/
    );

    assert.equal(
      state.pages.length,
      0
    );

    const optionalMissingPackage =
      normalizeWorldPackageData({
        packageId:
          'optional-asset',
        title:
          'Optional Asset',
        contents: {
          pages:
            [
              {
                id:
                  'optional-asset-page',
                title:
                  'Optional Asset Page',
                body:
                  '<h1>Optional Asset Page</h1>'
              }
            ],
          assets:
            [
              {
                path:
                  'assets/maps/optional-missing.png',
                required:
                  false
              }
            ]
        }
      });

    const result =
      await applyWorldPackagePageImport({
        packageData:
          optionalMissingPackage,
        backupManifest: {
          id:
            'backup-asset-optional'
        },
        storageAdapter:
          adapter
      });

    assert.equal(
      result.importedPages,
      1
    );

    assert.equal(
      result.validatedAssets,
      0
    );

    assert.equal(
      result.missingOptionalAssets,
      1
    );
  }
);


test(
  'World Package export embeds readable asset payloads and reports missing files',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    await adapter.writeBinary(
      'assets/portraits/hero.png',
      new TextEncoder()
        .encode(
          'portrait-bytes'
        )
        .buffer
    );

    const pages =
      [
        {
          id:
            'asset-page',
          title:
            'Asset Page',
          body:
            '<h1>Asset Page</h1><img data-asset="portraits/hero.png"><img data-asset="portraits/missing.png">'
        }
      ];

    const report =
      await createWorldPackageAssetPayloadExportReport({
        pages,
        storageAdapter:
          adapter
      });

    assert.equal(
      report.total,
      2
    );

    assert.equal(
      report.embedded.length,
      1
    );

    assert.equal(
      report.missing.length,
      1
    );

    assert.equal(
      report.assets[0].path,
      'portraits/hero.png'
    );

    assert.equal(
      Buffer.from(
        report.assets[0].payload.bytes,
        'base64'
      )
        .toString(
          'utf8'
        ),
      'portrait-bytes'
    );

    assert.equal(
      report.assets[1].payload,
      null
    );

    const pkg =
      createWorldPackageFromPages(
        pages,
        {
          title:
            'Asset Payload Package',
          assets:
            report.assets
        }
      );

    assert.equal(
      pkg.contents.assets[0].payload.encoding,
      'base64'
    );
  }
);


test(
  'World Package import copies asset payloads without overwriting and rewrites page references',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setPages(
      []
    );

    await adapter.writeBinary(
      'assets/portraits/hero.png',
      new TextEncoder()
        .encode(
          'old-image'
        )
        .buffer
    );

    const packageData =
      createWorldPackageFromPages(
        [
          {
            id:
              'asset-page',
            title:
              'Asset Page',
            parent:
              null,
            body:
              '<h1>Asset Page</h1><img data-asset="portraits/hero.png">'
          }
        ],
        {
          title:
            'Asset Import',
          assets:
            [
              {
                path:
                  'portraits/hero.png',
                type:
                  'portrait',
                payload: {
                  encoding:
                    'base64',
                  mediaType:
                    'image/png',
                  bytes:
                    Buffer.from(
                      'new-image'
                    )
                      .toString(
                        'base64'
                      )
                }
              }
            ]
        }
      );

    const plan =
      await createWorldPackageAssetImportPlan({
        packageData,
        storageAdapter:
          adapter
      });

    assert.equal(
      plan.assetsToImport.length,
      1
    );

    assert.equal(
      plan.copiedAssets.length,
      1
    );

    assert.equal(
      plan.rewrittenAssets[0].finalPath,
      'portraits/hero-import.png'
    );

    const result =
      await applyWorldPackagePageImport({
        packageData,
        backupManifest: {
          id:
            'backup-assets'
        },
        storageAdapter:
          adapter
      });

    assert.equal(
      result.importedPages,
      1
    );

    assert.equal(
      result.importedAssets,
      1
    );

    assert.equal(
      result.copiedAssets,
      1
    );

    assert.deepEqual(
      result.assetPaths,
      [
        'assets/portraits/hero-import.png'
      ]
    );

    const originalBytes =
      new TextDecoder()
        .decode(
          await adapter.readBinary(
            'assets/portraits/hero.png'
          )
        );

    const importedBytes =
      new TextDecoder()
        .decode(
          await adapter.readBinary(
            result.assetPaths[0]
          )
        );

    assert.equal(
      originalBytes,
      'old-image'
    );

    assert.equal(
      importedBytes,
      'new-image'
    );

    const importedPageContent =
      await adapter.readText(
        result.paths[0]
      );

    assert.match(
      importedPageContent,
      /data-asset="portraits\/hero-import\.png"/
    );

    assert.doesNotMatch(
      importedPageContent,
      /data-asset="portraits\/hero\.png"/
    );
  }
);


test(
  'World Package import can apply an asset-only payload package after backup',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    setPages(
      []
    );

    const packageData =
      normalizeWorldPackageData({
        packageId:
          'asset-only',
        title:
          'Asset Only',
        contents: {
          pages:
            [],
          assets:
            [
              {
                path:
                  'maps/keep.png',
                type:
                  'mapBackground',
                payload: {
                  encoding:
                    'base64',
                  mediaType:
                    'image/png',
                  bytes:
                    Buffer.from(
                      'map-bytes'
                    )
                      .toString(
                        'base64'
                      )
                }
              }
            ],
          rulePackages:
            []
        }
      });

    const result =
      await applyWorldPackagePageImport({
        packageData,
        backupManifest: {
          id:
            'backup-asset-only'
        },
        storageAdapter:
          adapter
      });

    assert.equal(
      result.importedPages,
      0
    );

    assert.equal(
      result.importedAssets,
      1
    );

    assert.equal(
      new TextDecoder()
        .decode(
          await adapter.readBinary(
            'assets/maps/keep.png'
          )
        ),
      'map-bytes'
    );
  }
);


test(
  'World Package import blocks unsafe asset payload paths before writing pages',
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
              'unsafe-page',
            title:
              'Unsafe Page',
            parent:
              null,
            body:
              '<h1>Unsafe Page</h1><img data-asset="../pages/hack.md">'
          }
        ],
        {
          title:
            'Unsafe Asset',
          assets:
            [
              {
                path:
                  '../pages/hack.md',
                type:
                  'image',
                payload: {
                  encoding:
                    'base64',
                  mediaType:
                    'text/plain',
                  bytes:
                    Buffer.from(
                      'hack'
                    )
                      .toString(
                        'base64'
                      )
                }
              }
            ]
        }
      );

    const report =
      await createWorldPackageAssetImportReport({
        packageData,
        storageAdapter:
          adapter
      });

    assert.equal(
      report.ok,
      false
    );

    await assert.rejects(
      () => applyWorldPackagePageImport({
        packageData,
        backupManifest: {
          id:
            'backup-unsafe-asset'
        },
        storageAdapter:
          adapter
      }),
      /required assets are missing/
    );

    assert.equal(
      state.pages.length,
      0
    );
  }
);


test(
  'World Package import blocks invalid asset payload bytes before writing pages',
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
              'invalid-payload-page',
            title:
              'Invalid Payload Page',
            parent:
              null,
            body:
              '<h1>Invalid Payload Page</h1><img data-asset="portraits/broken.png">'
          }
        ],
        {
          title:
            'Invalid Payload',
          assets:
            [
              {
                path:
                  'portraits/broken.png',
                type:
                  'portrait',
                payload: {
                  encoding:
                    'base64',
                  mediaType:
                    'image/png',
                  bytes:
                    'not base64?'
                }
              }
            ]
        }
      );

    const report =
      await createWorldPackageAssetImportReport({
        packageData,
        storageAdapter:
          adapter
      });

    assert.equal(
      report.ok,
      false
    );

    assert.equal(
      report.missingRequired.length,
      1
    );

    await assert.rejects(
      () => applyWorldPackagePageImport({
        packageData,
        backupManifest: {
          id:
            'backup-invalid-payload'
        },
        storageAdapter:
          adapter
      }),
      /required assets are missing/
    );

    assert.equal(
      state.pages.length,
      0
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

    async readBinary(path) {

      const normalized =
        normalize(path);

      if (!files.has(normalized)) {

        throw new Error(
          `Missing file ${normalized}`
        );
      }

      const content =
        files.get(
          normalized
        );

      if (content instanceof ArrayBuffer) {

        return content;
      }

      if (ArrayBuffer.isView(content)) {

        return content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength
        );
      }

      return new TextEncoder()
        .encode(
          String(content)
        )
        .buffer;
    },

    async writeBinary(path, content) {

      const normalized =
        normalize(path);

      directories.add(
        normalized.split('/').slice(0, -1).join('/')
      );

      files.set(
        normalized,
        content
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
    },

    async removeDirectory(path) {

      const normalized =
        normalize(path);

      [...files.keys()]
        .filter(filePath =>
          filePath.startsWith(
            `${normalized}/`
          )
        )
        .forEach(filePath =>
          files.delete(
            filePath
          )
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
