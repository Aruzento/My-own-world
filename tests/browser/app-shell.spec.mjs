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


async function openSettingsSection(
  page,
  sectionId
) {

  await page.locator('#appSettingsBtn').click();

  await expect(
    page.locator('#appSettingsPopup')
  ).toHaveAttribute(
    'data-settings-ui-migration',
    'settings-center'
  );

  await page
    .locator(
      `[data-settings-category="${sectionId}"]`
    )
    .click();

  await expect(
    page.locator(
      `[data-settings-page="${sectionId}"]`
    )
  ).toBeVisible();
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
      '0.0.1.8.11.7'
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
      page.locator('#appCommandRailBtn')
    ).toHaveAttribute(
      'aria-controls',
      'commandPalette'
    );

    await expect(
      page.locator('#appCommandRailBtn')
    ).toHaveAttribute(
      'data-tooltip',
      'Поиск и команды'
    );

    await expect(
      page.locator('#appCommandRailBtn')
    ).toHaveAttribute(
      'aria-expanded',
      'false'
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
      page.locator('#appWorkspaceSwitchBtn')
    ).toHaveAttribute(
      'data-tooltip',
      'Открыть папку'
    );

    await expect(
      page.locator('#appWorkspaceSwitchBtn')
    ).toHaveAttribute(
      'data-open-workspace',
      'true'
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

    const emptyTreeOpenWorkspaceButton =
      page.locator(
        '[data-tree-empty-workspace="true"] [data-open-workspace]'
      );

    await expect(
      emptyTreeOpenWorkspaceButton
    ).toBeVisible();

    await expect(
      emptyTreeOpenWorkspaceButton
    ).toHaveAttribute(
      'data-open-workspace',
      'true'
    );

    await page.locator('#appSettingsBtn').click();

    await expect(
      page.locator('#appSettingsPopup')
    ).toHaveAttribute(
      'data-settings-ui-migration',
      'settings-center'
    );

    await expect(
      page.locator('.app-settings-shell')
    ).toBeVisible();

    await expect(
      page.locator('[data-settings-category]')
    ).toHaveCount(
      13
    );

    await expect(
      page.locator('[data-settings-category="appearance"]')
    ).toHaveAttribute(
      'aria-current',
      'page'
    );

    const settingsSurface =
      await page.locator('#appSettingsPopup').evaluate(
        popup => {

          const content =
            popup.querySelector('.app-settings-content');

          const firstSection =
            popup.querySelector('[data-settings-page]');

          return {
            hasHorizontalOverflow:
              content.scrollWidth > content.clientWidth + 1,
            sectionRadius:
              Number.parseFloat(
                getComputedStyle(firstSection).borderRadius
              ),
            sidebarCount:
              popup.querySelectorAll('[data-settings-category]').length
          };
        }
      );

    expect(
      settingsSurface.hasHorizontalOverflow
    ).toBe(
      false
    );

    expect(
      settingsSurface.sectionRadius
    ).toBeGreaterThanOrEqual(
      0
    );

    expect(
      settingsSurface.sidebarCount
    ).toBe(
      13
    );

    await page
      .locator('[data-settings-category="backup"]')
      .click();

    await expect(
      page.locator('.app-backup-retention input')
    ).toHaveValue(
      '20'
    );

    await page
      .locator('[data-settings-category="appearance"]')
      .click();

    await expect(
      page.locator('.app-appearance-panel')
    ).toBeVisible();

    await expect(
      page.locator('.app-appearance-segmented button[data-theme="dark"]')
    ).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page
      .locator('.app-appearance-segmented button[data-theme="contrast"]')
      .click();

    await expect(
      page.locator('body')
    ).toHaveAttribute(
      'data-theme',
      'contrast'
    );

    await expect(
      page.locator('.app-appearance-segmented button[data-theme="contrast"]')
    ).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const contrastTokens =
      await page.evaluate(
        () => {

          const style =
            getComputedStyle(
              document.body
            );

          return {
            text:
              style.getPropertyValue('--mow-text-main').trim(),
            border:
              style.getPropertyValue('--mow-border-medium').trim()
          };
        }
      );

    expect(
      contrastTokens.text
    ).toBe(
      '#fff8e8'
    );

    expect(
      contrastTokens.border
    ).toContain(
      '255, 232, 183'
    );

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

    await expect(
      page.locator('#appToolsPopup')
    ).toHaveAttribute(
      'data-tools-ui-migration',
      '0.0.1.8.14.3'
    );

    await expect(
      page.locator('#appToolsPopup [data-help-tool-action]')
    ).toHaveCount(
      5
    );

    await expect(
      page.locator('#appToolsPopup [data-world-package-tool-action]')
    ).toHaveCount(
      1
    );

    await expect(
      page.locator('#appToolsPopup [data-component-catalogue-open="true"]')
    ).toHaveCount(
      0
    );

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

    const quickstartHelpSurface =
      await page.evaluate(
        () => {

          const popup =
            document.querySelector('#onboardingPopup');

          const body =
            document.querySelector('#onboardingBody');

          const firstCard =
            document.querySelector('.onboarding-card');

          return {
            migration:
              popup?.dataset.helpUiMigration || '',
            section:
              popup?.dataset.helpSection || '',
            routes:
              popup?.querySelectorAll('[data-help-route]').length || 0,
            statuses:
              popup?.querySelectorAll('[data-help-status]').length || 0,
            plannedCards:
              popup?.querySelectorAll('[data-help-card-state="planned"]').length || 0,
            noHorizontalOverflow:
              body
                ? body.scrollWidth <= body.clientWidth + 1
                : false,
            cardRadius:
              firstCard
                ? Number.parseFloat(
                  getComputedStyle(firstCard).borderRadius
                )
                : 0
          };
        }
      );

    expect(
      quickstartHelpSurface
    ).toMatchObject({
      migration:
        '0.0.1.8.14.3',
      section:
        'quickstart',
      routes:
        5,
      statuses:
        3,
      plannedCards:
        0,
      noHorizontalOverflow:
        true
    });

    expect(
      quickstartHelpSurface.cardRadius
    ).toBeLessThanOrEqual(
      8
    );

    await page
      .locator('[data-help-route="support"]')
      .click();

    await expect(
      page.locator('#onboardingPopup')
    ).toHaveAttribute(
      'data-help-section',
      'support'
    );

    await expect(
      page.locator('[data-help-card-state="warning"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('[data-help-card-state="planned"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('#onboardingPopup')
    ).toContainText(
      'asset preflight'
    );

    await expect(
      page.locator('#onboardingPopup')
    ).toContainText(
      'non-overwrite asset copy'
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
  'app-shell-global-workspace-switch-keeps-cancel-and-loads-next-workspace',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          buildPageRecordContent
        } = await import('/js/core/pageRecord.js');

        const {
          setAssetAdapter
        } = await import('/js/storage/assetAdapter.js');

        const {
          setStorageAdapter
        } = await import('/js/storage/storageAdapter.js');

        const normalize =
          path => String(path || '')
            .replace(/\\/g, '/')
            .replace(/^\/+/, '')
            .replace(/\/+/g, '/');

        const getParentPath =
          path => {

            const parts =
              normalize(path)
                .split('/');

            parts.pop();

            return parts.join('/');
          };

        const ensureDirectoryPath =
          (
            directories,
            path
          ) => {

            const parts =
              normalize(path)
                .split('/')
                .filter(Boolean);

            let current =
              '';

            for (const part of parts) {

              current =
                current
                  ? `${current}/${part}`
                  : part;

              directories.add(
                current
              );
            }
          };

        const listWorkspaceEntries =
          (
            workspace,
            path = ''
          ) => {

            const normalized =
              normalize(path);

            const prefix =
              normalized
                ? `${normalized}/`
                : '';

            const entries =
              new Map();

            for (const directory of workspace.directories) {

              if (!directory.startsWith(prefix)) continue;

              const rest =
                directory.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'directory'
              );
            }

            for (const filePath of workspace.files.keys()) {

              if (!filePath.startsWith(prefix)) continue;

              const rest =
                filePath.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'file'
              );
            }

            return [...entries].map(([name, kind]) => ({
              name,
              kind
            }));
          };

        const createPageContent =
          ({
            id,
            title,
            body
          }) => buildPageRecordContent({
            id,
            parent:
              null,
            order:
              1,
            tags:
              [
                'card'
              ],
            template:
              'card',
            type:
              'note',
            aliases:
              [],
            relationships:
              [],
            body: `
              <div class="entity-layout card-shell" contenteditable="false">
                <h1>${title}</h1>
                <div class="rich-text-field" contenteditable="true" data-persistent-editable="true">${body}</div>
                <img data-asset="portraits/shared-render-cache.png" alt="">
              </div>
            `
          });

        const createWorkspace =
          (
            key,
            page
          ) => {

            const workspace = {
              key,
              directories:
                new Set([
                  '',
                  'pages',
                  'assets',
                  'assets/portraits'
                ]),
              files:
                new Map(),
              writes:
                []
            };

            workspace.files.set(
              `pages/${page.id}.md`,
              createPageContent(
                page
              )
            );

            workspace.files.set(
              'assets/portraits/shared-render-cache.png',
              new Uint8Array([
                137,
                80,
                78,
                71
              ]).buffer
            );

            return workspace;
          };

        const workspaces =
          new Map([
            [
              'workspace-a',
              createWorkspace(
                'workspace-a',
                {
                  id:
                    'workspace-a-page',
                  title:
                    'Workspace A Page',
                  body:
                    'Original A body'
                }
              )
            ],
            [
              'workspace-b',
              createWorkspace(
                'workspace-b',
                {
                  id:
                    'workspace-b-page',
                  title:
                    'Workspace B Page',
                  body:
                    'Original B body'
                }
              )
            ]
          ]);

        const pickQueue =
          [];

        let activeWorkspaceKey =
          null;

        const getActiveWorkspace =
          () => {

            if (!activeWorkspaceKey) {

              throw new Error(
                'No active workspace.'
              );
            }

            return workspaces.get(
              activeWorkspaceKey
            );
          };

        const adapter = {
          kind:
            'desktop',
          getWorkspaceRoot() {
            return activeWorkspaceKey;
          },
          setWorkspaceRoot(root) {
            activeWorkspaceKey =
              String(root || '') ||
              null;
          },
          getWorkspaceHandle() {
            return activeWorkspaceKey;
          },
          setWorkspaceHandle(handle) {
            activeWorkspaceKey =
              String(handle || '') ||
              null;
          },
          async pickWorkspace() {

            const next =
              pickQueue.shift();

            if (next === 'cancel') {

              throw new DOMException(
                'Dialog canceled',
                'AbortError'
              );
            }

            if (!workspaces.has(next)) {

              throw new Error(
                `Unknown test workspace: ${next}`
              );
            }

            activeWorkspaceKey =
              next;

            return next;
          },
          async restoreWorkspace() {
            return null;
          },
          async ensureDirectory(path) {
            ensureDirectoryPath(
              getActiveWorkspace().directories,
              path
            );
          },
          async getDirectoryHandle(path) {
            return {
              kind:
                'directory',
              path:
                normalize(path)
            };
          },
          async readText(path) {

            const normalized =
              normalize(path);

            const value =
              getActiveWorkspace().files.get(
                normalized
              );

            if (value === undefined) {

              throw new Error(
                `File not found: ${normalized}`
              );
            }

            return typeof value === 'string'
              ? value
              : new TextDecoder().decode(
                value
              );
          },
          async writeText(path, content) {

            const workspace =
              getActiveWorkspace();

            const normalized =
              normalize(path);

            ensureDirectoryPath(
              workspace.directories,
              getParentPath(
                normalized
              )
            );

            workspace.files.set(
              normalized,
              String(content)
            );

            workspace.writes.push({
              path:
                normalized,
              content:
                String(content)
            });
          },
          async readBinary(path) {

            const value =
              getActiveWorkspace().files.get(
                normalize(path)
              );

            if (value === undefined) {

              throw new Error(
                `File not found: ${path}`
              );
            }

            return typeof value === 'string'
              ? new TextEncoder().encode(
                value
              ).buffer
              : value;
          },
          async writeBinary(path, content) {

            const workspace =
              getActiveWorkspace();

            const normalized =
              normalize(path);

            ensureDirectoryPath(
              workspace.directories,
              getParentPath(
                normalized
              )
            );

            workspace.files.set(
              normalized,
              content
            );
          },
          async listFiles(path = '') {
            return listWorkspaceEntries(
              getActiveWorkspace(),
              path
            );
          },
          async removeFile(path) {
            getActiveWorkspace().files.delete(
              normalize(path)
            );
          },
          async removeDirectory(path) {

            const workspace =
              getActiveWorkspace();

            const normalized =
              normalize(path);

            for (const filePath of [...workspace.files.keys()]) {

              if (
                filePath === normalized ||
                filePath.startsWith(`${normalized}/`)
              ) {

                workspace.files.delete(
                  filePath
                );
              }
            }

            for (const directory of [...workspace.directories]) {

              if (
                directory === normalized ||
                directory.startsWith(`${normalized}/`)
              ) {

                workspace.directories.delete(
                  directory
                );
              }
            }
          }
        };

        setStorageAdapter(
          adapter
        );

        setAssetAdapter({
          kind:
            'workspace-switch-assets',
          async importFile() {},
          async resolveUrl(path) {
            return `asset://${adapter.getWorkspaceRoot()}/${normalize(path)}`;
          },
          async exists() {
            return true;
          },
          async remove() {},
          async findOrphans() {
            return [];
          }
        });

        window.Image =
          class RenderableImage {

            set src(value) {
              this.currentSrc =
                value;

              queueMicrotask(
                () => this.onload?.()
              );
            }
          };

        window.__workspaceSwitchAccessTest = {
          pickQueue,
          snapshot() {
            return {
              activeWorkspaceKey,
              currentPageId:
                window.__mowState?.currentPage?.id || null,
              pages:
                window.__mowState?.pages?.map(candidate => candidate.id) || [],
              aFile:
                workspaces.get('workspace-a')
                  .files.get('pages/workspace-a-page.md'),
              bFile:
                workspaces.get('workspace-b')
                  .files.get('pages/workspace-b-page.md'),
              aWrites:
                workspaces.get('workspace-a').writes,
              bWrites:
                workspaces.get('workspace-b').writes
            };
          }
        };

        const {
          state
        } = await import('/js/state.js');

        window.__mowState =
          state;
      }
    );

    await page.evaluate(
      () => window.__workspaceSwitchAccessTest.pickQueue.push(
        'workspace-a'
      )
    );

    await page
      .locator('[data-tree-empty-workspace="true"] [data-open-workspace]')
      .click();

    await expect(
      page.locator('.tree-item[data-page-id="workspace-a-page"]')
    ).toBeVisible();

    const globalSwitch =
      page.locator('#appWorkspaceSwitchBtn[data-open-workspace]');

    await expect(
      globalSwitch
    ).toBeVisible();

    await expect(
      page.locator('#tree [data-open-workspace]')
    ).toHaveCount(
      0
    );

    await page
      .locator('.tree-item[data-page-id="workspace-a-page"] .tree-title')
      .click();

    await expect(
      page.locator('#editorArea h1')
    ).toHaveText(
      'Workspace A Page'
    );

    await expect(
      page.locator('#editorArea img[data-asset]')
    ).toHaveAttribute(
      'src',
      'asset://workspace-a/portraits/shared-render-cache.png'
    );

    await page
      .locator('#editorArea .rich-text-field')
      .fill(
        'Pending A edit before workspace switch'
      );

    await page.evaluate(
      () => window.__workspaceSwitchAccessTest.pickQueue.push(
        'cancel'
      )
    );

    await globalSwitch.click();

    await expect(
      page.locator('.tree-item[data-page-id="workspace-a-page"]')
    ).toBeVisible();

    await expect(
      page.locator('#editorArea h1')
    ).toHaveText(
      'Workspace A Page'
    );

    await expect(
      page.locator('#editorArea .rich-text-field')
    ).toHaveText(
      'Pending A edit before workspace switch'
    );

    const afterCancel =
      await page.evaluate(
        () => window.__workspaceSwitchAccessTest.snapshot()
      );

    expect(
      afterCancel.activeWorkspaceKey
    ).toBe(
      'workspace-a'
    );

    expect(
      afterCancel.currentPageId
    ).toBe(
      'workspace-a-page'
    );

    await page.evaluate(
      () => window.__workspaceSwitchAccessTest.pickQueue.push(
        'workspace-b'
      )
    );

    await globalSwitch.click();

    await expect(
      page.locator('.tree-item[data-page-id="workspace-b-page"]')
    ).toBeVisible();

    await expect(
      page.locator('.tree-item[data-page-id="workspace-a-page"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('#editorArea')
    ).not.toContainText(
      'Workspace A Page'
    );

    await page
      .locator('.tree-item[data-page-id="workspace-b-page"] .tree-title')
      .click();

    await expect(
      page.locator('#editorArea h1')
    ).toHaveText(
      'Workspace B Page'
    );

    await expect(
      page.locator('#editorArea img[data-asset]')
    ).toHaveAttribute(
      'src',
      'asset://workspace-b/portraits/shared-render-cache.png'
    );

    const afterSwitch =
      await page.evaluate(
        () => window.__workspaceSwitchAccessTest.snapshot()
      );

    expect(
      afterSwitch.activeWorkspaceKey
    ).toBe(
      'workspace-b'
    );

    expect(
      afterSwitch.pages
    ).toEqual([
      'workspace-b-page'
    ]);

    expect(
      afterSwitch.aFile
    ).toContain(
      'Pending A edit before workspace switch'
    );

    expect(
      afterSwitch.bFile
    ).not.toContain(
      'Pending A edit before workspace switch'
    );

    expect(
      afterSwitch.aWrites.some(write =>
        write.path === 'pages/workspace-a-page.md' &&
        write.content.includes(
          'Pending A edit before workspace switch'
        )
      )
    ).toBe(
      true
    );

    expect(
      afterSwitch.bWrites.some(write =>
        write.content.includes(
          'Pending A edit before workspace switch'
        )
      )
    ).toBe(
      false
    );
  }
);


test(
  'backup restore confirmation cancel does not write workspace files',
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
          createWorkspaceBackup
        } = await import('/js/storage/backupService.js');

        const {
          state
        } = await import('/js/state.js');

        const files =
          new Map();

        const directories =
          new Set([
            ''
          ]);

        const normalize =
          path => String(path || '')
            .replace(/\\/g, '/')
            .replace(/^\/+/, '')
            .replace(/\/+/g, '/');

        const ensureDirectoryPath =
          path => {

            const parts =
              normalize(path)
                .split('/')
                .filter(Boolean);

            let current =
              '';

            for (const part of parts) {

              current =
                current
                  ? `${current}/${part}`
                  : part;

              directories.add(
                current
              );
            }
          };

        const getParentPath =
          path => {

            const parts =
              normalize(path).split('/');

            parts.pop();

            return parts.join('/');
          };

        const listFiles =
          path => {

            const normalized =
              normalize(path);

            const prefix =
              normalized
                ? `${normalized}/`
                : '';

            const entries =
              new Map();

            for (const directory of directories) {

              if (!directory.startsWith(prefix)) continue;

              const rest =
                directory.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'directory'
              );
            }

            for (const filePath of files.keys()) {

              if (!filePath.startsWith(prefix)) continue;

              const rest =
                filePath.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'file'
              );
            }

            return [...entries].map(([name, kind]) => ({
              name,
              kind
            }));
          };

        const writesAfterReady =
          {
            ensureDirectory:
              [],
            writeText:
              [],
            writeBinary:
              [],
            removeFile:
              [],
            removeDirectory:
              []
          };

        const adapter =
          {
            kind:
              'desktop',
            getWorkspaceRoot() {
              return 'memory-workspace';
            },
            async pickWorkspace() {
              return 'memory-workspace';
            },
            async restoreWorkspace() {
              return 'memory-workspace';
            },
            async ensureDirectory(path) {

              if (window.__mowRestoreCancelReady) {

                writesAfterReady.ensureDirectory.push(
                  normalize(path)
                );
              }

              ensureDirectoryPath(
                path
              );
            },
            async getDirectoryHandle(path) {
              return {
                kind:
                  'directory',
                path:
                  normalize(path)
              };
            },
            async readText(path) {

              const normalized =
                normalize(path);

              if (!files.has(normalized)) {

                throw new Error(
                  `File not found: ${path}`
                );
              }

              const value =
                files.get(normalized);

              return typeof value === 'string'
                ? value
                : new TextDecoder().decode(value);
            },
            async writeText(path, content) {

              const normalized =
                normalize(path);

              if (window.__mowRestoreCancelReady) {

                writesAfterReady.writeText.push(
                  normalized
                );
              }

              ensureDirectoryPath(
                getParentPath(normalized)
              );

              files.set(
                normalized,
                String(content)
              );
            },
            async readBinary(path) {

              const normalized =
                normalize(path);

              if (!files.has(normalized)) {

                throw new Error(
                  `File not found: ${path}`
                );
              }

              const value =
                files.get(normalized);

              return typeof value === 'string'
                ? new TextEncoder().encode(value).buffer
                : value;
            },
            async writeBinary(path, content) {

              const normalized =
                normalize(path);

              if (window.__mowRestoreCancelReady) {

                writesAfterReady.writeBinary.push(
                  normalized
                );
              }

              ensureDirectoryPath(
                getParentPath(normalized)
              );

              files.set(
                normalized,
                content
              );
            },
            async listFiles(path = '') {
              return listFiles(path);
            },
            async removeFile(path) {

              if (window.__mowRestoreCancelReady) {

                writesAfterReady.removeFile.push(
                  normalize(path)
                );
              }

              files.delete(
                normalize(path)
              );
            },
            async removeDirectory(path) {

              const normalized =
                normalize(path);

              if (window.__mowRestoreCancelReady) {

                writesAfterReady.removeDirectory.push(
                  normalized
                );
              }

              for (const filePath of [...files.keys()]) {

                if (
                  filePath === normalized ||
                  filePath.startsWith(`${normalized}/`)
                ) {

                  files.delete(
                    filePath
                  );
                }
              }
            }
          };

        setStorageAdapter(
          adapter
        );

        const snapshotPage =
          {
            id:
              'card-1',
            title:
              'Card',
            type:
              'note',
            template:
              'card',
            name:
              'card.md',
            path:
              '/pages/card.md',
            content:
              'snapshot-content'
          };

        const unchangedPage =
          {
            id:
              'card-unchanged',
            title:
              'Unchanged Card',
            type:
              'note',
            template:
              'card',
            name:
              'unchanged.md',
            path:
              '/pages/unchanged.md',
            content:
              'unchanged-content'
          };

        const missingCurrentPage =
          {
            id:
              'card-added',
            title:
              'Backup Only Card',
            type:
              'note',
            template:
              'card',
            name:
              'added.md',
            path:
              '/pages/added.md',
            content:
              'backup-only-content'
          };

        await adapter.writeText(
          '/pages/card.md',
          snapshotPage.content
        );

        await adapter.writeText(
          '/pages/unchanged.md',
          unchangedPage.content
        );

        await adapter.writeText(
          '/pages/added.md',
          missingCurrentPage.content
        );

        await createWorkspaceBackup({
          storageAdapter:
            adapter,
          pages:
            [
              snapshotPage,
              unchangedPage,
              missingCurrentPage
            ],
          id:
            'restore-cancel-source',
          cleanup:
            false
        });

        state.pages =
          [
            {
              ...snapshotPage,
              content:
                'current-before-cancel'
            },
            unchangedPage
          ];

        await adapter.removeFile(
          '/pages/added.md'
        );

        await adapter.writeText(
          '/pages/unchanged.md',
          unchangedPage.content
        );

        await adapter.writeText(
          '/pages/card.md',
          'current-before-cancel'
        );

        window.__mowRestoreCancel =
          {
            files,
            writesAfterReady
          };

        window.__mowRestoreCancelReady =
          true;
      }
    );

    await openSettingsSection(
      page,
      'backup'
    );

    await expect(
      page.locator('.app-backup-restore')
    ).toHaveCount(
      1
    );

    await page.locator('.app-backup-restore').click();

    const confirm =
      page.locator('.app-backup-confirm:not(.hidden)');

    await expect(
      confirm
    ).toBeVisible();

    await expect(
      confirm
    ).toHaveAttribute(
      'data-restore-preview',
      'ready'
    );

    await expect(
      confirm
    ).toContainText(
      'Изменения еще не применялись'
    );

    await expect(
      confirm.locator('.app-backup-preview-summary')
    ).toContainText(
      'добавит 1'
    );

    await expect(
      confirm.locator('.app-backup-preview-summary')
    ).toContainText(
      'заменит 1'
    );

    await expect(
      confirm.locator('.app-backup-preview-summary')
    ).toContainText(
      'без изменений 1'
    );

    const writesBeforeCancel =
      await page.evaluate(
        () => window.__mowRestoreCancel.writesAfterReady
      );

    expect(
      writesBeforeCancel
    ).toEqual({
      ensureDirectory:
        [],
      writeText:
        [],
      writeBinary:
        [],
      removeFile:
        [],
      removeDirectory:
        []
    });

    await confirm
      .locator('.app-backup-confirm-actions button')
      .first()
      .click();

    await expect(
      page.locator('.app-backup-confirm')
    ).toHaveClass(
      /hidden/
    );

    const result =
      await page.evaluate(
        () => ({
          pageContent:
            window.__mowRestoreCancel.files.get('pages/card.md'),
          addedPageExists:
            window.__mowRestoreCancel.files.has('pages/added.md'),
          writesAfterReady:
            window.__mowRestoreCancel.writesAfterReady
        })
      );

    expect(
      result
    ).toEqual({
      pageContent:
        'current-before-cancel',
      addedPageExists:
        false,
      writesAfterReady: {
        ensureDirectory:
          [],
        writeText:
          [],
        writeBinary:
          [],
        removeFile:
          [],
        removeDirectory:
          []
      }
    });
  }
);


test(
  'backup restore preview restores only selected pages from Settings',
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
          createWorkspaceBackup
        } = await import('/js/storage/backupService.js');

        const {
          buildPageRecordContent
        } = await import('/js/core/pageRecord.js');

        const {
          state
        } = await import('/js/state.js');

        const files =
          new Map();

        const directories =
          new Set([
            ''
          ]);

        const normalize =
          path => String(path || '')
            .replace(/\\/g, '/')
            .replace(/^\/+/, '')
            .replace(/\/+/g, '/');

        const ensureDirectoryPath =
          path => {

            const parts =
              normalize(path)
                .split('/')
                .filter(Boolean);

            let current =
              '';

            for (const part of parts) {

              current =
                current
                  ? `${current}/${part}`
                  : part;

              directories.add(
                current
              );
            }
          };

        const getParentPath =
          path => {

            const parts =
              normalize(path).split('/');

            parts.pop();

            return parts.join('/');
          };

        const listFiles =
          path => {

            const normalized =
              normalize(path);

            const prefix =
              normalized
                ? `${normalized}/`
                : '';

            const entries =
              new Map();

            for (const directory of directories) {

              if (!directory.startsWith(prefix)) continue;

              const rest =
                directory.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'directory'
              );
            }

            for (const filePath of files.keys()) {

              if (!filePath.startsWith(prefix)) continue;

              const rest =
                filePath.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'file'
              );
            }

            return [...entries].map(([name, kind]) => ({
              name,
              kind
            }));
          };

        const adapter =
          {
            kind:
              'desktop',
            getWorkspaceRoot() {
              return 'memory-workspace';
            },
            async pickWorkspace() {
              return 'memory-workspace';
            },
            async restoreWorkspace() {
              return 'memory-workspace';
            },
            async ensureDirectory(path) {
              ensureDirectoryPath(
                path
              );
            },
            async getDirectoryHandle(path) {
              return {
                kind:
                  'directory',
                path:
                  normalize(path)
              };
            },
            async readText(path) {

              const normalized =
                normalize(path);

              if (!files.has(normalized)) {

                throw new Error(
                  `File not found: ${path}`
                );
              }

              const value =
                files.get(normalized);

              return typeof value === 'string'
                ? value
                : new TextDecoder().decode(value);
            },
            async writeText(path, content) {

              const normalized =
                normalize(path);

              ensureDirectoryPath(
                getParentPath(normalized)
              );

              files.set(
                normalized,
                String(content)
              );
            },
            async readBinary(path) {

              const normalized =
                normalize(path);

              if (!files.has(normalized)) {

                throw new Error(
                  `File not found: ${path}`
                );
              }

              const value =
                files.get(normalized);

              return typeof value === 'string'
                ? new TextEncoder().encode(value).buffer
                : value;
            },
            async writeBinary(path, content) {

              const normalized =
                normalize(path);

              ensureDirectoryPath(
                getParentPath(normalized)
              );

              files.set(
                normalized,
                content
              );
            },
            async listFiles(path = '') {
              return listFiles(path);
            },
            async removeFile(path) {
              files.delete(
                normalize(path)
              );
            },
            async removeDirectory(path) {

              const normalized =
                normalize(path);

              for (const filePath of [...files.keys()]) {

                if (
                  filePath === normalized ||
                  filePath.startsWith(`${normalized}/`)
                ) {

                  files.delete(
                    filePath
                  );
                }
              }
            }
          };

        const createPage =
          ({
            id,
            title,
            body
          }) => ({
            id,
            title,
            type:
              id === 'hero'
                ? 'character'
                : 'note',
            template:
              'card',
            name:
              `${id}.md`,
            path:
              `/pages/${id}.md`,
            content:
              buildPageRecordContent({
                id,
                title,
                type:
                  id === 'hero'
                    ? 'character'
                    : 'note',
                template:
                  'card',
                tags:
                  [
                    'card'
                  ],
                body,
                now:
                  '2026-08-24T08:00:00.000Z'
              })
          });

        setStorageAdapter(
          adapter
        );

        const backupHero =
          createPage({
            id:
              'hero',
            title:
              'Hero',
            body:
              '<h1>Hero</h1><img data-asset="assets/portraits/hero.png"><p>Backup hero.</p>'
          });

        const backupWorld =
          createPage({
            id:
              'world',
            title:
              'World',
            body:
              '<h1>World</h1><p>Backup world.</p>'
          });

        await adapter.writeText(
          '/pages/hero.md',
          backupHero.content
        );

        await adapter.writeText(
          '/pages/world.md',
          backupWorld.content
        );

        await adapter.writeBinary(
          '/assets/portraits/hero.png',
          new TextEncoder().encode('backup-hero-image').buffer
        );

        await createWorkspaceBackup({
          storageAdapter:
            adapter,
          pages:
            [
              backupHero,
              backupWorld
            ],
          id:
            'partial-ui-source',
          cleanup:
            false
        });

        const currentHero =
          createPage({
            id:
              'hero',
            title:
              'Hero',
            body:
              '<h1>Hero</h1><img data-asset="assets/portraits/hero.png"><p>Current hero.</p>'
          });

        const currentWorld =
          createPage({
            id:
              'world',
            title:
              'World',
            body:
              '<h1>World</h1><p>Current world must stay.</p>'
          });

        state.pages =
          [
            currentHero,
            currentWorld
          ];

        await adapter.writeText(
          '/pages/hero.md',
          currentHero.content
        );

        await adapter.writeText(
          '/pages/world.md',
          currentWorld.content
        );

        await adapter.writeBinary(
          '/assets/portraits/hero.png',
          new TextEncoder().encode('current-hero-image').buffer
        );

        window.__mowPartialRestore =
          {
            files,
            backupHeroContent:
              backupHero.content,
            currentWorldContent:
              currentWorld.content
          };
      }
    );

    await openSettingsSection(
      page,
      'backup'
    );

    await page.locator('.app-backup-restore').click();

    const confirm =
      page.locator('.app-backup-confirm:not(.hidden)');

    await expect(
      confirm
    ).toHaveAttribute(
      'data-restore-preview',
      'ready'
    );

    await confirm
      .getByLabel(
        'Выбрать страницу для восстановления: Hero'
      )
      .check();

    await expect(
      confirm.getByRole(
        'button',
        {
          name:
            'Восстановить выбранное'
        }
      )
    ).toBeEnabled();

    await confirm
      .getByRole(
        'button',
        {
          name:
            'Восстановить выбранное'
        }
      )
      .click();

    await expect(
      page.locator('.app-backup-confirm')
    ).toHaveClass(
      /hidden/
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            getPageById,
            getPageByTitle
          } = await import('/js/repository/pageRepository.js');

          const heroPage =
            getPageById(
              'hero'
            );

          const worldPage =
            getPageByTitle(
              'World'
            );

          return {
            hero:
              window.__mowPartialRestore.files.get('pages/hero.md'),
            world:
              window.__mowPartialRestore.files.get('pages/world.md'),
            asset:
              new TextDecoder().decode(
                window.__mowPartialRestore.files.get('assets/portraits/hero.png')
              ),
            preRestoreExists:
              [
                ...window.__mowPartialRestore.files.keys()
              ].some(path =>
                path.includes('pre-restore')
              ),
            repositoryHeroRestored:
              Boolean(
                heroPage?.content?.includes(
                  'Backup hero.'
                )
              ),
            repositoryWorldUnchanged:
              Boolean(
                worldPage?.content?.includes(
                  'Current world must stay.'
                )
              ),
            backupHeroContent:
              window.__mowPartialRestore.backupHeroContent,
            currentWorldContent:
              window.__mowPartialRestore.currentWorldContent
          };
        }
      );

    expect(
      result.hero
    ).toBe(
      result.backupHeroContent
    );

    expect(
      result.world
    ).toBe(
      result.currentWorldContent
    );

    expect(
      result.asset
    ).toBe(
      'backup-hero-image'
    );

    expect(
      result.preRestoreExists
    ).toBe(
      true
    );

    expect(
      result.repositoryHeroRestored
    ).toBe(
      true
    );

    expect(
      result.repositoryWorldUnchanged
    ).toBe(
      true
    );
  }
);


test(
  'backup restore reports refresh failure after durable restore without success status',
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
          createWorkspaceBackup
        } = await import('/js/storage/backupService.js');

        const {
          buildPageRecordContent
        } = await import('/js/core/pageRecord.js');

        const {
          state
        } = await import('/js/state.js');

        const files =
          new Map();

        const directories =
          new Set([
            ''
          ]);

        const normalize =
          path => String(path || '')
            .replace(/\\/g, '/')
            .replace(/^\/+/, '')
            .replace(/\/+/g, '/');

        const ensureDirectoryPath =
          path => {

            const parts =
              normalize(path)
                .split('/')
                .filter(Boolean);

            let current =
              '';

            for (const part of parts) {

              current =
                current
                  ? `${current}/${part}`
                  : part;

              directories.add(
                current
              );
            }
          };

        const getParentPath =
          path => {

            const parts =
              normalize(path).split('/');

            parts.pop();

            return parts.join('/');
          };

        const listFiles =
          path => {

            const normalized =
              normalize(path);

            const prefix =
              normalized
                ? `${normalized}/`
                : '';

            const entries =
              new Map();

            for (const directory of directories) {

              if (!directory.startsWith(prefix)) continue;

              const rest =
                directory.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'directory'
              );
            }

            for (const filePath of files.keys()) {

              if (!filePath.startsWith(prefix)) continue;

              const rest =
                filePath.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'file'
              );
            }

            return [...entries].map(([name, kind]) => ({
              name,
              kind
            }));
          };

        const adapter =
          {
            kind:
              'desktop',
            getWorkspaceRoot() {
              return 'memory-workspace';
            },
            async pickWorkspace() {
              return 'memory-workspace';
            },
            async restoreWorkspace() {
              return 'memory-workspace';
            },
            async ensureDirectory(path) {
              ensureDirectoryPath(
                path
              );
            },
            async getDirectoryHandle(path) {
              return {
                kind:
                  'directory',
                path:
                  normalize(path)
              };
            },
            async readText(path) {

              const normalized =
                normalize(path);

              if (!files.has(normalized)) {

                throw new Error(
                  `File not found: ${path}`
                );
              }

              const value =
                files.get(normalized);

              return typeof value === 'string'
                ? value
                : new TextDecoder().decode(value);
            },
            async writeText(path, content) {

              const normalized =
                normalize(path);

              ensureDirectoryPath(
                getParentPath(normalized)
              );

              files.set(
                normalized,
                String(content)
              );

              if (
                window.__mowRestoreRefreshFailureReady &&
                normalized === 'pages/hero.md' &&
                String(content).includes('Backup hero.')
              ) {

                window.__mowRestoreRefreshFailure.failRefresh =
                  true;
              }
            },
            async readBinary(path) {

              const normalized =
                normalize(path);

              if (!files.has(normalized)) {

                throw new Error(
                  `File not found: ${path}`
                );
              }

              const value =
                files.get(normalized);

              return typeof value === 'string'
                ? new TextEncoder().encode(value).buffer
                : value;
            },
            async writeBinary(path, content) {

              const normalized =
                normalize(path);

              ensureDirectoryPath(
                getParentPath(normalized)
              );

              files.set(
                normalized,
                content
              );
            },
            async listFiles(path = '') {

              if (
                window.__mowRestoreRefreshFailure?.failRefresh &&
                normalize(path) === 'pages'
              ) {

                throw new Error(
                  'workspace refresh list failed'
                );
              }

              return listFiles(path);
            },
            async removeFile(path) {
              files.delete(
                normalize(path)
              );
            },
            async removeDirectory(path) {

              const normalized =
                normalize(path);

              for (const filePath of [...files.keys()]) {

                if (
                  filePath === normalized ||
                  filePath.startsWith(`${normalized}/`)
                ) {

                  files.delete(
                    filePath
                  );
                }
              }
            }
          };

        const createPage =
          ({
            id,
            title,
            body
          }) => ({
            id,
            title,
            type:
              'note',
            template:
              'card',
            name:
              `${id}.md`,
            path:
              `/pages/${id}.md`,
            content:
              buildPageRecordContent({
                id,
                title,
                type:
                  'note',
                template:
                  'card',
                tags:
                  [
                    'card'
                  ],
                body,
                now:
                  '2026-08-24T08:00:00.000Z'
              })
          });

        setStorageAdapter(
          adapter
        );

        const backupHero =
          createPage({
            id:
              'hero',
            title:
              'Hero',
            body:
              '<h1>Hero</h1><p>Backup hero.</p>'
          });

        await adapter.writeText(
          '/pages/hero.md',
          backupHero.content
        );

        await createWorkspaceBackup({
          storageAdapter:
            adapter,
          pages:
            [
              backupHero
            ],
          id:
            'refresh-failure-source',
          cleanup:
            false
        });

        const currentHero =
          createPage({
            id:
              'hero',
            title:
              'Hero',
            body:
              '<h1>Hero</h1><p>Current hero.</p>'
          });

        state.pages =
          [
            currentHero
          ];

        await adapter.writeText(
          '/pages/hero.md',
          currentHero.content
        );

        window.__mowRestoreRefreshFailure =
          {
            files,
            backupHeroContent:
              backupHero.content,
            failRefresh:
              false
          };

        window.__mowRestoreRefreshFailureReady =
          true;
      }
    );

    await openSettingsSection(
      page,
      'backup'
    );

    await page.locator('.app-backup-restore').click();

    const confirm =
      page.locator('.app-backup-confirm:not(.hidden)');

    await expect(
      confirm
    ).toHaveAttribute(
      'data-restore-preview',
      'ready'
    );

    await confirm
      .getByRole(
        'button',
        {
          name:
            'Восстановить все'
        }
      )
      .click();

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'workspace не обновился'
    );

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'Страховочная копия'
    );

    const result =
      await page.evaluate(
        () => ({
          hero:
            window.__mowRestoreRefreshFailure.files.get('pages/hero.md'),
          backupHeroContent:
            window.__mowRestoreRefreshFailure.backupHeroContent,
          preRestoreExists:
            [
              ...window.__mowRestoreRefreshFailure.files.keys()
            ].some(path =>
              path.includes('pre-restore')
            )
        })
      );

    expect(
      result.hero
    ).toBe(
      result.backupHeroContent
    );

    expect(
      result.preRestoreExists
    ).toBe(
      true
    );
  }
);


test(
  'backup restore confirmation blocks damaged preview without restore writes',
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
          createWorkspaceBackup
        } = await import('/js/storage/backupService.js');

        const {
          state
        } = await import('/js/state.js');

        const files =
          new Map();

        const directories =
          new Set([
            ''
          ]);

        const normalize =
          path => String(path || '')
            .replace(/\\/g, '/')
            .replace(/^\/+/, '')
            .replace(/\/+/g, '/');

        const ensureDirectoryPath =
          path => {

            const parts =
              normalize(path)
                .split('/')
                .filter(Boolean);

            let current =
              '';

            for (const part of parts) {

              current =
                current
                  ? `${current}/${part}`
                  : part;

              directories.add(
                current
              );
            }
          };

        const getParentPath =
          path => {

            const parts =
              normalize(path).split('/');

            parts.pop();

            return parts.join('/');
          };

        const listFiles =
          path => {

            const normalized =
              normalize(path);

            const prefix =
              normalized
                ? `${normalized}/`
                : '';

            const entries =
              new Map();

            for (const directory of directories) {

              if (!directory.startsWith(prefix)) continue;

              const rest =
                directory.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'directory'
              );
            }

            for (const filePath of files.keys()) {

              if (!filePath.startsWith(prefix)) continue;

              const rest =
                filePath.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'file'
              );
            }

            return [...entries].map(([name, kind]) => ({
              name,
              kind
            }));
          };

        const writesAfterReady =
          {
            writeText:
              [],
            writeBinary:
              [],
            removeFile:
              [],
            removeDirectory:
              []
          };

        const adapter =
          {
            kind:
              'desktop',
            getWorkspaceRoot() {
              return 'memory-workspace';
            },
            async pickWorkspace() {
              return 'memory-workspace';
            },
            async restoreWorkspace() {
              return 'memory-workspace';
            },
            async ensureDirectory(path) {
              ensureDirectoryPath(
                path
              );
            },
            async getDirectoryHandle(path) {
              return {
                kind:
                  'directory',
                path:
                  normalize(path)
              };
            },
            async readText(path) {

              const normalized =
                normalize(path);

              if (!files.has(normalized)) {

                throw new Error(
                  `File not found: ${path}`
                );
              }

              const value =
                files.get(normalized);

              return typeof value === 'string'
                ? value
                : new TextDecoder().decode(value);
            },
            async writeText(path, content) {

              const normalized =
                normalize(path);

              if (window.__mowRestoreBlockedReady) {

                writesAfterReady.writeText.push(
                  normalized
                );
              }

              ensureDirectoryPath(
                getParentPath(normalized)
              );

              files.set(
                normalized,
                String(content)
              );
            },
            async readBinary(path) {

              const normalized =
                normalize(path);

              if (!files.has(normalized)) {

                throw new Error(
                  `File not found: ${path}`
                );
              }

              const value =
                files.get(normalized);

              return typeof value === 'string'
                ? new TextEncoder().encode(value).buffer
                : value;
            },
            async writeBinary(path, content) {

              const normalized =
                normalize(path);

              if (window.__mowRestoreBlockedReady) {

                writesAfterReady.writeBinary.push(
                  normalized
                );
              }

              ensureDirectoryPath(
                getParentPath(normalized)
              );

              files.set(
                normalized,
                content
              );
            },
            async listFiles(path = '') {
              return listFiles(path);
            },
            async removeFile(path) {

              if (window.__mowRestoreBlockedReady) {

                writesAfterReady.removeFile.push(
                  normalize(path)
                );
              }

              files.delete(
                normalize(path)
              );
            },
            async removeDirectory(path) {

              const normalized =
                normalize(path);

              if (window.__mowRestoreBlockedReady) {

                writesAfterReady.removeDirectory.push(
                  normalized
                );
              }

              for (const filePath of [...files.keys()]) {

                if (
                  filePath === normalized ||
                  filePath.startsWith(`${normalized}/`)
                ) {

                  files.delete(
                    filePath
                  );
                }
              }
            }
          };

        setStorageAdapter(
          adapter
        );

        const snapshotPage =
          {
            id:
              'broken-card',
            title:
              'Broken Card',
            type:
              'note',
            template:
              'card',
            name:
              'broken-card.md',
            path:
              '/pages/broken-card.md',
            content:
              'snapshot-content'
          };

        await adapter.writeText(
          '/pages/broken-card.md',
          snapshotPage.content
        );

        await createWorkspaceBackup({
          storageAdapter:
            adapter,
          pages:
            [
              snapshotPage
            ],
          id:
            'restore-blocked-source',
          cleanup:
            false
        });

        await adapter.removeFile(
          '.my-own-world-backups/restore-blocked-source/pages/broken-card.md'
        );

        state.pages =
          [
            {
              ...snapshotPage,
              content:
                'current-before-blocked-preview'
            }
          ];

        await adapter.writeText(
          '/pages/broken-card.md',
          'current-before-blocked-preview'
        );

        window.__mowRestoreBlocked =
          {
            files,
            writesAfterReady
          };

        window.__mowRestoreBlockedReady =
          true;
      }
    );

    await openSettingsSection(
      page,
      'backup'
    );

    await page.locator('.app-backup-restore').click();

    const confirm =
      page.locator('.app-backup-confirm:not(.hidden)');

    await expect(
      confirm
    ).toHaveAttribute(
      'data-restore-preview',
      'blocked'
    );

    await expect(
      confirm
    ).toContainText(
      'Backup поврежден или неполный'
    );

    await expect(
      confirm.locator('.app-backup-danger')
    ).toBeDisabled();

    const result =
      await page.evaluate(
        () => ({
          pageContent:
            window.__mowRestoreBlocked.files.get('pages/broken-card.md'),
          backupPageExists:
            window.__mowRestoreBlocked.files.has('.my-own-world-backups/restore-blocked-source/pages/broken-card.md'),
          writesAfterReady:
            window.__mowRestoreBlocked.writesAfterReady
        })
      );

    expect(
      result
    ).toEqual({
      pageContent:
        'current-before-blocked-preview',
      backupPageExists:
        false,
      writesAfterReady: {
        writeText:
          [],
        writeBinary:
          [],
        removeFile:
          [],
        removeDirectory:
          []
      }
    });
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

    const treeA11y =
      await page.evaluate(
        () => {

          const tree =
            document.getElementById('tree');

          const rootItem =
            document.querySelector('.tree-item[data-page-id="map-context"]');

          const childItem =
            document.querySelector('.tree-item[data-page-id="map-child"]');

          const rootToggle =
            rootItem?.querySelector('.tree-toggle');

          const childToggle =
            childItem?.querySelector('.tree-toggle');

          const childTitle =
            childItem?.querySelector('.tree-title');

          const childActions =
            childItem?.querySelector('.tree-actions');

          return {
            treeRole:
              tree?.getAttribute('role') || '',
            treeLabel:
              tree?.getAttribute('aria-label') || '',
            rootRole:
              rootItem?.getAttribute('role') || '',
            rootName:
              rootItem?.getAttribute('aria-label') || '',
            rootExpanded:
              rootItem?.getAttribute('aria-expanded') || '',
            rootTabIndex:
              rootItem?.tabIndex,
            rootToggleTitle:
              rootToggle?.getAttribute('title') || '',
            rootToggleTabIndex:
              rootToggle?.tabIndex,
            rootToggleHidden:
              rootToggle?.getAttribute('aria-hidden') || '',
            childRole:
              childItem?.getAttribute('role') || '',
            childName:
              childItem?.getAttribute('aria-label') || '',
            childTitleTag:
              childTitle?.tagName || '',
            childToggleDisabled:
              Boolean(childToggle?.disabled),
            childToggleTabIndex:
              childToggle?.tabIndex,
            childToggleHidden:
              childToggle?.getAttribute('aria-hidden') || '',
            childActionsName:
              childActions?.getAttribute('aria-label') || ''
          };
        }
      );

    expect(
      treeA11y.treeRole
    ).toBe(
      'tree'
    );

    expect(
      treeA11y.treeLabel
    ).toBe(
      'Дерево мира'
    );

    expect(
      treeA11y.rootRole
    ).toBe(
      'treeitem'
    );

    expect(
      treeA11y.rootName
    ).toBe(
      'Тихая переправа'
    );

    expect(
      treeA11y.rootExpanded
    ).toBe(
      'true'
    );

    expect(
      treeA11y.rootTabIndex
    ).toBe(
      0
    );

    expect(
      treeA11y.rootToggleTitle
    ).toBe(
      'Свернуть: Тихая переправа'
    );

    expect(
      treeA11y.rootToggleTabIndex
    ).toBe(
      -1
    );

    expect(
      treeA11y.rootToggleHidden
    ).toBe(
      'true'
    );

    expect(
      treeA11y.childRole
    ).toBe(
      'treeitem'
    );

    expect(
      treeA11y.childName
    ).toBe(
      'Старый мост'
    );

    expect(
      treeA11y.childTitleTag
    ).toBe(
      'SPAN'
    );

    expect(
      treeA11y.childToggleDisabled
    ).toBe(
      true
    );

    expect(
      treeA11y.childToggleTabIndex
    ).toBe(
      -1
    );

    expect(
      treeA11y.childToggleHidden
    ).toBe(
      'true'
    );

    expect(
      treeA11y.childActionsName
    ).toContain(
      'Действия страницы:'
    );

    await page.locator('.tree-item[data-page-id="map-child"]').focus();

    await page.keyboard.press(
      'Enter'
    );

    await expect(
      page.locator('.tree-item[data-page-id="map-child"]')
    ).toHaveAttribute(
      'aria-current',
      'page'
    );

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
  'command-palette-opens-from-rail-and-searches-pages-deeply',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          setPages,
          setWorkspaceHandle
        } = await import('/js/stateActions.js');

        setWorkspaceHandle({
          name:
            'Command workspace'
        });

        setPages(
          [
            {
              id:
                'command-root',
              title:
                'Архив столицы',
              order:
                '0001',
              template:
                'card',
              type:
                'folder',
              tags:
                [
                  'folder'
                ],
              content:
                '<h1>Архив столицы</h1>'
            },
            {
              id:
                'command-page',
              title:
                'Тайная переписка',
              parent:
                'command-root',
              order:
                '0001',
              template:
                'card',
              type:
                'lore',
              tags:
                [
                  'lore',
                  'secret'
                ],
              aliases:
                [
                  'Письма канцлера'
                ],
              content:
                '<h1>Тайная переписка</h1><p>Внутри спрятан янтарный маркер для глубокого поиска.</p>'
            }
          ]
        );
      }
    );

    await page.locator('#appCommandRailBtn').click();

    await expect(
      page.locator('#commandPalette')
    ).toHaveAttribute(
      'data-overlay-state',
      'open'
    );

    await expect(
      page.locator('#commandPaletteInput')
    ).toBeFocused();

    await expect(
      page.locator('.command-palette-section-title').first()
    ).toHaveText(
      'Команды'
    );

    await expect(
      page.getByRole(
        'option',
        {
          name:
            /Новая страница/
        }
      )
    ).toBeVisible();

    await page
      .locator('#commandPaletteInput')
      .fill(
        'янтарный маркер'
      );

    const deepResult =
      page.getByRole(
        'option',
        {
          name:
            /Тайная переписка/
        }
      );

    await expect(
      deepResult
    ).toBeVisible();

    await expect(
      deepResult
    ).toContainText(
      'совпадение: текст'
    );

    await expect(
      deepResult
    ).toContainText(
      'Архив столицы / Тайная переписка'
    );

    await expect(
      deepResult.locator('.command-palette-item-excerpt')
    ).toContainText(
      'янтарный маркер'
    );

    await deepResult.click();

    await expect(
      page.locator('#commandPalette')
    ).toHaveAttribute(
      'data-overlay-state',
      'closed'
    );

    await expect(
      page.locator('#editorArea h1')
    ).toHaveText(
      'Тайная переписка'
    );

    await page.keyboard.press(
      'Control+K'
    );

    await expect(
      page.locator('#commandPalette')
    ).toHaveAttribute(
      'data-overlay-state',
      'open'
    );

    await page
      .locator('#commandPaletteInput')
      .fill(
        'скрыть дерево'
      );

    await page.keyboard.press(
      'Enter'
    );

    await expect(
      page.locator('.app')
    ).toHaveAttribute(
      'data-sidebar-state',
      'collapsed'
    );

    await expect(
      page.locator('#commandPalette')
    ).toHaveAttribute(
      'data-overlay-state',
      'closed'
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
