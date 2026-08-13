import {
  iconSvg
} from '../core/icons.js';

import {
  escapeHTML
} from '../taskTracker/taskTrackerEscapeHTML.js';

import {
  EDITABLE_RELATIONSHIP_TYPES,
  getEditableRelationshipType
} from './knowledgeGraphLabels.js';


export function getCanvasContextMenuHTML() {

  return `
    <div
      class="knowledge-graph-node-menu hidden"
      data-knowledge-graph-node-menu
      data-knowledge-graph-overlay-ui="0.0.1.8.13.3"
      role="menu"
      aria-orientation="vertical"
      aria-modal="false"
      aria-label="Действия узла графа"
      hidden
    >
      <header class="knowledge-graph-overlay-header">
        <span class="knowledge-graph-overlay-header-icon">
          ${iconSvg('document', 'knowledge-graph-overlay-icon')}
        </span>
        <div>
          <span>Узел графа</span>
          <strong data-knowledge-graph-node-menu-title></strong>
        </div>
      </header>
      <div class="knowledge-graph-node-menu-section" data-knowledge-graph-node-menu-section="navigation">
        ${getGraphNodeMenuActionHTML('open', 'document', 'Открыть')}
        ${getGraphNodeMenuActionHTML('focus', 'search', 'Показать соседей')}
        ${getGraphNodeMenuActionHTML('clear-focus', 'eye', 'Показать весь граф')}
      </div>
      <div class="knowledge-graph-node-menu-section" data-knowledge-graph-node-menu-section="layout">
        ${getGraphNodeMenuActionHTML('pin-position', 'grip', 'Закрепить здесь')}
        ${getGraphNodeMenuActionHTML('reset-position', 'x', 'Сбросить позицию')}
        ${getGraphNodeMenuActionHTML('connect', 'link', 'Связать...')}
      </div>
      <section
        class="knowledge-graph-node-menu-relationship-panel"
        data-knowledge-graph-relationships-expanded="false"
      >
        <button
          type="button"
          class="knowledge-graph-node-menu-section-header"
          data-knowledge-graph-relationships-toggle
          aria-expanded="false"
        >
          <span>
            ${iconSvg('link', 'knowledge-graph-node-menu-section-icon')}
            Связи
          </span>
          <small
            data-knowledge-graph-node-menu-relationship-count
            aria-label="0 ручных связей"
            title="0 ручных связей"
          ></small>
        </button>
        <div
          class="knowledge-graph-node-menu-relationships"
          data-knowledge-graph-node-menu-relationships
        ></div>
      </section>
    </div>
  `;
}


export function getRelationshipCountDotsHTML(
  count
) {

  const dotCount =
    Math.max(
      0,
      Math.min(
        Number(count) || 0,
        3
      )
    );

  return Array.from(
    {
      length:
        dotCount
    },
    () => '<span aria-hidden="true"></span>'
  ).join('');
}


export function getRelationshipEditorHTML(
  pages
) {

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


export function getNodeRelationshipsMenuHTML(
  relationships
) {

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
          ${iconSvg('link', 'knowledge-graph-node-menu-relationship-icon')}
          <span>${escapeHTML(relationship.sourceTitle)} -&gt; ${escapeHTML(relationship.targetTitle)}</span>
        </span>
        <label class="knowledge-graph-node-menu-relationship-field is-type">
          <span>Тип</span>
          <select data-knowledge-graph-relationship-field="type">
            ${getEditableRelationshipTypeOptionsHTML(relationship.type)}
          </select>
        </label>
        <label class="knowledge-graph-node-menu-relationship-field is-label">
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
            class="mow-icon-button"
            data-size="sm"
            type="button"
            data-knowledge-graph-relationship-menu-action="save"
            aria-label="Сохранить связь"
            title="Сохранить связь"
          >
            ${iconSvg('check', 'knowledge-graph-node-menu-action-svg')}
          </button>
          <button
            class="mow-icon-button"
            data-size="sm"
            data-variant="danger"
            type="button"
            data-knowledge-graph-relationship-menu-action="delete"
            aria-label="Удалить связь"
            title="Удалить связь"
          >
            ${iconSvg('trash', 'knowledge-graph-node-menu-action-svg')}
          </button>
        </div>
      </section>
    `)
    .join('');
}


function getGraphNodeMenuActionHTML(
  action,
  icon,
  label
) {

  return `
    <button
      class="knowledge-graph-node-menu-action mow-icon-button"
      data-size="sm"
      type="button"
      data-knowledge-graph-node-menu-action="${escapeHTML(action)}"
      aria-label="${escapeHTML(label)}"
      title="${escapeHTML(label)}"
    >
      <span class="knowledge-graph-node-menu-action-icon">
        ${iconSvg(icon, 'knowledge-graph-node-menu-action-svg')}
      </span>
    </button>
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
