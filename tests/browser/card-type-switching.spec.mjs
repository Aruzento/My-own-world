import { expect, test } from '@playwright/test';

async function createCharacter(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const { renderTree } = await import('/js/tree/tree.js');
    window.__type = await adoptionFixture({ actors: [], items: [], noCatalog: true });
    renderTree();
  });
  await page.locator('.tree-root-drop-zone [data-create-page]').click();
  await page.locator('#createMenu [data-template="card"]').click();
  await page.locator('#createMenu [data-card-type="character"]').click();
  await expect(page.locator('.card-type-current')).toHaveText('Персонаж');
  await page.evaluate(async () => {
    const { state } = await import('/js/state.js');
    const { flushPendingAutosave } = await import('/js/editor/autosave.js');
    window.__type.page = state.currentPage;
    await flushPendingAutosave();
  });
}

async function saveText(page) {
  const result = await page.evaluate(async () => {
    const { flushPendingAutosave } = await import('/js/editor/autosave.js');
    const { saveCurrentPage } = await import('/js/editor/editor.js');
    return await flushPendingAutosave() || await saveCurrentPage();
  });
  expect(result.writeStatus).toBe('saved');
}

async function choose(page, target) {
  await page.locator('.card-type-trigger').click();
  await page.locator(`.card-type-option[data-value="${target}"]`).click();
}

async function confirm(page, target, label) {
  await choose(page, target);
  await expect(page.locator('.confirm-popup-modal')).toContainText('Изменить тип карточки?');
  await page.getByRole('button', { name: 'Изменить тип', exact: true }).click();
  await expect(page.locator('.card-type-current')).toHaveText(label);
  await expect(page.locator('#statusbar')).toHaveText('Тип карточки сохранён и проверен');
  await expect(page.locator('#statusbar')).toBeVisible();
}

async function exactState(page, target) {
  const result = await page.evaluate(async () => {
    const f = window.__type;
    const { state } = await import('/js/state.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { parsePageRecordContent, createPageStateIdentityFromContent } = await import('/js/core/pageRecord.js');
    const { readCardTypeCatalog, createCardTypeRegistryFromCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { getCurrentEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { getUniversalCardInspectorState } = await import('/js/ui/cardInspector/universalCardInspector.js');
    const durable = await f.adapter.readText(f.page.path), record = parsePageRecordContent(durable);
    const { catalog } = await readCardTypeCatalog();
    const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
    return { record, runtime: state.currentPage.content, repository: getPageById(f.page.id).content, durable,
      base: getCurrentEditorPageBase(), identity: createPageStateIdentityFromContent(durable),
      inspectorType: getUniversalCardInspectorState().snapshot.type,
      targetDigest: registry.getResolvedType(record.type, 1).digest,
      definitions: catalog.types.map(definition => `${definition.id}@${definition.version}`) };
  });
  expect(result.record.type).toBe(target);
  expect(result.record.variablesJson.schemaVersion).toBe(1);
  expect(result.record.variablesJson.schemaDigest).toBe(result.targetDigest);
  expect(result.runtime).toBe(result.durable);
  expect(result.repository).toBe(result.durable);
  expect(result.base.stateHash).toBe(result.identity.stateHash);
  expect(result.inspectorType).toBe(target);
  expect(new Set(result.definitions).size).toBe(result.definitions.length);
  return result.record;
}

async function reopen(page) {
  await page.evaluate(async () => {
    const { openPage } = await import('/js/editor/editor.js');
    const { createPage } = await import('/js/storage/pageStorage.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { loadWorkspace } = await import('/js/storage/workspaceStorage.js');
    const f = window.__type;
    f.other ||= await createPage('card', null, 'Navigation companion', { type: 'lore' });
    await openPage(f.other); await openPage(getPageById(f.page.id));
    await loadWorkspace(); f.page = getPageById(f.page.id); f.other = getPageById(f.other.id);
    await openPage(f.page);
  });
}

test('normal UI Character → Location → Lore confirms durable type, preservation, reopen and workspace restart', async ({ page }) => {
  await createCharacter(page);
  await page.locator('#editorArea h1').fill('Unique type recovery title');
  await page.locator('#editorArea [data-block-type="text"] .rich-text-field').fill('Free body survives both type changes');
  await saveText(page);
  const before = await page.evaluate(async () => {
    const f = window.__type;
    const { readCardTypeCatalog, createCardTypeRegistryFromCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { prepareVariablesChange, commitVariablesChange } = await import('/js/variables/variableCommands.js');
    const { getCurrentEditorPageBase, advanceEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { updatePageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { openPage } = await import('/js/editor/editor.js');
    const { catalog } = await readCardTypeCatalog();
    if (catalog.types.some(definition => definition.id === 'location')) throw new Error('Target must start unactivated');
    const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
    const rowKey = registry.getResolvedType('character', 1).fieldsByKey['core.sources'].items.rowIdentityKey;
    const plan = prepareVariablesChange({ pageId: f.page.id, expectedBase: getCurrentEditorPageBase(), context: { registry }, patch: [
      { op: 'set', key: 'dnd.level', value: 7 },
      { op: 'set', key: 'core.sources', value: [{ [rowKey]: 'owner-source', 'core.sources.title': 'Compatible source' }] }
    ] });
    const result = await commitVariablesChange(plan);
    if (result.status !== 'saved') throw new Error('Fixture Variables commit failed');
    advanceEditorPageBase(f.page);
    // Add recovery/metadata evidence only to this disposable fixture before the
    // actual UI type operation. Type switching must not reconstruct/drop it.
    const content = updatePageRecordContent(f.page.content, { tags: ['card', 'owner-tag'], aliases: ['Owner alias'],
      relationshipsJson: [{ targetId: 'external-exact-id', type: 'related', label: 'Keep relationship' }] },
    { preserveUnchangedMetadata: true }).replace('\nid:', '\nownerMetadata: preserved\nid:');
    await f.adapter.writeText(f.page.path, content);
    Object.assign(f.page, createRuntimePageFromContent({ content, path: f.page.path, name: f.page.name }));
    await openPage(f.page);
    await (await import('/js/editor/autosave.js')).flushPendingAutosave();
    return parsePageRecordContent(await f.adapter.readText(f.page.path));
  });
  for (const [target, label] of [['location', 'Локация'], ['lore', 'Лор']]) {
    await confirm(page, target, label);
    const after = await exactState(page, target);
    expect(after.rawBody).toBe(before.rawBody);
    expect(after.tags).toEqual(before.tags);
    expect(after.aliases).toEqual(before.aliases);
    expect(after.relationshipsJson).toEqual(before.relationshipsJson);
    expect(after.frontMatter.values.ownermetadata).toBe('preserved');
    expect(after.variablesJson.values['core.sources']).toEqual(before.variablesJson.values['core.sources']);
    expect(after.variablesJson.values['dnd.level']).toBeUndefined();
    expect(after.variablesJson.inactive).toContainEqual(expect.objectContaining({ value: 7, path: ['values', 'dnd.level'],
      origin: expect.objectContaining({ type: 'character', version: 1 }), definition: expect.objectContaining({ datatype: 'integer' }) }));
    await reopen(page); await exactState(page, target);
    await expect(page.locator('#editorArea h1')).toHaveText('Unique type recovery title');
    await expect(page.locator('#editorArea [data-block-type="text"] .rich-text-field')).toHaveText('Free body survives both type changes');
  }
  const files = await page.evaluate(async () => {
    const f = window.__type;
    const { CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { getAllPages } = await import('/js/repository/pageRepository.js');
    return { id: f.page.id, files: await Promise.all([CARD_TYPE_CATALOG_PATH, ...getAllPages().map(page => page.path)]
      .map(async path => [path, await f.adapter.readText(path)])) };
  });
  await page.reload();
  await page.evaluate(async ({ id, files }) => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { loadWorkspace } = await import('/js/storage/workspaceStorage.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { openPage } = await import('/js/editor/editor.js');
    const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
    for (const [path, content] of files) await adapter.writeText(path, content);
    await loadWorkspace(); const current = getPageById(id); await openPage(current);
    window.__type = { adapter, page: current };
  }, files);
  await exactState(page, 'lore');
  await expect(page.locator('.card-type-current')).toHaveText('Лор');
  await expect(page.locator('#editorArea h1')).toHaveText('Unique type recovery title');
});

for (const stage of ['before preview', 'after preview']) test(`type change visibly blocks an in-flight editor save ${stage} and succeeds after it finishes`, async ({ page }) => {
  await createCharacter(page);
  if (stage === 'after preview') {
    await choose(page, 'location');
    await expect(page.getByRole('button', { name: 'Изменить тип', exact: true })).toBeVisible();
  }
  await page.evaluate(() => {
    const f = window.__type, write = f.adapter.writeText.bind(f.adapter);
    let first = true;
    const barrier = new Promise(resolve => { f.release = resolve; });
    f.adapter.writeText = async (path, content) => {
      await write(path, content);
      if (first && path === f.page.path) { first = false; f.written = true; await barrier; }
    };
  });
  // The modal prevents normal editing; this represents a queued editor event
  // already originating from the editor, not a direct persistent mutation.
  await page.evaluate(async () => {
    const editor = document.querySelector('#editorArea');
    const body = editor.querySelector('[data-block-type="text"] .rich-text-field');
    body.textContent = 'Pending content is preserved';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    const { flushPendingAutosave } = await import('/js/editor/autosave.js');
    window.__type.save = flushPendingAutosave();
  });
  await expect.poll(() => page.evaluate(() => window.__type.written)).toBe(true);
  if (stage === 'before preview') await choose(page, 'location');
  else await page.getByRole('button', { name: 'Изменить тип', exact: true }).click();
  await expect(page.locator('#statusbar')).toContainText(stage === 'before preview'
    ? 'Сначала сохраните текст карточки' : 'Повторите preview смены типа после сохранения текста');
  await expect(page.locator('#statusbar')).toBeVisible();
  await expect(page.locator('.card-type-current')).toHaveText('Персонаж');
  await page.evaluate(async () => { const f = window.__type; f.release(); await f.save; });
  await confirm(page, 'location', 'Локация');
  const after = await exactState(page, 'location');
  expect(after.rawBody).toContain('Pending content is preserved');
});

test('external durable write after preview visibly blocks confirmation without overwrite', async ({ page }) => {
  await createCharacter(page);
  await choose(page, 'location');
  await expect(page.getByRole('button', { name: 'Изменить тип', exact: true })).toBeVisible();
  const external = await page.evaluate(async () => {
    const f = window.__type;
    const { updatePageRecordContent, createPageStateIdentityFromContent } = await import('/js/core/pageRecord.js');
    const { persistPageContentCommand } = await import('/js/storage/pageCommandService.js');
    const content = updatePageRecordContent(f.page.content, { body: '<h1>External title</h1><p>External newest body</p>' });
    const result = await persistPageContentCommand({ page: f.page, content, expectedBase: createPageStateIdentityFromContent(f.page.content), reason: 'external-type-test' });
    if (result.writeStatus !== 'saved') throw new Error('External fixture write failed');
    f.writes.length = 0; return content;
  });
  await page.getByRole('button', { name: 'Изменить тип', exact: true }).click();
  await expect(page.locator('#statusbar')).toContainText('Stale/moved type-change page');
  await expect(page.locator('#statusbar')).toBeVisible();
  const result = await page.evaluate(async () => {
    const f = window.__type; return { writes: f.writes.length, content: await f.adapter.readText(f.page.path) };
  });
  expect(result.writes).toBe(0);
  expect(result.content).toBe(external);
  await expect(page.locator('.card-type-current')).toHaveText('Персонаж');
});

test('scoped recovery failure is visible after confirm and leaves the exact Character source unchanged', async ({ page }) => {
  await createCharacter(page);
  await choose(page, 'location');
  await expect(page.getByRole('button', { name: 'Изменить тип', exact: true })).toBeVisible();
  const before = await page.evaluate(async () => {
    const f = window.__type, write = f.adapter.writeText.bind(f.adapter);
    f.writes.length = 0;
    f.adapter.writeText = async (path, content) => {
      if (path.startsWith('.my-own-world-ops/pending/')) throw new Error('Injected recovery unavailable');
      return write(path, content);
    };
    return f.adapter.readText(f.page.path);
  });
  await page.getByRole('button', { name: 'Изменить тип', exact: true }).click();
  await expect(page.locator('#statusbar')).toContainText('Injected recovery unavailable');
  await expect(page.locator('#statusbar')).toBeVisible();
  const result = await page.evaluate(async () => {
    const f = window.__type; return { writes: f.writes.filter(write => write.path === f.page.path).length,
      content: await f.adapter.readText(f.page.path) };
  });
  expect(result.writes).toBe(0); expect(result.content).toBe(before);
  await expect(page.locator('.card-type-current')).toHaveText('Персонаж');
});

test('same-type confirmation validates current source without page, catalog or backup writes', async ({ page }) => {
  await createCharacter(page);
  await page.evaluate(() => { window.__type.writes.length = 0; });
  await confirm(page, 'character', 'Персонаж');
  expect(await page.evaluate(() => window.__type.writes.length)).toBe(0);
  await exactState(page, 'character');
});

test('confirm paints busy before storage, prevents double submit and performs one scoped operation without asset/full backup I/O', async ({ page }) => {
  await createCharacter(page);
  await choose(page, 'location');
  await page.evaluate(() => {
    const f = window.__type, write = f.adapter.writeText.bind(f.adapter);
    let first = true; f.writes.length = 0;
    const barrier = new Promise(resolve => { f.release = resolve; });
    f.adapter.listFiles = f.adapter.readBinary = f.adapter.writeBinary = async () => { throw new Error('Forbidden workspace/assets traversal'); };
    f.adapter.writeText = async (path, content) => {
      if (first && path.includes('/pending/')) {
        first = false; f.started = true;
        f.busyBeforeStorage = document.querySelector('.confirm-popup-modal')?.getAttribute('aria-busy') === 'true';
        await barrier;
      }
      return write(path, content);
    };
  });
  const dialog = page.locator('.confirm-popup-modal');
  await page.getByRole('button', { name: 'Изменить тип', exact: true }).click();
  await expect(dialog).toHaveAttribute('aria-busy', 'true');
  await expect(dialog.locator('.confirm-popup-confirm')).toBeDisabled();
  await expect(dialog.locator('.confirm-popup-cancel')).toBeDisabled();
  await expect(dialog.locator('.confirm-popup-progress')).toBeVisible();
  await expect(dialog.locator('.confirm-popup-progress')).toContainText('recovery');
  await expect.poll(() => page.evaluate(() => window.__type.started)).toBe(true);
  expect(await page.evaluate(() => window.__type.busyBeforeStorage)).toBe(true);
  await page.evaluate(() => {
    // Even an artificial duplicate DOM submit cannot start another handler.
    document.querySelector('.confirm-popup-confirm').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.__type.release();
  });
  await expect(page.locator('.card-type-current')).toHaveText('Локация');
  await expect(dialog).toBeHidden();
  const { writes, cardPath } = await page.evaluate(() => ({ writes: window.__type.writes.map(write => write.path), cardPath: window.__type.page.path }));
  expect(writes.filter(path => path === cardPath)).toHaveLength(1);
  expect(writes.filter(path => path.includes('/pending/'))).toHaveLength(1);
  expect(writes.filter(path => path.includes('/committed/'))).toHaveLength(1);
  expect(writes.some(path => path.includes('.my-own-world-backups/') || path.includes('assets/'))).toBe(false);
  await exactState(page, 'location');
});

test('scoped type recovery survives workspace restart and restores exact original Card from Settings', async ({ page }) => {
  await createCharacter(page);
  const original = await page.evaluate(async () => window.__type.adapter.readText(window.__type.page.path));
  await confirm(page, 'location', 'Локация');
  const files = await page.evaluate(async () => {
    const f = window.__type;
    const { listPendingWorkspaceOperations, OPERATION_JOURNAL_COMMITTED_DIR } = await import('/js/storage/operationJournal.js');
    const entry = (await listPendingWorkspaceOperations(f.adapter, OPERATION_JOURNAL_COMMITTED_DIR)).find(entry => entry.type === 'card-type-change');
    return { id: f.page.id, operationId: entry.id, files: await Promise.all([f.page.path, '.my-own-world-card-types.json', `${OPERATION_JOURNAL_COMMITTED_DIR}/${entry.id}.json`]
      .map(async path => [path, await f.adapter.readText(path)])) };
  });
  await page.reload();
  await page.evaluate(async ({ id, files, operationId }) => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { loadWorkspace } = await import('/js/storage/workspaceStorage.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { openPage } = await import('/js/editor/editor.js');
    const { renderMigrationSettings } = await import('/js/ui/settings/migrationSettings.js');
    const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
    for (const [path, content] of files) await adapter.writeText(path, content);
    await loadWorkspace(); const current = getPageById(id); await openPage(current);
    window.__type = { adapter, page: current, operationId };
    const host = document.createElement('div'); host.id = 'type-recovery-settings'; document.body.append(host);
    await renderMigrationSettings(host);
  }, files);
  await page.locator('#type-recovery-settings').getByRole('button', { name: 'Проверить recovery', exact: true }).click();
  await expect(page.locator('[data-migration-report]')).toContainText('recoverable');
  await page.locator('#type-recovery-settings').getByRole('button', { name: 'Восстановить карточку до смены типа', exact: true }).click();
  await page.getByRole('button', { name: 'Восстановить', exact: true }).click();
  await expect(page.locator('[data-migration-report]')).toContainText('"status": "saved"');
  await expect(page.locator('.card-type-current')).toHaveText('Персонаж');
  expect(await page.evaluate(async () => window.__type.adapter.readText(window.__type.page.path))).toBe(original);
});
