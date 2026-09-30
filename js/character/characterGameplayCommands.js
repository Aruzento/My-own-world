import { readCharacterGameplay } from './characterGameplaySource.js';
import { CHARACTER_GAMEPLAY_ID, CHARACTER_GAMEPLAY_FIELD_SET, CHARACTER_GAMEPLAY_IDENTITY, CHARACTER_SKILLS_KEY, CHARACTER_DEATH_KEY } from './characterGameplayDefinition.js';
import { readEntity } from '../variables/entityVariables.js';
import { deepCloneData, deepFreeze, createDefinitionIdentity } from '../cardTypes/definitionIdentity.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { updatePageRecordContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { createCardVariableSnapshot } from '../variables/cardVariableStore.js';
import { persistPageContentCommand, snapshotPageForCommand } from '../storage/pageCommandService.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog, activateCardTypeDefinitions } from '../storage/cardTypeCatalogStorage.js';
import { assertStorageWorkspaceContext } from '../storage/storageAdapter.js';

const plans = new WeakMap();
// Only an explicit Character gameplay edit may activate this trusted definition.
export async function ensureCharacterGameplayCatalog(context) {
  assertStorageWorkspaceContext(context.workspaceContext);
  const current = await readCardTypeCatalog({ storageAdapter: context.workspaceContext.adapter });
  if (!current.exists || canonicalJSON(current.identity) !== canonicalJSON(context.catalogIdentity)) throw new Error('Catalog changed');
  const existing = current.catalog.fieldSets.find(entry => entry.id === CHARACTER_GAMEPLAY_ID && entry.version === 1);
  if (existing) {
    if (canonicalJSON(createDefinitionIdentity('fieldSet', existing)) !== canonicalJSON(CHARACTER_GAMEPLAY_IDENTITY)) throw new Error('Incompatible Character gameplay definition');
    return;
  }
  await activateCardTypeDefinitions({ fieldSets: [CHARACTER_GAMEPLAY_FIELD_SET], expectedIdentity: current.identity, workspaceContext: context.workspaceContext });
}

export function prepareCharacterGameplayActivation({ page, expectedBase, key, value, context }) {
  const before = readEntity(page.id, context);
  if (before.mode !== 'structured' || before.type !== 'character' || before.definition.definition.capabilities.characterProjection !== true ||
      before.diagnostics.some(issue => issue.severity === 'error') || readCharacterGameplay(before, context).status !== 'absent' ||
      ![CHARACTER_SKILLS_KEY, CHARACTER_DEATH_KEY].includes(key) || !arePageStateIdentitiesEqual(expectedBase, before.pageIdentity)) throw new Error('Character gameplay activation source unavailable/stale');
  if (canonicalJSON(createDefinitionIdentity('fieldSet', context.registry.getFieldSetDefinition(CHARACTER_GAMEPLAY_ID, 1))) !== canonicalJSON(CHARACTER_GAMEPLAY_IDENTITY) ||
      context.registry.getResolvedFieldSet(CHARACTER_GAMEPLAY_ID, 1).source !== 'activated') throw new Error('Exact activated Character gameplay definition required');
  assertStorageWorkspaceContext(context.workspaceContext);
  const envelope = deepCloneData(before.envelope);
  envelope.extensions = { ...(envelope.extensions || {}), revision: (envelope.extensions?.revision || 0) + 1,
    fields: [...(envelope.extensions?.fields || []), { id: CHARACTER_GAMEPLAY_ID, version: 1 }] };
  envelope.values[key] = deepCloneData(value);
  const candidateContent = updatePageRecordContent(before.content, { variablesJson: envelope }, { preserveUnchangedMetadata: true, updateTimestamp: false });
  const after = createCardVariableSnapshot({ ...page, content: candidateContent }, context.registry);
  if (after.mode !== 'structured' || after.diagnostics.some(issue => issue.severity === 'error') || readCharacterGameplay(after, context).status !== 'ready') throw new Error('Character gameplay candidate validation failed');
  const plan = deepFreeze({ kind: 'CharacterGameplayActivation', pageId: page.id, expectedBase, before, after, candidateContent });
  if (!page.path) throw new Error('Durable page required');
  plans.set(plan, { context, path: page.path, used: false });
  return plan;
}

export async function commitCharacterGameplayActivation(plan) {
  const captured = plans.get(plan);
  if (!captured || captured.used) return { status: 'blocked', written: false, reason: 'unknown-or-used-plan' };
  captured.used = true;
  const { context, path } = captured;
  try {
    assertStorageWorkspaceContext(context.workspaceContext);
    const page = context.repository.getPageById(plan.pageId);
    if (!page || page.path !== path) throw new Error('Missing/moved page');
    const receipt = await persistPageContentCommand({ page, content: plan.candidateContent, previousPage: snapshotPageForCommand(page),
      type: 'activate-character-gameplay', expectedBase: plan.expectedBase, workspaceContext: context.workspaceContext,
      validateBeforeWrite: async () => {
        assertStorageWorkspaceContext(context.workspaceContext);
        const current = await readCardTypeCatalog({ storageAdapter: context.workspaceContext.adapter });
        if (!current.exists || canonicalJSON(current.identity) !== canonicalJSON(context.catalogIdentity)) throw new Error('Catalog changed');
        const registry = createCardTypeRegistryFromCatalog(current.catalog, { bundledTypes: [], bundledFieldSets: [] });
        const snapshot = createCardVariableSnapshot({ ...page, content: plan.candidateContent }, registry);
        if (snapshot.diagnostics.some(issue => issue.severity === 'error') || canonicalJSON(snapshot.definition) !== canonicalJSON(plan.after.definition)) throw new Error('Schema closure changed');
      },
      verifyPersistedContent: async () => {
        assertStorageWorkspaceContext(context.workspaceContext);
        const content = await context.workspaceContext.adapter.readText(path);
        if (content !== plan.candidateContent) throw new Error('Character gameplay readback mismatch');
        const snapshot = createCardVariableSnapshot({ id: plan.pageId, content }, context.registry);
        if (readCharacterGameplay(snapshot, context).status !== 'ready') throw new Error('Character gameplay domain readback unavailable');
        assertStorageWorkspaceContext(context.workspaceContext);
      } });
    return { ...receipt, status: receipt.writeStatus === 'saved' ? 'saved' : receipt.written ? 'uncertain' : 'blocked' };
  } catch (error) {
    try {
      assertStorageWorkspaceContext(context.workspaceContext);
      const content = await context.workspaceContext.adapter.readText(path);
      return { status: content === plan.before.content ? 'failed' : 'uncertain', written: content === plan.before.content ? false : content === plan.candidateContent ? true : null, reason: error.message };
    } catch { return { status: 'uncertain', written: null, reason: error.message }; }
  }
}
