import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { effectsAdoptionFixture, ownPayload, registry, catalog } from './fixtures/effectsAdoptionFixtures.mjs';
import { previewEffectsAdoption, executeEffectsAdoption, inspectEffectsAdoptionResume, resumeEffectsAdoption, recoverEffectsAdoption } from '../js/migration/effectsAdoption.js';
import { extractLegacyEffects, validateLegacyEffectsPayload } from '../js/migration/legacyEffectsExtraction.js';
import { parsePageRecordContent, createRuntimePageFromContent, updatePageRecordContent } from '../js/core/pageRecord.js';
import { OWN_EFFECTS_KEY, encodeOwnEffects, decodeOwnEffects } from '../js/character/ownEffectsDefinition.js';
import { createSerializableEffectsData } from '../js/character/effectsModel.js';
import { readOwnEffectsSource } from '../js/character/ownEffectsSource.js';
import { prepareEffectsContext, prepareStructuredEffectsChange, commitStructuredEffectsChange } from '../js/character/structuredEffects.js';
import { setPages } from '../js/stateActions.js';
import { createMemoryStorageAdapter } from './fixtures/editConflictFixtures.mjs';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { createPageStateIdentityFromContent } from '../js/core/pageRecord.js';
const preview = f => previewEffectsAdoption(f.options);
const run = async f => executeEffectsAdoption(await preview(f), { confirm: true });
const pageWrites = f => f.writes.filter(write => write.path.replace(/^\//, '').startsWith('pages/'));
const extension = { revision: 1, fields: [{ id: 'dnd.own-effects', version: 1 }] };

test('immutable deterministic preview is read-only/live/single-use and preserves captured own source metadata/maps', async () => {
  const f = await effectsAdoptionFixture(); const p = await preview(f);
  assert.deepEqual(p, await preview(f)); assert.ok(Object.isFrozen(p.pages[0].own.effects));
  assert.equal(f.writes.length, 0); assert.equal(p.summary.readyActors, 1);
  assert.deepEqual(createSerializableEffectsData(decodeOwnEffects(p.pages[0].value)), createSerializableEffectsData(ownPayload));
  assert.ok(p.actors[0].normalization.length);
  await assert.rejects(executeEffectsAdoption(p));
  await assert.rejects(executeEffectsAdoption(JSON.parse(JSON.stringify(p)), { confirm: true }));
  const result = await executeEffectsAdoption(p, { confirm: true });
  assert.equal(result.status, 'completed', JSON.stringify(result)); assert.equal(pageWrites(f).length, 1);
  await assert.rejects(executeEffectsAdoption(p, { confirm: true }));
});

for (const [spec, status] of [[{ noBlock: true }, 'no-effects'], [{ raw: '{"conditions":[],"effects":[]}' }, 'ready'],
  [{ noData: true }, 'blocked'], [{ multiBlock: true }, 'blocked'], [{ multiData: true }, 'blocked'],
  [{ noBlock: true, orphan: true }, 'blocked'], [{ raw: '{broken' }, 'blocked'], [{ raw: '[]' }, 'blocked'],
  [{ attribute: '{"conditions":[],"effects":[]}' }, 'blocked'], [{ raw: ' ', attribute: JSON.stringify(ownPayload) }, 'blocked'],
  [{ raw: '', attribute: JSON.stringify(ownPayload) }, 'ready']]) {
  test(`strict persisted extraction ${JSON.stringify(spec)} → ${status}`, async () => {
    const f = await effectsAdoptionFixture({ actors: [{ id: 'actor', ...spec }] });
    const p = await preview(f); assert.equal(p.actors[0].status, status, JSON.stringify(p.actors[0].issues));
    assert.equal(extractLegacyEffects(f.actor, { DOMParser: null }).issues[0].code, 'html-reader-unavailable');
    if (status !== 'ready') { assert.equal((await run(f)).status, 'skipped'); assert.equal(f.writes.length, 0); }
    else assert.equal((await run(f)).status, 'completed');
  });
}

const invalid = [
  { ...ownPayload, version: 2 }, { ...ownPayload, unknown: true }, { ...ownPayload, conditions: [{ key: 'alien' }] },
  ...[0, 7, 1.5, '2', null].map(level => ({ ...ownPayload, conditions: [{ key: 'exhaustion', level }] })),
  { ...ownPayload, conditions: [{ key: 'poisoned', future: 'keep' }] },
  { ...ownPayload, effects: [{ title: 'No persisted id' }] }, { ...ownPayload, effects: [{ id: 'x', sourceType: 'alien' }] },
  { ...ownPayload, effects: [{ id: 'x', future: true }] }, { ...ownPayload, effects: [{ id: 'x', modifiers: { other: 2 } }] },
  { ...ownPayload, effects: [{ id: 'x', modifiers: { armorClass: 1.5 } }] }, { ...ownPayload, effects: [{ id: 'x', modifiers: { skills: [] } }] },
  { ...ownPayload, effects: [{ id: 'x', flags: { magical: 'true' } }] }, { ...ownPayload, effects: [{ id: 'x', flags: { future: false } }] },
  { ...ownPayload, effects: [{ id: 'x' }, { id: 'x' }] }, { ...ownPayload, conditions: ['poisoned', 'poisoned'] },
  { ...ownPayload, selectedRuleIds: [1] }, { ...ownPayload, conditions: null }
];
for (const [index, payload] of invalid.entries()) test(`lossless validator blocks damaged/richer state ${index}`, async () => {
  assert.ok(validateLegacyEffectsPayload(payload).issues.length);
  const f = await effectsAdoptionFixture({ actors: [{ id: 'actor', raw: JSON.stringify(payload) }] });
  assert.equal((await preview(f)).actors[0].status, 'blocked'); assert.equal((await run(f)).status, 'skipped'); assert.equal(f.writes.length, 0);
});

test('source matrix Character/Player/legacy/unsupported/partial/already-adopted/future/missing catalog/exact Field Set', async () => {
  for (const [actor, status] of [
    [{ type: 'character' }, 'ready'], [{ type: 'player' }, 'ready'], [{ values: null }, 'unsupported/unavailable'],
    [{ type: 'lore' }, 'unsupported/unavailable'], [{ extensions: extension }, 'partial-source'],
    [{ values: { [OWN_EFFECTS_KEY]: encodeOwnEffects(createSerializableEffectsData(ownPayload)) } }, 'partial-source'],
    [{ extensions: extension, values: { [OWN_EFFECTS_KEY]: encodeOwnEffects(createSerializableEffectsData(ownPayload)) } }, 'already-adopted'],
    [{ extensions: { revision: 1, fields: [{ id: 'dnd.own-effects', version: 2 }] } }, 'blocked']
  ]) {
    const f = await effectsAdoptionFixture({ actors: [{ id: 'actor', ...actor }] });
    assert.equal((await preview(f)).actors[0].status, status);
    if (actor.extensions && !actor.values) assert.equal(readOwnEffectsSource(f.actor, { registry }).source, 'unavailable');
  }
  for (const raw of ['broken', '{"formatVersion":2}']) {
    const f = await effectsAdoptionFixture();
    f.actor.content = f.actor.content.replace(/^variablesJson:.*$/m, `variablesJson: ${raw}`);
    await f.adapter.writeText(f.actor.path, f.actor.content); f.writes.length = 0;
    assert.equal((await preview(f)).actors[0].status, 'unsupported/unavailable');
  }
  for (const options of [{ noCatalog: true }, { catalogOverride: { ...catalog, fieldSets: catalog.fieldSets.filter(field => field.id !== 'dnd.own-effects') } }]) {
    const f = await effectsAdoptionFixture(options); assert.notEqual((await preview(f)).actors[0].status, 'ready');
    assert.equal((await run(f)).status, 'skipped'); assert.equal(f.writes.length, 0);
  }
});

test('one atomic extension/value write preserves other extensions/body/metadata/Variables and subsequent normal Effects writer', async () => {
  const custom = { key: 'custom.00000000-0000-4000-8000-000000000001', label: 'Preserved', datatype: 'string', binding: { owner: 'variables' } };
  const f = await effectsAdoptionFixture({ actors: [{ id: 'actor', extensions: { revision: 4, fields: [custom] },
    values: { [custom.key]: 'keep', 'dnd.level': 5, 'dnd.items': [], 'dnd.equippedItems': [], 'dnd.health': { 'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 3 } } }] });
  const before = parsePageRecordContent(f.actor.content);
  const result = await run(f); assert.equal(result.status, 'completed', JSON.stringify(result));
  const after = parsePageRecordContent(await f.adapter.readText(f.actor.path));
  assert.equal(after.rawBody, before.rawBody); assert.match(f.actor.content, /unknownFutureMetadata: keep/);
  assert.deepEqual(after.variablesJson.extensions, { revision: 5, fields: [custom, ...extension.fields] });
  const { [OWN_EFFECTS_KEY]: migrated, ...unrelated } = after.variablesJson.values;
  assert.deepEqual(unrelated, before.variablesJson.values); assert.deepEqual(after.variablesJson.inactive, before.variablesJson.inactive);
  assert.equal(readOwnEffectsSource(f.actor, { registry }).source, 'entity');
  const own = createSerializableEffectsData(readOwnEffectsSource(f.actor, { registry }));
  own.conditions.push({ key: 'blinded' }); own.effects.push({ id: 'new', title: 'New manual' }); own.selectedRuleIds = [];
  const context = await prepareEffectsContext({ page: f.actor });
  const plan = prepareStructuredEffectsChange({ pageId: f.actor.id, expectedBase: createPageStateIdentityFromContent(f.actor.content), effects: own, context });
  assert.equal((await commitStructuredEffectsChange(plan)).status, 'saved');
  assert.equal(parsePageRecordContent(f.actor.content).rawBody, before.rawBody);
  assert.deepEqual(readOwnEffectsSource(f.actor, context).selectedRuleIds, []);
});

test('independent ready actor proceeds despite blocked actor; unrelated actor edit does not invalidate Effects preview', async () => {
  const f = await effectsAdoptionFixture({ actors: [{ id: 'actor' }, { id: 'blocked', raw: '{broken' }] });
  const p = await preview(f);
  await f.adapter.writeText('pages/blocked.md', f.pages[1].content + 'unrelated body edit');
  const result = await executeEffectsAdoption(p, { confirm: true });
  assert.equal(result.status, 'partial', JSON.stringify(result)); assert.deepEqual(result.completedActors, ['actor']);
});

for (const failure of ['backup-create', 'backup-verify', 'backup-source', 'journal-before', 'journal-checkpoint', 'page-write', 'readback',
  'stale', 'catalog', 'fieldset', 'workspace', 'missing', 'moved-runtime']) test(`safe execution failure ${failure}`, async () => {
  const f = await effectsAdoptionFixture(); const p = await preview(f);
  const write = f.adapter.writeText.bind(f.adapter), read = f.adapter.readText.bind(f.adapter);
  let written = 0, failRead = false;
  f.adapter.writeText = async (path, content) => {
    if (failure === 'backup-create' && path.endsWith('/manifest.json')) throw new Error('backup failed');
    if (failure === 'journal-before' && path.includes('/pending/')) throw new Error('journal failed');
    if (failure === 'journal-checkpoint' && path.includes('/pending/') && written) throw new Error('checkpoint failed');
    if (path === f.actor.path) {
      if (failure === 'page-write') throw new Error('page write failed');
      written++; if (failure === 'readback') failRead = true;
    }
    const result = await write(path, content);
    if (failure === 'backup-source' && path.endsWith('/manifest.json')) await write(f.actor.path, f.actor.content + 'changed');
    return result;
  };
  f.adapter.readText = async path => {
    if (failure === 'backup-verify' && path.includes('/pages/actor.md')) throw new Error('backup verify failed');
    if (failRead && path === f.actor.path) throw new Error('readback uncertain');
    return read(path);
  };
  if (failure === 'stale') await write(f.actor.path, f.actor.content + 'changed');
  if (failure === 'catalog') await write(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...catalog, revision: 2 }));
  if (failure === 'fieldset') await write(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...catalog, fieldSets: catalog.fieldSets.filter(field => field.id !== 'dnd.own-effects') }));
  if (failure === 'workspace') setStorageAdapter(createMemoryStorageAdapter());
  if (failure === 'missing') await f.adapter.removeFile(f.actor.path);
  if (failure === 'moved-runtime') f.actor.path = 'pages/moved.md';
  const result = await executeEffectsAdoption(p, { confirm: true });
  assert.ok(['failed', 'uncertain'].includes(result.status), JSON.stringify(result));
  assert.equal(written, ['journal-checkpoint', 'readback'].includes(failure) ? 1 : 0);
  if (failure === 'readback') assert.equal(result.status, 'uncertain');
});

test('crash/resume reconstructs verified backup source/target; third state and changed catalog conflict; recovery is explicit', async () => {
  for (const crashAfter of [0, 1]) {
    const f = await effectsAdoptionFixture(); const p = await preview(f);
    const write = f.adapter.writeText.bind(f.adapter); let written = 0;
    f.adapter.writeText = async (path, content) => {
      if (path.includes('/pending/') && written === crashAfter) { if (!written) await write(path, content); throw new Error('crash'); }
      if (path === f.actor.path) written++;
      return write(path, content);
    };
    const result = await executeEffectsAdoption(p, { confirm: true }); f.adapter.writeText = write;
    setPages(await Promise.all(f.pages.map(async page => createRuntimePageFromContent({ content: await f.adapter.readText(page.path), path: page.path, name: page.name }))));
    const inspect = await inspectEffectsAdoptionResume(result.operationId, f.options);
    assert.equal(inspect.status, 'ready', JSON.stringify(inspect));
    assert.equal(inspect.pages[0].status, crashAfter ? 'verified-skip' : 'pending');
    assert.equal((await resumeEffectsAdoption(result.operationId, { ...f.options, confirm: true })).status, 'completed');
    const target = await f.adapter.readText(f.actor.path);
    await write(f.actor.path, target + 'user edit');
    assert.equal((await inspectEffectsAdoptionResume(result.operationId, f.options)).status, 'conflict');
    await write(f.actor.path, target);
    await write(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...catalog, revision: 2 }));
    assert.equal((await inspectEffectsAdoptionResume(result.operationId, f.options)).status, 'conflict');
    await write(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
    await assert.rejects(recoverEffectsAdoption(result.backupId));
    assert.equal((await recoverEffectsAdoption(result.backupId, { confirm: true })).restoredPages, 1);
    const restored = parsePageRecordContent(await f.adapter.readText(f.actor.path));
    assert.equal(restored.variablesJson.values[OWN_EFFECTS_KEY], undefined);
    assert.equal(restored.variablesJson.extensions, undefined);
    assert.equal(readOwnEffectsSource({ id: f.actor.id, content: await f.adapter.readText(f.actor.path) }, { registry }).status, 'unavailable');
  }
});

test('explicit empty and normal adoption are reload-idempotent without backup/page writes or duplicate declaration', async () => {
  for (const raw of [JSON.stringify(ownPayload), '{"conditions":[],"effects":[]}']) {
    const f = await effectsAdoptionFixture({ actors: [{ id: 'actor', raw }] });
    assert.equal((await run(f)).status, 'completed');
    setPages([createRuntimePageFromContent({ content: await f.adapter.readText(f.actor.path), path: f.actor.path, name: f.actor.name })]);
    f.writes.length = 0;
    assert.equal((await preview(f)).summary.alreadyAdopted, 1); assert.equal((await run(f)).status, 'skipped'); assert.equal(f.writes.length, 0);
  }
});

test('several actors resume independently after first checkpoint crash, without replaying verified target', async () => {
  const f = await effectsAdoptionFixture({ actors: [{ id: 'actor' }, { id: 'player', type: 'player' }] });
  const write = f.adapter.writeText.bind(f.adapter); let count = 0;
  f.adapter.writeText = async (path, content) => {
    if (path.includes('/pending/') && count === 1) throw new Error('crash after first actor');
    if (path.startsWith('pages/')) count++;
    return write(path, content);
  };
  const result = await run(f); f.adapter.writeText = write;
  assert.deepEqual(result.completedActors, ['actor']); assert.equal(count, 1);
  setPages(await Promise.all(f.pages.map(async page => createRuntimePageFromContent({ content: await f.adapter.readText(page.path), path: page.path, name: page.name }))));
  assert.deepEqual((await inspectEffectsAdoptionResume(result.operationId, f.options)).pages.map(page => page.status), ['verified-skip', 'pending']);
  assert.equal((await resumeEffectsAdoption(result.operationId, { ...f.options, confirm: true })).status, 'completed');
  assert.deepEqual(pageWrites(f).map(write => write.path), ['pages/actor.md', 'pages/player.md']);
});

test('post-write content or catalog mismatch is uncertain and stops the second actor; no rollback', async () => {
  for (const mismatch of ['content', 'catalog']) {
    const f = await effectsAdoptionFixture({ actors: [{ id: 'actor' }, { id: 'player', type: 'player' }] });
    const write = f.adapter.writeText.bind(f.adapter);
    f.adapter.writeText = async (path, content) => {
      const result = await write(path, content);
      if (path === f.actor.path) {
        if (mismatch === 'content') await write(path, content + 'third state');
        else await write(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...catalog, revision: 2 }));
      }
      return result;
    };
    const result = await run(f);
    assert.equal(result.status, 'uncertain', JSON.stringify(result));
    assert.equal(pageWrites(f).some(write => write.path === 'pages/player.md'), false);
    assert.ok(parsePageRecordContent(await f.adapter.readText(f.actor.path)).variablesJson.values[OWN_EFFECTS_KEY]);
  }
});

test('required pre-restore safety backup failure leaves the adopted actor untouched', async () => {
  const f = await effectsAdoptionFixture(), result = await run(f), content = await f.adapter.readText(f.actor.path);
  const write = f.adapter.writeText.bind(f.adapter);
  f.adapter.writeText = async (path, content) => {
    if (path.includes('pre-restore') && path.endsWith('/manifest.json')) throw new Error('pre-restore failed');
    return write(path, content);
  };
  await assert.rejects(recoverEffectsAdoption(result.backupId, { confirm: true }));
  assert.equal(await f.adapter.readText(f.actor.path), content);
});

test('canonical data, explicit zero modifiers and captured spell/rule sources roundtrip without resolution; selections normalize only approved ids', () => {
  const original = createSerializableEffectsData({ conditions: ['blinded'], effects: ['spell', 'rule', 'world-package'].map(sourceType => ({
    id: sourceType, title: sourceType, sourceType, sourcePageId: 'deleted-source', sourcePackageId: 'historical', ruleId: 'old-rule',
    duration: 'data only', note: 'keep', modifiers: { armorClass: 0, abilityScores: { con: 0 }, abilityChecks: { custom: -1 }, skills: { Athletics: 2 } },
    flags: { concentration: true, harmful: false } })), selectedRuleIds: ['r1'] });
  const validated = validateLegacyEffectsPayload(original);
  assert.deepEqual(validated.issues, []); assert.deepEqual(validated.normalization, []);
  assert.deepEqual(createSerializableEffectsData(decodeOwnEffects(encodeOwnEffects(original))), original);
  const normalized = validateLegacyEffectsPayload({ ...original, selectedRuleIds: [' r1 ', 'r1'] });
  assert.deepEqual(normalized.canonical.selectedRuleIds, ['r1']); assert.equal(normalized.normalization.length, 1);
});

test('incompatible activated Field Set digest blocks without catalog activation or page writes', async () => {
  const incompatible = structuredClone(catalog);
  incompatible.fieldSets.find(field => field.id === 'dnd.own-effects').metadata.representationVersion = 2;
  const f = await effectsAdoptionFixture({ catalogOverride: incompatible });
  const p = await preview(f); assert.equal(p.actors[0].status, 'blocked');
  assert.ok(p.actors[0].issues.some(issue => issue.code === 'exact-activated-own-effects-definition-required'));
  assert.equal((await executeEffectsAdoption(p, { confirm: true })).status, 'skipped'); assert.equal(f.writes.length, 0);
});

test('PageCommand adoption policy permits only atomic own extension/value, rejects unrelated edits and partial activation', async () => {
  const { validateStructuredPageWrite } = await import('../js/storage/structuredPagePolicy.js');
  const f = await effectsAdoptionFixture(), p = await preview(f), planned = p.pages[0];
  const check = content => validateStructuredPageWrite({ beforeContent: planned.sourceContent, content,
    expectedBase: planned.sourceIdentity, effectsAdoptionCommand: true, storageAdapter: f.adapter });
  await check(planned.targetContent);
  for (const mutation of ['level', 'extension-only', 'value-only', 'revision', 'body', 'metadata']) {
    const record = parsePageRecordContent(planned.targetContent), envelope = record.variablesJson;
    if (mutation === 'level') envelope.values['dnd.level'] = 6;
    if (mutation === 'extension-only') delete envelope.values[OWN_EFFECTS_KEY];
    if (mutation === 'value-only') delete envelope.extensions;
    if (mutation === 'revision') envelope.extensions.revision++;
    const content = updatePageRecordContent(planned.targetContent, { variablesJson: envelope,
      ...(mutation === 'body' ? { body: record.rawBody + 'changed' } : {}), ...(mutation === 'metadata' ? { aliases: ['changed'] } : {}) },
    { preserveUnchangedMetadata: true, updateTimestamp: false });
    await assert.rejects(check(content), /Invalid own Effects adoption transition/);
  }
  assert.equal(f.writes.length, 0);
});
