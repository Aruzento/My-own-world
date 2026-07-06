export const SCHEMA_VERSIONS =
  Object.freeze({
    workspace: 1,
    page: 1,
    campaignMap: 1,
    taskTracker: 1,
    pageTemplates: 1,
    assetReferences: 1
  });


export function getCurrentSchemaVersion(
  area
) {

  return SCHEMA_VERSIONS[area] || 1;
}


export function normalizeSchemaVersion(
  value,
  fallback = 1
) {

  const version =
    Number(value);

  if (
    Number.isFinite(version) &&
    version > 0
  ) {

    return version;
  }

  return fallback;
}


export function createSchemaVersionState({
  area,
  version
} = {}) {

  const currentVersion =
    getCurrentSchemaVersion(
      area
    );

  const normalizedVersion =
    normalizeSchemaVersion(
      version,
      currentVersion
    );

  return {
    area,
    version:
      normalizedVersion,
    currentVersion,
    isMissing:
      version === undefined ||
      version === null,
    isFuture:
      normalizedVersion > currentVersion,
    isLegacy:
      normalizedVersion < currentVersion,
    isCurrent:
      normalizedVersion === currentVersion
  };
}
