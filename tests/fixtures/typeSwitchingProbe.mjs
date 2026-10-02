// Disposable Chromium OPFS probe: real BrowserStorageAdapter I/O, not user files.
export async function setupTypeSwitchingProbe({ pageCount = 1000, assetCount = 32 } = {}) {
  const { createBrowserStorageAdapter } = await import('../../js/storage/browserStorageAdapter.js');
  const { setStorageAdapter } = await import('../../js/storage/storageAdapter.js');
  const { record, catalog } = await import('./inventoryAdoptionFixtures.mjs');
  const { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog, createCardTypeRegistryFromCatalog } = await import('../../js/storage/cardTypeCatalogStorage.js');
  const { setPages, setCurrentPage } = await import('../../js/stateActions.js');
  const { setPageRepositoryRegistry } = await import('../../js/repository/pageRepository.js');
  const { openPage } = await import('../../js/editor/editor.js');
  const { flushPendingAutosave } = await import('../../js/editor/autosave.js');
  const { createCardShellTemplate } = await import('../../js/templates/cardShell.js');
  const perf = await import('../../js/performance/workspacePerformance.js');
  const root = await (await navigator.storage.getDirectory()).getDirectoryHandle(`type-probe-${crypto.randomUUID()}`, { create: true });
  const adapter = createBrowserStorageAdapter(); adapter.setWorkspaceHandle(root); setStorageAdapter(adapter);
  const sourceCatalog = { ...catalog, types: catalog.types.filter(type => type.id !== 'location') };
  await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(sourceCatalog));
  const body = createCardShellTemplate().content.replace(/(<h1[^>]*>)[\s\S]*?(<\/h1>)/, '$1Probe actor$2');
  const pages = [record('probe-actor', 'character', { 'dnd.level': 7, 'dnd.items': [], 'dnd.equippedItems': [] }, body)];
  for (let i = 0; i < pageCount; i++) pages.push(record(`probe-${i}`, 'lore', {}, `<h1>Probe ${i}</h1><p>${'free content '.repeat(170)}</p>`));
  for (const page of pages) await adapter.writeText(page.path, page.content);
  for (let i = 0; i < assetCount; i++) await adapter.writeBinary(`assets/probe-${i}.bin`, new Uint8Array(65536).buffer);
  setCurrentPage(null); setPages(pages);
  setPageRepositoryRegistry(createCardTypeRegistryFromCatalog(sourceCatalog, { bundledTypes: [], bundledFieldSets: [] }));
  await openPage(pages[0]); await flushPendingAutosave();
  const counts = {}, paths = { reads: new Set(), writes: new Set() }, bytes = { read: 0, written: 0 }, io = {};
  for (const name of ['readText', 'writeText', 'readBinary', 'writeBinary', 'listFiles', 'ensureDirectory', 'removeFile']) {
    const original = adapter[name].bind(adapter);
    adapter[name] = async (...args) => {
      const start = performance.now(), path = String(args[0]); counts[name] = (counts[name] || 0) + 1;
      const result = await original(...args);
      io[name] = (io[name] || 0) + performance.now() - start;
      const size = value => typeof value === 'string' ? new TextEncoder().encode(value).byteLength : value?.byteLength || 0;
      if (name.startsWith('read')) { bytes.read += size(result); paths.reads.add(path); }
      if (name.startsWith('write')) { bytes.written += size(args[1]); paths.writes.add(path); }
      return result;
    };
  }
  let maxTaskMs = 0, maxHeartbeatGapMs = 0, last = performance.now();
  const observer = new PerformanceObserver(list => { for (const task of list.getEntries()) maxTaskMs = Math.max(maxTaskMs, task.duration); });
  observer.observe({ entryTypes: ['longtask'] });
  const timer = setInterval(() => { const now = performance.now(); maxHeartbeatGapMs = Math.max(maxHeartbeatGapMs, now - last); last = now; }, 8);
  perf.clearWorkspacePerformanceEvents();
  const started = performance.now();
  return { finish() {
    clearInterval(timer); observer.disconnect();
    return { pages: pages.length, assets: assetCount, durationMs: performance.now() - started, counts, bytes, io,
      originalPagesRead: [...paths.reads].filter(path => path.startsWith('pages/')).length,
      originalPagesWritten: [...paths.writes].filter(path => path.startsWith('pages/')).length,
      backupPagesWritten: [...paths.writes].filter(path => path.includes('.my-own-world-backups/') && path.includes('/pages/')).length,
      assetFilesRead: [...paths.reads].filter(path => path.includes('assets/')).length,
      assetFilesWritten: [...paths.writes].filter(path => path.includes('assets/')).length,
      maxTaskMs, maxHeartbeatGapMs, phases: perf.getWorkspacePerformanceEvents().reverse() };
  } };
}
