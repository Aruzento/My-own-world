import {
  findPageByTitleOrAlias,
  getPageById
} from '../repository/pageRepository.js';


export function findPageByTitle(
  title
) {

  return findPageByTitleOrAlias(
    title
  );
}


export function findPageByWikiLinkId(
  pageId
) {

  return getPageById(
    pageId
  );
}


export function normalizePageName(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
