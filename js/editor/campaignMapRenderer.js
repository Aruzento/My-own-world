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

  renderMapShape(
    shape
  );
}
