import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignMapModel } from '../js/editor/campaignMapModel.js';
import { CampaignMapStore } from '../js/editor/campaignMapStore.js';
import { CampaignMapInitiativeModel } from '../js/editor/campaignMapInitiativeModel.js';
import { serializeCampaignMapModelHTML } from '../js/editor/campaignMapDataSerializer.js';
import { resumeCombatSession } from '../js/combat/combatSessionLifecycle.js';

function fixture(status = 'active') {
  const stage = { dataset: {} };
  const map = { querySelector: selector => selector === '.campaign-map-stage' ? stage : null, querySelectorAll: () => [] };
  const model = new CampaignMapModel({
    tokens: ['a', 'b', 'c'].map(tokenId => ({ tokenId, pageId: `page-${tokenId}` })),
    initiative: {
      activeParticipantId: 'b',
      participants: ['a', 'b', 'c'].map((participantId, index) => ({
        participantId, tokenId: participantId, pageId: `page-${participantId}`, name: 'Same name',
        roll: 12, modifier: index, total: 12 + index, isAlive: index !== 1
      }))
    },
    combatSession: status === null ? null : {
      sessionId: 'session-map-flags', status, round: 4,
      participants: ['a', 'b', 'c'].map(participantId => ({ participantId, ready: false, delayed: false }))
    }
  });
  const store = new CampaignMapStore(map, model);
  store.commitToDOM();
  const pages = new Map(['a', 'b', 'c'].map(id => [`page-${id}`, { id: `page-${id}` }]));
  return { store, model, stage, pages, resolvePage: pageId => pages.get(pageId) ?? null };
}

test('changed Store edit uses existing Combat setter with exactly one dirty mark and one DOM commit', t => {
  const { store, model, stage, pages } = fixture();
  const before = structuredClone(model.toJSON());
  const pagesBefore = structuredClone(pages);
  const initiative = model.initiative;
  const setter = t.mock.method(store, 'setCombatSession');
  const dirty = t.mock.method(store, 'markDirty');
  const commit = t.mock.method(store, 'commitToDOM');
  for (const method of ['setActive', 'nextTurn', 'previousTurn', 'sortByInitiative', 'rollAll']) {
    t.mock.method(CampaignMapInitiativeModel.prototype, method, () => assert.fail(`flag edit must not ${method}`));
  }
  t.mock.method(store, 'setInitiative', () => assert.fail('flags do not write initiative'));
  t.mock.method(store, 'getCombatSessionIntegrity', () => assert.fail('flags do not require integrity checks'));
  const result = store.setCombatParticipantFlags('b', { ready: true, delayed: true });
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(setter.mock.callCount(), 1);
  assert.equal(dirty.mock.callCount(), 1);
  assert.equal(commit.mock.callCount(), 1);
  assert.equal(store.isDirty(), true);
  assert.equal(model.initiative, initiative);
  const expected = structuredClone(before);
  expected.combatSession.participants[1] = { participantId: 'b', ready: true, delayed: true };
  assert.deepEqual(model.toJSON(), expected);
  assert.deepEqual(pages, pagesBefore);
  assert.deepEqual(JSON.parse(decodeURIComponent(stage.dataset.combatSessionState)), model.combatSession);
  assert.deepEqual(JSON.parse(decodeURIComponent(stage.dataset.initiativeState)), before.initiative);
  result.session.participants[1].ready = false;
  assert.equal(model.combatSession.participants[1].ready, true);
});

for (const initiallyDirty of [false, true]) {
  test(`idempotent Store edit publishes nothing and preserves existing dirty=${initiallyDirty}`, t => {
    const { store, model, stage } = fixture();
    store.setCombatParticipantFlags('b', { ready: true });
    if (!initiallyDirty) store.clearDirty();
    const session = model.combatSession;
    const before = structuredClone(model.toJSON());
    const dom = structuredClone(stage.dataset);
    for (const method of ['setCombatSession', 'markDirty', 'commitToDOM']) {
      t.mock.method(store, method, () => assert.fail(`no-op cannot ${method}`));
    }
    const result = store.setCombatParticipantFlags('b', { ready: true, delayed: false });
    assert.equal(result.ok, true);
    assert.equal(result.changed, false);
    assert.equal(model.combatSession, session);
    assert.deepEqual(model.toJSON(), before);
    assert.deepEqual(stage.dataset, dom);
    assert.equal(store.isDirty(), initiallyDirty);
  });
}

for (const status of ['paused', 'finished', 'inactive', null]) {
  test(`${status} Store marker edit rejects without publication`, t => {
    const { store, model, stage } = fixture(status);
    const before = structuredClone(model.toJSON());
    const dom = structuredClone(stage.dataset);
    for (const method of ['setCombatSession', 'markDirty', 'commitToDOM']) {
      t.mock.method(store, method, () => assert.fail(`rejected edit cannot ${method}`));
    }
    const result = store.setCombatParticipantFlags('a', { ready: true });
    assert.equal(result.ok, false);
    assert.equal(result.reason, status === null || status === 'inactive' ? 'no-session' : 'flags-edit-not-allowed');
    assert.deepEqual(model.toJSON(), before);
    assert.deepEqual(stage.dataset, dom);
    assert.equal(store.isDirty(), false);
  });
}

test('invalid Store patches and absent participants reject without partial publication', t => {
  const { store, model, stage } = fixture();
  const before = structuredClone(model.toJSON());
  const dom = structuredClone(stage.dataset);
  for (const method of ['setCombatSession', 'markDirty', 'commitToDOM']) {
    t.mock.method(store, method, () => assert.fail(`rejected edit cannot ${method}`));
  }
  for (const [id, patch, reason] of [
    ['missing', { ready: true }, 'participant-not-found'],
    ['a', {}, 'invalid-flags'],
    ['a', { ready: true, delayed: 'false' }, 'invalid-flags'],
    ['a', { ready: true, flags: {} }, 'invalid-flags']
  ]) {
    assert.equal(store.setCombatParticipantFlags(id, patch).reason, reason);
    assert.deepEqual(model.toJSON(), before);
    assert.deepEqual(stage.dataset, dom);
    assert.equal(store.isDirty(), false);
  }
});

test('Store edit after an explicit resume stays active without implicit re-pause', () => {
  const { store, model } = fixture('paused');
  assert.equal(store.setCombatParticipantFlags('a', { ready: true }).ok, false);
  store.setCombatSession(resumeCombatSession(model.combatSession).session);
  assert.equal(store.setCombatParticipantFlags('a', { ready: true }).ok, true);
  assert.equal(model.combatSession.status, 'active');
});

for (const layer of ['initiative-participant', 'token', 'page']) {
  test(`missing ${layer} does not block marker editing and exact restoration keeps it`, t => {
    const data = fixture();
    const original = structuredClone(data.model.initiative.participants[0]);
    if (layer === 'initiative-participant') data.model.initiative.participants.shift();
    if (layer === 'token') data.model.removeToken('a');
    if (layer === 'page') data.pages.delete('page-a');
    const initiativeBefore = structuredClone(data.model.initiative);
    const tokenLookup = t.mock.method(data.model, 'getToken', () => assert.fail('marker edit does not resolve tokens'));
    assert.equal(data.store.setCombatParticipantFlags('a', { ready: true }).ok, true);
    tokenLookup.mock.restore();
    assert.deepEqual(data.model.initiative, initiativeBefore);
    assert.deepEqual(data.store.getCombatSessionIntegrity(data).integrity.issues, [{ participantId: 'a', referenceType: layer }]);
    const session = structuredClone(data.model.combatSession);
    assert.equal(session.participants[0].ready, true);
    if (layer === 'initiative-participant') data.model.initiative.participants.unshift(original);
    if (layer === 'token') data.model.addToken({ tokenId: 'a' });
    if (layer === 'page') data.pages.set('page-a', { id: 'page-a' });
    assert.equal(data.store.getCombatSessionIntegrity(data).integrity.status, 'valid');
    assert.deepEqual(data.model.combatSession, session);
  });
}

test('next previous and forward wrap preserve mixed markers without skipping delayed participants', () => {
  const { store, model } = fixture();
  store.setCombatParticipantFlags('a', { ready: true });
  store.setCombatParticipantFlags('b', { ready: true, delayed: true });
  store.setCombatParticipantFlags('c', { delayed: true });
  const members = structuredClone(model.combatSession.participants);
  for (const [method, expectedId, expectedRound] of [
    ['nextCombatTurn', 'c', 4], ['previousCombatTurn', 'b', 4],
    ['nextCombatTurn', 'c', 4], ['nextCombatTurn', 'a', 5], ['previousCombatTurn', 'c', 5]
  ]) {
    assert.equal(store[method]().ok, true);
    assert.equal(model.initiative.activeParticipantId, expectedId);
    assert.equal(model.combatSession.round, expectedRound);
    assert.deepEqual(model.combatSession.participants, members);
  }
});

test('initiative selection sort manual roll/modifier/total and reorder-only preserve markers', () => {
  const { store, model } = fixture();
  store.setCombatParticipantFlags('a', { ready: true });
  store.setCombatParticipantFlags('b', { delayed: true });
  const before = structuredClone(model.combatSession);
  const edits = [
    initiative => initiative.setActive('c'),
    initiative => initiative.sortByInitiative(),
    initiative => initiative.rollParticipant('a', 19),
    initiative => { initiative.getParticipant('b').modifier = 9; },
    initiative => { initiative.getParticipant('b').total = 99; }
  ];
  for (const edit of edits) {
    const initiative = new CampaignMapInitiativeModel(model.initiative);
    edit(initiative);
    store.setInitiative(initiative.toJSON());
    assert.deepEqual(model.combatSession, before);
  }
  const reordered = structuredClone(model.initiative);
  reordered.participants.reverse();
  assert.equal(store.setInitiativeRoster(reordered).ok, true);
  assert.deepEqual(model.combatSession, before);
  for (const member of model.initiative.participants) {
    assert.equal(Object.hasOwn(member, 'ready'), false);
    assert.equal(Object.hasOwn(member, 'delayed'), false);
  }
});

test('explicit roster reconciliation retains markers removes only omitted members and defaults new ones', () => {
  const { store, model } = fixture();
  store.setCombatParticipantFlags('a', { ready: true });
  store.setCombatParticipantFlags('b', { delayed: true });
  const before = structuredClone(model.combatSession);
  assert.equal(store.setInitiativeRoster({
    participants: [model.initiative.participants[1], { participantId: 'new' }], activeParticipantId: 'b'
  }).ok, true);
  assert.deepEqual(model.combatSession, {
    ...before,
    participants: [
      { participantId: 'b', ready: false, delayed: true },
      { participantId: 'new', ready: false, delayed: false }
    ]
  });
});

test('marker edits serialize and reload through current map format while integrity remains runtime-only', () => {
  const data = fixture();
  data.store.setCombatParticipantFlags('a', { ready: true });
  data.store.setCombatParticipantFlags('b', { ready: true, delayed: true });
  data.model.tokens = [];
  data.pages.clear();
  const integrity = data.store.getCombatSessionIntegrity(data);
  assert.equal(integrity.integrity.status, 'unresolved');
  for (const key of ['flags', 'temporaryFlags', 'metadata', 'data', 'state', 'integrity']) {
    assert.equal(data.store.setCombatParticipantFlags('a', { ready: false, [key]: {} }).reason, 'invalid-flags');
  }
  const before = structuredClone(data.model.toJSON());
  const html = serializeCampaignMapModelHTML({ title: 'Flags fixture', model: data.model });
  const attribute = name => {
    const match = html.match(new RegExp(`${name}="([^"]+)"`));
    assert.ok(match, name);
    return match[1];
  };
  const stage = { dataset: {
    combatSessionState: attribute('data-combat-session-state'),
    initiativeState: attribute('data-initiative-state')
  } };
  const persisted = JSON.parse(decodeURIComponent(stage.dataset.combatSessionState));
  assert.deepEqual(persisted, before.combatSession);
  assert.deepEqual(Object.keys(persisted).sort(), ['kind', 'version', 'sessionId', 'status', 'round', 'participants'].sort());
  for (const member of persisted.participants) {
    assert.deepEqual(Object.keys(member).sort(), ['participantId', 'ready', 'delayed'].sort());
  }
  const reloaded = CampaignMapModel.fromElement({
    querySelector: selector => selector === '.campaign-map-stage' ? stage : null, querySelectorAll: () => []
  });
  assert.equal(reloaded.version, before.version);
  assert.equal(reloaded.combatSession.version, 1);
  assert.deepEqual(reloaded.combatSession, before.combatSession);
  assert.deepEqual(reloaded.initiative, before.initiative);
  const store = new CampaignMapStore(null, reloaded);
  assert.deepEqual(store.getCombatSessionIntegrity(data), integrity);
  assert.equal(reloaded.combatSession.participants[0].ready, true);
  assert.equal(Object.hasOwn(reloaded.combatSession, 'integrity'), false);
});
