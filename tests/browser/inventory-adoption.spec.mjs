import { test, expect } from '@playwright/test';

async function fixture(page, options = {}) {
  await page.goto('/');
  await page.evaluate(async options => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const { applyBlockSystemContract, serializePersistentEditorHTML } = await import('/js/editor/blocks/blockContract.js');
    const { updatePageRecordContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { openPage } = await import('/js/editor/editor.js');
    const { createCharacterSheetBlock } = await import('/js/templates/blockTypes.js');
    const actors = [{ id: 'actor', type: options.player ? 'player' : 'character',
      blocks: options.empty ? [[]] : [[['A', '3']]], values: options.partial ? { 'dnd.items': [] } : {} }];
    if (options.conflict) actors.push({ id: 'other', blocks: [[['A', '4']]] });
    const f = await adoptionFixture({ actors, items: [{ id: 'A', values: options.legacyItem ? null : {} }] });
    const wrapper = document.createElement('div');
    wrapper.innerHTML = parsePageRecordContent(f.actor.content).rawBody + createCharacterSheetBlock();
    applyBlockSystemContract(wrapper);
    f.actor.content = updatePageRecordContent(f.actor.content, { body: serializePersistentEditorHTML(wrapper) });
    await f.adapter.writeText(f.actor.path, f.actor.content);
    f.originalBody = parsePageRecordContent(f.actor.content).rawBody;
    f.originalItem = f.item.content;
    f.writes.length = 0;
    f.options = { pageIds: ['actor'] };
    window.__adoption = f;
    await openPage(f.actor);
  }, options);
}

async function reread(page) {
  return page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { prepareInventoryContext, readInventorySource } = await import('/js/character/structuredInventory.js');
    const f = window.__adoption;
    const actor = parsePageRecordContent(await f.adapter.readText(f.actor.path));
    return { values: actor.variablesJson.values, body: actor.rawBody,
      item: parsePageRecordContent(await f.adapter.readText(f.item.path)).variablesJson?.values,
      inventory: readInventorySource(f.actor, await prepareInventoryContext({ page: f.actor })),
      writes: f.writes.map(write => write.path) };
  });
}

async function reopen(page) {
  await page.evaluate(async () => {
    const { createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
    const { setPages } = await import('/js/stateActions.js');
    const { openPage } = await import('/js/editor/editor.js');
    const f = window.__adoption;
    f.pages = await Promise.all(f.pages.map(async target => createRuntimePageFromContent({ content: await f.adapter.readText(target.path), path: target.path, name: target.name })));
    f.actor = f.pages.find(page => page.id === 'actor'); f.item = f.pages.find(page => page.id === 'A');
    setPages(f.pages); await openPage(f.actor);
  });
}

for (const player of [false, true]) {
  test(`explicit ${player ? 'Player' : 'Character'} adoption preserves legacy list, switches owner, Item-only quantity and body autosave/reopen`, async ({ page }) => {
    await fixture(page, { player });
    expect((await reread(page)).inventory.source).toBe('unavailable');
    await expect(page.locator('#editorArea .item-set-quantity')).toHaveValue('3');
    const result = await page.evaluate(async () => {
      const { previewInventoryAdoption, executeInventoryAdoption } = await import('/js/migration/inventoryAdoption.js');
      const f = window.__adoption;
      const preview = await previewInventoryAdoption(f.options);
      const zeroWrites = f.writes.length;
      const result = await executeInventoryAdoption(preview, { confirm: true });
      f.backupId = result.backupId;
      const { renderInventoryItemSets } = await import('/js/ui/inventoryItemSets.js');
      await renderInventoryItemSets(document.getElementById('editorArea'));
      return { result, zeroWrites, raw: preview.actors[0].quantities };
    });
    expect(result.zeroWrites).toBe(0);
    expect(result.result.status, JSON.stringify(result)).toBe('completed');
    let state = await reread(page);
    expect(state.inventory.source).toBe('entity');
    expect(state.inventory.items.map(item => [item.pageId, item.quantity])).toEqual([['A', 3]]);
    expect(state.values['dnd.items']).toEqual([{ pageId: 'A' }]);
    expect(state.values['dnd.equippedItems']).toEqual([]);
    expect(state.body).toBe(await page.evaluate(() => window.__adoption.originalBody));
    expect(state.writes.filter(path => path.startsWith('pages/'))).toEqual(['pages/A.md', 'pages/actor.md']);
    const runtime = page.locator('#editorArea .inventory-runtime');
    await expect(runtime.locator('.item-set-quantity')).toHaveValue('3');
    await expect(page.locator('#editorArea .item-set-block > .item-set-list')).toBeHidden();
    // Preserved legacy input remains recovery evidence, even a synthetic event
    // cannot turn it back into the active writer.
    await page.locator('#editorArea .item-set-block > .item-set-list .item-set-quantity').evaluate(input => {
      input.value = '99'; input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(runtime.locator('.item-set-quantity')).toHaveValue('3');
    state = await reread(page);
    expect(state.body).toBe(await page.evaluate(() => window.__adoption.originalBody));
    const beforeCount = state.writes.filter(path => path.startsWith('pages/')).length;
    await runtime.locator('.item-set-quantity').fill('5');
    await runtime.locator('.item-set-quantity').press('Tab');
    await expect.poll(async () => (await reread(page)).item['item.quantity']).toBe(5);
    state = await reread(page);
    expect(state.writes.filter(path => path.startsWith('pages/')).slice(beforeCount)).toEqual(['pages/A.md']);
    await page.locator('#editorArea p[data-persistent-editable]').evaluate(node => {
      node.textContent = 'Body autosave after adoption';
      node.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'x', inputType: 'insertText' }));
    });
    await expect.poll(async () => (await reread(page)).body.includes('Body autosave after adoption')).toBe(true);
    state = await reread(page);
    expect(state.values['dnd.items']).toEqual([{ pageId: 'A' }]);
    expect(state.body).not.toContain('inventory-runtime');
    expect(state.body).toContain('value="3"');
    await reopen(page);
    await expect(runtime.locator('.item-set-quantity')).toHaveValue('5');
    expect((await reread(page)).inventory.source).toBe('entity');
    await reload(page);
    await expect(runtime.locator('.item-set-quantity')).toHaveValue('5');
    expect((await reread(page)).inventory.source).toBe('entity');
  });
}

test('real inert extraction: Item Set/universal items, strict raw evidence, explicit empty and multiple blocks', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const { extractLegacyInventory } = await import('/js/migration/legacyInventoryExtraction.js');
    const { record, inventoryBody } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const { createListBlock } = await import('/js/templates/blockTypes.js');
    const universal = createListBlock({ kind: 'items' }).replace('<div class="universal-list-list item-set-list"></div>', '<div class="universal-list-list item-set-list"><button class="item-set-chip universal-list-chip" data-page-id="A"><input class="item-set-quantity" value="2"></button></div>');
    const bodies = [inventoryBody([[['A', '2'], ['A', '3']]]), universal, createListBlock({ kind: 'spells' }),
      inventoryBody([[]]), inventoryBody([]), inventoryBody([[['A', '1']], [['A', '1']]]),
      ...['0', '-1', '1.5', '', 'text'].map(value => inventoryBody([[['A', value]]])),
      inventoryBody([[[null, '1']]]),
      universal.replace('data-list-kind="items"', 'data-list-kind="spells"'),
      '<div class="universal-list-block item-set-block"><div class="item-set-list"></div></div>'];
    const before = document.body.innerHTML;
    const extracted = bodies.map(body => extractLegacyInventory(record('actor', 'character', {}, body)));
    return { extracted, inert: document.body.innerHTML === before };
  });
  expect(results.inert).toBe(true);
  expect(results.extracted[0].blocks[0].chips.map(chip => chip.rawQuantity)).toEqual(['2', '3']);
  expect(results.extracted[1].blocks[0].type).toBe('universal-items');
  expect(results.extracted[2].blocks).toHaveLength(0);
  expect(results.extracted[3].blocks[0].chips).toHaveLength(0);
  expect(results.extracted[4].blocks).toHaveLength(0);
  expect(results.extracted[5].issues[0].code).toBe('multiple-inventory-blocks');
  for (const extraction of results.extracted.slice(6, 12)) expect(extraction.blocks[0].chips[0].issues.length).toBeGreaterThan(0);
  for (const extraction of results.extracted.slice(12)) expect(extraction.blocks[0].issues[0].code).toBe('ambiguous-inventory-kind');
});

async function reload(page) {
  const saved = await page.evaluate(async () => {
    const f = window.__adoption, files = [];
    async function directory(path) {
      for (const entry of await f.adapter.listFiles(path)) {
        const target = path ? `${path}/${entry.name}` : entry.name;
        if (entry.kind === 'directory') await directory(target);
        else files.push([target, await f.adapter.readText(target)]);
      }
    }
    await directory('');
    return { files, originalBody: f.originalBody, originalItem: f.originalItem };
  });
  await page.reload();
  await page.evaluate(async saved => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
    const { setPages } = await import('/js/stateActions.js');
    const { openPage } = await import('/js/editor/editor.js');
    const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
    for (const [path, content] of saved.files) await adapter.writeText(path, content);
    const pages = saved.files.filter(([path]) => path.startsWith('pages/')).map(([path, content]) => createRuntimePageFromContent({ content, path, name: path.split('/').at(-1) }));
    const actor = pages.find(page => page.id === 'actor'), item = pages.find(page => page.id === 'A');
    window.__adoption = { adapter, pages, actor, item, writes: [], ...saved };
    setPages(pages); await openPage(actor);
  }, saved);
}

test('empty adoption is idempotent; divergent quantities/legacy Item/partial actor preview never writes', async ({ page }) => {
  for (const options of [{ empty: true }, { conflict: true }, { legacyItem: true }, { partial: true }]) {
    await fixture(page, options);
    const result = await page.evaluate(async () => {
      const { previewInventoryAdoption, executeInventoryAdoption } = await import('/js/migration/inventoryAdoption.js');
      const f = window.__adoption;
      const preview = await previewInventoryAdoption(f.options);
      const first = await executeInventoryAdoption(preview, { confirm: true });
      const second = await executeInventoryAdoption(await previewInventoryAdoption(f.options), { confirm: true });
      return { first, second, previewStatus: preview.actors[0].status, writes: f.writes.length };
    });
    if (options.empty) {
      expect(result.first.status).toBe('completed'); expect(result.second.status).toBe('skipped');
      expect((await reread(page)).inventory.source).toBe('entity');
    } else {
      expect(result.first.status).toBe('skipped'); expect(result.writes).toBe(0);
      expect(result.previewStatus).toBe(options.partial ? 'partial-source' : 'blocked');
    }
  }
});

test('explicit verified recovery restores legacy owner and original Item; reopen never adopts', async ({ page }) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const { previewInventoryAdoption, executeInventoryAdoption, recoverInventoryAdoption } = await import('/js/migration/inventoryAdoption.js');
    const f = window.__adoption;
    const adopted = await executeInventoryAdoption(await previewInventoryAdoption(f.options), { confirm: true });
    if (adopted.status !== 'completed') return { adopted };
    const restored = await recoverInventoryAdoption(adopted.backupId, { confirm: true });
    return { adopted, restored, itemPreserved: await f.adapter.readText(f.item.path) === f.originalItem };
  });
  expect(result.adopted.status, JSON.stringify(result)).toBe('completed');
  expect(result.restored.restoredPages).toBe(2); expect(result.itemPreserved).toBe(true);
  await reopen(page);
  expect((await reread(page)).inventory.source).toBe('unavailable');
  expect((await reread(page)).values['dnd.items']).toBeUndefined();
  await expect(page.locator('#editorArea .inventory-runtime')).toContainText('недоступен');
  await expect(page.locator('#editorArea .item-set-quantity')).toHaveValue('3');
});
