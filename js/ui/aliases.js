import { state } from '../state.js';

import {
  saveCurrentPage
} from '../editor/editor.js';


export function setupAliases() {

  document.addEventListener(
    'click',
    async event => {

      const addButton =
        event.target.closest(
          '.inline-add-alias-btn'
        );

      const removeButton =
        event.target.closest(
          '.inline-alias-remove'
        );

      if (addButton) {

        await addInlineAlias(
          addButton
        );
      }

      if (removeButton) {

        await removeAlias(
          removeButton.dataset.alias
        );
      }
    }
  );


  document.addEventListener(
    'keydown',
    async event => {

      if (
        event.target.classList.contains(
          'inline-alias-input'
        )
        &&
        event.key === 'Enter'
      ) {

        event.preventDefault();

        const button =
          event.target
            .closest('.aliases-meta')
            .querySelector('.inline-add-alias-btn');

        await addInlineAlias(
          button
        );
      }
    }
  );
}


async function addInlineAlias(
  button
) {

  if (!state.currentPage) return;

  const input =
    button
      .closest('.aliases-meta')
      .querySelector('.inline-alias-input');

  const value =
    input.value.trim();

  if (!value) return;

  state.currentPage.aliases =
    state.currentPage.aliases || [];

  if (
    !state.currentPage.aliases.includes(
      value
    )
  ) {

    state.currentPage.aliases.push(
      value
    );
  }

  input.value = '';

  renderAliases(
    state.currentPage.aliases
  );

  await saveCurrentPage();
}


async function removeAlias(
  alias
) {

  if (!state.currentPage) return;

  state.currentPage.aliases =
    (state.currentPage.aliases || [])
      .filter(item => item !== alias);

  renderAliases(
    state.currentPage.aliases
  );

  await saveCurrentPage();
}


export function renderAliases(
  aliases = []
) {

  const lists =
    document.querySelectorAll(
      '.inline-alias-list'
    );

  lists.forEach(container => {

    container.innerHTML = '';

    aliases.forEach(alias => {

      const el =
        document.createElement('span');

      el.className =
        'inline-alias';

      const label =
        document.createElement('span');

      label.className =
        'inline-alias-label';

      label.textContent =
        alias;

      const remove =
        document.createElement('button');

      remove.className =
        'inline-alias-remove';

      remove.dataset.alias =
        alias;

      remove.type =
        'button';

      remove.title =
        'Удалить alias';

      remove.textContent =
        '×';

      el.append(
        label,
        remove
      );

      container.appendChild(
        el
      );
    });
  });
}
