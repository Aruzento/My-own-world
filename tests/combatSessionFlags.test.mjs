import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSessionModel } from '../js/combat/combatSessionModel.js';
import {
  setCombatParticipantFlags
} from '../js/combat/combatSessionFlags.js';
import {
  startCombatSession, pauseCombatSession, resumeCombatSession, finishCombatSession
} from '../js/combat/combatSessionLifecycle.js';

function fixture(status = 'active') {
  return new CombatSessionModel({
    sessionId: 'session-flags', status, round: 4,
    participants: [
      { participantId: 'a', ready: true, delayed: false },
      { participantId: 'b', ready: false, delayed: false },
      { participantId: 'c', ready: false, delayed: true }
    ]
  }).toJSON();
}

for (const patch of [{ ready: true }, { delayed: true }, { ready: true, delayed: true }]) {
  test(`strict patch ${JSON.stringify(patch)} changes only the exact target in a detached canonical snapshot`, () => {
    const current = fixture();
    const before = structuredClone(current);
    Object.freeze(current.participants[1]);
    Object.freeze(current.participants);
    Object.freeze(current);
    const result = setCombatParticipantFlags(current, 'b', patch);
    assert.deepEqual(result, {
      ok: true, operation: 'set-participant-flags', participantId: 'b', changed: true,
      session: {
        ...before,
        participants: before.participants.map(member => member.participantId === 'b' ? { ...member, ...patch } : member)
      }
    });
    assert.deepEqual(current, before);
    result.session.participants[0].ready = false;
    result.session.participants[1].ready = false;
    assert.deepEqual(current, before);
    assert.notEqual(result.session.participants[2], current.participants[2]);
  });
}

test('ready and delayed are independent including both true and clearing either marker', () => {
  let current = setCombatParticipantFlags(fixture(), 'b', { ready: true, delayed: true }).session;
  current = setCombatParticipantFlags(current, 'b', { ready: false }).session;
  assert.deepEqual(current.participants[1], { participantId: 'b', ready: false, delayed: true });
  current = setCombatParticipantFlags(current, 'b', { ready: true }).session;
  current = setCombatParticipantFlags(current, 'b', { delayed: false }).session;
  assert.deepEqual(current.participants[1], { participantId: 'b', ready: true, delayed: false });
});

test('idempotent single and two-field patches return success and a detached unchanged snapshot', () => {
  const current = fixture();
  for (const patch of [{ ready: false }, { delayed: false }, { ready: false, delayed: false }]) {
    const result = setCombatParticipantFlags(current, 'b', patch);
    assert.equal(result.ok, true);
    assert.equal(result.changed, false);
    assert.deepEqual(result.session, current);
    assert.notEqual(result.session, current);
    assert.notEqual(result.session.participants[1], current.participants[1]);
  }
});

for (const [label, patch] of [
  ['undefined', undefined], ['null', null], ['array', []], ['string', 'ready'], ['boolean', true],
  ['empty', {}], ['ready string', { ready: 'true' }], ['delayed number', { delayed: 1 }],
  ['explicit undefined', { ready: undefined }], ['explicit null', { delayed: null }],
  ['unknown key', { stunned: true }], ['mixed unknown', { ready: true, arbitrary: false }],
  ['mixed invalid', { ready: true, delayed: 0 }], ['generic bag', { flags: { ready: true } }],
  ['inherited', Object.create({ ready: true })], ['symbol key', { ready: true, [Symbol('extra')]: false }]
]) {
  test(`invalid flags: ${label} rejects before mutation or identity generation`, t => {
    const current = fixture();
    const before = structuredClone(current);
    t.mock.method(globalThis.crypto, 'randomUUID', () => assert.fail('flag edit cannot generate identity'));
    assert.deepEqual(setCombatParticipantFlags(current, 'b', patch), {
      ok: false, operation: 'set-participant-flags', reason: 'invalid-flags'
    });
    assert.deepEqual(current, before);
  });
}

test('accessor payloads and hidden unknown fields are rejected without evaluating command getters', () => {
  const current = fixture();
  const patch = { get ready() { assert.fail('do not execute patch getter'); } };
  const hidden = Object.defineProperty({ ready: true }, 'arbitrary', { value: false });
  assert.equal(setCombatParticipantFlags(current, 'b', patch).reason, 'invalid-flags');
  assert.equal(setCombatParticipantFlags(current, 'b', hidden).reason, 'invalid-flags');
});

for (const participantId of ['', ' ', null, undefined, 1, 'missing', ' b ']) {
  test(`invalid/missing exact participant ${JSON.stringify(participantId)} is never created`, t => {
    const current = fixture();
    const before = structuredClone(current);
    t.mock.method(globalThis.crypto, 'randomUUID', () => assert.fail('no identity creation'));
    const result = setCombatParticipantFlags(current, participantId, { ready: true });
    assert.equal(result.ok, false);
    assert.equal(result.reason, typeof participantId === 'string' && participantId.trim() ? 'participant-not-found' : 'invalid-participant');
    assert.deepEqual(current, before);
  });
}

test('duplicate Combat identity is rejected rather than selecting or editing an ambiguous member', () => {
  const current = fixture();
  current.participants.push({ participantId: 'b', ready: true, delayed: true });
  const before = structuredClone(current);
  assert.equal(setCombatParticipantFlags(current, 'b', { ready: true }).reason, 'invalid-participant');
  assert.deepEqual(current, before);
});

for (const status of ['paused', 'finished', 'inactive', null]) {
  test(`${status} session rejects marker edits without implicit lifecycle or identity change`, t => {
    const current = status === null ? null : fixture(status);
    const before = structuredClone(current);
    t.mock.method(globalThis.crypto, 'randomUUID', () => assert.fail('no identity creation'));
    assert.deepEqual(setCombatParticipantFlags(current, 'b', { ready: true }), {
      ok: false, operation: 'set-participant-flags',
      reason: status === null || status === 'inactive' ? 'no-session' : 'flags-edit-not-allowed'
    });
    assert.deepEqual(current, before);
  });
}

test('normalization cannot fabricate a missing session identity for a marker edit', t => {
  const current = fixture();
  delete current.sessionId;
  t.mock.method(globalThis.crypto, 'randomUUID', () => assert.fail('no identity creation'));
  assert.throws(() => setCombatParticipantFlags(current, 'b', { ready: true }), /existing sessionId/);
});

test('unresolved integrity does not block a local marker or enter canonical output', () => {
  const current = new CombatSessionModel({
    ...fixture(),
    integrity: { issues: [{ participantId: 'b', referenceType: 'initiative-participant' }] }
  });
  const before = structuredClone(current.integrity);
  const result = setCombatParticipantFlags(current, 'b', { ready: true });
  assert.equal(result.ok, true);
  assert.equal(result.session.participants[1].ready, true);
  assert.equal(current.participants[1].ready, false);
  assert.deepEqual(current.integrity, before);
  assert.equal(Object.hasOwn(result.session, 'integrity'), false);
});

test('pause resume finish preserve markers; editing a paused session needs a separate explicit resume', () => {
  const edited = setCombatParticipantFlags(fixture(), 'b', { ready: true, delayed: true }).session;
  const paused = pauseCombatSession(edited).session;
  assert.equal(setCombatParticipantFlags(paused, 'b', { ready: false }).reason, 'flags-edit-not-allowed');
  const resumed = resumeCombatSession(paused).session;
  const finished = finishCombatSession(resumed).session;
  for (const snapshot of [paused, resumed, finished]) {
    assert.deepEqual(snapshot.participants, edited.participants);
    assert.equal(snapshot.sessionId, edited.sessionId);
    assert.equal(snapshot.round, edited.round);
  }
  const next = setCombatParticipantFlags(resumed, 'b', { ready: false });
  assert.equal(next.ok, true);
  assert.equal(next.session.status, 'active');
  assert.equal(next.session.participants[1].delayed, true);
});

test('start and new session after finish always initialize false flags without inheritance', () => {
  const context = { participantIds: ['a', 'b'], activeParticipantId: 'a' };
  const first = startCombatSession(null, context, { generateId: () => 'first' }).session;
  const expected = context.participantIds.map(participantId => ({ participantId, ready: false, delayed: false }));
  assert.deepEqual(first.participants, expected);
  const marked = setCombatParticipantFlags(first, 'a', { ready: true, delayed: true }).session;
  const finished = finishCombatSession(marked).session;
  const next = startCombatSession(finished, context, { generateId: () => 'second' }).session;
  assert.deepEqual(next.participants, expected);
  assert.equal(next.sessionId, 'second');
  assert.equal(finished.participants[0].ready, true);
});
