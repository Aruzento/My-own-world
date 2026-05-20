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
  'task-tracker': 'task-tracker'
};


export function iconSvg(
  name,
  className = 'app-icon'
) {

  return `
    <svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">
      <use href="${ICON_SPRITE_PATH}#icon-${name}"></use>
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
