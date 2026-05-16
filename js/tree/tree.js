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

const TREE_EXPANSION_STORAGE_KEY =
  'my-own-world:tree-expansion-state';

const collapsedPages =
  new Set();

const expandedPages =
  new Set();

loadTreeExpansionState();

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

  const isFullTree =
    pages === state.pages;

  if (isFullTree) {

    pruneTreeExpansionState(
      pageMap
    );
  }


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
  expandedPages,
  draggedPageState,
  renderTree,
  saveTreeExpansionState
);
  });

  if (isFullTree) {

    saveTreeExpansionState();
  }
}


function loadTreeExpansionState() {

  try {

    const stateValue =
      localStorage.getItem(
        TREE_EXPANSION_STORAGE_KEY
      );

    if (stateValue) {

      const parsed =
        JSON.parse(stateValue);

      fillSet(
        collapsedPages,
        parsed?.collapsed
      );

      fillSet(
        expandedPages,
        parsed?.expanded
      );

      return;
    }

    const legacyValue =
      localStorage.getItem(
        COLLAPSED_TREE_STORAGE_KEY
      );

    const ids =
      JSON.parse(legacyValue || '[]');

    fillSet(
      collapsedPages,
      ids
    );

  } catch (error) {

    console.warn(
      'Не удалось восстановить свернутые ветки дерева:',
      error
    );

    collapsedPages.clear();
    expandedPages.clear();
  }
}


function saveTreeExpansionState() {

  try {

    localStorage.setItem(
      TREE_EXPANSION_STORAGE_KEY,
      JSON.stringify({
        collapsed: [...collapsedPages],
        expanded: [...expandedPages]
      })
    );

    localStorage.setItem(
      COLLAPSED_TREE_STORAGE_KEY,
      JSON.stringify([...collapsedPages])
    );

  } catch (error) {

    console.warn(
      'Не удалось сохранить свернутые ветки дерева:',
      error
    );
  }
}


function pruneTreeExpansionState(
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

  expandedPages.forEach(pageId => {

    if (
      pageMap.has(pageId)
    ) return;

    expandedPages.delete(
      pageId
    );

    changed =
      true;
  });

  if (changed) {

    saveTreeExpansionState();
  }
}


function fillSet(
  target,
  values
) {

  target.clear();

  if (!Array.isArray(values)) return;

  values
    .filter(Boolean)
    .forEach(value => {

      target.add(
        value
      );
    });
}
