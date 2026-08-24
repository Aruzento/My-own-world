import {
  expect,
  test
} from '@playwright/test';


async function installSpecialEditorConflictHarness(
  page
) {

  await page.evaluate(
    async () => {

      const {
        buildPageRecordContent,
        updatePageRecordContent
      } = await import('/js/core/pageRecord.js');

      const {
        openPage,
        saveCurrentPage
      } = await import('/js/editor/editor.js');

      const {
        getCurrentEditorPageBase
      } = await import('/js/editor/editorSessionBase.js');

      const {
        createPropertiesBlock
      } = await import('/js/templates/blockTypes.js');

      const {
        getPageById
      } = await import('/js/repository/pageRepository.js');

      const {
        persistPageContentCommand,
        snapshotPageForCommand
      } = await import('/js/storage/storage.js');

      const {
        setStorageAdapter
      } = await import('/js/storage/storageAdapter.js');

      const {
        state
      } = await import('/js/state.js');

      const {
        setPages
      } = await import('/js/stateActions.js');

      const {
        renderTree
      } = await import('/js/tree/tree.js');

      const {
        readTaskTrackerData
      } = await import('/js/taskTracker/taskTrackerReadData.js');

      const {
        writeTaskTrackerData
      } = await import('/js/taskTracker/taskTrackerWriteData.js');

      const {
        readRuleTreeData
      } = await import('/js/ruleTree/ruleTreeReadData.js');

      const {
        writeRuleTreeData
      } = await import('/js/ruleTree/ruleTreeWriteData.js');

      const files =
        new Map();

      const writes =
        [];

      const normalize =
        path => String(path || '')
          .replace(/\\/g, '/')
          .replace(/^\/+/, '')
          .replace(/\/+/g, '/');

      setStorageAdapter({
        kind:
          'memory',
        getWorkspaceHandle() {
          return {
            name:
              'Special editor conflict workspace'
          };
        },
        setWorkspaceHandle() {},
        async pickWorkspace() {
          return {};
        },
        async restoreWorkspace() {
          return {};
        },
        async ensureDirectory() {},
        async getDirectoryHandle(path) {
          return {
            kind:
              'directory',
            path:
              normalize(path)
          };
        },
        async readText(path) {
          return files.get(
            normalize(path)
          ) || '';
        },
        async writeText(path, content) {
          const normalized =
            normalize(path);

          const text =
            String(content);

          files.set(
            normalized,
            text
          );

          writes.push({
            path:
              normalized,
            content:
              text
          });
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
      });

      function setPropertyValueInHTML(
        html,
        name,
        value
      ) {

        const template =
          document.createElement('template');

        template.innerHTML =
          html;

        const field =
          template.content.querySelector(
            `[data-property-name="${CSS.escape(name)}"]`
          );

        if (field) {

          field.setAttribute(
            'value',
            String(value)
          );
        }

        return template.innerHTML;
      }

      function createPropertiesBody(
        title,
        level
      ) {

        const properties =
          setPropertyValueInHTML(
            createPropertiesBlock({
              title:
                'Свойства персонажа',
              cardType:
                'character'
            }),
            'level',
            level
          );

        return `<div class="entity-layout card-shell" contenteditable="false">
  <h1>${title}</h1>
  <section class="entity-main">
    ${properties}
    <div class="rich-text-field" contenteditable="true" data-persistent-editable="true">
      properties-body-level-${level}
    </div>
  </section>
</div>`;
      }

      function createTaskTrackerData(
        token
      ) {

        const taskId =
          `${token}-task`;

        return {
          version:
            1,
          columns:
            [
              {
                id:
                  'todo',
                title:
                  'Идеи',
                taskIds:
                  [
                    taskId
                  ]
              },
              {
                id:
                  'done',
                title:
                  'Готово',
                taskIds:
                  []
              }
            ],
          tasks:
            [
              {
                id:
                  taskId,
                title:
                  token,
                description:
                  `Описание ${token}`,
                checklist:
                  []
              }
            ]
        };
      }

      function createTaskTrackerBody(
        title,
        token
      ) {

        return `<div class="task-tracker-document" data-task-tracker="v1" contenteditable="false">
  <div class="task-tracker-topbar" contenteditable="false">
    <h1 class="task-tracker-title singleline-field" contenteditable="true">${title}</h1>
  </div>
  <script class="task-tracker-data" type="application/json" data-task-tracker-data>${JSON.stringify(createTaskTrackerData(token))}</script>
</div>`;
      }

      function createRuleTreeData(
        token
      ) {

        const ruleId =
          `${token}-rule`;

        return {
          version:
            1,
          groups:
            [
              {
                id:
                  'core',
                title:
                  'Основные правила',
                parentId:
                  null
              }
            ],
          activeRuleIds:
            [
              ruleId
            ],
          rules:
            [
              {
                id:
                  ruleId,
                title:
                  token,
                description:
                  `Правило ${token}`,
                parentId:
                  null,
                groupId:
                  'core',
                category:
                  'Общее',
                conditions:
                  [],
                inheritsRuleIds:
                  [],
                sourcePackageId:
                  null,
                sourcePageId:
                  null,
                sourceType:
                  'ruleTree',
                tags:
                  [],
                effects:
                  []
              }
            ]
        };
      }

      function createRuleTreeBody(
        title,
        token
      ) {

        return `<div class="rule-tree-document" data-rule-tree="v1" contenteditable="false">
  <div class="rule-tree-topbar" contenteditable="false">
    <h1 class="rule-tree-title singleline-field" contenteditable="true">${title}</h1>
  </div>
  <script class="rule-tree-data" type="application/json" data-rule-tree-data>${JSON.stringify(createRuleTreeData(token))}</script>
</div>`;
      }

      function createPage({
        id,
        title,
        template,
        type,
        tags,
        body,
        order
      }) {

        const content =
          buildPageRecordContent({
            id,
            parent:
              null,
            order,
            tags,
            template,
            type,
            aliases:
              [],
            relationships:
              [],
            body,
            now:
              `2026-08-24T12:00:0${order}.000Z`
          });

        return {
          id,
          name:
            `${id}.md`,
          path:
            `/pages/${id}.md`,
          parent:
            null,
          order,
          title,
          template,
          type,
          tags,
          aliases:
            [],
          relationships:
            [],
          content
        };
      }

      const pages =
        [
          createPage({
            id:
              'special-conflict-character',
            title:
              'Character Conflict',
            template:
              'card',
            type:
              'character',
            tags:
              [
                'character'
              ],
            body:
              createPropertiesBody(
                'Character Conflict',
                '1'
              ),
            order:
              1
          }),
          createPage({
            id:
              'special-conflict-task-tracker',
            title:
              'Tracker Conflict',
            template:
              'taskTracker',
            type:
              'taskTracker',
            tags:
              [
                'task-tracker'
              ],
            body:
              createTaskTrackerBody(
                'Tracker Conflict',
                'base-a-task-token'
              ),
            order:
              2
          }),
          createPage({
            id:
              'special-conflict-rule-tree',
            title:
              'Rule Tree Conflict',
            template:
              'ruleTree',
            type:
              'ruleTree',
            tags:
              [
                'rule-tree'
              ],
            body:
              createRuleTreeBody(
                'Rule Tree Conflict',
                'base-a-rule-token'
              ),
            order:
              3
          })
        ];

      for (const pageRecord of pages) {

        files.set(
          normalize(pageRecord.path),
          pageRecord.content
        );
      }

      setPages(
        pages
      );

      renderTree();

      const getPage =
        pageId => state.pages.find(candidate =>
          candidate.id === pageId
        );

      const wait =
        ms => new Promise(resolve => {

          setTimeout(
            resolve,
            ms
          );
        });

      function shapeSaveResult(
        result
      ) {

        return {
          writeStatus:
            result?.writeStatus || '',
          conflict:
            Boolean(
              result?.conflict
            ),
          blocked:
            Boolean(
              result?.blocked
            ),
          written:
            Boolean(
              result?.written
            )
        };
      }

      async function writeCurrentVersion(
        pageId,
        body,
        now
      ) {

        const pageRecord =
          getPage(
            pageId
          );

        const expectedBase =
          getCurrentEditorPageBase(
            pageRecord.id
          );

        const content =
          updatePageRecordContent(
            pageRecord.content,
            {
              body
            },
            {
              now
            }
          );

        return persistPageContentCommand({
          page:
            pageRecord,
          content,
          previousPage:
            snapshotPageForCommand(
              pageRecord
            ),
          reason:
            'browser-external-special-editor-write',
          expectedBase
        });
      }

      window.__specialEditorConflictTest = {
        files,
        writes,
        createPropertiesBody,
        createTaskTrackerBody,
        createRuleTreeBody,
        async open(pageId) {

          await openPage(
            getPage(
              pageId
            )
          );

          await wait(
            0
          );

          return {
            pageId:
              state.currentPage?.id || '',
            base:
              getCurrentEditorPageBase(
                pageId
              )
          };
        },
        async externalPropertiesLevel(
          level
        ) {

          return writeCurrentVersion(
            'special-conflict-character',
            createPropertiesBody(
              'Character Conflict',
              level
            ),
            '2026-08-24T12:10:00.000Z'
          );
        },
        async externalTaskTracker(
          token
        ) {

          return writeCurrentVersion(
            'special-conflict-task-tracker',
            createTaskTrackerBody(
              'Tracker Conflict',
              token
            ),
            '2026-08-24T12:11:00.000Z'
          );
        },
        async externalRuleTree(
          token
        ) {

          return writeCurrentVersion(
            'special-conflict-rule-tree',
            createRuleTreeBody(
              'Rule Tree Conflict',
              token
            ),
            '2026-08-24T12:12:00.000Z'
          );
        },
        editPropertiesLevel(
          level
        ) {

          const input =
            document.querySelector(
              '#editorArea [data-property-name="level"]'
            );

          if (!input) return false;

          input.value =
            String(level);

          input.setAttribute(
            'value',
            String(level)
          );

          return true;
        },
        editTaskTracker(
          token
        ) {

          const tracker =
            document.querySelector(
              '#editorArea .task-tracker-document'
            );

          if (!tracker) return false;

          const data =
            readTaskTrackerData(
              tracker
            );

          const taskId =
            `${token}-task`;

          data.tasks.push({
            id:
              taskId,
            title:
              token,
            description:
              `Черновик ${token}`,
            checklist:
              []
          });

          data.columns[0].taskIds.push(
            taskId
          );

          writeTaskTrackerData(
            tracker,
            data
          );

          return true;
        },
        editRuleTree(
          token
        ) {

          const tree =
            document.querySelector(
              '#editorArea .rule-tree-document'
            );

          if (!tree) return false;

          const data =
            readRuleTreeData(
              tree
            );

          const ruleId =
            `${token}-rule`;

          data.rules.push({
            id:
              ruleId,
            title:
              token,
            description:
              `Черновик ${token}`,
            parentId:
              null,
            groupId:
              'core',
            category:
              'Общее',
            conditions:
              [],
            inheritsRuleIds:
              [],
            sourcePackageId:
              null,
            sourcePageId:
              null,
            sourceType:
              'ruleTree',
            tags:
              [],
            effects:
              []
          });

          data.activeRuleIds.push(
            ruleId
          );

          writeRuleTreeData(
            tree,
            data
          );

          return true;
        },
        async save() {

          const result =
            await saveCurrentPage({
              source:
                'manual'
            });

          await wait(
            0
          );

          return shapeSaveResult(
            result
          );
        },
        snapshot(
          pageId
        ) {

          const pageRecord =
            getPage(
              pageId
            );

          const durableContent =
            files.get(
              normalize(
                pageRecord.path
              )
            ) || '';

          const repositoryPage =
            getPageById(
              pageId
            );

          const editor =
            document.querySelector(
              '#editorArea'
            );

          return {
            currentPageId:
              state.currentPage?.id || '',
            durableContent,
            repositoryContent:
              repositoryPage?.content || '',
            runtimeContent:
              pageRecord?.content || '',
            writeCount:
              writes.length,
            propertyLevel:
              editor?.querySelector('[data-property-name="level"]')?.value || '',
            taskData:
              editor?.querySelector('.task-tracker-document')
                ? readTaskTrackerData(
                  editor.querySelector('.task-tracker-document')
                )
                : null,
            ruleData:
              editor?.querySelector('.rule-tree-document')
                ? readRuleTreeData(
                  editor.querySelector('.rule-tree-document')
                )
                : null,
            dialogOpen:
              Boolean(
                document.querySelector('.edit-conflict-dialog:not(.hidden)')
              ),
            dialogText:
              document.querySelector('.edit-conflict-dialog')?.textContent || ''
          };
        }
      };
    }
  );
}


test(
  'properties-backed-character-save-blocks-stale-serialized-body',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installSpecialEditorConflictHarness(
      page
    );

    const result =
      await page.evaluate(
        async () => {

          const harness =
            window.__specialEditorConflictTest;

          await harness.open(
            'special-conflict-character'
          );

          await harness.externalPropertiesLevel(
            '8'
          );

          const beforeStaleSave =
            harness.snapshot(
              'special-conflict-character'
            );

          harness.editPropertiesLevel(
            '9'
          );

          const saveResult =
            await harness.save();

          const afterStaleSave =
            harness.snapshot(
              'special-conflict-character'
            );

          return {
            beforeStaleSave,
            saveResult,
            afterStaleSave
          };
        }
      );

    expect(
      result.saveResult
    ).toMatchObject({
      writeStatus:
        'conflict',
      conflict:
        true,
      blocked:
        true,
      written:
        false
    });

    expect(
      result.afterStaleSave.writeCount - result.beforeStaleSave.writeCount
    ).toBe(
      0
    );

    expect(
      result.afterStaleSave.durableContent
    ).toContain(
      'properties-body-level-8'
    );

    expect(
      result.afterStaleSave.durableContent
    ).not.toContain(
      'properties-body-level-9'
    );

    expect(
      result.afterStaleSave.repositoryContent
    ).toContain(
      'properties-body-level-8'
    );

    expect(
      result.afterStaleSave.runtimeContent
    ).toContain(
      'properties-body-level-8'
    );

    expect(
      result.afterStaleSave.propertyLevel
    ).toBe(
      '9'
    );

    expect(
      result.afterStaleSave.dialogOpen
    ).toBe(
      true
    );

    expect(
      result.afterStaleSave.dialogText
    ).toContain(
      'Страница изменилась после того, как вы её открыли'
    );
  }
);


test(
  'task-tracker-special-save-blocks-stale-board-json',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installSpecialEditorConflictHarness(
      page
    );

    const result =
      await page.evaluate(
        async () => {

          const harness =
            window.__specialEditorConflictTest;

          await harness.open(
            'special-conflict-task-tracker'
          );

          await harness.externalTaskTracker(
            'current-b-task-token'
          );

          const beforeStaleSave =
            harness.snapshot(
              'special-conflict-task-tracker'
            );

          harness.editTaskTracker(
            'stale-c-task-token'
          );

          const saveResult =
            await harness.save();

          const afterStaleSave =
            harness.snapshot(
              'special-conflict-task-tracker'
            );

          return {
            beforeStaleSave,
            saveResult,
            afterStaleSave
          };
        }
      );

    expect(
      result.saveResult
    ).toMatchObject({
      writeStatus:
        'conflict',
      conflict:
        true,
      blocked:
        true,
      written:
        false
    });

    expect(
      result.afterStaleSave.writeCount - result.beforeStaleSave.writeCount
    ).toBe(
      0
    );

    expect(
      result.afterStaleSave.durableContent
    ).toContain(
      'current-b-task-token'
    );

    expect(
      result.afterStaleSave.durableContent
    ).not.toContain(
      'stale-c-task-token'
    );

    expect(
      result.afterStaleSave.repositoryContent
    ).toContain(
      'current-b-task-token'
    );

    expect(
      result.afterStaleSave.taskData.tasks.map(task => task.title)
    ).toContain(
      'stale-c-task-token'
    );

    expect(
      result.afterStaleSave.dialogOpen
    ).toBe(
      true
    );
  }
);


test(
  'rule-tree-special-save-blocks-stale-rule-json',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installSpecialEditorConflictHarness(
      page
    );

    const result =
      await page.evaluate(
        async () => {

          const harness =
            window.__specialEditorConflictTest;

          await harness.open(
            'special-conflict-rule-tree'
          );

          await harness.externalRuleTree(
            'current-b-rule-token'
          );

          const beforeStaleSave =
            harness.snapshot(
              'special-conflict-rule-tree'
            );

          harness.editRuleTree(
            'stale-c-rule-token'
          );

          const saveResult =
            await harness.save();

          const afterStaleSave =
            harness.snapshot(
              'special-conflict-rule-tree'
            );

          return {
            beforeStaleSave,
            saveResult,
            afterStaleSave
          };
        }
      );

    expect(
      result.saveResult
    ).toMatchObject({
      writeStatus:
        'conflict',
      conflict:
        true,
      blocked:
        true,
      written:
        false
    });

    expect(
      result.afterStaleSave.writeCount - result.beforeStaleSave.writeCount
    ).toBe(
      0
    );

    expect(
      result.afterStaleSave.durableContent
    ).toContain(
      'current-b-rule-token'
    );

    expect(
      result.afterStaleSave.durableContent
    ).not.toContain(
      'stale-c-rule-token'
    );

    expect(
      result.afterStaleSave.repositoryContent
    ).toContain(
      'current-b-rule-token'
    );

    expect(
      result.afterStaleSave.ruleData.rules.map(rule => rule.title)
    ).toContain(
      'stale-c-rule-token'
    );

    expect(
      result.afterStaleSave.dialogOpen
    ).toBe(
      true
    );
  }
);
