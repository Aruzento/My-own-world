import { extractLegacyInventory } from './legacyInventoryExtraction.js';
import { readEntity, getValue } from '../variables/entityVariables.js';
import { applyVariablesPatch } from '../variables/variableCommands.js';
import { validateEntityValues } from '../schema/cardVariablesSchema.js';
import { updatePageRecordContent, createPageStateIdentityFromContent } from '../core/pageRecord.js';
import { deepFreeze, deepCloneData } from '../cardTypes/definitionIdentity.js';

const ACTORS = ['character', 'player', 'creature'];
const valid = snapshot => snapshot.mode === 'structured' && !snapshot.diagnostics.some(issue => issue.severity === 'error');

// Pure workspace-global dependency analysis. Normalized runtime quantities are
// deliberately not migration evidence; duplicates only sum within one block.
export function planInventoryAdoption(pages, { registry, pageIds, ...reader } = {}) {
  const repository = { getPageById: id => pages.find(page => page.id === id) };
  const context = { registry, repository };
  const owners = pages.filter(page => ACTORS.includes(page.type)).map(page => {
    const snapshot = readEntity(page.id, context);
    const approved = valid(snapshot) && ['character', 'player'].includes(snapshot.type) &&
      snapshot.definition.definition.capabilities?.characterProjection === true &&
      ['dnd.items', 'dnd.equippedItems'].every(key => {
        const field = snapshot.definition.fieldsByKey[key];
        return field?.binding?.owner === 'variables' && !field.readonly && !field.computed &&
          field.datatype === 'array' && field.items?.datatype === 'reference' &&
          field.items.targetTypes?.length === 1 && field.items.targetTypes[0] === 'item';
      });
    const items = approved ? getValue(snapshot, 'dnd.items', 'stored') : null;
    const equipped = approved ? getValue(snapshot, 'dnd.equippedItems', 'stored') : null;
    const both = items?.status === 'value' && equipped?.status === 'value';
    const absent = items?.status === 'absent' && equipped?.status === 'absent';
    const issues = [];
    let status = !approved ? 'unsupported/unavailable' : both ? 'already-adopted' : !absent ? 'partial-source' : 'ready';
    let evidence = null;
    const claims = [];
    const entityRefs = both || (approved && !absent) ? (items?.value || []).map(ref => ref.pageId) : [];
    if (!both) {
      evidence = extractLegacyInventory(page, reader);
      issues.push(...evidence.issues, ...evidence.blocks.flatMap(block => [...block.issues, ...block.chips.flatMap(chip => chip.issues)]));
      for (const block of evidence.blocks) {
        const totals = new Map();
        for (const chip of block.chips) {
          if (!chip.pageId) continue;
          const total = totals.get(chip.pageId) || { pageId: chip.pageId, quantity: 0, chips: [], proven: true };
          total.chips.push(chip);
          total.proven &&= !chip.issues.length;
          total.quantity += chip.quantity || 0;
          total.proven &&= Number.isSafeInteger(total.quantity);
          totals.set(chip.pageId, total);
        }
        claims.push(...[...totals.values()].map(claim => ({ ...claim,
          proven: claim.proven && evidence.blocks.length === 1 && !issues.length &&
            (snapshot.variablesMode === 'legacy' || (approved && absent)) })));
      }
      if (status === 'ready') status = issues.length ? 'blocked' : evidence.blocks.length ? 'ready' : 'no-inventory';
    }
    const unknownConsumers = snapshot.variablesMode !== 'legacy' && !approved ||
      evidence?.issues.some(issue => ['html-reader-unavailable', 'html-reader-failed', 'malformed-inventory-marker'].includes(issue.code));
    return { page, snapshot, status, issues, evidence, claims, entityRefs, unknownConsumers };
  });
  const selectedIds = [...new Set(pageIds || owners.filter(owner => ['character', 'player'].includes(owner.page.type)).map(owner => owner.page.id))];
  if (selectedIds.some(id => !pages.some(page => page.id === id))) throw new Error('Missing selected actor');
  const selected = selectedIds.map(id => owners.find(owner => owner.page.id === id) || {
    page: repository.getPageById(id), status: 'unsupported/unavailable', issues: [], claims: [], entityRefs: []
  });
  const dependencies = [...new Set(selected.flatMap(owner => owner.claims.map(claim => claim.pageId)))].sort().map(pageId => {
    const target = repository.getPageById(pageId);
    const snapshot = target ? readEntity(pageId, context) : null;
    const stored = snapshot && valid(snapshot) && snapshot.type === 'item' ? getValue(snapshot, 'item.quantity', 'stored') : null;
    const consumers = owners.flatMap(owner => [
      ...owner.claims.filter(claim => claim.pageId === pageId).map(claim => ({ pageId: owner.page.id, source: 'legacy',
        quantity: claim.quantity, proven: claim.proven, selected: selectedIds.includes(owner.page.id) })),
      ...owner.entityRefs.filter(id => id === pageId).map(() => ({ pageId: owner.page.id, source: 'entity', selected: selectedIds.includes(owner.page.id) }))
    ]);
    const legacy = consumers.filter(consumer => consumer.source === 'legacy');
    const quantities = [...new Set(legacy.map(consumer => consumer.quantity))];
    const issues = [];
    if (owners.some(owner => owner.unknownConsumers)) issues.push({ code: 'workspace-consumer-unavailable' });
    if (!target) issues.push({ code: 'missing-item' });
    else if (snapshot.type !== 'item') issues.push({ code: 'wrong-item-type' });
    else if (snapshot.variablesMode === 'legacy') issues.push({ code: 'item-migration-required' });
    else if (!valid(snapshot)) issues.push({ code: 'item-source-unavailable' });
    else {
      const field = snapshot.definition.fieldsByKey['item.quantity'];
      if (field?.binding?.owner !== 'variables' || field.datatype !== 'integer' || field.readonly || field.computed) issues.push({ code: 'item-quantity-definition-unsupported' });
    }
    if (target && (!target.path || target.path.replace(/^\//, '') !== `pages/${target.name}`)) issues.push({ code: 'item-durable-path-required' });
    if (legacy.some(consumer => !consumer.proven)) issues.push({ code: 'unproven-quantity-claim' });
    if (quantities.length !== 1) issues.push({ code: 'shared-quantity-conflict' });
    if (stored?.status === 'value' && quantities.some(quantity => quantity !== stored.value)) issues.push({ code: 'stored-quantity-conflict' });
    if (stored?.status === 'absent' && consumers.some(consumer => consumer.source === 'entity')) issues.push({ code: 'active-entity-consumer' });
    if (stored && !['value', 'absent'].includes(stored.status)) issues.push({ code: 'item-quantity-unavailable' });
    return { pageId, path: target?.path || null, targetStatus: issues.length ? 'blocked' : 'ready',
      storedQuantity: stored?.status === 'value' ? stored.value : null, quantitySource: stored?.status || 'unavailable',
      targetQuantity: quantities.length === 1 ? quantities[0] : null, consumers, issues,
      requiredWrite: !issues.length && stored?.status === 'absent' };
  });
  // Do not activate quantities for a shared selected actor that cannot cut over.
  let changed = true;
  while (changed) {
    changed = false;
    for (const owner of selected.filter(owner => owner.status === 'ready')) {
      const issues = dependencies.filter(item => owner.claims.some(claim => claim.pageId === item.pageId)).flatMap(item =>
        item.issues.map(issue => ({ ...issue, pageId: item.pageId })));
      if (issues.length) { owner.status = 'blocked'; owner.issues.push(...issues); changed = true; }
    }
    for (const item of dependencies.filter(item => item.requiredWrite && !item.issues.length)) {
      if (item.consumers.some(consumer => consumer.selected && selected.find(owner => owner.page.id === consumer.pageId)?.status !== 'ready')) {
        item.issues.push({ code: 'blocked-actor-dependency' }); item.targetStatus = 'blocked'; item.requiredWrite = false; changed = true;
      }
    }
  }
  const actorPlans = selected.map(owner => ({ pageId: owner.page.id, path: owner.page.path, type: owner.page.type,
    sourceIdentity: createPageStateIdentityFromContent(owner.page.content), status: owner.status, issues: owner.issues,
    evidence: owner.evidence || null, legacyBlockCount: owner.evidence?.blocks.length || 0,
    rawChipCount: owner.evidence?.blocks.reduce((count, block) => count + block.chips.length, 0) || 0,
    uniqueItemCount: new Set(owner.claims.map(claim => claim.pageId)).size, quantities: owner.claims.map(claim => ({ pageId: claim.pageId, quantity: claim.quantity,
      raw: claim.chips.map(chip => chip.rawQuantity), duplicateAggregation: claim.chips.length > 1 })),
    items: owner.claims.map(claim => ({ pageId: claim.pageId })), equippedItems: [], preservedBody: true }));
  const touched = [];
  for (const item of dependencies.filter(item => item.requiredWrite)) {
    if (!actorPlans.some(actor => actor.status === 'ready' && actor.items.some(ref => ref.pageId === item.pageId))) continue;
    touched.push(candidate(repository.getPageById(item.pageId), [{ op: 'set', key: 'item.quantity', value: item.targetQuantity }], 'item', context));
  }
  for (const actor of actorPlans.filter(actor => actor.status === 'ready')) touched.push(candidate(repository.getPageById(actor.pageId), [
    { op: 'set', key: 'dnd.items', value: actor.items }, { op: 'set', key: 'dnd.equippedItems', value: [] }
  ], 'actor', context));
  return deepFreeze(deepCloneData({ kind: 'InventoryAdoptionPreview', version: 1, selectedActorIds: selectedIds,
    actors: actorPlans, items: dependencies, pages: touched, summary: {
      readyActors: actorPlans.filter(actor => actor.status === 'ready').length,
      blockedActors: actorPlans.filter(actor => ['blocked', 'partial-source', 'unsupported/unavailable'].includes(actor.status)).length,
      referencedItems: dependencies.length, requiredItemWrites: touched.filter(page => page.role === 'item').length,
      sharedItemConflicts: dependencies.filter(item => item.issues.some(issue => /quantity-conflict|unproven|dependency|consumer/.test(issue.code))).length,
      malformedChips: actorPlans.flatMap(actor => actor.evidence?.blocks || []).flatMap(block => block.chips).filter(chip => chip.issues.length).length,
      targetMigrationRequired: dependencies.filter(item => item.issues.some(issue => issue.code === 'item-migration-required')).length,
      noInventory: actorPlans.filter(actor => actor.status === 'no-inventory').length,
      alreadyAdopted: actorPlans.filter(actor => actor.status === 'already-adopted').length
    } }));
}

function candidate(page, patch, role, context) {
  const before = readEntity(page.id, context);
  const { envelope } = applyVariablesPatch(before, patch);
  const validation = validateEntityValues({ envelope, definition: before.definition, pageId: page.id });
  if (!validation.ok) throw new Error('Inventory adoption candidate schema validation failed');
  const content = updatePageRecordContent(page.content, { variablesJson: envelope }, { preserveUnchangedMetadata: true, updateTimestamp: false });
  return { pageId: page.id, path: page.path, name: page.name, role, patch, sourceContent: page.content, targetContent: content,
    sourceIdentity: before.pageIdentity, targetIdentity: createPageStateIdentityFromContent(content),
    schema: { type: before.type, version: before.schemaVersion, digest: before.schemaDigest } };
}
