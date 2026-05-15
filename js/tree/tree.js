import { state } from '../state.js';


/* Импорт из деревьев */

import {
  canMovePage,
  sortTreePages,
  getPageOrder
} from './treeUtils.js';

import {
  renderRootDropZone
} from './treeRootDropZone.js';

import {
  renderTreePage
} from './treeRender.js';

/* --------------- */

export function renderTree() {

  renderFilteredTree(
    state.pages
  );
}

import {
  createPage,
  loadWorkspace,
  updatePageParent,
  updatePageTreePosition
} from '../storage/storage.js';

const collapsedPages =
  new Set();

const draggedPageState = {
  id: null,
  dropMode: null,
};

draggedPageState.dropMode = null;

export function renderFilteredTree(
  pages
) {

  const tree =
    document.getElementById(
      'tree'
    );

  tree.innerHTML = '';

  renderRootDropZone(
  tree,
  draggedPageState,
  renderTree
);


  const pageMap =
    new Map();

  pages.forEach(page => {

    page.children = [];

    pageMap.set(
      page.id,
      page
    );
  });


  const rootPages = [];


  pages.forEach(page => {

    if (
      page.parent
      &&
      pageMap.has(page.parent)
    ) {

      pageMap
        .get(page.parent)
        .children
        .push(page);

    } else {

      rootPages.push(page);
    }
  });

  sortTreePages(
  rootPages
);

  rootPages.forEach(page => {

    renderTreePage(
  page,
  tree,
  0,
  collapsedPages,
  draggedPageState,
  renderTree
);
  });
}
