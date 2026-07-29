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

test(
  'task-tracker-ui-migration-uses-compact-workbench-surface',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createTaskTrackerTemplate
          } = await import('/js/templates/taskTracker.js');

          const {
            renderTaskTracker
          } = await import('/js/taskTracker/taskTrackerRender.js');

          const {
            writeTaskTrackerData
          } = await import('/js/taskTracker/taskTrackerWriteData.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createTaskTrackerTemplate().content;

          const tracker =
            editor.querySelector('.task-tracker-document');

          writeTaskTrackerData(
            tracker,
            {
              version: 1,
              columns: [
                {
                  id: 'todo',
                  title: 'Идеи',
                  taskIds: [
                    'task-1',
                    'task-2'
                  ]
                },
                {
                  id: 'done',
                  title: 'Готово',
                  taskIds: []
                }
              ],
              tasks: [
                {
                  id: 'task-1',
                  title: 'Подготовить сцену',
                  description: 'Собрать заметки и проверить карту.',
                  checklist: [
                    {
                      id: 'check-1',
                      text: 'Карта',
                      done: true
                    },
                    {
                      id: 'check-2',
                      text: 'Музыка',
                      done: false
                    }
                  ]
                },
                {
                  id: 'task-2',
                  title: 'Проверить NPC',
                  description: '',
                  checklist: []
                }
              ]
            }
          );

          renderTaskTracker(
            editor
          );

          const board =
            tracker.querySelector('.task-tracker-board');

          const firstColumn =
            tracker.querySelector('.task-column');

          const firstCard =
            tracker.querySelector('.task-card');

          const secondCard =
            tracker.querySelectorAll('.task-card')[1];

          const progress =
            firstCard.querySelector('.task-card-progress');

          const columns =
            tracker.querySelector('.task-columns');

          const iconNames =
            [
              ...tracker.querySelectorAll('.task-tracker-action-icon, .task-tracker-stat-icon')
            ].map(icon =>
              icon.dataset.iconName
            );

          const columnsRect =
            columns.getBoundingClientRect();

          const columnsChildrenOverflow =
            [
              ...columns.children
            ].some(child => {

              const rect =
                child.getBoundingClientRect();

              return rect.left < columnsRect.left - 1 ||
                rect.right > columnsRect.right + 1;
            });

          return {
            documentMarker:
              tracker.dataset.taskTrackerUiMigration,
            boardMarker:
              board.dataset.taskTrackerBoardUi,
            columnCountText:
              firstColumn.querySelector('.task-column-count')?.textContent?.trim(),
            progressValue:
              progress?.style.getPropertyValue('--task-progress').trim(),
            secondCardHasProgress:
              Boolean(
                secondCard.querySelector('.task-card-progress')
              ),
            iconNames,
            cardRadius:
              Number.parseFloat(
                getComputedStyle(firstCard).borderRadius
              ),
            columnsChildrenOverflow,
            boardOverflowStyle:
              getComputedStyle(board).overflowX
          };
        }
      );

    expect(
      result.documentMarker
    ).toBe(
      '0.0.1.8.14.1'
    );

    expect(
      result.boardMarker
    ).toBe(
      '0.0.1.8.14.1'
    );

    expect(
      result.columnCountText
    ).toBe(
      '2'
    );

    expect(
      result.progressValue
    ).toBe(
      '50%'
    );

    expect(
      result.secondCardHasProgress
    ).toBe(
      false
    );

    expect(
      result.iconNames
    ).toEqual(
      expect.arrayContaining([
        'grip',
        'plus',
        'trash',
        'check'
      ])
    );

    expect(
      result.cardRadius
    ).toBeLessThanOrEqual(
      8
    );

    expect(
      result.columnsChildrenOverflow
    ).toBe(
      false
    );

    expect(
      result.boardOverflowStyle
    ).toBe(
      'visible'
    );
  }
);
