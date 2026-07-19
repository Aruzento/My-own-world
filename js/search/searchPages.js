import {
  parseMarkdown
} from '../core/markdown.js';

import {
  getAllPages,
  searchPageResults as searchRepositoryPageResults
} from '../repository/pageRepository.js';

import {
  normalizeSearchText
} from '../repository/pageIndex.js';


// Единая функция поиска по страницам.
// Список страниц берется из PageRepository, а не напрямую из state.pages.
export function searchPages(
  query,
  options = {}
) {

  return searchPageResults(
    query,
    options
  ).map(result =>
    result.page
  );
}


export function searchPageResults(
  query,
  options = {}
) {

  const normalizedQuery =
    normalizeSearchQuery(
      query
    );

  if (!normalizedQuery) {

    return getAllPages().map(page => ({
      page,
      score: 0,
      matchedFields: [],
      path: '',
      excerpt: '',
      updatedAt:
        page.updatedAt || '',
      updatedAtMs:
        Date.parse(
          page.updatedAt || ''
        ) || 0
    }));
  }

  return searchRepositoryPageResults(
    normalizedQuery,
    options
  );
}


export function isPageMatchingSearch(
  page,
  normalizedQuery
) {

  const parsed =
    parseMarkdown(
      page.content || ''
    );

  const aliases =
    parsed.aliases?.length
      ? parsed.aliases
      : page.aliases || [];

  const tags =
    parsed.tags?.length
      ? parsed.tags
      : page.tags || [];

  return [
    page.name,
    page.title,
    parsed.title,
    parsed.body,
    ...tags,
    ...aliases
  ].some(value =>
    normalizeSearchQuery(
      value
    ).includes(
      normalizedQuery
    )
  );
}


export function normalizeSearchQuery(
  value
) {

  return String(value || '')
    ? normalizeSearchText(
      value
    )
    : '';
}
