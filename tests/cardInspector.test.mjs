import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CardTypeRegistry } from '../js/cardTypes/cardTypeRegistry.js';
import { buildPageRecordContent } from '../js/core/pageRecord.js';
import { createCardVariableSnapshot } from '../js/variables/cardVariableStore.js';
import { createComputedResolverRegistry } from '../js/variables/computedResolvers.js';
import { createObjectPropertyAdapter, getSupportedInspectorDatatypes } from '../js/ui/cardInspector/fieldComponentRegistry.js';
import {
  buildInspectorSections,
  createInspectorDraft,
  describeInspectorSource,
  parseInspectorInput,
  projectDraftSnapshot,
  readDraftValue,
  setInspectorDraftInputIssue,
  updateInspectorDraft,
  updateInspectorDraftFromInput,
  validateInspectorDraft
} from '../js/ui/cardInspector/inspectorModel.js';

const field = (key, datatype = 'string', extra = {}) => ({ key, label: key, datatype, binding: { owner: 'variables' }, ...extra });
const definition = {
  id: 'test-card', version: 1, label: 'Fixture', includes: [],
  sections: [{ id: 'main', label: 'Main', order: 1 }, { id: 'extra', label: 'Extra', order: 2 }],
  fields: [
    field('test.name', 'string', { section: 'main', help: 'Name help', required: true }),
    field('test.notes', 'string', { format: 'multiline', section: 'main' }),
    field('test.count', 'integer', { default: 2, min: 0, max: 20, section: 'main' }),
    field('test.ratio', 'number'), field('test.flag', 'boolean'),
    field('test.kind', 'enum', { options: [{ value: 'stable-a', label: 'Shown A' }, { value: 'stable-b', label: 'Shown B' }] }),
    field('test.date', 'date'), field('test.datetime', 'datetime'), field('test.color', 'color'),
    field('test.asset', 'asset'), field('test.ref', 'reference', { targetTypes: ['test-card'] }),
    field('test.object', 'object', { properties: [
      { key: 'test.inner', label: 'Inner', datatype: 'string' },
      { key: 'test.objectKind', label: 'Object kind', datatype: 'enum', options: [{ value: 'object-a', label: 'Object A' }, { value: 'object-b', label: 'Object B' }] },
      { key: 'test.objectFlag', label: 'Object flag', datatype: 'boolean' },
      { key: 'test.objectCount', label: 'Object count', datatype: 'integer', min: 0 },
      { key: 'test.objectAsset', label: 'Object asset', datatype: 'asset' },
      { key: 'test.objectRef', label: 'Object ref', datatype: 'reference', targetTypes: ['test-card'] },
      { key: 'test.objectRows', label: 'Object rows', datatype: 'array', items: { datatype: 'object', rowIdentityKey: 'test.objectRowId', properties: [
        { key: 'test.objectRowId', label: 'Object row id', datatype: 'string', required: true, readonly: true },
        { key: 'test.objectRowKind', label: 'Object row kind', datatype: 'enum', options: [{ value: 'nested-a', label: 'Nested A' }, { value: 'nested-b', label: 'Nested B' }] },
        { key: 'test.objectRowFlag', label: 'Object row flag', datatype: 'boolean' },
        { key: 'test.objectRowCount', label: 'Object row count', datatype: 'integer', min: 0 }
      ] } }
    ] }),
    field('test.array', 'array', { items: { datatype: 'string' } }),
    field('test.rows', 'array', { items: { datatype: 'object', rowIdentityKey: 'test.rowId', properties: [
      { key: 'test.rowId', label: 'Id', datatype: 'string', required: true, readonly: true },
      { key: 'test.rowName', label: 'Row name', datatype: 'string' },
      { key: 'test.rowKind', label: 'Row kind', datatype: 'enum', options: [{ value: 'row-a', label: 'Row A' }, { value: 'row-b', label: 'Row B' }] },
      { key: 'test.rowFlag', label: 'Row flag', datatype: 'boolean' },
      { key: 'test.rowCount', label: 'Row count', datatype: 'integer', min: 0 },
      { key: 'test.rowAsset', label: 'Row asset', datatype: 'asset' },
      { key: 'test.rowRef', label: 'Row ref', datatype: 'reference', targetTypes: ['test-card'] }
    ] } }),
    field('test.formula', 'string', { format: 'formula', formula: { grammarId: 'test.formula', version: 1 } }),
    field('test.computed', 'integer', { readonly: true, nullable: true, computed: { resolverId: 'test.double', version: 1, inputs: ['test.count'], allowOverride: true } }),
    field('test.visible', 'string', { section: 'extra', visibility: { equals: ['test.kind', 'stable-a'] } }),
    field('page.type', 'string', { binding: { owner: 'page', path: 'type' }, readonly: true }),
    field('custom.123e4567-e89b-42d3-a456-426614174000', 'string')
  ]
};
const registry = new CardTypeRegistry({ activatedTypes: [definition] });
const digest = registry.getResolvedType('test-card', 1).digest;
const envelope = (values = {}, rest = {}) => ({ formatVersion: 1, schemaVersion: 1, schemaDigest: digest, values: { 'test.name': 'Entity', ...values }, ...rest });
const page = data => ({ id: 'entity', path: '/pages/entity.md', type: 'test-card', content: buildPageRecordContent({
  id: 'entity', type: 'test-card', body: '<h1>Entity</h1>', variablesJson: data, now: '2026-09-25T00:00:00Z'
}) });
const snapshot = data => createCardVariableSnapshot(page(data || envelope()), registry);

test('generic field component registry covers every Stage 2 datatype without card type branching', async () => {
  assert.deepEqual(getSupportedInspectorDatatypes(), ['array', 'asset', 'boolean', 'color', 'date', 'datetime', 'enum', 'integer', 'number', 'object', 'reference', 'string']);
  const source = await readFile(new URL('../js/ui/cardInspector/fieldComponentRegistry.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /type\s*===\s*['"](?:character|item|spell|player)/i);
});

test('sections, order, visibility and custom fields come from resolved schema', () => {
  const draft = createInspectorDraft(snapshot(envelope({ 'test.kind': 'stable-b' })));
  let sections = buildInspectorSections(draft.snapshot.definition, key => readDraftValue(draft, key));
  assert.deepEqual(sections.map(item => item.id), ['main', 'general']);
  assert.ok(sections.flatMap(item => item.fields).some(item => item.key.startsWith('custom.')));
  const visible = updateInspectorDraft(draft, { op: 'set', key: 'test.kind', value: 'stable-a' });
  sections = buildInspectorSections(visible.snapshot.definition, key => readDraftValue(visible, key));
  assert.ok(sections.find(item => item.id === 'extra').fields.some(item => item.key === 'test.visible'));
});

test('draft keeps snapshot immutable and distinguishes falsy, absent, default and unset', () => {
  const original = snapshot();
  let draft = createInspectorDraft(original);
  draft = updateInspectorDraft(draft, { op: 'set', key: 'test.flag', value: false });
  draft = updateInspectorDraft(draft, { op: 'set', key: 'test.ratio', value: 0 });
  draft = updateInspectorDraft(draft, { op: 'set', key: 'test.notes', value: '' });
  assert.equal(original.values['test.flag'], undefined);
  assert.equal(readDraftValue(draft, 'test.flag').value, false);
  assert.equal(readDraftValue(draft, 'test.ratio').value, 0);
  assert.equal(readDraftValue(draft, 'test.notes').value, '');
  assert.equal(readDraftValue(draft, 'test.count').source, 'default');
  draft = updateInspectorDraft(draft, { op: 'set', key: 'test.count', value: 7 });
  draft = updateInspectorDraft(draft, { op: 'unset', key: 'test.count' });
  assert.equal(readDraftValue(draft, 'test.count').source, 'default');
  assert.equal(projectDraftSnapshot(draft).values['test.count'], undefined);
});

test('input parsing retains invalid raw values and never turns empty number into zero', () => {
  let draft = createInspectorDraft(snapshot());
  draft = updateInspectorDraftFromInput(draft, definition.fields.find(item => item.key === 'test.count'), '');
  assert.equal(draft.rawInputs['test.count'], '');
  assert.equal(validateInspectorDraft(draft).ok, false);
  assert.equal(projectDraftSnapshot(draft).values['test.count'], undefined);
  assert.deepEqual(parseInspectorInput(definition.fields.find(item => item.key === 'test.kind'), 'stable-a'), { ok: true, value: 'stable-a' });
  assert.equal(parseInspectorInput(definition.fields.find(item => item.key === 'test.kind'), 'Shown A').ok, false);
});

test('the shared parser keeps numeric, enum, boolean, asset and reference semantics at every schema depth', () => {
  const object = definition.fields.find(item => item.key === 'test.object');
  const row = definition.fields.find(item => item.key === 'test.rows').items;
  const fields = [
    definition.fields.find(item => item.key === 'test.count'),
    object.properties.find(item => item.key === 'test.objectCount'),
    row.properties.find(item => item.key === 'test.rowCount')
  ];
  for (const current of fields) {
    assert.equal(parseInspectorInput(current, '').ok, false);
    assert.deepEqual(parseInspectorInput(current, '0'), { ok: true, value: 0 });
  }
  for (const current of [object.properties.find(item => item.key === 'test.objectFlag'), row.properties.find(item => item.key === 'test.rowFlag')]) {
    assert.deepEqual(parseInspectorInput(current, false), { ok: true, value: false });
    assert.equal(parseInspectorInput(current, 'false').ok, false);
  }
  assert.deepEqual(parseInspectorInput(object.properties.find(item => item.key === 'test.objectKind'), 'object-b'), { ok: true, value: 'object-b' });
  assert.equal(parseInspectorInput(row.properties.find(item => item.key === 'test.rowKind'), 'Row A').ok, false);
  assert.deepEqual(parseInspectorInput(object.properties.find(item => item.key === 'test.objectAsset'), 'assets/icon.png'), { ok: true, value: { kind: 'asset', path: 'assets/icon.png' } });
  assert.deepEqual(parseInspectorInput(row.properties.find(item => item.key === 'test.rowRef'), 'target-page'), { ok: true, value: { pageId: 'target-page' } });
});

test('nested adapters rebuild a complete parent subtree without dropping siblings or stable row identities', () => {
  const object = definition.fields.find(item => item.key === 'test.object');
  const rows = object.properties.find(item => item.key === 'test.objectRows');
  let stored = {
    'test.inner': 'keep',
    'test.objectRows': [{ 'test.objectRowId': 'row-a', 'test.objectRowKind': 'nested-a', 'test.objectRowFlag': false }]
  };
  const context = { rawInputs: {}, onRawIssue: () => assert.fail('unexpected raw issue') };
  const root = {
    field: object, rootField: object, path: object.key, context,
    read: () => ({ status: 'value', value: stored }),
    set: value => { stored = value; }
  };
  const nestedRows = createObjectPropertyAdapter(root, rows);
  nestedRows.set([
    { 'test.objectRowId': 'row-a', 'test.objectRowKind': 'nested-b', 'test.objectRowFlag': false },
    { 'test.objectRowId': 'row-b', 'test.objectRowKind': 'nested-a', 'test.objectRowFlag': true }
  ]);
  assert.equal(stored['test.inner'], 'keep');
  assert.deepEqual(stored['test.objectRows'].map(item => item['test.objectRowId']), ['row-a', 'row-b']);
  assert.equal(stored['test.objectRows'][0]['test.objectRowFlag'], false);
});

test('nested raw input is retained until that exact nested input is corrected', () => {
  const original = createInspectorDraft(snapshot(envelope({ 'test.object': { 'test.inner': 'keep', 'test.objectCount': 3 } })));
  const invalid = setInspectorDraftInputIssue(original, 'test.object.test.objectCount', '', 'Введите число или используйте «Сбросить».');
  const unrelated = updateInspectorDraft(invalid, { op: 'set', key: 'test.name', value: 'Changed' });
  assert.equal(unrelated.rawInputs['test.object.test.objectCount'], '');
  assert.equal(validateInspectorDraft(unrelated).ok, false);
  const corrected = updateInspectorDraft(unrelated, { op: 'set', key: 'test.object', value: { 'test.inner': 'keep', 'test.objectCount': 0 } }, { inputKey: 'test.object.test.objectCount' });
  assert.equal(corrected.rawInputs['test.object.test.objectCount'], undefined);
  assert.equal(validateInspectorDraft(corrected).ok, true);
  assert.equal(projectDraftSnapshot(corrected).values['test.object']['test.inner'], 'keep');
});

test('computed values remain derived while false, zero and null overrides use key presence', () => {
  const resolvers = createComputedResolverRegistry([{ id: 'test.double', version: 1, resolve: inputs => inputs['test.count'] * 2 }]);
  let draft = createInspectorDraft(snapshot());
  assert.equal(readDraftValue(draft, 'test.computed', 'effective', { resolvers }).value, 4);
  for (const value of [0, null]) {
    draft = updateInspectorDraft(draft, { op: 'override', key: 'test.computed', value });
    assert.equal(readDraftValue(draft, 'test.computed', 'effective', { resolvers }).value, value);
  }
  draft = updateInspectorDraft(draft, { op: 'resetOverride', key: 'test.computed' });
  assert.equal(readDraftValue(draft, 'test.computed', 'effective', { resolvers }).source, 'computed');
  assert.equal(projectDraftSnapshot(draft).values['test.computed'], undefined);
});

test('stable rows preserve identity across update and reorder and keep invalid input diagnosed', () => {
  let draft = createInspectorDraft(snapshot(envelope({ 'test.rows': [
    { 'test.rowId': 'row-a', 'test.rowName': 'A' }, { 'test.rowId': 'row-b', 'test.rowName': 'B' }
  ] })));
  draft = updateInspectorDraft(draft, { op: 'rowUpdate', key: 'test.rows', rowId: 'row-a', value: { 'test.rowName': 'A2' } });
  draft = updateInspectorDraft(draft, { op: 'rowReorder', key: 'test.rows', rowIds: ['row-b', 'row-a'] });
  assert.deepEqual(projectDraftSnapshot(draft).values['test.rows'].map(row => row['test.rowId']), ['row-b', 'row-a']);
  assert.equal(projectDraftSnapshot(draft).values['test.rows'][1]['test.rowName'], 'A2');
  const invalid = setInspectorDraftInputIssue(draft, 'test.rows', '{bad', 'Invalid row');
  assert.equal(validateInspectorDraft(invalid).ok, false);
  assert.equal(projectDraftSnapshot(invalid).values['test.rows'].length, 2);
});

test('metadata binding cannot be patched and every unavailable source mode is explicitly read-only', () => {
  const draft = createInspectorDraft(snapshot());
  const rejected = updateInspectorDraft(draft, { op: 'set', key: 'page.type', value: 'other' });
  assert.equal(rejected.inputIssues[0].code, 'inspector.invalid_input');
  assert.equal(projectDraftSnapshot(rejected).metadata.type, 'test-card');
  const legacyContent = buildPageRecordContent({ id: 'legacy', type: 'test-card', body: '<h1>Legacy</h1>' });
  const legacy = createCardVariableSnapshot({ id: 'legacy', content: legacyContent }, registry);
  const invalid = createCardVariableSnapshot({ id: 'entity', content: page(envelope()).content.replace(/^variablesJson:.*$/m, 'variablesJson: {bad') }, registry);
  const futureContent = page(envelope()).content.replace(/^variablesJson:.*$/m, 'variablesJson: {"formatVersion":99,"future":true}');
  const unsupported = createCardVariableSnapshot({ id: 'entity', content: futureContent }, registry);
  const missingDefinition = createCardVariableSnapshot(page(envelope()), null);
  const missing = createCardVariableSnapshot(null, registry);
  assert.deepEqual([legacy.mode, invalid.mode, unsupported.mode, missingDefinition.mode, missing.mode],
    ['legacy', 'invalid', 'unsupported', 'missing-definition', 'missing']);
  for (const entity of [legacy, invalid, unsupported, missingDefinition, missing]) assert.equal(describeInspectorSource(entity).editable, false);
  assert.equal(describeInspectorSource({ mode: 'structured' }).editable, true);
});
