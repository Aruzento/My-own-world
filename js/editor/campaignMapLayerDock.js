import {
  iconSvg
} from '../core/icons.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  setCampaignMapLayerVisibility
} from './campaignMapLayers.js';


export const MAP_LAYER_DOCK_UI_MIGRATION =
  '0.0.1.8.12.4';


const dockDeps =
  new WeakMap();


export function ensureMapLayerDock(
  map,
  deps = {}
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) return null;

  let dock =
    stage.querySelector('.campaign-map-layer-dock');

  if (!dock) {

    dock =
      document.createElement('section');

    dock.className =
      'campaign-map-layer-dock';

    dock.dataset.mapLayerDockUiMigration =
      MAP_LAYER_DOCK_UI_MIGRATION;

    dock.setAttribute(
      'aria-label',
      'Слои и объекты карты'
    );

    dock.setAttribute(
      'role',
      'complementary'
    );

    markRuntime(
      dock
    );

    dock.addEventListener(
      'pointerdown',
      event => {

        event.stopPropagation();
      }
    );

    dock.addEventListener(
      'click',
      handleLayerDockClick
    );

    stage.appendChild(
      dock
    );
  }

  dockDeps.set(
    dock,
    deps
  );

  updateMapLayerDock(
    map
  );

  return dock;
}


export function updateMapLayerDock(
  map
) {

  const dock =
    map
      ?.querySelector('.campaign-map-layer-dock');

  if (!dock) return;

  dock.innerHTML =
    getLayerDockHTML(
      getLayerDockState(
        map
      )
    );
}


async function handleLayerDockClick(
  event
) {

  const button =
    event.target.closest('[data-map-layer-dock-action]');

  event.stopPropagation();

  if (!button) return;

  event.preventDefault();

  const dock =
    button.closest('.campaign-map-layer-dock');

  const map =
    dock?.closest('.campaign-map-document');

  if (!map) return;

  const deps =
    dockDeps.get(
      dock
    ) || {};

  if (button.dataset.mapLayerDockAction === 'open-layers') {

    deps.openLayersPopup?.(
      map,
      button
    );

    return;
  }

  if (button.dataset.mapLayerDockAction !== 'toggle-layer') return;

  const layerId =
    button.dataset.layerId || '';

  const nextVisible =
    button.getAttribute('aria-pressed') !== 'true';

  setCampaignMapLayerVisibility(
    map,
    layerId,
    nextVisible
  );

  updateMapLayerDock(
    map
  );

  await deps.saveAndSync?.();
}


function getLayerDockState(
  map
) {

  const model =
    getCampaignMapStore(
      map
    )?.getModel();

  const layers =
    [...model?.layers || []]
      .sort((left, right) =>
        right.zIndex - left.zIndex
      );

  const tokens =
    model?.tokens || [];

  const shapes =
    model?.shapes || [];

  const lockedFogZones =
    model?.fog?.lockedZones || [];

  const rows =
    layers.map(layer => {

      const counts =
        getLayerCounts(
          layer,
          {
            tokens,
            shapes,
            lockedFogZones
          }
        );

      return {
        ...layer,
        ...counts,
        empty:
          counts.total === 0
      };
    });

  return {
    rows,
    totals: {
      tokens:
        tokens.length,
      creatures:
        tokens.filter(token =>
          token.type !== 'object'
        ).length,
      objects:
        tokens.filter(token =>
          token.type === 'object'
        ).length,
      shapes:
        shapes.length,
      hidden:
        tokens.filter(token =>
          token.presentationHidden
        ).length +
        shapes.filter(shape =>
          shape.presentationHidden
        ).length
    }
  };
}


function getLayerCounts(
  layer,
  data
) {

  if (layer.layerId === 'map-locked-fog') {

    return {
      total:
        data.lockedFogZones.length,
      detail:
        `${data.lockedFogZones.length} зон`
    };
  }

  if (layer.layerId === 'map-fog') {

    return {
      total:
        1,
      detail:
        'туман'
    };
  }

  const layerTokens =
    data.tokens.filter(token =>
      token.layerId === layer.layerId
    );

  const layerShapes =
    data.shapes.filter(shape =>
      shape.layerId === layer.layerId
    );

  const tokenCount =
    layerTokens.length;

  const shapeCount =
    layerShapes.length;

  const parts =
    [
      tokenCount
        ? `${tokenCount} ток.`
        : '',
      shapeCount
        ? `${shapeCount} фиг.`
        : ''
    ].filter(Boolean);

  return {
    total:
      tokenCount + shapeCount,
    detail:
      parts.join(' · ') || 'пусто'
  };
}


function getLayerDockHTML(
  state
) {

  return `
    <div class="campaign-map-layer-dock-header">
      <span class="campaign-map-layer-dock-icon">
        ${iconSvg('grid')}
      </span>
      <div class="campaign-map-layer-dock-heading">
        <strong>Слои карты</strong>
        <span>${state.totals.tokens} ток. · ${state.totals.shapes} фиг. · ${state.totals.hidden} скрыто</span>
      </div>
      <button
        class="campaign-map-layer-dock-open"
        type="button"
        data-map-layer-dock-action="open-layers"
        aria-label="Открыть настройки слоев"
        title="Открыть настройки слоев"
      >
        ${iconSvg('more')}
      </button>
    </div>

    <div class="campaign-map-layer-dock-metrics">
      ${getMetricHTML('creatures', 'Существа', state.totals.creatures)}
      ${getMetricHTML('objects', 'Объекты', state.totals.objects)}
      ${getMetricHTML('shapes', 'Фигуры', state.totals.shapes)}
    </div>

    <div class="campaign-map-layer-dock-list">
      ${state.rows.map(getLayerRowHTML).join('')}
    </div>
  `;
}


function getMetricHTML(
  key,
  label,
  value
) {

  return `
    <span class="campaign-map-layer-metric" data-layer-metric="${escapeAttribute(key)}">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
    </span>
  `;
}


function getLayerRowHTML(
  layer
) {

  const pressed =
    layer.visible !== false
      ? 'true'
      : 'false';

  const state =
    layer.visible !== false
      ? 'виден'
      : 'скрыт';

  const disabled =
    layer.locked
      ? 'disabled'
      : '';

  const title =
    `${layer.title}: ${state}, ${layer.detail}`;

  return `
    <button
      class="campaign-map-layer-dock-row"
      type="button"
      data-map-layer-dock-action="toggle-layer"
      data-layer-id="${escapeAttribute(layer.layerId)}"
      data-layer-kind="${escapeAttribute(layer.kind)}"
      data-layer-empty="${layer.empty ? 'true' : 'false'}"
      aria-pressed="${pressed}"
      aria-label="${escapeAttribute(title)}"
      title="${escapeAttribute(title)}"
      ${disabled}
    >
      <span class="campaign-map-layer-row-icon">
        ${iconSvg(getLayerIcon(layer))}
      </span>
      <span class="campaign-map-layer-row-copy">
        <strong>${escapeHTML(layer.title)}</strong>
        <span>${escapeHTML(layer.detail)}</span>
      </span>
      <span class="campaign-map-layer-row-state">
        ${layer.locked ? iconSvg('settings') : iconSvg(layer.visible !== false ? 'eye' : 'eye-off')}
      </span>
    </button>
  `;
}


function getLayerIcon(
  layer
) {

  if (layer.kind === 'creature') return 'creature';
  if (layer.kind === 'object') return 'object';
  if (layer.kind === 'shape') return 'shapes';
  if (layer.kind === 'drawing') return 'edit';
  if (layer.kind === 'fog' || layer.kind === 'lockedFog') return 'fog';

  return 'grid';
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
