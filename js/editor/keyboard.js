import {
  redoEditorHistory,
  undoEditorHistory
} from './editorHistory.js';

export function setupEditorKeyboard(
  saveCurrentPage
) {

  window.addEventListener(
    'keydown',
    async event => {

      if (
        isKnowledgeGraphCanvasHistoryShortcut(
          event
        )
      ) {

        return;
      }

      if (
        isRedoShortcut(
          event
        )
      ) {

        await handleHistoryShortcut(
          event,
          redoEditorHistory,
          saveCurrentPage
        );

        return;
      }

      if (
        isUndoShortcut(
          event
        )
      ) {

        await handleHistoryShortcut(
          event,
          undoEditorHistory,
          saveCurrentPage
        );

        return;
      }

      if (
        !isSaveShortcut(
          event
        )
      ) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (typeof saveCurrentPage === 'function') {

        await saveCurrentPage();
      }
    },
    true
  );

  document.addEventListener(
    'keydown',
    event => {

      const target =
        event.target;

      if (
        !target?.classList ||
        !target.classList.contains(
          'singleline-field'
        )
      ) return;

      if (event.key !== 'Enter') return;

      event.preventDefault();

      const fields = [
        ...document.querySelectorAll(
          '.singleline-field'
        )
      ];

      const index =
        fields.indexOf(
          target
        );

      const nextField =
        fields[index + 1];

      if (!nextField) return;

      nextField.focus();

      placeCaretAtEnd(
        nextField
      );
    }
  );
}


function isKnowledgeGraphCanvasHistoryShortcut(
  event
) {

  const graphDocument =
    document.querySelector(
      '.knowledge-graph-document'
    );

  if (!graphDocument) return false;

  if (
    !(event.ctrlKey || event.metaKey) ||
    event.altKey
  ) {

    return false;
  }

  if (
    event.target?.closest?.(
      'input, textarea, select, [contenteditable="true"]'
    )
  ) {

    return false;
  }

  const key =
    String(event.key || '').toLowerCase();

  return (
    event.code === 'KeyZ' ||
    event.code === 'KeyY' ||
    key === 'z' ||
    key === 'y'
  );
}


async function handleHistoryShortcut(
  event,
  historyAction,
  saveCurrentPage
) {

  const editor =
    document.getElementById(
      'editorArea'
    );

  if (
    await historyAction(
      editor
    )
  ) {

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (typeof saveCurrentPage === 'function') {

      await saveCurrentPage();
    }
  }
}


function isRedoShortcut(
  event
) {

  return (
    (
      event.code === 'KeyY' ||
      event.key?.toLowerCase() === 'y' ||
      event.key?.toLowerCase() === 'н'
    ) &&
    (event.ctrlKey || event.metaKey)
  ) || (
    (
      event.code === 'KeyZ' ||
      event.key?.toLowerCase() === 'z' ||
      event.key?.toLowerCase() === 'я'
    ) &&
    (event.ctrlKey || event.metaKey) &&
    event.shiftKey
  );
}


function isUndoShortcut(
  event
) {

  return (
    (
      event.code === 'KeyZ' ||
      event.key?.toLowerCase() === 'z' ||
      event.key?.toLowerCase() === 'я'
    ) &&
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey
  );
}


function isSaveShortcut(
  event
) {

  return (
    (
      event.code === 'KeyS' ||
      event.key?.toLowerCase() === 's' ||
      event.key?.toLowerCase() === 'ы'
    ) &&
    (event.ctrlKey || event.metaKey)
  );
}


export function placeCaretAtEnd(
  el
) {

  const range =
    document.createRange();

  const selection =
    window.getSelection();

  range.selectNodeContents(
    el
  );

  range.collapse(
    false
  );

  selection.removeAllRanges();

  selection.addRange(
    range
  );
}
