import { digestDefinition } from '../js/cardTypes/definitionIdentity.js';
import { writePageContent } from '../js/storage/writeQueue.js';
import { deleteWorkspaceAssetPath } from '../js/storage/assetWorkspaceService.js';
import { serializePageTemplates } from '../js/templates/pageTemplateStorage.js';
import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPageRecordContent, parsePageRecordContent, updatePageRecordContent,
  createPageStateIdentityFromContent, createRuntimePageFromContent } from '../js/core/pageRecord.js';
import { parseMarkdown } from '../js/core/markdown.js';
import { serializePageVariables, parseStrictVariablesJSON, VARIABLES_LIMITS } from '../js/core/pageVariablesCodec.js';
import { CardTypeRegistry } from '../js/cardTypes/cardTypeRegistry.js';
import { createCardVariableSnapshot } from '../js/variables/cardVariableStore.js';
import { readEntity, getValue, getValues, resolveReference } from '../js/variables/entityVariables.js';
import { createComputedResolverRegistry } from '../js/variables/computedResolvers.js';
import { prepareVariablesChange, commitVariablesChange } from '../js/variables/variableCommands.js';
import { validateVariableValue } from '../js/schema/cardVariablesSchema.js';
import { readCardTypeCatalog, serializeCardTypeCatalog, createCardTypeRegistryFromCatalog,
  activateCardTypeDefinitions, CARD_TYPE_CATALOG_PATH } from '../js/storage/cardTypeCatalogStorage.js';
import { createEditConflictFixture, createMemoryStorageAdapter } from './fixtures/editConflictFixtures.mjs';
import { captureStorageWorkspaceContext, setStorageAdapter } from '../js/storage/storageAdapter.js';
import { persistPageContentCommand, snapshotPageForCommand } from '../js/storage/pageCommandService.js';
import { getPageIndex } from '../js/repository/pageRepository.js';
import { createWorkspaceBackup, restoreWorkspaceBackup } from '../js/storage/backupService.js';
import { duplicatePageAsChild, createPageFromRecordContent } from '../js/storage/pageStorage.js';
import { savePageAsTemplate, createPageFromTemplate, parsePageTemplatesFile } from '../js/templates/pageTemplateStorage.js';
import { createWorldPackageFromPages, normalizeWorldPackageData } from '../js/worldPackage/worldPackageModel.js';
import { findOrphanAssetPaths, findOrphanPaths } from '../js/storage/assetOrphanDetector.js';
import { collectAssetReferencesFromPages } from '../js/storage/assetReferenceScanner.js';

const f = (key, datatype = 'string', rest = {}) => ({ key, datatype, label: key, binding: { owner: 'variables' }, ...rest });
const computed = (inputs = ['test.number']) => ({ resolverId: 'test.double', version: 1, inputs, allowOverride: true });
const definition = {
  id: 'character', version: 1, label: 'Test fixture only', includes: [], sections: [], fields: [
    f('test.number', 'integer', { default: 3, min: 0, max: 100 }),
    f('test.flag', 'boolean', { default: true }), f('test.text', 'string', { default: 'default' }),
    f('test.nullable', 'number', { nullable: true }), f('test.required', 'string', { required: true }),
    f('test.list', 'array', { default: ['a'], items: { datatype: 'string' } }),
    f('test.object', 'object', { default: { 'test.name': 'default' }, properties: [
      { key: 'test.name', label: 'Name', datatype: 'string' }
    ] }),
    f('test.result', 'integer', { computed: computed(), readonly: true, nullable: true }),
    f('test.boolResult', 'boolean', { computed: { resolverId: 'test.flag', version: 1, inputs: [], allowOverride: true } }),
    f('test.ref', 'reference', { targetTypes: ['character'], validation: { allowSelf: false, acyclic: true } }),
    f('test.rows', 'array', { items: { datatype: 'object', rowIdentityKey: 'test.rowId', properties: [
      { key: 'test.rowId', label: 'Id', datatype: 'string', required: true, readonly: true },
      { key: 'test.name', label: 'Name', datatype: 'string' }
    ] } }),
    f('test.locked', 'string', { readonly: true }),
    f('page.tags', 'array', { binding: { owner: 'page', path: 'tags' }, items: { datatype: 'string' } }),
    f('page.content', 'string', { binding: { owner: 'content', path: 'content' } }),
    f('ui.group', 'string', { binding: { owner: 'presentation' } })
  ]
};
const catalog = { formatVersion: 1, revision: 1, types: [definition], fieldSets: [] };
const registry = createCardTypeRegistryFromCatalog(catalog);
const resolvers = createComputedResolverRegistry([{ id: 'test.double', version: 1,
  resolve: inputs => inputs['test.number'] * 2 }]);
const envelope = (values = {}, rest = {}) => ({ formatVersion: 1, schemaVersion: 1,
  schemaDigest: registry.getResolvedType('character', 1).digest, values: { 'test.required': 'present', ...values }, ...rest });
const content = (data = envelope()) => buildPageRecordContent({ id: 'entity', type: 'character', variablesJson: data,
  tags: ['card'], body: '<h1>Entity</h1><p>Free text</p>', now: '2026-09-24T00:00:00Z' });
const snapshot = (data = envelope(), types = registry) => createCardVariableSnapshot({ id: 'entity', content: content(data) }, types);
const replaceWire = raw => content().replace(/^variablesJson:.*$/m, `variablesJson: ${raw}`);

test('PageRecord envelope roundtrip is deterministic, one-line, detached from DOM and projects through markdown/runtime', () => {
  const data = envelope({ 'opaque.types': [null, true, false, 0, 1.5, '', 'a\nb', { z: 2, a: 'Ю' }] }, {
    overrides: {}, futureMember: { nested: [3, 2, 1] }, inactive: [], migration: { id: 'test' }
  });
  const text = content(data);
  assert.equal(text.split('\n').filter(line => line.startsWith('variablesJson:')).length, 1);
  assert.deepEqual(parsePageRecordContent(text).variablesJson, data);
  assert.deepEqual(parseMarkdown(text).variablesJson, data);
  assert.deepEqual(createRuntimePageFromContent({ content: text }).variablesJson, data);
  assert.equal(serializePageVariables({ ...data, values: { z: 1, a: 2 } }),
    serializePageVariables({ ...data, values: { a: 2, z: 1 } }));
  assert.match(text, /a\\nb/);
});

test('absent envelope stays legacy on ordinary save while empty values are structured', () => {
  const legacy = buildPageRecordContent({ id: 'legacy', body: '<h1>Legacy</h1>' });
  assert.equal(parsePageRecordContent(updatePageRecordContent(legacy, { tags: ['changed'] })).variablesStatus.mode, 'legacy');
  assert.equal(snapshot({ ...envelope(), values: {} }).mode, 'structured');
  assert.ok(snapshot({ ...envelope(), values: {} }).diagnostics.some(issue => issue.code === 'variables.required'));
});

for (const [name, raw, mode, code] of [
  ['malformed', '{broken', 'invalid', 'invalid_json'],
  ['future', JSON.stringify({ formatVersion: 99, future: { foo: 1 } }), 'unsupported', 'unsupported_format_version'],
  ['duplicate key', '{"formatVersion":1,"formatVersion":1}', 'invalid', 'duplicate_key'],
  ['escaped duplicate', '{"a":1,"\\u0061":2}', 'invalid', 'duplicate_key'],
  ['prototype', '{"__proto__":{}}', 'invalid', 'unsafe_key'],
  ['overflow number', '{"n":1e999}', 'invalid', 'invalid_number'],
  ['invalid number', '{"n":01}', 'invalid', 'invalid_json']
]) test(`PageRecord retains ${name} wire without truncation or fallback`, () => {
  const text = replaceWire(raw);
  const record = parsePageRecordContent(text);
  assert.equal(record.variablesStatus.mode, mode);
  assert.ok(record.parseIssues.some(issue => issue.code === `variables.${code}`));
  assert.ok(updatePageRecordContent(text, { aliases: ['a'] }).includes(`variablesJson: ${raw}`));
  assert.equal(createCardVariableSnapshot({ id: 'entity', content: text }, registry).mode, mode);
});

test('duplicate envelope lines remain raw on unrelated serialization', () => {
  const text = content().replace('variablesJson:', 'variablesJson: {}\nvariablesJson:');
  const parsed = parsePageRecordContent(text);
  assert.equal(parsed.variablesStatus.mode, 'invalid');
  assert.equal(parsed.variablesStatus.raw.length, 2);
  assert.equal(updatePageRecordContent(text, { tags: ['x'] }).match(/variablesJson:/g).length, 2);
});

test('codec enforces byte/depth/collection limits for parsed and programmatic data', () => {
  for (const raw of ['"' + 'x'.repeat(VARIABLES_LIMITS.bytes) + '"',
    '['.repeat(34) + '0' + ']'.repeat(34), '[' + Array(10001).fill('0').join(',') + ']']) {
    assert.throws(() => parseStrictVariablesJSON(raw), /limit/);
  }
  assert.throws(() => serializePageVariables(envelope({ fn: () => 1 })), /non_json/);
  assert.throws(() => serializePageVariables(envelope({ number: Infinity })), /non_json/);
  const cycle = {}; cycle.x = cycle;
  assert.throws(() => serializePageVariables(envelope(cycle)), /circular/);
  assert.throws(() => serializePageVariables(envelope({}, { type: 'character' })), /duplicate_metadata_owner/);
});

test('metadata and full identities include variable changes while contentHash remains body-only', () => {
  const original = content();
  const withUnknown = original.replace('type: character', 'type: character\ncustomMeta: preserve');
  const changed = updatePageRecordContent(withUnknown, { variablesJson: envelope({ 'test.number': 4 }) });
  assert.match(changed, /customMeta: preserve/);
  const before = createPageStateIdentityFromContent(withUnknown);
  const after = createPageStateIdentityFromContent(changed);
  assert.equal(before.contentHash, after.contentHash);
  assert.notEqual(before.metadataHash, after.metadataHash);
  assert.notEqual(before.stateHash, after.stateHash);
});

test('unknown schema version/digest and missing catalog are read-only; missing page is not empty', () => {
  assert.equal(snapshot(envelope({}, { schemaVersion: 99 })).mode, 'unsupported');
  assert.equal(snapshot(envelope({}, { schemaDigest: 'sha256:' + 'a'.repeat(64) })).mode, 'unsupported');
  assert.equal(snapshot(envelope(), null).mode, 'missing-definition');
  assert.equal(snapshot(envelope(), new CardTypeRegistry()).mode, 'missing-definition');
  assert.equal(readEntity('none', { registry, repository: { getPageById: () => null } }).mode, 'missing');
});

test('stored/default/effective distinguish explicit falsy values and nullable null', () => {
  const entity = snapshot(envelope({ 'test.number': 0, 'test.flag': false, 'test.text': '', 'test.nullable': null }));
  for (const [key, value] of [['test.number', 0], ['test.flag', false], ['test.text', ''], ['test.nullable', null]]) {
    assert.deepEqual(getValue(entity, key).value, value);
    assert.equal(getValue(entity, key).source, 'stored');
  }
  assert.equal(getValue(entity, 'test.number', 'default').value, 3);
  assert.equal(getValue(snapshot(), 'test.number', 'stored').status, 'absent');
  assert.equal(getValue(snapshot(), 'test.number').source, 'default');
});

test('invalid numeric value never silently becomes a default or zero; unknown fields remain visible', () => {
  const entity = snapshot(envelope({ 'test.number': 'bad', 'custom.unknown': 17 }));
  assert.equal(getValue(entity, 'test.number').status, 'invalid');
  assert.equal(getValue(entity, 'test.number').value, 'bad');
  assert.equal(getValues(entity)['custom.unknown'].status, 'unsupported');
  assert.equal(getValues(entity)['custom.unknown'].value, 17);
});

test('lazy object/array defaults are independent immutable copies and do not materialize', () => {
  const entity = snapshot();
  const a = getValue(entity, 'test.list'); const b = getValue(entity, 'test.list');
  assert.notEqual(a.value, b.value);
  assert.throws(() => a.value.push('changed'));
  assert.equal(entity.values['test.list'], undefined);
  const first = getValue(entity, 'test.object').value;
  assert.notEqual(first, getValue(entity, 'test.object').value);
  assert.equal(entity.values['test.object'], undefined);
});

test('metadata/content/presentation bindings do not use variables map', () => {
  const entity = snapshot();
  assert.deepEqual(getValue(entity, 'page.tags').value, ['card']);
  assert.match(getValue(entity, 'page.content').value, /Free text/);
  assert.equal(getValue(entity, 'ui.group').status, 'absent');
  assert.ok(snapshot(envelope({ 'page.tags': ['bad'] })).diagnostics.some(issue => issue.code === 'variables.metadata_owner_conflict'));
});

test('value validator checks nested datatypes, row ids, enum, ISO dates, color, asset and exact references', () => {
  const cases = [
    [42, f('t.v', 'string')], [1.2, f('t.v', 'integer')], ['false', f('t.v', 'boolean')],
    ['b', f('t.v', 'enum', { options: [{ value: 'a' }] })],
    ['2026-02-30', f('t.v', 'date')], ['yesterday', f('t.v', 'datetime')],
    ['red', f('t.v', 'color')], [{ kind: 'asset', path: 'assets/../escape' }, f('t.v', 'asset')],
    [{ pageId: 'id', title: 'duplicate' }, f('t.v', 'reference')],
    [[{ 'test.rowId': 'a' }, { 'test.rowId': 'a' }], definition.fields.find(field => field.key === 'test.rows')]
  ];
  cases.forEach(([value, field]) => assert.equal(validateVariableValue(value, field).ok, false));
  assert.equal(validateVariableValue('2026-02-28', f('t.v', 'date')).ok, true);
  assert.equal(validateVariableValue({ kind: 'asset', path: 'assets/image.png' }, f('t.v', 'asset')).ok, true);
});

test('resolver computes deterministic values, tracks dependencies, returns no persisted result', () => {
  const entity = snapshot();
  const result = getValue(entity, 'test.result', 'effective', { resolvers });
  assert.equal(result.value, 6); assert.equal(result.source, 'computed');
  assert.equal(result.dependencies[0].key, 'test.number');
  assert.deepEqual(result, getValue(entity, 'test.result', 'effective', { resolvers }));
  assert.equal(entity.values['test.result'], undefined);
  assert.equal(getValue(entity, 'test.result').reason, 'unknown-resolver');
});

test('resolver overrides use presence, including 0/false/null', () => {
  for (const value of [0, null]) assert.equal(getValue(snapshot(envelope({}, { overrides: { 'test.result': value } })), 'test.result').value, value);
  assert.equal(getValue(snapshot(envelope({}, { overrides: { 'test.boolResult': false } })), 'test.boolResult').value, false);
  assert.equal(getValue(snapshot(envelope({ 'test.number': 'bad' })), 'test.result', 'effective', { resolvers }).status, 'invalid');
});

test('resolver cycles, missing inputs, mutation and asynchronous/executable output fail safely', () => {
  const cycleDef = structuredClone(definition);
  cycleDef.fields.find(field => field.key === 'test.result').computed.inputs = ['test.result'];
  const cycleRegistry = new CardTypeRegistry({ activatedTypes: [cycleDef] });
  const entity = snapshot(envelope({}, { schemaDigest: cycleRegistry.getResolvedType('character', 1).digest }), cycleRegistry);
  assert.equal(getValue(entity, 'test.result', 'effective', { resolvers }).reason, 'computed-cycle');
  const missingDef = structuredClone(definition);
  delete missingDef.fields.find(field => field.key === 'test.number').default;
  const missingRegistry = new CardTypeRegistry({ activatedTypes: [missingDef] });
  assert.equal(getValue(snapshot(envelope({}, { schemaDigest: missingRegistry.getResolvedType('character', 1).digest }), missingRegistry), 'test.result', 'effective', { resolvers }).status, 'unresolved');
  const bad = createComputedResolverRegistry([{ id: 'test.double', version: 1, resolve: inputs => { inputs['test.number'] = 0; return 0; } }]);
  assert.equal(getValue(snapshot(), 'test.result', 'effective', { resolvers: bad }).status, 'invalid');
  const async = createComputedResolverRegistry([{ id: 'test.double', version: 1, resolve: () => Promise.resolve(2) }]);
  assert.equal(getValue(snapshot(), 'test.result', 'effective', { resolvers: async }).status, 'invalid');
});

test('references use exact page id, reject title/alias lookup, wrong types and self', () => {
  const target = { id: 'target', title: 'Target label', aliases: ['alias'], content: content().replace('id: entity', 'id: target') };
  const repository = { getPageById: id => id === 'target' ? target : null };
  const resolve = id => resolveReference(snapshot(envelope({ 'test.ref': { pageId: id } })), 'test.ref', { registry, repository });
  assert.equal(resolve('target').label, 'Target label');
  assert.equal(resolve('alias').reason, 'missing-target');
  assert.equal(resolve('Target label').reason, 'missing-target');
  target.content = target.content.replace('type: character', 'type: item');
  assert.equal(resolve('target').reason, 'wrong-target-type');
  const self = snapshot(envelope({ 'test.ref': { pageId: 'entity' } }));
  assert.equal(resolveReference(self, 'test.ref', { registry, repository: { getPageById: () => ({ id: 'entity', content: content() }) } }).reason, 'self-reference');
});

async function fixture(data = envelope()) {
  const base = await createEditConflictFixture({ id: 'entity', type: 'character' });
  base.page.content = content(data);
  await base.adapter.writeText(base.page.path, base.page.content);
  await base.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
  const context = { registry, workspaceContext: captureStorageWorkspaceContext() };
  const plan = patch => prepareVariablesChange({ pageId: base.page.id, expectedBase: createPageStateIdentityFromContent(base.page.content), patch, context });
  return { ...base, context, plan };
}

test('immutable plan set/unset commits one page and publishes once after verified readback', async () => {
  const { page, adapter, plan } = await fixture(envelope({ 'custom.opaque': { old: true } }));
  const prepared = plan([{ op: 'set', key: 'test.number', value: 9 }, { op: 'unset', key: 'test.text' }]);
  assert.ok(Object.isFrozen(prepared.after.envelope.values));
  assert.equal(parsePageRecordContent(page.content).variablesJson.values['test.number'], undefined);
  let writes = 0; let publications = 0;
  const write = adapter.writeText.bind(adapter); adapter.writeText = async (...args) => { writes++; return write(...args); };
  const index = getPageIndex(); const update = index.updatePage;
  index.updatePage = function(...args) { publications++; return update.apply(this, args); };
  try {
    const result = await commitVariablesChange(prepared);
    assert.equal(result.status, 'saved', JSON.stringify(result));
    assert.equal(writes, 1); assert.equal(publications, 1);
    assert.equal(page.variablesJson.values['test.number'], 9);
    assert.deepEqual(page.variablesJson.values['custom.opaque'], { old: true });
    assert.equal(page.content, await adapter.readText(page.path));
    assert.equal((await commitVariablesChange(prepared)).status, 'blocked');
  } finally { index.updatePage = update; }
});

test('override/reset and stable row add/update/reorder/remove plans preserve row identity', async () => {
  const { plan } = await fixture(envelope({ 'test.rows': [{ 'test.rowId': 'a', 'test.name': 'A' }] }));
  const prepared = plan([
    { op: 'override', key: 'test.result', value: 0 },
    { op: 'rowAdd', key: 'test.rows', rowId: 'b', value: { 'test.rowId': 'b', 'test.name': 'B' } },
    { op: 'rowUpdate', key: 'test.rows', rowId: 'a', value: { 'test.name': 'new A' } },
    { op: 'rowReorder', key: 'test.rows', rowIds: ['b', 'a'] },
    { op: 'rowRemove', key: 'test.rows', rowId: 'b' }
  ]);
  assert.equal(prepared.after.overrides['test.result'], 0);
  assert.deepEqual(prepared.after.values['test.rows'], [{ 'test.rowId': 'a', 'test.name': 'new A' }]);
  assert.equal((await commitVariablesChange(prepared)).status, 'saved');
  assert.equal(hasOwn(plan([{ op: 'resetOverride', key: 'test.result' }]).after.overrides, 'test.result'), false);
});
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

test('patch rejects missing base, executable operations, readonly, computed, metadata and invalid values', async () => {
  const { plan, context } = await fixture();
  assert.throws(() => prepareVariablesChange({ pageId: 'entity', expectedBase: null, patch: [], context }), /expectedBase/);
  for (const patch of [
    [{ op: 'set', key: 'test.number', value: 'bad' }], [{ op: 'set', key: 'test.locked', value: 'bad' }],
    [{ op: 'set', key: 'test.result', value: 1 }], [{ op: 'set', key: 'page.tags', value: ['x'] }],
    [{ op: 'set', key: 'test.text', value: () => 'bad' }], [{ op: 'unset', key: 'test.required' }]
  ]) assert.throws(() => plan(patch));
});

test('variable write makes old body base stale and never merges old body with new variables', async () => {
  const { page, plan } = await fixture();
  const before = page.content; const previousPage = snapshotPageForCommand(page);
  const expectedBase = createPageStateIdentityFromContent(before);
  assert.equal((await commitVariablesChange(plan([{ op: 'set', key: 'test.number', value: 4 }]))).status, 'saved');
  const result = await persistPageContentCommand({ page, previousPage, expectedBase,
    content: updatePageRecordContent(before, { body: '<h1>Stale body</h1>' }) });
  assert.equal(result.conflict, true);
  assert.doesNotMatch(page.content, /Stale body/);
});

test('body write or restore after prepare blocks stale variables plan', async () => {
  for (const directRestore of [false, true]) {
    const { page, adapter, plan } = await fixture();
    const prepared = plan([{ op: 'set', key: 'test.number', value: 4 }]);
    const body = updatePageRecordContent(page.content, { body: '<h1>Restored/new body</h1>' });
    if (directRestore) await adapter.writeText(page.path, body);
    else {
      const result = await persistPageContentCommand({ page, content: body, expectedBase: prepared.expectedBase });
      assert.equal(result.writeStatus, 'saved');
    }
    const result = await commitVariablesChange(prepared);
    assert.equal(result.status, 'blocked'); assert.equal(result.written, false);
    assert.equal(await adapter.readText(page.path), body);
  }
});

test('schema closure changes or missing catalog block plans; unrelated activation does not', async () => {
  for (const change of ['missing', 'changed', 'unrelated']) {
    const { adapter, plan } = await fixture();
    const prepared = plan([{ op: 'set', key: 'test.number', value: 4 }]);
    if (change === 'missing') await adapter.removeFile(CARD_TYPE_CATALOG_PATH);
    else if (change === 'changed') {
      const next = structuredClone(catalog); next.types[0].fields[0].max = 8;
      await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(next));
    } else {
      const current = await readCardTypeCatalog({ storageAdapter: adapter });
      await activateCardTypeDefinitions({ storageAdapter: adapter, expectedIdentity: current.identity,
        types: [{ id: 'item', version: 1, label: 'Fixture', includes: [], fields: [], sections: [] }] });
    }
    const result = await commitVariablesChange(prepared);
    assert.equal(result.status, change === 'unrelated' ? 'saved' : 'failed', JSON.stringify(result));
  }
});

test('workspace switch blocks plan without a write to either workspace', async () => {
  const { page, adapter, plan } = await fixture();
  const before = page.content; const prepared = plan([{ op: 'set', key: 'test.number', value: 4 }]);
  setStorageAdapter(createMemoryStorageAdapter());
  const result = await commitVariablesChange(prepared);
  assert.notEqual(result.status, 'saved');
  assert.equal(await adapter.readText(page.path), before);
});

test('write failure and readback uncertainty never publish candidate', async () => {
  for (const failure of ['write', 'readback', 'write-after-persist']) {
    const { page, adapter, plan } = await fixture();
    const before = page.content;
    const prepared = plan([{ op: 'set', key: 'test.number', value: 4 }]);
    const write = adapter.writeText.bind(adapter); const read = adapter.readText.bind(adapter);
    let written = false; let publications = 0;
    adapter.writeText = async (...args) => {
      if (failure === 'write') throw new Error('Injected write failure');
      await write(...args); written = true;
      if (failure === 'write-after-persist') throw new Error('Uncertain adapter outcome');
    };
    adapter.readText = async (...args) => {
      if (written && failure === 'readback') throw new Error('Injected readback failure');
      return read(...args);
    };
    const index = getPageIndex(); const update = index.updatePage;
    index.updatePage = function(...args) { publications++; return update.apply(this, args); };
    try {
      const result = await commitVariablesChange(prepared);
      assert.equal(result.status, failure === 'write' ? 'failed' : 'uncertain', JSON.stringify(result));
      assert.equal(page.content, before); assert.equal(publications, 0);
    } finally { index.updatePage = update; }
  }
});

test('generic save cannot discard/change malformed, future, missing-definition or valid variables', async () => {
  for (const raw of ['{bad', '{"formatVersion":99}', JSON.stringify(envelope({}, { schemaVersion: 99 })), JSON.stringify(envelope())]) {
    const { page, adapter } = await fixture();
    page.content = replaceWire(raw); await adapter.writeText(page.path, page.content);
    await assert.rejects(persistPageContentCommand({ page, expectedBase: createPageStateIdentityFromContent(page.content),
      content: updatePageRecordContent(page.content, { variablesJson: envelope({ 'test.number': 5 }) }) }));
  }
});

test('safety floor explicitly blocks structured backup/copy/template/package and retains assets against GC', async () => {
  const { page, adapter } = await fixture();
  await assert.rejects(createWorkspaceBackup({ storageAdapter: adapter, pages: [page] }), /blocked/);
  await assert.rejects(restoreWorkspaceBackup('anything', adapter), /blocked/);
  await assert.rejects(duplicatePageAsChild(page, null), /blocked/);
  await assert.rejects(createPageFromRecordContent(page.content), /blocked/);
  await assert.rejects(savePageAsTemplate(page), /blocked/);
  await assert.rejects(createPageFromTemplate({ variablesJson: envelope() }), /blocked/);
  assert.throws(() => parsePageTemplatesFile(JSON.stringify({ version: 2, templates: [] })), /Unsupported/);
  assert.throws(() => createWorldPackageFromPages([page]), /blocked/);
  assert.throws(() => normalizeWorldPackageData({ version: 2 }), /Unsupported/);
  assert.throws(() => normalizeWorldPackageData({ contents: { pages: [{ variablesJson: envelope() }] } }), /blocked/);
  assert.throws(() => normalizeWorldPackageData({ contents: { pages: [{ body: page.content }] } }), /blocked/);
  assert.deepEqual(findOrphanAssetPaths([page], ['assets/only-in-variables.png']), []);
  assert.deepEqual(findOrphanPaths(collectAssetReferencesFromPages([page]), ['assets/unknown.png']), []);
});


test('PageRecord v2 is explicit for structured data and does not upgrade legacy pages', () => {
  assert.equal(parsePageRecordContent(content()).schemaVersion, 2);
  const old = buildPageRecordContent({ id: 'old', body: '<h1>Old</h1>' });
  assert.equal(parsePageRecordContent(updatePageRecordContent(old, { tags: ['tag'] })).schemaVersion, 1);
  assert.equal(createCardVariableSnapshot({ id: 'entity', content: content().replace('schemaVersion: 2', 'schemaVersion: 1') }, registry).mode, 'unsupported');
});

test('definition digest retains labels and row ordering in semantic default/options data', () => {
  const original = { ...definition, metadata: { label: 'semantic metadata' }, fields: [
    f('test.object', 'object', { properties: [], default: { label: 'value', order: 2 } }),
    f('test.list', 'array', { items: { datatype: 'object', properties: [] }, default: [{ key: 'b' }, { key: 'a' }] }),
    f('test.result', 'integer', { computed: { ...computed([]), options: { label: 'parameter' } } })
  ] };
  const digest = digestDefinition('type', original);
  for (const change of [
    value => { value.fields[0].default.label = 'changed'; },
    value => { value.fields[1].default.reverse(); },
    value => { value.fields[2].computed.options.label = 'changed'; },
    value => { value.metadata.label = 'changed'; }
  ]) {
    const altered = structuredClone(original); change(altered);
    assert.notEqual(digestDefinition('type', altered), digest);
  }
  const translated = structuredClone(original); translated.label = 'Translation'; translated.fields[0].label = 'Translated';
  assert.equal(digestDefinition('type', translated), digest);
});

test('card custom extensions resolve exact definitions and preserve opaque inactive/unknown data', () => {
  const key = 'custom.12345678-1234-4123-8123-123456789abc';
  const data = envelope({ [key]: 'value' }, { extensions: { revision: 1, fields: [f(key)] },
    inactive: [{ id: 'old', value: { untouched: true }, reason: 'legacy' }], opaque: ['keep'] });
  assert.equal(getValue(snapshot(data), key).value, 'value');
  assert.deepEqual(snapshot(data).inactive, data.inactive);
  const missing = envelope({}, { extensions: { revision: 1, fields: [{ id: 'test.missing', version: 1 }] } });
  assert.equal(snapshot(missing).mode, 'missing-definition');
  const fieldSet = { id: 'test.shared', version: 1, label: 'Shared', includes: [], sections: [], fields: [f('shared.name')] };
  const withSet = new CardTypeRegistry({ bundledTypes: [definition], bundledFieldSets: [fieldSet] });
  const resolved = snapshot(envelope({}, { extensions: { revision: 1, fields: [{ id: 'test.shared', version: 1 }] } }), withSet);
  assert.equal(resolved.mode, 'structured');
  assert.equal(resolved.definition.fieldsByKey['shared.name'].provenance.id, 'test.shared');
});

test('resolver dependency depth is bounded and nullable reference is absent', () => {
  const chain = { id: 'chain', version: 1, label: 'Chain', includes: [], sections: [], fields:
    Array.from({ length: 35 }, (_, index) => f(`chain.n${index}`, 'number', index === 34 ? { default: 1 } : {
      computed: { resolverId: 'test.double', version: 1, inputs: [`chain.n${index + 1}`] }
    })) };
  const chainRegistry = new CardTypeRegistry({ bundledTypes: [chain] });
  const data = { formatVersion: 1, schemaVersion: 1, schemaDigest: chainRegistry.getResolvedType('chain', 1).digest, values: {} };
  const entity = createCardVariableSnapshot({ id: 'chain', content: buildPageRecordContent({ id: 'chain', type: 'chain', variablesJson: data }) }, chainRegistry);
  assert.equal(getValue(entity, 'chain.n0', 'effective', { resolvers }).reason, 'computed-depth-limit');
  const nullable = structuredClone(definition); nullable.fields.find(field => field.key === 'test.ref').nullable = true;
  const nullableRegistry = new CardTypeRegistry({ bundledTypes: [nullable] });
  const ref = snapshot(envelope({ 'test.ref': null }, { schemaDigest: nullableRegistry.getResolvedType('character', 1).digest }), nullableRegistry);
  assert.equal(resolveReference(ref, 'test.ref').status, 'absent');
});

test('unguarded queue writes and stale orphan deletion are blocked for structured pages', async () => {
  const { page, adapter } = await fixture();
  assert.throws(() => writePageContent(page, page.content), /PageCommand/);
  await assert.rejects(deleteWorkspaceAssetPath('assets/unknown.png', { storageAdapter: adapter, pages: [page] }), /blocked/);
  assert.throws(() => serializePageTemplates([{ variablesJson: envelope(), body: '' }]), /blocked/);
});

test('generic structured body write has durable readback and preserves the envelope', async () => {
  const { page, adapter } = await fixture();
  const candidate = updatePageRecordContent(page.content, { body: '<h1>Entity</h1><p>Changed</p>' });
  const result = await persistPageContentCommand({ page, content: candidate, expectedBase: createPageStateIdentityFromContent(page.content) });
  assert.equal(result.writeStatus, 'saved');
  assert.deepEqual(page.variablesJson, envelope());
  assert.equal(await adapter.readText(page.path), candidate);
});
