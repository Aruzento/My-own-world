import {
  expect,
  test
} from '@playwright/test';


// P0 smoke: приложение должно открываться без workspace и без ошибок модулей.

async function getCreateButtonLayout(
  locator
) {

  return locator.evaluateAll(
    buttons => {

      const boxes =
        buttons.map((button, index) => {

          const rect =
            button.getBoundingClientRect();

          return {
            index,
            left:
              rect.left,
            top:
              rect.top,
            right:
              rect.right,
            bottom:
              rect.bottom,
            width:
              rect.width,
            hasHorizontalOverflow:
              button.scrollWidth > button.clientWidth + 1
          };
        });

      const overlaps =
        [];

      for (let i = 0; i < boxes.length; i++) {

        for (let j = i + 1; j < boxes.length; j++) {

          const a =
            boxes[i];

          const b =
            boxes[j];

          if (
            a.left < b.right &&
            a.right > b.left &&
            a.top < b.bottom &&
            a.bottom > b.top
          ) {

            overlaps.push(
              [
                a.index,
                b.index
              ]
            );
          }
        }
      }

      return {
        minWidth:
          Math.min(
            ...boxes.map(box => box.width)
          ),
        overlaps,
        hasHorizontalOverflow:
          boxes.some(box => box.hasHorizontalOverflow)
      };
    }
  );
}


test(
  'app-shell-empty-state',
  async ({ page }) => {

    const consoleErrors =
      [];

    page.on(
      'console',
      message => {

        if (message.type() === 'error') {

          consoleErrors.push(
            message.text()
          );
        }
      }
    );

    const pageErrors =
      [];

    page.on(
      'pageerror',
      error => {

        pageErrors.push(
          error.message
        );
      }
    );

    await page.goto(
      '/'
    );

    await expect(
      page.locator('.sidebar-header')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.sidebar-title')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-app-shell-poc',
      '0.0.1.8.5'
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-ui-foundation',
      '0.0.1.8.7'
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-app-shell-migration',
      '0.0.1.8.10'
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-core-content-migration',
      '0.0.1.8.11.3'
    );

    await expect(
      page.locator('.app-topbar[data-app-shell-zone="title-context-bar"]')
    ).toContainText(
      'MyOwnWorld'
    );

    await expect(
      page.locator('.app-nav-rail[data-app-shell-zone="nav-rail"]')
    ).toBeVisible();

    await expect(
      page.locator('.app-nav-rail[data-app-shell-zone="nav-rail"]')
    ).toHaveAttribute(
      'aria-label',
      'Навигация workspace'
    );

    await expect(
      page.locator('.app-nav-rail #profileButton')
    ).toBeVisible();

    await expect(
      page.locator('.sidebar #profileButton')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('#appSidebarToggleBtn')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-app-shell-mode',
      'tree'
    );

    await expect(
      page.locator('.app-nav-item[data-shell-tab]')
    ).toHaveCount(
      1
    );

    await expect(
      page.locator('.app-nav-item[data-shell-tab="tree"]')
    ).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await expect(
      page.locator('#appTreeRailBtn')
    ).toHaveAttribute(
      'aria-controls',
      'primarySidebar'
    );

    await expect(
      page.locator('#appTreeRailBtn')
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await expect(
      page.locator('#appTreeRailBtn')
    ).toHaveAttribute(
      'aria-label',
      'Скрыть дерево'
    );

    await expect(
      page.locator('.app-nav-item[data-shell-tab="cards"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.app-nav-item[data-shell-tab="maps"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.app-nav-item[data-shell-tab="tasks"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.app-nav-item[data-shell-tab="rules"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.app-nav-item[data-shell-tab="graph"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('#sidebarFilterLabel')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.sidebar[data-app-shell-zone="primary-sidebar"]')
    ).toBeVisible();

    await expect(
      page.locator('.search-wrapper[data-core-content-zone="tree-search"]')
    ).toBeVisible();

    await expect(
      page.locator('.search-wrapper-icon use')
    ).toHaveAttribute(
      'href',
      './assets/icons/rpg-ui.svg#icon-search'
    );

    await expect(
      page.locator('#tree[data-core-content-zone="world-tree"]')
    ).toBeVisible();

    await expect(
      page.locator('.editor[data-app-shell-zone="workspace"]')
    ).toBeVisible();

    await expect(
      page.locator('#statusbar[data-app-shell-zone="status-bar"]')
    ).toBeVisible();

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-right-panel-state',
      'hidden'
    );

    await expect(
      page.locator('#appRightPanel[data-app-shell-zone="right-panel"]')
    ).toBeHidden();

    await expect(
      page.locator('#appInspectorPanel')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.empty-editor-kicker')
    ).toHaveText(
      'Добро пожаловать'
    );

    await expect(
      page.getByRole(
        'heading',
        {
          name: 'Создайте свой мир'
        }
      )
    ).toBeVisible();

    await expect(
      page.locator('.empty-create-option')
    ).toHaveCount(
      5
    );

    const appShellSurface =
      page.locator('[data-app-shell-surface="empty-workspace"]');

    await expect(
      appShellSurface.locator('[data-app-shell-zone="title-context-bar"]')
    ).toHaveCount(
      0
    );

    await expect(
      appShellSurface.locator('.empty-workbench-card')
    ).toBeVisible();

    await expect(
      appShellSurface.locator('.empty-editor-note')
    ).toContainText(
      'Выберите'
    );

    await expect(
      appShellSurface.locator('.empty-create-option')
    ).toHaveCount(
      5
    );

    await expect(
      appShellSurface.locator('.empty-create-icon svg')
    ).toHaveCount(
      5
    );

    const createButtonLayout =
      await getCreateButtonLayout(
        appShellSurface.locator('.empty-create-option')
      );

    expect(
      createButtonLayout.minWidth
    ).toBeGreaterThanOrEqual(
      140
    );

    expect(
      createButtonLayout.overlaps
    ).toEqual(
      []
    );

    expect(
      createButtonLayout.hasHorizontalOverflow
    ).toBe(
      false
    );

    await expect(
      appShellSurface.locator('[data-app-shell-zone="workspace"]')
    ).toHaveCount(
      0
    );

    await expect(
      appShellSurface.locator('[data-app-shell-zone="right-panel"]')
    ).toHaveCount(
      0
    );

    await expect(
      appShellSurface.locator('[data-app-shell-zone="bottom-panel"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('#appSettingsBtn')
    ).toHaveAttribute(
      'data-tooltip',
      'Настройки'
    );

    await expect(
      page.locator('#appToolsBtn')
    ).toHaveAttribute(
      'data-tooltip',
      'Инструменты'
    );

    await expect(
      page.locator('.sidebar-header [data-open-workspace]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.sidebar-header [data-create-page]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('#newPageBtn')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('[data-tree-empty-workspace="true"]')
    ).toBeVisible();

    await expect(
      page.getByRole(
        'button',
        {
          name: 'Открыть папку'
        }
      )
    ).toBeVisible();

    await expect(
      page.getByRole(
        'button',
        {
          name: 'Открыть папку'
        }
      )
    ).toHaveAttribute(
      'data-open-workspace',
      'true'
    );

    await page.locator('#appSettingsBtn').click();

    await expect(
      page.locator('.app-backup-retention input')
    ).toHaveValue(
      '20'
    );

    await expect(
      page.locator('.app-appearance-panel')
    ).toBeVisible();

    await page
      .locator('.app-appearance-swatch[data-accent="blue"]')
      .click();

    await expect(
      page.locator('body')
    ).toHaveAttribute(
      'data-accent',
      'blue'
    );

    const appearanceTokens =
      await page.evaluate(
        () => {

          const style =
            getComputedStyle(
              document.body
            );

          return {
            focus:
              style.getPropertyValue('--mow-focus-ring').trim(),
            surface:
              style.getPropertyValue('--mow-surface-raised').trim(),
            iconSize:
              style.getPropertyValue('--mow-icon-size-md').trim()
          };
        }
      );

    expect(
      appearanceTokens.focus
    ).toContain(
      '125, 183, 255'
    );

    expect(
      appearanceTokens.surface
    ).not.toBe(
      ''
    );

    expect(
      appearanceTokens.iconSize
    ).not.toBe(
      ''
    );

    await page.locator('#appSettingsCloseBtn').click();

    await page.locator('#appToolsBtn').click();

    await page
      .getByRole(
        'button',
        {
          name: 'Быстрый старт'
        }
      )
      .click();

    await expect(
      page.locator('#onboardingTitle')
    ).toHaveText(
      'Быстрый старт'
    );

    await expect(
      page.locator('.onboarding-card')
    ).toHaveCount(
      4
    );

    await page.evaluate(
      async () => {

        const {
          finishProgressStatus,
          setProgressStatus
        } = await import('/js/ui/ui.js');

        setProgressStatus({
          label:
            'Backup',
          stage:
            'pages',
          current:
            2,
          total:
            4,
          elapsedMs:
            1200
        });

        window.__finishProgressStatus =
          finishProgressStatus;
      }
    );

    await expect(
      page.locator('.operation-progress')
    ).toBeVisible();

    await expect(
      page.locator('.operation-progress')
    ).toHaveAttribute(
      'data-overlay-kind',
      'toast'
    );

    await expect(
      page.locator('.operation-progress')
    ).toHaveAttribute(
      'data-overlay-state',
      'open'
    );

    await expect(
      page.locator('.operation-progress-percent')
    ).toHaveText(
      '50%'
    );

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      '50%'
    );

    await page.evaluate(
      () => window.__finishProgressStatus(
        'Backup done',
        {
          delayMs:
            20
        }
      )
    );

    await expect(
      page.locator('.operation-progress')
    ).toHaveClass(
      /is-hidden/
    );

    await expect(
      page.locator('.operation-progress')
    ).toHaveAttribute(
      'data-overlay-state',
      'closed'
    );

    expect(
      pageErrors
    ).toEqual(
      []
    );

    expect(
      consoleErrors
    ).toEqual(
      []
    );
  }
);


test(
  'app-shell-nav-rail-keeps-tree-primary-and-toggles-sidebar',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await expect(
      page.locator('.app-nav-item[data-shell-tab]')
    ).toHaveCount(
      1
    );

    for (const removedTab of [
      'cards',
      'maps',
      'tasks',
      'rules',
      'graph'
    ]) {

      await expect(
        page.locator(`.app-nav-item[data-shell-tab="${removedTab}"]`)
      ).toHaveCount(
        0
      );
    }

    await expect(
      page.locator('.app-shell-system-panel')
    ).toHaveCount(
      0
    );

    await page.evaluate(
      async () => {

        const {
          setCurrentPage,
          setPages,
          setWorkspaceHandle
        } = await import('/js/stateActions.js');

        setWorkspaceHandle({
          name:
            'Test workspace'
        });

        const page = {
          id:
            'map-context',
          title:
            'Тихая переправа',
          order:
            '0001',
          template:
            'campaignMap',
          type:
            'campaignMap',
          tags:
            [
              'campaign-map',
              'session'
            ],
          content:
            'Связано с [[Старый мост]]'
        };

        const child = {
          id:
            'map-child',
          title:
            'Старый мост',
          order:
            '0001',
          template:
            'card',
          type:
            'note',
          parent:
            'map-context',
          tags:
            [
              'place'
            ],
          content:
            ''
        };

        setPages(
          [
            page,
            child
          ]
        );

        setCurrentPage(
          page
        );
      }
    );

    await page
      .locator('#searchInput')
      .fill(
        ' '
      );

    await page
      .locator('#searchInput')
      .fill(
        ''
      );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-app-shell-mode',
      'tree'
    );

    await expect(
      page.locator('#appTopbarModeLabel')
    ).toHaveText(
      'Дерево'
    );

    await expect(
      page.locator('#sidebarFilterLabel')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.tree-item[data-page-id="map-context"]')
    ).toBeVisible();

    await expect(
      page.locator('.tree-root-drop-zone')
    ).toContainText(
      'Корень'
    );

    await expect(
      page.locator('.tree-root-drop-zone [data-create-page]')
    ).toHaveAttribute(
      'aria-label',
      'Новая страница'
    );

    await expect(
      page.locator('.tree-root-drop-zone [data-create-folder]')
    ).toHaveAttribute(
      'aria-label',
      'Новая папка'
    );

    await expect(
      page.locator('.sidebar-header')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-right-panel-state',
      'hidden'
    );

    await expect(
      page.locator('#appRightPanel')
    ).toBeHidden();

    await expect(
      page.locator('#appInspectorPanel')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('[data-app-shell-zone="inspector"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.app-shell-system-panel')
    ).toHaveCount(
      0
    );

    await page
      .locator('#searchInput')
      .fill(
        'переправа'
      );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-app-shell-mode',
      'tree'
    );

    await expect(
      page.locator('#appTopbarModeLabel')
    ).toHaveText(
      'Поиск'
    );

    await expect(
      page.locator('#sidebarFilterLabel')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.tree-item[data-page-id="map-context"]')
    ).toBeVisible();

    await expect(
      page.locator('.app-shell-system-panel')
    ).toHaveCount(
      0
    );

    await page
      .locator('#searchInput')
      .fill(
        ''
      );

    await expect(
      page.locator('#appTopbarModeLabel')
    ).toHaveText(
      'Дерево'
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-app-shell-mode',
      'tree'
    );

    await expect(
      page.locator('.tree-item[data-page-id="map-context"]')
    ).toBeVisible();

    await expect(
      page.locator('#appSidebarResizeHandle')
    ).toBeVisible();

    await page.locator('#appSidebarResizeHandle').focus();

    await page.keyboard.press(
      'ArrowRight'
    );

    await expect(
      page.locator('#appSidebarResizeHandle')
    ).toHaveAttribute(
      'aria-valuenow',
      '286'
    );

    const resizedSidebarWidth =
      await page.evaluate(
        () => getComputedStyle(
          document.querySelector('.app')
        )
          .getPropertyValue('--mow-shell-sidebar-width')
          .trim()
      );

    expect(
      resizedSidebarWidth
    ).toBe(
      '286px'
    );

    const editorWidthBeforeCollapse =
      await page
        .locator('.editor')
        .evaluate(
          element => element.getBoundingClientRect().width
        );

    await page.locator('#appTreeRailBtn').click();

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-sidebar-state',
      'collapsed'
    );

    await expect(
      page.locator('.sidebar')
    ).toBeHidden();

    await expect(
      page.locator('#appSidebarResizeHandle')
    ).toBeHidden();

    await expect(
      page.locator('#appTreeRailBtn')
    ).toHaveAttribute(
      'aria-label',
      'Показать дерево'
    );

    await expect(
      page.locator('#appTreeRailBtn')
    ).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    await expect(
      page.locator('#appTreeRailBtn')
    ).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    const editorWidthAfterCollapse =
      await page
        .locator('.editor')
        .evaluate(
          element => element.getBoundingClientRect().width
        );

    expect(
      editorWidthAfterCollapse
    ).toBeGreaterThan(
      editorWidthBeforeCollapse + 100
    );

    await page.locator('#appTreeRailBtn').click();

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-sidebar-state',
      'expanded'
    );

    await expect(
      page.locator('.sidebar')
    ).toBeVisible();

    await expect(
      page.locator('#appSidebarResizeHandle')
    ).toBeVisible();

    await expect(
      page.locator('#appTreeRailBtn')
    ).toHaveAttribute(
      'aria-label',
      'Скрыть дерево'
    );

    await expect(
      page.locator('#appTreeRailBtn')
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  }
);


test(
  'app-shell-foundation-uses-semantic-shell-tokens',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const foundation =
      await page.evaluate(
        () => {

          const app =
            document.querySelector(
              '.app'
            );

          const topbar =
            document.querySelector(
              '.app-topbar'
            );

          const sidebar =
            document.querySelector(
              '.sidebar'
            );

          const editor =
            document.querySelector(
              '.editor'
            );

          const statusbar =
            document.querySelector(
              '#statusbar'
            );

          const appStyle =
            getComputedStyle(
              app
            );

          return {
            shellGutter:
              appStyle.getPropertyValue('--mow-shell-gutter').trim(),
            shellPanelBg:
              appStyle.getPropertyValue('--mow-shell-panel-bg').trim(),
            shellPanelShadow:
              appStyle.getPropertyValue('--mow-shell-panel-shadow').trim(),
            appGap:
              appStyle.columnGap,
            topbarHeight:
              getComputedStyle(
                topbar
              ).height,
            sidebarBackground:
              getComputedStyle(
                sidebar
              ).backgroundImage,
            editorBackground:
              getComputedStyle(
                editor
              ).backgroundImage,
            statusbarHeight:
              getComputedStyle(
                statusbar
              ).height,
            statusbarBackground:
              getComputedStyle(
                statusbar
              ).backgroundColor
          };
        }
      );

    expect(
      foundation.shellGutter
    ).not.toBe(
      ''
    );

    expect(
      foundation.shellPanelBg
    ).not.toBe(
      ''
    );

    expect(
      foundation.shellPanelShadow
    ).not.toBe(
      ''
    );

    expect(
      foundation.appGap
    ).toBe(
      '10px'
    );

    expect(
      foundation.topbarHeight
    ).toBe(
      '26px'
    );

    expect(
      foundation.statusbarHeight
    ).toBe(
      '24px'
    );

    expect(
      foundation.sidebarBackground
    ).toContain(
      'linear-gradient'
    );

    expect(
      foundation.editorBackground
    ).toContain(
      'linear-gradient'
    );

    expect(
      foundation.statusbarBackground
    ).not.toBe(
      'rgba(0, 0, 0, 0)'
    );

    await expect(
      page.locator('#appRightPanel[data-app-shell-zone="right-panel"]')
    ).toBeHidden();

    await page.evaluate(
      async () => {

        const {
          showAppRightPanel
        } = await import('/js/ui/appShell.js');

        const content =
          document.createElement('section');

        content.dataset.rightPanelTest =
          'content';

        content.textContent =
          'Right panel foundation';

        showAppRightPanel({
          content,
          label:
            'Test right panel'
        });
      }
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-right-panel-state',
      'visible'
    );

    await expect(
      page.locator('#appRightPanel[data-app-shell-zone="right-panel"]')
    ).toBeVisible();

    await expect(
      page.locator('#appRightPanel')
    ).toHaveAttribute(
      'aria-label',
      'Test right panel'
    );

    await expect(
      page.locator('[data-right-panel-test="content"]')
    ).toHaveText(
      'Right panel foundation'
    );

    await page.evaluate(
      async () => {

        const {
          hideAppRightPanel
        } = await import('/js/ui/appShell.js');

        hideAppRightPanel();
      }
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-right-panel-state',
      'hidden'
    );

    await expect(
      page.locator('#appRightPanel')
    ).toBeHidden();

    await expect(
      page.locator('[data-right-panel-test="content"]')
    ).toHaveCount(
      0
    );

    await page.evaluate(
      () => {
        document.body.dataset.uiScale =
          'compact';
      }
    );

    const compactFoundation =
      await page.evaluate(
        () => {

          return {
            appGap:
              getComputedStyle(
                document.querySelector('.app')
              ).columnGap,
            topbarHeight:
              getComputedStyle(
                document.querySelector('.app-topbar')
              ).height,
            statusbarHeight:
              getComputedStyle(
                document.querySelector('#statusbar')
              ).height
          };
        }
      );

    expect(
      parseFloat(
        compactFoundation.appGap
      )
    ).toBeLessThan(
      parseFloat(
        foundation.appGap
      )
    );

    expect(
      parseFloat(
        compactFoundation.topbarHeight
      )
    ).toBeLessThan(
      parseFloat(
        foundation.topbarHeight
      )
    );

    expect(
      parseFloat(
        compactFoundation.statusbarHeight
      )
    ).toBeLessThan(
      parseFloat(
        foundation.statusbarHeight
      )
    );
  }
);


test(
  'app-shell-root-folder-action-creates-folder-page',
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
          kind:
            'memory',
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

    await expect(
      page.locator('.tree-root-drop-zone [data-create-folder]')
    ).toHaveAttribute(
      'aria-label',
      'Новая папка'
    );

    await page
      .locator('.tree-root-drop-zone [data-create-folder]')
      .click();

    const folderPage =
      await page.waitForFunction(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          return state.pages.find(candidate =>
            candidate.type === 'folder'
          ) || null;
        }
      );

    const createdFolder =
      await folderPage.jsonValue();

    expect(
      createdFolder.title
    ).toBe(
      'Новая папка'
    );

    expect(
      createdFolder.template
    ).toBe(
      'card'
    );

    expect(
      createdFolder.tags
    ).toEqual(
      expect.arrayContaining([
        'card',
        'folder'
      ])
    );

    await expect(
      page.locator('.tree-item[data-page-id]')
    ).toHaveCount(
      1
    );

    await expect(
      page.locator('.tree-item[data-page-id]').first()
    ).toContainText(
      'Новая папка'
    );
  }
);


test(
  'app-shell-empty-start-stays-readable-on-mobile',
  async ({ page }) => {

    await page.setViewportSize({
      width:
        390,
      height:
        820
    });

    await page.goto(
      '/'
    );

    const appShellSurface =
      page.locator('[data-app-shell-surface="empty-workspace"]');

    await expect(
      appShellSurface
    ).toBeVisible();

    await expect(
      appShellSurface.locator('.empty-create-option')
    ).toHaveCount(
      5
    );

    await expect(
      appShellSurface.locator('[data-app-shell-zone="right-panel"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('#appSidebarResizeHandle')
    ).toBeHidden();

    const createButtonLayout =
      await getCreateButtonLayout(
        appShellSurface.locator('.empty-create-option')
      );

    expect(
      createButtonLayout.minWidth
    ).toBeGreaterThanOrEqual(
      112
    );

    expect(
      createButtonLayout.overlaps
    ).toEqual(
      []
    );

    const shellBox =
      await appShellSurface.locator('.empty-workbench-card').boundingBox();

    expect(
      shellBox.width
    ).toBeLessThanOrEqual(
      390
    );
  }
);
