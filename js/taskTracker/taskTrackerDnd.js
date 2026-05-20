import {
  commitTaskTrackerData
} from './taskTrackerDirty.js';

import {
  getTaskTrackerModel
} from './taskTrackerGetModel.js';

import {
  renderTaskTracker
} from './taskTrackerRender.js';


let dragState = null;


// Pointer-based DnD: не зависит от HTML5 drag/drop и дает стабильный preview.

export function setupTaskTrackerDnd(
  editor
) {

  editor.addEventListener(
    'pointerdown',
    handlePointerDown
  );

  document.addEventListener(
    'pointermove',
    handlePointerMove
  );

  document.addEventListener(
    'pointerup',
    handlePointerUp
  );
}


function handlePointerDown(
  event
) {

  const taskHandle =
    event.target.closest('.task-drag-handle');

  const columnHandle =
    event.target.closest('.task-column-drag-handle');

  if (!taskHandle && !columnHandle) return;

  const tracker =
    event.target.closest('.task-tracker-document');

  if (!tracker) return;

  event.preventDefault();

  if (taskHandle) {

    startTaskDrag(
      event,
      tracker,
      taskHandle.closest('.task-card')
    );

    return;
  }

  startColumnDrag(
    event,
    tracker,
    columnHandle.closest('.task-column')
  );
}


function startTaskDrag(
  event,
  tracker,
  card
) {

  if (!card) return;

  dragState =
    createBaseDragState(
      event,
      tracker,
      card,
      'task'
    );

  dragState.taskId =
    card.dataset.taskId;

  dragState.sourceList =
    card.closest('.task-list');

  dragState.placeholder =
    createPlaceholder(
      'task-drop-placeholder',
      card
    );

  card.after(
    dragState.placeholder
  );

  card.classList.add(
    'is-dragging'
  );
}


function startColumnDrag(
  event,
  tracker,
  column
) {

  if (!column) return;

  dragState =
    createBaseDragState(
      event,
      tracker,
      column,
      'column'
    );

  dragState.columnId =
    column.dataset.columnId;

  dragState.container =
    column.closest('.task-columns');

  dragState.placeholder =
    createPlaceholder(
      'task-column-drop-placeholder',
      column
    );

  column.after(
    dragState.placeholder
  );

  column.classList.add(
    'is-dragging'
  );
}


function createBaseDragState(
  event,
  tracker,
  source,
  type
) {

  const rect =
    source.getBoundingClientRect();

  const preview =
    source.cloneNode(
      true
    );

  preview.classList.add(
    'task-dnd-preview'
  );

  preview.style.width =
    `${rect.width}px`;

  preview.style.left =
    `${rect.left}px`;

  preview.style.top =
    `${rect.top}px`;

  document.body.appendChild(
    preview
  );

  try {

    source.setPointerCapture(
      event.pointerId
    );

  } catch (error) {

    // Document listeners остаются fallback для браузеров без capture.
  }

  return {
    tracker,
    source,
    preview,
    placeholder: null,
    type,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    moved: false
  };
}


function handlePointerMove(
  event
) {

  if (!dragState) return;

  event.preventDefault();

  dragState.moved =
    true;

  dragState.preview.style.left =
    `${event.clientX - dragState.offsetX}px`;

  dragState.preview.style.top =
    `${event.clientY - dragState.offsetY}px`;

  if (dragState.type === 'task') {

    updateTaskDropTarget(
      event
    );

    return;
  }

  updateColumnDropTarget(
    event
  );
}


function updateTaskDropTarget(
  event
) {

  const element =
    document.elementFromPoint(
      event.clientX,
      event.clientY
    );

  const list =
    element?.closest('.task-list');

  if (!list) return;

  const beforeCard =
    getTaskBeforePointer(
      list,
      event.clientY
    );

  if (beforeCard) {

    list.insertBefore(
      dragState.placeholder,
      beforeCard
    );

  } else {

    list.appendChild(
      dragState.placeholder
    );
  }
}


function updateColumnDropTarget(
  event
) {

  const container =
    dragState.container;

  const beforeColumn =
    getColumnBeforePointer(
      container,
      event.clientX,
      event.clientY
    );

  if (beforeColumn) {

    container.insertBefore(
      dragState.placeholder,
      beforeColumn
    );

  } else {

    const addButton =
      container.querySelector('.task-column-add');

    container.insertBefore(
      dragState.placeholder,
      addButton
    );
  }
}


function handlePointerUp() {

  if (!dragState) return;

  if (dragState.moved) {

    commitDragResult();
  }

  clearDragState();
}


function commitDragResult() {

  const model =
    getTaskTrackerModel(
      dragState.tracker
    );

  if (dragState.type === 'task') {

    const list =
      dragState.placeholder.closest('.task-list');

    const column =
      list?.closest('.task-column');

    if (list && column) {

      model.moveTask(
        dragState.taskId,
        column.dataset.columnId,
        getTaskPlaceholderIndex(
          list,
          dragState.placeholder
        )
      );
    }

  } else {

    model.moveColumn(
      dragState.columnId,
      getColumnPlaceholderIndex(
        dragState.container,
        dragState.placeholder
      )
    );
  }

  commitTaskTrackerData(
    dragState.tracker,
    model
  );

  renderTaskTracker(
    dragState.tracker.closest('#editorArea')
  );
}


function clearDragState() {

  dragState.source.classList.remove(
    'is-dragging'
  );

  dragState.preview.remove();
  dragState.placeholder.remove();

  dragState =
    null;
}


function createPlaceholder(
  className,
  source
) {

  const rect =
    source.getBoundingClientRect();

  const placeholder =
    document.createElement('div');

  placeholder.className =
    className;

  placeholder.dataset.runtime =
    'true';

  placeholder.style.minHeight =
    `${rect.height}px`;

  return placeholder;
}


function getTaskBeforePointer(
  list,
  pointerY
) {

  return [...list.querySelectorAll('.task-card:not(.is-dragging)')]
    .find(card => {

      const rect =
        card.getBoundingClientRect();

      return pointerY < rect.top + rect.height / 2;
    }) || null;
}


function getColumnBeforePointer(
  container,
  pointerX,
  pointerY
) {

  return [...container.querySelectorAll('.task-column:not(.is-dragging)')]
    .find(column => {

      const rect =
        column.getBoundingClientRect();

      const sameRow =
        pointerY < rect.bottom &&
        pointerY > rect.top;

      return sameRow &&
        pointerX < rect.left + rect.width / 2;
    }) || null;
}


function getTaskPlaceholderIndex(
  list,
  placeholder
) {

  return getIndexBeforePlaceholder(
    list,
    placeholder,
    '.task-card'
  );
}


function getColumnPlaceholderIndex(
  container,
  placeholder
) {

  return getIndexBeforePlaceholder(
    container,
    placeholder,
    '.task-column'
  );
}


function getIndexBeforePlaceholder(
  parent,
  placeholder,
  selector
) {

  const children =
    [...parent.children];

  const placeholderIndex =
    children.indexOf(
      placeholder
    );

  return children
    .slice(
      0,
      placeholderIndex
    )
    .filter(element =>
      element.matches(selector) &&
      !element.classList.contains('is-dragging')
    )
    .length;
}
