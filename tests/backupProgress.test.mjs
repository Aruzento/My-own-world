import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { backupProgressFixture } from './fixtures/backupProgressFixtures.mjs';
import { createWorkspaceBackup, consumeCreatedBackupVerification, listIncompleteWorkspaceBackups } from '../js/storage/backupService.js';

test('full backup reports entity-correct read/digest/copy/verification phases without skipping integrity', async () => {
  const f = await backupProgressFixture(), events = [];
  const manifest = await createWorkspaceBackup({ pages: f.pages, id: 'phases', cleanup: false, onProgress: event => events.push(event) });
  for (const [stage, total] of [['чтение страниц', 3], ['проверка структуры', 3], ['проверка файлов', 2],
    ['копирование страниц', 3], ['копирование файлов', 2], ['проверка резервной копии: наличие файлов', 5],
    ['проверка резервной копии: страницы', 3], ['проверка резервной копии: файлы', 2], ['проверка резервной копии: структура', 3]]) {
    const phase = events.filter(event => event.stage === stage);
    assert.equal(phase[0].current, 0, stage); assert.equal(phase.at(-1).current, total, stage);
    assert.ok(phase.every(event => event.total === total), stage);
  }
  assert.ok(events.filter(event => event.stage === 'подготовка' || event.stage === 'поиск файлов').every(event => !event.total));
  assert.equal(events.at(-1).stage, 'готово');
  assert.ok(manifest.pages.every(page => page.contentDigest.startsWith('sha256:')));
  assert.ok(manifest.assets.every(asset => asset.digest.startsWith('sha256:')));
  assert.equal((await consumeCreatedBackupVerification(manifest, { storageAdapter: f.adapter })).pageContents[f.pages[0].name], f.pages[0].content);
});

test('progress observer exception cannot change durable backup outcome or verification receipt', async () => {
  for (const onProgress of [() => { throw new Error('detached progress UI'); }, async () => { throw new Error('async observer failure'); }]) {
  const f = await backupProgressFixture();
  const manifest = await createWorkspaceBackup({ pages: f.pages, id: 'observer-failure', cleanup: false, onProgress });
  assert.equal(f.writes.filter(write => write.path.endsWith('/manifest.json')).length, 1);
  assert.equal((await consumeCreatedBackupVerification(manifest, { storageAdapter: f.adapter })).manifest.id, manifest.id);
  }
});

test('asset digest failure stops before manifest; original workspace and incomplete evidence remain', async () => {
  const f = await backupProgressFixture(), read = f.adapter.readBinary.bind(f.adapter), events = [];
  f.adapter.readBinary = async path => { if (path === 'assets/1.bin') throw new Error('digest read failed'); return read(path); };
  await assert.rejects(createWorkspaceBackup({ pages: f.pages, id: 'digest-failure', cleanup: false, onProgress: event => events.push(event) }), /digest read failed/);
  assert.equal(f.writes.filter(write => write.path.endsWith('/manifest.json')).length, 0);
  assert.equal(events.at(-1).stage, 'проверка файлов'); assert.equal(events.at(-1).current, 1);
  assert.ok((await listIncompleteWorkspaceBackups({ storageAdapter: f.adapter })).some(snapshot => snapshot.id === 'digest-failure'));
  for (const page of f.pages) assert.equal(await f.adapter.readText(page.path), page.content);
});

test('large backup bounds filesystem fan-out and yields turns inside every heavy traversal', async () => {
  const f = await backupProgressFixture({ pageCount: 257, assetCount: 51 });
  const read = f.adapter.readText.bind(f.adapter), phases = new Set();
  let inFlight = 0, peak = 0, stage = '', turns = 0;
  f.adapter.readText = async path => { if (!path.startsWith('pages/')) return read(path);
    inFlight += 1; peak = Math.max(peak, inFlight); try { return await read(path); } finally { inFlight -= 1; } };
  const timer = setInterval(() => { turns += 1; phases.add(stage); }, 0);
  try { await createWorkspaceBackup({ pages: f.pages, id: 'yielding', cleanup: false, onProgress: event => { stage = event.stage; } }); }
  finally { clearInterval(timer); }
  assert.ok(peak <= 8); assert.ok(turns > 0);
  for (const expected of ['чтение страниц', 'проверка структуры', 'проверка файлов', 'копирование страниц', 'копирование файлов',
    'проверка резервной копии: наличие файлов', 'проверка резервной копии: страницы', 'проверка резервной копии: файлы', 'проверка резервной копии: структура']) assert.ok(phases.has(expected), expected);
});
