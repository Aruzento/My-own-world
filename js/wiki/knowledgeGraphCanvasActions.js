import {
  setStatus
} from '../ui/ui.js';

import {
  getKnowledgeGraphViewPreset
} from './knowledgeGraphCanvasControls.js';


export function getRuntimeGraphFilters(
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


export function handleGraphLayoutChange(
  documentElement,
  layout,
  options = {}
) {

  documentElement.dataset.currentKnowledgeGraphLayout =
    layout === 'hub'
      ? 'hub'
      : layout === 'domain'
        ? 'domain'
        : 'tree';

  renderGraph(
    documentElement,
    options
  );
}


export function handleGraphFilterChange(
  documentElement,
  changedElement = null,
  options = {}
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

  renderGraph(
    documentElement,
    options
  );
}


export function handleGraphSliceAction(
  documentElement,
  action,
  options = {}
) {

  if (action === 'show-all') {

    documentElement.dataset.currentKnowledgeGraphFilterDomain =
      'all';

    documentElement.dataset.currentKnowledgeGraphFilterRelationship =
      'all';

    documentElement.dataset.currentKnowledgeGraphFilterOrphans =
      'false';

    documentElement.dataset.currentKnowledgeGraphViewPreset =
      'all';

    delete documentElement.dataset.currentKnowledgeGraphFilterSearch;
    delete documentElement.dataset.currentKnowledgeGraphFocusNode;

    renderGraph(
      documentElement,
      options
    );

    return;
  }

  if (action === 'refine') {

    const searchInput =
      documentElement.querySelector(
        '[data-knowledge-graph-filter="search"]'
      );

    searchInput?.focus();
    searchInput?.select?.();

    setStatus(
      'Уточни поиск или выбери фильтр графа'
    );
  }
}


export function handleGraphFilterAction(
  documentElement,
  action,
  options = {}
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

  renderGraph(
    documentElement,
    options
  );
}


export function handleGraphCanvasAction(
  actionButton,
  options = {}
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
        options.clampScale?.(
          scale + (Number(options.zoomStep) || 0)
        ) ?? scale
      );
  }

  if (action === 'zoom-out') {

    stage.dataset.scale =
      String(
        options.clampScale?.(
          scale - (Number(options.zoomStep) || 0)
        ) ?? scale
      );
  }

  if (action === 'fit') {

    options.fitCanvas?.(
      stage
    );
  }

  options.applyTransform?.(
    stage
  );
}


function renderGraph(
  documentElement,
  options
) {

  if (typeof options.render === 'function') {

    options.render(
      documentElement
    );
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
