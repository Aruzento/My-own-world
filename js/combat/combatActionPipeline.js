import { resolveSingleTargetAttack, readCombatAttackObservation } from './combatAttackResolution.js';
import { validateCombatActionRequest, deepFreezeCombatActionData } from './combatActionModel.js';
import { serializeCombatPageMutation } from './combatActionQueue.js';
import { getAllPages, getPageById } from '../repository/pageRepository.js';
import { CampaignMapModel } from '../editor/campaignMapModel.js';
import { parsePageRecordContent } from '../core/pageRecord.js';
import { persistPageContentCommand, snapshotPageForCommand } from '../storage/pageCommandService.js';
import { evaluatePageWritePrecondition, inspectPageWriteOutcome } from '../storage/pageWritePreconditions.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext, createContextBoundStorageAdapter } from '../storage/storageAdapter.js';
import { createCombatAttackTransaction, inspectCombatAttackAudit } from '../events/combatActionEventLog.js';
import { appendTransactionRecord } from '../events/eventStore.js';

function reject(reason) {
  const error = new Error(reason);
  error.code = reason;
  throw error;
}

// Caller supplies the current map store through a read-only observation seam, never a saved actor pointer.
export async function executeCombatAttack(request, { getMapContext, resolvePage = getPageById,
  getPages = getAllPages, randomInt, createId = () => crypto.randomUUID(), now = () => new Date().toISOString() } = {}) {
  let normalized, workspaceContext, transactionId;
  try {
    normalized = validateCombatActionRequest(request);
    workspaceContext = captureStorageWorkspaceContext();
    transactionId = createId();
  } catch (error) { return result({ actionId: typeof request?.actionId === 'string' ? request.actionId : null,
    transactionId: transactionId || null, stage: 'preflight', reason: error.code || error.message }); }
  let initial;
  try {
    initial = { ...getMapContext() };
    const observation = readCombatAttackObservation({ request: normalized, ...initial, pages: getPages(), resolvePage });
    const observedMapState = JSON.stringify(initial.mapModel.toJSON());
    return await serializeCombatPageMutation(workspaceContext, observation.target.pageId, async () => {
      let resolution = null, transaction = null, receipt = null, state = 'unchanged', stage = 'preflight';
      const evidence = () => ({ actionId: normalized.actionId, transactionId, stage, resolution, transaction,
        pageCommandReceipt: receipt, target: observation.target });
      const adapter = createContextBoundStorageAdapter(workspaceContext);
      try {
        const readObservation = () => {
          assertStorageWorkspaceContext(workspaceContext);
          const current = getMapContext();
          if (current.mapPageId !== initial.mapPageId || current.mapModel !== initial.mapModel || current.dirty) reject('COMBAT_CONTEXT_STALE');
          if (JSON.stringify(current.mapModel.toJSON()) !== observedMapState) reject('COMBAT_MAP_DIVERGENT');
          return readCombatAttackObservation({ request: normalized, ...current, pages: getPages(), resolvePage });
        };
        const before = readObservation();
        const mapPage = resolvePage(normalized.mapPageId);
        if (!mapPage?.path || (mapPage.type !== 'campaignMap' && mapPage.template !== 'campaignMap')) reject('COMBAT_MAP_UNSAVED');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = parsePageRecordContent(mapPage.content).body;
        const durableMap = CampaignMapModel.fromElement(wrapper.querySelector('.campaign-map-document'));
        if (JSON.stringify(durableMap.toJSON()) !== JSON.stringify(initial.mapModel.toJSON())) reject('COMBAT_MAP_DIVERGENT');
        const mapBase = snapshotPageForCommand(mapPage).pageStateIdentity;
        const checkMap = async () => {
          const currentPage = resolvePage(normalized.mapPageId);
          if (currentPage !== mapPage || currentPage.content !== mapPageContent) reject('COMBAT_MAP_STALE');
          const precondition = await evaluatePageWritePrecondition({ page: currentPage, expectedBase: mapBase, storageAdapter: adapter });
          if (!precondition.ok) reject('COMBAT_MAP_STALE');
          assertStorageWorkspaceContext(workspaceContext);
        };
        const mapPageContent = mapPage.content;
        await checkMap();
        stage = 'resolution';
        resolution = await resolveSingleTargetAttack(normalized, { ...initial, pages: getPages(), resolvePage, randomInt, storageAdapter: adapter });
        stage = 'candidate-validation';
        transaction = createCombatAttackTransaction(resolution, { transactionId, createId, now });
        stage = 'precommit';
        await checkMap();
        if (JSON.stringify(before) !== JSON.stringify(readObservation())) reject('COMBAT_OBSERVATION_STALE');
        const plan = resolution.health?.mutationPlan;
        const targetPage = resolvePage(resolution.target.pageId);
        if (plan) {
          const precondition = await evaluatePageWritePrecondition({ page: targetPage, expectedBase: plan.expectedBase, storageAdapter: adapter });
          if (!precondition.ok) return result({ ...evidence(), reason: 'COMBAT_TARGET_STALE', precondition });
        }
        // Все await preflight завершены; ещё раз проверяем синхронные наблюдения перед записью.
        if (JSON.stringify(before) !== JSON.stringify(readObservation())) reject('COMBAT_OBSERVATION_STALE');
        if (plan?.changed) {
          stage = 'page-write';
          try {
            const command = await persistPageContentCommand({ page: targetPage, content: plan.nextContent,
              previousPage: plan.previousPage, expectedBase: plan.expectedBase, workspaceContext,
              validateBeforeWrite: () => {
                if (JSON.stringify(before) !== JSON.stringify(readObservation())) reject('COMBAT_OBSERVATION_STALE');
              },
              type: 'combat-action-health-change', reason: resolution.definition.label });
            const { page, ...commandEvidence } = command;
            receipt = commandEvidence;
          } catch (error) {
            const readback = await inspectPageWriteOutcome({ page: targetPage, beforeContent: before.targetContent,
              nextContent: plan.nextContent, workspaceContext });
            return result({ ...evidence(), state: readback.status === 'base-content' ? 'unchanged' : readback.status === 'next-content' ? 'persisted' : 'uncertain',
              reason: error.code || error.message, pageReadback: readback });
          }
          if (receipt.writeStatus !== 'saved' || !receipt.written || receipt.blocked || receipt.stale || receipt.conflict) {
            const pageReadback = receipt.written ? await inspectPageWriteOutcome({ page: targetPage,
              beforeContent: before.targetContent, nextContent: plan.nextContent, workspaceContext }) : null;
            return result({ ...evidence(), state: receipt.written ? 'uncertain' : 'unchanged',
              reason: 'COMBAT_PAGE_WRITE_UNCONFIRMED', pageReadback });
          }
          state = 'persisted';
        }
        stage = 'audit-append';
        assertStorageWorkspaceContext(workspaceContext);
        try {
          const append = await appendTransactionRecord(transaction, { storageAdapter: workspaceContext.adapter, workspaceContext });
          assertStorageWorkspaceContext(workspaceContext);
          if (append.status !== 'durable') reject('AUDIT_APPEND_UNCONFIRMED');
          return result({ ...evidence(), state, audit: 'durable', stage: 'completed', ok: true });
        } catch (error) {
          const auditReadback = await inspectCombatAttackAudit(transaction, adapter);
          return result({ ...evidence(), state, audit: 'unconfirmed', reason: error.code || error.message, auditReadback });
        }
      } catch (error) {
        return result({ ...evidence(), state, reason: error.code || error.message });
      }
    });
  } catch (error) { return result({ actionId: normalized.actionId, transactionId, stage: 'preflight', reason: error.code || error.message }); }
}

function result(evidence) {
  return deepFreezeCombatActionData({ kind: 'CombatActionExecutionResult', version: 1, ok: false,
    state: 'unchanged', audit: 'not-attempted', ...evidence });
}
