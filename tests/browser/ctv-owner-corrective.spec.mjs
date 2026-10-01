import { expect, test } from '@playwright/test';

async function setup(page, type = 'player') {
  await page.goto('/');
  return page.evaluate(async type => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const { createPage } = await import('/js/storage/pageStorage.js');
    const { openPage } = await import('/js/editor/editor.js');
    const { renderUniversalCardInspector } = await import('/js/ui/cardInspector/universalCardInspector.js');
    const { registry } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const f = await adoptionFixture();
    // This acceptance fixture carries real asset bytes, unlike the generic
    // conflict fixture's presentation-only readBinary stub.
    f.adapter.readBinary = async path => {
      const value = await f.adapter.readText(path);
      if (!(value instanceof ArrayBuffer)) throw new Error('Missing binary asset ' + path);
      return value;
    };
    const page = await createPage('card', null, 'Acceptance card', { type });
    if (page.type !== type) {
      const { prepareNewCardEnvelope } = await import('/js/storage/structuredPageCreation.js');
      const { updatePageRecordContent, createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
      const content = updatePageRecordContent(page.content, { type, variablesJson: await prepareNewCardEnvelope(type, f.adapter) });
      Object.assign(page, createRuntimePageFromContent({ content, path: page.path, name: page.name }));
      await f.adapter.writeText(page.path, content);
    }
    await openPage(page);
    let traversals = 0;
    const repository = await import('/js/repository/pageRepository.js');
    const measuredRepository = { ...repository, getAllPages() { traversals++; return repository.getAllPages(); } };
    const start = performance.now();
    await renderUniversalCardInspector(page, { registry, repository: measuredRepository });
    const result = { duration: Math.round(performance.now() - start), traversals,
      fields: document.querySelectorAll('.card-inspector__field').length, type: page.type };
    window.__acceptance = { ...f, page, measuredRepository, registry, counts: () => traversals };
    return result;
  }, type);
}

test('owner type confirmation changes runtime, durable type and Inspector schema', async ({ page }) => {
  console.log('Inspector measured render', await setup(page));
  const before = await page.evaluate(async () => {
    const { updatePageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { openPage } = await import('/js/editor/editor.js');
    const f = window.__acceptance, record = parsePageRecordContent(f.page.content);
    const variablesJson = structuredClone(record.variablesJson);
    variablesJson.values['player.progression'] = { 'dnd.level': 4, 'player.progression.experience': { 'player.progression.experience.current': 900 } };
    const content = updatePageRecordContent(f.page.content, { variablesJson, tags: ['card', 'owner-tag'], aliases: ['Owner alias'],
      relationshipsJson: [{ targetPageId: 'item-A', type: 'related' }] }, { preserveUnchangedMetadata: true });
    Object.assign(f.page, createRuntimePageFromContent({ content, path: f.page.path, name: f.page.name }));
    await f.adapter.writeText(f.page.path, content); await openPage(f.page);
    return parsePageRecordContent(content);
  });
  await page.locator('.card-type-trigger').click();
  await page.locator('.card-type-option[data-value="item"]').click();
  await page.getByRole('button', { name: 'Изменить тип', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__acceptance.page.type)).toBe('item');
  const result = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    return parsePageRecordContent(await window.__acceptance.adapter.readText(window.__acceptance.page.path));
  });
  expect(result.type).toBe('item');
  expect(result.rawBody).toBe(before.rawBody); expect(result.tags).toEqual(before.tags);
  expect(result.aliases).toEqual(before.aliases); expect(result.relationshipsJson).toEqual(before.relationshipsJson);
  expect(result.variablesJson.inactive.some(entry => entry.path?.[1] === 'player.progression')).toBe(true);
  expect(await page.evaluate(async () => (await import('/js/ui/cardInspector/universalCardInspector.js')).getUniversalCardInspectorState().snapshot.type)).toBe('item');
  await reopen(page); await expect(page.locator('.card-type-current')).toHaveText('Предмет');
  await browserReloadCard(page); await expect(page.locator('.card-type-current')).toHaveText('Предмет');
});

async function reopen(page) {
  return page.evaluate(async () => {
    const { openPage } = await import('/js/editor/editor.js');
    const { loadWorkspace } = await import('/js/storage/workspaceStorage.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const f = window.__acceptance;
    const durable = await f.adapter.readText(f.page.path);
    const id = f.page.id;
    await loadWorkspace(); f.page = getPageById(id);
    await openPage(f.page);
    return parsePageRecordContent(durable);
  });
}

async function browserReloadCard(page) {
  // Keep only the disposable filesystem's durable bytes across a real browser
  // reload; no runtime Entity, Registry, draft or repository object survives.
  const saved = await page.evaluate(async () => {
    const f = window.__acceptance;
    const { CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const assets = [];
    async function scan(directory) {
      for (const entry of await f.adapter.listFiles(directory)) {
        const path = `${directory}/${entry.name}`;
        if (entry.kind === 'directory') await scan(path);
        else assets.push({ path, bytes: [...new Uint8Array(await f.adapter.readBinary(path))] });
      }
    }
    await scan('assets');
    return { id: f.page.id, path: f.page.path, content: await f.adapter.readText(f.page.path),
      catalog: await f.adapter.readText(CARD_TYPE_CATALOG_PATH), assets };
  });
  await page.reload();
  await page.evaluate(async saved => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { loadWorkspace } = await import('/js/storage/workspaceStorage.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { openPage } = await import('/js/editor/editor.js');
    const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
    await adapter.writeText(saved.path, saved.content); await adapter.writeText(CARD_TYPE_CATALOG_PATH, saved.catalog);
    for (const asset of saved.assets) await adapter.writeBinary(asset.path, Uint8Array.from(asset.bytes).buffer);
    adapter.readBinary = async path => {
      const value = await adapter.readText(path);
      if (!(value instanceof ArrayBuffer)) throw new Error('Missing binary asset ' + path);
      return value;
    };
    await loadWorkspace(); const current = getPageById(saved.id); await openPage(current);
    if (current.content !== saved.content) throw new Error('Reload changed durable source bytes');
    window.__acceptance = { adapter, page: current };
  }, saved);
}

test('ordinary plus requires an explicit canonical type before any page creation', async ({ page }) => {
  await setup(page);
  const before = await page.evaluate(async () => (await import('/js/repository/pageRepository.js')).getAllPages().length);
  await page.evaluate(async () => { const { renderTree } = await import('/js/tree/tree.js'); renderTree(); });
  await page.locator('.tree-root-drop-zone [data-create-page]').click();
  await page.locator('#createMenu [data-template="card"]').click();
  await expect(page.locator('#createMenu')).toContainText('Тип новой карточки');
  await expect(page.locator('#createMenu [data-card-type]')).toHaveCount(15);
  expect(await page.evaluate(async () => (await import('/js/repository/pageRepository.js')).getAllPages().length)).toBe(before);
  await page.locator('#createMenu [data-card-type="item"]').click();
  await expect(page.locator('.card-type-current')).toHaveText('Предмет');
  const created = await page.evaluate(async () => {
    const { state } = await import('/js/state.js');
    const f = window.__acceptance; f.page = state.currentPage;
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    return parsePageRecordContent(await f.adapter.readText(f.page.path));
  });
  expect(created.type).toBe('item'); expect(created.variablesStatus.mode).toBe('structured');
  expect(created.rawBody).not.toContain('card-properties-block');
  await reopen(page); await expect(page.locator('.card-type-current')).toHaveText('Предмет');
  await browserReloadCard(page); await expect(page.locator('.card-type-current')).toHaveText('Предмет');
});

test('empty-workspace and wiki Card actions reuse the same explicit type picker', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    window.__acceptance = await adoptionFixture({ actors: [], items: [], noCatalog: true });
    const { renderEmptyEditorContent } = await import('/js/editor/editorEmptyPage.js');
    renderEmptyEditorContent(document.getElementById('editorArea'));
  });
  await page.locator('.empty-create-option[data-template="card"]').click();
  await expect(page.locator('#createMenu [data-card-type]')).toHaveCount(15);
  expect(await page.evaluate(async () => (await import('/js/repository/pageRepository.js')).getAllPages().length)).toBe(0);
  await page.locator('#createMenu [data-card-type="character"]').click();
  await expect(page.locator('.card-type-current')).toHaveText('Персонаж');
  await page.evaluate(async () => {
    const { openWikiCreateMenu } = await import('/js/editor/wikiLinkCreateMenu.js');
    openWikiCreateMenu(400, 200, 'Wiki chosen Item');
  });
  await page.locator('.wiki-create-option').filter({ hasText: 'Создать: Карточка' }).click();
  await page.locator('#createMenu [data-card-type="item"]').click();
  await expect(page.locator('.card-type-current')).toHaveText('Предмет');
  expect(await page.evaluate(async () => (await import('/js/state.js')).state.currentPage.title)).toBe('Wiki chosen Item');
});

async function injectedDesktop(page) {
  await page.evaluate(async () => {
    const f = window.__acceptance, memory = f.adapter;
    window.__TAURI__ = { core: {
      convertFileSrc: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      async invoke(command, payload) {
        if (command === 'set_workspace_root') return payload.workspaceRoot;
        if (command === 'resolve_asset_url') return `C:/Stage9Corrective/${payload.path}`;
        if (command === 'path_exists') return true;
        if (command === 'read_binary_file') return [...new Uint8Array(await memory.readBinary(payload.path))];
        if (command === 'write_binary_file') return memory.writeBinary(payload.path, Uint8Array.from(payload.content).buffer);
        const methods = { read_text_file: 'readText', write_text_file: 'writeText', append_text_file: 'appendText', list_directory: 'listFiles', ensure_directory: 'ensureDirectory', remove_file: 'removeFile', remove_directory: 'removeDirectory' };
        if (!methods[command]) throw new Error('Unexpected bridge command ' + command);
        return memory[methods[command]](payload.path, payload.content);
      }
    } };
    const { createDesktopStorageAdapter } = await import('/js/storage/desktopStorageAdapter.js');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { createDesktopAssetAdapter } = await import('/js/storage/desktopAssetAdapter.js');
    const { setAssetAdapter } = await import('/js/storage/assetAdapter.js');
    f.adapter = createDesktopStorageAdapter({ workspaceRoot: 'C:/Stage9Corrective' }); setStorageAdapter(f.adapter);
    setAssetAdapter(createDesktopAssetAdapter({ workspaceRoot: 'C:/Stage9Corrective' }));
    await (await import('/js/editor/editor.js')).openPage(f.page);
  });
}

for (const platform of ['browser', 'injected Tauri']) test(`Image and Icon use content/PageRecord owners, preserve Variables and survive later body autosave (${platform})`, async ({ page }) => {
  await setup(page, 'lore');
  if (platform === 'injected Tauri') await injectedDesktop(page);
  const before = await page.evaluate(async () => {
    const f = window.__acceptance;
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), char => char.charCodeAt(0)).buffer;
    await f.adapter.writeBinary('assets/portrait.png', bytes);
    await f.adapter.writeBinary('assets/icon.png', bytes);
    f.writes.length = 0;
    return f.page.content;
  });
  await expect(page.getByLabel('Изображение', { exact: true })).toBeEnabled();
  await expect(page.getByLabel('Иконка', { exact: true })).toBeEnabled();
  await expect(page.locator('.card-inspector')).not.toContainText('binding-unavailable');
  await page.getByLabel('Изображение', { exact: true }).fill('assets/portrait.png');
  await page.getByLabel('Изображение', { exact: true }).press('Tab');
  await page.getByLabel('Иконка', { exact: true }).fill('assets/icon.png');
  await page.getByLabel('Иконка', { exact: true }).press('Tab');
  await page.getByRole('button', { name: 'Сохранить поля', exact: true }).click();
  await expect(page.locator('.card-inspector__save-status')).toContainText('сохранены');
  const after = await reopen(page);
  expect(after.rawBody).toContain('data-asset="assets/portrait.png"');
  expect(JSON.parse(after.frontMatter.values.iconjson)).toEqual({ kind: 'asset', path: 'assets/icon.png' });
  expect(after.variablesJson.values).toEqual({});
  await expect(page.locator('.tree-item img[data-page-icon-asset="assets/icon.png"]').first()).toBeVisible();
  expect(after.rawBody).toContain('Acceptance card');
  expect(before).toContain('Acceptance card');
  expect(await page.evaluate(async () => {
    const { normalizeWorkspacePath } = await import('/js/storage/storageAdapterContract.js');
    const f = window.__acceptance;
    return f.writes.filter(write => normalizeWorkspacePath(write.path) === normalizeWorkspacePath(f.page.path)).length;
  })).toBe(1);
  const text = page.locator('#editorArea .rich-text-field').last();
  await text.fill('Body after bound edit');
  await page.evaluate(async () => { const { flushPendingAutosave } = await import('/js/editor/autosave.js'); await flushPendingAutosave(); });
  const saved = await reopen(page);
  expect(saved.rawBody).toContain('Body after bound edit'); expect(saved.rawBody).toContain('data-asset="assets/portrait.png"');
  expect(saved.frontMatter.values.iconjson).toEqual(after.frontMatter.values.iconjson);
  await expect(page.getByLabel('Изображение', { exact: true })).toHaveValue('assets/portrait.png');
  await expect(page.getByLabel('Иконка', { exact: true })).toHaveValue('assets/icon.png');
  await browserReloadCard(page);
  await expect(page.getByLabel('Изображение', { exact: true })).toHaveValue('assets/portrait.png');
  await expect(page.getByLabel('Иконка', { exact: true })).toHaveValue('assets/icon.png');
});

for (const platform of ['browser', 'injected Tauri']) test(`Inspector asset file picker uses AssetAdapter and existing portrait-relative references remain editable (${platform})`, async ({ page }) => {
  await setup(page, 'lore');
  if (platform === 'injected Tauri') await injectedDesktop(page);
  await page.evaluate(async () => {
    const { updatePageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { openPage } = await import('/js/editor/editor.js');
    const f = window.__acceptance, body = parsePageRecordContent(f.page.content).rawBody;
    const content = updatePageRecordContent(f.page.content, { body: body.replace(/(<div\b[^>]*class="media-box is-portrait"[^>]*>)[\s\S]*?<\/div>/, '$1<img data-asset="existing.png" alt=""></div>') });
    Object.assign(f.page, createRuntimePageFromContent({ content, path: f.page.path, name: f.page.name }));
    await f.adapter.writeText(f.page.path, content); await openPage(f.page); f.writes.length = 0;
  });
  await expect(page.getByLabel('Изображение', { exact: true })).toHaveValue('assets/existing.png');
  const portrait = page.locator('[data-field-key="content.primaryImage"]');
  const chooser = page.waitForEvent('filechooser');
  await portrait.getByRole('button', { name: 'Выбрать файл' }).click();
  await (await chooser).setFiles({ name: 'picked.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') });
  await expect(page.getByLabel('Изображение', { exact: true })).toHaveValue(/assets\/.+picked\.png/);
  expect(await page.evaluate(() => window.__acceptance.writes.length)).toBe(0); // Asset import does not mutate the card.
  await page.getByRole('button', { name: 'Сохранить поля' }).click();
  await expect(page.locator('.card-inspector__save-status')).toContainText('сохранены');
  const result = await reopen(page);
  expect(result.rawBody).toMatch(/data-asset="assets\/.+picked\.png"/);
  expect(result.variablesJson.values).toEqual({});
});

test('schema tabs preserve draft and hidden errors, use keyboard navigation, and fit a narrow panel', async ({ page }) => {
  await setup(page);
  const tabs = page.getByRole('tab');
  expect(await tabs.count()).toBeGreaterThan(1);
  await page.getByLabel('Иконка', { exact: true }).fill('assets/draft.png');
  await page.getByLabel('Иконка', { exact: true }).press('Tab');
  await tabs.nth(1).click();
  await tabs.first().click();
  await expect(page.getByLabel('Иконка', { exact: true })).toHaveValue('assets/draft.png');
  const section = await page.evaluate(() => {
    const f = window.__acceptance; return f.registry.getResolvedType('player',1).fieldsByKey['player.progression'].section;
  });
  await page.locator(`[role="tab"][data-section-id="${section}"]`).click();
  const level = page.locator('[data-field-key="player.progression.dnd.level"] input');
  await level.fill('1.5'); await level.press('Tab');
  await tabs.first().click();
  await expect(page.locator(`[role="tab"][data-section-id="${section}"]`)).toHaveAttribute('data-has-errors', 'true');
  await expect(page.getByRole('button', { name: 'Сохранить поля' })).toBeDisabled();
  await tabs.first().press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await page.locator(`[role="tab"][data-section-id="${section}"]`).click();
  await expect(level).toHaveValue('1.5');
  await level.fill('3'); await level.press('Tab');
  await expect(page.locator(`[role="tab"][data-section-id="${section}"]`)).toHaveAttribute('data-has-errors', 'false');
  await page.setViewportSize({ width: 1100, height: 720 });
  await expect(page.locator('.card-inspector')).toBeVisible();
  expect(await page.locator('.card-inspector').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: 'test-results/corrective-inspector.png' });
});

async function legacy(page, ambiguous = false) {
  await page.goto('/');
  await page.evaluate(async ambiguous => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const { buildPageRecordContent, createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
    const { setPages } = await import('/js/stateActions.js');
    const { openPage } = await import('/js/editor/editor.js');
    const f = await adoptionFixture({ actors: [], items: [], noCatalog: true });
    const properties = '<div class="template-block card-properties-block" data-block-type="properties" data-block-version="1" data-card-type="character"><input type="number" data-property-name="level" value="5"></div>';
    const content = buildPageRecordContent({ id: 'legacy', type: 'character', template: 'card',
      body: '<h1>Legacy acceptance</h1><p data-persistent-editable="true">Free text</p>' + properties + (ambiguous ? properties : '') });
    const page = createRuntimePageFromContent({ content, path: 'pages/legacy.md', name: 'legacy.md' });
    await f.adapter.writeText(page.path, content); setPages([page]);
    window.__acceptance = { ...f, page }; await openPage(page); f.writes.length = 0;
  }, ambiguous);
}

test('legacy per-card CTA previews without writes and confirmed migration immediately opens structured Inspector', async ({ page }) => {
  await legacy(page);
  await page.getByRole('button', { name: 'Мигрировать карточку', exact: true }).click();
  await page.getByRole('button', { name: 'Предпросмотр', exact: true }).click();
  await expect(page.locator('[data-migration-report]')).toContainText('ready');
  expect(await page.evaluate(() => window.__acceptance.writes.length)).toBe(0);
  await page.getByRole('button', { name: 'Выполнить готовые', exact: true }).click();
  await page.getByRole('button', { name: 'Выполнить', exact: true }).click();
  await expect(page.locator('.card-inspector')).toHaveAttribute('data-source-mode', 'structured');
  const record = await page.evaluate(async () => {
    const { state } = await import('/js/state.js'); window.__acceptance.page = state.currentPage;
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    return parsePageRecordContent(await window.__acceptance.adapter.readText(state.currentPage.path));
  });
  expect(record.variablesJson.values['dnd.level']).toBe(5);
  expect(record.variablesJson.migration.backupId).toBeTruthy();
  expect(record.variablesJson.migration.operationId).toBeTruthy();
  expect(record.rawBody).toContain('Free text'); expect(record.rawBody).toContain('card-properties-block');
  await reopen(page); await expect(page.locator('.card-inspector')).toHaveAttribute('data-source-mode', 'structured');
  await browserReloadCard(page); await expect(page.locator('.card-inspector')).toHaveAttribute('data-source-mode', 'structured');
});

test('ambiguous legacy card preview blocks execution and preserves raw evidence', async ({ page }) => {
  await legacy(page, true);
  await page.getByRole('button', { name: 'Мигрировать карточку', exact: true }).click();
  await page.getByRole('button', { name: 'Предпросмотр', exact: true }).click();
  await expect(page.locator('[data-migration-report]')).toContainText('multiple-properties-blocks');
  await expect(page.getByRole('button', { name: 'Выполнить готовые' })).toBeDisabled();
  expect(await page.evaluate(() => window.__acceptance.writes.length)).toBe(0);
});

test('large reference workspace render/edit/tab actions have bounded traversals and preserve tab DOM', async ({ page }) => {
  await setup(page);
  const counts = await page.evaluate(async () => {
    const { flushBackgroundCheckpoints } = await import('/js/performance/backgroundCheckpointQueue.js');
    await flushBackgroundCheckpoints();
    const f = window.__acceptance, { renderUniversalCardInspector } = await import('/js/ui/cardInspector/universalCardInspector.js');
    const actual = await import('/js/repository/pageRepository.js');
    const pages = [...actual.getAllPages(), ...Array.from({ length: 5000 }, (_, i) => ({ id: `large-${i}`, type: 'item', title: `Item ${i}` }))];
    let traversals = 0, reads = 0;
    const read = f.adapter.readText.bind(f.adapter); f.adapter.readText = async path => { if (path === '.my-own-world-card-types.json') reads++; return read(path); };
    const repository = { ...actual, getAllPages() { traversals++; return pages; } };
    const started = performance.now(); await renderUniversalCardInspector(f.page, { registry: f.registry, repository });
    f.performance = () => ({ traversals, reads });
    document.querySelector('[role="tablist"]').dataset.acceptanceIdentity = 'retained';
    return { duration: Math.round(performance.now()-started), ...f.performance() };
  });
  console.log('5000 references render', counts);
  expect(counts.traversals).toBe(0); expect(counts.reads).toBe(0);
  await page.getByLabel('Иконка', { exact: true }).fill('assets/draft.png'); await page.getByLabel('Иконка', { exact: true }).press('Tab');
  await expect(page.getByRole('tablist')).toHaveAttribute('data-acceptance-identity', 'retained');
  expect(await page.evaluate(() => window.__acceptance.performance())).toEqual({ traversals: 0, reads: 0 });
  await page.getByRole('tab').nth(1).click();
  expect((await page.evaluate(() => window.__acceptance.performance())).traversals).toBeLessThanOrEqual(1);
  expect((await page.evaluate(() => window.__acceptance.performance())).reads).toBe(0);
});

test('new-workspace owner Lore to Character confirmation activates target closure', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const f = await adoptionFixture({ actors: [], items: [], noCatalog: true });
    const { createPage } = await import('/js/storage/pageStorage.js');
    const { openPage } = await import('/js/editor/editor.js');
    const page = await createPage('card');
    await openPage(page);
    window.__acceptance = { ...f, page };
  });
  await page.locator('.card-type-trigger').click();
  await page.locator('.card-type-option[data-value="character"]').click();
  await page.getByRole('button', { name: 'Изменить тип', exact: true }).click();
  try { await expect.poll(() => page.evaluate(() => window.__acceptance.page.type)).toBe('character'); }
  catch (error) { console.log('Type change failure', await page.locator('.card-type-select').getAttribute('title')); throw error; }
});
