import {
  expect,
  test
} from '@playwright/test';

import {
  mkdir,
  writeFile
} from 'node:fs/promises';

import {
  join
} from 'node:path';


const UI_MIGRATION_BASELINE_ATTACHMENTS = [
  'visual-app-shell',
  'visual-app-shell-empty-workbench',
  'visual-app-settings-maintenance',
  'visual-sidebar-tree',
  'visual-command-palette',
  'visual-card-editor',
  'visual-add-block-popup',
  'visual-properties-sheet',
  'visual-properties-popup',
  'visual-campaign-map',
  'visual-knowledge-graph',
  'visual-knowledge-graph-node-menu',
  'visual-task-tracker',
  'visual-help-support',
  'visual-world-packages',
  'visual-component-catalogue-popover',
  'visual-theme-dark-compact-workbench',
  'visual-theme-contrast-large-workbench',
  'visual-theme-contrast-narrow-workbench',
  'visual-ds-dark-compact-shell-states',
  'visual-ds-contrast-large-editor-properties',
  'visual-ds-dark-normal-map-popup',
  'visual-ds-contrast-large-graph-overlay',
  'visual-ds-dark-compact-task-empty',
  'visual-owner-1440-shell-states',
  'visual-owner-1280-shell-states',
  'visual-owner-1440-editor-properties',
  'visual-owner-1280-editor-properties',
  'visual-owner-1440-map-popup',
  'visual-owner-1280-map-popup',
  'visual-owner-1440-graph-overlay',
  'visual-owner-1280-graph-overlay',
  'visual-owner-1440-task-empty',
  'visual-owner-1280-task-empty',
  'visual-owner-1440-settings-diagnostics',
  'visual-owner-1280-settings-diagnostics'
];

const THEME_SCALE_BASELINE_CASES = [
  {
    attachment:
      'visual-theme-dark-compact-workbench',
    viewport: {
      width: 1280,
      height: 820
    },
    appearance: {
      theme: 'dark',
      accent: 'gold',
      background: 'forest',
      scale: 'compact'
    },
    minEditorWidth:
      560
  },
  {
    attachment:
      'visual-theme-contrast-large-workbench',
    viewport: {
      width: 1280,
      height: 820
    },
    appearance: {
      theme: 'contrast',
      accent: 'blue',
      background: 'stone',
      scale: 'large'
    },
    minEditorWidth:
      520
  },
  {
    attachment:
      'visual-theme-contrast-narrow-workbench',
    viewport: {
      width: 1000,
      height: 680
    },
    appearance: {
      theme: 'contrast',
      accent: 'green',
      background: 'arcane',
      scale: 'normal'
    },
    minEditorWidth:
      420
  }
];

const DESIGN_SYSTEM_FIXED_VIEWPORT_CASES = [
  {
    attachment:
      'visual-ds-dark-compact-shell-states',
    kind:
      'shell-states',
    viewport: {
      width: 1200,
      height: 760
    },
    appearance: {
      theme: 'dark',
      accent: 'gold',
      background: 'forest',
      scale: 'compact'
    }
  },
  {
    attachment:
      'visual-ds-contrast-large-editor-properties',
    kind:
      'editor-properties',
    viewport: {
      width: 1366,
      height: 860
    },
    appearance: {
      theme: 'contrast',
      accent: 'green',
      background: 'stone',
      scale: 'large'
    },
    locator:
      '.editor-surface'
  },
  {
    attachment:
      'visual-ds-dark-normal-map-popup',
    kind:
      'map-popup',
    viewport: {
      width: 1366,
      height: 860
    },
    appearance: {
      theme: 'dark',
      accent: 'purple',
      background: 'arcane',
      scale: 'normal'
    }
  },
  {
    attachment:
      'visual-ds-contrast-large-graph-overlay',
    kind:
      'graph-overlay',
    viewport: {
      width: 1366,
      height: 860
    },
    appearance: {
      theme: 'contrast',
      accent: 'blue',
      background: 'stone',
      scale: 'large'
    }
  },
  {
    attachment:
      'visual-ds-dark-compact-task-empty',
    kind:
      'task-empty',
    viewport: {
      width: 1180,
      height: 760
    },
    appearance: {
      theme: 'dark',
      accent: 'gold',
      background: 'stone',
      scale: 'compact'
    },
    locator:
      '.task-tracker-document'
  }
];

const OWNER_VISUAL_COMPLETION_VIEWPORTS = [
  {
    name:
      '1440',
    viewport: {
      width: 1440,
      height: 900
    }
  },
  {
    name:
      '1280',
    viewport: {
      width: 1280,
      height: 720
    }
  }
];

const OWNER_VISUAL_COMPLETION_SURFACES = [
  {
    name:
      'shell-states',
    kind:
      'shell-states',
    appearance: {
      theme: 'dark',
      accent: 'gold',
      background: 'forest',
      scale: 'compact'
    }
  },
  {
    name:
      'editor-properties',
    kind:
      'editor-properties',
    appearance: {
      theme: 'dark',
      accent: 'gold',
      background: 'forest',
      scale: 'normal'
    },
    locator:
      '.editor-surface'
  },
  {
    name:
      'map-popup',
    kind:
      'map-popup',
    appearance: {
      theme: 'dark',
      accent: 'purple',
      background: 'arcane',
      scale: 'normal'
    }
  },
  {
    name:
      'graph-overlay',
    kind:
      'graph-overlay',
    appearance: {
      theme: 'contrast',
      accent: 'blue',
      background: 'stone',
      scale: 'normal'
    }
  },
  {
    name:
      'task-empty',
    kind:
      'task-empty',
    appearance: {
      theme: 'dark',
      accent: 'gold',
      background: 'stone',
      scale: 'compact'
    }
  },
  {
    name:
      'settings-diagnostics',
    kind:
      'settings-diagnostics',
    appearance: {
      theme: 'dark',
      accent: 'blue',
      background: 'stone',
      scale: 'normal'
    },
    locator:
      '#appSettingsPopup'
  }
];

const OWNER_VISUAL_COMPLETION_CASES =
  OWNER_VISUAL_COMPLETION_SURFACES.flatMap(
    surface =>
      OWNER_VISUAL_COMPLETION_VIEWPORTS.map(
        viewportCase => ({
          ...surface,
          viewport:
            viewportCase.viewport,
          attachment:
            `visual-owner-${viewportCase.name}-${surface.name}`
        })
      )
  );


// P1 visual smoke: тест не сравнивает пиксели с эталоном, а сохраняет
// скриншоты ключевых экранов и проверяет частые визуальные поломки layout.

const OWNER_FINAL_EVIDENCE_SCREENSHOTS =
  new Map([
    [
      'visual-owner-1440-shell-states',
      'shell.png'
    ],
    [
      'visual-owner-1440-editor-properties',
      'editor-properties.png'
    ],
    [
      'visual-owner-1440-map-popup',
      'map-popup-inspector.png'
    ],
    [
      'visual-owner-1440-graph-overlay',
      'graph-overlay.png'
    ],
    [
      'visual-owner-1440-task-empty',
      'task-empty.png'
    ],
    [
      'visual-owner-1440-settings-diagnostics',
      'settings-diagnostics.png'
    ]
  ]);


test(
  'visual-safety-captures-core-surfaces',
  async ({ page }, testInfo) => {

    await page.addInitScript(
      () => {

        localStorage.setItem(
          'my-own-world:show-component-catalogue',
          'true'
        );
      }
    );

    await page.setViewportSize({
      width: 1280,
      height: 820
    });

    await page.goto(
      '/'
    );

    await expect(
      page.locator('.app-topbar-brand')
    ).toHaveText(
      'MyOwnWorld'
    );

    await attachScreenshot(
      page,
      testInfo,
      'visual-app-shell'
    );

    await page.locator('#appSettingsBtn').click();

    await expect(
      page.locator('#appSettingsPopup')
    ).toHaveAttribute(
      'data-settings-ui-migration',
      '0.0.1.8.14.2'
    );

    await attachLocatorScreenshot(
      page.locator('#appSettingsPopup'),
      testInfo,
      'visual-app-settings-maintenance'
    );

    await page.locator('#appSettingsCloseBtn').click();

    await expect(
      page.locator('[data-app-shell-surface="empty-workspace"]')
    ).toBeVisible();

    await attachScreenshot(
      page,
      testInfo,
      'visual-app-shell-empty-workbench'
    );

    await attachLocatorScreenshot(
      page.locator('.sidebar'),
      testInfo,
      'visual-sidebar-tree'
    );

    await page.evaluate(
      async () => {

        const {
          setPages,
          setWorkspaceHandle
        } = await import('/js/stateActions.js');

        setWorkspaceHandle({
          name:
            'Visual command workspace'
        });

        setPages(
          [
            {
              id:
                'visual-command-root',
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
                'visual-command-page',
              title:
                'Тайная переписка',
              parent:
                'visual-command-root',
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
              content:
                '<h1>Тайная переписка</h1><p>Внутри спрятан янтарный маркер для визуального поиска.</p>'
            }
          ]
        );
      }
    );

    await page.locator('#appCommandRailBtn').click();

    await page
      .locator('#commandPaletteInput')
      .fill(
        'янтарный маркер'
      );

    await expect(
      page.locator('#commandPalette')
    ).toHaveAttribute(
      'data-overlay-state',
      'open'
    );

    await attachLocatorScreenshot(
      page.locator('#commandPalette'),
      testInfo,
      'visual-command-palette'
    );

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      page.locator('#commandPalette')
    ).toHaveAttribute(
      'data-overlay-state',
      'closed'
    );

    await page.evaluate(
      async () => {

        const {
          createCardShellTemplate
        } = await import('/js/templates/cardShell.js');

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createCardShellTemplate().content;

        editor.querySelector('h1').textContent =
          'Визуальная карточка';

        editor.querySelector('.card-short-description').textContent =
          'Короткое описание для проверки мягкого блока карточки.';

        editor.querySelector('.rich-text-field:last-child').textContent =
          'Основной текст карточки, который нужен для проверки редактора.';
      }
    );

    await attachLocatorScreenshot(
      page.locator('.editor-surface'),
      testInfo,
      'visual-card-editor'
    );

    await page.evaluate(
      async () => {

        const {
          renderCustomBlocks
        } = await import('/js/editor/customBlocks.js');

        renderCustomBlocks(
          document.querySelector('#editorArea')
        );
      }
    );

    await page.locator('.add-block-btn').click();

    await expect(
      page.locator('#blockPopup')
    ).toBeVisible();

    await attachLocatorScreenshot(
      page.locator('#blockPopup'),
      testInfo,
      'visual-add-block-popup'
    );

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      page.locator('#blockPopup')
    ).toBeHidden();

    await page.evaluate(
      async () => {

        const {
          createPropertiesBlock
        } = await import('/js/templates/blockTypes.js');

        const {
          ensurePropertySettingsControls
        } = await import('/js/editor/propertiesSettingsPopup.js');

        const editor =
          document.querySelector('#editorArea');

        const main =
          editor.querySelector('.entity-main');

        main.insertAdjacentHTML(
          'afterbegin',
          createPropertiesBlock({
            title: 'Visual properties',
            cardType: 'character'
          })
        );

        editor.querySelector('.card-type-select').value =
          'character';

        const block =
          editor.querySelector('.card-properties-block');

        block.querySelector('[data-property-name="level"]').value =
          '5';

        block.querySelector('[data-property-name="armorClass"]').value =
          '16';

        block.querySelector('[data-property-name="hpCurrent"]').value =
          '24';

        block.querySelector('[data-property-name="hpMax"]').value =
          '31';

        block.querySelector('[data-property-name="str"]').value =
          '14';

        block.querySelector('[data-property-name="dex"]').value =
          '16';

        ensurePropertySettingsControls(
          editor
        );
      }
    );

    await attachLocatorScreenshot(
      page.locator('.card-properties-block'),
      testInfo,
      'visual-properties-sheet'
    );

    await page.locator('.card-properties-settings-btn').click();

    await expect(
      page.locator('.property-settings-popup')
    ).toBeVisible();

    await attachLocatorScreenshot(
      page.locator('.property-settings-popup'),
      testInfo,
      'visual-properties-popup'
    );

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      page.locator('.property-settings-popup')
    ).toBeHidden();

    await page.evaluate(
      async () => {

        const {
          createCampaignMapTemplate
        } = await import('/js/templates/campaignMap.js');

        const {
          getCampaignMapStore
        } = await import('/js/editor/campaignMapStore.js');

        const {
          createMapShapeElement,
          createMapTokenElement
        } = await import('/js/editor/campaignMapElementFactory.js');

        const {
          renderMapShapeElement,
          renderMapTokenElement
        } = await import('/js/editor/campaignMapRenderer.js');

        const {
          renderLockedFogZones
        } = await import('/js/editor/campaignMapFog.js');

        const {
          ensureMapSelectionInspector
        } = await import('/js/editor/campaignMapSelectionInspector.js');

        const {
          selectMapToken
        } = await import('/js/editor/campaignMapRuntime.js');

        const {
          removeSelectedCampaignMapItems
        } = await import('/js/editor/campaignMap.js');

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createCampaignMapTemplate().content;

        const map =
          editor.querySelector('.campaign-map-document');

        const stage =
          map.querySelector('.campaign-map-stage');

        const viewport =
          map.querySelector('.campaign-map-viewport');

        const layer =
          map.querySelector('.campaign-map-object-layer');

        stage.style.height =
          '560px';

        stage.dataset.grid =
          'true';

        stage.dataset.gridColor =
          '#8c846f';

        stage.dataset.viewZoom =
          '1';

        viewport.style.width =
          '2000px';

        viewport.style.height =
          '1200px';

        const store =
          getCampaignMapStore(
            map
          );

        const token =
          store.addToken({
            tokenId: 'visual-token',
            type: 'creature',
            name: 'Страж',
            x: 18,
            y: 22,
            size: 1,
            hp: 8,
            hpMax: 12,
            armorClass: 14,
            speed: 30,
            presentationHidden: true,
            isPlayerToken: true
          });

        const object =
          store.addToken({
            tokenId: 'visual-object',
            type: 'object',
            name: 'Алтарь',
            x: 28,
            y: 30,
            size: 1.6,
            rotation: 24
          });

        const shape =
          store.addShape({
            shapeId: 'visual-shape',
            type: 'square',
            x: 520,
            y: 260,
            width: 180,
            height: 130
          });

        store.updateFog({
          lockedZones: [
            {
              id: 'visual-locked-zone',
              x: 720,
              y: 230,
              width: 220,
              height: 160
            }
          ]
        });

        const tokenElement =
          createMapTokenElement(
            token
          );

        const objectElement =
          createMapTokenElement(
            object
          );

        const shapeElement =
          createMapShapeElement(
            shape
          );

        layer.append(
          tokenElement,
          objectElement,
          shapeElement
        );

        await renderMapTokenElement(
          tokenElement
        );

        await renderMapTokenElement(
          objectElement
        );

        renderMapShapeElement(
          shapeElement
        );

        renderLockedFogZones(
          map
        );

        store.commitToDOM();

        const actionDeps =
          () => ({
            applyTokenHealthState() {},
            clearDraggedToken() {},
            closeTokenPopup() {},
            openTokenPopup() {},
            async saveAndSync() {},
            selectMapShape() {}
          });

        ensureMapSelectionInspector(
          map,
          {
            closeTokenPopup() {},
            getSelectionActionDeps:
              actionDeps,
            getTokenActionDeps:
              actionDeps,
            openTokenPopup() {},
            removeSelectedCampaignMapItems,
            async saveAndSync() {},
            setStatus() {}
          }
        );

        selectMapToken(
          map.querySelector('[data-token-id="visual-token"]')
        );
      }
    );

    await attachLocatorScreenshot(
      page.locator('.campaign-map-document'),
      testInfo,
      'visual-campaign-map'
    );

    await page.evaluate(
      async () => {

        const {
          setPages
        } = await import('/js/stateActions.js');

        const {
          createKnowledgeGraphTemplate
        } = await import('/js/templates/knowledgeGraph.js');

        const {
          renderKnowledgeGraphPage
        } = await import('/js/wiki/knowledgeGraphPage.js');

        setPages([
          {
            id: 'world',
            name: 'world.md',
            path: '/pages/world.md',
            order: 1,
            title: 'World',
            parent: null,
            template: 'card',
            type: 'note',
            tags: [],
            aliases: [],
            content: '<h1>World</h1>[[Hero]]'
          },
          {
            id: 'hero',
            name: 'hero.md',
            path: '/pages/hero.md',
            order: 2,
            title: 'Hero',
            parent: 'world',
            template: 'card',
            type: 'character',
            tags: [],
            aliases: [],
            relationships: [
              {
                type: 'equipped',
                targetId: 'sword',
                label: 'Main hand'
              },
              {
                type: 'ally',
                targetId: 'guild',
                label: 'Faction'
              }
            ],
            content: '<h1>Hero</h1>'
          },
          {
            id: 'sword',
            name: 'sword.md',
            path: '/pages/sword.md',
            order: 3,
            title: 'Sword',
            parent: null,
            template: 'card',
            type: 'item',
            tags: [],
            aliases: [],
            content: '<h1>Sword</h1>'
          },
          {
            id: 'guild',
            name: 'guild.md',
            path: '/pages/guild.md',
            order: 4,
            title: 'Guild',
            parent: null,
            template: 'card',
            type: 'note',
            tags: [
              'organization'
            ],
            aliases: [],
            content: '<h1>Guild</h1>'
          }
        ]);

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createKnowledgeGraphTemplate().content;

        renderKnowledgeGraphPage(
          editor
        );

        const stage =
          editor.querySelector('[data-knowledge-graph-canvas-stage]');

        const world =
          stage?.querySelector('[data-knowledge-graph-canvas-world]');

        if (stage && world) {

          stage.dataset.scale =
            '0.72';

          stage.dataset.panX =
            '82';

          stage.dataset.panY =
            '96';

          world.style.transform =
            'translate(82px, 96px) scale(0.72)';
        }
      }
    );

    await expect(
      page.locator('.knowledge-graph-workbench')
    ).toBeVisible();

    await attachLocatorScreenshot(
      page.locator('.knowledge-graph-document'),
      testInfo,
      'visual-knowledge-graph'
    );

    const graphHeroCard =
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="hero"]');

    await expect(
      graphHeroCard
    ).toBeVisible();

    await graphHeroCard.click({
      button:
        'right'
    });

    await expect(
      page.locator('[data-knowledge-graph-node-menu]')
    ).toBeVisible();

    await attachLocatorScreenshot(
      page.locator('[data-knowledge-graph-node-menu]'),
      testInfo,
      'visual-knowledge-graph-node-menu'
    );

    await page.evaluate(
      async () => {

        const {
          createTaskTrackerTemplate
        } = await import('/js/templates/taskTracker.js');

        const {
          renderTaskTracker
        } = await import('/js/taskTracker/taskTrackerRender.js');

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createTaskTrackerTemplate().content;

        renderTaskTracker(
          editor
        );
      }
    );

    await attachLocatorScreenshot(
      page.locator('.task-tracker-document'),
      testInfo,
      'visual-task-tracker'
    );

    await page.locator('#appToolsBtn').click();

    await page
      .locator('[data-onboarding-open="support"]')
      .click();

    await expect(
      page.locator('#onboardingPopup[data-help-ui-migration="0.0.1.8.14.3"]')
    ).toBeVisible();

    await attachLocatorScreenshot(
      page.locator('#onboardingPopup'),
      testInfo,
      'visual-help-support'
    );

    await page.locator('#onboardingCloseBtn').click();

    await page.locator('#appToolsBtn').click();

    await page.evaluate(
      async () => {

        const {
          setStorageAdapter
        } = await import('/js/storage/storageAdapter.js');

        setStorageAdapter({
          kind:
            'browser',
          getWorkspaceHandle() {
            return {
              name:
                'Visual package workspace'
            };
          },
          async pickWorkspace() {
            return this.getWorkspaceHandle();
          },
          async restoreWorkspace() {
            return this.getWorkspaceHandle();
          },
          async ensureDirectory() {},
          async getDirectoryHandle() {
            return {};
          },
          async readText() {
            return '';
          },
          async writeText() {},
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
      }
    );

    await page
      .locator('[data-world-package-open="true"]')
      .click();

    await expect(
      page.locator('#worldPackagePopup[data-world-package-ui-migration="0.0.1.8.14.7"]')
    ).toBeVisible();

    await attachLocatorScreenshot(
      page.locator('#worldPackagePopup'),
      testInfo,
      'visual-world-packages'
    );

    await page
      .locator('#worldPackagePopup .app-popup-close')
      .click();

    await page.locator('#appToolsBtn').click();

    await page
      .locator('[data-component-catalogue-open="true"]')
      .click();

    await expect(
      page.locator('#componentCataloguePopover')
    ).toBeVisible();

    await attachLocatorScreenshot(
      page.locator('#componentCataloguePopover'),
      testInfo,
      'visual-component-catalogue-popover'
    );
  }
);


test(
  'visual-theme-scale-captures-workbench-baselines',
  async ({ page }, testInfo) => {

    await page.addInitScript(
      () => {

        localStorage.setItem(
          'my-own-world:app-shell-sidebar-state',
          'expanded'
        );

        localStorage.setItem(
          'my-own-world:app-shell-sidebar-width',
          '292'
        );
      }
    );

    await page.goto(
      '/'
    );

    await prepareThemeScaleWorkbench(
      page
    );

    for (const baseline of THEME_SCALE_BASELINE_CASES) {

      await page.setViewportSize(
        baseline.viewport
      );

      await applyThemeScaleAppearance(
        page,
        baseline.appearance
      );

      await expect(
        page.locator('body')
      ).toHaveAttribute(
        'data-theme',
        baseline.appearance.theme
      );

      await expect(
        page.locator('body')
      ).toHaveAttribute(
        'data-ui-scale',
        baseline.appearance.scale
      );

      await expect(
        page.locator('.app[data-visual-theme-scale-baseline="0.0.1.8.15.3"]')
      ).toBeVisible();

      await expect(
        page.locator('.tree-item').first()
      ).toBeVisible();

      await expect(
        page.locator('.editor-surface')
      ).toBeVisible();

      const metrics =
        await getThemeScaleWorkbenchMetrics(
          page
        );

      expect(
        metrics.bodyHasHorizontalOverflow,
        JSON.stringify(metrics, null, 2)
      ).toBe(
        false
      );

      expect(
        metrics.appHasHorizontalOverflow,
        JSON.stringify(metrics, null, 2)
      ).toBe(
        false
      );

      expect(
        metrics.editorWidth
      ).toBeGreaterThanOrEqual(
        baseline.minEditorWidth
      );

      expect(
        metrics.sidebarState
      ).toBe(
        'expanded'
      );

      expect(
        metrics.rightPanelState
      ).toBe(
        'hidden'
      );

      expect(
        metrics.focusToken
      ).not.toBe(
        ''
      );

      expect(
        metrics.surfaceToken
      ).not.toBe(
        ''
      );

      expect(
        metrics.visibleShellControls
      ).toBeGreaterThanOrEqual(
        4
      );

      await attachScreenshot(
        page,
        testInfo,
        baseline.attachment
      );
    }
  }
);


test(
  'visual-design-system-captures-fixed-viewport-state-matrix',
  async ({ page }, testInfo) => {

    for (const baseline of DESIGN_SYSTEM_FIXED_VIEWPORT_CASES) {

      await page.addInitScript(
        () => {

          localStorage.setItem(
            'my-own-world:app-shell-sidebar-state',
            'expanded'
          );

          localStorage.setItem(
            'my-own-world:app-shell-sidebar-width',
            '292'
          );
        }
      );

      await page.setViewportSize(
        baseline.viewport
      );

      await page.goto(
        '/'
      );

      await applyThemeScaleAppearance(
        page,
        baseline.appearance
      );

      await prepareDesignSystemFixedViewportSurface(
        page,
        baseline.kind
      );

      const metrics =
        await getDesignSystemFixedViewportMetrics(
          page,
          baseline.kind
        );

      expect(
        metrics.bodyHasHorizontalOverflow,
        JSON.stringify(metrics, null, 2)
      ).toBe(
        false
      );

      expect(
        metrics.appHasHorizontalOverflow,
        JSON.stringify(metrics, null, 2)
      ).toBe(
        false
      );

      expect(
        metrics.theme
      ).toBe(
        baseline.appearance.theme
      );

      expect(
        metrics.scale
      ).toBe(
        baseline.appearance.scale
      );

      expect(
        metrics.visualBaseline
      ).toBe(
        '0.0.1.8.16'
      );

      expect(
        metrics.visibleSurfaceCount
      ).toBeGreaterThanOrEqual(
        1
      );

      expect(
        metrics.unlabeledIconButtonCount
      ).toBe(
        0
      );

      expectDesignSystemFixedViewportMetrics(
        baseline.kind,
        metrics
      );

      if (baseline.locator) {

        await attachLocatorScreenshot(
          page.locator(baseline.locator),
          testInfo,
          baseline.attachment
        );

      } else {

        await attachScreenshot(
          page,
          testInfo,
          baseline.attachment
        );
      }
    }
  }
);

test(
  'visual-task-tracker-structural-icon-only-state',
  async ({ page }, testInfo) => {

    const baseline =
      DESIGN_SYSTEM_FIXED_VIEWPORT_CASES.find(item =>
        item.kind === 'task-empty'
      );

    await page.addInitScript(
      () => {

        localStorage.setItem(
          'my-own-world:app-shell-sidebar-state',
          'expanded'
        );

        localStorage.setItem(
          'my-own-world:app-shell-sidebar-width',
          '292'
        );
      }
    );

    await page.setViewportSize(
      baseline.viewport
    );

    await page.goto(
      '/'
    );

    await applyThemeScaleAppearance(
      page,
      baseline.appearance
    );

    await prepareDesignSystemFixedViewportSurface(
      page,
      baseline.kind
    );

    const metrics =
      await getDesignSystemFixedViewportMetrics(
        page,
        baseline.kind
      );

    expectDesignSystemFixedViewportMetrics(
      baseline.kind,
      metrics
    );

    await attachLocatorScreenshot(
      page.locator(baseline.locator),
      testInfo,
      baseline.attachment
    );
  }
);

test(
  'visual-owner-completion-captures-primary-secondary-evidence',
  async ({ page }, testInfo) => {

    await page.addInitScript(
      () => {

        localStorage.setItem(
          'my-own-world:app-shell-sidebar-state',
          'expanded'
        );

        localStorage.setItem(
          'my-own-world:app-shell-sidebar-width',
          '292'
        );
      }
    );

    for (const baseline of OWNER_VISUAL_COMPLETION_CASES) {

      await page.setViewportSize(
        baseline.viewport
      );

      await page.goto(
        '/'
      );

      await applyThemeScaleAppearance(
        page,
        baseline.appearance
      );

      await prepareDesignSystemFixedViewportSurface(
        page,
        baseline.kind
      );

      await page.evaluate(
        () => {

          const app =
            document.querySelector('.app');

          if (app) {

            app.dataset.visualDesignSystemBaseline =
              '0.0.1.8.17';
          }
        }
      );

      const metrics =
        await getDesignSystemFixedViewportMetrics(
          page,
          baseline.kind
        );

      expect(
        metrics.bodyHasHorizontalOverflow,
        JSON.stringify(metrics, null, 2)
      ).toBe(
        false
      );

      expect(
        metrics.appHasHorizontalOverflow,
        JSON.stringify(metrics, null, 2)
      ).toBe(
        false
      );

      expect(
        metrics.theme
      ).toBe(
        baseline.appearance.theme
      );

      expect(
        metrics.scale
      ).toBe(
        baseline.appearance.scale
      );

      expect(
        metrics.visualBaseline
      ).toBe(
        '0.0.1.8.17'
      );

      expect(
        metrics.unlabeledIconButtonCount,
        JSON.stringify(metrics, null, 2)
      ).toBe(
        0
      );

      expectDesignSystemFixedViewportMetrics(
        baseline.kind,
        metrics
      );

      if (baseline.locator) {

        await attachLocatorScreenshot(
          page.locator(baseline.locator),
          testInfo,
          baseline.attachment
        );

      } else {

        await attachScreenshot(
          page,
          testInfo,
          baseline.attachment
        );
      }
    }
  }
);


test(
  'card-editor-core-content-controls-use-shared-ui-contract',
  async ({ page }) => {

    await page.setViewportSize({
      width: 980,
      height: 680
    });

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            createCardShellTemplate
          } = await import('/js/templates/cardShell.js');

          const {
            createImageBlock,
            createListBlock,
            createPropertiesBlock,
            createTableBlock,
            createTextBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCustomBlocks,
            setupCustomBlocks
          } = await import('/js/editor/customBlocks.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            renderBackButtonIfNeeded
          } = await import('/js/editor/editorNavigation.js');

          const {
            positionToolbar
          } = await import('/js/editor/toolbarPosition.js');

          const {
            renderCardType
          } = await import('/js/ui/cardType.js');

          const {
            state
          } = await import('/js/state.js');

          const editor =
            document.querySelector('#editorArea');

          state.currentPage = {
            id: 'visual-card-contract',
            name: 'Visual card contract',
            type: 'location',
            tags: [
              'card',
              'location'
            ],
            aliases: []
          };

          state.pages = [
            state.currentPage
          ];

          editor.innerHTML =
            createCardShellTemplate().content;

          editor.querySelector('h1').textContent =
            'Гавань Серых Башен';

          editor.querySelector('.card-short-description').textContent =
            'Опорная карточка для проверки интерфейса редактора.';

          const main =
            editor.querySelector('.entity-main');

          main.insertAdjacentHTML(
            'beforeend',
            [
              createTextBlock({
                title: 'Заметки',
                placeholder: 'Текст сцены'
              }),
              createListBlock({
                title: 'Зацепки',
                kind: 'items'
              }),
              createTableBlock({
                title: 'Таблица слухов',
                rows: 2,
                columns: 2
              }),
              createImageBlock(),
              createPropertiesBlock({
                title: 'Свойства',
                cardType: 'location'
              })
            ].join('')
          );

          setupCustomBlocks(
            editor,
            () => {}
          );

          applyBlockSystemContract(
            editor
          );

          renderCustomBlocks(
            editor
          );

          renderCardType();

          renderBackButtonIfNeeded(
            editor,
            {
              template: 'card',
              type: 'location'
            },
            () => {}
          );

          const toolbar =
            document.querySelector('#floatingToolbar');

          toolbar.classList.remove(
            'hidden'
          );

          const nav =
            editor.querySelector('.editor-page-nav');

          const findButton =
            nav.querySelector('.editor-find-tree-button');

          const title =
            editor.querySelector('.hero-block h1');

          positionToolbar(
            toolbar,
            title.getBoundingClientRect()
          );

          const toolbarRect =
            toolbar.getBoundingClientRect();

          const titleRect =
            title.getBoundingClientRect();

          const toolbarStyle =
            getComputedStyle(
              toolbar
            );

          const titleStyle =
            getComputedStyle(
              title
            );

          const cardTypeTrigger =
            editor.querySelector('.card-type-trigger');

          const cardTypeStyle =
            getComputedStyle(
              cardTypeTrigger
            );

          const textBlock =
            editor.querySelector('[data-block-type="text"]');

          const listBlock =
            editor.querySelector('[data-block-type="list"]');

          const listKindSelect =
            listBlock.querySelector('.universal-list-kind-select');

          const tableBlock =
            editor.querySelector('[data-block-type="table"]');

          const imageBlock =
            editor.querySelector('[data-block-type="image"]');

          const propertiesField =
            editor.querySelector('.card-property-field[data-property-id]');

          const blockStyle =
            getComputedStyle(
              textBlock
            );

          const textBadgeStyle =
            getComputedStyle(
              textBlock.querySelector('.block-kind-badge')
            );

          const listBadgeStyle =
            getComputedStyle(
              listBlock.querySelector('.block-kind-badge')
            );

          const listKindSelectStyle =
            getComputedStyle(
              listKindSelect
            );

          const tableBadgeStyle =
            getComputedStyle(
              tableBlock.querySelector('.block-kind-badge')
            );

          const imageFrameStyle =
            getComputedStyle(
              imageBlock.querySelector('.image-block-frame')
            );

          const propertiesFieldStyle =
            getComputedStyle(
              propertiesField
            );

          return {
            rootMigration:
              document
                .querySelector('.app')
                .dataset
                .coreContentMigration,
            toolbarRole:
              toolbar.getAttribute('role'),
            toolbarParentTag:
              toolbar.parentElement.tagName,
            toolbarLabel:
              toolbar.getAttribute('aria-label'),
            toolbarWidth:
              Math.round(toolbarRect.width),
            toolbarTitleGap:
              Math.round(titleRect.top - toolbarRect.bottom),
            toolbarRadius:
              Number.parseFloat(toolbarStyle.borderRadius),
            toolbarBackdrop:
              toolbarStyle.backdropFilter || toolbarStyle.webkitBackdropFilter,
            buttonsWithoutLabels:
              [
                ...toolbar.querySelectorAll('button')
              ].filter(button => !button.getAttribute('aria-label')).length,
            findButtonLabel:
              findButton.getAttribute('aria-label'),
            findIcon:
              findButton
                .querySelector('.editor-nav-icon')
                ?.dataset
                .iconName,
            titleLetterSpacing:
              titleStyle.letterSpacing,
            titleFontSize:
              Number.parseFloat(titleStyle.fontSize),
            cardTypeRadius:
              Number.parseFloat(cardTypeStyle.borderRadius),
            blockLabels:
              [
                ...editor.querySelectorAll('.block-kind-label')
              ].map(label => label.textContent.trim()),
            blockIconNames:
              [
                ...editor.querySelectorAll('.block-kind-badge .app-icon')
              ].map(icon => icon.dataset.iconName),
            blockRuntimeBadges:
              editor.querySelectorAll('.block-kind-badge[data-runtime="true"]').length,
            blockRadius:
              Number.parseFloat(blockStyle.borderRadius),
            blockBorder:
              blockStyle.borderColor,
            textBadgeColor:
              textBadgeStyle.color,
            listBadgeColor:
              listBadgeStyle.color,
            listSelectRadius:
              Number.parseFloat(listKindSelectStyle.borderRadius),
            listSelectBg:
              listKindSelectStyle.backgroundColor,
            listSelectArrow:
              listKindSelectStyle.backgroundImage,
            listSelectColorScheme:
              listKindSelectStyle.colorScheme,
            tableBadgeColor:
              tableBadgeStyle.color,
            imageFrameRadius:
              Number.parseFloat(imageFrameStyle.borderRadius),
            propertiesFieldBackground:
              propertiesFieldStyle.backgroundColor
          };
        }
      );

    expect(
      result.rootMigration
    ).toBe(
      '0.0.1.8.11.7'
    );

    expect(
      result.toolbarRole
    ).toBe(
      'toolbar'
    );

    expect(
      result.toolbarParentTag
    ).toBe(
      'BODY'
    );

    expect(
      result.toolbarLabel
    ).toBe(
      'Форматирование текста'
    );

    expect(
      result.toolbarWidth
    ).toBe(
      454
    );

    expect(
      result.toolbarTitleGap
    ).toBeGreaterThanOrEqual(
      8
    );

    expect(
      result.toolbarRadius
    ).toBeLessThanOrEqual(
      8
    );

    expect(
      result.toolbarBackdrop
    ).toBe(
      'none'
    );

    expect(
      result.buttonsWithoutLabels
    ).toBe(
      0
    );

    expect(
      result.findButtonLabel
    ).toBe(
      'Найти в дереве'
    );

    expect(
      result.findIcon
    ).toBe(
      'search'
    );

    expect(
      result.titleLetterSpacing
    ).toBe(
      'normal'
    );

    expect(
      result.titleFontSize
    ).toBeGreaterThanOrEqual(
      30
    );

    expect(
      result.cardTypeRadius
    ).toBeLessThanOrEqual(
      8
    );

    expect(
      result.blockLabels
    ).toEqual(
      [
        'Текст',
        'Текст',
        'Список',
        'Таблица',
        'Изображение',
        'Свойства'
      ]
    );

    expect(
      result.blockIconNames
    ).toEqual(
      [
        'document',
        'document',
        'grid',
        'grid',
        'image',
        'hash'
      ]
    );

    expect(
      result.blockRuntimeBadges
    ).toBe(
      6
    );

    expect(
      result.blockRadius
    ).toBeLessThanOrEqual(
      8
    );

    expect(
      result.blockBorder
    ).not.toBe(
      'rgba(0, 0, 0, 0)'
    );

    expect(
      result.textBadgeColor
    ).not.toBe(
      result.listBadgeColor
    );

    expect(
      result.listSelectRadius
    ).toBeLessThanOrEqual(
      8
    );

    expect(
      result.listSelectBg
    ).not.toBe(
      'rgb(255, 255, 255)'
    );

    expect(
      result.listSelectArrow
    ).toContain(
      'linear-gradient'
    );

    expect(
      result.listSelectColorScheme
    ).toBe(
      'dark'
    );

    expect(
      result.tableBadgeColor
    ).not.toBe(
      result.textBadgeColor
    );

    expect(
      result.imageFrameRadius
    ).toBeLessThanOrEqual(
      8
    );

    expect(
      result.propertiesFieldBackground
    ).toBe(
      'rgba(0, 0, 0, 0)'
    );
  }
);


test(
  'visual-layout-guards-common-regressions',
  async ({ page }) => {

    await page.setViewportSize({
      width: 760,
      height: 560
    });

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            positionPopupAtPoint
          } = await import('/js/ui/popupPosition.js');

          const {
            createMapShapeElement,
            createMapTokenElement
          } = await import('/js/editor/campaignMapElementFactory.js');

          const {
            getCampaignMapStore
          } = await import('/js/editor/campaignMapStore.js');

          const {
            renderLockedFogZones
          } = await import('/js/editor/campaignMapFog.js');

          const {
            startCampaignMapSelectionBox,
            moveCampaignMapSelectionBox,
            finishCampaignMapSelectionBox
          } = await import('/js/editor/campaignMapSelectionBox.js');

          const popup =
            document.createElement('div');

          popup.className =
            'campaign-map-popup';

          popup.style.position =
            'fixed';

          popup.style.width =
            '320px';

          popup.style.height =
            '220px';

          document.body.appendChild(
            popup
          );

          positionPopupAtPoint(
            popup,
            740,
            540,
            {
              fallbackWidth: 320,
              fallbackHeight: 220
            }
          );

          const popupRect =
            popup.getBoundingClientRect();

          const toolbar =
            document.querySelector('#floatingToolbar');

          toolbar.classList.remove(
            'hidden'
          );

          toolbar.style.left =
            '380px';

          toolbar.style.top =
            '40px';

          const toolbarWidthBefore =
            toolbar.getBoundingClientRect().width;

          document.querySelector('#editorArea').innerHTML = `
            <div
              class="campaign-map-document"
              data-campaign-map="v1"
              contenteditable="false"
            >
              <div
                class="campaign-map-stage"
                data-grid="true"
                data-fog-mode="draw"
                data-fog-image=""
                data-view-zoom="1"
                contenteditable="false"
                style="width: 700px; height: 420px;"
              >
                <div class="campaign-map-viewport" style="width: 2000px; height: 1200px;">
                  <div class="campaign-map-background"></div>
                  <div class="campaign-map-object-layer"></div>
                  <canvas class="campaign-map-fog-canvas"></canvas>
                </div>
              </div>
            </div>
          `;

          const map =
            document.querySelector('.campaign-map-document');

          const stage =
            map.querySelector('.campaign-map-stage');

          const layer =
            map.querySelector('.campaign-map-object-layer');

          const fog =
            map.querySelector('.campaign-map-fog-canvas');

          const store =
            getCampaignMapStore(
              map
            );

          const selectedToken =
            store.addToken({
              tokenId: 'selected-token',
              type: 'creature',
              name: 'Воин',
              x: 5,
              y: 8,
              size: 1,
              presentationHidden: true
            });

          const outsideToken =
            store.addToken({
              tokenId: 'outside-token',
              type: 'creature',
              name: 'Дальше',
              x: 80,
              y: 80,
              size: 1
            });

          const selectedShape =
            store.addShape({
              shapeId: 'selected-shape',
              type: 'square',
              x: 160,
              y: 140,
              width: 90,
              height: 70
            });

          store.updateFog({
            lockedZones: [
              {
                id: 'visual-zone',
                x: 260,
                y: 150,
                width: 130,
                height: 90
              }
            ]
          });

          layer.append(
            createMapTokenElement(
              selectedToken
            ),
            createMapTokenElement(
              outsideToken
            ),
            createMapShapeElement(
              selectedShape
            )
          );

          renderLockedFogZones(
            map
          );

          store.commitToDOM();

          const selectionEvent =
            (clientX, clientY) => ({
              clientX,
              clientY,
              preventDefault() {},
              stopPropagation() {}
            });

          const stageRect =
            stage.getBoundingClientRect();

          startCampaignMapSelectionBox(
            selectionEvent(
              stageRect.left + 20,
              stageRect.top + 20
            ),
            stage
          );

          moveCampaignMapSelectionBox(
            selectionEvent(
              stageRect.left + 360,
              stageRect.top + 260
            )
          );

          finishCampaignMapSelectionBox(
            selectionEvent(
              stageRect.left + 360,
              stageRect.top + 260
            )
          );

          const token =
            map.querySelector('[data-token-id="selected-token"]');

          const hiddenBadgeContent =
            getComputedStyle(
              token,
              '::before'
            ).content;

          const hiddenBadgeFont =
            getComputedStyle(
              token,
              '::before'
            ).fontSize;

          const toolbarWidthAfter =
            toolbar.getBoundingClientRect().width;

          return {
            popupInsideViewport:
              popupRect.left >= 0 &&
              popupRect.top >= 0 &&
              popupRect.right <= window.innerWidth &&
              popupRect.bottom <= window.innerHeight,
            toolbarWidthBefore,
            toolbarWidthAfter,
            selectedToken:
              token.classList.contains('is-selected'),
            outsideToken:
              map
                .querySelector('[data-token-id="outside-token"]')
                .classList.contains('is-selected'),
            selectedShape:
              map
                .querySelector('[data-shape-id="selected-shape"]')
                .classList.contains('is-selected'),
            fogZIndex:
              Number(getComputedStyle(fog).zIndex),
            tokenZIndex:
              Number(getComputedStyle(token).zIndex),
            lockedZoneZIndex:
              Number(getComputedStyle(
                map.querySelector('.campaign-fog-locked-zone')
              ).zIndex),
            hiddenBadgeContent,
            hiddenBadgeFont
          };
        }
      );

    expect(
      result.popupInsideViewport
    ).toBe(
      true
    );

    expect(
      Math.round(result.toolbarWidthBefore)
    ).toBe(
      454
    );

    expect(
      Math.round(result.toolbarWidthAfter)
    ).toBe(
      Math.round(result.toolbarWidthBefore)
    );

    expect(
      result.selectedToken
    ).toBe(
      true
    );

    expect(
      result.selectedShape
    ).toBe(
      true
    );

    expect(
      result.outsideToken
    ).toBe(
      false
    );

    expect(
      result.fogZIndex
    ).toBeGreaterThan(
      result.tokenZIndex
    );

    expect(
      result.lockedZoneZIndex
    ).toBeGreaterThan(
      result.fogZIndex
    );

    expect(
      result.hiddenBadgeContent
    ).toContain(
      'скрыт'
    );

    expect(
      Number.parseFloat(result.hiddenBadgeFont)
    ).toBeLessThanOrEqual(
      9
    );
  }
);


async function prepareThemeScaleWorkbench(
  page
) {

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

      const {
        createCardShellTemplate
      } = await import('/js/templates/cardShell.js');

      const {
        createListBlock,
        createPropertiesBlock,
        createTableBlock,
        createTextBlock
      } = await import('/js/templates/blockTypes.js');

      const {
        applyBlockSystemContract
      } = await import('/js/editor/blocks/blockContract.js');

      const {
        renderCustomBlocks,
        setupCustomBlocks
      } = await import('/js/editor/customBlocks.js');

      const {
        renderCardType
      } = await import('/js/ui/cardType.js');

      const pages = [
        {
          id: 'theme-scale-root',
          name: 'theme-scale-root.md',
          title: 'Северные рубежи',
          order: 1,
          template: 'card',
          type: 'folder',
          tags: [
            'folder'
          ],
          content: '<h1>Северные рубежи</h1>'
        },
        {
          id: 'theme-scale-page',
          name: 'theme-scale-city.md',
          title: 'Гавань Серых Башен',
          parent: 'theme-scale-root',
          order: 1,
          template: 'card',
          type: 'location',
          tags: [
            'card',
            'location'
          ],
          content: '<h1>Гавань Серых Башен</h1>'
        },
        {
          id: 'theme-scale-npc',
          name: 'theme-scale-envoy.md',
          title: 'Посланница гавани',
          parent: 'theme-scale-root',
          order: 2,
          template: 'card',
          type: 'character',
          tags: [
            'card',
            'character'
          ],
          content: '<h1>Посланница гавани</h1>'
        }
      ];

      setWorkspaceHandle({
        name: 'Гавань Серых Башен'
      });

      setPages(
        pages
      );

      setCurrentPage(
        pages[1]
      );

      renderTree();

      const app =
        document.querySelector('.app');

      app.dataset.visualThemeScaleBaseline =
        '0.0.1.8.15.3';

      app.dataset.sidebarState =
        'expanded';

      app.dataset.rightPanelState =
        'hidden';

      app.style.setProperty(
        '--mow-shell-sidebar-width',
        '292px'
      );

      const rightPanel =
        document.getElementById('appRightPanel');

      rightPanel?.classList.add(
        'hidden'
      );

      rightPanel?.setAttribute(
        'aria-hidden',
        'true'
      );

      rightPanel?.replaceChildren();

      const editor =
        document.querySelector('#editorArea');

      editor.innerHTML =
        createCardShellTemplate().content;

      editor.querySelector('h1').textContent =
        'Гавань Серых Башен';

      editor.querySelector('.card-short-description').textContent =
        'Опорная карточка города: заметки, зацепки и свойства остаются рядом с текстом.';

      const main =
        editor.querySelector('.entity-main');

      main.insertAdjacentHTML(
        'beforeend',
        [
          createTextBlock({
            title: 'Заметки сцены',
            placeholder: 'Короткие заметки'
          }),
          createListBlock({
            title: 'Зацепки сцены',
            kind: 'items'
          }),
          createTableBlock({
            title: 'Сигналы',
            rows: 2,
            columns: 2
          }),
          createPropertiesBlock({
            title: 'Свойства города',
            cardType: 'location'
          })
        ].join('')
      );

      editor
        .querySelectorAll('.rich-text-field')
        .forEach((field, index) => {

          field.textContent =
            index === 0
              ? 'Портовый совет закрывает ворота после второго колокола.'
              : 'Складские метки, слухи и поручения держатся в одном рабочем ритме.';
        });

      setupCustomBlocks(
        editor,
        () => {}
      );

      applyBlockSystemContract(
        editor
      );

      renderCustomBlocks(
        editor
      );

      renderCardType();
    }
  );
}


async function applyThemeScaleAppearance(
  page,
  appearance
) {

  await page.evaluate(
    async value => {

      const {
        applyAppearance
      } = await import('/js/ui/themeManager.js');

      applyAppearance(
        value
      );
    },
    appearance
  );
}


async function getThemeScaleWorkbenchMetrics(
  page
) {

  return page.evaluate(
    () => {

      const app =
        document.querySelector('.app');

      const editorSurface =
        document.querySelector('.editor-surface');

      const style =
        getComputedStyle(
          document.body
        );

      const visibleShellControls =
        [
          ...document.querySelectorAll(
            '.app-nav-rail button, .tree-root-action, #appSettingsBtn, #appToolsBtn'
          )
        ].filter(control => {

          const rect =
            control.getBoundingClientRect();

          const controlStyle =
            getComputedStyle(
              control
            );

          return (
            rect.width > 0 &&
            rect.height > 0 &&
            controlStyle.display !== 'none' &&
            controlStyle.visibility !== 'hidden'
          );
        }).length;

      const viewportRight =
        window.innerWidth;

      const overflowElements =
        [
          ...document.body.querySelectorAll('*')
        ].map(element => {

          const rect =
            element.getBoundingClientRect();

          return {
            className:
              String(element.className || ''),
            id:
              element.id || '',
            rectRight:
              Math.round(rect.right),
            tagName:
              element.tagName.toLowerCase()
          };
        }).filter(item =>
          item.rectRight > viewportRight + 1
        ).sort((a, b) =>
          b.rectRight - a.rectRight
        ).slice(0, 8);

      const appChildren =
        app
          ? [
            ...app.children
          ].map(element => {

            const rect =
              element.getBoundingClientRect();

            return {
              className:
                String(element.className || ''),
              clientWidth:
                element.clientWidth,
              id:
                element.id || '',
              rectWidth:
                Math.round(rect.width),
              scrollWidth:
                element.scrollWidth,
              tagName:
                element.tagName.toLowerCase()
            };
          })
          : [];

      return {
        appBoxSizing:
          app
            ? getComputedStyle(app).boxSizing
            : '',
        appClientWidth:
          app?.clientWidth || 0,
        appHasHorizontalOverflow:
          app
            ? app.scrollWidth > app.clientWidth + 1
            : true,
        appOffsetWidth:
          app?.offsetWidth || 0,
        appScrollWidth:
          app?.scrollWidth || 0,
        bodyHasHorizontalOverflow:
          Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth
          ) > window.innerWidth + 1,
        bodyScrollWidth:
          document.body.scrollWidth,
        documentScrollWidth:
          document.documentElement.scrollWidth,
        editorWidth:
          editorSurface?.getBoundingClientRect().width || 0,
        focusToken:
          style.getPropertyValue('--mow-focus-ring').trim(),
        appChildren,
        overflowElements,
        rightPanelState:
          app?.dataset.rightPanelState || '',
        sidebarState:
          app?.dataset.sidebarState || '',
        surfaceToken:
          style.getPropertyValue('--mow-surface-raised').trim(),
        viewportWidth:
          window.innerWidth,
        visibleShellControls
      };
    }
  );
}


async function prepareDesignSystemFixedViewportSurface(
  page,
  kind
) {

  if (kind === 'shell-states') {

    await page.evaluate(
      async () => {

        const {
          renderEmptyEditor
        } = await import('/js/editor/editor.js');

        const {
          renderTree
        } = await import('/js/tree/tree.js');

        const {
          finishProgressStatus,
          setProgressStatus,
          setSaveStatus
        } = await import('/js/ui/ui.js');

        const app =
          document.querySelector('.app');

        if (app) {

          app.dataset.visualDesignSystemBaseline =
            '0.0.1.8.16';
        }

        renderEmptyEditor();
        renderTree();

        setProgressStatus({
          label:
            'Проверка рабочей папки',
          current:
            5,
          total:
            12,
          stage:
            'Синхронизация состояния',
          elapsedMs:
            1320
        });

        finishProgressStatus(
          'Проверка требует внимания',
          {
            status:
              'failed',
            delayMs:
              60000
          }
        );

        setSaveStatus(
          'error',
          'Не удалось сохранить изменения'
        );
      }
    );

    await expect(
      page.locator('[data-app-shell-surface="empty-workspace"]')
    ).toBeVisible();

    await expect(
      page.locator('.tree-empty-workspace')
    ).toBeVisible();

    await expect(
      page.locator('.operation-progress')
    ).toHaveClass(
      /is-failed/
    );

    return;
  }

  if (kind === 'editor-properties') {

    await prepareThemeScaleWorkbench(
      page
    );

    await page.evaluate(
      () => {

        const app =
          document.querySelector('.app');

        if (app) {

          app.dataset.visualDesignSystemBaseline =
            '0.0.1.8.16';
        }
      }
    );

    await expect(
      page.locator('.editor-surface')
    ).toBeVisible();

    await expect(
      page.locator('.card-properties-block')
    ).toBeVisible();

    return;
  }

  if (kind === 'map-popup') {

    await page.evaluate(
      async () => {

        const {
          createCampaignMapTemplate
        } = await import('/js/templates/campaignMap.js');

        const {
          renderCampaignMap
        } = await import('/js/editor/campaignMap.js');

        const {
          refreshCampaignMapStore
        } = await import('/js/editor/campaignMapStore.js');

        const {
          createMapShapeElement,
          createMapTokenElement
        } = await import('/js/editor/campaignMapElementFactory.js');

        const {
          renderMapShapeElement,
          renderMapTokenElement
        } = await import('/js/editor/campaignMapRenderer.js');

        const {
          renderLockedFogZones
        } = await import('/js/editor/campaignMapFog.js');

        const {
          selectMapToken
        } = await import('/js/editor/campaignMapRuntime.js');

        const {
          openGridPopup
        } = await import('/js/editor/campaignMapToolbarController.js');

        const app =
          document.querySelector('.app');

        if (app) {

          app.dataset.visualDesignSystemBaseline =
            '0.0.1.8.16';
        }

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createCampaignMapTemplate().content;

        const map =
          editor.querySelector('.campaign-map-document');

        map.querySelector('.campaign-map-title').textContent =
          'Перевал Черного Камня';

        const stage =
          map.querySelector('.campaign-map-stage');

        const viewport =
          map.querySelector('.campaign-map-viewport');

        stage.style.height =
          '560px';

        stage.dataset.grid =
          'true';

        stage.dataset.viewZoom =
          '1';

        viewport.style.width =
          '1900px';

        viewport.style.height =
          '1100px';

        await renderCampaignMap(
          editor
        );

        const layer =
          map.querySelector('.campaign-map-object-layer');

        const store =
          refreshCampaignMapStore(
            map
          );

        const token =
          store.addToken({
            tokenId:
              'ds-map-token',
            type:
              'creature',
            name:
              'Дозорный',
            x:
              16,
            y:
              18,
            size:
              1,
            hp:
              8,
            hpMax:
              12,
            armorClass:
              14,
            presentationHidden:
              true,
            isPlayerToken:
              true
          });

        const shape =
          store.addShape({
            shapeId:
              'ds-map-shape',
            type:
              'square',
            x:
              480,
            y:
              240,
            width:
              170,
            height:
              120,
            rotation:
              18
          });

        store.updateFog({
          lockedZones: [
            {
              id:
                'ds-map-fog',
              x:
                700,
              y:
                230,
              width:
                220,
              height:
                150
            }
          ]
        });

        const tokenElement =
          createMapTokenElement(
            token
          );

        const shapeElement =
          createMapShapeElement(
            shape
          );

        layer.append(
          tokenElement,
          shapeElement
        );

        await renderMapTokenElement(
          tokenElement
        );

        renderMapShapeElement(
          shapeElement
        );

        renderLockedFogZones(
          map
        );

        store.commitToDOM();

        selectMapToken(
          tokenElement
        );

        openGridPopup(
          map,
          map.querySelector('.campaign-grid-btn'),
          {
            async saveAndSync() {}
          }
        );
      }
    );

    await expect(
      page.locator('.campaign-map-document')
    ).toBeVisible();

    await expect(
      page.locator('#campaignMapPopup')
    ).toBeVisible();

    await expect(
      page.locator('.campaign-map-properties-panel')
    ).toBeVisible();

    return;
  }

  if (kind === 'graph-overlay') {

    await page.evaluate(
      async () => {

        const {
          setPages
        } = await import('/js/stateActions.js');

        const {
          createKnowledgeGraphTemplate
        } = await import('/js/templates/knowledgeGraph.js');

        const {
          renderKnowledgeGraphPage
        } = await import('/js/wiki/knowledgeGraphPage.js');

        const app =
          document.querySelector('.app');

        if (app) {

          app.dataset.visualDesignSystemBaseline =
            '0.0.1.8.16';
        }

        setPages([
          {
            id:
              'world',
            name:
              'world.md',
            path:
              '/pages/world.md',
            order:
              1,
            title:
              'Северные рубежи',
            parent:
              null,
            template:
              'card',
            type:
              'note',
            tags:
              [],
            aliases:
              [],
            content:
              '<h1>Северные рубежи</h1>[[Разведчица]]'
          },
          {
            id:
              'hero',
            name:
              'hero.md',
            path:
              '/pages/hero.md',
            order:
              2,
            title:
              'Разведчица',
            parent:
              'world',
            template:
              'card',
            type:
              'character',
            tags:
              [],
            aliases:
              [],
            relationships: [
              {
                type:
                  'equipped',
                targetId:
                  'sword',
                label:
                  'Основное оружие'
              },
              {
                type:
                  'ally',
                targetId:
                  'guild',
                label:
                  'Союзники'
              }
            ],
            content:
              '<h1>Разведчица</h1>'
          },
          {
            id:
              'sword',
            name:
              'sword.md',
            path:
              '/pages/sword.md',
            order:
              3,
            title:
              'Клинок',
            parent:
              null,
            template:
              'card',
            type:
              'item',
            tags:
              [],
            aliases:
              [],
            content:
              '<h1>Клинок</h1>'
          },
          {
            id:
              'guild',
            name:
              'guild.md',
            path:
              '/pages/guild.md',
            order:
              4,
            title:
              'Гильдия',
            parent:
              null,
            template:
              'card',
            type:
              'note',
            tags: [
              'organization'
            ],
            aliases:
              [],
            content:
              '<h1>Гильдия</h1>'
          }
        ]);

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createKnowledgeGraphTemplate().content;

        const graphDocument =
          editor.querySelector('.knowledge-graph-document');

        const viewState =
          document.createElement('script');

        viewState.type =
          'application/json';

        viewState.className =
          'knowledge-graph-view-state';

        viewState.setAttribute(
          'data-knowledge-graph-view-state',
          ''
        );

        if (graphDocument) {

          viewState.textContent =
            JSON.stringify(
              {
                version:
                  1,
                positions: {
                  world: {
                    x:
                      40,
                    y:
                      80,
                    pinned:
                      true
                  },
                  hero: {
                    x:
                      170,
                    y:
                      170,
                    pinned:
                      true
                  },
                  sword: {
                    x:
                      300,
                    y:
                      80,
                    pinned:
                      true
                  },
                  guild: {
                    x:
                      300,
                    y:
                      260,
                    pinned:
                      true
                  }
                }
              }
            );

          graphDocument.insertBefore(
            viewState,
            graphDocument.firstChild
          );
        }

        renderKnowledgeGraphPage(
          editor
        );

        const stage =
          editor.querySelector('[data-knowledge-graph-canvas-stage]');

        const world =
          stage?.querySelector('[data-knowledge-graph-canvas-world]');

        if (stage && world) {

          stage.dataset.scale =
            '0.82';

          stage.dataset.panX =
            '52';

          stage.dataset.panY =
            '60';

          world.style.transform =
            'translate(52px, 60px) scale(0.82)';
        }
      }
    );

    await expect(
      page.locator('.knowledge-graph-workbench')
    ).toBeVisible();

    const heroNode =
      page.locator(
        '[data-knowledge-graph-canvas-card][data-node-id="hero"]'
      );

    await expect(
      heroNode
    ).toBeVisible();

    await heroNode.click(
      {
        button:
          'right'
      }
    );

    await expect(
      page.locator('[data-knowledge-graph-node-menu]')
    ).toBeVisible();

    return;
  }

  if (kind === 'task-empty') {

    await page.evaluate(
      async () => {

        const {
          createTaskTrackerTemplate
        } = await import('/js/templates/taskTracker.js');

        const {
          renderTaskTracker
        } = await import('/js/taskTracker/taskTrackerRender.js');

        const app =
          document.querySelector('.app');

        if (app) {

          app.dataset.visualDesignSystemBaseline =
            '0.0.1.8.16';
        }

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML =
          createTaskTrackerTemplate().content;

        editor.querySelector('.task-tracker-title').textContent =
          'Подготовка сессии';

        renderTaskTracker(
          editor
        );
      }
    );

    await expect(
      page.locator('.task-tracker-document')
    ).toBeVisible();

    return;
  }

  if (kind === 'settings-diagnostics') {

    await page.locator('#appSettingsBtn').click();

    await expect(
      page.locator('#appSettingsPopup')
    ).toHaveAttribute(
      'data-settings-ui-migration',
      '0.0.1.8.14.2'
    );

    await expect(
      page.locator('.app-settings-body > [data-settings-section]')
        .first()
    ).toBeVisible();

    await expect(
      page.locator('.app-workspace-diagnostics-panel')
    ).toBeVisible();

    return;
  }

  throw new Error(
    `Unknown design system fixed viewport kind: ${kind}`
  );
}


async function getDesignSystemFixedViewportMetrics(
  page,
  kind
) {

  return page.evaluate(
    surfaceKind => {

      const app =
        document.querySelector('.app');

      const statusbar =
        document.getElementById('statusbar');

      const progress =
        document.querySelector('.operation-progress');

      const popup =
        document.getElementById('campaignMapPopup');

      const isVisible =
        element => {

          if (!element) return false;

          const style =
            getComputedStyle(element);

          const rect =
            element.getBoundingClientRect();

          return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            !element.hasAttribute('hidden') &&
            !element.classList.contains('hidden') &&
            rect.width > 0 &&
            rect.height > 0;
        };

      const rectsOverlap =
        (
          first,
          second
        ) =>
          first.left < second.right &&
          first.right > second.left &&
          first.top < second.bottom &&
          first.bottom > second.top;

      const surfaceSelectorsByKind =
        {
          'shell-states': [
            '[data-app-shell-surface="empty-workspace"]',
            '.tree-empty-workspace',
            '.operation-progress',
            '#statusbar[data-save-state="error"]'
          ],
          'editor-properties': [
            '.editor-surface',
            '.card-properties-block',
            '.tree-item'
          ],
          'map-popup': [
            '.campaign-map-document',
            '[data-map-toolbar-region="scene-bar"]',
            '[data-map-toolbar-region="tool-rail"]',
            '#campaignMapPopup',
            '.campaign-map-properties-panel'
          ],
          'graph-overlay': [
            '.knowledge-graph-document',
            '.knowledge-graph-workbench',
            '[data-knowledge-graph-node-menu]'
          ],
          'task-empty': [
            '.task-tracker-document',
            '.task-tracker-board',
            '.task-column-empty'
          ],
          'settings-diagnostics': [
            '#appSettingsPopup',
            '.app-settings-body > [data-settings-section]',
            '.app-workspace-diagnostics-panel'
          ]
        };

      const surfaceSelectors =
        surfaceSelectorsByKind[surfaceKind] || [];

      const visibleSurfaceCount =
        surfaceSelectors.reduce(
          (count, selector) => {

            const visibleCount =
              Array
                .from(document.querySelectorAll(selector))
                .filter(isVisible)
                .length;

            return count + visibleCount;
          },
          0
        );

      const unlabeledIconButtonCount =
        Array
          .from(document.querySelectorAll('button'))
          .filter(button => {

            if (!isVisible(button)) return false;

            const hasIcon =
              Boolean(
                button.querySelector('svg, .app-icon')
              );

            if (!hasIcon) return false;

            const hasVisibleText =
              button.textContent.trim().length > 0;

            return !hasVisibleText &&
              !button.getAttribute('aria-label') &&
              !button.getAttribute('title');
          })
          .length;

      const mapPopupShell =
        popup?.querySelector('.campaign-map-popup-shell');

      const inspector =
        document.querySelector('.campaign-map-properties-panel');

      const mapPopupInspectorOverlap =
        isVisible(popup) &&
        isVisible(inspector) &&
        rectsOverlap(
          popup.getBoundingClientRect(),
          inspector.getBoundingClientRect()
        );

      const bodyScrollWidth =
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth
        );

      return {
        appClientWidth:
          app?.clientWidth || 0,
        appHasHorizontalOverflow:
          app
            ? app.scrollWidth > app.clientWidth + 1
            : true,
        appScrollWidth:
          app?.scrollWidth || 0,
        bodyHasHorizontalOverflow:
          bodyScrollWidth > window.innerWidth + 1,
        bodyScrollWidth,
        documentScrollWidth:
          document.documentElement.scrollWidth,
        graphMenuVisible:
          isVisible(
            document.querySelector('[data-knowledge-graph-node-menu]')
          ),
        hasEditor:
          isVisible(
            document.querySelector('.editor-surface')
          ),
        hasMap:
          isVisible(
            document.querySelector('.campaign-map-document')
          ),
        hasMapInspector:
          isVisible(
            document.querySelector('.campaign-map-properties-panel')
          ),
        hasMapSceneBar:
          isVisible(
            document.querySelector('[data-map-toolbar-region="scene-bar"]')
          ),
        hasMapToolRail:
          isVisible(
            document.querySelector('[data-map-toolbar-region="tool-rail"]')
          ),
        hasProperties:
          isVisible(
            document.querySelector('.card-properties-block')
          ),
        hasShellEmpty:
          isVisible(
            document.querySelector('[data-app-shell-surface="empty-workspace"]')
          ),
        hasSettings:
          isVisible(
            document.querySelector(
              '#appSettingsPopup[data-settings-ui-migration="0.0.1.8.14.2"]'
            )
          ),
        hasTask:
          isVisible(
            document.querySelector('.task-tracker-document')
          ),
        mapPopupMigration:
          popup?.dataset.mapPopupUiMigration ||
          mapPopupShell?.dataset.mapPopupUiMigration ||
          '',
        mapPopupInspectorOverlap,
        mapPopupOpen:
          isVisible(
            popup
          ),
        oldMapPanelCount:
          document.querySelectorAll(
            '.campaign-map-layer-dock, .campaign-map-scene-inspector'
          ).length,
        operationProgressState:
          progress?.classList.contains('is-failed')
            ? 'failed'
            : progress?.dataset.toastState || '',
        scale:
          document.body.dataset.uiScale || '',
        settingsSectionCount:
          Array
            .from(
              document.querySelectorAll(
                '.app-settings-body > [data-settings-section]'
              )
            )
            .filter(isVisible)
            .length,
        statusbarSaveState:
          statusbar?.dataset.saveState || '',
        taskEmptyColumns:
          document.querySelectorAll('.task-column-empty').length,
        theme:
          document.body.dataset.theme || '',
        unlabeledIconButtonCount,
        viewportWidth:
          window.innerWidth,
        visibleSurfaceCount,
        visualBaseline:
          app?.dataset.visualDesignSystemBaseline || ''
      };
    },
    kind
  );
}


function expectDesignSystemFixedViewportMetrics(
  kind,
  metrics
) {

  if (kind === 'shell-states') {

    expect(
      metrics.hasShellEmpty,
      JSON.stringify(metrics, null, 2)
    ).toBe(
      true
    );

    expect(
      metrics.operationProgressState
    ).toBe(
      'failed'
    );

    expect(
      metrics.statusbarSaveState
    ).toBe(
      'error'
    );

    expect(
      metrics.visibleSurfaceCount
    ).toBeGreaterThanOrEqual(
      3
    );

    return;
  }

  if (kind === 'editor-properties') {

    expect(
      metrics.hasEditor,
      JSON.stringify(metrics, null, 2)
    ).toBe(
      true
    );

    expect(
      metrics.hasProperties
    ).toBe(
      true
    );

    return;
  }

  if (kind === 'map-popup') {

    expect(
      metrics.hasMap,
      JSON.stringify(metrics, null, 2)
    ).toBe(
      true
    );

    expect(
      metrics.hasMapSceneBar
    ).toBe(
      true
    );

    expect(
      metrics.hasMapToolRail
    ).toBe(
      true
    );

    expect(
      metrics.hasMapInspector
    ).toBe(
      true
    );

    expect(
      metrics.mapPopupOpen
    ).toBe(
      true
    );

    expect(
      metrics.mapPopupInspectorOverlap,
      JSON.stringify(metrics, null, 2)
    ).toBe(
      false
    );

    expect(
      metrics.mapPopupMigration
    ).toBe(
      '0.0.1.8.12.2'
    );

    expect(
      metrics.oldMapPanelCount
    ).toBe(
      0
    );

    return;
  }

  if (kind === 'graph-overlay') {

    expect(
      metrics.graphMenuVisible,
      JSON.stringify(metrics, null, 2)
    ).toBe(
      true
    );

    return;
  }

  if (kind === 'task-empty') {

    expect(
      metrics.hasTask,
      JSON.stringify(metrics, null, 2)
    ).toBe(
      true
    );

    expect(
      metrics.taskEmptyColumns
    ).toBeGreaterThanOrEqual(
      3
    );

    return;
  }

  if (kind === 'settings-diagnostics') {

    expect(
      metrics.hasSettings,
      JSON.stringify(metrics, null, 2)
    ).toBe(
      true
    );

    expect(
      metrics.settingsSectionCount
    ).toBeGreaterThanOrEqual(
      3
    );

    return;
  }

  throw new Error(
    `Unknown design system fixed viewport kind: ${kind}`
  );
}


async function attachScreenshot(
  page,
  testInfo,
  name
) {

  expect(
    UI_MIGRATION_BASELINE_ATTACHMENTS
  ).toContain(
    name
  );

  const body =
    await page.screenshot({
      fullPage: false
    });

  await writeOptionalOwnerVisualScreenshot(
    name,
    body
  );

  await attachScreenshotBuffer(
    testInfo,
    name,
    body
  );
}


async function attachLocatorScreenshot(
  locator,
  testInfo,
  name
) {

  expect(
    UI_MIGRATION_BASELINE_ATTACHMENTS
  ).toContain(
    name
  );

  const body =
    await locator.screenshot();

  await writeOptionalOwnerVisualScreenshot(
    name,
    body
  );

  await attachScreenshotBuffer(
    testInfo,
    name,
    body
  );
}


async function writeOptionalOwnerVisualScreenshot(
  name,
  body
) {

  if (
    process.env.MOW_OWNER_REVIEW_SCREENSHOT_DIR &&
    name.startsWith('visual-owner-')
  ) {

    await writeScreenshotFile(
      process.env.MOW_OWNER_REVIEW_SCREENSHOT_DIR,
      `${name}.png`,
      body
    );
  }

  const finalFileName =
    OWNER_FINAL_EVIDENCE_SCREENSHOTS.get(
      name
    );

  if (
    process.env.MOW_OWNER_FINAL_EVIDENCE_DIR &&
    finalFileName
  ) {

    await writeScreenshotFile(
      process.env.MOW_OWNER_FINAL_EVIDENCE_DIR,
      finalFileName,
      body
    );
  }
}


async function writeScreenshotFile(
  directory,
  fileName,
  body
) {

  await mkdir(
    directory,
    {
      recursive:
        true
    }
  );

  await writeFile(
    join(
      directory,
      fileName
    ),
    body
  );
}


async function attachScreenshotBuffer(
  testInfo,
  name,
  body
) {

  await testInfo.attach(
    `${name}.png`,
    {
      body,
      contentType: 'image/png'
    }
  );

  const evidenceDir =
    process.env.MOW_VISUAL_EVIDENCE_DIR;

  if (!evidenceDir) return;

  await mkdir(
    evidenceDir,
    {
      recursive: true
    }
  );

  await writeFile(
    join(
      evidenceDir,
      `${sanitizeEvidenceName(name)}.png`
    ),
    body
  );
}


function sanitizeEvidenceName(
  name
) {

  return String(name)
    .replace(
      /[^a-z0-9_.-]+/gi,
      '-'
    );
}
