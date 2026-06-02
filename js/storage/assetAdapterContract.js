export const REQUIRED_ASSET_ADAPTER_METHODS = Object.freeze([
  'importFile',
  'resolveUrl',
  'exists',
  'remove',
  'findOrphans'
]);


export function assertAssetAdapterContract(
  adapter
) {

  if (!adapter) {

    throw new Error(
      'AssetAdapter не создан'
    );
  }

  for (const methodName of REQUIRED_ASSET_ADAPTER_METHODS) {

    if (typeof adapter[methodName] !== 'function') {

      throw new Error(
        `AssetAdapter не реализует метод ${methodName}`
      );
    }
  }

  return adapter;
}
