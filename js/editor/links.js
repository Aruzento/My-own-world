import {
  saveCurrentPage
} from './editor.js';

import {
  openPopupAtPoint,
  registerPopup
} from '../ui/popupManager.js';

import {
  pushEditorHistorySnapshot
} from './editorHistory.js';


let savedLinkRange =
  null;


export function setupLinks(
  editor
) {

  setupLinkPopup();

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


export function createLinkFromSelection() {

  const selection =
    window.getSelection();

  if (
    !selection
    ||
    selection.rangeCount === 0
    ||
    selection.toString().trim() === ''
  ) {

    return;
  }


  savedLinkRange =
    selection
      .getRangeAt(0)
      .cloneRange();


  const selectedText =
    selection
      .toString()
      .trim();


  const popup =
    document.getElementById(
      'linkPopup'
    );

  const textInput =
    document.getElementById(
      'linkTextInput'
    );

  const urlInput =
    document.getElementById(
      'linkUrlInput'
    );


  const rect =
    savedLinkRange
      .getBoundingClientRect();


  textInput.value =
    selectedText;

  urlInput.value =
    '';


  requestAnimationFrame(
    () => {

      openPopupAtPoint(
        popup,
        rect.left,
        rect.bottom + 8,
        {
          fallbackWidth: 300,
          fallbackHeight: 150
        }
      );
    }
  );

  urlInput.focus();
}


function setupLinkPopup() {

  const popup =
    document.getElementById(
      'linkPopup'
    );

  const applyButton =
    document.getElementById(
      'applyLinkBtn'
    );

  const cancelButton =
    document.getElementById(
      'cancelLinkBtn'
    );


  applyButton.addEventListener(
    'click',
    async () => {

      await applyLinkFromPopup();
    }
  );


  cancelButton.addEventListener(
    'click',
    () => {

      closeLinkPopup();
    }
  );


  popup.addEventListener(
    'keydown',
    async event => {

      if (event.key === 'Enter') {

        event.preventDefault();

        await applyLinkFromPopup();
      }

      if (event.key === 'Escape') {

        event.preventDefault();

        closeLinkPopup();
      }
    }
  );

  registerPopup({
    popup,
    close: closeLinkPopup,
    anchors: [
      document.getElementById(
        'floatingToolbar'
      )
    ],
    key: 'link-popup'
  });
}


async function applyLinkFromPopup() {

  if (!savedLinkRange) return;


  const textInput =
    document.getElementById(
      'linkTextInput'
    );

  const urlInput =
    document.getElementById(
      'linkUrlInput'
    );


  const text =
    textInput.value.trim();

  const url =
    urlInput.value.trim();


  if (!text || !url) return;


  const link =
    document.createElement('a');

  link.href =
    normalizeUrl(url);

  link.textContent =
    text;

  pushEditorHistorySnapshot(
    document.getElementById('editorArea'),
    'Создание ссылки'
  );

  savedLinkRange.deleteContents();

  savedLinkRange.insertNode(
    link
  );


  const space =
    document.createTextNode(
      ' '
    );

  link.after(
    space
  );


  closeLinkPopup();

  await saveCurrentPage();
}


function closeLinkPopup() {

  const popup =
    document.getElementById(
      'linkPopup'
    );

  popup.classList.add(
    'hidden'
  );

  savedLinkRange =
    null;
}


function normalizeUrl(
  value
) {

  const trimmed =
    value.trim();


  if (
    trimmed.startsWith('http://')
    ||
    trimmed.startsWith('https://')
    ||
    trimmed.startsWith('#')
    ||
    trimmed.startsWith('/')
  ) {

    return trimmed;
  }


  return `https://${trimmed}`;
}
