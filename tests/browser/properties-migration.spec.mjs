import { test, expect } from '@playwright/test';

test('legacy HTML fixtures extract deterministically without live DOM or fallback normalization', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const fixtures = await (await fetch('/tests/fixtures/legacyPropertiesMigration.json')).json();
    const { buildPageRecordContent } = await import('/js/core/pageRecord.js');
    const { extractLegacyProperties } = await import('/js/migration/legacyPropertiesExtraction.js');
    const { preparePropertiesMigration } = await import('/js/migration/propertiesMigrationPlan.js');
    const results = [];
    for (const [id, fixture] of Object.entries(fixtures)) {
      const record = { id, path: `pages/${id}.md`, content: buildPageRecordContent({ id, type: fixture.type, template: 'card', body: fixture.body, now: '2026-09-26T00:00:00Z' }) };
      const before = document.body.innerHTML;
      const extracted = extractLegacyProperties(record);
      const plan = await preparePropertiesMigration(record, { pages: [{ id: 'armor', title: 'Armor', aliases: ['Armor alias'], type: 'item' }] });
      results.push({ id, deterministic: JSON.stringify(extracted) === JSON.stringify(extractLegacyProperties(record)),
        untouchedDOM: before === document.body.innerHTML, status: plan.status,
        controls: extracted.blocks[0]?.controls.map(x => ({ key: x.key, raw: x.raw, present: x.present })),
        expectedControls: fixture.controls?.map(x => ({ key: x.key, raw: x.raw, present: x.present })),
        values: plan.envelope?.values, expectedValues: fixture.expectedValues, customKeys: plan.envelope?.extensions?.fields.map(x => x.key) || [] });
    }
    return results;
  });
  for (const item of result) {
    expect(item.deterministic, item.id).toBe(true);
    expect(item.untouchedDOM, item.id).toBe(true);
    if (item.expectedValues) {
      expect(item.status, item.id).toBe('ready');
      expect(item.controls, item.id).toEqual(item.expectedControls);
      const expected = { ...item.expectedValues };
      if (item.id === 'character') {
        expect(item.customKeys).toHaveLength(1);
        expect(item.customKeys[0]).toMatch(/^custom\.[a-f0-9-]+$/);
        expected[item.customKeys[0]] = false;
      }
      expect(item.values, item.id).toEqual(expected);
    } else expect(item.status, item.id).toBe(item.id === 'empty' ? 'no-properties' : 'blocked');
  }
});

test('explicit migration preview, backup, guarded commit, reload, Inspector, skip and recovery', async ({ page }) => {
  await page.goto('/');
  const saved = await page.evaluate(async () => {
    const fixtures = await (await fetch('/tests/fixtures/legacyPropertiesMigration.json')).json();
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { setPages } = await import('/js/stateActions.js');
    const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { previewLegacyPropertiesMigration, executeLegacyPropertiesMigration } = await import('/js/migration/propertiesMigration.js');
    const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
    const pages = [];
    for (const id of ['character', 'duplicate', 'empty']) {
      const content = buildPageRecordContent({ id, type: fixtures[id].type, template: 'card', body: fixtures[id].body, tags: ['keep'], now: '2026-09-26T00:00:00Z' });
      const record = createRuntimePageFromContent({ content, path: `pages/${id}.md`, name: `${id}.md` });
      await adapter.writeText(record.path, content); pages.push(record);
    }
    setPages(pages);
    const original = pages.map(page => page.content);
    let writes = 0;
    const write = adapter.writeText.bind(adapter);
    adapter.writeText = async (...args) => { writes++; return write(...args); };
    const preview = await previewLegacyPropertiesMigration();
    const previewWrites = writes;
    const result = await executeLegacyPropertiesMigration(preview, { confirm: true });
    const migrated = parsePageRecordContent(await adapter.readText('pages/character.md'));
    const files = [];
    async function readDirectory(path) {
      for (const file of await adapter.listFiles(path)) {
        const name = path ? `${path}/${file.name}` : file.name;
        if (file.kind === 'directory') await readDirectory(name);
        else files.push([name, await adapter.readText(name)]);
      }
    }
    await readDirectory('');
    return { result, previewWrites, original, files, migrated,
      unchangedBlocked: await adapter.readText('pages/duplicate.md') === original[1] };
  });
  expect(saved.previewWrites).toBe(0);
  expect(saved.result.status, JSON.stringify(saved.result)).toBe('partial');
  expect(saved.result.completed).toEqual(['character']);
  expect(saved.unchangedBlocked).toBe(true);
  expect(saved.migrated.variablesJson.values['dnd.health']['dnd.hpCurrent']).toBe(0);
  expect(saved.migrated.variablesJson.overrides).toEqual({});
  await page.reload();
  const reopened = await page.evaluate(async ({ files, backupId }) => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter, captureStorageWorkspaceContext } = await import('/js/storage/storageAdapter.js');
    const { setPages, setCurrentPage } = await import('/js/stateActions.js');
    const { createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
    const { readCardTypeCatalog, createCardTypeRegistryFromCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { renderUniversalCardInspector } = await import('/js/ui/cardInspector/universalCardInspector.js');
    const { previewLegacyPropertiesMigration, executeLegacyPropertiesMigration, recoverLegacyPropertiesMigration } = await import('/js/migration/propertiesMigration.js');
    const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
    for (const [path, content] of files) await adapter.writeText(path, content);
    const pages = files.filter(([path]) => path.startsWith('pages/')).map(([path, content]) => createRuntimePageFromContent({ content, path, name: path.split('/').at(-1) }));
    setPages(pages);
    const hero = pages.find(x => x.id === 'character'); setCurrentPage(hero);
    const registry = createCardTypeRegistryFromCatalog((await readCardTypeCatalog({ storageAdapter: adapter })).catalog);
    const editor = document.getElementById('editorArea'); editor.innerHTML = hero.body;
    captureEditorPageBase(hero, hero.content);
    await renderUniversalCardInspector(hero, { registry, editor, workspaceContext: captureStorageWorkspaceContext() });
    const { getUniversalCardInspectorState } = await import('/js/ui/cardInspector/universalCardInspector.js');
    const healthSection = getUniversalCardInspectorState().sections.find(section => section.fields.some(field => field.key === 'dnd.health'));
    document.getElementById(`inspector-tab-${healthSection.id}`)?.click();
    const input = document.querySelector('[data-field-key="dnd.health"] input[type="number"]');
    const value = input?.value;
    const preview = await previewLegacyPropertiesMigration();
    const second = await executeLegacyPropertiesMigration(preview, { confirm: true });
    const contentBeforeRecovery = await adapter.readText(hero.path);
    const recovery = await recoverLegacyPropertiesMigration(backupId, { confirm: true });
    const restored = await adapter.readText(hero.path);
    const legacyPreview = await previewLegacyPropertiesMigration({ pageIds: ['character'] });
    return { value, second, contentBeforeRecovery, restored, recovery, legacyMode: legacyPreview.plans[0].status };
  }, { files: saved.files, backupId: saved.result.backupId });
  expect(reopened.value).toBe('0');
  expect(reopened.second.status).toBe('skipped');
  expect(reopened.contentBeforeRecovery).toBe(saved.files.find(([path]) => path === 'pages/character.md')[1]);
  expect(reopened.restored).toBe(saved.original[0]);
  expect(reopened.legacyMode).toBe('ready');
  expect(reopened.recovery.restoredPages).toBe(3);
});

test('migration failures stop writes, retain recovery journal, and resume checks durable state', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const fixtures = await (await fetch('/tests/fixtures/legacyPropertiesMigration.json')).json();
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { setPages } = await import('/js/stateActions.js');
    const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { previewLegacyPropertiesMigration, executeLegacyPropertiesMigration, inspectPropertiesMigrationResume, resumeLegacyPropertiesMigration } = await import('/js/migration/propertiesMigration.js');
    const output = [];
    for (const failure of ['backup', 'catalog', 'schema', 'reference', 'stale', 'write', 'readback', 'journal', 'workspace']) {
      const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
      const pages = [];
      for (const id of ['a', 'b', 'c']) {
        const fixture = failure === 'reference' && id === 'a' ? fixtures.reference : fixtures.magic;
        const content = buildPageRecordContent({ id, type: fixture.type, template: 'card', body: fixture.body, now: '2026-09-26T00:00:00Z' });
        await adapter.writeText(`pages/${id}.md`, content);
        pages.push(createRuntimePageFromContent({ content, path: `pages/${id}.md`, name: `${id}.md` }));
      }
      if (failure === 'reference') await adapter.writeText('pages/armor.md', buildPageRecordContent({ id: 'armor', type: 'item', aliases: ['Armor alias'], body: '<h1>Armor</h1>' }));
      setPages(pages);
      const preview = await previewLegacyPropertiesMigration({ pageIds: ['a', 'b', 'c'] });
      const write = adapter.writeText.bind(adapter), read = adapter.readText.bind(adapter);
      let pageWrites = 0, failRead = false, failed = false;
      adapter.writeText = async (path, content) => {
        if (failure === 'backup' && path.endsWith('/manifest.json')) throw new Error('injected backup failure');
        if (failure === 'catalog' && path === '.my-own-world-card-types.json') throw new Error('injected catalog failure');
        if (failure === 'journal' && path.includes('/pending/') && pageWrites === 1 && !failed) { failed = true; throw new Error('injected journal crash'); }
        if (path.startsWith('pages/')) {
          if (failure === 'write' && path === 'pages/b.md') throw new Error('injected page failure');
          pageWrites++;
          if (failure === 'readback' && path === 'pages/b.md') failRead = true;
        }
        await write(path, content);
        if (failure === 'stale' && path === '.my-own-world-card-types.json') await write('pages/a.md', pages[0].content + 'new user content');
        if (failure === 'schema' && path === '.my-own-world-card-types.json') {
          const catalog = JSON.parse(content); catalog.types[0].label = 'Changed after preview'; await write(path, JSON.stringify(catalog));
        }
        if (failure === 'reference' && path === '.my-own-world-card-types.json') await write('pages/armor.md', buildPageRecordContent({ id: 'armor', type: 'spell', body: '<h1>Armor</h1>' }));
      };
      adapter.readText = async path => {
        if (failRead && path === 'pages/b.md') throw new Error('injected readback uncertainty');
        return read(path);
      };
      if (failure === 'workspace') setStorageAdapter(createMemoryStorageAdapter());
      const result = await executeLegacyPropertiesMigration(preview, { confirm: true });
      adapter.readText = read; adapter.writeText = write; setStorageAdapter(adapter);
      let resume = null, resumed = null;
      if (result.operationId) {
        const pending = JSON.parse(await read(`.my-own-world-ops/pending/${result.operationId}.json`));
        resume = await inspectPropertiesMigrationResume(pending);
        if (['write', 'readback', 'journal'].includes(failure)) resumed = await resumeLegacyPropertiesMigration(pending, { confirm: true });
      }
      output.push({ failure, result, pageWrites, resume, resumed, lastMode: parsePageRecordContent(await read('pages/c.md')).variablesStatus.mode });
    }
    return output;
  });
  for (const entry of results) {
    expect(entry.result.status, JSON.stringify(entry)).toBe('failed');
    if (['backup', 'catalog', 'schema', 'reference', 'stale', 'workspace'].includes(entry.failure)) expect(entry.pageWrites, entry.failure).toBe(0);
    if (entry.failure === 'stale') expect(entry.resume[0].status).toBe('conflict');
    if (entry.resumed) { expect(entry.resumed.status, JSON.stringify(entry)).toBe('completed'); expect(entry.lastMode).toBe('structured'); }
    else expect(entry.lastMode).toBe('legacy');
  }
});

test('migration persistence uses BrowserStorageAdapter and DesktopStorageAdapter contracts with identical durable results', async ({ page }) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    const { createBrowserStorageAdapter } = await import('/js/storage/browserStorageAdapter.js');
    const { createDesktopStorageAdapter } = await import('/js/storage/desktopStorageAdapter.js');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { setPages } = await import('/js/stateActions.js');
    const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { previewLegacyPropertiesMigration, executeLegacyPropertiesMigration, recoverLegacyPropertiesMigration } = await import('/js/migration/propertiesMigration.js');
    const fixture = (await (await fetch('/tests/fixtures/legacyPropertiesMigration.json')).json()).magic;
    const root = await navigator.storage.getDirectory();
    const output = [];
    for (const kind of ['browser', 'desktop']) {
      const name = `migration-test-${crypto.randomUUID()}`;
      const disk = createBrowserStorageAdapter(); disk.setWorkspaceHandle(await root.getDirectoryHandle(name, { create: true }));
      const calls = [];
      const oldTauri = globalThis.__TAURI__;
      const oldDesktopRoot = localStorage.getItem('myOwnWorld.desktop.workspaceRoot');
      try {
        globalThis.__TAURI__ = { core: { invoke: async (command, payload) => {
          calls.push(command);
          if (command === 'set_workspace_root') return payload.workspaceRoot;
          const methods = { ensure_directory: 'ensureDirectory', read_text_file: 'readText', write_text_file: 'writeText',
            read_binary_file: 'readBinary', write_binary_file: 'writeBinary', list_directory: 'listFiles', remove_file: 'removeFile' };
          if (!methods[command]) throw new Error(`Unexpected native command ${command}`);
          const content = command === 'write_binary_file' ? Uint8Array.from(payload.content).buffer : payload.content;
          const result = await disk[methods[command]](payload.path, content);
          return command === 'read_binary_file' ? [...new Uint8Array(result)] : result;
        } } };
        const adapter = kind === 'browser' ? disk : createDesktopStorageAdapter({ workspaceRoot: 'C:/TestOnly' });
        setStorageAdapter(adapter);
        const source = buildPageRecordContent({ id: 'magic', type: 'magic', body: fixture.body });
        await adapter.writeText('pages/magic.md', source);
        await adapter.writeBinary('assets/unused.bin', Uint8Array.from([0, 255, 12]).buffer);
        setPages([createRuntimePageFromContent({ content: source, path: 'pages/magic.md', name: 'magic.md' })]);
        const result = await executeLegacyPropertiesMigration(await previewLegacyPropertiesMigration(), { confirm: true });
        const migrated = parsePageRecordContent(await adapter.readText('pages/magic.md'));
        if (result.status !== 'completed') throw new Error(JSON.stringify(result));
        await adapter.writeBinary('assets/unused.bin', Uint8Array.from([99]).buffer);
        await recoverLegacyPropertiesMigration(result.backupId, { confirm: true });
        output.push({ kind, values: migrated.variablesJson.values, restored: await adapter.readText('pages/magic.md') === source,
          bytes: [...new Uint8Array(await adapter.readBinary('assets/unused.bin'))], calls });
      } finally {
        globalThis.__TAURI__ = oldTauri;
        if (oldDesktopRoot === null) localStorage.removeItem('myOwnWorld.desktop.workspaceRoot');
        else localStorage.setItem('myOwnWorld.desktop.workspaceRoot', oldDesktopRoot);
        await root.removeEntry(name, { recursive: true });
      }
    }
    return output;
  });
  for (const result of results) {
    expect(result.restored, result.kind).toBe(true);
    expect(result.values).toEqual({ 'spell.level': 0 });
    expect(result.bytes).toEqual([0, 255, 12]);
  }
  expect(results[1].calls).toEqual(expect.arrayContaining(['set_workspace_root', 'write_text_file', 'read_text_file', 'write_binary_file', 'read_binary_file']));
});

test('untrusted Properties HTML is inspected without executing scripts or handlers', async ({ page }) => {
  await page.goto('/');
  const requests = [];
  page.on('request', request => { if (request.url().includes('__migration_probe')) requests.push(request.url()); });
  const result = await page.evaluate(async () => {
    const { extractLegacyProperties } = await import('/js/migration/legacyPropertiesExtraction.js');
    const { buildPageRecordContent } = await import('/js/core/pageRecord.js');
    globalThis.migrationExecuted = false;
    const body = '</template><script>globalThis.migrationExecuted=true</script><iframe src="/__migration_probe_frame"></iframe><img src="/__migration_probe_image" onerror="globalThis.migrationExecuted=true"><div class="card-properties-block" data-card-type="magic"><input data-property-name="level" value="0"></div>';
    const extraction = extractLegacyProperties({ content: buildPageRecordContent({ id: 'unsafe', type: 'magic', body }) });
    await new Promise(resolve => requestAnimationFrame(resolve));
    return { executed: globalThis.migrationExecuted, raw: extraction.blocks[0].controls[0].raw };
  });
  expect(result).toEqual({ executed: false, raw: '0' });
  expect(requests).toEqual([]);
});
