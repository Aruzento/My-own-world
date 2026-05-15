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

const COLLAPSED_TREE_STORAGE_KEY =
  'my-own-world:collapsed-tree-pages';

const collapsedPages =
  loadCollapsedPages();

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

  pruneCollapsedPages(
    pageMap
  );


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

  saveCollapsedPages();
}


function loadCollapsedPages() {

  try {

    const value =
      localStorage.getItem(
        COLLAPSED_TREE_STORAGE_KEY
      );

    const ids =
      JSON.parse(value || '[]');

    return new Set(
      Array.isArray(ids)
        ? ids.filter(Boolean)
        : []
    );

  } catch (error) {

    console.warn(
      'Не удалось восстановить свернутые ветки дерева:',
      error
    );

    return new Set();
  }
}


function saveCollapsedPages() {

  try {

    localStorage.setItem(
      COLLAPSED_TREE_STORAGE_KEY,
      JSON.stringify(
        [...collapsedPages]
      )
    );

  } catch (error) {

    console.warn(
      'Не удалось сохранить свернутые ветки дерева:',
      error
    );
  }
}


function pruneCollapsedPages(
  pageMap
) {

  let changed =
    false;

  collapsedPages.forEach(pageId => {

    if (
      pageMap.has(pageId)
    ) return;

    collapsedPages.delete(
      pageId
    );

    changed =
      true;
  });

  if (changed) {

    saveCollapsedPages();
  }
}
