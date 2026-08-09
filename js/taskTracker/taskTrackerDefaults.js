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
        title: 'Идеи',
        taskIds: []
      },
      {
        id: progressId,
        title: 'В работе',
        taskIds: []
      },
      {
        id: doneId,
        title: 'Готово',
        taskIds: []
      }
    ],
    tasks: []
  };
}
