import { state } from '../state.js';

import {
  getBacklinks
} from '../wiki/references.js';

import {
  getPageIcon
} from '../core/icons.js';


export function setupBacklinks() {

  document.addEventListener(
    'click',
    async event => {

      const chip =
        event.target.closest(
          '.backlink-chip'
        );

      if (!chip) return;

      const pageId =
        chip.dataset.pageId;

      const page =
        state.pages.find(candidate =>
          candidate.id === pageId
        );

      if (!page) return;

      const module =
        await import('../editor/editor.js');

      module.openPage(
        page
      );
    }
  );
}


export function renderBacklinks() {

  if (!state.currentPage) return;

  const relationContainers =
    findRelationContainers();

  if (
    relationContainers.length === 0
  ) {

    return;
  }

  const backlinks =
    getBacklinks(
      state.currentPage
    );

  relationContainers.forEach(container => {

    container.innerHTML = '';

    if (
      backlinks.length === 0
    ) {

      container.classList.add(
        'is-empty'
      );

      container.textContent =
        'Нет связей';

      return;
    }

    container.classList.remove(
      'is-empty'
    );

    backlinks.forEach(page => {

      const chip =
        document.createElement('button');

      chip.type =
        'button';

      chip.className =
        'backlink-chip';

      chip.dataset.pageId =
        page.id;

      chip.innerHTML = `
        ${getPageIcon(page.tags)}

        <span class="backlink-title">
          ${page.title || 'Без названия'}
        </span>
      `;

      container.appendChild(
        chip
      );
    });
  });
}


function findRelationContainers() {

  const rows =
    document.querySelectorAll(
      '.fact-row'
    );

  const containers = [];

  rows.forEach(row => {

    const label =
      row.querySelector('strong');

    if (!label) return;

    if (
      label.textContent.trim()
        .toLowerCase() !== 'связи'
    ) {

      return;
    }

    let container =
      row.querySelector(
        '.backlinks-list'
      );

    if (!container) {

      container =
        document.createElement('div');

      container.className =
        'backlinks-list';

      const editable =
        row.querySelector(
          'p'
        );

      if (editable) {

        editable.replaceWith(
          container
        );

      } else {

        row.appendChild(
          container
        );
      }
    }

    containers.push(
      container
    );
  });

  return containers;
}

export function refreshCurrentBacklinks() {

  renderBacklinks();
}