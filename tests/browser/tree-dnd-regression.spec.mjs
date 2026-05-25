import {
  expect,
  test
} from '@playwright/test';


// Browser regression: проверяет чистую логику дерева в реальной browser-среде.
// Это защищает pointer-DnD от повторных поломок в режимах above / inside / below / root.

test(
  'tree-pointer-dnd-planner-keeps-stable-drop-intents-and-order',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createTreeMovePlan
          } = await import('/js/tree/treeMovePlanner.js');

          const {
            getTreeDropIntentFromRatio
          } = await import('/js/tree/treeDropIntent.js');

          const pages = [
            {
              id: 'folder-a',
              parent: null,
              order: 1
            },
            {
              id: 'page-a',
              parent: 'folder-a',
              order: 1
            },
            {
              id: 'page-b',
              parent: 'folder-a',
              order: 2
            },
            {
              id: 'page-c',
              parent: 'folder-a',
              order: 3
            },
            {
              id: 'folder-b',
              parent: null,
              order: 2
            }
          ];

          const beforeIntent =
            getTreeDropIntentFromRatio(
              0.1
            );

          const insideIntent =
            getTreeDropIntentFromRatio(
              0.5
            );

          const afterIntent =
            getTreeDropIntentFromRatio(
              0.9
            );

          const sameLevelPlan =
            createTreeMovePlan({
              pages,
              draggedId: 'page-c',
              targetId: 'page-a',
              mode: 'before'
            });

          const insidePlan =
            createTreeMovePlan({
              pages,
              draggedId: 'page-b',
              targetId: 'folder-b',
              mode: 'inside',
              orderValue: 77
            });

          const rootPlan =
            createTreeMovePlan({
              pages,
              draggedId: 'page-b',
              mode: 'root',
              orderValue: 88
            });

          return {
            intents: [
              beforeIntent,
              insideIntent,
              afterIntent
            ],
            sameLevel: sameLevelPlan.map(item => ({
              id: item.page.id,
              parentId: item.parentId,
              order: item.order
            })),
            inside: insidePlan.map(item => ({
              id: item.page.id,
              parentId: item.parentId,
              order: item.order
            })),
            root: rootPlan.map(item => ({
              id: item.page.id,
              parentId: item.parentId,
              order: item.order
            }))
          };
        }
      );

    expect(
      result.intents
    ).toEqual([
      'before',
      'inside',
      'after'
    ]);

    expect(
      result.sameLevel
    ).toEqual([
      {
        id: 'page-c',
        parentId: 'folder-a',
        order: 1
      },
      {
        id: 'page-a',
        parentId: 'folder-a',
        order: 2
      },
      {
        id: 'page-b',
        parentId: 'folder-a',
        order: 3
      }
    ]);

    expect(
      result.inside
    ).toEqual([
      {
        id: 'page-b',
        parentId: 'folder-b',
        order: 77
      }
    ]);

    expect(
      result.root
    ).toEqual([
      {
        id: 'page-b',
        parentId: null,
        order: 88
      }
    ]);
  }
);
