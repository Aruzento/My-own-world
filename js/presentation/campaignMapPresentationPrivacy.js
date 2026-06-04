// Privacy rules презентации отвечают только за то, что можно показать игрокам.
// Renderer использует эти правила и не решает приватность прямо внутри разметки.

export function canShowPresentationItem(
  kind,
  item
) {

  if (!item) return false;

  if (!item.presentationHidden) return true;

  if (kind !== 'token') return false;

  return isPlayerPresentationToken(
    item
  );
}


export function isPlayerPresentationToken(
  token
) {

  return token?.sourceMode === 'original' ||
    token?.isPlayerToken === true;
}
