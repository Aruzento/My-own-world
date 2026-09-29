import * as PageRepository from '../repository/pageRepository.js';
import { parsePageRecordContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { deepCloneData, deepFreeze } from '../cardTypes/definitionIdentity.js';
import { readEntity, getValue, prepareVariablesChange, commitVariablesChange } from '../variables/entityVariables.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from '../storage/cardTypeCatalogStorage.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext } from '../storage/storageAdapter.js';
import { readInventoryModelFromPage } from './inventoryModel.js';

export const INVENTORY_ERROR_CODES = Object.freeze({
  SOURCE_UNAVAILABLE: 'INVENTORY_SOURCE_UNAVAILABLE',
  TARGET_UNAVAILABLE: 'INVENTORY_TARGET_UNAVAILABLE',
  INVALID_REQUEST: 'INVENTORY_INVALID_REQUEST',
  WRITE_BLOCKED: 'INVENTORY_WRITE_BLOCKED',
  READBACK_UNCERTAIN: 'INVENTORY_READBACK_UNCERTAIN'
});

const plans = new WeakMap();

// Контекст готовится на lifecycle boundary; legacy inventory не требует catalog.
export async function prepareInventoryContext({ page, repository = PageRepository, workspaceContext = null } = {}) {
  const parsed = parsePageRecordContent(page?.content || '');
  if (parsed.variablesStatus.mode === 'legacy') return { mode: 'legacy', registry: null, repository };
  if (!['character', 'player'].includes(parsed.type)) return { mode: 'not-inventory', registry: null, repository };
  try {
    const workspace = workspaceContext || captureStorageWorkspaceContext();
    assertStorageWorkspaceContext(workspace);
    const current = await readCardTypeCatalog({ storageAdapter: workspace.adapter });
    assertStorageWorkspaceContext(workspace);
    if (!current.exists) throw new Error('activated-catalog-missing');
    return { mode: 'source-aware', repository, workspaceContext: workspace, catalogIdentity: current.identity,
      registry: createCardTypeRegistryFromCatalog(current.catalog, { bundledTypes: [], bundledFieldSets: [] }) };
  } catch (error) {
    return { mode: 'unavailable', registry: null, repository, reason: error.message };
  }
}

export function readInventorySource(page, context) {
  if (!context || context.mode === 'unavailable') return { source: 'unavailable', status: 'unavailable', items: [],
    totalQuantity: 0, diagnostics: [{ reason: context?.reason || 'inventory-context-required' }] };
  return readInventoryModelFromPage(page, context);
}

export function prepareInventoryChange({ pageId, expectedBase, request, context } = {}) {
  const page = context?.repository?.getPageById(pageId);
  const inventory = readInventorySource(page, context);
  if (inventory.source !== 'entity' || inventory.status !== 'ready' || !context.registry) {
    throw inventoryError(INVENTORY_ERROR_CODES.SOURCE_UNAVAILABLE, 'explicit-inventory-required');
  }
  const snapshot = readEntity(pageId, context);
  if (!arePageStateIdentitiesEqual(expectedBase, snapshot.pageIdentity)) {
    throw inventoryError(INVENTORY_ERROR_CODES.WRITE_BLOCKED, 'stale-inventory-base');
  }
  const before = { items: getValue(snapshot, 'dnd.items', 'stored').value,
    equipped: getValue(snapshot, 'dnd.equippedItems', 'stored').value };
  const after = deepCloneData(before);
  const itemId = request?.pageId;
  if (typeof itemId !== 'string' || !itemId || !['add', 'remove', 'quantity'].includes(request?.type)) {
    throw inventoryError(INVENTORY_ERROR_CODES.INVALID_REQUEST, 'unsupported-request');
  }
  let targetPageId = pageId;
  let target = null;
  let patch = [];
  if (request.type === 'add') {
    target = requireItem(itemId, context);
    if (!after.items.some(ref => ref.pageId === itemId)) {
      after.items.push({ pageId: itemId });
      patch = [{ op: 'set', key: 'dnd.items', value: after.items }];
    }
  } else if (request.type === 'remove') {
    after.items = after.items.filter(ref => ref.pageId !== itemId);
    after.equipped = after.equipped.filter(ref => ref.pageId !== itemId);
    if (canonicalJSON(before) !== canonicalJSON(after)) patch = [
      { op: 'set', key: 'dnd.items', value: after.items },
      { op: 'set', key: 'dnd.equippedItems', value: after.equipped }
    ];
  } else {
    if (!before.items.some(ref => ref.pageId === itemId)) {
      throw inventoryError(INVENTORY_ERROR_CODES.TARGET_UNAVAILABLE, 'item-not-in-inventory');
    }
    target = requireItem(itemId, context);
    const quantity = getValue(target, 'item.quantity', 'stored');
    if (target.mode !== 'structured' || quantity.status !== 'value') {
      throw inventoryError(INVENTORY_ERROR_CODES.TARGET_UNAVAILABLE, 'explicit-item-quantity-required');
    }
    if (!Number.isSafeInteger(request.quantity)) {
      throw inventoryError(INVENTORY_ERROR_CODES.INVALID_REQUEST, 'quantity-integer-required');
    }
    if (!arePageStateIdentitiesEqual(request.expectedItemBase, target.pageIdentity)) {
      throw inventoryError(INVENTORY_ERROR_CODES.WRITE_BLOCKED, 'stale-item-base');
    }
    targetPageId = itemId;
    if (request.quantity !== quantity.value) patch = [{ op: 'set', key: 'item.quantity', value: request.quantity }];
  }
  const underlying = patch.length ? prepareVariablesChange({ pageId: targetPageId,
    expectedBase: targetPageId === pageId ? expectedBase : request.expectedItemBase, patch, context }) : null;
  const plan = deepFreeze(deepCloneData({ kind: 'InventoryChangePlan', version: 1, pageId, targetPageId,
    request, before, after, changed: Boolean(underlying), expectedBase,
    schema: underlying?.schema || { type: snapshot.type, digest: snapshot.schemaDigest, version: snapshot.schemaVersion },
    guards: { wholePage: true, workspace: true, schemaClosure: true, rebase: false } }));
  plans.set(plan, { underlying, context, used: false, targetPath: target ? context.repository.getPageById(itemId)?.path : null });
  return plan;
}

export async function commitInventoryChange(plan) {
  const captured = plans.get(plan);
  if (!captured || captured.used) return result('blocked', false, INVENTORY_ERROR_CODES.WRITE_BLOCKED, 'unknown-or-used-plan');
  captured.used = true;
  if (!plan.changed) return result('unchanged', false, null, 'no-change', { plan });
  const { context } = captured;
  const committed = await commitVariablesChange(captured.underlying, { validateBeforeWrite: async () => {
    const active = await readCardTypeCatalog({ storageAdapter: context.workspaceContext.adapter });
    if (!active.exists || canonicalJSON(active.identity) !== canonicalJSON(context.catalogIdentity)) throw new Error('Inventory catalog changed');
    // Quantity writes guard their actor link without writing/rebasing the actor.
    const actor = readEntity(plan.pageId, context);
    if (!arePageStateIdentitiesEqual(actor.pageIdentity, plan.expectedBase)) throw new Error('Inventory owner changed');
    if (plan.request.type !== 'remove') {
      const target = context.repository.getPageById(plan.request.pageId);
      requireItem(plan.request.pageId, context);
      if (target?.path !== captured.targetPath) throw new Error('Item moved');
      const durableContent = await context.workspaceContext.adapter.readText(target.path);
      requireItem(plan.request.pageId, { ...context, repository: {
        getPageById: id => id === target.id ? { ...target, content: durableContent } : context.repository.getPageById(id)
      } });
    }
    if (plan.request.type === 'quantity') {
      const owner = context.repository.getPageById(plan.pageId);
      const durableContent = await context.workspaceContext.adapter.readText(owner.path);
      const durableOwner = readEntity(plan.pageId, { ...context, repository: {
        getPageById: id => id === owner.id ? { ...owner, content: durableContent } : context.repository.getPageById(id)
      } });
      if (!arePageStateIdentitiesEqual(durableOwner.pageIdentity, plan.expectedBase)) throw new Error('Durable inventory owner changed');
    }
  } });
  if (committed.status !== 'saved') return result(committed.status, committed.written,
    committed.status === 'uncertain' || committed.written ? INVENTORY_ERROR_CODES.READBACK_UNCERTAIN : INVENTORY_ERROR_CODES.WRITE_BLOCKED,
    committed.reason || 'inventory-write-unconfirmed', { plan, underlyingResult: committed });
  try {
    const inventory = readInventorySource(context.repository.getPageById(plan.pageId), context);
    if (inventory.source !== 'entity' || inventory.status !== 'ready') throw new Error('Inventory readback unavailable');
    if (plan.request.type === 'quantity') {
      const item = inventory.items.find(candidate => candidate.pageId === plan.request.pageId);
      if (item?.quantitySource !== 'stored' || item.quantity !== plan.request.quantity) throw new Error('Quantity readback mismatch');
    } else {
      const actor = readEntity(plan.pageId, context);
      if (canonicalJSON(getValue(actor, 'dnd.items', 'stored').value) !== canonicalJSON(plan.after.items) ||
          canonicalJSON(getValue(actor, 'dnd.equippedItems', 'stored').value) !== canonicalJSON(plan.after.equipped)) throw new Error('Inventory readback mismatch');
    }
    return result('saved', true, null, '', { plan, inventory, underlyingResult: committed });
  } catch (error) {
    return result('uncertain', true, INVENTORY_ERROR_CODES.READBACK_UNCERTAIN, error.message, { plan, underlyingResult: committed });
  }
}

function requireItem(pageId, context) {
  const target = readEntity(pageId, context);
  if (target.type !== 'item' || !['legacy', 'structured'].includes(target.mode) ||
      target.diagnostics.some(issue => issue.severity === 'error')) {
    throw inventoryError(INVENTORY_ERROR_CODES.TARGET_UNAVAILABLE, 'valid-exact-item-required');
  }
  return target;
}

function inventoryError(code, reason) {
  return Object.assign(new Error(reason), { code, reason });
}
function result(status, written, code, reason, extra = {}) { return { status, written, code, reason, ...extra }; }
