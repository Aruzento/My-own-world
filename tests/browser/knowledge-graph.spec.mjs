import {
  expect,
  test
} from '@playwright/test';


test(
  'knowledge-graph-can-be-created-and-opens-orphan-pages',
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
          state
        } = await import('/js/state.js');

        const files =
          new Map();

        setStorageAdapter({
          kind: 'memory',
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

        state.pages = [
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
        ];
      }
    );

    await page.locator('#newPageBtn').click();
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
    ).toContainText(
      'Стандартный вид'
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

    await page.locator('[data-knowledge-graph-filter-action="clear"]').click();

    await page.locator('[data-knowledge-graph-canvas-node="hero"]').click();

    await expect(
      page.locator('.knowledge-graph-canvas-selection')
    ).toHaveCount(
      0
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

    await heroCard.click({
      button: 'right'
    });

    await expect(
      page.locator('[data-knowledge-graph-node-menu-action="reset-position"]')
    ).toBeVisible();

    await page.locator('[data-knowledge-graph-node-menu-action="connect"]').click();

    await expect(
      page.locator('[data-knowledge-graph-connect-banner]')
    ).toBeVisible();

    await page.locator('[data-knowledge-graph-connect-type]').selectOption('enemy');

    await page.locator('[data-knowledge-graph-canvas-node="world"]').click();

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
            relationship.targetId === 'world'
          );
      }
    );

    await page.locator('[data-knowledge-graph-filter="viewPreset"]').selectOption('manual');

    await expect(
      page.locator('[data-knowledge-graph-canvas-card][data-node-id="world"]')
    ).toBeVisible();

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
    ).toContainText(
      'соседи'
    );

    await page.locator('[data-knowledge-graph-filter-action="clear"]').click();

    const beforeTransform =
      await worldLocator.evaluate(element =>
        element.style.transform
      );

    const beforeHeroBox =
      await heroCard.boundingBox();

    const stageBox =
      await stageLocator.boundingBox();

    await page.mouse.move(
      stageBox.x + 24,
      stageBox.y + 24
    );

    await page.mouse.down();

    await page.mouse.move(
      stageBox.x + 114,
      stageBox.y + 74
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
