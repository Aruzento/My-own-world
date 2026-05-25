import {
  normalizeText
} from './campaignMapGeometry.js';

import {
  isCampaignMapRecord
} from './campaignMapContract.js';

import {
  getAllPages,
  getChildren,
  getParentChain
} from '../repository/pageRepository.js';


// Модуль связывает карту кампании с деревом страниц.
// Карта не должна сама знать детали поиска родителей и CSS-подсветки дерева.

export function createPageLookup() {

  return new Map(
    getAllPages().map(page => [
      page.id,
      page
    ])
  );
}


export function hasCampaignMapAncestor(
  page,
  pageLookup = createPageLookup()
) {

  if (!page?.id) return false;

  return getParentChain(
    page.id
  ).some(parent =>
    isCampaignMapRecord(
      parent
    )
  );
}


export function findMapBucket(
  mapPageId,
  title
) {

  const normalizedTitle =
    normalizeText(
      title
    );

  return getChildren(
    mapPageId
  ).find(page =>
    normalizeText(
      page.title
    ) === normalizedTitle
  ) || null;
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
