export const LEGACY_PROPERTY_BLOCK_TYPES = [
  'dndStats',
  'dndStatsV2',
  'characterSheet',
  'characterEffects',
  'items',
  'spells',
  'skills',
  'variables'
];


// Мост миграции ничего не переписывает автоматически.
// Он только описывает, какие старые блоки есть и куда они должны переехать.
export function inspectLegacyPropertyBlocksFromHTML(
  html
) {

  if (
    typeof document === 'undefined' ||
    !html
  ) {

    return createLegacyPropertyReport([]);
  }

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    String(html || '');

  const blocks =
    [
      ...wrapper.querySelectorAll(
        '.template-block[data-block-type]'
      )
    ]
      .map(readLegacyBlockDescriptor)
      .filter(Boolean);

  return createLegacyPropertyReport(
    blocks
  );
}


export function createLegacyPropertyReport(
  blocks
) {

  const items =
    blocks.filter(block =>
      LEGACY_PROPERTY_BLOCK_TYPES.includes(
        block.type
      )
    );

  return {
    kind: 'PropertiesLegacyReport',
    version: 1,
    hasLegacy:
      items.length > 0,
    items,
    recommendedAction:
      items.length > 0
        ? 'show-convert-to-properties'
        : 'none'
  };
}


export function getLegacyBlockTarget(
  type
) {

  const targets = {
    dndStats: 'properties',
    dndStatsV2: 'properties',
    characterSheet: 'properties-mode',
    characterEffects: 'properties',
    items: 'list',
    spells: 'list',
    skills: 'list',
    variables: 'properties'
  };

  return targets[type] || 'properties';
}


function readLegacyBlockDescriptor(
  block
) {

  const type =
    block.dataset.blockType;

  if (
    !LEGACY_PROPERTY_BLOCK_TYPES.includes(
      type
    )
  ) return null;

  return {
    type,
    title:
      block.querySelector('h2')
        ?.textContent
        ?.trim() ||
      type,
    target:
      getLegacyBlockTarget(
        type
      ),
    canAutoConvert:
      false
  };
}
