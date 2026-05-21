/* EDIT */

import {
  setupLinks,
  createLinkFromSelection
} from './links.js';

import {
  renderAliases
} from '../ui/aliases.js';

import {
  renderBacklinks
} from '../ui/backlinks.js';

/* Импорт рендера DnD stat block */
import {
  renderDndStats
} from '../ui/dndStats.js';

import {
  setupFloatingToolbar
} from './toolbar.js';

import {
  setupAutosave,
  saveCurrentPage as saveCurrentPageWithEditor
} from './autosave.js';

import {
  setupEditorKeyboard
} from './keyboard.js';

import {
  renderCardType
} from '../ui/cardType.js';

import {
  setupPortraitUploads,
  restoreAssetImages as restoreAssetImagesWithEditor,
  insertImage as insertImageWithEditor
} from './images.js';

import {
  setupWikiLinks,
  refreshWikiLinks,
  normalizeWikiLinksInEditor
} from './wikiLinks.js';


import {
  setupCustomBlocks,
  renderCustomBlocks
} from './customBlocks.js';

import {
  applyBlockSystemContract
} from './blocks/blockContract.js';

import {
  applyContenteditablePolicy,
  isInsidePersistentEditable
} from './contenteditablePolicy.js';

import {
  isCampaignMapPage,
  renderCampaignMap,
  serializeCampaignMapHTML,
  syncCampaignMapPresentation,
  setupCampaignMaps
} from './campaignMap.js';

import {
  isTaskTrackerPage,
  renderTaskTracker,
  serializeTaskTrackerHTML,
  setupTaskTrackers
} from '../taskTracker/taskTracker.js';

import {
  hasDuplicatePageTitle
} from '../validation/pageTitleValidation.js';

import {
  updateOpenPageTitleWarning
} from './pageTitleWarning.js';

import {
  setupEditorHistory,
  pushEditorHistorySnapshot
} from './editorHistory.js';

/* ---- */


import {
  state
} from '../state.js';

import {
  setCurrentPage
} from '../stateActions.js';

import {
  parseMarkdown,
} from '../core/markdown.js';

import {
  createPage
} from '../storage/storage.js';

import {
  renderTree,
  revealPageInTree
} from '../tree/tree.js';

import {
  writePageContent
} from '../storage/storage.js';

import {
  renderTags,
  setStatus,
} from '../ui/ui.js';


const editor =
  document.getElementById(
    'editorArea'
  );

const navigationStack =
  [];

export function setupEditor() {

  setupAutosave(editor);

  setupEditorHistory(
    editor
  );

  setupPortraitUploads(editor);

  setupFloatingToolbar();

  setupLinks(editor);

  setupWikiLinks(editor);

  setupEditorKeyboard(
    saveCurrentPage
  );

  setupCustomBlocks(
  editor,
  saveCurrentPage
);

  setupCampaignMaps(
    editor,
    saveCurrentPage
  );

  setupTaskTrackers(
    editor
  );

/* Таймер отложенной нормализации wiki-links */
let wikiLinkNormalizeTimer =
  null;


/* Планирует нормализацию wiki-links после ввода или вставки */
function scheduleWikiLinkNormalization(
  editor
) {

  /* Сбрасывает прошлый таймер */
  clearTimeout(
    wikiLinkNormalizeTimer
  );

  /* Ставит новый короткий таймер */
  wikiLinkNormalizeTimer =
    setTimeout(
      () => {

        /* Нормализует все [[...]] в editor */
        const changed =
          normalizeWikiLinksInEditor(
            editor
          );

        /* Если DOM изменился — сохраняем страницу */
        if (changed) {

          saveCurrentPage();
        }
      },
      80
    );
}

/* Нормализует wiki-links после ручного ввода */
editor.addEventListener(
  'input',
  () => {

    /* Запускает отложенную нормализацию */
    updateOpenPageTitleWarning(
      editor,
      state.currentPage
    );

    scheduleWikiLinkNormalization(
      editor
    );
  }
);


/* Нормализует wiki-links после вставки текста */
editor.addEventListener(
  'paste',
  event => {

    if (
      !event.target.closest('.table-cell-content')
    ) {

      const text =
        event.clipboardData
          ?.getData('text/plain');

      if (
        text &&
        shouldPastePlainText(
          event.target
        )
      ) {

        event.preventDefault();

        insertPlainTextAtSelection(
          text
        );
      }
    }

    /* Даём браузеру сначала вставить текст */
    setTimeout(
      () => {

        /* Запускает нормализацию после вставки */
        scheduleWikiLinkNormalization(
          editor
        );
      },
      0
    );
  }
);


function shouldPastePlainText(
  target
) {

  const element =
    target?.nodeType === Node.ELEMENT_NODE
      ? target
      : target?.parentElement;

  if (!element) return false;

  if (
    isInsidePersistentEditable(
      element
    )
  ) return true;

  const editable =
    element.closest(
      '[contenteditable="true"]'
    );

  if (!editable) return false;

  return Boolean(
    editor.contains(
      editable
    )
  ) && !Boolean(
    editable.closest(
      '[data-runtime="true"]'
    )
  );
}


function insertPlainTextAtSelection(
  text
) {

  pushEditorHistorySnapshot(
    editor,
    'Вставка текста'
  );

  // insertText участвует в нативной истории браузера лучше, чем ручная вставка DOM-узлов.
  try {

    if (
      document.execCommand(
        'insertText',
        false,
        text
      )
    ) return;

  } catch {

    // Ниже остается ручной fallback для браузеров, где insertText недоступен.
  }

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) return;

  const range =
    selection.getRangeAt(0);

  range.deleteContents();

  const fragment =
    document.createDocumentFragment();

  String(text)
    .split(/\r?\n/)
    .forEach((line, index) => {

      if (index > 0) {

        fragment.appendChild(
          document.createElement('br')
        );
      }

      fragment.appendChild(
        document.createTextNode(line)
      );
    });

  range.insertNode(
    fragment
  );

  range.collapse(
    false
  );

  selection.removeAllRanges();
  selection.addRange(
    range
  );
}


editor.addEventListener(
  'click',
  async event => {

    const emptyCreateButton =
      event.target.closest(
        '.empty-create-option'
      );

    if (emptyCreateButton) {

      event.preventDefault();

      const page =
        await createPage(
          emptyCreateButton.dataset.template || 'card'
        );

      renderTree();

      if (page) {

        openPage(
          page
        );
      }

      return;
    }

    const link =
      event.target.closest('a');

    if (!link) return;

    if (
      link.classList.contains('wiki-link')
    ) return;

    event.preventDefault();

    window.open(
      link.href,
      '_blank'
    );
  }
);
}



/* =========================================
   OPEN PAGE
========================================= */

export function openPage(
  page,
  options = {}
) {

  updateNavigationStack(
    page,
    options
  );

  setCurrentPage(
    page
  );

  const parsed =
    parseMarkdown(page.content);

  state.currentPage.tags =
    parsed.tags;

  state.currentPage.aliases =
  parsed.aliases;

  state.currentPage.template =
  parsed.template;

state.currentPage.type =
  parsed.type;

state.currentPage.schemaVersion =
  parsed.schemaVersion;

editor.innerHTML =
  sanitizeAssetImagesBeforeRender(
    parsed.body
  );

if (
  isCampaignMapPage(
    parsed
  )
) {

  renderCampaignMap(
    editor
  );

  setStatus(
    `Открыта ${page.name}`
  );

  renderTree();

  return;
}

if (
  isTaskTrackerPage(
    parsed
  )
) {

  renderTaskTracker(
    editor
  );

  setStatus(
    `Открыта ${page.name}`
  );

  renderTree();

  return;
}

updateOpenPageTitleWarning(
  editor,
  state.currentPage
);

applyContenteditablePolicy(
  editor
);

const blockContractChanged =
  applyBlockSystemContract(
    editor
  );

applyContenteditablePolicy(
  editor
);

 restoreAssetImagesWithEditor(
  editor
);

  renderTags(parsed.tags);
  renderAliases(parsed.aliases);
  renderCardType();
  refreshWikiLinks(editor);
  /* Нормализует сырые [[wiki links]] при открытии страницы */
if (
  normalizeWikiLinksInEditor(
    editor
  )
) {

  /* Сохраняет страницу, если при открытии были найдены сырые wiki-links */
  saveCurrentPage();
}
if (blockContractChanged) {

  saveCurrentPage();
}
  renderBacklinks();
  renderCustomBlocks(
  editor
);
/* Пересчитывает DnD модификаторы после открытия страницы */
renderDndStats();

renderBackButtonIfNeeded(
  parsed
);

  setStatus(
    `Открыта ${page.name}`
  );

  renderTree();
}


export function renderEmptyEditor() {

  setCurrentPage(
    null
  );

  editor.innerHTML = `
    <section class="empty-editor-page" contenteditable="false">
      <div class="empty-editor-inner">
        <p class="empty-editor-kicker">Добро пожаловать</p>
        <h1>Создайте свой мир</h1>

        <div class="empty-create-grid">
          <button
            class="empty-create-option"
            type="button"
            data-template="card"
          >
            <span class="empty-create-icon">◇</span>
            <span>Карточка</span>
          </button>

          <button
            class="empty-create-option"
            type="button"
            data-template="campaignMap"
          >
            <span class="empty-create-icon">▧</span>
            <span>Карта</span>
          </button>

          <button
            class="empty-create-option"
            type="button"
            data-template="taskTracker"
          >
            <span class="empty-create-icon">☑</span>
            <span>Таски</span>
          </button>
        </div>
      </div>
    </section>
  `;

  renderTree();

  setStatus(
    'Пустая страница'
  );
}

function sanitizeAssetImagesBeforeRender(
  html
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    html;


  const images =
    wrapper.querySelectorAll(
      'img[data-asset]'
    );

  images.forEach(img => {

    img.removeAttribute(
      'src'
    );
  });


  return wrapper.innerHTML;
}

/* =========================================
   SAVE
========================================= */

export async function saveCurrentPage() {

  if (
    state.currentPage?.template === 'campaignMap' ||
    state.currentPage?.type === 'campaignMap'
  ) {

    await saveCurrentCampaignMap();
    return;
  }

  if (
    state.currentPage?.template === 'taskTracker' ||
    state.currentPage?.type === 'taskTracker'
  ) {

    await saveCurrentTaskTracker();
    return;
  }

  await saveCurrentPageWithEditor(editor);
}


function updateNavigationStack(
  nextPage,
  options
) {

  if (
    options.source === 'tree'
  ) {

    navigationStack.length =
      0;

    return;
  }

  if (
    options.source === 'back' ||
    !state.currentPage ||
    !nextPage ||
    state.currentPage.id === nextPage.id
  ) return;

  navigationStack.push(
    state.currentPage.id
  );
}


function renderBackButtonIfNeeded(
  parsed
) {

  editor
    .querySelectorAll('.editor-page-nav')
    .forEach(nav => nav.remove());

  if (
    !isCardPageForBackButton(
      parsed
    )
  ) return;

  const title =
    editor.querySelector('.hero-block h1');

  if (!title) return;

  const nav =
    document.createElement('div');

  nav.className =
    'editor-page-nav';

  nav.dataset.runtime =
    'true';

  nav.setAttribute(
    'contenteditable',
    'false'
  );

  const findButton =
    document.createElement('button');

  findButton.className =
    'editor-find-tree-button';

  findButton.type =
    'button';

  findButton.textContent =
    '⌖';

  findButton.title =
    'Найти в дереве';

  findButton.addEventListener(
    'click',
    () => {

      revealPageInTree(
        state.currentPage?.id
      );
    }
  );

  nav.appendChild(
    findButton
  );

  if (
    navigationStack.length === 0
  ) {

    title.parentElement.prepend(
      nav
    );

    return;
  }

  const button =
    document.createElement('button');

  button.className =
    'editor-back-button';

  button.type =
    'button';

  button.dataset.runtime =
    'true';

  button.textContent =
    '←';

  button.title =
    'Назад';

  button.addEventListener(
    'click',
    () => {

      const previousId =
        navigationStack.pop();

      const previousPage =
        state.pages.find(page =>
          page.id === previousId
        );

      if (previousPage) {

        openPage(
          previousPage,
          {
            source: 'back'
          }
        );
      }
    }
  );

  nav.prepend(
    button
  );

  title.parentElement.prepend(
    nav
  );
}


function isCardPageForBackButton(
  parsed
) {

  const template =
    parsed.template ||
    state.currentPage?.template ||
    '';

  const type =
    parsed.type ||
    state.currentPage?.type ||
    '';

  if (
    template === 'campaignMap' ||
    type === 'campaignMap' ||
    template === 'taskTracker' ||
    type === 'taskTracker'
  ) return false;

  return true;
}


function hasInvalidCurrentTitle(
  title
) {

  const duplicated =
    hasDuplicatePageTitle(
      state.currentPage?.id,
      title
    );

  updateOpenPageTitleWarning(
    editor,
    state.currentPage
  );

  if (duplicated) {

    setStatus(
      'Название уже используется. Смените название.'
    );
  }

  return duplicated;
}


async function saveCurrentTaskTracker() {

  if (!state.currentPage) return;

  const tags =
    state.currentPage.tags || ['task-tracker'];

  const aliases =
    state.currentPage.aliases || [];

  const titleElement =
    editor.querySelector('.task-tracker-title');

  state.currentPage.title =
    titleElement
      ? titleElement.textContent.trim()
      : 'Новый трекер';

  if (
    hasInvalidCurrentTitle(
      state.currentPage.title
    )
  ) return;

  const content =
`---
id: ${state.currentPage.id}
parent: ${state.currentPage.parent ?? 'null'}
order: ${state.currentPage.order ?? Date.now()}
tags: [${tags.join(', ')}]
template: taskTracker
type: taskTracker
aliases: [${aliases.join(', ')}]
---

${serializeTaskTrackerHTML(editor)}
`;

  await writePageContent(
    state.currentPage,
    content
  );

  state.currentPage.content =
    content;

  setStatus(
    'Сохранено'
  );

  renderTree();
}


async function saveCurrentCampaignMap() {

  if (!state.currentPage) return;

  const tags =
    state.currentPage.tags || [];

  const aliases =
    state.currentPage.aliases || [];

  const titleElement =
    editor.querySelector('h1');

  state.currentPage.title =
    titleElement
      ? titleElement.textContent.trim()
      : 'Без названия';

  if (
    hasInvalidCurrentTitle(
      state.currentPage.title
    )
  ) return;

  const content =
`---
id: ${state.currentPage.id}
parent: ${state.currentPage.parent ?? 'null'}
order: ${state.currentPage.order ?? Date.now()}
tags: [${tags.join(', ')}]
template: campaignMap
type: campaignMap
aliases: [${aliases.join(', ')}]
---

${serializeCampaignMapHTML(editor)}
`;

  await writePageContent(
    state.currentPage,
    content
  );

  state.currentPage.content =
    content;

  setStatus(
    'Сохранено'
  );

  renderTree();
  syncCampaignMapPresentation();
}

/* =========================================
   INSERT IMAGE
========================================= */

export async function insertImage() {

  await insertImageWithEditor(editor);
}
