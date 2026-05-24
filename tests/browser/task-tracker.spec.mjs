import {
  expect,
  test
} from '@playwright/test';


// P1 smoke: Task Tracker должен сохранять перенос задач и колонок в data-first JSON.

test(
  'task-tracker-model-persists-task-and-column-order',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            TaskTrackerModel
          } = await import('/js/taskTracker/taskTrackerModel.js');

          const {
            serializeTaskTrackerHTML
          } = await import('/js/taskTracker/taskTrackerContract.js');

          const {
            readTaskTrackerData
          } = await import('/js/taskTracker/taskTrackerReadData.js');

          const {
            writeTaskTrackerData
          } = await import('/js/taskTracker/taskTrackerWriteData.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="task-tracker-document" contenteditable="false">
              <script type="application/json" class="task-tracker-data"></script>
            </div>
          `;

          const tracker =
            editor.querySelector('.task-tracker-document');

          const data = {
            version: 1,
            columns: [
              {
                id: 'ideas',
                title: 'ИДЕИ',
                taskIds: []
              },
              {
                id: 'work',
                title: 'В РАБОТЕ',
                taskIds: []
              },
              {
                id: 'done',
                title: 'СДЕЛАНО',
                taskIds: []
              }
            ],
            tasks: []
          };

          const model =
            new TaskTrackerModel(
              data
            );

          const task =
            model.addTask(
              'ideas'
            );

          model.updateTask(
            task.id,
            {
              title: 'Подготовить сцену',
              description: 'Описание задачи'
            }
          );

          const checklistItem =
            model.addChecklistItem(
              task.id
            );

          model.updateChecklistItem(
            task.id,
            checklistItem.id,
            {
              text: 'Проверить карту',
              done: true
            }
          );

          model.moveTask(
            task.id,
            'done',
            0
          );

          model.moveColumn(
            'done',
            0
          );

          writeTaskTrackerData(
            tracker,
            model.data
          );

          const html =
            serializeTaskTrackerHTML(
              editor
            );

          editor.innerHTML =
            html;

          const restored =
            readTaskTrackerData(
              editor.querySelector('.task-tracker-document')
            );

          return {
            firstColumn: restored.columns[0].id,
            doneTaskIds: restored.columns.find(column => column.id === 'done').taskIds,
            task: restored.tasks[0]
          };
        }
      );

    expect(
      result.firstColumn
    ).toBe(
      'done'
    );

    expect(
      result.doneTaskIds
    ).toHaveLength(
      1
    );

    expect(
      result.task.title
    ).toBe(
      'Подготовить сцену'
    );

    expect(
      result.task.checklist[0]
    ).toMatchObject({
      text: 'Проверить карту',
      done: true
    });
  }
);
