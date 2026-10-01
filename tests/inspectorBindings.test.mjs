import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { adoptionFixture, registry } from './fixtures/inventoryAdoptionFixtures.mjs';
import { createCardVariableSnapshot } from '../js/variables/cardVariableStore.js';
import { prepareVariablesChange, commitVariablesChange } from '../js/variables/variableCommands.js';
import { getValue } from '../js/variables/entityVariables.js';
import { createInspectorDraft, projectDraftSnapshot, updateInspectorDraft, updateInspectorBindingDraft, readDraftValue } from '../js/ui/cardInspector/inspectorModel.js';
import { canEditEntityBinding } from '../js/variables/entityBindings.js';
import { parsePageRecordContent, updatePageRecordContent } from '../js/core/pageRecord.js';
import { captureStorageWorkspaceContext, setStorageAdapter } from '../js/storage/storageAdapter.js';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { createMemoryStorageAdapter } from './fixtures/editConflictFixtures.mjs';

const asset = { kind: 'asset', path: 'assets/icon.png' };
async function fixture() {
  const f = await adoptionFixture();
  await f.adapter.writeBinary(asset.path, new Uint8Array([1, 2, 3]).buffer);
  f.writes.length = 0;
  const snapshot = createCardVariableSnapshot(f.actor, registry);
  const context = { registry, workspaceContext: captureStorageWorkspaceContext() };
  const prepare = extra => prepareVariablesChange({ pageId: f.actor.id, expectedBase: snapshot.pageIdentity, patch: [],
    bindingsPatch: [{ op: 'set', key: 'page.icon', value: asset }], context, ...extra });
  return { ...f, snapshot, prepare };
}

test('draft snapshot projection has one immutable identity per revision, not per field', async () => {
  const f = await fixture(), draft = createInspectorDraft(f.snapshot);
  assert.equal(projectDraftSnapshot(draft), projectDraftSnapshot(draft));
  const next = updateInspectorDraft(draft, { op: 'set', key: 'dnd.level', value: 3 });
  assert.notEqual(projectDraftSnapshot(draft), projectDraftSnapshot(next));
  assert.equal(projectDraftSnapshot(next).definition, next.snapshot.definition);
  assert.ok(Object.isFrozen(projectDraftSnapshot(next)));
});

test('schema-selected icon binding is explicit absent and editable; type/computed remain readonly', async () => {
  const f = await fixture();
  assert.equal(getValue(f.snapshot, 'page.icon').status, 'absent');
  assert.ok(canEditEntityBinding(f.snapshot.definition.fieldsByKey['page.icon']));
  assert.equal(canEditEntityBinding(f.snapshot.definition.fieldsByKey['page.type']), false);
  assert.equal(canEditEntityBinding({ ...f.snapshot.definition.fieldsByKey['page.icon'], computed: {} }), false);
  const draft = updateInspectorBindingDraft(createInspectorDraft(f.snapshot), { op: 'set', key: 'page.icon', value: asset });
  assert.deepEqual(readDraftValue(draft, 'page.icon').value, asset);
  assert.equal(draft.patch.length, 0);
  assert.equal(f.writes.length, 0);
});

test('icon plus Variables save uses one PageCommand, preserves body/evidence and has no Variables duplicate', async () => {
  const f = await fixture(), before = parsePageRecordContent(f.actor.content);
  const plan = f.prepare({ patch: [{ op: 'set', key: 'dnd.level', value: 21 }] });
  assert.ok(Object.isFrozen(plan));
  assert.equal((await commitVariablesChange(plan)).status, 'saved');
  const after = parsePageRecordContent(await f.adapter.readText(f.actor.path));
  assert.equal(after.rawBody, before.rawBody);
  assert.deepEqual(after.variablesJson.inactive, before.variablesJson.inactive);
  assert.equal(after.frontMatter.values.unknownfuturemetadata, 'keep');
  assert.deepEqual(JSON.parse(after.frontMatter.values.iconjson), asset);
  assert.equal(after.variablesJson.values['dnd.level'], 21);
  assert.equal(Object.hasOwn(after.variablesJson.values, 'page.icon'), false);
  assert.equal(f.writes.filter(write => write.path === f.actor.path).length, 1);
  assert.equal((await commitVariablesChange(plan)).reason, 'unknown-or-used-plan');
});

for (const fault of ['stale', 'moved', 'workspace', 'catalog', 'write', 'readback', 'missing-asset']) test(`binding commit ${fault} never fabricates success`, async () => {
  const f = await fixture(), plan = f.prepare();
  if (fault === 'stale') await f.adapter.writeText(f.actor.path, updatePageRecordContent(f.actor.content, { body: '<h1>External</h1>' }));
  if (fault === 'moved') f.actor.path = 'pages/moved.md';
  if (fault === 'workspace') setStorageAdapter(createMemoryStorageAdapter());
  if (fault === 'catalog') await f.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({ formatVersion: 1, revision: 9, types: [], fieldSets: [] }));
  if (fault === 'missing-asset') f.adapter.readBinary = async () => { throw new Error('Missing asset'); };
  if (fault === 'write') { const write = f.adapter.writeText.bind(f.adapter); f.adapter.writeText = async (path, content) => { if (path === f.actor.path) throw new Error('write denied'); return write(path, content); }; }
  if (fault === 'readback') { const read = f.adapter.readText.bind(f.adapter); f.adapter.readText = async path => { const content = await read(path); return path === f.actor.path && content.includes('iconJson:') ? content + '\nchanged' : content; }; }
  const result = await commitVariablesChange(plan);
  assert.notEqual(result.status, 'saved');
  assert.notEqual(result.status, 'unchanged');
});

test('unsupported page binding cannot become a raw metadata writer', async () => {
  const f = await fixture();
  assert.throws(() => f.prepare({ bindingsPatch: [{ op: 'set', key: 'page.type', value: 'player' }] }), /Unsupported editable binding/);
  assert.throws(() => f.prepare({ bindingsPatch: [{ op: 'set', key: 'page.icon', value: { kind: 'asset', path: '../outside.png' } }] }), /validation/);
  assert.equal(f.writes.length, 0);
});

test('binding no-op rereads durable base and does not write; unset keeps the Variables owner untouched', async () => {
  const f = await fixture(); await commitVariablesChange(f.prepare());
  f.writes.length = 0;
  const current = createCardVariableSnapshot(f.actor, registry);
  const prepare = bindingsPatch => prepareVariablesChange({ pageId: f.actor.id, expectedBase: current.pageIdentity, patch: [], bindingsPatch, context: { registry } });
  const result = await commitVariablesChange(prepare([{ op: 'set', key: 'page.icon', value: asset }]));
  assert.equal(result.status, 'unchanged'); assert.equal(result.written, false); assert.equal(f.writes.length, 0);
  assert.equal((await commitVariablesChange(prepare([{ op: 'unset', key: 'page.icon' }]))).status, 'saved');
  assert.equal(getValue(createCardVariableSnapshot(f.actor, registry), 'page.icon').status, 'absent');
});
