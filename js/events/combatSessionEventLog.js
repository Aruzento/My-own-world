import { appendTransactionRecord } from './eventStore.js';
import { createTypedEvent, EVENT_TYPES_V1 as TYPES } from './eventTypes.js';
import { createTransaction, appendTransactionEvent, completeTransaction } from './transactionModel.js';

// Detached canonical input only. Neither this adapter nor history owns live Combat state.
export function createCombatSessionTransaction(input, options = {}) {
  const { operation, before, after, participantId, mapPageId } = input;
  const previous = before.combatSession;
  const current = after.combatSession;
  const session = current || previous;
  if (!session) return null;
  const common = { sessionId: session.sessionId, ...(mapPageId ? { mapPageId } : {}) };
  const currentParticipantId = after.initiative.activeParticipantId || null;
  const ids = value => (value?.participants || []).map(member => member.participantId);
  const facts = [];
  const add = (type, payload) => facts.push({ type, payload: { ...common, ...payload } });

  if (['start', 'pause', 'resume', 'finish', 'prepare-next'].includes(operation)) {
    const beforeStatus = previous?.status || 'inactive';
    const afterStatus = current?.status || 'inactive';
    if (beforeStatus !== afterStatus) add(TYPES.COMBAT_SESSION_LIFECYCLE_CHANGED, {
      operation, beforeStatus, afterStatus, round: session.round, currentParticipantId, participantIds: ids(session)
    });
  } else if (previous?.status === 'active' && current?.status === 'active' && previous.sessionId === current.sessionId) {
    if (operation === 'roster') {
      const beforeParticipantIds = ids(previous);
      const afterParticipantIds = ids(current);
      const beforeSet = new Set(beforeParticipantIds);
      if (beforeParticipantIds.length !== afterParticipantIds.length || afterParticipantIds.some(id => !beforeSet.has(id))) {
        add(TYPES.COMBAT_ROSTER_CHANGED, { beforeParticipantIds, afterParticipantIds, currentParticipantId });
      }
    } else if (operation === 'flags') {
      const oldMember = previous.participants.find(member => member.participantId === participantId);
      const newMember = current.participants.find(member => member.participantId === participantId);
      if (oldMember && newMember && (oldMember.ready !== newMember.ready || oldMember.delayed !== newMember.delayed)) {
        const flags = member => ({ ready: member.ready, delayed: member.delayed });
        add(TYPES.COMBAT_PARTICIPANT_FLAGS_CHANGED, { participantId, before: flags(oldMember), after: flags(newMember) });
      }
    } else if (['next', 'previous', 'select'].includes(operation)) {
      const fromParticipantId = before.initiative.activeParticipantId;
      const wrapped = operation === 'next' && current.round === previous.round + 1;
      if (fromParticipantId !== currentParticipantId || wrapped) {
        add(TYPES.TURN_CHANGED, { round: current.round, fromParticipantId, toParticipantId: currentParticipantId, mode: operation });
        if (wrapped) add(TYPES.ROUND_ADVANCED, { fromRound: previous.round, toRound: current.round });
      }
    }
  }
  if (!facts.length) return null;
  const createId = options.createId || (() => globalThis.crypto.randomUUID());
  const createdAt = (options.now || (() => new Date().toISOString()))();
  const transactionId = createId();
  let transaction = createTransaction({ transactionId, intentType: `combat.${operation}`,
    createdAt, source: 'campaign-map-combat', reason: operation });
  for (const [index, fact] of facts.entries()) {
    transaction = appendTransactionEvent(transaction, createTypedEvent({ ...fact,
      eventId: createId(), transactionId, createdAt, order: index + 1 }));
  }
  return completeTransaction(transaction, { completedAt: createdAt });
}

export function isCombatStateSaveConfirmed(result) {
  return result?.writeStatus === 'saved' && !result.conflict && !result.blocked && !result.stale;
}

// Called only after the existing page save. Failure cannot undo an already durable map.
export async function logCombatSessionOperation(input, options = {}) {
  if (!isCombatStateSaveConfirmed(options.saveResult)) return { status: 'state-not-persisted' };
  let transaction;
  try {
    transaction = createCombatSessionTransaction(input, options);
    if (!transaction) return { status: 'not-applicable' };
    const appended = await appendTransactionRecord(transaction, { storageAdapter: options.storageAdapter });
    return { status: appended.status, transaction, path: appended.path };
  } catch (error) {
    return { status: 'state-persisted-event-not-written', transactionId: transaction?.transactionId || null,
      error: { code: error.code || 'COMBAT_AUDIT_FAILED' } };
  }
}
