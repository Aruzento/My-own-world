import { state } from '../state.js';

import {
  findPageByTitle
} from './wikiLinkLookup.js';


export function createWikiLinkElement(
  title,
  targetPage = findPageByTitle(title)
) {

  const link =
    document.createElement('a');

  link.href =
    '#';

  link.className =
    'wiki-link internal-link';

  if (targetPage) {

    link.dataset.pageId =
      targetPage.id;

    link.dataset.pageTitle =
      targetPage.title;

    link.textContent =
      targetPage.title;

  } else {

    link.dataset.pageTitle =
      title;

    link.textContent =
      title;

    link.classList.add(
      'is-missing'
    );
  }

  return link;
}


export function refreshWikiLinks(
  editor
) {

  const links =
    editor.querySelectorAll(
      '.wiki-link'
    );

  links.forEach(link => {

    const page =
      findLinkedPage(
        link
      );

    if (page) {

      link.dataset.pageId =
        page.id;

      link.dataset.pageTitle =
        page.title;

      /* Видимый текст не перезаписывается: в лоре часто нужны падежи
         и склонения, отличающиеся от названия страницы. */
      if (!link.textContent.trim()) {

        link.textContent =
          page.title;
      }

      link.classList.remove(
        'is-missing'
      );

      return;
    }

    delete link.dataset.pageId;

    link.classList.add(
      'is-missing'
    );
  });
}


function findLinkedPage(
  link
) {

  const pageId =
    link.dataset.pageId;

  const pageTitle =
    link.dataset.pageTitle;

  if (pageId) {

    const page =
      state.pages.find(candidate =>
        candidate.id === pageId
      );

    if (page) return page;
  }

  if (pageTitle) {

    return findPageByTitle(
      pageTitle
    );
  }

  return null;
}
