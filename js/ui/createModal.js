import {
  templates
} from '../templates/templates.js';

import { state } from '../state.js';

import {
  createPage
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  openPage
} from '../editor/editor.js';

import {
  addTaskToTrackerPage
} from '../taskTracker/taskTrackerPageActions.js';

import {
  createPageFromTemplate,
  deletePageTemplate,
  getPageTemplates
} from '../templates/pageTemplateStorage.js';

import {
  setStatus
} from './ui.js';

import {
  openPopupAtPoint,
  openPopupNearAnchor,
  registerPopup
} from './popupManager.js';


const menu =
  document.getElementById(
    'createMenu'
  );

const button =
  document.getElementById(
    'newPageBtn'
  );

const menuAnchors =
  [];


export function setupCreateModal() {

  renderMenu();

  button.addEventListener(
    'click',
    toggleMenu
  );

  registerPopup({
    popup: menu,
    close: closeMenu,
    anchors: menuAnchors
  });
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
      rect.bottom + 8,
      null,
      button
    );

  } else {

    closeMenu();
  }
}


export function openCreateMenu(
  x,
  y,
  parentId = null,
  anchor = null
) {

  menu.dataset.parentId =
    parentId ?? '';

  menuAnchors.splice(
    0,
    menuAnchors.length
  );

  if (anchor) {

    menuAnchors.push(
      anchor
    );

    openPopupNearAnchor(
      menu,
      anchor,
      {
        fallbackWidth: 260,
        fallbackHeight: 220
      }
    );

    return;
  }

  openPopupAtPoint(
    menu,
    x,
    y,
    {
      fallbackWidth: 260,
      fallbackHeight: 220
    }
  );
}


function closeMenu() {

  menu.classList.add(
    'hidden'
  );

  menuAnchors.splice(
    0,
    menuAnchors.length
  );
}


function renderMenu() {

  menu.innerHTML = '';

  renderSpecialCreateOption({
    title: 'Задача',
    icon: '+',
    onClick: openTaskCreatePicker
  });

  renderSpecialCreateOption({
    title: 'По шаблону',
    icon: '◇',
    onClick: openTemplateCreatePicker
  });

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

  const page =
    await createPage(
    key,
    parentId
  );

  renderTree();

  if (page) {

    openPage(
      page
    );
  }
}
      );

      menu.appendChild(item);
    });
}


function renderSpecialCreateOption({
  title,
  icon,
  onClick
}) {

  const item =
    document.createElement('button');

  item.className =
    'create-option';

  item.type =
    'button';

  item.innerHTML = `
    <span class="create-option-icon">${icon}</span>
    <span class="create-option-title">${title}</span>
  `;

  item.addEventListener(
    'click',
    event => {

      event.stopPropagation();

      onClick();
    }
  );

  menu.appendChild(
    item
  );
}


function openTaskCreatePicker() {

  menu.innerHTML =
    getPickerHeaderHTML(
      'Выберите трекер'
    );

  const trackers =
    state.pages.filter(page =>
      page.template === 'taskTracker' ||
      page.type === 'taskTracker'
    );

  if (trackers.length === 0) {

    renderPickerEmpty(
      'Таск-трекеров пока нет'
    );

    return;
  }

  trackers.forEach(page => {

    const button =
      createPickerButton(
        page.title || 'Таски'
      );

    button.addEventListener(
      'click',
      async event => {

        event.stopPropagation();

        const task =
          await addTaskToTrackerPage(
            page
          );

        closeMenu();

        if (
          state.currentPage?.id === page.id
        ) {

          openPage(
            page
          );
        }

        setStatus(
          task
            ? 'Задача добавлена'
            : 'Не удалось добавить задачу'
        );
      }
    );

    menu.appendChild(
      button
    );
  });
}


function openTemplateCreatePicker() {

  menu.innerHTML =
    getPickerHeaderHTML(
      'Выберите шаблон'
    );

  const pageTemplates =
    getPageTemplates();

  if (pageTemplates.length === 0) {

    renderPickerEmpty(
      'Шаблонов пока нет'
    );

    return;
  }

  pageTemplates.forEach(pageTemplate => {

    const row =
      document.createElement('div');

    row.className =
      'create-template-row';

    const createButton =
      createPickerButton(
        pageTemplate.title || 'Шаблон'
      );

    createButton.addEventListener(
      'click',
      async event => {

        event.stopPropagation();

        const page =
          await createPageFromTemplate(
            pageTemplate,
            state.currentPage?.parent ?? null
          );

        closeMenu();
        renderTree();

        if (page) {

          openPage(
            page
          );
        }
      }
    );

    const deleteButton =
      document.createElement('button');

    deleteButton.className =
      'create-template-delete';

    deleteButton.type =
      'button';

    deleteButton.textContent =
      '×';

    deleteButton.title =
      'Удалить шаблон';

    deleteButton.addEventListener(
      'click',
      event => {

        event.stopPropagation();

        deletePageTemplate(
          pageTemplate.id
        );

        openTemplateCreatePicker();
      }
    );

    row.appendChild(
      createButton
    );

    row.appendChild(
      deleteButton
    );

    menu.appendChild(
      row
    );
  });
}


function getPickerHeaderHTML(
  title
) {

  return `
    <div class="create-picker-header">
      <button class="create-picker-back" type="button">←</button>
      <span>${title}</span>
    </div>
  `;
}


function createPickerButton(
  title
) {

  const button =
    document.createElement('button');

  button.className =
    'create-option create-picker-option';

  button.type =
    'button';

  button.textContent =
    title;

  return button;
}


function renderPickerEmpty(
  text
) {

  const empty =
    document.createElement('div');

  empty.className =
    'create-picker-empty';

  empty.textContent =
    text;

  menu.appendChild(
    empty
  );
}


menu.addEventListener(
  'click',
  event => {

    if (
      !event.target.classList.contains(
        'create-picker-back'
      )
    ) return;

    event.stopPropagation();

    renderMenu();
  }
);
