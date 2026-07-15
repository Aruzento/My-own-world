import {
  getPageOrder
} from './treeUtils.js';


// Planner дерева ничего не пишет в файлы. Он только рассчитывает,
// какие parent/order нужно применить после pointer-drop.

export function createTreeMovePlan({
  pages,
  draggedId,
  targetId = null,
  mode,
  orderValue = Date.now()
}) {

  const draggedPage =
    pages.find(page =>
      page.id === draggedId
    );

  if (!draggedPage) {

    return [];
  }

  if (mode === 'root') {

    return [
      {
        page: draggedPage,
        parentId: null,
        order: orderValue
      }
    ];
  }

  const targetPage =
    pages.find(page =>
      page.id === targetId
    );

  if (!targetPage) {

    return [];
  }

  if (mode === 'inside') {

    return [
      {
        page: draggedPage,
        parentId: targetPage.id,
        order: orderValue
      }
    ];
  }

  if (
    mode === 'before' ||
    mode === 'after'
  ) {

    return createSiblingMovePlan(
      pages,
      draggedPage,
      targetPage,
      mode
    );
  }

  return [];
}


function createSiblingMovePlan(
  pages,
  draggedPage,
  targetPage,
  mode
) {

  const siblings =
    pages
      .filter(page =>
        page.parent === targetPage.parent &&
        page.id !== draggedPage.id
      )
      .sort((a, b) =>
        getPageOrder(a) - getPageOrder(b)
      );

  const targetIndex =
    siblings.findIndex(page =>
      page.id === targetPage.id
    );

  if (targetIndex < 0) {

    return [];
  }

  const insertIndex =
    mode === 'after'
      ? targetIndex + 1
      : targetIndex;

  const previousPage =
    siblings[insertIndex - 1] || null;

  const nextPage =
    siblings[insertIndex] || null;

  return [
    {
      page:
        draggedPage,
      parentId:
        targetPage.parent,
      order:
        createOrderBetween(
          previousPage,
          nextPage
        )
    }
  ];
}


function createOrderBetween(
  previousPage,
  nextPage
) {

  const previousOrder =
    previousPage
      ? getPageOrder(
        previousPage
      )
      : null;

  const nextOrder =
    nextPage
      ? getPageOrder(
        nextPage
      )
      : null;

  if (
    previousOrder === null &&
    nextOrder === null
  ) {

    return 1;
  }

  if (previousOrder === null) {

    return nextOrder - 1;
  }

  if (nextOrder === null) {

    return previousOrder + 1;
  }

  return (
    previousOrder +
    nextOrder
  ) / 2;
}
