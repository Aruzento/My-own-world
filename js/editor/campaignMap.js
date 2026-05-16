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
  duplicatePageAsChild
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
  markRuntime,
  serializePersistentEditorHTML
} from './blocks/blockContract.js';


let saveCurrentPageCallback = null;
let presentationWindow = null;
let presentationState = {
  x: 0,
  y: 0,
  zoom: 1,
  isPanning: false,
  lastX: 0,
  lastY: 0
};
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

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1200;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3;
const DEFAULT_GRID_SIZE = 48;
const DEFAULT_BRUSH_SIZE = 34;
const TOKEN_DRAG_THRESHOLD = 4;
const TOKEN_POPUP_DELAY = 420;
const TOKEN_RESIZE_THRESHOLD = 2;
const DEFAULT_SHAPE_SIZE = 192;
const SHAPE_HANDLE_THRESHOLD = 2;
const FOG_PAINT_COLOR = 'rgba(0,0,0,1)';


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


export function isCampaignMapPage(
  parsed
) {

  return parsed.template === 'campaignMap' ||
    parsed.type === 'campaignMap';
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

  syncPresentation();
}


export function serializeCampaignMapHTML(
  editor
) {

  const map =
    editor.querySelector('.campaign-map-document');

  if (map) {

    persistFogCanvas(
      map
    );
  }

  return serializePersistentEditorHTML(
    editor
  );
}


export function syncCampaignMapPresentation() {

  syncPresentation();
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
      <button class="campaign-toggle-grid-btn" type="button" title="Включить сетку">▦</button>
      <button class="campaign-grid-size-btn" type="button" title="Размер сетки">↔</button>
      <button class="campaign-change-map-btn" type="button" title="Сменить карту">🖼</button>
      <button class="campaign-open-presentation-btn" type="button" title="Презентация">▣</button>
    </div>

    <div class="campaign-map-control-group">
      <button class="campaign-shapes-btn" type="button" title="Фигуры">◇</button>
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


function isCampaignMapRecord(
  page
) {

  return page?.template === 'campaignMap' ||
    page?.type === 'campaignMap' ||
    (page?.tags || []).includes('campaign-map');
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

  const writable =
    await page.handle.createWritable();

  await writable.write(
    content
  );

  await writable.close();

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
    event.target.closest('.campaign-toggle-grid-btn')
  ) {

    toggleGrid(
      map
    );

    await saveAndSync();
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
    event.target.closest('.campaign-grid-size-btn')
  ) {

    if (
      toggleMapPopupForAnchor(
        event.target.closest('.campaign-grid-size-btn'),
        'grid-size'
      )
    ) return;

    openGridSizePopup(
      map,
      event.target.closest('.campaign-grid-size-btn')
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

        await addSelectedPagesToMap(
          map,
          kind,
          selectedIds
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


async function addSelectedPagesToMap(
  map,
  kind,
  selectedIds
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

    const duplicate =
      await duplicatePageAsChild(
        source,
        bucket.id
      );

    duplicates.push(
      duplicate
    );
  }

  for (const page of duplicates) {

    await addMapToken(
      map,
      kind,
      page
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


function openGridSizePopup(
  map,
  anchor
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const popup =
    getMapPopup();

  popup.innerHTML = `
    <div class="campaign-map-popup-title">Размер сетки</div>
    <input class="campaign-map-range" type="range" min="24" max="96" step="2" value="${stage.dataset.gridSize || DEFAULT_GRID_SIZE}">
  `;

  popup
    .querySelector('.campaign-map-range')
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

  showMapPopup(
    popup,
    anchor,
    'grid-size'
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
        <span>□</span>
        <strong>Квадрат</strong>
      </button>
      <button class="campaign-shape-option" type="button" data-shape="triangle">
        <span>△</span>
        <strong>Треугольник</strong>
      </button>
      <button class="campaign-shape-option" type="button" data-shape="circle">
        <span>○</span>
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
  page = null
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

  token.dataset.x =
    '50';

  token.dataset.y =
    '50';

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
        state.pages.find(candidate =>
          candidate.id === token.dataset.pageId
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
      token
    );

    await restoreTokenImage(
      token
    );
  }
}


function applyTokenHealthState(
  token
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
    state.pages.find(candidate =>
      candidate.id === token.dataset.pageId
    );

  const health =
    getPageDndHealth(
      page
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


function getPageDndHealth(
  page
) {

  if (!page?.content) return null;

  const body =
    parsePageBody(
      page
    );

  const block =
    body.querySelector(
      '.dnd-stats-block'
    );

  if (!block) return null;

  const current =
    readNumberFromInput(
      block.querySelector('.dnd-current-hp')
    );

  const max =
    readNumberFromInput(
      block.querySelector('.dnd-max-hp')
    );

  if (
    current === null ||
    max === null ||
    max <= 0
  ) return null;

  return {
    current,
    max
  };
}


function readNumberFromInput(
  input
) {

  if (!input) return null;

  const raw =
    input.getAttribute('value') ||
    input.value ||
    '';

  const match =
    String(raw)
      .replace(',', '.')
      .match(/-?\d+(\.\d+)?/);

  if (!match) return null;

  const value =
    Number(match[0]);

  return Number.isFinite(value)
    ? value
    : null;
}


function getHealthColor(
  percent
) {

  const hue =
    Math.round(
      clamp(percent, 0, 1) * 120
    );

  return `hsl(${hue} 76% 48%)`;
}


async function restoreTokenImage(
  token
) {

  const asset =
    token.dataset.imageAsset;

  if (!asset) {

    setTokenFallbackText(
      token,
      token.dataset.tokenType
    );

    return;
  }

  try {

    const url =
      await getImageURL(
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

  } catch (error) {

    console.warn(
      'Не удалось восстановить картинку токена:',
      asset
    );

    setTokenFallbackText(
      token,
      token.dataset.tokenType
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

  if (
    token.querySelector('.campaign-map-token-resize')
  ) return;

  ['nw', 'ne', 'sw', 'se'].forEach(corner => {

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

  syncPresentation();
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

  syncPresentation();
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

  syncPresentation();
}


function updateGridButton(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const button =
    map.querySelector('.campaign-toggle-grid-btn');

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

  restoreMapShapes(
    map
  );
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

  const writable =
    await targetHandle.createWritable();

  await writable.write(
    await imageFile.arrayBuffer()
  );

  await writable.close();

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

  } catch (error) {

    background.style.backgroundImage =
      '';
  }
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

  const writable =
    await page.handle.createWritable();

  await writable.write(
    page.content
  );

  await writable.close();
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
    startX: event.clientX,
    startY: event.clientY,
    startWorldX: Number(token.dataset.x || 50) / 100 * WORLD_WIDTH,
    startWorldY: Number(token.dataset.y || 50) / 100 * WORLD_HEIGHT,
    measure: null,
    moved: false
  };

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

    const shouldSave =
      clearRotatedToken(
        true
      );

    if (shouldSave) {

      await saveAndSync();
    }
  }

  if (resizedToken) {

    const shouldSave =
      clearResizedToken(
        true
      );

    if (shouldSave) {

      await saveAndSync();
    }
  }

  if (draggedToken) {

    const shouldSave =
      clearDraggedToken(
        true
      );

    if (shouldSave) {

      await saveAndSync();
    }
  }

  if (resizedShape) {

    const shouldSave =
      clearResizedShape(
        true
      );

    if (shouldSave) {

      await saveAndSync();
    }
  }

  if (draggedShape) {

    const shouldSave =
      clearDraggedShape(
        true
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

    panningMap.stage.classList.remove(
      'is-panning'
    );

    panningMap =
      null;

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

  syncPresentation();
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

  syncPresentation();
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

  syncPresentation();
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
    startX: event.clientX,
    startY: event.clientY,
    startLeft: Number(shape.dataset.x || 0),
    startTop: Number(shape.dataset.y || 0),
    moved: false
  };

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

  syncPresentation();
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

  syncPresentation();
}


function updateDragMeasure(
  drag,
  point
) {

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

  syncPresentation();
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


function restoreFogCanvas(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const canvas =
    map.querySelector('.campaign-map-fog-canvas');

  if (!stage || !canvas) return Promise.resolve();

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

  const fogImage =
    stage.dataset.fogImage;

  if (!fogImage) {

    syncPresentation();
    return Promise.resolve();
  }

  const image =
    new Image();

  return new Promise(resolve => {

    image.onload = () => {

      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      syncPresentation();
      resolve();
    };

    image.onerror = () => {

      syncPresentation();
      resolve();
    };

    image.src =
      fogImage;
  });
}


function persistFogCanvas(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const canvas =
    map.querySelector('.campaign-map-fog-canvas');

  if (!stage || !canvas) return;

  stage.dataset.fogImage =
    canvas.toDataURL('image/png');

  rememberMapAssetSettings(
    stage
  );
}


function rememberMapAssetSettings(
  stage
) {

  const asset =
    stage?.dataset.mapAsset;

  if (!stage || !asset) return;

  stage.dataset[getFogKey(asset)] =
    stage.dataset.fogImage || '';

  stage.dataset[getGridKey(asset)] =
    stage.dataset.gridSize || String(DEFAULT_GRID_SIZE);
}


function restoreMapAssetSettings(
  stage
) {

  const asset =
    stage?.dataset.mapAsset;

  if (!stage || !asset) return;

  stage.dataset.fogImage =
    stage.dataset[getFogKey(asset)] || '';

  stage.dataset.gridSize =
    stage.dataset[getGridKey(asset)] || String(DEFAULT_GRID_SIZE);
}


function getFogKey(
  asset
) {

  return `fog${hashString(asset)}`;
}


function getGridKey(
  asset
) {

  return `grid${hashString(asset)}`;
}


function hashString(
  value
) {

  let hash =
    0;

  String(value || '')
    .split('')
    .forEach(char => {

      hash =
        ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    });

  return Math.abs(hash);
}


function ensureCanvasSize(
  canvas
) {

  const width =
    WORLD_WIDTH;

  const height =
    WORLD_HEIGHT;

  if (
    canvas.width === width &&
    canvas.height === height
  ) return;

  const previous =
    canvas.toDataURL('image/png');

  canvas.width =
    width;

  canvas.height =
    height;

  if (!previous) return;

  const image =
    new Image();

  image.onload = () => {
    canvas
      .getContext('2d')
      .drawImage(
        image,
        0,
        0,
        width,
        height
      );
  };

  image.src =
    previous;
}


function openPresentationWindow() {

  if (
    presentationWindow &&
    !presentationWindow.closed
  ) {

    presentationWindow.focus();
    return;
  }

  presentationWindow =
    window.open(
      '',
      'campaign-map-presentation',
      'popup=yes,width=1280,height=720'
    );

  presentationWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>Карта кампании</title>
        <style>
          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            overflow: hidden;
            background: #050505;
          }

          .presentation-map {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div class="presentation-map"></div>
      </body>
    </html>
  `);

  presentationWindow.document.close();

  const target =
    presentationWindow.document.querySelector('.presentation-map');

  target.addEventListener(
    'wheel',
    handlePresentationWheel,
    { passive: false }
  );

  target.addEventListener(
    'pointerdown',
    handlePresentationPointerDown
  );

  presentationWindow.document.addEventListener(
    'pointermove',
    handlePresentationPointerMove
  );

  presentationWindow.document.addEventListener(
    'pointerup',
    handlePresentationPointerUp
  );
}


function syncPresentation() {

  if (
    !presentationWindow ||
    presentationWindow.closed
  ) return;

  const source =
    document.querySelector('.campaign-map-stage');

  const target =
    presentationWindow.document.querySelector('.presentation-map');

  if (!source || !target) return;

  const sourceCanvas =
    source.querySelector('.campaign-map-fog-canvas');

  const fogImageSrc =
    sourceCanvas
      ? sourceCanvas.toDataURL('image/png')
      : source.dataset.fogImage;

  const clone =
    source.cloneNode(true);

  clone
    .querySelectorAll('[data-runtime="true"]')
    .forEach(element => element.remove());

  clone
    .querySelectorAll('.campaign-map-token')
    .forEach(token => {

      token.classList.remove(
        'is-selected',
        'is-dragging',
        'is-resizing',
        'is-rotating'
      );
    });

  clone
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      shape.classList.remove(
        'is-selected',
        'is-resizing'
      );
    });

  clone
    .querySelectorAll('.campaign-map-shape[data-presentation-hidden="true"]')
    .forEach(shape => {

      shape.remove();
    });

  const viewport =
    clone.querySelector('.campaign-map-viewport');

  if (viewport) {

    viewport.style.transform =
      `translate(${presentationState.x}px, ${presentationState.y}px) scale(${presentationState.zoom})`;
  }

  clone
    .querySelectorAll('canvas')
    .forEach(canvas => {

      const image =
        document.createElement('img');

      image.className =
        'campaign-map-fog-image';

      image.src =
        fogImageSrc || '';

      canvas.replaceWith(
        image
      );
    });

  target.innerHTML =
    '';

  target.appendChild(
    clone
  );

  const style =
    presentationWindow.document.getElementById('campaign-map-presentation-style') ||
    presentationWindow.document.createElement('style');

  style.id =
    'campaign-map-presentation-style';

  style.textContent =
    getPresentationCSS();

  presentationWindow.document.head.appendChild(
    style
  );
}


function handlePresentationWheel(
  event
) {

  event.preventDefault();

  const rect =
    event.currentTarget.getBoundingClientRect();

  const factor =
    event.deltaY < 0
      ? 1.08
      : 1 / 1.08;

  zoomPresentation(
    factor,
    {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  );
}


function handlePresentationPointerDown(
  event
) {

  event.preventDefault();

  presentationState.isPanning =
    true;

  presentationState.lastX =
    event.clientX;

  presentationState.lastY =
    event.clientY;
}


function handlePresentationPointerMove(
  event
) {

  if (!presentationState.isPanning) return;

  presentationState.x +=
    event.clientX - presentationState.lastX;

  presentationState.y +=
    event.clientY - presentationState.lastY;

  presentationState.lastX =
    event.clientX;

  presentationState.lastY =
    event.clientY;

  syncPresentation();
}


function handlePresentationPointerUp() {

  presentationState.isPanning =
    false;
}


function zoomPresentation(
  factor,
  anchor
) {

  const nextZoom =
    clamp(
      presentationState.zoom * factor,
      MIN_ZOOM,
      MAX_ZOOM
    );

  const worldX =
    (anchor.x - presentationState.x) / presentationState.zoom;

  const worldY =
    (anchor.y - presentationState.y) / presentationState.zoom;

  presentationState.zoom =
    nextZoom;

  presentationState.x =
    anchor.x - worldX * nextZoom;

  presentationState.y =
    anchor.y - worldY * nextZoom;

  syncPresentation();
}


function getPresentationCSS() {

  return `
    .campaign-map-stage {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #161616;
      touch-action: none;
    }

    .campaign-map-viewport {
      position: absolute;
      left: 0;
      top: 0;
      width: ${WORLD_WIDTH}px;
      height: ${WORLD_HEIGHT}px;
      transform-origin: 0 0;
    }

    .campaign-map-background,
    .campaign-map-object-layer,
    .campaign-map-fog-image {
      position: absolute;
      inset: 0;
    }

    .campaign-map-background {
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
    }

    .campaign-map-stage[data-grid="true"] .campaign-map-viewport::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px);
      background-size:
        var(--campaign-grid-size, 48px)
        var(--campaign-grid-size, 48px);
      pointer-events: none;
      z-index: 3;
    }

    .campaign-map-object-layer {
      pointer-events: none;
    }

    .campaign-map-token {
      position: absolute;
      transform: translate(-50%, -50%) rotate(var(--token-rotation, 0deg));
      z-index: 4;
      pointer-events: auto;
      width: calc(var(--campaign-grid-size, 48px) * var(--token-size, 1));
      height: calc(var(--campaign-grid-size, 48px) * var(--token-size, 1));
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.86);
      background: #f1d38e;
      color: #201a10;
      font: 700 13px system-ui;
    }

    .campaign-map-token.is-creature[data-hp-percent] {
      border-color: var(--token-health-color, rgba(255,255,255,0.86));
      box-shadow:
        0 0 0 4px color-mix(in srgb, var(--token-health-color, #65b96b) 32%, transparent),
        0 12px 28px rgba(0,0,0,0.36);
    }

    .campaign-map-token.is-creature[data-hp-state="dead"] {
      border-color: rgba(210,58,58,0.96);
      background: rgba(24,18,18,0.92);
      color: rgba(255,238,230,0.98);
    }

    .campaign-map-token.is-creature[data-hp-state="dead"] .campaign-map-token-image {
      display: none;
    }

    .campaign-map-token.is-creature[data-hp-state="dead"]::after {
      content: "RIP";
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      background:
        radial-gradient(circle at 50% 35%, rgba(255,255,255,0.10), transparent 48%),
        rgba(24,18,18,0.92);
      font: 900 15px/1 system-ui, sans-serif;
      letter-spacing: 0;
    }

    .campaign-map-token.is-object {
      z-index: 2;
      border-radius: 0;
      border-color: transparent;
      background: transparent;
      color: #1d1d1d;
    }

    .campaign-map-token[data-presentation-hidden="true"] {
      display: none;
    }

    .campaign-map-token-image {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: inherit;
      object-fit: cover;
    }

    .campaign-map-token.is-object .campaign-map-token-image {
      border-radius: 0;
      object-fit: contain;
    }

    .campaign-map-shape {
      position: absolute;
      z-index: 8;
      pointer-events: none;
    }

    .campaign-map-shape-svg {
      width: 100%;
      height: 100%;
      display: block;
      overflow: visible;
    }

    .campaign-map-shape-svg rect,
    .campaign-map-shape-svg polygon,
    .campaign-map-shape-svg ellipse {
      fill: rgba(241,211,142,0.15);
      stroke: rgba(255,244,214,0.92);
      stroke-width: 3;
      vector-effect: non-scaling-stroke;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.32));
    }

    .campaign-map-shape-label {
      position: absolute;
      padding: 3px 7px;
      border: 1px solid rgba(255,248,230,0.68);
      border-radius: 999px;
      background: rgba(20,18,14,0.76);
      color: rgba(255,250,236,0.96);
      font: 800 11px/1 system-ui, sans-serif;
      white-space: nowrap;
      pointer-events: none;
      transform: translate(-50%, -50%);
    }

    .campaign-map-shape-label.is-top {
      left: 50%;
      top: -10px;
    }

    .campaign-map-shape-label.is-right {
      left: calc(100% + 12px);
      top: 50%;
    }

    .campaign-map-drag-measure {
      position: absolute;
      inset: 0;
      z-index: 10;
      overflow: visible;
      pointer-events: none;
    }

    .campaign-map-drag-measure line {
      stroke: rgba(255,244,214,0.96);
      stroke-width: 4;
      stroke-linecap: round;
      marker-end: url(#campaign-drag-arrow);
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }

    .campaign-map-drag-measure path {
      fill: rgba(255,244,214,0.96);
    }

    .campaign-map-drag-measure text {
      fill: rgba(255,250,236,0.98);
      paint-order: stroke;
      stroke: rgba(20,18,14,0.9);
      stroke-width: 5;
      font: 700 28px system-ui, sans-serif;
      text-anchor: middle;
    }

    .campaign-map-fog-image {
      width: 100%;
      height: 100%;
      object-fit: fill;
      z-index: 5;
      opacity: 1 !important;
      pointer-events: none;
    }
  `;
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
