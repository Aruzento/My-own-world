import {
  createBrowserStorageAdapter
} from './browserStorageAdapter.js';

import {
  createDesktopStorageAdapter,
  isTauriRuntime
} from './desktopStorageAdapter.js';

import {
  assertStorageAdapterContract
} from './storageAdapterContract.js';


let activeStorageAdapter =
  null;


export function getStorageAdapter() {

  if (!activeStorageAdapter) {

    activeStorageAdapter =
      createDefaultStorageAdapter();
  }

  return activeStorageAdapter;
}


export function setStorageAdapter(
  adapter
) {

  activeStorageAdapter =
    assertStorageAdapterContract(
      adapter
    );
}


export function createDefaultStorageAdapter() {

  if (isTauriRuntime()) {

    return assertStorageAdapterContract(
      createDesktopStorageAdapter()
    );
  }

  return assertStorageAdapterContract(
    createBrowserStorageAdapter()
  );
}
