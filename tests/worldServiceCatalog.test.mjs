import './setup.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateCardTypeDefinition } from '../js/cardTypes/cardTypeSchema.js';
import { CardTypeRegistry } from '../js/cardTypes/cardTypeRegistry.js';
import { BUNDLED_CARD_TYPE_DEFINITIONS, BUNDLED_FIELD_SET_DEFINITIONS } from '../js/cardTypes/definitions/bundledDefinitions.js';
import { WORLD_SERVICE_CARD_TYPE_DEFINITIONS } from '../js/cardTypes/definitions/worldServiceCatalog.js';
import { ALL_CARD_TYPE_IDS } from '../js/cardTypes/definitions/gameCoreHelpers.js';
import { activateCardTypeDefinitions, createCardTypeRegistryFromCatalog, readCardTypeCatalog } from '../js/storage/cardTypeCatalogStorage.js';
import { buildPageRecordContent } from '../js/core/pageRecord.js';
import { readEntity, resolveReference } from '../js/variables/entityVariables.js';
import { PageIndex } from '../js/repository/pageIndex.js';

const oracle = JSON.parse(await readFile(new URL('./fixtures/worldServiceCatalogCompleteness.json', import.meta.url), 'utf8'));
const approvedSourceSha256 = '6c4e4823f998fcf997b5b6c443898d26d125b322cb42a4fe9bdf89a47e7f894f';
const worldIds = ['location','region','country','organization','lore','folder','project'];
const allIds = ['player','character','item','skill','spell','effect','race','class',...worldIds];

test('Stage 6 source provenance and all seven static completeness manifests are exact', async () => {
  assert.equal(oracle.source.sha256, approvedSourceSha256);
  try {
    const source = await readFile(new URL('../docs/05-hypotesis/card_types.txt', import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), approvedSourceSha256);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  assert.deepEqual(WORLD_SERVICE_CARD_TYPE_DEFINITIONS.map(x => x.id), worldIds);
  const registry = new CardTypeRegistry();
  for (const expected of oracle.types) {
    const definition = WORLD_SERVICE_CARD_TYPE_DEFINITIONS.find(x => x.id === expected.id);
    assert.equal(validateCardTypeDefinition(definition).ok, true, expected.id);
    const resolved = registry.getResolvedType(expected.id, expected.version);
    const fields = flattenFields(resolved.fields);
    const owned = fields.filter(field => field.path.startsWith(`${expected.id}.`));
    const actualPaths = owned.map(field => field.path);
    assert.deepEqual({
      id: resolved.id, version: resolved.version,
      resolvedTopLevelFields: resolved.fields.length,
      resolvedFieldIdentities: fields.length,
      sections: resolved.definition.sections.map(x => x.id),
      includes: resolved.definition.includes.map(x => `${x.id}@${x.version}`),
      digest: resolved.digest,
      ownedFieldPaths: actualPaths,
      ownedStructureSha256: createHash('sha256').update(JSON.stringify(owned)).digest('hex')
    }, {
      id: expected.id, version: expected.version,
      resolvedTopLevelFields: expected.resolvedTopLevelFields,
      resolvedFieldIdentities: expected.resolvedFieldIdentities,
      sections: expected.sections, includes: expected.includes, digest: expected.digest,
      ownedFieldPaths: expected.ownedFieldPaths,
      ownedStructureSha256: expected.ownedStructureSha256
    }, `${expected.id}: missing/extra path or wrong datatype/binding/target/enum/constraint`);
  }
});

test('bundled activation resolves exactly all 15 approved Card Types', async () => {
  assert.deepEqual(BUNDLED_CARD_TYPE_DEFINITIONS.map(x => x.id), allIds);
  const adapter = memoryAdapter();
  const empty = await readCardTypeCatalog({ storageAdapter: adapter });
  assert.equal(empty.exists, false);
  const activated = await activateCardTypeDefinitions({
    storageAdapter: adapter, expectedIdentity: empty.identity,
    types: BUNDLED_CARD_TYPE_DEFINITIONS
  });
  assert.deepEqual(activated.catalog.types.map(x => x.id), [...allIds].sort());
  const registry = createCardTypeRegistryFromCatalog(activated.catalog);
  for (const id of allIds) assert.equal(registry.getResolvedType(id, 1).id, id);
  assert.deepEqual(activated.catalog.fieldSets.map(x => x.id), BUNDLED_FIELD_SET_DEFINITIONS.map(x => x.id).sort());
});

test('domain hierarchy stays separate from PageRecord tree hierarchy', () => {
  const registry = new CardTypeRegistry();
  for (const [type, key, target] of [
    ['location','location.parentLocation','location'],
    ['region','region.parentRegion','region'],
    ['organization','organization.parentOrganization','organization'],
    ['folder','folder.parentFolder','folder'],
    ['project','project.parentProject','project']
  ]) {
    const resolved = registry.getResolvedType(type, 1);
    assert.equal(resolved.fieldsByKey[key].binding.owner, 'variables');
    assert.deepEqual(resolved.fieldsByKey[key].targetTypes, [target]);
    assert.equal(resolved.fieldsByKey['page.parent'].binding.owner, 'page');
  }
});

test('mixed values and special map references preserve exact canonical identities', () => {
  const registry = new CardTypeRegistry();
  const country = registry.getResolvedType('country', 1);
  assert.deepEqual(country.fieldsByKey['country.mapScene'].targetTypes, ['campaign-map']);
  assert.deepEqual(country.fieldsByKey['country.economy'].properties
    .find(x => x.key === 'country.economy.mainResources').items.properties
    .find(x => x.key.endsWith('.card')).targetTypes, ALL_CARD_TYPE_IDS);
  const project = registry.getResolvedType('project', 1);
  assert.deepEqual(project.fieldsByKey['project.blockers'].items.properties
    .find(x => x.key.endsWith('.kind')).options.map(x => x.value), ['card','text']);

  const owner = page('country-1', 'country', country.digest, { 'country.mapScene': { pageId: 'map-1' } });
  const map = { id: 'map-1', title: 'Сцена столицы', type: 'campaignMap', template: 'campaignMap', content: '# map' };
  const repository = { getPageById: id => id === owner.id ? owner : id === map.id ? map : null };
  const snapshot = readEntity(owner.id, { registry, repository });
  assert.deepEqual(resolveReference(snapshot, 'country.mapScene', { registry, repository }), {
    status: 'value', pageId: 'map-1', label: 'Сцена столицы', type: 'campaignMap', source: 'page-repository'
  });
});

test('PageIndex and exact typed references accept Stage 6 types without title fallback', () => {
  const pages = worldIds.map((type, index) => ({ id:`world-${type}`, title:`World ${type}`, type, template:'card', parent:null, order:index, tags:[], aliases:[] }));
  const index = new PageIndex(pages);
  for (const type of worldIds) assert.equal(index.getPagesByType(type)[0].id, `world-${type}`);
  assert.equal(index.searchPageResults('World country')[0].page.type, 'country');
});

function page(id, type, digest, values) {
  return { id, title:id, type, template:'card', path:`/pages/${id}.md`, content:buildPageRecordContent({
    id, type, template:'card', body:`<h1>${id}</h1>`, now:'2026-09-26T00:00:00Z',
    variablesJson:{ formatVersion:1, schemaVersion:1, schemaDigest:digest, values }
  }) };
}
function flattenFields(fields) { const result=[]; for(const field of fields) visit(field,field.key,result); return result; }
function visit(field,path,result) { const descriptor=compact({key:field.key,datatype:field.datatype,binding:field.binding,required:Boolean(field.required),nullable:Boolean(field.nullable),readonly:Boolean(field.readonly),hasDefault:Object.hasOwn(field,'default'),default:field.default,min:field.min,max:field.max,options:field.options?.map(x=>x.value),targetTypes:field.targetTypes,format:field.format,formula:field.formula,rowIdentityKey:field.rowIdentityKey,section:field.section,group:field.group,visibility:field.visibility,deprecated:field.deprecated,computed:field.computed,validation:field.validation});result.push({path,descriptor});for(const x of field.properties||[])visit(x,`${path}.${x.key}`,result);if(field.items)visit(field.items,`${path}[]`,result); }
function compact(value) { return Object.fromEntries(Object.entries(value).filter(([,entry])=>entry!==undefined)); }
function memoryAdapter() { const files=new Map(); return { async readText(path){return files.get(path);}, async writeText(path,content){files.set(path,String(content));} }; }
