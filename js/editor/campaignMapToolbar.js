import {
  iconSvg
} from '../core/icons.js';

import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_SIZE
} from './campaignMapConstants.js';


// В этом файле только HTML-шаблоны toolbar и popup-ов карты.
// Поведение остается в campaignMap.js, чтобы события были видны в одном месте.

export function getMapControlsHTML() {

  return `
    <div class="campaign-map-control-group">
      <button class="campaign-add-btn" type="button" title="Добавить">${iconSvg('plus')}</button>
      <button class="campaign-pan-btn" type="button" title="Двигать карту">${iconSvg('hand')}</button>
    </div>

    <div class="campaign-map-control-group">
      <button class="campaign-grid-btn" type="button" title="Сетка">${iconSvg('grid')}</button>
      <button class="campaign-change-map-btn" type="button" title="Сменить карту">${iconSvg('image')}</button>
      <button class="campaign-open-presentation-btn" type="button" title="Презентация">${iconSvg('presentation')}</button>
    </div>

    <div class="campaign-map-control-group">
      <button class="campaign-shapes-btn" type="button" title="Фигуры">Фигуры</button>
      <button class="campaign-drawing-btn" type="button" title="Рисование">${iconSvg('brush')}</button>
      <button class="campaign-layers-btn" type="button" title="Слои">Слои</button>
      <button class="campaign-fog-btn" type="button" title="Туман">Туман</button>
      <button class="campaign-initiative-btn" type="button" title="Инициатива">Иниц.</button>
      <button class="campaign-music-btn" type="button" title="Музыка карты">${iconSvg('music')}</button>
    </div>
  `;
}


export function getInitiativePopupHTML() {

  return `
    <div class="campaign-map-popup-title">Инициатива</div>
    <div class="campaign-initiative-turn">
      <button class="campaign-initiative-prev-btn" type="button">←</button>
      <span class="campaign-initiative-active">Нет активного хода</span>
      <button class="campaign-initiative-next-btn" type="button">→</button>
    </div>
    <div class="campaign-initiative-list"></div>
    <div class="campaign-map-popup-actions campaign-initiative-actions">
      <button class="campaign-initiative-save-btn" type="button">Применить</button>
      <button class="campaign-initiative-roll-btn" type="button">Roll d20</button>
      <button class="campaign-initiative-close-btn" type="button">Закрыть</button>
    </div>
  `;
}


export function getAddKindPopupHTML() {

  return `
    <div class="campaign-map-popup-title">Добавить</div>
    <button class="campaign-map-popup-option" type="button" data-kind="player">Игрок</button>
    <button class="campaign-map-popup-option" type="button" data-kind="creature">Существо</button>
    <button class="campaign-map-popup-option" type="button" data-kind="object">Объект</button>
  `;
}


export function getCardPickerPopupHTML(
  kind
) {

  const title =
    kind === 'player'
      ? 'Выбери игроков'
      : kind === 'creature'
      ? 'Выбери существ'
      : 'Выбери объекты';

  const copiesField =
    kind === 'player'
      ? ''
      : `
    <label class="campaign-map-copies-label">
      <span>Число копий</span>
      <input class="campaign-map-copies-input" type="number" min="1" max="99" value="1">
    </label>
  `;

  return `
    <div class="campaign-map-popup-title">${title}</div>
    <input class="campaign-map-picker-search" type="search" placeholder="Поиск">
    <div class="campaign-map-picker-list"></div>
    ${copiesField}
    <div class="campaign-map-popup-actions">
      <button class="campaign-map-popup-cancel" type="button">Отмена</button>
      <button class="campaign-map-popup-add" type="button">Добавить</button>
    </div>
  `;
}


export function getGridPopupHTML(
  stage
) {

  return `
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
}


export function getDrawingPopupHTML(
  stage
) {

  const color =
    stage?.dataset.drawingColor || '#f1d38e';

  const tool =
    stage?.dataset.drawingTool || 'pencil';

  const recent =
    readRecentDrawingColors(
      stage
    );

  return `
    <div class="campaign-map-popup-title">Рисование</div>
    <div class="campaign-drawing-tool-row">
      ${getDrawingToolButton('pencil', 'Карандаш', tool)}
      ${getDrawingToolButton('pen', 'Перо', tool)}
      ${getDrawingToolButton('eraser', 'Ластик', tool)}
      ${getDrawingToolButton('fill', 'Заливка', tool)}
    </div>
    <label class="campaign-map-color-label">
      <span>Цвет</span>
      <input class="campaign-drawing-color" type="color" value="${escapeAttribute(color)}">
    </label>
    <div class="campaign-drawing-recent" aria-label="Последние цвета">
      ${recent.map(item => `
        <button
          class="campaign-drawing-swatch"
          type="button"
          data-color="${escapeAttribute(item)}"
          style="--drawing-swatch:${escapeAttribute(item)}"
          title="${escapeAttribute(item)}"
        ></button>
      `).join('')}
    </div>
  `;
}


export function getFogPopupHTML(
  stage
) {

  return `
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
    <div class="campaign-fog-shape-row">
      <button class="campaign-fog-circle-btn campaign-fog-shape-btn ${stage.dataset.brushShape !== 'square' ? 'is-active' : ''}" type="button">Круг</button>
      <button class="campaign-fog-square-btn campaign-fog-shape-btn ${stage.dataset.brushShape === 'square' ? 'is-active' : ''}" type="button">Квадрат</button>
    </div>
    <div class="campaign-map-popup-actions campaign-fog-fill-row">
      <button class="campaign-fog-fill-btn" type="button">Fog all</button>
      <button class="campaign-fog-clear-btn" type="button">Unfog all</button>
    </div>
    <button class="campaign-fog-lock-zone-btn campaign-map-popup-option" type="button">Добавить запретную зону</button>
  `;
}


function getDrawingToolButton(
  value,
  label,
  activeTool
) {

  return `
    <button
      class="campaign-drawing-tool-btn ${activeTool === value ? 'is-active' : ''}"
      type="button"
      data-drawing-tool="${escapeAttribute(value)}"
    >
      ${escapeHTML(label)}
    </button>
  `;
}


function readRecentDrawingColors(
  stage
) {

  const current =
    stage?.dataset.drawingColor || '#f1d38e';

  try {

    const parsed =
      JSON.parse(
        decodeURIComponent(
          stage?.dataset.drawingRecentColors || ''
        )
      );

    if (Array.isArray(parsed)) {

      return [
        current,
        ...parsed
      ]
        .filter(isHexColor)
        .filter((item, index, list) =>
          list.indexOf(item) === index
        )
        .slice(0, 6);
    }

  } catch {

    // Empty or legacy data just falls back to the default palette.
  }

  return [
    current,
    '#f1d38e',
    '#d84a4a',
    '#7db6ff',
    '#74c69d',
    '#f7f7f2'
  ]
    .filter(isHexColor)
    .filter((item, index, list) =>
      list.indexOf(item) === index
    )
    .slice(0, 6);
}


function isHexColor(
  value
) {

  return /^#[0-9a-f]{6}$/i.test(
    String(value || '')
  );
}


export function getShapesPopupHTML() {

  return `
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
}


export function getLayersPopupHTML(
  layers = []
) {

  const rows =
    [...layers]
      .sort((left, right) =>
        right.zIndex - left.zIndex
      )
      .map(layer => `
        <div class="campaign-layer-row" data-layer-id="${escapeAttribute(layer.layerId)}">
          <label class="campaign-layer-toggle">
            <input
              class="campaign-layer-visible"
              type="checkbox"
              ${layer.visible !== false ? 'checked' : ''}
            >
            <span>${escapeHTML(layer.title)}</span>
          </label>

          <div class="campaign-layer-actions">
            <button class="campaign-layer-up" type="button" title="Выше" ${layer.locked ? 'disabled' : ''}>↑</button>
            <button class="campaign-layer-down" type="button" title="Ниже" ${layer.locked ? 'disabled' : ''}>↓</button>
          </div>
        </div>
      `)
      .join('');

  return `
    <div class="campaign-map-popup-title">Слои</div>
    <div class="campaign-layer-list">
      ${rows}
    </div>
  `;
}


function escapeHTML(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  )
    .replaceAll('"', '&quot;');
}
