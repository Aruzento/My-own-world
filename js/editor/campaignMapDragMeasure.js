import {
  DEFAULT_GRID_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';


// Оверлей расстояния живет как runtime-визуализация.
// Данные о линии можно передать в презентацию без копирования DOM.

export function updateDragMeasure(
  drag,
  point
) {

  if (drag.token?.dataset.presentationHidden === 'true') {

    removeDragMeasure(
      drag
    );

    return createEmptyMeasurePayload(
      drag
    );
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

    return createEmptyMeasurePayload(
      drag
    );
  }

  const viewport =
    drag.stage.querySelector('.campaign-map-viewport');

  if (!viewport) return null;

  const measure =
    ensureDragMeasureElement(
      drag,
      viewport
    );

  const payload =
    {
      active: true,
      x1: drag.startWorldX,
      y1: drag.startWorldY,
      x2: point.x,
      y2: point.y,
      labelX: (drag.startWorldX + point.x) / 2,
      labelY: (drag.startWorldY + point.y) / 2 - 12,
      label: `${cells * 5} ft`
    };

  applyDragMeasurePayload(
    measure,
    payload
  );

  return payload;
}


export function removeDragMeasure(
  drag
) {

  drag?.measure?.remove();

  if (drag) {

    drag.measure =
      null;
  }
}


export function renderPresentationDragMeasure(
  viewport,
  payload
) {

  if (!viewport) return false;

  viewport
    .querySelectorAll('.campaign-map-drag-measure')
    .forEach(measure => measure.remove());

  if (!payload?.active) return true;

  const measure =
    createDragMeasureElement();

  applyDragMeasurePayload(
    measure,
    payload
  );

  viewport.appendChild(
    measure
  );

  return true;
}


function ensureDragMeasureElement(
  drag,
  viewport
) {

  if (drag.measure) return drag.measure;

  drag.measure =
    createDragMeasureElement();

  viewport.appendChild(
    drag.measure
  );

  return drag.measure;
}


function createDragMeasureElement() {

  const measure =
    document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );

  measure.classList.add(
    'campaign-map-drag-measure'
  );

  measure.setAttribute(
    'viewBox',
    `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`
  );

  measure.innerHTML = `
    <defs>
      <marker id="campaign-drag-arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z"></path>
      </marker>
    </defs>
    <line></line>
    <text></text>
  `;

  return measure;
}


function applyDragMeasurePayload(
  measure,
  payload
) {

  const line =
    measure.querySelector('line');

  const label =
    measure.querySelector('text');

  line.setAttribute(
    'x1',
    String(payload.x1)
  );

  line.setAttribute(
    'y1',
    String(payload.y1)
  );

  line.setAttribute(
    'x2',
    String(payload.x2)
  );

  line.setAttribute(
    'y2',
    String(payload.y2)
  );

  label.setAttribute(
    'x',
    String(payload.labelX)
  );

  label.setAttribute(
    'y',
    String(payload.labelY)
  );

  label.textContent =
    payload.label;
}


function createEmptyMeasurePayload(
  drag
) {

  return {
    active: false,
    x1: drag.startWorldX,
    y1: drag.startWorldY,
    x2: drag.startWorldX,
    y2: drag.startWorldY,
    labelX: drag.startWorldX,
    labelY: drag.startWorldY,
    label: ''
  };
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

  return Math.round(
    Math.max(
      Math.abs(point.x - drag.startWorldX),
      Math.abs(point.y - drag.startWorldY)
    ) / gridSize
  );
}
