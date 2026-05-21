import { state } from '../state.js';

// Небольшая история структурных действий редактора.
// Обычный набор текста оставляем браузеру, а сюда кладем операции, где мы сами меняем DOM.

const MAX_HISTORY_ITEMS =
  60;

const historyItems =
  [];

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
    state.currentPage?.id || '';

  const html =
    editor.innerHTML;

  const previous =
    historyItems.at(-1);

  if (
    previous?.pageId === pageId &&
    previous?.html === html
  ) return;

  historyItems.push({
    pageId,
    html,
    label
  });

  if (
    historyItems.length > MAX_HISTORY_ITEMS
  ) {

    historyItems.shift();
  }
}


export function undoEditorHistory(
  editor
) {

  if (!editor) return false;

  const currentPageId =
    state.currentPage?.id || '';

  while (
    historyItems.length > 0
  ) {

    const snapshot =
      historyItems.pop();

    if (
      snapshot.pageId &&
      snapshot.pageId !== currentPageId
    ) continue;

    editor.innerHTML =
      snapshot.html;

    focusFirstEditable(
      editor
    );

    return true;
  }

  return false;
}


export function clearEditorHistory() {

  historyItems.length =
    0;
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
