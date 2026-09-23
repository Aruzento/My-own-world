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

// Контекст ограничен текущим adapter и его реальным root/handle, без отдельного реестра workspace.
export function captureStorageWorkspaceContext() {
  const adapter = getStorageAdapter();
  const root = adapter.getWorkspaceRoot?.() || adapter.getWorkspaceHandle?.();
  if (!root) throw new Error('A saved workspace is required.');
  return Object.freeze({ adapter, root });
}

export function isStorageWorkspaceContextCurrent(context) {
  return Boolean(context && getStorageAdapter() === context.adapter &&
    (context.adapter.getWorkspaceRoot?.() || context.adapter.getWorkspaceHandle?.()) === context.root);
}

export function assertStorageWorkspaceContext(context) {
  if (!isStorageWorkspaceContextCurrent(context)) {
    const error = new Error('Storage workspace changed during the operation.');
    error.code = 'STORAGE_WORKSPACE_CHANGED';
    throw error;
  }
}

// Проверяем каждую операцию, в том числе после ожидания очереди EventStore.
export function createContextBoundStorageAdapter(context) {
  return new Proxy(context.adapter, {
    get(target, property) {
      const value = target[property];
      if (typeof value !== 'function') return value;
      return (...args) => {
        assertStorageWorkspaceContext(context);
        return value.apply(target, args);
      };
    }
  });
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
