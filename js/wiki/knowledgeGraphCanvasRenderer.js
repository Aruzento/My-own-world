import {
  iconSvg
} from '../core/icons.js';

import {
  escapeHTML
} from '../taskTracker/taskTrackerEscapeHTML.js';

import {
  getCanvasNodeIcon
} from './knowledgeGraphCanvasIcons.js';

import {
  getRelationshipLabel
} from './knowledgeGraphLabels.js';


export function getCanvasSelectedNodeId(
  canvasModel,
  selectedNodeId
) {

  const visibleIds =
    new Set(
      (canvasModel.nodes || []).map(node => node.id)
    );

  if (
    selectedNodeId &&
    visibleIds.has(
      selectedNodeId
    )
  ) {

    return selectedNodeId;
  }

  return canvasModel.nodes?.[0]?.id ||
    '';
}


export function getCanvasContentHTML(
  canvasModel,
  connectState,
  selectedNodeId
) {

  const visibleNodes =
    canvasModel.nodes || [];

  if (visibleNodes.length === 0) {

    return getCanvasEmptyStateHTML();
  }

  return `
    ${getCanvasEdgesHTML(canvasModel, selectedNodeId)}
    ${getCanvasNodesHTML(canvasModel, connectState, selectedNodeId)}
  `;
}


function getCanvasEmptyStateHTML() {

  return `
    <div class="knowledge-graph-canvas-empty">
      Ничего не найдено. Измени фильтры или нажми «Сброс».
    </div>
  `;
}


function getCanvasEdgeSelectionState(
  edge,
  selectedNodeId
) {

  if (!selectedNodeId) return 'neutral';

  return edge.from === selectedNodeId ||
    edge.to === selectedNodeId
    ? 'active'
    : 'muted';
}


function getCanvasEdgesHTML(
  canvasModel,
  selectedNodeId
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
          .map(edge => {

            const edgeState =
              getCanvasEdgeSelectionState(
                edge,
                selectedNodeId
              );

            return `
            <path
              class="knowledge-graph-canvas-edge knowledge-graph-canvas-edge_${escapeHTML(edge.type)}${edgeState === 'active' ? ' is-active' : ''}${edgeState === 'muted' ? ' is-muted' : ''}"
              data-knowledge-graph-canvas-edge
              data-edge-from="${escapeHTML(edge.from)}"
              data-edge-to="${escapeHTML(edge.to)}"
              data-edge-type="${escapeHTML(edge.type || '')}"
              data-edge-type-label="${escapeHTML(getRelationshipLabel(edge.type))}"
              data-edge-label="${escapeHTML(edge.label || '')}"
              data-edge-source="${escapeHTML(edge.source || '')}"
              data-edge-state="${escapeHTML(edgeState)}"
              d="M ${escapeHTML(edge.x1)} ${escapeHTML(edge.y1)} L ${escapeHTML(edge.x2)} ${escapeHTML(edge.y2)}"
              marker-end="url(#knowledge-graph-arrow)"
            ></path>
            <text
              class="knowledge-graph-canvas-edge-label${edgeState === 'active' ? ' is-active' : ''}${edgeState === 'muted' ? ' is-muted' : ''}"
              data-knowledge-graph-canvas-edge-label
              data-edge-from="${escapeHTML(edge.from)}"
              data-edge-to="${escapeHTML(edge.to)}"
              data-edge-type="${escapeHTML(edge.type || '')}"
              data-edge-state="${escapeHTML(edgeState)}"
              x="${escapeHTML(edge.midX)}"
              y="${escapeHTML(edge.midY)}"
            >${escapeHTML(getRelationshipLabel(edge.type))}</text>
          `;
          })
          .join('')}
      </g>
    </svg>
  `;
}


function getCanvasNodesHTML(
  canvasModel,
  connectState,
  selectedNodeId
) {

  return `
    <div class="knowledge-graph-canvas-nodes">
      ${canvasModel.nodes
        .map(node => {

          const isConnectSource =
            connectState.activeSourceId === node.id;

          const isConnectTarget =
            Boolean(connectState.activeSourceId) &&
            connectState.activeSourceId !== node.id;

          const isSelected =
            selectedNodeId === node.id;

          return `
          <article
            class="knowledge-graph-canvas-node-card${isSelected ? ' is-selected' : ''}${node.isHub ? ' is-hub' : ''}${node.isPinned ? ' is-pinned' : ''}${isConnectSource ? ' is-connect-source' : ''}${isConnectTarget ? ' is-connect-target' : ''}"
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
              aria-pressed="${isSelected ? 'true' : 'false'}"
              title="Перетащить ноду. ПКМ - действия."
            >
              <strong>${escapeHTML(node.title || node.id)}</strong>
              <span class="knowledge-graph-canvas-node-meta">
                ${iconSvg(getCanvasNodeIcon(node), 'knowledge-graph-node-domain-icon')}
                <span>${escapeHTML(node.domainLabel || 'Заметки')} · ${escapeHTML(node.type || 'note')}</span>
              </span>
            </button>
          </article>
        `;
        })
        .join('')}
    </div>
  `;
}
