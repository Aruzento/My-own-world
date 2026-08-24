export function applySettingsTooltip(
  element,
  text,
  {
    placement = 'bottom',
    delay = 480
  } = {}
) {

  if (!element || !text) return element;

  element.dataset.tooltip =
    text;

  element.dataset.tooltipPlacement =
    placement;

  element.style.setProperty(
    '--mow-tooltip-delay',
    `${delay}ms`
  );

  return element;
}
