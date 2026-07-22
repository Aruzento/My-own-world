import {
  expect,
  test
} from '@playwright/test';


test(
  'rule-tree-can-be-created-from-main-create-menu',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          setStorageAdapter
        } = await import('/js/storage/storageAdapter.js');

        const {
          renderTree
        } = await import('/js/tree/tree.js');

        const files =
          new Map();

        setStorageAdapter({
          kind: 'memory',
          getWorkspaceHandle() {
            return {
              name:
                'Test workspace'
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
          async getDirectoryHandle() {
            return {};
          },
          async readText(path) {
            return files.get(path) || '';
          },
          async writeText(path, content) {
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
        });

        renderTree();
      }
    );

    await page.locator('[data-create-page]').click();
    await page.locator('#createMenu [data-template="ruleTree"]').click();

    await expect(
      page.locator('.rule-tree-document')
    ).toBeVisible();

    await expect(
      page.locator('.tree-item[data-page-id]')
    ).toHaveCount(
      1
    );

    const createdPage =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          return state.pages[0];
        }
      );

    expect(
      createdPage.template
    ).toBe(
      'ruleTree'
    );

    expect(
      createdPage.type
    ).toBe(
      'ruleTree'
    );
  }
);


test(
  'rule-tree-special-entity-imports-legacy-rules-and-keeps-json',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            renderRuleTree
          } = await import('/js/ruleTree/ruleTreeRender.js');

          const {
            setupRuleTrees
          } = await import('/js/ruleTree/ruleTree.js');

          const {
            readRuleTreeData
          } = await import('/js/ruleTree/ruleTreeReadData.js');

          const {
            serializeRuleTreeHTML
          } = await import('/js/ruleTree/ruleTreeContract.js');

          state.pages = [
            {
              id: 'rule-defense',
              title: 'Защита',
              tags: [
                'rule'
              ],
              content: `
                <script type="application/json" data-character-effects>
                  {"effects":[{"id":"ac","title":"КЗ +1","modifiers":{"armorClass":1}}]}
                </script>
              `
            }
          ];

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="rule-tree-document" data-rule-tree="v1" contenteditable="false">
              <h1 class="rule-tree-title" contenteditable="true">Правила мира</h1>
              <script class="rule-tree-data" type="application/json" data-rule-tree-data>
                {"version":1,"activeRuleIds":[],"rules":[]}
              </script>
            </div>
          `;

          setupRuleTrees(
            editor,
            async () => {}
          );

          renderRuleTree(
            editor
          );

          editor
            .querySelector('.rule-tree-import-rule')
            .click();

          editor.querySelector(
            '.rule-tree-group-title-input'
          ).value =
            'Боевые правила';

          editor
            .querySelector('.rule-tree-add-group')
            .click();

          const checkbox =
            editor.querySelector('.rule-tree-active-checkbox');

          checkbox.checked =
            true;

          checkbox.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          const data =
            readRuleTreeData(
              editor.querySelector('.rule-tree-document')
            );

          const html =
            serializeRuleTreeHTML(
              editor
            );

          return {
            ruleCount:
              data.rules.length,
            activeRuleIds:
              data.activeRuleIds,
            groupTitles:
              data.groups.map(group =>
                group.title
              ),
            html
          };
        }
      );

    expect(
      result.ruleCount
    ).toBe(
      1
    );

    expect(
      result.activeRuleIds
    ).toEqual([
      'rule-defense'
    ]);

    expect(
      result.html
    ).toContain(
      'data-rule-tree-data'
    );

    expect(
      result.groupTitles
    ).toContain(
      'Боевые правила'
    );

    expect(
      result.html
    ).not.toContain(
      'rule-tree-board'
    );
  }
);


test(
  'rule-tree-editor-updates-conditions-and-package-json',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            renderRuleTree
          } = await import('/js/ruleTree/ruleTreeRender.js');

          const {
            setupRuleTrees
          } = await import('/js/ruleTree/ruleTree.js');

          const {
            readRuleTreeData
          } = await import('/js/ruleTree/ruleTreeReadData.js');

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="rule-tree-document" data-rule-tree="v1" contenteditable="false">
              <h1 class="rule-tree-title" contenteditable="true">Rules</h1>
              <script class="rule-tree-data" type="application/json" data-rule-tree-data>
                {
                  "version": 1,
                  "activeRuleIds": [],
                  "rules": [
                    {
                      "id": "rule-defense",
                      "title": "Defense",
                      "description": "Armor bonus",
                      "effects": [
                        {
                          "id": "ac",
                          "title": "AC +1",
                          "modifiers": {
                            "armorClass": 1
                          }
                        }
                      ]
                    }
                  ]
                }
              </script>
            </div>
          `;

          setupRuleTrees(
            editor,
            async () => {}
          );

          renderRuleTree(
            editor
          );

          const nextTick =
            () => new Promise(resolve =>
              setTimeout(
                resolve,
                0
              )
            );

          editor.querySelector(
            '.rule-tree-rule-category'
          ).value =
            'combat';

          editor.querySelector(
            '.rule-tree-rule-category'
          ).dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          await nextTick();

          editor.querySelector(
            '.rule-tree-condition-type'
          ).value =
            'level';

          editor.querySelector(
            '.rule-tree-condition-value'
          ).value =
            '>=3';

          editor.querySelector(
            '.rule-tree-condition-note'
          ).value =
            'level gate';

          editor
            .querySelector('.rule-tree-add-condition')
            .click();

          await nextTick();

          const checkbox =
            editor.querySelector('.rule-tree-active-checkbox');

          checkbox.checked =
            true;

          checkbox.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );

          await nextTick();

          editor
            .querySelector('.rule-tree-export-package')
            .click();

          const exportedPackage =
            JSON.parse(
              editor.querySelector('.rule-tree-package-json').value
            );

          editor.querySelector(
            '.rule-tree-package-json'
          ).value =
            JSON.stringify({
              version: 1,
              groups: [
                {
                  id: 'package',
                  title: 'Package',
                  parentId: null
                }
              ],
              activeRuleIds: [
                'rule-speed'
              ],
              rules: [
                {
                  id: 'rule-speed',
                  title: 'Speed step',
                  groupId: 'package',
                  effects: [
                    {
                      id: 'speed',
                      title: 'Speed +5',
                      modifiers: {
                        speed: 5
                      }
                    }
                  ]
                }
              ]
            });

          editor
            .querySelector('.rule-tree-import-package')
            .click();

          await nextTick();

          const data =
            readRuleTreeData(
              editor.querySelector('.rule-tree-document')
            );

          return {
            firstRule:
              data.rules.find(rule =>
                rule.id === 'rule-defense'
              ),
            packageRule:
              data.rules.find(rule =>
                rule.id === 'rule-speed'
              ),
            activeRuleIds:
              data.activeRuleIds,
            exportedRuleIds:
              exportedPackage.rules.map(rule =>
                rule.id
              )
          };
        }
      );

    expect(
      result.firstRule.category
    ).toBe(
      'combat'
    );

    expect(
      result.firstRule.conditions
    ).toEqual([
      {
        type: 'level',
        value: '>=3',
        note: 'level gate'
      }
    ]);

    expect(
      result.packageRule.sourceType
    ).toBe(
      'rulePackage'
    );

    expect(
      result.activeRuleIds
    ).toEqual([
      'rule-defense',
      'rule-speed'
    ]);

    expect(
      result.exportedRuleIds
    ).toContain(
      'rule-defense'
    );
  }
);


test(
  'rule-tree-package-manager-saves-loads-and-reports-conflicts',
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
            renderRuleTree
          } = await import('/js/ruleTree/ruleTreeRender.js');

          const {
            setupRuleTrees
          } = await import('/js/ruleTree/ruleTree.js');

          const {
            readRuleTreeData
          } = await import('/js/ruleTree/ruleTreeReadData.js');

          const files =
            new Map();

          setStorageAdapter({
            kind: 'memory',
            async pickWorkspace() {
              return {};
            },
            async restoreWorkspace() {
              return {};
            },
            async ensureDirectory() {},
            async getDirectoryHandle() {
              return {};
            },
            async readText(path) {
              return files.get(path);
            },
            async writeText(path, content) {
              files.set(
                path,
                String(content)
              );
            },
            async readBinary() {
              return new ArrayBuffer(0);
            },
            async writeBinary() {},
            async listFiles(path) {
              const prefix =
                `${path}/`;

              return [...files.keys()]
                .filter(filePath =>
                  filePath.startsWith(
                    prefix
                  )
                )
                .map(filePath => ({
                  name:
                    filePath.slice(
                      prefix.length
                    ),
                  kind:
                    'file'
                }));
            },
            async removeFile(path) {
              files.delete(
                path
              );
            },
            async removeDirectory() {}
          });

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML = `
            <div class="rule-tree-document" data-rule-tree="v1" contenteditable="false">
              <h1 class="rule-tree-title" contenteditable="true">Rules</h1>
              <script class="rule-tree-data" type="application/json" data-rule-tree-data>
                {
                  "version": 1,
                  "groups": [
                    {
                      "id": "core",
                      "title": "Core",
                      "parentId": null
                    }
                  ],
                  "activeRuleIds": [
                    "rule-defense"
                  ],
                  "rules": [
                    {
                      "id": "rule-defense",
                      "title": "Defense",
                      "description": "Armor bonus",
                      "inheritsRuleIds": [
                        "missing-rule"
                      ],
                      "effects": [
                        {
                          "id": "ac",
                          "title": "AC +1",
                          "modifiers": {
                            "armorClass": 1
                          }
                        }
                      ]
                    }
                  ]
                }
              </script>
            </div>
          `;

          setupRuleTrees(
            editor,
            async () => {}
          );

          renderRuleTree(
            editor
          );

          const nextTick =
            () => new Promise(resolve =>
              setTimeout(
                resolve,
                0
              )
            );

          const tree =
            editor.querySelector('.rule-tree-document');

          const diagnosticsText =
            editor.querySelector('.rule-tree-diagnostics').textContent;

          editor.querySelector(
            '.rule-tree-package-id'
          ).value =
            'core-rules';

          editor
            .querySelector('.rule-tree-save-package-file')
            .click();

          await nextTick();

          const savedStatus =
            tree.querySelector('.rule-tree-package-status').textContent;

          const savedPackageCreated =
            files.has(
              'rule-packages/core-rules.rule-package.json'
            );

          await files.set(
            'rule-packages/conflict.rule-package.json',
            JSON.stringify({
              version: 1,
              rules: [
                {
                  id: 'rule-defense',
                  title: 'Conflict'
                }
              ]
            })
          );

          tree
            .querySelector('.rule-tree-refresh-packages')
            .click();

          await nextTick();

          tree.querySelector(
            '.rule-tree-package-file-select'
          ).value =
            'conflict';

          tree
            .querySelector('.rule-tree-load-package-file')
            .click();

          await nextTick();

          const conflictStatus =
            tree.querySelector('.rule-tree-package-status').textContent;

          await files.set(
            'rule-packages/speed.rule-package.json',
            JSON.stringify({
              version: 1,
              groups: [
                {
                  id: 'movement',
                  title: 'Movement',
                  parentId: null
                }
              ],
              activeRuleIds: [
                'rule-speed'
              ],
              rules: [
                {
                  id: 'rule-speed',
                  title: 'Speed',
                  groupId: 'movement',
                  effects: [
                    {
                      id: 'speed',
                      title: 'Speed +5',
                      modifiers: {
                        speed: 5
                      }
                    }
                  ]
                }
              ]
            })
          );

          tree
            .querySelector('.rule-tree-refresh-packages')
            .click();

          await nextTick();

          tree.querySelector(
            '.rule-tree-package-file-select'
          ).value =
            'speed';

          tree
            .querySelector('.rule-tree-load-package-file')
            .click();

          await nextTick();

          const data =
            readRuleTreeData(
              editor.querySelector('.rule-tree-document')
            );

          const updatedTree =
            editor.querySelector('.rule-tree-document');

          updatedTree
            .querySelector('.rule-tree-refresh-packages')
            .click();

          await nextTick();

          updatedTree.querySelector(
            '.rule-tree-package-file-select'
          ).value =
            'core-rules';

          updatedTree
            .querySelector('.rule-tree-remove-package-file')
            .click();

          await nextTick();

          const deletedStatus =
            updatedTree.querySelector('.rule-tree-package-status').textContent;

          return {
            diagnosticsText,
            savedStatus,
            conflictStatus,
            deletedStatus,
            savedPackageCreated,
            packageIds:
              [...files.keys()],
            ruleIds:
              data.rules.map(rule =>
                rule.id
              ),
            activeRuleIds:
              data.activeRuleIds
          };
        }
      );

    expect(
      result.diagnosticsText
    ).toContain(
      'missing-rule'
    );

    expect(
      result.savedStatus
    ).toContain(
      'Пакет сохранен'
    );

    expect(
      result.conflictStatus
    ).toContain(
      'Конфликт id'
    );

    expect(
      result.savedPackageCreated
    ).toBe(
      true
    );

    expect(
      result.deletedStatus
    ).toContain(
      'Пакет удален'
    );

    expect(
      result.packageIds
    ).not.toContain(
      'rule-packages/core-rules.rule-package.json'
    );

    expect(
      result.ruleIds
    ).toContain(
      'rule-speed'
    );

    expect(
      result.activeRuleIds
    ).toContain(
      'rule-speed'
    );
  }
);
