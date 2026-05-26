import {
  applyTokenRotation,
  applyTokenSize,
  positionToken,
  restoreTokenImage
} from './campaignMapTokens.js';

import {
  renderMapShape
} from './campaignMapShapes.js';


// Renderer применяет уже готовое состояние DOM-элементов к визуальному виду.
// Он не решает, какие данные правильные: это ответственность CampaignMapModel.

export async function renderMapTokenElement(
  token,
  options = {}
) {

  applyLayerZIndex(
    token
  );

  positionToken(
    token
  );

  applyTokenSize(
    token
  );

  applyTokenRotation(
    token
  );

  options.applyHealth?.(
    token,
    options.pageLookup
  );

  await restoreTokenImage(
    token
  );
}


export function renderMapShapeElement(
  shape
) {

  applyLayerZIndex(
    shape
  );

  renderMapShape(
    shape
  );
}


function applyLayerZIndex(
  element
) {

  const zIndex =
    Number(
      element?.dataset?.zIndex
    );

  if (!Number.isFinite(zIndex)) return;

  element.style.zIndex =
    String(
      Math.round(zIndex)
    );
}
