import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPageRecordContent, parsePageRecordContent, createPageStateIdentityFromContent } from '../js/core/pageRecord.js';
import { extractLegacyProperties } from '../js/migration/legacyPropertiesExtraction.js';
import { LEGACY_TYPE_MAPPING, LEGACY_FIELD_MAPPING } from '../js/migration/legacyPropertiesMapping.js';
import { planExtractedProperties, materializeMigrationCandidate, migrationRegistry } from '../js/migration/propertiesMigrationPlan.js';
import { createLegacyCustomIdentities } from '../js/migration/legacyCustomFields.js';
import { CardTypeRegistry } from '../js/cardTypes/cardTypeRegistry.js';
import { createCardVariableSnapshot } from '../js/variables/cardVariableStore.js';
import { readEntityCompatibility } from '../js/variables/entityVariables.js';
import { createMemoryStorageAdapter } from './fixtures/editConflictFixtures.mjs';
import { createWorkspaceBackup, verifyWorkspaceBackup, restoreWorkspaceBackup } from '../js/storage/backupService.js';
import { readCardTypeCatalog, activateCardTypeDefinitions, CARD_TYPE_CATALOG_PATH } from '../js/storage/cardTypeCatalogStorage.js';
import { BUNDLED_CARD_TYPE_DEFINITIONS } from '../js/cardTypes/definitions/bundledDefinitions.js';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import { inspectPropertiesMigrationResume } from '../js/migration/propertiesMigration.js';
import { beginWorkspaceOperation, commitWorkspaceOperation } from '../js/storage/operationJournal.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/legacyPropertiesMigration.json', import.meta.url)));
const makePage = (id, fixture) => ({ id, name: `${id}.md`, path: `pages/${id}.md`, type: fixture.type,
  content: buildPageRecordContent({ id, type: fixture.type, template: 'card', tags: ['keep'], body: fixture.body, now: '2026-09-26T00:00:00Z' }).replace('type:', 'unrelated: preserve\ntype:') });
const extraction = (page, controls) => ({ version: 1, pageId: page.id, sourceType: page.type,
  sourceIdentity: createPageStateIdentityFromContent(page.content), mode: 'legacy', issues: [],
  blocks: [{ index: 0, cardType: page.type, issues: [], controls: controls.map(control => ({ manual: false, manualState: null, custom: false, ...control })) }] });
const referencePages = [{ id: 'armor', title: 'Armor', aliases: ['Armor alias'], type: 'item' }];

for (const [id, fixture] of Object.entries(fixtures).filter(([, x]) => x.controls)) {
  test(`versioned ${id} mapping preserves explicit data and immutable provenance`, () => {
    const page = makePage(id, fixture);
    const source = extraction(page, fixture.controls);
    const plan = planExtractedProperties(page, source, { pages: referencePages });
    assert.equal(plan.status, 'ready', JSON.stringify(plan.issues));
    assert.equal(plan.targetType, LEGACY_TYPE_MAPPING[fixture.type]);
    assert.deepEqual(plan.envelope.values, fixture.expectedValues);
    assert.deepEqual(plan.envelope.overrides, {});
    assert.deepEqual(plan, planExtractedProperties(page, source, { pages: referencePages }));
    assert.ok(Object.isFrozen(plan.envelope.values));
    const candidate = materializeMigrationCandidate(plan, { operationId: 'operation', backupId: 'backup' });
    assert.deepEqual(candidate, materializeMigrationCandidate(plan, { operationId: 'operation', backupId: 'backup' }));
    const record = parsePageRecordContent(candidate.content);
    assert.equal(record.schemaVersion, 2);
    assert.equal(record.rawBody, parsePageRecordContent(page.content).rawBody);
    assert.match(candidate.content, /unrelated: preserve/);
    assert.deepEqual(record.tags, ['keep']);
    assert.equal(record.variablesJson.migration.operationId, 'operation');
  });
}

test('unknown/custom/falsy evidence is not lost or made into calculated overrides', () => {
  const page = makePage('hero', fixtures.character);
  const plan = planExtractedProperties(page, extraction(page, fixtures.character.controls));
  const inactive = Object.fromEntries(plan.envelope.inactive.map(entry => [entry.key, entry]));
  assert.equal(inactive['custom-flag'].raw, false);
  assert.equal(inactive.mystery.raw, '');
  assert.equal(inactive.proficiencyBonus.status, 'derived-not-migrated');
  assert.match(inactive.armorClass.reason, /manual-override/);
  assert.ok(!Object.hasOwn(plan.envelope.values['dnd.health'], 'dnd.hpTemporary'));
});

test('mapping table references only existing variable-owned schema paths', () => {
  const registry = migrationRegistry();
  for (const [type, mappings] of Object.entries(LEGACY_FIELD_MAPPING)) {
    const definition = registry.getResolvedType(LEGACY_TYPE_MAPPING[type], 1);
    for (const [key, path] of Object.entries(mappings)) {
      let field = definition.fieldsByKey[path[0]];
      assert.equal(field?.binding.owner, 'variables', `${type}.${key}`);
      for (const part of path.slice(1)) field = field?.properties?.find(x => x.key === part);
      assert.ok(field, `${type}.${key}: missing ${path}`);
    }
  }
});

test('legacy armor kinds map deterministically to the item armor enum', () => {
  const cases = { 'Нет': 'none', 'Легкий': 'light', 'Средний': 'medium', 'Тяжелый': 'heavy', 'Щит': 'shield' };
  const page = makePage('armor-item', fixtures.item);
  for (const [legacy, expected] of Object.entries(cases)) {
    const plan = planExtractedProperties(page, extraction(page, [{ key: 'armorKind', raw: legacy, type: 'select', present: true }]));
    assert.equal(plan.status, 'ready', legacy);
    assert.equal(plan.envelope.values['item.armor']['item.armor.type'], expected);
    assert.equal(plan.envelope.inactive.some(entry => entry.key === 'armorKind'), false);
    assert.equal(createCardVariableSnapshot({ id: page.id, content: materializeMigrationCandidate(plan, { operationId: legacy, backupId: 'backup' }).content }, migrationRegistry()).mode, 'structured');
  }
});

test('legacy armor tuple becomes one validated item.armor object', () => {
  const page = makePage('armor-tuple', fixtures.item);
  const plan = planExtractedProperties(page, extraction(page, [
    { key: 'armorKind', raw: 'Средний', type: 'select', present: true },
    { key: 'armorBaseAc', raw: '14', type: 'number', present: true },
    { key: 'armorDexMax', raw: '2', type: 'number', present: true }
  ]));
  assert.equal(plan.status, 'ready', JSON.stringify(plan.issues));
  assert.deepEqual(plan.envelope.values['item.armor'], {
    'item.armor.type': 'medium', 'item.armor.baseAc': 14, 'item.armor.maxDexterity': 2
  });
  assert.equal(createCardVariableSnapshot({ id: page.id, content: materializeMigrationCandidate(plan, { operationId: 'tuple', backupId: 'backup' }).content }, migrationRegistry()).mode, 'structured');
});

test('unknown legacy armor kind blocks active migration and preserves raw evidence', () => {
  const page = makePage('unknown-armor', fixtures.item);
  const plan = planExtractedProperties(page, extraction(page, [{ key: 'armorKind', raw: 'Экзотический', type: 'select', present: true }]));
  assert.equal(plan.status, 'blocked');
  assert.equal(plan.envelope.values['item.armor'], undefined);
  assert.deepEqual(plan.envelope.inactive.find(entry => entry.key === 'armorKind'), {
    key: 'armorKind', raw: 'Экзотический', type: 'select', present: true, manual: false, manualState: null, custom: false,
    block: 0, targetPath: ['item.armor', 'item.armor.type'], status: 'invalid', reason: 'unsupported-legacy-enum-value'
  });
});

test('custom UUIDv5 mapping is deterministic across label edits and values validate through extensions', async () => {
  const page = makePage('hero', fixtures.character);
  const source = extraction(page, [{ key: 'custom-flag', raw: false, type: 'checkbox', custom: true, present: true, label: 'Flag' }]);
  const ids = await createLegacyCustomIdentities(page.id, source);
  const key = 'custom.e774ea28-889b-5bd3-95a5-ec1b8adc3347';
  assert.equal(ids['0:custom-flag'], key);
  source.blocks[0].controls[0].label = 'Renamed';
  assert.deepEqual(await createLegacyCustomIdentities(page.id, source), ids);
  const plan = planExtractedProperties(page, source, { customIdentities: ids });
  assert.equal(plan.status, 'ready', JSON.stringify(plan.issues));
  assert.equal(plan.envelope.values[key], false);
  assert.equal(plan.envelope.extensions.fields[0].label, 'Renamed');
  const candidate = materializeMigrationCandidate(plan, { operationId: 'op', backupId: 'backup' });
  assert.equal(createCardVariableSnapshot({ id: page.id, content: candidate.content }, migrationRegistry()).mode, 'structured');
});

test('manual override maps only into a declared compatible computed field; saved calculated number does not', () => {
  const registry = new CardTypeRegistry({ bundledTypes: [{ id: 'character', version: 1, label: 'Test only', includes: [], sections: [], fields: [{
    key: 'dnd.proficiencyBonus', label: 'Bonus', datatype: 'number', binding: { owner: 'variables' },
    computed: { resolverId: 'test.bonus', version: 1, inputs: [], allowOverride: true }
  }] }] });
  const page = makePage('hero', fixtures.character);
  const manual = planExtractedProperties(page, extraction(page, [{ key: 'proficiencyBonus', raw: '0', present: true, manual: true }]), { registry });
  assert.equal(manual.status, 'ready');
  assert.deepEqual(manual.envelope.overrides, { 'dnd.proficiencyBonus': 0 });
  const derived = planExtractedProperties(page, extraction(page, [{ key: 'proficiencyBonus', raw: '2', present: true, manualState: 'false' }]), { registry });
  assert.deepEqual(derived.envelope.overrides, {});
  assert.deepEqual(derived.envelope.values, {});
  const conflict = planExtractedProperties(page, extraction(page, [
    { key: 'proficiencyBonus', raw: '2', present: true, manual: true },
    { key: 'override-proficiencyBonus', raw: '3', present: true, custom: true }
  ]), { registry });
  assert.equal(conflict.status, 'blocked');
});

test('compatibility reader never extracts Properties for structured, invalid or future data', () => {
  const page = makePage('hero', fixtures.character);
  const plan = planExtractedProperties(page, extraction(page, fixtures.character.controls));
  const candidate = materializeMigrationCandidate(plan, { operationId: 'op', backupId: 'backup' });
  class ForbiddenParser { constructor() { throw new Error('Legacy reader must not run'); } }
  for (const content of [candidate.content, candidate.content.replace(/^variablesJson:.*$/m, 'variablesJson: {broken'), candidate.content.replace('"formatVersion":1', '"formatVersion":99')]) {
    const result = readEntityCompatibility(page.id, { registry: migrationRegistry(), repository: { getPageById: () => ({ ...page, content }) }, DOMParser: ForbiddenParser });
    assert.equal(result.legacy, undefined);
    assert.notEqual(result.mode, 'legacy');
  }
});

test('missing HTML reader is a blocking diagnostic, never empty extraction', () => {
  const page = makePage('hero', fixtures.character);
  assert.equal(extractLegacyProperties(page, { DOMParser: null }).issues[0].code, 'html-reader-unavailable');
});

test('literal PageRecord v1 without timestamps or order migrates deterministically without inventing metadata', () => {
  const page = { id: 'old', type: 'magic', path: 'pages/old.md', content: `---\nid: old\ntype: magic\ntags: [KeepCase]\nunknown: verbatim\n---\n\n${fixtures.magic.body}` };
  const plan = planExtractedProperties(page, extraction(page, fixtures.magic.controls));
  assert.equal(plan.status, 'ready', JSON.stringify(plan.issues));
  const candidate = materializeMigrationCandidate(plan, { operationId: 'op', backupId: 'backup' });
  assert.equal(candidate.content, materializeMigrationCandidate(plan, { operationId: 'op', backupId: 'backup' }).content);
  assert.doesNotMatch(candidate.content, /^updatedAt:|^order:/m);
  assert.match(candidate.content, /tags: \[KeepCase\]\nunknown: verbatim/);
  assert.equal(parsePageRecordContent(candidate.content).rawBody, fixtures.magic.body);
  const crlf = { ...page, content: page.content.replaceAll('\n', '\r\n') + '\r\n<p>Tail</p>\r\n' };
  const crlfPlan = planExtractedProperties(crlf, extraction(crlf, fixtures.magic.controls));
  assert.equal(crlfPlan.status, 'ready');
  const crlfCandidate = materializeMigrationCandidate(crlfPlan, { operationId: 'op', backupId: 'backup' });
  assert.ok(crlfCandidate.content.endsWith(fixtures.magic.body.replaceAll('\n', '\r\n') + '\r\n<p>Tail</p>\r\n'));
});

test('common owner evidence is preserved inactive; it never becomes a Variable', () => {
  const page = makePage('folder', fixtures.folder);
  const keys = ['tags', 'aliases', 'parent', 'order', 'type', 'relationships', 'icon', 'archived', 'body', 'blocks'];
  const plan = planExtractedProperties(page, extraction(page, keys.map(key => ({ key, raw: 'old-value', present: true }))));
  assert.equal(plan.status, 'ready');
  assert.deepEqual(plan.envelope.values, {});
  assert.equal(plan.envelope.inactive.length, keys.length);
  assert.ok(plan.evidence.every(x => x.status === 'common-owner'));
});

test('invalid numeric input and ambiguous/missing/wrong-type references block without coercion', () => {
  const page = makePage('hero', fixtures.character);
  for (const raw of ['', 'NaN', '1e999', '-1', '0x10']) {
    const plan = planExtractedProperties(page, extraction(page, [{ key: 'hpCurrent', raw, present: true }]));
    assert.equal(plan.status, 'blocked', raw);
    assert.deepEqual(plan.envelope.values, {});
  }
  for (const pages of [[], [...referencePages, { ...referencePages[0], id: 'other' }], [{ ...referencePages[0], type: 'spell' }]]) {
    assert.equal(planExtractedProperties(page, extraction(page, fixtures.reference.controls), { pages }).status, 'blocked');
  }
});

test('derived value without manual-mode evidence blocks; unknown types never guessed', () => {
  const page = makePage('hero', fixtures.character);
  assert.equal(planExtractedProperties(page, extraction(page, [{ key: 'armorClass', raw: '10', present: true }])).status, 'blocked');
  const unknown = makePage('x', fixtures.unknown);
  assert.equal(planExtractedProperties(unknown, extraction(unknown, [{ key: 'x', raw: '1', present: true }])).status, 'blocked');
});

test('definition-aware backup covers catalog, verifies bytes, restores legacy and preserves union', async () => {
  const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
  const page = makePage('hero', fixtures.character);
  await adapter.writeText(page.path, page.content);
  const backup = await createWorkspaceBackup({ storageAdapter: adapter, pages: [page], id: 'before-migration', definitionCoverage: true, cleanup: false });
  assert.equal(backup.version, 2);
  await verifyWorkspaceBackup(backup.id, { storageAdapter: adapter, definitionCoverage: true });
  const current = await readCardTypeCatalog({ storageAdapter: adapter });
  await activateCardTypeDefinitions({ types: BUNDLED_CARD_TYPE_DEFINITIONS.filter(x => x.id === 'character'), expectedIdentity: current.identity, storageAdapter: adapter });
  const plan = planExtractedProperties(page, extraction(page, fixtures.character.controls));
  const target = materializeMigrationCandidate(plan, { operationId: 'test', backupId: backup.id });
  await adapter.writeText(page.path, target.content);
  const after = await createWorkspaceBackup({ storageAdapter: adapter, pages: [page], definitionCoverage: true, id: 'after-migration', cleanup: false });
  assert.equal(after.cardTypes.path, CARD_TYPE_CATALOG_PATH);
  const verification = await verifyWorkspaceBackup(after.id, { storageAdapter: adapter, definitionCoverage: true });
  assert.equal(verification.pageContents[page.name], target.content, 'durable source beats stale runtime content');
  await restoreWorkspaceBackup(backup.id, adapter, { definitionCoverage: true, preRestorePages: [page], preRestoreBackupId: 'recovery-safety' });
  assert.equal(await adapter.readText(page.path), page.content);
  assert.equal(parsePageRecordContent(await adapter.readText(page.path)).variablesStatus.mode, 'legacy');
  assert.equal((await readCardTypeCatalog({ storageAdapter: adapter })).catalog.types.length, 1);
  await adapter.removeFile(CARD_TYPE_CATALOG_PATH);
  await restoreWorkspaceBackup(after.id, adapter, { definitionCoverage: true, preRestorePages: [page], preRestoreBackupId: 'structured-recovery-safety' });
  assert.equal(await adapter.readText(page.path), target.content);
  assert.equal((await readCardTypeCatalog({ storageAdapter: adapter })).catalog.types[0].id, 'character');
  await assert.rejects(restoreWorkspaceBackup(after.id, adapter, { definitionCoverage: true, restoreSelection: { pageNames: [page.name] } }), /Partial definition-aware restore/);
  await adapter.writeText(`.my-own-world-backups/${after.id}/${CARD_TYPE_CATALOG_PATH}`, '{}');
  await assert.rejects(verifyWorkspaceBackup(after.id, { storageAdapter: adapter, definitionCoverage: true }), /integrity/);
});

test('resume classifies source, exact target receipt, and third-state without writes', async () => {
  const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
  const page = makePage('hero', fixtures.character);
  const plan = planExtractedProperties(page, extraction(page, fixtures.character.controls));
  const target = materializeMigrationCandidate(plan, { operationId: 'op', backupId: 'backup' });
  const journal = { id: 'op', before: { backupId: 'backup', pages: [{ pageId: page.id, path: page.path, identity: plan.expectedBase }] },
    after: { pages: [{ pageId: page.id, identity: target.identity, digest: plan.schemaDigest }] } };
  for (const [content, status] of [[page.content, 'repreview'], [target.content, 'verified-skip'], [page.content + 'changed', 'conflict']]) {
    await adapter.writeText(page.path, content);
    assert.equal((await inspectPropertiesMigrationResume(journal))[0].status, status);
    assert.equal(await adapter.readText(page.path), content);
  }
});

test('native browser NotFoundError with numeric DOMException code is an absent catalog, not a failed workspace', async () => {
  const result = await readCardTypeCatalog({ storageAdapter: { readText: async () => { throw new DOMException('Missing entry', 'NotFoundError'); } } });
  assert.equal(result.exists, false);
  assert.deepEqual(result.catalog.types, []);
  await assert.rejects(readCardTypeCatalog({ storageAdapter: { readText: async () => { throw new DOMException('Denied', 'NotAllowedError'); } } }), /Denied/);
});

test('verified journal rejects lost writes and does not delete pending before committed readback', async () => {
  const adapter = createMemoryStorageAdapter();
  const entry = await beginWorkspaceOperation({ id: 'verified-op' }, adapter, true);
  const read = adapter.readText.bind(adapter);
  adapter.readText = async path => path.includes('/committed/') ? '{}' : read(path);
  await assert.rejects(commitWorkspaceOperation(entry, adapter, true), /readback/);
  assert.equal(JSON.parse(await read('.my-own-world-ops/pending/verified-op.json')).id, entry.id);
});

test('definition-aware backup refuses corrupted assets and pages before any recovery write', async () => {
  const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
  const binaries = new Map();
  const writeBinary = adapter.writeBinary.bind(adapter);
  adapter.writeBinary = async (path, bytes) => { binaries.set(path, bytes.slice(0)); await writeBinary(path, bytes); };
  adapter.readBinary = async path => {
    if (!binaries.has(path)) throw new Error(`Missing ${path}`);
    return binaries.get(path).slice(0);
  };
  const page = makePage('magic', fixtures.magic);
  await adapter.writeText(page.path, page.content);
  await adapter.writeBinary('assets/unused.bin', Uint8Array.from([0, 255, 2]).buffer);
  const backup = await createWorkspaceBackup({ storageAdapter: adapter, pages: [page], definitionCoverage: true, id: 'integrity', cleanup: false });
  assert.equal(backup.assets.length, 1, 'even an unreferenced asset is preserved');
  const prefix = `.my-own-world-backups/${backup.id}`;
  await adapter.writeBinary(`${prefix}/assets/unused.bin`, Uint8Array.from([4]).buffer);
  await assert.rejects(verifyWorkspaceBackup(backup.id, { storageAdapter: adapter, definitionCoverage: true }), error => /integrity/.test(error.cause?.message));
  await adapter.writeBinary(`${prefix}/assets/unused.bin`, Uint8Array.from([0, 255, 2]).buffer);
  await adapter.writeText(`${prefix}/pages/magic.md`, page.content + 'corruption');
  await assert.rejects(restoreWorkspaceBackup(backup.id, adapter, { definitionCoverage: true, preRestorePages: [page] }), error => /integrity/.test(error.cause?.message));
  assert.equal(await adapter.readText(page.path), page.content);
});
