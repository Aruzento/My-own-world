import { state } from '../state.js';

import {
  createFolderPage,
  duplicatePageAsChild
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  normalizeText
} from './campaignMapGeometry.js';

import {
  createPageLookup,
  findMapBucket,
  hasCampaignMapAncestor
} from './campaignMapTreeIntegration.js';

import {
  getAddKindPopupHTML,
  getCardPickerPopupHTML
} from './campaignMapToolbar.js';


// Picker карты отвечает за выбор исходных карточек и создание дочерних дублей.
// Сам DOM-токен на карте создает внешний callback addMapToken.

export function openAddKindPopup(
  map,
  anchor,
  deps
) {

  const popup =
    deps.getMapPopup();

  popup.innerHTML =
    getAddKindPopupHTML();

  popup
    .querySelectorAll('.campaign-map-popup-option')
    .forEach(button => {

      button.addEventListener(
        'click',
        event => {

          event.preventDefault();
          event.stopPropagation();

          openCardPickerPopup(
            map,
            anchor,
            button.dataset.kind,
            deps
          );
        }
      );
    });

  deps.showMapPopup(
    popup,
    anchor,
    'add'
  );
}


function openCardPickerPopup(
  map,
  anchor,
  kind,
  deps
) {

  const popup =
    deps.getMapPopup();

  popup.innerHTML =
    getCardPickerPopupHTML(
      kind
    );

  const search =
    popup.querySelector('.campaign-map-picker-search');

  const list =
    popup.querySelector('.campaign-map-picker-list');

  const render = () => {

    renderCardPickerList(
      list,
      kind,
      search.value
    );
  };

  search.addEventListener(
    'input',
    render
  );

  popup
    .querySelector('.campaign-map-popup-cancel')
    .addEventListener(
      'click',
      event => {

        event.stopPropagation();
        deps.closeMapPopup();
      }
    );

  popup
    .querySelector('.campaign-map-popup-add')
    .addEventListener(
      'click',
      async () => {

        const selectedIds =
          [...popup.querySelectorAll('.campaign-map-picker-check:checked')]
            .map(input => input.value);

        const copies =
          clampCopies(
            Number(popup.querySelector('.campaign-map-copies-input')?.value || 1)
          );

        await addSelectedPagesToMap(
          map,
          kind,
          selectedIds,
          copies,
          deps
        );

        deps.closeMapPopup();
      }
    );

  render();

  deps.showMapPopup(
    popup,
    anchor,
    'picker'
  );

  search.focus();
}


function renderCardPickerList(
  list,
  kind,
  query
) {

  const lookup =
    createPageLookup();

  const normalizedQuery =
    normalizeText(
      query
    );

  const allowedTypes =
    kind === 'creature'
      ? new Set(['character', 'creature'])
      : new Set(['object']);

  const pages =
    state.pages
      .filter(page =>
        allowedTypes.has(page.type) &&
        !hasCampaignMapAncestor(page, lookup)
      )
      .filter(page => {

        if (!normalizedQuery) return true;

        return normalizeText(
          page.title
        ).includes(
          normalizedQuery
        );
      })
      .sort((a, b) =>
        normalizeText(a.title).localeCompare(
          normalizeText(b.title)
        )
      );

  list.innerHTML =
    '';

  if (pages.length === 0) {

    const empty =
      document.createElement('div');

    empty.className =
      'campaign-map-picker-empty';

    empty.textContent =
      'Ничего не найдено';

    list.appendChild(
      empty
    );

    return;
  }

  pages.forEach(page => {

    const label =
      document.createElement('label');

    label.className =
      'campaign-map-picker-row';

    label.innerHTML = `
      <input class="campaign-map-picker-check" type="checkbox" value="${page.id}">
      <span>${page.title || 'Без названия'}</span>
    `;

    list.appendChild(
      label
    );
  });
}


export function getMapTokenKindForPage(
  page
) {

  if (
    page?.type === 'object'
  ) {

    return 'object';
  }

  if (
    page?.type === 'character' ||
    page?.type === 'creature'
  ) {

    return 'creature';
  }

  return null;
}


export function canAddPageToCampaignMap(
  page
) {

  if (!page) return false;

  const kind =
    getMapTokenKindForPage(
      page
    );

  if (!kind) return false;

  return !hasCampaignMapAncestor(
    page,
    createPageLookup()
  );
}


export async function addPageToMap(
  map,
  page,
  deps,
  options = {}
) {

  if (
    !canAddPageToCampaignMap(
      page
    )
  ) return null;

  const kind =
    getMapTokenKindForPage(
      page
    );

  const bucket =
    await ensureMapBucket(
      kind
    );

  const duplicate =
    await duplicatePageAsChild(
      page,
      bucket.id
    );

  await deps.addMapToken(
    map,
    kind,
    duplicate,
    options.spawnIndex || 0,
    {
      worldPoint: options.worldPoint || null
    }
  );

  renderTree();
  await deps.saveAndSync();

  return duplicate;
}


async function addSelectedPagesToMap(
  map,
  kind,
  selectedIds,
  copies,
  deps
) {

  if (selectedIds.length === 0) return;

  const bucket =
    await ensureMapBucket(
      kind
    );

  const duplicates = [];

  for (const pageId of selectedIds) {

    const source =
      state.pages.find(page => page.id === pageId);

    if (!source) continue;

    for (let index = 0; index < copies; index += 1) {

      const duplicate =
        await duplicatePageAsChild(
          source,
          bucket.id
        );

      duplicates.push(
        duplicate
      );
    }
  }

  for (const [index, page] of duplicates.entries()) {

    await deps.addMapToken(
      map,
      kind,
      page,
      index
    );
  }

  renderTree();
  await deps.saveAndSync();
}


async function ensureMapBucket(
  kind
) {

  const title =
    kind === 'creature'
      ? 'Существа'
      : 'Объекты';

  const existing =
    findMapBucket(
      state.currentPage.id,
      title
    );

  if (existing) return existing;

  return createFolderPage(
    title,
    state.currentPage.id
  );
}


function clampCopies(
  value
) {

  return Math.min(
    99,
    Math.max(
      1,
      Number.isFinite(value)
        ? Math.floor(value)
        : 1
    )
  );
}
