import {
  getStorageAdapter
} from './storageAdapter.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';


export function createBrowserAssetAdapter() {

  return {
    kind: 'browser',

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

      const path =
        normalizeAssetPath(
          assetReference.path || assetReference
        );

      const buffer =
        await storageAdapter.readBinary(
          `assets/${path}`
        );

      return URL.createObjectURL(
        new Blob(
          [buffer],
          {
            type: getMimeType(path)
          }
        )
      );
    },

    async exists(
      assetReference
    ) {

      try {

        const storageAdapter =
          getStorageAdapter();

        await storageAdapter.readBinary(
          `assets/${normalizeAssetPath(
            assetReference.path || assetReference
          )}`
        );

        return true;

      } catch {

        return false;
      }
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


function getMimeType(
  path
) {

  const extension =
    String(path)
      .split('.')
      .pop()
      .toLowerCase();

  if (extension === 'png') return 'image/png';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'svg') return 'image/svg+xml';

  return 'application/octet-stream';
}
