import {
  getPageIcon
} from '../core/icons.js';

import {
  openPage
} from '../editor/editor.js';

import {
  openTreeContextMenu
} from './treeContextMenu.js';

import {
  setupTreeDragAndDrop
} from './treeDragDrop.js';


export function renderTreePage(
  page,
  container,
  level,
  collapsedPages,
  draggedPageState,
  renderTree
) {

  const item =
    document.createElement('div');

  item.className =
    'tree-item tree-page';

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


  const toggle =
    document.createElement('button');

  toggle.className =
    'tree-toggle';

  toggle.type =
    'button';

  toggle.textContent =
    hasChildren
      ? collapsedPages.has(page.id)
        ? '›'
        : '⌄'
      : '';


  toggle.addEventListener(
    'click',
    event => {

      event.stopPropagation();

      if (!hasChildren) return;

      if (
        collapsedPages.has(page.id)
      ) {

        collapsedPages.delete(
          page.id
        );

      } else {

        collapsedPages.add(
          page.id
        );
      }

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
    () => openPage(page);


  container.appendChild(
    item
  );


  if (
    hasChildren
    &&
    !collapsedPages.has(page.id)
  ) {

    page.children.forEach(child => {

      renderTreePage(
        child,
        container,
        level + 1,
        collapsedPages,
        draggedPageState,
        renderTree
      );
    });
  }
}
