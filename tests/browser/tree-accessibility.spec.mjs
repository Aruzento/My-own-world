import {
  expect,
  test
} from '@playwright/test';


test(
  'tree-accessibility-russian-labels-and-desktop-keyboard-contract',
  async ({ page }) => {

    await page.addInitScript(
      () => {

        localStorage.removeItem(
          'my-own-world:tree-expansion-state'
        );

        localStorage.removeItem(
          'my-own-world:collapsed-tree-pages'
        );
      }
    );

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          setCurrentPage,
          setPages,
          setWorkspaceHandle
        } = await import('/js/stateActions.js');

        const {
          renderTree
        } = await import('/js/tree/tree.js');

        const pages = [
          {
            id:
              'tree-a11y-root',
            name:
              'tree-a11y-root.md',
            title:
              'Архив корня',
            order:
              1,
            template:
              'card',
            type:
              'folder',
            tags:
              [
                'folder'
              ],
            content:
              '<h1>Архив корня</h1>'
          },
          {
            id:
              'tree-a11y-child',
            name:
              'tree-a11y-child.md',
            title:
              'Тайная дверь',
            parent:
              'tree-a11y-root',
            order:
              1,
            template:
              'card',
            type:
              'note',
            tags:
              [
                'place'
              ],
            content:
              '<h1>Тайная дверь</h1>'
          },
          {
            id:
              'tree-a11y-sibling',
            name:
              'tree-a11y-sibling.md',
            title:
              'Одинокая башня',
            order:
              2,
            template:
              'card',
            type:
              'note',
            tags:
              [],
            content:
              '<h1>Одинокая башня</h1>'
          },
          {
            id:
              'tree-a11y-untitled',
            name:
              'tree-a11y-untitled.md',
            order:
              3,
            template:
              'card',
            type:
              'note',
            tags:
              [],
            content:
              '<h1>Без названия</h1>'
          }
        ];

        setWorkspaceHandle({
          name:
            'Tree accessibility workspace'
        });

        setPages(
          pages
        );

        setCurrentPage(
          pages[0]
        );

        renderTree();
      }
    );

    await expect(
      page.getByRole(
        'tree',
        {
          name:
            'Дерево мира'
        }
      )
    ).toBeVisible();

    const root =
      page.locator(
        '.tree-item[data-page-id="tree-a11y-root"]'
      );

    const child =
      page.locator(
        '.tree-item[data-page-id="tree-a11y-child"]'
      );

    const sibling =
      page.locator(
        '.tree-item[data-page-id="tree-a11y-sibling"]'
      );

    const untitled =
      page.locator(
        '.tree-item[data-page-id="tree-a11y-untitled"]'
      );

    await expect(
      root
    ).toHaveAttribute(
      'role',
      'treeitem'
    );

    await expect(
      root
    ).toHaveAttribute(
      'aria-label',
      'Архив корня'
    );

    await expect(
      root
    ).toHaveAttribute(
      'aria-level',
      '1'
    );

    await expect(
      root
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await expect(
      root
    ).toHaveAttribute(
      'aria-current',
      'page'
    );

    await expect(
      child
    ).toHaveAttribute(
      'aria-level',
      '2'
    );

    await expect(
      child
    ).toHaveAttribute(
      'aria-label',
      'Тайная дверь'
    );

    await expect(
      untitled
    ).toHaveAttribute(
      'aria-label',
      'Без названия'
    );

    await expect(
      root.locator(
        '.tree-toggle'
      )
    ).toHaveAttribute(
      'title',
      'Свернуть: Архив корня'
    );

    await expect(
      page.getByRole(
        'button',
        {
          name:
            'Действия страницы: Архив корня'
        }
      )
    ).toBeVisible();

    await root.focus();

    await expect(
      root
    ).toBeFocused();

    await expect(
      root
    ).toHaveAttribute(
      'tabindex',
      '0'
    );

    await expect(
      root.locator(
        '.tree-actions'
      )
    ).toHaveAttribute(
      'tabindex',
      '0'
    );

    await expect(
      child.locator(
        '.tree-actions'
      )
    ).toHaveAttribute(
      'tabindex',
      '-1'
    );

    const focusRing =
      await root.evaluate(
        element => {

          const style =
            getComputedStyle(
              element
            );

          return {
            outlineStyle:
              style.outlineStyle,
            outlineWidth:
              style.outlineWidth,
            boxShadow:
              style.boxShadow
          };
        }
      );

    expect(
      focusRing.outlineStyle
    ).not.toBe(
      'none'
    );

    expect(
      focusRing.outlineWidth
    ).not.toBe(
      '0px'
    );

    await page.keyboard.press(
      'ArrowDown'
    );

    await expect(
      child
    ).toBeFocused();

    await expect(
      child
    ).toHaveAttribute(
      'tabindex',
      '0'
    );

    await expect(
      child.locator(
        '.tree-actions'
      )
    ).toHaveAttribute(
      'tabindex',
      '0'
    );

    await expect(
      root.locator(
        '.tree-actions'
      )
    ).toHaveAttribute(
      'tabindex',
      '-1'
    );

    await page.keyboard.press(
      'ArrowUp'
    );

    await expect(
      root
    ).toBeFocused();

    await page.keyboard.press(
      'ArrowLeft'
    );

    await expect(
      root
    ).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    await expect(
      root.locator(
        '.tree-toggle'
      )
    ).toHaveAttribute(
      'title',
      'Развернуть: Архив корня'
    );

    await expect(
      child
    ).toHaveCount(
      0
    );

    await expect(
      root
    ).toBeFocused();

    await page.keyboard.press(
      'ArrowRight'
    );

    await expect(
      root
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await expect(
      root
    ).toBeFocused();

    await page.keyboard.press(
      'ArrowRight'
    );

    await expect(
      child
    ).toBeFocused();

    await page.keyboard.press(
      'ArrowLeft'
    );

    await expect(
      root
    ).toBeFocused();

    await page.keyboard.press(
      'ArrowLeft'
    );

    await expect(
      root
    ).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    await expect(
      root
    ).toBeFocused();

    await page.keyboard.press(
      'End'
    );

    await expect(
      untitled
    ).toBeFocused();

    await page.keyboard.press(
      'Home'
    );

    await expect(
      root
    ).toBeFocused();

    await page.keyboard.press(
      'ArrowRight'
    );

    await expect(
      root
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await page.keyboard.press(
      'ArrowRight'
    );

    await expect(
      child
    ).toBeFocused();

    await page.keyboard.press(
      'Enter'
    );

    await expect(
      page.locator(
        '#editorArea h1'
      )
    ).toHaveText(
      'Тайная дверь'
    );

    await expect(
      child
    ).toHaveAttribute(
      'aria-current',
      'page'
    );

    await expect(
      root
    ).not.toHaveAttribute(
      'aria-current',
      'page'
    );

    const leafToggleState =
      await child.locator(
        '.tree-toggle'
      ).evaluate(
        toggle => ({
          disabled:
            toggle.disabled,
          tabIndex:
            toggle.tabIndex,
          ariaHidden:
            toggle.getAttribute(
              'aria-hidden'
            ),
          ariaLabel:
            toggle.getAttribute(
              'aria-label'
            )
        })
      );

    expect(
      leafToggleState
    ).toEqual({
      disabled:
        true,
      tabIndex:
        -1,
      ariaHidden:
        'true',
      ariaLabel:
        null
    });

    const keyboardDragState =
      await page.evaluate(
        () => ({
          draggingRows:
            document.querySelectorAll(
              '.tree-item.is-dragging'
            ).length,
          hasDragPreview:
            Boolean(
              document.querySelector(
                '.tree-drag-preview'
              )
            ),
          hasDropPlaceholder:
            Boolean(
              document.querySelector(
                '.tree-drop-placeholder'
              )
            )
        })
      );

    expect(
      keyboardDragState
    ).toEqual({
      draggingRows:
        0,
      hasDragPreview:
        false,
      hasDropPlaceholder:
        false
    });

    await expect(
      sibling
    ).toBeVisible();
  }
);
