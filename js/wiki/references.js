import {
  parseMarkdown
} from '../core/markdown.js';

import {
  getAllPages
} from '../repository/pageRepository.js';


export function getBacklinks(
  targetPage
) {

  if (!targetPage) return [];

  return getAllPages().filter(page => {

    if (
      page.id === targetPage.id
    ) {

      return false;
    }

    return pageLinksToTarget(
      page,
      targetPage
    );
  });
}


function pageLinksToTarget(
  sourcePage,
  targetPage
) {

  const parsed =
    parseMarkdown(
      sourcePage.content
    );

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    parsed.body;

wrapper
  .querySelectorAll('img[data-asset]')
  .forEach(img => {

    img.removeAttribute(
      'src'
    );
  });

  const links =
    wrapper.querySelectorAll(
      '.wiki-link'
    );

  return [...links].some(link => {

    const pageId =
      link.dataset.pageId;

    const pageTitle =
      link.dataset.pageTitle;

    if (
      pageId &&
      pageId === targetPage.id
    ) {

      return true;
    }

    if (
      pageTitle &&
      matchesPageName(
        pageTitle,
        targetPage
      )
    ) {

      return true;
    }

    return false;
  });
}


function matchesPageName(
  value,
  page
) {

  const normalizedValue =
    normalize(value);

  if (
    normalize(page.title) === normalizedValue
  ) {

    return true;
  }

  const aliases =
    page.aliases || [];

  return aliases.some(alias =>
    normalize(alias) === normalizedValue
  );
}


function normalize(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
