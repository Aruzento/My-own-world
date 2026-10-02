import * as PageRepository from '../repository/pageRepository.js';
import { state } from '../state.js';
import { parsePageRecordContent, createPageStateIdentityFromContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { deepFreeze } from '../cardTypes/definitionIdentity.js';
import { readEntity } from '../variables/entityVariables.js';
import { readOwnEffectsSource } from '../character/ownEffectsSource.js';
import { createSerializableEffectsData } from '../character/effectsModel.js';
import { readCharacterModelFromPage } from '../character/characterModel.js';
import { planEffectsAdoption } from './effectsAdoptionPlan.js';
import { createWorkspaceBackup, consumeCreatedBackupVerification, verifyWorkspaceBackup, restoreWorkspaceBackup, BACKUP_ROOT_DIR } from '../storage/backupService.js';
import { collectWorkspaceFiles } from '../storage/backupDefinitionCoverage.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog, CARD_TYPE_CATALOG_PATH } from '../storage/cardTypeCatalogStorage.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext, createContextBoundStorageAdapter } from '../storage/storageAdapter.js';
import { beginWorkspaceOperation, commitWorkspaceOperation, failWorkspaceOperation, createOperationId, OPERATION_JOURNAL_ROOT } from '../storage/operationJournal.js';
import { persistPageContentCommand, snapshotPageForCommand } from '../storage/pageCommandService.js';
import { getCurrentEditorPageBase, advanceEditorPageBase } from '../editor/editorSessionBase.js';

// Explicit Foundation API, independent from Inventory adoption and normal edits.
const previews = new WeakMap();
let running = false;
export async function previewEffectsAdoption({ pageIds, repository = PageRepository,
  workspaceContext = captureStorageWorkspaceContext(), ...reader } = {}) {
  assertStorageWorkspaceContext(workspaceContext);
  const adapter = createContextBoundStorageAdapter(workspaceContext);
  const pages = await readPages(adapter);
  const catalog = await readCardTypeCatalog({ storageAdapter: adapter });
  const registry = createCardTypeRegistryFromCatalog(catalog.catalog, { bundledTypes: [], bundledFieldSets: [] });
  const preview = planEffectsAdoption(pages, { registry, pageIds, ...reader });
  assertStorageWorkspaceContext(workspaceContext);
  previews.set(preview, { adapter, workspaceContext, repository, registry, pages, reader, catalogIdentity: catalog.identity,
    expected: new Map(preview.pages.map(page => [page.path, page.sourceContent])), used: false });
  return preview;
}

export async function executeEffectsAdoption(preview, { confirm = false, onProgress = null } = {}) {
  const context = previews.get(preview);
  if (!confirm || !context || context.used) throw new Error('Explicit confirmation of live unused preview required');
  if (running) throw new Error('Effects adoption already running');
  context.used = true; running = true;
  let journal = context.journal || null, backupId = journal?.before.backupId || null, operationId = journal?.id || null;
  let stage = 'preflight', uncertainPage = null;
  const completedActors = [], presentationFailures = [];
  try {
    if (!preview.pages.length) return { status: 'skipped', summary: preview.summary, completedActors };
    await guardSources(context);
    for (const planned of preview.pages) {
      await guardEditor(planned, context);
      const runtime = context.repository.getPageById(planned.pageId);
      if (!runtime || normalizePath(runtime.path) !== planned.path || runtime.content !== context.expected.get(planned.path)) throw new Error('Reload missing/moved/stale runtime actor');
    }
    operationId ||= `${createOperationId('effects-adoption')}-${crypto.randomUUID()}`;
    stage = 'backup';
    let verified = context.verified;
    if (!journal) {
      // Other actors/providers are independent; snapshot their CURRENT bytes for
      // full recovery without requiring unrelated pages to match this preview.
      context.pages = await readPages(context.adapter);
      await guardSources(context);
      const backup = await createWorkspaceBackup({ storageAdapter: context.adapter, pages: context.pages,
        id: operationId, reason: 'effects-adoption', definitionCoverage: true, includeAssets: true, cleanup: false, onProgress });
      backupId = backup.id;
      verified = await consumeCreatedBackupVerification(backup, { storageAdapter: context.adapter });
    }
    if (!verified) throw new Error('Verified backup evidence required');
    for (const planned of preview.pages) if (verified.pageContents[planned.name] !== planned.sourceContent) throw new Error('Backup source mismatch');
    await guardSources(context);
    stage = 'journal';
    if (!journal) journal = await beginWorkspaceOperation({ id: operationId, type: 'effects-adoption',
      affectedPages: preview.pages.map(page => page.pageId), before: { backupId, selectedActorIds: preview.selectedActorIds,
        catalogIdentity: context.catalogIdentity, pages: preview.pages.map(page => ({ pageId: page.pageId, path: page.path, identity: page.sourceIdentity })) },
      after: { pages: preview.pages.map(page => ({ pageId: page.pageId, path: page.path, identity: page.targetIdentity,
        fieldSet: page.fieldSet, schema: page.schema, status: 'pending' })) } }, context.adapter, true);
    else journal = await beginWorkspaceOperation(journal, context.adapter, true);
    for (const planned of preview.pages) {
      stage = `actor:${planned.pageId}`;
      onProgress?.({ label: 'Effects', stage: 'применение', current: completedActors.length, total: preview.pages.length });
      await guardSources(context);
      if (context.expected.get(planned.path) !== planned.targetContent) {
        await guardEditor(planned, context);
        const page = context.repository.getPageById(planned.pageId);
        if (!page || normalizePath(page.path) !== planned.path || page.content !== planned.sourceContent) throw new Error('Missing/moved/stale runtime actor');
        const result = await persistPageContentCommand({ page, content: planned.targetContent, type: 'adopt-legacy-effects',
          previousPage: snapshotPageForCommand(page), expectedBase: planned.sourceIdentity, workspaceContext: context.workspaceContext,
          validateBeforeWrite: async () => { await guardSources(context); await guardEditor(planned, context); },
          verifyPersistedContent: async () => { await verifyPage(planned, context); } });
        if (result.writeStatus !== 'saved') {
          uncertainPage = { pageId: planned.pageId, status: result.written ? 'uncertain' : 'blocked', written: result.written };
          throw new Error(`Effects adoption write ${result.writeStatus}`);
        }
        context.expected.set(planned.path, planned.targetContent);
      }
      try { await verifyPage(planned, context); }
      catch (error) { uncertainPage = { pageId: planned.pageId, status: 'uncertain', written: true }; throw error; }
      completedActors.push(planned.pageId);
      if (state.currentPage?.id === planned.pageId) {
        advanceEditorPageBase(context.repository.getPageById(planned.pageId));
        try { await refreshPresentation(); } catch (error) { presentationFailures.push({ pageId: planned.pageId, reason: error.message }); }
      }
      journal.after.pages.find(page => page.pageId === planned.pageId).status = 'verified';
      stage = `checkpoint:${planned.pageId}`;
      journal = await beginWorkspaceOperation(journal, context.adapter, true);
      if (presentationFailures.length) throw new Error('Effects persisted; presentation refresh unconfirmed');
    }
    stage = 'journal-completion';
    await guardSources(context);
    await commitWorkspaceOperation(journal, context.adapter, true);
    return { status: preview.summary.blockedActors ? 'partial' : 'completed', operationId, backupId, completedActors, presentationFailures, summary: preview.summary };
  } catch (error) {
    // If PageCommand threw after a physical write, never label it unchanged or
    // replay automatically. Resume rereads source/target/third state explicitly.
    const planned = preview.pages.find(page => stage === `actor:${page.pageId}`);
    if (planned && !uncertainPage) {
      try { if (await context.adapter.readText(planned.path) !== planned.sourceContent) uncertainPage = { pageId: planned.pageId, status: 'uncertain', written: true }; }
      catch { uncertainPage = { pageId: planned.pageId, status: 'uncertain', written: null }; }
    }
    let journalError = null;
    if (journal) {
      journal.after.failureStage = stage; journal.after.uncertainPage = uncertainPage;
      try { await failWorkspaceOperation(journal, error, context.adapter, true); } catch (failure) { journalError = failure.message; }
    }
    return { status: uncertainPage?.status === 'uncertain' ? 'uncertain' : 'failed', stage, reason: error.message,
      completedActors, backupId, operationId, uncertainPage, journalError, presentationFailures };
  } finally { running = false; }
}

async function guardSources(context) {
  assertStorageWorkspaceContext(context.workspaceContext);
  const catalog = await readCardTypeCatalog({ storageAdapter: context.adapter });
  if (!catalog.exists || canonicalJSON(catalog.identity) !== canonicalJSON(context.catalogIdentity)) throw new Error('Activated catalog/Field Set changed');
  for (const [path, content] of context.expected) if (await context.adapter.readText(path) !== content) throw new Error('Stale Effects actor source');
  assertStorageWorkspaceContext(context.workspaceContext);
}
async function guardEditor(page, context) {
  if (state.currentPage?.id !== page.pageId) return;
  const { hasPendingAutosaveForPage } = await import('../editor/autosave.js');
  if (hasPendingAutosaveForPage(page.pageId)) throw new Error('Pending editor body save');
  if (!arePageStateIdentitiesEqual(getCurrentEditorPageBase(page.pageId), createPageStateIdentityFromContent(context.expected.get(page.path)))) throw new Error('Stale editor session');
}
async function refreshPresentation() {
  const editor = document.getElementById('editorArea');
  const { prepareCharacterEffectsContext, renderCharacterEffectsBlocks } = await import('../editor/characterEffectsBlock.js');
  await prepareCharacterEffectsContext(editor); renderCharacterEffectsBlocks(editor);
  const { renderCharacterSheetBlocks } = await import('../editor/characterSheetBlock.js');
  await renderCharacterSheetBlocks(editor);
}
async function verifyPage(planned, context) {
  assertStorageWorkspaceContext(context.workspaceContext);
  const catalog = await readCardTypeCatalog({ storageAdapter: context.adapter });
  if (!catalog.exists || canonicalJSON(catalog.identity) !== canonicalJSON(context.catalogIdentity)) throw new Error('Effects readback catalog changed');
  const content = await context.adapter.readText(planned.path);
  const record = parsePageRecordContent(content, { generateId: false });
  if (content !== planned.targetContent || record.id !== planned.pageId || record.type !== planned.schema.type ||
      record.rawBody !== parsePageRecordContent(planned.sourceContent).rawBody) throw new Error('Durable Effects readback/preservation mismatch');
  const pages = await readPages(context.adapter);
  const page = pages.find(page => page.id === planned.pageId && page.path === planned.path);
  if (!page) throw new Error('Durable Effects actor moved/missing');
  const source = { registry: context.registry, repository: pageRepository(pages), pages };
  const snapshot = readEntity(page.id, source), own = readOwnEffectsSource(page, source);
  if (snapshot.mode !== 'structured' || snapshot.diagnostics.some(issue => issue.severity === 'error') ||
      canonicalJSON(snapshot.definition) !== canonicalJSON(planned.schema.definition) || own.source !== 'entity' || own.status !== 'ready' ||
      canonicalJSON(createSerializableEffectsData(own)) !== canonicalJSON(planned.own)) throw new Error('Durable own Effects domain mismatch');
  const model = readCharacterModelFromPage(page, source);
  // Own payload is verified above. Existing merge/id precedence belongs to the
  // providers; it must not become a new migration conflict or persistence input.
  if (model.source !== 'entity' || model.provenance.ownEffects.source !== 'entity' || model.provenance.ownEffects.status !== 'ready') throw new Error('Durable CharacterModel own Effects mismatch');
  assertStorageWorkspaceContext(context.workspaceContext);
}

export async function inspectEffectsAdoptionResume(operationId, options = {}) {
  try {
    const { preview, context, journal } = await prepareResume(operationId, options);
    return deepFreeze({ status: 'ready', operationId, backupId: journal.before.backupId,
      pages: preview.pages.map(page => ({ pageId: page.pageId, status: context.expected.get(page.path) === page.targetContent ? 'verified-skip' : 'pending' })) });
  } catch (error) { return { status: 'conflict', operationId, reason: error.message }; }
}
export async function resumeEffectsAdoption(operationId, { confirm = false, ...options } = {}) {
  try {
    const { preview } = await prepareResume(operationId, options);
    if (!confirm) return { status: 'preview', preview };
    return await executeEffectsAdoption(preview, { confirm: true, onProgress: options.onProgress });
  } catch (error) { return { status: 'conflict', operationId, reason: error.message }; }
}
async function prepareResume(operationId, { workspaceContext = captureStorageWorkspaceContext(), repository = PageRepository, ...reader } = {}) {
  if (typeof operationId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(operationId)) throw new Error('Invalid operation identity');
  const adapter = createContextBoundStorageAdapter(workspaceContext);
  let journal;
  for (const directory of ['failed', 'pending', 'committed']) {
    let content;
    try { content = await adapter.readText(`${OPERATION_JOURNAL_ROOT}/${directory}/${operationId}.json`); } catch { continue; }
    journal = JSON.parse(content); break;
  }
  if (journal?.type !== 'effects-adoption' || journal.id !== operationId || journal.before.backupId !== operationId) throw new Error('Effects adoption journal unavailable');
  const verified = await verifyWorkspaceBackup(operationId, { storageAdapter: adapter, definitionCoverage: true });
  const catalog = JSON.parse(await adapter.readText(`${BACKUP_ROOT_DIR}/${operationId}/${CARD_TYPE_CATALOG_PATH}`));
  const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
  const pages = verified.manifest.pages.map(entry => ({ ...parsePageRecordContent(verified.pageContents[entry.name], { generateId: false }),
    id: entry.id, name: entry.name, path: normalizePath(entry.path), content: verified.pageContents[entry.name] }));
  const preview = planEffectsAdoption(pages, { registry, pageIds: journal.before.selectedActorIds, ...reader });
  if (preview.pages.length !== journal.after.pages.length || preview.pages.some(page => {
    const target = journal.after.pages.find(entry => entry.pageId === page.pageId);
    const original = journal.before.pages.find(entry => entry.pageId === page.pageId);
    return !target || target.path !== page.path || !arePageStateIdentitiesEqual(target.identity, page.targetIdentity) ||
      canonicalJSON(target.fieldSet) !== canonicalJSON(page.fieldSet) || canonicalJSON(target.schema) !== canonicalJSON(page.schema) ||
      !original || original.path !== page.path || !arePageStateIdentitiesEqual(original.identity, page.sourceIdentity);
  })) throw new Error('Journal/backup Effects plan mismatch');
  const expected = new Map();
  for (const page of preview.pages) {
    const content = await adapter.readText(page.path);
    if (content !== page.sourceContent && content !== page.targetContent) throw new Error('Third-state Effects adoption conflict');
    expected.set(page.path, content);
  }
  const context = { adapter, workspaceContext, repository, registry, pages, reader, catalogIdentity: journal.before.catalogIdentity, expected, journal, verified, used: false };
  await guardSources(context);
  for (const page of preview.pages.filter(page => expected.get(page.path) === page.targetContent)) await verifyPage(page, context);
  previews.set(preview, context);
  return { preview, context, journal };
}
export async function recoverEffectsAdoption(backupId, { confirm = false, onProgress = null, workspaceContext = captureStorageWorkspaceContext() } = {}) {
  if (!confirm || running) throw new Error('Explicit recovery confirmation and idle adoption required');
  if (typeof backupId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(backupId)) throw new Error('Invalid backup identity');
  running = true;
  try {
    const adapter = createContextBoundStorageAdapter(workspaceContext);
    return await restoreWorkspaceBackup(backupId, adapter, { definitionCoverage: true, expectedBackupReason: 'effects-adoption', preRestorePages: await readPages(adapter), onProgress });
  } finally { running = false; }
}
async function readPages(adapter) {
  const pages = [];
  for (const file of await collectWorkspaceFiles(adapter, 'pages')) {
    if (!file.name.endsWith('.md')) continue;
    const content = await adapter.readText(file.path), record = parsePageRecordContent(content, { generateId: false });
    if (!record.id) throw new Error('Missing durable page identity');
    pages.push({ ...record, ...file, content });
  }
  if (new Set(pages.map(page => page.id)).size !== pages.length) throw new Error('Duplicate durable page identity');
  return pages;
}
const normalizePath = path => String(path || '').replace(/^\//, '');
const pageRepository = pages => ({ getPageById: id => pages.find(page => page.id === id) });
