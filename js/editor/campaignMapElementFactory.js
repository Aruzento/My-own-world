import {
  applyShapeRecordToElement,
  applyTokenRecordToElement
} from './campaignMapRenderAdapter.js';

import {
  setTokenFallbackText
} from './campaignMapTokens.js';


// Factory создает DOM-элементы карты из записей модели.
// Здесь нет бизнес-логики: только минимальная разметка render-target.

export function createMapTokenElement(
  tokenData
) {

  const token =
    document.createElement('button');

  token.className =
    `campaign-map-token is-${tokenData.type}`;

  token.type =
    'button';

  token.dataset.tokenId =
    tokenData.tokenId;

  applyTokenRecordToElement(
    token,
    tokenData
  );

  setTokenFallbackText(
    token,
    tokenData.type
  );

  return token;
}


export function createMapShapeElement(
  shapeData
) {

  const shape =
    document.createElement('div');

  shape.className =
    'campaign-map-shape';

  shape.dataset.shapeId =
    shapeData.shapeId;

  applyShapeRecordToElement(
    shape,
    shapeData
  );

  return shape;
}
