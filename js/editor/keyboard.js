export function setupEditorKeyboard() {

  document.addEventListener(
    'keydown',
    event => {

      const target =
        event.target;

      if (
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