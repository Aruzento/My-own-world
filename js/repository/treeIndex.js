import {
  getPageOrder
} from '../tree/treeUtils.js';


export class TreeIndex {

  constructor(
    pages = []
  ) {

    this.rebuild(
      pages
    );
  }


  rebuild(
    pages = []
  ) {

    this.pages =
      Array.isArray(pages)
        ? [...pages]
        : [];

    this.byId =
      new Map();

    this.parentByPageId =
      new Map();

    this.orderByPageId =
      new Map();

    this.childrenByParent =
      new Map();

    this.pages.forEach(page => {

      if (!page?.id) return;

      this.byId.set(
        normalizeId(page.id),
        page
      );

      this.addToParentIndex(
        page
      );
    });

    this.sortChildren();

    return this;
  }


  getChildren(
    parentId = null
  ) {

    return [
      ...(
        this.childrenByParent.get(
          normalizeParentId(
            parentId
          )
        ) || []
      )
    ];
  }


  getRootPages() {

    return this.getChildren(
      null
    );
  }


  getSiblings(
    pageId
  ) {

    const parentId =
      this.parentByPageId.get(
        normalizeId(
          pageId
        )
      );

    return this.getChildren(
      parentId ?? null
    );
  }


  getParentId(
    pageId
  ) {

    return this.parentByPageId.get(
      normalizeId(
        pageId
      )
    ) ?? null;
  }


  getOrder(
    pageId
  ) {

    return this.orderByPageId.get(
      normalizeId(
        pageId
      )
    ) ?? 0;
  }


  isDescendantOf(
    pageId,
    ancestorId
  ) {

    const normalizedAncestorId =
      normalizeId(
        ancestorId
      );

    if (!normalizedAncestorId) return false;

    const visited =
      new Set();

    let currentId =
      normalizeId(
        pageId
      );

    while (currentId) {

      if (
        visited.has(
          currentId
        )
      ) return false;

      visited.add(
        currentId
      );

      const parentId =
        this.parentByPageId.get(
          currentId
        );

      if (!parentId) return false;

      if (parentId === normalizedAncestorId) return true;

      currentId =
        parentId;
    }

    return false;
  }


  addPage(
    page
  ) {

    if (!page?.id) return this;

    const existing =
      this.byId.get(
        normalizeId(
          page.id
        )
      );

    if (existing) {

      return this.updatePage(
        existing,
        page
      );
    }

    this.pages.push(
      page
    );

    this.byId.set(
      normalizeId(page.id),
      page
    );

    this.addToParentIndex(
      page
    );

    this.sortChildrenForParent(
      page.parent ?? null
    );

    return this;
  }


  updatePage(
    previousPage,
    nextPage
  ) {

    if (!nextPage?.id) return this;

    this.deletePage(
      previousPage || nextPage
    );

    this.addPage(
      nextPage
    );

    return this;
  }


  deletePage(
    page
  ) {

    const pageId =
      normalizeId(
        page?.id
      );

    if (!pageId) return this;

    const existing =
      this.byId.get(
        pageId
      ) || page;

    this.byId.delete(
      pageId
    );

    this.parentByPageId.delete(
      pageId
    );

    this.orderByPageId.delete(
      pageId
    );

    this.pages =
      this.pages.filter(candidate =>
        normalizeId(candidate?.id) !== pageId
      );

    const parentKey =
      normalizeParentId(
        page?.parent ?? existing?.parent
      );

    const siblings =
      this.childrenByParent.get(
        parentKey
      ) || [];

    this.childrenByParent.set(
      parentKey,
      siblings.filter(candidate =>
        normalizeId(candidate?.id) !== pageId
      )
    );

    return this;
  }


  deletePages(
    pages = []
  ) {

    pages.forEach(page => {

      this.deletePage(
        page
      );
    });

    return this;
  }


  validate() {

    const errors =
      [];

    const warnings =
      [];

    const ids =
      new Set();

    this.pages.forEach(page => {

      const pageId =
        normalizeId(
          page?.id
        );

      if (!pageId) {

        errors.push({
          code: 'tree.page_missing_id',
          message: 'Page has no stable id.',
          page
        });

        return;
      }

      if (
        ids.has(
          pageId
        )
      ) {

        errors.push({
          code: 'tree.duplicate_id',
          message: `Duplicate page id: ${pageId}`,
          pageId
        });
      }

      ids.add(
        pageId
      );

      const parentId =
        normalizeId(
          page.parent
        );

      if (
        parentId &&
        !this.byId.has(
          parentId
        )
      ) {

        errors.push({
          code: 'tree.missing_parent',
          message: `Missing parent ${parentId} for page ${pageId}.`,
          pageId,
          parentId
        });
      }

      if (
        !Number.isFinite(
          getTreePageOrder(
            page
          )
        )
      ) {

        warnings.push({
          code: 'tree.invalid_order',
          message: `Invalid order for page ${pageId}.`,
          pageId
        });
      }
    });

    this.pages.forEach(page => {

      const cycle =
        findParentCycle(
          page,
          this.byId
        );

      if (!cycle) return;

      errors.push({
        code: 'tree.parent_cycle',
        message: `Parent cycle detected: ${cycle.join(' -> ')}.`,
        pageId:
          page.id,
        cycle
      });
    });

    return {
      valid:
        errors.length === 0,
      errors,
      warnings
    };
  }


  addToParentIndex(
    page
  ) {

    const pageId =
      normalizeId(
        page.id
      );

    const parentId =
      normalizeParentId(
        page.parent
      );

    this.parentByPageId.set(
      pageId,
      parentId
    );

    this.orderByPageId.set(
      pageId,
      getTreePageOrder(
        page
      )
    );

    if (
      !this.childrenByParent.has(
        parentId
      )
    ) {

      this.childrenByParent.set(
        parentId,
        []
      );
    }

    this.childrenByParent.get(
      parentId
    ).push(
      page
    );
  }


  sortChildren() {

    for (const parentId of this.childrenByParent.keys()) {

      this.sortChildrenForParent(
        parentId
      );
    }
  }


  sortChildrenForParent(
    parentId
  ) {

    const normalizedParentId =
      normalizeParentId(
        parentId
      );

    const children =
      this.childrenByParent.get(
        normalizedParentId
      );

    if (!children) return;

    children.sort((left, right) =>
      getTreePageOrder(left) - getTreePageOrder(right)
    );
  }
}


function getTreePageOrder(
  page
) {

  if (
    typeof page?.order === 'number' &&
    Number.isFinite(
      page.order
    )
  ) {

    return page.order;
  }

  if (
    typeof page?.name === 'string'
  ) {

    return getPageOrder(
      page
    );
  }

  return 0;
}


function findParentCycle(
  page,
  byId
) {

  const chain =
    [];

  const visited =
    new Set();

  let current =
    page;

  while (current?.parent) {

    const parentId =
      normalizeId(
        current.parent
      );

    if (!parentId) return null;

    chain.push(
      parentId
    );

    if (
      visited.has(
        parentId
      )
    ) {

      return chain;
    }

    visited.add(
      parentId
    );

    current =
      byId.get(
        parentId
      );
  }

  return null;
}


function normalizeId(
  value
) {

  return String(value || '')
    .trim();
}


function normalizeParentId(
  value
) {

  const id =
    normalizeId(
      value
    );

  return id || null;
}
