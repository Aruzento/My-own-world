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
  renderMapShape
} from './campaignMapShapes.js';

import {
  applyTokenRotation,
  applyTokenSize,
  positionToken
} from './campaignMapTokens.js';

import {
  scheduleLivePresentationSync
} from './campaignMapPresentationSync.js';

import {
  duplicateMapShape,
  duplicateTokenAndPage,
  openTokenCard,
  toggleMapItemPresentationVisibility
} from './campaignMapTokenActions.js';


export const MAP_SELECTION_UI_MIGRATION =
  '0.0.1.8.12.8';


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
      'campaign-map-selection-dock campaign-map-properties-panel hidden';

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

    dock.addEventListener(
      'input',
      handleDockPropertyInput
    );

    dock.addEventListener(
      'change',
      handleDockPropertyInput
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
  }
}


async function handleDockPropertyInput(
  event
) {

  const field =
    event.target.closest('[data-map-property]');

  if (!field) return;

  if (
    event.type === 'input' &&
    (
      field.type === 'checkbox' ||
      field.tagName === 'SELECT'
    )
  ) return;

  const dock =
    field.closest('.campaign-map-selection-dock');

  const map =
    dock?.closest('.campaign-map-document');

  const deps =
    dockDeps.get(
      dock
    );

  if (!map || !deps) return;

  const selection =
    getSelection(
      map
    );

  if (selection.total !== 1) return;

  const primary =
    getPrimarySelectionItem(
      selection
    );

  const changed =
    applySelectionProperty(
      map,
      primary,
      field.dataset.mapProperty,
      getPropertyFieldValue(
        field
      )
    );

  if (!changed) return;

  deps.closeTokenPopup?.();

  syncPropertyPanelHeader(
    dock,
    primary
  );

  await deps.saveAndSync?.();
}


function applySelectionProperty(
  map,
  item,
  property,
  value
) {

  if (
    item?.classList.contains('campaign-map-shape')
  ) {

    return applyShapeProperty(
      map,
      item,
      property,
      value
    );
  }

  return applyTokenProperty(
    map,
    item,
    property,
    value
  );
}


function applyTokenProperty(
  map,
  token,
  property,
  value
) {

  if (!token?.dataset?.tokenId) return false;

  const patch =
    getTokenPropertyPatch(
      property,
      value
    );

  if (!patch) return false;

  const store =
    getCampaignMapStore(
      map
    );

  const record =
    store?.updateToken(
      token.dataset.tokenId,
      patch
    );

  if (!record) return false;

  applyTokenRecordToElement(
    token,
    record
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

  token.classList.add(
    'is-selected'
  );

  scheduleLivePresentationSync({
    map,
    itemType:
      'token',
    itemId:
      token.dataset.tokenId
  });

  return true;
}


function applyShapeProperty(
  map,
  shape,
  property,
  value
) {

  if (!shape?.dataset?.shapeId) return false;

  const patch =
    getShapePropertyPatch(
      property,
      value
    );

  if (!patch) return false;

  const store =
    getCampaignMapStore(
      map
    );

  const record =
    store?.updateShape(
      shape.dataset.shapeId,
      patch
    );

  if (!record) return false;

  applyShapeRecordToElement(
    shape,
    record
  );

  renderMapShape(
    shape
  );

  shape.classList.add(
    'is-selected'
  );

  scheduleLivePresentationSync({
    map,
    itemType:
      'shape',
    itemId:
      shape.dataset.shapeId
  });

  return true;
}


function getTokenPropertyPatch(
  property,
  value
) {

  switch (property) {

    case 'token-name':
      return {
        name:
          String(value || '').trim()
      };

    case 'token-x':
      return {
        x:
          normalizeNumberFieldValue(
            value
          )
      };

    case 'token-y':
      return {
        y:
          normalizeNumberFieldValue(
            value
          )
      };

    case 'token-size':
      return {
        size:
          normalizeNumberFieldValue(
            value,
            1
          )
      };

    case 'token-rotation':
      return {
        rotation:
          normalizeNumberFieldValue(
            value
          )
      };

    case 'item-visible':
      return {
        presentationHidden:
          !value
      };

    default:
      return null;
  }
}


function getShapePropertyPatch(
  property,
  value
) {

  switch (property) {

    case 'shape-type':
      return {
        type:
          ['square', 'circle', 'triangle'].includes(value)
            ? value
            : 'square'
      };

    case 'shape-x':
      return {
        x:
          normalizeNumberFieldValue(
            value
          )
      };

    case 'shape-y':
      return {
        y:
          normalizeNumberFieldValue(
            value
          )
      };

    case 'shape-width':
      return {
        width:
          normalizeNumberFieldValue(
            value,
            80
          )
      };

    case 'shape-height':
      return {
        height:
          normalizeNumberFieldValue(
            value,
            80
          )
      };

    case 'shape-rotation':
      return {
        rotation:
          normalizeNumberFieldValue(
            value
          )
      };

    case 'shape-stroke-color':
      return {
        strokeColor:
          getHexColorValue(
            value,
            '#fff4d6'
          )
      };

    case 'shape-fill-color':
      return {
        fillColor:
          getHexColorValue(
            value,
            '#f1d38e'
          )
      };

    case 'shape-stroke-width':
      return {
        strokeWidth:
          normalizeNumberFieldValue(
            value,
            3
          )
      };

    case 'item-visible':
      return {
        presentationHidden:
          !value
      };

    default:
      return null;
  }
}


function getPropertyFieldValue(
  field
) {

  if (field.type === 'checkbox') {

    return field.checked;
  }

  return field.value;
}


function syncPropertyPanelHeader(
  dock,
  item
) {

  const summary =
    getSingleSelectionSummary(
      item
    );

  const heading =
    dock.querySelector('.campaign-map-selection-dock-heading');

  const title =
    heading?.querySelector('strong');

  const meta =
    heading?.querySelector('small');

  if (title) {

    title.textContent =
      summary.title;
  }

  if (meta) {

    meta.textContent =
      summary.meta;
  }
}


function normalizeNumberFieldValue(
  value,
  fallback = 0
) {

  const number =
    Number(
      value
    );

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
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
        <span>Inspector</span>
        <strong>${escapeHTML(summary.title)}</strong>
        <small>${escapeHTML(summary.meta)}</small>
      </div>
    </div>
    <div class="campaign-map-properties-panel-body">
      ${
        selection.total === 1
          ? getSingleSelectionPropertiesHTML(primary)
          : getMultiSelectionPropertiesHTML(selection, summary)
      }
    </div>
    <div class="campaign-map-selection-dock-actions">
      ${getSelectionActionsHTML(selection, primary)}
    </div>
  `;
}


function getSingleSelectionPropertiesHTML(
  item
) {

  if (
    item?.classList.contains('campaign-map-shape')
  ) {

    return getShapePropertiesHTML(
      item
    );
  }

  return getTokenPropertiesHTML(
    item
  );
}


function getTokenPropertiesHTML(
  token
) {

  const visible =
    token?.dataset.presentationHidden !== 'true';

  return `
    ${getPropertySectionHTML({
      title: 'Основное',
      key: 'identity',
      children: `
        ${getTextPropertyFieldHTML({
          property: 'token-name',
          label: 'Название',
          value: token?.dataset.name || ''
        })}
      `
    })}
    ${getPropertySectionHTML({
      title: 'Transform',
      key: 'transform',
      children: `
        <div class="campaign-map-property-grid">
          ${getNumberPropertyFieldHTML({
            property: 'token-x',
            label: 'X',
            value: formatNumber(token?.dataset.x),
            min: 0,
            max: 100,
            step: 0.1,
            suffix: '%'
          })}
          ${getNumberPropertyFieldHTML({
            property: 'token-y',
            label: 'Y',
            value: formatNumber(token?.dataset.y),
            min: 0,
            max: 100,
            step: 0.1,
            suffix: '%'
          })}
          ${getNumberPropertyFieldHTML({
            property: 'token-size',
            label: 'Размер',
            value: formatNumber(token?.dataset.size || 1),
            min: 0.1,
            max: 8,
            step: 0.1
          })}
          ${getNumberPropertyFieldHTML({
            property: 'token-rotation',
            label: 'Поворот',
            value: formatNumber(token?.dataset.rotation || 0),
            min: -360,
            max: 360,
            step: 1,
            suffix: '°'
          })}
        </div>
      `
    })}
    ${getPropertySectionHTML({
      title: 'Отображение',
      key: 'display',
      children: getBooleanPropertyFieldHTML({
        property: 'item-visible',
        label: 'Видно игрокам',
        checked: visible
      })
    })}
  `;
}


function getShapePropertiesHTML(
  shape
) {

  const visible =
    shape?.dataset.presentationHidden !== 'true';

  return `
    ${getPropertySectionHTML({
      title: 'Основное',
      key: 'identity',
      children: getSelectPropertyFieldHTML({
        property: 'shape-type',
        label: 'Тип',
        value: shape?.dataset.shapeType || 'square',
        options: [
          ['square', 'Квадрат'],
          ['circle', 'Круг'],
          ['triangle', 'Треугольник']
        ]
      })
    })}
    ${getPropertySectionHTML({
      title: 'Transform',
      key: 'transform',
      children: `
        <div class="campaign-map-property-grid">
          ${getNumberPropertyFieldHTML({
            property: 'shape-x',
            label: 'X',
            value: formatNumber(shape?.dataset.x),
            min: 0,
            max: 4096,
            step: 1
          })}
          ${getNumberPropertyFieldHTML({
            property: 'shape-y',
            label: 'Y',
            value: formatNumber(shape?.dataset.y),
            min: 0,
            max: 4096,
            step: 1
          })}
          ${getNumberPropertyFieldHTML({
            property: 'shape-width',
            label: 'W',
            value: formatNumber(shape?.dataset.w),
            min: 1,
            max: 4096,
            step: 1
          })}
          ${getNumberPropertyFieldHTML({
            property: 'shape-height',
            label: 'H',
            value: formatNumber(shape?.dataset.h),
            min: 1,
            max: 4096,
            step: 1
          })}
          ${getNumberPropertyFieldHTML({
            property: 'shape-rotation',
            label: 'Поворот',
            value: formatNumber(shape?.dataset.rotation || 0),
            min: -360,
            max: 360,
            step: 1,
            suffix: '°',
            wide: true
          })}
        </div>
      `
    })}
    ${getPropertySectionHTML({
      title: 'Стиль',
      key: 'style',
      children: `
        <div class="campaign-map-property-grid">
          ${getColorPropertyFieldHTML({
            property: 'shape-stroke-color',
            label: 'Контур',
            value: getHexColorValue(shape?.dataset.strokeColor, '#fff4d6')
          })}
          ${getColorPropertyFieldHTML({
            property: 'shape-fill-color',
            label: 'Заливка',
            value: getHexColorValue(shape?.dataset.fillColor, '#f1d38e')
          })}
          ${getNumberPropertyFieldHTML({
            property: 'shape-stroke-width',
            label: 'Толщина',
            value: formatNumber(shape?.dataset.strokeWidth || 3),
            min: 1,
            max: 24,
            step: 1,
            wide: true
          })}
        </div>
      `
    })}
    ${getPropertySectionHTML({
      title: 'Отображение',
      key: 'display',
      children: getBooleanPropertyFieldHTML({
        property: 'item-visible',
        label: 'Видно игрокам',
        checked: visible
      })
    })}
  `;
}


function getMultiSelectionPropertiesHTML(
  selection,
  summary
) {

  return `
    ${getPropertySectionHTML({
      title: 'Группа',
      key: 'group',
      children: `
        <div class="campaign-map-selection-dock-stats">
          ${summary.stats.map(stat => `
            <span class="campaign-map-selection-stat" data-selection-stat="${escapeAttribute(stat.key)}">
              <span>${escapeHTML(stat.label)}</span>
              <strong>${escapeHTML(stat.value)}</strong>
            </span>
          `).join('')}
        </div>
        <p class="campaign-map-property-note">
          ${escapeHTML(`Выбрано объектов: ${selection.total}. Групповые действия ниже применяются ко всему выбору.`)}
        </p>
      `
    })}
  `;
}


function getPropertySectionHTML({
  title,
  key,
  children
}) {

  return `
    <section class="campaign-map-property-section" data-map-property-section="${escapeAttribute(key)}">
      <h3>${escapeHTML(title)}</h3>
      ${children}
    </section>
  `;
}


function getTextPropertyFieldHTML({
  property,
  label,
  value
}) {

  return `
    <label class="campaign-map-property-field is-wide">
      <span>${escapeHTML(label)}</span>
      <input
        type="text"
        value="${escapeAttribute(value)}"
        data-map-property="${escapeAttribute(property)}"
      >
    </label>
  `;
}


function getNumberPropertyFieldHTML({
  property,
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  wide = false
}) {

  return `
    <label class="campaign-map-property-field ${wide ? 'is-wide' : ''}">
      <span>${escapeHTML(label)}</span>
      <span class="campaign-map-property-input-shell">
        <input
          type="number"
          value="${escapeAttribute(value)}"
          min="${escapeAttribute(min)}"
          max="${escapeAttribute(max)}"
          step="${escapeAttribute(step)}"
          data-map-property="${escapeAttribute(property)}"
        >
        ${suffix ? `<em>${escapeHTML(suffix)}</em>` : ''}
      </span>
    </label>
  `;
}


function getColorPropertyFieldHTML({
  property,
  label,
  value
}) {

  return `
    <label class="campaign-map-property-field">
      <span>${escapeHTML(label)}</span>
      <input
        type="color"
        value="${escapeAttribute(value)}"
        data-map-property="${escapeAttribute(property)}"
      >
    </label>
  `;
}


function getBooleanPropertyFieldHTML({
  property,
  label,
  checked
}) {

  return `
    <label class="campaign-map-property-toggle">
      <input
        type="checkbox"
        data-map-property="${escapeAttribute(property)}"
        ${checked ? 'checked' : ''}
      >
      <span>${escapeHTML(label)}</span>
    </label>
  `;
}


function getSelectPropertyFieldHTML({
  property,
  label,
  value,
  options
}) {

  return `
    <label class="campaign-map-property-field is-wide">
      <span>${escapeHTML(label)}</span>
      <select data-map-property="${escapeAttribute(property)}">
        ${options.map(([optionValue, optionLabel]) => `
          <option
            value="${escapeAttribute(optionValue)}"
            ${optionValue === value ? 'selected' : ''}
          >
            ${escapeHTML(optionLabel)}
          </option>
        `).join('')}
      </select>
    </label>
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
      data-tooltip="${escapeAttribute(action.title)}"
    >
      ${iconSvg(action.icon)}
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
      `${formatShapePosition(shape)} · ${visible}`,
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


function formatShapePosition(
  item
) {

  return `X ${formatNumber(item?.dataset.x)}, Y ${formatNumber(item?.dataset.y)}`;
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


function getHexColorValue(
  value,
  fallback
) {

  const color =
    String(value || '').trim();

  return /^#[0-9a-f]{6}$/i.test(
    color
  )
    ? color
    : fallback;
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
