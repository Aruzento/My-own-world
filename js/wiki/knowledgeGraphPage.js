import {
  state
} from '../state.js';

import {
  iconSvg
} from '../core/icons.js';

import {
  escapeHTML
} from '../taskTracker/taskTrackerEscapeHTML.js';

import {
  setStatus
} from '../ui/ui.js';

import {
  buildKnowledgeGraphCanvasModel,
  buildKnowledgeGraph,
  getKnowledgeGraphDomainDefinitions,
  getKnowledgeGraphDomainEdges,
  getOrphanGraphPages
} from './knowledgeGraph.js';

import {
  getCanvasFilterBarHTML,
  getCanvasHiddenReasonLabels,
  getCanvasLayoutButtonHTML,
  getCanvasSliceSummaryLabel
} from './knowledgeGraphCanvasControls.js';

import {
  getRuntimeGraphFilters,
  handleGraphCanvasAction,
  handleGraphFilterAction,
  handleGraphFilterChange,
  handleGraphLayoutChange,
  handleGraphSliceAction
} from './knowledgeGraphCanvasActions.js';

import {
  getCanvasContentHTML,
  getCanvasSelectedNodeId
} from './knowledgeGraphCanvasRenderer.js';

import {
  getCanvasInspectorHTML,
  getCanvasInspectorInnerHTML,
  getCanvasInspectorNodeFromCard,
  getCanvasInspectorRelationshipsFromStage
} from './knowledgeGraphCanvasInspector.js';

import {
  EDITABLE_RELATIONSHIP_TYPES,
  getEditableRelationshipType,
  getRelationshipLabel
} from './knowledgeGraphLabels.js';

import {
  persistKnowledgeGraphRelationshipsCommand
} from './knowledgeGraphCommandBridge.js';

import {
  getRuntimeGraphConnectState,
  handleGraphCanvasNodeConnectClick,
  handleGraphConnectAction,
  handleGraphConnectTypeChange,
  handleGraphNodeMenuAction,
  hideGraphNodeContextMenu,
  isGraphOverlayEventTarget,
  setupKnowledgeGraphOverlayControllers,
  showGraphNodeContextMenu,
  toggleGraphNodeRelationshipsPanel
} from './knowledgeGraphCanvasOverlays.js';

import {
  getCanvasContextMenuHTML,
  getNodeRelationshipsMenuHTML as getNodeRelationshipsMenuRowsHTML,
  getRelationshipCountDotsHTML,
  getRelationshipEditorHTML as getRelationshipEditorFormHTML
} from './knowledgeGraphRelationshipMenu.js';

import {
  readKnowledgeGraphViewState,
  writeKnowledgeGraphViewState
} from './knowledgeGraphViewState.js';


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

const graphCanvasHistoryByDocument =
  new WeakMap();

const graphCanvasKeyboardHandlersByDocument =
  new WeakMap();

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
      documentElement,
      getGraphOverlayActionOptions()
    );

  const selectedNodeId =
    documentElement.dataset.currentKnowledgeGraphSelectedNode ||
    '';

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
      connectState,
      selectedNodeId
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

  initializeGraphCanvasSelection(
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
    'data-current-knowledge-graph-selected-node'
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


function renderKnowledgeGraphDocument(
  documentElement
) {

  renderKnowledgeGraphPage(
    documentElement.closest(
      '#editorArea'
    ) || document
  );
}


function getGraphOverlayActionOptions() {

  return {
    addRelationship:
      addRelationshipBetweenPages,
    findNodeCard:
      findGraphCanvasNodeCard,
    getPageTitle:
      getGraphPageTitle,
    getRelationshipCount:
      nodeId => getEditableNodeRelationships(
        nodeId
      ).length,
    getRelationshipCountHTML:
      getRelationshipCountDotsHTML,
    getRelationshipsHTML:
      getNodeRelationshipsMenuHTML,
    openPage:
      openGraphPage,
    persistPosition:
      persistGraphCanvasPosition,
    readViewState:
      readKnowledgeGraphViewState,
    render:
      renderKnowledgeGraphDocument,
    renderFocus:
      renderKnowledgeGraphPageAndFocus,
    resetPosition:
      resetGraphCanvasPosition
  };
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
              silent: true
            }
          )
        : await removeRelationshipBetweenPages(
            documentElement,
            entry.relationship,
            {
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
              silent: true
            }
          )
        : await insertRelationshipAtIndex(
            documentElement,
            entry.relationship,
            {
              recordHistory: false,
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
  connectState,
  selectedNodeId
) {

  return `
    <div class="knowledge-graph-runtime" data-runtime="true" contenteditable="false">
      <section class="knowledge-graph-panel is-active" data-knowledge-graph-panel="visual">
        ${getVisualGraphHTML(graph, layout, filters, viewState, connectState, selectedNodeId)}
      </section>
    </div>
  `;
}


function getVisualGraphHTML(
  graph,
  layout,
  filters,
  viewState,
  connectState,
  selectedNodeId
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

  const activeNodeId =
    getCanvasSelectedNodeId(
      canvasModel,
      selectedNodeId
    );

  return `
    <section
      class="knowledge-graph-workbench"
      data-knowledge-graph-migration="phase-7-slice"
      data-knowledge-graph-selected-node="${escapeHTML(activeNodeId)}"
    >
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
              class="knowledge-graph-history-button mow-icon-button"
              data-size="sm"
              data-knowledge-graph-history-action="undo"
              title="Отменить действие графа (Ctrl+Z)"
              aria-label="Отменить действие графа"
              disabled
            >
              ${iconSvg('arrow-left', 'knowledge-graph-toolbar-icon')}
              <span class="knowledge-graph-toolbar-label">Назад</span>
            </button>
            <button
              type="button"
              class="knowledge-graph-history-button mow-icon-button"
              data-size="sm"
              data-knowledge-graph-history-action="redo"
              title="Повторить действие графа (Ctrl+Y)"
              aria-label="Повторить действие графа"
              disabled
            >
              ${iconSvg('skip-forward', 'knowledge-graph-toolbar-icon')}
              <span class="knowledge-graph-toolbar-label">Вперед</span>
            </button>
            <button class="knowledge-graph-zoom-button mow-icon-button" data-size="sm" type="button" data-knowledge-graph-canvas-action="zoom-out" title="Уменьшить" aria-label="Уменьшить">−</button>
            <button class="knowledge-graph-fit-button mow-icon-button" data-size="sm" type="button" data-knowledge-graph-canvas-action="fit" title="Показать весь граф" aria-label="Показать весь граф">
              ${iconSvg('link', 'knowledge-graph-toolbar-icon')}
              <span class="knowledge-graph-toolbar-label">Центр</span>
            </button>
            <button class="knowledge-graph-zoom-button mow-icon-button" data-size="sm" type="button" data-knowledge-graph-canvas-action="zoom-in" title="Увеличить" aria-label="Увеличить">+</button>
            <span data-knowledge-graph-canvas-scale title="Масштаб 100%">100%</span>
            <button class="knowledge-graph-refresh mow-icon-button" data-size="sm" type="button" title="Обновить граф" aria-label="Обновить граф">
              ${iconSvg('repeat', 'knowledge-graph-toolbar-icon')}
              <span class="knowledge-graph-toolbar-label">Обновить</span>
            </button>
          </div>
        </header>
        ${getCanvasFilterBarHTML(
          graph,
          canvasModel,
          {
            getPageTitle:
              getGraphPageTitle
          }
        )}
        ${getCanvasOverflowNoteHTML(canvasModel)}
        ${getCanvasConnectBannerHTML(connectState)}
        ${getCanvasConnectDetailsPopupHTML(connectState)}
        <div class="knowledge-graph-canvas-body${activeNodeId ? ' has-inspector' : ''}">
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
              ${getCanvasContentHTML(canvasModel, connectState, activeNodeId)}
            </div>
          </div>
          ${getCanvasInspectorHTML(canvasModel, activeNodeId)}
        </div>
        ${getCanvasContextMenuHTML()}
      </div>
    </section>
  `;
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
      data-knowledge-graph-overlay-ui="0.0.1.8.13.3"
      role="dialog"
      aria-modal="false"
      aria-label="Создание связи графа"
    >
      <header class="knowledge-graph-overlay-header">
        <span class="knowledge-graph-overlay-header-icon">
          ${iconSvg('link', 'knowledge-graph-overlay-icon')}
        </span>
        <div>
          <span>Связь</span>
          <strong>Новая</strong>
        </div>
      </header>
      <div class="knowledge-graph-connect-path">
        <span>${escapeHTML(connectState.sourceTitle)}</span>
        ${iconSvg('link', 'knowledge-graph-connect-path-icon')}
        <span>${escapeHTML(connectState.targetTitle)}</span>
      </div>
      <div class="knowledge-graph-overlay-fieldset">
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
      </div>
      <div class="knowledge-graph-connect-popup-actions">
        <button
          type="button"
          data-knowledge-graph-connect-action="create"
          aria-label="Создать связь"
          title="Создать связь"
        >
          ${iconSvg('check', 'knowledge-graph-node-menu-action-svg')}
          <span class="knowledge-graph-toolbar-label">Создать</span>
        </button>
        <button
          type="button"
          data-knowledge-graph-connect-action="cancel"
          aria-label="Отмена"
          title="Отмена"
        >
          ${iconSvg('x', 'knowledge-graph-node-menu-action-svg')}
          <span class="knowledge-graph-toolbar-label">Отмена</span>
        </button>
      </div>
    </section>
  `;
}


function getGraphPageTitle(
  pageId
) {

  return state.pages.find(page =>
    page.id === pageId
  )?.title ||
    pageId;
}


function getCanvasOverflowNoteHTML(
  canvasModel
) {

  if (
    canvasModel.hiddenTotalNodeCount === 0 &&
    canvasModel.hiddenTotalEdgeCount === 0
  ) {

    return '';
  }

  const hiddenReasons =
    getCanvasHiddenReasonLabels(
      canvasModel
    );

  const reasonText =
    hiddenReasons.length > 0
      ? hiddenReasons.join(' · ')
      : 'часть связей сейчас вне видимой области';

  const detailsText =
    `${getCanvasSliceSummaryLabel(canvasModel)}; ${reasonText}; скрыто связей: ${canvasModel.hiddenTotalEdgeCount}`;

  const showAllAction =
    canvasModel.hiddenBySliceNodeCount > 0 &&
    canvasModel.filters.viewPreset !== 'all'
      ? `
        <button
          type="button"
          data-knowledge-graph-slice-action="show-all"
          aria-label="Показать все связи"
          title="Показать все связи"
        >
          ${iconSvg('eye', 'knowledge-graph-slice-action-icon')}
          <span class="knowledge-graph-toolbar-label">Все связи</span>
        </button>
      `
      : '';

  return `
    <aside
      class="knowledge-graph-canvas-slice-note"
      data-knowledge-graph-slice-note
      aria-label="${escapeHTML(detailsText)}"
      title="${escapeHTML(detailsText)}"
    >
      <span class="knowledge-graph-canvas-slice-note-icon">
        ${iconSvg('eye-off', 'knowledge-graph-slice-note-icon-svg')}
      </span>
      <div>
        <strong>Фрагмент</strong>
      </div>
      <div class="knowledge-graph-canvas-slice-actions">
        ${showAllAction}
        <button
          type="button"
          data-knowledge-graph-slice-action="refine"
          aria-label="Уточнить поиск"
          title="Уточнить поиск"
        >
          ${iconSvg('search', 'knowledge-graph-slice-action-icon')}
          <span class="knowledge-graph-toolbar-label">Уточнить поиск</span>
        </button>
      </div>
    </aside>
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

  return getRelationshipEditorFormHTML(
    pages
  );
}


function getNodeRelationshipsMenuHTML(
  nodeId
) {

  const relationships =
    getEditableNodeRelationships(
      nodeId
    );

  return getNodeRelationshipsMenuRowsHTML(
    relationships
  );
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

  setupKnowledgeGraphOverlayControllers(
    documentElement,
    getGraphOverlayActionOptions()
  );
}


function setupKnowledgeGraphEvents(
  documentElement
) {

  if (documentElement.dataset.knowledgeGraphReady === 'true') return;

  documentElement.dataset.knowledgeGraphReady =
    'true';

  const graphOverlayOptions =
    getGraphOverlayActionOptions();

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

      const relationshipsToggle =
        event.target.closest(
          '[data-knowledge-graph-relationships-toggle]'
        );

      if (relationshipsToggle) {

        event.preventDefault();

        toggleGraphNodeRelationshipsPanel(
          relationshipsToggle
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
          nodeMenuAction,
          graphOverlayOptions
        );

        return;
      }

      if (
        !event.target.closest(
          '[data-knowledge-graph-node-menu]'
        )
      ) {

        hideGraphNodeContextMenu(
          documentElement,
          graphOverlayOptions
        );
      }

      const connectAction =
        event.target.closest(
          '[data-knowledge-graph-connect-action]'
        );

      if (connectAction) {

        await handleGraphConnectAction(
          documentElement,
          connectAction.dataset.knowledgeGraphConnectAction,
          graphOverlayOptions
        );

        return;
      }

      const sliceAction =
        event.target.closest(
          '[data-knowledge-graph-slice-action]'
        );

      if (sliceAction) {

        handleGraphSliceAction(
          documentElement,
          sliceAction.dataset.knowledgeGraphSliceAction,
          {
            render:
              renderKnowledgeGraphDocument
          }
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
          filterAction.dataset.knowledgeGraphFilterAction,
          {
            render:
              renderKnowledgeGraphDocument
          }
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
          layoutButton.dataset.knowledgeGraphLayout,
          {
            render:
              renderKnowledgeGraphDocument
          }
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

      const inspectorAction =
        event.target.closest(
          '[data-knowledge-graph-inspector-action]'
        );

      if (inspectorAction) {

        await handleGraphInspectorAction(
          documentElement,
          inspectorAction
        );

        return;
      }

      const canvasAction =
        event.target.closest(
          '[data-knowledge-graph-canvas-action]'
        );

      if (canvasAction) {

        handleGraphCanvasAction(
          canvasAction,
          {
            applyTransform:
              applyGraphCanvasTransform,
            clampScale:
              clampGraphCanvasScale,
            fitCanvas:
              fitGraphCanvas,
            zoomStep:
              GRAPH_CANVAS_ZOOM_STEP
          }
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
            canvasNode.dataset.knowledgeGraphCanvasNode,
            graphOverlayOptions
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

        handleGraphConnectTypeChange(
          documentElement,
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
        event.target,
        {
          render:
            renderKnowledgeGraphDocument
        }
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
          documentElement,
          graphOverlayOptions
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
          documentElement,
          null,
          {
            render:
              renderKnowledgeGraphDocument
          }
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
        event.clientY,
        graphOverlayOptions
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

      if (isGraphOverlayEventTarget(event.target)) {

        return;
      }

      event.preventDefault();

      hideGraphNodeContextMenu(
        documentElement,
        graphOverlayOptions
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
        documentElement,
        graphOverlayOptions
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


async function handleGraphInspectorAction(
  documentElement,
  actionButton
) {

  const inspector =
    actionButton.closest(
      '[data-knowledge-graph-inspector]'
    );

  const nodeId =
    inspector?.dataset.nodeId;

  if (!nodeId) return;

  const action =
    actionButton.dataset.knowledgeGraphInspectorAction;

  if (action === 'open') {

    await openGraphPage(
      nodeId
    );

    return;
  }

  documentElement.dataset.currentKnowledgeGraphSelectedNode =
    nodeId;

  if (action === 'focus') {

    documentElement.dataset.currentKnowledgeGraphFocusNode =
      nodeId;

    setStatus(
      'Показаны соседи выбранной страницы'
    );
  }

  if (action === 'clear-focus') {

    delete documentElement.dataset.currentKnowledgeGraphFocusNode;

    setStatus(
      'Показан весь текущий срез графа'
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
        documentElement,
        getGraphOverlayActionOptions()
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
      documentElement,
      getGraphOverlayActionOptions()
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


function initializeGraphCanvasSelection(
  documentElement
) {

  const requestedNodeId =
    documentElement.dataset.currentKnowledgeGraphSelectedNode ||
    '';

  const requestedCard =
    requestedNodeId
      ? findGraphCanvasNodeCard(
        documentElement,
        requestedNodeId
      )
      : null;

  const selectedCard =
    requestedCard ||
    documentElement.querySelector(
      '[data-knowledge-graph-canvas-card].is-selected'
    ) ||
    documentElement.querySelector(
      '[data-knowledge-graph-canvas-card]'
    );

  if (!selectedCard?.dataset.nodeId) {

    delete documentElement.dataset.currentKnowledgeGraphSelectedNode;

    updateGraphCanvasSelectionState(
      documentElement,
      ''
    );

    updateGraphCanvasSelectionInspector(
      documentElement,
      ''
    );

    return;
  }

  selectGraphCanvasNode(
    documentElement,
    selectedCard.dataset.nodeId
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

  if (!nodeId) {

    delete documentElement.dataset.currentKnowledgeGraphSelectedNode;

    updateGraphCanvasSelectionState(
      documentElement,
      ''
    );

    updateGraphCanvasSelectionInspector(
      documentElement,
      ''
    );

    return;
  }

  documentElement.dataset.currentKnowledgeGraphSelectedNode =
    nodeId;

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

  updateGraphCanvasSelectionState(
    documentElement,
    nodeId
  );

  updateGraphCanvasSelectionInspector(
    documentElement,
    nodeId
  );
}


function updateGraphCanvasSelectionState(
  documentElement,
  nodeId
) {

  const stage =
    documentElement.querySelector(
      '[data-knowledge-graph-canvas-stage]'
    );

  if (!stage) return;

  const relatedNodeIds =
    new Set();

  stage
    .querySelectorAll(
      '[data-knowledge-graph-canvas-edge]'
    )
    .forEach(edge => {

      const isActive =
        Boolean(nodeId) &&
        (
          edge.dataset.edgeFrom === nodeId ||
          edge.dataset.edgeTo === nodeId
        );

      if (isActive) {

        relatedNodeIds.add(
          edge.dataset.edgeFrom
        );

        relatedNodeIds.add(
          edge.dataset.edgeTo
        );
      }

      const edgeState =
        !nodeId
          ? 'neutral'
          : isActive
            ? 'active'
            : 'muted';

      edge.dataset.edgeState =
        edgeState;

      edge.classList.toggle(
        'is-active',
        edgeState === 'active'
      );

      edge.classList.toggle(
        'is-muted',
        edgeState === 'muted'
      );
    });

  stage
    .querySelectorAll(
      '[data-knowledge-graph-canvas-edge-label]'
    )
    .forEach(label => {

      const isActive =
        Boolean(nodeId) &&
        (
          label.dataset.edgeFrom === nodeId ||
          label.dataset.edgeTo === nodeId
        );

      const edgeState =
        !nodeId
          ? 'neutral'
          : isActive
            ? 'active'
            : 'muted';

      label.dataset.edgeState =
        edgeState;

      label.classList.toggle(
        'is-active',
        edgeState === 'active'
      );

      label.classList.toggle(
        'is-muted',
        edgeState === 'muted'
      );
    });

  stage.classList.toggle(
    'has-node-selection',
    Boolean(nodeId)
  );

  stage
    .querySelectorAll(
      '[data-knowledge-graph-canvas-card]'
    )
    .forEach(card => {

      const isSelected =
        card.dataset.nodeId === nodeId;

      const isRelated =
        Boolean(nodeId) &&
        !isSelected &&
        relatedNodeIds.has(
          card.dataset.nodeId
        );

      card.classList.toggle(
        'is-related',
        isRelated
      );

      card.classList.toggle(
        'is-muted',
        Boolean(nodeId) &&
          !isSelected &&
          !isRelated
      );
    });
}


function updateGraphCanvasSelectionInspector(
  documentElement,
  nodeId
) {

  const inspector =
    documentElement.querySelector(
      '[data-knowledge-graph-inspector]'
    );

  if (!inspector) return;

  const card =
    nodeId
      ? findGraphCanvasNodeCard(
        documentElement,
        nodeId
      )
      : null;

  if (!card) {

    inspector.hidden =
      true;

    delete inspector.dataset.nodeId;

    return;
  }

  inspector.hidden =
    false;

  inspector.dataset.nodeId =
    nodeId;

  inspector.innerHTML =
    getCanvasInspectorInnerHTML(
      getCanvasInspectorNodeFromCard(
        card
      ),
      getCanvasInspectorRelationshipsFromStage(
        card.closest(
          '[data-knowledge-graph-canvas-stage]'
        ),
        nodeId
      ),
      documentElement.dataset.currentKnowledgeGraphFocusNode === nodeId
    );
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
      reason:
        'knowledge-graph-relationship-create'
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

  await persistKnowledgeGraphRelationshipsCommand({
    page:
      sourcePage,
    relationships:
      relationships.map(relationship =>
        normalizeRelationshipRecord(
          relationship
        )
      ),
    reason:
      options.reason || 'knowledge-graph-relationship-change'
  });
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
      reason:
        'knowledge-graph-relationship-update'
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
      reason:
        'knowledge-graph-relationship-restore'
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
      reason:
        'knowledge-graph-relationship-delete'
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
      reason:
        'knowledge-graph-relationship-remove-between-pages'
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
