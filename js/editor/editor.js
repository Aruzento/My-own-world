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

/* ---- */


import { state } from '../state.js';

import {
  parseMarkdown,
} from '../core/markdown.js';

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
  event => {

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

  await saveCurrentPageWithEditor(editor);
}

/* =========================================
   INSERT IMAGE
========================================= */

export async function insertImage() {

  await insertImageWithEditor(editor);
}
