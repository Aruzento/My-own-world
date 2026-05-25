import {
  parseMarkdown
} from '../core/markdown.js';

import {
  getAllPages
} from '../repository/pageRepository.js';


// Единая функция поиска по страницам.
// Список страниц берется из PageRepository, а не напрямую из state.pages.
export function searchPages(
  query
) {

  const normalizedQuery =
    normalizeSearchQuery(
      query
    );

  const pages =
    getAllPages();

  if (!normalizedQuery) {

    return pages;
  }

  return pages.filter(page =>
    isPageMatchingSearch(
      page,
      normalizedQuery
    )
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
    .trim()
    .toLowerCase();
}
