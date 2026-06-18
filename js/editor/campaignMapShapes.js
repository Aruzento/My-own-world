import {
  markRuntime
} from './blocks/blockContract.js';

import {
  DEFAULT_SHAPE_SIZE
} from './campaignMapConstants.js';

import {
  getFeetLabel,
  getTriangleLabels,
  getTrianglePoints
} from './campaignMapGeometry.js';


// Рендер фигур отделен от drag/resize логики: этот модуль только приводит
// persistent data-* поля фигуры к DOM-разметке и визуальной геометрии.

export function renderMapShape(
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

  shape.style.setProperty(
    '--campaign-shape-stroke',
    shape.dataset.strokeColor || 'rgba(255,244,214,0.92)'
  );

  shape.style.setProperty(
    '--campaign-shape-fill',
    shape.dataset.fillColor || 'rgba(241,211,142,0.15)'
  );

  shape.style.setProperty(
    '--campaign-shape-stroke-width',
    `${Number(shape.dataset.strokeWidth || 3)}px`
  );

  shape
    .querySelectorAll('.campaign-map-shape-handle')
    .forEach(handle => markRuntime(handle));
}


export function applyShapeGeometry(
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

  if (
    type === 'freehand' ||
    type === 'line'
  ) {

    const points =
      normalizeLinePoints(
        shape.dataset.points
      );

    const isFilled =
      type === 'freehand' &&
      shape.dataset.fillColor &&
      shape.dataset.fillColor !== 'transparent';

    return `
      <svg class="campaign-map-shape-svg campaign-map-drawing-svg ${isFilled ? 'is-filled' : ''}" viewBox="0 0 ${Math.max(1, Number(shape.dataset.w || 1))} ${Math.max(1, Number(shape.dataset.h || 1))}" preserveAspectRatio="none">
        <polyline points="${points}"></polyline>
      </svg>
    `;
  }

  if (type === 'fill') {

    return `
      <svg class="campaign-map-shape-svg campaign-map-drawing-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect x="0" y="0" width="100" height="100"></rect>
      </svg>
    `;
  }

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


function normalizeLinePoints(
  value
) {

  const points =
    String(value || '')
      .trim()
      .split(/\s+/)
      .map(point => {

        const [x, y] =
          point.split(',').map(Number);

        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y)
        ) return '';

        return `${x},${y}`;
      })
      .filter(Boolean);

  if (points.length >= 2) {

    return points.join(' ');
  }

  return '0,0 1,1';
}
