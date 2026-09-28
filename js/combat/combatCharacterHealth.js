import { parsePageRecordContent } from '../core/pageRecord.js';
import { readCharacterModelFromPage } from '../character/characterModel.js';
import {
  commitStructuredCharacterHealthChange,
  inspectStructuredCharacterHealthSource,
  prepareStructuredCharacterHealthChange
} from '../character/structuredCharacterHealth.js';
import { prepareCharacterHealthMutation } from '../properties/characterHealthMutation.js';
import {
  createCardTypeRegistryFromCatalog,
  readCardTypeCatalog
} from '../storage/cardTypeCatalogStorage.js';
import { persistPageContentCommand } from '../storage/pageCommandService.js';
import { inspectPageWriteOutcome } from '../storage/pageWritePreconditions.js';
import { assertStorageWorkspaceContext } from '../storage/storageAdapter.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { deepFreezeCombatActionData } from './combatActionModel.js';

export const COMBAT_HEALTH_ERROR_CODES = Object.freeze({
  SOURCE_UNSUPPORTED: 'COMBAT_CHARACTER_SOURCE_UNSUPPORTED',
  CATALOG_UNAVAILABLE: 'COMBAT_STRUCTURED_CATALOG_UNAVAILABLE',
  HEALTH_UNAVAILABLE: 'COMBAT_STRUCTURED_HEALTH_UNAVAILABLE',
  WRITE_BLOCKED: 'COMBAT_HEALTH_WRITE_BLOCKED',
  WRITE_UNCERTAIN: 'COMBAT_HEALTH_WRITE_UNCERTAIN'
});

const plans = new WeakMap();

export async function createCombatCharacterContext({
  pages = [], pageIds = [], workspaceContext, storageAdapter = null
} = {}) {
  const byId = new Map(pages.filter(page => page?.id).map(page => [page.id, page]));
  const selected = pageIds.map(id => byId.get(id)).filter(Boolean);
  const hasStructured = selected.some(page =>
    parsePageRecordContent(page.content, { generateId: false }).variablesStatus.mode !== 'legacy'
  );
  const repository = Object.freeze({
    getPageById(id) { return byId.get(id) || null; }
  });

  if (!hasStructured) {
    return Object.freeze({ mode: 'legacy-only', registry: null, repository,
      catalogIdentity: null, workspaceContext: workspaceContext || null });
  }

  if (workspaceContext) assertStorageWorkspaceContext(workspaceContext);
  const adapter = storageAdapter || workspaceContext?.adapter;
  if (!adapter) throw combatHealthError(COMBAT_HEALTH_ERROR_CODES.CATALOG_UNAVAILABLE, 'storage-adapter-required');
  const current = await readCardTypeCatalog({ storageAdapter: adapter });
  if (!current.exists) throw combatHealthError(COMBAT_HEALTH_ERROR_CODES.CATALOG_UNAVAILABLE, 'activated-catalog-missing');
  const registry = createCardTypeRegistryFromCatalog(current.catalog, {
    bundledTypes: [], bundledFieldSets: []
  });
  if (workspaceContext) assertStorageWorkspaceContext(workspaceContext);
  return Object.freeze({ mode: 'source-aware', registry, repository,
    catalogIdentity: current.identity, workspaceContext: workspaceContext || null });
}

export async function assertCombatCharacterContextCurrent(context) {
  if (!context?.registry) return;
  assertStorageWorkspaceContext(context.workspaceContext);
  const current = await readCardTypeCatalog({ storageAdapter: context.workspaceContext.adapter });
  if (!current.exists || canonicalJSON(current.identity) !== canonicalJSON(context.catalogIdentity)) {
    throw combatHealthError(COMBAT_HEALTH_ERROR_CODES.CATALOG_UNAVAILABLE, 'activated-catalog-changed');
  }
  assertStorageWorkspaceContext(context.workspaceContext);
}

export function readCombatCharacter(page, { pages = [], context } = {}) {
  const mode = parsePageRecordContent(page?.content, { generateId: false }).variablesStatus.mode;
  if (mode !== 'legacy' && !context?.registry) {
    throw combatHealthError(COMBAT_HEALTH_ERROR_CODES.CATALOG_UNAVAILABLE, 'activated-catalog-required');
  }
  const character = readCharacterModelFromPage(page, {
    pages,
    ...(mode === 'legacy' ? {} : {
      registry: context?.registry,
      repository: context?.repository
    })
  });
  const legacy = character?.source === 'properties' && ['character', 'creature'].includes(character.cardType);
  const structured = character?.source === 'entity' && ['character', 'player'].includes(character.cardType);
  if ((!legacy && !structured) || character.pageId !== page?.id) {
    throw combatHealthError(COMBAT_HEALTH_ERROR_CODES.SOURCE_UNSUPPORTED,
      character?.source === 'structured-unavailable' ? 'structured-source-unavailable' : 'character-capability-required');
  }
  return Object.freeze({ character, source: legacy ? 'legacy' : 'structured' });
}

export function inspectCombatStructuredHealth(page, { pages = [], context, expectedBase = null } = {}) {
  try {
    return inspectStructuredCharacterHealthSource({
      pageId: page.id,
      expectedBase,
      context: { registry: context?.registry, repository: context?.repository,
        pages, workspaceContext: context?.workspaceContext }
    });
  } catch (error) {
    throw combatHealthError(COMBAT_HEALTH_ERROR_CODES.HEALTH_UNAVAILABLE,
      error.reason || error.code || 'structured-health-unavailable', error);
  }
}

export async function prepareCombatHealthChange({
  page, request, pages = [], context, storageAdapter = null, expectedBase = null
} = {}) {
  const active = readCombatCharacter(page, { pages, context });
  let underlying;
  try {
    underlying = active.source === 'structured'
      ? prepareStructuredCharacterHealthChange({
        pageId: page.id,
        expectedBase,
        request,
        context: { registry: context.registry, repository: context.repository, pages,
          workspaceContext: context.workspaceContext }
      })
      : await prepareCharacterHealthMutation(page, request, { pages, storageAdapter });
  } catch (error) {
    throw combatHealthError(
      active.source === 'structured' ? COMBAT_HEALTH_ERROR_CODES.HEALTH_UNAVAILABLE : COMBAT_HEALTH_ERROR_CODES.SOURCE_UNSUPPORTED,
      error.reason || error.code || 'health-preparation-failed', error
    );
  }

  const before = normalizeHealth(underlying.before, active.source);
  const after = normalizeHealth(underlying.after, active.source);
  const changedFields = ['hpTemp', 'hpCurrent']
    .filter(field => before[field] !== after[field])
    .map(field => ({ field, before: before[field], after: after[field] }));
  const unchangedFields = ['hpCurrent', 'hpMax', 'hpTemp']
    .filter(field => before[field] === after[field])
    .map(field => ({ field, value: before[field] }));
  const plan = deepFreezeCombatActionData({
    kind: 'CombatCharacterHealthPlan', version: 1, pageId: page.id,
    source: active.source, request, expectedBase: underlying.expectedBase,
    before, after, changed: changedFields.length > 0, changedFields,
    guards: { hpMax: before.hpMax, unchangedFields },
    ...(active.source === 'legacy' ? {
      previousPage: underlying.previousPage,
      nextContent: underlying.nextContent
    } : {})
  });
  plans.set(plan, { underlying, page, source: active.source, beforeContent: page.content });
  return plan;
}

export async function commitCombatHealthChange(plan, {
  workspaceContext, validateBeforeWrite = null, reason = 'combat health change'
} = {}) {
  const captured = plans.get(plan);
  if (!captured) return commitResult('blocked', false, 'unknown-plan');
  plans.delete(plan);
  if (!plan.changed) return commitResult('unchanged', false, 'health-unchanged');

  if (captured.source === 'structured') {
    const result = await commitStructuredCharacterHealthChange(captured.underlying, { validateBeforeWrite });
    return deepFreezeCombatActionData({ kind: 'CombatHealthCommitResult', version: 1,
      status: result.status, written: result.written, reason: result.reason || '',
      state: result.status === 'saved' ? 'persisted' : result.written === true ? 'uncertain' : 'unchanged',
      structuredResult: result,
      ...(result.variablesResult ? { pageCommandReceipt: omitPage(result.variablesResult) } : {}) });
  }

  const underlying = captured.underlying;
  try {
    const command = await persistPageContentCommand({
      page: captured.page, content: underlying.nextContent,
      previousPage: underlying.previousPage, expectedBase: underlying.expectedBase,
      workspaceContext, validateBeforeWrite,
      type: 'combat-action-health-change', reason
    });
    const receipt = omitPage(command);
    if (receipt.writeStatus !== 'saved' || !receipt.written || receipt.blocked || receipt.stale || receipt.conflict) {
      return deepFreezeCombatActionData({ kind: 'CombatHealthCommitResult', version: 1,
        status: receipt.written ? 'uncertain' : 'blocked', written: receipt.written,
        state: receipt.written ? 'uncertain' : 'unchanged',
        reason: 'COMBAT_PAGE_WRITE_UNCONFIRMED', pageCommandReceipt: receipt });
    }
    return deepFreezeCombatActionData({ kind: 'CombatHealthCommitResult', version: 1,
      status: 'saved', written: true, state: 'persisted', reason: '', pageCommandReceipt: receipt });
  } catch (error) {
    const pageReadback = await inspectPageWriteOutcome({
      page: captured.page, beforeContent: captured.beforeContent,
      nextContent: underlying.nextContent, workspaceContext
    });
    return deepFreezeCombatActionData({ kind: 'CombatHealthCommitResult', version: 1,
      status: pageReadback.status === 'base-content' ? 'failed' : 'uncertain',
      written: pageReadback.status === 'next-content' ? true : pageReadback.status === 'base-content' ? false : null,
      state: pageReadback.status === 'next-content' ? 'persisted' : pageReadback.status === 'base-content' ? 'unchanged' : 'uncertain',
      reason: error.code || error.message, pageReadback });
  }
}

function normalizeHealth(value, source) {
  return source === 'structured'
    ? { hpCurrent: value.current, hpMax: value.max, hpTemp: value.temp }
    : { hpCurrent: value.hpCurrent, hpMax: value.hpMax, hpTemp: value.hpTemp };
}

function omitPage(value) {
  const { page, ...rest } = value || {};
  return rest;
}

function commitResult(status, written, reason) {
  return deepFreezeCombatActionData({ kind: 'CombatHealthCommitResult', version: 1, status, written,
    state: status === 'saved' ? 'persisted' : status === 'uncertain' ? 'uncertain' : 'unchanged', reason });
}

function combatHealthError(code, reason, cause = null) {
  const error = new Error(reason, cause ? { cause } : undefined);
  error.code = code;
  error.reason = reason;
  return error;
}
