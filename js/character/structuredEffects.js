import * as PageRepository from '../repository/pageRepository.js';
import { parsePageRecordContent, arePageStateIdentitiesEqual, createPageStateIdentityFromContent } from '../core/pageRecord.js';
import { canonicalJSON, assertJSONData } from '../core/pageVariablesCodec.js';
import { deepCloneData, deepFreeze } from '../cardTypes/definitionIdentity.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from '../storage/cardTypeCatalogStorage.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext } from '../storage/storageAdapter.js';
import { prepareVariablesChange, commitVariablesChange, readEntity } from '../variables/entityVariables.js';
import { OWN_EFFECTS_KEY, encodeOwnEffects } from './ownEffectsDefinition.js';
import { readOwnEffectsSource } from './ownEffectsSource.js';
import { createSerializableEffectsData } from './effectsModel.js';

export const EFFECTS_ERROR_CODES = Object.freeze({ SOURCE_UNAVAILABLE: 'EFFECTS_SOURCE_UNAVAILABLE',
  INVALID_REQUEST: 'EFFECTS_INVALID_REQUEST', WRITE_BLOCKED: 'EFFECTS_WRITE_BLOCKED', READBACK_UNCERTAIN: 'EFFECTS_READBACK_UNCERTAIN' });
const plans = new WeakMap();
export async function prepareEffectsContext({ page, repository = PageRepository, workspaceContext = null } = {}) {
  if (parsePageRecordContent(page?.content || '').variablesStatus.mode === 'legacy') return { mode: 'legacy', repository };
  try {
    const workspace = workspaceContext || captureStorageWorkspaceContext();
    assertStorageWorkspaceContext(workspace);
    const catalog = await readCardTypeCatalog({ storageAdapter: workspace.adapter });
    assertStorageWorkspaceContext(workspace);
    if (!catalog.exists) throw new Error('activated-catalog-missing');
    return { mode: 'source-aware', repository, workspaceContext: workspace, catalogIdentity: catalog.identity,
      registry: createCardTypeRegistryFromCatalog(catalog.catalog, { bundledTypes: [], bundledFieldSets: [] }) };
  } catch (error) { return { mode: 'unavailable', repository, reason: error.message }; }
}
const domainError = (code, message) => Object.assign(new Error(message), { code });
export function prepareStructuredEffectsChange({ pageId, expectedBase, effects, context } = {}) {
  const page = context?.repository?.getPageById(pageId);
  const before = readOwnEffectsSource(page, context);
  if (before.source !== 'entity' || before.status !== 'ready') throw domainError(EFFECTS_ERROR_CODES.SOURCE_UNAVAILABLE, 'explicit-own-effects-required');
  try { assertJSONData(effects); } catch { throw domainError(EFFECTS_ERROR_CODES.INVALID_REQUEST, 'data-only-own-effects-required'); }
  if (!effects || !Array.isArray(effects.conditions) || !Array.isArray(effects.effects) || !Array.isArray(effects.selectedRuleIds)) {
    throw domainError(EFFECTS_ERROR_CODES.INVALID_REQUEST, 'own-effects-payload-required');
  }
  let value;
  try {
    if (effects.kind === 'EffectsModel' && !['entity', 'manual', 'empty', 'effects-data'].includes(effects.source)) throw new Error('aggregate-effects-forbidden');
    value = encodeOwnEffects(createSerializableEffectsData(effects));
  } catch { throw domainError(EFFECTS_ERROR_CODES.INVALID_REQUEST, 'invalid-own-effects'); }
  // Prepare even no-ops through the generic boundary to retain source/base guards.
  let variables;
  try { variables = prepareVariablesChange({ pageId, expectedBase, context, patch: [{ op: 'set', key: OWN_EFFECTS_KEY, value }] }); }
  catch (error) { throw Object.assign(domainError(error.issues ? EFFECTS_ERROR_CODES.INVALID_REQUEST : EFFECTS_ERROR_CODES.WRITE_BLOCKED, error.message), { issues: error.issues }); }
  const after = readOwnEffectsSource({ ...page, content: variables.candidateContent }, { ...context,
    repository: { getPageById: id => id === pageId ? { ...page, content: variables.candidateContent } : context.repository.getPageById(id) } });
  if (after.source !== 'entity') throw domainError(EFFECTS_ERROR_CODES.INVALID_REQUEST, 'invalid-own-effects-candidate');
  const plan = deepFreeze(deepCloneData({ pageId, before, after, expectedBase, variables,
    noOp: canonicalJSON(value) === canonicalJSON(variables.before.values[OWN_EFFECTS_KEY]),
    guards: variables.guards }));
  plans.set(plan, { context, variables, path: page.path, used: false });
  return plan;
}
export async function commitStructuredEffectsChange(plan) {
  const runtime = plans.get(plan);
  if (!runtime || runtime.used) return { status: 'blocked', written: false, code: EFFECTS_ERROR_CODES.WRITE_BLOCKED, reason: 'unknown-or-used-plan' };
  runtime.used = true;
  if (plan.noOp) {
    try {
      assertStorageWorkspaceContext(runtime.context.workspaceContext);
      const snapshot = readEntity(plan.pageId, runtime.context);
      const page = runtime.context.repository.getPageById(plan.pageId);
      if (page?.path !== runtime.path) throw new Error('Missing or moved Effects page');
      const durable = await runtime.context.workspaceContext.adapter.readText(runtime.path);
      const catalog = await readCardTypeCatalog({ storageAdapter: runtime.context.workspaceContext.adapter });
      assertStorageWorkspaceContext(runtime.context.workspaceContext);
      if (!arePageStateIdentitiesEqual(snapshot.pageIdentity, plan.expectedBase) ||
          snapshot.mode !== 'structured' || canonicalJSON(snapshot.definition) !== canonicalJSON(plan.variables.before.definition) ||
          !arePageStateIdentitiesEqual(createPageStateIdentityFromContent(durable), plan.expectedBase) ||
          canonicalJSON(catalog.identity) !== canonicalJSON(runtime.context.catalogIdentity)) throw new Error('Effects source changed');
      return { status: 'unchanged', written: false, after: plan.before };
    } catch (error) { return { status: 'blocked', written: false, code: EFFECTS_ERROR_CODES.WRITE_BLOCKED, reason: error.message }; }
  }
  const result = await commitVariablesChange(runtime.variables, { validateBeforeWrite: async () => {
    assertStorageWorkspaceContext(runtime.context.workspaceContext);
    const catalog = await readCardTypeCatalog({ storageAdapter: runtime.context.workspaceContext.adapter });
    if (canonicalJSON(catalog.identity) !== canonicalJSON(runtime.context.catalogIdentity)) throw new Error('Effects catalog changed');
  } });
  if (result.status !== 'saved') return { ...result, code: result.status === 'uncertain' ? EFFECTS_ERROR_CODES.READBACK_UNCERTAIN : EFFECTS_ERROR_CODES.WRITE_BLOCKED };
  try {
    assertStorageWorkspaceContext(runtime.context.workspaceContext);
    const snapshot = readEntity(plan.pageId, runtime.context);
    const after = readOwnEffectsSource(runtime.context.repository.getPageById(plan.pageId), runtime.context);
    if (after.source !== 'entity' || canonicalJSON(snapshot.values[OWN_EFFECTS_KEY]) !== canonicalJSON(plan.variables.after.values[OWN_EFFECTS_KEY]) ||
        canonicalJSON(createSerializableEffectsData(after)) !== canonicalJSON(createSerializableEffectsData(plan.after))) throw new Error('own-effects-domain-readback-mismatch');
    return { ...result, before: plan.before, after };
  } catch (error) {
    return { ...result, status: 'uncertain', written: true, code: EFFECTS_ERROR_CODES.READBACK_UNCERTAIN, reason: error.message };
  }
}
