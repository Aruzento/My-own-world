import {
  openWikiCreateMenu
} from './wikiLinkCreateMenu.js';

import {
  refreshCurrentBacklinks
} from '../ui/backlinks.js';

import {
  findPageByTitle,
  findPageByWikiLinkId
} from './wikiLinkLookup.js';

import {
  createWikiLinkElement,
  refreshWikiLinks
} from './wikiLinkDom.js';

import {
  normalizeWikiLinksInEditor
} from './wikiLinkNormalizer.js';

import {
  setupWikiLinkPreviews
} from './wikiLinkPreview.js';


export {
  refreshWikiLinks,
  normalizeWikiLinksInEditor
};


export function setupWikiLinks(
  editor
) {

  editor.addEventListener(
    'keydown',
    event => {

      if (event.key !== ']') return;

      setTimeout(
        async () => {
          await convertLastWikiLink(
            editor
          );
        },
        0
      );
    }
  );

  editor.addEventListener(
    'click',
    handleWikiLinkClick
  );

  setupWikiLinkPreviews(
    editor
  );
}


export function refreshCurrentEditorWikiLinks() {

  const editor =
    document.getElementById(
      'editorArea'
    );

  if (!editor) return;

  refreshWikiLinks(
    editor
  );
}


async function handleWikiLinkClick(
  event
) {

  const link =
    event.target.closest(
      '.wiki-link'
    );

  if (!link) return;

  event.preventDefault();
  event.stopPropagation();

  const pageId =
    link.dataset.pageId;

  if (!pageId) {

    openMissingPageMenu(
      event,
      link
    );

    return;
  }

  const page =
    findPageByWikiLinkId(
      pageId
    );

  if (!page) return;

  const module =
    await import('./editor.js');

  module.openPage(
    page
  );
}


function openMissingPageMenu(
  event,
  link
) {

  const title =
    link.dataset.pageTitle;

  if (!title) return;

  openWikiCreateMenu(
    event.clientX,
    event.clientY,
    title,
    link
  );
}


async function convertLastWikiLink(
  editor
) {

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) return;

  const range =
    selection.getRangeAt(0);

  const container =
    range.startContainer;

  if (
    container.nodeType !== Node.TEXT_NODE
  ) return;

  const match =
    container.textContent.match(
      /\[\[([^\[\]]+)\]\]$/
    );

  if (!match) return;

  const title =
    match[1].trim();

  if (!title) return;

  replaceTypedWikiSyntax({
    textNode: container,
    match,
    link: createWikiLinkElement(
      title,
      findPageByTitle(title),
      title
    ),
    selection
  });

  const module =
    await import('./editor.js');

  await module.saveCurrentPage();

  refreshCurrentBacklinks();
}


function replaceTypedWikiSyntax({
  textNode,
  match,
  link,
  selection
}) {

  const text =
    textNode.textContent;

  const before =
    text.slice(
      0,
      match.index
    );

  const after =
    text.slice(
      match.index + match[0].length
    );

  const parent =
    textNode.parentNode;

  parent.insertBefore(
    document.createTextNode(before),
    textNode
  );

  parent.insertBefore(
    link,
    textNode
  );

  parent.insertBefore(
    document.createTextNode(after),
    textNode
  );

  parent.removeChild(
    textNode
  );

  placeCaretAfterLink(
    link,
    selection
  );
}


function placeCaretAfterLink(
  link,
  selection
) {

  const range =
    document.createRange();

  range.setStartAfter(
    link
  );

  range.collapse(
    true
  );

  selection.removeAllRanges();

  selection.addRange(
    range
  );
}
