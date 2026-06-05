import {
  expect,
  test
} from '@playwright/test';


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
