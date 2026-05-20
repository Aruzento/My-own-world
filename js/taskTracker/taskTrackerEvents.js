import {
  commitTaskTrackerData
} from './taskTrackerDirty.js';

import {
  getTaskTrackerModel
} from './taskTrackerGetModel.js';

import {
  renderTaskTracker
} from './taskTrackerRender.js';


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
    event.target.classList.contains('task-column-add')
  ) {

    model.addColumn();
    commitAndRender(tracker, model);
    return;
  }

  if (
    column &&
    event.target.classList.contains('task-add-btn')
  ) {

    model.addTask(
      column.dataset.columnId
    );
    commitAndRender(tracker, model);
    return;
  }

  if (
    column &&
    event.target.classList.contains('task-column-delete')
  ) {

    model.deleteColumn(
      column.dataset.columnId
    );
    commitAndRender(tracker, model);
    return;
  }

  if (
    task &&
    event.target.classList.contains('task-delete-btn')
  ) {

    model.deleteTask(
      task.dataset.taskId
    );
    commitAndRender(tracker, model);
    return;
  }

  if (
    task &&
    event.target.classList.contains('task-checklist-add')
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
    event.target.classList.contains('task-check-delete')
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
    event.target.classList.contains('task-check-toggle')
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
