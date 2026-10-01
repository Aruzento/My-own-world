import './setup.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { BUNDLED_CARD_TYPE_DEFINITIONS as types, BUNDLED_FIELD_SET_DEFINITIONS as fieldSets } from '../js/cardTypes/definitions/bundledDefinitions.js';
import { buildPageRecordContent, createRuntimePageFromContent, createPageStateIdentityFromContent, parsePageRecordContent, updatePageRecordContent } from '../js/core/pageRecord.js';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog, createCardTypeRegistryFromCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import { setPages } from '../js/stateActions.js';
import * as repository from '../js/repository/pageRepository.js';
import { createEditConflictFixture, createMemoryStorageAdapter } from './fixtures/editConflictFixtures.mjs';
import { prepareInventoryContext, readInventorySource, prepareInventoryChange, commitInventoryChange } from '../js/character/structuredInventory.js';
import { readInventoryModelFromPage } from '../js/character/inventoryModel.js';
import { readCharacterModelFromPage } from '../js/character/characterModel.js';

const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
const body = '<h1>Actor</h1><div class="item-set-block"><div class="item-set-list"><button class="item-set-chip" data-page-id="B"><input class="item-set-quantity" value="99"></button></div></div>';
const refs = ids => ids.map(pageId => ({ pageId }));
const identity = page => createPageStateIdentityFromContent(page.content);

function page(id, type, values, options = {}) {
  const content = buildPageRecordContent({ id, type, template: 'card', schemaVersion: values ? 2 : 1,
    body: options.body || body,
    ...(values ? { variablesJson: { formatVersion: 1, schemaVersion: 1,
      schemaDigest: registry.getResolvedType(type, 1).digest, values, overrides: {} } } : {}) });
  return createRuntimePageFromContent({ content, path: `/pages/${id}.md`, name: `${id}.md` });
}

async function fixture({ type = 'character', values = { 'dnd.items': refs(['A']), 'dnd.equippedItems': [] }, catalogActive = true } = {}) {
  const base = await createEditConflictFixture();
  const actor = page('actor', type, values);
  const A = page('A', 'item', { 'item.quantity': 0, 'item.equipped': false });
  const B = page('B', 'item', { 'item.quantity': 3, 'item.equipped': true });
  const legacy = page('legacy', 'item', null);
  const missingQuantity = page('missing-quantity', 'item', {});
  const wrong = page('wrong', 'lore', {});
  const pages = [actor, A, B, legacy, missingQuantity, wrong];
  for (const record of pages) await base.adapter.writeText(record.path, record.content);
  if (catalogActive) await base.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
  setPages(pages);
  const context = await prepareInventoryContext({ page: actor, repository });
  const writes = [];
  const write = base.adapter.writeText.bind(base.adapter);
  base.adapter.writeText = async (path, content) => { writes.push(path); return write(path, content); };
  return { adapter: base.adapter, actor, A, B, pages, context, writes };
}
function prepare(f, request, expectedBase = identity(f.actor)) {
  return prepareInventoryChange({ pageId: f.actor.id, expectedBase, request, context: f.context });
}

test('approved Character and Player inventory uses explicit arrays, quantities and actor equipment', async () => {
  for (const type of ['character', 'player']) {
    const f = await fixture({ type, values: { 'dnd.items': refs(['A', 'B']), 'dnd.equippedItems': refs(['B']) } });
    const inventory = readInventorySource(f.actor, f.context);
    assert.equal(inventory.source, 'entity');
    assert.deepEqual(inventory.items.map(item => [item.pageId, item.quantity, item.equipped]), [['A', 0, false], ['B', 3, true]]);
    assert.equal(inventory.totalQuantity, 3);
    assert.deepEqual(readCharacterModelFromPage(f.actor, { ...f.context, pages: f.pages }).inventory.items, inventory.items);
    assert.equal(parsePageRecordContent(f.A.content).variablesJson.values['item.equipped'], false);
    assert.equal(parsePageRecordContent(f.B.content).variablesJson.values['item.equipped'], true);
  }
});

test('explicit empty beats recovery HTML; unadopted/partial/dangling state is unavailable', async () => {
  for (const [values, source] of [
    [{ 'dnd.items': [], 'dnd.equippedItems': [] }, 'entity'],
    [{}, 'unavailable'],
    [{ 'dnd.items': [] }, 'unavailable'],
    [{ 'dnd.equippedItems': [] }, 'unavailable'],
    [{ 'dnd.items': refs(['A']), 'dnd.equippedItems': refs(['B']) }, 'unavailable']
  ]) {
    const f = await fixture({ values });
    const model = readInventorySource(f.actor, f.context);
    assert.equal(model.source, source);
    if (source !== 'entity') assert.throws(() => prepare(f, { type: 'add', pageId: 'B' }));
    assert.equal(f.writes.length, 0);
  }
  const f = await fixture({ values: null, catalogActive: false });
  assert.equal(f.context.mode, 'unavailable');
});

test('exact references diagnose missing/wrong/invalid Items without title fallback; quantity fallback is presentation only', async () => {
  const f = await fixture({ values: { 'dnd.items': refs(['missing', 'wrong', 'legacy', 'missing-quantity']), 'dnd.equippedItems': [] } });
  const model = readInventorySource(f.actor, f.context);
  assert.deepEqual(model.items.map(item => [item.pageId, item.quantityWritable, item.effectEligible]), [
    ['missing', false, false], ['wrong', false, false], ['legacy', false, true], ['missing-quantity', false, true]
  ]);
  assert.equal(model.items.at(-1).quantitySource, 'presentation');
  assert.equal(model.items.at(-1).quantity, 1);
  assert.equal(Object.hasOwn(parsePageRecordContent(f.pages[4].content).variablesJson.values, 'item.quantity'), false);
  for (const pageId of ['missing', 'wrong', 'legacy', 'missing-quantity']) {
    assert.throws(() => prepare(f, { type: 'quantity', pageId, quantity: 2, expectedItemBase: identity(f.A) }));
  }
  assert.equal(f.writes.length, 0);
});

test('invalid/future/missing catalog source never falls back, and unrelated types cannot own inventory', async () => {
  for (const mode of ['invalid', 'future', 'catalog']) {
    const f = await fixture({ catalogActive: mode !== 'catalog' });
    if (mode !== 'catalog') f.actor.content = f.actor.content.replace(/variablesJson:.*\n/, mode === 'future'
      ? 'variablesJson: {"formatVersion":2}\n' : 'variablesJson: broken\n');
    assert.equal(readInventorySource(f.actor, f.context).source, 'unavailable');
    assert.throws(() => prepare(f, { type: 'add', pageId: 'B' }));
    assert.equal(f.writes.length, 0);
  }
  const f = await fixture();
  assert.equal(readInventoryModelFromPage(f.A, f.context).source, 'unavailable');
});

test('invalid/future Item target is diagnostic, not an effect or quantity write source; identical titles never select identity', async () => {
  for (const invalid of ['broken', '{"formatVersion":2}']) {
    const f = await fixture();
    f.A.content = f.A.content.replace(/variablesJson:.*\n/, `variablesJson: ${invalid}\n`);
    const item = readInventorySource(f.actor, f.context).items[0];
    assert.equal(item.effectEligible, false);
    assert.equal(item.quantityWritable, false);
    assert.throws(() => prepare(f, { type: 'quantity', pageId: 'A', quantity: 3, expectedItemBase: identity(f.A) }));
    assert.equal(f.writes.length, 0);
  }
  const f = await fixture();
  assert.equal(f.A.title, f.B.title);
  const envelope = parsePageRecordContent(f.actor.content).variablesJson;
  envelope.values['dnd.items'] = refs([f.A.title]);
  f.actor.content = updatePageRecordContent(f.actor.content, { variablesJson: envelope });
  const item = readInventorySource(f.actor, f.context).items[0];
  assert.equal(item.effectEligible, false);
  assert.equal(item.pageId, f.A.title);
});

test('add/remove uses one actor write, duplicate add no-op, removes equipped membership atomically and preserves body', async () => {
  const f = await fixture({ values: { 'dnd.items': refs(['A', 'B']), 'dnd.equippedItems': refs(['B']), 'dnd.level': 5 } });
  const originalBody = parsePageRecordContent(f.actor.content).rawBody;
  let plan = prepare(f, { type: 'add', pageId: 'A' });
  assert.equal((await commitInventoryChange(plan)).status, 'unchanged');
  assert.equal((await commitInventoryChange(plan)).status, 'blocked');
  assert.equal(f.writes.length, 0);
  plan = prepare(f, { type: 'remove', pageId: 'B' });
  const result = await commitInventoryChange(plan);
  assert.equal(result.status, 'saved', JSON.stringify(result));
  assert.deepEqual(f.writes, [f.actor.path]);
  const durable = parsePageRecordContent(await f.adapter.readText(f.actor.path));
  assert.deepEqual(durable.variablesJson.values['dnd.items'], refs(['A']));
  assert.deepEqual(durable.variablesJson.values['dnd.equippedItems'], []);
  assert.equal(durable.variablesJson.values['dnd.level'], 5);
  assert.equal(durable.rawBody, originalBody);
  assert.equal(parsePageRecordContent(f.B.content).variablesJson.values['item.equipped'], true);
  assert.equal((await commitInventoryChange(prepare(f, { type: 'add', pageId: 'B' }))).status, 'saved');
  assert.deepEqual(readInventorySource(f.actor, f.context).items.map(item => item.pageId), ['A', 'B']);
});

test('quantity writes exact Item only, keeps zero, preserves actor and respects Item schema', async () => {
  const f = await fixture();
  const parent = f.actor.content;
  for (const quantity of [3, 0]) {
    const result = await commitInventoryChange(prepare(f, {
      type: 'quantity', pageId: 'A', quantity, expectedItemBase: identity(f.A)
    }));
    assert.equal(result.status, 'saved', JSON.stringify(result));
    assert.equal(result.inventory.items[0].quantity, quantity);
  }
  assert.deepEqual(f.writes, [f.A.path, f.A.path]);
  assert.equal(f.actor.content, parent);
  assert.equal(await f.adapter.readText(f.actor.path), parent);
  assert.throws(() => prepare(f, { type: 'quantity', pageId: 'A', quantity: -1, expectedItemBase: identity(f.A) }));
  assert.throws(() => prepare(f, { type: 'quantity', pageId: 'A', quantity: 1.5, expectedItemBase: identity(f.A) }));
});

test('stale parent/Item, missing target, changed catalog/workspace prevent writes without rebase', async t => {
  for (const failure of ['parent', 'item', 'deleted', 'moved', 'catalog', 'quantity-catalog', 'workspace', 'missing-durable', 'deleted-durable-item', 'durable-actor-link']) await t.test(failure, async () => {
    const f = await fixture();
    const plan = prepare(f, ['item', 'quantity-catalog', 'durable-actor-link'].includes(failure)
      ? { type: 'quantity', pageId: 'A', quantity: 5, expectedItemBase: identity(f.A) }
      : { type: 'add', pageId: 'B' });
    if (failure === 'parent' || failure === 'item') {
      const target = failure === 'parent' ? f.actor : f.A;
      target.content = updatePageRecordContent(target.content, { body: '<p>external</p>' });
      await f.adapter.writeText(target.path, target.content);
    } else if (failure === 'deleted') setPages(f.pages.filter(item => item.id !== 'B'));
    else if (failure === 'moved') f.B.path = '/pages/moved.md';
    else if (failure === 'catalog' || failure === 'quantity-catalog') await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ ...catalog, types: types.filter(definition => definition.id !== 'character') }));
    else if (failure === 'missing-durable') {
      const read = f.adapter.readText.bind(f.adapter);
      f.adapter.readText = async path => { if (path === f.actor.path) throw new Error('missing page'); return read(path); };
    }
    else if (failure === 'deleted-durable-item') {
      const read = f.adapter.readText.bind(f.adapter);
      f.adapter.readText = async path => { if (path === f.B.path) throw new Error('missing item'); return read(path); };
    }
    else if (failure === 'durable-actor-link') await f.adapter.writeText(f.actor.path, updatePageRecordContent(f.actor.content, { body: '<p>durable external actor edit</p>' }));
    else setStorageAdapter(createMemoryStorageAdapter());
    f.writes.length = 0;
    const result = await commitInventoryChange(plan);
    assert.notEqual(result.status, 'saved', failure);
    assert.deepEqual(f.writes, []);
  });
});

test('prepare is detached/pure and stale Item preview fails before any write', async () => {
  const f = await fixture();
  const staleItem = identity(f.A);
  f.A.content = updatePageRecordContent(f.A.content, { body: '<p>Item edit</p>' });
  assert.throws(() => prepare(f, { type: 'quantity', pageId: 'A', quantity: 2, expectedItemBase: staleItem }));
  assert.throws(() => prepare(f, { type: 'add', pageId: 'wrong' }));
  assert.throws(() => prepare(f, { type: 'add', pageId: 'missing' }));
  const request = { type: 'add', pageId: 'B' };
  const plan = prepare(f, request);
  request.pageId = 'wrong';
  assert.equal(plan.request.pageId, 'B');
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(f.writes.length, 0);
  const staleParent = identity(f.actor);
  f.actor.content = updatePageRecordContent(f.actor.content, { body: '<p>external parent edit</p>' });
  assert.throws(() => prepare(f, { type: 'add', pageId: 'B' }, staleParent));
});

test('write failure/readback failure cannot report successful domain result or trigger retry', async t => {
  for (const failure of ['write', 'readback']) await t.test(failure, async () => {
    const f = await fixture();
    const plan = prepare(f, { type: 'add', pageId: 'B' });
    const write = f.adapter.writeText.bind(f.adapter);
    let attempted = 0;
    f.adapter.writeText = async (path, content) => {
      if (path === f.actor.path) {
        attempted++;
        if (failure === 'write') throw new Error('write failed');
      }
      return write(path, content);
    };
    const read = f.adapter.readText.bind(f.adapter);
    f.adapter.readText = async path => {
      const content = await read(path);
      return failure === 'readback' && attempted && path === f.actor.path ? content + '\nreadback mismatch' : content;
    };
    const result = await commitInventoryChange(plan);
    assert.notEqual(result.status, 'saved');
    assert.equal(attempted, 1);
    if (failure === 'readback') assert.equal(result.status, 'uncertain');
    assert.equal((await commitInventoryChange(plan)).status, 'blocked');
    assert.equal(attempted, 1);
  });
});
