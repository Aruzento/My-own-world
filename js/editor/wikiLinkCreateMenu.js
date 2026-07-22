import {
  templates
} from '../templates/templates.js';

import {
  createPage,
  loadWorkspace,
  updatePageAliases
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  openPopupAtPoint,
  registerPopup
} from '../ui/popupManager.js';

import {
  pushEditorHistorySnapshot
} from './editorHistory.js';

import {
  findPageByTitleOrAlias,
  getAllPages,
  getPageById,
  isUnderTemplate
} from '../repository/pageRepository.js';


const menu =
  document.createElement('div');

menu.className =
  'wiki-create-menu hidden';

document.body.appendChild(menu);

registerPopup({
  popup: menu,
  close: closeWikiCreateMenu,
  kind: 'dropdown-menu'
});


export function openWikiCreateMenu(
  x,
  y,
  title,
  sourceLink = null
) {

  menu.innerHTML = '';

  const connectButton =
    document.createElement('button');

  connectButton.className =
    'wiki-create-option';

  connectButton.innerHTML = `
    <span class="wiki-create-icon">↔</span>
    <span>Связать с существующей</span>
  `;

  connectButton.addEventListener(
    'click',
    event => {

      event.stopPropagation();

      openExistingPagePicker(
        title,
        sourceLink
      );
    }
  );

  menu.appendChild(
    connectButton
  );

  Object.entries(templates)
    .forEach(([key, template]) => {

      const button =
        document.createElement('button');

      button.className =
        'wiki-create-option';

      const icon =
        document.createElement('span');

      icon.className =
        'wiki-create-icon';

      icon.innerHTML =
        template.iconSvg || '';

      const label =
        document.createElement('span');

      label.textContent =
        `Создать: ${template.name || key}`;

      button.append(
        icon,
        label
      );

      button.addEventListener(
        'click',
        async event => {

          event.stopPropagation();

          closeWikiCreateMenu();

          await createPage(
            key,
            null,
            title
          );

          await loadWorkspace();

          renderTree();

          const currentEditor =
            document.getElementById(
              'editorArea'
            );

          const wikiLinksModule =
            await import('./wikiLinks.js');

          wikiLinksModule.refreshWikiLinks(
            currentEditor
          );

          const createdPage =
            findPageByTitleOrAlias(
              title
            );

          if (!createdPage) return;

          const editorModule =
            await import('./editor.js');

          editorModule.openPage(
            createdPage
          );
        }
      );

      menu.appendChild(
        button
      );
    });

  openPopupAtPoint(
    menu,
    x,
    y,
    {
      fallbackWidth: 300,
      fallbackHeight: 340
    }
  );
}


function openExistingPagePicker(
  title,
  sourceLink
) {

  menu.innerHTML = '';

  const searchInput =
    document.createElement('input');

  searchInput.className =
    'wiki-page-search';

  searchInput.placeholder =
    'Найти карточку...';

  const list =
    document.createElement('div');

  list.className =
    'wiki-page-list';

  function renderList() {

    const query =
      normalize(searchInput.value);

    list.innerHTML = '';

    const pages =
      getAllPages().filter(page => {

        if (
          isUnderTemplate(
            page.id,
            'campaignMap'
          )
        ) return false;

        if (!query) return true;

        const aliases =
          page.aliases || [];

        return (
          normalize(page.title).includes(query)
          ||
          aliases.some(alias =>
            normalize(alias).includes(query)
          )
        );
      });

    pages.forEach(page => {

      const button =
        document.createElement('button');

      button.className =
        'wiki-page-option';

      const pageTitle =
        document.createElement('span');

      pageTitle.className =
        'wiki-page-title';

      pageTitle.textContent =
        page.title || 'Без названия';

      button.appendChild(
        pageTitle
      );

      button.addEventListener(
        'click',
        async event => {

          event.stopPropagation();

          await connectMissingLinkToPage(
            title,
            page,
            sourceLink
          );
        }
      );

      list.appendChild(
        button
      );
    });
  }

  searchInput.addEventListener(
    'input',
    renderList
  );

  menu.appendChild(
    searchInput
  );

  menu.appendChild(
    list
  );

  renderList();

  searchInput.focus();
}


async function connectMissingLinkToPage(
  aliasTitle,
  targetPage,
  sourceLink
) {

  const aliases =
    targetPage.aliases || [];

  if (
    !aliases.some(alias =>
      normalize(alias) === normalize(aliasTitle)
    )
    &&
    normalize(targetPage.title) !== normalize(aliasTitle)
  ) {

    aliases.push(
      aliasTitle
    );

    await updatePageAliases(
      targetPage,
      aliases
    );
  }

  await loadWorkspace();

  renderTree();

  const updatedTarget =
    getPageById(
      targetPage.id
    );

  if (!updatedTarget) return;

  if (sourceLink) {

    pushEditorHistorySnapshot(
      document.getElementById('editorArea'),
      'Связь wiki-link с карточкой'
    );

    sourceLink.dataset.pageId =
      updatedTarget.id;

    sourceLink.dataset.pageTitle =
      updatedTarget.title;

    sourceLink.textContent =
      aliasTitle;

    sourceLink.classList.remove(
      'is-missing'
    );
  }

  const editorModule =
    await import('./editor.js');

  await editorModule.saveCurrentPage();

  const wikiLinksModule =
    await import('./wikiLinks.js');

  wikiLinksModule.refreshCurrentEditorWikiLinks();

  const backlinksModule =
    await import('../ui/backlinks.js');

  backlinksModule.refreshCurrentBacklinks();

  closeWikiCreateMenu();
}


export function closeWikiCreateMenu() {

  menu.classList.add(
    'hidden'
  );
}


function normalize(value) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
