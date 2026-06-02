import {
  getStorageAdapter
} from './storageAdapter.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';

import {
  isTauriRuntime
} from './desktopStorageAdapter.js';

import {
  invokeTauriCommand
} from './tauriBridge.js';


export function createDesktopAssetAdapter(
  options = {}
) {

  let workspaceRoot =
    options.workspaceRoot || '';

  return {
    kind: 'desktop',

    setWorkspaceRoot(
      root
    ) {

      workspaceRoot =
        String(root || '');
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

      await storageAdapter.writeBinary(
        `assets/${path}`,
        await file.arrayBuffer()
      );

      return {
        path,
        url:
          await this.resolveUrl(
            path
          )
      };
    },

    async resolveUrl(
      assetReference
    ) {

      const storageAdapter =
        getStorageAdapter();

      const root =
        workspaceRoot ||
        storageAdapter.getWorkspaceRoot?.() ||
        '';

      return invokeFsCommand(
        'resolve_asset_url',
        {
          workspaceRoot: root,
          path: `assets/${normalizeAssetPath(
            assetReference.path || assetReference
          )}`
        }
      );
    },

    async exists(
      assetReference
    ) {

      const storageAdapter =
        getStorageAdapter();

      const root =
        workspaceRoot ||
        storageAdapter.getWorkspaceRoot?.() ||
        '';

      return invokeFsCommand(
        'path_exists',
        {
          workspaceRoot: root,
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
