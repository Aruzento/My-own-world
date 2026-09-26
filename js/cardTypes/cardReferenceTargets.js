// References normally target formal Card Types. Campaign Map is an existing
// page-backed special document, so schemas use one stable non-card target id
// without registering a sixteenth Card Type or changing PageRecord persistence.
export const CAMPAIGN_MAP_REFERENCE_TARGET = 'campaign-map';

export function referenceTargetMatchesPage(targetType, page) {
  if (targetType === CAMPAIGN_MAP_REFERENCE_TARGET) {
    return page?.type === 'campaignMap' || page?.template === 'campaignMap';
  }
  return page?.type === targetType;
}

export function referenceFieldMatchesPage(field, page) {
  return Boolean(field?.targetTypes?.some(targetType => referenceTargetMatchesPage(targetType, page)));
}

export function isSpecialPageReferenceTarget(targetType) {
  return targetType === CAMPAIGN_MAP_REFERENCE_TARGET;
}
