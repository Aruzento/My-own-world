import {
  iconSvg
} from '../core/icons.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  DEFAULT_GRID_SIZE
} from './campaignMapConstants.js';


export const MAP_SCENE_INSPECTOR_UI_MIGRATION =
  '0.0.1.8.12.5';


const inspectorDeps =
  new WeakMap();


export function ensureMapSceneInspector(
  map,
  deps = {}
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) return null;

  let inspector =
    stage.querySelector('.campaign-map-scene-inspector');

  if (!inspector) {

    inspector =
      document.createElement('section');

    inspector.className =
      'campaign-map-scene-inspector';

    inspector.dataset.mapSceneInspectorUiMigration =
      MAP_SCENE_INSPECTOR_UI_MIGRATION;

    inspector.setAttribute(
      'aria-label',
      'Состояние сцены карты'
    );

    inspector.setAttribute(
      'role',
      'complementary'
    );

    markRuntime(
      inspector
    );

    inspector.addEventListener(
      'pointerdown',
      event => {

        event.stopPropagation();
      }
    );

    inspector.addEventListener(
      'click',
      handleSceneInspectorClick
    );

    stage.appendChild(
      inspector
    );
  }

  inspectorDeps.set(
    inspector,
    deps
  );

  updateMapSceneInspector(
    map
  );

  return inspector;
}


export function updateMapSceneInspector(
  map
) {

  const inspector =
    map?.querySelector('.campaign-map-scene-inspector');

  if (!inspector) return;

  inspector.innerHTML =
    getSceneInspectorHTML(
      getSceneInspectorState(
        map
      )
    );
}


async function handleSceneInspectorClick(
  event
) {

  event.stopPropagation();

  const button =
    event.target.closest('[data-map-scene-action]');

  if (!button) return;

  event.preventDefault();

  const inspector =
    button.closest('.campaign-map-scene-inspector');

  const map =
    inspector?.closest('.campaign-map-document');

  if (!map) return;

  const deps =
    inspectorDeps.get(
      inspector
    ) || {};

  const action =
    button.dataset.mapSceneAction;

  if (action === 'change-map') {

    await deps.changeMapImage?.(
      map
    );

    updateMapSceneInspector(
      map
    );

    return;
  }

  if (action === 'open-grid') {

    deps.openGridPopup?.(
      map,
      button
    );

    return;
  }

  if (action === 'open-fog') {

    deps.openFogPopup?.(
      map,
      button
    );
  }
}


function getSceneInspectorState(
  map
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  const asset =
    stage?.dataset.mapAsset ||
    stage?.dataset.mapImage ||
    stage?.dataset.mapImageKey ||
    '';

  const gridEnabled =
    stage?.dataset.grid === 'true';

  const gridSize =
    getNumericDatasetValue(
      stage?.dataset.gridSize,
      DEFAULT_GRID_SIZE
    );

  const fogMode =
    stage?.dataset.fogMode || 'draw';

  const fogImage =
    stage?.dataset.fogImage || '';

  const tool =
    stage?.dataset.tool || 'pan';

  return {
    mode:
      getToolLabel(
        tool,
        fogMode
      ),
    items: [
      {
        action:
          'change-map',
        icon:
          'image',
        key:
          'asset',
        label:
          'Карта',
        title:
          'Сменить фон карты',
        tone:
          asset ? 'ready' : 'warning',
        value:
          asset
            ? getAssetLabel(
                asset
              )
            : 'нет фона'
      },
      {
        action:
          'open-grid',
        icon:
          'grid',
        key:
          'grid',
        label:
          'Сетка',
        pressed:
          gridEnabled,
        title:
          'Открыть настройки сетки',
        tone:
          gridEnabled ? 'info' : 'muted',
        value:
          gridEnabled
            ? `${gridSize} px`
            : 'выключена'
      },
      {
        action:
          'open-fog',
        icon:
          'fog',
        key:
          'fog',
        label:
          'Туман',
        title:
          'Открыть туман войны',
        tone:
          fogImage ? 'ready' : 'warning',
        value:
          `${fogImage ? 'есть' : 'пусто'} · ${getFogModeLabel(fogMode)}`
      }
    ]
  };
}


function getSceneInspectorHTML(
  state
) {

  return `
    <div class="campaign-map-scene-inspector-header">
      <span class="campaign-map-scene-inspector-icon">${iconSvg('campaign-map')}</span>
      <span class="campaign-map-scene-inspector-heading">
        <strong>Сцена</strong>
        <span>${escapeHTML(state.mode)}</span>
      </span>
    </div>
    <div class="campaign-map-scene-inspector-actions">
      ${state.items
        .map(getSceneInspectorActionHTML)
        .join('')}
    </div>
  `;
}


function getSceneInspectorActionHTML(
  item
) {

  const pressedAttribute =
    typeof item.pressed === 'boolean'
      ? ` aria-pressed="${item.pressed ? 'true' : 'false'}"`
      : '';

  return `
    <button
      class="campaign-map-scene-inspector-action"
      type="button"
      data-map-scene-action="${escapeAttribute(item.action)}"
      data-map-scene-key="${escapeAttribute(item.key)}"
      data-map-scene-state="${escapeAttribute(item.tone)}"
      title="${escapeAttribute(item.title)}"
      data-tooltip="${escapeAttribute(item.title)}"
      aria-label="${escapeAttribute(`${item.label}: ${item.value}`)}"${pressedAttribute}
    >
      <span class="campaign-map-scene-action-icon">${iconSvg(item.icon)}</span>
      <span class="campaign-map-scene-action-copy">
        <strong>${escapeHTML(item.label)}</strong>
        <span>${escapeHTML(item.value)}</span>
      </span>
    </button>
  `;
}


function getToolLabel(
  tool,
  fogMode
) {

  if (tool === 'pan') {

    return 'Режим: рука';
  }

  if (tool === 'draw' || tool === 'erase') {

    return `Режим: туман · ${getFogModeLabel(tool || fogMode)}`;
  }

  if (String(tool || '').startsWith('drawing-')) {

    return 'Режим: рисование';
  }

  return 'Режим: инструмент';
}


function getFogModeLabel(
  mode
) {

  return mode === 'erase'
    ? 'ластик'
    : 'кисть';
}


function getAssetLabel(
  asset
) {

  const normalized =
    String(asset || '')
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() || 'фон выбран';

  try {

    return decodeURIComponent(
      normalized
    );

  } catch {

    return normalized;
  }
}


function getNumericDatasetValue(
  value,
  fallback
) {

  const number =
    Number(
      value || fallback
    );

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function escapeAttribute(
  value
) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


function escapeHTML(
  value
) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
