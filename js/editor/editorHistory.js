import { state } from '../state.js';

import {
  serializePersistentEditorHTML
} from './blocks/blockContract.js';

// Управляемая история редактора хранит persistent snapshots по page.id.
// Runtime UI не записывается в историю и восстанавливается после undo/redo.

const MAX_HISTORY_ITEMS =
  60;

const pageHistory =
  new Map();

let isHistorySetup =
  false;


export function setupEditorHistory(
  editor
) {

  if (
    !editor ||
    isHistorySetup
  ) return;

  isHistorySetup =
    true;

  editor.addEventListener(
    'beforeinput',
    event => {

      if (
        event.inputType === 'historyUndo' ||
        event.inputType === 'historyRedo'
      ) return;

      if (
        !event.target?.closest?.(
          '[data-persistent-editable="true"], [contenteditable="true"], input, textarea'
        )
      ) return;

      pushEditorHistorySnapshot(
        editor,
        event.inputType || 'Ввод'
      );
    },
    true
  );
}


export function pushEditorHistorySnapshot(
  editor,
  label = 'Изменение'
) {

  if (!editor) return;

  const pageId =
    getCurrentPageId();

  const html =
    getPersistentSnapshot(
      editor
    );

  const history =
    getPageHistory(
      pageId
    );

  if (
    history.undo.at(-1)?.html === html
  ) return;

  history.undo.push({
    pageId,
    html,
    label
  });

  history.redo.length =
    0;

  if (
    history.undo.length > MAX_HISTORY_ITEMS
  ) {

    history.undo.shift();
  }
}


export async function undoEditorHistory(
  editor
) {

  if (!editor) return false;

  const pageId =
    getCurrentPageId();

  const history =
    getPageHistory(
      pageId
    );

  while (
    history.undo.length > 0
  ) {

    const snapshot =
      history.undo.pop();

    if (
      snapshot.pageId &&
      snapshot.pageId !== pageId
    ) continue;

    history.redo.push({
      pageId,
      html: getPersistentSnapshot(
        editor
      ),
      label: 'Redo point'
    });

    await applyHistorySnapshot(
      editor,
      snapshot
    );

    return true;
  }

  return false;
}


export async function redoEditorHistory(
  editor
) {

  if (!editor) return false;

  const pageId =
    getCurrentPageId();

  const history =
    getPageHistory(
      pageId
    );

  const snapshot =
    history.redo.pop();

  if (!snapshot) return false;

  history.undo.push({
    pageId,
    html: getPersistentSnapshot(
      editor
    ),
    label: 'Undo point'
  });

  await applyHistorySnapshot(
    editor,
    snapshot
  );

  return true;
}


export function beginHistoryTransaction(
  editor,
  label = 'Изменение'
) {

  pushEditorHistorySnapshot(
    editor,
    label
  );

  return {
    pageId: getCurrentPageId(),
    label
  };
}


export function commitHistoryTransaction(
  editor,
  transaction
) {

  if (
    !editor ||
    !transaction
  ) return;

  const history =
    getPageHistory(
      transaction.pageId
    );

  const current =
    getPersistentSnapshot(
      editor
    );

  if (
    history.undo.at(-1)?.html === current
  ) {

    history.undo.pop();
  }
}


export function runHistoryTransaction(
  editor,
  label,
  callback
) {

  const transaction =
    beginHistoryTransaction(
      editor,
      label
    );

  const result =
    callback?.();

  commitHistoryTransaction(
    editor,
    transaction
  );

  return result;
}


export function clearEditorHistory() {

  pageHistory.clear();
}


function getPageHistory(
  pageId
) {

  const key =
    pageId || '__no_page__';

  if (
    !pageHistory.has(key)
  ) {

    pageHistory.set(
      key,
      {
        undo: [],
        redo: []
      }
    );
  }

  return pageHistory.get(
    key
  );
}


function getCurrentPageId() {

  return state.currentPage?.id || '';
}


function getPersistentSnapshot(
  editor
) {

  if (!editor) return '';

  if (
    state.currentPage?.template === 'card' ||
    state.currentPage?.template === '' ||
    !state.currentPage?.template
  ) {

    return serializePersistentEditorHTML(
      editor
    );
  }

  return editor.innerHTML;
}


async function applyHistorySnapshot(
  editor,
  snapshot
) {

  editor.innerHTML =
    snapshot.html;

  await restoreRuntimeAfterHistory(
    editor
  );

  focusFirstEditable(
    editor
  );
}


async function restoreRuntimeAfterHistory(
  editor
) {

  const [
    contenteditablePolicy,
    blockContract,
    customBlocks,
    wikiLinks
  ] = await Promise.all([
    import('./contenteditablePolicy.js'),
    import('./blocks/blockContract.js'),
    import('./customBlocks.js'),
    import('./wikiLinks.js')
  ]);

  contenteditablePolicy.applyContenteditablePolicy(
    editor
  );

  blockContract.applyBlockSystemContract(
    editor
  );

  contenteditablePolicy.applyContenteditablePolicy(
    editor
  );

  customBlocks.renderCustomBlocks(
    editor
  );

  wikiLinks.refreshWikiLinks(
    editor
  );
}


function focusFirstEditable(
  editor
) {

  const editable =
    editor.querySelector(
      '[data-persistent-editable="true"], [contenteditable="true"]'
    );

  if (!editable) return;

  editable.focus();
}
