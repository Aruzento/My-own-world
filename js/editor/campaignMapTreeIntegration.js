import { state } from '../state.js';

import {
  normalizeText
} from './campaignMapGeometry.js';

import {
  isCampaignMapRecord
} from './campaignMapContract.js';


// Модуль связывает карту кампании с деревом страниц.
// Карта не должна сама знать детали поиска родителей и CSS-подсветки дерева.

export function createPageLookup() {

  return new Map(
    state.pages.map(page => [
      page.id,
      page
    ])
  );
}


export function hasCampaignMapAncestor(
  page,
  pageLookup = createPageLookup()
) {

  let current =
    page;

  while (current?.parent) {

    const parent =
      pageLookup.get(
        current.parent
      );

    if (!parent) return false;

    if (
      isCampaignMapRecord(parent)
    ) return true;

    current =
      parent;
  }

  return false;
}


export function findMapBucket(
  mapPageId,
  title
) {

  return state.pages.find(page =>
    page.parent === mapPageId &&
    normalizeText(page.title) === normalizeText(title)
  );
}


export function highlightTreePage(
  pageId
) {

  document
    .querySelector(`.tree-item[data-page-id="${pageId}"]`)
    ?.classList.add(
      'is-linked-token'
    );
}


export function clearTreeHighlight(
  pageId
) {

  document
    .querySelector(`.tree-item[data-page-id="${pageId}"]`)
    ?.classList.remove(
      'is-linked-token'
    );
}
