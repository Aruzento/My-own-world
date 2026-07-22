const ICON_SPRITE_PATH =
  './assets/icons/rpg-ui.svg';

const pageIcons = {
  character: 'character',
  creature: 'creature',
  location: 'location',
  lore: 'lore',
  item: 'item',
  object: 'object',
  region: 'region',
  folder: 'folder',
  magic: 'magic',
  skill: 'skill',
  'campaign-map': 'campaign-map',
  'task-tracker': 'task-tracker',
  'rule-tree': 'lore'
};


function normalizeIconName(
  name
) {

  return String(name || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '') ||
    'document';
}


function escapeAttribute(
  value
) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function escapeText(
  value
) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


export function iconSvg(
  name,
  className = 'app-icon',
  options = {}
) {

  const iconName =
    normalizeIconName(
      name
    );

  const label =
    options.ariaLabel ||
    options.title ||
    '';

  const accessibility =
    label
      ? `role="img" aria-label="${escapeAttribute(label)}"`
      : 'aria-hidden="true"';

  const sizeAttribute =
    options.size
      ? ` data-icon-size="${escapeAttribute(options.size)}"`
      : '';

  const title =
    options.title
      ? `
      <title>${escapeText(options.title)}</title>`
      : '';

  return `
    <svg class="${escapeAttribute(className)}" viewBox="0 0 24 24" focusable="false" data-icon-name="${iconName}"${sizeAttribute} ${accessibility}>${title}
      <use href="${ICON_SPRITE_PATH}#icon-${iconName}"></use>
    </svg>
  `;
}


export function getPageIcon(
  tags = []
) {

  const normalized =
    tags.map(tag => String(tag).toLowerCase());

  const iconName =
    Object
      .entries(pageIcons)
      .find(([tag]) => normalized.includes(tag))
      ?.[1] || 'document';

  return `
    <span class="entity-icon">
      ${iconSvg(iconName, 'entity-icon-svg')}
    </span>
  `;
}
