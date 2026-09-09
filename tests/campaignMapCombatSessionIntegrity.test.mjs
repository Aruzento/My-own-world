import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CombatSessionModel,
  COMBAT_SESSION_INTEGRITY_STATUSES as STATUS,
  COMBAT_SESSION_REFERENCE_TYPES as REFERENCE
} from '../js/combat/combatSessionModel.js';
import { CampaignMapModel } from '../js/editor/campaignMapModel.js';
import { CampaignMapStore } from '../js/editor/campaignMapStore.js';
import {
  CampaignMapInitiativeModel,
  syncInitiativeParticipantsWithTokens
} from '../js/editor/campaignMapInitiativeModel.js';
import { serializeCampaignMapModelHTML } from '../js/editor/campaignMapDataSerializer.js';
import {
  deriveCombatSessionIntegrity,
  advanceCombatTurn,
  retreatCombatTurn
} from '../js/editor/campaignMapCombatSessionIntegration.js';
import { setPages } from '../js/stateActions.js';
import {
  getPageById, getPageIndex, getTreeIndex, notifyPageUpdated
} from '../js/repository/pageRepository.js';

function fixture({ status = 'active', ids = ['a', 'b'] } = {}) {
  const model = new CampaignMapModel({
    tokens: ids.map(id => ({ tokenId: id, pageId: `page-${id}`, name: 'Same name' })),
    initiative: {
      activeParticipantId: `token:${ids.at(-1)}`,
      participants: ids.map((id, index) => ({
        participantId: `token:${id}`, tokenId: id, pageId: `page-${id}`,
        name: 'Same name', sourceMode: 'original', roll: 12, modifier: index,
        total: 12 + index, isAlive: index === 0
      }))
    },
    combatSession: status === null ? null : {
      sessionId: 'session-integrity', status, round: 7,
      participants: ids.map((id, index) => ({
        participantId: `token:${id}`, ready: index === 0, delayed: index === 1
      }))
    }
  });
  const pages = new Map(ids.map(id => [
    `page-${id}`, { id: `page-${id}`, title: 'Same name', content: '<p>Original</p>' }
  ]));
  const resolvePage = id => pages.get(id) ?? null;
  return { model, pages, resolvePage };
}

const issue = (id, referenceType) => ({ participantId: `token:${id}`, referenceType });
const derive = ({ model, resolvePage }) => deriveCombatSessionIntegrity(model, { resolvePage });

for (const combatSession of [null, { status: 'inactive' }]) {
  test(`no session (${combatSession?.status ?? 'null'}) does not resolve or generate identity`, t => {
    const generateId = t.mock.method(globalThis.crypto, 'randomUUID', () => assert.fail('no identity creation'));
    const model = { combatSession };
    const before = structuredClone(model);
    assert.deepEqual(deriveCombatSessionIntegrity(model), { ok: false, reason: 'no-session' });
    assert.deepEqual(model, before);
    assert.equal(generateId.mock.callCount(), 0);
  });
}

test('valid diagnostics expose detached exact reference context using existing integrity vocabulary', () => {
  const data = fixture();
  const result = derive(data);
  assert.deepEqual(result, {
    ok: true,
    integrity: { status: STATUS.VALID, issues: [] },
    references: [
      { participantId: 'token:a', tokenId: 'a', pageId: 'page-a' },
      { participantId: 'token:b', tokenId: 'b', pageId: 'page-b' }
    ]
  });
  assert.deepEqual(derive(data), result);
});

test('missing initiative participant is retained with no guessed subordinate failures', t => {
  const data = fixture();
  data.model.initiative.participants.pop();
  const before = structuredClone(data.model.toJSON());
  const getToken = t.mock.method(data.model, 'getToken');
  const resolvePage = t.mock.fn(data.resolvePage);
  const result = deriveCombatSessionIntegrity(data.model, { resolvePage });
  assert.deepEqual(result.integrity, {
    status: STATUS.UNRESOLVED, issues: [issue('b', REFERENCE.INITIATIVE_PARTICIPANT)]
  });
  assert.deepEqual(result.references[1], { participantId: 'token:b' });
  assert.deepEqual(getToken.mock.calls.map(call => call.arguments), [['a']]);
  assert.deepEqual(resolvePage.mock.calls.map(call => call.arguments), [['page-a']]);
  assert.deepEqual(data.model.toJSON(), before);
  assert.equal(data.model.initiative.activeParticipantId, 'token:b');
});

for (const missing of ['token', 'page', 'both']) {
  test(`missing ${missing} uses exact owners and keeps independent diagnostic layers`, t => {
    const data = fixture();
    if (missing !== 'page') data.model.removeToken('b');
    if (missing !== 'token') data.pages.delete('page-b');
    const before = structuredClone(data.model.toJSON());
    const getToken = t.mock.method(data.model, 'getToken');
    const resolvePage = t.mock.fn(data.resolvePage);
    const result = deriveCombatSessionIntegrity(data.model, { resolvePage });
    const types = missing === 'both' ? [REFERENCE.TOKEN, REFERENCE.PAGE] : [missing];
    assert.deepEqual(result.integrity, {
      status: STATUS.UNRESOLVED, issues: types.map(type => issue('b', type))
    });
    assert.deepEqual(result.references[1], { participantId: 'token:b', tokenId: 'b', pageId: 'page-b' });
    assert.deepEqual(getToken.mock.calls.map(call => call.arguments), [['a'], ['b']]);
    assert.deepEqual(resolvePage.mock.calls.map(call => call.arguments), [['page-a'], ['page-b']]);
    assert.deepEqual(data.model.toJSON(), before);
  });
}

test('issue order follows stored Combat membership then token and page, not initiative order', () => {
  const data = fixture();
  data.model.combatSession.participants.reverse();
  data.model.tokens = [];
  data.pages.clear();
  const result = derive(data);
  assert.deepEqual(result.integrity.issues, [
    issue('b', REFERENCE.TOKEN), issue('b', REFERENCE.PAGE),
    issue('a', REFERENCE.TOKEN), issue('a', REFERENCE.PAGE)
  ]);
  assert.deepEqual(derive(data), result);
});

for (const value of ['', undefined]) {
  test(`optional ${String(value)} token/page references need no resolver and produce no issue`, t => {
    const data = fixture();
    for (const participant of data.model.initiative.participants) {
      participant.tokenId = value;
      participant.pageId = value;
    }
    t.mock.method(data.model, 'getToken', () => assert.fail('no optional token lookup'));
    assert.deepEqual(deriveCombatSessionIntegrity(data.model).integrity, { status: STATUS.VALID, issues: [] });
  });
}

test('duplicate token names and page titles/aliases never replace missing exact identities', () => {
  const data = fixture();
  data.model.removeToken('b');
  data.pages.delete('page-b');
  data.model.addToken({ tokenId: 'replacement', name: 'Same name', pageId: 'replacement-page' });
  data.pages.set('replacement-page', { id: 'replacement-page', title: 'Same name', aliases: ['page-b'] });
  assert.deepEqual(derive(data).integrity.issues, [issue('b', REFERENCE.TOKEN), issue('b', REFERENCE.PAGE)]);
});

for (const status of ['active', 'paused', 'finished']) {
  test(`${status} integrity preserves all canonical state and never publishes to Store/DOM`, t => {
    for (const unresolved of [false, true]) {
      const data = fixture({ status });
      if (unresolved) {
        data.model.removeToken('b');
        data.pages.delete('page-b');
      }
      const stage = { dataset: {} };
      const map = { querySelector: selector => selector === '.campaign-map-stage' ? stage : null, querySelectorAll: () => [] };
      const store = new CampaignMapStore(map, data.model);
      store.commitToDOM();
      const before = structuredClone(data.model.toJSON());
      const pagesBefore = structuredClone(data.pages);
      const domBefore = structuredClone(stage.dataset);
      const originalSession = data.model.combatSession;
      const originalInitiative = data.model.initiative;
      const dirty = t.mock.method(store, 'markDirty', () => assert.fail('diagnostic cannot mark dirty'));
      const commit = t.mock.method(store, 'commitToDOM', () => assert.fail('diagnostic cannot publish'));
      for (const method of ['sortByInitiative', 'setActive', 'nextTurn', 'previousTurn', 'rollAll']) {
        t.mock.method(CampaignMapInitiativeModel.prototype, method, () => assert.fail(`diagnostic cannot ${method}`));
      }
      const result = store.getCombatSessionIntegrity({ resolvePage: data.resolvePage });
      assert.equal(result.integrity.status, unresolved ? STATUS.UNRESOLVED : STATUS.VALID);
      assert.equal(data.model.combatSession, originalSession);
      assert.equal(data.model.initiative, originalInitiative);
      assert.deepEqual(data.model.toJSON(), before);
      assert.deepEqual(data.pages, pagesBefore);
      assert.deepEqual(stage.dataset, domBefore);
      assert.equal(data.model.initiative.activeParticipantId, 'token:b');
      assert.equal(store.isDirty(), false);
      assert.equal(dirty.mock.callCount(), 0);
      assert.equal(commit.mock.callCount(), 0);
    }
  });
}

test('returned issues and reference context cannot mutate canonical models or later results', () => {
  const data = fixture();
  data.model.removeToken('a');
  const before = structuredClone(data.model.toJSON());
  const result = derive(data);
  const expected = structuredClone(result);
  result.integrity.issues[0].participantId = 'replacement';
  result.integrity.status = STATUS.VALID;
  result.references[0].tokenId = 'replacement';
  result.references.pop();
  assert.deepEqual(data.model.toJSON(), before);
  assert.deepEqual(derive(data), expected);
});

test('serialize, reload and recompute keeps unresolved membership but never stale diagnostics', () => {
  const data = fixture({ ids: ['a'] });
  data.model.removeToken('a');
  data.pages.clear();
  const result = derive(data);
  const session = new CombatSessionModel({ ...data.model.combatSession, integrity: result.integrity });
  assert.deepEqual(session.integrity, result.integrity);
  assert.equal(Object.hasOwn(session.toJSON(), 'integrity'), false);
  data.model.setCombatSession(session);
  assert.equal(Object.hasOwn(data.model.toJSON().combatSession, 'integrity'), false);

  const html = serializeCampaignMapModelHTML({ title: 'Integrity fixture', model: data.model });
  const attribute = name => {
    const match = html.match(new RegExp(`${name}="([^"]+)"`));
    assert.ok(match, name);
    return match[1];
  };
  const combatSessionState = attribute('data-combat-session-state');
  const persisted = JSON.parse(decodeURIComponent(combatSessionState));
  assert.deepEqual(persisted, session.toJSON());
  for (const record of [persisted, ...persisted.participants]) {
    for (const key of ['integrity', 'issues', 'references']) {
      assert.equal(Object.hasOwn(record, key), false);
    }
  }
  const stage = { dataset: { combatSessionState, initiativeState: attribute('data-initiative-state') } };
  const reloaded = CampaignMapModel.fromElement({
    querySelector: selector => selector === '.campaign-map-stage' ? stage : null,
    querySelectorAll: () => []
  });
  assert.deepEqual(reloaded.combatSession, data.model.combatSession);
  assert.deepEqual(reloaded.initiative, data.model.initiative);
  assert.deepEqual(new CombatSessionModel(reloaded.combatSession).integrity, { status: STATUS.UNCHECKED, issues: [] });
  assert.deepEqual(deriveCombatSessionIntegrity(reloaded, data), result);
  reloaded.addToken({ tokenId: 'a' });
  data.pages.set('page-a', { id: 'page-a' });
  assert.equal(deriveCombatSessionIntegrity(reloaded, data).integrity.status, STATUS.VALID);
  assert.deepEqual(reloaded.combatSession, persisted);
});

for (const referenceType of [REFERENCE.TOKEN, REFERENCE.PAGE]) {
  test(`current ${referenceType} removal and exact restoration recomputes without Combat mutation`, () => {
    const data = fixture();
    const sessionBefore = structuredClone(data.model.combatSession);
    assert.equal(derive(data).integrity.status, STATUS.VALID);
    if (referenceType === REFERENCE.TOKEN) data.model.removeToken('a');
    else data.pages.delete('page-a');
    assert.deepEqual(derive(data).integrity.issues, [issue('a', referenceType)]);
    if (referenceType === REFERENCE.TOKEN) data.model.addToken({ tokenId: 'a' });
    else data.pages.set('page-a', { id: 'page-a' });
    assert.equal(derive(data).integrity.status, STATUS.VALID);
    assert.deepEqual(data.model.combatSession, sessionBefore);
  });
}

test('canonical PageRepository getPageById is injectable and reflects reload/rename without index mutation', t => {
  const data = fixture();
  setPages([...data.pages.values()]);
  t.after(() => setPages([]));
  const pageIndex = getPageIndex();
  const treeIndex = getTreeIndex();
  for (const index of [pageIndex, treeIndex]) {
    t.mock.method(index, 'rebuild', () => assert.fail('lookup must not rebuild'));
    t.mock.method(index, 'updatePage', () => assert.fail('lookup must not publish'));
  }
  const before = structuredClone(getPageById('page-b'));
  assert.equal(deriveCombatSessionIntegrity(data.model, { resolvePage: getPageById }).integrity.status, STATUS.VALID);
  assert.deepEqual(getPageById('page-b'), before);
  t.mock.restoreAll();
  const renamed = { ...before, title: 'Renamed current page' };
  notifyPageUpdated(before, renamed);
  assert.equal(deriveCombatSessionIntegrity(data.model, { resolvePage: getPageById }).integrity.status, STATUS.VALID);
  assert.equal(getPageById('page-b'), renamed);
  setPages([getPageById('page-a')]);
  assert.deepEqual(deriveCombatSessionIntegrity(data.model, { resolvePage: getPageById }).integrity.issues, [issue('b', REFERENCE.PAGE)]);
});

test('unavailable or invalid synchronous page resolver is not reported as a missing page', () => {
  const data = fixture();
  assert.throws(() => deriveCombatSessionIntegrity(data.model), /resolvePage/);
  const failure = new Error('lookup unavailable');
  assert.throws(() => deriveCombatSessionIntegrity(data.model, { resolvePage: () => { throw failure; } }), error => error === failure);
  for (const value of [Promise.resolve(null), true, { id: 'wrong-id' }]) {
    assert.throws(() => deriveCombatSessionIntegrity(data.model, { resolvePage: () => value }), /resolvePage/);
  }
});

test('missing-token sync retains canonical initiative record and current participant', () => {
  const data = fixture();
  const before = structuredClone(data.model.initiative);
  const synced = syncInitiativeParticipantsWithTokens(data.model.initiative, []);
  assert.equal(synced.changed, false);
  assert.deepEqual(synced.initiative, before);
  assert.deepEqual(data.model.initiative, before);
});

test('diagnostics never authorize progression through an unsafe initiative identity mismatch', () => {
  const data = fixture();
  data.model.initiative.participants.shift();
  const before = structuredClone(data.model.toJSON());
  assert.deepEqual(derive(data).integrity.issues, [issue('a', REFERENCE.INITIATIVE_PARTICIPANT)]);
  for (const progress of [advanceCombatTurn, retreatCombatTurn]) {
    assert.equal(progress(data.model).reason, 'roster-mismatch');
  }
  assert.deepEqual(data.model.toJSON(), before);
});
