import {
  iconSvg
} from '../core/icons.js';

import {
  DEFAULT_BRUSH_SIZE,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_SIZE
} from './campaignMapConstants.js';

import {
  getMapPopupFrameHTML,
  getMapPopupSectionHTML
} from './campaignMapPopupMarkup.js';


// В этом файле только HTML-шаблоны toolbar и popup-ов карты.
// Поведение остается в campaignMap.js, чтобы события были видны в одном месте.

export function getMapControlsHTML() {

  return `
    <div class="campaign-map-control-group" data-map-control-group="create" role="group" aria-label="Создание и навигация">
      <span class="campaign-map-control-group-label">Создание</span>
      <div class="campaign-map-control-actions">
        ${getMapToolButton({
          className: 'campaign-add-btn',
          icon: 'plus',
          label: 'Добавить',
          tooltip: 'Добавить токен'
        })}
        ${getMapToolButton({
          className: 'campaign-pan-btn',
          icon: 'hand',
          label: 'Рука',
          tooltip: 'Двигать карту',
          pressed: false
        })}
      </div>
    </div>

    <div class="campaign-map-control-group" data-map-control-group="scene" role="group" aria-label="Сцена и вид">
      <span class="campaign-map-control-group-label">Сцена</span>
      <div class="campaign-map-control-actions">
        ${getMapToolButton({
          className: 'campaign-grid-btn',
          icon: 'grid',
          label: 'Сетка',
          tooltip: 'Настроить сетку',
          pressed: false
        })}
        ${getMapToolButton({
          className: 'campaign-change-map-btn',
          icon: 'image',
          label: 'Карта',
          tooltip: 'Сменить карту'
        })}
        ${getMapToolButton({
          className: 'campaign-layers-btn',
          icon: 'eye',
          label: 'Слои',
          tooltip: 'Слои карты'
        })}
      </div>
    </div>

    <div class="campaign-map-control-group" data-map-control-group="tools" role="group" aria-label="Инструменты карты">
      <span class="campaign-map-control-group-label">Инструменты</span>
      <div class="campaign-map-control-actions">
        ${getMapToolButton({
          className: 'campaign-shapes-btn',
          icon: 'shapes',
          label: 'Фигуры',
          tooltip: 'Фигуры'
        })}
        ${getMapToolButton({
          className: 'campaign-drawing-btn',
          icon: 'brush',
          label: 'Рис.',
          tooltip: 'Рисование',
          pressed: false
        })}
        ${getMapToolButton({
          className: 'campaign-fog-btn',
          icon: 'fog',
          label: 'Туман',
          tooltip: 'Туман войны',
          pressed: false
        })}
      </div>
    </div>

    <div class="campaign-map-control-group" data-map-control-group="live" role="group" aria-label="Живая сессия">
      <span class="campaign-map-control-group-label">Live</span>
      <div class="campaign-map-control-actions">
        ${getMapToolButton({
          className: 'campaign-open-presentation-btn',
          icon: 'presentation',
          label: 'Показ',
          tooltip: 'Открыть презентацию'
        })}
        ${getMapToolButton({
          className: 'campaign-initiative-btn',
          icon: 'skill',
          label: 'Иниц.',
          tooltip: 'Инициатива'
        })}
        ${getMapToolButton({
          className: 'campaign-music-btn',
          icon: 'music',
          label: 'Музыка',
          tooltip: 'Музыка карты'
        })}
      </div>
    </div>
  `;
}


function getMapToolButton({
  className,
  icon,
  label,
  tooltip,
  pressed = null
}) {

  const pressedAttribute =
    pressed === null
      ? ''
      : ` aria-pressed="${pressed ? 'true' : 'false'}"`;

  return `
    <button
      class="campaign-map-tool-button ${className}"
      type="button"
      title="${escapeAttribute(tooltip)}"
      data-tooltip="${escapeAttribute(tooltip)}"
      aria-label="${escapeAttribute(tooltip)}"${pressedAttribute}
    >
      ${iconSvg(icon)}
      <span class="campaign-map-button-label">${escapeHTML(label)}</span>
    </button>
  `;
}


export function getInitiativePopupHTML() {

  return getMapPopupFrameHTML({
    title: 'Инициатива',
    icon: 'skill',
    children: `
      ${getMapPopupSectionHTML({
        label: 'Ход',
        key: 'turn',
        children: `
          <div class="campaign-initiative-turn">
            <button class="campaign-initiative-prev-btn" type="button">←</button>
            <span class="campaign-initiative-active">Нет активного хода</span>
            <button class="campaign-initiative-next-btn" type="button">→</button>
          </div>
        `
      })}
      ${getMapPopupSectionHTML({
        label: 'Участники',
        key: 'participants',
        children: '<div class="campaign-initiative-list"></div>'
      })}
      <div class="campaign-map-popup-actions campaign-initiative-actions">
        <button class="campaign-initiative-save-btn" type="button">Применить</button>
        <button class="campaign-initiative-roll-btn" type="button">Roll d20</button>
        <button class="campaign-initiative-close-btn" type="button">Закрыть</button>
      </div>
    `
  });
}


export function getAddKindPopupHTML() {

  return getMapPopupFrameHTML({
    title: 'Добавить',
    icon: 'plus',
    children: getMapPopupSectionHTML({
      label: 'Тип',
      key: 'kind',
      children: `
        <div class="campaign-map-popup-option-list">
          <button class="campaign-map-popup-option" type="button" data-kind="player">
            ${iconSvg('character')}
            <span>Игрок</span>
          </button>
          <button class="campaign-map-popup-option" type="button" data-kind="creature">
            ${iconSvg('creature')}
            <span>Существо</span>
          </button>
          <button class="campaign-map-popup-option" type="button" data-kind="object">
            ${iconSvg('object')}
            <span>Объект</span>
          </button>
        </div>
      `
    })
  });
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

  return getMapPopupFrameHTML({
    title,
    icon:
      kind === 'object'
        ? 'object'
        : 'creature',
    children: `
      ${getMapPopupSectionHTML({
        label: 'Карточки',
        key: 'cards',
        children: `
          <input class="campaign-map-picker-search" type="search" placeholder="Поиск">
          <div class="campaign-map-picker-list"></div>
          ${copiesField}
        `
      })}
      <div class="campaign-map-popup-actions">
        <button class="campaign-map-popup-cancel" type="button">Отмена</button>
        <button class="campaign-map-popup-add" type="button">Добавить</button>
      </div>
    `
  });
}


export function getGridPopupHTML(
  stage
) {

  return getMapPopupFrameHTML({
    title: 'Сетка',
    icon: 'grid',
    children: `
      ${getMapPopupSectionHTML({
        label: 'Видимость',
        key: 'visibility',
        children: `
          <button class="campaign-grid-toggle-btn campaign-map-popup-option" type="button">
            ${stage.dataset.grid === 'true' ? 'Выключить сетку' : 'Включить сетку'}
          </button>
        `
      })}
      ${getMapPopupSectionHTML({
        label: 'Параметры',
        key: 'settings',
        children: `
          <label class="campaign-map-range-label">
            <span>Размер сетки</span>
            <input class="campaign-grid-size-range campaign-map-range" type="range" min="24" max="96" step="2" value="${stage.dataset.gridSize || DEFAULT_GRID_SIZE}">
          </label>
          <label class="campaign-map-color-label">
            <span>Цвет сетки</span>
            <input class="campaign-grid-color-input" type="color" value="${stage.dataset.gridColor || DEFAULT_GRID_COLOR}">
          </label>
        `
      })}
    `
  });
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

  return getMapPopupFrameHTML({
    title: 'Рисование',
    icon: 'brush',
    children: `
      ${getMapPopupSectionHTML({
        label: 'Инструмент',
        key: 'tool',
        children: `
          <div class="campaign-drawing-tool-row">
            ${getDrawingToolButton('pencil', 'Карандаш', tool)}
            ${getDrawingToolButton('pen', 'Перо', tool)}
            ${getDrawingToolButton('eraser', 'Ластик', tool)}
            ${getDrawingToolButton('fill', 'Заливка', tool)}
          </div>
        `
      })}
      ${getMapPopupSectionHTML({
        label: 'Цвет',
        key: 'color',
        children: `
          <label class="campaign-map-color-label">
            <span>Текущий цвет</span>
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
                aria-label="Цвет ${escapeAttribute(item)}"
              ></button>
            `).join('')}
          </div>
        `
      })}
    `
  });
}


export function getFogPopupHTML(
  stage
) {

  return getMapPopupFrameHTML({
    title: 'Туман',
    icon: 'fog',
    children: `
      ${getMapPopupSectionHTML({
        label: 'Режим',
        key: 'mode',
        children: `
          <div class="campaign-fog-mode-row">
            <button class="campaign-fog-draw-btn campaign-fog-mode-btn" type="button">
              ${iconSvg('brush')}
              <strong>Кисть</strong>
            </button>
            <button class="campaign-fog-erase-btn campaign-fog-mode-btn" type="button">
              ${iconSvg('x')}
              <strong>Ластик</strong>
            </button>
          </div>
        `
      })}
      ${getMapPopupSectionHTML({
        label: 'Кисть',
        key: 'brush',
        children: `
          <label class="campaign-map-range-label">
            <span>Размер кисти</span>
            <input class="campaign-map-range" type="range" min="12" max="120" step="2" value="${stage.dataset.brushSize || DEFAULT_BRUSH_SIZE}">
          </label>
          <div class="campaign-fog-shape-row">
            <button class="campaign-fog-circle-btn campaign-fog-shape-btn ${stage.dataset.brushShape !== 'square' ? 'is-active' : ''}" type="button" aria-pressed="${stage.dataset.brushShape !== 'square' ? 'true' : 'false'}">Круг</button>
            <button class="campaign-fog-square-btn campaign-fog-shape-btn ${stage.dataset.brushShape === 'square' ? 'is-active' : ''}" type="button" aria-pressed="${stage.dataset.brushShape === 'square' ? 'true' : 'false'}">Квадрат</button>
          </div>
        `
      })}
      ${getMapPopupSectionHTML({
        label: 'Область',
        key: 'area',
        children: `
          <div class="campaign-map-popup-actions campaign-fog-fill-row">
            <button class="campaign-fog-fill-btn" type="button">Fog all</button>
            <button class="campaign-fog-clear-btn" type="button">Unfog all</button>
          </div>
          <button class="campaign-fog-lock-zone-btn campaign-map-popup-option" type="button">Добавить запретную зону</button>
        `
      })}
    `
  });
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
      aria-pressed="${activeTool === value ? 'true' : 'false'}"
    >
      ${iconSvg(getDrawingToolIcon(value))}
      <span>${escapeHTML(label)}</span>
    </button>
  `;
}


function getDrawingToolIcon(
  value
) {

  const icons =
    {
      pencil:
        'edit',
      pen:
        'brush',
      eraser:
        'x',
      fill:
        'fog'
    };

  return icons[value] ||
    'brush';
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

  return getMapPopupFrameHTML({
    title: 'Фигуры',
    icon: 'shapes',
    children: getMapPopupSectionHTML({
      label: 'Тип',
      key: 'shape',
      children: `
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
      `
    })
  });
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
            <span class="campaign-layer-title">${escapeHTML(layer.title)}</span>
            <span class="campaign-layer-state">
              ${layer.visible !== false ? 'Виден' : 'Скрыт'}${layer.locked ? ' · Заблокирован' : ''}
            </span>
          </label>

          <div class="campaign-layer-actions">
            <button class="campaign-layer-up" type="button" title="Выше" aria-label="Поднять слой" ${layer.locked ? 'disabled' : ''}>↑</button>
            <button class="campaign-layer-down" type="button" title="Ниже" aria-label="Опустить слой" ${layer.locked ? 'disabled' : ''}>↓</button>
          </div>
        </div>
      `)
      .join('');

  return getMapPopupFrameHTML({
    title: 'Слои',
    icon: 'eye',
    children: getMapPopupSectionHTML({
      label: 'Порядок',
      key: 'layers',
      children: `
        <div class="campaign-layer-list">
          ${rows}
        </div>
      `
    })
  });
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
