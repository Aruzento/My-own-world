// Render adapter переносит нормализованные записи модели в DOM.
// Важно: этот слой ничего не сохраняет и не меняет модель, а только отражает ее состояние в элементах карты.

export function applyTokenRecordToElement(
  tokenElement,
  tokenRecord
) {

  if (
    !tokenElement ||
    !tokenRecord
  ) return;

  tokenElement.classList.remove(
    'is-creature',
    'is-object'
  );

  tokenElement.classList.add(
    `is-${tokenRecord.type}`
  );

  tokenElement.dataset.tokenId =
    tokenRecord.tokenId;

  tokenElement.dataset.tokenType =
    tokenRecord.type;

  tokenElement.dataset.x =
    tokenRecord.x.toFixed(3);

  tokenElement.dataset.y =
    tokenRecord.y.toFixed(3);

  tokenElement.dataset.size =
    tokenRecord.size.toFixed(3);

  tokenElement.dataset.rotation =
    String(tokenRecord.rotation);

  tokenElement.dataset.name =
    tokenRecord.name;

  syncOptionalDatasetValue(
    tokenElement,
    'pageId',
    tokenRecord.pageId
  );

  syncOptionalDatasetValue(
    tokenElement,
    'imageAsset',
    tokenRecord.imageAsset
  );

  tokenElement.dataset.initiativeModifier =
    String(tokenRecord.initiativeModifier);

  tokenElement.dataset.sourceMode =
    tokenRecord.sourceMode === 'original'
      ? 'original'
      : 'copy';

  tokenElement.dataset.layerId =
    tokenRecord.layerId;

  tokenElement.dataset.zIndex =
    String(tokenRecord.zIndex);

  tokenElement.style.zIndex =
    String(tokenRecord.zIndex);

  tokenElement.dataset.presentationHidden =
    tokenRecord.presentationHidden
      ? 'true'
      : 'false';
}


export function applyShapeRecordToElement(
  shapeElement,
  shapeRecord
) {

  if (
    !shapeElement ||
    !shapeRecord
  ) return;

  shapeElement.dataset.shapeId =
    shapeRecord.shapeId;

  shapeElement.dataset.shapeType =
    shapeRecord.type;

  shapeElement.dataset.x =
    String(Math.round(shapeRecord.x));

  shapeElement.dataset.y =
    String(Math.round(shapeRecord.y));

  shapeElement.dataset.w =
    String(Math.round(shapeRecord.width));

  shapeElement.dataset.h =
    String(Math.round(shapeRecord.height));

  syncOptionalDatasetValue(
    shapeElement,
    'points',
    shapeRecord.points
  );

  shapeElement.dataset.layerId =
    shapeRecord.layerId;

  shapeElement.dataset.zIndex =
    String(shapeRecord.zIndex);

  shapeElement.style.zIndex =
    String(shapeRecord.zIndex);

  shapeElement.dataset.presentationHidden =
    shapeRecord.presentationHidden
      ? 'true'
      : 'false';
}


function syncOptionalDatasetValue(
  element,
  key,
  value
) {

  if (value) {

    element.dataset[key] =
      value;

    return;
  }

  delete element.dataset[key];
}
