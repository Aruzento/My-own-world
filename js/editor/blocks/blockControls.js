import {
  markRuntime
} from './blockContract.js';

import {
  iconSvg
} from '../../core/icons.js';

const BLOCK_KIND_META = {
  text: {
    label: 'Текст',
    icon: 'document',
    kind: 'text'
  },
  list: {
    label: 'Список',
    icon: 'grid',
    kind: 'list'
  },
  items: {
    label: 'Предметы',
    icon: 'document',
    kind: 'list'
  },
  spells: {
    label: 'Заклинания',
    icon: 'lore',
    kind: 'list'
  },
  skills: {
    label: 'Навыки',
    icon: 'skill',
    kind: 'list'
  },
  table: {
    label: 'Таблица',
    icon: 'grid',
    kind: 'table'
  },
  image: {
    label: 'Изображение',
    icon: 'image',
    kind: 'image'
  },
  properties: {
    label: 'Свойства',
    icon: 'hash',
    kind: 'properties'
  },
  variables: {
    label: 'Переменные',
    icon: 'calculator',
    kind: 'data'
  },
  characterEffects: {
    label: 'Эффекты',
    icon: 'check',
    kind: 'properties'
  },
  characterSheet: {
    label: 'Лист',
    icon: 'document',
    kind: 'properties'
  }
};

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

  markRuntime(
    toolbar
  );

  toolbar.innerHTML = `
    <button class="add-block-btn" type="button">
      ${iconSvg('plus')} Добавить блок
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

  ensureBlockKindBadge(
    block
  );

  if (
    block.querySelector('.block-actions')
  ) return;

  const title =
    block.querySelector('h2');

  const actions =
    document.createElement('div');

  actions.className =
    'block-actions';

  markRuntime(
    actions
  );

  actions.innerHTML = `
    <button
      class="block-drag-handle"
      type="button"
      aria-label="Перетащить блок"
      title="Перетащить блок"
    >
      ${iconSvg('grip')}
    </button>

    ${title
      ? `
        <button
          class="block-rename-btn"
          type="button"
          title="Переименовать блок"
        >
          ${iconSvg('edit')}
        </button>
      `
      : ''}

    <button
      class="block-delete-btn"
      type="button"
      title="Удалить блок"
    >
      ${iconSvg('trash')}
    </button>
  `;

  if (title) {

    title.before(
      actions
    );

    return;
  }

  block.prepend(
    actions
  );
}


function ensureBlockKindBadge(
  block
) {

  if (
    block.querySelector('.block-kind-badge')
  ) return;

  const type =
    block.dataset.blockType;

  const meta =
    BLOCK_KIND_META[type] || {
      label: 'Блок',
      icon: 'document',
      kind: 'data'
    };

  const badge =
    document.createElement('span');

  badge.className =
    'block-kind-badge';

  badge.dataset.blockKind =
    meta.kind;

  badge.innerHTML =
    iconSvg(
      meta.icon,
      'app-icon'
    );

  const label =
    document.createElement('span');

  label.className =
    'block-kind-label';

  label.textContent =
    meta.label;

  badge.append(
    label
  );

  markRuntime(
    badge
  );

  const title =
    block.querySelector('h2');

  if (title) {

    title.before(
      badge
    );

    return;
  }

  block.prepend(
    badge
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
