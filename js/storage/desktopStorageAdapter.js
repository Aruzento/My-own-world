import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';

import {
  invokeTauriCommand,
  isTauriRuntime as detectTauriRuntime,
  openTauriDirectoryDialog
} from './tauriBridge.js';

const DESKTOP_WORKSPACE_ROOT_KEY =
  'myOwnWorld.desktop.workspaceRoot';


export function isTauriRuntime() {

  return detectTauriRuntime();
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

  let registeredWorkspaceRoot =
    '';

  async function invokeFsCommand(
    command,
    payload
  ) {

    if (workspaceRoot && registeredWorkspaceRoot !== workspaceRoot) {

      workspaceRoot =
        await registerDesktopWorkspaceRoot(
          workspaceRoot
        );

      registeredWorkspaceRoot =
        workspaceRoot;

      localStorage.setItem(
        DESKTOP_WORKSPACE_ROOT_KEY,
        workspaceRoot
      );
    }

    return invokeFsCommandWithoutRoot(
      command,
      payload
    );
  }

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

      registeredWorkspaceRoot =
        '';
    },

    async pickWorkspace() {

      const selectedPath =
        await openTauriDirectoryDialog({
          directory: true,
          multiple: false,
          title: 'Выберите workspace MyOwnWorld'
        });

      if (!selectedPath) {

        return null;
      }

      workspaceRoot =
        String(selectedPath);

      workspaceRoot =
        await registerDesktopWorkspaceRoot(
          workspaceRoot
        );

      registeredWorkspaceRoot =
        workspaceRoot;

      localStorage.setItem(
        DESKTOP_WORKSPACE_ROOT_KEY,
        workspaceRoot
      );

      return workspaceRoot;
    },

    async restoreWorkspace() {

      if (workspaceRoot) {

        workspaceRoot =
          await registerDesktopWorkspaceRoot(
            workspaceRoot
          );

        registeredWorkspaceRoot =
          workspaceRoot;

        localStorage.setItem(
          DESKTOP_WORKSPACE_ROOT_KEY,
          workspaceRoot
        );
      }

      return workspaceRoot || null;
    },

    async ensureDirectory(
      path
    ) {

      await invokeFsCommand(
        'ensure_directory',
        {
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
          path: normalizeWorkspacePath(path)
        }
      );
    }
  };
}


export async function registerDesktopWorkspaceRoot(
  root
) {

  const normalizedRoot =
    String(root || '');

  if (!normalizedRoot) {

    throw new Error(
      'Desktop workspace root is not selected.'
    );
  }

  return invokeFsCommandWithoutRoot(
    'set_workspace_root',
    {
      workspaceRoot:
        normalizedRoot
    }
  );
}


async function invokeFsCommandWithoutRoot(
  command,
  payload
) {

  if (!isTauriRuntime()) {

    throw new Error(
      'Tauri runtime недоступен'
    );
  }

  return invokeTauriCommand(
    command,
    payload
  );
}
