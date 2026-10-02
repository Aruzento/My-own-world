import * as PageRepository from '../repository/pageRepository.js';
import { state } from '../state.js';
import { parsePageRecordContent, createPageStateIdentityFromContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { deepFreeze } from '../cardTypes/definitionIdentity.js';
import { readEntity, getValue, prepareVariablesChange, commitVariablesChange } from '../variables/entityVariables.js';
import { readInventoryModelFromPage } from '../character/inventoryModel.js';
import { readCharacterModelFromPage } from '../character/characterModel.js';
import { planInventoryAdoption } from './inventoryAdoptionPlan.js';
import { createWorkspaceBackup, consumeCreatedBackupVerification, verifyWorkspaceBackup, restoreWorkspaceBackup, BACKUP_ROOT_DIR } from '../storage/backupService.js';
import { collectWorkspaceFiles } from '../storage/backupDefinitionCoverage.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog, CARD_TYPE_CATALOG_PATH } from '../storage/cardTypeCatalogStorage.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext, createContextBoundStorageAdapter } from '../storage/storageAdapter.js';
import { beginWorkspaceOperation, commitWorkspaceOperation, failWorkspaceOperation, createOperationId, OPERATION_JOURNAL_ROOT } from '../storage/operationJournal.js';
import { getCurrentEditorPageBase, advanceEditorPageBase } from '../editor/editorSessionBase.js';

// Explicit programmatic Foundation API. No startup/open hook or rollout UI.
const previews = new WeakMap();
let running = false;

export async function previewInventoryAdoption({ pageIds, repository = PageRepository,
  workspaceContext = captureStorageWorkspaceContext(), ...reader } = {}) {
  assertStorageWorkspaceContext(workspaceContext);
  const adapter = createContextBoundStorageAdapter(workspaceContext);
  const pages = await readPages(adapter);
  const current = await readCardTypeCatalog({ storageAdapter: adapter });
  const registry = createCardTypeRegistryFromCatalog(current.catalog, { bundledTypes: [], bundledFieldSets: [] });
  const preview = planInventoryAdoption(pages, { registry, pageIds, ...reader });
  assertStorageWorkspaceContext(workspaceContext);
  previews.set(preview, { adapter, workspaceContext, repository, registry, pages, reader, catalogIdentity: current.identity,
    expected: new Map(pages.map(page => [page.path, page.content])), used: false });
  return preview;
}

export async function executeInventoryAdoption(preview, { confirm = false, onProgress = null } = {}) {
  const context = previews.get(preview);
  if (!confirm || !context || context.used) throw new Error('Explicit confirmation of live unused preview required');
  if (running) throw new Error('Inventory adoption already running');
  context.used = true;
  running = true;
  let journal = context.journal || null;
  let backupId = journal?.before.backupId || null;
  let operationId = journal?.id || null;
  let stage = 'preflight';
  const completedItems = [], completedActors = [];
  let uncertainPage = null;
  try {
    if (!preview.pages.length) return { status: 'skipped', summary: preview.summary, completedItems, completedActors };
    await guardWorkspace(context);
    for (const page of preview.pages) {
      await guardEditor(page, context);
      const runtime = context.repository.getPageById(page.pageId);
      if (!runtime || normalizePath(runtime.path) !== page.path || runtime.content !== context.expected.get(page.path)) {
        throw new Error('Reload missing/moved/stale runtime page before adoption/resume');
      }
    }
    operationId ||= `${createOperationId('inventory-adoption')}-${crypto.randomUUID()}`;
    stage = 'backup';
    let verified = context.verified;
    if (!journal) {
      const backup = await createWorkspaceBackup({ storageAdapter: context.adapter, pages: context.pages,
        id: operationId, reason: 'inventory-adoption', definitionCoverage: true, includeAssets: true, cleanup: false, onProgress });
      backupId = backup.id;
      verified = await consumeCreatedBackupVerification(backup, { storageAdapter: context.adapter });
    }
    if (!verified) throw new Error('Verified backup evidence required');
    // Full source coverage, not stale repository/cache data. Resume retains the
    // original verified snapshot and reconstructs candidates from those bytes.
    for (const page of context.pages) if (verified.pageContents[page.name] !== page.content) throw new Error('Backup source mismatch');
    await guardWorkspace(context);
    stage = 'journal';
    if (!journal) journal = await beginWorkspaceOperation({ id: operationId, type: 'inventory-adoption',
      affectedPages: preview.pages.map(page => page.pageId), before: { backupId, selectedActorIds: preview.selectedActorIds,
        catalogIdentity: context.catalogIdentity, workspacePages: context.pages.map(page => ({ pageId: page.id, path: page.path,
          identity: createPageStateIdentityFromContent(page.content) })),
        pages: preview.pages.map(page => ({ pageId: page.pageId, path: page.path, identity: page.sourceIdentity })) },
      after: { dependencies: preview.actors.filter(actor => actor.status === 'ready').map(actor => ({ pageId: actor.pageId, items: actor.items })),
        pages: preview.pages.map(page => ({ pageId: page.pageId, path: page.path, role: page.role, identity: page.targetIdentity,
          schema: page.schema, status: 'pending' })) } }, context.adapter, true);
    else journal = await beginWorkspaceOperation(journal, context.adapter, true);
    for (const page of preview.pages) {
      stage = `${page.role}:${page.pageId}`;
      onProgress?.({ label: 'Inventory', stage: 'применение', current: completedItems.length + completedActors.length, total: preview.pages.length });
      await guardWorkspace(context);
      if (page.role === 'actor') await verifyDependencies(preview, page.pageId, context);
      if (context.expected.get(page.path) !== page.targetContent) {
        await guardEditor(page, context);
        const runtime = context.repository.getPageById(page.pageId);
        if (!runtime || normalizePath(runtime.path) !== page.path || runtime.content !== page.sourceContent) throw new Error('Missing/moved/stale runtime page');
        const plan = prepareVariablesChange({ pageId: page.pageId, expectedBase: page.sourceIdentity, patch: page.patch, preserveUnchangedMetadata: true,
          context: { registry: context.registry, repository: context.repository, workspaceContext: context.workspaceContext } });
        if (plan.candidateContent !== page.targetContent) throw new Error('Candidate differs from immutable preview');
        const committed = await commitVariablesChange(plan, { validateBeforeWrite: async () => {
          await guardWorkspace(context);
          await guardEditor(page, context);
          if (page.role === 'actor') await verifyDependencies(preview, page.pageId, context);
        } });
        if (committed.status !== 'saved') {
          uncertainPage = { pageId: page.pageId, status: committed.status, written: committed.written };
          throw new Error(`Inventory adoption write ${committed.status}: ${committed.reason || ''}`);
        }
        context.expected.set(page.path, page.targetContent);
      }
      try { await verifyPage(preview, page, context); }
      catch (error) { uncertainPage = { pageId: page.pageId, status: 'uncertain', written: true }; throw error; }
      (page.role === 'item' ? completedItems : completedActors).push(page.pageId);
      if (state.currentPage?.id === page.pageId) advanceEditorPageBase(context.repository.getPageById(page.pageId));
      journal.after.pages.find(entry => entry.pageId === page.pageId).status = 'verified';
      stage = `checkpoint:${page.pageId}`;
      journal = await beginWorkspaceOperation(journal, context.adapter, true);
    }
    stage = 'journal-completion';
    await guardWorkspace(context);
    await commitWorkspaceOperation(journal, context.adapter, true);
    return { status: preview.summary.blockedActors ? 'partial' : 'completed', operationId: journal.id, backupId,
      completedItems, completedActors, summary: preview.summary };
  } catch (error) {
    let journalError = null;
    if (journal) {
      journal.after.failureStage = stage;
      journal.after.uncertainPage = uncertainPage;
      try { await failWorkspaceOperation(journal, error, context.adapter, true); }
      catch (failure) { journalError = failure.message; }
    }
    return { status: uncertainPage?.status === 'uncertain' ? 'uncertain' : 'failed', stage, reason: error.message,
      completedItems, completedActors, backupId, operationId, uncertainPage, journalError };
  } finally { running = false; }
}

async function guardWorkspace(context) {
  assertStorageWorkspaceContext(context.workspaceContext);
  const current = await readCardTypeCatalog({ storageAdapter: context.adapter });
  if (!current.exists || canonicalJSON(current.identity) !== canonicalJSON(context.catalogIdentity)) throw new Error('Activated catalog changed/unavailable');
  const pages = await readPages(context.adapter);
  if (pages.length !== context.pages.length || pages.some(page => context.expected.get(page.path) !== page.content)) {
    throw new Error('Workspace Inventory dependency/source changed');
  }
  assertStorageWorkspaceContext(context.workspaceContext);
}

async function guardEditor(page, context) {
  if (state.currentPage?.id !== page.pageId) return;
  const { hasPendingAutosaveForPage } = await import('../editor/autosave.js');
  if (hasPendingAutosaveForPage(page.pageId)) throw new Error('Pending editor body save');
  const base = getCurrentEditorPageBase(page.pageId);
  if (!base || !arePageStateIdentitiesEqual(base, createPageStateIdentityFromContent(context.expected.get(page.path)))) {
    throw new Error('Stale editor session');
  }
}

async function verifyDependencies(preview, actorId, context) {
  for (const ref of preview.actors.find(actor => actor.pageId === actorId).items) {
    const item = preview.items.find(item => item.pageId === ref.pageId);
    const pages = await readPages(context.adapter);
    const snapshot = readEntity(ref.pageId, { registry: context.registry, repository: pageRepository(pages) });
    if (snapshot.mode !== 'structured' || snapshot.type !== 'item' || snapshot.diagnostics.some(issue => issue.severity === 'error') ||
        getValue(snapshot, 'item.quantity', 'stored').value !== item.targetQuantity) throw new Error('Item dependency not durable verified');
  }
}

async function verifyPage(preview, planned, context) {
  const pages = await readPages(context.adapter);
  const page = pages.find(page => page.id === planned.pageId);
  if (!page || page.path !== planned.path || page.content !== planned.targetContent ||
      page.rawBody !== parsePageRecordContent(planned.sourceContent).rawBody) throw new Error('Durable adoption readback/preservation mismatch');
  const source = { registry: context.registry, repository: pageRepository(pages), pages };
  const snapshot = readEntity(page.id, source);
  if (snapshot.mode !== 'structured' || snapshot.type !== planned.schema.type || snapshot.schemaDigest !== planned.schema.digest ||
      snapshot.diagnostics.some(issue => issue.severity === 'error')) throw new Error('Durable Entity source mismatch');
  if (planned.role === 'item') {
    if (getValue(snapshot, 'item.quantity', 'stored').value !== preview.items.find(item => item.pageId === page.id).targetQuantity) throw new Error('Durable quantity mismatch');
  } else {
    const actor = preview.actors.find(actor => actor.pageId === page.id);
    if (canonicalJSON(getValue(snapshot, 'dnd.items', 'stored').value) !== canonicalJSON(actor.items) ||
        canonicalJSON(getValue(snapshot, 'dnd.equippedItems', 'stored').value) !== '[]') throw new Error('Durable actor membership mismatch');
    const expected = actor.quantities.map(item => [item.pageId, item.quantity]);
    for (const inventory of [readInventoryModelFromPage(page, source), readCharacterModelFromPage(page, source).inventory]) {
      if (inventory.source !== 'entity' || inventory.status !== 'ready' ||
          canonicalJSON(inventory.items.map(item => [item.pageId, item.quantity])) !== canonicalJSON(expected)) throw new Error('Durable Inventory projection mismatch');
    }
  }
}

// Resume reconstructs plans from verified original backup, not journal patches.
// Every durable file must be exactly the source or recomputed target. Third state
// (including a new consumer) conflicts before any write; Items still precede actors.
export async function inspectInventoryAdoptionResume(operationId, options = {}) {
  try {
    const { preview, context, journal } = await prepareResume(operationId, options);
    return deepFreeze({ status: 'ready', operationId, backupId: journal.before.backupId,
      pages: preview.pages.map(page => ({ pageId: page.pageId, role: page.role,
        status: context.expected.get(page.path) === page.targetContent ? 'verified-skip' : 'pending' })) });
  } catch (error) { return { status: 'conflict', reason: error.message, operationId }; }
}

export async function resumeInventoryAdoption(operationId, { confirm = false, ...options } = {}) {
  try {
    const { preview } = await prepareResume(operationId, options);
    if (!confirm) return { status: 'preview', preview };
    return await executeInventoryAdoption(preview, { confirm: true, onProgress: options.onProgress });
  } catch (error) { return { status: 'conflict', operationId, reason: error.message }; }
}

async function prepareResume(operationId, { workspaceContext = captureStorageWorkspaceContext(), repository = PageRepository, ...reader } = {}) {
  if (typeof operationId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(operationId)) throw new Error('Invalid operation identity');
  assertStorageWorkspaceContext(workspaceContext);
  const adapter = createContextBoundStorageAdapter(workspaceContext);
  let journal;
  for (const directory of ['failed', 'pending', 'committed']) {
    let content;
    try { content = await adapter.readText(`${OPERATION_JOURNAL_ROOT}/${directory}/${operationId}.json`); } catch { continue; }
    journal = JSON.parse(content); break;
  }
  if (journal?.type !== 'inventory-adoption' || journal.id !== operationId ||
      journal.before.backupId !== operationId) throw new Error('Inventory adoption journal unavailable');
  const verified = await verifyWorkspaceBackup(journal.before.backupId, { storageAdapter: adapter, definitionCoverage: true });
  const catalogText = await adapter.readText(`${BACKUP_ROOT_DIR}/${journal.before.backupId}/${CARD_TYPE_CATALOG_PATH}`);
  const registry = createCardTypeRegistryFromCatalog(JSON.parse(catalogText), { bundledTypes: [], bundledFieldSets: [] });
  const pages = verified.manifest.pages.map(entry => ({ ...parsePageRecordContent(verified.pageContents[entry.name], { generateId: false }),
    id: entry.id, name: entry.name, path: normalizePath(entry.path), content: verified.pageContents[entry.name] }));
  const preview = planInventoryAdoption(pages, { registry, pageIds: journal.before.selectedActorIds, ...reader });
  if (preview.pages.length !== journal.after.pages.length || preview.pages.some(page => {
    const target = journal.after.pages.find(entry => entry.pageId === page.pageId);
    const original = journal.before.pages.find(entry => entry.pageId === page.pageId);
    return !target || target.path !== page.path || !arePageStateIdentitiesEqual(target.identity, page.targetIdentity) ||
      !original || !arePageStateIdentitiesEqual(original.identity, page.sourceIdentity);
  })) throw new Error('Journal/backup plan mismatch');
  const current = await readPages(adapter);
  const expected = new Map(pages.map(page => [page.path, page.content]));
  if (current.length !== pages.length) throw new Error('Workspace page set changed');
  for (const page of current) {
    const planned = preview.pages.find(entry => entry.pageId === page.id && entry.path === page.path);
    if (page.content === expected.get(page.path)) continue;
    if (!planned || page.content !== planned.targetContent) throw new Error('Third-state Inventory adoption conflict');
    expected.set(page.path, page.content);
  }
  const context = { adapter, workspaceContext, repository, registry, pages, reader,
    catalogIdentity: journal.before.catalogIdentity, expected, journal, verified, used: false };
  await guardWorkspace(context);
  for (const page of preview.pages.filter(page => expected.get(page.path) === page.targetContent)) {
    if (page.role === 'actor') await verifyDependencies(preview, page.pageId, context);
    await verifyPage(preview, page, context);
  }
  previews.set(preview, context);
  return { preview, context, journal };
}

export async function recoverInventoryAdoption(backupId, { confirm = false, onProgress = null, workspaceContext = captureStorageWorkspaceContext() } = {}) {
  if (!confirm || running) throw new Error('Explicit recovery confirmation and idle adoption required');
  if (typeof backupId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(backupId)) throw new Error('Invalid backup identity');
  running = true;
  try {
    const adapter = createContextBoundStorageAdapter(workspaceContext);
    return await restoreWorkspaceBackup(backupId, adapter, { definitionCoverage: true, expectedBackupReason: 'inventory-adoption', preRestorePages: await readPages(adapter), onProgress });
  } finally { running = false; }
}

async function readPages(adapter) {
  const pages = [];
  for (const file of await collectWorkspaceFiles(adapter, 'pages')) {
    if (!file.name.endsWith('.md')) continue;
    const content = await adapter.readText(file.path);
    const record = parsePageRecordContent(content, { generateId: false });
    if (!record.id) throw new Error('Missing durable page identity');
    pages.push({ ...record, ...file, content });
  }
  if (new Set(pages.map(page => page.id)).size !== pages.length) throw new Error('Duplicate durable page identity');
  return pages;
}
const pageRepository = pages => ({ getPageById: id => pages.find(page => page.id === id) });
const normalizePath = path => String(path || '').replace(/^\//, '');
