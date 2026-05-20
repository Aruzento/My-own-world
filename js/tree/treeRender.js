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
  duplicateTitleIds = getDuplicatePageTitleIds()
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

  toggle.textContent =
    hasChildren
      ? isCollapsed
        ? '›'
        : '⌄'
      : '';


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

  title.innerHTML =
    `${getPageIcon(page.tags)}
     <span class="tree-label">${page.title || 'Без названия'}</span>`;


  const actions =
    document.createElement('button');

  actions.className =
    'tree-actions';

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


  item.onclick =
    () => openPage(
      page,
      {
        source: 'tree'
      }
    );


  container.appendChild(
    item
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
        duplicateTitleIds
      );
    });
  }
}
