import {
  findPageByTitleOrAlias,
  getPageById
} from '../repository/pageRepository.js';

import {
  createInternalRulePage,
  findInternalRuleByPageId,
  findInternalRuleByTitleOrAlias
} from '../rulesWorkspace/rulesWorkspaceIndex.js';


export function findPageByTitle(
  title
) {

  return findPageByTitleOrAlias(
    title
  ) ||
    createInternalRulePage(
      findInternalRuleByTitleOrAlias(
        title
      )
    );
}


export function findPageByWikiLinkId(
  pageId
) {

  return getPageById(
    pageId
  ) ||
    createInternalRulePage(
      findInternalRuleByPageId(
        pageId
      )
    );
}


export function normalizePageName(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
