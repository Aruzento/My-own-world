import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';


export function isTauriRuntime() {

  return Boolean(
    globalThis.__TAURI_INTERNALS__ ||
    globalThis.__TAURI__
  );
}


export function createDesktopStorageAdapter(
  options = {}
) {

  let workspaceRoot =
    options.workspaceRoot || '';

  return {
    kind: 'desktop',

    getWorkspaceRoot() {

      return workspaceRoot;
    },

    setWorkspaceRoot(
      root
    ) {

      workspaceRoot =
        String(root || '');
    },

    async pickWorkspace() {

      throw new Error(
        'Desktop pickWorkspace будет подключен после dialog adapter'
      );
    },

    async restoreWorkspace() {

      return workspaceRoot || null;
    },

    async ensureDirectory(
      path
    ) {

      await invokeFsCommand(
        'ensure_directory',
        {
          workspaceRoot,
          path: normalizeWorkspacePath(path)
        }
      );
    },

    async getDirectoryHandle(
      path
    ) {

      return {
        kind: 'directory',
        path: normalizeWorkspacePath(path)
      };
    },

    async readText(
      path
    ) {

      return invokeFsCommand(
        'read_text_file',
        {
          workspaceRoot,
          path: normalizeWorkspacePath(path)
        }
      );
    },

    async writeText(
      path,
      content
    ) {

      await invokeFsCommand(
        'write_text_file',
        {
          workspaceRoot,
          path: normalizeWorkspacePath(path),
          content: String(content)
        }
      );
    },

    async listFiles(
      path = ''
    ) {

      return invokeFsCommand(
        'list_directory',
        {
          workspaceRoot,
          path: normalizeWorkspacePath(path)
        }
      );
    },

    async removeFile(
      path
    ) {

      await invokeFsCommand(
        'remove_file',
        {
          workspaceRoot,
          path: normalizeWorkspacePath(path)
        }
      );
    }
  };
}


async function invokeFsCommand(
  command,
  payload
) {

  if (!isTauriRuntime()) {

    throw new Error(
      'Tauri runtime недоступен'
    );
  }

  const {
    invoke
  } =
    await import('@tauri-apps/api/core');

  return invoke(
    command,
    payload
  );
}
