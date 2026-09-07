import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSessionModel } from '../js/combat/combatSessionModel.js';
import { CampaignMapInitiativeModel } from '../js/editor/campaignMapInitiativeModel.js';
import { CampaignMapModel } from '../js/editor/campaignMapModel.js';
import { CampaignMapStore } from '../js/editor/campaignMapStore.js';
import { serializeCampaignMapModelHTML } from '../js/editor/campaignMapDataSerializer.js';
import {
  advanceCombatTurn,
  retreatCombatTurn
} from '../js/editor/campaignMapCombatSessionIntegration.js';

function fixture({ ids = ['a', 'b', 'c'], active = ids[0], round = 3, status = 'active' } = {}) {
  const stage = { dataset: {} };
  const map = {
    querySelector: selector => selector === '.campaign-map-stage' ? stage : null,
    querySelectorAll: () => []
  };
  const model = new CampaignMapModel({
    initiative: {
      activeParticipantId: active,
      participants: ids.map((participantId, index) => ({
        participantId, tokenId: `token-${participantId}`, pageId: `page-${participantId}`,
        name: participantId, roll: 10 + index, modifier: index, total: 10 + index * 2,
        isAlive: index !== 1
      }))
    },
    combatSession: status === null ? null : new CombatSessionModel({
      sessionId: 'session-progression', status, round,
      participants: ids.map((participantId, index) => ({
        participantId, ready: index === 0, delayed: index === 1
      }))
    }).toJSON()
  });
  const store = new CampaignMapStore(map, model);
  store.commitToDOM();
  return { model, store, map, stage };
}

const directions = [
  { plan: advanceCombatTurn, method: 'nextCombatTurn', owner: 'nextTurn', operation: 'next-turn' },
  { plan: retreatCombatTurn, method: 'previousCombatTurn', owner: 'previousTurn', operation: 'previous-turn' }
];

for (const entry of [
  { name: 'normal next', direction: 0, active: 'a', target: 'b', round: 3, after: 3, wrapped: false },
  { name: 'forward wrap', direction: 0, active: 'c', target: 'a', round: 3, after: 4, wrapped: true },
  { name: 'previous inside order', direction: 1, active: 'c', target: 'b', round: 5, after: 5, wrapped: false },
  { name: 'previous visual wrap', direction: 1, active: 'a', target: 'c', round: 5, after: 5, wrapped: false },
  { name: 'single participant next', direction: 0, ids: ['a'], active: 'a', target: 'a', round: 1, after: 2, wrapped: true },
  { name: 'single participant previous', direction: 1, ids: ['a'], active: 'a', target: 'a', round: 5, after: 5, wrapped: false }
]) {
  test(`${entry.name} prepares detached canonical state through the initiative owner`, t => {
    const { model } = fixture(entry);
    const before = structuredClone(model.toJSON());
    const direction = directions[entry.direction];
    const owner = t.mock.method(CampaignMapInitiativeModel.prototype, direction.owner);
    const result = direction.plan(model);

    assert.equal(owner.mock.callCount(), 1);
    assert.equal(result.ok, true);
    assert.equal(result.operation, direction.operation);
    assert.equal(result.wrapped, entry.wrapped);
    assert.equal(result.previousParticipantId, entry.active);
    assert.equal(result.participantId, entry.target);
    assert.equal(result.previousRound, entry.round);
    assert.equal(result.round, entry.after);
    assert.deepEqual(result.initiative, { ...before.initiative, activeParticipantId: entry.target });
    assert.deepEqual(result.session, { ...before.combatSession, round: entry.after });
    assert.deepEqual(model.toJSON(), before);
    result.initiative.participants[0].total = -100;
    result.session.participants[0].ready = false;
    assert.deepEqual(model.toJSON(), before, 'prepared records must not alias the live aggregate');
  });
}

test('repeated forward progression increments once per round including a single participant', () => {
  for (const ids of [['a', 'b'], ['a']]) {
    const { store, model } = fixture({ ids, round: 1 });
    for (let step = 1; step <= ids.length * 3; step += 1) {
      const result = store.nextCombatTurn();
      assert.equal(result.ok, true);
      assert.equal(model.initiative.activeParticipantId, ids[step % ids.length]);
      assert.equal(model.combatSession.round, 1 + Math.floor(step / ids.length));
    }
  }
});

for (const status of ['paused', 'finished', 'inactive', null]) {
  test(`${status} session rejects both directions without publication or initiative fallback`, t => {
    for (const direction of directions) {
      const { model, store, stage } = fixture({ status });
      if (status === 'inactive') {
        // Also exercise explicit inactive input, before map hydration normalizes it to null.
        assert.equal(direction.plan({ ...model, combatSession: { status: 'inactive' } }).reason, 'no-session');
      }
      const before = structuredClone(model.toJSON());
      const dom = structuredClone(stage.dataset);
      const dirty = t.mock.method(store, 'markDirty');
      const commit = t.mock.method(store, 'commitToDOM');
      const shift = t.mock.method(CampaignMapInitiativeModel.prototype, 'shiftTurn', () => assert.fail('must reject before shift'));
      const result = store[direction.method]();
      assert.equal(result.ok, false);
      assert.equal(result.operation, direction.operation);
      assert.equal(result.reason, status === null || status === 'inactive' ? 'no-session' : 'turn-progression-not-allowed');
      assert.deepEqual(model.toJSON(), before);
      assert.deepEqual(stage.dataset, dom);
      assert.equal(store.isDirty(), false);
      assert.equal(dirty.mock.callCount(), 0);
      assert.equal(commit.mock.callCount(), 0);
      assert.equal(shift.mock.callCount(), 0);
      shift.mock.restore();
    }
  });
}

for (const entry of [
  { name: 'empty initiative', change: model => model.setInitiative({ participants: [] }), reason: 'empty-roster' },
  { name: 'empty combat roster', change: model => { model.combatSession.participants = []; }, reason: 'empty-roster' },
  { name: 'unresolved active id', change: model => { model.initiative.activeParticipantId = 'missing'; }, reason: 'active-participant-not-found' },
  { name: 'empty canonical active id', change: model => { model.initiative.activeParticipantId = ''; }, reason: 'active-participant-not-found' },
  { name: 'active outside combat', change: model => { model.combatSession.participants.shift(); }, reason: 'active-participant-outside-session' },
  { name: 'non-current combat member missing from initiative', change: model => { model.initiative.participants.pop(); }, reason: 'roster-mismatch' },
  { name: 'initiative target outside combat', change: model => { model.combatSession.participants.pop(); }, reason: 'roster-mismatch' },
  { name: 'duplicate initiative id', change: model => { model.initiative.participants.push({ ...model.initiative.participants[0] }); }, reason: 'roster-mismatch' },
  { name: 'duplicate combat id', change: model => { model.combatSession.participants.push({ ...model.combatSession.participants[0] }); }, reason: 'roster-mismatch' }
]) {
  test(`${entry.name} rejects both directions without repair or mutation`, t => {
    const shift = t.mock.method(CampaignMapInitiativeModel.prototype, 'shiftTurn', () => assert.fail('must reject before fallback'));
    for (const direction of directions) {
      const { model, store, stage } = fixture();
      entry.change(model);
      const before = structuredClone(model.toJSON());
      const dom = structuredClone(stage.dataset);
      const dirty = t.mock.method(store, 'markDirty');
      const commit = t.mock.method(store, 'commitToDOM');
      assert.deepEqual(store[direction.method](), {
        ok: false, operation: direction.operation, reason: entry.reason
      });
      assert.deepEqual(model.toJSON(), before);
      assert.deepEqual(stage.dataset, dom);
      assert.equal(store.isDirty(), false);
      assert.equal(dirty.mock.callCount(), 0);
      assert.equal(commit.mock.callCount(), 0);
    }
    assert.equal(shift.mock.callCount(), 0);
  });
}

test('a target invalidated by the initiative step is rejected before aggregate publication', t => {
  for (const direction of directions) {
    for (const resolved of [false, true]) {
      const step = t.mock.method(CampaignMapInitiativeModel.prototype, direction.owner, function () {
        this.activeParticipantId = 'outside';
        if (resolved) this.participants.push({ ...this.participants[0], participantId: 'outside' });
        return this.getParticipant('outside');
      });
      const { store, model, stage } = fixture();
      const before = structuredClone(model.toJSON());
      const dom = structuredClone(stage.dataset);
      const commit = t.mock.method(store, 'commitToDOM');
      const result = store[direction.method]();
      assert.equal(result.ok, false);
      assert.equal(result.reason, resolved ? 'active-participant-outside-session' : 'active-participant-not-found');
      assert.deepEqual(model.toJSON(), before);
      assert.deepEqual(stage.dataset, dom);
      assert.equal(store.isDirty(), false);
      assert.equal(commit.mock.callCount(), 0);
      step.mock.restore();
    }
  }
});

test('combat representation order and missing token/page references do not become initiative truth', () => {
  const { model } = fixture();
  model.combatSession.participants.reverse();
  const before = structuredClone(model.toJSON());
  assert.equal(model.tokens.length, 0);
  const result = advanceCombatTurn(model);
  assert.equal(result.ok, true);
  assert.equal(result.participantId, 'b');
  assert.equal(result.initiative.participants[1].isAlive, false, 'canonical initiative does not skip dead participants');
  assert.deepEqual(result.session, before.combatSession);
  assert.deepEqual(model.toJSON(), before);
});

test('successful store progression publishes one aggregate with one dirty mark and one DOM commit', t => {
  for (const [method, active, next, round] of [
    ['nextCombatTurn', 'a', 'b', 8], ['nextCombatTurn', 'c', 'a', 9],
    ['previousCombatTurn', 'a', 'c', 8]
  ]) {
    const { store, model, stage } = fixture({ active, round: 8 });
    const sessionBefore = model.combatSession;
    const dirty = t.mock.method(store, 'markDirty');
    const commit = t.mock.method(store, 'commitToDOM', function () {
      assert.equal(this.model.initiative.activeParticipantId, next);
      assert.equal(this.model.combatSession.round, round);
      return CampaignMapStore.prototype.commitToDOM.call(this);
    });
    assert.equal(store[method]().ok, true);
    assert.equal(dirty.mock.callCount(), 1);
    assert.equal(commit.mock.callCount(), 1);
    assert.equal(store.isDirty(), true);
    assert.equal(JSON.parse(decodeURIComponent(stage.dataset.initiativeState)).activeParticipantId, next);
    assert.equal(JSON.parse(decodeURIComponent(stage.dataset.combatSessionState)).round, round);
    if (round === 8) assert.equal(model.combatSession, sessionBefore, 'no session replacement without round change');
    else assert.notEqual(model.combatSession, sessionBefore);
  }
});

test('direct selection sorting manual values reorder and reconciliation never advance round', () => {
  const { store, model } = fixture({ round: 6 });
  const originalSession = structuredClone(model.combatSession);
  const initiative = new CampaignMapInitiativeModel(model.initiative);
  initiative.setActive('c');
  store.setInitiative(initiative.toJSON());
  assert.deepEqual(model.combatSession, originalSession);
  initiative.sortByInitiative();
  store.setInitiative(initiative.toJSON());
  assert.deepEqual(model.combatSession, originalSession);
  initiative.participants[0].roll = 20;
  initiative.participants[0].modifier = 7;
  initiative.participants[0].total = 42;
  store.setInitiative(initiative.toJSON());
  assert.deepEqual(model.combatSession, originalSession);
  initiative.participants.reverse();
  store.setInitiative(initiative.toJSON());
  assert.deepEqual(model.combatSession, originalSession);
  initiative.participants.push({ ...initiative.participants[0], participantId: 'new' });
  const result = store.setInitiativeRoster(initiative.toJSON());
  assert.equal(result.ok, true);
  assert.equal(model.combatSession.round, 6);
  assert.equal(model.combatSession.sessionId, originalSession.sessionId);
  assert.deepEqual(model.combatSession.participants.slice(0, 3), originalSession.participants);
});

test('round overflow rejects a forward wrap rather than normalizing the round back to one', t => {
  const { store, model, stage } = fixture({ ids: ['a'], round: Number.MAX_SAFE_INTEGER });
  const before = structuredClone(model.toJSON());
  const dom = structuredClone(stage.dataset);
  const commit = t.mock.method(store, 'commitToDOM');
  const result = store.nextCombatTurn();
  assert.deepEqual(result, { ok: false, operation: 'next-turn', reason: 'round-limit-exceeded' });
  assert.deepEqual(model.toJSON(), before);
  assert.deepEqual(stage.dataset, dom);
  assert.equal(commit.mock.callCount(), 0);
  assert.equal(store.isDirty(), false);
  assert.equal(store.previousCombatTurn().ok, true);
  assert.equal(model.combatSession.round, Number.MAX_SAFE_INTEGER);
});

test('forward wrap serializes and reloads current participant and round in the existing map format', () => {
  const { store, model, map } = fixture({ active: 'c', round: 8 });
  const before = structuredClone(model.combatSession);
  assert.equal(store.nextCombatTurn().ok, true);
  const html = serializeCampaignMapModelHTML({ title: 'Turn Map', model });
  const stage = { dataset: {
    initiativeState: html.match(/data-initiative-state="([^"]+)"/)[1],
    combatSessionState: html.match(/data-combat-session-state="([^"]+)"/)[1]
  } };
  const reloaded = CampaignMapModel.fromElement({ ...map, querySelector: selector => selector === '.campaign-map-stage' ? stage : null });
  assert.equal(reloaded.initiative.activeParticipantId, 'a');
  assert.deepEqual(reloaded.combatSession, { ...before, round: 9 });
  assert.deepEqual(reloaded.initiative, model.initiative);
  assert.equal(reloaded.version, model.version);
});
