// Стартовая модель Task Tracker. Это данные, а не HTML-интерфейс.

export function createDefaultTaskTrackerData() {

  const ideasId =
    crypto.randomUUID();

  const progressId =
    crypto.randomUUID();

  const doneId =
    crypto.randomUUID();

  return {
    version: 1,
    columns: [
      {
        id: ideasId,
        title: 'ИДЕИ',
        taskIds: []
      },
      {
        id: progressId,
        title: 'В РАБОТЕ',
        taskIds: []
      },
      {
        id: doneId,
        title: 'СДЕЛАНО',
        taskIds: []
      }
    ],
    tasks: []
  };
}
