const KNOWLEDGE_GRAPH_VIEW_STATE_VERSION =
  1;


export function readKnowledgeGraphViewState(
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


export function writeKnowledgeGraphViewState(
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


export function normalizeKnowledgeGraphViewState(
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


export function createEmptyKnowledgeGraphViewState() {

  return {
    version:
      KNOWLEDGE_GRAPH_VIEW_STATE_VERSION,
    positions: {}
  };
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
