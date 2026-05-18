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
      <button class="campaign-fog-btn" type="button" title="Туман">Туман</button>
    </div>
  `;
}


export function getAddKindPopupHTML() {

  return `
    <div class="campaign-map-popup-title">Добавить</div>
    <button class="campaign-map-popup-option" type="button" data-kind="creature">Существо</button>
    <button class="campaign-map-popup-option" type="button" data-kind="object">Объект</button>
  `;
}


export function getCardPickerPopupHTML(
  kind
) {

  const title =
    kind === 'creature'
      ? 'Выбери существ'
      : 'Выбери объекты';

  return `
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
    <div class="campaign-map-popup-actions campaign-fog-fill-row">
      <button class="campaign-fog-fill-btn" type="button">Fog all</button>
      <button class="campaign-fog-clear-btn" type="button">Unfog all</button>
    </div>
  `;
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
