import {
  saveCurrentPage
} from './editor.js';

import {
  createLinkFromSelection
} from './links.js';


export function setupFloatingToolbar() {

  const toolbar =
    document.getElementById(
      'floatingToolbar'
    );

  if (!toolbar) return;


  document.addEventListener(
    'selectionchange',
    () => {

      const selection =
        window.getSelection();

      if (
        !selection
        ||
        selection.rangeCount === 0
      ) {

        toolbar.classList.add(
          'hidden'
        );

        return;
      }

      const text =
        selection.toString().trim();

      if (!text) {

        toolbar.classList.add(
          'hidden'
        );

        return;
      }

      const range =
        selection.getRangeAt(0);

      const rect =
        range.getBoundingClientRect();

      toolbar.style.left =
        `${rect.left + rect.width / 2}px`;

      toolbar.style.top =
        `${rect.top - 52}px`;

      toolbar.classList.remove(
        'hidden'
      );
    }
  );


  toolbar.addEventListener(
    'mousedown',
    event => {

      event.preventDefault();
    }
  );


  toolbar.addEventListener(
    'click',
    async event => {

      const button =
        event.target.closest(
          'button'
        );

      if (!button) return;


      const command =
        button.dataset.command;

      const block =
        button.dataset.block;

      const action =
        button.dataset.action;


      if (command) {

        document.execCommand(
          command,
          false,
          null
        );
      }


      if (block) {

        formatSelectedBlock(
          block
        );

        normalizeHeadings();
      }


      if (action === 'link') {

        createLinkFromSelection();
      }

      await saveCurrentPage();
    }
  );


  document
    .getElementById(
      'textColorPicker'
    )
    ?.addEventListener(
      'input',
      async event => {

        document.execCommand(
          'foreColor',
          false,
          event.target.value
        );

        await saveCurrentPage();
      }
    );
}


function formatSelectedBlock(
  tagName
) {

  const selection =
    window.getSelection();

  if (
    !selection
    ||
    selection.rangeCount === 0
  ) {

    return;
  }


  const range =
    selection.getRangeAt(0);

  let block =
    range.startContainer;


  if (
    block.nodeType === Node.TEXT_NODE
  ) {

    block =
      block.parentElement;
  }


  block =
    block.closest(
      'h1, h2, h3, h4, p, div'
    );


  if (!block) return;


  const newBlock =
    document.createElement(
      tagName
    );


  newBlock.innerHTML =
    block.innerHTML;


  Array.from(block.attributes)
    .forEach(attribute => {

      if (
        attribute.name === 'contenteditable'
        ||
        attribute.name === 'class'
        ||
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


  placeCaretAtEnd(
    newBlock
  );
}


function normalizeHeadings() {

  const editor =
    document.getElementById(
      'editorArea'
    );

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


function placeCaretAtEnd(el) {

  const range =
    document.createRange();

  const selection =
    window.getSelection();

  range.selectNodeContents(el);

  range.collapse(false);

  selection.removeAllRanges();

  selection.addRange(range);
}