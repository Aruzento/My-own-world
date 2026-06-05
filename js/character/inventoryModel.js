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
      normalizedItems.length
        ? source
        : 'empty',
    items:
      normalizedItems,
    totalQuantity:
      normalizedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      )
  };
}


export function readInventoryModelFromPage(
  page
) {

  return readInventoryModelFromHTML(
    page?.content
  );
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
    quantity:
      normalizeQuantity(
        item.quantity
      ),
    source:
      normalizeText(
        item.source
      ) || 'manual'
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
