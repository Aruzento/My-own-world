import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { adoptionFixture, refs, catalog } from './fixtures/inventoryAdoptionFixtures.mjs';
import { parsePageRecordContent, createRuntimePageFromContent, updatePageRecordContent } from '../js/core/pageRecord.js';
import { previewInventoryAdoption, executeInventoryAdoption, inspectInventoryAdoptionResume, resumeInventoryAdoption, recoverInventoryAdoption } from '../js/migration/inventoryAdoption.js';
import { extractLegacyInventory } from '../js/migration/legacyInventoryExtraction.js';
import { readInventoryModelFromPage } from '../js/character/inventoryModel.js';
import { setPages } from '../js/stateActions.js';
import { createMemoryStorageAdapter } from './fixtures/editConflictFixtures.mjs';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';

const values = content => parsePageRecordContent(content).variablesJson?.values;
const pageWrites = f => f.writes.filter(write => write.path.replace(/^\//, '').startsWith('pages/'));
const preview = f => previewInventoryAdoption(f.options);
const run = async f => executeInventoryAdoption(await preview(f), { confirm: true });

test('preview is live immutable deterministic and read-only; duplicate evidence sums accepted legacy quantities', async () => {
  const f = await adoptionFixture({ actors: [{ id: 'actor', blocks: [[['A', '2'], ['A', '3']]] }] });
  const first = await preview(f), second = await preview(f);
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first.actors[0].quantities));
  assert.equal(f.writes.length, 0);
  assert.equal(first.actors[0].rawChipCount, 2);
  assert.deepEqual(first.actors[0].quantities, [{ pageId: 'A', quantity: 5, raw: ['2', '3'], duplicateAggregation: true }]);
  assert.deepEqual(first.actors[0].items, refs(['A']));
  await assert.rejects(executeInventoryAdoption(JSON.parse(JSON.stringify(first)), { confirm: true }));
  await assert.rejects(executeInventoryAdoption(first));
  const result = await executeInventoryAdoption(first, { confirm: true });
  assert.equal(result.status, 'completed', JSON.stringify(result));
  assert.equal(values(f.item.content)['item.quantity'], 5);
  await assert.rejects(executeInventoryAdoption(first, { confirm: true }));
});

test('strict extraction has no reader/defaults fallback, distinguishes no block, explicit empty and multiple blocks', async () => {
  for (const [blocks, status] of [[[], 'no-inventory'], [[[]], 'ready'], [[[['A', '1']], [['A', '1']]], 'blocked']]) {
    const f = await adoptionFixture({ actors: [{ id: 'actor', blocks }] });
    assert.equal((await preview(f)).actors[0].status, status);
    assert.equal(extractLegacyInventory(f.actor, { DOMParser: null }).issues[0].code, 'html-reader-unavailable');
    if (status === 'ready') {
      assert.equal((await run(f)).status, 'completed');
      assert.deepEqual(values(f.actor.content)['dnd.items'], []);
      assert.deepEqual(values(f.actor.content)['dnd.equippedItems'], []);
    } else {
      assert.equal((await run(f)).status, 'skipped'); assert.equal(f.writes.length, 0);
    }
  }
});

for (const quantity of ['0', '-1', '1.5', '', 'text', null, '01', ' 1', '9007199254740992']) {
  test(`raw malformed quantity ${JSON.stringify(quantity)} never normalized`, async () => {
    const f = await adoptionFixture({ actors: [{ id: 'actor', blocks: [[['A', quantity]]] }] });
    const p = await preview(f);
    assert.equal(p.actors[0].status, 'blocked'); assert.equal(p.summary.malformedChips, 1);
    assert.equal((await executeInventoryAdoption(p, { confirm: true })).status, 'skipped');
    assert.equal(f.writes.length, 0);
  });
}

test('exact references block missing ids/pages, wrong type, legacy and invalid/future Items; no title lookup', async () => {
  for (const [id, items, code] of [
    [null, [{ id: 'A' }], 'invalid-exact-page-id'], ['missing', [{ id: 'A' }], 'missing-item'],
    ['A', [{ id: 'A', type: 'lore' }], 'wrong-item-type'], ['A', [{ id: 'A', values: null }], 'item-migration-required']
  ]) {
    const f = await adoptionFixture({ actors: [{ id: 'actor', blocks: [[[id, '1']]] }], items });
    const p = await preview(f);
    assert.equal(p.actors[0].status, 'blocked'); assert.ok(p.actors[0].issues.some(issue => issue.code === code));
    assert.equal((await executeInventoryAdoption(p, { confirm: true })).status, 'skipped');
    assert.equal(f.writes.length, 0);
  }
  for (const envelope of ['broken', '{"formatVersion":2}']) {
    const f = await adoptionFixture();
    f.item.content = f.item.content.replace(/variablesJson:.*\n/, `variablesJson: ${envelope}\n`);
    await f.adapter.writeText(f.item.path, f.item.content); f.writes.length = 0;
    assert.equal((await preview(f)).actors[0].status, 'blocked'); assert.equal(f.writes.length, 0);
  }
});

test('actor source readiness: Character/Player, already adopted, partial, legacy and missing catalog', async () => {
  for (const [type, stored, status] of [
    ['character', {}, 'ready'], ['player', {}, 'ready'], ['character', { 'dnd.items': [], 'dnd.equippedItems': [] }, 'already-adopted'],
    ['character', { 'dnd.items': [] }, 'partial-source'], ['player', { 'dnd.equippedItems': [] }, 'partial-source'],
    ['character', null, 'unsupported/unavailable'], ['lore', {}, 'unsupported/unavailable']
  ]) {
    const f = await adoptionFixture({ actors: [{ id: 'actor', type, values: stored, blocks: [[['A', '3']]] }] });
    assert.equal((await preview(f)).actors[0].status, status);
  }
  const f = await adoptionFixture({ noCatalog: true });
  assert.equal((await preview(f)).actors[0].status, 'unsupported/unavailable');
  assert.equal((await run(f)).status, 'skipped'); assert.equal(f.writes.length, 0);
});

test('global quantities: unselected legacy actor claims, explicit Item values and Entity consumers protect shared owner', async () => {
  for (const [other, itemValues, ready] of [
    [{ blocks: [[['A', '3']]] }, {}, true],
    [{ blocks: [[['A', '4']]] }, {}, false],
    [{ blocks: [[['A', '3']]] }, { 'item.quantity': 3 }, true],
    [{ blocks: [[['A', '3']]] }, { 'item.quantity': 2 }, false],
    [{ values: { 'dnd.items': refs(['A']), 'dnd.equippedItems': [] }, blocks: [] }, {}, false],
    [{ blocks: [[['A', 'text']]] }, {}, false],
    [{ blocks: [[['A', '3']], [['A', '3']]] }, {}, false]
  ]) {
    const f = await adoptionFixture({ actors: [{ id: 'actor', blocks: [[['A', '3']]] }, { id: 'other', ...other }], items: [{ id: 'A', values: itemValues }] });
    f.options.pageIds = ['actor'];
    const p = await preview(f);
    assert.equal(p.actors[0].status, ready ? 'ready' : 'blocked', JSON.stringify(p.items));
    assert.equal(p.items[0].consumers.length >= 2, true);
    if (!ready) { await executeInventoryAdoption(p, { confirm: true }); assert.equal(f.writes.length, 0); }
  }
});

test('shared safe Items written once before both actors, existing quantity never rewritten; all unrelated data/body preserved', async () => {
  for (const explicit of [false, true]) {
    const f = await adoptionFixture({ actors: [
      { id: 'actor', blocks: [[['A', '3']]], values: { 'dnd.level': 5, 'dnd.health': { 'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 2 } } },
      { id: 'player', type: 'player', blocks: [[['A', '3']]] }
    ], items: [{ id: 'A', values: explicit ? { 'item.quantity': 3, 'item.equipped': true } : { 'item.equipped': true } }] });
    const before = f.pages.map(page => parsePageRecordContent(page.content));
    const result = await run(f);
    assert.equal(result.status, 'completed', JSON.stringify(result));
    assert.deepEqual(pageWrites(f).map(write => write.path), explicit ? ['pages/actor.md', 'pages/player.md'] : ['pages/A.md', 'pages/actor.md', 'pages/player.md']);
    for (const [index, page] of f.pages.entries()) {
      const after = parsePageRecordContent(await f.adapter.readText(page.path));
      assert.equal(after.rawBody, before[index].rawBody);
      assert.deepEqual(after.variablesJson.inactive, before[index].variablesJson.inactive);
      assert.match(page.content, /unknownFutureMetadata: keep/);
      const sourceValues = { ...before[index].variablesJson.values }, targetValues = { ...after.variablesJson.values };
      for (const key of page.type === 'item' ? ['item.quantity'] : ['dnd.items', 'dnd.equippedItems']) delete targetValues[key], delete sourceValues[key];
      assert.deepEqual(targetValues, sourceValues);
      if (page.type !== 'item') {
        assert.deepEqual(after.variablesJson.values['dnd.equippedItems'], []);
        const inventory = readInventoryModelFromPage(page, { registry: (await import('./fixtures/inventoryAdoptionFixtures.mjs')).registry, pages: f.pages });
        assert.equal(inventory.source, 'entity'); assert.equal(inventory.items[0].quantity, 3);
      }
    }
    f.writes.length = 0;
    assert.equal((await run(f)).status, 'skipped'); assert.equal(f.writes.length, 0);
  }
});

test('blocked selected actor dependencies cannot indirectly migrate shared Item quantity; independent actor may complete', async () => {
  const f = await adoptionFixture({ actors: [
    { id: 'actor', blocks: [[['A', '3']]] }, { id: 'blocked', blocks: [[['A', '3'], ['missing', '1']]] },
    { id: 'independent', blocks: [[['B', '2']]] }
  ], items: [{ id: 'A' }, { id: 'B' }] });
  const p = await preview(f);
  assert.deepEqual(p.actors.map(actor => actor.status), ['blocked', 'blocked', 'ready']);
  const result = await executeInventoryAdoption(p, { confirm: true });
  assert.equal(result.status, 'partial'); assert.deepEqual(pageWrites(f).map(write => write.path), ['pages/B.md', 'pages/independent.md']);
});

for (const failure of ['backup-create', 'backup-verify', 'backup-source', 'journal-before', 'journal-checkpoint', 'item-write', 'actor-write', 'readback', 'actor-readback', 'stale-actor', 'stale-item', 'catalog', 'workspace', 'missing-item', 'missing-actor', 'moved-runtime']) {
  test(`execution stops on ${failure}; no fabricated success or automatic rollback/retry`, async () => {
    const f = await adoptionFixture(); const p = await preview(f);
    const write = f.adapter.writeText.bind(f.adapter), read = f.adapter.readText.bind(f.adapter);
    let written = 0, failRead = false, injected = false;
    f.adapter.writeText = async (path, content) => {
      if (failure === 'backup-create' && path.endsWith('/manifest.json')) throw new Error('backup failed');
      if (failure === 'journal-before' && path.includes('/pending/')) throw new Error('journal failed');
      if (failure === 'journal-checkpoint' && path.includes('/pending/') && written) throw new Error('checkpoint failed');
      if (path.startsWith('pages/')) {
        if ((failure === 'item-write' && path === f.item.path) || (failure === 'actor-write' && path === f.actor.path)) throw new Error('write failed');
        written++;
        if ((failure === 'readback' && path === f.item.path) || (failure === 'actor-readback' && path === f.actor.path)) failRead = true;
      }
      const result = await write(path, content);
      if (failure === 'backup-source' && path.endsWith('/manifest.json') && !injected) { injected = true; await write(f.actor.path, f.actor.content + ' concurrent body'); }
      return result;
    };
    f.adapter.readText = async path => {
      if (failure === 'backup-verify' && path.includes('/pages/A.md')) throw new Error('backup verification failed');
      if (failRead && path.startsWith('pages/')) throw new Error('uncertain readback');
      return read(path);
    };
    if (failure.startsWith('stale-')) await write(failure === 'stale-actor' ? f.actor.path : f.item.path, f.actor.content + 'changed');
    if (failure === 'catalog') await write(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...catalog, revision: 2 }));
    if (failure === 'workspace') setStorageAdapter(createMemoryStorageAdapter());
    if (failure.startsWith('missing-')) await f.adapter.removeFile(failure === 'missing-item' ? f.item.path : f.actor.path);
    if (failure === 'moved-runtime') f.item.path = 'pages/moved.md';
    const result = await executeInventoryAdoption(p, { confirm: true });
    assert.ok(['failed', 'uncertain'].includes(result.status), JSON.stringify(result));
    if (['journal-checkpoint', 'actor-write', 'readback', 'actor-readback'].includes(failure)) assert.equal(written, failure === 'actor-readback' ? 2 : 1);
    else assert.equal(written, 0);
    if (failure !== 'actor-readback') assert.equal(values(await read('pages/actor.md').catch(() => f.actor.content))['dnd.items'], undefined);
  });
}

test('resume verifies source/target identities from backup after checkpoint crash; third state conflicts; explicit recovery requires safety backup', async () => {
  for (const crashAfter of [0, 1, 2]) {
    const f = await adoptionFixture(); const p = await preview(f);
    const write = f.adapter.writeText.bind(f.adapter); let writes = 0;
    f.adapter.writeText = async (path, content) => {
      if (path.includes('/pending/') && writes === crashAfter && (crashAfter > 0 || path.includes('/pending/'))) {
        // Initial journal failure has no operation to resume; persist then mimic crash.
        if (crashAfter === 0) await write(path, content);
        throw new Error('simulated crash');
      }
      if (path.startsWith('pages/')) writes++;
      return write(path, content);
    };
    const result = await executeInventoryAdoption(p, { confirm: true });
    f.adapter.writeText = write;
    const operationId = result.operationId || result.backupId;
    // Simulate process reload: recreate runtime pages from durable files.
    setPages(await Promise.all(f.pages.map(async page => createRuntimePageFromContent({ content: await f.adapter.readText(page.path), path: page.path, name: page.name }))));
    const inspect = await inspectInventoryAdoptionResume(operationId, f.options);
    assert.equal(inspect.status, 'ready', JSON.stringify(inspect));
    assert.deepEqual(inspect.pages.map(page => page.status), crashAfter === 0 ? ['pending', 'pending'] : crashAfter === 1 ? ['verified-skip', 'pending'] : ['verified-skip', 'verified-skip']);
    const resumed = await resumeInventoryAdoption(operationId, { ...f.options, confirm: true });
    assert.equal(resumed.status, 'completed', JSON.stringify(resumed));
    assert.equal(values(await f.adapter.readText('pages/actor.md'))['dnd.items'][0].pageId, 'A');
    const before = await f.adapter.readText('pages/actor.md');
    await write('pages/actor.md', before + 'user edit');
    assert.equal((await inspectInventoryAdoptionResume(operationId, f.options)).status, 'conflict');
    await assert.rejects(recoverInventoryAdoption(result.backupId));
    const restored = await recoverInventoryAdoption(result.backupId, { confirm: true });
    assert.equal(restored.restoredPages, 2);
    assert.equal(values(await f.adapter.readText('pages/actor.md'))['dnd.items'], undefined);
    assert.equal(values(await f.adapter.readText('pages/A.md'))['item.quantity'], undefined);
    // Opening/reading restored data performs no adoption.
    assert.equal(await f.adapter.readText('pages/actor.md'), p.pages.find(page => page.role === 'actor').sourceContent);
    assert.ok(f.writes.some(entry => entry.path.includes('pre-restore')));
  }
});

test('crash after some Items resumes remaining dependencies before actor; changed Item third state never resumes', async () => {
  const f = await adoptionFixture({ actors: [{ id: 'actor', blocks: [[['A', '1'], ['B', '4']]] }], items: [{ id: 'A' }, { id: 'B' }] });
  const write = f.adapter.writeText.bind(f.adapter); let itemWritten = false;
  f.adapter.writeText = async (path, content) => {
    if (path.includes('/pending/') && itemWritten) throw new Error('checkpoint crash');
    const result = await write(path, content);
    if (path === 'pages/A.md') itemWritten = true;
    return result;
  };
  const failed = await run(f); f.adapter.writeText = write;
  assert.deepEqual(pageWrites(f).map(entry => entry.path), ['pages/A.md']);
  assert.equal(values(f.actor.content)['dnd.items'], undefined);
  const resumed = await resumeInventoryAdoption(failed.operationId, { ...f.options, confirm: true });
  assert.equal(resumed.status, 'completed', JSON.stringify(resumed));
  assert.deepEqual(pageWrites(f).map(entry => entry.path), ['pages/A.md', 'pages/B.md', 'pages/actor.md']);
  await write('pages/A.md', f.item.content + 'user change');
  assert.equal((await inspectInventoryAdoptionResume(failed.operationId, f.options)).status, 'conflict');
});

test('backup source verification precedes journal; catalog/dependency changes after Item commit block actor activation', async () => {
  for (const mutation of ['catalog', 'actor', 'new-consumer']) {
    const f = await adoptionFixture(); const write = f.adapter.writeText.bind(f.adapter);
    f.adapter.writeText = async (path, content) => {
      const result = await write(path, content);
      if (path === 'pages/A.md') {
        if (mutation === 'catalog') await write(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...catalog, revision: 2 }));
        if (mutation === 'actor') await write('pages/actor.md', f.actor.content + 'user edit');
        if (mutation === 'new-consumer') await write('pages/new.md', f.actor.content.replace('id: actor', 'id: new'));
      }
      return result;
    };
    const result = await run(f);
    assert.ok(['failed', 'uncertain'].includes(result.status));
    assert.deepEqual(pageWrites(f).map(entry => entry.path), ['pages/A.md',
      ...(mutation === 'actor' ? ['pages/actor.md'] : mutation === 'new-consumer' ? ['pages/new.md'] : [])]);
    assert.equal(values(await f.adapter.readText('pages/actor.md'))['dnd.items'], undefined);
  }
});

test('existing own Effects extension and metadata survive adoption without activating/migrating Effects', async () => {
  const { encodeOwnEffects, OWN_EFFECTS_FIELD_SET, OWN_EFFECTS_KEY } = await import('../js/character/ownEffectsDefinition.js');
  const f = await adoptionFixture();
  const envelope = parsePageRecordContent(f.actor.content).variablesJson;
  envelope.extensions = { revision: 1, fields: [{ id: OWN_EFFECTS_FIELD_SET.id, version: OWN_EFFECTS_FIELD_SET.version }] };
  envelope.values[OWN_EFFECTS_KEY] = encodeOwnEffects({ conditions: [], effects: [], selectedRuleIds: ['selected-rule'] });
  f.actor.content = updatePageRecordContent(f.actor.content, { variablesJson: envelope });
  await f.adapter.writeText(f.actor.path, f.actor.content); f.writes.length = 0;
  const before = parsePageRecordContent(f.actor.content);
  const result = await run(f);
  assert.equal(result.status, 'completed', JSON.stringify(result));
  const after = parsePageRecordContent(f.actor.content);
  assert.deepEqual(after.variablesJson.extensions, before.variablesJson.extensions);
  assert.deepEqual(after.variablesJson.values[OWN_EFFECTS_KEY], before.variablesJson.values[OWN_EFFECTS_KEY]);
  assert.equal(after.updatedAt, before.updatedAt); assert.equal(after.rawBody, before.rawBody);
});

test('recovery refuses to overwrite pages if required pre-restore safety backup fails', async () => {
  const f = await adoptionFixture(); const result = await run(f);
  const actor = await f.adapter.readText(f.actor.path), item = await f.adapter.readText(f.item.path);
  const write = f.adapter.writeText.bind(f.adapter);
  f.adapter.writeText = async (path, content) => {
    if (path.includes('pre-restore') && path.endsWith('/manifest.json')) throw new Error('pre-restore backup failed');
    return write(path, content);
  };
  await assert.rejects(recoverInventoryAdoption(result.backupId, { confirm: true }));
  assert.equal(await f.adapter.readText(f.actor.path), actor);
  assert.equal(await f.adapter.readText(f.item.path), item);
});

test('verified backup with different source bytes still blocks before journal/page writes', async () => {
  const f = await adoptionFixture(); const p = await preview(f);
  const read = f.adapter.readText.bind(f.adapter); let actorReads = 0;
  f.adapter.readText = async path => {
    const content = await read(path);
    if (path === 'pages/actor.md' && ++actorReads === 2) return content + 'different backup source';
    return content;
  };
  const result = await executeInventoryAdoption(p, { confirm: true });
  assert.equal(result.status, 'failed'); assert.match(result.reason, /Backup source mismatch/);
  assert.equal(pageWrites(f).length, 0);
  assert.equal(f.writes.some(entry => entry.path.includes('/pending/')), false);
});

test('resume of a durable target requires refreshed runtime source, never exposes stale quantity as completed', async () => {
  const f = await adoptionFixture(); const source = f.item.content;
  const result = await run(f);
  f.item.content = source; // stale cache after restart/readback uncertainty
  const resumed = await resumeInventoryAdoption(result.operationId, { ...f.options, confirm: true });
  assert.equal(resumed.status, 'failed'); assert.match(resumed.reason, /Reload.*runtime/);
  assert.equal(values(await f.adapter.readText('pages/A.md'))['item.quantity'], 3);
});
