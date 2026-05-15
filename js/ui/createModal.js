import {
  templates
} from '../templates/templates.js';

import {
  createPage,
  loadWorkspace
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';


const menu =
  document.getElementById(
    'createMenu'
  );

const button =
  document.getElementById(
    'newPageBtn'
  );


export function setupCreateModal() {

  renderMenu();

  button.addEventListener(
    'click',
    toggleMenu
  );

  document.addEventListener(
    'click',
    event => {

      if (
        !menu.contains(event.target)
        &&
        event.target !== button
      ) {

        closeMenu();
      }
    }
  );
}


function toggleMenu(event) {

  event.stopPropagation();

  if (
    menu.classList.contains(
      'hidden'
    )
  ) {

    const rect =
      button.getBoundingClientRect();

    openCreateMenu(
      rect.left,
      rect.bottom + 8
    );

  } else {

    closeMenu();
  }
}


export function openCreateMenu(
  x,
  y,
  parentId = null
) {

  menu.dataset.parentId =
    parentId ?? '';

  menu.style.left =
    `${x}px`;

  menu.style.top =
    `${y}px`;

  menu.classList.remove(
    'hidden'
  );
}


function closeMenu() {

  menu.classList.add(
    'hidden'
  );
}


function renderMenu() {

  menu.innerHTML = '';

  Object.entries(templates)
    .forEach(([key, template]) => {

      const item =
        document.createElement('button');

      item.className =
        `create-option ${template.disabled ? 'is-disabled' : ''}`;

      item.type =
        'button';

      item.dataset.template =
        key;

      item.innerHTML = `
        <span class="create-option-icon">
          ${template.iconSvg || template.icon || ''}
        </span>

        <span class="create-option-title">
          ${template.name || template.label || template.title || key}
        </span>
      `;

      if (template.disabled) {
        menu.appendChild(item);
        return;
      }

      item.addEventListener(
        'click',
        async () => {

  closeMenu();

  const parentId =
    menu.dataset.parentId || null;

  await createPage(
    key,
    parentId
  );

  await loadWorkspace();

  renderTree();
}
      );

      menu.appendChild(item);
    });
}