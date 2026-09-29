import { expect, test } from '@playwright/test';

async function fixture(page, options = {}) {
  await page.goto('/');
  await page.evaluate(async options => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { BUNDLED_CARD_TYPE_DEFINITIONS: types, BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
    const { CARD_TYPE_CATALOG_PATH, createCardTypeRegistryFromCatalog, serializeCardTypeCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { setPages } = await import('/js/stateActions.js');
    const { createItemsBlock, createCharacterSheetBlock } = await import('/js/templates/blockTypes.js');
    const { openPage } = await import('/js/editor/editor.js');
    const { readCharacterModelFromPage } = await import('/js/character/characterModel.js');
    const { readInventorySource, prepareInventoryContext } = await import('/js/character/structuredInventory.js');
    const { applyBlockSystemContract, serializePersistentEditorHTML } = await import('/js/editor/blocks/blockContract.js');
    const adapter = createMemoryStorageAdapter();
    setStorageAdapter(adapter);
    const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
    const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
    if (!options.noCatalog) await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
    const oldBlock = createItemsBlock({ title: 'Инвентарь' }).replace('<div class="item-set-list"></div>', `
      <div class="item-set-list"><button class="item-set-chip" type="button" data-page-id="B">
        <span class="item-set-title">Conflicting B</span><label class="item-set-quantity-label"><input class="item-set-quantity" type="text" value="99"></label>
        <span class="item-set-remove">×</span></button></div>`);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<h1>Inventory Actor</h1><p data-persistent-editable="true">Original body</p>${oldBlock}${createCharacterSheetBlock()}`;
    applyBlockSystemContract(wrapper);
    const actorBody = serializePersistentEditorHTML(wrapper);
    function record(id, type, values, body) {
      let content = buildPageRecordContent({ id, type, template: 'card', schemaVersion: values ? 2 : 1, body,
        ...(values ? { variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: registry.getResolvedType(type, 1).digest, values, overrides: {} } } : {}) });
      if (options.future && id === 'actor') content = content.replace(/variablesJson:.*\n/, 'variablesJson: {"formatVersion":2}\n');
      return createRuntimePageFromContent({ content, path: `/pages/${id}.md`, name: `${id}.md` });
    }
    const inventoryValues = options.absent ? {} : options.partial ? { 'dnd.items': [] } : {
      'dnd.items': options.empty ? [] : [{ pageId: 'A' }],
      'dnd.equippedItems': options.empty ? [] : [{ pageId: 'A' }]
    };
    const actor = record('actor', 'character', options.legacy ? null : {
      ...inventoryValues, 'dnd.level': 5,
      'character.abilities': { 'character.abilities.strength': 16, 'character.abilities.dexterity': 14 },
      'dnd.health': { 'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 0 },
      'dnd.armorClass': { 'dnd.armorClass.value': 14 }
    }, actorBody);
    const effect = amount => `<script type="application/json" data-character-effects>{"effects":[{"id":"item-bonus","title":"Item shield","modifiers":{"armorClass":${amount}}}]}</script>`;
    const A = record('A', 'item', { 'item.quantity': 0, 'item.equipped': false }, '<h1>Item A</h1>' + effect(2));
    const B = record('B', 'item', { 'item.quantity': 3 }, '<h1>Conflicting B</h1>' + effect(100));
    const C = record('C', 'item', { 'item.quantity': 3 }, '<h1>Item C</h1>');
    const pages = [actor, A, B, C];
    for (const target of pages) await adapter.writeText(target.path, target.content);
    setPages(pages);
    const writes = [];
    const write = adapter.writeText.bind(adapter);
    adapter.writeText = async (path, content) => { writes.push(path); return write(path, content); };
    await openPage(actor);
    window.__inventory = { adapter, actor, pages, registry, writes, originalBody: parsePageRecordContent(actor.content).rawBody,
      async read() {
        const actor = this.actor;
        const durable = parsePageRecordContent(await adapter.readText(actor.path));
        const context = await prepareInventoryContext({ page: actor });
        return { values: durable.variablesJson?.values || null, body: durable.rawBody,
          inventory: readInventorySource(actor, context),
          character: readCharacterModelFromPage(actor, { registry, pages }), writes: [...writes] };
      }
    };
  }, options);
}

test('structured Item Set UI uses Entity inventory, Item quantity, effects and durable autosave/reload', async ({ page }) => {
  await fixture(page);
  const runtime = page.locator('#editorArea .inventory-runtime');
  await expect(runtime.locator('.item-set-chip')).toHaveCount(1);
  await expect(runtime.locator('[data-page-id="A"] .item-set-quantity')).toHaveValue('0');
  await expect(page.locator('#editorArea .item-set-block > .item-set-list')).toBeHidden();
  let state = await page.evaluate(() => window.__inventory.read());
  expect(state.character.armorClass).toBe(16);
  expect(state.character.inventory.items.map(item => item.pageId)).toEqual(['A']);
  expect(state.character.inventory.items[0].equipped).toBe(true);

  await runtime.locator('.item-set-add-btn').click();
  await page.locator('#itemSetPicker .item-set-option').filter({ hasText: 'Item C' }).click();
  await expect(runtime.locator('[data-page-id="C"]')).toBeVisible();
  state = await page.evaluate(() => window.__inventory.read());
  expect(state.values['dnd.items']).toEqual([{ pageId: 'A' }, { pageId: 'C' }]);
  expect(state.body).toBe(await page.evaluate(() => window.__inventory.originalBody));
  expect(state.writes).toEqual(['/pages/actor.md']);
  await expect(page.locator('.character-sheet-panel').filter({ hasText: 'Инвентарь' })).toContainText('Item C');

  const quantity = runtime.locator('[data-page-id="C"] .item-set-quantity');
  await quantity.fill('0');
  await quantity.press('Tab');
  await expect.poll(() => page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    return parsePageRecordContent(await window.__inventory.adapter.readText('/pages/C.md')).variablesJson.values['item.quantity'];
  })).toBe(0);
  await expect(quantity).toHaveValue('0');
  await expect(page.locator('.character-sheet-panel').filter({ hasText: 'Инвентарь' }).locator('li').filter({ hasText: 'Item C' }).locator('strong')).toHaveText('0');
  state = await page.evaluate(() => window.__inventory.read());
  expect(state.writes).toEqual(['/pages/actor.md', '/pages/C.md']);
  expect(state.body).toBe(await page.evaluate(() => window.__inventory.originalBody));

  await runtime.locator('[data-page-id="A"] .item-set-remove').click();
  await expect(runtime.locator('[data-page-id="A"]')).toHaveCount(0);
  state = await page.evaluate(() => window.__inventory.read());
  expect(state.values['dnd.items']).toEqual([{ pageId: 'C' }]);
  expect(state.values['dnd.equippedItems']).toEqual([]);
  expect(state.character.armorClass).toBe(14);
  expect(state.writes).toEqual(['/pages/actor.md', '/pages/C.md', '/pages/actor.md']);

  await page.locator('#editorArea [data-persistent-editable]').evaluate(node => {
    node.textContent = 'Body autosave after inventory write';
    node.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'x', inputType: 'insertText' }));
  });
  await expect.poll(() => page.evaluate(async () => (await window.__inventory.read()).body.includes('Body autosave after inventory write'))).toBe(true);
  state = await page.evaluate(() => window.__inventory.read());
  expect(state.values['dnd.items']).toEqual([{ pageId: 'C' }]);
  expect(state.body).not.toContain('inventory-runtime');
  const old = await page.evaluate(async () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = (await window.__inventory.read()).body;
    return { ids: [...wrapper.querySelectorAll('.item-set-chip')].map(chip => chip.dataset.pageId), quantity: wrapper.querySelector('.item-set-quantity').value };
  });
  expect(old).toEqual({ ids: ['B'], quantity: '99' });
  await reload(page);
  await expect(runtime.locator('.item-set-chip')).toHaveCount(1);
  await expect(runtime.locator('[data-page-id="C"] .item-set-quantity')).toHaveValue('0');
});

test('per-domain compatibility keeps legacy Item Set owner on structured Character without inventory fields', async ({ page }) => {
  await fixture(page, { absent: true });
  await expect(page.locator('.inventory-runtime')).toHaveCount(0);
  const input = page.locator('#editorArea .item-set-chip[data-page-id="B"] .item-set-quantity');
  await expect(input).toHaveValue('99');
  await expect(page.locator('[data-character-sheet-field="level"]')).toHaveValue('5');
  await expect(page.locator('[data-character-sheet-field="hpCurrent"]')).toHaveValue('8');
  await input.fill('3');
  await input.press('Tab');
  await expect.poll(() => page.evaluate(async () => (await window.__inventory.read()).inventory.items[0]?.quantity)).toBe(3);
  const state = await page.evaluate(() => window.__inventory.read());
  expect(state.inventory.source).toBe('items-block');
  expect(state.values['dnd.items']).toBeUndefined();
  expect(state.values['dnd.equippedItems']).toBeUndefined();
  expect(state.values['dnd.health']['dnd.hpCurrent']).toBe(8);
  expect(state.character.armorClass).toBe(114);
  await reload(page);
  await expect(input).toHaveValue('3');
});

test('empty arrays beat conflicting block; partial/future/missing catalog disables inventory UI', async ({ page }) => {
  for (const options of [{ empty: true }, { partial: true }, { future: true }, { noCatalog: true }]) {
    await fixture(page, options);
    const runtime = page.locator('#editorArea .inventory-runtime');
    await expect(runtime).toBeVisible();
    await expect(runtime.locator('.item-set-chip')).toHaveCount(0);
    if (options.empty) await expect(runtime.locator('.item-set-add-btn')).toBeVisible();
    else {
      await expect(runtime).toContainText('недоступен');
      await expect(runtime.locator('.item-set-add-btn')).toHaveCount(0);
    }
    expect((await page.evaluate(() => window.__inventory.read())).writes).toEqual([]);
  }
});

test('legacy Inventory quantity/add/remove remains catalog-independent', async ({ page }) => {
  await fixture(page, { legacy: true, noCatalog: true });
  await expect(page.locator('.inventory-runtime')).toHaveCount(0);
  const original = page.locator('#editorArea .item-set-chip[data-page-id="B"]');
  await original.locator('.item-set-quantity').fill('0');
  await original.locator('.item-set-quantity').press('Tab');
  await expect(original.locator('.item-set-quantity')).toHaveValue('1');
  await page.locator('#editorArea .item-set-add-btn').click();
  await page.locator('#itemSetPicker .item-set-option').filter({ hasText: 'Item C' }).click();
  await expect(page.locator('#editorArea .item-set-chip[data-page-id="C"]')).toBeVisible();
  await original.locator('.item-set-remove').click();
  await expect(original).toHaveCount(0);
  await reload(page);
  await expect(page.locator('#editorArea .item-set-chip[data-page-id="C"]')).toBeVisible();
  const state = await page.evaluate(() => window.__inventory.read());
  expect(state.values).toBeNull();
  expect(state.inventory.items.map(item => item.pageId)).toEqual(['C']);
});

async function reload(page) {
  await page.evaluate(async () => {
    const { createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
    const { setPages } = await import('/js/stateActions.js');
    const { openPage } = await import('/js/editor/editor.js');
    const f = window.__inventory;
    f.pages = await Promise.all(f.pages.map(async target => createRuntimePageFromContent({ content: await f.adapter.readText(target.path), path: target.path, name: target.name })));
    f.actor = f.pages[0];
    setPages(f.pages);
    await openPage(f.actor);
  });
}

test('creating Item from structured inventory keeps legacy Item creation and adds only exact actor reference', async ({ page }) => {
  await fixture(page, { empty: true });
  await page.locator('#editorArea .inventory-runtime .item-set-add-btn').click();
  await page.locator('#itemSetPicker .item-set-create-toggle').click();
  await page.locator('#itemSetPicker .item-set-create-title').fill('Created from Inventory');
  await page.locator('#itemSetPicker .item-set-create-confirm').click();
  const chip = page.locator('#editorArea .inventory-runtime .item-set-chip');
  await expect(chip).toContainText('Created from Inventory');
  await expect(chip.locator('.item-set-quantity')).toBeDisabled();
  const created = await page.evaluate(async () => {
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const f = window.__inventory;
    const actor = parsePageRecordContent(await f.adapter.readText(f.actor.path));
    const id = actor.variablesJson.values['dnd.items'][0].pageId;
    const item = getPageById(id);
    const durable = parsePageRecordContent(await f.adapter.readText(item.path));
    return { id, type: durable.type, mode: durable.variablesStatus.mode,
      actorWrites: f.writes.filter(path => path === f.actor.path).length, body: actor.rawBody };
  });
  expect(created.type).toBe('item');
  expect(created.mode).toBe('legacy');
  expect(created.actorWrites).toBe(1);
  expect(created.body).toBe(await page.evaluate(() => window.__inventory.originalBody));
  await expect(chip).toHaveAttribute('data-page-id', created.id);
});

test('source activation while Sheet is open blocks stale legacy quantity controls without body autosave', async ({ page }) => {
  await fixture(page, { absent: true });
  await page.evaluate(async () => {
    const { prepareInventoryContext } = await import('/js/character/structuredInventory.js');
    const { prepareVariablesChange, commitVariablesChange } = await import('/js/variables/entityVariables.js');
    const { getCurrentEditorPageBase, advanceEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const f = window.__inventory;
    const context = await prepareInventoryContext({ page: f.actor });
    const result = await commitVariablesChange(prepareVariablesChange({
      pageId: f.actor.id, expectedBase: getCurrentEditorPageBase(f.actor.id), context,
      patch: [{ op: 'set', key: 'dnd.items', value: [{ pageId: 'A' }] }, { op: 'set', key: 'dnd.equippedItems', value: [] }]
    }));
    if (result.status !== 'saved') throw new Error('fixture activation failed');
    advanceEditorPageBase(f.actor, f.actor.content);
  });
  const oldQuantity = page.locator('#editorArea .item-set-block > .item-set-list .item-set-quantity');
  await oldQuantity.fill('7');
  await oldQuantity.press('Tab');
  await expect(page.locator('#editorArea .inventory-runtime [data-page-id="A"]')).toBeVisible();
  const state = await page.evaluate(() => window.__inventory.read());
  expect(state.body).toBe(await page.evaluate(() => window.__inventory.originalBody));
  expect(state.writes).toEqual(['/pages/actor.md']);
  expect(state.inventory.items[0].quantity).toBe(0);
});
