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

test(
  'task-tracker-open-page-keeps-legacy-json-script',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            openPage
          } = await import('/js/editor/editor.js');

          const editor =
            document.querySelector('#editorArea');

          const taskData = {
            version: 1,
            columns: [
              {
                id: 'ideas',
                title: 'ИДЕИ',
                taskIds: ['task-1']
              }
            ],
            tasks: [
              {
                id: 'task-1',
                title: 'Старая задача',
                description: 'Должна пережить sanitizer',
                checklist: []
              }
            ]
          };

          openPage(
            {
              id: 'tracker-page',
              name: 'Трекер',
              title: 'Трекер',
              content: `---
id: tracker-page
parent: null
order: 1
tags: [task-tracker]
template: taskTracker
type: taskTracker
aliases: []
---

<div class="task-tracker-document" data-task-tracker="v1" contenteditable="false">
  <h1 class="task-tracker-title">Трекер</h1>
  <script class="task-tracker-data" type="application/json">${JSON.stringify(taskData)}</script>
</div>`
            }
          );

          return {
            taskTitle: editor.querySelector('.task-card-title')?.value,
            scriptKept: Boolean(editor.querySelector('.task-tracker-data')),
            upgraded: editor
              .querySelector('.task-tracker-data')
              ?.hasAttribute('data-task-tracker-data')
          };
        }
      );

    expect(
      result.taskTitle
    ).toBe(
      'Старая задача'
    );

    expect(
      result.scriptKept
    ).toBe(
      true
    );

    expect(
      result.upgraded
    ).toBe(
      true
    );
  }
);
