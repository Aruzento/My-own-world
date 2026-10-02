import * as PageRepository from '../repository/pageRepository.js';
import { parsePageRecordContent, updatePageRecordContent, createPageStateIdentityFromContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { deepFreeze } from '../cardTypes/definitionIdentity.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog } from '../storage/cardTypeCatalogStorage.js';
import { captureStorageWorkspaceContext, assertStorageWorkspaceContext } from '../storage/storageAdapter.js';
import { createWorkspaceBackup, consumeCreatedBackupVerification, verifyWorkspaceBackup, restoreWorkspaceBackup } from '../storage/backupService.js';
import { collectWorkspaceFiles } from '../storage/backupDefinitionCoverage.js';
import { persistPageContentCommand } from '../storage/pageCommandService.js';
import { beginWorkspaceOperation, commitWorkspaceOperation, failWorkspaceOperation, OPERATION_JOURNAL_COMMITTED_DIR, OPERATION_JOURNAL_ROOT } from '../storage/operationJournal.js';
import { extractLegacyInventory } from './legacyInventoryExtraction.js';
import { extractLegacyEffects } from './legacyEffectsExtraction.js';
import { readInventoryModelFromPage } from '../character/inventoryModel.js';
import { readOwnEffectsSource } from '../character/ownEffectsSource.js';
import { createSerializableEffectsData } from '../character/effectsModel.js';
import { readEntity } from '../variables/entityVariables.js';
import { preparePropertiesMigration } from './propertiesMigrationPlan.js';
import { state } from '../state.js';
import { getCurrentEditorPageBase, advanceEditorPageBase } from '../editor/editorSessionBase.js';

const previews = new WeakMap();
export function assertRetirementCandidate(preview, pageId, beforeContent, content) {
  const captured = previews.get(preview);
  const plan = preview?.pages.find(page => page.pageId === pageId);
  if (!captured?.used || !plan || plan.sourceContent !== beforeContent || plan.targetContent !== content) throw new Error('Unapproved legacy retirement');
}

export async function previewLegacySourceRetirement(options = {}) { return buildRetirementPreview(options); }
async function buildRetirementPreview({ pageIds, repository = PageRepository,
  workspaceContext = captureStorageWorkspaceContext(), DOMParser: Parser = globalThis.DOMParser } = {}, sources = new Map()) {
  assertStorageWorkspaceContext(workspaceContext);
  const adapter = workspaceContext.adapter;
  const pages = [];
  for (const file of await collectWorkspaceFiles(adapter, 'pages')) if (file.name.endsWith('.md')) {
    const durable = await adapter.readText(file.path);
    const content = sources.get(file.path) || durable;
    pages.push({ ...parsePageRecordContent(content), ...file, content });
  }
  const catalog = await readCardTypeCatalog({ storageAdapter: adapter });
  const registry = createCardTypeRegistryFromCatalog(catalog.catalog, { bundledTypes: [], bundledFieldSets: [] });
  const exactRepository = { getPageById: id => pages.find(page => page.id === id) };
  const context = { registry, repository: exactRepository };
  const journals = [];
  for (const file of await collectWorkspaceFiles(adapter, OPERATION_JOURNAL_COMMITTED_DIR)) {
    if (file.name.endsWith('.json')) journals.push(JSON.parse(await adapter.readText(file.path)));
  }
  const actors = [], plans = [];
  const verifiedSources = new Map();
  for (const page of pages.filter(page => !pageIds || pageIds.includes(page.id))) {
    const issues = [], removed = [];
    const snapshot = readEntity(page.id, context);
    let status = 'ready', body = page.rawBody;
    if (snapshot.mode !== 'structured' || snapshot.diagnostics.some(issue => issue.severity === 'error')) { status = 'unavailable'; issues.push('structured-source-required'); }
    else if (!Parser) { status = 'blocked'; issues.push('inert-html-reader-required'); }
    else {
      const inert = new Parser().parseFromString('', 'text/html').createElement('template');
      inert.innerHTML = body;
      const actor = ['character', 'player'].includes(snapshot.type);
      const properties = [...inert.content.querySelectorAll('.card-properties-block, [data-block-type="properties"]')];
      const inventory = actor ? extractLegacyInventory(page, { DOMParser: Parser }) : { blocks: [], issues: [] };
      const effects = actor ? extractLegacyEffects(page, { DOMParser: Parser }) : { blocks: [], issues: [] };
      const blocks = [...properties];
      if (properties.length) {
        const receipt = snapshot.envelope.migration;
        if (!receipt?.backupId || !receipt.operationId || receipt.target?.type !== snapshot.type) issues.push('properties-migration-receipt-required');
        else {
          try {
            if (!verifiedSources.has(receipt.backupId)) verifiedSources.set(receipt.backupId, verifyWorkspaceBackup(receipt.backupId, { storageAdapter: adapter }));
            const original = await verifiedSources.get(receipt.backupId);
            const source = original.pageContents[page.name];
            if (!source || !arePageStateIdentitiesEqual(createPageStateIdentityFromContent(source), receipt.sourceIdentity) ||
                properties.some(block => !parsePageRecordContent(source).rawBody.includes(block.outerHTML))) issues.push('properties-receipt-body-review-required');
            else {
              const mapped = await preparePropertiesMigration({ ...page, content: source }, { pages, registry, DOMParser: Parser });
              if (mapped.status !== 'ready' || mapped.schemaDigest !== snapshot.schemaDigest) issues.push('properties-equivalence-review-required');
              else {
                const contains = (actual, expected) => expected && typeof expected === 'object' && !Array.isArray(expected)
                  ? Object.entries(expected).every(([key, value]) => Object.hasOwn(actual || {}, key) && contains(actual[key], value))
                  : canonicalJSON(actual) === canonicalJSON(expected);
                if (!contains(snapshot.values, mapped.envelope.values) || !contains(snapshot.overrides, mapped.envelope.overrides) ||
                    mapped.envelope.inactive.some(evidence => !snapshot.inactive.some(entry => canonicalJSON(entry) === canonicalJSON(evidence)))) issues.push('properties-equivalence-review-required');
              }
            }
          } catch { issues.push('properties-recovery-proof-unavailable'); }
        }
      }
      if (inventory.blocks.length) {
        const model = readInventoryModelFromPage(page, context);
        issues.push(...inventory.issues.map(issue => issue.code), ...inventory.blocks.flatMap(block => [...block.issues, ...block.chips.flatMap(chip => chip.issues)].map(issue => issue.code)));
        const totals = new Map();
        for (const chip of inventory.blocks.flatMap(block => block.chips)) totals.set(chip.pageId, (totals.get(chip.pageId) || 0) + chip.quantity);
        if (model.source !== 'entity' || model.status !== 'ready' || model.items.length !== totals.size ||
            model.items.some(item => item.quantity !== totals.get(item.pageId))) issues.push('inventory-equivalence-required');
        if (!journals.some(journal => journal.type === 'inventory-adoption' && journal.status === 'committed' && journal.affectedPages.includes(page.id))) issues.push('inventory-adoption-receipt-required');
        blocks.push(...[...inert.content.querySelectorAll('.item-set-block, .universal-list-block')].filter(block => inventory.blocks.some(entry => entry.html === block.outerHTML)));
      }
      if (effects.blocks.length || effects.data?.length) {
        issues.push(...effects.issues.map(issue => issue.code));
        const model = readOwnEffectsSource(page, context);
        if (!effects.canonical || model.source !== 'entity' || canonicalJSON(createSerializableEffectsData(model)) !== canonicalJSON(effects.canonical)) issues.push('effects-equivalence-required');
        if (!journals.some(journal => journal.type === 'effects-adoption' && journal.status === 'committed' && journal.affectedPages.includes(page.id))) issues.push('effects-adoption-receipt-required');
        blocks.push(...inert.content.querySelectorAll('.character-effects-block'));
      }
      for (const block of [...new Set(blocks)]) {
        // Unknown free content cannot be discarded merely because it is nested in a legacy owner.
        if (block.querySelector('p, h1, img, video, audio, iframe, canvas, [data-persistent-editable="true"]')) { issues.push('ambiguous-user-content-boundary'); continue; }
        if ([...block.querySelectorAll('*')].some(element =>
          !['DIV', 'SECTION', 'SPAN', 'LABEL', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON', 'H2', 'H3', 'SCRIPT', 'SVG', 'USE', 'PATH'].includes(element.tagName.toUpperCase()) ||
          element.tagName === 'DIV' && !element.className && !element.hasAttribute('data-character-effects') && element.textContent.trim())) {
          issues.push('unknown-legacy-content-review-required'); continue;
        }
        const html = block.outerHTML;
        const start = body.indexOf(html);
        if (start < 0 || body.indexOf(html, start + html.length) >= 0) { issues.push('raw-source-boundary-review-required'); continue; }
        removed.push({ html, domain: properties.includes(block) ? 'properties' : block.matches('.character-effects-block') ? 'effects' : 'inventory' });
        body = body.slice(0, start) + body.slice(start + html.length);
      }
      if (!blocks.length) status = 'already-retired';
      if (issues.length) status = 'blocked';
      if (status === 'ready') {
        const targetContent = updatePageRecordContent(page.content, { body }, { preserveUnchangedMetadata: true, updateTimestamp: false });
        plans.push({ pageId: page.id, path: page.path, name: page.name, sourceContent: page.content, targetContent,
          sourceIdentity: snapshot.pageIdentity, targetIdentity: createPageStateIdentityFromContent(targetContent), removed });
      }
    }
    actors.push({ pageId: page.id, path: page.path, type: page.type, status, issues, removedDomains: removed.map(entry => entry.domain) });
  }
  const preview = deepFreeze({ version: 1, actors, pages: plans });
  previews.set(preview, { workspaceContext, repository, catalogIdentity: catalog.identity, used: false });
  return preview;
}

export async function executeLegacySourceRetirement(preview, { confirm = false, onProgress = null } = {}) {
  const captured = previews.get(preview);
  if (!confirm || !captured || captured.used) throw new Error('Explicit live retirement preview confirmation required');
  captured.used = true;
  const { workspaceContext: workspace, repository } = captured;
  let journal, backupId = null, stage = 'preflight';
  const completed = [];
  try {
    if (!preview.pages.length) return { status: 'skipped', completed };
    const guard = async () => {
      assertStorageWorkspaceContext(workspace);
      if (canonicalJSON((await readCardTypeCatalog({ storageAdapter: workspace.adapter })).identity) !== canonicalJSON(captured.catalogIdentity)) throw new Error('Retirement catalog changed');
    };
    await guard();
    for (const plan of preview.pages) {
      const page = repository.getPageById(plan.pageId);
      const expected = captured.resume?.expected.get(plan.path) || plan.sourceContent;
      if (!page || page.path.replace(/^\//, '') !== plan.path || await workspace.adapter.readText(plan.path) !== expected) throw new Error('Stale/moved retirement page');
      if (expected === plan.targetContent) continue;
      if (state.currentPage?.id === page.id) {
        const { hasPendingAutosaveForPage } = await import('../editor/autosave.js');
        if (hasPendingAutosaveForPage(page.id) || !arePageStateIdentitiesEqual(getCurrentEditorPageBase(page.id), plan.sourceIdentity)) throw new Error('Pending/stale retirement editor');
      }
    }
    stage = 'backup';
    const backup = captured.resume ? { id: captured.resume.journal.before.backupId } : await createWorkspaceBackup({ pages: repository.getAllPages(), storageAdapter: workspace.adapter,
      definitionCoverage: true, includeAssets: true, cleanup: false, reason: 'legacy-retirement', onProgress });
    backupId = backup.id;
    const verified = captured.resume?.verified || await consumeCreatedBackupVerification(backup, { storageAdapter: workspace.adapter });
    for (const plan of preview.pages) if (verified.pageContents[plan.name] !== plan.sourceContent) throw new Error('Retirement backup source mismatch');
    stage = 'journal';
    journal = await beginWorkspaceOperation(captured.resume?.journal || { type: 'legacy-retirement', affectedPages: preview.pages.map(page => page.pageId),
      before: { backupId, catalogIdentity: captured.catalogIdentity, pages: preview.pages.map(page => ({ pageId: page.pageId, path: page.path, identity: page.sourceIdentity })) },
      after: { pages: preview.pages.map(page => ({ pageId: page.pageId, path: page.path, identity: page.targetIdentity, status: 'pending' })) } }, workspace.adapter, true);
    for (const plan of preview.pages) {
      await guard(); stage = `page:${plan.pageId}`;
      onProgress?.({ label: 'Retirement', stage: 'применение', current: completed.length, total: preview.pages.length });
      if (captured.resume?.expected.get(plan.path) === plan.targetContent) {
        if (await workspace.adapter.readText(plan.path) !== plan.targetContent) throw new Error('Retirement verified-skip changed');
        completed.push(plan.pageId); continue;
      }
      const result = await persistPageContentCommand({ page: repository.getPageById(plan.pageId), content: plan.targetContent,
        type: 'retire-legacy-sources', expectedBase: plan.sourceIdentity, workspaceContext: workspace, retirementPreview: preview,
        validateBeforeWrite: guard, verifyPersistedContent: async () => {
          await guard();
          if (await workspace.adapter.readText(plan.path) !== plan.targetContent) throw new Error('Retirement durable readback mismatch');
        } });
      if (result.writeStatus !== 'saved') throw new Error('Retirement write unconfirmed');
      completed.push(plan.pageId);
      if (state.currentPage?.id === plan.pageId) advanceEditorPageBase(repository.getPageById(plan.pageId));
      journal.after.pages.find(page => page.pageId === plan.pageId).status = 'verified';
      journal = await beginWorkspaceOperation(journal, workspace.adapter, true);
    }
    await commitWorkspaceOperation(journal, workspace.adapter, true);
    return { status: 'completed', backupId, operationId: journal.id, completed };
  } catch (error) {
    if (journal) { journal.after.failureStage = stage; try { await failWorkspaceOperation(journal, error, workspace.adapter, true); } catch { /* Explicit recovery remains available by backup id. */ } }
    return { status: 'failed', stage, backupId, operationId: journal?.id, completed, reason: error.message };
  }
}

async function prepareRetirementResume(operationId, options) {
  if (typeof operationId !== 'string' || !/^[\w-]+$/.test(operationId)) throw new Error('Invalid operation id');
  const workspaceContext = options.workspaceContext || captureStorageWorkspaceContext();
  assertStorageWorkspaceContext(workspaceContext);
  const adapter = workspaceContext.adapter;
  let journal;
  for (const directory of ['pending', 'failed', 'committed']) {
    try { journal = JSON.parse(await adapter.readText(`${OPERATION_JOURNAL_ROOT}/${directory}/${operationId}.json`)); break; } catch { /* Inspect other durable journal states. */ }
  }
  if (journal?.type !== 'legacy-retirement' || journal.id !== operationId || !journal.before?.backupId) throw new Error('Retirement journal unavailable');
  const catalog = await readCardTypeCatalog({ storageAdapter: adapter });
  if (canonicalJSON(catalog.identity) !== canonicalJSON(journal.before.catalogIdentity)) throw new Error('Retirement resume catalog changed');
  const backup = await verifyWorkspaceBackup(journal.before.backupId, { storageAdapter: adapter });
  const sources = new Map();
  for (const entry of journal.before.pages) {
    const saved = backup.manifest.pages.find(page => page.id === entry.pageId && page.path.replace(/^\//, '') === entry.path);
    const content = saved && backup.pageContents[saved.name];
    if (!content || !arePageStateIdentitiesEqual(createPageStateIdentityFromContent(content), entry.identity)) throw new Error('Retirement journal/source mismatch');
    sources.set(entry.path, content);
  }
  const preview = await buildRetirementPreview({ ...options, workspaceContext, pageIds: journal.affectedPages }, sources);
  if (preview.pages.length !== journal.after.pages.length) throw new Error('Retirement domain equivalence changed');
  const expected = new Map();
  for (const plan of preview.pages) {
    const target = journal.after.pages.find(page => page.pageId === plan.pageId && page.path === plan.path);
    if (!target || !arePageStateIdentitiesEqual(target.identity, plan.targetIdentity)) throw new Error('Retirement target reconstruction mismatch');
    const content = await adapter.readText(plan.path);
    if (content !== plan.sourceContent && content !== plan.targetContent) throw new Error('Retirement third-state conflict');
    expected.set(plan.path, content);
  }
  previews.get(preview).resume = { journal, expected, verified: backup };
  return preview;
}

export async function inspectLegacySourceRetirementResume(operationId, options = {}) {
  try {
    const preview = await prepareRetirementResume(operationId, options), resume = previews.get(preview).resume;
    return { status: 'ready', operationId, backupId: resume.journal.before.backupId,
      pages: preview.pages.map(page => ({ pageId: page.pageId, status: resume.expected.get(page.path) === page.targetContent ? 'verified-skip' : 'pending' })) };
  } catch (error) { return { status: 'conflict', operationId, reason: error.message }; }
}
export async function resumeLegacySourceRetirement(operationId, { confirm = false, ...options } = {}) {
  try { const preview = await prepareRetirementResume(operationId, options); return confirm ? executeLegacySourceRetirement(preview, { confirm: true, onProgress: options.onProgress }) : { status: 'preview', preview }; }
  catch (error) { return { status: 'conflict', operationId, reason: error.message }; }
}

export async function recoverLegacySourceRetirement(backupId, { confirm = false, onProgress = null, workspaceContext = captureStorageWorkspaceContext() } = {}) {
  if (!confirm) throw new Error('Explicit retirement recovery confirmation required');
  assertStorageWorkspaceContext(workspaceContext);
  return restoreWorkspaceBackup(backupId, workspaceContext.adapter, { definitionCoverage: true, onProgress });
}
