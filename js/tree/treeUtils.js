export function canMovePage(
  draggedId,
  targetId,
  pages = []
) {

  if (!draggedId || !targetId) {

    return false;
  }


  if (draggedId === targetId) {

    return false;
  }


  const draggedPage =
    findPageById(
      pages,
      draggedId
    );

  const targetPage =
    findPageById(
      pages,
      targetId
    );


  if (!draggedPage || !targetPage) {

    return false;
  }


  return !isDescendantOf(
    targetPage,
    draggedPage,
    pages
  );
}


export function isDescendantOf(
  possibleChild,
  possibleParent,
  pages = []
) {

  let current =
    possibleChild;

  while (
    current?.parent
  ) {

    if (
      current.parent === possibleParent?.id
    ) {

      return true;
    }

    current =
      findPageById(
        pages,
        current.parent
      );

    if (!current) return false;
  }

  return false;
}


function findPageById(
  pages,
  pageId
) {

  return Array.isArray(pages)
    ? pages.find(page =>
      page?.id === pageId
    ) || null
    : null;
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
