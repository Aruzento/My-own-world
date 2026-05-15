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
  applyContenteditablePolicy
} from './contenteditablePolicy.js';

import {
  isCampaignMapPage,
  renderCampaignMap,
  serializeCampaignMapHTML,
  syncCampaignMapPresentation,
  setupCampaignMaps
} from './campaignMap.js';

/* ---- */


import { state } from '../state.js';

import {
  parseMarkdown,
} from '../core/markdown.js';

import {
  createPage
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  renderTags,
  setStatus,
} from '../ui/ui.js';


const editor =
  document.getElementById(
    'editorArea'
  );


export function setupEditor() {

  setupAutosave(editor);

  setupPortraitUploads(editor);

  setupFloatingToolbar();

  setupLinks(editor);

  setupWikiLinks(editor);

  setupEditorKeyboard();

  setupCustomBlocks(
  editor,
  saveCurrentPage
);

  setupCampaignMaps(
    editor,
    saveCurrentPage
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
    scheduleWikiLinkNormalization(
      editor
    );
  }
);


/* Нормализует wiki-links после вставки текста */
editor.addEventListener(
  'paste',
  () => {

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

export function openPage(page) {

  state.currentPage = page;

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

  setStatus(
    `Открыта ${page.name}`
  );

  renderTree();
}


export function renderEmptyEditor() {

  state.currentPage =
    null;

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

  await saveCurrentPageWithEditor(editor);
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

  const writable =
    await state.currentPage.handle
      .createWritable();

  await writable.write(
    content
  );

  await writable.close();

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
