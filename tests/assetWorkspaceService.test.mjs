import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteWorkspaceAssetPath,
  listWorkspaceAssetPaths
} from '../js/storage/assetWorkspaceService.js';


test(
  'asset workspace service lists nested assets through adapter contract',
  async () => {

    const adapter =
      createDirectoryAdapter({
        assets: [
          {
            name: 'portrait.png',
            kind: 'file'
          },
          {
            name: 'audio',
            kind: 'directory'
          }
        ],
        'assets/audio': [
          {
            name: 'theme.ogg',
            kind: 'file'
          }
        ]
      });

    assert.deepEqual(
      await listWorkspaceAssetPaths({
        storageAdapter:
          adapter
      }),
      [
        'assets/portrait.png',
        'assets/audio/theme.ogg'
      ]
    );
  }
);


test(
  'asset workspace service deletes explicit orphan path through adapter contract',
  async () => {

    const removed =
      [];

    const adapter =
      {
        async removeFile(
          path
        ) {

          removed.push(
            path
          );
        }
      };

    await deleteWorkspaceAssetPath(
      'assets/audio/orphan.mp3',
      {
        storageAdapter:
          adapter
      }
    );

    assert.deepEqual(
      removed,
      [
        'assets/audio/orphan.mp3'
      ]
    );
  }
);


function createDirectoryAdapter(
  tree
) {

  return {
    async listFiles(
      path
    ) {

      if (!(path in tree)) {

        throw new Error(
          `Missing directory: ${path}`
        );
      }

      return tree[path];
    }
  };
}
