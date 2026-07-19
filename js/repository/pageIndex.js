// Индекс страниц: быстрый read-only слой для поиска по metadata.

import {
  parseMarkdown
} from '../core/markdown.js';

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

    if (!this.recentOpenRecords) {

      this.recentOpenRecords =
        new Map();
    }

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

    this.searchDocuments =
      new Map();

    this.pages.forEach(page => {

      this.addToIndexes(
        page
      );
    });

    this.pruneRecentOpenRecords();

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


  searchPages(
    query,
    options = {}
  ) {

    return this.searchPageResults(
      query,
      options
    ).map(result =>
      result.page
    );
  }


  searchPageResults(
    query,
    options = {}
  ) {

    const normalizedQuery =
      normalizeSearchText(
        query
      );

    const limit =
      normalizeLimit(
        options.limit
      );

    const results =
      this.getSearchDocuments()
        .map(document =>
          normalizedQuery
            ? scoreSearchDocument(
              document,
              normalizedQuery,
              this
            )
            : createSearchResult(
              document,
              {
                score: 0,
                matchedFields: [],
                query: normalizedQuery,
                index: this
              }
            )
        )
        .filter(Boolean)
        .sort(compareSearchResults);

    return results.slice(
      0,
      limit
    );
  }


  getSearchDocuments() {

    return this.pages
      .map(page =>
        this.searchDocuments.get(
          normalizeId(
            page?.id
          )
        )
      )
      .filter(Boolean);
  }


  getPagePath(
    pageOrId,
    options = {}
  ) {

    const page =
      typeof pageOrId === 'object'
        ? pageOrId
        : this.getPageById(
          pageOrId
        );

    if (!page?.id) return '';

    const separator =
      options.separator || ' / ';

    return [
      ...this.getParentChain(
        page.id,
        {
          rootFirst: true
        }
      ),
      page
    ]
      .map(getPageDisplayTitle)
      .filter(Boolean)
      .join(
        separator
      );
  }


  markPageOpened(
    pageOrId,
    options = {}
  ) {

    const pageId =
      normalizeId(
        typeof pageOrId === 'object'
          ? pageOrId.id
          : pageOrId
      );

    if (
      !pageId ||
      !this.getPageById(
        pageId
      )
    ) {

      return this;
    }

    this.recentOpenRecords.set(
      pageId,
      {
        pageId,
        openedAt:
          createTimestamp(
            options.now
          )
      }
    );

    this.pruneRecentOpenRecords();

    return this;
  }


  getRecentPages(
    options = {}
  ) {

    const limit =
      normalizeLimit(
        options.limit,
        10
      );

    const results =
      [...this.recentOpenRecords.values()]
        .map(record => ({
          ...record,
          openedAtMs:
            parseTimestamp(
              record.openedAt
            ),
          page:
            this.getPageById(
              record.pageId
            )
        }))
        .filter(result =>
          result.page
        )
        .sort((left, right) =>
          right.openedAtMs - left.openedAtMs
        )
        .slice(
          0,
          limit
        )
        .map(result => ({
          page:
            result.page,
          openedAt:
            result.openedAt,
          path:
            this.getPagePath(
              result.page
            )
        }));

    return options.includeMetadata
      ? results
      : results.map(result =>
        result.page
      );
  }


  getRecentlyEditedPages(
    options = {}
  ) {

    const limit =
      normalizeLimit(
        options.limit,
        10
      );

    const results =
      this.getSearchDocuments()
        .filter(document =>
          Number.isFinite(
            document.updatedAtMs
          )
        )
        .map(document => ({
          page:
            document.page,
          updatedAt:
            document.updatedAt,
          updatedAtMs:
            document.updatedAtMs,
          path:
            this.getPagePath(
              document.page
            )
        }))
        .sort((left, right) =>
          right.updatedAtMs - left.updatedAtMs
        )
        .slice(
          0,
          limit
        );

    return options.includeMetadata
      ? results
      : results.map(result =>
        result.page
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

    this.searchDocuments.set(
      normalizeId(
        page.id
      ),
      createSearchDocument(
        page
      )
    );
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

    this.searchDocuments.delete(
      pageId
    );
  }


  pruneRecentOpenRecords() {

    if (!this.recentOpenRecords) {

      this.recentOpenRecords =
        new Map();

      return;
    }

    const pageIds =
      new Set(
        this.pages.map(page =>
          normalizeId(
            page?.id
          )
        )
      );

    [...this.recentOpenRecords.keys()].forEach(pageId => {

      if (
        !pageIds.has(
          pageId
        )
      ) {

        this.recentOpenRecords.delete(
          pageId
        );
      }
    });

    [...this.recentOpenRecords.entries()]
      .sort(([, left], [, right]) =>
        parseTimestamp(right.openedAt) - parseTimestamp(left.openedAt)
      )
      .slice(50)
      .forEach(([pageId]) => {

        this.recentOpenRecords.delete(
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


export function normalizeSearchText(
  value
) {

  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}


function createSearchDocument(
  page
) {

  const parsed =
    parsePageForSearch(
      page?.content
    );

  const aliases =
    normalizeSearchList(
      page?.aliases?.length
        ? page.aliases
        : parsed.aliases
    );

  const tags =
    normalizeSearchList(
      page?.tags?.length
        ? page.tags
        : parsed.tags
    );

  const title =
    getPageDisplayTitle(
      page,
      parsed
    );

  const body =
    stripHtmlToText(
      parsed.body || page?.content || ''
    );

  const name =
    String(page?.name || '');

  const updatedAt =
    page?.updatedAt || parsed.updatedAt || '';

  return {
    pageId:
      normalizeId(
        page?.id
      ),
    page,
    title,
    aliases,
    tags,
    body,
    name,
    updatedAt,
    updatedAtMs:
      parseTimestamp(
        updatedAt
      ),
    normalized:
      {
        title:
          normalizeSearchText(
            title
          ),
        aliases:
          aliases.map(normalizeSearchText),
        tags:
          tags.map(normalizeSearchText),
        body:
          normalizeSearchText(
            body
          ),
        name:
          normalizeSearchText(
            name
          ),
        all:
          normalizeSearchText(
            [
              title,
              ...aliases,
              ...tags,
              body,
              name
            ].join(' ')
          )
      }
  };
}


function parsePageForSearch(
  content
) {

  try {

    return parseMarkdown(
      content || ''
    );

  } catch (error) {

    return {
      title: '',
      aliases: [],
      tags: [],
      body:
        String(content || ''),
      updatedAt: ''
    };
  }
}


function scoreSearchDocument(
  document,
  query,
  index
) {

  let score =
    0;

  const matchedFields =
    new Set();

  score += scoreTextField(
    document.normalized.title,
    query,
    {
      exact: 1000,
      prefix: 760,
      includes: 620
    },
    matchedFields,
    'title'
  );

  score += scoreListField(
    document.normalized.aliases,
    query,
    {
      exact: 900,
      prefix: 700,
      includes: 560
    },
    matchedFields,
    'alias'
  );

  score += scoreListField(
    document.normalized.tags,
    query,
    {
      exact: 420,
      prefix: 340,
      includes: 260
    },
    matchedFields,
    'tag'
  );

  score += scoreTextField(
    document.normalized.body,
    query,
    {
      exact: 0,
      prefix: 0,
      includes: 180
    },
    matchedFields,
    'content'
  );

  score += scoreTextField(
    document.normalized.name,
    query,
    {
      exact: 180,
      prefix: 130,
      includes: 90
    },
    matchedFields,
    'file'
  );

  if (
    score === 0 &&
    document.normalized.all.includes(
      query
    )
  ) {

    score =
      20;

    matchedFields.add(
      'text'
    );
  }

  if (score <= 0) return null;

  return createSearchResult(
    document,
    {
      score,
      matchedFields:
        [...matchedFields],
      query,
      index
    }
  );
}


function createSearchResult(
  document,
  {
    score,
    matchedFields,
    query,
    index
  }
) {

  return {
    page:
      document.page,
    score,
    matchedFields,
    path:
      index.getPagePath(
        document.pageId
      ),
    excerpt:
      createSearchExcerpt(
        document.body,
        query
      ),
    updatedAt:
      document.updatedAt,
    updatedAtMs:
      document.updatedAtMs
  };
}


function scoreListField(
  values,
  query,
  weights,
  matchedFields,
  fieldName
) {

  return values.reduce(
    (highest, value) =>
      Math.max(
        highest,
        scoreTextField(
          value,
          query,
          weights,
          matchedFields,
          fieldName
        )
      ),
    0
  );
}


function scoreTextField(
  value,
  query,
  weights,
  matchedFields,
  fieldName
) {

  if (!value || !query) return 0;

  let score =
    0;

  if (
    weights.exact &&
    value === query
  ) {

    score =
      weights.exact;

  } else if (
    weights.prefix &&
    value.startsWith(
      query
    )
  ) {

    score =
      weights.prefix;

  } else if (
    weights.includes &&
    value.includes(
      query
    )
  ) {

    score =
      weights.includes;
  }

  if (score > 0) {

    matchedFields.add(
      fieldName
    );
  }

  return score;
}


function compareSearchResults(
  left,
  right
) {

  if (right.score !== left.score) {

    return right.score - left.score;
  }

  if (right.updatedAtMs !== left.updatedAtMs) {

    return right.updatedAtMs - left.updatedAtMs;
  }

  return normalizePageTitle(
    left.page?.title
  ).localeCompare(
    normalizePageTitle(
      right.page?.title
    ),
    'ru'
  );
}


function createSearchExcerpt(
  text,
  query
) {

  const source =
    String(text || '').replace(/\s+/g, ' ').trim();

  if (!source || !query) return '';

  const normalizedSource =
    normalizeSearchText(
      source
    );

  const index =
    normalizedSource.indexOf(
      query
    );

  if (index < 0) return '';

  const start =
    Math.max(
      0,
      index - 42
    );

  const end =
    Math.min(
      source.length,
      index + query.length + 58
    );

  return `${start > 0 ? '...' : ''}${source.slice(start, end)}${end < source.length ? '...' : ''}`;
}


function getPageDisplayTitle(
  page,
  parsed = {}
) {

  return String(
    page?.title ||
    parsed.title ||
    page?.name ||
    ''
  ).trim();
}


function stripHtmlToText(
  value
) {

  return String(value || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}


function normalizeSearchList(
  values
) {

  return (
    Array.isArray(values)
      ? values
      : []
  )
    .map(value =>
      String(value || '').trim()
    )
    .filter(Boolean);
}


function parseTimestamp(
  value
) {

  const timestamp =
    Date.parse(
      value
    );

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}


function createTimestamp(
  value = null
) {

  if (value instanceof Date) {

    return value.toISOString();
  }

  const normalized =
    String(value || '').trim();

  if (normalized) return normalized;

  return new Date().toISOString();
}


function normalizeLimit(
  value,
  fallback = Number.POSITIVE_INFINITY
) {

  const limit =
    Number(value);

  if (
    Number.isFinite(limit) &&
    limit >= 0
  ) {

    return limit;
  }

  return fallback;
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
