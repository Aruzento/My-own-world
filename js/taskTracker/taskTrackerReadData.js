import {
  normalizeTaskTrackerData
} from './taskTrackerNormalize.js';


// Читает JSON-модель из persistent script-тега.

export function readTaskTrackerData(
  tracker
) {

  const script =
    tracker?.querySelector('.task-tracker-data');

  if (!script?.textContent.trim()) {

    return normalizeTaskTrackerData(
      null
    );
  }

  try {

    return normalizeTaskTrackerData(
      JSON.parse(
        script.textContent
      )
    );

  } catch (error) {

    console.warn(
      'Task Tracker: не удалось прочитать JSON-модель.',
      error
    );

    return normalizeTaskTrackerData(
      null
    );
  }
}
