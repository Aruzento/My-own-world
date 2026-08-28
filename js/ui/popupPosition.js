const VIEWPORT_PADDING = 12;


export function positionPopupNearAnchor(
  popup,
  anchor,
  {
    gap = 8,
    offset,
    preferred = 'bottom',
    fallbackWidth = 280,
    fallbackHeight = 180,
    avoid = null,
    avoidGap = VIEWPORT_PADDING
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
    size,
    {
      avoid,
      avoidGap
    }
  );
}


export function positionPopupAtPoint(
  popup,
  x,
  y,
  {
    fallbackWidth = 280,
    fallbackHeight = 180,
    avoid = null,
    avoidGap = VIEWPORT_PADDING
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
    size,
    {
      avoid,
      avoidGap
    }
  );
}


export function resolvePopupPosition({
  left,
  top,
  width,
  height,
  viewportWidth,
  viewportHeight,
  padding = VIEWPORT_PADDING,
  avoidRect = null,
  gap = VIEWPORT_PADDING
}) {

  const size = {
    width:
      Number(width) || 0,
    height:
      Number(height) || 0
  };

  const viewport = {
    width:
      Number(viewportWidth) || 0,
    height:
      Number(viewportHeight) || 0
  };

  const base =
    clampPopupPosition({
      left,
      top,
      size,
      viewport,
      padding
    });

  const obstacle =
    normalizeRect(
      avoidRect
    );

  if (
    !obstacle ||
    !rectsOverlap(
      toPositionRect(
        base,
        size
      ),
      obstacle
    )
  ) {

    return base;
  }

  const candidates =
    getAvoidanceCandidates({
      base,
      size,
      obstacle,
      gap
    })
      .map(candidate =>
        clampPopupPosition({
          ...candidate,
          size,
          viewport,
          padding
        })
      );

  return candidates.find(candidate =>
    !rectsOverlap(
      toPositionRect(
        candidate,
        size
      ),
      obstacle
    )
  ) || base;
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
  size,
  {
    avoid = null,
    avoidGap = VIEWPORT_PADDING
  } = {}
) {

  popup.style.maxWidth =
    `calc(100vw - ${VIEWPORT_PADDING * 2}px)`;

  popup.style.maxHeight =
    `calc(100vh - ${VIEWPORT_PADDING * 2}px)`;

  popup.style.overflow =
    'auto';

  const position =
    resolvePopupPosition({
      left,
      top,
      width:
        size.width,
      height:
        size.height,
      viewportWidth:
        window.innerWidth,
      viewportHeight:
        window.innerHeight,
      padding:
        VIEWPORT_PADDING,
      avoidRect:
        getAvoidRect(
          avoid
        ),
      gap:
        avoidGap
    });

  popup.style.left =
    `${position.left}px`;

  popup.style.top =
    `${position.top}px`;

  alignPopupToResolvedViewportPosition(
    popup,
    position
  );
}


function alignPopupToResolvedViewportPosition(
  popup,
  position
) {

  const rect =
    popup.getBoundingClientRect();

  const deltaLeft =
    position.left - rect.left;

  const deltaTop =
    position.top - rect.top;

  if (
    Math.abs(deltaLeft) < 0.5 &&
    Math.abs(deltaTop) < 0.5
  ) {

    return;
  }

  const styleLeft =
    Number.parseFloat(
      popup.style.left
    ) || 0;

  const styleTop =
    Number.parseFloat(
      popup.style.top
    ) || 0;

  popup.style.left =
    `${Math.round(styleLeft + deltaLeft)}px`;

  popup.style.top =
    `${Math.round(styleTop + deltaTop)}px`;
}


function getAvoidanceCandidates({
  base,
  size,
  obstacle,
  gap
}) {

  const leftOfObstacle = {
    left:
      obstacle.left - size.width - gap,
    top:
      base.top
  };

  const rightOfObstacle = {
    left:
      obstacle.right + gap,
    top:
      base.top
  };

  const aboveObstacle = {
    left:
      base.left,
    top:
      obstacle.top - size.height - gap
  };

  const belowObstacle = {
    left:
      base.left,
    top:
      obstacle.bottom + gap
  };

  const horizontal =
    base.left < obstacle.left
      ? [
        leftOfObstacle,
        rightOfObstacle
      ]
      : [
        rightOfObstacle,
        leftOfObstacle
      ];

  return [
    ...horizontal,
    aboveObstacle,
    belowObstacle
  ];
}


function clampPopupPosition({
  left,
  top,
  size,
  viewport,
  padding
}) {

  return {
    left:
      clamp(
        Number(left) || 0,
        padding,
        viewport.width - size.width - padding
      ),
    top:
      clamp(
        Number(top) || 0,
        padding,
        viewport.height - size.height - padding
      )
  };
}


function getAvoidRect(
  avoid
) {

  const target =
    typeof avoid === 'function'
      ? avoid()
      : avoid;

  if (!target) return null;

  if (
    typeof target.getBoundingClientRect === 'function'
  ) {

    return getVisibleElementRect(
      target
    );
  }

  return normalizeRect(
    target
  );
}


function getVisibleElementRect(
  element
) {

  if (!element) return null;

  const style =
    getComputedStyle(
      element
    );

  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    element.hasAttribute('hidden') ||
    element.classList.contains('hidden')
  ) {

    return null;
  }

  return normalizeRect(
    element.getBoundingClientRect()
  );
}


function normalizeRect(
  rect
) {

  if (!rect) return null;

  const left =
    Number(rect.left);

  const top =
    Number(rect.top);

  const width =
    Number.isFinite(Number(rect.width))
      ? Number(rect.width)
      : Number(rect.right) - left;

  const height =
    Number.isFinite(Number(rect.height))
      ? Number(rect.height)
      : Number(rect.bottom) - top;

  const right =
    Number.isFinite(Number(rect.right))
      ? Number(rect.right)
      : left + width;

  const bottom =
    Number.isFinite(Number(rect.bottom))
      ? Number(rect.bottom)
      : top + height;

  if (
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(right) ||
    !Number.isFinite(bottom) ||
    width <= 0 ||
    height <= 0
  ) {

    return null;
  }

  return {
    left,
    top,
    right,
    bottom,
    width,
    height
  };
}


function toPositionRect(
  position,
  size
) {

  return {
    left:
      position.left,
    top:
      position.top,
    right:
      position.left + size.width,
    bottom:
      position.top + size.height,
    width:
      size.width,
    height:
      size.height
  };
}


function rectsOverlap(
  first,
  second
) {

  return first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top;
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
