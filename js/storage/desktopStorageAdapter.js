import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';

const DESKTOP_WORKSPACE_ROOT_KEY =
  'myOwnWorld.desktop.workspaceRoot';


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
    options.workspaceRoot ||
    localStorage.getItem(
      DESKTOP_WORKSPACE_ROOT_KEY
    ) ||
    '';

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

      const {
        open
      } =
        await import('@tauri-apps/plugin-dialog');

      const selectedPath =
        await open({
          directory: true,
          multiple: false,
          title: 'Выберите workspace MyOwnWorld'
        });

      if (!selectedPath) {

        return null;
      }

      workspaceRoot =
        String(selectedPath);

      localStorage.setItem(
        DESKTOP_WORKSPACE_ROOT_KEY,
        workspaceRoot
      );

      return workspaceRoot;
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

    async readBinary(
      path
    ) {

      const bytes =
        await invokeFsCommand(
          'read_binary_file',
          {
            workspaceRoot,
            path: normalizeWorkspacePath(path)
          }
        );

      return Uint8Array.from(
        bytes
      ).buffer;
    },

    async writeBinary(
      path,
      content
    ) {

      await invokeFsCommand(
        'write_binary_file',
        {
          workspaceRoot,
          path: normalizeWorkspacePath(path),
          content: Array.from(
            new Uint8Array(
              content
            )
          )
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
    },

    async removeDirectory(
      path
    ) {

      await invokeFsCommand(
        'remove_directory',
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
