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
  buildKnowledgeGraph,
  getKnowledgeGraphAccessPolicy,
  getKnowledgeGraphDomainDefinitions,
  getKnowledgeGraphDomainEdges,
  getKnowledgeGraphDomainInsights,
  getKnowledgeGraphDomainSummary,
  getKnowledgeGraphExplorationHints,
  getKnowledgeGraphSummary,
  getOrphanGraphPages
} from './knowledgeGraph.js';


const RELATIONSHIP_LABELS = {
  treeParent: 'Дерево',
  wikiLink: 'Wiki-ссылка',
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

  const graph =
    buildKnowledgeGraph(
      state.pages
    );

  documentElement
    .querySelectorAll(
      '.knowledge-graph-runtime'
    )
    .forEach(element => element.remove());

  documentElement.insertAdjacentHTML(
    'beforeend',
    getKnowledgeGraphHTML(
      graph
    )
  );

  setupKnowledgeGraphEvents(
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

  clone
    .querySelectorAll(
      '.knowledge-graph-runtime, [data-runtime="true"]'
    )
    .forEach(element => element.remove());

  return clone.outerHTML;
}


function getKnowledgeGraphHTML(
  graph
) {

  const summary =
    getKnowledgeGraphSummary(
      graph
    );

  const orphans =
    getOrphanGraphPages(
      graph
    )
      .filter(page =>
        page.type !== 'knowledgeGraph' &&
        page.template !== 'knowledgeGraph'
      );

  return `
    <div class="knowledge-graph-runtime" data-runtime="true" contenteditable="false">
      <div class="knowledge-graph-summary">
        ${getSummaryCardHTML('Страниц', summary.nodeCount)}
        ${getSummaryCardHTML('Связей', summary.edgeCount)}
        ${getSummaryCardHTML('Одиноких', orphans.length)}
      </div>

      ${getDomainSummaryHTML(graph)}

      <div class="knowledge-graph-tabs" role="tablist">
        <button class="knowledge-graph-tab is-active" type="button" data-knowledge-graph-tab="visual">
          Карта связей
        </button>
        <button class="knowledge-graph-tab" type="button" data-knowledge-graph-tab="relationships">
          Связи
        </button>
        <button class="knowledge-graph-tab" type="button" data-knowledge-graph-tab="orphans">
          Одинокие страницы
        </button>
        <button class="knowledge-graph-refresh" type="button" title="Обновить граф">
          Обновить
        </button>
      </div>

      <section class="knowledge-graph-panel is-active" data-knowledge-graph-panel="visual">
        ${getExplorationFoundationHTML(graph)}
        ${getVisualGraphHTML(graph)}
        ${getDomainScenarioHTML(graph)}
        ${getRuleAccessPolicyHTML()}
      </section>

      <section class="knowledge-graph-panel" data-knowledge-graph-panel="relationships" hidden>
        ${getRelationshipEditorHTML()}
        ${getRelationshipFocusHTML(graph)}
      </section>

      <section class="knowledge-graph-panel" data-knowledge-graph-panel="orphans" hidden>
        ${getOrphanListHTML(orphans)}
      </section>
    </div>
  `;
}


function getSummaryCardHTML(
  label,
  value
) {

  return `
    <article class="knowledge-graph-summary-card">
      <strong>${escapeHTML(value)}</strong>
      <span>${escapeHTML(label)}</span>
    </article>
  `;
}


function getDomainSummaryHTML(
  graph
) {

  const domains =
    getKnowledgeGraphDomainSummary(
      graph
    );

  return `
    <div class="knowledge-graph-domain-summary">
      ${domains
        .map(domain => `
          <article class="knowledge-graph-domain-card">
            <span>${escapeHTML(domain.label)}</span>
            <strong>${escapeHTML(domain.nodeCount)}</strong>
            <small>${escapeHTML(domain.edgeCount)} связей</small>
          </article>
        `)
        .join('')}
    </div>
  `;
}


function getExplorationFoundationHTML(
  graph
) {

  const hints =
    getKnowledgeGraphExplorationHints(
      graph
    );

  return `
    <section class="knowledge-graph-exploration">
      <div class="knowledge-graph-exploration-header">
        <div>
          <h3>Быстрое исследование мира</h3>
          <p>${escapeHTML(hints.nextAction)}</p>
        </div>
        <span>${escapeHTML(hints.orphanCount)} одиноких</span>
      </div>
      <div class="knowledge-graph-hubs">
        ${hints.hubs.length > 0
          ? hints.hubs
            .map(hub => `
              <button class="knowledge-graph-hub" type="button" data-page-id="${escapeHTML(hub.id)}">
                <strong>${escapeHTML(hub.title || hub.id)}</strong>
                <span>${escapeHTML(hub.edgeCount)} связей</span>
              </button>
            `)
            .join('')
          : '<div class="knowledge-graph-empty-inline">Связанные центры появятся после wiki-link или ручных связей.</div>'}
      </div>
    </section>
  `;
}


function getVisualGraphHTML(
  graph
) {

  const edgeCounts =
    new Map();

  graph.edges.forEach(edge => {

    edgeCounts.set(
      edge.from,
      (edgeCounts.get(edge.from) || 0) + 1
    );

    edgeCounts.set(
      edge.to,
      (edgeCounts.get(edge.to) || 0) + 1
    );
  });

  const visibleNodes =
    graph.nodes
      .filter(node =>
        node.type !== 'knowledgeGraph' &&
        node.template !== 'knowledgeGraph'
      )
      .slice(0, 36);

  if (visibleNodes.length === 0) {

    return getEmptyHTML(
      'В графе пока нет страниц для обзора.'
    );
  }

  return `
    <div class="knowledge-graph-visual">
      ${visibleNodes
        .map(node => `
          <button class="knowledge-graph-node" type="button" data-page-id="${escapeHTML(node.id)}">
            <strong>${escapeHTML(node.title || node.id)}</strong>
            <span>${escapeHTML(node.type || node.template || 'note')}</span>
            <small>${escapeHTML(edgeCounts.get(node.id) || 0)} связей</small>
          </button>
        `)
        .join('')}
    </div>
  `;
}


function getDomainScenarioHTML(
  graph
) {

  const insights =
    getKnowledgeGraphDomainInsights(
      graph
    );

  return `
    <section class="knowledge-graph-scenarios">
      <h3>Что можно посмотреть</h3>
      <div class="knowledge-graph-scenario-grid">
        ${insights
          .map(insight =>
            getDomainScenarioCardHTML(
              insight
            )
          )
          .join('')}
      </div>
    </section>
  `;
}


function getDomainScenarioCardHTML(
  insight
) {

  return `
    <article class="knowledge-graph-scenario-card">
      <header>
        <span>${escapeHTML(insight.label)}</span>
        <strong>${escapeHTML(insight.nodeCount)}</strong>
      </header>
      <p>${escapeHTML(insight.question || insight.description || '')}</p>
      ${getDomainScenarioNodesHTML(insight)}
      ${getDomainScenarioRelationshipsHTML(insight)}
      <button class="knowledge-graph-domain-shortcut" type="button" data-knowledge-graph-domain-shortcut="${escapeHTML(insight.key)}">
        Открыть связи
      </button>
    </article>
  `;
}


function getDomainScenarioNodesHTML(
  insight
) {

  if (!insight.nodes.length) {

    return '<div class="knowledge-graph-empty-inline">Пока нет карточек этого типа.</div>';
  }

  return `
    <div class="knowledge-graph-mini-list">
      ${insight.nodes
        .map(node => `
          <button type="button" data-page-id="${escapeHTML(node.id)}">
            ${escapeHTML(node.title || node.id)}
          </button>
        `)
        .join('')}
    </div>
  `;
}


function getDomainScenarioRelationshipsHTML(
  insight
) {

  if (!insight.relationships.length) return '';

  return `
    <ul class="knowledge-graph-mini-edges">
      ${insight.relationships
        .slice(0, 3)
        .map(edge => `
          <li>
            <span>${escapeHTML(getRelationshipLabel(edge.type))}</span>
            ${escapeHTML(edge.fromTitle)} → ${escapeHTML(edge.toTitle)}
          </li>
        `)
        .join('')}
    </ul>
  `;
}


function getRuleAccessPolicyHTML() {

  const policy =
    getKnowledgeGraphAccessPolicy().ruleTree;

  return `
    <section class="knowledge-graph-access-policy">
      <div>
        <h3>Rule Tree и будущие права</h3>
        <p>${escapeHTML(policy.note)}</p>
      </div>
      <dl>
        <div>
          <dt>Владелец</dt>
          <dd>${escapeHTML(policy.ownerRole)}</dd>
        </div>
        <div>
          <dt>Чтение</dt>
          <dd>${escapeHTML(policy.readRoles.join(', '))}</dd>
        </div>
        <div>
          <dt>Редактирование</dt>
          <dd>${escapeHTML(policy.editRoles.join(', '))}</dd>
        </div>
      </dl>
    </section>
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


function setupKnowledgeGraphEvents(
  documentElement
) {

  if (documentElement.dataset.knowledgeGraphReady === 'true') return;

  documentElement.dataset.knowledgeGraphReady =
    'true';

  documentElement.addEventListener(
    'click',
    async event => {

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

  const sourcePage =
    state.pages.find(page =>
      page.id === sourceId
    );

  if (!sourcePage) return;

  const relationship =
    {
      type:
        String(formData.get('type') || 'related'),
      targetId,
      label:
        String(formData.get('label') || '').trim()
    };

  sourcePage.relationships =
    [
      ...(sourcePage.relationships || []),
      relationship
    ];

  sourcePage.content =
    updateRelationshipsFrontMatter(
      sourcePage.content,
      sourcePage.relationships
    );

  await writePageContent(
    sourcePage,
    sourcePage.content
  );

  notifyPageUpdated();

  setStatus(
    'Связь добавлена'
  );

  renderKnowledgeGraphPage(
    documentElement.closest(
      '#editorArea'
    ) || document
  );
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

