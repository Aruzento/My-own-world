import {
  findPageByTitle,
  findPageByWikiLinkId
} from './wikiLinkLookup.js';

import {
  openPopupNearAnchor,
  registerPopup
} from '../ui/popupManager.js';


let popup = null;
let showTimer = null;
let hideTimer = null;


export function setupWikiLinkPreviews(
  editor
) {

  editor.addEventListener(
    'pointerover',
    event => {

      const link =
        event.target.closest('.wiki-link');

      if (!link) return;

      const page =
        findPageForLink(
          link
        );

      if (!page) return;

      clearTimeout(
        hideTimer
      );

      showTimer =
        setTimeout(
          () => {
            showPreview(
              link,
              page
            );
          },
          180
        );
    }
  );

  editor.addEventListener(
    'pointerout',
    event => {

      const link =
        event.target.closest('.wiki-link');

      if (!link) return;

      clearTimeout(
        showTimer
      );

      hideTimer =
        setTimeout(
          hidePreview,
          120
        );
    }
  );
}


function showPreview(
  link,
  page
) {

  const element =
    getPreviewPopup();

  element.querySelector('.wiki-preview-title').textContent =
    page.title || 'Без названия';

  element.querySelector('.wiki-preview-description').textContent =
    getPageShortDescription(page) ||
    'Краткое описание пока не заполнено.';

  openPopupNearAnchor(
    element,
    link,
    {
      gap: 10,
      fallbackWidth: 280,
      fallbackHeight: 120
    }
  );
}


function hidePreview() {

  if (!popup) return;

  popup.classList.add(
    'hidden'
  );
}


function getPreviewPopup() {

  if (popup) return popup;

  popup =
    document.createElement('div');

  popup.className =
    'wiki-preview-popup hidden';

  popup.innerHTML = `
    <div class="wiki-preview-title"></div>
    <div class="wiki-preview-description"></div>
  `;

  popup.addEventListener(
    'pointerover',
    () => {
      clearTimeout(
        hideTimer
      );
    }
  );

  popup.addEventListener(
    'pointerout',
    () => {
      hideTimer =
        setTimeout(
          hidePreview,
          120
        );
    }
  );

  document.body.appendChild(
    popup
  );

  registerPopup({
    popup,
    close: hidePreview
  });

  return popup;
}


function findPageForLink(
  link
) {

  const pageId =
    link.dataset.pageId;

  if (pageId) {

    const page =
      findPageByWikiLinkId(
        pageId
      );

    if (page) return page;
  }

  const pageTitle =
    link.dataset.pageTitle ||
    link.textContent;

  return findPageByTitle(
    pageTitle
  );
}


function getPageShortDescription(
  page
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    getPageBody(
      page.content
    );

  return wrapper
    .querySelector('.card-short-description')
    ?.textContent
    .trim();
}


function getPageBody(
  content
) {

  return String(content || '')
    .replace(/---[\s\S]*?---/, '')
    .trim();
}
