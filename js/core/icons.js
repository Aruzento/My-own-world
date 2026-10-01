import { BUNDLED_CARD_TYPE_DEFINITIONS } from '../cardTypes/definitions/bundledDefinitions.js';
import { parsePageRecordContent } from './pageRecord.js';
import { captureStorageWorkspaceContext, isStorageWorkspaceContextCurrent } from '../storage/storageAdapter.js';

const pageIconCache = new WeakMap();
let iconHydrationQueued = false;

function readPageIconAsset(page) {
  if (!page?.content) return null;
  const cached = pageIconCache.get(page);
  if (cached?.content === page.content) return cached.path;
  let path = null;
  try {
    const headerEnd = page.content.startsWith('---') ? page.content.indexOf('\n---', 3) : -1;
    if (headerEnd < 0 || !/^iconjson\s*:/im.test(page.content.slice(0, headerEnd))) {
      pageIconCache.set(page, { content: page.content, path }); return null;
    }
    const raw = parsePageRecordContent(page.content, { generateId: false }).frontMatter.values.iconjson;
    const value = raw && JSON.parse(raw);
    if (value?.kind === 'asset' && Object.keys(value).every(key => ['kind', 'path'].includes(key)) && typeof value.path === 'string' && /^assets\//.test(value.path) &&
        !/(?:^|\/)\.{1,2}(?:\/|$)|[\\:\u0000-\u001f]/.test(value.path)) path = value.path;
  } catch { /* Malformed metadata keeps the canonical type icon. */ }
  pageIconCache.set(page, { content: page.content, path });
  return path;
}

function queueIconHydration() {
  if (iconHydrationQueued || typeof document === 'undefined') return;
  iconHydrationQueued = true;
  queueMicrotask(async () => {
    iconHydrationQueued = false;
    let workspace;
    try { workspace = captureStorageWorkspaceContext(); } catch { return; }
    const nodes = [...document.querySelectorAll('img[data-page-icon-asset]:not([data-icon-pending])')];
    if (!nodes.length) return;
    nodes.forEach(node => { node.dataset.iconPending = 'true'; });
    const { getRenderableImageURL } = await import('../storage/assetStorage.js');
    for (const node of nodes) {
      try {
        if (!isStorageWorkspaceContextCurrent(workspace)) return;
        const url = await getRenderableImageURL(node.dataset.pageIconAsset);
        if (!node.isConnected || !isStorageWorkspaceContextCurrent(workspace)) continue;
        node.src = url; node.hidden = false;
        node.previousElementSibling?.setAttribute('hidden', '');
      } catch { /* Type icon remains visible when asset presentation fails. */ }
    }
  });
}

const ICON_SPRITE_PATH =
  './assets/icons/rpg-ui.svg';

// Presentation aliases only; formal ids/labels are owned by Registry definitions.
const canonicalIcons = new Map(BUNDLED_CARD_TYPE_DEFINITIONS.map(type => [type.id,
  type.metadata?.icon || ({ player: 'character', spell: 'magic', effect: 'magic', country: 'region', organization: 'folder', project: 'folder', race: 'character', class: 'character' }[type.id]) || type.id]));
const legacyPageIcons = {
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
  page = []
) {
  const customAsset = !Array.isArray(page) && readPageIconAsset(page);
  if (customAsset) queueIconHydration();
  const tags = Array.isArray(page) ? page : page.tags || [];
  const normalized =
    tags.map(tag => String(tag).toLowerCase());

  const iconName = (!Array.isArray(page) && canonicalIcons.get(page.type)) ||
    Object
      .entries(legacyPageIcons)
      .find(([tag]) => normalized.includes(tag))
      ?.[1] || 'document';

  return `
    <span class="entity-icon">
      ${iconSvg(iconName, 'entity-icon-svg')}
      ${customAsset ? `<img class="entity-icon-image" data-page-icon-asset="${escapeAttribute(customAsset)}" hidden alt="">` : ''}
    </span>
  `;
}
