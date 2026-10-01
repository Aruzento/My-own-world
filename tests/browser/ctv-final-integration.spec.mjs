import { expect, test } from '@playwright/test';

async function workspace(page, legacy = false) {
  await page.goto('/');
  await page.evaluate(async legacy => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const { buildPageRecordContent, updatePageRecordContent, createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
    const { createCharacterEffectsBlock, createCharacterSheetBlock } = await import('/js/templates/blockTypes.js');
    const { applyBlockSystemContract, serializePersistentEditorHTML } = await import('/js/editor/blocks/blockContract.js');
    const { setPages, setCurrentPage } = await import('/js/stateActions.js');
    const { openPage } = await import('/js/editor/editor.js');
    const f = await adoptionFixture();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<h1>Closure actor</h1><p data-persistent-editable="true">Free recovery text</p>' +
      '<div class="template-block item-set-block" data-block-type="items" data-block-version="1"><div class="item-set-list"><button class="item-set-chip" type="button" data-page-id="A"><span class="item-set-title">Item A</span><label><input class="item-set-quantity" type="number" value="3"></label><span class="item-set-remove">×</span></button></div></div>' +
      createCharacterEffectsBlock() + createCharacterSheetBlock();
    wrapper.querySelector('[data-character-effects]').textContent = JSON.stringify({ conditions: ['poisoned'], effects: [], selectedRuleIds: [] });
    if (legacy) wrapper.insertAdjacentHTML('beforeend', '<div class="template-block card-properties-block" data-block-type="properties" data-block-version="1" data-card-type="character">' +
      [['level', 5], ['str', 16], ['hpCurrent', 8], ['hpMax', 20], ['hpTemp', 2]].map(([key, value]) => `<input type="number" data-property-name="${key}" value="${value}">`).join('') + '</div>');
    applyBlockSystemContract(wrapper);
    const body = serializePersistentEditorHTML(wrapper);
    const content = legacy ? buildPageRecordContent({ id: 'actor', type: 'character', template: 'card', tags: ['card', 'user-tag'], aliases: ['Alias'], body }) : updatePageRecordContent(f.actor.content, { body });
    f.actor = createRuntimePageFromContent({ content, name: 'actor.md', path: 'pages/actor.md' });
    f.pages[0] = f.actor;
    await f.adapter.writeText(f.actor.path, content);
    setCurrentPage(null); setPages(f.pages); f.writes.length = 0;
    window.__closure = f;
    await openPage(f.actor);
    const { flushPendingAutosave } = await import('/js/editor/autosave.js'); await flushPendingAutosave();
    const host = document.createElement('div'); host.id = 'migration-acceptance'; document.body.append(host);
    const { renderMigrationSettings } = await import('/js/ui/settings/migrationSettings.js');
    await renderMigrationSettings(host);
  }, legacy);
}

async function migrate(page, step) {
  const surface = page.locator('#migration-acceptance');
  await surface.locator('[data-migration-pages]').fill('actor');
  await surface.locator('[data-migration-step]').selectOption(step);
  await surface.getByRole('button', { name: 'Предпросмотр', exact: true }).click();
  await expect(surface.locator('[data-migration-report]')).toContainText('ready');
  await surface.getByRole('button', { name: 'Выполнить готовые', exact: true }).click();
  await page.getByRole('button', { name: 'Выполнить', exact: true }).click();
  await expect(surface.locator('[data-migration-report]')).toContainText('"status": "completed"');
}

async function injectedDesktop(page) {
  await page.evaluate(async () => {
    const f=window.__closure, memory=f.adapter;
    window.__TAURI__={core:{async invoke(command,payload) {
      if(command==='set_workspace_root') return payload.workspaceRoot;
      if(command==='read_binary_file') return [...new Uint8Array(await memory.readBinary(payload.path))];
      if(command==='write_binary_file') return memory.writeBinary(payload.path,Uint8Array.from(payload.content).buffer);
      const methods={read_text_file:'readText',write_text_file:'writeText',append_text_file:'appendText',list_directory:'listFiles',ensure_directory:'ensureDirectory',remove_file:'removeFile',remove_directory:'removeDirectory'};
      if(!methods[command]) throw new Error('Unexpected bridge command '+command);
      return memory[methods[command]](payload.path,payload.content);
    }}};
    const {createDesktopStorageAdapter}=await import('/js/storage/desktopStorageAdapter.js');
    const {setStorageAdapter}=await import('/js/storage/storageAdapter.js');
    f.adapter=createDesktopStorageAdapter({workspaceRoot:'C:/Stage9Acceptance'});setStorageAdapter(f.adapter);
    const {openPage}=await import('/js/editor/editor.js');
    const {getPageById}=await import('/js/repository/pageRepository.js'); await openPage(getPageById('actor'));
  });
}

test('production migration/adoption/retirement preserves free text and removes only proven owners', async ({ page }) => {
  await workspace(page, true);
  await expect(page.locator('#editorArea .card-properties-block input')).toHaveCount(0);
  await expect(page.locator('#editorArea .character-sheet-empty')).toContainText('migration');
  await migrate(page, 'properties');
  expect(await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    return parsePageRecordContent(await window.__closure.adapter.readText('pages/actor.md')).variablesStatus.mode;
  })).toBe('structured');
  await migrate(page, 'inventory');
  await migrate(page, 'effects');
  await migrate(page, 'retirement');
  const durable = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { readInventoryModelFromPage } = await import('/js/character/inventoryModel.js');
    const { readCardTypeCatalog, createCardTypeRegistryFromCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const f = window.__closure, actor = getPageById('actor');
    const record = parsePageRecordContent(await f.adapter.readText(actor.path));
    const registry = createCardTypeRegistryFromCatalog((await readCardTypeCatalog()).catalog, { bundledTypes: [], bundledFieldSets: [] });
    return { body: record.rawBody, values: record.variablesJson.values,
      inventory: readInventoryModelFromPage(actor, { registry, repository: { getPageById } }) };
  });
  expect(durable.body).toContain('Free recovery text');
  expect(durable.body).not.toMatch(/card-properties-block|item-set-block|character-effects-block|data-character-effects/);
  expect(durable.inventory.source).toBe('entity');
  expect(durable.inventory.items.map(item => [item.pageId, item.quantity])).toEqual([['A', 3]]);
  await expect(page.locator('#editorArea [data-character-sheet-field="hpCurrent"]')).toHaveValue('8');
  await page.locator('#editorArea p[data-persistent-editable]').fill('Free text after retirement');
  await page.evaluate(async () => {
    const { flushPendingAutosave } = await import('/js/editor/autosave.js'); await flushPendingAutosave();
    const { openPage } = await import('/js/editor/editor.js');
    const { getPageById } = await import('/js/repository/pageRepository.js'); await openPage(getPageById('actor'));
  });
  await expect(page.locator('#editorArea')).toContainText('Free text after retirement');
  await expect(page.locator('#editorArea .card-properties-block, #editorArea .item-set-block')).toHaveCount(0);
});

for (const platform of ['browser', 'injected Tauri']) test(`new structured creation, duplicate and template v2 preserve exact Variables without Properties (${platform})`, async ({ page }) => {
  await workspace(page);
  if(platform==='injected Tauri') await injectedDesktop(page);
  const result = await page.evaluate(async () => {
    const { createPage, duplicatePageAsChild } = await import('/js/storage/pageStorage.js');
    const { savePageAsTemplate, createPageFromTemplate, parsePageTemplatesFile } = await import('/js/templates/pageTemplateStorage.js');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { openPage } = await import('/js/editor/editor.js');
    const f = window.__closure;
    const created = await createPage('card', null, 'Structured new card');
    const duplicate = await duplicatePageAsChild(created, null);
    const template = await savePageAsTemplate(created);
    const instance = await createPageFromTemplate(template, null);
    await openPage(instance);
    return { created: parsePageRecordContent(await f.adapter.readText(created.path)),
      duplicate: parsePageRecordContent(await f.adapter.readText(duplicate.path)),
      instance: parsePageRecordContent(await f.adapter.readText(instance.path)), template,
      persisted: parsePageTemplatesFile(await f.adapter.readText('.my-own-world-templates.json')) };
  });
  for (const entry of [result.created, result.duplicate, result.instance]) {
    expect(entry.variablesStatus.mode).toBe('structured'); expect(entry.type).toBe('lore');
    expect(entry.rawBody).not.toContain('card-properties-block');
    expect(entry.variablesJson.values).toEqual({});
  }
  expect(result.template.version).toBe(2);
  expect(result.persisted[0].seed.variablesJson).toEqual(result.created.variablesJson);
  await expect(page.locator('.card-inspector')).toBeVisible();
});

test('retirement checkpoint failure resumes verified target and explicit recovery restores raw evidence', async ({ page }) => {
  await workspace(page, true);
  for (const step of ['properties', 'inventory', 'effects']) await migrate(page, step);
  const result = await page.evaluate(async () => {
    const api = await import('/js/migration/legacySourceRetirement.js');
    const { setCurrentPage } = await import('/js/stateActions.js');
    const f = window.__closure;
    setCurrentPage(null);
    const before = await f.adapter.readText('pages/actor.md');
    const preview = await api.previewLegacySourceRetirement({ pageIds: ['actor'] });
    const write = f.adapter.writeText.bind(f.adapter);
    let injected = false;
    f.adapter.writeText = async (path, content) => {
      if (!injected && path.includes('/pending/') && content.includes('legacy-retirement') && content.includes('"verified"')) {
        injected = true; throw new Error('checkpoint interrupted');
      }
      return write(path, content);
    };
    const failed = await api.executeLegacySourceRetirement(preview, { confirm: true });
    f.adapter.writeText = write;
    const inspection = await api.inspectLegacySourceRetirementResume(failed.operationId);
    const resumed = await api.resumeLegacySourceRetirement(failed.operationId, { confirm: true });
    const after = await f.adapter.readText('pages/actor.md');
    const again = await api.previewLegacySourceRetirement({ pageIds: ['actor'] });
    const recovery = await api.recoverLegacySourceRetirement(failed.backupId, { confirm: true });
    const recovered = await f.adapter.readText('pages/actor.md');
    return { before, after, recovered, failed, inspection, resumed, again, recovery };
  });
  expect(result.failed.status).toBe('failed');
  expect(result.failed.reason).toContain('checkpoint interrupted');
  expect(result.inspection.pages[0].status).toBe('verified-skip');
  expect(result.resumed.status).toBe('completed');
  expect(result.again.actors[0].status).toBe('already-retired');
  expect(result.after).not.toContain('card-properties-block');
  expect(result.recovered).toBe(result.before);
  expect(result.recovery.preRestoreBackupId).toBeTruthy();
});

test('retirement third-state and ambiguous user content are blocked without owner deletion', async ({ page }) => {
  await workspace(page, true);
  for (const step of ['properties', 'inventory', 'effects']) await migrate(page, step);
  const result = await page.evaluate(async () => {
    const api = await import('/js/migration/legacySourceRetirement.js');
    const { setCurrentPage } = await import('/js/stateActions.js'); setCurrentPage(null);
    const { getPageById, notifyPageUpdated } = await import('/js/repository/pageRepository.js');
    const f = window.__closure, actor = getPageById('actor');
    const before = await f.adapter.readText(actor.path);
    const preview = await api.previewLegacySourceRetirement({ pageIds: ['actor'] });
    const changed = before.replace('Free recovery text', 'Concurrent edit');
    await f.adapter.writeText(actor.path, changed);
    const stale = await api.executeLegacySourceRetirement(preview, { confirm: true });
    actor.content = before.replace('class="template-block card-properties-block"', 'class="template-block card-properties-block"').replace('data-card-type="character">', 'data-card-type="character"><p>Unknown user content</p>');
    await f.adapter.writeText(actor.path, actor.content); notifyPageUpdated(actor);
    const ambiguous = await api.previewLegacySourceRetirement({ pageIds: ['actor'] });
    return { stale, ambiguous, body: await f.adapter.readText(actor.path) };
  });
  expect(result.stale.status).toBe('failed'); expect(result.stale.completed).toEqual([]);
  expect(result.ambiguous.actors[0].status).toBe('blocked');
  expect(result.ambiguous.actors[0].issues).toContain('ambiguous-user-content-boundary');
  expect(result.body).toContain('Unknown user content');
});

test('structured package v2 copy and partial restore preserve canonical refs and refresh repository', async ({ page }) => {
  await workspace(page);
  const result = await page.evaluate(async () => {
    const { getAllPages, getPageById, setPageRepositoryRegistry } = await import('/js/repository/pageRepository.js');
    const { readCardTypeCatalog, createCardTypeRegistryFromCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { createWorldPackageFromPages } = await import('/js/worldPackage/worldPackageModel.js');
    const { applyWorldPackagePageImport } = await import('/js/worldPackage/worldPackageImportService.js');
    const { createWorkspaceBackup, restoreWorkspaceBackupSelection } = await import('/js/storage/backupService.js');
    const { parsePageRecordContent, updatePageRecordContent } = await import('/js/core/pageRecord.js');
    const { setCurrentPage, setPages } = await import('/js/stateActions.js'); setCurrentPage(null);
    const f = window.__closure, source = getPageById('actor'), item = getPageById('A');
    const values = parsePageRecordContent(source.content).variablesJson;
    values.inactive = []; values.values['dnd.items'] = [{pageId:'A'}]; values.values['dnd.equippedItems'] = [];
    source.content = updatePageRecordContent(source.content, { variablesJson: values, relationships: [{id:'owns',targetId:'A',type:'owns'}] });
    const itemEnvelope = parsePageRecordContent(item.content).variablesJson; itemEnvelope.inactive = [];
    item.content = updatePageRecordContent(item.content, {variablesJson:itemEnvelope});
    await f.adapter.writeText(item.path,item.content);
    await f.adapter.writeText(source.path, source.content); setPages([source, item]);
    const registry = createCardTypeRegistryFromCatalog((await readCardTypeCatalog()).catalog, {bundledTypes:[],bundledFieldSets:[]}); setPageRepositoryRegistry(registry);
    const pkg = createWorldPackageFromPages([source,item],{registry});
    const backup = await createWorkspaceBackup({storageAdapter:f.adapter,cleanup:false});
    const imported = await applyWorldPackagePageImport({packageData:pkg,backupManifest:backup,conflictStrategy:'copy',storageAdapter:f.adapter,existingPages:[source,item]});
    const copiedActor = getAllPages().find(p=>p.id!=='actor' && p.type==='character');
    const copiedItem = getAllPages().find(p=>p.id!=='A' && p.type==='item');
    const copied = parsePageRecordContent(await f.adapter.readText(copiedActor.path));
    await f.adapter.writeText(source.path, source.content.replace('Free recovery text','mutated source'));
    const restore = await restoreWorkspaceBackupSelection(backup.id,{pageNames:[source.name],assetPaths:[]},f.adapter);
    return {imported, version:pkg.version, copiedItem:copiedItem.id, copied, restore, current:getPageById('actor').content, original:source.content, copiedStillPresent:!!getPageById(copiedActor.id)};
  });
  expect(result.version).toBe(2); expect(result.imported.importedPages).toBe(2);
  expect(result.copied.variablesJson.values['dnd.items']).toEqual([{pageId:result.copiedItem}]);
  expect(result.copied.relationships[0].targetId).toBe(result.copiedItem);
  expect(result.current).toBe(result.original); expect(result.copiedStillPresent).toBe(true);
  expect(result.restore.preRestoreBackupId).toBeTruthy();
});
