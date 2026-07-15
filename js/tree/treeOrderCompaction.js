export const DEFAULT_ORDER_COMPACTION_MIN_GAP =
  0.000001;

export const DEFAULT_ORDER_COMPACTION_STEP =
  1000;


export function getOrderCompactionNeed(
  pages = [],
  parentId = null,
  options = {}
) {

  const siblings =
    getSortedSiblings(
      pages,
      parentId
    );

  if (siblings.length < 2) {

    return {
      needed:
        false,
      parentId:
        normalizeParentId(parentId),
      siblingCount:
        siblings.length,
      minGap:
        null,
      reason:
        'not-enough-siblings'
    };
  }

  const minGap =
    getMinimumOrderGap(
      siblings
    );

  const threshold =
    getMinGapThreshold(
      options
    );

  const needed =
    minGap !== null &&
    minGap <= threshold;

  return {
    needed,
    parentId:
      normalizeParentId(parentId),
    siblingCount:
      siblings.length,
    minGap,
    threshold,
    reason:
      needed
        ? 'dense-order-values'
        : 'order-values-healthy'
  };
}


export function createOrderCompactionPlan(
  pages = [],
  parentId = null,
  options = {}
) {

  const need =
    getOrderCompactionNeed(
      pages,
      parentId,
      options
    );

  if (!need.needed) return [];

  const step =
    getOrderStep(
      options
    );

  return getSortedSiblings(
    pages,
    parentId
  ).map((page, index) => ({
    page,
    parentId:
      normalizeParentId(parentId),
    order:
      (index + 1) * step
  }));
}


function getSortedSiblings(
  pages,
  parentId
) {

  const normalizedParentId =
    normalizeParentId(
      parentId
    );

  return (Array.isArray(pages)
    ? pages
    : [])
    .filter(page =>
      page &&
      normalizeParentId(page.parent) === normalizedParentId
    )
    .slice()
    .sort((a, b) =>
      getStableOrderValue(a) - getStableOrderValue(b)
    );
}


function getMinimumOrderGap(
  siblings
) {

  let minGap =
    null;

  for (
    let index = 1;
    index < siblings.length;
    index += 1
  ) {

    const previousOrder =
      getStableOrderValue(
        siblings[index - 1]
      );

    const currentOrder =
      getStableOrderValue(
        siblings[index]
      );

    const gap =
      Math.abs(
        currentOrder - previousOrder
      );

    minGap =
      minGap === null
        ? gap
        : Math.min(
          minGap,
          gap
        );
  }

  return minGap;
}


function getStableOrderValue(
  page
) {

  const explicitOrder =
    Number(
      page?.order
    );

  if (
    Number.isFinite(
      explicitOrder
    )
  ) {

    return explicitOrder;
  }

  const fallback =
    String(
      page?.name ||
      page?.path ||
      page?.id ||
      ''
    );

  return fallback
    .split('')
    .reduce((sum, char) =>
      sum + char.charCodeAt(0),
      0
    );
}


function getMinGapThreshold(
  options
) {

  const threshold =
    Number(
      options.minGap
    );

  return Number.isFinite(
    threshold
  ) &&
    threshold > 0
    ? threshold
    : DEFAULT_ORDER_COMPACTION_MIN_GAP;
}


function getOrderStep(
  options
) {

  const step =
    Number(
      options.step
    );

  return Number.isFinite(
    step
  ) &&
    step > 0
    ? step
    : DEFAULT_ORDER_COMPACTION_STEP;
}


function normalizeParentId(
  parentId
) {

  return parentId ?? null;
}
