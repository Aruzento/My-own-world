import {
  getTreePageKeys
} from './treeKeys.js';

import {
  sortTreePages
} from './treeUtils.js';


export const TREE_VIRTUALIZATION_THRESHOLD =
  250;

export const TREE_VIRTUAL_ROW_HEIGHT =
  38;

export const TREE_VIRTUAL_OVERSCAN =
  10;


export function buildVisibleTreeRows(
  pages,
  collapsedPages
) {

  const rootPages =
    buildTreeRoots(
      pages
    );

  const rows =
    [];

  rootPages.forEach(page => {

    collectVisibleTreeRows({
      page,
      level: 0,
      collapsedPages,
      rows
    });
  });

  return {
    rootPages,
    rows
  };
}


export function shouldVirtualizeTree(
  visibleRowCount
) {

  return visibleRowCount >
    TREE_VIRTUALIZATION_THRESHOLD;
}


export function getVirtualTreeRange({
  rowCount,
  scrollTop,
  viewportHeight,
  rootOffset = 0,
  rowHeight = TREE_VIRTUAL_ROW_HEIGHT,
  overscan = TREE_VIRTUAL_OVERSCAN
}) {

  const normalizedScrollTop =
    Math.max(
      0,
      Number(scrollTop) - Number(rootOffset || 0)
    );

  const safeViewportHeight =
    Math.max(
      rowHeight,
      Number(viewportHeight) || rowHeight
    );

  const start =
    Math.max(
      0,
      Math.floor(normalizedScrollTop / rowHeight) - overscan
    );

  const visibleCount =
    Math.ceil(safeViewportHeight / rowHeight) + overscan * 2;

  const end =
    Math.min(
      rowCount,
      start + visibleCount
    );

  return {
    start,
    end,
    padTop: start * rowHeight,
    padBottom: Math.max(
      0,
      (rowCount - end) * rowHeight
    )
  };
}


function buildTreeRoots(
  pages
) {

  const pageMap =
    new Map();

  pages.forEach(page => {

    page.children = [];

    pageMap.set(
      page.id,
      page
    );
  });

  const rootPages =
    [];

  pages.forEach(page => {

    if (
      page.parent &&
      pageMap.has(page.parent)
    ) {

      pageMap
        .get(page.parent)
        .children
        .push(page);

    } else {

      rootPages.push(
        page
      );
    }
  });

  sortTreePages(
    rootPages
  );

  return rootPages;
}


function collectVisibleTreeRows({
  page,
  level,
  collapsedPages,
  rows
}) {

  rows.push({
    page,
    level
  });

  const hasChildren =
    page.children &&
    page.children.length > 0;

  if (!hasChildren) return;

  const isCollapsed =
    getTreePageKeys(
      page
    ).some(pageKey =>
      collapsedPages.has(pageKey)
    );

  if (isCollapsed) return;

  page.children.forEach(child => {

    collectVisibleTreeRows({
      page: child,
      level: level + 1,
      collapsedPages,
      rows
    });
  });
}
