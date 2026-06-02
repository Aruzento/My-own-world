export const STORAGE_ADAPTER_KIND = Object.freeze({
  browser: 'browser',
  desktop: 'desktop'
});


// Единый контракт storage-слоя: UI не должен знать, браузерный это handle или desktop backend.
export const REQUIRED_STORAGE_ADAPTER_METHODS = Object.freeze([
  'pickWorkspace',
  'restoreWorkspace',
  'ensureDirectory',
  'getDirectoryHandle',
  'readText',
  'writeText',
  'readBinary',
  'writeBinary',
  'listFiles',
  'removeFile',
  'removeDirectory'
]);


export function assertStorageAdapterContract(
  adapter
) {

  if (!adapter) {

    throw new Error(
      'StorageAdapter не создан'
    );
  }

  for (const methodName of REQUIRED_STORAGE_ADAPTER_METHODS) {

    if (typeof adapter[methodName] !== 'function') {

      throw new Error(
        `StorageAdapter не реализует метод ${methodName}`
      );
    }
  }

  return adapter;
}


export function normalizeWorkspacePath(
  path
) {

  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');
}
