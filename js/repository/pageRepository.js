import {
  state
} from '../state.js';

import {
  subscribeState
} from '../stateActions.js';

import {
  PageIndex
} from './pageIndex.js';


// Живой read-only репозиторий страниц.
// Сейчас он пересобирает индекс целиком: это проще и безопаснее,
// чем частичные обновления, пока все старые места мутаций не переведены на API.
const pageIndex =
  new PageIndex(
    state.pages
  );


subscribeState(
  'pages',
  event => {

    pageIndex.rebuild(
      event.value
    );
  }
);


export function getPageIndex() {

  return pageIndex;
}


export function rebuildPageRepository(
  pages = state.pages
) {

  pageIndex.rebuild(
    pages
  );

  return pageIndex;
}


export function notifyPageCreated() {

  return rebuildPageRepository();
}


export function notifyPageUpdated() {

  return rebuildPageRepository();
}


export function notifyPageMoved() {

  return rebuildPageRepository();
}


export function notifyPageDeleted() {

  return rebuildPageRepository();
}


export function clearPageRepository() {

  return rebuildPageRepository(
    []
  );
}


export function getAllPages() {

  return pageIndex.getAllPages();
}


export function getPageById(
  id
) {

  return pageIndex.getPageById(
    id
  );
}


export function getPageByTitle(
  title
) {

  return pageIndex.getPageByTitle(
    title
  );
}


export function getPagesByTitle(
  title
) {

  return pageIndex.getPagesByTitle(
    title
  );
}


export function getPagesByAlias(
  alias
) {

  return pageIndex.getPagesByAlias(
    alias
  );
}


export function findPageByTitleOrAlias(
  value
) {

  return pageIndex.findPageByTitleOrAlias(
    value
  );
}


export function getChildren(
  parentId = null
) {

  return pageIndex.getChildren(
    parentId
  );
}


export function getSiblings(
  pageId
) {

  return pageIndex.getSiblings(
    pageId
  );
}


export function getParentChain(
  pageId,
  options = {}
) {

  return pageIndex.getParentChain(
    pageId,
    options
  );
}


export function isDescendantOf(
  pageId,
  ancestorId
) {

  return pageIndex.isDescendantOf(
    pageId,
    ancestorId
  );
}


export function isUnderTemplate(
  pageId,
  template
) {

  return pageIndex.isUnderTemplate(
    pageId,
    template
  );
}


export function getPagesByTemplate(
  template
) {

  return pageIndex.getPagesByTemplate(
    template
  );
}


export function getPagesByType(
  type
) {

  return pageIndex.getPagesByType(
    type
  );
}


export function getPagesByTag(
  tag
) {

  return pageIndex.getPagesByTag(
    tag
  );
}


export function queryPages(
  query = {}
) {

  return pageIndex.queryPages(
    query
  );
}


export function findDuplicateTitles() {

  return pageIndex.findDuplicateTitles();
}
