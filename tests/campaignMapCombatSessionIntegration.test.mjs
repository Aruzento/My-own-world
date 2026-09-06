import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatSessionModel } from '../js/combat/combatSessionModel.js';
import { pauseCombatSession, resumeCombatSession } from '../js/combat/combatSessionLifecycle.js';
import { CampaignMapInitiativeModel } from '../js/editor/campaignMapInitiativeModel.js';
import { CampaignMapModel } from '../js/editor/campaignMapModel.js';
import { CampaignMapStore } from '../js/editor/campaignMapStore.js';
import { serializeCampaignMapModelHTML } from '../js/editor/campaignMapDataSerializer.js';
import {
  startCombatSessionFromInitiative,
  resolveCombatSessionParticipant,
  reconcileCombatSessionRoster
} from '../js/editor/campaignMapCombatSessionIntegration.js';

const participant = (id, data = {}) => ({
  participantId: `token:${id}`,
  tokenId: id,
  pageId: `page-${id}`,
  name: `Participant ${id}`,
  sourceMode: 'original',
  roll: 11,
  modifier: 3,
  total: 14,
  isAlive: true,
  ...data
});

function initiative(ids = ['a', 'b'], active = ids.at(-1)) {
  return new CampaignMapInitiativeModel({
    participants: ids.map(id => participant(id)),
    activeParticipantId: active ? `token:${active}` : ''
  }).toJSON();
}

function session(status = 'active') {
  return new CombatSessionModel({
    sessionId: 'session-existing',
    status,
    round: 7,
    participants: [
      { participantId: 'token:a', ready: true, delayed: false },
      { participantId: 'token:b', ready: false, delayed: true }
    ]
  }).toJSON();
}

function createStore(combatSession = null, initiativeData = initiative()) {
  const stage = { dataset: {} };
  const map = {
    querySelector: selector => selector === '.campaign-map-stage' ? stage : null,
    querySelectorAll: () => []
  };
  const model = new CampaignMapModel({ initiative: initiativeData, combatSession });
  const store = new CampaignMapStore(map, model);
  store.commitToDOM();
  return { store, model, map, stage };
}

test('start consumes canonical initiative without rolling sorting selecting or rebuilding it', t => {
  for (const method of ['rollParticipant', 'rollAll', 'sortByInitiative', 'setActive', 'nextTurn', 'previousTurn']) {
    t.mock.method(CampaignMapInitiativeModel.prototype, method, () => {
      assert.fail(`start must not call ${method}`);
    });
  }
  const data = initiative();
  data.participants[0].total = 18;
  const { store, model, stage } = createStore(null, data);
  const original = model.initiative;
  const record = original.participants[0];
  const before = structuredClone(original);
  const domBefore = stage.dataset.initiativeState;
  const generateId = t.mock.fn(() => 'session-new');
  const result = store.startCombatSession({ generateId });

  assert.equal(result.ok, true);
  assert.equal(result.operation, 'start');
  assert.equal(generateId.mock.callCount(), 1);
  assert.deepEqual(model.combatSession, {
    kind: 'CombatSession', version: 1, sessionId: 'session-new', status: 'active', round: 1,
    participants: [
      { participantId: 'token:a', ready: false, delayed: false },
      { participantId: 'token:b', ready: false, delayed: false }
    ]
  });
  assert.equal(model.initiative, original);
  assert.equal(model.initiative.participants[0], record);
  assert.deepEqual(model.initiative, before);
  assert.equal(stage.dataset.initiativeState, domBefore);
  assert.equal(store.isDirty(), true);
});

test('start planning is pure and reuses lifecycle transition and identity rules', () => {
  for (const status of ['active', 'paused']) {
    const { model } = createStore(session(status));
    const before = structuredClone(model.toJSON());
    const result = startCombatSessionFromInitiative(model, {
      generateId: () => assert.fail('invalid transition must not generate identity')
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid-transition');
    assert.deepEqual(model.toJSON(), before);
  }
  const { model } = createStore(session('finished'));
  const before = structuredClone(model.toJSON());
  const result = startCombatSessionFromInitiative(model, { generateId: () => 'session-restart' });
  assert.equal(result.ok, true);
  assert.equal(result.session.sessionId, 'session-restart');
  assert.equal(result.session.round, 1);
  assert.deepEqual(model.toJSON(), before);
});

test('empty initiative and unresolved non-empty canonical active id reject before mutation', () => {
  for (const [data, reason] of [
    [initiative([], ''), 'empty-roster'],
    [initiative(['a', 'b'], 'missing'), 'active-participant-not-found'],
    [initiative(['a', 'a'], 'a'), 'invalid-participant']
  ]) {
    const { store, model, stage } = createStore(null, data);
    const before = structuredClone(model.toJSON());
    const domBefore = structuredClone(stage.dataset);
    const result = store.startCombatSession({
      generateId: () => assert.fail('invalid roster must not generate identity')
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
    assert.deepEqual(model.toJSON(), before);
    assert.deepEqual(stage.dataset, domBefore);
    assert.equal(store.isDirty(), false);
  }
});

test('missing raw active id follows only the canonical initiative normalization', () => {
  const { store, model } = createStore(null, { participants: [participant('a'), participant('b')] });
  assert.equal(model.initiative.activeParticipantId, 'token:a');
  const before = structuredClone(model.initiative);
  assert.equal(store.startCombatSession({ generateId: () => 'canonical-default' }).ok, true);
  assert.deepEqual(model.initiative, before);
});

test('current participant is derived on every read and returned details are detached', () => {
  const { model } = createStore(session());
  const before = structuredClone(model.combatSession);
  const result = resolveCombatSessionParticipant(model);
  assert.equal(result.ok, true);
  assert.equal(result.participantId, 'token:b');
  assert.deepEqual(result.initiativeParticipant, model.initiative.participants[1]);
  result.initiativeParticipant.name = 'not live';
  assert.notEqual(model.initiative.participants[1].name, 'not live');
  const current = new CampaignMapInitiativeModel(model.initiative);
  current.setActive('token:a');
  model.setInitiative(current.toJSON());
  assert.equal(resolveCombatSessionParticipant(model).participantId, 'token:a');
  assert.deepEqual(model.combatSession, before);
  assert.equal(Object.hasOwn(model.combatSession, 'activeParticipantId'), false);
});

test('read mismatch never repairs initiative or Combat membership in any session state', () => {
  for (const status of ['active', 'paused', 'finished']) {
    for (const [data, reason] of [
      [initiative(['a', 'b', 'c'], 'c'), 'active-participant-outside-session'],
      [initiative(['a'], 'missing'), 'active-participant-not-found']
    ]) {
      const { model, store, stage } = createStore(session(status), data);
      const before = structuredClone(model.toJSON());
      const domBefore = structuredClone(stage.dataset);
      const result = resolveCombatSessionParticipant(model);
      assert.equal(result.ok, false);
      assert.equal(result.reason, reason);
      assert.equal(result.participantId, data.activeParticipantId);
      assert.deepEqual(model.toJSON(), before);
      assert.deepEqual(stage.dataset, domBefore);
      assert.equal(store.isDirty(), false);
    }
  }
});

test('non-explicit missing non-current member survives reads and hydration in every state', () => {
  for (const status of ['active', 'paused', 'finished']) {
    const { store, map, model } = createStore(session(status), initiative(['a']));
    const before = structuredClone(model.combatSession);
    assert.equal(resolveCombatSessionParticipant(model).participantId, 'token:a');
    store.refreshFromDOM(map);
    assert.equal(resolveCombatSessionParticipant(store.getModel()).ok, true);
    assert.deepEqual(store.getModel().combatSession, before);
    assert.equal(store.isDirty(), false);
  }
});

test('explicit active roster edit retains flags adds defaults and removes only intentional omissions', t => {
  const { store, model, map } = createStore(session());
  const next = initiative(['b', 'c'], 'b');
  const before = structuredClone(model.toJSON());
  const planned = reconcileCombatSessionRoster(model, next);
  assert.equal(planned.ok, true);
  assert.equal(planned.membershipChanged, true);
  assert.deepEqual(model.toJSON(), before);
  const mark = t.mock.method(store, 'markDirty');
  const commit = t.mock.method(store, 'commitToDOM');
  const result = store.setInitiativeRoster(next);
  assert.equal(result.ok, true);
  assert.equal(mark.mock.callCount(), 1);
  assert.equal(commit.mock.callCount(), 1);
  assert.deepEqual(model.combatSession, {
    ...before.combatSession,
    participants: [
      { participantId: 'token:b', ready: false, delayed: true },
      { participantId: 'token:c', ready: false, delayed: false }
    ]
  });
  assert.deepEqual(model.initiative, next);
  assert.deepEqual(CampaignMapModel.fromElement(map).combatSession, model.combatSession);
  assert.deepEqual(CampaignMapModel.fromElement(map).initiative, next);
  next.participants[0].total = 999;
  result.session.participants[0].delayed = false;
  assert.equal(model.initiative.participants[0].total, 14);
  assert.equal(model.combatSession.participants[0].delayed, true);
});

test('initiative reorder and manual values do not rewrite Combat membership representation', () => {
  const currentSession = session();
  currentSession.participants.push({ participantId: 'token:c', ready: true, delayed: true });
  const { store, model } = createStore(currentSession, initiative(['a', 'b', 'c']));
  const original = model.combatSession;
  const before = structuredClone(original);
  const next = initiative(['c', 'a', 'b'], 'b');
  next.participants[0].total = 42;
  const result = store.setInitiativeRoster(next);
  assert.equal(result.ok, true);
  assert.equal(result.membershipChanged, false);
  assert.equal(model.combatSession, original);
  assert.deepEqual(model.combatSession, before);
  assert.deepEqual(model.initiative, next);
});

test('retained member representation stays stable even when membership and initiative order both change', () => {
  const current = session();
  current.participants.push({ participantId: 'token:c', ready: true, delayed: true });
  const { store, model } = createStore(current, initiative(['a', 'b', 'c']));
  assert.equal(store.setInitiativeRoster(initiative(['c', 'd', 'b'])).ok, true);
  assert.deepEqual(model.combatSession.participants, [
    current.participants[1], current.participants[2],
    { participantId: 'token:d', ready: false, delayed: false }
  ]);
});

test('paused and finished explicit roster edits reject before changing either aggregate field or DOM', t => {
  for (const status of ['paused', 'finished']) {
    for (const next of [initiative(['b', 'c']), initiative(['b', 'a']), initiative([])]) {
      const { store, model, stage } = createStore(session(status));
      const before = structuredClone(model.toJSON());
      const domBefore = structuredClone(stage.dataset);
      const commit = t.mock.method(store, 'commitToDOM');
      const result = store.setInitiativeRoster(next);
      assert.equal(result.ok, false);
      assert.equal(result.reason, 'roster-edit-not-allowed');
      assert.equal(result.status, status);
      assert.deepEqual(model.toJSON(), before);
      assert.deepEqual(stage.dataset, domBefore);
      assert.equal(store.isDirty(), false);
      assert.equal(commit.mock.callCount(), 0);
    }
  }
});

test('paused editing requires a separate explicit resume and never pauses again implicitly', () => {
  const { store, model } = createStore(session('paused'));
  const next = initiative(['b', 'c']);
  assert.equal(store.setInitiativeRoster(next).ok, false);
  store.setCombatSession(resumeCombatSession(model.combatSession).session);
  assert.equal(store.setInitiativeRoster(next).ok, true);
  assert.equal(model.combatSession.status, 'active');
  assert.equal(model.combatSession.round, 7);
  store.setCombatSession(pauseCombatSession(model.combatSession).session);
  assert.equal(model.combatSession.status, 'paused');
});

test('inactive map has no Combat roster to reconcile and reads never auto-start it', () => {
  for (const current of [null, { sessionId: 'inactive', status: 'inactive' }]) {
    const { store, model } = createStore(current);
    const before = structuredClone(model.toJSON());
    assert.equal(resolveCombatSessionParticipant(model).reason, 'no-session');
    assert.equal(store.setInitiativeRoster(initiative(['c'])).reason, 'no-session');
    assert.deepEqual(model.toJSON(), before);
    assert.equal(store.isDirty(), false);
  }
});

test('explicit empty roster is intentional removal and never changes lifecycle or round', () => {
  const { store, model } = createStore(session());
  assert.equal(store.setInitiativeRoster(initiative([])).ok, true);
  assert.deepEqual(model.combatSession, { ...session(), participants: [] });
  assert.deepEqual(model.initiative, initiative([]));
  assert.equal(resolveCombatSessionParticipant(model).ok, false);
});

test('invalid replacement identity or unresolved active reference cannot partially publish an edit', () => {
  for (const data of [initiative(['b', 'b']), initiative(['b', 'c'], 'missing')]) {
    const { store, model, stage } = createStore(session());
    const before = structuredClone(model.toJSON());
    const domBefore = structuredClone(stage.dataset);
    assert.equal(store.setInitiativeRoster(data).ok, false);
    assert.deepEqual(model.toJSON(), before);
    assert.deepEqual(stage.dataset, domBefore);
    assert.equal(store.isDirty(), false);
  }
});

test('missing or malformed explicit edit payload is not treated as intentional roster clearing', () => {
  for (const data of [undefined, null, {}, { participants: null }, { participants: 'a' }]) {
    const { store, model, stage } = createStore(session());
    const before = structuredClone(model.toJSON());
    const domBefore = structuredClone(stage.dataset);
    const result = store.setInitiativeRoster(data);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid-roster-edit');
    assert.deepEqual(model.toJSON(), before);
    assert.deepEqual(stage.dataset, domBefore);
    assert.equal(store.isDirty(), false);
  }
});

test('serialization keeps initiative current state separate from Combat session fields', () => {
  const { store, model } = createStore();
  store.startCombatSession({ generateId: () => 'session-serialized' });
  const html = serializeCampaignMapModelHTML({ title: 'Integration Map', model });
  const readAttribute = name => html.match(new RegExp(`${name}="([^"]+)"`))[1];
  const encodedInitiative = readAttribute('data-initiative-state');
  const encodedCombat = readAttribute('data-combat-session-state');
  const stage = { dataset: { initiativeState: encodedInitiative, combatSessionState: encodedCombat } };
  const reloaded = CampaignMapModel.fromElement({
    querySelector: selector => selector === '.campaign-map-stage' ? stage : null,
    querySelectorAll: () => []
  });
  assert.deepEqual(reloaded.initiative, model.initiative);
  assert.deepEqual(reloaded.combatSession, model.combatSession);
  assert.equal(resolveCombatSessionParticipant(reloaded).participantId, 'token:b');
  assert.deepEqual(Object.keys(reloaded.combatSession).sort(), [
    'kind', 'participants', 'round', 'sessionId', 'status', 'version'
  ]);
  for (const member of reloaded.combatSession.participants) {
    assert.deepEqual(Object.keys(member).sort(), ['delayed', 'participantId', 'ready']);
  }
});
