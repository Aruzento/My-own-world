import { state } from '../state.js';

import {
  parseMarkdown
} from '../core/markdown.js';

import {
  getImageURL
} from '../storage/assetStorage.js';

import {
  createFolderPage,
  deletePageBranch,
  duplicatePageAsChild,
  writeFile,
  writePageContent
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  setStatus
} from '../ui/ui.js';

import {
  positionPopupNearAnchor
} from '../ui/popupPosition.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_SIZE,
  FOG_PAINT_COLOR,
  MAX_ZOOM,
  MIN_ZOOM,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

import {
  openPresentationWindow,
  syncPresentation,
  syncPresentationDragMeasure,
  syncPresentationItem
} from './campaignMapPresentation.js';

import {
  ensureCanvasSize,
  isCampaignMapRecord,
  persistFogCanvas,
  rememberMapAssetSettings,
  restoreFogCanvas,
  restoreMapAssetSettings
} from './campaignMapContract.js';

import {
  ensurePageDndHealth,
  getHealthColor,
  getPageDndHealth,
  updatePageDndHealth
} from './campaignMapHealth.js';

export {
  isCampaignMapPage,
  serializeCampaignMapHTML
} from './campaignMapContract.js';


let saveCurrentPageCallback = null;
let draggedToken = null;
let panningMap = null;
let fogDrawing = null;
let resizedToken = null;
let rotatedToken = null;
let resizedShape = null;
let draggedShape = null;
let tokenPopupTimer = null;
let tokenPopupCloseTimer = null;
let activeTokenPopupToken = null;
let presentationSyncFrame = null;
let presentationSyncTimeout = null;
let lastPresentationSyncAt = 0;
let visibleObjectsFrame = null;
let pendingVisibleObjectsMap = null;
let pendingVisibleObjectsView = null;
let livePresentationFrame = null;
const pendingPresentationItems = new Set();
const pendingPresentationMeasureStages = new Set();
const restoredTokenImageAssets = new WeakMap();
const tokenHealthCache = new WeakMap();

const TOKEN_DRAG_THRESHOLD = 4;
const TOKEN_POPUP_DELAY = 420;
const TOKEN_RESIZE_THRESHOLD = 2;
const PRESENTATION_SYNC_INTERVAL = 80;
const DEFAULT_SHAPE_SIZE = 192;
const SHAPE_HANDLE_THRESHOLD = 2;
const LOW_DETAIL_ZOOM_THRESHOLD = 0.65;
const LOW_DETAIL_INTERACTION_ZOOM_THRESHOLD = 0.8;
const LOW_DETAIL_MAX_SIZE = 960;
const VIEWPORT_CULL_MARGIN = 320;
const backgroundQualityState = new WeakMap();
const fullDetailBackgroundCache = new Map();
const lowDetailBackgroundCache = new Map();


export function setupCampaignMaps(
  editor,
  saveCurrentPage
) {

  saveCurrentPageCallback =
    saveCurrentPage;

  editor.addEventListener(
    'click',
    handleMapClick
  );

  editor.addEventListener(
    'dblclick',
    handleMapDoubleClick
  );

  editor.addEventListener(
    'pointerover',
    handleMapPointerOver
  );

  editor.addEventListener(
    'pointerout',
    handleMapPointerOut
  );

  editor.addEventListener(
    'pointermove',
    handleBrushPreviewMove
  );

  editor.addEventListener(
    'pointerleave',
    hideAllBrushPreviews
  );

  editor.addEventListener(
    'pointerdown',
    handleMapPointerDown
  );

  editor.addEventListener(
    'input',
    handleMapInput
  );

  document.addEventListener(
    'pointermove',
    handleDocumentPointerMove
  );

  document.addEventListener(
    'pointerup',
    handleDocumentPointerUp
  );

  editor.addEventListener(
    'wheel',
    handleMapWheel,
    { passive: false }
  );
}


export async function renderCampaignMap(
  editor
) {

  const map =
    editor.querySelector('.campaign-map-document');

  if (!map) return;

  ensureMapControls(
    map
  );

  ensureViewportStructure(
    map
  );

  ensureMapViewState(
    map
  );

  await restoreMapBackground(
    map
  );

  await restoreMapTokens(
    map
  );

  await restoreFogCanvas(
    map
  );

  restoreMapShapes(
    map
  );

  applyViewportTransform(
    map
  );

  if (token.dataset.presentationHidden === 'true') {

    syncPresentation();

    return;
  }

  schedulePresentationSync();
}


export function syncCampaignMapPresentation() {

  schedulePresentationSync();
}


export async function removeDeletedCampaignMapTokens(
  pageIds
) {

  const ids =
    new Set(
      pageIds
    );

  if (ids.size === 0) return;

  const openMap =
    document.querySelector(
      '.campaign-map-document'
    );

  let openMapChanged =
    false;

  if (openMap) {

    openMapChanged =
      removeTokensFromMapElement(
        openMap,
        ids
      );
  }

  for (const page of state.pages) {

    if (
      ids.has(page.id) ||
      !isCampaignMapRecord(page)
    ) {

      continue;
    }

    if (
      openMapChanged &&
      state.currentPage?.id === page.id
    ) {

      continue;
    }

    await removeTokensFromMapPageContent(
      page,
      ids
    );
  }

  if (openMapChanged) {

    await saveAndSync();
  }
}


function ensureMapControls(
  map
) {

  const topbar =
    map.querySelector('.campaign-map-topbar');

  if (
    !topbar ||
    topbar.querySelector('.campaign-map-controls')
  ) return;

  const controls =
    document.createElement('div');

  controls.className =
    'campaign-map-controls';

  markRuntime(
    controls
  );

  controls.innerHTML = `
    <div class="campaign-map-control-group">
      <button class="campaign-add-btn" type="button" title="Добавить">+</button>
      <button class="campaign-pan-btn" type="button" title="Двигать карту">✋</button>
    </div>

    <div class="campaign-map-control-group">
      <button class="campaign-grid-btn" type="button" title="Сетка">Сетка</button>
      <button class="campaign-change-map-btn" type="button" title="Сменить карту">🖼</button>
      <button class="campaign-open-presentation-btn" type="button" title="Презентация">▣</button>
    </div>

    <div class="campaign-map-control-group">
      <button class="campaign-shapes-btn" type="button" title="Фигуры">Фигуры</button>
      <button class="campaign-fog-btn" type="button" title="Туман">Туман</button>
    </div>
  `;

  topbar.appendChild(
    controls
  );

  updateGridButton(
    map
  );

  updateFogButtons(
    map
  );

  updatePanButton(
    map
  );

  updateGridSize(
    map
  );
}


async function removeTokensFromMapPageContent(
  page,
  ids
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    getMarkdownBody(
      page.content
    );

  const map =
    wrapper.querySelector(
      '.campaign-map-document'
    );

  if (!map) return false;

  const changed =
    removeTokensFromMapElement(
      map,
      ids
    );

  if (!changed) return false;

  const content =
    replaceMarkdownBody(
      page.content,
      wrapper.innerHTML
    );

  await writePageContent(
    page,
    content
  );

  page.content =
    content;

  return true;
}


function removeTokensFromMapElement(
  map,
  ids
) {

  let changed =
    false;

  map
    .querySelectorAll('.campaign-map-token[data-page-id]')
    .forEach(token => {

      if (
        !ids.has(token.dataset.pageId)
      ) return;

      token.remove();
      changed =
        true;
    });

  return changed;
}


function getMarkdownBody(
  content
) {

  return String(content || '')
    .replace(/---[\s\S]*?---/, '')
    .trim();
}


function replaceMarkdownBody(
  content,
  body
) {

  const frontMatter =
    String(content || '')
      .match(/^---[\s\S]*?---/);

  if (!frontMatter) return body;

  return `${frontMatter[0]}\n\n${body}\n`;
}


function ensureViewportStructure(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  let viewport =
    stage.querySelector('.campaign-map-viewport');

  if (!viewport) {

    viewport =
      document.createElement('div');

    viewport.className =
      'campaign-map-viewport';

    [
      '.campaign-map-background',
      '.campaign-map-object-layer',
      '.campaign-map-fog-canvas'
    ]
      .map(selector => stage.querySelector(selector))
      .filter(Boolean)
      .forEach(element => {
        viewport.appendChild(
          element
        );
      });

    stage.appendChild(
      viewport
    );
  }

  viewport.style.width =
    `${WORLD_WIDTH}px`;

  viewport.style.height =
    `${WORLD_HEIGHT}px`;

  ensureBrushPreview(
    stage
  );
}


function ensureBrushPreview(
  stage
) {

  let preview =
    stage.querySelector('.campaign-brush-preview');

  if (preview) {

    markRuntime(
      preview
    );

    return preview;
  }

  preview =
    document.createElement('div');

  preview.className =
    'campaign-brush-preview';

  markRuntime(
    preview
  );

  stage.appendChild(
    preview
  );

  return preview;
}


function ensureMapViewState(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  if (!stage.dataset.viewX) {
    stage.dataset.viewX =
      '0';
  }

  if (!stage.dataset.viewY) {
    stage.dataset.viewY =
      '0';
  }

  if (!stage.dataset.viewZoom) {
    stage.dataset.viewZoom =
      '1';
  }

  stage.dataset.tool =
    'pan';

  stage.dataset.fogMode =
    'draw';

  if (!stage.dataset.gridSize) {
    stage.dataset.gridSize =
      String(DEFAULT_GRID_SIZE);
  }

  if (!stage.dataset.gridColor) {
    stage.dataset.gridColor =
      DEFAULT_GRID_COLOR;
  }

  if (!stage.dataset.brushSize) {
    stage.dataset.brushSize =
      String(DEFAULT_BRUSH_SIZE);
  }
}


async function handleMapClick(
  event
) {

  const map =
    event.target.closest('.campaign-map-document');

  if (!map) return;

  const token =
    event.target.closest('.campaign-map-token');

  const shape =
    event.target.closest('.campaign-map-shape');

  if (
    token &&
    token.dataset.tokenType === 'object'
  ) {

    selectMapToken(
      token
    );
  } else if (shape) {

    selectMapShape(
      shape
    );
  } else if (
    !event.target.closest('.campaign-map-controls') &&
    !event.target.closest('.campaign-map-popup')
  ) {

    clearSelectedMapTokens(
      map
    );

    clearSelectedMapShapes(
      map
    );
  }

  if (
    event.target.closest('.campaign-add-btn')
  ) {

    if (
      toggleMapPopupForAnchor(
        event.target.closest('.campaign-add-btn'),
        'add'
      )
    ) return;

    openAddKindPopup(
      map,
      event.target.closest('.campaign-add-btn')
    );
    return;
  }

  if (
    event.target.closest('.campaign-pan-btn')
  ) {

    setMapTool(
      map,
      'pan'
    );

    await saveAndSync();
    return;
  }

  if (
    event.target.closest('.campaign-grid-btn')
  ) {

    if (
      toggleMapPopupForAnchor(
        event.target.closest('.campaign-grid-btn'),
        'grid'
      )
    ) return;

    openGridPopup(
      map,
      event.target.closest('.campaign-grid-btn')
    );

    return;
  }

  if (
    event.target.closest('.campaign-change-map-btn')
  ) {

    await changeMapImage(
      map
    );

    await saveAndSync();
    return;
  }

  if (
    event.target.closest('.campaign-open-presentation-btn')
  ) {

    openPresentationWindow();
    syncPresentation();
    return;
  }

  if (
    event.target.closest('.campaign-shapes-btn')
  ) {

    if (
      toggleMapPopupForAnchor(
        event.target.closest('.campaign-shapes-btn'),
        'shapes'
      )
    ) return;

    openShapesPopup(
      map,
      event.target.closest('.campaign-shapes-btn')
    );

    return;
  }

  if (
    event.target.closest('.campaign-fog-btn')
  ) {

    if (
      toggleMapPopupForAnchor(
        event.target.closest('.campaign-fog-btn'),
        'fog'
      )
    ) return;

    openFogPopup(
      map,
      event.target.closest('.campaign-fog-btn')
    );
  }
}


function openAddKindPopup(
  map,
  anchor
) {

  const popup =
    getMapPopup();

  popup.innerHTML = `
    <div class="campaign-map-popup-title">Добавить</div>
    <button class="campaign-map-popup-option" type="button" data-kind="creature">Существо</button>
    <button class="campaign-map-popup-option" type="button" data-kind="object">Объект</button>
  `;

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
          button.dataset.kind
        );
        }
      );
    });

  showMapPopup(
    popup,
    anchor,
    'add'
  );
}


function openCardPickerPopup(
  map,
  anchor,
  kind
) {

  const popup =
    getMapPopup();

  const title =
    kind === 'creature'
      ? 'Выбери существ'
      : 'Выбери объекты';

  popup.innerHTML = `
    <div class="campaign-map-popup-title">${title}</div>
    <input class="campaign-map-picker-search" type="search" placeholder="Поиск">
    <div class="campaign-map-picker-list"></div>
    <label class="campaign-map-copies-label">
      <span>Число копий</span>
      <input class="campaign-map-copies-input" type="number" min="1" max="99" value="1">
    </label>
    <div class="campaign-map-popup-actions">
      <button class="campaign-map-popup-cancel" type="button">Отмена</button>
      <button class="campaign-map-popup-add" type="button">Добавить</button>
    </div>
  `;

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
        closeMapPopup();
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
          clamp(
            Number(popup.querySelector('.campaign-map-copies-input')?.value || 1),
            1,
            99
          );

        await addSelectedPagesToMap(
          map,
          kind,
          selectedIds,
          copies
        );

        closeMapPopup();
      }
    );

  render();
  showMapPopup(
    popup,
    anchor,
    `picker-${kind}`
  );
  search.focus();
}


function renderCardPickerList(
  list,
  kind,
  query
) {

  const pageLookup =
    createPageLookup();

  const normalizedQuery =
    normalizeText(
      query
    );

  const allowedTypes =
    kind === 'creature'
      ? ['character', 'creature']
      : ['object'];

  const pages =
    state.pages.filter(page => {

      const pageTypes =
        [
          page.type,
          ...(page.tags || [])
        ]
          .filter(Boolean);

      if (
        page.template !== 'card' ||
        hasCampaignMapAncestor(
          page,
          pageLookup
        ) ||
        !pageTypes.some(type =>
          allowedTypes.includes(type)
        )
      ) return false;

      return normalizeText(
        page.title
      ).includes(
        normalizedQuery
      );
    });

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


function createPageLookup() {

  return new Map(
    state.pages.map(page => [
      page.id,
      page
    ])
  );
}


function hasCampaignMapAncestor(
  page,
  pageLookup = createPageLookup()
) {

  const visited =
    new Set();

  let parentId =
    page?.parent;

  while (parentId) {

    if (
      visited.has(parentId)
    ) return false;

    visited.add(
      parentId
    );

    const parent =
      pageLookup.get(parentId);

    if (!parent) return false;

    if (
      isCampaignMapRecord(parent)
    ) return true;

    parentId =
      parent.parent;
  }

  return false;
}


async function addSelectedPagesToMap(
  map,
  kind,
  selectedIds,
  copies = 1
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

    await addMapToken(
      map,
      kind,
      page,
      index
    );
  }

  renderTree();
  await saveAndSync();
}


async function ensureMapBucket(
  kind
) {

  const title =
    kind === 'creature'
      ? 'Существа'
      : 'Объекты';

  const existing =
    state.pages.find(page =>
      page.parent === state.currentPage.id &&
      normalizeText(page.title) === normalizeText(title)
    );

  if (existing) return existing;

  return createFolderPage(
    title,
    state.currentPage.id
  );
}


function openGridPopup(
  map,
  anchor
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const popup =
    getMapPopup();

  popup.innerHTML = `
    <div class="campaign-map-popup-title">Сетка</div>
    <button class="campaign-grid-toggle-btn campaign-map-popup-option" type="button">
      ${stage.dataset.grid === 'true' ? 'Выключить сетку' : 'Включить сетку'}
    </button>
    <label class="campaign-map-range-label">
      <span>Размер сетки</span>
      <input class="campaign-grid-size-range campaign-map-range" type="range" min="24" max="96" step="2" value="${stage.dataset.gridSize || DEFAULT_GRID_SIZE}">
    </label>
    <label class="campaign-map-color-label">
      <span>Цвет сетки</span>
      <input class="campaign-grid-color-input" type="color" value="${stage.dataset.gridColor || DEFAULT_GRID_COLOR}">
    </label>
  `;

  popup
    .querySelector('.campaign-grid-toggle-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();

        toggleGrid(
          map
        );

        event.currentTarget.textContent =
          stage.dataset.grid === 'true'
            ? 'Выключить сетку'
            : 'Включить сетку';

        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-grid-size-range')
    .addEventListener(
      'input',
      async event => {

        stage.dataset.gridSize =
          event.target.value;

        rememberMapAssetSettings(
          stage
        );

        updateGridSize(
          map
        );

        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-grid-color-input')
    .addEventListener(
      'input',
      async event => {

        stage.dataset.gridColor =
          event.target.value || DEFAULT_GRID_COLOR;

        rememberMapAssetSettings(
          stage
        );

        updateGridSize(
          map
        );

        await saveAndSync();
      }
    );

  showMapPopup(
    popup,
    anchor,
    'grid'
  );
}


function openFogPopup(
  map,
  anchor
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const popup =
    getMapPopup();

  popup.innerHTML = `
    <div class="campaign-map-popup-title">Туман</div>
    <div class="campaign-fog-mode-row">
      <button class="campaign-fog-draw-btn campaign-fog-mode-btn" type="button">
        <span>●</span>
        <strong>Кисть</strong>
      </button>
      <button class="campaign-fog-erase-btn campaign-fog-mode-btn" type="button">
        <span>○</span>
        <strong>Ластик</strong>
      </button>
    </div>
    <label class="campaign-map-range-label">
      <span>Размер кисти</span>
      <input class="campaign-map-range" type="range" min="12" max="120" step="2" value="${stage.dataset.brushSize || DEFAULT_BRUSH_SIZE}">
    </label>
    <div class="campaign-map-popup-actions campaign-fog-fill-row">
      <button class="campaign-fog-fill-btn" type="button">Fog all</button>
      <button class="campaign-fog-clear-btn" type="button">Unfog all</button>
    </div>
  `;

  popup
    .querySelector('.campaign-fog-draw-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        setFogMode(
          map,
          'draw'
        );
        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-erase-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        setFogMode(
          map,
          'erase'
        );
        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-map-range')
    .addEventListener(
      'input',
      async event => {

        stage.dataset.brushSize =
          event.target.value;

        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-fill-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        fillFog(
          map
        );
        await saveAndSync();
      }
    );

  popup
    .querySelector('.campaign-fog-clear-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        clearFog(
          map
        );
        await saveAndSync();
      }
    );

  updateFogButtons(
    map
  );

  showMapPopup(
    popup,
    anchor,
    'fog'
  );
}


function openShapesPopup(
  map,
  anchor
) {

  const popup =
    getMapPopup();

  popup.innerHTML = `
    <div class="campaign-map-popup-title">Фигуры</div>
    <div class="campaign-shape-picker">
      <button class="campaign-shape-option" type="button" data-shape="square">
        <span class="campaign-shape-icon is-square"></span>
        <strong>Квадрат</strong>
      </button>
      <button class="campaign-shape-option" type="button" data-shape="triangle">
        <span class="campaign-shape-icon is-triangle"></span>
        <strong>Треугольник</strong>
      </button>
      <button class="campaign-shape-option" type="button" data-shape="circle">
        <span class="campaign-shape-icon is-circle"></span>
        <strong>Круг</strong>
      </button>
    </div>
  `;

  popup
    .querySelectorAll('.campaign-shape-option')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();
          event.stopPropagation();

          addMapShape(
            map,
            button.dataset.shape
          );

          closeMapPopup();
          await saveAndSync();
        }
      );
    });

  showMapPopup(
    popup,
    anchor,
    'shapes'
  );
}


function toggleMapPopupForAnchor(
  anchor,
  key
) {

  const popup =
    getMapPopup();

  if (
    popup.dataset.popupKey === key &&
    popup.dataset.anchorKey === getAnchorKey(anchor) &&
    !popup.classList.contains('hidden')
  ) {

    closeMapPopup();
    return true;
  }

  return false;
}


function getMapPopup() {

  let popup =
    document.getElementById('campaignMapPopup');

  if (popup) return popup;

  popup =
    document.createElement('div');

  popup.id =
    'campaignMapPopup';

  popup.className =
    'campaign-map-popup hidden';

  markRuntime(
    popup
  );

  document.body.appendChild(
    popup
  );

  document.addEventListener(
    'click',
    event => {

      if (
        popup.classList.contains('hidden') ||
        popup.contains(event.target) ||
        event.target.closest('.campaign-map-controls')
      ) return;

      closeMapPopup();
    }
  );

  popup.addEventListener(
    'click',
    event => {

      event.stopPropagation();
    }
  );

  return popup;
}


function showMapPopup(
  popup,
  anchor,
  key = ''
) {

  popup.dataset.popupKey =
    key;

  popup.dataset.anchorKey =
    getAnchorKey(
      anchor
    );

  popup.classList.remove(
    'hidden'
  );

  requestAnimationFrame(
    () => {

      positionPopupNearAnchor(
        popup,
        anchor,
        {
          fallbackWidth: 320,
          fallbackHeight: 260
        }
      );
    }
  );
}


function closeMapPopup() {

  const popup =
    document.getElementById('campaignMapPopup');

  if (!popup) return;

  popup.classList.add('hidden');
  popup.dataset.popupKey =
    '';
  popup.dataset.anchorKey =
    '';
}


function getAnchorKey(
  anchor
) {

  if (!anchor) return '';

  if (!anchor.dataset.popupAnchorId) {

    anchor.dataset.popupAnchorId =
      crypto.randomUUID();
  }

  return anchor.dataset.popupAnchorId;
}


async function addMapToken(
  map,
  type,
  page = null,
  spawnIndex = 0
) {

  const layer =
    map.querySelector('.campaign-map-object-layer');

  if (!layer) return;

  const index =
    layer.querySelectorAll(`[data-token-type="${type}"]`).length + 1;

  const token =
    document.createElement('button');

  token.className =
    `campaign-map-token is-${type}`;

  token.type =
    'button';

  token.dataset.tokenId =
    crypto.randomUUID();

  token.dataset.tokenType =
    type;

  if (page) {

    token.dataset.pageId =
      page.id;

    const imageAsset =
      getPagePortraitAsset(
        page
      );

    if (imageAsset) {

      token.dataset.imageAsset =
        imageAsset;
    }
  }

  const spawnPoint =
    getVisibleSpawnPoint(
      map,
      spawnIndex
    );

  token.dataset.x =
    ((spawnPoint.x / WORLD_WIDTH) * 100).toFixed(3);

  token.dataset.y =
    ((spawnPoint.y / WORLD_HEIGHT) * 100).toFixed(3);

  token.dataset.name =
    page?.title ||
    (
      type === 'creature'
        ? `Существо ${index}`
        : `Объект ${index}`
    );

  if (!token.dataset.size) {

    token.dataset.size =
      '1';
  }

  if (!token.dataset.rotation) {

    token.dataset.rotation =
      '0';
  }

  setTokenFallbackText(
    token,
    type
  );

  layer.appendChild(
    token
  );

  positionToken(
    token
  );

  applyTokenSize(
    token
  );

  applyTokenRotation(
    token
  );

  applyTokenHealthState(
    token
  );

  await restoreTokenImage(
    token
  );

}


async function restoreMapTokens(
  map
) {

  const pageLookup =
    createPageLookup();

  const tokens =
    [...map
    .querySelectorAll('.campaign-map-token')
    ];

  for (const token of tokens) {

    positionToken(
      token
    );

    applyTokenSize(
      token
    );

    applyTokenRotation(
      token
    );

    if (!token.dataset.imageAsset) {

      const page =
        pageLookup.get(
          token.dataset.pageId
        );

      const imageAsset =
        page
          ? getPagePortraitAsset(page)
          : '';

      if (imageAsset) {

          token.dataset.imageAsset =
            imageAsset;
      }
    }

    applyTokenHealthState(
      token,
      pageLookup
    );

    await restoreTokenImage(
      token
    );
  }
}


function applyTokenHealthState(
  token,
  pageLookup = null
) {

  if (
    token.dataset.tokenType !== 'creature'
  ) {

    clearTokenHealthState(
      token
    );

    return;
  }

  const page =
    pageLookup
      ? pageLookup.get(token.dataset.pageId)
      : state.pages.find(candidate =>
        candidate.id === token.dataset.pageId
      );

  const health =
    getPageDndHealth(
      page
    );

  const cacheKey =
    health
      ? `${health.current}/${health.max}/${health.temp || 0}`
      : 'none';

  if (
    tokenHealthCache.get(token) === cacheKey
  ) return;

  tokenHealthCache.set(
    token,
    cacheKey
  );

  if (!health) {

    clearTokenHealthState(
      token
    );

    return;
  }

  const percent =
    clamp(
      health.current / health.max,
      0,
      1
    );

  token.dataset.hpPercent =
    String(
      Math.round(percent * 100)
    );

  token.dataset.hpState =
    health.current <= 0
      ? 'dead'
      : 'alive';

  token.style.setProperty(
    '--token-health-color',
    getHealthColor(
      percent
    )
  );
}


function clearTokenHealthState(
  token
) {

  delete token.dataset.hpPercent;
  delete token.dataset.hpState;

  token.style.removeProperty(
    '--token-health-color'
  );
}


async function restoreTokenImage(
  token
) {

  const asset =
    token.dataset.imageAsset;

  if (
    asset &&
    restoredTokenImageAssets.get(token) === asset &&
    token.querySelector('.campaign-map-token-image')
  ) {

    ensureTokenResizeHandles(
      token
    );

    return;
  }

  if (!asset) {

    setTokenFallbackText(
      token,
      token.dataset.tokenType
    );

    restoredTokenImageAssets.delete(
      token
    );

    return;
  }

  try {

    const url =
      await getFullDetailBackgroundURL(
        asset
      );

    token.innerHTML = `
      <img
        class="campaign-map-token-image"
        src="${url}"
        alt=""
      >
    `;

    ensureTokenResizeHandles(
      token
    );

    restoredTokenImageAssets.set(
      token,
      asset
    );

  } catch (error) {

    console.warn(
      'Не удалось восстановить картинку токена:',
      asset
    );

    setTokenFallbackText(
      token,
      token.dataset.tokenType
    );

    restoredTokenImageAssets.delete(
      token
    );
  }
}


function setTokenFallbackText(
  token,
  type
) {

  token.textContent =
    type === 'creature'
      ? 'С'
      : 'О';

  ensureTokenResizeHandles(
    token
  );
}


function ensureTokenResizeHandles(
  token
) {

  if (
    token.dataset.tokenType !== 'object'
  ) return;

  ['nw', 'ne', 'sw', 'se'].forEach(corner => {

    if (
      token.querySelector(`.campaign-map-token-resize.is-${corner}`)
    ) return;

    const handle =
      document.createElement('span');

    handle.className =
      `campaign-map-token-resize is-${corner}`;

    handle.dataset.corner =
      corner;

    markRuntime(
      handle
    );

    token.appendChild(
      handle
    );
  });

  if (
    token.querySelector('.campaign-map-token-rotate')
  ) return;

  const rotateHandle =
    document.createElement('span');

  rotateHandle.className =
    'campaign-map-token-rotate';

  rotateHandle.title =
    'Повернуть';

  markRuntime(
    rotateHandle
  );

  token.appendChild(
    rotateHandle
  );
}


function applyTokenSize(
  token
) {

  const size =
    Math.max(
      0.5,
      Number(token.dataset.size || 1)
    );

  token.style.setProperty(
    '--token-size',
    String(size)
  );
}


function applyTokenRotation(
  token
) {

  const rotation =
    Number(token.dataset.rotation || 0);

  token.style.setProperty(
    '--token-rotation',
    `${rotation}deg`
  );
}


function getPagePortraitAsset(
  page
) {

  const parsed =
    parsePageBody(
      page
    );

  const image =
    parsed.querySelector(
      '.media-box.is-portrait img[data-asset], img[data-asset]'
    );

  return image?.dataset.asset || '';
}


function parsePageBody(
  page
) {

  const wrapper =
    document.createElement('div');

  const body =
    String(page?.content || '')
      .replace(/---[\s\S]*?---/, '')
      .trim();

  wrapper.innerHTML =
    body;

  return wrapper;
}


function positionToken(
  token
) {

  token.style.left =
    `${Number(token.dataset.x || 50)}%`;

  token.style.top =
    `${Number(token.dataset.y || 50)}%`;

  token.title =
    token.dataset.name || '';
}


function selectMapToken(
  token
) {

  const map =
    token.closest('.campaign-map-document');

  clearSelectedMapTokens(
    map
  );

  token.classList.add(
    'is-selected'
  );
}


function clearSelectedMapTokens(
  map
) {

  map
    ?.querySelectorAll('.campaign-map-token.is-selected')
    .forEach(token => {

      token.classList.remove(
        'is-selected'
      );
    });
}


function clearSelectedMapShapes(
  map
) {

  map
    ?.querySelectorAll('.campaign-map-shape.is-selected')
    .forEach(shape => {

      shape.classList.remove(
        'is-selected'
      );
    });
}


function restoreMapShapes(
  map
) {

  map
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      renderMapShape(
        shape
      );
    });
}


function addMapShape(
  map,
  type
) {

  const layer =
    map.querySelector('.campaign-map-object-layer');

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!layer || !stage) return;

  const view =
    getStageView(
      stage
    );

  const x =
    clamp(
      (stage.clientWidth / 2 - view.x) / view.zoom - DEFAULT_SHAPE_SIZE / 2,
      0,
      WORLD_WIDTH - DEFAULT_SHAPE_SIZE
    );

  const y =
    clamp(
      (stage.clientHeight / 2 - view.y) / view.zoom - DEFAULT_SHAPE_SIZE / 2,
      0,
      WORLD_HEIGHT - DEFAULT_SHAPE_SIZE
    );

  const shape =
    document.createElement('div');

  shape.className =
    'campaign-map-shape';

  shape.dataset.shapeType =
    type;

  shape.dataset.x =
    String(Math.round(x));

  shape.dataset.y =
    String(Math.round(y));

  shape.dataset.w =
    String(DEFAULT_SHAPE_SIZE);

  shape.dataset.h =
    String(DEFAULT_SHAPE_SIZE);

  if (type === 'triangle') {

    shape.dataset.points =
      '50,6 94,94 6,94';
  }

  layer.appendChild(
    shape
  );

  renderMapShape(
    shape
  );

  selectMapShape(
    shape
  );
}


function renderMapShape(
  shape
) {

  ensureShapeId(
    shape
  );

  applyShapeGeometry(
    shape
  );

  const type =
    shape.dataset.shapeType || 'square';

  shape.innerHTML =
    getShapeInnerHTML(
      shape,
      type
    );

  shape
    .querySelectorAll('.campaign-map-shape-handle')
    .forEach(handle => markRuntime(handle));
}


function ensureShapeId(
  shape
) {

  if (!shape.dataset.shapeId) {

    shape.dataset.shapeId =
      crypto.randomUUID();
  }
}


function getShapeInnerHTML(
  shape,
  type
) {

  if (type === 'triangle') {

    const points =
      getTrianglePoints(
        shape
      );

    const width =
      Number(shape.dataset.w || DEFAULT_SHAPE_SIZE);

    const height =
      Number(shape.dataset.h || DEFAULT_SHAPE_SIZE);

    return `
      <svg class="campaign-map-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="${points.map(point => `${point.x},${point.y}`).join(' ')}"></polygon>
      </svg>
      ${points.map((point, index) => `
        <span
          class="campaign-map-shape-handle"
          data-point="${index}"
          style="left:${point.x}%;top:${point.y}%"
        ></span>
      `).join('')}
      ${getTriangleLabels(points, width, height)}
    `;
  }

  if (type === 'circle') {

    return `
      <svg class="campaign-map-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse cx="50" cy="50" rx="48" ry="48"></ellipse>
      </svg>
      <span class="campaign-map-shape-handle is-se" data-corner="se"></span>
      <span class="campaign-map-shape-label is-top">${getFeetLabel(Number(shape.dataset.w || DEFAULT_SHAPE_SIZE))}</span>
    `;
  }

  return `
    <svg class="campaign-map-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="2" y="2" width="96" height="96"></rect>
    </svg>
    <span class="campaign-map-shape-handle is-nw" data-corner="nw"></span>
    <span class="campaign-map-shape-handle is-ne" data-corner="ne"></span>
    <span class="campaign-map-shape-handle is-sw" data-corner="sw"></span>
    <span class="campaign-map-shape-handle is-se" data-corner="se"></span>
    <span class="campaign-map-shape-label is-top">${getFeetLabel(Number(shape.dataset.w || DEFAULT_SHAPE_SIZE))}</span>
    <span class="campaign-map-shape-label is-right">${getFeetLabel(Number(shape.dataset.h || DEFAULT_SHAPE_SIZE))}</span>
  `;
}


function applyShapeGeometry(
  shape
) {

  shape.style.left =
    `${Number(shape.dataset.x || 0)}px`;

  shape.style.top =
    `${Number(shape.dataset.y || 0)}px`;

  shape.style.width =
    `${Number(shape.dataset.w || DEFAULT_SHAPE_SIZE)}px`;

  shape.style.height =
    `${Number(shape.dataset.h || DEFAULT_SHAPE_SIZE)}px`;
}


function selectMapShape(
  shape
) {

  const map =
    shape.closest('.campaign-map-document');

  clearSelectedMapTokens(
    map
  );

  clearSelectedMapShapes(
    map
  );

  shape.classList.add(
    'is-selected'
  );
}


function getTrianglePoints(
  shape
) {

  return String(shape.dataset.points || '50,6 94,94 6,94')
    .split(/\s+/)
    .map(pair => {

      const [x, y] =
        pair.split(',').map(Number);

      return {
        x: Number.isFinite(x) ? x : 50,
        y: Number.isFinite(y) ? y : 50
      };
    })
    .slice(0, 3);
}


function setTrianglePoints(
  shape,
  points
) {

  shape.dataset.points =
    points
      .map(point => `${roundShapePercent(point.x)},${roundShapePercent(point.y)}`)
      .join(' ');
}


function getTriangleLabels(
  points,
  width,
  height
) {

  return points
    .map((point, index) => {

      const next =
        points[(index + 1) % points.length];

      const x =
        (point.x + next.x) / 2;

      const y =
        (point.y + next.y) / 2;

      const length =
        Math.hypot(
          ((next.x - point.x) / 100) * width,
          ((next.y - point.y) / 100) * height
        );

      return `
        <span
          class="campaign-map-shape-label"
          style="left:${x}%;top:${y}%"
        >
          ${getFeetLabel(length)}
        </span>
      `;
    })
    .join('');
}


function getFeetLabel(
  pixels
) {

  const cells =
    Math.max(
      1,
      Math.round(
        pixels / getActiveGridSize()
      )
    );

  return `${cells * 5} ft`;
}


function getActiveGridSize(
) {

  const stage =
    document.querySelector(
      '#editorArea .campaign-map-stage'
    );

  return Math.max(
    1,
    Number(stage?.dataset.gridSize || DEFAULT_GRID_SIZE)
  );
}


function roundShapePercent(
  value
) {

  return Math.round(
    value * 10
  ) / 10;
}


function applyViewportTransform(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const viewport =
    map.querySelector('.campaign-map-viewport');

  if (!stage || !viewport) return;

  const view =
    getStageView(
      stage
    );

  viewport.style.transform =
    `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;

  scheduleVisibleMapObjectsUpdate(
    map,
    view
  );

  updateMapBackgroundQuality(
    map
  );
}


function scheduleVisibleMapObjectsUpdate(
  map,
  view = null
) {

  pendingVisibleObjectsMap =
    map;

  pendingVisibleObjectsView =
    view
      ? { ...view }
      : null;

  if (visibleObjectsFrame) return;

  visibleObjectsFrame =
    requestAnimationFrame(
      () => {

        visibleObjectsFrame =
          null;

        const nextMap =
          pendingVisibleObjectsMap;

        const nextView =
          pendingVisibleObjectsView;

        pendingVisibleObjectsMap =
          null;

        pendingVisibleObjectsView =
          null;

        updateVisibleMapObjects(
          nextMap,
          nextView
        );
      }
    );
}


function getStageView(
  stage
) {

  return {
    x: Number(stage.dataset.viewX || 0),
    y: Number(stage.dataset.viewY || 0),
    zoom: clamp(
      Number(stage.dataset.viewZoom || 1),
      MIN_ZOOM,
      MAX_ZOOM
    )
  };
}


function updateVisibleMapObjects(
  map,
  view = null
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) return;

  const activeView =
    view ||
    getStageView(
      stage
    );

  const visibleRect =
    getVisibleWorldRect(
      stage,
      activeView
    );

  map
    .querySelectorAll('.campaign-map-token')
    .forEach(token => {

      const tokenRect =
        getTokenWorldRect(
          token,
          stage
        );

      token.classList.toggle(
        'is-offscreen',
        !isActiveMapObject(token) &&
        !rectsIntersect(
          visibleRect,
          tokenRect
        )
      );
    });

  map
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      const shapeRect =
        getShapeWorldRect(
          shape
        );

      shape.classList.toggle(
        'is-offscreen',
        !isActiveMapObject(shape) &&
        !rectsIntersect(
          visibleRect,
          shapeRect
        )
      );
    });
}


function getVisibleWorldRect(
  stage,
  view
) {

  return {
    left: (-view.x / view.zoom) - VIEWPORT_CULL_MARGIN,
    top: (-view.y / view.zoom) - VIEWPORT_CULL_MARGIN,
    right: ((stage.clientWidth - view.x) / view.zoom) + VIEWPORT_CULL_MARGIN,
    bottom: ((stage.clientHeight - view.y) / view.zoom) + VIEWPORT_CULL_MARGIN
  };
}


function getVisibleSpawnPoint(
  map,
  spawnIndex = 0
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) {

    return {
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2
    };
  }

  const view =
    getStageView(
      stage
    );

  const center = {
    x: (stage.clientWidth / 2 - view.x) / view.zoom,
    y: (stage.clientHeight / 2 - view.y) / view.zoom
  };

  const offset =
    getSpawnOffset(
      stage,
      spawnIndex
    );

  return {
    x: clamp(
      center.x + offset.x,
      0,
      WORLD_WIDTH
    ),
    y: clamp(
      center.y + offset.y,
      0,
      WORLD_HEIGHT
    )
  };
}


function getSpawnOffset(
  stage,
  spawnIndex
) {

  const pattern = [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1]
  ];

  const index =
    Math.max(
      0,
      Number(spawnIndex || 0)
    );

  const gridSize =
    Math.max(
      1,
      Number(stage.dataset.gridSize || DEFAULT_GRID_SIZE)
    );

  const [x, y] =
    pattern[index % pattern.length];

  const ring =
    Math.floor(index / pattern.length);

  const distance =
    gridSize * (ring + 1);

  return {
    x: x * distance,
    y: y * distance
  };
}


function getTokenWorldRect(
  token,
  stage
) {

  const gridSize =
    Math.max(
      1,
      Number(stage.dataset.gridSize || DEFAULT_GRID_SIZE)
    );

  const size =
    gridSize *
    Math.max(
      0.5,
      Number(token.dataset.size || 1)
    );

  const x =
    Number(token.dataset.x || 50) / 100 * WORLD_WIDTH;

  const y =
    Number(token.dataset.y || 50) / 100 * WORLD_HEIGHT;

  return {
    left: x - size / 2,
    top: y - size / 2,
    right: x + size / 2,
    bottom: y + size / 2
  };
}


function getShapeWorldRect(
  shape
) {

  const x =
    Number(shape.dataset.x || 0);

  const y =
    Number(shape.dataset.y || 0);

  const width =
    Number(shape.dataset.w || DEFAULT_SHAPE_SIZE);

  const height =
    Number(shape.dataset.h || DEFAULT_SHAPE_SIZE);

  return {
    left: x,
    top: y,
    right: x + width,
    bottom: y + height
  };
}


function rectsIntersect(
  a,
  b
) {

  return (
    a.left <= b.right &&
    a.right >= b.left &&
    a.top <= b.bottom &&
    a.bottom >= b.top
  );
}


function isActiveMapObject(
  element
) {

  return element.classList.contains('is-selected') ||
    element.classList.contains('is-dragging') ||
    element.classList.contains('is-resizing') ||
    element.classList.contains('is-rotating');
}


function setStageView(
  stage,
  view
) {

  stage.dataset.viewX =
    String(Math.round(view.x));

  stage.dataset.viewY =
    String(Math.round(view.y));

  stage.dataset.viewZoom =
    String(
      clamp(
        view.zoom,
        MIN_ZOOM,
        MAX_ZOOM
      ).toFixed(3)
    );
}


function zoomMap(
  map,
  factor,
  anchor = null
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  const rect =
    stage.getBoundingClientRect();

  const view =
    getStageView(
      stage
    );

  const nextZoom =
    clamp(
      view.zoom * factor,
      MIN_ZOOM,
      MAX_ZOOM
    );

  const point =
    anchor || {
      x: rect.width / 2,
      y: rect.height / 2
    };

  const worldX =
    (point.x - view.x) / view.zoom;

  const worldY =
    (point.y - view.y) / view.zoom;

  setStageView(
    stage,
    {
      zoom: nextZoom,
      x: point.x - worldX * nextZoom,
      y: point.y - worldY * nextZoom
    }
  );

  applyViewportTransform(
    map
  );
}


function resetMapView(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  setStageView(
    stage,
    {
      x: 0,
      y: 0,
      zoom: 1
    }
  );

  applyViewportTransform(
    map
  );
}


function toggleGrid(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const enabled =
    stage.dataset.grid === 'true';

  stage.dataset.grid =
    enabled
      ? 'false'
      : 'true';

  updateGridButton(
    map
  );
}


function fillFog(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const canvas =
    map.querySelector('.campaign-map-fog-canvas');

  if (!stage || !canvas) return;

  ensureCanvasSize(
    canvas
  );

  const context =
    canvas.getContext('2d');

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.fillStyle =
    FOG_PAINT_COLOR;

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  persistFogCanvas(
    map
  );

  schedulePresentationSync();
}


function clearFog(
  map
) {

  const canvas =
    map.querySelector('.campaign-map-fog-canvas');

  if (!canvas) return;

  ensureCanvasSize(
    canvas
  );

  canvas
    .getContext('2d')
    .clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

  persistFogCanvas(
    map
  );

  schedulePresentationSync();
}


function updateGridButton(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const button =
    map.querySelector('.campaign-grid-btn');

  if (!stage || !button) return;

  const enabled =
    stage.dataset.grid === 'true';

  button.title =
    enabled
      ? 'Выключить сетку'
      : 'Включить сетку';

  button.classList.toggle(
    'is-active',
    enabled
  );
}


function updateGridSize(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  const gridSize =
    Number(stage.dataset.gridSize || DEFAULT_GRID_SIZE);

  stage.style.setProperty(
    '--campaign-grid-size',
    `${gridSize}px`
  );

  stage.style.setProperty(
    '--campaign-grid-color',
    hexToGridColor(
      stage.dataset.gridColor || DEFAULT_GRID_COLOR
    )
  );

  restoreMapShapes(
    map
  );
}


function hexToGridColor(
  value
) {

  const normalized =
    String(value || DEFAULT_GRID_COLOR).trim();

  if (
    !/^#[0-9a-f]{6}$/i.test(normalized)
  ) {

    return 'rgba(255,255,255,0.10)';
  }

  const red =
    parseInt(normalized.slice(1, 3), 16);

  const green =
    parseInt(normalized.slice(3, 5), 16);

  const blue =
    parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red},${green},${blue},0.34)`;
}


function setFogMode(
  map,
  mode
) {

  setMapTool(
    map,
    mode
  );

  updateFogButtons(
    map
  );
}


function setMapTool(
  map,
  tool
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  if (!stage) return;

  stage.dataset.tool =
    tool;

  if (
    tool === 'draw' ||
    tool === 'erase'
  ) {

    stage.dataset.fogMode =
      tool;
  }

  updateFogButtons(
    map
  );

  updatePanButton(
    map
  );

  if (
    tool === 'pan'
  ) {

    hideBrushPreview(
      stage
    );
  }
}


function updateFogButtons(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const mode =
    stage?.dataset.tool || stage?.dataset.fogMode || 'draw';

  map
    .querySelector('.campaign-fog-btn')
    ?.classList.toggle(
      'is-active',
      mode === 'draw' ||
      mode === 'erase'
    );

  document
    .getElementById('campaignMapPopup')
    ?.querySelector('.campaign-fog-draw-btn')
    ?.classList.toggle(
      'is-active',
      mode === 'draw'
    );

  document
    .getElementById('campaignMapPopup')
    ?.querySelector('.campaign-fog-erase-btn')
    ?.classList.toggle(
      'is-active',
      mode === 'erase'
    );
}


function updatePanButton(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const active =
    stage?.dataset.tool === 'pan';

  map
    .querySelector('.campaign-pan-btn')
    ?.classList.toggle(
      'is-active',
      active
    );
}


async function changeMapImage(
  map
) {

  if (!state.workspaceHandle) return;

  const [fileHandle] =
    await window.showOpenFilePicker({
      types: [{
        description: 'Images',
        accept: {
          'image/*': [
            '.png',
            '.jpg',
            '.jpeg',
            '.webp'
          ]
        }
      }]
    });

  const imageFile =
    await fileHandle.getFile();

  const assetsDir =
    await state.workspaceHandle
      .getDirectoryHandle('assets');

  const targetHandle =
    await assetsDir.getFileHandle(
      imageFile.name,
      { create: true }
    );

  await writeFile(
    targetHandle,
    await imageFile.arrayBuffer(),
    `asset:${imageFile.name}`
  );

  fullDetailBackgroundCache.delete(
    imageFile.name
  );

  lowDetailBackgroundCache.delete(
    imageFile.name
  );

  const stage =
    map.querySelector('.campaign-map-stage');

  rememberMapAssetSettings(
    stage
  );

  stage.dataset.mapAsset =
    imageFile.name;

  restoreMapAssetSettings(
    stage
  );

  await restoreMapBackground(
    map
  );

  await restoreFogCanvas(
    map
  );
}


async function restoreMapBackground(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const background =
    map.querySelector('.campaign-map-background');

  const asset =
    stage?.dataset.mapAsset;

  if (!stage || !background || !asset) return;

  try {

    const url =
      await getImageURL(
        asset
      );

    background.style.backgroundImage =
      `url("${url}")`;

    await updateMapBackgroundQuality(
      map
    );

  } catch (error) {

    background.style.backgroundImage =
      '';
  }
}


async function updateMapBackgroundQuality(
  map
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  const background =
    map?.querySelector('.campaign-map-background');

  const asset =
    stage?.dataset.mapAsset;

  if (!stage || !background || !asset) return;

  const quality =
    shouldUseLowDetailMap(
      map
    )
      ? 'low'
      : 'full';

  const state =
    getBackgroundQualityState(
      map
    );

  if (
    state.asset === asset &&
    state.quality === quality
  ) return;

  state.asset =
    asset;

  state.quality =
    quality;

  const url =
    await getMapBackgroundURL(
      asset,
      quality
    );

  const latest =
    getBackgroundQualityState(
      map
    );

  if (
    latest.asset !== asset ||
    latest.quality !== quality
  ) return;

  background.style.backgroundImage =
    `url("${url}")`;
}


async function getMapBackgroundURL(
  asset,
  quality
) {

  if (quality !== 'low') {

    return getFullDetailBackgroundURL(
      asset
    );
  }

  try {

    return await getLowDetailBackgroundURL(
      asset
    );

  } catch (error) {

    return getFullDetailBackgroundURL(
      asset
    );
  }
}


async function getFullDetailBackgroundURL(
  asset
) {

  if (!fullDetailBackgroundCache.has(asset)) {

    fullDetailBackgroundCache.set(
      asset,
      getImageURL(
        asset
      )
    );
  }

  return fullDetailBackgroundCache.get(
    asset
  );
}


function shouldUseLowDetailMap(
  map
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) return false;

  const state =
    getBackgroundQualityState(
      map
    );

  const zoom =
    getStageView(
      stage
    ).zoom;

  if (zoom < LOW_DETAIL_ZOOM_THRESHOLD) return true;

  return state.forceLowDetail &&
    zoom < LOW_DETAIL_INTERACTION_ZOOM_THRESHOLD;
}


function getBackgroundQualityState(
  map
) {

  if (!backgroundQualityState.has(map)) {

    backgroundQualityState.set(
      map,
      {
        asset: '',
        quality: '',
        forceLowDetail: false
      }
    );
  }

  return backgroundQualityState.get(
    map
  );
}


async function getLowDetailBackgroundURL(
  asset
) {

  if (!lowDetailBackgroundCache.has(asset)) {

    lowDetailBackgroundCache.set(
      asset,
      createLowDetailBackgroundURL(
        asset
      )
    );
  }

  return lowDetailBackgroundCache.get(
    asset
  );
}


async function createLowDetailBackgroundURL(
  asset
) {

  const url =
    await getFullDetailBackgroundURL(
      asset
    );

  const image =
    await loadImage(
      url
    );

  const scale =
    Math.min(
      1,
      LOW_DETAIL_MAX_SIZE / Math.max(
        image.naturalWidth || image.width,
        image.naturalHeight || image.height,
        1
      )
    );

  if (scale >= 1) return url;

  const canvas =
    document.createElement('canvas');

  canvas.width =
    Math.max(
      1,
      Math.round((image.naturalWidth || image.width) * scale)
    );

  canvas.height =
    Math.max(
      1,
      Math.round((image.naturalHeight || image.height) * scale)
    );

  canvas
    .getContext('2d')
    .drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

  return new Promise(resolve => {

    canvas.toBlob(
      blob => {

        resolve(
          blob
            ? URL.createObjectURL(blob)
            : url
        );
      },
      'image/jpeg',
      0.72
    );
  });
}


function loadImage(
  url
) {

  return new Promise((resolve, reject) => {

    const image =
      new Image();

    image.onload =
      () => resolve(image);

    image.onerror =
      reject;

    image.src =
      url;
  });
}


function setMapInteractionQuality(
  map,
  isInteracting
) {

  const state =
    getBackgroundQualityState(
      map
    );

  state.forceLowDetail =
    Boolean(isInteracting);

  scheduleVisibleMapObjectsUpdate(
    map
  );

  updateMapBackgroundQuality(
    map
  );
}


function handleMapPointerDown(
  event
) {

  const shapeHandle =
    event.target.closest('.campaign-map-shape-handle');

  if (
    shapeHandle &&
    event.button === 0
  ) {

    startShapeResize(
      event,
      shapeHandle.closest('.campaign-map-shape')
    );

    return;
  }

  const rotateHandle =
    event.target.closest('.campaign-map-token-rotate');

  if (
    rotateHandle &&
    event.button === 0
  ) {

    startTokenRotate(
      event,
      rotateHandle.closest('.campaign-map-token')
    );

    return;
  }

  const resizeHandle =
    event.target.closest('.campaign-map-token-resize');

  if (
    resizeHandle &&
    event.button === 0
  ) {

    startTokenResize(
      event,
      resizeHandle.closest('.campaign-map-token')
    );

    return;
  }

  const token =
    event.target.closest('.campaign-map-token');

  const shape =
    event.target.closest('.campaign-map-shape');

  if (
    shape &&
    event.button === 0
  ) {

    const stage =
      shape.closest('.campaign-map-stage');

    if (
      stage?.dataset.tool === 'draw' ||
      stage?.dataset.tool === 'erase'
    ) {

      startFogDraw(
        event,
        stage
      );

      return;
    }

    startShapeDrag(
      event,
      shape
    );

    return;
  }

  if (
    token &&
    event.button === 0
  ) {

    const stage =
      token.closest('.campaign-map-stage');

    if (
      stage?.dataset.tool === 'draw' ||
      stage?.dataset.tool === 'erase'
    ) {

      startFogDraw(
        event,
        stage
      );

      return;
    }

    startTokenDrag(
      event,
      token
    );

    return;
  }

  const stage =
    event.target.closest('.campaign-map-stage');

  if (
    !stage ||
    event.button !== 0
  ) return;

  if (
    stage.dataset.tool === 'pan'
  ) {

    startMapPan(
      event,
      stage
    );

    return;
  }

  startFogDraw(
    event,
    stage
  );
}


async function handleMapInput(
  event
) {

  if (
    !event.target.closest('.campaign-map-title')
  ) return;

  syncCurrentMapTitle();
}


function syncCurrentMapTitle() {

  if (
    !isCampaignMapRecord(
      state.currentPage
    )
  ) return;

  const titleElement =
    document.querySelector(
      '#editorArea .campaign-map-title'
    );

  if (!titleElement) return;

  state.currentPage.title =
    titleElement.textContent.trim() ||
    'Новая карта';
}


async function handleMapDoubleClick(
  event
) {

  const token =
    event.target.closest('.campaign-map-token');

  const pageId =
    token?.dataset.pageId;

  if (!pageId) return;

  const page =
    state.pages.find(candidate =>
      candidate.id === pageId
    );

  if (!page) return;

  event.preventDefault();
  event.stopPropagation();

  clearDraggedToken(
    false
  );

  const editorModule =
    await import('./editor.js');

  editorModule.openPage(
    page
  );
}


function handleMapPointerOver(
  event
) {

  const shape =
    event.target.closest('.campaign-map-shape');

  if (shape) {

    scheduleTokenPopup(
      shape
    );

    return;
  }

  const token =
    event.target.closest('.campaign-map-token');

  if (!token?.dataset.pageId) return;

  highlightTreePage(
    token.dataset.pageId
  );

  scheduleTokenPopup(
    token
  );
}


function handleMapPointerOut(
  event
) {

  const shape =
    event.target.closest('.campaign-map-shape');

  if (shape) {

    scheduleTokenPopupClose();
    return;
  }

  const token =
    event.target.closest('.campaign-map-token');

  if (!token?.dataset.pageId) return;

  clearTreeHighlight(
    token.dataset.pageId
  );

  scheduleTokenPopupClose();
}


function scheduleTokenPopup(
  token
) {

  if (
    draggedToken ||
    draggedShape ||
    resizedToken ||
    rotatedToken ||
    resizedShape ||
    token.classList.contains('is-dragging') ||
    token.classList.contains('is-resizing')
  ) return;

  clearTimeout(
    tokenPopupTimer
  );

  clearTimeout(
    tokenPopupCloseTimer
  );

  tokenPopupTimer =
    setTimeout(
      () => {

        openTokenPopup(
          token
        );
      },
      TOKEN_POPUP_DELAY
    );
}


function scheduleTokenPopupClose() {

  clearTimeout(
    tokenPopupTimer
  );

  clearTimeout(
    tokenPopupCloseTimer
  );

  tokenPopupCloseTimer =
    setTimeout(
      closeTokenPopup,
      180
    );
}


function openTokenPopup(
  token
) {

  if (
    !token.isConnected ||
    draggedToken ||
    draggedShape ||
    resizedToken ||
    rotatedToken ||
    resizedShape ||
    token.classList.contains('is-dragging') ||
    token.classList.contains('is-resizing')
  ) return;

  activeTokenPopupToken =
    token;

  const popup =
    getTokenPopup();

  const isShape =
    token.classList.contains('campaign-map-shape');

  const hidden =
    token.dataset.presentationHidden === 'true';

  if (
    !isShape &&
    token.dataset.tokenType === 'creature'
  ) {

    openCreatureTokenPopup(
      token,
      popup,
      hidden
    );

    return;
  }

  popup.className =
    'campaign-token-popup hidden';

  popup.innerHTML = `
    <button class="campaign-token-popup-icon campaign-token-popup-delete" type="button" title="Удалить">×</button>
    <button class="campaign-token-popup-icon campaign-token-popup-hide" type="button" title="${hidden ? 'Показать' : 'Скрыть'}">
      ${getTokenVisibilityIcon(hidden)}
    </button>
    <button class="campaign-token-popup-icon campaign-token-popup-duplicate" type="button" title="Дублировать">x2</button>
  `;

  popup
    .querySelector('.campaign-token-popup-delete')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        if (isShape) {

          await deleteMapShape(
            token
          );

        } else {

          await deleteTokenAndPage(
            token
          );
        }
      }
    );

  popup
    .querySelector('.campaign-token-popup-hide')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await toggleMapItemPresentationVisibility(
          token
        );
      }
    );

  popup
    .querySelector('.campaign-token-popup-duplicate')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        if (isShape) {

          await duplicateMapShape(
            token
          );

        } else {

          await duplicateTokenAndPage(
            token
          );
        }
      }
    );

  popup.classList.remove(
    'hidden'
  );

  const fallbackWidth =
    token.classList.contains('campaign-map-shape')
      ? 132
      : 132;

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth,
      fallbackHeight: 48
    }
  );
}


function openCreatureTokenPopup(
  token,
  popup,
  hidden
) {

  popup.className =
    'campaign-token-popup campaign-token-popup-compact hidden';

  popup.innerHTML = `
    <button class="campaign-token-popup-text campaign-token-popup-hide" type="button">
      ${hidden ? 'Показать' : 'Скрыть'}
    </button>
    <button class="campaign-token-popup-more" type="button" title="Действия">...</button>
  `;

  popup
    .querySelector('.campaign-token-popup-hide')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await toggleMapItemPresentationVisibility(
          token
        );
      }
    );

  popup
    .querySelector('.campaign-token-popup-more')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        openCreatureTokenActionsPopup(
          token
        );
      }
    );

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 128,
      fallbackHeight: 48
    }
  );
}


function openCreatureTokenActionsPopup(
  token
) {

  const popup =
    getTokenPopup();

  popup.className =
    'campaign-token-popup campaign-token-popup-menu hidden';

  popup.innerHTML = `
    <button type="button" data-action="duplicate">Дублировать</button>
    <button type="button" data-action="hp">Изменить хиты</button>
    <button type="button" data-action="delete">Удалить</button>
    <button type="button" data-action="open">Открыть карточку</button>
  `;

  popup
    .querySelectorAll('button[data-action]')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();
          event.stopPropagation();

          const action =
            button.dataset.action;

          if (action === 'duplicate') {

            await duplicateTokenAndPage(
              token
            );
            return;
          }

          if (action === 'hp') {

            openTokenHpPopup(
              token
            );
            return;
          }

          if (action === 'delete') {

            await deleteTokenAndPage(
              token
            );
            return;
          }

          if (action === 'open') {

            await openTokenCard(
              token
            );
          }
        }
      );
    });

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 180,
      fallbackHeight: 170
    }
  );
}


function openTokenHpPopup(
  token
) {

  const page =
    getTokenPage(
      token
    );

  const health =
    ensurePageDndHealth(
      page
    );

  if (!page || !health) {

    setStatus(
      'У карточки нет блока DnD с хитами'
    );

    openCreatureTokenActionsPopup(
      token
    );

    return;
  }

  const popup =
    getTokenPopup();

  popup.className =
    'campaign-token-popup campaign-token-popup-hp hidden';

  popup.innerHTML = `
    <div class="campaign-token-hp-title">Хиты: ${health.current}/${health.max}</div>
    <label class="campaign-token-hp-temp-label">
      <span>Временные хиты</span>
      <input class="campaign-token-hp-temp" type="number" min="0" step="1" value="${health.temp || 0}">
    </label>
    <div class="campaign-token-hp-row">
      <select class="campaign-token-hp-sign" aria-label="Знак изменения хитов">
        <option value="+">+</option>
        <option value="-">-</option>
      </select>
      <input class="campaign-token-hp-value" type="number" min="0" step="1" value="1">
    </div>
    <div class="campaign-token-hp-quick-actions">
      <button class="campaign-token-hp-restore" type="button">Восстановить хиты</button>
      <button class="campaign-token-hp-kill" type="button">Убить</button>
    </div>
    <div class="campaign-token-hp-actions">
      <button class="campaign-token-hp-cancel" type="button">Отмена</button>
      <button class="campaign-token-hp-ok" type="button">Ок</button>
    </div>
  `;

  popup
    .querySelector('.campaign-token-hp-cancel')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();
        event.stopPropagation();

        openCreatureTokenActionsPopup(
          token
        );
      }
    );

  popup
    .querySelector('.campaign-token-hp-restore')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await changeTokenHp(
          token,
          page,
          {
            mode: 'restore',
            temp: getHpPopupTempValue(
              popup
            )
          }
        );
      }
    );

  popup
    .querySelector('.campaign-token-hp-kill')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        await changeTokenHp(
          token,
          page,
          {
            mode: 'kill',
            temp: getHpPopupTempValue(
              popup
            )
          }
        );
      }
    );

  popup
    .querySelector('.campaign-token-hp-ok')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();
        event.stopPropagation();

        const sign =
          popup.querySelector('.campaign-token-hp-sign').value;

        const value =
          Number(
            popup.querySelector('.campaign-token-hp-value').value || 0
          );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) return;

        await changeTokenHp(
          token,
          page,
          {
            delta: sign === '-' ? -value : value,
            temp: getHpPopupTempValue(
              popup
            )
          }
        );
      }
    );

  popup.classList.remove(
    'hidden'
  );

  positionPopupNearAnchor(
    popup,
    token,
    {
      gap: 10,
      fallbackWidth: 250,
      fallbackHeight: 238
    }
  );

  popup
    .querySelector('.campaign-token-hp-value')
    .focus();
}


function getHpPopupTempValue(
  popup
) {

  const value =
    Number(
      popup.querySelector('.campaign-token-hp-temp')?.value || 0
    );

  return Number.isFinite(value)
    ? Math.max(
      0,
      Math.floor(value)
    )
    : 0;
}


function getTokenPopup() {

  let popup =
    document.getElementById('campaignTokenPopup');

  if (popup) return popup;

  popup =
    document.createElement('div');

  popup.id =
    'campaignTokenPopup';

  popup.className =
    'campaign-token-popup hidden';

  markRuntime(
    popup
  );

  popup.addEventListener(
    'pointerenter',
    () => {

      clearTimeout(
        tokenPopupCloseTimer
      );
    }
  );

  popup.addEventListener(
    'pointerleave',
    scheduleTokenPopupClose
  );

  document.body.appendChild(
    popup
  );

  return popup;
}


function getTokenVisibilityIcon(
  hidden
) {

  if (!hidden) {

    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"></path>
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M4 4l16 16"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;
}


function closeTokenPopup() {

  const popup =
    document.getElementById('campaignTokenPopup');

  popup?.classList.add(
    'hidden'
  );

  activeTokenPopupToken =
    null;
}


async function deleteTokenAndPage(
  token
) {

  const pageId =
    token.dataset.pageId;

  const page =
    state.pages.find(candidate =>
      candidate.id === pageId
    );

  closeTokenPopup();

  if (page) {

    try {

      const canWrite =
        await ensureWorkspaceWritePermission();

      if (!canWrite) {

        throw new Error(
          'Нет прав на изменение workspace'
        );
      }

      await deletePageBranch(
        page
      );

    } catch (error) {

      console.error(
        'Не удалось удалить токен и дочернюю карточку:',
        error
      );

      setStatus(
        'Не удалось удалить дочернюю карточку'
      );

      return;
    }
  }

  token.remove();
  renderTree();
  await saveAndSync();
}


function getTokenPage(
  token
) {

  return state.pages.find(candidate =>
    candidate.id === token?.dataset.pageId
  );
}


async function openTokenCard(
  token
) {

  const page =
    getTokenPage(
      token
    );

  if (!page) return;

  closeTokenPopup();
  clearDraggedToken(
    false
  );

  const editorModule =
    await import('./editor.js');

  editorModule.openPage(
    page
  );
}


async function changeTokenHp(
  token,
  page,
  options
) {

  const canWrite =
    await ensureWorkspaceWritePermission();

  if (!canWrite) {

    setStatus(
      'Нет прав на изменение workspace'
    );

    return;
  }

  const result =
    updatePageDndHealth(
      page,
      options
    );

  if (!result) {

    setStatus(
      'У карточки нет блока DnD с хитами'
    );

    return;
  }

  await writePageContent(
    page,
    page.content
  );

  applyTokenHealthState(
    token
  );

  closeTokenPopup();
  await saveAndSync();

  setStatus(
    `Хиты изменены: ${result.current}/${result.max}`
  );
}


async function duplicateTokenAndPage(
  token
) {

  const tokenType =
    getNormalizedTokenType(
      token
    );

  const page =
    state.pages.find(candidate =>
      candidate.id === token.dataset.pageId
    );

  if (!page) return;

  refreshPageMetaFromContent(
    page
  );

  if (
    isCampaignMapRecord(
      page
    )
  ) {

    console.warn(
      'Дублирование токена отменено: дочерняя карточка распознана как карта.',
      page
    );

    setStatus(
      'Нельзя дублировать: карточка токена повреждена и распознана как карта'
    );

    closeTokenPopup();
    return;
  }

  closeTokenPopup();

  try {

    const canWrite =
      await ensureWorkspaceWritePermission();

    if (!canWrite) {

      throw new Error(
        'Нет прав на изменение workspace'
      );
    }

    const duplicate =
      await duplicatePageAsChild(
        page,
        page.parent
      );

    await normalizeDuplicatedTokenPage(
      duplicate,
      tokenType
    );

    const map =
      token.closest('.campaign-map-document');

    await addMapTokenFromExisting(
      map,
      token,
      duplicate
    );

    renderTree();
    await saveAndSync();

  } catch (error) {

    console.error(
      'Не удалось дублировать токен:',
      error
    );

    setStatus(
      'Не удалось дублировать токен'
    );
  }
}


function refreshPageMetaFromContent(
  page
) {

  const parsed =
    parseMarkdown(
      page.content || ''
    );

  page.template =
    parsed.template;

  page.type =
    parsed.type;

  page.tags =
    parsed.tags;

  page.aliases =
    parsed.aliases;
}


async function addMapTokenFromExisting(
  map,
  sourceToken,
  page
) {

  const layer =
    map?.querySelector('.campaign-map-object-layer');

  if (!layer || !page) return;

  const tokenType =
    getNormalizedTokenType(
      sourceToken
    );

  const token =
    document.createElement('button');

  token.className =
    `campaign-map-token is-${tokenType}`;

  token.type =
    'button';

  token.dataset.tokenId =
    crypto.randomUUID();

  token.dataset.tokenType =
    tokenType;

  token.dataset.pageId =
    page.id;

  token.dataset.name =
    page.title || sourceToken.dataset.name || '';

  token.dataset.x =
    String(
      clamp(
        Number(sourceToken.dataset.x || 50) + 2,
        0,
        100
      )
    );

  token.dataset.y =
    String(
      clamp(
        Number(sourceToken.dataset.y || 50) + 2,
        0,
        100
      )
    );

  token.dataset.size =
    sourceToken.dataset.size || '1';

  token.dataset.rotation =
    sourceToken.dataset.rotation || '0';

  if (sourceToken.dataset.imageAsset) {

    token.dataset.imageAsset =
      sourceToken.dataset.imageAsset;
  }

  setTokenFallbackText(
    token,
    token.dataset.tokenType
  );

  layer.appendChild(
    token
  );

  positionToken(
    token
  );

  applyTokenSize(
    token
  );

  applyTokenRotation(
    token
  );

  applyTokenHealthState(
    token
  );

  await restoreTokenImage(
    token
  );
}


function getNormalizedTokenType(
  token
) {

  return token?.dataset.tokenType === 'object'
    ? 'object'
    : 'creature';
}


async function normalizeDuplicatedTokenPage(
  page,
  tokenType
) {

  if (!page) return;

  page.template =
    'card';

  page.type =
    tokenType;

  page.tags =
    [
      ...new Set([
        'card',
        ...(page.tags || []).filter(tag =>
          tag !== 'campaign-map' &&
          tag !== 'campaignmap'
        ),
        tokenType
      ])
    ];

  page.content =
    page.content.replace(
      /^---[\s\S]*?---/,
      `---
id: ${page.id}
parent: ${page.parent ?? 'null'}
order: ${page.order ?? Date.now()}
tags: [${page.tags.join(', ')}]
template: card
type: ${tokenType}
aliases: [${(page.aliases || []).join(', ')}]
---`
    );

  await writePageContent(
    page,
    page.content
  );
}


async function ensureWorkspaceWritePermission() {

  if (!state.workspaceHandle) return false;

  if (!state.workspaceHandle.queryPermission) return true;

  const currentPermission =
    await state.workspaceHandle.queryPermission({
      mode: 'readwrite'
    });

  if (currentPermission === 'granted') return true;

  if (!state.workspaceHandle.requestPermission) return false;

  const requestedPermission =
    await state.workspaceHandle.requestPermission({
      mode: 'readwrite'
    });

  return requestedPermission === 'granted';
}


async function toggleMapItemPresentationVisibility(
  item
) {

  const hidden =
    item.dataset.presentationHidden === 'true';

  item.dataset.presentationHidden =
    hidden
      ? 'false'
      : 'true';

  item.classList.toggle(
    'is-presentation-hidden',
    !hidden
  );

  openTokenPopup(
    item
  );

  await saveAndSync();
}


async function deleteMapShape(
  shape
) {

  closeTokenPopup();
  shape.remove();
  await saveAndSync();
}


async function duplicateMapShape(
  shape
) {

  const clone =
    shape.cloneNode(false);

  clone.className =
    'campaign-map-shape';

  [
    'shapeType',
    'x',
    'y',
    'w',
    'h',
    'points',
    'presentationHidden'
  ].forEach(key => {

    if (shape.dataset[key] !== undefined) {

      clone.dataset[key] =
        shape.dataset[key];
    }
  });

  clone.dataset.x =
    String(
      Number(shape.dataset.x || 0) + 24
    );

  clone.dataset.y =
    String(
      Number(shape.dataset.y || 0) + 24
    );

  clone.dataset.shapeId =
    crypto.randomUUID();

  shape.after(
    clone
  );

  renderMapShape(
    clone
  );

  selectMapShape(
    clone
  );

  closeTokenPopup();
  await saveAndSync();
}


function handleBrushPreviewMove(
  event
) {

  const stage =
    event.target.closest('.campaign-map-stage');

  if (!stage) {

    hideAllBrushPreviews();
    return;
  }

  if (
    stage.dataset.tool !== 'draw' &&
    stage.dataset.tool !== 'erase'
  ) {

    hideBrushPreview(
      stage
    );

    return;
  }

  updateBrushPreview(
    event,
    stage
  );
}


function updateBrushPreview(
  event,
  stage
) {

  const preview =
    ensureBrushPreview(
      stage
    );

  const rect =
    stage.getBoundingClientRect();

  const view =
    getStageView(
      stage
    );

  const diameter =
    Number(stage.dataset.brushSize || DEFAULT_BRUSH_SIZE) *
    view.zoom *
    2;

  preview.style.width =
    `${diameter}px`;

  preview.style.height =
    `${diameter}px`;

  preview.style.left =
    `${event.clientX - rect.left}px`;

  preview.style.top =
    `${event.clientY - rect.top}px`;

  preview.classList.remove(
    'hidden'
  );
}


function hideBrushPreview(
  stage
) {

  stage
    ?.querySelector('.campaign-brush-preview')
    ?.classList.add('hidden');
}


function hideAllBrushPreviews() {

  document
    .querySelectorAll('.campaign-brush-preview')
    .forEach(preview => {

      preview.classList.add(
        'hidden'
      );
    });
}


function startTokenDrag(
  event,
  token
) {

  event.preventDefault();
  closeTokenPopup();
  clearTimeout(
    tokenPopupTimer
  );

  draggedToken = {
    token,
    stage: token.closest('.campaign-map-stage'),
    map: token.closest('.campaign-map-document'),
    startX: event.clientX,
    startY: event.clientY,
    startWorldX: Number(token.dataset.x || 50) / 100 * WORLD_WIDTH,
    startWorldY: Number(token.dataset.y || 50) / 100 * WORLD_HEIGHT,
    measure: null,
    moved: false
  };

  setMapInteractionQuality(
    draggedToken.map,
    true
  );

  token.classList.add(
    'is-dragging'
  );
}


function handleDocumentPointerMove(
  event
) {

  if (rotatedToken) {

    rotateTokenToPointer(
      event
    );
  }

  if (resizedToken) {

    resizeTokenToPointer(
      event
    );
  }

  if (resizedShape) {

    resizeShapeToPointer(
      event
    );
  }

  if (draggedShape) {

    moveShapeToPointer(
      event
    );
  }

  if (draggedToken) {

    moveTokenToPointer(
      event
    );
  }

  if (fogDrawing) {

    drawFogAtPointer(
      event
    );
  }

  if (panningMap) {

    moveMapPan(
      event
    );
  }
}


async function handleDocumentPointerUp() {

  if (rotatedToken) {

    const map =
      rotatedToken.map;

    const shouldSave =
      clearRotatedToken(
        true
      );

    setMapInteractionQuality(
      map,
      false
    );

    if (shouldSave) {

      await saveAndSync();
    }
  }

  if (resizedToken) {

    const map =
      resizedToken.token.closest('.campaign-map-document');

    const shouldSave =
      clearResizedToken(
        true
      );

    setMapInteractionQuality(
      map,
      false
    );

    if (shouldSave) {

      await saveAndSync();
    }
  }

  if (draggedToken) {

    const map =
      draggedToken.map;

    const shouldSave =
      clearDraggedToken(
        true
      );

    setMapInteractionQuality(
      map,
      false
    );

    if (shouldSave) {

      await saveAndSync();
    }
  }

  if (resizedShape) {

    const map =
      resizedShape.map;

    const shouldSave =
      clearResizedShape(
        true
      );

    setMapInteractionQuality(
      map,
      false
    );

    if (shouldSave) {

      await saveAndSync();
    }
  }

  if (draggedShape) {

    const map =
      draggedShape.map;

    const shouldSave =
      clearDraggedShape(
        true
      );

    setMapInteractionQuality(
      map,
      false
    );

    if (shouldSave) {

      await saveAndSync();
    }
  }

  if (fogDrawing) {

    persistFogCanvas(
      fogDrawing.map
    );

    fogDrawing =
      null;

    await saveAndSync();
  }

  if (panningMap) {

    const map =
      panningMap.map;

    panningMap.stage.classList.remove(
      'is-panning'
    );

    panningMap =
      null;

    setMapInteractionQuality(
      map,
      false
    );

    await saveAndSync();
  }
}


function startTokenResize(
  event,
  token
) {

  if (!token) return;

  const stage =
    token.closest('.campaign-map-stage');

  if (
    stage?.dataset.tool === 'draw' ||
    stage?.dataset.tool === 'erase'
  ) return;

  event.preventDefault();
  event.stopPropagation();

  closeTokenPopup();

  selectMapToken(
    token
  );

  const rect =
    token.getBoundingClientRect();

  resizedToken = {
    token,
    stage,
    corner: event.target.dataset.corner || 'se',
    startX: event.clientX,
    startY: event.clientY,
    startSize: Math.max(
      0.5,
      Number(token.dataset.size || 1)
    ),
    startPixelSize: Math.max(
      rect.width,
      rect.height,
      1
    ),
    moved: false
  };

  setMapInteractionQuality(
    token.closest('.campaign-map-document'),
    true
  );

  token.classList.add(
    'is-resizing'
  );
}


function startTokenRotate(
  event,
  token
) {

  if (!token) return;

  const stage =
    token.closest('.campaign-map-stage');

  if (
    stage?.dataset.tool === 'draw' ||
    stage?.dataset.tool === 'erase'
  ) return;

  event.preventDefault();
  event.stopPropagation();

  closeTokenPopup();

  selectMapToken(
    token
  );

  const rect =
    token.getBoundingClientRect();

  const centerX =
    rect.left + rect.width / 2;

  const centerY =
    rect.top + rect.height / 2;

  rotatedToken = {
    token,
    map: token.closest('.campaign-map-document'),
    centerX,
    centerY,
    startAngle: getPointerAngle(
      event,
      centerX,
      centerY
    ),
    startRotation: Number(token.dataset.rotation || 0),
    moved: false
  };

  setMapInteractionQuality(
    rotatedToken.map,
    true
  );

  token.classList.add(
    'is-rotating'
  );
}


function rotateTokenToPointer(
  event
) {

  const angle =
    getPointerAngle(
      event,
      rotatedToken.centerX,
      rotatedToken.centerY
    );

  const rotation =
    normalizeDegrees(
      rotatedToken.startRotation +
      angle -
      rotatedToken.startAngle
    );

  if (
    !rotatedToken.moved &&
    Math.abs(rotation - rotatedToken.startRotation) < 1
  ) return;

  rotatedToken.moved =
    true;

  rotatedToken.token.dataset.rotation =
    String(rotation);

  applyTokenRotation(
    rotatedToken.token
  );

  scheduleLivePresentationSync(
    rotatedToken.token
  );
}


function clearRotatedToken(
  keepMovedState
) {

  if (!rotatedToken) return false;

  const moved =
    rotatedToken.moved;

  rotatedToken.token.classList.remove(
    'is-rotating'
  );

  rotatedToken =
    null;

  return keepMovedState && moved;
}


function resizeTokenToPointer(
  event
) {

  const distance =
    Math.hypot(
      event.clientX - resizedToken.startX,
      event.clientY - resizedToken.startY
    );

  if (
    !resizedToken.moved &&
    distance < TOKEN_RESIZE_THRESHOLD
  ) return;

  resizedToken.moved =
    true;

  const delta =
    getResizeDelta(
      event
    );

  const nextSize =
    clamp(
      resizedToken.startSize *
      ((resizedToken.startPixelSize + delta) / resizedToken.startPixelSize),
      0.5,
      8
    );

  resizedToken.token.dataset.size =
    nextSize.toFixed(3);

  applyTokenSize(
    resizedToken.token
  );

  scheduleLivePresentationSync(
    resizedToken.token
  );
}


function getResizeDelta(
  event
) {

  const dx =
    event.clientX - resizedToken.startX;

  const dy =
    event.clientY - resizedToken.startY;

  switch (resizedToken.corner) {

    case 'nw':
      return Math.max(
        -dx,
        -dy
      );

    case 'ne':
      return Math.max(
        dx,
        -dy
      );

    case 'sw':
      return Math.max(
        -dx,
        dy
      );

    default:
      return Math.max(
        dx,
        dy
      );
  }
}


function clearResizedToken(
  keepMovedState
) {

  if (!resizedToken) return false;

  const moved =
    resizedToken.moved;

  resizedToken.token.classList.remove(
    'is-resizing'
  );

  resizedToken =
    null;

  return keepMovedState && moved;
}


function startShapeResize(
  event,
  shape
) {

  if (!shape) return;

  const stage =
    shape.closest('.campaign-map-stage');

  if (
    stage?.dataset.tool === 'draw' ||
    stage?.dataset.tool === 'erase'
  ) return;

  event.preventDefault();
  event.stopPropagation();

  selectMapShape(
    shape
  );

  resizedShape = {
    shape,
    stage,
    map: shape.closest('.campaign-map-document'),
    corner: event.target.dataset.corner || '',
    point: event.target.dataset.point || '',
    startX: event.clientX,
    startY: event.clientY,
    startLeft: Number(shape.dataset.x || 0),
    startTop: Number(shape.dataset.y || 0),
    startWidth: Number(shape.dataset.w || DEFAULT_SHAPE_SIZE),
    startHeight: Number(shape.dataset.h || DEFAULT_SHAPE_SIZE),
    startPoints: getTrianglePoints(shape),
    moved: false
  };

  setMapInteractionQuality(
    resizedShape.map,
    true
  );

  shape.classList.add(
    'is-resizing'
  );
}


function resizeShapeToPointer(
  event
) {

  const delta =
    getWorldDeltaFromPointer(
      event,
      resizedShape
    );

  const distance =
    Math.hypot(
      delta.x,
      delta.y
    );

  if (
    !resizedShape.moved &&
    distance < SHAPE_HANDLE_THRESHOLD
  ) return;

  resizedShape.moved =
    true;

  if (resizedShape.point !== '') {

    resizeTrianglePoint(
      delta
    );

  } else {

    resizeShapeBox(
      delta
    );
  }

  renderMapShape(
    resizedShape.shape
  );

  resizedShape.shape.classList.add(
    'is-selected',
    'is-resizing'
  );

  scheduleLivePresentationSync(
    resizedShape.shape
  );
}


function resizeShapeBox(
  delta
) {

  const {
    shape,
    corner,
    startLeft,
    startTop,
    startWidth,
    startHeight
  } = resizedShape;

  let x =
    startLeft;

  let y =
    startTop;

  let width =
    startWidth;

  let height =
    startHeight;

  if (corner.includes('e')) width =
    startWidth + delta.x;

  if (corner.includes('s')) height =
    startHeight + delta.y;

  if (corner.includes('w')) {

    x =
      startLeft + delta.x;

    width =
      startWidth - delta.x;
  }

  if (corner.includes('n')) {

    y =
      startTop + delta.y;

    height =
      startHeight - delta.y;
  }

  width =
    Math.max(
      24,
      width
    );

  height =
    Math.max(
      24,
      height
    );

  if (
    shape.dataset.shapeType === 'circle'
  ) {

    const size =
      Math.max(
        width,
        height
      );

    width =
      size;

    height =
      size;
  }

  shape.dataset.x =
    String(Math.round(x));

  shape.dataset.y =
    String(Math.round(y));

  shape.dataset.w =
    String(Math.round(width));

  shape.dataset.h =
    String(Math.round(height));
}


function resizeTrianglePoint(
  delta
) {

  const {
    shape,
    point,
    startWidth,
    startHeight,
    startPoints
  } = resizedShape;

  const index =
    Number(point);

  const points =
    startPoints.map(item => ({ ...item }));

  if (!points[index]) return;

  points[index].x =
    points[index].x + (delta.x / startWidth) * 100;

  points[index].y =
    points[index].y + (delta.y / startHeight) * 100;

  setTrianglePoints(
    shape,
    points
  );
}


function getWorldDeltaFromPointer(
  event,
  action
) {

  const view =
    getStageView(
      action.stage
    );

  return {
    x: (event.clientX - action.startX) / view.zoom,
    y: (event.clientY - action.startY) / view.zoom
  };
}


function clearResizedShape(
  keepMovedState
) {

  if (!resizedShape) return false;

  const moved =
    resizedShape.moved;

  resizedShape.shape.classList.remove(
    'is-resizing'
  );

  resizedShape =
    null;

  return keepMovedState && moved;
}


function startShapeDrag(
  event,
  shape
) {

  if (!shape) return;

  event.preventDefault();
  event.stopPropagation();

  closeTokenPopup();
  clearTimeout(
    tokenPopupTimer
  );

  selectMapShape(
    shape
  );

  draggedShape = {
    shape,
    stage: shape.closest('.campaign-map-stage'),
    map: shape.closest('.campaign-map-document'),
    startX: event.clientX,
    startY: event.clientY,
    startLeft: Number(shape.dataset.x || 0),
    startTop: Number(shape.dataset.y || 0),
    moved: false
  };

  setMapInteractionQuality(
    draggedShape.map,
    true
  );

  shape.classList.add(
    'is-dragging'
  );
}


function moveShapeToPointer(
  event
) {

  const delta =
    getWorldDeltaFromPointer(
      event,
      draggedShape
    );

  const distance =
    Math.hypot(
      delta.x,
      delta.y
    );

  if (
    !draggedShape.moved &&
    distance < TOKEN_DRAG_THRESHOLD
  ) return;

  draggedShape.moved =
    true;

  draggedShape.shape.dataset.x =
    String(
      Math.round(
        draggedShape.startLeft + delta.x
      )
    );

  draggedShape.shape.dataset.y =
    String(
      Math.round(
        draggedShape.startTop + delta.y
      )
    );

  applyShapeGeometry(
    draggedShape.shape
  );

  scheduleLivePresentationSync(
    draggedShape.shape
  );
}


function clearDraggedShape(
  keepMovedState
) {

  if (!draggedShape) return false;

  const moved =
    draggedShape.moved;

  draggedShape.shape.classList.remove(
    'is-dragging'
  );

  draggedShape =
    null;

  return keepMovedState && moved;
}


function clearDraggedToken(
  keepMovedState
) {

  if (!draggedToken) return false;

  const moved =
    draggedToken.moved;

  draggedToken.token.classList.remove(
    'is-dragging'
  );

  removeDragMeasure(
    draggedToken
  );

  draggedToken =
    null;

  return keepMovedState && moved;
}


function moveTokenToPointer(
  event
) {

  const {
    token,
    stage,
    startX,
    startY
  } = draggedToken;

  const distance =
    Math.hypot(
      event.clientX - startX,
      event.clientY - startY
    );

  if (
    !draggedToken.moved &&
    distance < TOKEN_DRAG_THRESHOLD
  ) {

    return;
  }

  draggedToken.moved =
    true;

  const rect =
    stage.getBoundingClientRect();

  const point =
    getWorldPointFromEvent(
      event,
      stage
    );

  const x =
    clamp(
      (point.x / WORLD_WIDTH) * 100,
      0,
      100
    );

  const y =
    clamp(
      (point.y / WORLD_HEIGHT) * 100,
      0,
      100
    );

  token.dataset.x =
    x.toFixed(3);

  token.dataset.y =
    y.toFixed(3);

  positionToken(
    token
  );

  updateDragMeasure(
    draggedToken,
    point
  );

  scheduleLivePresentationSync(
    token,
    stage
  );
}


function updateDragMeasure(
  drag,
  point
) {

  if (drag.token?.dataset.presentationHidden === 'true') {

    removeDragMeasure(
      drag
    );

    drag.measure =
      null;

    return;
  }

  const cells =
    getDragDistanceCells(
      drag,
      point
    );

  if (cells <= 0) {

    removeDragMeasure(
      drag
    );

    drag.measure =
      null;

    return;
  }

  const viewport =
    drag.stage.querySelector('.campaign-map-viewport');

  if (!viewport) return;

  if (!drag.measure) {

    drag.measure =
      document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
      );

    drag.measure.classList.add(
      'campaign-map-drag-measure'
    );

    drag.measure.setAttribute(
      'viewBox',
      `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`
    );

    drag.measure.innerHTML = `
      <defs>
        <marker id="campaign-drag-arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
          <path d="M2,2 L10,6 L2,10 Z"></path>
        </marker>
      </defs>
      <line></line>
      <text></text>
    `;

    viewport.appendChild(
      drag.measure
    );
  }

  const line =
    drag.measure.querySelector('line');

  const label =
    drag.measure.querySelector('text');

  line.setAttribute(
    'x1',
    String(drag.startWorldX)
  );

  line.setAttribute(
    'y1',
    String(drag.startWorldY)
  );

  line.setAttribute(
    'x2',
    String(point.x)
  );

  line.setAttribute(
    'y2',
    String(point.y)
  );

  label.setAttribute(
    'x',
    String((drag.startWorldX + point.x) / 2)
  );

  label.setAttribute(
    'y',
    String((drag.startWorldY + point.y) / 2 - 12)
  );

  label.textContent =
    `${cells * 5} ft`;
}


function removeDragMeasure(
  drag
) {

  drag?.measure?.remove();
}


function getDragDistanceLabel(
  drag,
  point
) {

  return `${getDragDistanceCells(drag, point) * 5} ft`;
}


function getDragDistanceCells(
  drag,
  point
) {

  const gridSize =
    Math.max(
      1,
      Number(drag.stage.dataset.gridSize || DEFAULT_GRID_SIZE)
    );

  const cells =
    Math.round(
      Math.max(
        Math.abs(point.x - drag.startWorldX),
        Math.abs(point.y - drag.startWorldY)
      ) / gridSize
    );

  return cells;
}


function startMapPan(
  event,
  stage
) {

  event.preventDefault();

  panningMap = {
    map: stage.closest('.campaign-map-document'),
    stage,
    lastX: event.clientX,
    lastY: event.clientY
  };

  setMapInteractionQuality(
    panningMap.map,
    true
  );

  stage.classList.add(
    'is-panning'
  );
}


function moveMapPan(
  event
) {

  const {
    map,
    stage
  } = panningMap;

  const view =
    getStageView(
      stage
    );

  setStageView(
    stage,
    {
      ...view,
      x: view.x + event.clientX - panningMap.lastX,
      y: view.y + event.clientY - panningMap.lastY
    }
  );

  panningMap.lastX =
    event.clientX;

  panningMap.lastY =
    event.clientY;

  stage.classList.remove(
    'is-panning'
  );

  stage.classList.add(
    'is-panning'
  );

  applyViewportTransform(
    map
  );
}


function handleMapWheel(
  event
) {

  const stage =
    event.target.closest('.campaign-map-stage');

  if (!stage) return;

  event.preventDefault();

  const map =
    stage.closest('.campaign-map-document');

  const rect =
    stage.getBoundingClientRect();

  zoomMap(
    map,
    event.deltaY < 0 ? 1.08 : 1 / 1.08,
    {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  );
}


function startFogDraw(
  event,
  stage
) {

  const map =
    stage.closest('.campaign-map-document');

  const canvas =
    stage.querySelector('.campaign-map-fog-canvas');

  if (!map || !canvas) return;

  ensureCanvasSize(
    canvas
  );

  fogDrawing = {
    map,
    stage,
    canvas,
    context: canvas.getContext('2d'),
    mode: stage.dataset.fogMode || 'draw'
  };

  drawFogAtPointer(
    event
  );
}


function drawFogAtPointer(
  event
) {

  const {
    stage,
    context,
    mode
  } = fogDrawing;

  const point =
    getWorldPointFromEvent(
      event,
      stage
    );

  context.save();

  context.globalCompositeOperation =
    mode === 'erase'
      ? 'destination-out'
      : 'source-over';

  context.fillStyle =
    FOG_PAINT_COLOR;

  context.beginPath();
  context.arc(
    point.x,
    point.y,
    Number(stage.dataset.brushSize || DEFAULT_BRUSH_SIZE),
    0,
    Math.PI * 2
  );
  context.fill();
  context.restore();

  stage.dataset.fogVersion =
    String(
      Number(stage.dataset.fogVersion || 0) + 1
    );

  schedulePresentationSync();
}


function getWorldPointFromEvent(
  event,
  stage
) {

  const rect =
    stage.getBoundingClientRect();

  const view =
    getStageView(
      stage
    );

  return {
    x: clamp(
      (event.clientX - rect.left - view.x) / view.zoom,
      0,
      WORLD_WIDTH
    ),
    y: clamp(
      (event.clientY - rect.top - view.y) / view.zoom,
      0,
      WORLD_HEIGHT
    )
  };
}


function highlightTreePage(
  pageId
) {

  document
    .querySelector(`.tree-item[data-page-id="${pageId}"]`)
    ?.classList.add(
      'is-linked-token'
    );
}


function clearTreeHighlight(
  pageId
) {

  document
    .querySelector(`.tree-item[data-page-id="${pageId}"]`)
    ?.classList.remove(
      'is-linked-token'
    );
}


function normalizeText(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


function scheduleLivePresentationSync(
  item,
  stage = null
) {

  if (item) {

    pendingPresentationItems.add(
      item
    );
  }

  if (stage) {

    pendingPresentationMeasureStages.add(
      stage
    );
  }

  if (livePresentationFrame) return;

  livePresentationFrame =
    requestAnimationFrame(
      () => {

        livePresentationFrame =
          null;

        const items =
          [...pendingPresentationItems];

        const stages =
          [...pendingPresentationMeasureStages];

        pendingPresentationItems.clear();
        pendingPresentationMeasureStages.clear();

        items.forEach(nextItem => {

          syncPresentationItem(
            nextItem
          );
        });

        stages.forEach(nextStage => {

          syncPresentationDragMeasure(
            nextStage
          );
        });
      }
    );
}


function schedulePresentationSync() {

  const now =
    performance.now();

  const wait =
    Math.max(
      0,
      PRESENTATION_SYNC_INTERVAL - (now - lastPresentationSyncAt)
    );

  if (wait > 0) {

    if (presentationSyncTimeout) return;

    presentationSyncTimeout =
      setTimeout(
        () => {

          presentationSyncTimeout =
            null;

          schedulePresentationSync();
        },
        wait
      );

    return;
  }

  if (presentationSyncFrame) return;

  presentationSyncFrame =
    requestAnimationFrame(
      () => {

        presentationSyncFrame =
          null;

        lastPresentationSyncAt =
          performance.now();

        syncPresentation();
      }
    );
}


async function saveAndSync() {

  const openMap =
    document.querySelector(
      '#editorArea .campaign-map-document'
    );

  if (
    !openMap ||
    !isCampaignMapRecord(
      state.currentPage
    )
  ) {

    syncPresentation();
    return;
  }

  if (saveCurrentPageCallback) {

    syncCurrentMapTitle();

    await saveCurrentPageCallback();
  }

  syncPresentation();
}


function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


function getPointerAngle(
  event,
  centerX,
  centerY
) {

  return Math.atan2(
    event.clientY - centerY,
    event.clientX - centerX
  ) * 180 / Math.PI;
}


function normalizeDegrees(
  value
) {

  return Math.round(
    ((value % 360) + 360) % 360
  );
}
