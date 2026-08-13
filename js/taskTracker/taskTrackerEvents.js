import {
  commitTaskTrackerData
} from './taskTrackerDirty.js';

import {
  getTaskTrackerModel
} from './taskTrackerGetModel.js';

import {
  renderTaskTracker
} from './taskTrackerRender.js';

import {
  setStatus
} from '../ui/ui.js';


// Делегированные события редактирования. Все изменения идут через модель.

export function setupTaskTrackerEvents(
  editor
) {

  editor.addEventListener(
    'input',
    handleTaskTrackerInput
  );

  editor.addEventListener(
    'click',
    handleTaskTrackerClick
  );

  editor.addEventListener(
    'keydown',
    handleTaskTrackerKeydown
  );
}


function handleTaskTrackerKeydown(
  event
) {

  if (
    !isTaskTrackerKeyboardReorderEvent(
      event
    )
  ) return;

  const tracker =
    event.target.closest(
      '.task-tracker-document'
    );

  if (!tracker) return;

  const taskHandle =
    event.target.closest(
      '.task-drag-handle'
    );

  const columnHandle =
    event.target.closest(
      '.task-column-drag-handle'
    );

  if (!taskHandle && !columnHandle) return;

  const model =
    getTaskTrackerModel(
      tracker
    );

  if (taskHandle) {

    event.preventDefault();

    handleTaskKeyboardReorder(
      tracker,
      model,
      taskHandle,
      event.key
    );

    return;
  }

  if (columnHandle) {

    event.preventDefault();

    handleColumnKeyboardReorder(
      tracker,
      model,
      columnHandle,
      event.key
    );
  }
}


function isTaskTrackerKeyboardReorderEvent(
  event
) {

  return Boolean(
    event.ctrlKey &&
    event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight'
    ].includes(
      event.key
    )
  );
}


function handleTaskKeyboardReorder(
  tracker,
  model,
  taskHandle,
  key
) {

  const taskCard =
    taskHandle.closest(
      '.task-card'
    );

  const taskId =
    taskCard?.dataset.taskId;

  const moveResult =
    getTaskKeyboardMove(
      model,
      taskId,
      key
    );

  if (!moveResult) {

    setStatus(
      'Задачу нельзя переместить в этом направлении.'
    );

    return;
  }

  model.moveTask(
    taskId,
    moveResult.targetColumnId,
    moveResult.targetIndex
  );

  commitAndRender(
    tracker,
    model
  );

  focusTaskTrackerControl(
    tracker,
    `.task-card[data-task-id="${CSS.escape(taskId)}"] .task-drag-handle`
  );

  setStatus(
    `Задача перемещена: ${moveResult.taskTitle}.`
  );
}


function getTaskKeyboardMove(
  model,
  taskId,
  key
) {

  if (!taskId) return null;

  const columns =
    model.data.columns;

  const sourceColumn =
    columns.find(column =>
      column.taskIds.includes(
        taskId
      )
    );

  const task =
    model.data.tasks.find(candidate =>
      candidate.id === taskId
    );

  if (!sourceColumn || !task) return null;

  const sourceColumnIndex =
    columns.indexOf(
      sourceColumn
    );

  const sourceTaskIndex =
    sourceColumn.taskIds.indexOf(
      taskId
    );

  if (
    key === 'ArrowUp' ||
    key === 'ArrowDown'
  ) {

    const targetIndex =
      sourceTaskIndex +
      (key === 'ArrowUp' ? -1 : 1);

    if (
      targetIndex < 0 ||
      targetIndex >= sourceColumn.taskIds.length
    ) return null;

    return {
      targetColumnId:
        sourceColumn.id,
      targetIndex,
      taskTitle:
        task.title || 'Без названия'
    };
  }

  if (
    key === 'ArrowLeft' ||
    key === 'ArrowRight'
  ) {

    const targetColumn =
      columns[
        sourceColumnIndex +
        (key === 'ArrowLeft' ? -1 : 1)
      ];

    if (!targetColumn) return null;

    return {
      targetColumnId:
        targetColumn.id,
      targetIndex:
        Math.min(
          sourceTaskIndex,
          targetColumn.taskIds.length
        ),
      taskTitle:
        task.title || 'Без названия'
    };
  }

  return null;
}


function handleColumnKeyboardReorder(
  tracker,
  model,
  columnHandle,
  key
) {

  if (
    key !== 'ArrowLeft' &&
    key !== 'ArrowRight'
  ) {

    setStatus(
      'Колонку можно перемещать только влево или вправо.'
    );

    return;
  }

  const column =
    columnHandle.closest(
      '.task-column'
    );

  const columnId =
    column?.dataset.columnId;

  const columns =
    model.data.columns;

  const currentIndex =
    columns.findIndex(candidate =>
      candidate.id === columnId
    );

  const targetIndex =
    currentIndex +
    (key === 'ArrowLeft' ? -1 : 1);

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= columns.length
  ) {

    setStatus(
      'Колонку нельзя переместить в этом направлении.'
    );

    return;
  }

  const columnTitle =
    columns[currentIndex]?.title ||
    'Без названия';

  model.moveColumn(
    columnId,
    targetIndex
  );

  commitAndRender(
    tracker,
    model
  );

  focusTaskTrackerControl(
    tracker,
    `.task-column[data-column-id="${CSS.escape(columnId)}"] .task-column-drag-handle`
  );

  setStatus(
    `Колонка перемещена: ${columnTitle}.`
  );
}


function focusTaskTrackerControl(
  tracker,
  selector
) {

  const target =
    tracker.querySelector(
      selector
    );

  if (
    !target ||
    typeof target.focus !== 'function'
  ) return;

  try {

    target.focus({
      preventScroll:
        true
    });

  } catch {

    target.focus();
  }
}


function handleTaskTrackerInput(
  event
) {

  const tracker =
    event.target.closest('.task-tracker-document');

  if (!tracker) return;

  if (
    event.target.classList.contains('task-tracker-title')
  ) return;

  const model =
    getTaskTrackerModel(
      tracker
    );

  const column =
    event.target.closest('.task-column');

  const task =
    event.target.closest('.task-card');

  const check =
    event.target.closest('.task-check-item');

  let changed =
    false;

  if (
    column &&
    event.target.classList.contains('task-column-title')
  ) {

    model.renameColumn(
      column.dataset.columnId,
      event.target.value
    );

    changed =
      true;
  }

  if (
    task &&
    event.target.classList.contains('task-card-title')
  ) {

    model.updateTask(
      task.dataset.taskId,
      {
        title: event.target.value
      }
    );

    changed =
      true;
  }

  if (
    task &&
    event.target.classList.contains('task-card-description')
  ) {

    model.updateTask(
      task.dataset.taskId,
      {
        description: event.target.value
      }
    );

    changed =
      true;
  }

  if (
    task &&
    check &&
    event.target.classList.contains('task-check-text')
  ) {

    model.updateChecklistItem(
      task.dataset.taskId,
      check.dataset.checkId,
      {
        text: event.target.value
      }
    );

    changed =
      true;
  }

  if (changed) {

    commitTaskTrackerData(
      tracker,
      model
    );
  }
}


function handleTaskTrackerClick(
  event
) {

  const tracker =
    event.target.closest('.task-tracker-document');

  if (!tracker) return;

  const model =
    getTaskTrackerModel(
      tracker
    );

  const column =
    event.target.closest('.task-column');

  const task =
    event.target.closest('.task-card');

  const check =
    event.target.closest('.task-check-item');

  if (
    getTrackerAction(
      event,
      tracker,
      '.task-column-add'
    )
  ) {

    model.addColumn();
    commitAndRender(tracker, model);
    return;
  }

  if (
    column &&
    getTrackerAction(
      event,
      tracker,
      '.task-add-btn'
    )
  ) {

    model.addTask(
      column.dataset.columnId
    );
    commitAndRender(tracker, model);
    return;
  }

  if (
    column &&
    getTrackerAction(
      event,
      tracker,
      '.task-column-delete'
    )
  ) {

    model.deleteColumn(
      column.dataset.columnId
    );
    commitAndRender(tracker, model);
    return;
  }

  if (
    task &&
    getTrackerAction(
      event,
      tracker,
      '.task-delete-btn'
    )
  ) {

    model.deleteTask(
      task.dataset.taskId
    );
    commitAndRender(tracker, model);
    return;
  }

  if (
    task &&
    getTrackerAction(
      event,
      tracker,
      '.task-checklist-add'
    )
  ) {

    model.addChecklistItem(
      task.dataset.taskId
    );
    commitAndRender(tracker, model);
    return;
  }

  if (
    task &&
    check &&
    getTrackerAction(
      event,
      tracker,
      '.task-check-delete'
    )
  ) {

    model.deleteChecklistItem(
      task.dataset.taskId,
      check.dataset.checkId
    );
    commitAndRender(tracker, model);
    return;
  }

  if (
    task &&
    check &&
    getTrackerAction(
      event,
      tracker,
      '.task-check-toggle'
    )
  ) {

    model.updateChecklistItem(
      task.dataset.taskId,
      check.dataset.checkId,
      {
        done: event.target.checked
      }
    );
    commitTaskTrackerData(tracker, model);
  }
}


function getTrackerAction(
  event,
  tracker,
  selector
) {

  const action =
    event.target.closest(
      selector
    );

  return action &&
    tracker.contains(
      action
    )
    ? action
    : null;
}


function commitAndRender(
  tracker,
  model
) {

  commitTaskTrackerData(
    tracker,
    model
  );

  renderTaskTracker(
    tracker.closest('#editorArea')
  );
}
