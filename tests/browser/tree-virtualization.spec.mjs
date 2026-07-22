import {
  expect,
  test
} from '@playwright/test';


test(
  'tree-virtualization-renders-large-tree-window-and-reveals-page',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const setup =
      await page.evaluate(
        async () => {

          const {
            setPages,
            setWorkspaceHandle
          } = await import('/js/stateActions.js');

          const {
            renderTree,
            revealPageInTree
          } = await import('/js/tree/tree.js');

          const pages =
            Array.from(
              {
                length: 520
              },
              (_, index) => ({
                id: `page-${index}`,
                name: `page-${index}`,
                title: `Page ${index}`,
                parent: null,
                order: index,
                tags: [],
                html: '<p></p>'
              })
            );

          setWorkspaceHandle({
            name:
              'Test workspace'
          });

          setPages(
            pages
          );

          renderTree();

          const initialRenderedCount =
            document.querySelectorAll(
              '.tree-item'
            ).length;

          revealPageInTree(
            'page-500'
          );

          return {
            initialRenderedCount,
            isVirtualized:
              document
                .getElementById('tree')
                .classList
                .contains('is-virtualized')
          };
        }
      );

    expect(
      setup.isVirtualized
    ).toBe(
      true
    );

    expect(
      setup.initialRenderedCount
    ).toBeLessThan(
      120
    );

    await expect(
      page.locator('.tree-item[data-page-id="page-500"]')
    ).toBeVisible();
  }
);
