const PERSISTENT_EDITABLE_SELECTOR = [
  '.rich-text-field',
  '.singleline-field',
  '.table-cell-content',
  '[data-persistent-editable="true"]'
].join(',');

const PERSISTENT_SHELL_SELECTOR = [
  '#editorArea',
  '.card-shell',
  '.entity-layout',
  '.entity-header',
  '.entity-header-main',
  '.entity-main',
  '.template-block',
  '.card-meta',
  '.aliases-meta',
  '.card-type-row',
  '.media-box',
  '.table-cell'
].join(',');

const RUNTIME_SELECTOR =
  '[data-runtime="true"]';


export function applyContenteditablePolicy(
  root
) {

  if (!root) return;

  markShellAsReadonly(
    root
  );

  markPersistentEditableFields(
    root
  );

  markRuntimeAsReadonly(
    root
  );
}


export function isInsidePersistentEditable(
  node
) {

  const element =
    getElementFromNode(
      node
    );

  if (!element) return false;

  const editable =
    element.closest(
      PERSISTENT_EDITABLE_SELECTOR
    );

  if (!editable) return false;

  return !Boolean(
    editable.closest(
      RUNTIME_SELECTOR
    )
  );
}


export function isSelectionInsidePersistentEditable(
  selection = window.getSelection()
) {

  if (
    !selection ||
    selection.rangeCount === 0
  ) {

    return false;
  }

  return isInsidePersistentEditable(
    selection.getRangeAt(0).commonAncestorContainer
  );
}


function markShellAsReadonly(
  root
) {

  getMatchingElements(
    root,
    PERSISTENT_SHELL_SELECTOR
  )
    .forEach(element => {

      element.setAttribute(
        'contenteditable',
        'false'
      );
    });
}


function markPersistentEditableFields(
  root
) {

  getMatchingElements(
    root,
    PERSISTENT_EDITABLE_SELECTOR
  )
    .forEach(element => {

      element.setAttribute(
        'contenteditable',
        'true'
      );

      element.dataset.persistentEditable =
        'true';
    });
}


function markRuntimeAsReadonly(
  root
) {

  getMatchingElements(
    root,
    RUNTIME_SELECTOR
  )
    .forEach(element => {

      element.setAttribute(
        'contenteditable',
        'false'
      );
    });
}


function getMatchingElements(
  root,
  selector
) {

  const elements =
    [...root.querySelectorAll(selector)];

  if (
    root.matches?.(selector)
  ) {

    elements.unshift(
      root
    );
  }

  return elements;
}


function getElementFromNode(
  node
) {

  if (!node) return null;

  if (
    node.nodeType === Node.ELEMENT_NODE
  ) {

    return node;
  }

  return node.parentElement;
}
