export function positionToolbar(
  toolbar,
  rect
) {

  const margin =
    8;

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
    rect.top - height - 10;

  if (top < margin) {

    top =
      rect.bottom + 10;
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

export function positionColorPopup(
  popup,
  button
) {

  const rect =
    button.getBoundingClientRect();

  const margin =
    8;

  const width =
    popup.offsetWidth || 172;

  const height =
    popup.offsetHeight || 86;

  const left =
    clamp(
      rect.left + rect.width / 2 - width / 2,
      margin,
      window.innerWidth - margin - width
    );

  let top =
    rect.bottom + 8;

  if (top + height > window.innerHeight - margin) {

    top =
      rect.top - height - 8;
  }

  popup.style.left =
    `${left}px`;

  popup.style.top =
    `${clamp(top, margin, window.innerHeight - margin - height)}px`;
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
