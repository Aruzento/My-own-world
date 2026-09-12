import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombatSessionTransaction, logCombatSessionOperation } from '../js/events/combatSessionEventLog.js';
import { createTypedEvent } from '../js/events/eventTypes.js';
import { readTransactionRecords, EVENT_TRANSACTION_LOG_PATH } from '../js/events/eventStore.js';
import { createMemoryWorkspaceAdapter } from './fixtures/dataSafetyFixtures.mjs';
import { appendTransactionRecord } from '../js/events/eventStore.js';
import { createEventHistoryViewModel } from '../js/ui/eventHistoryPanel.js';

const now = () => '2026-09-11T12:00:00.000Z';
const options = () => { let id = 0; return { now, createId: () => `audit-${++id}` }; };
function snapshot(status = 'active', round = 2, current = 'a') {
  return { initiative: { activeParticipantId: current }, combatSession: status ? {
    sessionId: 'session-1', status, round,
    participants: [{ participantId: 'a', ready: false, delayed: false }, { participantId: 'b', ready: true, delayed: false }]
  } : null };
}
function input(operation, before = snapshot(), after = snapshot()) {
  return { operation, before, after, mapPageId: 'map-page' };
}
const saved = { writeStatus: 'saved' };

for (const [operation, from, to] of [['start', null, 'active'], ['pause', 'active', 'paused'],
  ['resume', 'paused', 'active'], ['finish', 'paused', 'finished'], ['prepare-next', 'finished', null]]) {
  test(`Combat audit lifecycle ${operation}`, () => {
    const tx = createCombatSessionTransaction(input(operation, snapshot(from), snapshot(to)), options());
    assert.equal(tx.status, 'completed');
    assert.equal(tx.events.length, 1);
    assert.equal(tx.events[0].type, 'combat.session.lifecycle.changed');
    assert.equal(tx.events[0].payload.beforeStatus, from || 'inactive');
    assert.equal(tx.events[0].payload.afterStatus, to || 'inactive');
    assert.equal(tx.events[0].payload.sessionId, 'session-1');
    assert.ok(Object.isFrozen(tx));
  });
}
test('Combat roster and flags use canonical before/after values', () => {
  const after = snapshot();
  after.combatSession.participants.pop();
  const roster = createCombatSessionTransaction(input('roster', snapshot(), after), options());
  assert.deepEqual(roster.events[0].payload.beforeParticipantIds, ['a', 'b']);
  assert.deepEqual(roster.events[0].payload.afterParticipantIds, ['a']);
  const flagsAfter = snapshot();
  flagsAfter.combatSession.participants[0].delayed = true;
  const flags = createCombatSessionTransaction({ ...input('flags', snapshot(), flagsAfter), participantId: 'a' }, options());
  assert.deepEqual(flags.events[0].payload.after, { ready: false, delayed: true });
});
for (const mode of ['next', 'previous', 'select']) {
  test(`Combat ${mode} records a turn without a round advance`, () => {
    const tx = createCombatSessionTransaction(input(mode, snapshot(), snapshot('active', 2, 'b')), options());
    assert.deepEqual(tx.events.map(event => event.type), ['turn.changed']);
    assert.equal(tx.events[0].payload.mode, mode);
  });
}
test('Forward wrap creates one deterministic transaction with ordered turn then round facts', () => {
  const request = input('next', snapshot('active', 2, 'b'), snapshot('active', 3, 'a'));
  const tx = createCombatSessionTransaction(request, options());
  assert.deepEqual(tx, createCombatSessionTransaction(request, options()));
  assert.deepEqual(tx.events.map(event => [event.type, event.order]), [['turn.changed', 1], ['round.advanced', 2]]);
  assert.ok(tx.events.every(event => event.transactionId === tx.transactionId));
});
test('Pre-combat, ordinary value corrections and no-op operations produce no audit transaction', () => {
  for (const request of [input('next', snapshot(null), snapshot(null)), input('values'), input('pause'), input('roster'), input('select')]) {
    assert.equal(createCombatSessionTransaction(request, options()), null);
  }
});
test('Unconfirmed, conflicting and failed saves never append successful audit history', async () => {
  const storageAdapter = createMemoryWorkspaceAdapter();
  for (const saveResult of [undefined, { writeStatus: 'superseded' }, { ...saved, conflict: true }, { ...saved, blocked: true }, { ...saved, stale: true }]) {
    const result = await logCombatSessionOperation(input('pause', snapshot(), snapshot('paused')), { ...options(), storageAdapter, saveResult });
    assert.equal(result.status, 'state-not-persisted');
  }
  assert.equal((await readTransactionRecords({ storageAdapter })).records.length, 0);
});
test('Append/reload preserves facts; append failure is explicit and is not retried', async () => {
  const storageAdapter = createMemoryWorkspaceAdapter();
  const request = input('pause', snapshot(), snapshot('paused'));
  const result = await logCombatSessionOperation(request, { ...options(), storageAdapter, saveResult: saved });
  assert.equal(result.status, 'durable');
  assert.equal((await readTransactionRecords({ storageAdapter })).records.length, 1);
  const failedStorage = createMemoryWorkspaceAdapter();
  let attempts = 0;
  failedStorage.appendText = async () => { attempts++; throw new Error('injected append failure'); };
  const failed = await logCombatSessionOperation(request, { ...options(), storageAdapter: failedStorage, saveResult: saved });
  assert.equal(failed.status, 'state-persisted-event-not-written');
  assert.equal(attempts, 1);
  assert.equal((await readTransactionRecords({ storageAdapter: failedStorage })).records.length, 0);
  await assert.rejects(failedStorage.readText(EVENT_TRANSACTION_LOG_PATH));
});
test('Every Combat payload rejects unknown fields, malformed values and unsupported versions', () => {
  const rosterAfter = snapshot(); rosterAfter.combatSession.participants.pop();
  const flagsAfter = snapshot(); flagsAfter.combatSession.participants[0].ready = true;
  const events = [
    ...createCombatSessionTransaction(input('pause', snapshot(), snapshot('paused')), options()).events,
    ...createCombatSessionTransaction(input('roster', snapshot(), rosterAfter), options()).events,
    ...createCombatSessionTransaction({ ...input('flags', snapshot(), flagsAfter), participantId: 'a' }, options()).events,
    ...createCombatSessionTransaction(input('next', snapshot(), snapshot('active', 3, 'b')), options()).events
  ];
  for (const event of events) {
    assert.throws(() => createTypedEvent({ ...event, payload: { ...event.payload, script: 'anything' } }), { code: 'EVENT_TYPE_INVALID_PAYLOAD' });
    assert.throws(() => createTypedEvent({ ...event, payload: { ...event.payload, sessionId: 42 } }));
    assert.throws(() => createTypedEvent({ ...event, payloadVersion: 2 }));
    for (const key of Object.keys(event.payload).filter(key => key !== 'mapPageId')) {
      const payload = { ...event.payload }; delete payload[key];
      assert.throws(() => createTypedEvent({ ...event, payload }), `${event.type}.${key} is required`);
    }
  }
});

test('Combat payload domain values are strict and known turn/round types are active', () => {
  const event = createCombatSessionTransaction(input('pause', snapshot(), snapshot('paused')), options()).events[0];
  for (const patch of [{ beforeStatus: ['active'] }, { round: 0 }, { round: 1.5 }, { participantIds: ['a', 'a'] },
    { currentParticipantId: {} }, { mapPageId: 3 }, { operation: 'attack' }, { afterStatus: 'finished' }]) {
    assert.throws(() => createTypedEvent({ ...event, payload: { ...event.payload, ...patch } }));
  }
  const after = snapshot(); after.combatSession.participants[0].ready = true;
  const flags = createCombatSessionTransaction({ ...input('flags', snapshot(), after), participantId: 'a' }, options()).events[0];
  for (const bad of [{ ready: 1, delayed: false }, { ready: false }, { ready: false, delayed: false, hp: 10 }]) {
    assert.throws(() => createTypedEvent({ ...flags, payload: { ...flags.payload, after: bad } }));
  }
  const wrap = createCombatSessionTransaction(input('next', snapshot(), snapshot('active', 3, 'b')), options()).events;
  assert.throws(() => createTypedEvent({ ...wrap[0], payload: { ...wrap[0].payload, mode: 'auto' } }));
  assert.throws(() => createTypedEvent({ ...wrap[1], payload: { ...wrap[1].payload, toRound: 4 } }));
  for (const status of ['paused', 'finished']) {
    assert.equal(createCombatSessionTransaction(input('next', snapshot(status), snapshot(status, 2, 'b')), options()), null);
  }
});

test('Every Combat event has a readable Russian history summary and no resource undo', async () => {
  const storageAdapter = createMemoryWorkspaceAdapter();
  const deps = options();
  const roster = snapshot(); roster.combatSession.participants.pop();
  const flags = snapshot(); flags.combatSession.participants[0].ready = true;
  const requests = [
    ...[['start', null, 'active'], ['pause', 'active', 'paused'], ['resume', 'paused', 'active'],
      ['finish', 'active', 'finished'], ['prepare-next', 'finished', null]].map(([op, from, to]) => input(op, snapshot(from), snapshot(to))),
    input('roster', snapshot(), roster), { ...input('flags', snapshot(), flags), participantId: 'a' },
    input('next', snapshot(), snapshot('active', 3, 'b'))
  ];
  for (const request of requests) await appendTransactionRecord(createCombatSessionTransaction(request, deps), { storageAdapter });
  const view = await createEventHistoryViewModel({}, { storageAdapter });
  assert.equal(view.items.length, 9);
  assert.ok(view.items.every(item => !item.canUndo && item.typeLabel !== 'Событие' && item.summary !== 'Событие записано в журнал.'));
  for (const text of ['Начало боя', 'Пауза боя', 'Бой продолжен', 'Бой завершён', 'Подготовка нового боя', 'Состав:', 'Готов', 'Ход:', 'Раунд: 2 → 3']) {
    assert.ok(view.items.some(item => item.summary.includes(text)), text);
  }
});
