import {
  iconSvg
} from '../core/icons.js';

import {
  markRuntime
} from './blocks/blockContract.js';

import {
  applyShapeRecordToElement,
  applyTokenRecordToElement
} from './campaignMapRenderAdapter.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  duplicateMapShape,
  duplicateTokenAndPage,
  openTokenCard,
  toggleMapItemPresentationVisibility
} from './campaignMapTokenActions.js';

import {
  updateMapLayerDock
} from './campaignMapLayerDock.js';


export const MAP_SELECTION_UI_MIGRATION =
  '0.0.1.8.12.3';


const dockDeps =
  new WeakMap();

const inspectedMaps =
  new WeakSet();


export function ensureMapSelectionInspector(
  map,
  deps
) {

  const stage =
    map?.querySelector('.campaign-map-stage');

  if (!stage) return null;

  let dock =
    stage.querySelector('.campaign-map-selection-dock');

  if (!dock) {

    dock =
      document.createElement('section');

    dock.className =
      'campaign-map-selection-dock hidden';

    dock.dataset.mapSelectionUiMigration =
      MAP_SELECTION_UI_MIGRATION;

    dock.setAttribute(
      'aria-label',
      'Выбранное на карте'
    );

    dock.setAttribute(
      'aria-live',
      'polite'
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
      handleDockClick
    );

    stage.appendChild(
      dock
    );
  }

  dockDeps.set(
    dock,
    deps
  );

  if (!inspectedMaps.has(map)) {

    map.addEventListener(
      'campaign-map-selection-change',
      () => updateMapSelectionInspector(
        map
      )
    );

    inspectedMaps.add(
      map
    );
  }

  updateMapSelectionInspector(
    map
  );

  return dock;
}


export function updateMapSelectionInspector(
  map
) {

  const dock =
    map
      ?.querySelector('.campaign-map-selection-dock');

  if (!dock) return;

  const selection =
    getSelection(
      map
    );

  if (!selection.total) {

    dock.classList.add(
      'hidden'
    );

    dock.setAttribute(
      'aria-hidden',
      'true'
    );

    dock.innerHTML =
      '';

    return;
  }

  dock.classList.remove(
    'hidden'
  );

  dock.removeAttribute(
    'aria-hidden'
  );

  dock.innerHTML =
    getSelectionDockHTML(
      selection
    );
}


async function handleDockClick(
  event
) {

  const button =
    event.target.closest('[data-map-selection-action]');

  event.stopPropagation();

  if (!button) return;

  event.preventDefault();

  const dock =
    button.closest('.campaign-map-selection-dock');

  const map =
    dock?.closest('.campaign-map-document');

  const deps =
    dockDeps.get(
      dock
    );

  if (!map || !deps) return;

  const action =
    button.dataset.mapSelectionAction;

  const selection =
    getSelection(
      map
    );

  const primary =
    getPrimarySelectionItem(
      selection
    );

  if (
    action === 'more' &&
    primary
  ) {

    deps.openTokenPopup?.(
      primary
    );

    return;
  }

  if (
    action === 'open' &&
    primary?.classList.contains('campaign-map-token')
  ) {

    await openTokenCard(
      primary,
      deps.getTokenActionDeps()
    );

    return;
  }

  if (
    action === 'visibility' &&
    primary
  ) {

    await toggleMapItemPresentationVisibility(
      primary,
      deps.getSelectionActionDeps()
    );

    deps.closeTokenPopup?.();
    updateMapSelectionInspector(
      map
    );
    updateMapLayerDock(
      map
    );

    return;
  }

  if (
    action === 'duplicate' &&
    primary
  ) {

    if (
      primary.classList.contains('campaign-map-shape')
    ) {

      await duplicateMapShape(
        primary,
        deps.getSelectionActionDeps()
      );

    } else {

      await duplicateTokenAndPage(
        primary,
        deps.getSelectionActionDeps()
      );
    }

    updateMapSelectionInspector(
      map
    );
    updateMapLayerDock(
      map
    );

    return;
  }

  if (
    action === 'hide-selection' ||
    action === 'show-selection'
  ) {

    const hidden =
      action === 'hide-selection';

    const count =
      setSelectedPresentationVisibility(
        map,
        selection,
        hidden
      );

    if (!count) return;

    deps.closeTokenPopup?.();
    await deps.saveAndSync?.();
    deps.setStatus?.(
      hidden
        ? `Скрыто от игроков: ${count}`
        : `Показано игрокам: ${count}`
    );

    updateMapSelectionInspector(
      map
    );
    updateMapLayerDock(
      map
    );

    return;
  }

  if (action === 'remove') {

    const count =
      deps.removeSelectedCampaignMapItems?.(
        map
      ) || 0;

    if (!count) return;

    deps.closeTokenPopup?.();
    await deps.saveAndSync?.();
    deps.setStatus?.(
      `Убрано с карты: ${count}`
    );

    updateMapSelectionInspector(
      map
    );
    updateMapLayerDock(
      map
    );
  }
}


function getSelection(
  map
) {

  const tokens =
    [
      ...map.querySelectorAll('.campaign-map-token.is-selected')
    ];

  const shapes =
    [
      ...map.querySelectorAll('.campaign-map-shape.is-selected')
    ];

  return {
    tokens,
    shapes,
    total:
      tokens.length + shapes.length
  };
}


function getSelectionDockHTML(
  selection
) {

  const primary =
    getPrimarySelectionItem(
      selection
    );

  const summary =
    selection.total === 1
      ? getSingleSelectionSummary(
        primary
      )
      : getMultiSelectionSummary(
        selection
      );

  return `
    <div class="campaign-map-selection-dock-header">
      <span class="campaign-map-selection-dock-icon">${iconSvg(summary.icon)}</span>
      <div class="campaign-map-selection-dock-heading">
        <strong>${escapeHTML(summary.title)}</strong>
        <span>${escapeHTML(summary.meta)}</span>
      </div>
    </div>
    <div class="campaign-map-selection-dock-stats">
      ${summary.stats.map(stat => `
        <span class="campaign-map-selection-stat" data-selection-stat="${escapeAttribute(stat.key)}">
          <span>${escapeHTML(stat.label)}</span>
          <strong>${escapeHTML(stat.value)}</strong>
        </span>
      `).join('')}
    </div>
    <div class="campaign-map-selection-dock-actions">
      ${getSelectionActionsHTML(selection, primary)}
    </div>
  `;
}


function getSelectionActionsHTML(
  selection,
  primary
) {

  if (selection.total > 1) {

    return getMultiSelectionActionsHTML(
      selection
    );
  }

  const hidden =
    primary?.dataset.presentationHidden === 'true';

  const actions =
    [
      primary?.classList.contains('campaign-map-token')
        ? {
          action:
            'open',
          icon:
            'document',
          label:
            'Открыть',
          title:
            'Открыть карточку'
        }
        : null,
      {
        action:
          'visibility',
        icon:
          hidden
            ? 'eye'
            : 'eye-off',
        label:
          hidden
            ? 'Показать'
            : 'Скрыть',
        title:
          hidden
            ? 'Показать игрокам'
            : 'Скрыть от игроков'
      },
      {
        action:
          'duplicate',
        icon:
          'copy',
        label:
          'Дубль',
        title:
          'Дублировать выбранное'
      },
      {
        action:
          'more',
        icon:
          'more',
        label:
          'Еще',
        title:
          'Открыть дополнительные действия'
      },
      {
        action:
          'remove',
        icon:
          'trash',
        label:
          'Убрать',
        title:
          'Убрать с карты',
        danger:
          true
      }
    ].filter(Boolean);

  return actions
    .map(getDockActionHTML)
    .join('');
}


function getMultiSelectionActionsHTML(
  selection
) {

  const hiddenCount =
    getHiddenSelectionItemCount(
      selection
    );

  const visibleCount =
    selection.total - hiddenCount;

  const actions =
    [
      visibleCount > 0
        ? {
          action:
            'hide-selection',
          icon:
            'eye-off',
          label:
            'Скрыть',
          title:
            'Скрыть выбранное от игроков'
        }
        : null,
      hiddenCount > 0
        ? {
          action:
            'show-selection',
          icon:
            'eye',
          label:
            'Показать',
          title:
            'Показать выбранное игрокам'
        }
        : null,
      {
        action:
          'remove',
        icon:
          'trash',
        label:
          'Убрать',
        title:
          'Убрать выбранное с карты',
        danger:
          true
      }
    ].filter(Boolean);

  return actions
    .map(getDockActionHTML)
    .join('');
}


function getDockActionHTML(
  action
) {

  return `
    <button
      class="campaign-map-selection-action ${action.danger ? 'is-danger' : ''}"
      type="button"
      data-map-selection-action="${escapeAttribute(action.action)}"
      title="${escapeAttribute(action.title)}"
      aria-label="${escapeAttribute(action.title)}"
    >
      ${iconSvg(action.icon)}
      <span>${escapeHTML(action.label)}</span>
    </button>
  `;
}


function getPrimarySelectionItem(
  selection
) {

  return selection.tokens[0] ||
    selection.shapes[0] ||
    null;
}


function getSingleSelectionSummary(
  item
) {

  if (
    item?.classList.contains('campaign-map-shape')
  ) {

    return getShapeSummary(
      item
    );
  }

  return getTokenSummary(
    item
  );
}


function getTokenSummary(
  token
) {

  const tokenType =
    token?.dataset.tokenType === 'object'
      ? 'object'
      : 'creature';

  const visible =
    token?.dataset.presentationHidden === 'true'
      ? 'Скрыт от игроков'
      : 'Виден игрокам';

  const stats =
    [
      {
        key:
          'type',
        label:
          'Тип',
        value:
          tokenType === 'object'
            ? 'Объект'
            : 'Существо'
      },
      {
        key:
          'visibility',
        label:
          'Игроки',
        value:
          visible
      }
    ];

  if (token?.dataset.hp || token?.dataset.hpMax) {

    stats.push({
      key:
        'hp',
      label:
        'HP',
      value:
        formatHealth(
          token
        )
    });
  }

  if (token?.dataset.armorClass) {

    stats.push({
      key:
        'armor',
      label:
        'AC',
      value:
        token.dataset.armorClass
    });
  }

  if (token?.dataset.speed) {

    stats.push({
      key:
        'speed',
      label:
        'Скорость',
      value:
        token.dataset.speed
    });
  }

  if (token?.dataset.effectsSummary) {

    stats.push({
      key:
        'effects',
      label:
        'Эффекты',
      value:
        token.dataset.effectsSummary
    });
  }

  return {
    icon:
      tokenType === 'object'
        ? 'object'
        : 'creature',
    title:
      token?.dataset.name ||
      (tokenType === 'object' ? 'Объект' : 'Существо'),
    meta:
      `${formatPosition(token)} · ${visible}`,
    stats:
      stats.slice(
        0,
        5
      )
  };
}


function getShapeSummary(
  shape
) {

  const visible =
    shape?.dataset.presentationHidden === 'true'
      ? 'Скрыта от игроков'
      : 'Видна игрокам';

  const label =
    getShapeTypeLabel(
      shape?.dataset.shapeType
    );

  return {
    icon:
      'shapes',
    title:
      label,
    meta:
      `${formatPosition(shape)} · ${visible}`,
    stats:
      [
        {
          key:
            'type',
          label:
            'Тип',
          value:
            label
        },
        {
          key:
            'size',
          label:
            'Размер',
          value:
            `${formatNumber(shape?.dataset.w || shape?.dataset.width)} x ${formatNumber(shape?.dataset.h || shape?.dataset.height)}`
        },
        {
          key:
            'visibility',
          label:
            'Игроки',
          value:
            visible
        }
      ]
  };
}


function getMultiSelectionSummary(
  selection
) {

  const hiddenCount =
    getHiddenSelectionItemCount(
      selection
    );

  const visibleCount =
    selection.total - hiddenCount;

  return {
    icon:
      'grid',
    title:
      `Выбрано: ${selection.total}`,
    meta:
      `Токены ${selection.tokens.length} · Фигуры ${selection.shapes.length} · ${hiddenCount} скрыто`,
    stats:
      [
        {
          key:
            'tokens',
          label:
            'Токены',
          value:
            String(selection.tokens.length)
        },
        {
          key:
            'shapes',
          label:
            'Фигуры',
          value:
            String(selection.shapes.length)
        },
        {
          key:
            'visible',
          label:
            'Видно',
          value:
            String(visibleCount)
        },
        {
          key:
            'hidden',
          label:
            'Скрыто',
          value:
            String(hiddenCount)
        }
      ]
  };
}


function setSelectedPresentationVisibility(
  map,
  selection,
  hidden
) {

  const store =
    getCampaignMapStore(
      map
    );

  if (!store) return 0;

  let changed =
    0;

  selection.tokens.forEach(token => {

    if (
      setTokenPresentationVisibility(
        store,
        token,
        hidden
      )
    ) {

      changed += 1;
    }
  });

  selection.shapes.forEach(shape => {

    if (
      setShapePresentationVisibility(
        store,
        shape,
        hidden
      )
    ) {

      changed += 1;
    }
  });

  return changed;
}


function setTokenPresentationVisibility(
  store,
  token,
  hidden
) {

  if (
    !token?.dataset?.tokenId ||
    isPresentationHidden(
      token
    ) === hidden
  ) return false;

  const record =
    store.updateToken(
      token.dataset.tokenId,
      {
        presentationHidden:
          hidden
      }
    );

  applyTokenRecordToElement(
    token,
    record
  );

  token.classList.toggle(
    'is-presentation-hidden',
    hidden
  );

  return Boolean(record);
}


function setShapePresentationVisibility(
  store,
  shape,
  hidden
) {

  if (
    !shape?.dataset?.shapeId ||
    isPresentationHidden(
      shape
    ) === hidden
  ) return false;

  const record =
    store.updateShape(
      shape.dataset.shapeId,
      {
        presentationHidden:
          hidden
      }
    );

  applyShapeRecordToElement(
    shape,
    record
  );

  shape.classList.toggle(
    'is-presentation-hidden',
    hidden
  );

  return Boolean(record);
}


function getHiddenSelectionItemCount(
  selection
) {

  return getSelectionItems(
    selection
  ).filter(isPresentationHidden)
    .length;
}


function getSelectionItems(
  selection
) {

  return [
    ...selection.tokens,
    ...selection.shapes
  ];
}


function isPresentationHidden(
  item
) {

  return item?.dataset?.presentationHidden === 'true';
}


function formatHealth(
  token
) {

  const current =
    token.dataset.hp || '0';

  const max =
    token.dataset.hpMax || '0';

  const temp =
    Number(
      token.dataset.hpTemp || 0
    );

  return temp > 0
    ? `${current}/${max} +${temp}`
    : `${current}/${max}`;
}


function formatPosition(
  item
) {

  return `${formatNumber(item?.dataset.x)}%, ${formatNumber(item?.dataset.y)}%`;
}


function formatNumber(
  value
) {

  const number =
    Number(
      value
    );

  if (!Number.isFinite(number)) return '0';

  return String(
    Math.round(number * 10) / 10
  );
}


function getShapeTypeLabel(
  type
) {

  const labels = {
    circle:
      'Круг',
    fill:
      'Заливка',
    freehand:
      'Рисование',
    line:
      'Линия',
    square:
      'Квадрат',
    triangle:
      'Треугольник'
  };

  return labels[type] ||
    'Фигура';
}


function escapeHTML(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );
}
