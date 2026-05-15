const icons = {
  character: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"></path>
        <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path>
      </svg>
    </span>
  `,

  creature: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M12 3l2.5 5l5.5 .8l-4 3.9l.9 5.5l-4.9 -2.6l-4.9 2.6l.9 -5.5l-4 -3.9l5.5 -.8z"></path>
      </svg>
    </span>
  `,

  location: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"></path>
        <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0"></path>
      </svg>
    </span>
  `,

  lore: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M12 6l4 6l5 -4l-2 10h-14l-2 -10l5 4l4 -6"></path>
      </svg>
    </span>
  `,

  item: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M6 3h12l2 6l-8 12l-8 -12z"></path>
        <path d="M6 3l6 18l6 -18"></path>
        <path d="M4 9h16"></path>
      </svg>
    </span>
  `,

  object: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M12 3l8 4.5v9l-8 4.5l-8 -4.5v-9z"></path>
        <path d="M12 12l8 -4.5"></path>
        <path d="M12 12v9"></path>
        <path d="M12 12l-8 -4.5"></path>
      </svg>
    </span>
  `,

  region: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path>
        <path d="M3.6 9h16.8"></path>
        <path d="M3.6 15h16.8"></path>
        <path d="M12 3a14 14 0 0 1 0 18"></path>
        <path d="M12 3a14 14 0 0 0 0 18"></path>
      </svg>
    </span>
  `,

  folder: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M3 7a2 2 0 0 1 2 -2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"></path>
      </svg>
    </span>
  `,

  magic: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M4 20l10 -10"></path>
        <path d="M13 5l6 6"></path>
        <path d="M15 3l6 6"></path>
        <path d="M9 4l1 2l2 1l-2 1l-1 2l-1 -2l-2 -1l2 -1z"></path>
        <path d="M18 14l0.7 1.4l1.3 0.6l-1.3 0.6l-0.7 1.4l-0.7 -1.4l-1.3 -0.6l1.3 -0.6z"></path>
      </svg>
    </span>
  `,

  campaignMap: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M9 18l-6 3v-15l6 -3l6 3l6 -3v15l-6 3z"></path>
        <path d="M9 3v15"></path>
        <path d="M15 6v15"></path>
      </svg>
    </span>
  `,

  default: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
        <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"></path>
      </svg>
    </span>
  `,
};

export function getPageIcon(tags = []) {
  const normalized =
    tags.map(t => t.toLowerCase());

  if (normalized.includes('character')) return icons.character;
  if (normalized.includes('creature')) return icons.creature;
  if (normalized.includes('location')) return icons.location;
  if (normalized.includes('object')) return icons.object;
  if (normalized.includes('item')) return icons.item;
  if (normalized.includes('lore')) return icons.lore;
  if (normalized.includes('region')) return icons.region;
  if (normalized.includes('folder')) return icons.folder;
  if (normalized.includes('magic')) return icons.magic;
  if (normalized.includes('campaign-map')) return icons.campaignMap;

  return icons.default;
}
