import {
  iconSvg
} from '../core/icons.js';

import {
  escapeHTML
} from '../taskTracker/taskTrackerEscapeHTML.js';

import {
  getKnowledgeGraphCanvasDomainDefinitions
} from './knowledgeGraph.js';

import {
  getRelationshipLabel
} from './knowledgeGraphLabels.js';


const KNOWLEDGE_GRAPH_VIEW_PRESETS =
  [
    {
      value: 'standard',
      label: 'Стандартный вид',
      relationshipType: 'all',
      orphanOnly: false
    },
    {
      value: 'tree',
      label: 'В дереве',
      relationshipType: 'treeParent',
      orphanOnly: false
    },
    {
      value: 'wiki',
      label: 'Wiki-ссылки',
      relationshipType: 'wikiLink',
      orphanOnly: false
    },
    {
      value: 'manual',
      label: 'Ручные связи',
      relationshipType: 'manual',
      orphanOnly: false
    },
    {
      value: 'all',
      label: 'Все связи',
      relationshipType: 'all',
      orphanOnly: false
    },
    {
      value: 'orphans',
      label: 'Одинокие',
      relationshipType: 'all',
      orphanOnly: true
    }
  ];


export function getCanvasFilterBarHTML(
  graph,
  canvasModel,
  options = {}
) {

  const statusDetailText =
    getCanvasFilterStatusDetailText(
      graph,
      canvasModel,
      options
    );

  return `
    <div class="knowledge-graph-canvas-filterbar">
      <label>
        <span>Вид</span>
        <select data-knowledge-graph-filter="viewPreset">
          ${getCanvasViewPresetOptionsHTML(canvasModel.filters)}
        </select>
      </label>
      <label>
        <span>Тип</span>
        <select data-knowledge-graph-filter="domain">
          <option value="all"${canvasModel.filters.domain === 'all' ? ' selected' : ''}>Все</option>
          ${getKnowledgeGraphCanvasDomainDefinitions()
            .map(domain => `
              <option value="${escapeHTML(domain.key)}"${canvasModel.filters.domain === domain.key ? ' selected' : ''}>
                ${escapeHTML(domain.label)}
              </option>
            `)
            .join('')}
        </select>
      </label>
      <label>
        <span>Связь</span>
        <select data-knowledge-graph-filter="relationshipType">
          <option value="all"${canvasModel.filters.relationshipType === 'all' ? ' selected' : ''}>Все</option>
          ${getRelationshipTypeOptionsHTML(graph, canvasModel.filters.relationshipType)}
        </select>
      </label>
      <label class="knowledge-graph-canvas-filterbar-search">
        <span>Поиск</span>
        <input
          type="search"
          data-knowledge-graph-filter="search"
          placeholder="тег или название"
          value="${escapeHTML(canvasModel.filters.search || '')}"
        >
      </label>
      <button
        type="button"
        class="knowledge-graph-filter-toggle mow-icon-button${canvasModel.filters.orphanOnly ? ' is-active' : ''}"
        data-size="sm"
        data-knowledge-graph-filter-action="orphans"
        aria-pressed="${canvasModel.filters.orphanOnly ? 'true' : 'false'}"
        aria-label="Одинокие страницы"
        title="Одинокие страницы"
      >
        ${iconSvg('eye-off', 'knowledge-graph-toolbar-icon')}
      </button>
      <button
        type="button"
        class="mow-icon-button"
        data-size="sm"
        data-knowledge-graph-filter-action="clear"
        aria-label="Сбросить фильтры"
        title="Сбросить фильтры"
      >
        ×
      </button>
      <span
        class="knowledge-graph-canvas-filterbar-status"
        data-knowledge-graph-filter-status
        aria-label="${escapeHTML(statusDetailText)}"
        title="${escapeHTML(statusDetailText)}"
      >
        ${escapeHTML(getCanvasFilterStatusText(canvasModel))}
      </span>
      ${getCanvasSliceStatsHTML(canvasModel)}
    </div>
  `;
}


export function getCanvasSliceSummaryLabel(
  canvasModel
) {

  return `Показано ${canvasModel.visibleNodeCount} из ${canvasModel.totalNodeCount}; скрыто ${canvasModel.hiddenTotalNodeCount}`;
}


export function getCanvasHiddenReasonLabels(
  canvasModel
) {

  const reasons =
    [];

  if (canvasModel.hiddenByFilterNodeCount > 0) {

    reasons.push(
      `фильтры скрыли ${canvasModel.hiddenByFilterNodeCount}`
    );
  }

  if (canvasModel.hiddenBySliceNodeCount > 0) {

    reasons.push(
      `вне среза ${canvasModel.hiddenBySliceNodeCount}`
    );
  }

  if (canvasModel.hiddenByLimitNodeCount > 0) {

    reasons.push(
      `лимит скрыл ${canvasModel.hiddenByLimitNodeCount}`
    );
  }

  return reasons;
}


export function getCanvasLayoutButtonHTML(
  layout,
  label,
  activeLayout
) {

  return `
    <button
      class="knowledge-graph-layout-button mow-icon-button${activeLayout === layout ? ' is-active' : ''}"
      data-size="sm"
      type="button"
      data-knowledge-graph-layout="${escapeHTML(layout)}"
      aria-pressed="${activeLayout === layout ? 'true' : 'false'}"
      aria-label="${escapeHTML(label)}"
      title="${escapeHTML(label)}"
    >
      ${iconSvg(getCanvasLayoutIcon(layout), 'knowledge-graph-toolbar-icon')}
    </button>
  `;
}


export function getKnowledgeGraphViewPreset(
  value
) {

  return KNOWLEDGE_GRAPH_VIEW_PRESETS.find(preset =>
    preset.value === value
  ) ||
    KNOWLEDGE_GRAPH_VIEW_PRESETS[0];
}


function getCanvasSliceStatsHTML(
  canvasModel
) {

  const totalNodes =
    Math.max(
      Number(canvasModel.totalNodeCount) || 0,
      1
    );

  const visiblePercent =
    Math.max(
      0,
      Math.min(
        100,
        Math.round((canvasModel.visibleNodeCount / totalNodes) * 100)
      )
    );

  const hiddenPercent =
    Math.max(
      0,
      100 - visiblePercent
    );

  return `
    <div
      class="knowledge-graph-canvas-slice-stats"
      data-knowledge-graph-slice-stats
      aria-label="${escapeHTML(getCanvasSliceSummaryLabel(canvasModel))}"
      title="${escapeHTML(getCanvasSliceSummaryLabel(canvasModel))}"
    >
      ${getCanvasSliceStatHTML('shown', canvasModel.visibleNodeCount, 'Показано', visiblePercent)}
      ${getCanvasSliceStatHTML('hidden', canvasModel.hiddenTotalNodeCount, 'Скрыто', hiddenPercent)}
      ${getCanvasSliceStatHTML('total', canvasModel.totalNodeCount, 'Всего', 0)}
    </div>
  `;
}


function getCanvasSliceStatHTML(
  key,
  value,
  label,
  percent
) {

  return `
    <span
      class="knowledge-graph-canvas-slice-stat"
      data-knowledge-graph-slice-stat="${escapeHTML(key)}"
      style="--graph-slice-part: ${escapeHTML(percent)}%; --graph-slice-min: ${percent > 0 ? '8px' : '0px'};"
      aria-label="${escapeHTML(`${label}: ${value}`)}"
      title="${escapeHTML(`${label}: ${value}`)}"
    >
      <span class="knowledge-graph-visually-hidden">${escapeHTML(value)}</span>
    </span>
  `;
}


function getCanvasViewPresetOptionsHTML(
  filters
) {

  const currentPreset =
    getCanvasViewPresetValue(
      filters
    );

  return KNOWLEDGE_GRAPH_VIEW_PRESETS
    .map(preset => `
      <option value="${escapeHTML(preset.value)}"${preset.value === currentPreset ? ' selected' : ''}>
        ${escapeHTML(preset.label)}
      </option>
    `)
    .join('');
}


function getCanvasViewPresetValue(
  filters
) {

  if (filters.viewPreset === 'all') return 'all';

  if (filters.orphanOnly) return 'orphans';

  if (filters.relationshipType === 'treeparent') return 'tree';

  if (filters.relationshipType === 'wikilink') return 'wiki';

  if (filters.relationshipType === 'manual') return 'manual';

  if (filters.relationshipType === 'all') return 'standard';

  return 'all';
}


function getCanvasFilterStatusText(
  canvasModel
) {

  const filters =
    canvasModel.filters;

  if (filters.search) return 'Поиск';

  if (filters.focusNodeId) return 'Соседи';

  if (
    filters.orphanOnly ||
    filters.domain !== 'all' ||
    filters.relationshipType !== 'all'
  ) {

    return 'Фильтр';
  }

  if (
    canvasModel.hiddenTotalNodeCount > 0 ||
    canvasModel.hiddenTotalEdgeCount > 0
  ) {

    return 'Фрагмент';
  }

  return 'Весь граф';
}


function getCanvasFilterStatusDetailText(
  graph,
  canvasModel,
  options = {}
) {

  const filters =
    canvasModel.filters;

  const getPageTitle =
    typeof options.getPageTitle === 'function'
      ? options.getPageTitle
      : pageId => pageId;

  const parts =
    [];

  if (filters.orphanOnly) {

    parts.push('одинокие страницы');
  }

  if (filters.domain !== 'all') {

    parts.push(
      getCanvasDomainFilterLabel(
        filters.domain
      )
    );
  }

  if (filters.relationshipType !== 'all') {

    parts.push(
      getCanvasRelationshipFilterLabel(
        graph,
        filters.relationshipType
      )
    );
  }

  if (filters.search) {

    parts.push(
      `поиск: ${filters.search}`
    );
  }

  if (filters.focusNodeId) {

    parts.push(
      `соседи: ${getPageTitle(filters.focusNodeId)}`
    );
  }

  const base =
    parts.length > 0
      ? `Показано: ${parts.join(' · ')}`
      : canvasModel.filterSummary.text || 'Стандартный вид';

  const hiddenReasons =
    getCanvasHiddenReasonLabels(
      canvasModel
    );

  const hiddenText =
    hiddenReasons.length > 0
      ? ` · ${hiddenReasons.join(' · ')}`
      : '';

  return `${base} · показано ${canvasModel.visibleNodeCount} из ${canvasModel.totalNodeCount} узл.${hiddenText}`;
}


function getCanvasDomainFilterLabel(
  domainKey
) {

  return getKnowledgeGraphCanvasDomainDefinitions()
    .find(domain =>
      domain.key === domainKey
    )
    ?.label ||
    domainKey;
}


function getCanvasRelationshipFilterLabel(
  graph,
  relationshipType
) {

  const originalType =
    (graph?.edges || [])
      .map(edge => edge.type)
      .find(type =>
        String(type || '').trim().toLowerCase() === relationshipType
      ) ||
    relationshipType;

  return getRelationshipLabel(
    originalType
  );
}


function getRelationshipTypeOptionsHTML(
  graph,
  activeType
) {

  return [...new Set(
    (graph?.edges || [])
      .map(edge => edge.type)
      .filter(Boolean)
  )]
    .sort((left, right) =>
      getRelationshipLabel(left).localeCompare(
        getRelationshipLabel(right),
        'ru'
      )
    )
    .map(type => {

      const normalizedType =
        String(type || '')
          .trim()
          .toLowerCase();

      return `
        <option value="${escapeHTML(type)}"${activeType === normalizedType ? ' selected' : ''}>
          ${escapeHTML(getRelationshipLabel(type))}
        </option>
      `;
    })
    .join('');
}


function getCanvasLayoutIcon(
  layout
) {

  if (layout === 'domain') return 'grid';

  if (layout === 'hub') return 'link';

  return 'folder';
}
