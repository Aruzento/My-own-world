import { state } from '../state.js';

import {
  renderTags,
} from './ui.js';

import {
  renderTree,
} from '../tree/tree.js';

import {
  saveCurrentPage,
} from '../editor/editor.js';


export function setupTags() {
  document.addEventListener(
    'click',
    async event => {
      const addButton =
        event.target.closest('.inline-add-tag-btn');

      const removeButton =
        event.target.closest('.inline-tag-remove');

      if (addButton) {
        await addInlineTag(addButton);
      }

      if (removeButton) {
        await removeTag(removeButton.dataset.tag);
      }
    }
  );

  document.addEventListener(
    'keydown',
    async event => {
      if (
        event.target.classList.contains('inline-tag-input') &&
        event.key === 'Enter'
      ) {
        event.preventDefault();

        const button =
          event.target
            .closest('.card-meta')
            .querySelector('.inline-add-tag-btn');

        await addInlineTag(button);
      }
    }
  );
}


async function addInlineTag(button) {
  if (!state.currentPage) return;

  const input =
    button
      .closest('.card-meta')
      .querySelector('.inline-tag-input');

  const value =
    input.value.trim().toLowerCase();

  if (!value) return;

  state.currentPage.tags =
    state.currentPage.tags || [];

  if (!state.currentPage.tags.includes(value)) {
    state.currentPage.tags.push(value);
  }

  input.value = '';

  renderTags(state.currentPage.tags);

  await saveCurrentPage();

  renderTree();
}


async function removeTag(tag) {
  if (!state.currentPage) return;

  state.currentPage.tags =
    (state.currentPage.tags || [])
      .filter(t => t !== tag);

  renderTags(state.currentPage.tags);

  await saveCurrentPage();

  renderTree();
}