import * as PageRepository from '../repository/pageRepository.js';
import { parsePageRecordContent, updatePageRecordContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { assertJSONData, canonicalJSON } from '../core/pageVariablesCodec.js';
import { deepCloneData, deepFreeze } from '../cardTypes/definitionIdentity.js';
import { createCardVariableSnapshot } from './cardVariableStore.js';
import { validateEntityValues, hasValue } from '../schema/cardVariablesSchema.js';
import { persistPageContentCommand, snapshotPageForCommand } from '../storage/pageCommandService.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext } from '../storage/storageAdapter.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from '../storage/cardTypeCatalogStorage.js';

// Контекст/adapter не замораживаются вместе с plan; наружу выходит только data.
const plans = new WeakMap();

export function prepareVariablesChange({ pageId, expectedBase, patch, context = {} }) {
  if (!expectedBase?.stateHash) throw new Error('Variables change requires whole-page expectedBase');
  assertJSONData(patch);
  if (!Array.isArray(patch) || !patch.length) throw new Error('Non-empty data patch required');
  const repository = context.repository || PageRepository;
  const page = repository.getPageById(pageId);
  const before = createCardVariableSnapshot(page, context.registry);
  if (before.mode !== 'structured') throw new Error(`Variables are read-only: ${before.mode}`);
  if (!arePageStateIdentitiesEqual(expectedBase, before.pageIdentity)) throw new Error('Stale variables plan base');
  const workspace = context.workspaceContext || captureStorageWorkspaceContext();
  assertStorageWorkspaceContext(workspace);
  const envelope = deepCloneData(before.envelope);
  envelope.overrides ||= {};
  const changedKeys = new Set();
  for (const operation of patch) {
    const field = before.definition.fieldsByKey[operation.key];
    if (!field || field.binding.owner !== 'variables') throw new Error('Patch requires a known variable-owned field');
    const overrideOperation = ['override', 'resetOverride'].includes(operation.op);
    if (overrideOperation ? !field.computed?.allowOverride : field.readonly || field.computed) throw new Error('Readonly/computed field write forbidden');
    if (overrideOperation) {
      if (operation.op === 'resetOverride') delete envelope.overrides[field.key];
      else { if (!hasValue(operation, 'value')) throw new Error('Missing override value'); envelope.overrides[field.key] = operation.value; }
    } else if (operation.op === 'set') {
      if (!hasValue(operation, 'value')) throw new Error('Missing value');
      envelope.values[field.key] = operation.value;
    } else if (operation.op === 'unset') delete envelope.values[field.key];
    else applyRows(envelope, field, operation);
    changedKeys.add(field.key);
  }
  const validation = validateEntityValues({ envelope, definition: before.definition, pageId });
  if (!validation.ok) { const error = new Error('Variable candidate validation failed'); error.issues = validation.issues; throw error; }
  const candidateContent = updatePageRecordContent(before.content, { variablesJson: envelope });
  const after = createCardVariableSnapshot({ ...page, content: candidateContent }, context.registry);
  const plan = deepFreeze(deepCloneData({ pageId, expectedBase, sourceIdentity: before.pageIdentity,
    schema: { type: before.type, version: before.schemaVersion, digest: before.schemaDigest },
    before, after, changedKeys: [...changedKeys].sort(), candidateContent,
    guards: { wholePage: true, schemaClosure: true, workspace: true, rebase: false }, diagnostics: validation.issues }));
  if (!page.path) throw new Error('Variables commit requires a durable workspace page path');
  plans.set(plan, { workspace, repository, path: page.path, used: false });
  return plan;
}

function applyRows(envelope, field, operation) {
  const rowKey = field.items?.rowIdentityKey;
  if (field.datatype !== 'array' || field.items?.datatype !== 'object' || !rowKey) throw new Error('Stable-row array required');
  const rows = envelope.values[field.key] ||= [];
  if (!Array.isArray(rows)) throw new Error('Invalid stored rows');
  const index = rows.findIndex(row => row[rowKey] === operation.rowId);
  if (operation.op === 'rowAdd') {
    if (!operation.rowId || index !== -1 || !operation.value || operation.value[rowKey] !== operation.rowId) throw new Error('Unique stable row id required');
    rows.push(operation.value);
  } else if (operation.op === 'rowRemove') {
    if (index < 0) throw new Error('Missing row');
    rows.splice(index, 1);
  } else if (operation.op === 'rowUpdate') {
    if (index < 0 || !operation.value || (hasValue(operation.value, rowKey) && operation.value[rowKey] !== operation.rowId)) throw new Error('Row identity cannot change');
    for (const key of Object.keys(operation.value)) {
      const property = field.items.properties.find(item => item.key === key);
      if (!property || property.readonly || property.computed) throw new Error('Readonly or unknown row property');
    }
    Object.assign(rows[index], operation.value);
  } else if (operation.op === 'rowReorder') {
    const ids = operation.rowIds;
    if (!Array.isArray(ids) || ids.length !== rows.length || new Set(ids).size !== rows.length || ids.some(id => !rows.some(row => row[rowKey] === id))) throw new Error('Reorder requires every stable row id exactly once');
    envelope.values[field.key] = ids.map(id => rows.find(row => row[rowKey] === id));
  } else throw new Error('Unsupported variable patch operation');
}

export async function commitVariablesChange(plan) {
  const captured = plans.get(plan);
  if (!captured || captured.used) return { status: 'blocked', reason: 'unknown-or-used-plan', written: false };
  captured.used = true;
  const page = captured.repository.getPageById(plan.pageId);
  try {
    assertStorageWorkspaceContext(captured.workspace);
    if (!page || page.path !== captured.path) throw new Error('Missing or moved page');
  } catch (error) {
    return { status: 'blocked', written: false, reason: String(error.message || error) };
  }
  try {
    assertStorageWorkspaceContext(captured.workspace);
    if (!page || page.path !== captured.path) throw new Error('Missing or moved page');
    const receipt = await persistPageContentCommand({
      page, content: plan.candidateContent, previousPage: snapshotPageForCommand(page),
      type: 'update-card-variables', expectedBase: plan.expectedBase, workspaceContext: captured.workspace,
      validateBeforeWrite: async () => {
        assertStorageWorkspaceContext(captured.workspace);
        const { catalog, exists } = await readCardTypeCatalog({ storageAdapter: captured.workspace.adapter });
        if (!exists) throw new Error('Missing activated catalog');
        const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
        const snapshot = createCardVariableSnapshot({ ...page, content: plan.candidateContent }, registry);
        if (snapshot.mode !== 'structured' || snapshot.schemaDigest !== plan.schema.digest ||
            snapshot.diagnostics.some(issue => issue.severity === 'error') ||
            canonicalJSON(snapshot.definition) !== canonicalJSON(plan.after.definition)) throw new Error('Schema closure changed');
        assertStorageWorkspaceContext(captured.workspace);
      },
      verifyPersistedContent: async () => {
        assertStorageWorkspaceContext(captured.workspace);
        const durable = await captured.workspace.adapter.readText(page.path);
        assertStorageWorkspaceContext(captured.workspace);
        if (durable !== plan.candidateContent || canonicalJSON(parsePageRecordContent(durable).variablesJson) !== canonicalJSON(plan.after.envelope)) throw new Error('Variable readback mismatch');
      }
    });
    return { status: receipt.writeStatus === 'saved' ? 'saved' : receipt.written ? 'uncertain' : 'blocked', ...receipt };
  } catch (error) {
    try {
      assertStorageWorkspaceContext(captured.workspace);
      const content = await captured.workspace.adapter.readText(captured.path);
      assertStorageWorkspaceContext(captured.workspace);
      if (content === plan.before.content) return { status: 'failed', written: false, reason: String(error.message || error) };
      return { status: 'uncertain', written: content === plan.candidateContent ? true : null, reason: String(error.message || error) };
    } catch {
      return { status: 'uncertain', written: null, reason: String(error.message || error) };
    }
  }
}
