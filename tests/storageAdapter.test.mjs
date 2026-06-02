import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertStorageAdapterContract,
  normalizeWorkspacePath,
  REQUIRED_STORAGE_ADAPTER_METHODS
} from '../js/storage/storageAdapterContract.js';

import {
  assertAssetAdapterContract,
  REQUIRED_ASSET_ADAPTER_METHODS
} from '../js/storage/assetAdapterContract.js';

import {
  createDesktopStorageAdapter
} from '../js/storage/desktopStorageAdapter.js';


test(
  'StorageAdapter contract requires the full public API',
  () => {

    const adapter =
      Object.fromEntries(
        REQUIRED_STORAGE_ADAPTER_METHODS.map(
          methodName => [
            methodName,
            () => {}
          ]
        )
      );

    assert.equal(
      assertStorageAdapterContract(adapter),
      adapter
    );

    assert.throws(
      () => assertStorageAdapterContract({}),
      /pickWorkspace/
    );
  }
);


test(
  'normalizeWorkspacePath keeps paths workspace-relative',
  () => {

    assert.equal(
      normalizeWorkspacePath('\\pages//card.md'),
      'pages/card.md'
    );

    assert.equal(
      normalizeWorkspacePath('/assets/token.png'),
      'assets/token.png'
    );
  }
);


test(
  'DesktopStorageAdapter exposes root state without invoking Tauri during construction',
  () => {

    const adapter =
      createDesktopStorageAdapter({
        workspaceRoot: 'C:/World'
      });

    assert.equal(
      adapter.kind,
      'desktop'
    );

    assert.equal(
      adapter.getWorkspaceRoot(),
      'C:/World'
    );

    adapter.setWorkspaceRoot(
      'D:/Campaign'
    );

    assert.equal(
      adapter.getWorkspaceRoot(),
      'D:/Campaign'
    );
  }
);


test(
  'AssetAdapter contract requires asset lifecycle methods',
  () => {

    const adapter =
      Object.fromEntries(
        REQUIRED_ASSET_ADAPTER_METHODS.map(
          methodName => [
            methodName,
            () => {}
          ]
        )
      );

    assert.equal(
      assertAssetAdapterContract(adapter),
      adapter
    );

    assert.throws(
      () => assertAssetAdapterContract({}),
      /importFile/
    );
  }
);
