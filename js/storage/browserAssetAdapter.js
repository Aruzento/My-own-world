import {
  state
} from '../state.js';


export function createBrowserAssetAdapter() {

  return {
    kind: 'browser',

    async importFile() {

      throw new Error(
        'BrowserAssetAdapter importFile будет подключен после переноса assetStorage'
      );
    },

    async resolveUrl(
      assetReference
    ) {

      const assetsDir =
        await state.workspaceHandle.getDirectoryHandle(
          'assets'
        );

      const fileHandle =
        await assetsDir.getFileHandle(
          assetReference.path || assetReference
        );

      const file =
        await fileHandle.getFile();

      return URL.createObjectURL(
        file
      );
    },

    async exists(
      assetReference
    ) {

      try {

        const assetsDir =
          await state.workspaceHandle.getDirectoryHandle(
            'assets'
          );

        await assetsDir.getFileHandle(
          assetReference.path || assetReference
        );

        return true;

      } catch {

        return false;
      }
    },

    async remove() {

      throw new Error(
        'BrowserAssetAdapter remove будет подключен после AssetAdapter migration'
      );
    },

    async findOrphans() {

      return [];
    }
  };
}
