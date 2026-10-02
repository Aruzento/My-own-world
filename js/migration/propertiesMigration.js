import * as PageRepository from '../repository/pageRepository.js';
import { parsePageRecordContent, createPageStateIdentityFromContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { deepCloneData, deepFreeze } from '../cardTypes/definitionIdentity.js';
import { preparePropertiesMigration, previewPropertiesMigration, materializeMigrationCandidate } from './propertiesMigrationPlan.js';
import { createWorkspaceBackup, consumeCreatedBackupVerification, restoreWorkspaceBackup } from '../storage/backupService.js';
import { collectWorkspaceFiles } from '../storage/backupDefinitionCoverage.js';
import { readCardTypeCatalog, activateCardTypeDefinitions, createCardTypeRegistryFromCatalog } from '../storage/cardTypeCatalogStorage.js';
import { BUNDLED_CARD_TYPE_DEFINITIONS } from '../cardTypes/definitions/bundledDefinitions.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext, createContextBoundStorageAdapter } from '../storage/storageAdapter.js';
import { beginWorkspaceOperation, commitWorkspaceOperation, failWorkspaceOperation, createOperationId } from '../storage/operationJournal.js';
import { persistPageContentCommand, snapshotPageForCommand } from '../storage/pageCommandService.js';
import { createCardVariableSnapshot } from '../variables/cardVariableStore.js';
import { assertSchemaUpgradeAllowed } from '../schema/schemaUpgradeGate.js';

// No startup/UI hook: explicit orchestration foundation until all writers cut over.
const previews = new WeakMap();
let running = false;

export async function previewLegacyPropertiesMigration({ pageIds, repository = PageRepository,
  workspaceContext = captureStorageWorkspaceContext(), ...reader } = {}) {
  assertStorageWorkspaceContext(workspaceContext);
  const adapter = createContextBoundStorageAdapter(workspaceContext);
  const allPages = await readMigrationWorkspacePages(adapter);
  const selected = pageIds ? allPages.filter(page => pageIds.includes(page.id)) : allPages;
  if (pageIds?.some(id => !selected.some(page => page.id === id))) throw new Error('Missing selected page');
  const { catalog } = await readCardTypeCatalog({ storageAdapter: adapter });
  const registry = createCardTypeRegistryFromCatalog(catalog);
  const activatedRegistry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
  const plans = await Promise.all(selected.map(page => preparePropertiesMigration(page, { ...reader, pages: allPages,
    registry: page.variablesStatus.mode === 'legacy' ? registry : activatedRegistry })));
  const preview = deepFreeze({ version: 1, plans, summary: previewPropertiesMigration(plans) });
  previews.set(preview, { adapter, workspaceContext, repository, allPages });
  return preview;
}

async function readMigrationWorkspacePages(adapter) {
  const allPages = [];
  for (const file of await collectWorkspaceFiles(adapter, 'pages')) {
    if (!file.name.endsWith('.md')) continue;
    const content = await adapter.readText(file.path);
    const record = parsePageRecordContent(content, { generateId: false });
    allPages.push({ ...record, ...file, content });
  }
  if (new Set(allPages.map(page => page.id)).size !== allPages.length) throw new Error('Duplicate page identity');
  return allPages;
}

export async function executeLegacyPropertiesMigration(preview, { confirm = false, onProgress = null } = {}) {
  const context = previews.get(preview);
  if (!confirm || !context || context.used) throw new Error('Explicit confirmation of current unused preview required');
  if (running) throw new Error('Migration operation already running');
  context.used = true;
  running = true;
  let journal = context.journal || null;
  let backupId = journal?.before.backupId || null;
  let stage = 'backup';
  const completed = [];
  try {
    const plans = preview.plans.filter(plan => plan.status === 'ready');
    if (!plans.length) return { status: 'skipped', preview: preview.summary, completed };
    const { adapter, workspaceContext } = context;
    assertStorageWorkspaceContext(workspaceContext);
    const operationId = journal?.id || `${createOperationId('properties-migration')}-${crypto.randomUUID()}`;
    const currentPages = await readMigrationWorkspacePages(adapter);
    const backup = journal ? { id: backupId } : await createWorkspaceBackup({ storageAdapter: adapter, pages: currentPages,
      definitionCoverage: true, includeAssets: true, cleanup: false, id: operationId, reason: 'properties-migration', onProgress });
    backupId = backup.id;
    const verified = context.verified || await consumeCreatedBackupVerification(backup, { storageAdapter: adapter, definitionCoverage: true, onProgress });
    for (const plan of plans) {
      const page = context.allPages.find(page => page.id === plan.pageId);
      if (verified.pageContents[page.name] !== plan.sourceContent) throw new Error('Backup does not match preview source');
    }
    assertSchemaUpgradeAllowed({ validation: { errors: plans.flatMap(plan => plan.issues), warnings: [] },
      backupManifest: verified.manifest, upgradeName: 'CTV Properties migration v1' });
    journal = await beginWorkspaceOperation(journal || { id: operationId, type: 'properties-migration', affectedPages: plans.map(plan => plan.pageId),
      before: { backupId: backup.id, resumedFrom: context.resumedFrom || null, pages: plans.map(plan => ({ pageId: plan.pageId, path: plan.path, identity: plan.expectedBase })) },
      after: { pages: plans.map(plan => ({ pageId: plan.pageId, path: plan.path, identity: materializeMigrationCandidate(plan, { operationId, backupId: backup.id }).identity,
        targetType: plan.targetType, digest: plan.schemaDigest, status: 'pending' })) } }, adapter, true);
    stage = 'catalog';
    onProgress?.({ label: 'Миграция', stage: 'применение', current: 0, total: plans.length });
    const current = await readCardTypeCatalog({ storageAdapter: adapter });
    await activateCardTypeDefinitions({ types: BUNDLED_CARD_TYPE_DEFINITIONS.filter(type => plans.some(plan => plan.targetType === type.id)),
      expectedIdentity: current.identity, storageAdapter: adapter });
    for (const plan of plans) {
      stage = `page:${plan.pageId}`;
      await commitMigrationPage(plan, journal, context);
      completed.push(plan.pageId);
      onProgress?.({ label: 'Миграция', stage: 'страницы', current: completed.length, total: plans.length });
      journal.after.pages.find(entry => entry.pageId === plan.pageId).status = 'verified';
      journal = await beginWorkspaceOperation(journal, adapter, true);
    }
    await commitWorkspaceOperation(journal, adapter, true);
    return { status: preview.plans.some(plan => plan.status === 'blocked') ? 'partial' : 'completed', operationId,
      backupId: backup.id, completed, preview: preview.summary };
  } catch (error) {
    if (journal) {
      journal.after.failureStage = stage;
      try { await failWorkspaceOperation(journal, error, context.adapter, true); }
      catch (journalError) { return { status: 'failed', stage, reason: error.message, journalError: journalError.message, completed, backupId, operationId: journal.id }; }
    }
    return { status: 'failed', stage, reason: error.message, completed, backupId, operationId: journal?.id || null };
  } finally { running = false; }
}

async function commitMigrationPage(plan, journal, context) {
  const { adapter, workspaceContext, repository } = context;
  assertStorageWorkspaceContext(workspaceContext);
  const page = repository.getPageById(plan.pageId);
  if (!page || page.path.replace(/^\//, '') !== plan.path.replace(/^\//, '')) throw new Error('Missing/moved runtime page');
  const candidate = materializeMigrationCandidate(plan, { operationId: journal.id, backupId: journal.before.backupId });
  const result = await persistPageContentCommand({ page, content: candidate.content, previousPage: snapshotPageForCommand(page),
    type: 'migrate-legacy-properties', expectedBase: plan.expectedBase, workspaceContext,
    validateBeforeWrite: async () => {
      if (await adapter.readText(plan.path) !== plan.sourceContent) throw new Error('Stale migration source');
      const { catalog, exists } = await readCardTypeCatalog({ storageAdapter: adapter });
      if (!exists) throw new Error('Missing activated catalog');
      const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
      const snapshot = createCardVariableSnapshot({ id: plan.pageId, content: candidate.content }, registry);
      if (snapshot.mode !== 'structured' || snapshot.schemaDigest !== plan.schemaDigest || snapshot.diagnostics.some(issue => issue.severity === 'error')) throw new Error('Changed/invalid definition closure');
      for (const reference of plan.referenceGuards) {
        if (!reference.path) throw new Error('Reference target lacks durable path');
        const target = parsePageRecordContent(await adapter.readText(reference.path), { generateId: false });
        if (target.id !== reference.pageId || !reference.targetTypes.includes(target.type)) throw new Error('Reference target changed');
      }
    },
    verifyPersistedContent: async () => {
      if (await adapter.readText(plan.path) !== candidate.content) throw new Error('Migration readback uncertain');
    }
  });
  if (result.writeStatus !== 'saved') throw new Error(`Migration write ${result.writeStatus || 'uncertain'}`);
}

// Reads durable files, never replays journal values. A new preview is required for
// original-source pages. Verified target receipt permits skip even after restart.
export async function inspectPropertiesMigrationResume(journal, { workspaceContext = captureStorageWorkspaceContext() } = {}) {
  const adapter = createContextBoundStorageAdapter(workspaceContext);
  const result = [];
  for (const source of journal.before.pages) {
    let content;
    try { content = await adapter.readText(source.path); }
    catch { result.push({ pageId: source.pageId, status: 'conflict' }); continue; }
    const identity = createPageStateIdentityFromContent(content);
    const target = journal.after.pages.find(page => page.pageId === source.pageId);
    const receipt = parsePageRecordContent(content).variablesJson?.migration;
    const status = arePageStateIdentitiesEqual(identity, source.identity) ? 'repreview' :
      arePageStateIdentitiesEqual(identity, target.identity) && receipt?.operationId === journal.id &&
      receipt?.backupId === journal.before.backupId && receipt?.target?.digest === target.digest ? 'verified-skip' : 'conflict';
    result.push({ pageId: source.pageId, status });
  }
  return deepFreeze(deepCloneData(result));
}

export async function resumeLegacyPropertiesMigration(journal, options = {}) {
  const states = await inspectPropertiesMigrationResume(journal, options);
  if (states.some(page => page.status === 'conflict')) return { status: 'conflict', pages: states, backupId: journal.before.backupId };
  const pageIds = states.filter(page => page.status === 'repreview').map(page => page.pageId);
  if (!pageIds.length) return { status: 'verified-skip', pages: states, backupId: journal.before.backupId };
  const preview = await previewLegacyPropertiesMigration({ ...options, pageIds });
  for (const plan of preview.plans) {
    const original = journal.before.pages.find(page => page.pageId === plan.pageId);
    if (!arePageStateIdentitiesEqual(original.identity, plan.expectedBase)) return { status: 'conflict', pageId: plan.pageId };
    const target = journal.after.pages.find(page => page.pageId === plan.pageId);
    const candidate = materializeMigrationCandidate(plan, { operationId: journal.id, backupId: journal.before.backupId });
    if (!target || !arePageStateIdentitiesEqual(target.identity, candidate.identity)) return { status: 'conflict', pageId: plan.pageId, reason: 'Migration target reconstruction changed' };
  }
  const context = previews.get(preview);
  const { verifyWorkspaceBackup } = await import('../storage/backupService.js');
  context.verified = await verifyWorkspaceBackup(journal.before.backupId, { storageAdapter: context.adapter, definitionCoverage: true, onProgress: options.onProgress });
  context.journal = journal;
  if (!options.confirm) return { status: 'preview', preview };
  return executeLegacyPropertiesMigration(preview, { confirm: true, onProgress: options.onProgress });
}

export async function recoverLegacyPropertiesMigration(backupId, { confirm = false, onProgress = null, workspaceContext = captureStorageWorkspaceContext() } = {}) {
  if (!confirm || running) throw new Error('Explicit recovery confirmation and idle migration required');
  running = true;
  try {
    const adapter = createContextBoundStorageAdapter(workspaceContext);
    const current = await readMigrationWorkspacePages(adapter);
    return await restoreWorkspaceBackup(backupId, adapter, { definitionCoverage: true, preRestorePages: current, onProgress });
  } finally { running = false; }
}
