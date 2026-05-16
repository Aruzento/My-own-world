import {
  state
} from './state.js';

const stateListeners =
  new Map();


export function setWorkspaceHandle(
  handle
) {

  const previous =
    state.workspaceHandle;

  state.workspaceHandle =
    handle;

  emitStateChange(
    'workspaceHandle',
    handle,
    previous
  );
}


export function setCurrentPage(
  page
) {

  const previous =
    state.currentPage;

  state.currentPage =
    page;

  emitStateChange(
    'currentPage',
    page,
    previous
  );
}


export function setPages(
  pages
) {

  const previous =
    state.pages;

  state.pages =
    Array.isArray(pages)
      ? pages
      : [];

  emitStateChange(
    'pages',
    state.pages,
    previous
  );
}


export function subscribeState(
  key,
  listener
) {

  if (!stateListeners.has(key)) {

    stateListeners.set(
      key,
      new Set()
    );
  }

  const listeners =
    stateListeners.get(key);

  listeners.add(
    listener
  );

  return () => {

    listeners.delete(
      listener
    );
  };
}


function emitStateChange(
  key,
  value,
  previous
) {

  if (value === previous) return;

  stateListeners
    .get(key)
    ?.forEach(listener => {

      listener({
        key,
        value,
        previous,
        state
      });
    });
}
