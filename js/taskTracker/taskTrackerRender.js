import {
  TaskTrackerModel
} from './taskTrackerModel.js';

import {
  getTaskTrackerBoardHTML
} from './taskTrackerBoardHTML.js';

import {
  readTaskTrackerData
} from './taskTrackerReadData.js';

import {
  writeTaskTrackerData
} from './taskTrackerWriteData.js';


// Render пересобирает runtime-доску из JSON-модели.

export function renderTaskTracker(
  editor
) {

  const tracker =
    editor.querySelector('.task-tracker-document');

  if (!tracker) return;

  const data =
    readTaskTrackerData(
      tracker
    );

  writeTaskTrackerData(
    tracker,
    data
  );

  tracker.taskTrackerModel =
    new TaskTrackerModel(
      data
    );

  tracker
    .querySelectorAll('.task-tracker-board')
    .forEach(board => board.remove());

  tracker.insertAdjacentHTML(
    'beforeend',
    getTaskTrackerBoardHTML(data)
  );
}
