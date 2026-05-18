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
