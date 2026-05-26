import {
  CampaignMapModel
} from './campaignMapModel.js';

import {
  refreshCampaignMapStore
} from './campaignMapStore.js';


// Data-first сериализатор карты строит persistent HTML из CampaignMapModel.
// В сохранение попадают только данные карты, а runtime-кнопки и временное DOM-состояние
// восстанавливаются заново при следующем открытии.

export function serializeCampaignMapDocumentHTML(
  map
) {

  const store =
    refreshCampaignMapStore(
      map
    );

  return serializeCampaignMapModelHTML({
    title: getMapTitle(
      map
    ),
    model: store?.getModel()
  });
}


export function serializeCampaignMapModelHTML(
  options = {}
) {

  const model =
    options.model instanceof CampaignMapModel
      ? options.model
      : new CampaignMapModel(
        options.model || {}
      );

  const data =
    model.toJSON();

  const title =
    String(options.title || 'Новая карта').trim() || 'Новая карта';

  return `
      <div
        class="campaign-map-document"
        data-campaign-map="v1"
        contenteditable="false"
      >
        <div class="campaign-map-topbar" contenteditable="false">
          <h1
            class="campaign-map-title singleline-field"
            contenteditable="true"
            data-placeholder="Название карты"
          >
            ${escapeHTML(title)}
          </h1>
        </div>

        <div
          class="campaign-map-stage"
          ${serializeStageAttributes(data)}
          contenteditable="false"
        >
          <div class="campaign-map-viewport">
            <div class="campaign-map-background"></div>
            <div class="campaign-map-object-layer">
              ${data.tokens.map(serializeToken).join('')}
              ${data.shapes.map(serializeShape).join('')}
            </div>
            <canvas class="campaign-map-fog-canvas"></canvas>
          </div>
        </div>
      </div>
    `;
}


function serializeStageAttributes(
  data
) {

  const attributes = {
    'data-map-model-version': data.version,
    'data-map-asset': data.asset,
    'data-view-x': data.view.x,
    'data-view-y': data.view.y,
    'data-view-zoom': data.view.zoom,
    'data-grid': data.grid.enabled ? 'true' : 'false',
    'data-grid-size': data.grid.size,
    'data-grid-color': data.grid.color,
    'data-fog-mode': data.fog.mode,
    'data-fog-image': data.fog.image,
    'data-brush-size': data.fog.brushSize,
    'data-layer-state': encodeURIComponent(
      JSON.stringify(
        data.layers || []
      )
    ),
    'data-initiative-state': encodeURIComponent(
      JSON.stringify(
        data.initiative || {}
      )
    ),
    ...serializeAssetSettings(
      data.assetSettings
    )
  };

  return serializeAttributes(
    attributes
  );
}


function serializeToken(
  token
) {

  return `
                <button
                  class="campaign-map-token is-${escapeAttribute(token.type)}"
                  type="button"
                  ${serializeAttributes({
                    'data-token-id': token.tokenId,
                    'data-page-id': token.pageId,
                    'data-token-type': token.type,
                    'data-name': token.name,
                    'data-x': formatNumber(token.x, 3),
                    'data-y': formatNumber(token.y, 3),
                    'data-size': formatNumber(token.size, 3),
                    'data-rotation': token.rotation,
                    'data-image-asset': token.imageAsset,
                    'data-initiative-modifier': token.initiativeModifier,
                    'data-source-mode': token.sourceMode,
                    'data-layer-id': token.layerId,
                    'data-z-index': token.zIndex,
                    'data-presentation-hidden': token.presentationHidden ? 'true' : 'false'
                  })}
                ></button>
              `;
}


function serializeShape(
  shape
) {

  return `
                <div
                  class="campaign-map-shape"
                  ${serializeAttributes({
                    'data-shape-id': shape.shapeId,
                    'data-shape-type': shape.type,
                    'data-x': Math.round(shape.x),
                    'data-y': Math.round(shape.y),
                    'data-w': Math.round(shape.width),
                    'data-h': Math.round(shape.height),
                    'data-points': shape.points,
                    'data-layer-id': shape.layerId,
                    'data-z-index': shape.zIndex,
                    'data-presentation-hidden': shape.presentationHidden ? 'true' : 'false'
                  })}
                ></div>
              `;
}


function serializeAssetSettings(
  settings = {}
) {

  return Object
    .entries(settings)
    .reduce((attributes, [key, value]) => {

      attributes[`data-${toKebabCase(key)}`] =
        value;

      return attributes;
    }, {});
}


function serializeAttributes(
  attributes
) {

  return Object
    .entries(attributes)
    .filter(([, value]) =>
      value !== undefined &&
      value !== null &&
      value !== ''
    )
    .map(([name, value]) =>
      `${name}="${escapeAttribute(value)}"`
    )
    .join(' ');
}


function getMapTitle(
  map
) {

  return map
    ?.querySelector('.campaign-map-title')
    ?.textContent
    ?.trim() ||
    'Новая карта';
}


function formatNumber(
  value,
  digits
) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) return '0';

  return number.toFixed(
    digits
  );
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


function toKebabCase(
  value
) {

  return String(value)
    .replace(/[A-Z]/g, match =>
      `-${match.toLowerCase()}`
    );
}
