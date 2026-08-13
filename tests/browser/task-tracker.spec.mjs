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
  'task-tracker-page-action-adds-task-through-page-command-boundary',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            setStorageAdapter
          } = await import('/js/storage/storageAdapter.js');

          const {
            setPages
          } = await import('/js/stateActions.js');

          const {
            parseMarkdown
          } = await import('/js/core/markdown.js');

          const {
            createTaskTrackerTemplate
          } = await import('/js/templates/taskTracker.js');

          const {
            addTaskToTrackerPage
          } = await import('/js/taskTracker/taskTrackerPageActions.js');

          const {
            readTaskTrackerData
          } = await import('/js/taskTracker/taskTrackerReadData.js');

          const {
            clearPageCommandEvents,
            getPageCommandEvents
          } = await import('/js/storage/pageCommandService.js');

          const {
            clearWriteRevisions
          } = await import('/js/storage/writeQueue.js');

          const files =
            new Map();

          const failingPaths =
            new Set();

          const workspaceHandle = {
            name:
              'Task tracker command test workspace'
          };

          const adapter = {
            kind:
              'memory',
            getWorkspaceHandle() {
              return workspaceHandle;
            },
            setWorkspaceHandle() {},
            async pickWorkspace() {
              return workspaceHandle;
            },
            async restoreWorkspace() {
              return workspaceHandle;
            },
            async ensureDirectory() {},
            async getDirectoryHandle() {
              return {};
            },
            async readText(path) {
              if (!files.has(path)) {
                throw new Error(`Missing file: ${path}`);
              }

              return files.get(path);
            },
            async writeText(path, content) {
              if (failingPaths.has(path)) {
                throw new Error('task tracker write denied');
              }

              files.set(
                path,
                String(content)
              );
            },
            async readBinary() {
              return new ArrayBuffer(0);
            },
            async writeBinary() {},
            async listFiles() {
              return [];
            },
            async removeFile() {},
            async removeDirectory() {}
          };

          setStorageAdapter(
            adapter
          );

          clearPageCommandEvents();
          clearWriteRevisions();

          function createTrackerPage(
            id,
            title
          ) {

            const template =
              createTaskTrackerTemplate();

            const content = `---
id: ${id}
parent: null
order: 1
tags: [task-tracker]
template: taskTracker
type: taskTracker
aliases: []
---

${template.content}`;

            return {
              id,
              path:
                `/pages/${id}.md`,
              name:
                `${id}.md`,
              parent:
                null,
              order:
                1,
              title,
              tags:
                ['task-tracker'],
              template:
                'taskTracker',
              type:
                'taskTracker',
              aliases:
                [],
              relationships:
                [],
              content
            };
          }

          function readTrackerDataFromContent(
            content
          ) {

            const parsed =
              parseMarkdown(
                content
              );

            const wrapper =
              document.createElement('div');

            wrapper.innerHTML =
              parsed.body;

            return readTaskTrackerData(
              wrapper.querySelector(
                '.task-tracker-document'
              )
            );
          }

          const trackerPage =
            createTrackerPage(
              'tracker-command-page',
              'Tracker Command Page'
            );

          const rollbackPage =
            createTrackerPage(
              'tracker-command-rollback-page',
              'Tracker Command Rollback Page'
            );

          const rollbackOriginalContent =
            rollbackPage.content;

          files.set(
            trackerPage.path,
            trackerPage.content
          );

          files.set(
            rollbackPage.path,
            rollbackPage.content
          );

          setPages([
            trackerPage,
            rollbackPage
          ]);

          const task =
            await addTaskToTrackerPage(
              trackerPage
            );

          const savedContent =
            await adapter.readText(
              trackerPage.path
            );

          const savedData =
            readTrackerDataFromContent(
              savedContent
            );

          const commandEvents =
            getPageCommandEvents();

          failingPaths.add(
            rollbackPage.path
          );

          let rollbackError =
            '';

          try {

            await addTaskToTrackerPage(
              rollbackPage
            );

          } catch (error) {

            rollbackError =
              String(
                error?.message || error
              );
          }

          return {
            taskCreated:
              Boolean(
                task?.id
              ),
            savedTaskCount:
              savedData.tasks.length,
            savedTaskInFirstColumn:
              savedData.columns[0]?.taskIds.includes(
                task?.id
              ),
            pageRuntimeUpdated:
              trackerPage.content === savedContent,
            commandEvent:
              commandEvents.find(event =>
                event.type === 'task-tracker-add-task'
              ) || null,
            rollbackError,
            rollbackRuntimeUnchanged:
              rollbackPage.content === rollbackOriginalContent,
            rollbackDurableUnchanged:
              files.get(
                rollbackPage.path
              ) === rollbackOriginalContent
          };
        }
      );

    expect(
      result.taskCreated
    ).toBe(
      true
    );

    expect(
      result.savedTaskCount
    ).toBe(
      1
    );

    expect(
      result.savedTaskInFirstColumn
    ).toBe(
      true
    );

    expect(
      result.pageRuntimeUpdated
    ).toBe(
      true
    );

    expect(
      result.commandEvent
    ).toMatchObject({
      type: 'task-tracker-add-task',
      status: 'completed',
      affectedPages: [
        'tracker-command-page'
      ]
    });

    expect(
      result.commandEvent?.writeRevision?.metadata?.reason
    ).toBe(
      'task-tracker-page-action'
    );

    expect(
      result.rollbackError
    ).toContain(
      'task tracker write denied'
    );

    expect(
      result.rollbackRuntimeUnchanged
    ).toBe(
      true
    );

    expect(
      result.rollbackDurableUnchanged
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
            boardbarTextNodeExists:
              Boolean(
                tracker.querySelector('.task-tracker-boardbar-title > span:not(.task-tracker-boardbar-icon)')
              ),
            columnAddTextNodeExists:
              Boolean(
                tracker.querySelector('.task-column-add span')
              ),
            emptyTextNodeExists:
              Boolean(
                tracker.querySelector('.task-column-empty span')
              ),
            emptyLabel:
              tracker
                .querySelector('.task-column-empty')
                ?.getAttribute('aria-label') || '',
            statFontSizes:
              [
                ...tracker.querySelectorAll('.task-tracker-stat')
              ].map(stat =>
                getComputedStyle(stat).fontSize
              ),
            statValues:
              [
                ...tracker.querySelectorAll('.task-tracker-stat-value')
              ].map(value =>
                value.textContent.trim()
              ),
            statLabels:
              [
                ...tracker.querySelectorAll('.task-tracker-stat')
              ].map(stat =>
                stat.getAttribute('aria-label')
              ),
            iconOnlyActionsUseSharedPrimitive:
              [
                ...tracker.querySelectorAll(
                  '.task-column-add, .task-add-btn, .task-column-delete, .task-drag-handle, .task-column-drag-handle, .task-delete-btn, .task-check-delete'
                )
              ].every(button =>
                button.classList.contains('mow-icon-button')
              ),
            checklistAddUsesSharedButton:
              tracker
                .querySelector('.task-checklist-add')
                ?.classList.contains('mow-button') || false,
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
      result.boardbarTextNodeExists
    ).toBe(
      false
    );

    expect(
      result.columnAddTextNodeExists
    ).toBe(
      false
    );

    expect(
      result.emptyTextNodeExists
    ).toBe(
      false
    );

    expect(
      result.emptyLabel
    ).toBe(
      'Колонка пуста'
    );

    expect(
      result.statFontSizes
    ).not.toContain(
      '0px'
    );

    expect(
      result.statValues
    ).toEqual([
      '2',
      '2',
      '1/2'
    ]);

    expect(
      result.statLabels
    ).toEqual([
      'Колонки: 2',
      'Задачи: 2',
      'Чеклист: 1 из 2'
    ]);

    expect(
      result.iconOnlyActionsUseSharedPrimitive
    ).toBe(
      true
    );

    expect(
      result.checklistAddUsesSharedButton
    ).toBe(
      true
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

    await expect(
      page.getByRole('button', {
        name: 'Добавить колонку'
      })
    ).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Добавить задачу'
      }).first()
    ).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Удалить задачу'
      }).first()
    ).toBeVisible();

    await expect(
      page.getByRole('status', {
        name: 'Колонка пуста'
      })
    ).toBeVisible();

    const addColumnButton =
      page.getByRole('button', {
        name: 'Добавить колонку'
      });

    await addColumnButton.focus();

    await expect(
      addColumnButton
    ).toBeFocused();

    const focusStyle =
      await addColumnButton.evaluate(button => {

        const style =
          getComputedStyle(button);

        return {
          outlineStyle:
            style.outlineStyle,
          outlineWidth:
            style.outlineWidth
        };
      });

    expect(
      focusStyle.outlineStyle
    ).not.toBe(
      'none'
    );

    expect(
      focusStyle.outlineWidth
    ).not.toBe(
      '0px'
    );
  }
);

test(
  'task-tracker-action-buttons-work-when-inner-icons-are-clicked',
  async ({ page }) => {

    await page.goto(
      '/'
    );

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
                title: 'Todo',
                taskIds: [
                  'task-1'
                ]
              }
            ],
            tasks: [
              {
                id: 'task-1',
                title: 'Seed task',
                description: '',
                checklist: []
              }
            ]
          }
        );

        renderTaskTracker(
          editor
        );
      }
    );

    await dispatchInnerTaskTrackerClick(
      page,
      '.task-column-add .task-tracker-action-icon use'
    );

    await expectTaskTrackerCounts(
      page,
      {
        columns: 2,
        tasks: 1,
        todoTasks: 1,
        taskOneChecks: 0
      }
    );

    await dispatchInnerTaskTrackerClick(
      page,
      '.task-column[data-column-id="todo"] .task-add-btn .task-tracker-action-icon use'
    );

    await expectTaskTrackerCounts(
      page,
      {
        columns: 2,
        tasks: 2,
        todoTasks: 2,
        taskOneChecks: 0
      }
    );

    await page
      .locator('.task-column[data-column-id="todo"] .task-card-title')
      .last()
      .fill('Edited task from shared controls');

    await expectTaskTrackerTitles(
      page,
      [
        'Seed task',
        'Edited task from shared controls'
      ]
    );

    await dispatchInnerTaskTrackerClick(
      page,
      '.task-card[data-task-id="task-1"] .task-checklist-add .task-tracker-action-icon use'
    );

    await expectTaskTrackerCounts(
      page,
      {
        columns: 2,
        tasks: 2,
        todoTasks: 2,
        taskOneChecks: 1
      }
    );

    await dispatchInnerTaskTrackerClick(
      page,
      '.task-card[data-task-id="task-1"] .task-check-delete .task-tracker-action-icon use'
    );

    await expectTaskTrackerCounts(
      page,
      {
        columns: 2,
        tasks: 2,
        todoTasks: 2,
        taskOneChecks: 0
      }
    );

    await dispatchInnerTaskTrackerClick(
      page,
      '.task-card[data-task-id="task-1"] .task-delete-btn .task-tracker-action-icon use'
    );

    await expectTaskTrackerCounts(
      page,
      {
        columns: 2,
        tasks: 1,
        todoTasks: 1,
        taskOneChecks: 0
      }
    );

    await dispatchInnerTaskTrackerClick(
      page,
      '.task-column:not([data-column-id="todo"]) .task-column-delete .task-tracker-action-icon use'
    );

    await expectTaskTrackerCounts(
      page,
      {
        columns: 1,
        tasks: 1,
        todoTasks: 1,
        taskOneChecks: 0
      }
    );
  }
);


test(
  'task-tracker-drag-drop-still-persists-with-shared-icon-buttons',
  async ({ page }) => {

    await page.goto(
      '/'
    );

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
                title: 'Todo',
                taskIds: [
                  'task-1'
                ]
              },
              {
                id: 'done',
                title: 'Done',
                taskIds: []
              }
            ],
            tasks: [
              {
                id: 'task-1',
                title: 'Dragged task',
                description: '',
                checklist: []
              }
            ]
          }
        );

        renderTaskTracker(
          editor
        );
      }
    );

    await dragLocatorToLocator(
      page,
      page.locator('.task-card[data-task-id="task-1"] .task-drag-handle'),
      page.locator('.task-column[data-column-id="done"] .task-list')
    );

    await expectTaskTrackerColumnOrder(
      page,
      [
        {
          id: 'todo',
          taskIds: []
        },
        {
          id: 'done',
          taskIds: [
            'task-1'
          ]
        }
      ]
    );

    await dragLocatorToLocator(
      page,
      page.locator('.task-column[data-column-id="done"] .task-column-drag-handle'),
      page.locator('.task-column[data-column-id="todo"]'),
      {
        targetXRatio: 0.18
      }
    );

    await expectTaskTrackerColumnOrder(
      page,
      [
        {
          id: 'done',
          taskIds: [
            'task-1'
          ]
        },
        {
          id: 'todo',
          taskIds: []
        }
      ]
    );
  }
);


test(
  'task-tracker-keyboard-reorder-uses-existing-model-and-announces-result',
  async ({ page }) => {

    await page.goto(
      '/'
    );

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
                title: 'Todo',
                taskIds: [
                  'task-1',
                  'task-2'
                ]
              },
              {
                id: 'done',
                title: 'Done',
                taskIds: []
              }
            ],
            tasks: [
              {
                id: 'task-1',
                title: 'First task',
                description: '',
                checklist: []
              },
              {
                id: 'task-2',
                title: 'Second task',
                description: '',
                checklist: []
              }
            ]
          }
        );

        renderTaskTracker(
          editor
        );
      }
    );

    const taskHandle =
      page.locator('.task-card[data-task-id="task-2"] .task-drag-handle');

    await taskHandle.focus();

    await expect(
      taskHandle
    ).toBeFocused();

    await expect(
      taskHandle
    ).toHaveAttribute(
      'aria-keyshortcuts',
      /Control\+Shift\+ArrowUp/
    );

    await page.keyboard.press(
      'Control+Shift+ArrowUp'
    );

    await expectTaskTrackerColumnOrder(
      page,
      [
        {
          id: 'todo',
          taskIds: [
            'task-2',
            'task-1'
          ]
        },
        {
          id: 'done',
          taskIds: []
        }
      ]
    );

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'Задача перемещена'
    );

    await expect(
      taskHandle
    ).toBeFocused();

    await page.keyboard.press(
      'Control+Shift+ArrowRight'
    );

    await expectTaskTrackerColumnOrder(
      page,
      [
        {
          id: 'todo',
          taskIds: [
            'task-1'
          ]
        },
        {
          id: 'done',
          taskIds: [
            'task-2'
          ]
        }
      ]
    );

    await expect(
      taskHandle
    ).toBeFocused();

    const columnHandle =
      page.locator('.task-column[data-column-id="done"] .task-column-drag-handle');

    await columnHandle.focus();

    await expect(
      columnHandle
    ).toHaveAttribute(
      'aria-keyshortcuts',
      /Control\+Shift\+ArrowLeft/
    );

    await page.keyboard.press(
      'Control+Shift+ArrowLeft'
    );

    await expectTaskTrackerColumnOrder(
      page,
      [
        {
          id: 'done',
          taskIds: [
            'task-2'
          ]
        },
        {
          id: 'todo',
          taskIds: [
            'task-1'
          ]
        }
      ]
    );

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'Колонка перемещена'
    );

    await expect(
      columnHandle
    ).toBeFocused();

    await expect(
      page.locator('#statusbar')
    ).toHaveAttribute(
      'role',
      'status'
    );

    const dragArtifacts =
      await page.evaluate(
        () => ({
          draggingCards:
            document.querySelectorAll(
              '.task-card.is-dragging, .task-column.is-dragging'
            ).length,
          hasPreview:
            Boolean(
              document.querySelector(
                '.task-drag-preview, .task-column-drag-preview'
              )
            ),
          hasPlaceholder:
            Boolean(
              document.querySelector(
                '.task-drop-placeholder, .task-column-drop-placeholder'
              )
            )
        })
      );

    expect(
      dragArtifacts
    ).toEqual({
      draggingCards:
        0,
      hasPreview:
        false,
      hasPlaceholder:
        false
    });
  }
);


async function dispatchInnerTaskTrackerClick(
  page,
  selector
) {

  await page.evaluate(
    clickSelector => {

      const target =
        document.querySelector(
          clickSelector
        );

      if (!target) {

        throw new Error(
          `Task tracker click target not found: ${clickSelector}`
        );
      }

      target.dispatchEvent(
        new MouseEvent(
          'click',
          {
            bubbles: true,
            cancelable: true,
            view: window
          }
        )
      );
    },
    selector
  );
}


async function dragLocatorToLocator(
  page,
  source,
  target,
  options = {}
) {

  const sourceBox =
    await source.boundingBox();

  const targetBox =
    await target.boundingBox();

  expect(
    sourceBox
  ).not.toBeNull();

  expect(
    targetBox
  ).not.toBeNull();

  const sourceX =
    sourceBox.x + sourceBox.width / 2;

  const sourceY =
    sourceBox.y + sourceBox.height / 2;

  const targetX =
    targetBox.x + targetBox.width * (options.targetXRatio || 0.5);

  const targetY =
    targetBox.y + targetBox.height * (options.targetYRatio || 0.5);

  await page.mouse.move(
    sourceX,
    sourceY
  );

  await page.mouse.down();

  await page.mouse.move(
    targetX,
    targetY,
    {
      steps: 10
    }
  );

  await page.mouse.up();
}


async function expectTaskTrackerColumnOrder(
  page,
  expected
) {

  const actual =
    await page.evaluate(
      async () => {

        const {
          readTaskTrackerData
        } = await import('/js/taskTracker/taskTrackerReadData.js');

        const tracker =
          document.querySelector('.task-tracker-document');

        return readTaskTrackerData(
          tracker
        ).columns.map(column => ({
          id:
            column.id,
          taskIds:
            column.taskIds
        }));
      }
    );

  expect(
    actual
  ).toEqual(
    expected
  );
}


async function expectTaskTrackerTitles(
  page,
  expected
) {

  const actual =
    await page.evaluate(
      async () => {

        const {
          readTaskTrackerData
        } = await import('/js/taskTracker/taskTrackerReadData.js');

        const tracker =
          document.querySelector('.task-tracker-document');

        return readTaskTrackerData(
          tracker
        ).tasks.map(task =>
          task.title
        );
      }
    );

  expect(
    actual
  ).toEqual(
    expected
  );
}


async function expectTaskTrackerCounts(
  page,
  expected
) {

  const actual =
    await page.evaluate(
      async () => {

        const {
          readTaskTrackerData
        } = await import('/js/taskTracker/taskTrackerReadData.js');

        const tracker =
          document.querySelector('.task-tracker-document');

        const data =
          readTaskTrackerData(
            tracker
          );

        const todo =
          data.columns.find(column =>
            column.id === 'todo'
          );

        const taskOne =
          data.tasks.find(task =>
            task.id === 'task-1'
          );

        return {
          columns:
            data.columns.length,
          tasks:
            data.tasks.length,
          todoTasks:
            todo?.taskIds.length || 0,
          taskOneChecks:
            taskOne?.checklist?.length || 0
        };
      }
    );

  expect(
    actual
  ).toEqual(
    expected
  );
}
