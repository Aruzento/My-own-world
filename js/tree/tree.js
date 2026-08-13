import { state } from '../state.js';

import {
  iconSvg
} from '../core/icons.js';

import {
  getStorageAdapter,
  hasWorkspaceAccess
} from '../storage/storageAdapter.js';

import {
  setCurrentPage
} from '../stateActions.js';

import {
  updatePageTreePositions
} from '../storage/storage.js';

import {
  finishProgressStatus,
  setProgressStatus,
  setStatus
} from '../ui/ui.js';


/* Импорт из деревьев */

import {
  renderRootDropZone
} from './treeRootDropZone.js';

import {
  createTreePageElement,
  renderTreePage
} from './treeRender.js';

import {
  openTreeContextMenu
} from './treeContextMenu.js';

import {
  getTreePageKeys
} from './treeKeys.js';

import {
  createTreeMovePlan
} from './treeMovePlanner.js';

import {
  canMovePage
} from './treeUtils.js';

import {
  buildVisibleTreeRows,
  getVirtualTreeRange,
  shouldVirtualizeTree,
  TREE_VIRTUAL_ROW_HEIGHT
} from './treeVirtualization.js';

import {
  getDuplicatePageTitleIds
} from '../validation/pageTitleValidation.js';

import {
  getAllPages,
  getPageById,
  getParentChain
} from '../repository/pageRepository.js';

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

let focusedTreePageId =
  null;

const TREE_KEYBOARD_REORDER_KEYS =
  new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight'
  ]);

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
    getPageById(
      pageId
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

  tree.setAttribute(
    'role',
    'tree'
  );

  tree.setAttribute(
    'aria-label',
    'Дерево мира'
  );

  setupTreeKeyboardNavigation(
    tree
  );

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

    syncTreeRovingFocus(
      tree
    );

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

  syncTreeRovingFocus(
    tree
  );

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

  syncTreeRovingFocus(
    tree
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


function setupTreeKeyboardNavigation(
  tree
) {

  if (
    tree.dataset.keyboardTreeContract === 'true'
  ) return;

  tree.dataset.keyboardTreeContract =
    'true';

  tree.addEventListener(
    'focusin',
    event => {

      const item =
        event.target.closest?.(
          '.tree-item[data-page-id]'
        );

      if (
        !item ||
        !tree.contains(
          item
        )
      ) return;

      focusedTreePageId =
        item.dataset.pageId || null;

      syncTreeRovingFocus(
        tree,
        focusedTreePageId
      );
    }
  );

  tree.addEventListener(
    'keydown',
    handleTreeKeyboardNavigation
  );
}


function handleTreeKeyboardNavigation(
  event
) {

  const tree =
    event.currentTarget;

  const item =
    event.target.closest?.(
      '.tree-item[data-page-id]'
    );

  if (
    !item ||
    event.target !== item
  ) return;

  const page =
    getTreePageById(
      item.dataset.pageId
    );

  if (!page) return;

  if (
    isTreeKeyboardReorderEvent(
      event
    )
  ) {

    event.preventDefault();

    handleTreeKeyboardReorder(
      event,
      tree,
      item,
      page
    );

    return;
  }

  if (event.key === 'ArrowDown') {

    event.preventDefault();
    focusTreeItemByOffset(
      tree,
      item,
      1
    );

    return;
  }

  if (event.key === 'ArrowUp') {

    event.preventDefault();
    focusTreeItemByOffset(
      tree,
      item,
      -1
    );

    return;
  }

  if (event.key === 'ArrowRight') {

    event.preventDefault();
    handleTreeArrowRight(
      tree,
      item,
      page
    );

    return;
  }

  if (event.key === 'ArrowLeft') {

    event.preventDefault();
    handleTreeArrowLeft(
      page
    );

    return;
  }

  if (event.key === 'Home') {

    event.preventDefault();
    focusTreeBoundaryItem(
      tree,
      'first'
    );

    return;
  }

  if (event.key === 'End') {

    event.preventDefault();
    focusTreeBoundaryItem(
      tree,
      'last'
    );

    return;
  }

  if (
    event.key === 'ContextMenu' ||
    event.key === 'Apps' ||
    (
      event.key === 'F10' &&
      event.shiftKey
    )
  ) {

    event.preventDefault();
    openFocusedTreeActionMenu(
      event,
      item,
      page
    );

    return;
  }

  if (event.key === 'Enter') {

    event.preventDefault();
    openFocusedTreePage(
      item
    );
  }
}


function isTreeKeyboardReorderEvent(
  event
) {

  return Boolean(
    event.ctrlKey &&
    event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    TREE_KEYBOARD_REORDER_KEYS.has(
      event.key
    )
  );
}


async function handleTreeKeyboardReorder(
  event,
  tree,
  item,
  page
) {

  const request =
    getTreeKeyboardReorderRequest(
      tree,
      item,
      page,
      event.key
    );

  if (!request) {

    setStatus(
      'Страницу нельзя переместить в этом направлении.'
    );

    return;
  }

  const {
    mode,
    targetPage
  } = request;

  if (
    targetPage &&
    !canMovePage(
      page.id,
      targetPage.id,
      getAllPages()
    )
  ) {

    setStatus(
      'Страницу нельзя переместить сюда.'
    );

    return;
  }

  const plan =
    createTreeMovePlan({
      pages:
        state.pages,
      draggedId:
        page.id,
      targetId:
        targetPage?.id || null,
      mode
    });

  if (!plan.length) {

    setStatus(
      'Страницу нельзя переместить в этом направлении.'
    );

    return;
  }

  const title =
    getTreeKeyboardReorderTitle(
      page
    );

  setStatus(
    `Страница перемещается: ${title}.`
  );

  try {

    await updatePageTreePositions(
      plan,
      {
        onProgress:
          setProgressStatus
      }
    );

    if (
      mode === 'inside' &&
      targetPage
    ) {

      expandTreePageWithoutRender(
        targetPage
      );
    }

    refreshTreeAfterKeyboardMove();

    focusTreePageById(
      page.id
    );

    finishProgressStatus(
      `Страница перемещена: ${title}.`
    );

  } catch {

    finishProgressStatus(
      `Не удалось переместить страницу: ${title}.`,
      {
        status:
          'error'
      }
    );
  }
}


function getTreeKeyboardReorderRequest(
  tree,
  item,
  page,
  key
) {

  const rows =
    getKeyboardTreeRows(
      tree
    );

  const index =
    rows.findIndex(row =>
      row.pageId === item.dataset.pageId
    );

  if (index < 0) return null;

  if (key === 'ArrowUp') {

    return getTreeKeyboardReorderSiblingRequest(
      rows[index - 1],
      'before'
    );
  }

  if (key === 'ArrowDown') {

    return getTreeKeyboardReorderSiblingRequest(
      rows[index + 1],
      'after'
    );
  }

  if (key === 'ArrowRight') {

    const targetPage =
      getTreePageById(
        rows[index - 1]?.pageId
      );

    return targetPage
      ? {
        mode:
          'inside',
        targetPage
      }
      : null;
  }

  if (key === 'ArrowLeft') {

    const parentPage =
      getTreePageById(
        page.parent
      );

    return parentPage
      ? {
        mode:
          'after',
        targetPage:
          parentPage
      }
      : null;
  }

  return null;
}


function getTreeKeyboardReorderSiblingRequest(
  row,
  mode
) {

  const targetPage =
    getTreePageById(
      row?.pageId
    );

  return targetPage
    ? {
      mode,
      targetPage
    }
    : null;
}


function getTreeKeyboardReorderTitle(
  page
) {

  return page?.title ||
    'Без названия';
}


function expandTreePageWithoutRender(
  page
) {

  getTreePageKeys(
    page
  ).forEach(key => {

    collapsedPages.delete(
      key
    );
  });

  saveTreeExpansionState();
}


function refreshTreeAfterKeyboardMove() {

  const currentPageId =
    state.currentPage?.id;

  if (currentPageId) {

    const refreshedCurrentPage =
      getPageById(
        currentPageId
      );

    if (refreshedCurrentPage) {

      setCurrentPage(
        refreshedCurrentPage
      );
    }
  }

  renderTree();
}


function openFocusedTreeActionMenu(
  event,
  item,
  page
) {

  focusedTreePageId =
    page.id;

  syncTreeRovingFocus(
    event.currentTarget,
    page.id
  );

  openTreeContextMenu(
    event,
    page,
    renderTree,
    {
      anchor:
        item,
      point:
        getTreeActionMenuKeyboardPoint(
          item
        )
    }
  );
}


function getTreeActionMenuKeyboardPoint(
  item
) {

  const anchor =
    item.querySelector(
      '.tree-actions'
    ) ||
    item;

  const rect =
    anchor.getBoundingClientRect();

  return {
    x:
      rect.left + rect.width / 2,
    y:
      rect.top + rect.height / 2
  };
}


function handleTreeArrowRight(
  tree,
  item,
  page
) {

  if (
    !hasTreePageChildren(
      page
    )
  ) return;

  if (
    isTreePageCollapsed(
      page
    )
  ) {

    setTreePageCollapsed(
      page,
      false
    );

    return;
  }

  const childPageId =
    getFirstVisibleChildPageId(
      tree,
      item
    );

  if (!childPageId) return;

  focusTreePageById(
    childPageId
  );
}


function handleTreeArrowLeft(
  page
) {

  if (
    hasTreePageChildren(
      page
    ) &&
    !isTreePageCollapsed(
      page
    )
  ) {

    setTreePageCollapsed(
      page,
      true
    );

    return;
  }

  if (!page.parent) return;

  focusTreePageById(
    page.parent
  );
}


function focusTreeItemByOffset(
  tree,
  item,
  offset
) {

  const rows =
    getKeyboardTreeRows(
      tree
    );

  const index =
    rows.findIndex(row =>
      row.pageId === item.dataset.pageId
    );

  if (index < 0) return;

  const nextRow =
    rows[
      Math.min(
        rows.length - 1,
        Math.max(
          0,
          index + offset
        )
      )
    ];

  focusTreePageById(
    nextRow?.pageId
  );
}


function focusTreeBoundaryItem(
  tree,
  boundary
) {

  const rows =
    getKeyboardTreeRows(
      tree
    );

  if (!rows.length) return;

  const row =
    boundary === 'last'
      ? rows[rows.length - 1]
      : rows[0];

  focusTreePageById(
    row.pageId
  );
}


function getFirstVisibleChildPageId(
  tree,
  item
) {

  const rows =
    getKeyboardTreeRows(
      tree
    );

  const index =
    rows.findIndex(row =>
      row.pageId === item.dataset.pageId
    );

  if (index < 0) return null;

  const currentLevel =
    rows[index].level;

  const nextRow =
    rows[index + 1];

  if (
    !nextRow ||
    nextRow.level <= currentLevel
  ) return null;

  return nextRow.pageId;
}


function getKeyboardTreeRows(
  tree
) {

  if (
    treeVirtualState?.tree === tree
  ) {

    return treeVirtualState.rows.map(row => ({
      pageId:
        row.page.id,
      level:
        row.level + 1
    }));
  }

  return getTreeItems(
    tree
  ).map(item => ({
    pageId:
      item.dataset.pageId,
    level:
      Number(
        item.getAttribute(
          'aria-level'
        )
      ) || 1
  }));
}


function focusTreePageById(
  pageId
) {

  if (!pageId) return false;

  focusedTreePageId =
    pageId;

  const tree =
    document.getElementById(
      'tree'
    );

  if (!tree) return false;

  ensureVirtualTreePageRendered(
    pageId
  );

  const item =
    tree.querySelector(
      `.tree-item[data-page-id="${CSS.escape(pageId)}"]`
    );

  if (!item) {

    syncTreeRovingFocus(
      tree
    );

    return false;
  }

  syncTreeRovingFocus(
    tree,
    pageId
  );

  item.focus({
    preventScroll: true
  });

  item.scrollIntoView({
    block: 'nearest'
  });

  return true;
}


function ensureVirtualTreePageRendered(
  pageId
) {

  if (!treeVirtualState) return;

  const index =
    treeVirtualState.rows.findIndex(row =>
      row.page.id === pageId
    );

  if (index < 0) return;

  const existing =
    treeVirtualState.tree.querySelector(
      `.tree-item[data-page-id="${CSS.escape(pageId)}"]`
    );

  if (existing) return;

  treeVirtualState.tree.scrollTop =
    getTreeRootOffset(
      treeVirtualState.tree
    ) + index * TREE_VIRTUAL_ROW_HEIGHT;

  renderVirtualTreeWindow();
}


function syncTreeRovingFocus(
  tree,
  preferredPageId = focusedTreePageId
) {

  const items =
    getTreeItems(
      tree
    );

  if (!items.length) {

    focusedTreePageId =
      null;

    return;
  }

  const visiblePageIds =
    new Set(
      items.map(item =>
        item.dataset.pageId
      )
    );

  let targetPageId =
    visiblePageIds.has(
      preferredPageId
    )
      ? preferredPageId
      : null;

  if (
    !targetPageId &&
    state.currentPage?.id &&
    visiblePageIds.has(
      state.currentPage.id
    )
  ) {

    targetPageId =
      state.currentPage.id;
  }

  if (!targetPageId) {

    targetPageId =
      items[0].dataset.pageId;
  }

  items.forEach(item => {

    const isTarget =
      item.dataset.pageId === targetPageId;

    item.tabIndex =
      isTarget
        ? 0
        : -1;

    const actions =
      item.querySelector(
        '.tree-actions'
      );

    if (actions) {

      actions.tabIndex =
        -1;
    }
  });

  focusedTreePageId =
    targetPageId;
}


function getTreeItems(
  tree
) {

  return Array.from(
    tree.querySelectorAll(
      '.tree-item[data-page-id]'
    )
  );
}


function setTreePageCollapsed(
  page,
  shouldCollapse
) {

  getTreePageKeys(
    page
  ).forEach(key => {

    if (shouldCollapse) {

      collapsedPages.add(
        key
      );

      return;
    }

    collapsedPages.delete(
      key
    );
  });

  saveTreeExpansionState();
  renderTree();

  if (
    !focusTreePageById(
      page.id
    )
  ) {

    requestAnimationFrame(
      () => focusTreePageById(
        page.id
      )
    );
  }
}


function hasTreePageChildren(
  page
) {

  return Boolean(
    page?.children?.length
  );
}


function isTreePageCollapsed(
  page
) {

  return getTreePageKeys(
    page
  ).some(key =>
    collapsedPages.has(
      key
    )
  );
}


function getTreePageById(
  pageId
) {

  return getPageById(
    pageId
  );
}


function openFocusedTreePage(
  item
) {

  item.querySelector(
    '.tree-title'
  )?.click();
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

  getParentChain(
    page.id
  ).forEach(parent => {

    getTreePageKeys(
      parent
    ).forEach(key =>
      collapsedPages.delete(
        key
      )
    );
  });
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
