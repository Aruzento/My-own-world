import { state } from '../state.js';

import {
  iconSvg
} from '../core/icons.js';

import {
  getStorageAdapter,
  hasWorkspaceAccess
} from '../storage/storageAdapter.js';


/* Импорт из деревьев */

import {
  renderRootDropZone
} from './treeRootDropZone.js';

import {
  createTreePageElement,
  renderTreePage
} from './treeRender.js';

import {
  getTreePageKeys
} from './treeKeys.js';

import {
  buildVisibleTreeRows,
  getVirtualTreeRange,
  shouldVirtualizeTree,
  TREE_VIRTUAL_ROW_HEIGHT
} from './treeVirtualization.js';

import {
  getDuplicatePageTitleIds
} from '../validation/pageTitleValidation.js';

/* --------------- */

export function renderTree() {

  renderFilteredTree(
    state.pages
  );
}


const COLLAPSED_TREE_STORAGE_KEY =
  'my-own-world:collapsed-tree-pages';

const TREE_EXPANSION_STORAGE_KEY =
  'my-own-world:tree-expansion-state';

const WORKSPACE_UI_STATE_FILE =
  '.my-own-world-ui.json';

const collapsedPages =
  new Set();

let workspaceSaveTimer =
  null;

let treeVirtualScrollHandler =
  null;

let treeVirtualState =
  null;

loadTreeExpansionState();

const draggedPageState = {
  id: null,
  dropMode: null,
};

draggedPageState.dropMode = null;


export function getDraggedTreePageId() {

  return draggedPageState.id;
}


export function revealPageInTree(
  pageId
) {

  if (!pageId) return;

  const page =
    state.pages.find(candidate =>
      candidate.id === pageId
    );

  if (!page) return;

  expandPageAncestors(
    page
  );

  saveTreeExpansionState();
  renderTree();

  requestAnimationFrame(
    () => {

      scrollVirtualTreePageIntoView(
        pageId
      );

      const item =
        document.querySelector(
          `.tree-item[data-page-id="${CSS.escape(pageId)}"]`
        );

      if (!item) return;

      item.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });

      item.classList.add(
        'is-found-in-tree'
      );

      setTimeout(
        () => item.classList.remove('is-found-in-tree'),
        1400
      );
    }
  );
}

export function renderFilteredTree(
  pages,
  options = {}
) {

  const tree =
    document.getElementById(
      'tree'
    );

  loadTreeExpansionState();

  const previousScrollTop =
    tree.scrollTop;

  detachTreeVirtualization(
    tree
  );

  tree.classList.remove(
    'is-empty-workspace'
  );

  tree.innerHTML = '';

  if (
    !hasWorkspaceAccess(
      getStorageAdapter()
    )
  ) {

    renderNoWorkspaceTree(
      tree
    );

    return;
  }

  renderRootDropZone(
    tree
  );

  const {
    rootPages,
    rows
  } =
    options.mode === 'search'
      ? buildSearchTreeRows(
        pages
      )
      : buildVisibleTreeRows(
        pages,
        collapsedPages
      );

  const renderOptions =
    createTreeRenderOptions(
      options
    );

  const duplicateTitleIds =
    getDuplicatePageTitleIds();

  if (
    shouldVirtualizeTree(
      rows.length
    )
  ) {

    renderVirtualizedTree(
      tree,
      rows,
      previousScrollTop,
      renderOptions
    );

    return;
  }

  if (options.mode === 'search') {

    rootPages.forEach(page => {

      tree.appendChild(
        createTreePageElement(
          page,
          0,
          collapsedPages,
          draggedPageState,
          renderTree,
          saveTreeExpansionState,
          duplicateTitleIds,
          renderOptions
        )
      );
    });

    tree.scrollTop =
      previousScrollTop;

    return;
  }

  rootPages.forEach(page => {

    renderTreePage(
      page,
      tree,
      0,
      collapsedPages,
      draggedPageState,
      renderTree,
      saveTreeExpansionState,
      duplicateTitleIds,
      renderOptions
    );
  });

  tree.scrollTop =
    previousScrollTop;
}


function renderNoWorkspaceTree(
  tree
) {

  tree.classList.add(
    'is-empty-workspace'
  );

  const empty =
    document.createElement('div');

  empty.className =
    'tree-empty-workspace';

  empty.dataset.treeEmptyWorkspace =
    'true';

  const button =
    document.createElement('button');

  button.className =
    'tree-open-workspace-button';

  button.type =
    'button';

  button.dataset.openWorkspace =
    'true';

  button.innerHTML = `
    ${iconSvg('folder-open')}
    <span>Открыть папку</span>
  `;

  empty.appendChild(
    button
  );

  tree.appendChild(
    empty
  );
}


function renderVirtualizedTree(
  tree,
  rows,
  initialScrollTop = 0,
  renderOptions = {}
) {

  tree.classList.add(
    'is-virtualized'
  );

  const viewport =
    document.createElement('div');

  viewport.className =
    'tree-virtual-viewport';

  const topSpacer =
    document.createElement('div');

  topSpacer.className =
    'tree-virtual-spacer';

  const items =
    document.createElement('div');

  items.className =
    'tree-virtual-items';

  const bottomSpacer =
    document.createElement('div');

  bottomSpacer.className =
    'tree-virtual-spacer';

  viewport.append(
    topSpacer,
    items,
    bottomSpacer
  );

  tree.appendChild(
    viewport
  );

  const duplicateTitleIds =
    getDuplicatePageTitleIds();

  treeVirtualState = {
    tree,
    rows,
    topSpacer,
    items,
    bottomSpacer,
    duplicateTitleIds,
    renderOptions,
    lastStart: -1,
    lastEnd: -1
  };

  treeVirtualScrollHandler =
    () => {

      renderVirtualTreeWindow();
    };

  tree.addEventListener(
    'scroll',
    treeVirtualScrollHandler,
    {
      passive: true
    }
  );

  tree.scrollTop =
    initialScrollTop;

  renderVirtualTreeWindow();
}


function renderVirtualTreeWindow() {

  if (!treeVirtualState) return;

  const {
    tree,
    rows,
    topSpacer,
    items,
    bottomSpacer,
    duplicateTitleIds,
    renderOptions
  } =
    treeVirtualState;

  const range =
    getVirtualTreeRange({
      rowCount: rows.length,
      scrollTop: tree.scrollTop,
      viewportHeight: tree.clientHeight,
      rootOffset: getTreeRootOffset(
        tree
      )
    });

  if (
    range.start === treeVirtualState.lastStart &&
    range.end === treeVirtualState.lastEnd
  ) {

    return;
  }

  treeVirtualState.lastStart =
    range.start;

  treeVirtualState.lastEnd =
    range.end;

  topSpacer.style.height =
    `${range.padTop}px`;

  bottomSpacer.style.height =
    `${range.padBottom}px`;

  const fragment =
    document.createDocumentFragment();

  rows
    .slice(
      range.start,
      range.end
    )
    .forEach(row => {

      fragment.appendChild(
        createTreePageElement(
          row.page,
          row.level,
          collapsedPages,
          draggedPageState,
          renderTree,
          saveTreeExpansionState,
          duplicateTitleIds,
          renderOptions
        )
      );
    });

  items.replaceChildren(
    fragment
  );
}


function detachTreeVirtualization(
  tree
) {

  tree.classList.remove(
    'is-virtualized'
  );

  if (treeVirtualScrollHandler) {

    tree.removeEventListener(
      'scroll',
      treeVirtualScrollHandler
    );
  }

  treeVirtualScrollHandler =
    null;

  treeVirtualState =
    null;
}


function scrollVirtualTreePageIntoView(
  pageId
) {

  if (!treeVirtualState || !pageId) return;

  const index =
    treeVirtualState.rows.findIndex(row =>
      row.page.id === pageId
    );

  if (index < 0) return;

  treeVirtualState.tree.scrollTo({
    top:
      getTreeRootOffset(
        treeVirtualState.tree
      ) + index * TREE_VIRTUAL_ROW_HEIGHT,
    behavior: 'smooth'
  });

  renderVirtualTreeWindow();
}


function getTreeRootOffset(
  tree
) {

  const rootDropZone =
    tree.querySelector(
      '.tree-root-drop-zone'
    );

  if (!rootDropZone) return 0;

  return rootDropZone.offsetHeight + 4;
}


function buildSearchTreeRows(
  pages
) {

  const rootPages =
    Array.isArray(pages)
      ? [...pages]
      : [];

  return {
    rootPages,
    rows:
      rootPages.map(page => ({
        page,
        level: 0
      }))
  };
}


function createTreeRenderOptions(
  options = {}
) {

  const searchResultByPageId =
    new Map();

  (options.searchResults || []).forEach(result => {

    if (result?.page?.id) {

      searchResultByPageId.set(
        result.page.id,
        result
      );
    }
  });

  return {
    mode:
      options.mode || 'tree',
    searchResultByPageId
  };
}


function expandPageAncestors(
  page
) {

  let parentId =
    page.parent;

  while (parentId) {

    const parent =
      state.pages.find(candidate =>
        candidate.id === parentId
      );

    if (!parent) return;

    getTreePageKeys(
      parent
    ).forEach(key =>
      collapsedPages.delete(
        key
      )
    );

    parentId =
      parent.parent;
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

      addValuesToSet(
        collapsedPages,
        parsed?.collapsed
      );
    }

    const legacyValue =
      localStorage.getItem(
        COLLAPSED_TREE_STORAGE_KEY
      );

    const ids =
      JSON.parse(legacyValue || '[]');

    addValuesToSet(
      collapsedPages,
      ids
    );

  } catch (error) {

    console.warn(
      'Не удалось восстановить свернутые ветки дерева:',
      error
    );

    collapsedPages.clear();
  }
}


function saveTreeExpansionState() {

  try {

    const payload = {
      collapsed: [...collapsedPages]
    };

    localStorage.setItem(
      TREE_EXPANSION_STORAGE_KEY,
      JSON.stringify(
        payload
      )
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

  scheduleWorkspaceTreeExpansionStateSave();
}


export async function restoreWorkspaceTreeExpansionState() {

  loadTreeExpansionState();

  const storageAdapter =
    getStorageAdapter();

  if (!hasWorkspaceAccess(storageAdapter)) return;

  try {

    const uiState =
      JSON.parse(
        await storageAdapter.readText(
          WORKSPACE_UI_STATE_FILE
        ) || '{}'
      );

    addValuesToSet(
      collapsedPages,
      uiState?.tree?.collapsed
    );

    saveTreeExpansionState();

  } catch (error) {

    if (error?.name === 'NotFoundError') return;

    console.warn(
      'Не удалось восстановить состояние дерева из workspace:',
      error
    );
  }
}


function scheduleWorkspaceTreeExpansionStateSave() {

  if (!hasWorkspaceAccess(getStorageAdapter())) return;

  clearTimeout(
    workspaceSaveTimer
  );

  workspaceSaveTimer =
    setTimeout(
      () => {

        saveWorkspaceTreeExpansionState();
      },
      120
    );
}


async function saveWorkspaceTreeExpansionState() {

  const storageAdapter =
    getStorageAdapter();

  if (!hasWorkspaceAccess(storageAdapter)) return;

  try {

    let uiState = {};

    try {

      uiState =
        JSON.parse(
          await storageAdapter.readText(
            WORKSPACE_UI_STATE_FILE
          ) || '{}'
        );

    } catch (error) {

      uiState = {};
    }

    uiState.tree = {
      ...(uiState.tree || {}),
      collapsed: [...collapsedPages]
    };

    await storageAdapter.writeText(
      WORKSPACE_UI_STATE_FILE,
      JSON.stringify(
        uiState,
        null,
        2
      )
    );

  } catch (error) {

    console.warn(
      'Не удалось сохранить состояние дерева в workspace:',
      error
    );
  }
}


function addValuesToSet(
  target,
  values
) {

  if (!Array.isArray(values)) return;

  values
    .filter(Boolean)
    .forEach(value => {

      target.add(
        value
      );
    });
}
