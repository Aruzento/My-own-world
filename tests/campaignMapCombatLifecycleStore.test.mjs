import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignMapModel } from '../js/editor/campaignMapModel.js';
import { CampaignMapStore } from '../js/editor/campaignMapStore.js';

function fixture(status = 'active') {
  const model = new CampaignMapModel({
    initiative: { activeParticipantId: 'b', participants: [
      { participantId: 'a', total: 18 }, { participantId: 'b', total: 12 }
    ] },
    combatSession: status === null ? null : {
      sessionId: 'lifecycle-store', status, round: 4,
      participants: [{ participantId: 'a', ready: true }, { participantId: 'b', delayed: true }]
    }
  });
  return new CampaignMapStore(null, model);
}

for (const [from, method, to] of [
  ['active', 'pauseCombatSession', 'paused'], ['paused', 'resumeCombatSession', 'active'],
  ['active', 'finishCombatSession', 'finished'], ['paused', 'finishCombatSession', 'finished']
]) {
  test(`${method} from ${from} publishes exactly once through the existing setter`, t => {
    const store = fixture(from);
    const before = structuredClone(store.getModel().toJSON());
    const setter = t.mock.method(store, 'setCombatSession');
    const dirty = t.mock.method(store, 'markDirty');
    const dom = t.mock.method(store, 'commitToDOM');
    assert.equal(store[method]().ok, true);
    assert.deepEqual(store.getModel().toJSON(), { ...before, combatSession: { ...before.combatSession, status: to } });
    for (const spy of [setter, dirty, dom]) assert.equal(spy.mock.callCount(), 1);
  });
}

for (const [from, method] of [
  ['paused', 'pauseCombatSession'], ['active', 'resumeCombatSession'],
  ['finished', 'pauseCombatSession'], ['finished', 'resumeCombatSession'], ['finished', 'finishCombatSession'],
  [null, 'pauseCombatSession'], [null, 'resumeCombatSession'], [null, 'finishCombatSession']
]) {
  test(`${method} from ${from} rejects with zero publication`, t => {
    const store = fixture(from);
    const before = structuredClone(store.getModel().toJSON());
    for (const name of ['setCombatSession', 'markDirty', 'commitToDOM']) {
      t.mock.method(store, name, () => assert.fail('rejection must not publish'));
    }
    assert.equal(store[method]().reason, 'invalid-transition');
    assert.deepEqual(store.getModel().toJSON(), before);
    assert.equal(store.isDirty(), false);
  });
}

for (const method of ['nextCombatTurn', 'previousCombatTurn']) {
  test(`${method} accepts pending initiative values only with successful aggregate progression`, t => {
    const store = fixture();
    const pending = structuredClone(store.getModel().initiative);
    pending.participants[0].total = 27;
    pending.participants[0].roll = 27;
    const dirty = t.mock.method(store, 'markDirty');
    const dom = t.mock.method(store, 'commitToDOM');
    assert.equal(store[method](pending).ok, true);
    assert.equal(store.getModel().initiative.participants[0].total, 27);
    assert.equal(dirty.mock.callCount(), 1);
    assert.equal(dom.mock.callCount(), 1);
    assert.equal(pending.activeParticipantId, 'b');
  });
  test(`${method} rejection does not publish pending initiative values`, t => {
    const store = fixture();
    store.getModel().combatSession.participants.push({ participantId: 'missing', ready: true, delayed: false });
    const before = structuredClone(store.getModel().toJSON());
    const pending = structuredClone(before.initiative);
    pending.participants[0].total = 99;
    for (const name of ['markDirty', 'commitToDOM']) t.mock.method(store, name, () => assert.fail('no partial change'));
    assert.equal(store[method](pending).reason, 'roster-mismatch');
    assert.deepEqual(store.getModel().toJSON(), before);
  });
}
