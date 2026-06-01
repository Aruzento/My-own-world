import {
  isSelectionInsidePersistentEditable
} from './contenteditablePolicy.js';

import {
  pushEditorHistorySnapshot
} from './editorHistory.js';

const INLINE_FORMATTING_COMMANDS =
  new Set([
    'bold',
    'italic',
    'underline',
    'insertUnorderedList',
    'insertOrderedList',
    'foreColor',
    'removeFormat'
  ]);

const TEXT_INSERT_COMMAND =
  'insertText';

const INLINE_COMMAND_TAGS = {
  bold: 'strong',
  italic: 'em',
  underline: 'u'
};

const BLOCK_FORMAT_TAGS =
  new Set([
    'p',
    'h1',
    'h2',
    'h3',
    'h4'
  ]);


export function runInlineFormattingCommand(
  command,
  value = null
) {

  if (
    !isSupportedInlineFormattingCommand(command) ||
    !isSelectionInsidePersistentEditable()
  ) {

    return false;
  }

  return runNativeInlineFormattingCommand(
    command,
    value
  ) ||
    runDeprecatedDocumentCommand(
      command,
      value
    );
}


export function runInlineFormattingCommandWithHistory(
  command,
  value = null,
  label = `Формат ${command}`
) {

  if (
    !isSupportedInlineFormattingCommand(command) ||
    !isSelectionInsidePersistentEditable()
  ) return false;

  pushEditorHistorySnapshot(
    getEditorArea(),
    label
  );

  return runInlineFormattingCommand(
    command,
    value
  );
}


export function applyTextColor(
  color
) {

  return runInlineFormattingCommand(
    'foreColor',
    color
  );
}


export function applyTextColorWithHistory(
  color
) {

  return runInlineFormattingCommandWithHistory(
    'foreColor',
    color,
    'Цвет текста'
  );
}


export function clearInlineFormatting() {

  return runInlineFormattingCommand(
    'removeFormat'
  );
}


export function clearInlineFormattingWithHistory() {

  return runInlineFormattingCommandWithHistory(
    'removeFormat',
    null,
    'Сброс формата'
  );
}


export function queryInlineFormattingState(
  command
) {

  if (
    !isSupportedInlineFormattingCommand(command) ||
    !isSelectionInsidePersistentEditable()
  ) return false;

  return queryDeprecatedDocumentCommandState(
    command
  ) ||
    queryNativeInlineFormattingState(
      command
    );
}


export function formatSelectedBlockWithHistory(
  tagName
) {

  const normalizedTagName =
    normalizeBlockFormatTag(
      tagName
    );

  if (!normalizedTagName) return false;

  const selection =
    window.getSelection();

  if (
    !selection
    ||
    selection.rangeCount === 0
    ||
    !isSelectionInsidePersistentEditable(selection)
  ) return false;

  const range =
    selection.getRangeAt(0);

  const editableRoot =
    getSelectionEditableRoot(
      range
    );

  const targets =
    getSelectedFormatTargets(
      range,
      editableRoot
    );

  if (
    targets.length === 0
  ) {

    const formattedFragment =
      formatSelectedFragmentWithHistory(
        range,
        normalizedTagName
      );

    normalizeHeadings();

    return formattedFragment;
  }

  pushEditorHistorySnapshot(
    getEditorArea(),
    `Формат блока ${normalizedTagName}`
  );

  const formattedBlocks =
    targets.map(target =>
      replaceBlockTag(
        target,
        normalizedTagName
      )
    );

  restoreSelectionAroundBlocks(
    formattedBlocks
  );

  normalizeHeadings();

  return true;
}


export function isSupportedBlockFormatTag(
  tagName
) {

  return BLOCK_FORMAT_TAGS.has(
    normalizeBlockFormatTag(
      tagName
    )
  );
}


export function insertPlainTextFallback(
  text
) {

  if (
    typeof text !== 'string' ||
    !isSelectionInsidePersistentEditable()
  ) return false;

  return insertTextAtSelection(
    text
  ) ||
    runDeprecatedDocumentCommand(
      TEXT_INSERT_COMMAND,
      text
    );
}


export function isSupportedInlineFormattingCommand(
  command
) {

  return INLINE_FORMATTING_COMMANDS.has(
    command
  );
}


function formatSelectedFragmentWithHistory(
  range,
  tagName
) {

  if (
    range.collapsed
  ) return false;

  pushEditorHistorySnapshot(
    getEditorArea(),
    `Формат фрагмента ${tagName}`
  );

  const newBlock =
    document.createElement(
      tagName
    );

  newBlock.appendChild(
    range.extractContents()
  );

  range.insertNode(
    newBlock
  );

  restoreSelectionAroundBlocks([
    newBlock
  ]);

  return true;
}


function runNativeInlineFormattingCommand(
  command,
  value
) {

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) return false;

  if (command === 'removeFormat') {

    return removeFormatFromSelection(
      selection
    );
  }

  if (command === 'foreColor') {

    return wrapSelectionWithInlineElement(
      selection,
      'span',
      element => {

        element.style.color =
          value || '#000000';
      }
    );
  }

  if (
    command === 'insertUnorderedList' ||
    command === 'insertOrderedList'
  ) {

    return toggleListForSelection(
      selection,
      command === 'insertOrderedList'
        ? 'ol'
        : 'ul'
    );
  }

  const tagName =
    INLINE_COMMAND_TAGS[command];

  if (!tagName) return false;

  return wrapSelectionWithInlineElement(
    selection,
    tagName
  );
}


function wrapSelectionWithInlineElement(
  selection,
  tagName,
  configure = null
) {

  const range =
    selection.getRangeAt(0);

  if (range.collapsed) return false;

  const wrapper =
    document.createElement(
      tagName
    );

  configure?.(
    wrapper
  );

  try {

    wrapper.appendChild(
      range.extractContents()
    );

    range.insertNode(
      wrapper
    );

    restoreSelectionAroundInline(
      wrapper
    );

    mergeAdjacentInlineElements(
      wrapper
    );

    return true;

  } catch {

    return false;
  }
}


function removeFormatFromSelection(
  selection
) {

  const range =
    selection.getRangeAt(0);

  if (range.collapsed) return false;

  const fragment =
    range.extractContents();

  stripInlineFormatting(
    fragment
  );

  const markerStart =
    document.createTextNode('');

  const markerEnd =
    document.createTextNode('');

  const container =
    document.createDocumentFragment();

  container.appendChild(
    markerStart
  );

  container.appendChild(
    fragment
  );

  container.appendChild(
    markerEnd
  );

  range.insertNode(
    container
  );

  const nextRange =
    document.createRange();

  nextRange.setStartAfter(
    markerStart
  );

  nextRange.setEndBefore(
    markerEnd
  );

  selection.removeAllRanges();
  selection.addRange(
    nextRange
  );

  markerStart.remove();
  markerEnd.remove();

  return true;
}


function toggleListForSelection(
  selection,
  listTagName
) {

  const range =
    selection.getRangeAt(0);

  const editableRoot =
    getSelectionEditableRoot(
      range
    );

  const blocks =
    getSelectedFormatTargets(
      range,
      editableRoot
    );

  if (blocks.length === 0) return false;

  const list =
    document.createElement(
      listTagName
    );

  blocks.forEach(block => {

    const item =
      document.createElement('li');

    item.innerHTML =
      block.innerHTML;

    list.appendChild(
      item
    );
  });

  blocks[0].before(
    list
  );

  blocks.forEach(block =>
    block.remove()
  );

  restoreSelectionAroundBlocks([
    list
  ]);

  return true;
}


function insertTextAtSelection(
  text
) {

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) return false;

  const range =
    selection.getRangeAt(0);

  range.deleteContents();

  const textNode =
    document.createTextNode(
      text
    );

  range.insertNode(
    textNode
  );

  range.setStartAfter(
    textNode
  );

  range.collapse(
    true
  );

  selection.removeAllRanges();
  selection.addRange(
    range
  );

  return true;
}


function queryNativeInlineFormattingState(
  command
) {

  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) return false;

  const element =
    getSelectionElement(
      selection
    );

  if (!element) return false;

  if (command === 'bold') {

    return Boolean(
      element.closest('strong, b')
    );
  }

  if (command === 'italic') {

    return Boolean(
      element.closest('em, i')
    );
  }

  if (command === 'underline') {

    return Boolean(
      element.closest('u')
    );
  }

  if (command === 'insertUnorderedList') {

    return Boolean(
      element.closest('ul')
    );
  }

  if (command === 'insertOrderedList') {

    return Boolean(
      element.closest('ol')
    );
  }

  return false;
}


function stripInlineFormatting(
  root
) {

  root
    .querySelectorAll?.(
      'strong, b, em, i, u, span[style]'
    )
    .forEach(element => {

      element.replaceWith(
        ...element.childNodes
      );
    });
}


function restoreSelectionAroundInline(
  element
) {

  const range =
    document.createRange();

  const selection =
    window.getSelection();

  range.selectNodeContents(
    element
  );

  selection.removeAllRanges();
  selection.addRange(
    range
  );
}


function mergeAdjacentInlineElements(
  element
) {

  const previous =
    element.previousSibling;

  const next =
    element.nextSibling;

  if (
    previous?.nodeType === Node.ELEMENT_NODE &&
    canMergeInlineElements(
      previous,
      element
    )
  ) {

    while (element.firstChild) {

      previous.appendChild(
        element.firstChild
      );
    }

    element.remove();
    element =
      previous;
  }

  if (
    next?.nodeType === Node.ELEMENT_NODE &&
    canMergeInlineElements(
      element,
      next
    )
  ) {

    while (next.firstChild) {

      element.appendChild(
        next.firstChild
      );
    }

    next.remove();
  }
}


function canMergeInlineElements(
  left,
  right
) {

  return (
    left.tagName === right.tagName &&
    left.getAttribute('style') === right.getAttribute('style')
  );
}


function getSelectionElement(
  selection
) {

  const node =
    selection.getRangeAt(0).commonAncestorContainer;

  return node.nodeType === Node.ELEMENT_NODE
    ? node
    : node.parentElement;
}


function getSelectionEditableRoot(
  range
) {

  const node =
    range.commonAncestorContainer;

  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? node
      : node.parentElement;

  return element?.closest(
    '[data-persistent-editable="true"], [contenteditable="true"]'
  );
}


function getSelectedFormatTargets(
  range,
  editableRoot
) {

  if (!editableRoot) return [];

  if (
    editableRoot.matches(
      'h1, h2, h3, h4, p'
    )
  ) {

    return [
      editableRoot
    ];
  }

  const candidates =
    [
      ...editableRoot.querySelectorAll(
        'h1, h2, h3, h4, p, div'
      )
    ]
      .filter(element =>
        element !== editableRoot &&
        element.closest('[data-persistent-editable="true"], [contenteditable="true"]') === editableRoot &&
        !element.closest('[data-runtime="true"]') &&
        rangeIntersectsNode(
          range,
          element
        )
      );

  if (
    candidates.length > 0
  ) return candidates;

  const startElement =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer
      : range.startContainer.parentElement;

  const block =
    startElement?.closest(
      'h1, h2, h3, h4, p, div'
    );

  if (
    block &&
    block !== editableRoot &&
    editableRoot.contains(block)
  ) {

    return [
      block
    ];
  }

  return [];
}


function rangeIntersectsNode(
  range,
  node
) {

  try {

    return range.intersectsNode(
      node
    );

  } catch {

    return false;
  }
}


function replaceBlockTag(
  block,
  tagName
) {

  if (
    block.tagName.toLowerCase() === tagName
  ) return block;

  const newBlock =
    document.createElement(
      tagName
    );

  newBlock.innerHTML =
    block.innerHTML;

  Array.from(block.attributes)
    .forEach(attribute => {

      if (
        attribute.name === 'contenteditable' ||
        attribute.name === 'class' ||
        attribute.name.startsWith('data-')
      ) {

        newBlock.setAttribute(
          attribute.name,
          attribute.value
        );
      }
    });

  block.replaceWith(
    newBlock
  );

  return newBlock;
}


function restoreSelectionAroundBlocks(
  blocks
) {

  const first =
    blocks[0];

  const last =
    blocks.at(-1);

  if (!first || !last) return;

  const range =
    document.createRange();

  const selection =
    window.getSelection();

  range.setStartBefore(
    first
  );

  range.setEndAfter(
    last
  );

  selection.removeAllRanges();
  selection.addRange(
    range
  );
}


function normalizeHeadings() {

  const editor =
    getEditorArea();

  if (!editor) return;

  const nestedHeadings =
    editor.querySelectorAll(
      'h1 h1, h1 h2, h1 h3, h1 h4, h2 h1, h2 h2, h2 h3, h2 h4, h3 h1, h3 h2, h3 h3, h3 h4, h4 h1, h4 h2, h4 h3, h4 h4'
    );

  nestedHeadings.forEach(heading => {

    const parentHeading =
      heading.closest(
        'h1, h2, h3, h4'
      );

    if (!parentHeading) return;

    parentHeading.innerHTML =
      heading.innerHTML;
  });
}


function normalizeBlockFormatTag(
  tagName
) {

  const value =
    String(tagName || '')
      .trim()
      .toLowerCase();

  return BLOCK_FORMAT_TAGS.has(value)
    ? value
    : '';
}


function getEditorArea() {

  return document.getElementById(
    'editorArea'
  );
}


function runDeprecatedDocumentCommand(
  command,
  value = null
) {

  // Единственная точка, где пока разрешен deprecated execCommand.
  try {

    return Boolean(
      document.execCommand(
        command,
        false,
        value
      )
    );

  } catch {

    return false;
  }
}


function queryDeprecatedDocumentCommandState(
  command
) {

  // Состояние форматирования тоже прячем здесь, чтобы toolbar не знал о deprecated API.
  try {

    return Boolean(
      document.queryCommandState(
        command
      )
    );

  } catch {

    return false;
  }
}
