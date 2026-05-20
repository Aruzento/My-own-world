import {
  TaskTrackerModel
} from './taskTrackerModel.js';

import {
  readTaskTrackerData
} from './taskTrackerReadData.js';


// Возвращает модель, привязанную к DOM-трекеру.

export function getTaskTrackerModel(
  tracker
) {

  if (tracker.taskTrackerModel) {

    return tracker.taskTrackerModel;
  }

  tracker.taskTrackerModel =
    new TaskTrackerModel(
      readTaskTrackerData(tracker)
    );

  return tracker.taskTrackerModel;
}
