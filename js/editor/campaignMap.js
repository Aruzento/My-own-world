import { state } from '../state.js';

import {
  getImageURL
} from '../storage/assetStorage.js';

import {
  createFolderPage,
  duplicatePageAsChild
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';

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

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1200;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3;
const DEFAULT_GRID_SIZE = 48;
const DEFAULT_BRUSH_SIZE = 34;


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
    'pointerdown',
    handleMapPointerDown
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

  restoreMapTokens(
    map
  );

  restoreFogCanvas(
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
      <button class="campaign-fog-draw-btn" type="button" title="Рисовать туман">●</button>
      <button class="campaign-fog-erase-btn" type="button" title="Стирать туман">○</button>
      <button class="campaign-brush-size-btn" type="button" title="Размер кисти">◌</button>
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

  if (!stage.dataset.tool) {
    stage.dataset.tool =
      'draw';
  }

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

  if (
    event.target.closest('.campaign-add-btn')
  ) {

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
    event.target.closest('.campaign-fog-draw-btn')
  ) {

    setFogMode(
      map,
      'draw'
    );

    await saveAndSync();
    return;
  }

  if (
    event.target.closest('.campaign-fog-erase-btn')
  ) {

    setFogMode(
      map,
      'erase'
    );

    await saveAndSync();
    return;
  }

  if (
    event.target.closest('.campaign-brush-size-btn')
  ) {

    openBrushSizePopup(
      map,
      event.target.closest('.campaign-brush-size-btn')
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
        () => openCardPickerPopup(
          map,
          anchor,
          button.dataset.kind
        )
      );
    });

  showMapPopup(
    popup,
    anchor
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
      closeMapPopup
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
    anchor
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

      if (
        page.template !== 'card' ||
        !allowedTypes.includes(page.type)
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

  duplicates.forEach(page => {

    addMapToken(
      map,
      kind,
      page
    );
  });

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
    anchor
  );
}


function openBrushSizePopup(
  map,
  anchor
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const popup =
    getMapPopup();

  popup.innerHTML = `
    <div class="campaign-map-popup-title">Размер кисти</div>
    <input class="campaign-map-range" type="range" min="12" max="120" step="2" value="${stage.dataset.brushSize || DEFAULT_BRUSH_SIZE}">
  `;

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

  showMapPopup(
    popup,
    anchor
  );
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

  return popup;
}


function showMapPopup(
  popup,
  anchor
) {

  const rect =
    anchor.getBoundingClientRect();

  popup.classList.remove(
    'hidden'
  );

  requestAnimationFrame(
    () => {

      const width =
        popup.offsetWidth || 280;

      popup.style.left =
        `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;

      popup.style.top =
        `${rect.bottom + 8}px`;
    }
  );
}


function closeMapPopup() {

  document
    .getElementById('campaignMapPopup')
    ?.classList.add('hidden');
}


function addMapToken(
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

  token.textContent =
    type === 'creature'
      ? 'С'
      : 'О';

  layer.appendChild(
    token
  );

  positionToken(
    token
  );

}


function restoreMapTokens(
  map
) {

  map
    .querySelectorAll('.campaign-map-token')
    .forEach(positionToken);
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
}


function updateFogButtons(
  map
) {

  const stage =
    map.querySelector('.campaign-map-stage');

  const mode =
    stage?.dataset.tool || stage?.dataset.fogMode || 'draw';

  map
    .querySelector('.campaign-fog-draw-btn')
    ?.classList.toggle(
      'is-active',
      mode === 'draw'
    );

  map
    .querySelector('.campaign-fog-erase-btn')
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

  restoreFogCanvas(
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

  const token =
    event.target.closest('.campaign-map-token');

  if (token) {

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

  const editorModule =
    await import('./editor.js');

  editorModule.openPage(
    page
  );
}


function handleMapPointerOver(
  event
) {

  const token =
    event.target.closest('.campaign-map-token');

  if (!token?.dataset.pageId) return;

  highlightTreePage(
    token.dataset.pageId
  );
}


function handleMapPointerOut(
  event
) {

  const token =
    event.target.closest('.campaign-map-token');

  if (!token?.dataset.pageId) return;

  clearTreeHighlight(
    token.dataset.pageId
  );
}


function startTokenDrag(
  event,
  token
) {

  event.preventDefault();

  draggedToken = {
    token,
    stage: token.closest('.campaign-map-stage')
  };

  token.classList.add(
    'is-dragging'
  );

  moveTokenToPointer(
    event
  );
}


function handleDocumentPointerMove(
  event
) {

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

  if (draggedToken) {

    draggedToken.token.classList.remove(
      'is-dragging'
    );

    draggedToken =
      null;

    await saveAndSync();
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


function moveTokenToPointer(
  event
) {

  const {
    token,
    stage
  } = draggedToken;

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

  syncPresentation();
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
    'rgba(0,0,0,0.76)';

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

  const fogImage =
    stage.dataset.fogImage;

  if (!fogImage) return;

  const image =
    new Image();

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
  };

  image.src =
    fogImage;
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
      z-index: 2;
    }

    .campaign-map-object-layer {
      z-index: 3;
    }

    .campaign-map-token {
      position: absolute;
      transform: translate(-50%, -50%);
      width: var(--campaign-grid-size, 48px);
      height: var(--campaign-grid-size, 48px);
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.86);
      background: #f1d38e;
      color: #201a10;
      font: 700 13px system-ui;
    }

    .campaign-map-token.is-object {
      border-radius: 10px;
      background: #d8d8d8;
      color: #1d1d1d;
    }

    .campaign-map-fog-image {
      width: 100%;
      height: 100%;
      object-fit: fill;
      z-index: 4;
      pointer-events: none;
    }
  `;
}


async function saveAndSync() {

  if (saveCurrentPageCallback) {

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
