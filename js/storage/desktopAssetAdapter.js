import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';

import {
  isTauriRuntime
} from './desktopStorageAdapter.js';


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

    async importFile() {

      throw new Error(
        'DesktopAssetAdapter importFile будет подключен после native file picker'
      );
    },

    async resolveUrl(
      assetReference
    ) {

      const path =
        normalizeWorkspacePath(
          assetReference.path || assetReference
        );

      return invokeFsCommand(
        'resolve_asset_url',
        {
          workspaceRoot,
          path
        }
      );
    },

    async exists(
      assetReference
    ) {

      return invokeFsCommand(
        'path_exists',
        {
          workspaceRoot,
          path: normalizeWorkspacePath(
            assetReference.path || assetReference
          )
        }
      );
    },

    async remove(
      assetReference
    ) {

      return invokeFsCommand(
        'remove_file',
        {
          workspaceRoot,
          path: normalizeWorkspacePath(
            assetReference.path || assetReference
          )
        }
      );
    },

    async findOrphans() {

      return [];
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
