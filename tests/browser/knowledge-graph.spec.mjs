import {
  expect,
  test
} from '@playwright/test';


test(
  'knowledge-graph-can-be-created-and-opens-orphan-pages',
  async ({ page }) => {

    test.setTimeout(
      60_000
    );

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          setStorageAdapter
        } = await import('/js/storage/storageAdapter.js');

        const {
          setPages
        } = await import('/js/stateActions.js');

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
            content: `---
id: world
parent: null
order: 1
tags: []
template: card
type: note
aliases: []
---

<h1>World</h1>[[Hero]]`
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
                type: 'ruleEffect',
                targetId: 'rules',
                label: 'Rage'
              },
              {
                type: 'ally',
                targetId: 'guild',
                label: 'Faction'
              }
            ],
            content: `---
id: hero
parent: world
order: 2
tags: []
template: card
type: character
aliases: []
---

<h1>Hero</h1>`
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
            content: `---
id: sword
parent: null
order: 3
tags: []
template: card
type: item
aliases: []
---

<h1>Sword</h1>`
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
            content: `---
id: guild
parent: null
order: 4
tags: [organization]
template: card
type: note
aliases: []
---

<h1>Guild</h1>`
          },
          {
            id: 'rules',
            name: 'rules.md',
            path: '/pages/rules.md',
            order: 5,
            title: 'Rules',
            parent: null,
            template: 'ruleTree',
            type: 'ruleTree',
            tags: [],
            aliases: [],
            content: `---
id: rules
parent: null
order: 4
tags: []
template: ruleTree
type: ruleTree
aliases: []
---

<h1>Rules</h1>`
          },
          {
            id: 'orphan',
            name: 'orphan.md',
            path: '/pages/orphan.md',
            order: 6,
            title: 'Orphan',
            parent: null,
            template: 'card',
            type: 'note',
            tags: [],
            aliases: [],
            content: `---
id: orphan
parent: null
order: 5
tags: []
template: card
type: note
aliases: []
---

<h1>Orphan</h1>`
          }
        ]);

        renderTree();
      }
    );

    await page.locator('[data-create-page]').click();
    await page.locator('#createMenu [data-template="knowledgeGraph"]').click();

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return state.pages.some(page =>
          page.template === 'knowledgeGraph'
        );
      }
    );

    const currentTemplate =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          return state.currentPage?.template || null;
        }
      );

    expect(
      currentTemplate
    ).toBe(
      'knowledgeGraph'
    );

    await expect(
      page.locator('.knowledge-graph-document')
    ).toBeVisible();

    await expect(
      page.locator('.knowledge-graph-summary-card')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.knowledge-graph-domain-card')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.knowledge-graph-workbench')
    ).toBeVisible();

    await expect(
      page.locator('.knowledge-graph-canvas-stage')
    ).toBeVisible();

    await expect(
      page.locator('[data-knowledge-graph-layout="tree"]')
    ).toHaveClass(
      /is-active/
    );

    await expect(
      page.locator('[data-knowledge-graph-filter-status]')
    ).toHaveText(
      'Фрагмент'
    );

    await expect(
      page.locator('[data-knowledge-graph-filter-status]')
    ).toHaveAttribute(
      'aria-label',
      /Стандартный вид/
    );

    await expect(
      page.locator('.knowledge-graph-canvas-domain-label')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('.knowledge-graph-readable-fallback')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('[data-knowledge-graph-tab]')
    ).toHaveCount(
      0
    );

    const graphEdgeCount =
      await page.locator('.knowledge-graph-canvas-edge').count();

    expect(
      graphEdgeCount
    ).toBeGreaterThan(
      0
    );

    await expect(
      page.locator('.knowledge-graph-canvas-filterbar')
    ).toBeVisible();

    const graphControlContract =
      await page.evaluate(
        () => {

          const controls = [
            ...document.querySelectorAll(
              '.knowledge-graph-canvas-toolbar button, .knowledge-graph-canvas-filterbar button'
            )
          ];

          const rects =
            controls.map(control =>
              control.getBoundingClientRect()
            );

          const backgrounds =
            controls.map(control =>
              getComputedStyle(control).backgroundColor
            );

          const scale =
            document.querySelector(
              '[data-knowledge-graph-canvas-scale]'
            );

          return {
            count:
              controls.length,
            withoutSharedIconButton:
              controls.filter(control =>
                !control.classList.contains('mow-icon-button')
              ).length,
            withoutAccessibleName:
              controls.filter(control =>
                !control.getAttribute('aria-label') &&
                !control.textContent.trim()
              ).length,
            withoutSmallSize:
              controls.filter(control =>
                control.dataset.size !== 'sm'
              ).length,
            blackBackgrounds:
              backgrounds.filter(background =>
                background === 'rgb(0, 0, 0)'
              ).length,
            zeroAreaControls:
              rects.filter(rect =>
                rect.width <= 0 ||
                rect.height <= 0
              )
                .length,
            hiddenToolbarLabels:
              document.querySelectorAll(
                '.knowledge-graph-canvas-toolbar .knowledge-graph-toolbar-label'
              ).length,
            scaleText:
              scale?.textContent?.trim() || '',
            scaleAccessibleName:
              scale?.getAttribute('aria-label') || '',
            scaleFontSize:
              scale ? getComputedStyle(scale).fontSize : ''
          };
        }
      );

    expect(
      graphControlContract.count
    ).toBeGreaterThan(
      0
    );

    expect(
      graphControlContract.withoutSharedIconButton
    ).toBe(
      0
    );

    expect(
      graphControlContract.withoutAccessibleName
    ).toBe(
      0
    );

    expect(
      graphControlContract.blackBackgrounds
    ).toBe(
      0
    );

    expect(
      graphControlContract.withoutSmallSize
    ).toBe(
      0
    );

    expect(
      graphControlContract.zeroAreaControls
    ).toBe(
      0
    );

    expect(
      graphControlContract.hiddenToolbarLabels
    ).toBe(
      0
    );

    expect(
      graphControlContract.scaleText
    ).toMatch(
      /^\d+%$/
    );

    expect(
      graphControlContract.scaleAccessibleName
    ).toBe(
      `Масштаб ${graphControlContract.scaleText}`
    );

    expect(
      Number.parseFloat(
        graphControlContract.scaleFontSize
      )
    ).toBeGreaterThan(
      0
    );

    await page.locator('[data-knowledge-graph-filter="domain"]').selectOption('item');

    await expect(
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="sword"]')
    ).toBeVisible();

    await expect(
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="rules"]')
    ).toHaveCount(
      0
    );

    await page.locator('[data-knowledge-graph-filter-action="clear"]').click();

    await page.locator('[data-knowledge-graph-filter-action="orphans"]').click();

    await expect(
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="orphan"]')
    ).toBeVisible();

    await expect(
      page.locator('.knowledge-graph-canvas-edge')
    ).toHaveCount(
      0
    );

    await page.locator('[data-knowledge-graph-filter-action="clear"]').click();

    await page.locator('[data-knowledge-graph-filter="relationshipType"]').selectOption('equipped');

    await expect(
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="hero"]')
    ).toBeVisible();

    await expect(
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="sword"]')
    ).toBeVisible();

    await expect(
      page.locator('[data-knowledge-graph-canvas-edge][data-edge-from="hero"][data-edge-to="sword"]')
    ).toHaveCount(
      1
    );

    await expect(
      page.locator('[data-knowledge-graph-canvas-edge][data-edge-to="rules"]')
    ).toHaveCount(
      0
    );

    await page.locator('[data-knowledge-graph-filter-action="clear"]').click();

    await page.locator('[data-knowledge-graph-canvas-node="sword"]').click();

    await expect(
      page.locator('.knowledge-graph-canvas-selection')
    ).toHaveCount(
      0
    );

    const graphInspector =
      page.locator('[data-knowledge-graph-inspector]');

    await expect(
      graphInspector
    ).toBeVisible();

    await expect(
      graphInspector
    ).toHaveAttribute(
      'data-node-id',
      'sword'
    );

    await expect(
      graphInspector
    ).toContainText(
      'Sword'
    );

    await expect(
      graphInspector.locator('[data-knowledge-graph-inspector-relation][data-relation-other-id="hero"]')
    ).toHaveCount(
      1
    );

    await expect(
      page.locator('[data-knowledge-graph-canvas-edge][data-edge-from="hero"][data-edge-to="sword"]')
    ).toHaveAttribute(
      'data-edge-state',
      'active'
    );

    await expect(
      page.locator('[data-knowledge-graph-canvas-edge][data-edge-from="hero"][data-edge-to="rules"]')
    ).toHaveAttribute(
      'data-edge-state',
      'muted'
    );

    await expect(
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="hero"]')
    ).toHaveClass(
      /is-related/
    );

    const stageLocator =
      page.locator('[data-knowledge-graph-canvas-stage]');

    const initialScale =
      Number(
        await stageLocator.getAttribute(
          'data-scale'
        )
      );

    await page.locator('[data-knowledge-graph-canvas-action="zoom-in"]').click();

    const canvasScale =
      await stageLocator.getAttribute(
        'data-scale'
      );

    expect(
      Number(canvasScale)
    ).toBeGreaterThan(
      initialScale
    );

    const scaleBeforeWheel =
      Number(
        await stageLocator.getAttribute(
          'data-scale'
        )
      );

    const stageBoxForWheel =
      await stageLocator.boundingBox();

    await page.mouse.move(
      stageBoxForWheel.x + stageBoxForWheel.width / 2,
      stageBoxForWheel.y + stageBoxForWheel.height / 2
    );

    await page.mouse.wheel(
      0,
      -320
    );

    const scaleAfterWheel =
      Number(
        await stageLocator.getAttribute(
          'data-scale'
        )
      );

    expect(
      scaleAfterWheel
    ).toBeGreaterThan(
      scaleBeforeWheel
    );

    await page.locator('[data-knowledge-graph-canvas-action="fit"]').click();

    const worldLocator =
      page.locator('[data-knowledge-graph-canvas-world]');

    const heroCard =
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="hero"]');

    const heroBoxForGrab =
      await heroCard.boundingBox();

    const heroYBeforeGrab =
      Number(
        await heroCard.getAttribute(
          'data-node-y'
        )
      );

    await page.mouse.move(
      heroBoxForGrab.x + heroBoxForGrab.width / 2,
      heroBoxForGrab.y + heroBoxForGrab.height / 2
    );

    await page.mouse.down();

    await page.mouse.move(
      heroBoxForGrab.x + heroBoxForGrab.width / 2 + 2,
      heroBoxForGrab.y + heroBoxForGrab.height / 2 - 2
    );

    await page.mouse.up();

    const heroYAfterGrab =
      Number(
        await heroCard.getAttribute(
          'data-node-y'
        )
      );

    expect(
      Math.abs(heroYAfterGrab - heroYBeforeGrab)
    ).toBeLessThan(
      10
    );

    const initialHeroX =
      Number(
        await heroCard.getAttribute(
          'data-node-x'
        )
      );

    const initialWorldWidth =
      await worldLocator.evaluate(element =>
        Number.parseFloat(element.style.width)
      );

    const initialHeroEdgePath =
      await page.locator('[data-knowledge-graph-canvas-edge][data-edge-from="hero"]').first()
        .getAttribute(
          'd'
        );

    const heroBoxForDrag =
      await heroCard.boundingBox();

    const stageBoxForNodeDrag =
      await stageLocator.boundingBox();

    const heroDragStartX =
      heroBoxForDrag.x + heroBoxForDrag.width / 2;

    const heroDragStartY =
      heroBoxForDrag.y + heroBoxForDrag.height / 2;

    const heroDragEndX =
      Math.min(
        stageBoxForNodeDrag.x + stageBoxForNodeDrag.width - 18,
        heroDragStartX + 520
      );

    await page.mouse.move(
      heroDragStartX,
      heroDragStartY
    );

    await page.mouse.down();

    await page.mouse.move(
      heroDragEndX,
      heroDragStartY + 42,
      {
        steps: 8
      }
    );

    await page.mouse.up();

    const movedHeroX =
      Number(
        await heroCard.getAttribute(
          'data-node-x'
        )
      );

    expect(
      movedHeroX
    ).toBeGreaterThan(
      initialHeroX
    );

    const expandedWorldWidth =
      await worldLocator.evaluate(element =>
        Number.parseFloat(element.style.width)
      );

    expect(
      expandedWorldWidth
    ).toBeGreaterThan(
      initialWorldWidth
    );

    const movedHeroEdgePath =
      await page.locator('[data-knowledge-graph-canvas-edge][data-edge-from="hero"]').first()
        .getAttribute(
          'd'
        );

    expect(
      movedHeroEdgePath
    ).not.toBe(
      initialHeroEdgePath
    );

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return (
          state.currentPage?.content.includes(
            'data-knowledge-graph-view-state'
          ) &&
          state.currentPage.content.includes(
            '"hero"'
          )
        );
      }
    );

    await page.locator('.knowledge-graph-refresh').click();

    await expect(
      heroCard
    ).toHaveAttribute(
      'data-node-pinned',
      'true'
    );

    const graphCoordinateTolerance =
      8;

    const persistedHeroX =
      Number(
        await heroCard.getAttribute(
          'data-node-x'
        )
      );

    expect(
      Math.abs(persistedHeroX - movedHeroX)
    ).toBeLessThan(
      graphCoordinateTolerance
    );

    const historyUndoButton =
      page.locator('[data-knowledge-graph-history-action="undo"]');

    const historyRedoButton =
      page.locator('[data-knowledge-graph-history-action="redo"]');

    await expect(
      historyUndoButton
    ).toBeEnabled();

    await expect(
      historyRedoButton
    ).toBeDisabled();

    const transformBeforeHistoryUndo =
      await worldLocator.evaluate(element =>
        element.style.transform
      );

    await historyUndoButton.click();

    await expect(
      heroCard
    ).toHaveAttribute(
      'data-node-pinned',
      'false'
    );

    const undoHeroX =
      Number(
        await heroCard.getAttribute(
          'data-node-x'
        )
      );

    expect(
      Math.abs(undoHeroX - initialHeroX)
    ).toBeLessThan(
      graphCoordinateTolerance
    );

    expect(
      Math.abs(undoHeroX - movedHeroX)
    ).toBeGreaterThan(
      40
    );

    const transformAfterHistoryUndo =
      await worldLocator.evaluate(element =>
        element.style.transform
      );

    expect(
      transformAfterHistoryUndo
    ).toBe(
      transformBeforeHistoryUndo
    );

    await expect(
      historyRedoButton
    ).toBeEnabled();

    await historyRedoButton.click();

    await expect(
      heroCard
    ).toHaveAttribute(
      'data-node-pinned',
      'true'
    );

    const redoneHeroX =
      Number(
        await heroCard.getAttribute(
          'data-node-x'
        )
      );

    expect(
      Math.abs(redoneHeroX - movedHeroX)
    ).toBeLessThan(
      graphCoordinateTolerance
    );

    await page.evaluate(() => {
      document.activeElement?.blur?.();
    });

    await page.keyboard.press(
      'Control+Z'
    );

    await expect(
      heroCard
    ).toHaveAttribute(
      'data-node-pinned',
      'false'
    );

    await page.keyboard.press(
      'Control+Shift+Z'
    );

    await expect(
      heroCard
    ).toHaveAttribute(
      'data-node-pinned',
      'true'
    );

    await page.locator('[data-knowledge-graph-canvas-action="fit"]').click();

    const editedHeroCard =
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="hero"]');

    await expect(
      editedHeroCard
    ).toBeVisible();

    const editedHeroCardBox =
      await editedHeroCard.boundingBox();

    const contextClickX =
      editedHeroCardBox.x + editedHeroCardBox.width / 2;

    const contextClickY =
      editedHeroCardBox.y + editedHeroCardBox.height / 2;

    await editedHeroCard.click({
      button:
        'right',
      position:
        {
          x:
            editedHeroCardBox.width / 2,
          y:
            editedHeroCardBox.height / 2
        }
    });

    const nodeMenu =
      page.locator('[data-knowledge-graph-node-menu]');

    await expect(
      nodeMenu
    ).toBeVisible();

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'data-overlay-kind',
      'context-menu'
    );

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'data-knowledge-graph-overlay-ui',
      '0.0.1.8.13.3'
    );

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'data-overlay-lifecycle',
      'popup-manager'
    );

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'data-overlay-state',
      'open'
    );

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'aria-modal',
      'false'
    );

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'role',
      'menu'
    );

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'aria-orientation',
      'vertical'
    );

    await expect(
      nodeMenu.locator('.knowledge-graph-overlay-header')
    ).toContainText(
      'Узел графа'
    );

    await expect(
      nodeMenu.locator('[data-knowledge-graph-node-menu-section]')
    ).toHaveCount(
      2
    );

    await expect(
      nodeMenu.locator('[data-knowledge-graph-node-menu-relationship-count]')
    ).toHaveAttribute(
      'aria-label',
      '3 ручных связей'
    );

    await expect(
      nodeMenu
        .locator('[data-knowledge-graph-node-menu-relationship-count] span')
    ).toHaveCount(
      3
    );

    await expect(
      nodeMenu.locator('[data-knowledge-graph-node-relationship]')
    ).toHaveCount(
      3
    );

    await expect(
      nodeMenu
        .locator('[data-knowledge-graph-node-relationship]')
        .first()
    ).toBeHidden();

    await nodeMenu
      .locator('[data-knowledge-graph-relationships-toggle]')
      .click();

    await expect(
      nodeMenu
        .locator('[data-knowledge-graph-node-relationship]')
        .first()
    ).toBeVisible();

    await nodeMenu
      .locator('[data-knowledge-graph-relationships-toggle]')
      .click();

    await expect(
      nodeMenu
        .locator('[data-knowledge-graph-node-relationship]')
        .first()
    ).toBeHidden();

    await expect(
      nodeMenu.locator('.knowledge-graph-node-menu-action-label')
    ).toHaveCount(
      0
    );

    const nodeMenuIconActionContract =
      await nodeMenu.evaluate(menu => {

        const actions =
          [
            ...menu.querySelectorAll(
              '[data-knowledge-graph-node-menu-action], [data-knowledge-graph-relationship-menu-action]'
            )
          ];

        return {
          count:
            actions.length,
          withoutSharedIconButton:
            actions.filter(action =>
              !action.classList.contains('mow-icon-button')
            ).length,
          withoutAccessibleName:
            actions.filter(action =>
              !action.getAttribute('aria-label')
            ).length,
          withRenderedHiddenLabel:
            actions.filter(action =>
              action.querySelector(
                '.knowledge-graph-node-menu-action-label, .knowledge-graph-toolbar-label'
              )
            ).length
        };
      });

    expect(
      nodeMenuIconActionContract.count
    ).toBeGreaterThan(
      0
    );

    expect(
      nodeMenuIconActionContract.withoutSharedIconButton
    ).toBe(
      0
    );

    expect(
      nodeMenuIconActionContract.withoutAccessibleName
    ).toBe(
      0
    );

    expect(
      nodeMenuIconActionContract.withRenderedHiddenLabel
    ).toBe(
      0
    );

    const nodeMenuVisualContract =
      await nodeMenu.evaluate(menu => {

        const style =
          getComputedStyle(menu);

        const header =
          menu.querySelector(
            '.knowledge-graph-overlay-header'
          );

        const action =
          menu.querySelector(
            '.knowledge-graph-node-menu-action'
          );

        const relationshipPanel =
          menu.querySelector(
            '.knowledge-graph-node-menu-relationship-panel'
          );

        return {
          overflow:
            style.overflow,
          background:
            style.backgroundColor,
          headerDisplay:
            header ? getComputedStyle(header).display : '',
          actionDisplay:
            action ? getComputedStyle(action).display : '',
          relationshipPanelDisplay:
            relationshipPanel ? getComputedStyle(relationshipPanel).display : ''
        };
      });

    expect(
      nodeMenuVisualContract
    ).toMatchObject({
      overflow:
        'auto',
      headerDisplay:
        'grid',
      actionDisplay:
        'flex',
      relationshipPanelDisplay:
        'grid'
    });

    const nodeMenuBox =
      await nodeMenu.boundingBox();

    const viewportSize =
      page.viewportSize();

    const nodeMenuAnchorX =
      Number(
        await nodeMenu.getAttribute(
          'data-anchor-x'
        )
      );

    const nodeMenuAnchorY =
      Number(
        await nodeMenu.getAttribute(
          'data-anchor-y'
        )
      );

    const effectiveContextClickX =
      Number.isFinite(nodeMenuAnchorX)
        ? nodeMenuAnchorX
        : contextClickX;

    const effectiveContextClickY =
      Number.isFinite(nodeMenuAnchorY)
        ? nodeMenuAnchorY
        : contextClickY;

    expect(
      nodeMenuBox.x
    ).toBeGreaterThanOrEqual(
      0
    );

    expect(
      nodeMenuBox.y
    ).toBeGreaterThanOrEqual(
      0
    );

    expect(
      nodeMenuBox.x + nodeMenuBox.width
    ).toBeLessThanOrEqual(
      viewportSize.width + 1
    );

    expect(
      nodeMenuBox.y + nodeMenuBox.height
    ).toBeLessThanOrEqual(
      viewportSize.height + 1
    );

    const nodeMenuContainsContextX =
      effectiveContextClickX >= nodeMenuBox.x - 12 &&
      effectiveContextClickX <= nodeMenuBox.x + nodeMenuBox.width + 12;

    const nodeMenuClampedHorizontally =
      nodeMenuBox.x <= 13 ||
      nodeMenuBox.x + nodeMenuBox.width >= viewportSize.width - 13;

    expect(
      nodeMenuContainsContextX ||
      nodeMenuClampedHorizontally
    ).toBe(
      true
    );

    const nodeMenuContainsContextY =
      effectiveContextClickY >= nodeMenuBox.y - 12 &&
      effectiveContextClickY <= nodeMenuBox.y + nodeMenuBox.height + 12;

    const nodeMenuClampedVertically =
      nodeMenuBox.y <= 13 ||
      nodeMenuBox.y + nodeMenuBox.height >= viewportSize.height - 13;

    expect(
      nodeMenuContainsContextY ||
      nodeMenuClampedVertically
    ).toBe(
      true
    );

    await expect(
      page.locator('[data-knowledge-graph-node-menu-action="reset-position"]')
    ).toBeVisible();

    await page.locator('[data-knowledge-graph-node-menu-action="reset-position"]').click();

    await expect(
      heroCard
    ).toHaveAttribute(
      'data-node-pinned',
      'false'
    );

    await historyUndoButton.click();

    await expect(
      heroCard
    ).toHaveAttribute(
      'data-node-pinned',
      'true'
    );

    const restoredAfterResetUndoX =
      Number(
        await heroCard.getAttribute(
          'data-node-x'
        )
      );

    expect(
      Math.abs(restoredAfterResetUndoX - movedHeroX)
    ).toBeLessThan(
      graphCoordinateTolerance
    );

    await historyRedoButton.click();

    await expect(
      heroCard
    ).toHaveAttribute(
      'data-node-pinned',
      'false'
    );

    await page.locator('[data-knowledge-graph-canvas-action="fit"]').click();

    const restoredHeroCard =
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="hero"]');

    await expect(
      restoredHeroCard
    ).toBeVisible();

    await restoredHeroCard.click({
      button: 'right'
    });

    await page.locator('[data-knowledge-graph-node-menu-action="connect"]').click();

    await expect(
      page.locator('[data-knowledge-graph-connect-banner]')
    ).toBeVisible();

    await page.locator('[data-knowledge-graph-canvas-node="world"]').click();

    const connectPopup =
      page.locator('[data-knowledge-graph-connect-popup]');

    await expect(
      connectPopup
    ).toBeVisible();

    await expect(
      connectPopup
    ).toHaveAttribute(
      'data-knowledge-graph-overlay-ui',
      '0.0.1.8.13.3'
    );

    await expect(
      connectPopup
    ).toHaveAttribute(
      'data-overlay-kind',
      'dialog'
    );

    await expect(
      connectPopup
    ).toHaveAttribute(
      'data-overlay-lifecycle',
      'popup-manager'
    );

    await expect(
      connectPopup
    ).toHaveAttribute(
      'data-overlay-state',
      'open'
    );

    await expect(
      connectPopup
    ).toHaveAttribute(
      'aria-modal',
      'false'
    );

    await expect(
      connectPopup.locator('.knowledge-graph-overlay-header')
    ).toContainText(
      'Связь'
    );

    await expect(
      connectPopup.locator('.knowledge-graph-connect-path')
    ).toContainText(
      'Hero'
    );

    await expect(
      connectPopup.locator('.knowledge-graph-connect-path')
    ).toContainText(
      'World'
    );

    const connectPopupVisualContract =
      await connectPopup.evaluate(popup => {

        const style =
          getComputedStyle(popup);

        const actions =
          popup.querySelector(
            '.knowledge-graph-connect-popup-actions'
          );

        return {
          position:
            style.position,
          display:
            style.display,
          actionsDisplay:
            actions ? getComputedStyle(actions).display : ''
        };
      });

    expect(
      connectPopupVisualContract
    ).toEqual({
      position:
        'fixed',
      display:
        'grid',
      actionsDisplay:
        'flex'
    });

    await connectPopup
      .locator('[data-knowledge-graph-connect-type]')
      .selectOption('enemy');

    await connectPopup
      .locator('[data-knowledge-graph-connect-label]')
      .fill('First conflict');

    await connectPopup
      .locator('[data-knowledge-graph-connect-action="create"]')
      .click();

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return state.pages
          .find(page => page.id === 'hero')
          ?.relationships
          ?.some(relationship =>
            relationship.type === 'enemy' &&
            relationship.targetId === 'world' &&
            relationship.label === 'First conflict'
          );
      }
    );

    await page.evaluate(() => {

      const graphDocument =
        document.querySelector(
          '.knowledge-graph-document'
        );

      graphDocument.dispatchEvent(
        new KeyboardEvent(
          'keydown',
          {
            key:
              '\u044f',
            code:
              'KeyZ',
            ctrlKey:
              true,
            bubbles:
              true,
            cancelable:
              true
          }
        )
      );
    }
    );

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return !state.pages
          .find(page => page.id === 'hero')
          ?.relationships
          ?.some(relationship =>
            relationship.type === 'enemy' &&
            relationship.targetId === 'world'
          );
      }
    );

    await page.keyboard.press(
      'Control+Y'
    );

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return state.pages
          .find(page => page.id === 'hero')
          ?.relationships
          ?.some(relationship =>
            relationship.type === 'enemy' &&
            relationship.targetId === 'world' &&
            relationship.label === 'First conflict'
          );
      }
    );

    await page.locator('[data-knowledge-graph-canvas-action="fit"]').click();

    const relationshipDeleteHeroCard =
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="hero"]');

    await expect(
      relationshipDeleteHeroCard
    ).toBeVisible();

    await relationshipDeleteHeroCard.click({
      button: 'right'
    });

    await page
      .locator('[data-knowledge-graph-relationships-toggle]')
      .click();

    const heroWorldRelationship =
      page
        .locator('[data-knowledge-graph-node-relationship]')
        .filter({
          hasText: 'Hero -> World'
        })
        .first();

    await expect(
      heroWorldRelationship
    ).toBeVisible();

    await heroWorldRelationship
      .locator('[data-knowledge-graph-relationship-field="type"]')
      .selectOption('ally');

    await heroWorldRelationship
      .locator('[data-knowledge-graph-relationship-field="label"]')
      .fill('Story link');

    await heroWorldRelationship
      .locator('[data-knowledge-graph-relationship-menu-action="save"]')
      .click();

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return state.pages
          .find(page => page.id === 'hero')
          ?.relationships
          ?.some(relationship =>
            relationship.type === 'ally' &&
            relationship.targetId === 'world' &&
            relationship.label === 'Story link'
          );
      }
    );

    await page.keyboard.press(
      'Control+Z'
    );

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return state.pages
          .find(page => page.id === 'hero')
          ?.relationships
          ?.some(relationship =>
            relationship.type === 'enemy' &&
            relationship.targetId === 'world' &&
            relationship.label === 'First conflict'
          );
      }
    );

    await page.keyboard.press(
      'Control+Shift+Z'
    );

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return state.pages
          .find(page => page.id === 'hero')
          ?.relationships
          ?.some(relationship =>
            relationship.type === 'ally' &&
            relationship.targetId === 'world' &&
            relationship.label === 'Story link'
          );
      }
    );

    await page.locator('[data-knowledge-graph-canvas-action="fit"]').click();

    const relationshipRemoveHeroCard =
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="hero"]');

    await expect(
      relationshipRemoveHeroCard
    ).toBeVisible();

    await relationshipRemoveHeroCard.click({
      button: 'right'
    });

    await page
      .locator('[data-knowledge-graph-relationships-toggle]')
      .click();

    await page
      .locator('[data-knowledge-graph-node-relationship]')
      .filter({
        hasText: 'Hero -> World'
      })
      .first()
      .locator('[data-knowledge-graph-relationship-menu-action="delete"]')
      .click();

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return !state.pages
          .find(page => page.id === 'hero')
          ?.relationships
          ?.some(relationship =>
            relationship.targetId === 'world'
          );
      }
    );

    await page.keyboard.press(
      'Control+Z'
    );

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return state.pages
          .find(page => page.id === 'hero')
          ?.relationships
          ?.some(relationship =>
            relationship.type === 'ally' &&
            relationship.targetId === 'world' &&
            relationship.label === 'Story link'
          );
      }
    );

    await page.locator('[data-knowledge-graph-filter="viewPreset"]').selectOption('manual');

    await expect(
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="world"]')
    ).toBeVisible();

    await expect(
      page.locator('[data-knowledge-graph-canvas-edge][data-edge-from="hero"][data-edge-to="world"]')
    ).toHaveCount(
      1
    );

    await expect(
      page.locator('[data-knowledge-graph-canvas-edge][data-edge-from="world"][data-edge-to="hero"]')
    ).toHaveCount(
      0
    );

    await page.locator('[data-knowledge-graph-canvas-action="fit"]').click();

    await heroCard.click({
      button: 'right'
    });

    await expect(
      page.locator('[data-knowledge-graph-node-menu]')
    ).toBeVisible();

    await expect(
      page.locator('[data-knowledge-graph-node-menu]')
    ).toContainText(
      'Hero'
    );

    await page.locator('[data-knowledge-graph-node-menu-action="focus"]').click();

    await expect(
      page.locator('[data-knowledge-graph-filter-status]')
    ).toHaveText(
      'Соседи'
    );

    await expect(
      page.locator('[data-knowledge-graph-filter-status]')
    ).toHaveAttribute(
      'aria-label',
      /соседи: Hero/
    );

    await page.locator('[data-knowledge-graph-filter-action="clear"]').click();

    const beforeTransform =
      await worldLocator.evaluate(element =>
        element.style.transform
      );

    const beforeHeroBox =
      await heroCard.boundingBox();

    const panPoints =
      await page.evaluate(
        () => {

          const stage =
            document.querySelector(
              '[data-knowledge-graph-canvas-stage]'
            );

          const stageRect =
            stage.getBoundingClientRect();

          const isFreePoint =
            (x, y) => {

              const target =
                document.elementFromPoint(
                  x,
                  y
                );

              return Boolean(
                target?.closest(
                  '[data-knowledge-graph-canvas-stage]'
                )
              ) &&
              !target?.closest(
                '[data-knowledge-graph-canvas-card], button, a, input, select, textarea'
              );
            };

          for (
            let y = stageRect.top + 24;
            y <= stageRect.bottom - 144;
            y += 48
          ) {

            for (
              let x = stageRect.left + 24;
              x <= stageRect.right - 224;
              x += 48
            ) {

              if (isFreePoint(x, y)) {

                return {
                  startX:
                    x,
                  startY:
                    y,
                  endX:
                    x + 200,
                  endY:
                    y + 120
                };
              }
            }
          }

          return {
            startX:
              stageRect.left + stageRect.width / 2,
            startY:
              stageRect.top + stageRect.height / 2,
            endX:
              stageRect.left + stageRect.width / 2 + 80,
            endY:
              stageRect.top + stageRect.height / 2 + 60
          };
        }
      );

    await page.mouse.move(
      panPoints.startX,
      panPoints.startY
    );

    await page.mouse.down();

    await page.mouse.move(
      panPoints.endX,
      panPoints.endY
    );

    await page.mouse.up();

    const afterTransform =
      await worldLocator.evaluate(element =>
        element.style.transform
      );

    const afterHeroBox =
      await heroCard.boundingBox();

    expect(
      afterTransform
    ).not.toBe(
      beforeTransform
    );

    expect(
      Math.abs(afterHeroBox.x - beforeHeroBox.x)
    ).toBeGreaterThan(
      20
    );

    await page.locator('[data-knowledge-graph-layout="hub"]').click();

    await expect(
      page.locator('[data-knowledge-graph-canvas-stage]')
    ).toHaveAttribute(
      'data-layout',
      'hub'
    );

    await expect(
      page.locator('[data-knowledge-graph-layout="hub"]')
    ).toHaveClass(
      /is-active/
    );

    await page.locator('[data-knowledge-graph-filter-action="clear"]').click();
    await page.locator('[data-knowledge-graph-filter-action="orphans"]').click();

    await expect(
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="orphan"]')
    ).toBeVisible();

    await page
      .locator('[data-knowledge-graph-canvas-card][data-node-id="orphan"]')
      .click({
        button: 'right'
      });

    await page.locator('[data-knowledge-graph-node-menu-action="open"]').click();

    await page.waitForFunction(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        return state.currentPage?.id === 'orphan';
      }
    );

    const currentPageId =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          return state.currentPage?.id;
        }
      );

    expect(
      currentPageId
    ).toBe(
      'orphan'
    );
  }
);


test(
  'knowledge-graph-node-menu-uses-shared-popup-positioning-lifecycle',
  async ({ page }) => {

    await page.setViewportSize({
      width:
        640,
      height:
        480
    });

    await page.goto(
      '/'
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
            id:
              'world',
            name:
              'world.md',
            path:
              '/pages/world.md',
            order:
              1,
            title:
              'World',
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
              '<h1>World</h1>[[Hero]]'
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
              'Hero',
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
            relationships:
              [],
            content:
              '<h1>Hero</h1>'
          }
        ]);

        const editor =
          document.querySelector(
            '#editorArea'
          );

        editor.innerHTML =
          createKnowledgeGraphTemplate().content;

        renderKnowledgeGraphPage(
          editor
        );
      }
    );

    const heroCard =
      page.locator(
        '[data-knowledge-graph-canvas-card][data-node-id="hero"]'
      );

    const heroNode =
      page.locator(
        '[data-knowledge-graph-canvas-node="hero"]'
      );

    await expect(
      heroCard
    ).toBeVisible();

    const heroNodeBox =
      await heroNode.boundingBox();

    await heroNode.evaluate(
      (
        node,
        point
      ) => {

        node.dispatchEvent(
          new MouseEvent(
            'contextmenu',
            {
              bubbles:
                true,
              cancelable:
                true,
              button:
                2,
              clientX:
                point.x,
              clientY:
                point.y
            }
          )
        );
      },
      {
        x:
          Math.round(
            heroNodeBox.x + heroNodeBox.width / 2
          ),
        y:
          Math.round(
            heroNodeBox.y + heroNodeBox.height / 2
          )
      }
    );

    const nodeMenu =
      page.locator(
        '[data-knowledge-graph-node-menu]'
      );

    await expect(
      nodeMenu
    ).toBeVisible();

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'data-overlay-lifecycle',
      'popup-manager'
    );

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'data-overlay-kind',
      'context-menu'
    );

    await expect(
      heroCard
    ).toHaveClass(
      /is-selected/
    );

    await page.mouse.click(
      12,
      12
    );

    await expect(
      nodeMenu
    ).toBeHidden();

    await expect(
      nodeMenu
    ).toHaveAttribute(
      'data-overlay-state',
      'closed'
    );

    await heroCard.evaluate(
      card => {

        card.dispatchEvent(
          new MouseEvent(
            'contextmenu',
            {
              bubbles:
                true,
              cancelable:
                true,
              button:
                2,
              clientX:
                window.innerWidth - 4,
              clientY:
                window.innerHeight - 4
            }
          )
        );
      }
    );

    await expect(
      nodeMenu
    ).toBeVisible();

    const edgeMenuBox =
      await nodeMenu.boundingBox();

    const viewportSize =
      page.viewportSize();

    expect(
      edgeMenuBox.x
    ).toBeGreaterThanOrEqual(
      0
    );

    expect(
      edgeMenuBox.y
    ).toBeGreaterThanOrEqual(
      0
    );

    expect(
      edgeMenuBox.x + edgeMenuBox.width
    ).toBeLessThanOrEqual(
      viewportSize.width + 1
    );

    expect(
      edgeMenuBox.y + edgeMenuBox.height
    ).toBeLessThanOrEqual(
      viewportSize.height + 1
    );

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      nodeMenu
    ).toBeHidden();

    const scaleBefore =
      await page
        .locator('[data-knowledge-graph-canvas-stage]')
        .getAttribute('data-scale');

    await page
      .locator('[data-knowledge-graph-canvas-action="zoom-in"]')
      .click();

    const scaleAfter =
      await page
        .locator('[data-knowledge-graph-canvas-stage]')
        .getAttribute('data-scale');

    expect(
      Number(scaleAfter)
    ).toBeGreaterThan(
      Number(scaleBefore)
    );
  }
);


test(
  'knowledge-graph-slice-status-explains-hidden-canvas-nodes',
  async ({ page }) => {

    await page.goto(
      '/'
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

        setPages(
          Array.from(
            {
              length:
                111
            },
            (_, index) => ({
              id:
                `node-${index}`,
              name:
                `node-${index}.md`,
              path:
                `/pages/node-${index}.md`,
              order:
                index + 1,
              title:
                index === 0
                  ? 'World Root'
                  : `Chain Node ${index}`,
              parent:
                index === 0
                  ? null
                  : `node-${index - 1}`,
              template:
                'card',
              type:
                index % 5 === 0
                  ? 'location'
                  : 'note',
              tags:
                [],
              aliases:
                [],
              content:
                `<h1>Chain Node ${index}</h1>`
            })
          )
        );

        const editor =
          document.querySelector(
            '#editorArea'
          );

        editor.innerHTML =
          createKnowledgeGraphTemplate().content;

        renderKnowledgeGraphPage(
          editor
        );
      }
    );

    const filterStatus =
      page.locator(
        '[data-knowledge-graph-filter-status]'
      );

    await expect(
      filterStatus
    ).toHaveText(
      'Фрагмент'
    );

    await expect(
      filterStatus
    ).toHaveAttribute(
      'aria-label',
      /показано 3 из 111 узл\./
    );

    await expect(
      filterStatus
    ).toHaveAttribute(
      'aria-label',
      /вне среза 108/
    );

    await expect(
      page.locator('[data-knowledge-graph-slice-stats]')
    ).toHaveAttribute(
      'aria-label',
      /Показано 3 из 111; скрыто 108/
    );

    await expect(
      page.locator('[data-knowledge-graph-slice-stat="shown"]')
    ).toHaveAttribute(
      'aria-label',
      'Показано: 3'
    );

    await expect(
      page.locator('[data-knowledge-graph-slice-stat="hidden"]')
    ).toHaveAttribute(
      'aria-label',
      'Скрыто: 108'
    );

    await expect(
      page.locator('[data-knowledge-graph-slice-note]')
    ).toContainText(
      'Фрагмент'
    );

    await expect(
      page.locator('[data-knowledge-graph-slice-note]')
    ).toHaveAttribute(
      'aria-label',
      /Показано 3 из 111/
    );

    await page
      .locator('[data-knowledge-graph-slice-action="show-all"]')
      .click();

    await expect(
      filterStatus
    ).toHaveText(
      'Фрагмент'
    );

    await expect(
      filterStatus
    ).toHaveAttribute(
      'aria-label',
      /показано 96 из 111 узл\./
    );

    await expect(
      filterStatus
    ).toHaveAttribute(
      'aria-label',
      /лимит скрыл 15/
    );

    await expect(
      page.locator('[data-knowledge-graph-slice-action="show-all"]')
    ).toHaveCount(
      0
    );

    await page
      .locator('[data-knowledge-graph-slice-action="refine"]')
      .click();

    await expect(
      page.locator('[data-knowledge-graph-filter="search"]')
    ).toBeFocused();
  }
);


test(
  'knowledge-graph-page-read-boundary-uses-page-repository-read-model',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          setPages
        } = await import('/js/stateActions.js');

        const {
          rebuildPageRepository
        } = await import('/js/repository/pageRepository.js');

        const {
          createKnowledgeGraphTemplate
        } = await import('/js/templates/knowledgeGraph.js');

        const {
          renderKnowledgeGraphPage
        } = await import('/js/wiki/knowledgeGraphPage.js');

        setPages([
          {
            id:
              'source',
            name:
              'source.md',
            path:
              '/pages/source.md',
            parent:
              null,
            order:
              1,
            title:
              'Source',
            template:
              'card',
            type:
              'note',
            tags:
              [],
            aliases:
              [],
            relationships:
              [
                {
                  type:
                    'ally',
                  targetTitle:
                    'Stale Relic',
                  label:
                    'Old link'
                }
              ],
            content:
              '<h1>Source</h1>'
          },
          {
            id:
              'relic',
            name:
              'relic.md',
            path:
              '/pages/relic.md',
            parent:
              null,
            order:
              2,
            title:
              'Stale Relic',
            template:
              'card',
            type:
              'character',
            tags:
              [
                'character'
              ],
            aliases:
              [],
            content:
              '<h1>Stale Relic</h1>'
          }
        ]);

        rebuildPageRepository([
          {
            id:
              'source',
            name:
              'source.md',
            path:
              '/pages/source.md',
            parent:
              null,
            order:
              1,
            title:
              'Source',
            template:
              'card',
            type:
              'note',
            tags:
              [],
            aliases:
              [],
            relationships:
              [
                {
                  type:
                    'ally',
                  targetTitle:
                    'Renamed Relic',
                  label:
                    'Updated link'
                },
                {
                  type:
                    'enemy',
                  targetTitle:
                    'Missing Page',
                  label:
                    'Missing endpoint'
                }
              ],
            content:
              '<h1>Source</h1>'
          },
          {
            id:
              'relic',
            name:
              'relic.md',
            path:
              '/pages/relic.md',
            parent:
              null,
            order:
              2,
            title:
              'Renamed Relic',
            template:
              'card',
            type:
              'item',
            tags:
              [
                'artifact'
              ],
            aliases:
              [],
            content:
              '<h1>Renamed Relic</h1>'
          }
        ]);

        const editor =
          document.querySelector(
            '#editorArea'
          );

        editor.innerHTML =
          createKnowledgeGraphTemplate().content;

        renderKnowledgeGraphPage(
          editor
        );
      }
    );

    const relicCard =
      page.locator(
        '[data-knowledge-graph-canvas-card][data-node-id="relic"]'
      );

    await expect(
      relicCard
    ).toContainText(
      'Renamed Relic'
    );

    await expect(
      relicCard
    ).not.toContainText(
      'Stale Relic'
    );

    await expect(
      page.locator('[data-knowledge-graph-canvas-edge][data-edge-from="source"][data-edge-to="relic"]')
    ).toHaveCount(
      1
    );

    await expect(
      page.locator('[data-knowledge-graph-canvas-edge][data-edge-to="missing"]')
    ).toHaveCount(
      0
    );

    await page
      .locator('[data-knowledge-graph-filter="domain"]')
      .selectOption('item');

    await expect(
      relicCard
    ).toBeVisible();

    await relicCard.click({
      force:
        true
    });

    await expect(
      page.locator('[data-knowledge-graph-inspector]')
    ).toContainText(
      'Renamed Relic'
    );
  }
);


test(
  'knowledge-graph-domain-switcher-implements-real-tabs-semantics',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          setPages
        } = await import('/js/stateActions.js');

        const {
          renderKnowledgeGraphPage
        } = await import('/js/wiki/knowledgeGraphPage.js');

        setPages([
          {
            id:
              'hero',
            name:
              'hero.md',
            path:
              '/pages/hero.md',
            parent:
              null,
            order:
              1,
            title:
              'Hero',
            template:
              'card',
            type:
              'character',
            tags:
              [],
            aliases:
              [],
            relationships:
              [
                {
                  type:
                    'equipped',
                  targetId:
                    'sword',
                  label:
                    'Main hand'
                }
              ],
            content:
              '<h1>Hero</h1>'
          },
          {
            id:
              'sword',
            name:
              'sword.md',
            path:
              '/pages/sword.md',
            parent:
              null,
            order:
              2,
            title:
              'Sword',
            template:
              'card',
            type:
              'item',
            tags:
              [],
            aliases:
              [],
            relationships:
              [],
            content:
              '<h1>Sword</h1>'
          }
        ]);

        const editor =
          document.querySelector('#editorArea');

        editor.innerHTML = `
          <div
            class="knowledge-graph-document"
            data-knowledge-graph="v1"
            contenteditable="false"
          >
            <div class="knowledge-graph-domain-tabs" role="tablist">
              <button
                class="knowledge-graph-domain-tab is-active"
                type="button"
                data-knowledge-graph-domain="all"
              >
                Все связи
              </button>
              <button
                class="knowledge-graph-domain-tab"
                type="button"
                data-knowledge-graph-domain="item"
              >
                Предметы
              </button>
              <button
                class="knowledge-graph-domain-tab"
                type="button"
                data-knowledge-graph-domain="rule"
              >
                Правила
              </button>
            </div>

            <div
              class="knowledge-graph-domain-panel is-active"
              data-knowledge-graph-domain-panel="all"
            >
              Все связи panel
            </div>
            <div
              class="knowledge-graph-domain-panel"
              data-knowledge-graph-domain-panel="item"
              hidden
            >
              Предметы panel
            </div>
            <div
              class="knowledge-graph-domain-panel"
              data-knowledge-graph-domain-panel="rule"
              hidden
            >
              Правила panel
            </div>
          </div>
        `;

        renderKnowledgeGraphPage(
          editor
        );
      }
    );

    const tablist =
      page.getByRole(
        'tablist',
        {
          name:
            'Домены связей'
        }
      );

    await expect(
      tablist
    ).toBeVisible();

    const allTab =
      page.getByRole(
        'tab',
        {
          name:
            'Все связи'
        }
      );

    const itemTab =
      page.getByRole(
        'tab',
        {
          name:
            'Предметы'
        }
      );

    const ruleTab =
      page.getByRole(
        'tab',
        {
          name:
            'Правила'
        }
      );

    await expect(
      allTab
    ).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await expect(
      itemTab
    ).toHaveAttribute(
      'aria-selected',
      'false'
    );

    await expect(
      allTab
    ).toHaveAttribute(
      'tabindex',
      '0'
    );

    await expect(
      itemTab
    ).toHaveAttribute(
      'tabindex',
      '-1'
    );

    await expect(
      page.getByRole(
        'tabpanel',
        {
          name:
            'Все связи'
        }
      )
    ).toBeVisible();

    await allTab.focus();

    await page.keyboard.press(
      'ArrowRight'
    );

    await expect(
      itemTab
    ).toBeFocused();

    await expect(
      itemTab
    ).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await expect(
      page.getByRole(
        'tabpanel',
        {
          name:
            'Предметы'
        }
      )
    ).toBeVisible();

    await expect(
      page.getByRole(
        'tabpanel',
        {
          name:
            'Все связи'
        }
      )
    ).toBeHidden();

    await page.keyboard.press(
      'End'
    );

    await expect(
      ruleTab
    ).toBeFocused();

    await expect(
      ruleTab
    ).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await page.keyboard.press(
      'Home'
    );

    await expect(
      allTab
    ).toBeFocused();

    await expect(
      allTab
    ).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await itemTab.focus();

    await page.keyboard.press(
      'Enter'
    );

    await expect(
      itemTab
    ).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await expect(
      page.locator('[data-knowledge-graph-domain-panel="item"]')
    ).toBeVisible();
  }
);
