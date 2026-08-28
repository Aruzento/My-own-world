export function positionToolbar(
  toolbar,
  rect
) {

  const margin =
    8;

  const selectionGap =
    14;

  const width =
    toolbar.offsetWidth || 320;

  const height =
    toolbar.offsetHeight || 44;

  const center =
    rect.left + rect.width / 2;

  const left =
    clamp(
      center,
      margin + width / 2,
      window.innerWidth - margin - width / 2
    );

  let top =
    rect.top - height - selectionGap;

  if (top < margin) {

    top =
      rect.bottom + selectionGap;
  }

  top =
    clamp(
      top,
      margin,
      window.innerHeight - margin - height
    );

  toolbar.style.left =
    `${left}px`;

  toolbar.style.top =
    `${top}px`;
}

function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}
