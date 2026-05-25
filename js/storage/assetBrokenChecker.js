import {
  normalizeAssetPath,
  normalizeAssetReference
} from './assetReference.js';

import {
  collectAssetReferencesFromPages
} from './assetReferenceScanner.js';


// Проверяет ссылки страниц на ассеты и возвращает только отсутствующие файлы.
export function findBrokenAssetReferences(
  pages = [],
  assetPaths = []
) {

  return findBrokenReferences(
    collectAssetReferencesFromPages(
      pages
    ),
    assetPaths
  );
}


export function findBrokenReferences(
  references = [],
  assetPaths = []
) {

  const available =
    createAssetPathSet(
      assetPaths
    );

  return references
    .map(reference =>
      normalizeAssetReference(
        reference
      )
    )
    .filter(reference =>
      reference.path &&
      !available.has(
        normalizeAssetPath(
          reference.path
        )
      )
    )
    .map(reference => ({
      ...reference,
      missing: true
    }));
}


export function createAssetPathSet(
  assetPaths = []
) {

  return new Set(
    assetPaths
      .map(path =>
        normalizeAssetPath(
          path
        )
      )
      .filter(Boolean)
  );
}
