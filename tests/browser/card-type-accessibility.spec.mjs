import {
  expect,
  test
} from '@playwright/test';


test(
  'card-type-control-has-select-like-keyboard-and-aria-contract',
  async ({ page }) => {

    await page.setViewportSize({
      width: 760,
      height: 520
    });

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          setStorageAdapter
        } = await import('/js/storage/storageAdapter.js');

        const {
          setCurrentPage,
          setPages
        } = await import('/js/stateActions.js');

        const {
          createCardShellTemplate
        } = await import('/js/templates/cardShell.js');

        const {
          renderCardType
        } = await import('/js/ui/cardType.js');

        const files =
          new Map();

        window.__cardTypeAccessibilityFiles =
          files;

        setStorageAdapter({
          kind:
            'memory',
          getWorkspaceHandle() {
            return {
              name:
                'Card type accessibility workspace'
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

        const cardShell =
          createCardShellTemplate().content;

        const pageRecord = {
          id:
            'card-type-accessibility-page',
          name:
            'card-type-accessibility-page.md',
          path:
            '/pages/card-type-accessibility-page.md',
          parent:
            null,
          order:
            1,
          title:
            'Карточка выбора типа',
          template:
            'card',
          type:
            'location',
          tags:
            [
              'card',
              'location'
            ],
          aliases:
            [],
          relationships:
            [],
          content:
            `---
id: card-type-accessibility-page
parent: null
order: 1
tags:
  - card
  - location
template: card
type: location
aliases: []
relationships: []
---

${cardShell}`
        };

        setPages([
          pageRecord
        ]);

        setCurrentPage(
          pageRecord
        );

        const editor =
          document.querySelector(
            '#editorArea'
          );

        editor.innerHTML =
          cardShell;

        editor.querySelector('h1').textContent =
          pageRecord.title;

        renderCardType();
      }
    );

    const combobox =
      page.getByRole(
        'combobox',
        {
          name:
            /Тип/
        }
      );

    const listbox =
      page.getByRole(
        'listbox',
        {
          name:
            /Тип/
        }
      );

    await expect(
      combobox
    ).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    await expect(
      combobox
    ).toContainText(
      'Локация'
    );

    await combobox.focus();

    await page.keyboard.press(
      'ArrowDown'
    );

    await expect(
      combobox
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await expect(
      listbox
    ).toBeVisible();

    await page.evaluate(
      () => new Promise(resolve =>
        requestAnimationFrame(
          () => requestAnimationFrame(resolve)
        )
      )
    );

    const openState =
      await page.evaluate(
        () => {

          const trigger =
            document.querySelector(
              '.card-type-trigger'
            );

          const list =
            document.getElementById(
              trigger.getAttribute('aria-controls')
            );

          const active =
            document.getElementById(
              trigger.getAttribute('aria-activedescendant')
            );

          const rect =
            list.getBoundingClientRect();

          return {
            activeValue:
              active?.dataset.value || '',
            activeSelected:
              active?.getAttribute('aria-selected') || '',
            focusIsTrigger:
              document.activeElement === trigger,
            overlayKind:
              list.dataset.overlayKind || '',
            overlayLifecycle:
              list.dataset.overlayLifecycle || '',
            overlayState:
              list.dataset.overlayState || '',
            zIndex:
              Number(list.style.zIndex),
            insideViewport:
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= window.innerWidth &&
              rect.bottom <= window.innerHeight
          };
        }
      );

    expect(
      openState
    ).toEqual({
      activeValue:
        'location',
      activeSelected:
        'true',
      focusIsTrigger:
        true,
      overlayKind:
        'popover',
      overlayLifecycle:
        'popup-manager',
      overlayState:
        'open',
      zIndex:
        expect.any(Number),
      insideViewport:
        true
    });

    expect(
      openState.zIndex
    ).toBeGreaterThan(
      10_000
    );

    await page.keyboard.press(
      'ArrowDown'
    );

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      combobox
    ).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    await expect(
      combobox
    ).toContainText(
      'Локация'
    );

    await expect(
      page.locator('.card-type-trigger')
    ).toBeFocused();

    await page.keyboard.press(
      'ArrowDown'
    );

    await page.keyboard.press(
      'ArrowDown'
    );

    await page.keyboard.press(
      'Enter'
    );

    await expect(
      combobox
    ).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    await expect(
      combobox
    ).toContainText(
      'Регион'
    );

    await expect(
      page.locator('.card-type-trigger')
    ).toBeFocused();

    await page.keyboard.press(
      ' '
    );

    await expect(
      combobox
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await page.keyboard.press(
      'ArrowDown'
    );

    await page.keyboard.press(
      ' '
    );

    await expect(
      combobox
    ).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    await expect(
      combobox
    ).toContainText(
      'Папка'
    );

    await expect(
      page.locator('.card-type-trigger')
    ).toBeFocused();

    await expect
      .poll(
        async () =>
          page.evaluate(
            async () => {

              const {
                state
              } = await import('/js/state.js');

              return state.currentPage?.type ||
                document.querySelector('.card-type-select')?.value ||
                '';
            }
          )
      )
      .toBe(
        'folder'
      );

    const finalState =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const trigger =
            document.querySelector(
              '.card-type-trigger'
            );

          const list =
            document.getElementById(
              trigger.getAttribute('aria-controls')
            );

          return {
            selectValue:
              document.querySelector('.card-type-select')?.value || '',
            pageType:
              state.currentPage?.type ||
              '',
            pageTags:
              state.currentPage?.tags || [],
            overlayState:
              list.dataset.overlayState || '',
            ariaActiveDescendant:
              trigger.getAttribute('aria-activedescendant') || ''
          };
        }
      );

    expect(
      finalState.selectValue
    ).toBe(
      'folder'
    );

    expect(
      finalState.pageType
    ).toBe(
      'folder'
    );

    expect(
      finalState.pageTags
    ).toEqual([
      'card',
      'folder'
    ]);

    expect(
      finalState.overlayState
    ).toBe(
      'closed'
    );

    expect(
      finalState.ariaActiveDescendant
    ).toBe(
      ''
    );
  }
);
