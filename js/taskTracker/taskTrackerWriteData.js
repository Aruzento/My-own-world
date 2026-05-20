// Записывает модель обратно в persistent script-тег.

export function writeTaskTrackerData(
  tracker,
  data
) {

  let script =
    tracker.querySelector('.task-tracker-data');

  if (!script) {

    script =
      document.createElement('script');

    script.className =
      'task-tracker-data';

    script.type =
      'application/json';

    tracker.appendChild(
      script
    );
  }

  script.textContent =
    JSON.stringify(
      data
    )
      .replaceAll(
        '</script',
        '<\\/script'
      );
}
