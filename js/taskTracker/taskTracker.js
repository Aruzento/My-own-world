import {
  setupTaskTrackerDnd
} from './taskTrackerDnd.js';

import {
  setupTaskTrackerEvents
} from './taskTrackerEvents.js';

export {
  isTaskTrackerPage,
  serializeTaskTrackerHTML
} from './taskTrackerContract.js';

export {
  renderTaskTracker
} from './taskTrackerRender.js';


// Входная точка подсистемы Task Tracker.

export function setupTaskTrackers(
  editor
) {

  setupTaskTrackerEvents(
    editor
  );

  setupTaskTrackerDnd(
    editor
  );
}
