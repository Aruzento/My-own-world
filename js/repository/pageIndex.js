// Индекс страниц: быстрый read-only слой для поиска по metadata.

export class PageIndex {

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

    this.byTitle =
      new Map();

    this.byAlias =
      new Map();

    this.byParent =
      new Map();

    this.byTemplate =
      new Map();

    this.byType =
      new Map();

    this.byTag =
      new Map();

    this.pages.forEach(page => {

      this.addToIndexes(
        page
      );
    });

    return this;
  }


  getAllPages() {

    return [...this.pages];
  }


  getPageById(
    id
  ) {

    return this.byId.get(
      normalizeId(
        id
      )
    ) || null;
  }


  getPagesByTitle(
    title
  ) {

    return [
      ...(
        this.byTitle.get(
          normalizePageTitle(
            title
          )
        ) || []
      )
    ];
  }


  getPageByTitle(
    title
  ) {

    return this.getPagesByTitle(
      title
    )[0] || null;
  }


  getPagesByAlias(
    alias
  ) {

    return [
      ...(
        this.byAlias.get(
          normalizePageTitle(
            alias
          )
        ) || []
      )
    ];
  }


  findPageByTitleOrAlias(
    value
  ) {

    return this.getPageByTitle(
      value
    ) || this.getPagesByAlias(
      value
    )[0] || null;
  }


  getChildren(
    parentId = null
  ) {

    return sortPagesByOrder(
      this.byParent.get(
        normalizeParentId(
          parentId
        )
      ) || []
    );
  }


  getSiblings(
    pageId
  ) {

    const page =
      this.getPageById(
        pageId
      );

    if (!page) return [];

    return this.getChildren(
      page.parent || null
    );
  }


  getParentChain(
    pageId,
    options = {}
  ) {

    const chain =
      [];

    const visited =
      new Set();

    let current =
      this.getPageById(
        pageId
      );

    while (
      current?.parent
    ) {

      if (
        visited.has(
          current.parent
        )
      ) {

        break;
      }

      visited.add(
        current.parent
      );

      const parent =
        this.getPageById(
          current.parent
        );

      if (!parent) break;

      chain.push(
        parent
      );

      current =
        parent;
    }

    return options.rootFirst
      ? chain.reverse()
      : chain;
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

    return this.getParentChain(
      pageId
    ).some(page =>
      page.id === normalizedAncestorId
    );
  }


  isUnderTemplate(
    pageId,
    template
  ) {

    const normalizedTemplate =
      normalizeLookupValue(
        template
      );

    if (!normalizedTemplate) return false;

    return this.getParentChain(
      pageId
    ).some(page =>
      normalizeLookupValue(page.template) === normalizedTemplate
    );
  }


  getPagesByTemplate(
    template
  ) {

    return this.getSetValues(
      this.byTemplate,
      template
    );
  }


  getPagesByType(
    type
  ) {

    return this.getSetValues(
      this.byType,
      type
    );
  }


  getPagesByTag(
    tag
  ) {

    return this.getSetValues(
      this.byTag,
      tag
    );
  }


  queryPages(
    query = {}
  ) {

    const predicates =
      buildQueryPredicates(
        this,
        query
      );

    return this.pages.filter(page =>
      predicates.every(predicate =>
        predicate(page)
      )
    );
  }


  findDuplicateTitles() {

    return [...this.byTitle.entries()]
      .filter(([, pages]) =>
        pages.size > 1
      )
      .map(([title, pages]) => ({
        title,
        pages: [...pages]
      }));
  }


  getSetValues(
    map,
    key
  ) {

    return [
      ...(
        map.get(
          normalizeLookupValue(
            key
          )
        ) || []
      )
    ];
  }


  addPage(
    page
  ) {

    if (!page?.id) return this;

    const existingIndex =
      this.pages.findIndex(candidate =>
        candidate?.id === page.id
      );

    if (existingIndex >= 0) {

      this.updatePage(
        this.pages[existingIndex],
        page
      );

      return this;
    }

    this.pages.push(
      page
    );

    this.addToIndexes(
      page
    );

    return this;
  }


  updatePage(
    previousPage,
    nextPage
  ) {

    if (!nextPage?.id) return this;

    const pageId =
      normalizeId(
        nextPage.id
      );

    if (!pageId) return this;

    this.removeFromIndexes(
      previousPage || nextPage,
      pageId
    );

    const existingIndex =
      this.pages.findIndex(page =>
        normalizeId(page?.id) === pageId
      );

    if (existingIndex >= 0) {

      this.pages[existingIndex] =
        nextPage;

    } else {

      this.pages.push(
        nextPage
      );
    }

    this.addToIndexes(
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

    this.removeFromIndexes(
      page,
      pageId
    );

    this.pages =
      this.pages.filter(candidate =>
        normalizeId(candidate?.id) !== pageId
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


  addToIndexes(
    page
  ) {

    if (!page?.id) return;

    this.byId.set(
      normalizeId(page.id),
      page
    );

    addToMapSet(
      this.byTitle,
      normalizePageTitle(page.title),
      page
    );

    (page.aliases || []).forEach(alias => {

      addToMapSet(
        this.byAlias,
        normalizePageTitle(alias),
        page
      );
    });

    addToMapSet(
      this.byParent,
      normalizeParentId(page.parent || null),
      page
    );

    addToMapSet(
      this.byTemplate,
      normalizeLookupValue(page.template),
      page
    );

    addToMapSet(
      this.byType,
      normalizeLookupValue(page.type),
      page
    );

    (page.tags || []).forEach(tag => {

      addToMapSet(
        this.byTag,
        normalizeLookupValue(tag),
        page
      );
    });
  }


  removeFromIndexes(
    page,
    pageId = normalizeId(page?.id)
  ) {

    if (!pageId) return;

    this.byId.delete(
      pageId
    );

    removeFromMapSet(
      this.byTitle,
      normalizePageTitle(page?.title),
      pageId
    );

    (page?.aliases || []).forEach(alias => {

      removeFromMapSet(
        this.byAlias,
        normalizePageTitle(alias),
        pageId
      );
    });

    removeFromMapSet(
      this.byParent,
      normalizeParentId(page?.parent || null),
      pageId
    );

    removeFromMapSet(
      this.byTemplate,
      normalizeLookupValue(page?.template),
      pageId
    );

    removeFromMapSet(
      this.byType,
      normalizeLookupValue(page?.type),
      pageId
    );

    (page?.tags || []).forEach(tag => {

      removeFromMapSet(
        this.byTag,
        normalizeLookupValue(tag),
        pageId
      );
    });
  }
}


export function normalizePageTitle(
  title
) {

  return String(title || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}


export function normalizeLookupValue(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


function normalizeId(
  id
) {

  return String(id || '')
    .trim();
}


function normalizeParentId(
  parentId
) {

  const normalized =
    normalizeId(
      parentId
    );

  return normalized || '__root__';
}


function addToMapSet(
  map,
  key,
  page
) {

  if (!key) return;

  if (!map.has(key)) {

    map.set(
      key,
      new Set()
    );
  }

  map.get(key).add(
    page
  );
}


function removeFromMapSet(
  map,
  key,
  pageId
) {

  if (!key || !map.has(key)) return;

  const set =
    map.get(key);

  for (const page of set) {

    if (
      normalizeId(page?.id) === pageId
    ) {

      set.delete(
        page
      );
    }
  }

  if (set.size === 0) {

    map.delete(
      key
    );
  }
}


function sortPagesByOrder(
  pages
) {

  return [...pages].sort((a, b) => {

    const orderA =
      Number.isFinite(a.order)
        ? a.order
        : 0;

    const orderB =
      Number.isFinite(b.order)
        ? b.order
        : 0;

    if (orderA !== orderB) {

      return orderA - orderB;
    }

    return normalizePageTitle(a.title).localeCompare(
      normalizePageTitle(b.title),
      'ru'
    );
  });
}


function buildQueryPredicates(
  index,
  query
) {

  const predicates =
    [];

  if ('template' in query) {

    predicates.push(page =>
      matchesAny(
        page.template,
        query.template
      )
    );
  }

  if ('type' in query) {

    predicates.push(page =>
      matchesAny(
        page.type,
        query.type
      )
    );
  }

  if ('parent' in query) {

    const normalizedParent =
      normalizeParentId(
        query.parent
      );

    predicates.push(page =>
      normalizeParentId(page.parent || null) === normalizedParent
    );
  }

  if ('tags' in query) {

    const tags =
      normalizeArray(
        query.tags
      );

    predicates.push(page => {

      const pageTags =
        new Set(
          normalizeArray(
            page.tags || []
          )
        );

      return tags.every(tag =>
        pageTags.has(tag)
      );
    });
  }

  if ('excludeUnderTemplate' in query) {

    predicates.push(page =>
      !index.isUnderTemplate(
        page.id,
        query.excludeUnderTemplate
      )
    );
  }

  return predicates;
}


function matchesAny(
  value,
  expected
) {

  const normalizedValue =
    normalizeLookupValue(
      value
    );

  const expectedValues =
    normalizeArray(
      expected
    );

  if (expectedValues.length === 0) return true;

  return expectedValues.includes(
    normalizedValue
  );
}


function normalizeArray(
  value
) {

  return (
    Array.isArray(value)
      ? value
      : [value]
  )
    .map(item =>
      normalizeLookupValue(
        item
      )
    )
    .filter(Boolean);
}
