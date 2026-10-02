import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerSheetFixture } from './fixtures/playerSheetFixtures.mjs';
import { prepareCardTypeChange, commitCardTypeChange, inspectCardTypeChangeRecovery, prepareCardTypeRecovery } from '../js/variables/cardTypeChange.js';
import { createPageStateIdentityFromContent, parsePageRecordContent, updatePageRecordContent } from '../js/core/pageRecord.js';
import { CARD_TYPE_CATALOG_PATH, activateCardTypeDefinitions, readCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { PageIndex } from '../js/repository/pageIndex.js';

async function fixture() {
  const f = await createPlayerSheetFixture();
  const catalog = JSON.parse(await f.adapter.readText(CARD_TYPE_CATALOG_PATH));
  catalog.types = catalog.types.filter(type => !['character', 'country'].includes(type.id));
  await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, JSON.stringify(catalog));
  f.source = f.page.content; f.catalogSource = await f.adapter.readText(CARD_TYPE_CATALOG_PATH);
  f.writes.length = 0;
  f.plan = await prepareCardTypeChange({ pageId: f.page.id, targetType: 'character', expectedBase: createPageStateIdentityFromContent(f.source) });
  return f;
}

test('scoped type change protects exactly one page/catalog before-image and never enumerates or copies assets', async () => {
  const f = await fixture();
  f.adapter.listFiles = async () => { throw new Error('No workspace enumeration allowed'); };
  f.adapter.readBinary = f.adapter.writeBinary = async () => { throw new Error('No asset copying allowed'); };
  const result = await commitCardTypeChange(f.plan, { confirm: true });
  assert.equal(result.status, 'saved', JSON.stringify(result));
  assert.equal(parsePageRecordContent(await f.adapter.readText(f.page.path)).type, 'character');
  const entry = JSON.parse(await f.adapter.readText(`.my-own-world-ops/committed/${result.operationId}.json`));
  assert.deepEqual(entry.affectedPages, [f.page.id]);
  assert.equal(entry.before.page.content, f.source); assert.equal(entry.before.catalog.content, f.catalogSource);
  assert.ok(f.writes.every(path => path === f.page.path || path === CARD_TYPE_CATALOG_PATH || path.startsWith('.my-own-world-ops/')));
  assert.ok(!f.writes.some(path => path.startsWith('.my-own-world-backups/')));
  assert.equal((await commitCardTypeChange(f.plan, { confirm: true })).status, 'blocked');
});

for (const failure of ['journal-write', 'journal-readback', 'catalog-before', 'catalog-after', 'page-before', 'page-readback', 'checkpoint']) {
  test(`scoped recovery ${failure} failure keeps exact evidence and honest outcome`, async () => {
    const f = await fixture(), write = f.adapter.writeText.bind(f.adapter), read = f.adapter.readText.bind(f.adapter);
    let pageWritten = false;
    f.adapter.writeText = async (path, content) => {
      if (failure === 'journal-write' && path.includes('/pending/')) throw new Error('journal unavailable');
      if (failure === 'catalog-before' && path === CARD_TYPE_CATALOG_PATH) throw new Error('catalog write unavailable');
      if (failure === 'page-before' && path === f.page.path) throw new Error('page write unavailable');
      if (failure === 'checkpoint' && path.includes('/committed/')) throw new Error('checkpoint unavailable');
      await write(path, content);
      if (path === f.page.path) pageWritten = true;
      if (failure === 'catalog-after' && path === CARD_TYPE_CATALOG_PATH) throw new Error('catalog installed then failed');
    };
    f.adapter.readText = async path => {
      const content = await read(path);
      if (failure === 'journal-readback' && path.includes('/pending/')) return content + 'mismatch';
      if (failure === 'page-readback' && pageWritten && path === f.page.path) return content + 'mismatch';
      return content;
    };
    const result = await commitCardTypeChange(f.plan, { confirm: true });
    assert.ok(['blocked', 'failed', 'uncertain'].includes(result.status), JSON.stringify(result));
    assert.notEqual(result.status, 'saved');
    const durable = await read(f.page.path);
    assert.equal(durable, pageWritten ? f.plan.candidateContent : f.source);
    if (failure.startsWith('journal-')) assert.equal(await read(CARD_TYPE_CATALOG_PATH), f.catalogSource);
    if (result.operationId) {
      f.adapter.writeText = write; f.adapter.readText = read;
      const entry = JSON.parse(await read(`.my-own-world-ops/pending/${result.operationId}.json`));
      assert.equal(entry.before.page.content, f.source); assert.equal(entry.before.catalog.content, f.catalogSource);
      const inspection = await inspectCardTypeChangeRecovery(result.operationId);
      assert.equal(inspection.pageState, pageWritten ? 'target' : 'source');
      assert.equal(inspection.catalogState, failure === 'catalog-before' ? 'source' : 'target');
    }
  });
}

test('explicit guarded recovery restores exact original page and retains additive definitions', async () => {
  const f = await fixture();
  const changed = await commitCardTypeChange(f.plan, { confirm: true }); assert.equal(changed.status, 'saved');
  const activatedCatalog = await f.adapter.readText(CARD_TYPE_CATALOG_PATH);
  const recovery = await prepareCardTypeRecovery(changed.operationId);
  f.writes.length = 0;
  const restored = await commitCardTypeChange(recovery, { confirm: true });
  assert.equal(restored.status, 'saved', JSON.stringify(restored));
  assert.equal(await f.adapter.readText(f.page.path), f.source);
  assert.equal(await f.adapter.readText(CARD_TYPE_CATALOG_PATH), activatedCatalog);
  assert.ok(!f.writes.includes(CARD_TYPE_CATALOG_PATH));
  assert.equal((await inspectCardTypeChangeRecovery(changed.operationId)).status, 'already-original');
  const noop = await prepareCardTypeRecovery(changed.operationId); f.writes.length = 0;
  assert.equal((await commitCardTypeChange(noop, { confirm: true })).status, 'unchanged'); assert.equal(f.writes.length, 0);
});

test('recovery rejects third state, corrupt evidence, stale plans and arbitrary JSON', async () => {
  const f = await fixture(); const changed = await commitCardTypeChange(f.plan, { confirm: true });
  const recovery = await prepareCardTypeRecovery(changed.operationId);
  const newer = updatePageRecordContent(f.page.content, { body: '<h1>External newest</h1>' });
  await f.adapter.writeText(f.page.path, newer); f.writes.length = 0;
  assert.equal((await inspectCardTypeChangeRecovery(changed.operationId)).status, 'conflict');
  await assert.rejects(prepareCardTypeRecovery(changed.operationId), /conflict/);
  assert.equal((await commitCardTypeChange(recovery, { confirm: true })).status, 'blocked'); assert.equal(f.writes.length, 0);
  assert.equal((await commitCardTypeChange({ ...recovery }, { confirm: true })).status, 'blocked');
  const path = `.my-own-world-ops/committed/${changed.operationId}.json`;
  const entry = JSON.parse(await f.adapter.readText(path)); entry.before.page.content += 'corrupt';
  await f.adapter.writeText(path, JSON.stringify(entry));
  await assert.rejects(inspectCardTypeChangeRecovery(changed.operationId), /digest mismatch/);
  await assert.rejects(inspectCardTypeChangeRecovery('../outside'), /Invalid recovery/);
});

test('same type and stale source create no recovery copy or persistent mutation', async () => {
  const f = await fixture();
  const same = await prepareCardTypeChange({ pageId: f.page.id, targetType: 'player', expectedBase: createPageStateIdentityFromContent(f.source) });
  assert.equal((await commitCardTypeChange(same, { confirm: true })).status, 'unchanged'); assert.equal(f.writes.length, 0);
  await f.adapter.writeText(f.page.path, f.source + '\nexternal'); f.writes.length = 0;
  assert.equal((await commitCardTypeChange(f.plan, { confirm: true })).status, 'blocked'); assert.equal(f.writes.length, 0);
});

test('yielding index refresh cannot overwrite a newer registry/reload generation', async () => {
  const { registry, record } = await import('./fixtures/inventoryAdoptionFixtures.mjs');
  const pages = Array.from({ length: 100 }, (_, i) => record(`yield-${i}`, 'lore', { 'lore.entry': `value ${i}` }));
  const index = new PageIndex(pages); let checked = 0;
  await index.setRegistryYielding(registry, () => { if (++checked === 3) index.setRegistry(null); });
  assert.equal(index.registry, null);
  assert.ok(index.getAllPages().every(page => !index.searchDocuments.get(page.id).typedReferences.length));
});

test('recovery retains later activated definitions and blocks malformed current catalog', async () => {
  const f = await fixture();
  const changed = await commitCardTypeChange(f.plan, { confirm: true });
  const { BUNDLED_CARD_TYPE_DEFINITIONS } = await import('../js/cardTypes/definitions/bundledDefinitions.js');
  const current = await readCardTypeCatalog();
  await activateCardTypeDefinitions({ types: [BUNDLED_CARD_TYPE_DEFINITIONS.find(type => type.id === 'country')], expectedIdentity: current.identity });
  const newerCatalog = await f.adapter.readText(CARD_TYPE_CATALOG_PATH);
  assert.equal((await inspectCardTypeChangeRecovery(changed.operationId)).status, 'recoverable');
  const recovery = await prepareCardTypeRecovery(changed.operationId);
  assert.equal((await commitCardTypeChange(recovery, { confirm: true })).status, 'saved');
  assert.equal(await f.adapter.readText(CARD_TYPE_CATALOG_PATH), newerCatalog);
  await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, 'malformed catalog'); f.writes.length = 0;
  await assert.rejects(prepareCardTypeRecovery(changed.operationId));
  assert.equal(f.writes.length, 0);
});

test('source snapshot cannot rebase to a runtime change during asynchronous preparation', async () => {
  const f = await fixture(), read = f.adapter.readText.bind(f.adapter);
  let once = true;
  f.adapter.readText = async path => {
    const content = await read(path);
    if (once && path === CARD_TYPE_CATALOG_PATH) {
      once = false; f.page.content = updatePageRecordContent(f.page.content, { body: '<h1>Unsaved newer draft</h1>' });
    }
    return content;
  };
  const plan = await prepareCardTypeChange({ pageId: f.page.id, targetType: 'character', expectedBase: createPageStateIdentityFromContent(f.source) });
  assert.equal(plan.sourceContent, f.source);
  assert.equal(parsePageRecordContent(plan.candidateContent).rawBody, parsePageRecordContent(f.source).rawBody);
});

test('recovery preparation cannot silently follow a page moved during catalog read', async () => {
  const f = await fixture(), changed = await commitCardTypeChange(f.plan, { confirm: true });
  const read = f.adapter.readText.bind(f.adapter); let catalogReads = 0;
  f.adapter.readText = async path => {
    const content = await read(path);
    if (path === CARD_TYPE_CATALOG_PATH && ++catalogReads === 2) {
      f.page.path = 'pages/moved-during-recovery.md';
      await f.adapter.writeText(f.page.path, f.plan.candidateContent);
    }
    return content;
  };
  const recovery = await prepareCardTypeRecovery(changed.operationId); f.writes.length = 0;
  const result = await commitCardTypeChange(recovery, { confirm: true });
  assert.equal(result.status, 'blocked'); assert.equal(f.writes.length, 0);
  assert.equal(await read(f.page.path), f.plan.candidateContent);
});
