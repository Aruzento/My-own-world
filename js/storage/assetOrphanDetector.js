import {
  normalizeAssetPath
} from './assetReference.js';

import {
  collectAssetReferencesFromPages
} from './assetReferenceScanner.js';


// Находит файлы в assets, на которые больше нет persistent-ссылок.
export function findOrphanAssetPaths(
  pages = [],
  assetPaths = []
) {

  return findOrphanPaths(
    collectAssetReferencesFromPages(
      pages
    ),
    assetPaths
  );
}


export function findOrphanPaths(
  references = [],
  assetPaths = []
) {

  const used =
    new Set(
      references
        .map(reference =>
          normalizeAssetPath(
            reference.path
          )
        )
        .filter(Boolean)
    );

  return assetPaths
    .map(path =>
      normalizeAssetPath(
        path
      )
    )
    .filter(Boolean)
    .filter(path =>
      !used.has(
        path
      )
    );
}
