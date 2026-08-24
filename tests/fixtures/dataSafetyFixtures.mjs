import {
  createBackupManifest,
  BACKUP_ASSETS_DIR,
  BACKUP_PAGES_DIR,
  BACKUP_ROOT_DIR
} from '../../js/storage/backupService.js';

import {
  normalizeWorkspacePath
} from '../../js/storage/storageAdapterContract.js';

import {
  buildPageRecordContent
} from '../../js/core/pageRecord.js';


export const DATA_SAFETY_FIXTURE_CASES =
  Object.freeze({
    cleanWorkspace:
      'A.clean-workspace',
    changedAfterBackup:
      'B.changed-after-backup',
    backupWithPagesAndAssets:
      'C.backup-with-pages-and-assets',
    missingBackupPageFile:
      'D.missing-backup-page-file',
    missingBackupAsset:
      'E.missing-backup-asset',
    brokenInternalWikiLink:
      'F.broken-internal-wiki-link',
    brokenRelationshipTarget:
      'G.broken-relationship-target',
    brokenAssetReference:
      'H.broken-asset-reference',
    orphanAsset:
      'I.orphan-asset',
    malformedIncompleteBackup:
      'J.malformed-incomplete-backup'
  });

const FIXTURE_NOW =
  '2026-08-24T08:00:00.000Z';


export function createDataSafetyPage({
  id,
  title,
  parent = null,
  order = 1000,
  template = 'card',
  type = 'note',
  tags = [
    'card'
  ],
  aliases = [],
  relationships = [],
  body = ''
}) {

  const html =
    body ||
    `<h1>${escapeHTML(title || id)}</h1>`;

  const content =
    buildPageRecordContent({
      id,
      parent,
      order,
      tags,
      template,
      type,
      aliases,
      relationships,
      body:
        html,
      now:
        FIXTURE_NOW
    });

  return {
    id,
    title:
      title || id,
    parent,
    order,
    template,
    type,
    tags:
      [
        ...tags
      ],
    aliases:
      [
        ...aliases
      ],
    relationships:
      relationships.map(relationship => ({
        ...relationship
      })),
    name:
      `${id}.md`,
    path:
      `/pages/${id}.md`,
    body:
      html,
    content
  };
}


export function createCleanWorkspaceFixture() {

  const musicState =
    encodeURIComponent(
      JSON.stringify({
        normal: {
          tracks: [
            {
              trackId:
                'town-theme',
              path:
                'assets/music/town.mp3'
            }
          ]
        },
        battle: {
          tracks: []
        }
      })
    );

  const pages =
    [
      createDataSafetyPage({
        id:
          'world',
        title:
          'World',
        body:
          '<h1>World</h1><p>Clean root page.</p>'
      }),
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
        body:
          '<h1>Hero</h1><img data-asset="assets/portraits/hero.png">'
      }),
      createDataSafetyPage({
        id:
          'map',
        title:
          'Map',
        parent:
          'world',
        order:
          3000,
        template:
          'campaignMap',
        type:
          'campaignMap',
        tags:
          [
            'map'
          ],
        body:
          `<h1>Map</h1><section class="campaign-map-stage" data-map-asset="assets/maps/castle.png" data-map-music-state="${musicState}"></section>`
      })
    ];

  return {
    case:
      DATA_SAFETY_FIXTURE_CASES.cleanWorkspace,
    pages,
    assets:
      {
        'assets/portraits/hero.png':
          'hero-image',
        'assets/maps/castle.png':
          'castle-map',
        'assets/music/town.mp3':
          'town-music'
      },
    assetPaths:
      [
        'assets/portraits/hero.png',
        'assets/maps/castle.png',
        'assets/music/town.mp3'
      ]
  };
}


export function createChangedAfterBackupFixture() {

  const backup =
    createCleanWorkspaceFixture();

  const currentPages =
    backup.pages.map(page =>
      page.id === 'hero'
        ? createDataSafetyPage({
          ...page,
          body:
            '<h1>Hero</h1><p>Changed after backup.</p><img data-asset="assets/portraits/hero.png">'
        })
        : clonePage(
          page
        )
    );

  return {
    case:
      DATA_SAFETY_FIXTURE_CASES.changedAfterBackup,
    backupPages:
      backup.pages,
    currentPages,
    assetsBeforeBackup:
      backup.assets,
    currentAssets:
      {
        ...backup.assets,
        'assets/portraits/hero.png':
          'changed-hero-image'
      }
  };
}


export function createBackupWithPagesAndAssetsFixture() {

  return {
    case:
      DATA_SAFETY_FIXTURE_CASES.backupWithPagesAndAssets,
    ...createCleanWorkspaceFixture()
  };
}


export function createMissingBackupPageFileFixture() {

  const source =
    createCleanWorkspaceFixture();

  return {
    case:
      DATA_SAFETY_FIXTURE_CASES.missingBackupPageFile,
    backupId:
      'fixture-missing-page-file',
    pages:
      source.pages,
    assets:
      source.assets,
    missingPageNames:
      [
        source.pages[0].name
      ]
  };
}


export function createMissingBackupAssetFixture() {

  const source =
    createCleanWorkspaceFixture();

  return {
    case:
      DATA_SAFETY_FIXTURE_CASES.missingBackupAsset,
    backupId:
      'fixture-missing-asset',
    pages:
      source.pages,
    assets:
      source.assets,
    missingAssetPaths:
      [
        'assets/portraits/hero.png'
      ]
  };
}


export function createBrokenInternalWikiLinkFixture() {

  const pages =
    [
      createDataSafetyPage({
        id:
          'source',
        title:
          'Source',
        body:
          '<h1>Source</h1><a class="wiki-link internal-link is-missing" href="#" data-page-id="missing-page" data-page-title="Missing Page">Missing Page</a>'
      }),
      createDataSafetyPage({
        id:
          'target',
        title:
          'Existing Target',
        body:
          '<h1>Existing Target</h1>'
      })
    ];

  return {
    case:
      DATA_SAFETY_FIXTURE_CASES.brokenInternalWikiLink,
    pages,
    missingTargetId:
      'missing-page'
  };
}


export function createBrokenRelationshipTargetFixture() {

  const pages =
    [
      createDataSafetyPage({
        id:
          'hero',
        title:
          'Hero',
        type:
          'character',
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
          ],
        body:
          '<h1>Hero</h1>'
      })
    ];

  return {
    case:
      DATA_SAFETY_FIXTURE_CASES.brokenRelationshipTarget,
    pages,
    missingTargetId:
      'missing-ally'
  };
}


export function createAssetDiagnosticsFixture() {

  const pages =
    [
      createDataSafetyPage({
        id:
          'asset-source',
        title:
          'Asset Source',
        body:
          '<h1>Asset Source</h1><img data-asset="assets/portraits/used.png"><img data-asset="assets/portraits/missing.png">'
      })
    ];

  return {
    brokenCase:
      DATA_SAFETY_FIXTURE_CASES.brokenAssetReference,
    orphanCase:
      DATA_SAFETY_FIXTURE_CASES.orphanAsset,
    pages,
    assetPaths:
      [
        'assets/portraits/used.png',
        'assets/portraits/unused.png'
      ],
    assets:
      {
        'assets/portraits/used.png':
          'used-image',
        'assets/portraits/unused.png':
          'unused-image'
      }
  };
}


export async function createMalformedIncompleteBackupFixture(
  adapter,
  id = 'fixture-incomplete-backup'
) {

  await adapter.writeText(
    `${BACKUP_ROOT_DIR}/${id}/${BACKUP_PAGES_DIR}/partial.md`,
    'partial backup without manifest'
  );

  return {
    case:
      DATA_SAFETY_FIXTURE_CASES.malformedIncompleteBackup,
    id,
    path:
      `${BACKUP_ROOT_DIR}/${id}`
  };
}


export async function seedWorkspace(
  adapter,
  {
    pages = [],
    assets = {}
  } = {}
) {

  for (const page of pages) {

    await adapter.writeText(
      page.path,
      page.content
    );
  }

  for (const [path, content] of Object.entries(assets)) {

    await adapter.writeBinary(
      path,
      encodeFixtureBinary(
        content
      )
    );
  }
}


export async function seedBackupSnapshot(
  adapter,
  {
    id,
    reason = 'fixture',
    pages = [],
    assets = {},
    missingPageNames = [],
    missingAssetPaths = [],
    corruptManifest = false
  } = {}
) {

  const snapshotPath =
    `${BACKUP_ROOT_DIR}/${id}`;

  await adapter.ensureDirectory(
    `${snapshotPath}/${BACKUP_PAGES_DIR}`
  );

  await adapter.ensureDirectory(
    `${snapshotPath}/${BACKUP_ASSETS_DIR}`
  );

  if (corruptManifest) {

    await adapter.writeText(
      `${snapshotPath}/manifest.json`,
      '{broken manifest'
    );

    return;
  }

  const assetReferences =
    Object.keys(assets)
      .map(path => ({
        id:
          `fixture:${path}`,
        path,
        type:
          'image',
        owner: {
          pageId:
            pages[0]?.id || '',
          entityId:
            '',
          scope:
            'fixture'
        }
      }));

  const manifest =
    createBackupManifest({
      id,
      reason,
      pages,
      assetReferences,
      createdAt:
        FIXTURE_NOW
    });

  await adapter.writeText(
    `${snapshotPath}/manifest.json`,
    JSON.stringify(
      manifest,
      null,
      2
    )
  );

  const missingPages =
    new Set(
      missingPageNames
    );

  for (const page of pages) {

    if (
      missingPages.has(
        page.name
      )
    ) {

      continue;
    }

    await adapter.writeText(
      `${snapshotPath}/${BACKUP_PAGES_DIR}/${page.name}`,
      page.content
    );
  }

  const missingAssets =
    new Set(
      missingAssetPaths
    );

  for (const [path, content] of Object.entries(assets)) {

    if (
      missingAssets.has(
        path
      )
    ) {

      continue;
    }

    await adapter.writeBinary(
      `${snapshotPath}/${BACKUP_ASSETS_DIR}/${stripAssetsPrefix(path)}`,
      encodeFixtureBinary(
        content
      )
    );
  }
}


export function createMemoryWorkspaceAdapter({
  workspaceRoot = 'C:/mow-data-safety-fixture'
} = {}) {

  const files =
    new Map();

  const directories =
    new Set([
      ''
    ]);

  return {
    kind:
      'desktop',

    getWorkspaceRoot() {

      return workspaceRoot;
    },

    async pickWorkspace() {

      return workspaceRoot;
    },

    async restoreWorkspace() {

      return workspaceRoot;
    },

    async ensureDirectory(
      path
    ) {

      ensureDirectoryPath(
        directories,
        normalizeWorkspacePath(
          path
        )
      );
    },

    async readText(
      path
    ) {

      const value =
        files.get(
          normalizeWorkspacePath(
            path
          )
        );

      if (value === undefined) {

        throw new Error(
          `File not found: ${path}`
        );
      }

      return typeof value === 'string'
        ? value
        : new TextDecoder().decode(
          value
        );
    },

    async writeText(
      path,
      content
    ) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      ensureDirectoryPath(
        directories,
        getParentPath(
          normalized
        )
      );

      files.set(
        normalized,
        String(content)
      );
    },

    async readBinary(
      path
    ) {

      const value =
        files.get(
          normalizeWorkspacePath(
            path
          )
        );

      if (value === undefined) {

        throw new Error(
          `File not found: ${path}`
        );
      }

      return typeof value === 'string'
        ? new TextEncoder().encode(
          value
        ).buffer
        : value;
    },

    async writeBinary(
      path,
      content
    ) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      ensureDirectoryPath(
        directories,
        getParentPath(
          normalized
        )
      );

      files.set(
        normalized,
        content instanceof Uint8Array
          ? content.buffer.slice(
            content.byteOffset,
            content.byteOffset + content.byteLength
          )
          : content
      );
    },

    async listFiles(
      path = ''
    ) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      const prefix =
        normalized
          ? `${normalized}/`
          : '';

      const entries =
        new Map();

      for (const directory of directories) {

        if (!directory.startsWith(prefix)) continue;

        const rest =
          directory.slice(
            prefix.length
          );

        if (!rest || rest.includes('/')) continue;

        entries.set(
          rest,
          'directory'
        );
      }

      for (const filePath of files.keys()) {

        if (!filePath.startsWith(prefix)) continue;

        const rest =
          filePath.slice(
            prefix.length
          );

        if (!rest || rest.includes('/')) continue;

        entries.set(
          rest,
          'file'
        );
      }

      return [
        ...entries
      ].map(([name, kind]) => ({
        name,
        kind
      }));
    },

    async removeFile(
      path
    ) {

      files.delete(
        normalizeWorkspacePath(
          path
        )
      );
    },

    async removeDirectory(
      path
    ) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      for (const filePath of [
        ...files.keys()
      ]) {

        if (
          filePath === normalized ||
          filePath.startsWith(
            `${normalized}/`
          )
        ) {

          files.delete(
            filePath
          );
        }
      }

      for (const directory of [
        ...directories
      ]) {

        if (
          directory === normalized ||
          directory.startsWith(
            `${normalized}/`
          )
        ) {

          directories.delete(
            directory
          );
        }
      }
    },

    hasFile(
      path
    ) {

      return files.has(
        normalizeWorkspacePath(
          path
        )
      );
    },

    snapshotFiles() {

      return new Map(
        files
      );
    }
  };
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


function stripAssetsPrefix(
  path
) {

  return normalizeWorkspacePath(
    path
  ).replace(
    /^assets\//,
    ''
  );
}


function encodeFixtureBinary(
  value
) {

  if (value instanceof ArrayBuffer) return value;

  if (value instanceof Uint8Array) {

    return value.buffer.slice(
      value.byteOffset,
      value.byteOffset + value.byteLength
    );
  }

  return new TextEncoder()
    .encode(
      String(value)
    )
    .buffer;
}


function ensureDirectoryPath(
  directories,
  path
) {

  const parts =
    normalizeWorkspacePath(
      path
    )
      .split('/')
      .filter(Boolean);

  let current =
    '';

  for (const part of parts) {

    current =
      current
        ? `${current}/${part}`
        : part;

    directories.add(
      current
    );
  }
}


function getParentPath(
  path
) {

  const parts =
    normalizeWorkspacePath(
      path
    )
      .split('/');

  parts.pop();

  return parts.join('/');
}


function escapeHTML(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
