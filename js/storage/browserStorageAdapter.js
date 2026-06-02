import {
  saveWorkspaceHandle,
  loadWorkspaceHandle
} from './persistence.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';


export function createBrowserStorageAdapter() {

  let workspaceHandle =
    null;

  return {
    kind: 'browser',

    getWorkspaceHandle() {

      return workspaceHandle;
    },

    setWorkspaceHandle(
      handle
    ) {

      workspaceHandle =
        handle;
    },

    async pickWorkspace() {

      const handle =
        await window.showDirectoryPicker();

      workspaceHandle =
        handle;

      await saveWorkspaceHandle(
        handle
      );

      return handle;
    },

    async restoreWorkspace() {

      const handle =
        await loadWorkspaceHandle();

      workspaceHandle =
        handle;

      return handle;
    },

    async ensureDirectory(
      path
    ) {

      return getDirectoryByPath(
        workspaceHandle,
        path,
        true
      );
    },

    async getDirectoryHandle(
      path,
      options = {}
    ) {

      return getDirectoryByPath(
        workspaceHandle,
        path,
        Boolean(options.create)
      );
    },

    async readText(
      path
    ) {

      const fileHandle =
        await getFileHandleByPath(
          workspaceHandle,
          path
        );

      const file =
        await fileHandle.getFile();

      return file.text();
    },

    async writeText(
      path,
      content
    ) {

      const fileHandle =
        await getFileHandleByPath(
          workspaceHandle,
          path,
          true
        );

      const writable =
        await fileHandle.createWritable();

      await writable.write(
        String(content)
      );

      await writable.close();
    },

    async listFiles(
      path = ''
    ) {

      const directoryHandle =
        await getDirectoryByPath(
          workspaceHandle,
          path
        );

      const result =
        [];

      for await (const entry of directoryHandle.values()) {

        result.push({
          name: entry.name,
          kind: entry.kind
        });
      }

      return result;
    },

    async removeFile(
      path
    ) {

      const normalizedPath =
        normalizeWorkspacePath(
          path
        );

      const parts =
        normalizedPath.split('/');

      const name =
        parts.pop();

      const directoryHandle =
        await getDirectoryByPath(
          workspaceHandle,
          parts.join('/')
        );

      await directoryHandle.removeEntry(
        name
      );
    }
  };
}


async function getDirectoryByPath(
  rootHandle,
  path,
  create = false
) {

  if (!rootHandle) {

    throw new Error(
      'Workspace не выбран'
    );
  }

  const normalizedPath =
    normalizeWorkspacePath(
      path
    );

  if (!normalizedPath) {

    return rootHandle;
  }

  const parts =
    normalizedPath.split('/');

  let currentHandle =
    rootHandle;

  for (const part of parts) {

    currentHandle =
      await currentHandle.getDirectoryHandle(
        part,
        { create }
      );
  }

  return currentHandle;
}


async function getFileHandleByPath(
  rootHandle,
  path,
  create = false
) {

  const normalizedPath =
    normalizeWorkspacePath(
      path
    );

  const parts =
    normalizedPath.split('/');

  const name =
    parts.pop();

  const directoryHandle =
    await getDirectoryByPath(
      rootHandle,
      parts.join('/'),
      create
    );

  return directoryHandle.getFileHandle(
    name,
    { create }
  );
}
