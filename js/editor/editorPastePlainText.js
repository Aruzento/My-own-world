import {
  insertPlainTextFallback
} from './formattingService.js';

import {
  pushEditorHistorySnapshot
} from './editorHistory.js';

import {
  sanitizePlainTextPaste
} from './safeHtmlSanitizer.js';

import {
  isInsidePersistentEditable
} from './contenteditablePolicy.js';

export function setupEditorPlainTextPaste(
  editor,
  options
) {

  editor.addEventListener(
    'paste',
    event => {

      if (
        !event.target.closest('.table-cell-content')
      ) {

        const text =
          sanitizePlainTextPaste(
            event.clipboardData
              ?.getData('text/plain')
          );

        if (
          text &&
          shouldPastePlainText(
            editor,
            event.target
          )
        ) {

          event.preventDefault();

          insertPlainTextAtSelection(
            editor,
            text
          );
        }
      }

      // Даём браузеру завершить вставку, потом нормализуем wiki-links.
      setTimeout(
        () => {

          options.scheduleWikiLinkNormalization();
        },
        0
      );
    }
  );
}

function shouldPastePlainText(
  editor,
  target
) {

  const element =
    target?.nodeType === Node.ELEMENT_NODE
      ? target
      : target?.parentElement;

  if (!element) return false;

  if (
    isInsidePersistentEditable(
      element
    )
  ) return true;

  const editable =
    element.closest(
      '[contenteditable="true"]'
    );

  if (!editable) return false;

  return Boolean(
    editor.contains(
      editable
    )
  ) && !Boolean(
    editable.closest(
      '[data-runtime="true"]'
    )
  );
}

function insertPlainTextAtSelection(
  editor,
  text
) {

  pushEditorHistorySnapshot(
    editor,
    'Вставка текста'
  );

  // Deprecated insertText спрятан в formattingService; ниже остается ручной DOM fallback.
  if (
    insertPlainTextFallback(
      text
    )
  ) return;

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) return;

  const range =
    selection.getRangeAt(0);

  range.deleteContents();

  const fragment =
    document.createDocumentFragment();

  String(text)
    .split(/\r?\n/)
    .forEach((line, index) => {

      if (index > 0) {

        fragment.appendChild(
          document.createElement('br')
        );
      }

      fragment.appendChild(
        document.createTextNode(line)
      );
    });

  range.insertNode(
    fragment
  );

  range.collapse(
    false
  );

  selection.removeAllRanges();
  selection.addRange(
    range
  );
}
