export function ensureBlocksToolbar(
  main
) {

  if (
    main.querySelector('.blocks-toolbar')
  ) return;

  const toolbar =
    document.createElement('div');

  toolbar.className =
    'blocks-toolbar';

  toolbar.setAttribute(
    'contenteditable',
    'false'
  );

  toolbar.innerHTML = `
    <button class="add-block-btn" type="button">
      + Добавить блок
    </button>
  `;

  main.prepend(
    toolbar
  );
}


export function ensureBlockControls(
  block
) {

  /* Hero-блок содержит заголовок карточки и не должен вести себя как
     обычный перемещаемый пользовательский блок. */
  if (
    block.classList.contains('hero-block')
  ) return;

  if (
    block.querySelector('.block-actions')
  ) return;

  const title =
    block.querySelector('h2');

  if (!title) return;

  const actions =
    document.createElement('div');

  actions.className =
    'block-actions';

  actions.setAttribute(
    'contenteditable',
    'false'
  );

  actions.innerHTML = `
    <button
      class="block-drag-handle"
      type="button"
      draggable="true"
      title="Перетащить блок"
    >
      ⠿
    </button>

    <button
      class="block-rename-btn"
      type="button"
      title="Переименовать блок"
    >
      ✎
    </button>

    <button
      class="block-delete-btn"
      type="button"
      title="Удалить блок"
    >
      ×
    </button>
  `;

  title.before(
    actions
  );
}


export function startInlineRename(
  button,
  saveCurrentPage
) {

  const block =
    button.closest('.template-block');

  const title =
    block?.querySelector('h2');

  if (!title) return;

  title.setAttribute(
    'contenteditable',
    'true'
  );

  title.classList.add(
    'is-editing-title'
  );

  title.focus();

  placeCaretAtEnd(
    title
  );

  const finish = () => {

    title.setAttribute(
      'contenteditable',
      'false'
    );

    title.classList.remove(
      'is-editing-title'
    );

    title.removeEventListener(
      'blur',
      finish
    );

    title.removeEventListener(
      'keydown',
      onKeydown
    );

    saveCurrentPage();
  };

  const onKeydown = event => {

    if (
      event.key === 'Enter' ||
      event.key === 'Escape'
    ) {

      event.preventDefault();
      title.blur();
    }
  };

  title.addEventListener(
    'blur',
    finish
  );

  title.addEventListener(
    'keydown',
    onKeydown
  );
}


function placeCaretAtEnd(
  element
) {

  const range =
    document.createRange();

  const selection =
    window.getSelection();

  range.selectNodeContents(
    element
  );

  range.collapse(
    false
  );

  selection.removeAllRanges();

  selection.addRange(
    range
  );
}
