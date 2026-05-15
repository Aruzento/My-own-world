import { state } from '../state.js';

import {
  saveCurrentPage
} from '../editor/editor.js';

import {
  renderTree
} from '../tree/tree.js';


export function setupCardType() {

  document.addEventListener(
    'change',
    async event => {

      const select =
        event.target.closest(
          '.card-type-select'
        );

      if (!select) return;

      if (!state.currentPage) return;

      state.currentPage.type =
        select.value;

      state.currentPage.tags =
        [
          'card',
          select.value
        ];

      await saveCurrentPage();

      renderTree();
    }
  );
}


export function renderCardType() {

  if (!state.currentPage) return;

  const select =
    document.querySelector(
      '.card-type-select'
    );

  if (!select) return;

  select.value =
    state.currentPage.type || 'note';
}