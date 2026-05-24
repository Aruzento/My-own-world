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

  siblings.splice(
    insertIndex,
    0,
    draggedPage
  );

  return siblings.map((page, index) => ({
    page,
    parentId: targetPage.parent,
    order: index + 1
  }));
}
