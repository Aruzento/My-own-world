import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { adoptionFixture, record } from './fixtures/inventoryAdoptionFixtures.mjs';
import { effectsAdoptionFixture } from './fixtures/effectsAdoptionFixtures.mjs';
import { createWorkspaceBackup, consumeCreatedBackupVerification, restoreWorkspaceBackup, cleanupWorkspaceBackups, cleanupIncompleteWorkspaceBackups } from '../js/storage/backupService.js';
import { beginWorkspaceOperation, failWorkspaceOperation, commitWorkspaceOperation } from '../js/storage/operationJournal.js';
import { persistPageContentCommand } from '../js/storage/pageCommandService.js';
import { updatePageTreePositions, inspectScopedTreeRecovery, recoverScopedTreeMove } from '../js/storage/pageStorage.js';
import { prepareVariablesChange, commitVariablesChange } from '../js/variables/entityVariables.js';
import { createPageStateIdentityFromContent, updatePageRecordContent } from '../js/core/pageRecord.js';
import { previewInventoryAdoption, executeInventoryAdoption, resumeInventoryAdoption } from '../js/migration/inventoryAdoption.js';
import { previewEffectsAdoption, executeEffectsAdoption } from '../js/migration/effectsAdoption.js';
import { clearWorkspacePerformanceEvents, getWorkspacePerformanceEvents } from '../js/performance/workspacePerformance.js';
import { clearBackgroundCheckpointQueue } from '../js/performance/backgroundCheckpointQueue.js';
import { setPages } from '../js/stateActions.js';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from '../js/storage/cardTypeCatalogStorage.js';

const fullCopies = f => f.writes.filter(write => /\/manifest.json$/.test(write.path));
const verificationCount = () => getWorkspacePerformanceEvents().filter(event => event.operation === 'backup.verification').length;

test('retention protects unresolved recovery evidence until exact committed operation', async () => {
  const f = await adoptionFixture();
  for (const id of ['old', 'new']) {
    const manifest = await createWorkspaceBackup({ pages: f.pages, id, cleanup: false });
    manifest.createdAt = id === 'old' ? '2020-01-01T00:00:00Z' : '2026-01-01T00:00:00Z';
    await f.adapter.writeText(`.my-own-world-backups/${id}/manifest.json`, JSON.stringify(manifest));
  }
  const copies = fullCopies(f).length;
  const journal = await beginWorkspaceOperation({ id: 'retain', type: 'inventory-adoption', before: { backupId: 'old', pages: ['actor'] } }, f.adapter, true);
  assert.equal((await cleanupWorkspaceBackups({ keepLatest: 1 })).removed, 0);
  await failWorkspaceOperation(journal, new Error('uncertain'), f.adapter, true);
  // A terminal receipt with the same id but a different source cannot release evidence.
  await commitWorkspaceOperation({ ...journal, before: { backupId: 'new', pages: ['actor'] } }, f.adapter, true);
  assert.equal((await cleanupWorkspaceBackups({ keepLatest: 1 })).removed, 0);
  await commitWorkspaceOperation(journal, f.adapter, true);
  assert.equal((await cleanupWorkspaceBackups({ keepLatest: 1 })).removed, 1);
  await assert.rejects(f.adapter.readText('.my-own-world-backups/old/manifest.json'));
  assert.ok(await f.adapter.readText('.my-own-world-backups/new/manifest.json'));
  assert.equal(fullCopies(f).length, copies);
});

test('unreadable/future journal blocks destructive cleanup before any snapshot deletion', async () => {
  const f = await adoptionFixture();
  for (const id of ['one', 'two']) await createWorkspaceBackup({ pages: f.pages, id, cleanup: false });
  await f.adapter.ensureDirectory('.my-own-world-ops/pending');
  for (const content of ['{malformed', JSON.stringify({ version: 2, id: 'unknown', status: 'pending', type: 'future', before: {} })]) {
    await f.adapter.writeText('.my-own-world-ops/pending/unknown.json', content);
    await assert.rejects(cleanupWorkspaceBackups({ keepLatest: 1 }), /cleanup blocked/i);
    assert.ok(await f.adapter.readText('.my-own-world-backups/one/manifest.json'));
    assert.ok(await f.adapter.readText('.my-own-world-backups/two/manifest.json'));
  }
  const list = f.adapter.listFiles.bind(f.adapter);
  f.adapter.listFiles = async path => { if (path.includes('.my-own-world-ops')) throw new Error('permission denied'); return list(path); };
  await assert.rejects(cleanupWorkspaceBackups({ keepLatest: 1 }), /journal cannot be read/i);
  f.adapter.listFiles = list;
  await f.adapter.writeText('.my-own-world-ops/pending/unknown.json', JSON.stringify({ version: 1, id: 'unknown', status: 'pending', type: 'inventory-adoption', before: { backupId: 'one' } }));
  const read = f.adapter.readText.bind(f.adapter), getRoot = f.adapter.getWorkspaceRoot.bind(f.adapter);
  let root = getRoot();
  f.adapter.getWorkspaceRoot = () => root;
  f.adapter.readText = async path => { const content = await read(path); if (path.includes('/pending/')) root = {}; return content; };
  await assert.rejects(cleanupWorkspaceBackups({ keepLatest: 1 }), /workspace changed/i);
  f.adapter.getWorkspaceRoot = getRoot; f.adapter.readText = read;
  assert.ok(await read('.my-own-world-backups/one/manifest.json'));
  assert.ok(await read('.my-own-world-backups/two/manifest.json'));
});

test('incomplete cleanup also preserves journal-owned raw recovery evidence', async () => {
  const f = await adoptionFixture();
  await f.adapter.ensureDirectory('.my-own-world-backups/incomplete/pages');
  await f.adapter.writeText('.my-own-world-backups/incomplete/pages/raw.md', 'raw recovery');
  await beginWorkspaceOperation({ id: 'incomplete-owner', type: 'inventory-adoption', before: { backupId: 'incomplete' } }, f.adapter, true);
  const result = await cleanupIncompleteWorkspaceBackups({ backupIds: ['incomplete'] });
  assert.equal(result.removed, 0); assert.equal(result.skipped, 1);
  assert.equal(await f.adapter.readText('.my-own-world-backups/incomplete/pages/raw.md'), 'raw recovery');
});

test('Tier A title/body and ordinary Variables write never create full backup', async () => {
  const f = await adoptionFixture({ actors: [{ id: 'actor', blocks: [] }] });
  for (const text of ['title A', 'title B', 'body C']) {
    const source = f.actor.content;
    const content = updatePageRecordContent(source, { body: `<h1>${text}</h1><p>free content</p>` });
    const result = await persistPageContentCommand({ page: f.actor, content, expectedBase: createPageStateIdentityFromContent(source) });
    assert.equal(result.writeStatus, 'saved');
  }
  const registry = createCardTypeRegistryFromCatalog((await readCardTypeCatalog({ storageAdapter: f.adapter })).catalog, { bundledTypes: [], bundledFieldSets: [] });
  const plan = prepareVariablesChange({ pageId: f.actor.id, expectedBase: createPageStateIdentityFromContent(f.actor.content), patch: [{ op: 'set', key: 'dnd.level', value: 4 }], context: { registry } });
  assert.equal((await commitVariablesChange(plan)).status, 'saved');
  assert.equal(fullCopies(f).length, 0);
});

test('creation owns one complete verification; live receipt is single-use and JSON copy is not trusted', async () => {
  const f = await adoptionFixture(); clearWorkspacePerformanceEvents();
  const progress = [], read = f.adapter.readText.bind(f.adapter);
  let reads = 0;
  f.adapter.readText = async path => { reads += 1; return read(path); };
  const manifest = await createWorkspaceBackup({ pages: f.pages, cleanup: false, id: 'one-verification', onProgress: value => progress.push(value.stage) });
  assert.equal(fullCopies(f).length, 1); assert.equal(verificationCount(), 1);
  const count = reads;
  const verified = await consumeCreatedBackupVerification(manifest, { storageAdapter: f.adapter });
  assert.equal(reads, count); assert.equal(verified.pageContents[f.actor.name], f.actor.content);
  assert.equal(progress[0], 'подготовка'); assert.ok(progress.includes('проверка')); assert.equal(progress.at(-1), 'готово');
  await f.adapter.writeText(`.my-own-world-backups/${manifest.id}/pages/${f.actor.name}`, 'corrupt');
  await assert.rejects(consumeCreatedBackupVerification(manifest, { storageAdapter: f.adapter }), /integrity|read|backup/i);
  await assert.rejects(consumeCreatedBackupVerification(JSON.parse(JSON.stringify(manifest)), { storageAdapter: f.adapter }), /integrity|read|backup/i);
});

test('Tier C Inventory and Effects execute one verified backup for multiple actors', async () => {
  for (const kind of ['inventory', 'effects']) {
    const f = kind === 'inventory' ? await adoptionFixture({ actors: [{ id: 'a', blocks: [[['A', '3']]] }, { id: 'b', blocks: [[['A', '3']]] }] }) :
      await effectsAdoptionFixture({ actors: [{ id: 'a' }, { id: 'b' }] });
    clearWorkspacePerformanceEvents();
    const preview = await (kind === 'inventory' ? previewInventoryAdoption : previewEffectsAdoption)(f.options);
    const phases = [];
    const result = await (kind === 'inventory' ? executeInventoryAdoption : executeEffectsAdoption)(preview, { confirm: true, onProgress: value => phases.push(value.stage) });
    assert.equal(result.status, 'completed', JSON.stringify(result));
    assert.equal(fullCopies(f).length, 1); assert.equal(verificationCount(), 1);
    assert.ok(phases.includes('проверка')); assert.ok(phases.includes('применение'));
  }
});

test('Tier C resume reuses original safety snapshot after crash and does not create another copy', async () => {
  const f = await adoptionFixture(), write = f.adapter.writeText.bind(f.adapter);
  let crashed = false;
  f.adapter.writeText = async (path, content) => {
    await write(path, content);
    if (!crashed && path.includes('/pending/') && content.includes('"verified"')) { crashed = true; throw new Error('checkpoint crash'); }
  };
  const failed = await executeInventoryAdoption(await previewInventoryAdoption(f.options), { confirm: true });
  assert.equal(failed.status, 'failed');
  f.adapter.writeText = write;
  const result = await resumeInventoryAdoption(failed.operationId, { ...f.options, confirm: true });
  assert.equal(result.status, 'completed', JSON.stringify(result));
  assert.equal(fullCopies(f).length, 1);
});

test('Tier C restore verifies source and creates exactly one new verified safety copy', async () => {
  const f = await adoptionFixture();
  const manifest = await createWorkspaceBackup({ pages: f.pages, cleanup: false, id: 'restore-source' });
  clearWorkspacePerformanceEvents();
  const result = await restoreWorkspaceBackup(manifest.id, f.adapter, { preRestorePages: f.pages, preRestoreBackupId: 'restore-safety' });
  assert.equal(result.restoredPages, f.pages.length);
  assert.equal(fullCopies(f).length, 2); assert.equal(verificationCount(), 1);
});

async function moveFixture() {
  const f = await adoptionFixture({ actors: [{ id: 'a', blocks: [] }, { id: 'b', blocks: [] }], items: [] });
  clearBackgroundCheckpointQueue();
  f.adapter.listFiles = async () => { throw new Error('Scoped move must not enumerate workspace'); };
  return f;
}
const move = f => updatePageTreePositions(f.pages.map((page, index) => ({ page, parentId: 'new-parent', order: 1000 + index })), { skipCheckpoint: true });

test('Tier B small structured tree move journals exact bytes, copies no unrelated owners and recovers explicitly', async () => {
  const f = await moveFixture(), sources = f.pages.map(page => page.content);
  const result = await move(f);
  assert.equal(result.changedPages, 2); assert.equal(fullCopies(f).length, 0);
  assert.ok(f.writes.every(write => write.path.startsWith('pages/') || write.path.startsWith('.my-own-world-ops/')));
  assert.equal((await inspectScopedTreeRecovery(result.operationId)).status, 'ready');
  const recovery = await recoverScopedTreeMove(result.operationId, { confirm: true });
  assert.equal(recovery.status, 'completed');
  for (let index = 0; index < f.pages.length; index += 1) assert.equal(await f.adapter.readText(f.pages[index].path), sources[index]);
  assert.equal((await recoverScopedTreeMove(result.operationId, { confirm: true })).status, 'already-original');
});

test('Tier B tree stale/third state never overwritten; workspace change and journal failure block before writes', async () => {
  for (const failure of ['stale', 'journal', 'workspace']) {
    const f = await moveFixture(), read = f.adapter.readText.bind(f.adapter), write = f.adapter.writeText.bind(f.adapter);
    const original = f.pages[0].content;
    if (failure === 'stale') await write(f.pages[0].path, original + 'external');
    if (failure === 'journal') f.adapter.writeText = async path => { throw new Error(`blocked ${path}`); };
    if (failure === 'workspace') f.adapter.readText = async path => { const content = await read(path); setStorageAdapter({ ...f.adapter }); return content; };
    await assert.rejects(move(f));
    assert.equal(await read(f.pages[0].path), failure === 'stale' ? original + 'external' : original);
  }
  const f = await moveFixture(), result = await move(f);
  await f.adapter.writeText(f.pages[0].path, f.pages[0].content + 'third');
  assert.equal((await recoverScopedTreeMove(result.operationId, { confirm: true })).status, 'conflict');
});

test('Tier B partial tree failure retains source/target journal and never retries uncertain write', async () => {
  const f = await moveFixture(), write = f.adapter.writeText.bind(f.adapter), source = f.pages[1].content;
  let operationId;
  f.adapter.writeText = async (path, content) => {
    if (path === f.pages[1].path) throw new Error('disk failure');
    await write(path, content);
  };
  await assert.rejects(move(f), error => { operationId = error.operationId; return Boolean(operationId); });
  assert.equal(await f.adapter.readText(f.pages[1].path), source);
  f.adapter.writeText = write;
  assert.equal((await inspectScopedTreeRecovery(operationId)).status, 'ready');
  assert.equal((await recoverScopedTreeMove(operationId, { confirm: true })).status, 'completed');
});

test('wide structured tree move remains Tier C with one verified backup, no backup per page', async () => {
  const f = await adoptionFixture({ actors: Array.from({ length: 11 }, (_, index) => ({ id: `actor-${index}`, blocks: [] })), items: [] });
  clearWorkspacePerformanceEvents();
  const result = await updatePageTreePositions(f.pages.map((page, index) => ({ page, parentId: 'parent', order: 1000 + index })), { skipCheckpoint: true });
  assert.equal(result.changedPages, 11); assert.ok(result.backupId);
  assert.equal(fullCopies(f).length, 1); assert.equal(verificationCount(), 1);
  assert.equal(f.writes.filter(write => write.path.startsWith('pages/')).length, 11);
});

for (const failure of ['journal-readback', 'page-readback']) {
  test(`Tier B ${failure} retains evidence, stops later writes and never retries`, async () => {
    const f = await moveFixture(), read = f.adapter.readText.bind(f.adapter);
    let pageReads = 0, operationId;
    f.adapter.readText = async path => {
      const content = await read(path);
      if (failure === 'journal-readback' && path.includes('/pending/')) return '{}';
      if (failure === 'page-readback' && path === f.pages[0].path && f.writes.some(write => write.path === path)) { pageReads += 1; return content + 'unconfirmed'; }
      return content;
    };
    await assert.rejects(move(f), error => { operationId = error.operationId; return true; });
    assert.equal(f.writes.filter(write => write.path === f.pages[1].path).length, 0);
    assert.equal(f.writes.filter(write => write.path === f.pages[0].path).length, failure === 'page-readback' ? 1 : 0);
    if (failure === 'page-readback') { assert.equal(pageReads, 1); assert.ok(operationId); }
  });
}
