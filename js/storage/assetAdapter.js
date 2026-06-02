import {
  createBrowserAssetAdapter
} from './browserAssetAdapter.js';

import {
  createDesktopAssetAdapter
} from './desktopAssetAdapter.js';

import {
  isTauriRuntime
} from './desktopStorageAdapter.js';

import {
  assertAssetAdapterContract
} from './assetAdapterContract.js';


let activeAssetAdapter =
  null;


export function getAssetAdapter() {

  if (!activeAssetAdapter) {

    activeAssetAdapter =
      createDefaultAssetAdapter();
  }

  return activeAssetAdapter;
}


export function setAssetAdapter(
  adapter
) {

  activeAssetAdapter =
    assertAssetAdapterContract(
      adapter
    );
}


export function createDefaultAssetAdapter() {

  if (isTauriRuntime()) {

    return assertAssetAdapterContract(
      createDesktopAssetAdapter()
    );
  }

  return assertAssetAdapterContract(
    createBrowserAssetAdapter()
  );
}
