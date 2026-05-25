export const ASSET_TYPES =
  Object.freeze({
    image: 'image',
    portrait: 'portrait',
    mapBackground: 'mapBackground',
    mapObjectPng: 'mapObjectPng',
    audio: 'audio',
    playlist: 'playlist',
    futureMedia: 'futureMedia'
  });


const KNOWN_TYPES =
  new Set(
    Object.values(
      ASSET_TYPES
    )
  );


// AssetReference - единый persistent-формат ссылки на файл внутри workspace.
export function createAssetReference(
  input = {}
) {

  const reference =
    normalizeAssetReference(
      {
        ...input,
        id:
          input.id || createAssetId()
      }
    );

  return reference;
}


export function normalizeAssetReference(
  input = {}
) {

  const type =
    normalizeAssetType(
      input.type
    );

  return {
    id:
      normalizeText(
        input.id
      ),
    path:
      normalizeAssetPath(
        input.path
      ),
    type,
    owner:
      normalizeAssetOwner(
        input.owner
      ),
    fallback:
      input.fallback
        ? normalizeAssetPath(
          input.fallback
        )
        : null,
    missing:
      Boolean(
        input.missing
      )
  };
}


export function isAssetReference(
  value
) {

  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.path === 'string' &&
    KNOWN_TYPES.has(
      value.type
    ) &&
    value.owner &&
    typeof value.owner === 'object'
  );
}


export function normalizeAssetType(
  type
) {

  const normalized =
    normalizeText(
      type
    );

  return KNOWN_TYPES.has(
    normalized
  )
    ? normalized
    : ASSET_TYPES.futureMedia;
}


export function normalizeAssetPath(
  path
) {

  return normalizeText(
    path
  )
    .replaceAll(
      '\\',
      '/'
    )
    .replace(
      /^\/+/,
      ''
    );
}


export function normalizeAssetOwner(
  owner = {}
) {

  return {
    pageId:
      normalizeText(
        owner.pageId
      ),
    entityId:
      normalizeText(
        owner.entityId
      ),
    scope:
      normalizeText(
        owner.scope
      )
  };
}


export function createAssetId() {

  if (globalThis.crypto?.randomUUID) {

    return `asset-${globalThis.crypto.randomUUID()}`;
  }

  return `asset-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}


function normalizeText(
  value
) {

  return typeof value === 'string'
    ? value.trim()
    : '';
}
