import {
  templates
} from '../templates/templates.js';

import { state } from '../state.js';

import {
  createFolderPage,
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
  loadPageTemplates,
  searchPageTemplates
} from '../templates/pageTemplateStorage.js';

import {
  queryPages
} from '../repository/pageRepository.js';

import {
  setStatus
} from './ui.js';

import {
  openPopupAtPoint,
  openPopupNearAnchor,
  registerPopup
} from './popupManager.js';


let menu =
  null;

let createMenuBackHandlerReady =
  false;

let createActionsReady =
  false;

const menuAnchors =
  [];


export function setupCreateModal() {

  menu =
    ensureCreateMenu();

  setupCreateMenuBackHandler();

  renderMenu();

  setupCreateActions();

  registerPopup({
    popup: menu,
    close: closeMenu,
    anchors: menuAnchors,
    kind: 'dropdown-menu'
  });
}


function setupCreateActions() {

  if (createActionsReady) return;

  createActionsReady =
    true;

  document.addEventListener(
    'click',
    handleCreateActionClick
  );
}


function handleCreateActionClick(event) {

  const createPageButton =
    event.target.closest?.(
      '[data-create-page]'
    );

  if (createPageButton) {

    toggleMenu(
      event,
      createPageButton
    );

    return;
  }

  const createFolderButton =
    event.target.closest?.(
      '[data-create-folder]'
    );

  if (!createFolderButton) return;

  void createFolderFromButton(
    event,
    createFolderButton
  );
}


function toggleMenu(
  event,
  anchor
) {

  event.stopPropagation();

  if (
    menu.classList.contains('hidden') ||
    menuAnchors[0] !== anchor
  ) {

    openCreateMenu(
      0,
      0,
      anchor.dataset.parentId || null,
      anchor
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

  menu =
    ensureCreateMenu();

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

  ensureCreateMenu().classList.add(
    'hidden'
  );

  menuAnchors.splice(
    0,
    menuAnchors.length
  );
}


function ensureCreateMenu() {

  if (menu) return menu;

  menu =
    document.getElementById(
      'createMenu'
    );

  if (!menu) {

    menu =
      document.createElement('div');

    menu.id =
      'createMenu';

    menu.className =
      'create-menu hidden';

    document.body.appendChild(
      menu
    );
  }

  return menu;
}


function setupCreateMenuBackHandler() {

  if (createMenuBackHandlerReady) return;

  createMenuBackHandlerReady =
    true;

  ensureCreateMenu().addEventListener(
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
        async () => createPageFromMenuTemplate(
          key
        )
      );

      menu.appendChild(item);
    });
}


async function createPageFromMenuTemplate(
  templateKey
) {

  closeMenu();

  const parentId =
    menu.dataset.parentId || null;

  const page =
    await createPage(
      templateKey,
      parentId
    );

  renderTree();

  if (page) {

    openPage(
      page
    );
  }
}


async function createFolderFromButton(
  event,
  button
) {

  event.preventDefault();
  event.stopPropagation();

  closeMenu();

  try {

    const page =
      await createFolderPage(
        'Новая папка',
        button.dataset.parentId || null
      );

    renderTree();

    if (page) {

      openPage(
        page
      );

      setStatus(
        'Папка создана'
      );

      return;
    }

    setStatus(
      'Не удалось создать папку'
    );

  } catch (error) {

    console.error(
      'Не удалось создать папку:',
      error
    );

    setStatus(
      'Не удалось создать папку'
    );
  }
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
    queryPages({
      type: 'taskTracker'
    });

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


async function openTemplateCreatePicker(
  query = ''
) {

  menu.innerHTML =
    getPickerHeaderHTML(
      'Выберите шаблон'
    );

  await loadPageTemplates();

  const searchInput =
    document.createElement('input');

  searchInput.className =
    'create-template-search';

  searchInput.type =
    'text';

  searchInput.placeholder =
    'Найти шаблон...';

  searchInput.value =
    query;

  searchInput.addEventListener(
    'input',
    () => openTemplateCreatePicker(
      searchInput.value
    )
  );

  menu.appendChild(
    searchInput
  );

  const pageTemplates =
    searchPageTemplates(
      query
    );

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
      async event => {

        event.stopPropagation();

        await deletePageTemplate(
          pageTemplate.id
        );

        openTemplateCreatePicker(
          searchInput.value
        );
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
