import { getValue, readEntity } from '../variables/entityVariables.js';
import { readStructuredCharacterSource } from './structuredCharacterSource.js';

export function createInventoryModel(
  options = {}
) {

  const {
    items = [],
    source = 'empty'
  } = options || {};

  const normalizedItems =
    normalizeItems(
      items
    );

  return {
    kind: 'InventoryModel',
    version: 1,
    source:
      source === 'entity' || source === 'unavailable' || normalizedItems.length
        ? source
        : 'empty',
    items:
      normalizedItems,
    totalQuantity:
      normalizedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
    ...(options?.status ? {
      status: options.status,
      diagnostics: options.diagnostics || [],
      provenance: options.provenance || null
    } : {})
  };
}


export function readInventoryModelFromPage(
  page,
  { registry, repository = null, pages = [] } = {}
) {
  const exactRepository = repository || { getPageById: id => [page, ...pages].find(candidate => candidate?.id === id) };
  const context = { registry, repository: exactRepository };
  const snapshot = registry ? readEntity(page?.id, context) :
    readStructuredCharacterSource(page, { repository: exactRepository, pages }).snapshot;
  if (!snapshot || snapshot.variablesMode === 'legacy') return readInventoryModelFromHTML(page?.content);
  const unavailable = reason => createInventoryModel({
    source: 'unavailable', status: 'unavailable', diagnostics: [{ reason }]
  });
  if (snapshot.mode !== 'structured' || !['character', 'player'].includes(snapshot.type) ||
      snapshot.definition?.definition?.capabilities?.characterProjection !== true ||
      snapshot.diagnostics.some(issue => issue.severity === 'error')) return unavailable('invalid-inventory-source');
  for (const key of ['dnd.items', 'dnd.equippedItems']) {
    const field = snapshot.definition.fieldsByKey[key];
    if (field?.binding?.owner !== 'variables' || field.datatype !== 'array' ||
        field.items?.datatype !== 'reference' || field.items.targetTypes?.length !== 1 ||
        field.items.targetTypes[0] !== 'item') return unavailable('inventory-definition-unsupported');
  }
  const items = getValue(snapshot, 'dnd.items', 'stored', context);
  const equipped = getValue(snapshot, 'dnd.equippedItems', 'stored', context);
  if (items.status === 'absent' && equipped.status === 'absent') return readInventoryModelFromHTML(page?.content);
  if (items.status !== 'value' || equipped.status !== 'value' ||
      !Array.isArray(items.value) || !Array.isArray(equipped.value)) return unavailable('incomplete-inventory-source');
  const ids = new Set(items.value.map(ref => ref.pageId));
  const equippedIds = new Set(equipped.value.map(ref => ref.pageId));
  if (ids.size !== items.value.length || equippedIds.size !== equipped.value.length ||
      [...equippedIds].some(id => !ids.has(id))) return unavailable('invalid-inventory-membership');
  const diagnostics = [];
  const projected = items.value.map(ref => {
    const target = exactRepository.getPageById(ref.pageId);
    const targetSnapshot = target ? (registry ? readEntity(ref.pageId, context) :
      readStructuredCharacterSource(target, { repository: exactRepository }).snapshot) : null;
    const validTarget = targetSnapshot?.type === 'item';
    const structuredTarget = validTarget && targetSnapshot.mode === 'structured' &&
      !targetSnapshot.diagnostics.some(issue => issue.severity === 'error');
    const quantity = structuredTarget ? getValue(targetSnapshot, 'item.quantity', 'stored') : null;
    const quantityStored = quantity?.status === 'value';
    const effectEligible = validTarget && (targetSnapshot.mode === 'legacy' || structuredTarget);
    const reason = !target ? 'missing-item' : !validTarget ? 'wrong-item-type' :
      !effectEligible ? 'invalid-item-source' : !quantityStored ? 'quantity-not-stored' : '';
    if (reason) diagnostics.push({ pageId: ref.pageId, reason });
    return {
      pageId: ref.pageId, title: target?.title || target?.name || ref.pageId,
      quantity: quantityStored ? quantity.value : 1, source: 'entity',
      equipped: equippedIds.has(ref.pageId), effectEligible,
      quantitySource: quantityStored ? 'stored' : 'presentation',
      quantityWritable: structuredTarget && quantityStored,
      itemIdentity: targetSnapshot?.pageIdentity || null
    };
  });
  return createInventoryModel({ items: projected, source: 'entity', status: 'ready', diagnostics,
    provenance: { pageId: snapshot.pageId, schemaDigest: snapshot.schemaDigest, pageIdentity: snapshot.pageIdentity } });
}


export function readInventoryModelFromHTML(
  html
) {

  if (
    typeof document === 'undefined' ||
    !html
  ) {

    return createInventoryModel();
  }

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    stripFrontMatter(
      html
    );

  const items =
    [...wrapper.querySelectorAll('.item-set-block .item-set-chip')]
      .map(readInventoryItemFromChip)
      .filter(Boolean);

  return createInventoryModel({
    items,
    source:
      items.length
        ? 'items-block'
        : 'empty'
  });
}


export function addInventoryItem(
  inventory,
  item
) {

  const model =
    createInventoryModel(
      inventory
    );

  const nextItem =
    normalizeInventoryItem(
      item
    );

  if (!nextItem) return model;

  const existing =
    model.items.find(candidate =>
      candidate.pageId === nextItem.pageId
    );

  if (existing) {

    existing.quantity +=
      nextItem.quantity;

    return createInventoryModel({
      items:
        model.items,
      source:
        model.source
    });
  }

  return createInventoryModel({
    items: [
      ...model.items,
      nextItem
    ],
    source:
      model.source === 'empty'
        ? 'manual'
        : model.source
  });
}


export function updateInventoryItemQuantity(
  inventory,
  pageId,
  quantity
) {

  const normalizedPageId =
    normalizeText(
      pageId
    );

  return createInventoryModel({
    items:
      createInventoryModel(
        inventory
      )
        .items
        .map(item =>
          item.pageId === normalizedPageId
            ? {
              ...item,
              quantity:
                normalizeQuantity(
                  quantity
                )
            }
            : item
        ),
    source:
      inventory?.source || 'manual'
  });
}


export function removeInventoryItem(
  inventory,
  pageId
) {

  const normalizedPageId =
    normalizeText(
      pageId
    );

  return createInventoryModel({
    items:
      createInventoryModel(
        inventory
      )
        .items
        .filter(item =>
          item.pageId !== normalizedPageId
        ),
    source:
      inventory?.source || 'manual'
  });
}


function readInventoryItemFromChip(
  chip
) {

  const pageId =
    normalizeText(
      chip.dataset.pageId
    );

  if (!pageId) return null;

  const quantityField =
    chip.querySelector('.item-set-quantity');

  return normalizeInventoryItem({
    pageId,
    title:
      chip.querySelector('.item-set-title')
        ?.textContent || '',
    quantity:
      quantityField?.value ||
      quantityField?.getAttribute('value') ||
      '1',
    source:
      'items-block'
  });
}


function normalizeItems(
  items
) {

  const byPageId =
    new Map();

  (Array.isArray(items) ? items : [])
    .map(normalizeInventoryItem)
    .filter(Boolean)
    .forEach(item => {

      const existing =
        byPageId.get(
          item.pageId
        );

      if (existing) {

        existing.quantity +=
          item.quantity;

        return;
      }

      byPageId.set(
        item.pageId,
        item
      );
    });

  return [...byPageId.values()];
}


function normalizeInventoryItem(
  item
) {

  const pageId =
    normalizeText(
      item?.pageId
    );

  if (!pageId) return null;

  return {
    pageId,
    title:
      normalizeText(
        item.title
      ),
    quantity: item.source === 'entity' ? item.quantity : normalizeQuantity(item.quantity),
    source:
      normalizeText(
        item.source
      ) || 'manual',
    ...(item.source === 'entity' ? {
      equipped: Boolean(item.equipped), effectEligible: Boolean(item.effectEligible),
      quantitySource: item.quantitySource, quantityWritable: Boolean(item.quantityWritable),
      itemIdentity: item.itemIdentity || null
    } : {})
  };
}


function normalizeQuantity(
  value
) {

  const number =
    Math.floor(
      Number(value)
    );

  if (!Number.isFinite(number)) return 1;

  return Math.max(
    1,
    number
  );
}


function normalizeText(
  value
) {

  return typeof value === 'string'
    ? value.trim()
    : '';
}


function stripFrontMatter(
  content
) {

  return String(content || '')
    .replace(/^---[\s\S]*?---/, '')
    .trim();
}
