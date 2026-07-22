import {
  state
} from '../state.js';

import {
  formatRelationshipsFrontMatter
} from '../core/markdown.js';

import {
  notifyPageUpdated
} from '../repository/pageRepository.js';

import {
  writePageContent
} from '../storage/storage.js';

import {
  escapeHTML
} from '../taskTracker/taskTrackerEscapeHTML.js';

import {
  setStatus
} from '../ui/ui.js';

import {
  openPopupAtPoint,
  registerPopup
} from '../ui/popupManager.js';

import {
  buildKnowledgeGraphCanvasModel,
  buildKnowledgeGraph,
  getKnowledgeGraphCanvasDomainDefinitions,
  getKnowledgeGraphDomainDefinitions,
  getKnowledgeGraphDomainEdges,
  getOrphanGraphPages
} from './knowledgeGraph.js';


const GRAPH_CANVAS_MIN_SCALE =
  0.45;

const GRAPH_CANVAS_MAX_SCALE =
  2.2;

const GRAPH_CANVAS_ZOOM_STEP =
  0.18;

const GRAPH_CANVAS_EXPAND_PADDING =
  520;

const GRAPH_CANVAS_LEADING_EXPAND_PADDING =
  120;

const GRAPH_CANVAS_HISTORY_LIMIT =
  80;

const KNOWLEDGE_GRAPH_VIEW_STATE_VERSION =
  1;

const graphCanvasHistoryByDocument =
  new WeakMap();

const graphCanvasKeyboardHandlersByDocument =
  new WeakMap();

const graphNodeMenuControllersByDocument =
  new WeakMap();

const graphConnectPopupControllersByDocument =
  new WeakMap();

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

const RELATIONSHIP_LABELS = {
  treeParent: 'В дереве',
  wikiLink: 'Wiki-ссылка',
  manual: 'Ручные связи',
  manualRelation: 'Связь',
  related: 'Связь',
  ally: 'Союзник',
  enemy: 'Враг',
  owner: 'Владеет',
  equipped: 'Экипировано',
  rule: 'Правило',
  ruleeffect: 'Эффект правила'
};

const EDITABLE_RELATIONSHIP_TYPES = [
  {
    value: 'related',
    label: 'Связь'
  },
  {
    value: 'ally',
    label: 'Союзник'
  },
  {
    value: 'enemy',
    label: 'Враг'
  },
  {
    value: 'owner',
    label: 'Владеет'
  },
  {
    value: 'equipped',
    label: 'Экипировано'
  },
  {
    value: 'rule',
    label: 'Правило'
  },
  {
    value: 'ruleEffect',
    label: 'Эффект правила'
  }
];


export function isKnowledgeGraphPage(
  parsedOrPage
) {

  return (
    parsedOrPage?.template === 'knowledgeGraph' ||
    parsedOrPage?.type === 'knowledgeGraph' ||
    (parsedOrPage?.tags || []).includes('knowledge-graph')
  );
}


export function renderKnowledgeGraphPage(
  editor
) {

  const documentElement =
    editor.querySelector(
      '.knowledge-graph-document'
    );

  if (!documentElement) return;

  documentElement.tabIndex =
    -1;

  const graph =
    buildKnowledgeGraph(
      state.pages
    );

  const layout =
    documentElement.dataset.currentKnowledgeGraphLayout ||
    'tree';

  const filters =
    getRuntimeGraphFilters(
      documentElement
    );

  const viewState =
    readKnowledgeGraphViewState(
      documentElement
    );

  const connectState =
    getRuntimeGraphConnectState(
      documentElement
    );

  documentElement.removeAttribute(
    'data-knowledge-graph-layout'
  );

  documentElement
    .querySelectorAll(
      '.knowledge-graph-runtime'
    )
    .forEach(element => element.remove());

  documentElement.insertAdjacentHTML(
    'beforeend',
    getKnowledgeGraphHTML(
      graph,
      layout,
      filters,
      viewState,
      connectState
    )
  );

  setupKnowledgeGraphOverlays(
    documentElement
  );

  setupKnowledgeGraphEvents(
    documentElement
  );

  initializeKnowledgeGraphCanvases(
    documentElement
  );

  updateGraphCanvasHistoryControls(
    documentElement
  );
}


export function serializeKnowledgeGraphHTML(
  editor
) {

  const graphDocument =
    editor.querySelector(
      '.knowledge-graph-document'
    );

  if (!graphDocument) return '';

  const clone =
    graphDocument.cloneNode(
      true
    );

  clone.removeAttribute(
    'data-knowledge-graph-ready'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-layout'
  );

  clone.removeAttribute(
    'data-knowledge-graph-layout'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-filter-domain'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-filter-relationship'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-filter-search'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-filter-orphans'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-focus-node'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-view-preset'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-connect-source'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-connect-type'
  );

  clone.removeAttribute(
    'data-current-knowledge-graph-connect-target'
  );

  clone
    .querySelectorAll(
      '.knowledge-graph-runtime, [data-runtime="true"]'
    )
    .forEach(element => element.remove());

  return clone.outerHTML;
}


function readKnowledgeGraphViewState(
  documentElement
) {

  const script =
    documentElement.querySelector(
      '[data-knowledge-graph-view-state]'
    );

  if (!script) {

    return createEmptyKnowledgeGraphViewState();
  }

  try {

    return normalizeKnowledgeGraphViewState(
      JSON.parse(
        script.textContent || '{}'
      )
    );
  } catch (error) {

    console.warn(
      'Knowledge graph view state is malformed and was ignored.',
      error
    );

    return createEmptyKnowledgeGraphViewState();
  }
}


function writeKnowledgeGraphViewState(
  documentElement,
  nextState
) {

  const viewState =
    normalizeKnowledgeGraphViewState(
      nextState
    );

  const script =
    getKnowledgeGraphViewStateScript(
      documentElement
    );

  script.textContent =
    JSON.stringify(
      viewState,
      null,
      2
    ).replace(
      /<\/script/gi,
      '<\\/script'
    );
}


function getKnowledgeGraphViewStateScript(
  documentElement
) {

  let script =
    documentElement.querySelector(
      '[data-knowledge-graph-view-state]'
    );

  if (script) return script;

  script =
    documentElement.ownerDocument.createElement(
      'script'
    );

  script.type =
    'application/json';

  script.className =
    'knowledge-graph-view-state';

  script.setAttribute(
    'data-knowledge-graph-view-state',
    ''
  );

  documentElement.insertBefore(
    script,
    documentElement.firstChild
  );

  return script;
}


function normalizeKnowledgeGraphViewState(
  value
) {

  const positions =
    {};

  Object
    .entries(
      value?.positions || {}
    )
    .forEach(([
      nodeId,
      position
    ]) => {

      const x =
        Number(
          position?.x
        );

      const y =
        Number(
          position?.y
        );

      if (
        !nodeId ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        position?.pinned === false
      ) {

        return;
      }

      positions[String(nodeId)] =
        {
          x:
            Math.round(x),
          y:
            Math.round(y),
          pinned:
            true
        };
    });

  return {
    version:
      KNOWLEDGE_GRAPH_VIEW_STATE_VERSION,
    positions
  };
}


function createEmptyKnowledgeGraphViewState() {

  return {
    version:
      KNOWLEDGE_GRAPH_VIEW_STATE_VERSION,
    positions: {}
  };
}


function getGraphCanvasHistoryState(
  documentElement
) {

  let historyState =
    graphCanvasHistoryByDocument.get(
      documentElement
    );

  if (!historyState) {

    historyState =
      {
        undo: [],
        redo: []
      };

    graphCanvasHistoryByDocument.set(
      documentElement,
      historyState
    );
  }

  return historyState;
}


function pushGraphCanvasHistoryEntry(
  documentElement,
  entry
) {

  if (!entry) return;

  const historyState =
    getGraphCanvasHistoryState(
      documentElement
    );

  historyState.undo.push(
    entry
  );

  if (
    historyState.undo.length >
    GRAPH_CANVAS_HISTORY_LIMIT
  ) {

    historyState.undo.splice(
      0,
      historyState.undo.length - GRAPH_CANVAS_HISTORY_LIMIT
    );
  }

  historyState.redo =
    [];

  updateGraphCanvasHistoryControls(
    documentElement
  );

  focusKnowledgeGraphDocument(
    documentElement
  );
}


function focusKnowledgeGraphDocument(
  documentElement,
  options = {}
) {

  if (
    !options.force &&
    documentElement.ownerDocument.activeElement?.closest?.(
      'input, textarea, select, [contenteditable="true"]'
    )
  ) {

    return;
  }

  documentElement.focus?.(
    {
      preventScroll: true
    }
  );
}


function renderKnowledgeGraphPageAndFocus(
  documentElement,
  options = {}
) {

  const container =
    documentElement.closest(
      '#editorArea'
    ) || document;

  renderKnowledgeGraphPage(
    container
  );

  focusKnowledgeGraphDocument(
    container.querySelector?.(
      '.knowledge-graph-document'
    ) || documentElement,
    options
  );
}


function updateGraphCanvasHistoryControls(
  documentElement
) {

  const historyState =
    getGraphCanvasHistoryState(
      documentElement
    );

  documentElement
    .querySelectorAll(
      '[data-knowledge-graph-history-action]'
    )
    .forEach(button => {

      const action =
        button.dataset.knowledgeGraphHistoryAction;

      const canUse =
        action === 'undo'
          ? historyState.undo.length > 0
          : historyState.redo.length > 0;

      button.disabled =
        !canUse;

      button.setAttribute(
        'aria-disabled',
        canUse ? 'false' : 'true'
      );
    });
}


function isGraphCanvasHistoryKeyboardShortcut(
  event
) {

  if (
    !(event.ctrlKey || event.metaKey) ||
    event.altKey ||
    event.target.closest?.(
      'input, textarea, select, [contenteditable="true"]'
    )
  ) {

    return false;
  }

  const key =
    String(event.key || '').toLowerCase();

  return (
    event.code === 'KeyZ' ||
    event.code === 'KeyY' ||
    key === 'z' ||
    key === 'y'
  );
}


function getGraphCanvasHistoryActionFromKeyboardEvent(
  event
) {

  const key =
    String(event.key || '').toLowerCase();

  if (
    event.code === 'KeyY' ||
    key === 'y' ||
    (
      (
        event.code === 'KeyZ' ||
        key === 'z'
      ) &&
      event.shiftKey
    )
  ) {

    return 'redo';
  }

  return 'undo';
}


function isGraphCanvasHistoryKeyboardScope(
  documentElement,
  event
) {

  if (!documentElement?.isConnected) {

    return false;
  }

  const ownerDocument =
    documentElement.ownerDocument;

  const activeElement =
    ownerDocument.activeElement;

  return (
    documentElement.contains(event.target) ||
    documentElement.contains(activeElement) ||
    activeElement === ownerDocument.body ||
    activeElement === ownerDocument.documentElement
  );
}


function setupGraphCanvasKeyboardHistory(
  documentElement
) {

  if (
    graphCanvasKeyboardHandlersByDocument.has(
      documentElement
    )
  ) {

    return;
  }

  const ownerDocument =
    documentElement.ownerDocument;

  const handler =
    async event => {

      if (event.defaultPrevented) {

        return;
      }

      if (!documentElement.isConnected) {

        ownerDocument.removeEventListener(
          'keydown',
          handler,
          true
        );

        graphCanvasKeyboardHandlersByDocument.delete(
          documentElement
        );

        return;
      }

      if (
        !isGraphCanvasHistoryKeyboardScope(
          documentElement,
          event
        ) ||
        !isGraphCanvasHistoryKeyboardShortcut(
          event
        )
      ) {

        return;
      }

      event.preventDefault();

      await handleGraphCanvasHistoryAction(
        documentElement,
        getGraphCanvasHistoryActionFromKeyboardEvent(
          event
        )
      );
    };

  graphCanvasKeyboardHandlersByDocument.set(
    documentElement,
    handler
  );

  ownerDocument.addEventListener(
    'keydown',
    handler,
    true
  );
}


async function handleGraphCanvasHistoryAction(
  documentElement,
  action
) {

  const historyState =
    getGraphCanvasHistoryState(
      documentElement
    );

  const sourceStack =
    action === 'redo'
      ? historyState.redo
      : historyState.undo;

  const targetStack =
    action === 'redo'
      ? historyState.undo
      : historyState.redo;

  if (!sourceStack.length) {

    setStatus(
      action === 'redo'
        ? 'Нечего повторять в графе'
        : 'Нечего отменять в графе'
    );

    updateGraphCanvasHistoryControls(
      documentElement
    );

    return false;
  }

  const entry =
    sourceStack.pop();

  const applied =
    await applyGraphCanvasHistoryEntry(
      documentElement,
      entry,
      action
    );

  if (applied) {

    targetStack.push(
      entry
    );
  }

  updateGraphCanvasHistoryControls(
    documentElement
  );

  return applied;
}


async function applyGraphCanvasHistoryEntry(
  documentElement,
  entry,
  action
) {

  if (entry?.type === 'node-position') {

    applyGraphCanvasPositionState(
      documentElement,
      entry.nodeId,
      action === 'redo'
        ? entry.after
        : entry.before
    );

    setStatus(
      action === 'redo'
        ? 'Позиция узла повторена'
        : 'Позиция узла отменена'
    );

    return true;
  }

  if (entry?.type === 'relationship-create') {

    const changed =
      action === 'redo'
        ? await addRelationshipBetweenPages(
            documentElement,
            entry.relationship,
            {
              recordHistory: false,
              awaitWrite: false,
              silent: true
            }
          )
        : await removeRelationshipBetweenPages(
            documentElement,
            entry.relationship,
            {
              awaitWrite: false,
              silent: true
            }
          );

    renderKnowledgeGraphPageAndFocus(
      documentElement,
      {
        force:
          true
      }
    );

    setStatus(
      action === 'redo'
        ? 'Связь повторена'
        : 'Связь отменена'
    );

    return changed;
  }

  if (entry?.type === 'relationship-delete') {

    const changed =
      action === 'redo'
        ? await removeRelationshipAtIndex(
            documentElement,
            entry.relationship,
            {
              recordHistory: false,
              awaitWrite: false,
              silent: true
            }
          )
        : await insertRelationshipAtIndex(
            documentElement,
            entry.relationship,
            {
              recordHistory: false,
              awaitWrite: false,
              silent: true
            }
          );

    renderKnowledgeGraphPageAndFocus(
      documentElement,
      {
        force:
          true
      }
    );

    setStatus(
      action === 'redo'
        ? 'Удаление связи повторено'
        : 'Связь восстановлена'
    );

    return changed;
  }

  if (entry?.type === 'relationship-update') {

    const changed =
      await replaceRelationshipAtIndex(
        documentElement,
        {
          sourceId:
            entry.sourceId,
          index:
            entry.index,
          relationship:
            action === 'redo'
              ? entry.after
              : entry.before
        },
        {
          recordHistory: false,
          awaitWrite: false,
          silent: true
        }
      );

    renderKnowledgeGraphPageAndFocus(
      documentElement,
      {
        force:
          true
      }
    );

    setStatus(
      action === 'redo'
        ? 'Изменение связи повторено'
        : 'Изменение связи отменено'
    );

    return changed;
  }

  return false;
}


function getKnowledgeGraphHTML(
  graph,
  layout,
  filters,
  viewState,
  connectState
) {

  return `
    <div class="knowledge-graph-runtime" data-runtime="true" contenteditable="false">
      <section class="knowledge-graph-panel is-active" data-knowledge-graph-panel="visual">
        ${getVisualGraphHTML(graph, layout, filters, viewState, connectState)}
      </section>
    </div>
  `;
}


function getVisualGraphHTML(
  graph,
  layout,
  filters,
  viewState,
  connectState
) {

  const canvasModel =
    buildKnowledgeGraphCanvasModel(
      graph,
      {
        layout,
        filters,
        positions:
          viewState.positions
      }
    );

  const visibleNodes =
    canvasModel.nodes;

  return `
    <section class="knowledge-graph-workbench">
      <div class="knowledge-graph-canvas-card">
        <header class="knowledge-graph-canvas-toolbar">
          <div class="knowledge-graph-canvas-toolbar-group" aria-label="Представление графа">
            ${getCanvasLayoutButtonHTML('tree', 'Стандарт', canvasModel.layout)}
            ${getCanvasLayoutButtonHTML('domain', 'По типам', canvasModel.layout)}
            ${getCanvasLayoutButtonHTML('hub', 'Центр', canvasModel.layout)}
          </div>
          <div class="knowledge-graph-canvas-toolbar-group" aria-label="Управление визуальной картой">
            <button
              type="button"
              class="knowledge-graph-history-button"
              data-knowledge-graph-history-action="undo"
              title="Отменить действие графа (Ctrl+Z)"
              disabled
            >Назад</button>
            <button
              type="button"
              class="knowledge-graph-history-button"
              data-knowledge-graph-history-action="redo"
              title="Повторить действие графа (Ctrl+Y)"
              disabled
            >Вперед</button>
            <button type="button" data-knowledge-graph-canvas-action="zoom-out" title="Уменьшить">−</button>
            <button type="button" data-knowledge-graph-canvas-action="fit" title="Показать весь граф">Центр</button>
            <button type="button" data-knowledge-graph-canvas-action="zoom-in" title="Увеличить">+</button>
            <span data-knowledge-graph-canvas-scale>100%</span>
            <button class="knowledge-graph-refresh" type="button" title="Обновить граф">↻</button>
          </div>
        </header>
        ${getCanvasFilterBarHTML(graph, canvasModel, connectState)}
        ${getCanvasConnectBannerHTML(connectState)}
        ${getCanvasConnectDetailsPopupHTML(connectState)}
        <div
          class="knowledge-graph-canvas-stage"
          data-knowledge-graph-canvas-stage
          data-layout="${escapeHTML(canvasModel.layout)}"
          data-scale="1"
          data-pan-x="0"
          data-pan-y="0"
        >
          <div
            class="knowledge-graph-canvas-world"
            data-knowledge-graph-canvas-world
            style="width: ${escapeHTML(canvasModel.width)}px; height: ${escapeHTML(canvasModel.height)}px;"
          >
            ${
              visibleNodes.length === 0
                ? getCanvasEmptyStateHTML()
                : `
                  ${getCanvasEdgesHTML(canvasModel)}
                  ${getCanvasNodesHTML(canvasModel, connectState)}
                `
            }
          </div>
        </div>
        ${getCanvasContextMenuHTML()}
      </div>
    </section>
  `;
}


function getCanvasFilterBarHTML(
  graph,
  canvasModel
) {

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
        class="knowledge-graph-filter-toggle${canvasModel.filters.orphanOnly ? ' is-active' : ''}"
        data-knowledge-graph-filter-action="orphans"
        aria-pressed="${canvasModel.filters.orphanOnly ? 'true' : 'false'}"
      >Одинокие</button>
      <button type="button" data-knowledge-graph-filter-action="clear">Сброс</button>
      <span class="knowledge-graph-canvas-filterbar-status" data-knowledge-graph-filter-status>
        ${escapeHTML(getCanvasFilterStatusText(graph, canvasModel))}
      </span>
    </div>
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


function getCanvasConnectBannerHTML(
  connectState
) {

  if (!connectState.activeSourceId) return '';

  return `
    <div class="knowledge-graph-connect-banner" data-knowledge-graph-connect-banner>
      <span>
        ${
          connectState.targetId
            ? `Связь <strong>${escapeHTML(connectState.sourceTitle)}</strong> -> <strong>${escapeHTML(connectState.targetTitle)}</strong>: проверь свойства ниже.`
            : `Связь от <strong>${escapeHTML(connectState.sourceTitle)}</strong>: выбери цель на canvas.`
        }
      </span>
      <button type="button" data-knowledge-graph-connect-action="cancel">Отмена</button>
    </div>
  `;
}


function getCanvasConnectDetailsPopupHTML(
  connectState
) {

  if (
    !connectState.activeSourceId ||
    !connectState.targetId
  ) {

    return '';
  }

  return `
    <section
      class="knowledge-graph-connect-popup"
      data-knowledge-graph-connect-popup
      role="dialog"
      aria-modal="false"
      aria-label="Создание связи графа"
    >
      <strong>
        ${escapeHTML(connectState.sourceTitle)} -> ${escapeHTML(connectState.targetTitle)}
      </strong>
      <label>
        <span>Тип связи</span>
        <select data-knowledge-graph-connect-type>
          ${EDITABLE_RELATIONSHIP_TYPES
            .map(type => `
              <option value="${escapeHTML(type.value)}"${type.value === connectState.type ? ' selected' : ''}>
                ${escapeHTML(type.label)}
              </option>
            `)
            .join('')}
        </select>
      </label>
      <label>
        <span>Подпись</span>
        <input
          data-knowledge-graph-connect-label
          type="text"
          placeholder="Например: союз, владеет, конфликт"
        >
      </label>
      <div class="knowledge-graph-connect-popup-actions">
        <button type="button" data-knowledge-graph-connect-action="create">Создать</button>
        <button type="button" data-knowledge-graph-connect-action="cancel">Отмена</button>
      </div>
    </section>
  `;
}


function getCanvasFilterStatusText(
  graph,
  canvasModel
) {

  const filters =
    canvasModel.filters;

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
      `соседи: ${getGraphPageTitle(filters.focusNodeId)}`
    );
  }

  const base =
    parts.length > 0
      ? `Показано: ${parts.join(' · ')}`
      : canvasModel.filterSummary.text || 'Стандартный вид';

  return `${base} · ${canvasModel.nodes.length} узл.`;
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


function getGraphPageTitle(
  pageId
) {

  return state.pages.find(page =>
    page.id === pageId
  )?.title ||
    pageId;
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


function getCanvasLayoutButtonHTML(
  layout,
  label,
  activeLayout
) {

  return `
    <button
      class="knowledge-graph-layout-button${activeLayout === layout ? ' is-active' : ''}"
      type="button"
      data-knowledge-graph-layout="${escapeHTML(layout)}"
      aria-pressed="${activeLayout === layout ? 'true' : 'false'}"
    >${escapeHTML(label)}</button>
  `;
}


function getCanvasDomainLabelsHTML(
  canvasModel
) {

  if (canvasModel.layout !== 'domain') return '';

  return `
    <div class="knowledge-graph-canvas-domain-labels" aria-hidden="true">
      ${canvasModel.domains
        .map(domain => `
          <span
            class="knowledge-graph-canvas-domain-label"
            style="left: ${escapeHTML(domain.x)}px; top: ${escapeHTML(domain.y)}px;"
          >${escapeHTML(domain.label)}</span>
        `)
        .join('')}
    </div>
  `;
}


function getCanvasEmptyStateHTML() {

  return `
    <div class="knowledge-graph-canvas-empty">
      Ничего не найдено. Измени фильтры или нажми «Сброс».
    </div>
  `;
}


function getReadableGraphFallbackHTML(
  visibleNodes
) {

  return `
    <details class="knowledge-graph-readable-fallback">
      <summary>Список узлов</summary>
      <div class="knowledge-graph-visual">
        ${visibleNodes
          .map(node => `
            <button class="knowledge-graph-node" type="button" data-page-id="${escapeHTML(node.id)}">
              <strong>${escapeHTML(node.title || node.id)}</strong>
              <span>${escapeHTML(node.domainLabel || node.type || 'note')}</span>
            </button>
          `)
          .join('')}
      </div>
    </details>
  `;
}


function getCanvasEdgesHTML(
  canvasModel
) {

  return `
    <svg
      class="knowledge-graph-canvas-svg"
      viewBox="0 0 ${escapeHTML(canvasModel.width)} ${escapeHTML(canvasModel.height)}"
      role="img"
      aria-label="Визуальная карта связей"
    >
      <defs>
        <marker
          id="knowledge-graph-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z"></path>
        </marker>
      </defs>
      <g>
        ${canvasModel.edges
          .map(edge => `
            <path
              class="knowledge-graph-canvas-edge knowledge-graph-canvas-edge_${escapeHTML(edge.type)}"
              data-knowledge-graph-canvas-edge
              data-edge-from="${escapeHTML(edge.from)}"
              data-edge-to="${escapeHTML(edge.to)}"
              d="M ${escapeHTML(edge.x1)} ${escapeHTML(edge.y1)} L ${escapeHTML(edge.x2)} ${escapeHTML(edge.y2)}"
              marker-end="url(#knowledge-graph-arrow)"
            ></path>
            <text
              class="knowledge-graph-canvas-edge-label"
              data-knowledge-graph-canvas-edge-label
              data-edge-from="${escapeHTML(edge.from)}"
              data-edge-to="${escapeHTML(edge.to)}"
              x="${escapeHTML(edge.midX)}"
              y="${escapeHTML(edge.midY)}"
            >${escapeHTML(getRelationshipLabel(edge.type))}</text>
          `)
          .join('')}
      </g>
    </svg>
  `;
}


function getCanvasNodesHTML(
  canvasModel,
  connectState
) {

  return `
    <div class="knowledge-graph-canvas-nodes">
      ${canvasModel.nodes
        .map((node, index) => {

          const isConnectSource =
            connectState.activeSourceId === node.id;

          const isConnectTarget =
            Boolean(connectState.activeSourceId) &&
            connectState.activeSourceId !== node.id;

          return `
          <article
            class="knowledge-graph-canvas-node-card${index === 0 ? ' is-selected' : ''}${node.isHub ? ' is-hub' : ''}${node.isPinned ? ' is-pinned' : ''}${isConnectSource ? ' is-connect-source' : ''}${isConnectTarget ? ' is-connect-target' : ''}"
            data-knowledge-graph-canvas-card
            data-node-id="${escapeHTML(node.id)}"
            data-node-title="${escapeHTML(node.title || node.id)}"
            data-node-type="${escapeHTML(node.type || 'note')}"
            data-node-domain-label="${escapeHTML(node.domainLabel || '')}"
            data-node-domain="${escapeHTML(node.domain || '')}"
            data-node-edge-count="${escapeHTML(node.edgeCount || 0)}"
            data-node-pinned="${node.isPinned ? 'true' : 'false'}"
            data-node-x="${escapeHTML(node.x)}"
            data-node-y="${escapeHTML(node.y)}"
            style="left: ${escapeHTML(node.x)}px; top: ${escapeHTML(node.y)}px;"
          >
            <button
              class="knowledge-graph-canvas-node-main"
              type="button"
              data-knowledge-graph-canvas-node="${escapeHTML(node.id)}"
              aria-pressed="${index === 0 ? 'true' : 'false'}"
              title="Перетащить ноду. ПКМ - действия."
            >
              <strong>${escapeHTML(node.title || node.id)}</strong>
              <span>${escapeHTML(node.domainLabel || 'Заметки')} · ${escapeHTML(node.type || 'note')}</span>
            </button>
          </article>
        `;
        })
        .join('')}
    </div>
  `;
}


function getCanvasOverflowNoteHTML(
  canvasModel
) {

  if (
    canvasModel.hiddenNodeCount === 0 &&
    canvasModel.hiddenEdgeCount === 0
  ) {

    return '';
  }

  return `
    <p class="knowledge-graph-canvas-note">
      Показаны самые связанные узлы. Скрыто: ${escapeHTML(canvasModel.hiddenNodeCount)} страниц, ${escapeHTML(canvasModel.hiddenEdgeCount)} связей.
    </p>
  `;
}


function getCanvasContextMenuHTML() {

  return `
    <div
      class="knowledge-graph-node-menu hidden"
      data-knowledge-graph-node-menu
      role="dialog"
      aria-modal="false"
      aria-label="Действия узла графа"
      hidden
    >
      <strong data-knowledge-graph-node-menu-title></strong>
      <button type="button" data-knowledge-graph-node-menu-action="open">Открыть</button>
      <button type="button" data-knowledge-graph-node-menu-action="focus">Показать соседей</button>
      <button type="button" data-knowledge-graph-node-menu-action="clear-focus">Показать весь граф</button>
      <hr>
      <button type="button" data-knowledge-graph-node-menu-action="pin-position">Закрепить здесь</button>
      <button type="button" data-knowledge-graph-node-menu-action="reset-position">Сбросить позицию</button>
      <button type="button" data-knowledge-graph-node-menu-action="connect">Связать...</button>
      <hr>
      <div
        class="knowledge-graph-node-menu-relationships"
        data-knowledge-graph-node-menu-relationships
      ></div>
    </div>
  `;
}


function getRelationshipEditorHTML() {

  const pages =
    state.pages
      .filter(page =>
        page?.id &&
        page.template !== 'knowledgeGraph' &&
        page.type !== 'knowledgeGraph'
      )
      .sort((left, right) =>
        String(left.title || '').localeCompare(
          String(right.title || ''),
          'ru'
        )
      );

  return `
    <form class="knowledge-graph-relationship-form">
      <label>
        <span>Откуда</span>
        <select name="sourceId" required>
          ${getPageOptionsHTML(pages)}
        </select>
      </label>
      <label>
        <span>Тип</span>
        <select name="type" required>
          ${EDITABLE_RELATIONSHIP_TYPES
            .map(type => `
              <option value="${escapeHTML(type.value)}">${escapeHTML(type.label)}</option>
            `)
            .join('')}
        </select>
      </label>
      <label>
        <span>Куда</span>
        <select name="targetId" required>
          ${getPageOptionsHTML(pages)}
        </select>
      </label>
      <label>
        <span>Подпись</span>
        <input name="label" type="text" placeholder="Например: наставник, владелец, эффект">
      </label>
      <button type="submit">Добавить связь</button>
    </form>
  `;
}


function getPageOptionsHTML(
  pages
) {

  return pages
    .map(page => `
      <option value="${escapeHTML(page.id)}">${escapeHTML(page.title || page.id)}</option>
    `)
    .join('');
}


function getNodeRelationshipsMenuHTML(
  nodeId
) {

  const relationships =
    getEditableNodeRelationships(
      nodeId
    );

  if (!relationships.length) {

    return `
      <p class="knowledge-graph-node-menu-empty">
        Ручных связей у этой ноды пока нет.
      </p>
    `;
  }

  return relationships
    .map(relationship => `
      <section
        class="knowledge-graph-node-menu-relationship"
        data-knowledge-graph-node-relationship
        data-relationship-source-id="${escapeHTML(relationship.sourceId)}"
        data-relationship-index="${escapeHTML(relationship.index)}"
      >
        <span class="knowledge-graph-node-menu-relationship-title">
          ${escapeHTML(relationship.sourceTitle)} -&gt; ${escapeHTML(relationship.targetTitle)}
        </span>
        <label>
          <span>Тип</span>
          <select data-knowledge-graph-relationship-field="type">
            ${getEditableRelationshipTypeOptionsHTML(relationship.type)}
          </select>
        </label>
        <label>
          <span>Подпись</span>
          <input
            data-knowledge-graph-relationship-field="label"
            type="text"
            value="${escapeHTML(relationship.label)}"
            placeholder="Без подписи"
          >
        </label>
        <div class="knowledge-graph-node-menu-relationship-actions">
          <button
            type="button"
            data-knowledge-graph-relationship-menu-action="save"
          >Сохранить</button>
          <button
            class="is-danger"
            type="button"
            data-knowledge-graph-relationship-menu-action="delete"
          >Удалить</button>
        </div>
      </section>
    `)
    .join('');
}


function getEditableRelationshipTypeOptionsHTML(
  activeType
) {

  const currentType =
    getEditableRelationshipType(
      activeType
    );

  return EDITABLE_RELATIONSHIP_TYPES
    .map(type => `
      <option value="${escapeHTML(type.value)}"${type.value === currentType ? ' selected' : ''}>
        ${escapeHTML(type.label)}
      </option>
    `)
    .join('');
}


function getRelationshipFocusHTML(
  graph
) {

  const domains =
    getKnowledgeGraphDomainDefinitions();

  return `
    <div class="knowledge-graph-domain-tabs" role="tablist">
      <button class="knowledge-graph-domain-tab is-active" type="button" data-knowledge-graph-domain="all">
        Все связи
      </button>
      ${domains
        .map(domain => `
          <button class="knowledge-graph-domain-tab" type="button" data-knowledge-graph-domain="${escapeHTML(domain.key)}">
            ${escapeHTML(domain.label)}
          </button>
        `)
        .join('')}
    </div>

    <div class="knowledge-graph-domain-panel is-active" data-knowledge-graph-domain-panel="all">
      ${getRelationshipListHTML(graph)}
    </div>

    ${domains
      .map(domain => `
        <div class="knowledge-graph-domain-panel" data-knowledge-graph-domain-panel="${escapeHTML(domain.key)}" hidden>
          ${getRelationshipListHTML({
            ...graph,
            edges:
              getKnowledgeGraphDomainEdges(
                graph,
                domain.key
              )
          })}
        </div>
      `)
      .join('')}
  `;
}


function getRelationshipListHTML(
  graph
) {

  if (graph.edges.length === 0) {

    return getEmptyHTML(
      'Связей пока нет. Создайте wiki-link или вложите страницы друг в друга.'
    );
  }

  const nodesById =
    new Map(
      graph.nodes.map(node => [
        node.id,
        node
      ])
    );

  return `
    <div class="knowledge-graph-list">
      ${graph.edges
        .map(edge =>
          getRelationshipRowHTML(
            edge,
            nodesById
          )
        )
        .join('')}
    </div>
  `;
}


function getRelationshipRowHTML(
  edge,
  nodesById
) {

  const source =
    nodesById.get(
      edge.from
    );

  const target =
    nodesById.get(
      edge.to
    );

  return `
    <article class="knowledge-graph-row">
      <span class="knowledge-graph-badge">${escapeHTML(getRelationshipLabel(edge.type))}</span>
      <button class="knowledge-graph-page-link" type="button" data-page-id="${escapeHTML(edge.from)}">
        ${escapeHTML(source?.title || edge.from)}
      </button>
      <span class="knowledge-graph-arrow">→</span>
      <button class="knowledge-graph-page-link" type="button" data-page-id="${escapeHTML(edge.to)}">
        ${escapeHTML(target?.title || edge.to)}
      </button>
      ${edge.label ? `<span class="knowledge-graph-note">${escapeHTML(edge.label)}</span>` : ''}
    </article>
  `;
}


function getOrphanListHTML(
  orphans
) {

  if (orphans.length === 0) {

    return getEmptyHTML(
      'Одиноких страниц нет. Мир связан аккуратно.'
    );
  }

  return `
    <div class="knowledge-graph-list">
      ${orphans
        .map(page => `
          <article class="knowledge-graph-row">
            <span class="knowledge-graph-badge">${escapeHTML(page.type || 'note')}</span>
            <strong>${escapeHTML(page.title || page.id)}</strong>
            <button class="knowledge-graph-open-page" type="button" data-page-id="${escapeHTML(page.id)}">
              Открыть
            </button>
          </article>
        `)
        .join('')}
    </div>
  `;
}


function getEmptyHTML(
  text
) {

  return `
    <div class="knowledge-graph-empty">
      ${escapeHTML(text)}
    </div>
  `;
}


function setupKnowledgeGraphOverlays(
  documentElement
) {

  const nodeMenu =
    documentElement.querySelector(
      '[data-knowledge-graph-node-menu]'
    );

  if (nodeMenu) {

    ensureGraphNodeMenuController(
      documentElement,
      nodeMenu
    );
  }

  const connectPopup =
    documentElement.querySelector(
      '[data-knowledge-graph-connect-popup]'
    );

  if (connectPopup) {

    ensureGraphConnectPopupController(
      documentElement,
      connectPopup
    );
  }
}


function ensureGraphNodeMenuController(
  documentElement,
  menu
) {

  const existing =
    graphNodeMenuControllersByDocument.get(
      documentElement
    );

  if (
    existing?.menu === menu
  ) {

    return existing.controller;
  }

  const controller =
    registerPopup({
      popup:
        menu,
      close:
        () => hideGraphNodeContextMenuElement(
          menu
        ),
      key:
        'knowledge-graph-node-menu',
      kind:
        'popover',
      modal:
        false
    });

  graphNodeMenuControllersByDocument.set(
    documentElement,
    {
      menu,
      controller
    }
  );

  return controller;
}


function ensureGraphConnectPopupController(
  documentElement,
  popup
) {

  const existing =
    graphConnectPopupControllersByDocument.get(
      documentElement
    );

  if (
    existing?.popup === popup
  ) {

    return existing.controller;
  }

  const controller =
    registerPopup({
      popup,
      close:
        () => closeGraphConnectPopup(
          documentElement
        ),
      key:
        'knowledge-graph-connect-popup',
      kind:
        'dialog',
      modal:
        false
    });

  graphConnectPopupControllersByDocument.set(
    documentElement,
    {
      popup,
      controller
    }
  );

  return controller;
}


function closeGraphConnectPopup(
  documentElement
) {

  const popup =
    documentElement.querySelector(
      '[data-knowledge-graph-connect-popup]'
    );

  popup?.classList.add(
    'hidden'
  );

  const hadConnectState =
    Boolean(
      documentElement.dataset.currentKnowledgeGraphConnectSource
    );

  delete documentElement.dataset.currentKnowledgeGraphConnectSource;
  delete documentElement.dataset.currentKnowledgeGraphConnectType;
  delete documentElement.dataset.currentKnowledgeGraphConnectTarget;

  if (hadConnectState) {

    setStatus(
      'Создание связи отменено'
    );
  }

  renderKnowledgeGraphPageAndFocus(
    documentElement,
    {
      force:
        true
    }
  );
}


function setupKnowledgeGraphEvents(
  documentElement
) {

  if (documentElement.dataset.knowledgeGraphReady === 'true') return;

  documentElement.dataset.knowledgeGraphReady =
    'true';

  setupGraphCanvasKeyboardHistory(
    documentElement
  );

  documentElement.addEventListener(
    'click',
    async event => {

      const relationshipMenuAction =
        event.target.closest(
          '[data-knowledge-graph-relationship-menu-action]'
        );

      if (relationshipMenuAction) {

        await handleGraphRelationshipMenuAction(
          documentElement,
          relationshipMenuAction
        );

        return;
      }

      const nodeMenuAction =
        event.target.closest(
          '[data-knowledge-graph-node-menu-action]'
        );

      if (nodeMenuAction) {

        await handleGraphNodeMenuAction(
          documentElement,
          nodeMenuAction
        );

        return;
      }

      if (
        !event.target.closest(
          '[data-knowledge-graph-node-menu]'
        )
      ) {

        hideGraphNodeContextMenu(
          documentElement
        );
      }

      const connectAction =
        event.target.closest(
          '[data-knowledge-graph-connect-action]'
        );

      if (connectAction) {

        await handleGraphConnectAction(
          documentElement,
          connectAction.dataset.knowledgeGraphConnectAction
        );

        return;
      }

      const filterAction =
        event.target.closest(
          '[data-knowledge-graph-filter-action]'
        );

      if (filterAction) {

        handleGraphFilterAction(
          documentElement,
          filterAction.dataset.knowledgeGraphFilterAction
        );

        return;
      }

      const layoutButton =
        event.target.closest(
          '.knowledge-graph-layout-button[data-knowledge-graph-layout]'
        );

      if (layoutButton) {

        handleGraphLayoutChange(
          documentElement,
          layoutButton.dataset.knowledgeGraphLayout
        );

        return;
      }

      const historyAction =
        event.target.closest(
          '[data-knowledge-graph-history-action]'
        );

      if (historyAction) {

        await handleGraphCanvasHistoryAction(
          documentElement,
          historyAction.dataset.knowledgeGraphHistoryAction
        );

        return;
      }

      const canvasAction =
        event.target.closest(
          '[data-knowledge-graph-canvas-action]'
        );

      if (canvasAction) {

        handleGraphCanvasAction(
          canvasAction
        );

        return;
      }

      const canvasNode =
        event.target.closest(
          '[data-knowledge-graph-canvas-node]'
        );

      if (canvasNode) {

        if (documentElement.dataset.knowledgeGraphSuppressNodeClick === 'true') {

          return;
        }

        if (
          await handleGraphCanvasNodeConnectClick(
            documentElement,
            canvasNode.dataset.knowledgeGraphCanvasNode
          )
        ) {

          return;
        }

        selectGraphCanvasNode(
          documentElement,
          canvasNode.dataset.knowledgeGraphCanvasNode
        );

        return;
      }

      const tab =
        event.target.closest(
          '[data-knowledge-graph-tab]'
        );

      if (tab) {

        activateTab(
          documentElement,
          tab.dataset.knowledgeGraphTab
        );

        return;
      }

      const domainTab =
        event.target.closest(
          '[data-knowledge-graph-domain]'
        );

      if (domainTab) {

        activateDomain(
          documentElement,
          domainTab.dataset.knowledgeGraphDomain
        );

        return;
      }

      const domainShortcut =
        event.target.closest(
          '[data-knowledge-graph-domain-shortcut]'
        );

      if (domainShortcut) {

        activateTab(
          documentElement,
          'relationships'
        );

        activateDomain(
          documentElement,
          domainShortcut.dataset.knowledgeGraphDomainShortcut
        );

        return;
      }

      if (
        event.target.closest(
          '.knowledge-graph-refresh'
        )
      ) {

        renderKnowledgeGraphPage(
          documentElement.closest(
            '#editorArea'
          ) || document
        );

        return;
      }

      const openButton =
        event.target.closest(
          '[data-page-id]'
        );

      if (!openButton) return;

      await openGraphPage(
        openButton.dataset.pageId
      );
    }
  );

  documentElement.addEventListener(
    'change',
    event => {

      const connectType =
        event.target.closest(
          '[data-knowledge-graph-connect-type]'
        );

      if (connectType) {

        documentElement.dataset.currentKnowledgeGraphConnectType =
          getEditableRelationshipType(
            connectType.value
          );

        return;
      }

      if (
        !event.target.closest(
          '[data-knowledge-graph-filter]'
        )
      ) {

        return;
      }

      handleGraphFilterChange(
        documentElement,
        event.target
      );
    }
  );

  documentElement.addEventListener(
    'keydown',
    async event => {

      if (event.defaultPrevented) {

        return;
      }

      if (
        isGraphCanvasHistoryKeyboardShortcut(
          event
        )
      ) {

        event.preventDefault();

        await handleGraphCanvasHistoryAction(
          documentElement,
          getGraphCanvasHistoryActionFromKeyboardEvent(
            event
          )
        );

        return;
      }

      if (
        event.key === 'Escape'
      ) {

        hideGraphNodeContextMenu(
          documentElement
        );

        return;
      }

      const filterInput =
        event.target.closest(
          '[data-knowledge-graph-filter="search"]'
        );

      if (
        filterInput &&
        event.key === 'Enter'
      ) {

        event.preventDefault();

        handleGraphFilterChange(
          documentElement
        );
      }
    }
  );

  documentElement.addEventListener(
    'contextmenu',
    event => {

      const card =
        event.target.closest(
          '[data-knowledge-graph-canvas-card]'
        );

      if (!card) return;

      event.preventDefault();

      selectGraphCanvasNode(
        documentElement,
        card.dataset.nodeId
      );

      focusKnowledgeGraphDocument(
        documentElement,
        {
          force:
            true
        }
      );

      showGraphNodeContextMenu(
        documentElement,
        card,
        event.clientX,
        event.clientY
      );
    }
  );

  documentElement.addEventListener(
    'wheel',
    event => {

      const stage =
        event.target.closest(
          '[data-knowledge-graph-canvas-stage]'
        );

      if (!stage) return;

      if (
        event.target.closest(
          '[data-knowledge-graph-node-menu], [data-knowledge-graph-connect-popup]'
        )
      ) {

        return;
      }

      event.preventDefault();

      hideGraphNodeContextMenu(
        documentElement
      );

      focusKnowledgeGraphDocument(
        documentElement,
        {
          force:
            true
        }
      );

      zoomGraphCanvasAtPoint(
        stage,
        event.clientX,
        event.clientY,
        event.deltaY
      );
    },
    {
      passive:
        false
    }
  );

  documentElement.addEventListener(
    'submit',
    async event => {

      const form =
        event.target.closest(
          '.knowledge-graph-relationship-form'
        );

      if (!form) return;

      event.preventDefault();

      await addRelationshipFromForm(
        documentElement,
        form
      );
    }
  );

  let canvasPanState =
    null;

  let nodeDragState =
    null;

  const startGraphNodeDrag =
    (
      event,
      stage,
      nodeCard,
      pointerId
    ) => {

      hideGraphNodeContextMenu(
        documentElement
      );

      selectGraphCanvasNode(
        documentElement,
        nodeCard.dataset.nodeId
      );

      nodeDragState =
        {
          stage,
          card:
            nodeCard,
          pointerId,
          startX:
            event.clientX,
          startY:
            event.clientY,
          nodeX:
            getGraphCanvasNumber(
              nodeCard.dataset.nodeX,
              getGraphCanvasNumber(
                nodeCard.style.left
              )
            ),
          nodeY:
            getGraphCanvasNumber(
              nodeCard.dataset.nodeY,
              getGraphCanvasNumber(
                nodeCard.style.top
              )
            ),
          beforePosition:
            getGraphCanvasPositionState(
              documentElement,
              nodeCard.dataset.nodeId,
              nodeCard
            ),
          moved:
            false
        };

      nodeCard.classList.add(
        'is-dragging'
      );

      stage.classList.add(
        'is-node-dragging'
      );

      if (Number.isFinite(pointerId)) {

        event.target.setPointerCapture?.(
          pointerId
        );
      }

      event.preventDefault();
    };

  const updateGraphNodeDrag =
    event => {

      const scale =
        clampGraphCanvasScale(
          getGraphCanvasNumber(
            nodeDragState.stage.dataset.scale,
            1
          )
        );

      const nextX =
        nodeDragState.nodeX +
        (event.clientX - nodeDragState.startX) / scale;

      const nextY =
        nodeDragState.nodeY +
        (event.clientY - nodeDragState.startY) / scale;

      const moveResult =
        moveGraphCanvasNode(
          nodeDragState.card,
          nodeDragState.stage,
          nextX,
          nextY
        );

      if (
        moveResult.shiftX ||
        moveResult.shiftY
      ) {

        nodeDragState.nodeX +=
          moveResult.shiftX;

        nodeDragState.nodeY +=
          moveResult.shiftY;
      }

      nodeDragState.moved =
        nodeDragState.moved ||
        Math.abs(event.clientX - nodeDragState.startX) > 3 ||
        Math.abs(event.clientY - nodeDragState.startY) > 3;
    };

  const finishGraphNodeDrag =
    event => {

      nodeDragState.card.classList.remove(
        'is-dragging'
      );

      nodeDragState.stage.classList.remove(
        'is-node-dragging'
      );

      if (Number.isFinite(nodeDragState.pointerId)) {

        event.target.releasePointerCapture?.(
          nodeDragState.pointerId
        );
      }

      if (nodeDragState.moved) {

        persistGraphCanvasPosition(
          documentElement,
          nodeDragState.card,
          {
            beforePosition:
              nodeDragState.beforePosition
          }
        );

        documentElement.dataset.knowledgeGraphSuppressNodeClick =
          'true';

        window.setTimeout(
          () => {

            delete documentElement.dataset.knowledgeGraphSuppressNodeClick;
          },
          0
        );
      }

      nodeDragState =
        null;
    };

  documentElement.addEventListener(
    'pointerdown',
    event => {

      const stage =
        event.target.closest(
          '[data-knowledge-graph-canvas-stage]'
        );

      const nodeCard =
        event.target.closest(
          '[data-knowledge-graph-canvas-card]'
        );

      if (
        stage &&
        nodeCard &&
        event.button === 0
      ) {

        startGraphNodeDrag(
          event,
          stage,
          nodeCard,
          event.pointerId
        );

        return;
      }

      if (
        !stage ||
        event.button !== 0 ||
        event.target.closest(
          'button, a, input, select, textarea'
        )
      ) {

        return;
      }

      canvasPanState =
        {
          stage,
          pointerId:
            event.pointerId,
          startX:
            event.clientX,
          startY:
            event.clientY,
          panX:
            getGraphCanvasNumber(
              stage.dataset.panX
            ),
          panY:
            getGraphCanvasNumber(
              stage.dataset.panY
            )
        };

      focusKnowledgeGraphDocument(
        documentElement,
        {
          force:
            true
        }
      );

      stage.classList.add(
        'is-panning'
      );

      stage.setPointerCapture?.(
        event.pointerId
      );
    },
    true
  );

  documentElement.addEventListener(
    'mousedown',
    event => {

      if (nodeDragState) return;

      const stage =
        event.target.closest(
          '[data-knowledge-graph-canvas-stage]'
        );

      const nodeCard =
        event.target.closest(
          '[data-knowledge-graph-canvas-card]'
        );

      if (
        !stage ||
        !nodeCard ||
        event.button !== 0
      ) {

        return;
      }

      startGraphNodeDrag(
        event,
        stage,
        nodeCard,
        'mouse'
      );
    },
    true
  );

  documentElement.ownerDocument.addEventListener(
    'pointermove',
    event => {

      if (
        nodeDragState &&
        nodeDragState.pointerId === event.pointerId
      ) {

        updateGraphNodeDrag(
          event
        );

        return;
      }

      if (
        !canvasPanState ||
        canvasPanState.pointerId !== event.pointerId
      ) {

        return;
      }

      canvasPanState.stage.dataset.panX =
        String(
          canvasPanState.panX +
            event.clientX -
            canvasPanState.startX
        );

      canvasPanState.stage.dataset.panY =
        String(
          canvasPanState.panY +
            event.clientY -
            canvasPanState.startY
        );

      applyGraphCanvasTransform(
        canvasPanState.stage
      );
    }
  );

  documentElement.ownerDocument.addEventListener(
    'mousemove',
    event => {

      if (
        !nodeDragState ||
        nodeDragState.pointerId !== 'mouse'
      ) {

        return;
      }

      updateGraphNodeDrag(
        event
      );
    }
  );

  documentElement.ownerDocument.addEventListener(
    'pointerup',
    event => {

      if (
        nodeDragState &&
        nodeDragState.pointerId === event.pointerId
      ) {

        finishGraphNodeDrag(
          event
        );

        return;
      }

      if (
        !canvasPanState ||
        canvasPanState.pointerId !== event.pointerId
      ) {

        return;
      }

      canvasPanState.stage.classList.remove(
        'is-panning'
      );

      canvasPanState.stage.releasePointerCapture?.(
        event.pointerId
      );

      canvasPanState =
        null;
    }
  );

  documentElement.ownerDocument.addEventListener(
    'mouseup',
    event => {

      if (
        !nodeDragState ||
        nodeDragState.pointerId !== 'mouse'
      ) {

        return;
      }

      finishGraphNodeDrag(
        event
      );
    }
  );
}


function handleGraphLayoutChange(
  documentElement,
  layout
) {

  documentElement.dataset.currentKnowledgeGraphLayout =
    layout === 'hub'
      ? 'hub'
      : layout === 'domain'
        ? 'domain'
        : 'tree';

  renderKnowledgeGraphPage(
    documentElement.closest(
      '#editorArea'
    ) || document
  );
}


function getRuntimeGraphFilters(
  documentElement
) {

  return {
    domain:
      documentElement.dataset.currentKnowledgeGraphFilterDomain ||
      'all',
    relationshipType:
      documentElement.dataset.currentKnowledgeGraphFilterRelationship ||
      'all',
    search:
      documentElement.dataset.currentKnowledgeGraphFilterSearch ||
      '',
    orphanOnly:
      documentElement.dataset.currentKnowledgeGraphFilterOrphans === 'true',
    focusNodeId:
      documentElement.dataset.currentKnowledgeGraphFocusNode ||
      '',
    viewPreset:
      documentElement.dataset.currentKnowledgeGraphViewPreset ||
      'standard'
  };
}


function getRuntimeGraphConnectState(
  documentElement
) {

  const activeSourceId =
    documentElement.dataset.currentKnowledgeGraphConnectSource ||
    '';

  const type =
    getEditableRelationshipType(
      documentElement.dataset.currentKnowledgeGraphConnectType ||
      'related'
    );

  return {
    activeSourceId,
    sourceTitle:
      activeSourceId
        ? getGraphPageTitle(activeSourceId)
        : '',
    targetId:
      documentElement.dataset.currentKnowledgeGraphConnectTarget ||
      '',
    targetTitle:
      documentElement.dataset.currentKnowledgeGraphConnectTarget
        ? getGraphPageTitle(
          documentElement.dataset.currentKnowledgeGraphConnectTarget
        )
        : '',
    type
  };
}


function handleGraphFilterChange(
  documentElement,
  changedElement = null
) {

  const viewPreset =
    changedElement?.matches(
      '[data-knowledge-graph-filter="viewPreset"]'
    )
      ? getKnowledgeGraphViewPreset(
        changedElement.value
      )
      : null;

  const domain =
    viewPreset
      ? 'all'
      : documentElement.querySelector(
        '[data-knowledge-graph-filter="domain"]'
      )?.value ||
        'all';

  const relationshipType =
    viewPreset
      ? viewPreset.relationshipType
      : documentElement.querySelector(
        '[data-knowledge-graph-filter="relationshipType"]'
      )?.value ||
        'all';

  const search =
    viewPreset
      ? ''
      : documentElement.querySelector(
        '[data-knowledge-graph-filter="search"]'
      )?.value ||
        '';

  documentElement.dataset.currentKnowledgeGraphFilterDomain =
    domain;

  documentElement.dataset.currentKnowledgeGraphFilterRelationship =
    relationshipType;

  documentElement.dataset.currentKnowledgeGraphFilterSearch =
    search.trim();

  if (viewPreset) {

    documentElement.dataset.currentKnowledgeGraphViewPreset =
      viewPreset.value;

    documentElement.dataset.currentKnowledgeGraphFilterOrphans =
      viewPreset.orphanOnly
        ? 'true'
        : 'false';

    delete documentElement.dataset.currentKnowledgeGraphFocusNode;
  } else {

    delete documentElement.dataset.currentKnowledgeGraphViewPreset;
  }

  renderKnowledgeGraphPage(
    documentElement.closest(
      '#editorArea'
    ) || document
  );
}


function handleGraphFilterAction(
  documentElement,
  action
) {

  if (action === 'orphans') {

    documentElement.dataset.currentKnowledgeGraphFilterOrphans =
      documentElement.dataset.currentKnowledgeGraphFilterOrphans === 'true'
        ? 'false'
        : 'true';
  }

  if (action === 'clear') {

    delete documentElement.dataset.currentKnowledgeGraphFilterDomain;
    delete documentElement.dataset.currentKnowledgeGraphFilterRelationship;
    delete documentElement.dataset.currentKnowledgeGraphFilterSearch;
    delete documentElement.dataset.currentKnowledgeGraphFilterOrphans;
    delete documentElement.dataset.currentKnowledgeGraphFocusNode;
    delete documentElement.dataset.currentKnowledgeGraphViewPreset;
    delete documentElement.dataset.currentKnowledgeGraphConnectSource;
    delete documentElement.dataset.currentKnowledgeGraphConnectType;
    delete documentElement.dataset.currentKnowledgeGraphConnectTarget;
  }

  renderKnowledgeGraphPage(
    documentElement.closest(
      '#editorArea'
    ) || document
  );
}


function getKnowledgeGraphViewPreset(
  value
) {

  return KNOWLEDGE_GRAPH_VIEW_PRESETS.find(preset =>
    preset.value === value
  ) ||
    KNOWLEDGE_GRAPH_VIEW_PRESETS[0];
}


function getEditableRelationshipType(
  value
) {

  const normalizedValue =
    String(value || '').trim();

  return EDITABLE_RELATIONSHIP_TYPES.some(type =>
    type.value === normalizedValue
  )
    ? normalizedValue
    : 'related';
}


function getRelationshipTargetId(
  relationship
) {

  const directTargetId =
    relationship?.targetId ||
    relationship?.pageId ||
    relationship?.id;

  if (directTargetId) {

    return String(directTargetId);
  }

  const targetTitle =
    relationship?.targetTitle ||
    relationship?.target ||
    relationship?.title;

  if (!targetTitle) return '';

  const normalizedTitle =
    normalizeRelationshipForComparison(
      targetTitle
    );

  return state.pages.find(page =>
    normalizeRelationshipForComparison(
      page.title
    ) === normalizedTitle
  )?.id || '';
}


function normalizeRelationshipRecord(
  relationship
) {

  const targetId =
    getRelationshipTargetId(
      relationship
    );

  const label =
    String(relationship?.label || '').trim();

  return {
    type:
      getEditableRelationshipType(
        relationship?.type
      ),
    ...(targetId ? { targetId } : {}),
    ...(relationship?.targetTitle && !targetId
      ? {
          targetTitle:
            String(relationship.targetTitle)
        }
      : {}),
    ...(label ? { label } : {})
  };
}


function areRelationshipRecordsEqual(
  left,
  right
) {

  const normalizedLeft =
    normalizeRelationshipRecord(
      left
    );

  const normalizedRight =
    normalizeRelationshipRecord(
      right
    );

  return (
    normalizeRelationshipForComparison(normalizedLeft.type) ===
      normalizeRelationshipForComparison(normalizedRight.type) &&
    String(normalizedLeft.targetId || '') ===
      String(normalizedRight.targetId || '') &&
    String(normalizedLeft.targetTitle || '') ===
      String(normalizedRight.targetTitle || '') &&
    String(normalizedLeft.label || '').trim() ===
      String(normalizedRight.label || '').trim()
  );
}


function getEditableNodeRelationships(
  nodeId
) {

  const targetNodeId =
    String(nodeId || '');

  if (!targetNodeId) return [];

  return state.pages.flatMap(page =>
    (page.relationships || [])
      .map((relationship, index) => {

        const relationshipTargetId =
          getRelationshipTargetId(
            relationship
          );

        if (
          page.id !== targetNodeId &&
          relationshipTargetId !== targetNodeId
        ) {

          return null;
        }

        return {
          sourceId:
            page.id,
          sourceTitle:
            page.title || page.id,
          targetId:
            relationshipTargetId,
          targetTitle:
            getGraphPageTitle(
              relationshipTargetId
            ),
          index,
          type:
            getEditableRelationshipType(
              relationship.type
            ),
          label:
            String(relationship.label || '').trim()
        };
      })
      .filter(Boolean)
  );
}


async function handleGraphConnectAction(
  documentElement,
  action
) {

  if (action === 'create') {

    const connectState =
      getRuntimeGraphConnectState(
        documentElement
      );

    const label =
      documentElement.querySelector(
        '[data-knowledge-graph-connect-label]'
      )?.value || '';

    const added =
      await addRelationshipBetweenPages(
        documentElement,
        {
          sourceId:
            connectState.activeSourceId,
          targetId:
            connectState.targetId,
          type:
            connectState.type,
          label
        }
      );

    if (!added) return;
  }

  if (
    action !== 'cancel' &&
    action !== 'create'
  ) {

    return;
  }

  documentElement
    .querySelector(
      '[data-knowledge-graph-connect-popup]'
    )
    ?.classList.add(
      'hidden'
    );

  delete documentElement.dataset.currentKnowledgeGraphConnectSource;
  delete documentElement.dataset.currentKnowledgeGraphConnectType;
  delete documentElement.dataset.currentKnowledgeGraphConnectTarget;

  setStatus(
    action === 'create'
      ? 'Связь добавлена'
      : 'Создание связи отменено'
  );

  renderKnowledgeGraphPageAndFocus(
    documentElement,
    {
      force:
        true
    }
  );
}


async function handleGraphCanvasNodeConnectClick(
  documentElement,
  targetId
) {

  const connectState =
    getRuntimeGraphConnectState(
      documentElement
    );

  if (!connectState.activeSourceId) return false;

  if (
    !targetId ||
    connectState.activeSourceId === targetId
  ) {

    setStatus(
      'Выберите другую страницу для связи'
    );

    return true;
  }

  documentElement.dataset.currentKnowledgeGraphConnectTarget =
    targetId;

  setStatus(
    'Проверь свойства новой связи'
  );

  renderKnowledgeGraphPageAndFocus(
    documentElement,
    {
      force:
        true
    }
  );

  return true;
}


async function handleGraphNodeMenuAction(
  documentElement,
  actionButton
) {

  const menu =
    actionButton.closest(
      '[data-knowledge-graph-node-menu]'
    );

  const nodeId =
    menu?.dataset.nodeId;

  if (!nodeId) return;

  const action =
    actionButton.dataset.knowledgeGraphNodeMenuAction;

  hideGraphNodeContextMenu(
    documentElement
  );

  if (action === 'open') {

    await openGraphPage(
      nodeId
    );

    return;
  }

  if (action === 'focus') {

    documentElement.dataset.currentKnowledgeGraphFocusNode =
      nodeId;
  }

  if (action === 'clear-focus') {

    delete documentElement.dataset.currentKnowledgeGraphFocusNode;
  }

  if (action === 'pin-position') {

    const card =
      findGraphCanvasNodeCard(
        documentElement,
        nodeId
      );

    if (card) {

      persistGraphCanvasPosition(
        documentElement,
        card
      );
    }
  }

  if (action === 'reset-position') {

    resetGraphCanvasPosition(
      documentElement,
      nodeId
    );
  }

  if (action === 'connect') {

    documentElement.dataset.currentKnowledgeGraphConnectSource =
      nodeId;

      documentElement.dataset.currentKnowledgeGraphConnectType =
        documentElement.dataset.currentKnowledgeGraphConnectType ||
      'related';

    delete documentElement.dataset.currentKnowledgeGraphConnectTarget;

    setStatus(
      'Выберите цель связи на canvas'
    );
  }

  renderKnowledgeGraphPage(
    documentElement.closest(
      '#editorArea'
    ) || document
  );
}


async function handleGraphRelationshipMenuAction(
  documentElement,
  actionButton
) {

  const relationshipElement =
    actionButton.closest(
      '[data-knowledge-graph-node-relationship]'
    );

  if (!relationshipElement) return;

  const sourceId =
    relationshipElement.dataset.relationshipSourceId;

  const index =
    Number(
      relationshipElement.dataset.relationshipIndex
    );

  const before =
    getRelationshipAtIndex(
      sourceId,
      index
    );

  if (!before) {

    setStatus(
      'Связь уже недоступна'
    );

    return;
  }

  const action =
    actionButton.dataset.knowledgeGraphRelationshipMenuAction;

  if (action === 'delete') {

    const removed =
      await removeRelationshipAtIndex(
        documentElement,
        {
          sourceId,
          index,
          relationship:
            before
        }
      );

    if (removed) {

      hideGraphNodeContextMenu(
        documentElement
      );

      renderKnowledgeGraphPageAndFocus(
        documentElement,
        {
          force:
            true
        }
      );
    }

    return;
  }

  if (action !== 'save') return;

  const type =
    relationshipElement.querySelector(
      '[data-knowledge-graph-relationship-field="type"]'
    )?.value;

  const label =
    relationshipElement.querySelector(
      '[data-knowledge-graph-relationship-field="label"]'
    )?.value;

  const after =
    normalizeRelationshipRecord(
      {
        ...before,
        type,
        label
      }
    );

  if (
    areRelationshipRecordsEqual(
      before,
      after
    )
  ) {

    setStatus(
      'Связь не изменилась'
    );

    return;
  }

  const updated =
    await replaceRelationshipAtIndex(
      documentElement,
      {
        sourceId,
        index,
        before,
        relationship:
          after
      }
    );

  if (updated) {

    hideGraphNodeContextMenu(
      documentElement
    );

    renderKnowledgeGraphPageAndFocus(
      documentElement,
      {
        force:
          true
      }
    );
  }
}


function showGraphNodeContextMenu(
  documentElement,
  card,
  clientX,
  clientY
) {

  const menu =
    documentElement.querySelector(
      '[data-knowledge-graph-node-menu]'
    );

  if (!menu) return;

  const title =
    card.dataset.nodeTitle ||
    card.dataset.nodeId ||
    '';

  const titleElement =
    menu.querySelector(
      '[data-knowledge-graph-node-menu-title]'
    );

  if (titleElement) {

    titleElement.textContent =
      title;
  }

  menu.dataset.nodeId =
    card.dataset.nodeId;

  const viewState =
    readKnowledgeGraphViewState(
      documentElement
    );

  const hasPinnedPosition =
    Boolean(
      viewState.positions[card.dataset.nodeId]
    );

  const pinButton =
    menu.querySelector(
      '[data-knowledge-graph-node-menu-action="pin-position"]'
    );

  const resetButton =
    menu.querySelector(
      '[data-knowledge-graph-node-menu-action="reset-position"]'
    );

  if (pinButton) {

    pinButton.hidden =
      hasPinnedPosition;
  }

  if (resetButton) {

    resetButton.hidden =
      !hasPinnedPosition;
  }

  const relationshipsElement =
    menu.querySelector(
      '[data-knowledge-graph-node-menu-relationships]'
    );

  if (relationshipsElement) {

    relationshipsElement.innerHTML =
      getNodeRelationshipsMenuHTML(
        card.dataset.nodeId
      );
  }

  menu.hidden =
    false;

  menu.classList.add(
    'hidden'
  );

  ensureGraphNodeMenuController(
    documentElement,
    menu
  );

  openPopupAtPoint(
    menu,
    clientX,
    clientY,
    {
      fallbackWidth: 260,
      fallbackHeight: 360
    }
  );

  adjustGraphNodeMenuToViewport(
    menu
  );
}


function hideGraphNodeContextMenu(
  documentElement
) {

  const menu =
    documentElement.querySelector(
      '[data-knowledge-graph-node-menu]'
    );

  if (!menu) return;

  const controller =
    ensureGraphNodeMenuController(
      documentElement,
      menu
    );

  if (
    controller?.isOpen()
  ) {

    controller.close();
    return;
  }

  hideGraphNodeContextMenuElement(
    menu
  );
}


function hideGraphNodeContextMenuElement(
  menu
) {

  menu.hidden =
    true;

  menu.classList.add(
    'hidden'
  );

  delete menu.dataset.nodeId;
}


function adjustGraphNodeMenuToViewport(
  menu
) {

  const rect =
    menu.getBoundingClientRect();

  const targetLeft =
    clampGraphCanvasPosition(
      rect.left,
      12,
      Math.max(
        12,
        window.innerWidth - rect.width - 12
      )
    );

  const targetTop =
    clampGraphCanvasPosition(
      rect.top,
      12,
      Math.max(
        12,
        window.innerHeight - rect.height - 12
      )
    );

  const styleLeft =
    Number.parseFloat(
      menu.style.left
    ) || 0;

  const styleTop =
    Number.parseFloat(
      menu.style.top
    ) || 0;

  menu.style.left =
    `${Math.round(styleLeft + targetLeft - rect.left)}px`;

  menu.style.top =
    `${Math.round(styleTop + targetTop - rect.top)}px`;
}


function getGraphCanvasPositionState(
  documentElement,
  nodeId,
  card = null
) {

  const viewState =
    readKnowledgeGraphViewState(
      documentElement
    );

  const savedPosition =
    viewState.positions[nodeId];

  if (savedPosition) {

    return {
      x:
        savedPosition.x,
      y:
        savedPosition.y,
      pinned:
        true
    };
  }

  const currentCard =
    card ||
    findGraphCanvasNodeCard(
      documentElement,
      nodeId
    );

  if (!currentCard) {

    return {
      pinned:
        false
    };
  }

  return {
    x:
      getGraphCanvasNumber(
        currentCard.dataset.nodeX,
        getGraphCanvasNumber(
          currentCard.style.left
        )
      ),
    y:
      getGraphCanvasNumber(
        currentCard.dataset.nodeY,
        getGraphCanvasNumber(
          currentCard.style.top
        )
      ),
    pinned:
      false
  };
}


function getGraphCanvasComputedNodePosition(
  documentElement,
  nodeId,
  positions
) {

  const graph =
    buildKnowledgeGraph(
      state.pages
    );

  const canvasModel =
    buildKnowledgeGraphCanvasModel(
      graph,
      {
        layout:
          documentElement.dataset.currentKnowledgeGraphLayout ||
          'tree',
        filters:
          getRuntimeGraphFilters(
            documentElement
          ),
        positions:
          positions || {}
      }
    );

  const node =
    canvasModel.nodes.find(item =>
      item.id === nodeId
    );

  if (!node) {

    return {
      pinned:
        false
    };
  }

  return {
    x:
      node.x,
    y:
      node.y,
    pinned:
      Boolean(node.isPinned)
  };
}


function areGraphCanvasPositionStatesEqual(
  left,
  right
) {

  const leftPinned =
    Boolean(left?.pinned);

  const rightPinned =
    Boolean(right?.pinned);

  if (leftPinned !== rightPinned) return false;

  if (!leftPinned) return true;

  return (
    Math.round(Number(left?.x)) === Math.round(Number(right?.x)) &&
    Math.round(Number(left?.y)) === Math.round(Number(right?.y))
  );
}


function applyGraphCanvasPositionState(
  documentElement,
  nodeId,
  position
) {

  const viewState =
    readKnowledgeGraphViewState(
      documentElement
    );

  const hasExplicitPosition =
    Number.isFinite(Number(position?.x)) &&
    Number.isFinite(Number(position?.y));

  const nextPosition =
    hasExplicitPosition
      ? {
          x:
            Math.round(Number(position.x)),
          y:
            Math.round(Number(position.y)),
          pinned:
            Boolean(position?.pinned)
        }
      : {
          pinned:
            false
        };

  if (nextPosition.pinned) {

    viewState.positions[nodeId] =
      {
        x:
          nextPosition.x,
        y:
          nextPosition.y,
        pinned:
          true
      };
  } else {

    delete viewState.positions[nodeId];
  }

  writeKnowledgeGraphViewState(
    documentElement,
    viewState
  );

  markKnowledgeGraphChanged(
    documentElement
  );

  const card =
    findGraphCanvasNodeCard(
      documentElement,
      nodeId
    );

  const stage =
    card?.closest(
      '[data-knowledge-graph-canvas-stage]'
    );

  if (
    card &&
    stage &&
    hasExplicitPosition
  ) {

    moveGraphCanvasNode(
      card,
      stage,
      nextPosition.x,
      nextPosition.y
    );

    card.dataset.nodePinned =
      nextPosition.pinned ? 'true' : 'false';

    card.classList.toggle(
      'is-pinned',
      nextPosition.pinned
    );

    return;
  }

  renderKnowledgeGraphPage(
    documentElement.closest(
      '#editorArea'
    ) || document
  );
}


function persistGraphCanvasPosition(
  documentElement,
  card,
  options = {}
) {

  const nodeId =
    card?.dataset.nodeId;

  if (!nodeId) return;

  const x =
    getGraphCanvasNumber(
      card.dataset.nodeX,
      getGraphCanvasNumber(
        card.style.left
      )
    );

  const y =
    getGraphCanvasNumber(
      card.dataset.nodeY,
      getGraphCanvasNumber(
        card.style.top
      )
    );

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {

    return;
  }

  const previousPosition =
    options.beforePosition ||
    getGraphCanvasPositionState(
      documentElement,
      nodeId,
      card
    );

  const nextPosition =
    {
      x:
        Math.round(x),
      y:
        Math.round(y),
      pinned:
        true
    };

  const viewState =
    readKnowledgeGraphViewState(
      documentElement
    );

  viewState.positions[nodeId] =
    nextPosition;

  writeKnowledgeGraphViewState(
    documentElement,
    viewState
  );

  card.dataset.nodePinned =
    'true';

  card.classList.add(
    'is-pinned'
  );

  markKnowledgeGraphChanged(
    documentElement
  );

  if (
    options.recordHistory !== false &&
    !areGraphCanvasPositionStatesEqual(
      previousPosition,
      nextPosition
    )
  ) {

    pushGraphCanvasHistoryEntry(
      documentElement,
      {
        type:
          'node-position',
        nodeId,
        before:
          previousPosition,
        after:
          nextPosition
      }
    );
  }

  setStatus(
    'Позиция узла сохранена'
  );
}


function resetGraphCanvasPosition(
  documentElement,
  nodeId,
  options = {}
) {

  const viewState =
    readKnowledgeGraphViewState(
      documentElement
    );

  if (!viewState.positions[nodeId]) return;

  const previousPosition =
    getGraphCanvasPositionState(
      documentElement,
      nodeId
    );

  delete viewState.positions[nodeId];

  const nextPosition =
    getGraphCanvasComputedNodePosition(
      documentElement,
      nodeId,
      viewState.positions
    );

  writeKnowledgeGraphViewState(
    documentElement,
    viewState
  );

  markKnowledgeGraphChanged(
    documentElement
  );

  if (options.recordHistory !== false) {

    pushGraphCanvasHistoryEntry(
      documentElement,
      {
        type:
          'node-position',
        nodeId,
        before:
          previousPosition,
        after:
          nextPosition
      }
    );
  }

  setStatus(
    'Позиция узла сброшена'
  );
}


function findGraphCanvasNodeCard(
  documentElement,
  nodeId
) {

  return [
    ...documentElement.querySelectorAll(
      '[data-knowledge-graph-canvas-card]'
    )
  ].find(card =>
    card.dataset.nodeId === nodeId
  ) || null;
}


function markKnowledgeGraphChanged(
  documentElement
) {

  documentElement.dispatchEvent(
    new Event(
      'input',
      {
        bubbles: true
      }
    )
  );
}


function initializeKnowledgeGraphCanvases(
  documentElement
) {

  documentElement
    .querySelectorAll(
      '[data-knowledge-graph-canvas-stage]'
    )
    .forEach(stage => {

      if (!stage.dataset.scale) {

        stage.dataset.scale =
          '1';
      }

      if (!stage.dataset.panX) {

        stage.dataset.panX =
          '0';
      }

      if (!stage.dataset.panY) {

        stage.dataset.panY =
          '0';
      }

      fitGraphCanvas(
        stage
      );

      applyGraphCanvasTransform(
        stage
      );
    });
}


function handleGraphCanvasAction(
  actionButton
) {

  const stage =
    actionButton
      .closest(
        '.knowledge-graph-canvas-card'
      )
      ?.querySelector(
        '[data-knowledge-graph-canvas-stage]'
      );

  if (!stage) return;

  const action =
    actionButton.dataset.knowledgeGraphCanvasAction;

  const scale =
    getGraphCanvasNumber(
      stage.dataset.scale,
      1
    );

  if (action === 'zoom-in') {

    stage.dataset.scale =
      String(
        clampGraphCanvasScale(
          scale + GRAPH_CANVAS_ZOOM_STEP
        )
      );
  }

  if (action === 'zoom-out') {

    stage.dataset.scale =
      String(
        clampGraphCanvasScale(
          scale - GRAPH_CANVAS_ZOOM_STEP
        )
      );
  }

  if (action === 'fit') {

    fitGraphCanvas(
      stage
    );
  }

  applyGraphCanvasTransform(
    stage
  );
}


function zoomGraphCanvasAtPoint(
  stage,
  clientX,
  clientY,
  deltaY
) {

  const currentScale =
    clampGraphCanvasScale(
      getGraphCanvasNumber(
        stage.dataset.scale,
        1
      )
    );

  const nextScale =
    clampGraphCanvasScale(
      currentScale * Math.exp(-deltaY * 0.001)
    );

  if (
    Math.abs(nextScale - currentScale) < 0.001
  ) {

    return;
  }

  const rect =
    stage.getBoundingClientRect();

  const pointerX =
    clientX - rect.left;

  const pointerY =
    clientY - rect.top;

  const panX =
    getGraphCanvasNumber(
      stage.dataset.panX
    );

  const panY =
    getGraphCanvasNumber(
      stage.dataset.panY
    );

  const worldX =
    (pointerX - panX) / currentScale;

  const worldY =
    (pointerY - panY) / currentScale;

  stage.dataset.scale =
    String(nextScale);

  stage.dataset.panX =
    String(
      Math.round(pointerX - worldX * nextScale)
    );

  stage.dataset.panY =
    String(
      Math.round(pointerY - worldY * nextScale)
    );

  applyGraphCanvasTransform(
    stage
  );
}


function fitGraphCanvas(
  stage
) {

  const world =
    stage.querySelector(
      '[data-knowledge-graph-canvas-world]'
    );

  if (!world) return;

  const stageRect =
    stage.getBoundingClientRect();

  const worldWidth =
    Number.parseFloat(
      world.style.width
    ) || 960;

  const worldHeight =
    Number.parseFloat(
      world.style.height
    ) || 520;

  const scale =
    clampGraphCanvasScale(
      Math.min(
        (stageRect.width - 28) / worldWidth,
        (stageRect.height - 28) / worldHeight
      )
    );

  stage.dataset.scale =
    String(
      scale
    );

  stage.dataset.panX =
    String(
      Math.round((stageRect.width - worldWidth * scale) / 2)
    );

  stage.dataset.panY =
    String(
      Math.round((stageRect.height - worldHeight * scale) / 2)
    );
}


function selectGraphCanvasNode(
  documentElement,
  nodeId
) {

  documentElement
    .querySelectorAll(
      '[data-knowledge-graph-canvas-card]'
    )
    .forEach(card => {

      const active =
        card.dataset.nodeId === nodeId;

      card.classList.toggle(
        'is-selected',
        active
      );

      card
        .querySelector(
          '[data-knowledge-graph-canvas-node]'
        )
        ?.setAttribute(
          'aria-pressed',
          active ? 'true' : 'false'
        );

    });
}


function moveGraphCanvasNode(
  card,
  stage,
  x,
  y
) {

  const expandedPosition =
    ensureGraphCanvasWorldContains(
      stage,
      x,
      y
    );

  const nextX =
    Math.round(
      expandedPosition.x
    );

  const nextY =
    Math.round(
      expandedPosition.y
    );

  card.dataset.nodeX =
    String(nextX);

  card.dataset.nodeY =
    String(nextY);

  card.style.left =
    `${nextX}px`;

  card.style.top =
    `${nextY}px`;

  updateGraphCanvasEdges(
    stage
  );

  return {
    x:
      nextX,
    y:
      nextY,
    shiftX:
      expandedPosition.shiftX || 0,
    shiftY:
      expandedPosition.shiftY || 0
  };
}


function ensureGraphCanvasWorldContains(
  stage,
  x,
  y
) {

  const world =
    stage.querySelector(
      '[data-knowledge-graph-canvas-world]'
    );

  if (!world) {

    return {
      x,
      y
    };
  }

  let worldWidth =
    Number.parseFloat(
      world.style.width
    ) || 1200;

  let worldHeight =
    Number.parseFloat(
      world.style.height
    ) || 720;

  let shiftX =
    0;

  let shiftY =
    0;

  if (x < GRAPH_CANVAS_LEADING_EXPAND_PADDING) {

    shiftX =
      Math.ceil(
        GRAPH_CANVAS_LEADING_EXPAND_PADDING - x
      );

    x += shiftX;
    worldWidth += shiftX;
  }

  if (y < GRAPH_CANVAS_LEADING_EXPAND_PADDING) {

    shiftY =
      Math.ceil(
        GRAPH_CANVAS_LEADING_EXPAND_PADDING - y
      );

    y += shiftY;
    worldHeight += shiftY;
  }

  if (x > worldWidth - GRAPH_CANVAS_EXPAND_PADDING) {

    worldWidth =
      Math.ceil(
        x + GRAPH_CANVAS_EXPAND_PADDING
      );
  }

  if (y > worldHeight - GRAPH_CANVAS_EXPAND_PADDING) {

    worldHeight =
      Math.ceil(
        y + GRAPH_CANVAS_EXPAND_PADDING
      );
  }

  if (
    shiftX ||
    shiftY
  ) {

    shiftGraphCanvasCoordinates(
      stage,
      shiftX,
      shiftY
    );
  }

  resizeGraphCanvasWorld(
    stage,
    worldWidth,
    worldHeight
  );

  return {
    x,
    y,
    shiftX,
    shiftY
  };
}


function shiftGraphCanvasCoordinates(
  stage,
  shiftX,
  shiftY
) {

  stage
    .querySelectorAll(
      '[data-knowledge-graph-canvas-card]'
    )
    .forEach(card => {

      const nextX =
        getGraphCanvasNumber(
          card.dataset.nodeX,
          getGraphCanvasNumber(
            card.style.left
          )
        ) + shiftX;

      const nextY =
        getGraphCanvasNumber(
          card.dataset.nodeY,
          getGraphCanvasNumber(
            card.style.top
          )
        ) + shiftY;

      card.dataset.nodeX =
        String(
          Math.round(nextX)
        );

      card.dataset.nodeY =
        String(
          Math.round(nextY)
        );

      card.style.left =
        `${Math.round(nextX)}px`;

      card.style.top =
        `${Math.round(nextY)}px`;
    });

  const scale =
    clampGraphCanvasScale(
      getGraphCanvasNumber(
        stage.dataset.scale,
        1
      )
    );

  stage.dataset.panX =
    String(
      Math.round(
        getGraphCanvasNumber(stage.dataset.panX) - shiftX * scale
      )
    );

  stage.dataset.panY =
    String(
      Math.round(
        getGraphCanvasNumber(stage.dataset.panY) - shiftY * scale
      )
    );
}


function resizeGraphCanvasWorld(
  stage,
  width,
  height
) {

  const world =
    stage.querySelector(
      '[data-knowledge-graph-canvas-world]'
    );

  const svg =
    stage.querySelector(
      '.knowledge-graph-canvas-svg'
    );

  if (world) {

    world.style.width =
      `${Math.round(width)}px`;

    world.style.height =
      `${Math.round(height)}px`;
  }

  if (svg) {

    svg.setAttribute(
      'viewBox',
      `0 0 ${Math.round(width)} ${Math.round(height)}`
    );
  }

  applyGraphCanvasTransform(
    stage
  );
}


function updateGraphCanvasEdges(
  stage
) {

  const nodes =
    new Map();

  stage
    .querySelectorAll(
      '[data-knowledge-graph-canvas-card]'
    )
    .forEach(card => {

      nodes.set(
        card.dataset.nodeId,
        {
          x:
            getGraphCanvasNumber(
              card.dataset.nodeX,
              getGraphCanvasNumber(
                card.style.left
              )
            ),
          y:
            getGraphCanvasNumber(
              card.dataset.nodeY,
              getGraphCanvasNumber(
                card.style.top
              )
            )
        }
      );
    });

  stage
    .querySelectorAll(
      '[data-knowledge-graph-canvas-edge]'
    )
    .forEach(path => {

      const source =
        nodes.get(
          path.dataset.edgeFrom
        );

      const target =
        nodes.get(
          path.dataset.edgeTo
        );

      if (
        !source ||
        !target
      ) {

        return;
      }

      path.setAttribute(
        'd',
        `M ${source.x} ${source.y} L ${target.x} ${target.y}`
      );
    });

  stage
    .querySelectorAll(
      '[data-knowledge-graph-canvas-edge-label]'
    )
    .forEach(label => {

      const source =
        nodes.get(
          label.dataset.edgeFrom
        );

      const target =
        nodes.get(
          label.dataset.edgeTo
        );

      if (
        !source ||
        !target
      ) {

        return;
      }

      label.setAttribute(
        'x',
        String(
          Math.round((source.x + target.x) / 2)
        )
      );

      label.setAttribute(
        'y',
        String(
          Math.round((source.y + target.y) / 2)
        )
      );
    });
}


function applyGraphCanvasTransform(
  stage
) {

  const world =
    stage.querySelector(
      '[data-knowledge-graph-canvas-world]'
    );

  if (!world) return;

  const panX =
    getGraphCanvasNumber(
      stage.dataset.panX
    );

  const panY =
    getGraphCanvasNumber(
      stage.dataset.panY
    );

  const scale =
    clampGraphCanvasScale(
      getGraphCanvasNumber(
        stage.dataset.scale,
        1
      )
    );

  stage.dataset.scale =
    String(
      scale
    );

  world.style.transform =
    `translate(${panX}px, ${panY}px) scale(${scale})`;

  const scaleLabel =
    stage
      .closest(
        '.knowledge-graph-canvas-card'
      )
      ?.querySelector(
        '[data-knowledge-graph-canvas-scale]'
      );

  if (scaleLabel) {

    scaleLabel.textContent =
      `${Math.round(scale * 100)}%`;
  }
}


function getGraphCanvasNumber(
  value,
  fallback = 0
) {

  const number =
    Number.parseFloat(
      value
    );

  return Number.isFinite(number)
    ? number
    : fallback;
}


function clampGraphCanvasScale(
  scale
) {

  return Math.min(
    GRAPH_CANVAS_MAX_SCALE,
    Math.max(
      GRAPH_CANVAS_MIN_SCALE,
      Number.isFinite(scale)
        ? scale
      : 1
    )
  );
}


function clampGraphCanvasPosition(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      Number.isFinite(value)
        ? value
        : min
    )
  );
}


function activateTab(
  documentElement,
  tabName
) {

  documentElement
    .querySelectorAll(
      '[data-knowledge-graph-tab]'
    )
    .forEach(tab => {

      tab.classList.toggle(
        'is-active',
        tab.dataset.knowledgeGraphTab === tabName
      );
    });

  documentElement
    .querySelectorAll(
      '[data-knowledge-graph-panel]'
    )
    .forEach(panel => {

      const active =
        panel.dataset.knowledgeGraphPanel === tabName;

      panel.classList.toggle(
        'is-active',
        active
      );

      panel.hidden =
        !active;
    });
}


function activateDomain(
  documentElement,
  domain
) {

  documentElement
    .querySelectorAll(
      '[data-knowledge-graph-domain]'
    )
    .forEach(tab => {

      tab.classList.toggle(
        'is-active',
        tab.dataset.knowledgeGraphDomain === domain
      );
    });

  documentElement
    .querySelectorAll(
      '[data-knowledge-graph-domain-panel]'
    )
    .forEach(panel => {

      const active =
        panel.dataset.knowledgeGraphDomainPanel === domain;

      panel.classList.toggle(
        'is-active',
        active
      );

      panel.hidden =
        !active;
    });
}


async function openGraphPage(
  pageId
) {

  const page =
    state.pages.find(item =>
      item.id === pageId
    );

  if (!page) return;

  const editorModule =
    await import('../editor/editor.js');

  editorModule.openPage(
    page
  );
}


async function addRelationshipFromForm(
  documentElement,
  form
) {

  const formData =
    new FormData(
      form
    );

  const sourceId =
    String(formData.get('sourceId') || '');

  const targetId =
    String(formData.get('targetId') || '');

  if (
    !sourceId ||
    !targetId ||
    sourceId === targetId
  ) {

    setStatus(
      'Выберите две разные страницы для связи'
    );

    return;
  }

  const added =
    await addRelationshipBetweenPages(
      documentElement,
      {
        sourceId,
        targetId,
        type:
          String(formData.get('type') || 'related'),
        label:
          String(formData.get('label') || '').trim()
      }
    );

  if (added) {

    renderKnowledgeGraphPageAndFocus(
      documentElement,
      {
        force:
          true
      }
    );
  }
}


async function addRelationshipBetweenPages(
  documentElement,
  relationshipInput,
  options = {}
) {

  const sourceId =
    String(relationshipInput.sourceId || '');

  const targetId =
    String(relationshipInput.targetId || '');

  if (
    !sourceId ||
    !targetId ||
    sourceId === targetId
  ) {

    setStatus(
      'Выберите две разные страницы для связи'
    );

    return false;
  }

  const sourcePage =
    state.pages.find(page =>
      page.id === sourceId
    );

  if (!sourcePage) return false;

  const type =
    getEditableRelationshipType(
      relationshipInput.type
    );

  const label =
    String(relationshipInput.label || '').trim();

  const existingRelationships =
    sourcePage.relationships || [];

  const duplicate =
    existingRelationships.some(relationship =>
      relationship.targetId === targetId &&
      normalizeRelationshipForComparison(
        relationship.type
      ) === normalizeRelationshipForComparison(
        type
      )
    );

  if (duplicate) {

    setStatus(
      'Такая связь уже есть'
    );

    return false;
  }

  await writeSourcePageRelationships(
    sourcePage,
    [
      ...existingRelationships,
      {
        type,
        targetId,
        ...(label ? { label } : {})
      }
    ],
    {
      awaitWrite:
        options.awaitWrite
    }
  );

  if (options.recordHistory !== false) {

    pushGraphCanvasHistoryEntry(
      documentElement,
      {
        type:
          'relationship-create',
        relationship:
          {
            sourceId,
            targetId,
            type,
            label
          }
      }
    );
  }

  if (!options.silent) {

    setStatus(
      'Связь добавлена'
    );
  }

  return true;
}


function getRelationshipAtIndex(
  sourceId,
  index
) {

  const sourcePage =
    state.pages.find(page =>
      page.id === sourceId
    );

  const relationship =
    sourcePage?.relationships?.[index];

  if (!relationship) return null;

  return normalizeRelationshipRecord(
    relationship
  );
}


async function writeSourcePageRelationships(
  sourcePage,
  relationships,
  options = {}
) {

  sourcePage.relationships =
    relationships.map(relationship =>
      normalizeRelationshipRecord(
        relationship
      )
    );

  sourcePage.content =
    updateRelationshipsFrontMatter(
      sourcePage.content,
      sourcePage.relationships
    );

  notifyPageUpdated();

  const writePromise =
    writePageContent(
      sourcePage,
      sourcePage.content
    );

  if (options.awaitWrite === false) {

    writePromise.catch(error => {

      console.error(
        'Failed to persist knowledge graph relationship change.',
        error
      );
    });

    return;
  }

  await writePromise;
}


async function replaceRelationshipAtIndex(
  documentElement,
  relationshipInput,
  options = {}
) {

  const sourceId =
    String(relationshipInput.sourceId || '');

  const index =
    Number(
      relationshipInput.index
    );

  const sourcePage =
    state.pages.find(page =>
      page.id === sourceId
    );

  if (
    !sourcePage ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= (sourcePage.relationships || []).length
  ) {

    return false;
  }

  const before =
    normalizeRelationshipRecord(
      relationshipInput.before ||
      sourcePage.relationships[index]
    );

  const after =
    normalizeRelationshipRecord(
      relationshipInput.relationship
    );

  if (
    areRelationshipRecordsEqual(
      before,
      after
    )
  ) {

    return false;
  }

  const duplicate =
    (sourcePage.relationships || []).some((relationship, relationshipIndex) =>
      relationshipIndex !== index &&
      getRelationshipTargetId(relationship) === getRelationshipTargetId(after) &&
      normalizeRelationshipForComparison(relationship.type) ===
        normalizeRelationshipForComparison(after.type)
    );

  if (duplicate) {

    if (!options.silent) {

      setStatus(
        'Такая связь уже есть'
      );
    }

    return false;
  }

  const nextRelationships =
    [
      ...(sourcePage.relationships || [])
    ];

  nextRelationships[index] =
    after;

  await writeSourcePageRelationships(
    sourcePage,
    nextRelationships,
    {
      awaitWrite:
        options.awaitWrite
    }
  );

  if (options.recordHistory !== false) {

    pushGraphCanvasHistoryEntry(
      documentElement,
      {
        type:
          'relationship-update',
        sourceId,
        index,
        before,
        after
      }
    );
  }

  if (!options.silent) {

    setStatus(
      'Связь изменена'
    );
  }

  return true;
}


async function insertRelationshipAtIndex(
  documentElement,
  relationshipInput,
  options = {}
) {

  const sourceId =
    String(relationshipInput.sourceId || '');

  const sourcePage =
    state.pages.find(page =>
      page.id === sourceId
    );

  if (!sourcePage) return false;

  const nextRelationships =
    [
      ...(sourcePage.relationships || [])
    ];

  const index =
    Number.isInteger(Number(relationshipInput.index))
      ? Math.max(
          0,
          Math.min(
            Number(relationshipInput.index),
            nextRelationships.length
          )
        )
      : nextRelationships.length;

  nextRelationships.splice(
    index,
    0,
    normalizeRelationshipRecord(
      relationshipInput.relationship
    )
  );

  await writeSourcePageRelationships(
    sourcePage,
    nextRelationships,
    {
      awaitWrite:
        options.awaitWrite
    }
  );

  if (!options.silent) {

    setStatus(
      'Связь восстановлена'
    );
  }

  return true;
}


async function removeRelationshipAtIndex(
  documentElement,
  relationshipInput,
  options = {}
) {

  const sourceId =
    String(relationshipInput.sourceId || '');

  const index =
    Number(
      relationshipInput.index
    );

  const sourcePage =
    state.pages.find(page =>
      page.id === sourceId
    );

  if (
    !sourcePage ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= (sourcePage.relationships || []).length
  ) {

    return false;
  }

  const relationship =
    normalizeRelationshipRecord(
      relationshipInput.relationship ||
      sourcePage.relationships[index]
    );

  const nextRelationships =
    [
      ...(sourcePage.relationships || [])
    ];

  nextRelationships.splice(
    index,
    1
  );

  await writeSourcePageRelationships(
    sourcePage,
    nextRelationships,
    {
      awaitWrite:
        options.awaitWrite
    }
  );

  if (options.recordHistory !== false) {

    pushGraphCanvasHistoryEntry(
      documentElement,
      {
        type:
          'relationship-delete',
        relationship:
          {
            sourceId,
            index,
            relationship
          }
      }
    );
  }

  if (!options.silent) {

    setStatus(
      'Связь удалена'
    );
  }

  return true;
}


async function removeRelationshipBetweenPages(
  documentElement,
  relationshipInput,
  options = {}
) {

  const sourceId =
    String(relationshipInput.sourceId || '');

  const targetId =
    String(relationshipInput.targetId || '');

  if (
    !sourceId ||
    !targetId
  ) {

    return false;
  }

  const sourcePage =
    state.pages.find(page =>
      page.id === sourceId
    );

  if (!sourcePage) return false;

  const type =
    getEditableRelationshipType(
      relationshipInput.type
    );

  const label =
    String(relationshipInput.label || '').trim();

  let removed =
    false;

  const nextRelationships =
    (sourcePage.relationships || []).filter(relationship => {

      const matches =
        !removed &&
        relationship.targetId === targetId &&
        normalizeRelationshipForComparison(
          relationship.type
        ) === normalizeRelationshipForComparison(
          type
        ) &&
        String(relationship.label || '').trim() === label;

      if (matches) {

        removed =
          true;

        return false;
      }

      return true;
    });

  if (!removed) return false;

  await writeSourcePageRelationships(
    sourcePage,
    nextRelationships,
    {
      awaitWrite:
        options.awaitWrite
    }
  );

  if (!options.silent) {

    setStatus(
      'Связь удалена'
    );
  }

  return true;
}


function normalizeRelationshipForComparison(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}


function updateRelationshipsFrontMatter(
  content,
  relationships
) {

  const line =
    formatRelationshipsFrontMatter(
      relationships
    ).trimEnd();

  if (!String(content || '').startsWith('---')) {

    return content;
  }

  if (
    /^relationshipsJson:\s*.*$/im.test(
      content
    )
  ) {

    return content.replace(
      /^relationshipsJson:\s*.*$/im,
      line
    );
  }

  if (
    /^aliases:\s*\[.*?\]\s*$/im.test(
      content
    )
  ) {

    return content.replace(
      /^(aliases:\s*\[.*?\]\s*)$/im,
      `$1\n${line}`
    );
  }

  return content.replace(
    /^---\s*$/m,
    `---\n${line}`
  );
}


function getRelationshipLabel(
  type
) {

  return RELATIONSHIP_LABELS[type] || type;
}

