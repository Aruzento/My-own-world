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


export function getCanvasInspectorHTML(
  canvasModel,
  selectedNodeId
) {

  if (!selectedNodeId) return '';

  const selectedNode =
    canvasModel.nodes.find(node =>
      node.id === selectedNodeId
    );

  if (!selectedNode) return '';

  return `
    <aside
      class="knowledge-graph-canvas-inspector"
      data-knowledge-graph-inspector
      data-node-id="${escapeHTML(selectedNode.id)}"
      aria-label="Инспектор узла графа"
    >
      ${getCanvasInspectorInnerHTML(
        selectedNode,
        getCanvasInspectorRelationshipsFromModel(
          canvasModel,
          selectedNodeId
        ),
        canvasModel.filters.focusNodeId === selectedNodeId
      )}
    </aside>
  `;
}


export function getCanvasInspectorInnerHTML(
  node,
  relationships,
  isFocused
) {

  const outgoingCount =
    relationships.filter(relationship =>
      relationship.direction === 'outgoing'
    ).length;

  const incomingCount =
    relationships.length - outgoingCount;

  const summaryText =
    `${relationships.length} видимых связей: ${outgoingCount} исходящих, ${incomingCount} входящих${node.isPinned ? '; закреплена' : ''}`;

  return `
    <header
      class="knowledge-graph-canvas-inspector-header"
      title="${escapeHTML(summaryText)}"
      aria-label="${escapeHTML(summaryText)}"
    >
      <span class="knowledge-graph-canvas-inspector-icon" aria-hidden="true">
        ${iconSvg(getCanvasNodeIcon(node), 'app-icon')}
      </span>
      <div class="knowledge-graph-canvas-inspector-heading">
        <strong>${escapeHTML(node.title || node.id)}</strong>
        <span>${escapeHTML(node.domainLabel || 'Заметки')}</span>
      </div>
      <div class="knowledge-graph-canvas-inspector-actions">
        <button
          type="button"
          data-knowledge-graph-inspector-action="open"
          aria-label="Открыть карточку"
          title="Открыть карточку"
        >
          ${iconSvg('document', 'knowledge-graph-inspector-action-icon')}
          <span class="knowledge-graph-toolbar-label">Открыть</span>
        </button>
        <button
          type="button"
          data-knowledge-graph-inspector-action="${isFocused ? 'clear-focus' : 'focus'}"
          aria-label="${isFocused ? 'Показать весь граф' : 'Показать соседей'}"
          title="${isFocused ? 'Показать весь граф' : 'Показать соседей'}"
        >
          ${iconSvg(isFocused ? 'eye-off' : 'eye', 'knowledge-graph-inspector-action-icon')}
          <span class="knowledge-graph-toolbar-label">${isFocused ? 'Весь граф' : 'Соседи'}</span>
        </button>
      </div>
    </header>
    <section
      class="knowledge-graph-canvas-inspector-relations"
      aria-label="${escapeHTML(summaryText)}"
    >
      ${
        relationships.length > 0
          ? `
            <div class="knowledge-graph-canvas-inspector-relation-list">
              ${relationships
                .slice(0, 5)
                .map(getCanvasInspectorRelationshipHTML)
                .join('')}
            </div>
          `
          : `
            <p class="knowledge-graph-canvas-inspector-empty">
              Нет видимых связей
            </p>
          `
      }
    </section>
  `;
}


export function getCanvasInspectorNodeFromCard(
  card
) {

  return {
    id:
      card.dataset.nodeId || '',
    title:
      card.dataset.nodeTitle || card.dataset.nodeId || '',
    type:
      card.dataset.nodeType || 'note',
    domain:
      card.dataset.nodeDomain || 'note',
    domainLabel:
      card.dataset.nodeDomainLabel || 'Заметки',
    edgeCount:
      Number(
        card.dataset.nodeEdgeCount
      ) || 0,
    isPinned:
      card.dataset.nodePinned === 'true'
  };
}


export function getCanvasInspectorRelationshipsFromStage(
  stage,
  selectedNodeId
) {

  if (
    !stage ||
    !selectedNodeId
  ) {

    return [];
  }

  const nodesById =
    new Map(
      [
        ...stage.querySelectorAll(
          '[data-knowledge-graph-canvas-card]'
        )
      ].map(card => [
        card.dataset.nodeId,
        getCanvasInspectorNodeFromCard(
          card
        )
      ])
    );

  return [
    ...stage.querySelectorAll(
      '[data-knowledge-graph-canvas-edge]'
    )
  ]
    .filter(edge =>
      edge.dataset.edgeFrom === selectedNodeId ||
      edge.dataset.edgeTo === selectedNodeId
    )
    .map(edge =>
      getCanvasInspectorRelationship(
        {
          from:
            edge.dataset.edgeFrom || '',
          to:
            edge.dataset.edgeTo || '',
          type:
            edge.dataset.edgeType || '',
          label:
            edge.dataset.edgeLabel || '',
          source:
            edge.dataset.edgeSource || ''
        },
        selectedNodeId,
        nodesById
      )
    );
}


function getCanvasInspectorRelationshipsFromModel(
  canvasModel,
  selectedNodeId
) {

  const nodesById =
    new Map(
      (canvasModel.nodes || []).map(node => [
        node.id,
        node
      ])
    );

  return (canvasModel.edges || [])
    .filter(edge =>
      edge.from === selectedNodeId ||
      edge.to === selectedNodeId
    )
    .map(edge =>
      getCanvasInspectorRelationship(
        edge,
        selectedNodeId,
        nodesById
      )
    );
}


function getCanvasInspectorRelationship(
  edge,
  selectedNodeId,
  nodesById
) {

  const isOutgoing =
    edge.from === selectedNodeId;

  const otherId =
    isOutgoing
      ? edge.to
      : edge.from;

  const otherNode =
    nodesById.get(
      otherId
    );

  return {
    direction:
      isOutgoing
        ? 'outgoing'
        : 'incoming',
    otherId,
    otherTitle:
      otherNode?.title ||
      otherId,
    otherDomainLabel:
      otherNode?.domainLabel ||
      '',
    type:
      edge.type || '',
    typeLabel:
      getRelationshipLabel(
        edge.type
      ),
    label:
      edge.label || '',
    source:
      edge.source || ''
  };
}


function getCanvasInspectorRelationshipHTML(
  relationship
) {

  const directionLabel =
    relationship.direction === 'outgoing'
      ? 'к'
      : 'от';

  const detailParts =
    [
      relationship.typeLabel,
      relationship.label,
      relationship.otherDomainLabel
    ].filter(Boolean);

  return `
    <button
      class="knowledge-graph-canvas-inspector-relation"
      type="button"
      data-page-id="${escapeHTML(relationship.otherId)}"
      data-knowledge-graph-inspector-relation
      data-relation-direction="${escapeHTML(relationship.direction)}"
      data-relation-other-id="${escapeHTML(relationship.otherId)}"
      data-relation-type="${escapeHTML(relationship.type)}"
      title="${escapeHTML(detailParts.length > 0 ? `${detailParts.join(' · ')}; открыть связанную страницу` : 'Открыть связанную страницу')}"
      aria-label="${escapeHTML(`Открыть связанную страницу: ${relationship.otherTitle}`)}"
    >
      <span class="knowledge-graph-canvas-inspector-relation-direction">${escapeHTML(directionLabel)}</span>
      <strong>${escapeHTML(relationship.otherTitle)}</strong>
    </button>
  `;
}
