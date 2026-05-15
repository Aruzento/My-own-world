import { state } from '../state.js';


export function canMovePage(
  draggedId,
  targetId
) {

  if (!draggedId || !targetId) {

    return false;
  }


  if (draggedId === targetId) {

    return false;
  }


  const draggedPage =
    state.pages.find(
      page =>
        page.id === draggedId
    );

  const targetPage =
    state.pages.find(
      page =>
        page.id === targetId
    );


  if (!draggedPage || !targetPage) {

    return false;
  }


  return !isDescendantOf(
    targetPage,
    draggedPage
  );
}


export function isDescendantOf(
  possibleChild,
  possibleParent
) {

  let current =
    possibleChild;


  while (current.parent) {

    if (
      current.parent === possibleParent.id
    ) {

      return true;
    }


    current =
      state.pages.find(
        page =>
          page.id === current.parent
      );


    if (!current) {

      return false;
    }
  }


  return false;
}


export function sortTreePages(
  pages
) {

  pages.sort(
    (a, b) =>
      getPageOrder(a) - getPageOrder(b)
  );


  pages.forEach(page => {

    if (
      page.children
      &&
      page.children.length > 0
    ) {

      sortTreePages(
        page.children
      );
    }
  });
}


export function getPageOrder(
  page
) {

  if (
    typeof page.order === 'number'
  ) {

    return page.order;
  }


  return page.name
    .split('')
    .reduce(
      (sum, char) =>
        sum + char.charCodeAt(0),
      0
    );
}