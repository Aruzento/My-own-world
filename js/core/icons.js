const icons = {
  character: `
    <span class="entity-icon">
      <svg viewBox="0 0 24 24">
        <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"></path>
        <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"></path>
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
  if (normalized.includes('location')) return icons.location;
  if (normalized.includes('item')) return icons.item;
  if (normalized.includes('lore')) return icons.lore;

  return icons.default;
}