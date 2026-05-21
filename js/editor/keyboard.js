import {
  undoEditorHistory
} from './editorHistory.js';

export function setupEditorKeyboard(
  saveCurrentPage
) {

  window.addEventListener(
    'keydown',
    async event => {

      if (
        isUndoShortcut(
          event
        )
      ) {

        const editor =
          document.getElementById(
            'editorArea'
          );

        if (
          undoEditorHistory(
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
