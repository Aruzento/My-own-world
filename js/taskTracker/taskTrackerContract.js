import {
  readTaskTrackerData
} from './taskTrackerReadData.js';

import {
  writeTaskTrackerData
} from './taskTrackerWriteData.js';


// Contract изолирует тип страницы и сериализацию Task Tracker.

export function isTaskTrackerPage(
  parsedOrPage
) {

  return (
    parsedOrPage?.template === 'taskTracker' ||
    parsedOrPage?.type === 'taskTracker' ||
    (parsedOrPage?.tags || []).includes('task-tracker')
  );
}


export function serializeTaskTrackerHTML(
  editor
) {

  const tracker =
    editor.querySelector('.task-tracker-document');

  if (!tracker) return '';

  const clone =
    tracker.cloneNode(true);

  clone
    .querySelectorAll('[data-runtime="true"]')
    .forEach(element => element.remove());

  writeTaskTrackerData(
    clone,
    readTaskTrackerData(tracker)
  );

  return clone.outerHTML;
}
