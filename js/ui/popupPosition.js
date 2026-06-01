const VIEWPORT_PADDING = 12;


export function positionPopupNearAnchor(
  popup,
  anchor,
  {
    gap = 8,
    offset,
    preferred = 'bottom',
    fallbackWidth = 280,
    fallbackHeight = 180
  } = {}
) {

  if (!popup || !anchor) return;

  const rect =
    anchor.getBoundingClientRect();

  const distance =
    Number.isFinite(offset)
      ? offset
      : gap;

  const size =
    getPopupSize(
      popup,
      fallbackWidth,
      fallbackHeight
    );

  const below =
    rect.bottom + distance;

  const above =
    rect.top - size.height - distance;

  const top =
    preferred === 'top'
      ? chooseVerticalPosition(above, below, size.height)
      : chooseVerticalPosition(below, above, size.height);

  const left =
    clamp(
      rect.left,
      VIEWPORT_PADDING,
      window.innerWidth - size.width - VIEWPORT_PADDING
    );

  applyPopupPosition(
    popup,
    left,
    top,
    size
  );
}


export function positionPopupAtPoint(
  popup,
  x,
  y,
  {
    fallbackWidth = 280,
    fallbackHeight = 180
  } = {}
) {

  if (!popup) return;

  const size =
    getPopupSize(
      popup,
      fallbackWidth,
      fallbackHeight
    );

  applyPopupPosition(
    popup,
    x,
    y,
    size
  );
}


function chooseVerticalPosition(
  primary,
  secondary,
  height
) {

  if (
    primary >= VIEWPORT_PADDING &&
    primary + height <= window.innerHeight - VIEWPORT_PADDING
  ) {

    return primary;
  }

  if (
    secondary >= VIEWPORT_PADDING &&
    secondary + height <= window.innerHeight - VIEWPORT_PADDING
  ) {

    return secondary;
  }

  return clamp(
    primary,
    VIEWPORT_PADDING,
    window.innerHeight - height - VIEWPORT_PADDING
  );
}


function getPopupSize(
  popup,
  fallbackWidth,
  fallbackHeight
) {

  return {
    width: popup.offsetWidth || fallbackWidth,
    height: popup.offsetHeight || fallbackHeight
  };
}


function applyPopupPosition(
  popup,
  left,
  top,
  size
) {

  popup.style.maxWidth =
    `calc(100vw - ${VIEWPORT_PADDING * 2}px)`;

  popup.style.maxHeight =
    `calc(100vh - ${VIEWPORT_PADDING * 2}px)`;

  popup.style.overflow =
    'auto';

  popup.style.left =
    `${clamp(left, VIEWPORT_PADDING, window.innerWidth - size.width - VIEWPORT_PADDING)}px`;

  popup.style.top =
    `${clamp(top, VIEWPORT_PADDING, window.innerHeight - size.height - VIEWPORT_PADDING)}px`;
}


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      value,
      Math.max(min, max)
    )
  );
}
