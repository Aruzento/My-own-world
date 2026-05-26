import {
  queryInlineFormattingState
} from './formattingService.js';

export function updateToolbarActiveState(
  toolbar,
  selection = window.getSelection()
) {

  toolbar
    .querySelectorAll('button.active')
    .forEach(button => {

      button.classList.remove(
        'active'
      );
    });

  if (
    !selection ||
    selection.rangeCount === 0
  ) return;

  const commandStates = {
    bold: queryInlineFormattingState('bold'),
    italic: queryInlineFormattingState('italic'),
    underline: queryInlineFormattingState('underline'),
    insertUnorderedList: queryInlineFormattingState('insertUnorderedList'),
    insertOrderedList: queryInlineFormattingState('insertOrderedList')
  };

  Object
    .entries(commandStates)
    .forEach(([command, active]) => {

      if (!active) return;

      toolbar
        .querySelector(`[data-command="${command}"]`)
        ?.classList.add(
          'active'
        );
    });

  const blockName =
    getSelectionBlockName(
      selection
    );

  if (blockName) {

    toolbar
      .querySelector(`[data-block="${blockName}"]`)
      ?.classList.add(
        'active'
      );
  }

  if (
    getSelectionElement(selection)
      ?.closest('a')
  ) {

    toolbar
      .querySelector('[data-action="link"]')
      ?.classList.add(
        'active'
      );
  }
}

function getSelectionBlockName(
  selection
) {

  const element =
    getSelectionElement(
      selection
    );

  const block =
    element?.closest(
      'h1, h2, h3, h4, p, li'
    );

  if (!block) return '';

  if (
    block.tagName.toLowerCase() === 'li'
  ) {

    return '';
  }

  return block.tagName.toLowerCase();
}

function getSelectionElement(
  selection
) {

  if (
    !selection ||
    selection.rangeCount === 0
  ) return null;

  const node =
    selection.getRangeAt(0).commonAncestorContainer;

  return node.nodeType === Node.ELEMENT_NODE
    ? node
    : node.parentElement;
}
