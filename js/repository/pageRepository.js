import {
  state
} from '../state.js';

import {
  subscribeState
} from '../stateActions.js';

import {
  PageIndex
} from './pageIndex.js';

import {
  TreeIndex
} from './treeIndex.js';


// Живой read-only репозиторий страниц.
// Load/setPages пересобирает индекс целиком, а известные lifecycle events
// обновляют только затронутые страницы, чтобы большие workspace не подвисали.
const pageIndex =
  new PageIndex(
    state.pages
  );

const treeIndex =
  new TreeIndex(
    state.pages
  );


subscribeState(
  'pages',
  event => {

    pageIndex.rebuild(
      event.value
    );

    treeIndex.rebuild(
      event.value
    );
  }
);


export function getPageIndex() {

  return pageIndex;
}


export function getTreeIndex() {

  return treeIndex;
}


export function validateTreeIndex() {

  return treeIndex.validate();
}


export function rebuildPageRepository(
  pages = state.pages
) {

  pageIndex.rebuild(
    pages
  );

  treeIndex.rebuild(
    pages
  );

  return pageIndex;
}


export function notifyPageCreated(
  page
) {

  if (page?.id) {

    pageIndex.addPage(
      page
    );

    treeIndex.addPage(
      page
    );

    return pageIndex;
  }

  return rebuildPageRepository();
}


export function notifyPageUpdated(
  previousPage,
  nextPage
) {

  if (nextPage?.id) {

    pageIndex.updatePage(
      previousPage,
      nextPage
    );

    treeIndex.updatePage(
      previousPage,
      nextPage
    );

    return pageIndex;
  }

  return rebuildPageRepository();
}


export function notifyPageMoved(
  previousPage,
  nextPage
) {

  if (nextPage?.id) {

    pageIndex.updatePage(
      previousPage,
      nextPage
    );

    treeIndex.updatePage(
      previousPage,
      nextPage
    );

    return pageIndex;
  }

  return rebuildPageRepository();
}


export function notifyPageDeleted(
  pageOrPages
) {

  if (Array.isArray(pageOrPages)) {

    pageIndex.deletePages(
      pageOrPages
    );

    treeIndex.deletePages(
      pageOrPages
    );

    return pageIndex;
  }

  if (pageOrPages?.id) {

    pageIndex.deletePage(
      pageOrPages
    );

    treeIndex.deletePage(
      pageOrPages
    );

    return pageIndex;
  }

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

  return treeIndex.getChildren(
    parentId
  );
}


export function getSiblings(
  pageId
) {

  return treeIndex.getSiblings(
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

  return treeIndex.isDescendantOf(
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
