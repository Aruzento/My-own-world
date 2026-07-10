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
      3
    );

    await expect(
      page.locator('.knowledge-graph-domain-card')
    ).toHaveCount(
      4
    );

    await expect(
      page.locator('.knowledge-graph-node').filter({
        hasText: 'Hero'
      })
    ).toBeVisible();

    await expect(
      page.locator('.knowledge-graph-exploration').filter({
        hasText: 'Быстрое исследование мира'
      })
    ).toBeVisible();

    await expect(
      page.locator('.knowledge-graph-scenario-card').filter({
        hasText: 'Персонажи'
      })
    ).toBeVisible();

    await expect(
      page.locator('.knowledge-graph-scenario-card').filter({
        hasText: 'Организации'
      })
    ).toBeVisible();

    await expect(
      page.locator('.knowledge-graph-access-policy').filter({
        hasText: 'admin'
      })
    ).toBeVisible();

    await page.locator('[data-knowledge-graph-domain-shortcut="organization"]').click();

    await expect(
      page.locator('[data-knowledge-graph-domain-panel="organization"] .knowledge-graph-row').filter({
        hasText: 'Faction'
      })
    ).toBeVisible();

    await page.locator('[data-knowledge-graph-tab="relationships"]').click();
    await page.locator('[data-knowledge-graph-domain="all"]').click();

    await expect(
      page.locator('[data-knowledge-graph-domain-panel="all"] .knowledge-graph-row').filter({
        hasText: 'Wiki-ссылка'
      })
    ).toBeVisible();

    await page.locator('.knowledge-graph-relationship-form [name="sourceId"]').selectOption('world');
    await page.locator('.knowledge-graph-relationship-form [name="type"]').selectOption('ally');
    await page.locator('.knowledge-graph-relationship-form [name="targetId"]').selectOption('sword');
    await page.locator('.knowledge-graph-relationship-form [name="label"]').fill('Treasure');
    await page.locator('.knowledge-graph-relationship-form button[type="submit"]').click();
    await page.locator('[data-knowledge-graph-tab="relationships"]').click();

    await expect(
      page.locator('[data-knowledge-graph-domain-panel="all"] .knowledge-graph-row').filter({
        hasText: 'Treasure'
      })
    ).toBeVisible();

    const savedRelationship =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const sourcePage =
            state.pages.find(item =>
              item.id === 'world'
            );

          return {
            relationship:
              sourcePage.relationships?.at(-1) || null,
            content:
              sourcePage.content
          };
        }
      );

    expect(
      savedRelationship.relationship
    ).toEqual({
      type: 'ally',
      targetId: 'sword',
      label: 'Treasure'
    });

    expect(
      savedRelationship.content
    ).toContain(
      'relationshipsJson:'
    );

    await page.locator('[data-knowledge-graph-domain="item"]').click();

    await expect(
      page.locator('[data-knowledge-graph-domain-panel="item"] .knowledge-graph-row').filter({
        hasText: 'Main hand'
      })
    ).toBeVisible();

    await page.locator('[data-knowledge-graph-domain="rule"]').click();

    await expect(
      page.locator('[data-knowledge-graph-domain-panel="rule"] .knowledge-graph-row').filter({
        hasText: 'Rules'
      })
    ).toBeVisible();

    await page.locator('[data-knowledge-graph-tab="orphans"]').click();

    await expect(
      page.locator('.knowledge-graph-row').filter({
        hasText: 'Orphan'
      })
    ).toBeVisible();

    await page.locator(
      '.knowledge-graph-open-page[data-page-id="orphan"]'
    ).click();

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
