import {
  clearPageCommandEvents,
  clearPageUndoEntries
} from '../../js/storage/pageCommandService.js';

import {
  setStorageAdapter
} from '../../js/storage/storageAdapter.js';

import {
  normalizeWorkspacePath
} from '../../js/storage/storageAdapterContract.js';

import {
  clearWriteRevisions
} from '../../js/storage/writeQueue.js';

import {
  buildPageRecordContent,
  parsePageRecordContent,
  updatePageRecordContent
} from '../../js/core/pageRecord.js';

import {
  setPages
} from '../../js/stateActions.js';


export async function createEditConflictFixture(
  options = {}
) {

  clearPageCommandEvents();
  clearPageUndoEntries();
  clearWriteRevisions();

  const adapter =
    createMemoryStorageAdapter();

  setStorageAdapter(
    adapter
  );

  const page =
    createRuntimePage({
      id:
        options.id || 'edit-conflict-page',
      title:
        options.title || 'Conflict Page',
      body:
        options.body || '<h1>Conflict Page</h1>\n<p>base body</p>',
      tags:
        options.tags || ['card', 'base-tag'],
      aliases:
        options.aliases || [],
      type:
        options.type || 'note',
      template:
        options.template || 'card',
      parent:
        options.parent ?? null,
      order:
        options.order ?? 1000
    });

  await adapter.writeText(
    page.path,
    page.content
  );

  setPages([
    page
  ]);

  return {
    adapter,
    page,
    originalContent:
      page.content
  };
}


export function createRuntimePage({
  id,
  title,
  body,
  parent = null,
  order = 1000,
  tags = ['card'],
  template = 'card',
  type = 'note',
  aliases = [],
  relationships = []
} = {}) {

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
        body || `<h1>${title || id}</h1>`
    });

  const parsed =
    parsePageRecordContent(
      content
    );

  return {
    id:
      parsed.id,
    path:
      `/pages/${parsed.id}.md`,
    name:
      `${parsed.id}.md`,
    parent:
      parsed.parent,
    order:
      parsed.order,
    title:
      parsed.title,
    type:
      parsed.type,
    template:
      parsed.template,
    tags:
      parsed.tags,
    aliases:
      parsed.aliases,
    relationships:
      parsed.relationships,
    content
  };
}


export function updateFixtureContent(
  content,
  patch = {}
) {

  return updatePageRecordContent(
    content,
    patch,
    {
      now:
        '2026-08-24T00:00:00.000Z'
    }
  );
}


export function parseFixtureContent(
  content
) {

  return parsePageRecordContent(
    content
  );
}


export function createMemoryStorageAdapter() {

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

      return 'memory-edit-conflict-baseline';
    },

    async pickWorkspace() {

      return 'memory-edit-conflict-baseline';
    },

    async restoreWorkspace() {

      return 'memory-edit-conflict-baseline';
    },

    async ensureDirectory(path) {

      ensureDirectoryPath(
        directories,
        normalizeWorkspacePath(
          path
        )
      );
    },

    async getDirectoryHandle(path) {

      return {
        kind:
          'directory',
        path:
          normalizeWorkspacePath(
            path
          )
      };
    },

    async readText(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      if (!files.has(normalized)) {

        throw new Error(
          `missing ${path}`
        );
      }

      return files.get(
        normalized
      );
    },

    async writeText(path, content) {

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

    async readBinary() {

      return new ArrayBuffer(0);
    },

    async writeBinary(path, content) {

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
        content
      );
    },

    async listFiles(path = '') {

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

      return [...entries].map(([name, kind]) => ({
        name,
        kind
      }));
    },

    async removeFile(path) {

      files.delete(
        normalizeWorkspacePath(
          path
        )
      );
    },

    async removeDirectory(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      for (const filePath of [...files.keys()]) {

        if (
          filePath === normalized ||
          filePath.startsWith(`${normalized}/`)
        ) {

          files.delete(
            filePath
          );
        }
      }
    }
  };
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
