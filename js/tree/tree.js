import { state } from '../state.js';


/* Импорт из деревьев */

import {
  sortTreePages
} from './treeUtils.js';

import {
  renderRootDropZone
} from './treeRootDropZone.js';

import {
  renderTreePage
} from './treeRender.js';

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

loadTreeExpansionState();

const draggedPageState = {
  id: null,
  dropMode: null,
};

draggedPageState.dropMode = null;

export function renderFilteredTree(
  pages
) {

  const tree =
    document.getElementById(
      'tree'
    );

  loadTreeExpansionState();

  tree.innerHTML = '';

  renderRootDropZone(
  tree,
  draggedPageState,
  renderTree
);


  const pageMap =
    new Map();

  pages.forEach(page => {

    page.children = [];

    pageMap.set(
      page.id,
      page
    );
  });

  const rootPages = [];


  pages.forEach(page => {

    if (
      page.parent
      &&
      pageMap.has(page.parent)
    ) {

      pageMap
        .get(page.parent)
        .children
        .push(page);

    } else {

      rootPages.push(page);
    }
  });

  sortTreePages(
  rootPages
);

  rootPages.forEach(page => {

    renderTreePage(
  page,
  tree,
  0,
  collapsedPages,
  draggedPageState,
  renderTree,
  saveTreeExpansionState
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

  if (!state.workspaceHandle) return;

  try {

    const fileHandle =
      await state.workspaceHandle.getFileHandle(
        WORKSPACE_UI_STATE_FILE
      );

    const file =
      await fileHandle.getFile();

    const uiState =
      JSON.parse(
        await file.text() || '{}'
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

  if (!state.workspaceHandle) return;

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

  if (!state.workspaceHandle) return;

  try {

    const fileHandle =
      await state.workspaceHandle.getFileHandle(
        WORKSPACE_UI_STATE_FILE,
        { create: true }
      );

    let uiState = {};

    try {

      const file =
        await fileHandle.getFile();

      uiState =
        JSON.parse(
          await file.text() || '{}'
        );

    } catch (error) {

      uiState = {};
    }

    uiState.tree = {
      ...(uiState.tree || {}),
      collapsed: [...collapsedPages]
    };

    const writable =
      await fileHandle.createWritable();

    await writable.write(
      JSON.stringify(
        uiState,
        null,
        2
      )
    );

    await writable.close();

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
