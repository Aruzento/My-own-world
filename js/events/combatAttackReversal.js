import { getPageById } from '../repository/pageRepository.js';
import { serializeCombatPageMutation } from '../combat/combatActionQueue.js';
import { deepFreezeCombatActionData } from '../combat/combatActionModel.js';
import { prepareCharacterHealthMutation } from '../properties/characterHealthMutation.js';
import { persistPageContentCommand } from '../storage/pageCommandService.js';
import { inspectPageWriteOutcome } from '../storage/pageWritePreconditions.js';
import { assertStorageWorkspaceContext, createContextBoundStorageAdapter } from '../storage/storageAdapter.js';
import { createTransactionRecord, readTransactionRecords, appendTransactionRecord } from './eventStore.js';
import { createReversalTransaction, appendTransactionEvent, completeTransaction } from './transactionModel.js';
import { createTypedEvent } from './eventTypes.js';
import { inspectTransactionAudit } from './transactionAuditReadback.js';

export function classifyCombatAttackReversal(original, transactions = []) {
  const reject = reason => ({ reversible: false, transactionId: original?.transactionId, reason });
  try { createTransactionRecord(original); } catch { return reject('invalid-combat-attack-evidence'); }
  const existing = transactions.find(transaction => transaction.status === 'completed' &&
    (transaction.reversesTransactionId === original.transactionId || transaction.events?.some(event =>
      event.type === 'transaction.reversal.recorded' && event.payload.originalTransactionId === original.transactionId)));
  if (existing) return { ...reject('already-reversed'), reversedByTransactionId: existing.transactionId };
  const action = original.events.find(event => event.type === 'action.resolved');
  if (!action || original.intentType !== 'combat-attack') return reject('invalid-combat-attack-evidence');
  const p = action.payload;
  if (p.outcome !== 'hit') return reject('combat-attack-miss');
  if (!p.resourceEventIds.length) return reject('combat-attack-no-health-change');
  const before = { hpMax: p.healthGuard.hpMax }, after = { ...before };
  for (const guard of p.healthGuard.unchangedFields) before[guard.field] = after[guard.field] = guard.value;
  const resources = p.resourceEventIds.map(id => original.events.find(event => event.eventId === id));
  for (const event of resources) {
    const field = event.payload.resource.id.slice(p.target.pageId.length + 1);
    before[field] = event.payload.before;
    after[field] = event.payload.after;
  }
  // Полнота и forward-семантика уже доказаны строгим action cross-event validator.
  return deepFreezeCombatActionData(JSON.parse(JSON.stringify({ reversible: true, transactionId: original.transactionId,
    reason: 'combat-attack-health-change', pageId: p.target.pageId, originalEventId: action.eventId, before, after, resources })));
}

export function createCombatAttackReversalTransaction(original, evidence, input) {
  let transaction = createReversalTransaction({ transactionId: input.reversalTransactionId, targetTransaction: original,
    intentType: 'transaction-reversal', label: input.label || `Undo ${original.label || original.transactionId}`,
    source: input.source, reason: input.reason || 'undo', createdAt: input.createdAt, order: input.order });
  const add = (eventId, type, payload, reversesEventId) => {
    transaction = appendTransactionEvent(transaction, createTypedEvent({ eventId, transactionId: transaction.transactionId,
      type, payloadVersion: 1, payload, createdAt: input.eventCreatedAt, order: transaction.events.length + 1,
      ...(reversesEventId ? { reversesEventId } : {}) }));
  };
  evidence.resources.forEach((event, index) => {
    const p = event.payload;
    // Второй id детерминирован от выделенного caller id, без нового allocation при ошибке.
    add(index ? `${input.reversalEventId}:hpCurrent` : input.reversalEventId, 'resource.changed', {
      resource: p.resource, before: p.after, after: p.before, delta: p.before - p.after,
      unit: p.unit, reason: input.reason ? `undo: ${input.reason}` : 'undo'
    }, event.eventId);
  });
  add(input.reversalMetadataEventId, 'transaction.reversal.recorded', {
    originalTransactionId: original.transactionId, reversalTransactionId: transaction.transactionId,
    reversedEventIds: evidence.resources.map(event => event.eventId), reason: input.reason || 'undo'
  });
  transaction = completeTransaction(transaction, { completedAt: input.completedAt });
  createTransactionRecord(transaction);
  return transaction;
}

const sameHealth = (a, b) => ['hpCurrent', 'hpTemp', 'hpMax'].every(field => a[field] === b[field]);
function fail(reason) { const error = new Error(reason); error.code = reason; throw error; }

// Внутренняя ветка Transaction Reversal. Публичный entry остаётся undoTransaction.
export async function compensateCombatAttack(input, preliminary, workspaceContext, options) {
  let stage = 'preflight', state = 'unchanged', plan = null, transaction = null, receipt = null, health = null;
  const pageId = preliminary.events.find(event => event.type === 'action.resolved')?.payload?.target?.pageId;
  const result = extra => deepFreezeCombatActionData({ kind: 'mow-transaction-reversal-result', version: 1,
    ok: false, status: 'rejected', state, audit: 'not-attempted', stage,
    originalTransactionId: input.transactionId, reversalTransactionId: input.reversalTransactionId,
    pageId, health, mutationPlan: plan, transaction, pageCommandReceipt: receipt, ...extra });
  try {
    if (!workspaceContext || (options.storageAdapter && options.storageAdapter !== workspaceContext.adapter)) fail('STORAGE_WORKSPACE_CHANGED');
    assertStorageWorkspaceContext(workspaceContext);
    if (!pageId) fail('invalid-combat-attack-evidence');
    return await serializeCombatPageMutation(workspaceContext, pageId, async () => {
      const adapter = createContextBoundStorageAdapter(workspaceContext);
      try {
        // Eligibility до ожидания очереди не даёт права на компенсацию.
        const snapshot = await readTransactionRecords({ storageAdapter: adapter, strict: true });
        assertStorageWorkspaceContext(workspaceContext);
        const original = snapshot.transactions.find(item => item.transactionId === input.transactionId);
        if (!original) fail('TRANSACTION_REVERSAL_TRANSACTION_NOT_FOUND');
        const evidence = classifyCombatAttackReversal(original, snapshot.transactions);
        if (!evidence.reversible) fail(evidence.reason);
        if (evidence.pageId !== pageId) fail('invalid-combat-attack-evidence');
        health = { before: evidence.before, after: evidence.after };
        const resolvePage = options.pageResolver || getPageById;
        const page = await resolvePage(pageId);
        if (!page?.path || page.id !== pageId) fail('TRANSACTION_REVERSAL_TARGET_NOT_FOUND');
        const beforeContent = page.content, beforePath = page.path;
        stage = 'health-preparation';
        try {
          plan = await prepareCharacterHealthMutation(page, { type: 'exact', hpCurrent: evidence.before.hpCurrent,
            hpTemp: evidence.before.hpTemp }, { storageAdapter: adapter });
        } catch (error) {
          // Уменьшенный hpMax может запретить exact BEFORE ещё до выдачи плана.
          if (error.reason === 'current-exceeds-max') fail('TRANSACTION_REVERSAL_CURRENT_STATE_CONFLICT');
          if (error.details?.precondition?.failureKind === 'current-page-missing') fail('TRANSACTION_REVERSAL_TARGET_NOT_FOUND');
          throw error;
        }
        assertStorageWorkspaceContext(workspaceContext);
        if (!sameHealth(plan.before, evidence.after) || !sameHealth(plan.after, evidence.before) || !plan.changed) fail('TRANSACTION_REVERSAL_CURRENT_STATE_CONFLICT');
        stage = 'candidate-validation';
        transaction = createCombatAttackReversalTransaction(original, evidence, input);
        const usedIds = new Set(snapshot.transactions.flatMap(tx => [tx.transactionId, ...tx.events.map(event => event.eventId)]));
        if ([transaction.transactionId, ...transaction.events.map(event => event.eventId)].some(id => usedIds.has(id))) fail('EVENT_STORE_DUPLICATE_IDENTITY');
        // Resolver может быть async; перед PageCommand сверяем handle, внутри очереди — content/path.
        if (await resolvePage(pageId) !== page) fail('TRANSACTION_REVERSAL_CURRENT_STATE_CONFLICT');
        stage = 'page-write';
        try {
          const command = await persistPageContentCommand({ page, content: plan.nextContent, previousPage: plan.previousPage,
            expectedBase: plan.expectedBase, workspaceContext, type: 'combat-action-health-reversal', reason: input.reason || 'undo',
            validateBeforeWrite: () => {
              assertStorageWorkspaceContext(workspaceContext);
              if (page.content !== beforeContent || page.path !== beforePath) fail('TRANSACTION_REVERSAL_CURRENT_STATE_CONFLICT');
              if (!options.pageResolver && getPageById(pageId) !== page) fail('TRANSACTION_REVERSAL_TARGET_NOT_FOUND');
            } });
          const { page: livePage, ...commandEvidence } = command;
          receipt = commandEvidence;
        } catch (error) {
          const pageReadback = await inspectPageWriteOutcome({ page, beforeContent, nextContent: plan.nextContent, workspaceContext });
          state = pageReadback.status === 'base-content' ? 'unchanged' : pageReadback.status === 'next-content' ? 'persisted' : 'uncertain';
          return result({ reason: error.code || error.message, pageReadback });
        }
        if (receipt.writeStatus !== 'saved' || !receipt.written || receipt.blocked || receipt.stale || receipt.conflict) {
          state = receipt.written ? 'uncertain' : 'unchanged';
          const pageReadback = receipt.written ? await inspectPageWriteOutcome({ page, beforeContent, nextContent: plan.nextContent, workspaceContext }) : null;
          return result({ reason: 'COMBAT_UNDO_PAGE_WRITE_UNCONFIRMED', pageReadback });
        }
        state = 'persisted';
        stage = 'audit-append';
        try {
          assertStorageWorkspaceContext(workspaceContext);
          const append = await appendTransactionRecord(transaction, { storageAdapter: workspaceContext.adapter, workspaceContext });
          assertStorageWorkspaceContext(workspaceContext);
          if (append.status !== 'durable') fail('AUDIT_APPEND_UNCONFIRMED');
          return result({ ok: true, status: 'durable', audit: 'durable', stage: 'completed' });
        } catch (error) {
          return result({ status: 'unconfirmed', audit: 'unconfirmed', reason: error.code || error.message,
            auditReadback: await inspectTransactionAudit(transaction, adapter) });
        }
      } catch (error) {
        return result({ reason: error.code || error.message });
      }
    });
  } catch (error) { return result({ reason: error.code || error.message }); }
}
