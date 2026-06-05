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
