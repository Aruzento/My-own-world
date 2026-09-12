import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignMapModel } from '../js/editor/campaignMapModel.js';
import { serializeCampaignMapModelHTML } from '../js/editor/campaignMapDataSerializer.js';
import { persistPageContentCommand } from '../js/storage/pageCommandService.js';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import { clearWriteRevisions } from '../js/storage/writeQueue.js';
import { setPages } from '../js/stateActions.js';
import { getPageById } from '../js/repository/pageRepository.js';
import { createWorkspaceBackup, restoreWorkspaceBackup } from '../js/storage/backupService.js';
import { createDataSafetyPage, createMemoryWorkspaceAdapter, seedWorkspace } from './fixtures/dataSafetyFixtures.mjs';
import { updatePageRecordContent, parsePageRecordContent } from '../js/core/pageRecord.js';
import { logCombatSessionOperation } from '../js/events/combatSessionEventLog.js';
import { readTransactionRecords, EVENT_TRANSACTION_LOG_PATH } from '../js/events/eventStore.js';
import { createEventHistoryViewModel } from '../js/ui/eventHistoryPanel.js';

function model(status = 'active') {
  return new CampaignMapModel({ combatSession: { sessionId: 'recovery-session', status, round: 7,
    participants: [{ participantId: 'a', ready: true, delayed: true }, { participantId: 'b', ready: false, delayed: true }] },
  initiative: { activeParticipantId: 'b', participants: [
    { participantId: 'a', name: 'Alpha', roll: 13, modifier: 2, total: 15 },
    { participantId: 'b', name: 'Beta', roll: 19, modifier: -1, total: 18 }
  ] } });
}
function body(value) { return serializeCampaignMapModelHTML({ title: 'Recovery map', model: value }); }
function reload(content) {
  const html = parsePageRecordContent(content).body;
  const dataset = {};
  for (const [attribute, key] of [['data-initiative-state', 'initiativeState'], ['data-combat-session-state', 'combatSessionState']]) {
    const match = html.match(new RegExp(`${attribute}="([^"]*)"`));
    assert.ok(match, attribute);
    dataset[key] = match[1];
  }
  return CampaignMapModel.fromElement({ querySelector: selector => selector === '.campaign-map-stage' ? { dataset } : null, querySelectorAll: () => [] });
}
async function fixture(status) {
  const adapter = createMemoryWorkspaceAdapter();
  setStorageAdapter(adapter); clearWriteRevisions();
  const a = model(status);
  const page = createDataSafetyPage({ id: 'combat-map', title: 'Recovery map', template: 'campaignMap', type: 'campaignMap', body: body(a) });
  setPages([page]);
  await seedWorkspace(adapter, { pages: [page], assets: {} });
  const save = value => persistPageContentCommand({ page, content: updatePageRecordContent(page.content, { body: body(value) }), reason: 'combat-recovery-test' });
  const audit = (operation, before, after, saveResult) => logCombatSessionOperation({ operation,
    before: before.toJSON(), after: after.toJSON(), mapPageId: page.id }, { storageAdapter: adapter, saveResult });
  return { adapter, a, page, save, audit };
}
function sameState(actual, expected) {
  assert.deepEqual(actual.combatSession, expected.combatSession);
  assert.deepEqual(actual.initiative, expected.initiative);
}

for (const status of ['active', 'paused', 'finished']) {
  test(`Durable ${status} Combat preserves exact identity, order, totals, current, round and flags`, async () => {
    const f = await fixture(status);
    assert.equal((await f.save(f.a)).writeStatus, 'saved');
    sameState(reload(await f.adapter.readText(f.page.path)), f.a);
    assert.equal(getPageById(f.page.id).content, await f.adapter.readText(f.page.path));
  });
}
test('Backup A restores Combat A exactly while newer B audit bytes remain unchanged', async () => {
  const f = await fixture('active');
  const original = await f.adapter.readText(f.page.path);
  const backup = await createWorkspaceBackup({ storageAdapter: f.adapter, pages: [f.page], id: 'combat-backup-a', cleanup: false });
  assert.equal(backup.version, 1);
  const b = model('paused');
  b.combatSession.round = 8;
  b.initiative.activeParticipantId = 'a';
  const result = await f.save(b);
  assert.equal((await f.audit('pause', f.a, b, result)).status, 'durable');
  const auditBytes = await f.adapter.readText(EVENT_TRANSACTION_LOG_PATH);
  await restoreWorkspaceBackup('combat-backup-a', f.adapter, { preRestoreBackupId: 'combat-safety-b' });
  assert.equal(await f.adapter.readText(f.page.path), original);
  sameState(reload(await f.adapter.readText(f.page.path)), f.a);
  assert.equal(await f.adapter.readText(EVENT_TRANSACTION_LOG_PATH), auditBytes);
  assert.equal((await readTransactionRecords({ storageAdapter: f.adapter })).records.length, 1);
  const paths = [...f.adapter.snapshotFiles().keys()];
  assert.equal(paths.some(path => path.includes('combat-backup-a') && path.includes('transactions.v1.jsonl')), false);
});
test('State-write failure appends nothing; append failure never rolls persisted Combat back', async () => {
  const f = await fixture('active');
  const b = model('paused');
  const original = await f.adapter.readText(f.page.path);
  const write = f.adapter.writeText.bind(f.adapter);
  f.adapter.writeText = async () => { throw new Error('injected state write'); };
  await assert.rejects(async () => f.audit('pause', f.a, b, await f.save(b)), /injected state write/);
  assert.equal(await f.adapter.readText(f.page.path), original);
  assert.equal(getPageById(f.page.id).content, original);
  assert.equal((await readTransactionRecords({ storageAdapter: f.adapter })).records.length, 0);
  f.adapter.writeText = write;
  let attempts = 0;
  f.adapter.appendText = async () => { attempts++; throw new Error('injected audit append'); };
  const receipt = await f.save(b);
  assert.equal((await f.audit('pause', f.a, b, receipt)).status, 'state-persisted-event-not-written');
  sameState(reload(await f.adapter.readText(f.page.path)), b);
  assert.equal(getPageById(f.page.id).content, await f.adapter.readText(f.page.path));
  assert.equal(attempts, 1);
  assert.equal((await readTransactionRecords({ storageAdapter: f.adapter })).records.length, 0);
});
test('Corrupt audit does not prevent valid Combat load and continuation; history reports diagnostics', async () => {
  const f = await fixture('active');
  await f.adapter.writeText(EVENT_TRANSACTION_LOG_PATH, 'not a JSON record\n');
  const loaded = reload(await f.adapter.readText(f.page.path));
  sameState(loaded, f.a);
  const b = model('paused');
  const result = await f.save(b);
  const outcome = await f.audit('pause', loaded, b, result);
  assert.equal(outcome.status, 'durable');
  sameState(reload(await f.adapter.readText(f.page.path)), b);
  assert.ok((await readTransactionRecords({ storageAdapter: f.adapter })).invalidRecords.length);
  const history = await createEventHistoryViewModel({}, { storageAdapter: f.adapter });
  assert.equal(history.invalidRecordCount, 1);
  assert.equal(history.items.length, 1);
});
