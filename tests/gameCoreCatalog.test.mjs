import './setup.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateCardTypeDefinition, validateFieldSetDefinition } from '../js/cardTypes/cardTypeSchema.js';
import { CardTypeRegistry } from '../js/cardTypes/cardTypeRegistry.js';
import { BUNDLED_FIELD_SET_DEFINITIONS } from '../js/cardTypes/definitions/bundledDefinitions.js';
import { GAME_CORE_CARD_TYPE_DEFINITIONS } from '../js/cardTypes/definitions/gameCoreDefinitions.js';
import { activateCardTypeDefinitions, createCardTypeRegistryFromCatalog, readCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { buildPageRecordContent } from '../js/core/pageRecord.js';
import { createCardVariableSnapshot } from '../js/variables/cardVariableStore.js';
import { getValue, readEntity, resolveReference } from '../js/variables/entityVariables.js';

const oracle = JSON.parse(await readFile(new URL('./fixtures/gameCoreCatalogCompleteness.json', import.meta.url), 'utf8'));
const ids = ['player','character','item','skill','spell','effect','race','class'];

test('game-core bundled catalog validates and matches the independent source oracle', () => {
  assert.deepEqual(GAME_CORE_CARD_TYPE_DEFINITIONS.map(x => x.id), ids);
  assert.deepEqual(GAME_CORE_CARD_TYPE_DEFINITIONS.map(x => x.version), ids.map(() => 1));
  for (const definition of BUNDLED_FIELD_SET_DEFINITIONS) assert.equal(validateFieldSetDefinition(definition).ok, true);
  for (const definition of GAME_CORE_CARD_TYPE_DEFINITIONS) assert.equal(validateCardTypeDefinition(definition).ok, true);

  const registry = new CardTypeRegistry();
  for (const expected of oracle.types) {
    const resolved = registry.getResolvedType(expected.id, expected.version);
    const definition = resolved.definition;
    const actual = {
      id: definition.id,
      version: definition.version,
      sourceFieldCount: expected.sourceFieldCount,
      sourcePathsSha256: expected.sourcePathsSha256,
      resolvedTopLevelFields: resolved.fields.length,
      resolvedFieldIdentities: resolved.fields.reduce((count, field) => count + countFields(field), 0),
      sections: definition.sections.map(section => section.id),
      includes: definition.includes.map(include => `${include.id}@${include.version}`),
      digest: resolved.digest
    };
    const { fields: expectedFields, ...expectedSummary } = expected;
    assert.deepEqual(actual, expectedSummary, `${expected.id} summary differs from the approved catalog oracle`);
    assertFieldManifest(expected.id, flattenFields(resolved.fields), expectedFields);
  }
});

test('game-core semantic reuse keeps one owner without merging unlike concepts', () => {
  const registry = new CardTypeRegistry();
  const player = registry.getResolvedType('player', 1);
  const character = registry.getResolvedType('character', 1);
  assert.notEqual(player.digest, character.digest);
  assert.equal(player.fieldsByKey['dnd.items'].provenance.id, 'dnd.actor-links');
  assert.equal(character.fieldsByKey['dnd.items'].provenance.id, 'dnd.actor-links');
  assert.equal(registry.getResolvedType('item', 1).fieldsByKey['item.category'].provenance.id, 'item');
  assert.equal(registry.getResolvedType('effect', 1).fieldsByKey['effect.category'].provenance.id, 'effect');
  assert.equal(registry.getResolvedType('item', 1).fieldsByKey['item.isObject'].default, false);
  assert.equal(registry.getResolvedType('race', 1).fieldsByKey['race.parent'].datatype, 'reference');
  assert.equal(registry.getResolvedType('class', 1).fieldsByKey['class.subclasses'].items.datatype, 'reference');
});

test('game-core seed activation persists exact transitive closure without eager startup activation', async () => {
  const adapter = memoryAdapter();
  const empty = await readCardTypeCatalog({ storageAdapter: adapter });
  assert.equal(empty.exists, false);
  const activated = await activateCardTypeDefinitions({
    storageAdapter: adapter,
    expectedIdentity: empty.identity,
    types: GAME_CORE_CARD_TYPE_DEFINITIONS
  });
  assert.deepEqual(activated.catalog.types.map(x => x.id), [...ids].sort());
  assert.deepEqual(activated.catalog.fieldSets.map(x => x.id), BUNDLED_FIELD_SET_DEFINITIONS.map(x => x.id).sort());
  const registry = createCardTypeRegistryFromCatalog(activated.catalog);
  for (const id of ids) assert.equal(registry.getResolvedType(id, 1).id, id);
});

test('game-core definitions remain data-only and use canonical metadata bindings', () => {
  const visit = value => {
    assert.notEqual(typeof value, 'function');
    if (value && typeof value === 'object') for (const child of Object.values(value)) visit(child);
  };
  visit(GAME_CORE_CARD_TYPE_DEFINITIONS);
  const registry = new CardTypeRegistry();
  for (const id of ids) {
    const fields = registry.getResolvedType(id, 1).fieldsByKey;
    assert.equal(fields['page.type'].binding.owner, 'page');
    assert.equal(fields['page.tags'].binding.owner, 'page');
    assert.equal(fields['content.blocks'].binding.owner, 'content');
    assert.equal(fields['page.type'].readonly, true);
  }
});

test('game-core metadata bindings project PageRecord owners without synthetic relationship rows', () => {
  const registry = new CardTypeRegistry();
  const resolved = registry.getResolvedType('item', 1);
  const content = buildPageRecordContent({
    id: 'metadata-item', type: 'item', parent: 'parent-page', order: 1.5,
    tags: ['inventory'], aliases: ['Снаряжение'],
    relationships: [{ type: 'related', targetId: 'target-page', targetTitle: 'Цель', label: 'Связанный предмет' }],
    body: '<h1>Предмет</h1><p>Свободные blocks остаются body.</p>',
    variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: resolved.digest, values: {} },
    now: '2026-09-26T00:00:00Z'
  });
  const entity = readEntity('metadata-item', {
    registry,
    repository: { getPageById: pageId => pageId === 'metadata-item' ? { id: pageId, content } : null }
  });
  assert.equal(getValue(entity, 'page.order').status, 'value');
  assert.equal(getValue(entity, 'page.order').value, 1.5);
  assert.deepEqual(getValue(entity, 'page.parent').value, { pageId: 'parent-page' });
  assert.deepEqual(getValue(entity, 'page.relationships').value, [{
    'core.relationship.targetId': 'target-page',
    'core.relationship.targetTitle': 'Цель',
    'core.relationship.type': 'related',
    'core.relationship.label': 'Связанный предмет'
  }]);
  assert.match(getValue(entity, 'content.blocks').value, /Свободные blocks остаются body/);
  assert.equal(entity.values['page.parent'], undefined);
  assert.equal(entity.values['page.relationships'], undefined);
  assert.equal(resolved.fieldsByKey['page.order'].datatype, 'number');
  assert.equal(resolved.fieldsByKey['page.relationships'].items.rowIdentityKey, undefined);
  assert.equal(resolved.fieldsByKey['page.relationships'].items.properties.some(field => field.key.endsWith('.direction')), false);

  const nullParent = createCardVariableSnapshot({ id: 'metadata-item', content: buildPageRecordContent({
    id: 'metadata-item', type: 'item', parent: null, order: 1, body: '<h1>Предмет</h1>',
    variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: resolved.digest, values: {} }, now: '2026-09-26T00:00:00Z'
  }) }, registry);
  assert.equal(getValue(nullParent, 'page.parent').value, null);
  assert.equal(resolveReference(nullParent, 'page.parent', { registry }).status, 'absent');

  const invalidOrderContent = buildPageRecordContent({
    id: 'metadata-item', type: 'item', order: 'not-a-number', body: '<h1>Предмет</h1>',
    variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: resolved.digest, values: {} }, now: '2026-09-26T00:00:00Z'
  }).replace(/^order:.*$/m, 'order: not-a-number');
  const invalidOrder = createCardVariableSnapshot({ id: 'metadata-item', content: invalidOrderContent }, registry);
  assert.equal(getValue(invalidOrder, 'page.order').status, 'invalid');

  const expectedStatuses = {
    'page.type': 'value', 'page.tags': 'value', 'page.aliases': 'value', 'page.parent': 'value',
    'page.relationships': 'value', 'page.order': 'value', 'content.blocks': 'value',
    'content.primaryImage': 'unresolved', 'page.icon': 'unresolved', 'page.archived': 'unresolved'
  };
  for (const [key, status] of Object.entries(expectedStatuses)) assert.equal(getValue(entity, key).status, status, key);
  assert.equal(resolved.fieldsByKey['core.sources'].binding.owner, 'variables');
});

function countFields(field) { return 1 + (field.properties || []).reduce((n,x)=>n+countFields(x),0) + (field.items?.properties || []).reduce((n,x)=>n+countFields(x),0); }

function flattenFields(fields) {
  const result = [];
  for (const field of fields) visitField(field, field.key, result);
  return result;
}

function visitField(field, path, result) {
  result.push(compact({
    path,
    key: field.key,
    datatype: field.datatype,
    binding: field.binding,
    required: Boolean(field.required),
    nullable: Boolean(field.nullable),
    readonly: Boolean(field.readonly),
    hasDefault: Object.hasOwn(field, 'default'),
    default: field.default,
    min: field.min,
    max: field.max,
    options: field.options?.map(option => option.value),
    targetTypes: field.targetTypes,
    format: field.format,
    formula: field.formula,
    rowIdentityKey: field.rowIdentityKey,
    section: field.section,
    group: field.group,
    visibility: field.visibility,
    deprecated: field.deprecated,
    computed: field.computed,
    validation: field.validation
  }));
  for (const property of field.properties || []) visitField(property, `${path}.${property.key}`, result);
  if (field.items) visitField(field.items, `${path}[]`, result);
}

function assertFieldManifest(typeId, actualFields, expectedFields) {
  const actual = new Map(actualFields.map(field => [field.path, field]));
  const expected = new Map(expectedFields.map(field => [field.path, field]));
  const missing = [...expected.keys()].filter(path => !actual.has(path));
  const extra = [...actual.keys()].filter(path => !expected.has(path));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] }, `${typeId} field paths differ`);
  for (const [path, expectedField] of expected) {
    assert.deepEqual(actual.get(path), expectedField, `${typeId}:${path} structure differs`);
  }
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
function memoryAdapter() { const files=new Map(); return { async readText(path){return files.get(path);}, async writeText(path,content){files.set(path,String(content));} }; }
