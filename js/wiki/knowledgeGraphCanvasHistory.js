const GRAPH_CANVAS_HISTORY_LIMIT =
  80;

const graphCanvasHistoryByDocument =
  new WeakMap();

const graphCanvasKeyboardHandlersByDocument =
  new WeakMap();


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


function announceGraphCanvasHistoryStatus(
  options,
  message
) {

  if (typeof options.setStatus === 'function') {

    options.setStatus(
      message
    );
  }
}


function focusGraphCanvasHistoryDocument(
  documentElement,
  options
) {

  if (typeof options.focusDocument === 'function') {

    options.focusDocument(
      documentElement
    );

    return;
  }

  if (
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


export function updateGraphCanvasHistoryControls(
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


export function pushGraphCanvasHistoryEntry(
  documentElement,
  entry,
  options = {}
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

  focusGraphCanvasHistoryDocument(
    documentElement,
    options
  );
}


export function isGraphCanvasHistoryKeyboardShortcut(
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


export function getGraphCanvasHistoryActionFromKeyboardEvent(
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


export function setupGraphCanvasKeyboardHistory(
  documentElement,
  options = {}
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

        teardownGraphCanvasKeyboardHistory(
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
        ),
        options
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


export function teardownGraphCanvasKeyboardHistory(
  documentElement
) {

  const handler =
    graphCanvasKeyboardHandlersByDocument.get(
      documentElement
    );

  if (!handler) return;

  documentElement.ownerDocument.removeEventListener(
    'keydown',
    handler,
    true
  );

  graphCanvasKeyboardHandlersByDocument.delete(
    documentElement
  );

  graphCanvasHistoryByDocument.delete(
    documentElement
  );
}


export async function handleGraphCanvasHistoryAction(
  documentElement,
  action,
  options = {}
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

    announceGraphCanvasHistoryStatus(
      options,
      action === 'redo'
        ? 'Нечего повторять в графе'
        : 'Нечего отменять в графе'
    );

    updateGraphCanvasHistoryControls(
      documentElement
    );

    return false;
  }

  const applyEntry =
    options.applyEntry;

  if (typeof applyEntry !== 'function') {

    announceGraphCanvasHistoryStatus(
      options,
      'История графа недоступна'
    );

    updateGraphCanvasHistoryControls(
      documentElement
    );

    return false;
  }

  const entry =
    sourceStack.pop();

  const applied =
    await applyEntry(
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
