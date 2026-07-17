import {
  getStorageAdapter
} from './storageAdapter.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';

import {
  isTauriRuntime,
  registerDesktopWorkspaceRoot
} from './desktopStorageAdapter.js';

import {
  convertTauriFileSrc,
  invokeTauriCommand
} from './tauriBridge.js';


export function createDesktopAssetAdapter(
  options = {}
) {

  let workspaceRoot =
    options.workspaceRoot || '';

  let registeredWorkspaceRoot =
    '';

  async function ensureWorkspaceRootRegistered() {

    const storageAdapter =
      getStorageAdapter();

    const root =
      workspaceRoot ||
      storageAdapter.getWorkspaceRoot?.() ||
      '';

    if (!root) {

      throw new Error(
        'Desktop workspace root is not selected.'
      );
    }

    if (registeredWorkspaceRoot !== root) {

      workspaceRoot =
        await registerDesktopWorkspaceRoot(
          root
        );

      registeredWorkspaceRoot =
        workspaceRoot;
    }
  }

  return {
    kind: 'desktop',

    setWorkspaceRoot(
      root
    ) {

      workspaceRoot =
        String(root || '');

      registeredWorkspaceRoot =
        '';
    },

    async importFile(
      file,
      options = {}
    ) {

      const storageAdapter =
        getStorageAdapter();

      const filename =
        options.filename || file?.name;

      if (!filename) {

        throw new Error(
          'Для asset нужен filename.'
        );
      }

      const path =
        normalizeAssetPath(
          filename
        );

      const parentPath =
        getParentPath(
          path
        );

      if (parentPath) {

        await storageAdapter.ensureDirectory(
          `assets/${parentPath}`
        );
      }

      await storageAdapter.writeBinary(
        `assets/${path}`,
        await file.arrayBuffer()
      );

      return {
        path,
        url:
          options.resolveUrl === false
            ? ''
            : await this.resolveUrl(
              path
            )
      };
    },

    async resolveUrl(
      assetReference
    ) {

      await ensureWorkspaceRootRegistered();

      const filePath =
        await invokeFsCommand(
          'resolve_asset_url',
          {
            path: `assets/${normalizeAssetPath(
              assetReference.path || assetReference
            )}`
          }
        );

      return convertTauriFileSrc(
        filePath
      );
    },

    async resolveFilePath(
      assetReference
    ) {

      await ensureWorkspaceRootRegistered();

      return invokeFsCommand(
        'resolve_asset_url',
        {
          path: `assets/${normalizeAssetPath(
            assetReference.path || assetReference
          )}`
        }
      );
    },

    async exists(
      assetReference
    ) {

      await ensureWorkspaceRootRegistered();

      return invokeFsCommand(
        'path_exists',
        {
          path: `assets/${normalizeAssetPath(
            assetReference.path || assetReference
          )}`
        }
      );
    },

    async remove(
      assetReference
    ) {

      const storageAdapter =
        getStorageAdapter();

      await storageAdapter.removeFile(
        `assets/${normalizeAssetPath(
          assetReference.path || assetReference
        )}`
      );
    },

    async findOrphans() {

      return [];
    }
  };
}


function normalizeAssetPath(
  path
) {

  return normalizeWorkspacePath(
    path
  )
    .replace(/^assets\//, '');
}


function getParentPath(
  path
) {

  const parts =
    String(path || '')
      .split('/');

  parts.pop();

  return parts.join('/');
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

  return invokeTauriCommand(
    command,
    payload
  );
}
