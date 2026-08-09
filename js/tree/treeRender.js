import {
  getPageIcon
} from '../core/icons.js';

import { state } from '../state.js';

import {
  openPage
} from '../editor/editor.js';

import {
  openTreeContextMenu
} from './treeContextMenu.js';

import {
  setupTreeDragAndDrop
} from './treeDragDrop.js';

import {
  getTreePageKeys
} from './treeKeys.js';

import {
  getDuplicatePageTitleIds
} from '../validation/pageTitleValidation.js';


export function renderTreePage(
  page,
  container,
  level,
  collapsedPages,
  draggedPageState,
  renderTree,
  saveTreeExpansionState,
  duplicateTitleIds = getDuplicatePageTitleIds(),
  renderOptions = {}
) {

  const item =
    createTreePageElement(
      page,
      level,
      collapsedPages,
      draggedPageState,
      renderTree,
      saveTreeExpansionState,
      duplicateTitleIds,
      renderOptions
    );

  container.appendChild(
    item
  );

  const hasChildren =
    page.children
    &&
    page.children.length > 0;

  const pageKeys =
    getTreePageKeys(
      page
    );

  const isCollapsed =
    pageKeys.some(pageKey =>
      collapsedPages.has(pageKey)
    );

  if (
    hasChildren
    &&
    !isCollapsed
  ) {

    page.children.forEach(child => {

      renderTreePage(
        child,
        container,
        level + 1,
        collapsedPages,
        draggedPageState,
        renderTree,
        saveTreeExpansionState,
        duplicateTitleIds,
        renderOptions
      );
    });
  }
}


export function createTreePageElement(
  page,
  level,
  collapsedPages,
  draggedPageState,
  renderTree,
  saveTreeExpansionState,
  duplicateTitleIds = getDuplicatePageTitleIds(),
  renderOptions = {}
) {

  const item =
    document.createElement('div');

  item.className =
    'tree-item tree-page';

  item.classList.toggle(
    'active',
    state.currentPage?.id === page.id
  );

  item.classList.toggle(
    'has-duplicate-title',
    duplicateTitleIds.has(page.id)
  );

  if (
    duplicateTitleIds.has(page.id)
  ) {

    item.title =
      'Название уже используется. Нужно сменить название.';
  }

  item.dataset.pageId =
    page.id;

  const titleText =
    page.title || 'Без названия';

  item.setAttribute(
    'role',
    'treeitem'
  );

  item.setAttribute(
    'aria-label',
    titleText
  );

  item.setAttribute(
    'aria-level',
    String(level + 1)
  );

  item.tabIndex =
    -1;

  item.style.setProperty(
    '--tree-level',
    level
  );


  const hasChildren =
    page.children
    &&
    page.children.length > 0;

  const pageKeys =
    getTreePageKeys(
      page
    );

  const isCollapsed =
    pageKeys.some(pageKey =>
      collapsedPages.has(pageKey)
    );


  const toggle =
    document.createElement('button');

  toggle.className =
    'tree-toggle';

  toggle.type =
    'button';

  toggle.tabIndex =
    -1;

  toggle.setAttribute(
    'aria-hidden',
    'true'
  );

  toggle.title =
    hasChildren
      ? `${isCollapsed ? 'Развернуть' : 'Свернуть'}: ${titleText}`
      : '';

  toggle.textContent =
    hasChildren
      ? isCollapsed
        ? '›'
        : '⌄'
      : '';


  if (hasChildren) {

    item.setAttribute(
      'aria-expanded',
      String(!isCollapsed)
    );

  } else {

    toggle.disabled =
      true;
  }


  toggle.addEventListener(
    'click',
    event => {

      event.stopPropagation();

      if (!hasChildren) return;

      if (
        isCollapsed
      ) {

        pageKeys.forEach(pageKey => {

          collapsedPages.delete(
            pageKey
          );
        });

      } else {

        pageKeys.forEach(pageKey => {

          collapsedPages.add(
            pageKey
          );
        });
      }

      saveTreeExpansionState();
      renderTree();
    }
  );


  const title =
    document.createElement('span');

  title.className =
    'tree-title';

  if (
    state.currentPage?.id === page.id
  ) {

    item.setAttribute(
      'aria-current',
      'page'
    );
  }

  const searchResult =
    renderOptions.searchResultByPageId?.get(
      page.id
    );

  if (
    renderOptions.mode === 'search' &&
    searchResult?.path
  ) {

    item.classList.add(
      'has-search-path'
    );

    title.classList.add(
      'has-search-path'
    );
  }

  const iconWrapper =
    document.createElement('span');

  iconWrapper.innerHTML =
    getPageIcon(
      page.tags
    );

  const label =
    document.createElement('span');

  label.className =
    'tree-label';

  label.textContent =
    page.title || 'Без названия';

  if (
    renderOptions.mode === 'search' &&
    searchResult?.path
  ) {

    const textStack =
      document.createElement('span');

    textStack.className =
      'tree-title-text';

    const path =
      document.createElement('span');

    path.className =
      'tree-search-path';

    path.textContent =
      searchResult.path;

    textStack.append(
      label,
      path
    );

    title.append(
      ...iconWrapper.childNodes,
      document.createTextNode(
        ' '
      ),
      textStack
    );

  } else {

    title.append(
      ...iconWrapper.childNodes,
      document.createTextNode(
        ' '
      ),
      label
    );
  }


  const actions =
    document.createElement('button');

  actions.className =
    'tree-actions';

  actions.type =
    'button';

  actions.tabIndex =
    -1;

  actions.setAttribute(
    'aria-label',
    `Действия страницы: ${titleText}`
  );

  actions.title =
    `Действия страницы: ${titleText}`;

  actions.textContent =
    '⋯';


  actions.addEventListener(
    'click',
    event => {

      event.stopPropagation();

      openTreeContextMenu(
        event,
        page,
        renderTree
      );
    }
  );


  setupTreeDragAndDrop(
    item,
    page,
    draggedPageState,
    collapsedPages,
    renderTree
  );


  item.appendChild(
    toggle
  );

  item.appendChild(
    title
  );

  item.appendChild(
    actions
  );


  const openTreePage =
    () => openPage(
      page,
      {
        source: 'tree'
      }
    );

  title.addEventListener(
    'click',
    event => {

      event.stopPropagation();
      openTreePage();
    }
  );

  item.addEventListener(
    'click',
    event => {

      if (
        event.target.closest(
          '.tree-actions, .tree-toggle, .tree-title'
        )
      ) return;

      openTreePage();
    }
  );


  return item;
}
