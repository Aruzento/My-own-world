import { createTransaction, appendTransactionEvent, completeTransaction } from './transactionModel.js';
import { createTypedEvent } from './eventTypes.js';
import { createTransactionRecord, readTransactionRecords } from './eventStore.js';

export function createCombatAttackTransaction(resolution, { transactionId, createId = () => crypto.randomUUID(),
  now = () => new Date().toISOString() } = {}) {
  const r = resolution;
  let transaction = createTransaction({ transactionId, intentType: 'combat-attack', label: r.definition.label,
    source: 'combat-action', reason: r.definition.label, createdAt: now() });
  const add = (type, payload) => {
    const event = createTypedEvent({ eventId: createId(), transactionId, type, createdAt: now(),
      order: transaction.events.length + 1, payloadVersion: 1, payload });
    transaction = appendTransactionEvent(transaction, event);
    return event.eventId;
  };
  const context = { source: 'combat-action', actorId: r.actor.participantId, actorPageId: r.actor.pageId,
    targetId: r.target.participantId, targetPageId: r.target.pageId, mapPageId: r.mapPageId,
    tokenId: r.actor.tokenId, actionId: r.actionId, label: r.definition.label,
    ...(r.definition.source.ruleId ? { ruleId: r.definition.source.ruleId } : {}) };
  const attackRollEventId = add('roll.performed', { roll: r.attackRoll, context });
  const components = r.damageComponents.map(component => ({ componentId: component.componentId,
    damageType: component.damageType, rollEventId: add('roll.performed', { roll: component.roll, context }), amount: component.amount }));
  const plan = r.health?.mutationPlan;
  const resourceEventIds = ['hpTemp', 'hpCurrent'].flatMap(field => {
    const change = plan?.changedFields.find(item => item.field === field);
    return change ? [add('resource.changed', { resource: { kind: 'page-property', id: `${r.target.pageId}:${field}`, label: field },
      before: change.before, after: change.after, delta: change.after - change.before, unit: 'HP', reason: r.definition.label })] : [];
  });
  add('action.resolved', { actionId: r.actionId, mapPageId: r.mapPageId, sessionId: r.sessionId, round: r.round,
    actor: r.actor, target: r.target, definition: r.definition, hitPolicy: r.policy.hitPolicy, defense: r.defense,
    outcome: r.outcome, attackRollEventId, components, resourceEventIds,
    healthGuard: plan ? { hpMax: plan.guards.hpMax,
      unchangedFields: plan.guards.unchangedFields.filter(item => item.field !== 'hpMax') } : null });
  transaction = completeTransaction(transaction, { completedAt: now() });
  createTransactionRecord(transaction);
  return transaction;
}

// Один диагностический readback, без повторного append и без восстановления HP из истории.
export async function inspectCombatAttackAudit(transaction, storageAdapter) {
  try {
    const snapshot = await readTransactionRecords({ storageAdapter });
    const matches = snapshot.transactions.filter(item => item.transactionId === transaction.transactionId);
    if (!snapshot.invalidRecordCount && matches.length === 1 && JSON.stringify(createTransactionRecord(matches[0])) === JSON.stringify(createTransactionRecord(transaction))) {
      return { status: 'exact-transaction-found' };
    }
    return { status: matches.length || snapshot.invalidRecordCount ? 'corrupt-or-inconsistent' : 'absent',
      invalidRecordCount: snapshot.invalidRecordCount };
  } catch (error) {
    return { status: 'unreadable', message: String(error.message || error) };
  }
}
