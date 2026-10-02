import * as PageRepository from '../repository/pageRepository.js';
import { BUNDLED_CARD_TYPE_DEFINITIONS } from '../cardTypes/definitions/bundledDefinitions.js';
import { CardTypeRegistry } from '../cardTypes/cardTypeRegistry.js';
import { deepCloneData, deepFreeze } from '../cardTypes/definitionIdentity.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { createCardVariableSnapshot } from './cardVariableStore.js';
import { validateVariableValue } from '../schema/cardVariablesSchema.js';
import { updatePageRecordContent, createPageStateIdentityFromContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { CARD_TYPE_CATALOG_PATH, parseCardTypeCatalog, serializeCardTypeCatalog, createCatalogIdentity, readCardTypeCatalog, createCardTypeRegistryFromCatalog, activateCardTypeDefinitions } from '../storage/cardTypeCatalogStorage.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext, createContextBoundStorageAdapter } from '../storage/storageAdapter.js';
import { persistPageContentCommand } from '../storage/pageCommandService.js';
import { backupBytesDigest } from '../storage/backupDefinitionCoverage.js';
import { createOperationId, beginWorkspaceOperation, commitWorkspaceOperation, failWorkspaceOperation, OPERATION_JOURNAL_PENDING_DIR, OPERATION_JOURNAL_COMMITTED_DIR, OPERATION_JOURNAL_FAILED_DIR } from '../storage/operationJournal.js';
import { traverseTypedPage } from './typedPageTraversal.js';
import { state } from '../state.js';
import { getCurrentEditorPageBase, advanceEditorPageBase } from '../editor/editorSessionBase.js';
import { measureWorkspaceOperation, nowMs, recordWorkspacePerformance, yieldWorkspaceTurn } from '../performance/workspacePerformance.js';

const plans = new WeakMap();
export function assertCardTypeChangeCandidate(plan, beforeContent, content) {
  const captured = plans.get(plan);
  if (!captured?.used || plan.sourceContent !== beforeContent || plan.candidateContent !== content) throw new Error('Unapproved type-change candidate');
}
export async function prepareCardTypeChange({ pageId, targetType, expectedBase, restoreInactive = [], repository = PageRepository,
  workspaceContext = captureStorageWorkspaceContext() } = {}) {
  assertStorageWorkspaceContext(workspaceContext);
  const page = repository.getPageById(pageId);
  if (!page?.path || !expectedBase?.stateHash) throw new Error('Exact durable page/base required');
  const sourceContent = page.content;
  const sourcePath = page.path;
  const current = await measureWorkspaceOperation('type-change.prepare.catalog', () => readCardTypeCatalog({ storageAdapter: workspaceContext.adapter }));
  let phaseStart = nowMs();
  const sourceRegistry = createCardTypeRegistryFromCatalog(current.catalog, { bundledTypes: [], bundledFieldSets: [] });
  const source = createCardVariableSnapshot({ ...page, content: sourceContent }, sourceRegistry);
  if (source.mode !== 'structured' || source.diagnostics.some(issue => issue.severity === 'error') ||
      !arePageStateIdentitiesEqual(expectedBase, source.pageIdentity)) throw new Error('Unavailable/stale type-change source');
  recordWorkspacePerformance({ operation: 'type-change.prepare.source', durationMs: nowMs() - phaseStart, counts: { pages: 1 } });
  phaseStart = nowMs();
  const seed = BUNDLED_CARD_TYPE_DEFINITIONS.find(definition => definition.id === targetType);
  if (!seed) throw new Error('Unsupported formal target type');
  const activated = current.catalog.types.find(definition => definition.id === targetType && definition.version === seed.version);
  const targetClosure = activated ? [] : new CardTypeRegistry().getDefinitionClosure('type', seed.id, seed.version);
  const candidateFieldSets = targetClosure.filter(entry => entry.kind === 'fieldSet' &&
    !current.catalog.fieldSets.some(field => field.id === entry.identity.id && field.version === entry.identity.version)).map(entry => entry.definition);
  const registry = new CardTypeRegistry({ bundledTypes: [], bundledFieldSets: [],
    // Preview resolves the exact prospective activated catalog. Candidate source
    // provenance is transient and must not invalidate an otherwise exact closure
    // after the approved definition activation at commit.
    activatedTypes: [...current.catalog.types, ...(activated ? [] : [seed])],
    activatedFieldSets: [...current.catalog.fieldSets, ...candidateFieldSets] });
  const target = registry.getResolvedType(targetType, seed.version);
  const restorationCandidates = (source.inactive || []).flatMap((entry, index) =>
    entry.reason === 'type-change' && entry.origin?.type === targetType && entry.origin.version === target.version &&
    entry.origin.digest === target.digest && ['values', 'overrides'].includes(entry.path?.[0]) && target.fieldsByKey[entry.path[1]]
      ? [{ index, path: entry.path, value: entry.value }] : []);
  const envelope = deepCloneData(source.envelope);
  const inactive = envelope.inactive ||= [];
  const displace = (value, definition, path) => inactive.push({ status: 'incompatible-type', reason: 'type-change',
    origin: { type: source.type, version: source.schemaVersion, digest: source.schemaDigest }, path, definition: deepCloneData(definition), value: deepCloneData(value) });
  function compatible(value, oldField, newField, path) {
    if (!newField || !oldField || oldField.datatype !== newField.datatype || oldField.binding?.owner !== newField.binding?.owner ||
        Boolean(oldField.computed) !== Boolean(newField.computed)) { displace(value, oldField || { datatype: 'unknown' }, path); return undefined; }
    if (oldField.datatype === 'array' && canonicalJSON(oldField.items) !== canonicalJSON(newField.items)) {
      displace(value, oldField, path); return undefined;
    }
    if (value !== null && oldField.datatype === 'object') {
      const result = {};
      for (const [key, child] of Object.entries(value)) {
        const oldChild = oldField.properties?.find(field => field.key === key);
        const newChild = newField.properties?.find(field => field.key === key);
        const kept = compatible(child, oldChild, newChild, [...path, key]);
        if (kept !== undefined) result[key] = kept;
      }
      if (validateVariableValue(result, newField).ok) return result;
    } else if (validateVariableValue(value, newField).ok && (oldField.datatype !== 'reference' ||
      canonicalJSON(oldField.targetTypes || []) === canonicalJSON(newField.targetTypes || []))) return deepCloneData(value);
    displace(value, oldField, path); return undefined;
  }
  const extensions = [];
  const extensionFields = {};
  for (const entry of envelope.extensions?.fields || []) {
    const fields = entry.key ? [entry] : registry.getResolvedFieldSet(entry.id, entry.version).fields;
    const allowed = fields.every(field => !target.fieldsByKey[field.key]) &&
      (entry.id !== 'dnd.character-gameplay' || targetType === 'character') &&
      (entry.id !== 'dnd.own-effects' || ['player', 'character'].includes(targetType));
    if (allowed) { extensions.push(entry); for (const field of fields) extensionFields[field.key] = field; }
    else inactive.push({ status: 'preserved-inactive', reason: 'type-change-extension', originType: source.type, extension: entry });
  }
  if (envelope.extensions) envelope.extensions.fields = extensions;
  for (const collection of ['values', 'overrides']) {
    const result = {};
    for (const [key, value] of Object.entries(envelope[collection] || {})) {
      const oldField = source.definition.fieldsByKey[key];
      const newField = target.fieldsByKey[key] || extensionFields[key];
      if (collection === 'overrides' && !newField?.computed?.allowOverride) { displace(value, oldField || { datatype: 'unknown' }, [collection, key]); continue; }
      const kept = compatible(value, oldField, newField, [collection, key]);
      if (kept !== undefined) result[key] = kept;
    }
    envelope[collection] = result;
  }
  envelope.schemaVersion = target.version; envelope.schemaDigest = target.digest;
  // Explicit restoration never replaces a new active value, even when it looks compatible.
  if (!Array.isArray(restoreInactive) || new Set(restoreInactive).size !== restoreInactive.length) throw new Error('Invalid inactive restoration selection');
  for (const index of restoreInactive) {
    const candidate = restorationCandidates.find(entry => entry.index === index);
    if (!candidate) throw new Error('Inactive origin is not the exact target definition');
    let parent = envelope;
    for (const key of candidate.path.slice(0, -1)) {
      if (!Object.hasOwn(parent, key)) parent[key] = {};
      if (!parent[key] || typeof parent[key] !== 'object' || Array.isArray(parent[key])) throw new Error('Inactive restoration conflicts with active value');
      parent = parent[key];
    }
    const key = candidate.path.at(-1);
    if (Object.hasOwn(parent, key)) throw new Error('Inactive restoration cannot overwrite active value');
    parent[key] = deepCloneData(candidate.value);
  }
  envelope.inactive = inactive.filter((_, index) => !restoreInactive.includes(index));
  if (envelope.migration) {
    envelope.inactive.push({ status: 'preserved-inactive', reason: 'type-change-migration-provenance', originPageId: pageId, migration: envelope.migration });
    delete envelope.migration;
  }
  const same = targetType === source.type && target.digest === source.schemaDigest && !restoreInactive.length;
  const candidateContent = same ? sourceContent : updatePageRecordContent(sourceContent, { type: targetType, variablesJson: envelope }, { preserveUnchangedMetadata: true });
  const candidate = createCardVariableSnapshot({ id: pageId, content: candidateContent }, registry);
  if (candidate.mode !== 'structured' || candidate.diagnostics.some(issue => issue.severity === 'error')) throw new Error('Target type constraints require review');
  recordWorkspacePerformance({ operation: 'type-change.prepare.candidate', durationMs: nowMs() - phaseStart, counts: { pages: 1 } });
  phaseStart = nowMs();
  const inbound = [];
  const diagnosticPages = repository.getAllPages();
  let batchStart = nowMs(), yields = 0;
  for (const other of diagnosticPages) {
    assertStorageWorkspaceContext(workspaceContext);
    traverseTypedPage(other, sourceRegistry, ({ value, field, path }) => {
    if (field.datatype === 'reference' && value?.pageId === pageId && field.targetTypes?.length && !field.targetTypes.includes(targetType))
      inbound.push({ pageId: other.id, sourceKey: path.join('.'), targetPageId: pageId, reason: 'incompatible-target-type' });
    });
    if (nowMs() - batchStart >= 8) { await yieldWorkspaceTurn(); yields++; batchStart = nowMs(); }
  }
  recordWorkspacePerformance({ operation: 'type-change.prepare.inbound', durationMs: nowMs() - phaseStart, counts: { pages: diagnosticPages.length, yields } });
  const plan = deepFreeze({ pageId, targetType, expectedBase, sourceContent, candidateContent,
    inactive: envelope.inactive, restorationCandidates, diagnostics: inbound, noop: same, sourceSchema: source.schemaDigest, targetSchema: target.digest });
  plans.set(plan, { used: false, path: sourcePath, repository, workspaceContext, catalogIdentity: current.identity,
    activation: activated ? [] : [seed], targetDefinition: canonicalJSON(candidate.definition),
    catalogTarget: activated ? null : serializeCardTypeCatalog({ ...current.catalog, revision: current.catalog.revision + 1,
      types: [...current.catalog.types, seed], fieldSets: [...current.catalog.fieldSets, ...candidateFieldSets] }) });
  return plan;
}

export async function commitCardTypeChange(plan, { confirm = false, onProgress = null } = {}) {
  const captured = plans.get(plan);
  if (!confirm || !captured || captured.used) return { status: 'blocked', written: false, reason: 'explicit-current-plan-required' };
  captured.used = true;
  const { workspaceContext: workspace, repository } = captured;
  const page = repository.getPageById(plan.pageId);
  let operation = null, stage = 'preflight', mutationStarted = false;
  const adapter = createContextBoundStorageAdapter(workspace);
  const progress = message => { try { onProgress?.(message); } catch { /* Presentation cannot change persistence outcome. */ } };
  const recoveryState = async () => {
    const classify = async owner => {
      try { const content = await adapter.readText(owner.before.path); return content === owner.before.content ? 'source' : content === owner.after.content ? 'target' : 'third'; }
      catch { return 'unreadable'; }
    };
    return operation ? { page: await classify({ before: operation.before.page, after: operation.after.page }),
      catalog: await classify({ before: operation.before.catalog, after: operation.after.catalog }) } : null;
  };
  try {
    progress('Проверка исходной карточки…');
    assertStorageWorkspaceContext(workspace);
    if (!page || page.path !== captured.path || await workspace.adapter.readText(page.path) !== plan.sourceContent) throw new Error('Stale/moved type-change page');
    if (state.currentPage?.id === page.id) {
      const { hasPendingAutosaveForPage } = await import('../editor/autosave.js');
      if (hasPendingAutosaveForPage(page.id) || !arePageStateIdentitiesEqual(getCurrentEditorPageBase(page.id), plan.expectedBase)) throw new Error('Pending/stale type-change editor');
    }
    const current = await readCardTypeCatalog({ storageAdapter: workspace.adapter });
    if (canonicalJSON(current.identity) !== canonicalJSON(captured.catalogIdentity)) throw new Error('Catalog changed');
    if (plan.noop) return { status: 'unchanged', written: false };
    stage = 'recovery-evidence'; progress('Проверка recovery-копии карточки…');
    operation = await measureWorkspaceOperation('type-change.scoped-recovery', async () => {
      const catalogSource = await adapter.readText(CARD_TYPE_CATALOG_PATH);
      if (canonicalJSON(createCatalogIdentity(parseCardTypeCatalog(catalogSource))) !== canonicalJSON(current.identity)) throw new Error('Catalog changed before recovery capture');
      const catalogTarget = captured.catalogTarget || catalogSource;
      const evidence = async (content, path) => ({ path, content, digest: await backupBytesDigest(content) });
      return beginWorkspaceOperation({ id: `${createOperationId('card-type-change')}-${crypto.randomUUID()}`, type: 'card-type-change', affectedPages: [page.id],
        before: { pageId: page.id, page: await evidence(plan.sourceContent, captured.path), catalog: await evidence(catalogSource, CARD_TYPE_CATALOG_PATH) },
        after: { page: await evidence(plan.candidateContent, captured.path), catalog: await evidence(catalogTarget, CARD_TYPE_CATALOG_PATH),
          recoveryOf: captured.recoveryOf || null } }, adapter, true);
    }, { counts: { pages: 1, assets: 0 } });
    // The verified journal is the durable before-image owner. Activation only
    // adds immutable definitions; recovery never downgrades the shared catalog.
    stage = 'catalog-activation'; progress('Проверка определения типа…');
    mutationStarted = captured.activation.length > 0;
    const committedCatalog = captured.activation.length
      ? await measureWorkspaceOperation('type-change.catalog-activation', () => activateCardTypeDefinitions({ types: captured.activation, expectedIdentity: current.identity,
        storageAdapter: workspace.adapter, workspaceContext: workspace, yieldIndexRefresh: true })) : current;
    if (canonicalJSON(committedCatalog.identity) !== canonicalJSON(createCatalogIdentity(parseCardTypeCatalog(operation.after.catalog.content)))) throw new Error('Unexpected activation identity');
    stage = 'page-write'; progress('Сохранение карточки…'); mutationStarted = true;
    const receipt = await measureWorkspaceOperation('type-change.page-command', () => persistPageContentCommand({ page, content: plan.candidateContent, type: 'change-card-type', expectedBase: plan.expectedBase,
      workspaceContext: workspace, typeChangePlan: plan,
      validateBeforeWrite: async () => {
        assertStorageWorkspaceContext(workspace);
        const durableCatalog = await readCardTypeCatalog({ storageAdapter: workspace.adapter });
        if (canonicalJSON(durableCatalog.identity) !== canonicalJSON(committedCatalog.identity)) throw new Error('Type-change catalog changed before write');
        const registry = createCardTypeRegistryFromCatalog(durableCatalog.catalog, { bundledTypes: [], bundledFieldSets: [] });
        const after = createCardVariableSnapshot({ id: plan.pageId, content: plan.candidateContent }, registry);
        if (canonicalJSON(after.definition) !== captured.targetDefinition) throw new Error('Type-change closure changed');
      },
      verifyPersistedContent: async () => {
        await measureWorkspaceOperation('type-change.durable-readback', async () => {
          assertStorageWorkspaceContext(workspace);
          if (await adapter.readText(page.path) !== plan.candidateContent) throw new Error('Type-change durable readback mismatch');
        });
      }
    }));
    if (receipt.writeStatus === 'saved' && state.currentPage?.id === page.id) advanceEditorPageBase(page);
    if (receipt.writeStatus !== 'saved') {
      operation.after.failureStage = stage;
      await failWorkspaceOperation(operation, receipt.blockReason || receipt.writeStatus, adapter, true);
      return { ...receipt, status: receipt.written ? 'uncertain' : 'blocked', operationId: operation.id, failedStage: stage,
        recoveryState: await recoveryState(), reason: receipt.blockReason || receipt.writeStatus };
    }
    stage = 'journal-commit'; progress('Подтверждение сохранения…');
    await measureWorkspaceOperation('type-change.journal-commit', () => commitWorkspaceOperation(operation, adapter, true));
    return { ...receipt, status: 'saved', operationId: operation.id };
  } catch (error) {
    if (operation) {
      operation.after.failureStage = stage;
      try { await failWorkspaceOperation(operation, error, adapter, true); } catch { /* Original verified pending evidence remains; no retry/rollback. */ }
    }
    let sourceUnchanged = false;
    try { sourceUnchanged = await adapter.readText(captured.path) === plan.sourceContent; } catch {}
    return { status: !mutationStarted ? 'blocked' : sourceUnchanged ? 'failed' : 'uncertain',
      written: !mutationStarted || sourceUnchanged ? false : null, operationId: operation?.id || null, failedStage: stage,
      recoveryState: await recoveryState(), reason: error.message };
  }
}

async function readTypeRecovery(operationId, workspace) {
  if (!/^[a-zA-Z0-9_-]+$/.test(operationId || '')) throw new Error('Invalid recovery operation id');
  const adapter = createContextBoundStorageAdapter(workspace);
  let entry;
  for (const directory of [OPERATION_JOURNAL_PENDING_DIR, OPERATION_JOURNAL_COMMITTED_DIR, OPERATION_JOURNAL_FAILED_DIR]) {
    try { entry = JSON.parse(await adapter.readText(`${directory}/${operationId}.json`)); break; }
    catch (error) { if (!(error.name === 'NotFoundError' || error.code === 'ENOENT' || /^missing /i.test(error.message))) throw error; }
  }
  if (entry?.version !== 1 || entry.type !== 'card-type-change' || entry.id !== operationId ||
      entry.affectedPages?.length !== 1 || entry.before?.pageId !== entry.affectedPages[0]) throw new Error('Unavailable type recovery record');
  for (const side of [entry.before, entry.after]) {
    if (side.page?.path !== entry.before.page?.path || side.catalog?.path !== CARD_TYPE_CATALOG_PATH ||
        !/^\/?pages\/[^/\\]+\.md$/.test(side.page?.path || '')) throw new Error('Unsafe type recovery path');
    for (const owner of [side.page, side.catalog]) if (typeof owner.content !== 'string' || await backupBytesDigest(owner.content) !== owner.digest) throw new Error('Type recovery evidence digest mismatch');
    parseCardTypeCatalog(side.catalog.content);
    const registry = createCardTypeRegistryFromCatalog(parseCardTypeCatalog(side.catalog.content), { bundledTypes: [], bundledFieldSets: [] });
    const snapshot = createCardVariableSnapshot({ id: entry.before.pageId, content: side.page.content }, registry);
    if (snapshot.mode !== 'structured' || snapshot.pageId !== entry.before.pageId || snapshot.diagnostics.some(issue => issue.severity === 'error')) throw new Error('Invalid type recovery source/target');
  }
  return entry;
}

export async function inspectCardTypeChangeRecovery(operationId, { workspaceContext = captureStorageWorkspaceContext(), repository = PageRepository } = {}) {
  const entry = await readTypeRecovery(operationId, workspaceContext), adapter = createContextBoundStorageAdapter(workspaceContext);
  const page = repository.getPageById(entry.before.pageId);
  if (!page || page.path !== entry.before.page.path) return { status: 'conflict', operationId, reason: 'Page missing/moved' };
  const content = await adapter.readText(page.path), catalog = await adapter.readText(CARD_TYPE_CATALOG_PATH);
  const pageState = content === entry.before.page.content ? 'source' : content === entry.after.page.content ? 'target' : 'third';
  const catalogState = catalog === entry.before.catalog.content ? 'source' : catalog === entry.after.catalog.content ? 'target' : 'third';
  // A newer additive catalog is allowed for page recovery only after independent
  // exact source-definition validation; it is never replaced by an old catalog.
  const registry = createCardTypeRegistryFromCatalog(parseCardTypeCatalog(catalog), { bundledTypes: [], bundledFieldSets: [] });
  const original = createCardVariableSnapshot({ id: page.id, content: entry.before.page.content }, registry);
  const valid = original.mode === 'structured' && !original.diagnostics.some(issue => issue.severity === 'error');
  return { status: pageState === 'third' || !valid ? 'conflict' : pageState === 'source' ? 'already-original' : 'recoverable',
    operationId, pageId: page.id, pageState, catalogState, runtimeCurrent: page.content === content };
}

export async function prepareCardTypeRecovery(operationId, { workspaceContext = captureStorageWorkspaceContext(), repository = PageRepository } = {}) {
  const inspected = await inspectCardTypeChangeRecovery(operationId, { workspaceContext, repository });
  if (!['recoverable', 'already-original'].includes(inspected.status) || !inspected.runtimeCurrent) throw new Error('Recovery conflict; reload current durable page before preview');
  const entry = await readTypeRecovery(operationId, workspaceContext), page = repository.getPageById(inspected.pageId);
  if (!page || page.path !== entry.before.page.path) throw new Error('Recovery page missing/moved');
  const sourceContent = page.content;
  if (sourceContent !== entry.before.page.content && sourceContent !== entry.after.page.content) throw new Error('Recovery third state; reload required');
  const current = await readCardTypeCatalog({ storageAdapter: workspaceContext.adapter });
  const registry = createCardTypeRegistryFromCatalog(current.catalog, { bundledTypes: [], bundledFieldSets: [] });
  const original = createCardVariableSnapshot({ id: page.id, content: entry.before.page.content }, registry);
  const plan = deepFreeze({ pageId: page.id, targetType: original.type, sourceContent, candidateContent: entry.before.page.content,
    expectedBase: createPageStateIdentityFromContent(sourceContent), noop: sourceContent === entry.before.page.content, recoveryOf: operationId });
  plans.set(plan, { used: false, path: entry.before.page.path, repository, workspaceContext, catalogIdentity: current.identity,
    activation: [], targetDefinition: canonicalJSON(original.definition), recoveryOf: operationId });
  return plan;
}
