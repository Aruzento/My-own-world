import {
  applyTokenRotation,
  applyTokenSize,
  positionToken
} from './campaignMapTokens.js';

import {
  renderMapShape
} from './campaignMapShapes.js';

export function removeHiddenPresentationItems(
  clone,
  model
) {

  const hiddenTokenIds =
    new Set(
      (model?.tokens || [])
        .filter(token =>
          token.presentationHidden &&
          !isPlayerPresentationToken(
            token
          )
        )
        .map(token => token.tokenId)
    );

  const hiddenShapeIds =
    new Set(
      (model?.shapes || [])
        .filter(shape => shape.presentationHidden)
        .map(shape => shape.shapeId)
    );

  clone
    .querySelectorAll('.campaign-map-token')
    .forEach(token => {

      if (
        hiddenTokenIds.has(
          token.dataset.tokenId
        )
      ) {

        token.remove();
      }
    });

  clone
    .querySelectorAll('.campaign-map-shape')
    .forEach(shape => {

      if (
        hiddenShapeIds.has(
          shape.dataset.shapeId
        )
      ) {

        shape.remove();
      }
    });
}


function isPlayerPresentationToken(
  token
) {

  return token?.sourceMode === 'original' ||
    token?.isPlayerToken === true;
}

export function getPresentationItemSelector(
  itemType,
  key
) {

  const escapedKey =
    CSS.escape(
      key
    );

  if (itemType === 'token') {

    return `.campaign-map-token[data-token-id="${escapedKey}"]`;
  }

  if (itemType === 'shape') {

    return `.campaign-map-shape[data-shape-id="${escapedKey}"]`;
  }

  return '';
}

export function applyPresentationItemRecord(
  targetItem,
  itemType,
  record
) {

  if (itemType === 'shape') {

    applyShapeRecord(
      targetItem,
      record
    );

    return;
  }

  applyTokenRecord(
    targetItem,
    record
  );
}

function applyShapeRecord(
  targetItem,
  record
) {

  targetItem.dataset.shapeId =
    record.shapeId;

  targetItem.dataset.shapeType =
    record.type;

  targetItem.dataset.x =
    String(Math.round(record.x));

  targetItem.dataset.y =
    String(Math.round(record.y));

  targetItem.dataset.w =
    String(Math.round(record.width));

  targetItem.dataset.h =
    String(Math.round(record.height));

  if (record.points) {

    targetItem.dataset.points =
      record.points;

  } else {

    delete targetItem.dataset.points;
  }

  applySharedPresentationDataset(
    targetItem,
    record
  );

  renderMapShape(
    targetItem
  );

  targetItem
    .querySelectorAll('[data-runtime="true"]')
    .forEach(element => element.remove());

  targetItem.classList.remove(
    'is-selected',
    'is-resizing',
    'is-offscreen'
  );
}

function applyTokenRecord(
  targetItem,
  record
) {

  targetItem.dataset.tokenId =
    record.tokenId;

  targetItem.dataset.tokenType =
    record.type;

  targetItem.dataset.sourceMode =
    record.sourceMode === 'original'
      ? 'original'
      : 'copy';

  targetItem.dataset.playerToken =
    isPlayerPresentationToken(record)
      ? 'true'
      : 'false';

  targetItem.classList.toggle(
    'is-creature',
    record.type === 'creature'
  );

  targetItem.classList.toggle(
    'is-object',
    record.type === 'object'
  );

  targetItem.dataset.x =
    record.x.toFixed(3);

  targetItem.dataset.y =
    record.y.toFixed(3);

  targetItem.dataset.size =
    record.size.toFixed(3);

  targetItem.dataset.rotation =
    String(record.rotation);

  targetItem.dataset.name =
    record.name;

  if (record.pageId) {

    targetItem.dataset.pageId =
      record.pageId;

  } else {

    delete targetItem.dataset.pageId;
  }

  if (record.imageAsset) {

    targetItem.dataset.imageAsset =
      record.imageAsset;

  } else {

    delete targetItem.dataset.imageAsset;
  }

  targetItem.dataset.initiativeModifier =
    String(record.initiativeModifier);

  applySharedPresentationDataset(
    targetItem,
    record
  );

  positionToken(
    targetItem
  );

  applyTokenSize(
    targetItem
  );

  applyTokenRotation(
    targetItem
  );

  targetItem.classList.remove(
    'is-selected',
    'is-dragging',
    'is-resizing',
    'is-rotating',
    'is-offscreen'
  );
}

function applySharedPresentationDataset(
  targetItem,
  record
) {

  targetItem.dataset.presentationHidden =
    record.presentationHidden
      ? 'true'
      : 'false';

  targetItem.dataset.layerId =
    record.layerId;

  targetItem.dataset.zIndex =
    String(record.zIndex);

  targetItem.style.zIndex =
    String(record.zIndex);
}
