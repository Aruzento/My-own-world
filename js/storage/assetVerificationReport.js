import {
  normalizeAssetPath,
  normalizeAssetReference
} from './assetReference.js';

import {
  createAssetPathSet,
  findBrokenReferences
} from './assetBrokenChecker.js';

import {
  findOrphanPaths
} from './assetOrphanDetector.js';

import {
  collectAssetReferencesFromPages
} from './assetReferenceScanner.js';


export const ASSET_VERIFICATION_CATEGORIES =
  Object.freeze({
    referencedExists:
      'referenced-exists',
    referencedMissing:
      'referenced-missing',
    orphanCandidate:
      'orphan-candidate',
    checkFailed:
      'check-failed'
  });


export function buildAssetVerificationReport({
  pages = [],
  assetPaths = [],
  assetScanError = null
} = {}) {

  const pageById =
    createPageById(
      pages
    );

  const references =
    collectAssetReferencesFromPages(
      pages
    )
      .map(reference =>
        enrichAssetReference(
          reference,
          pageById
        )
      );

  if (assetScanError) {

    return createAssetVerificationReport({
      status:
        'check-failed',
      references,
      assetPaths:
        [],
      referencedExisting:
        [],
      referencedMissing:
        [],
      orphanCandidates:
        [],
      checkFailures:
        [
          createAssetCheckFailure(
            assetScanError
          )
        ]
    });
  }

  const normalizedAssetPaths =
    assetPaths
      .map(path =>
        normalizeAssetPath(
          path
        )
      )
      .filter(Boolean);

  const availablePaths =
    createAssetPathSet(
      normalizedAssetPaths
    );

  const referencedExisting =
    references
      .filter(reference =>
        reference.path &&
        availablePaths.has(
          normalizeAssetPath(
            reference.path
          )
        )
      )
      .map(reference => ({
        ...reference,
        category:
          ASSET_VERIFICATION_CATEGORIES.referencedExists,
        exists:
          true
      }));

  const referencedMissing =
    findBrokenReferences(
      references,
      normalizedAssetPaths
    )
      .map(reference => ({
        ...reference,
        category:
          ASSET_VERIFICATION_CATEGORIES.referencedMissing,
        exists:
          false,
        missing:
          true
      }));

  const orphanCandidates =
    findOrphanPaths(
      references,
      normalizedAssetPaths
    )
      .map(path => ({
        path,
        category:
          ASSET_VERIFICATION_CATEGORIES.orphanCandidate
      }));

  return createAssetVerificationReport({
    status:
      referencedMissing.length > 0 ||
      orphanCandidates.length > 0
        ? 'needs-review'
        : 'ok',
    references,
    assetPaths:
      normalizedAssetPaths,
    referencedExisting,
    referencedMissing,
    orphanCandidates,
    checkFailures:
      []
  });
}


function createAssetVerificationReport({
  status,
  references,
  assetPaths,
  referencedExisting,
  referencedMissing,
  orphanCandidates,
  checkFailures
}) {

  return {
    status,
    summary: {
      referencedTotal:
        references.length,
      referencedExisting:
        referencedExisting.length,
      referencedMissing:
        referencedMissing.length,
      orphanCandidates:
        orphanCandidates.length,
      checkFailures:
        checkFailures.length,
      assetFiles:
        assetPaths.length
    },
    references,
    assetPaths,
    referencedExisting,
    referencedMissing,
    orphanCandidates,
    checkFailures
  };
}


function enrichAssetReference(
  reference,
  pageById
) {

  const normalized =
    normalizeAssetReference(
      reference
    );

  const ownerPage =
    pageById.get(
      normalized.owner.pageId
    );

  return {
    ...normalized,
    ownerDisplay: {
      pageId:
        normalized.owner.pageId,
      pageTitle:
        ownerPage?.title ||
        ownerPage?.name ||
        normalized.owner.pageId,
      entityId:
        normalized.owner.entityId,
      scope:
        normalized.owner.scope
    }
  };
}


function createPageById(
  pages
) {

  return new Map(
    pages
      .filter(page =>
        page?.id
      )
      .map(page => [
        page.id,
        page
      ])
  );
}


function createAssetCheckFailure(
  error
) {

  return {
    category:
      ASSET_VERIFICATION_CATEGORIES.checkFailed,
    path:
      'assets',
    message:
      'Не удалось прочитать папку assets.',
    detail:
      error?.message || String(error || '')
  };
}
