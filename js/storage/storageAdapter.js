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

import {
  setWriteQueueStorageAdapterProvider
} from './writeQueue.js';


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


export function hasWorkspaceAccess(
  storageAdapter = getStorageAdapter()
) {

  if (storageAdapter.kind === 'desktop') {

    return Boolean(
      storageAdapter.getWorkspaceRoot?.()
    );
  }

  return Boolean(
    storageAdapter.getWorkspaceHandle?.()
  );
}


export async function queryWorkspaceWritePermission(
  storageAdapter = getStorageAdapter()
) {

  if (storageAdapter.kind === 'desktop') {

    return hasWorkspaceAccess(
      storageAdapter
    );
  }

  const handle =
    storageAdapter.getWorkspaceHandle?.();

  if (!handle) return false;

  if (!handle.queryPermission) return true;

  const permission =
    await handle.queryPermission({
      mode: 'readwrite'
    });

  return permission === 'granted';
}


export async function requestWorkspaceWritePermission(
  storageAdapter = getStorageAdapter()
) {

  if (storageAdapter.kind === 'desktop') {

    return hasWorkspaceAccess(
      storageAdapter
    );
  }

  const handle =
    storageAdapter.getWorkspaceHandle?.();

  if (!handle) return false;

  if (!handle.queryPermission) return true;

  const currentPermission =
    await handle.queryPermission({
      mode: 'readwrite'
    });

  if (currentPermission === 'granted') return true;

  if (!handle.requestPermission) return false;

  const requestedPermission =
    await handle.requestPermission({
      mode: 'readwrite'
    });

  return requestedPermission === 'granted';
}


setWriteQueueStorageAdapterProvider(
  getStorageAdapter
);
