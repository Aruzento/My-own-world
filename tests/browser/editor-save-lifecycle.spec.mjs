import { expect, test } from '@playwright/test';

async function setup(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const { createPage } = await import('/js/storage/pageStorage.js');
    const { openPage, saveCurrentPage } = await import('/js/editor/editor.js');
    const { flushPendingAutosave } = await import('/js/editor/autosave.js');
    const f = await adoptionFixture({ actors: [], items: [] });
    const a = await createPage('card', null, 'Initial A', { type: 'character' });
    const b = await createPage('card', null, 'Card B', { type: 'lore' });
    await openPage(a);
    await flushPendingAutosave();
    await saveCurrentPage();
    window.__save = { ...f, a, b, openPage, saveCurrentPage, flushPendingAutosave };
  });
}

async function save(page) {
  const result = await page.evaluate(async () => {
    const f = window.__save;
    const result = await f.flushPendingAutosave() || await f.saveCurrentPage();
    const { getCurrentEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { createPageStateIdentityFromContent } = await import('/js/core/pageRecord.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const durable = await f.adapter.readText(f.a.path);
    return { status: result?.writeStatus, conflict: result?.conflict, base: getCurrentEditorPageBase(),
      durable: createPageStateIdentityFromContent(durable), content: durable, runtime: f.a.content,
      repository: getPageById(f.a.id).content };
  });
  expect(result.conflict, JSON.stringify(result)).not.toBe(true);
  expect(result.status).toBe('saved');
  expect(result.base.stateHash).toBe(result.durable.stateHash);
  expect(result.runtime).toBe(result.content);
  expect(result.repository).toBe(result.content);
  return result.content;
}

test('ordinary structured title/body saves, navigation, reopen and restart keep one durable base', async ({ page }) => {
  await setup(page);
  for (const [title, body] of [['A', 'body one'], ['B', 'body two'], ['C', 'body three']]) {
    await page.locator('#editorArea h1').fill(title); await save(page);
    await page.locator('#editorArea [data-block-type="text"] .rich-text-field').fill(body); await save(page);
  }
  await page.evaluate(async () => { const f = window.__save; await f.openPage(f.b); await f.openPage(f.a); });
  await expect(page.locator('#editorArea h1')).toHaveText('C');
  await page.locator('#editorArea [data-block-type="text"] .rich-text-field').fill('body after return');
  const content = await save(page);
  await page.evaluate(async () => { const f = window.__save; await f.openPage(f.a); });
  await expect(page.locator('#editorArea [data-block-type="text"] .rich-text-field')).toHaveText('body after return');
  const files = await page.evaluate(async () => {
    const adapter = window.__save.adapter;
    const { CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { getAllPages } = await import('/js/repository/pageRepository.js');
    return Promise.all([CARD_TYPE_CATALOG_PATH, ...getAllPages().map(page => page.path)].map(async path => [path, await adapter.readText(path)]));
  });
  await page.reload();
  await page.evaluate(async ({ files, content }) => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { loadWorkspace } = await import('/js/storage/workspaceStorage.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { openPage } = await import('/js/editor/editor.js');
    const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
    for (const [path, bytes] of files) await adapter.writeText(path, bytes);
    await loadWorkspace(); await openPage(getPageById(parsePageRecordContent(content).id));
  }, { files, content });
  await expect(page.locator('#editorArea h1')).toHaveText('C');
  await expect(page.locator('#editorArea [data-block-type="text"] .rich-text-field')).toHaveText('body after return');
});

test('own save in flight followed by another edit/save cannot stale its own editor session', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    const f = window.__save, write = f.adapter.writeText.bind(f.adapter);
    let first = true;
    const barrier = new Promise(resolve => { f.release = resolve; });
    f.adapter.writeText = async (path, content) => {
      await write(path, content);
      if (first && path === f.a.path) { first = false; f.firstWritten = true; await barrier; }
    };
  });
  await page.locator('#editorArea h1').fill('First save');
  await page.evaluate(() => { const f = window.__save; f.first = f.flushPendingAutosave() || f.saveCurrentPage(); });
  await expect.poll(() => page.evaluate(() => window.__save.firstWritten)).toBe(true);
  await page.locator('#editorArea h1').fill('Second save');
  await page.evaluate(() => { const f = window.__save; f.second = f.flushPendingAutosave() || f.saveCurrentPage(); });
  await page.evaluate(() => window.__save.release());
  const result = await page.evaluate(async () => {
    const f = window.__save;
    const first = await f.first, second = await f.second;
    const { getCurrentEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { createPageStateIdentityFromContent } = await import('/js/core/pageRecord.js');
    const durable = await f.adapter.readText(f.a.path);
    return { first, second, base: getCurrentEditorPageBase(), durable: createPageStateIdentityFromContent(durable), content: durable };
  });
  console.log('Own-write lifecycle evidence', JSON.stringify({ first: result.first?.writeStatus, second: result.second?.writeStatus,
    base: result.base?.stateHash, durable: result.durable.stateHash, conflict: result.second?.conflict }));
  expect(result.second?.conflict).not.toBe(true);
  expect(result.second?.writeStatus).toBe('saved');
  expect(result.base.stateHash).toBe(result.durable.stateHash);
  expect(result.content).toContain('Second save');
});

test('navigation waits for in-flight save and pending new body edit before opening another Card', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    const f = window.__save, write = f.adapter.writeText.bind(f.adapter);
    let first = true;
    const barrier = new Promise(resolve => { f.release = resolve; });
    f.adapter.writeText = async (path, content) => {
      await write(path, content);
      if (first && path === f.a.path) { first = false; f.firstWritten = true; await barrier; }
    };
  });
  await page.locator('#editorArea h1').fill('Saved before navigation');
  await page.evaluate(() => { const f = window.__save; f.first = f.saveCurrentPage(); });
  await expect.poll(() => page.evaluate(() => window.__save.firstWritten)).toBe(true);
  await page.locator('#editorArea [data-block-type="text"] .rich-text-field').fill('Pending body at navigation');
  await page.evaluate(() => { const f = window.__save; f.navigation = f.openPage(f.b); });
  await expect(page.locator('#editorArea h1')).toHaveText('Saved before navigation');
  await page.evaluate(async () => { const f = window.__save; f.release(); await f.navigation; });
  await expect(page.locator('#editorArea h1')).toHaveText('Card B');
  await page.evaluate(async () => { const f = window.__save; await f.openPage(f.a); });
  await expect(page.locator('#editorArea [data-block-type="text"] .rich-text-field')).toHaveText('Pending body at navigation');
  await page.locator('#editorArea h1').fill('After navigation');
  await save(page);
});

test('real external PageCommand after editor base remains a conflict, with no silent overwrite', async ({ page }) => {
  await setup(page);
  const external = await page.evaluate(async () => {
    const f = window.__save;
    const { updatePageRecordContent, createPageStateIdentityFromContent } = await import('/js/core/pageRecord.js');
    const { persistPageContentCommand, snapshotPageForCommand } = await import('/js/storage/pageCommandService.js');
    const content = updatePageRecordContent(f.a.content, { body: '<h1>External latest title</h1><p>External latest body</p>' });
    const result = await persistPageContentCommand({ page: f.a, content, previousPage: snapshotPageForCommand(f.a),
      expectedBase: createPageStateIdentityFromContent(f.a.content), reason: 'external-editor' });
    return { content, status: result.writeStatus };
  });
  expect(external.status).toBe('saved');
  await page.locator('#editorArea h1').fill('My stale draft');
  const result = await page.evaluate(async () => {
    const f = window.__save, before = f.writes.length;
    const result = await f.saveCurrentPage();
    return { result, writes: f.writes.length - before, durable: await f.adapter.readText(f.a.path) };
  });
  expect(result.result.conflict).toBe(true);
  expect(result.result.written).toBe(false);
  expect(result.writes).toBe(0);
  expect(result.durable).toBe(external.content);
  await expect(page.locator('#editorArea h1')).toHaveText('My stale draft');
});

test('navigation also waits for an active own save after its autosave timer has been consumed', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    const f = window.__save, write = f.adapter.writeText.bind(f.adapter);
    const barrier = new Promise(resolve => { f.release = resolve; });
    f.adapter.writeText = async (path, content) => {
      await write(path, content);
      if (path === f.a.path) { f.firstWritten = true; await barrier; }
    };
  });
  await page.locator('#editorArea h1').fill('Active save without pending timer');
  await page.evaluate(() => { const f = window.__save; f.first = f.flushPendingAutosave(); });
  await expect.poll(() => page.evaluate(() => window.__save.firstWritten)).toBe(true);
  await page.evaluate(() => { const f = window.__save; f.navigation = f.openPage(f.b); });
  await expect(page.locator('#editorArea h1')).toHaveText('Active save without pending timer');
  await page.evaluate(async () => { const f = window.__save; f.release(); await f.navigation; });
  await expect(page.locator('#editorArea h1')).toHaveText('Card B');
  await page.evaluate(async () => { const f = window.__save; await f.openPage(f.a); });
  await expect(page.locator('#editorArea h1')).toHaveText('Active save without pending timer');
});

test('uncertain own write blocks a queued editor save without retry or base advancement', async ({ page }) => {
  await setup(page);
  await page.evaluate(async () => {
    const f = window.__save, write = f.adapter.writeText.bind(f.adapter), read = f.adapter.readText.bind(f.adapter);
    const { getCurrentEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    f.originalBase = getCurrentEditorPageBase(); f.failedReads = 0; f.itemWrites = 0;
    const barrier = new Promise(resolve => { f.release = resolve; });
    f.adapter.writeText = async (path, content) => {
      await write(path, content);
      if (path === f.a.path) { f.itemWrites++; f.firstWritten = true; await barrier; f.failReadback = true; }
    };
    f.adapter.readText = async path => {
      if (path === f.a.path && f.failReadback) { f.failedReads++; throw new Error('Injected durable readback unavailable'); }
      return read(path);
    };
  });
  await page.locator('#editorArea h1').fill('Uncertain first write');
  await page.evaluate(() => { const f = window.__save; f.first = f.flushPendingAutosave(); });
  await expect.poll(() => page.evaluate(() => window.__save.firstWritten)).toBe(true);
  await page.locator('#editorArea h1').fill('Queued draft must not retry');
  await page.evaluate(() => { const f = window.__save; f.second = f.flushPendingAutosave(); f.release(); });
  const result = await page.evaluate(async () => {
    const f = window.__save;
    const first = await f.first, second = await f.second;
    const { getCurrentEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    return { first, second, reads: f.failedReads, writes: f.itemWrites, base: getCurrentEditorPageBase(), original: f.originalBase };
  });
  expect(result.first.blocked).toBe(true);
  expect(result.second).toEqual(result.first);
  expect(result.reads).toBe(1);
  expect(result.writes).toBe(1);
  expect(result.base).toEqual(result.original);
});
