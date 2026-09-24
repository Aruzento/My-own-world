import assert from 'node:assert/strict';
import test from 'node:test';
import { rollDice } from '../js/dice/diceEngine.js';
import { createCombatAttackTransaction, inspectCombatAttackAudit } from '../js/events/combatActionEventLog.js';
import { createTransactionRecord, appendTransactionRecord, readTransactionRecords, EVENT_TRANSACTION_LOG_PATH } from '../js/events/eventStore.js';
import { validateTypedEvent } from '../js/events/eventTypes.js';
import { classifyTransactionReversibility } from '../js/events/transactionReversal.js';
import { createCharacterModel, applyCharacterHealthChange } from '../js/character/characterModel.js';
import { createMemoryWorkspaceAdapter } from './fixtures/dataSafetyFixtures.mjs';
import { classifyCombatAttackReversal, createCombatAttackReversalTransaction } from '../js/events/combatAttackReversal.js';

const now = () => '2026-09-22T10:00:00.000Z';
const reversalInput = { reversalTransactionId: 'undo-1', reversalEventId: 'inverse-1', reversalMetadataEventId: 'metadata-1',
  createdAt: now(), eventCreatedAt: now(), completedAt: now(), source: 'test', reason: 'undo', order: 0 };
const clone = value => JSON.parse(JSON.stringify(value));
function candidate({ temp = 2, damage = 5, hit = true } = {}) {
  const roll = value => rollDice({ formula: String(value), mode: 'normal', criticalPolicy: 'none' });
  const before = { hpCurrent: 10, hpMax: 10, hpTemp: temp };
  const changed = applyCharacterHealthChange(createCharacterModel({ health: { current: 10, max: 10, temp } }), { delta: -damage });
  const after = { hpCurrent: changed.health.current, hpMax: 10, hpTemp: changed.health.temp };
  const changedFields = ['hpTemp', 'hpCurrent'].filter(f => before[f] !== after[f]).map(field => ({ field, before: before[field], after: after[field] }));
  const resolution = { actionId: 'action-1', mapPageId: 'map-1', sessionId: 'session-1', round: 2,
    actor: { participantId: 'actor-participant', tokenId: 'actor-token', pageId: 'actor-page' },
    target: { participantId: 'target-participant', tokenId: 'target-token', pageId: 'target-page' },
    definition: { definitionId: 'shortbow', label: 'Shortbow', source: { kind: 'manual' } },
    policy: { hitPolicy: 'ac-total-v1', criticalPolicy: 'none' }, defense: { kind: 'ac', value: 12 },
    attackRoll: rollDice({ formula: 'd20 + 4', mode: 'normal', criticalPolicy: 'none' }, { randomInt: () => hit ? 10 : 3 }), outcome: hit ? 'hit' : 'miss',
    damageComponents: hit ? [{ componentId: 'damage-1', damageType: 'piercing', roll: roll(damage), amount: damage }] : [],
    health: hit ? { mutationPlan: { changedFields, guards: { hpMax: 10,
      unchangedFields: ['hpTemp', 'hpCurrent'].filter(f => before[f] === after[f]).map(field => ({ field, value: before[field] })) } } } : null };
  let id = 0;
  return createCombatAttackTransaction(resolution, { transactionId: 'transaction-1', createId: () => `event-${++id}`, now });
}

for (const config of [{ temp: 0 }, { temp: 2 }, { temp: 8 }]) {
  test(`reversal reconstructs complete health from original resource facts and guards ${JSON.stringify(config)}`, async () => {
    const original = candidate(config);
    const before = JSON.stringify(original);
    const evidence = classifyCombatAttackReversal(original);
    assert.deepEqual(evidence.before, { hpMax: 10, hpCurrent: 10, hpTemp: config.temp });
    const inverse = createCombatAttackReversalTransaction(original, evidence, reversalInput);
    assert.equal(JSON.stringify(original), before);
    assert.equal(Object.isFrozen(inverse.events.at(-1).payload), true);
    assert.equal(classifyTransactionReversibility(original, [original, inverse]).reason, 'already-reversed');
    assert.equal(classifyTransactionReversibility(inverse).reversible, false);
    for (const [index, resource] of evidence.resources.entries()) {
      assert.deepEqual(inverse.events[index].payload.resource, resource.payload.resource);
      assert.equal(inverse.events[index].payload.before, resource.payload.after);
      assert.equal(inverse.events[index].payload.after, resource.payload.before);
      assert.equal(inverse.events[index].reversesEventId, resource.eventId);
    }
    const adapter = createMemoryWorkspaceAdapter();
    await appendTransactionRecord(original, { storageAdapter: adapter });
    await appendTransactionRecord(inverse, { storageAdapter: adapter });
    assert.deepEqual((await readTransactionRecords({ storageAdapter: adapter, strict: true })).transactions, [original, inverse]);
  });
}

const reversalMutations = {
  'wrong original transaction': tx => { tx.reversesTransactionId = 'foreign'; },
  'wrong reversal metadata': tx => { tx.events.at(-1).payload.reversalTransactionId = 'foreign'; },
  'duplicate reversed ids': tx => { tx.events.at(-1).payload.reversedEventIds[1] = tx.events.at(-1).payload.reversedEventIds[0]; },
  'missing reversed id': tx => { tx.events.at(-1).payload.reversedEventIds.pop(); },
  'foreign inverse link': tx => { tx.events[0].reversesEventId = 'foreign'; },
  'missing inverse link': tx => { delete tx.events[0].reversesEventId; },
  'wrong inverse transaction': tx => { tx.events[0].transactionId = 'foreign'; },
  'non-strict order': tx => { tx.events[1].order = tx.events[0].order; },
  'duplicate resource': tx => { tx.events[1].payload.resource = clone(tx.events[0].payload.resource); },
  'missing metadata': tx => { tx.events.pop(); },
  'extra metadata': tx => { tx.events.push({ ...clone(tx.events.at(-1)), eventId: 'extra', order: 4 }); },
  'extra roll': tx => { tx.events.unshift({ ...clone(candidate().events[0]), transactionId: tx.transactionId }); },
  'incorrect inverse delta': tx => { tx.events[0].payload.delta = 100; }
};
for (const [name, mutate] of Object.entries(reversalMutations)) {
  test(`reversal relations reject ${name} during candidate validation and durable read`, async () => {
    const original = candidate();
    const inverse = createCombatAttackReversalTransaction(original, classifyCombatAttackReversal(original), reversalInput);
    const bad = clone(inverse); mutate(bad);
    assert.throws(() => createTransactionRecord(bad));
    const { events, ...transaction } = bad;
    const adapter = createMemoryWorkspaceAdapter();
    await adapter.writeText(EVENT_TRANSACTION_LOG_PATH, JSON.stringify({ ...createTransactionRecord(inverse), transaction, events }) + '\n');
    const read = await readTransactionRecords({ storageAdapter: adapter });
    assert.equal(read.invalidRecordCount, 1);
    assert.equal(read.transactions.length, 0);
  });
}

for (const config of [{ temp: 2 }, { temp: 0 }, { damage: 0 }, { hit: false }]) {
  test(`attack event assembly, durable roundtrip and Undo eligibility ${JSON.stringify(config)}`, async () => {
    const transaction = candidate(config);
    assert.equal(Object.isFrozen(transaction.events.at(-1).payload), true);
    assert.equal(classifyTransactionReversibility(transaction).reason, config.hit === false ? 'combat-attack-miss'
      : config.damage === 0 ? 'combat-attack-no-health-change' : 'combat-attack-health-change');
    const adapter = createMemoryWorkspaceAdapter();
    await appendTransactionRecord(transaction, { storageAdapter: adapter });
    const snapshot = await readTransactionRecords({ storageAdapter: adapter });
    assert.deepEqual(snapshot.transactions, [transaction]);
    assert.deepEqual(await inspectCombatAttackAudit(transaction, adapter), { status: 'exact-transaction-found' });
    assert.equal(JSON.stringify(transaction).includes('nextContent'), false);
    assert.equal(transaction.events.filter(e => e.type === 'resource.changed').length,
      config.hit === false || config.damage === 0 ? 0 : config.temp === 0 ? 1 : 2);
  });
}

const mutations = {
  'unknown action payload key': tx => { tx.events.at(-1).payload.data = {}; },
  'unsupported payload version': tx => { tx.events.at(-1).payloadVersion = 2; },
  'duplicate event link': tx => { tx.events.at(-1).payload.components[0].rollEventId = tx.events[0].eventId; },
  'duplicate resource link': tx => { tx.events.at(-1).payload.resourceEventIds[1] = tx.events.at(-1).payload.resourceEventIds[0]; },
  'damage linked to missing roll': tx => { tx.events.at(-1).payload.components[0].rollEventId = 'missing'; },
  'damage linked to resource': tx => { tx.events.at(-1).payload.components[0].rollEventId = tx.events[2].eventId; },
  'missing linked event': tx => { tx.events.at(-1).payload.attackRollEventId = 'missing'; },
  'wrong event type': tx => { tx.events.at(-1).payload.attackRollEventId = tx.events[2].eventId; },
  'wrong transaction id': tx => { tx.events[0].transactionId = 'other'; },
  'incorrect outcome': tx => { tx.events[0].payload.roll.total = 1; },
  'component amount mismatch': tx => { tx.events.at(-1).payload.components[0].amount = 9; },
  'negative damage': tx => { tx.events.at(-1).payload.components[0].amount = -5; },
  'extra component': tx => { tx.events.at(-1).payload.components.push(clone(tx.events.at(-1).payload.components[0])); },
  'foreign target': tx => { tx.events.at(-1).payload.target.pageId = 'other'; },
  'same actor and target': tx => { tx.events.at(-1).payload.target = clone(tx.events.at(-1).payload.actor); },
  'policy mismatch': tx => { tx.events.at(-1).payload.hitPolicy = 'natural-20'; },
  'wrong resource page': tx => { tx.events[2].payload.resource.id = 'other:hpTemp'; },
  'wrong resource delta': tx => { tx.events[2].payload.delta = -1; },
  'resource order': tx => { [tx.events[2], tx.events[3]] = [tx.events[3], tx.events[2]]; },
  'missing resource event': tx => { tx.events.splice(2, 1); },
  'unexplained extra event': tx => { tx.events.push({ ...clone(tx.events[0]), eventId: 'extra', order: 6 }); },
  'health math mismatch': tx => { tx.events[3].payload.after = 8; tx.events[3].payload.delta = -2; },
  'changed hpMax': tx => { tx.events[2].payload.resource.id = 'target-page:hpMax'; },
  'missing health guard': tx => { tx.events.at(-1).payload.healthGuard = null; },
  'invalid hpMax': tx => { tx.events.at(-1).payload.healthGuard.hpMax = 0; },
  'arbitrary guard bag': tx => { tx.events.at(-1).payload.healthGuard.snapshot = '<html>'; },
  'duplicate health coverage': tx => { tx.events.at(-1).payload.healthGuard.unchangedFields.push({ field: 'hpTemp', value: 2 }); }
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`attack candidate rejects ${name} before durable append`, async () => {
    const transaction = clone(candidate());
    mutate(transaction);
    assert.throws(() => createTransactionRecord(transaction));
    assert.equal(classifyTransactionReversibility(transaction).reversible, false);
    const adapter = createMemoryWorkspaceAdapter();
    let writes = 0;
    adapter.writeText = async () => { writes++; };
    await assert.rejects(appendTransactionRecord(transaction, { storageAdapter: adapter }));
    assert.equal(writes, 0);
  });
}

test('action payload validation returns existing typed validation error', () => {
  const event = clone(candidate().events.at(-1));
  event.payload.healthGuard = {};
  const validation = validateTypedEvent(event);
  assert.equal(validation.ok, false);
  assert.equal(validation.error.code, 'EVENT_TYPE_INVALID_PAYLOAD');
});

test('cross-event validation rejects tampered history on read without rewriting the log', async () => {
  const record = clone(createTransactionRecord(candidate()));
  record.events.at(-1).payload.components[0].amount = 9;
  const adapter = createMemoryWorkspaceAdapter();
  const raw = JSON.stringify(record) + '\n';
  await adapter.writeText(EVENT_TRANSACTION_LOG_PATH, raw);
  const snapshot = await readTransactionRecords({ storageAdapter: adapter });
  assert.equal(snapshot.invalidRecordCount, 1);
  assert.equal(snapshot.transactions.length, 0);
  assert.equal(await adapter.readText(EVENT_TRANSACTION_LOG_PATH), raw);
});
