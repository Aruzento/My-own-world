const CANVAS_NODE_ICONS_BY_DOMAIN = {
  character:
    'character',
  item:
    'item',
  organization:
    'lore',
  location:
    'location',
  map:
    'campaign-map',
  rule:
    'lore',
  note:
    'document'
};


export function getCanvasNodeIcon(
  node
) {

  return CANVAS_NODE_ICONS_BY_DOMAIN[node?.domain] ||
    CANVAS_NODE_ICONS_BY_DOMAIN.note;
}
