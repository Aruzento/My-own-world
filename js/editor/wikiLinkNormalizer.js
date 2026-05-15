import {
  createWikiLinkElement,
  refreshWikiLinks
} from './wikiLinkDom.js';


/* Нормализует все текстовые [[wiki links]] внутри редактора. */
export function normalizeWikiLinksInEditor(
  editor
) {

  if (!editor) return false;

  const textNodes =
    getEditableTextNodes(
      editor
    );

  let changed =
    false;

  textNodes.forEach(node => {

    const fragment =
      createWikiLinkFragment(
        node.nodeValue
      );

    if (!fragment) return;

    node.replaceWith(
      fragment
    );

    changed =
      true;
  });

  if (changed) {

    refreshWikiLinks(
      editor
    );
  }

  return changed;
}


function getEditableTextNodes(
  root
) {

  const nodes =
    [];

  const walker =
    document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode
      }
    );

  let currentNode;

  while (
    currentNode = walker.nextNode()
  ) {

    nodes.push(
      currentNode
    );
  }

  return nodes;
}


function acceptNode(
  node
) {

  const parent =
    node.parentElement;

  if (!parent) {

    return NodeFilter.FILTER_REJECT;
  }

  if (
    parent.closest('a')
  ) {

    return NodeFilter.FILTER_REJECT;
  }

  /* Служебный интерфейс карточки не является пользовательским текстом,
     поэтому сырой [[...]] внутри него не превращаем в ссылки. */
  if (
    parent.closest(
      '.block-actions, .blocks-toolbar, .card-meta, .aliases-meta, .media-box'
    )
  ) {

    return NodeFilter.FILTER_REJECT;
  }

  if (
    parent.closest('[contenteditable="false"]') &&
    !parent.closest('[contenteditable="true"]')
  ) {

    return NodeFilter.FILTER_REJECT;
  }

  if (
    !node.nodeValue.includes('[[') ||
    !node.nodeValue.includes(']]')
  ) {

    return NodeFilter.FILTER_REJECT;
  }

  return NodeFilter.FILTER_ACCEPT;
}


function createWikiLinkFragment(
  text
) {

  const regex =
    /\[\[([^\[\]]+?)\]\]/g;

  if (
    !regex.test(text)
  ) {

    return null;
  }

  regex.lastIndex =
    0;

  const fragment =
    document.createDocumentFragment();

  let lastIndex =
    0;

  let match;

  while (
    match = regex.exec(text)
  ) {

    appendTextBeforeMatch(
      fragment,
      text,
      lastIndex,
      match.index
    );

    appendWikiLinkOrRawText(
      fragment,
      match
    );

    lastIndex =
      regex.lastIndex;
  }

  appendTextBeforeMatch(
    fragment,
    text,
    lastIndex,
    text.length
  );

  return fragment;
}


function appendTextBeforeMatch(
  fragment,
  text,
  from,
  to
) {

  const value =
    text.slice(
      from,
      to
    );

  if (!value) return;

  fragment.appendChild(
    document.createTextNode(
      value
    )
  );
}


function appendWikiLinkOrRawText(
  fragment,
  match
) {

  const title =
    match[1].trim();

  if (!title) {

    fragment.appendChild(
      document.createTextNode(
        match[0]
      )
    );

    return;
  }

  fragment.appendChild(
    createWikiLinkElement(
      title
    )
  );
}
