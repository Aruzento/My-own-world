import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerSheetFixture, playerRegistry } from './fixtures/playerSheetFixtures.mjs';
import { CANONICAL_CARD_TYPES, prepareNewCardEnvelope, copyPageContent } from '../js/storage/structuredPageCreation.js';
import { buildPageRecordContent, parsePageRecordContent, createPageStateIdentityFromContent } from '../js/core/pageRecord.js';
import { createCardVariableSnapshot } from '../js/variables/cardVariableStore.js';
import { traverseTypedPage, collectPageDefinitionClosure, rewriteTypedPage } from '../js/variables/typedPageTraversal.js';
import { collectAssetReferencesFromPages } from '../js/storage/assetReferenceScanner.js';
import { createWorldPackageFromPages, normalizeWorldPackageData } from '../js/worldPackage/worldPackageModel.js';
import { applyWorldPackagePageImport } from '../js/worldPackage/worldPackageImportService.js';
import { createWorkspaceBackup, verifyWorkspaceBackup, restoreWorkspaceBackupSelection } from '../js/storage/backupService.js';
import { prepareCardTypeChange, commitCardTypeChange } from '../js/variables/cardTypeChange.js';
import { getPageById, getAllPages, getPageIndex, setPageRepositoryRegistry } from '../js/repository/pageRepository.js';
import { updatePageRecordContent } from '../js/core/pageRecord.js';
import { createDesktopStorageAdapter } from '../js/storage/desktopStorageAdapter.js';
import { setStorageAdapter } from '../js/storage/storageAdapter.js';
import {normalizeTauriCommandError} from '../js/storage/tauriBridge.js';

test('canonical Registry presentation supplies exactly fifteen selectable ids', () => {
  assert.equal(CANONICAL_CARD_TYPES.length, 15);
  for (const id of ['creature', 'magic', 'object', 'note']) assert.ok(!CANONICAL_CARD_TYPES.some(type => type.id === id));
});
test('native missing optional file has browser-compatible absence identity while retaining native code', () => {
  const error=normalizeTauriCommandError({code:'desktop.file_not_found',message:'localized native error',path:'optional.json'});
  assert.equal(error.name,'NotFoundError'); assert.equal(error.code,'desktop.file_not_found');
  assert.equal(error.path,'optional.json');
});

for (const failure of ['catalog','workspace','missing','write','readback']) test(`type change ${failure} guard never fabricates success`, async () => {
  const f = await createPlayerSheetFixture();
  const plan = await prepareCardTypeChange({pageId:f.page.id,targetType:'character',expectedBase:createPageStateIdentityFromContent(f.page.content)});
  const write = f.adapter.writeText.bind(f.adapter), read = f.adapter.readText.bind(f.adapter);
  let persisted = false;
  if (failure === 'catalog') {
    const catalog = JSON.parse(await read('.my-own-world-card-types.json')); catalog.revision++;
    await write('.my-own-world-card-types.json', JSON.stringify(catalog));
  }
  if (failure === 'workspace') setStorageAdapter({...f.adapter});
  if (failure === 'missing') await f.adapter.removeFile(f.page.path);
  if (failure === 'write' || failure === 'readback') {
    f.adapter.writeText = async (path,content) => {
      if (path === f.page.path && failure === 'write') throw new Error('injected write failure');
      await write(path,content); if (path === f.page.path) persisted = true;
    };
    f.adapter.readText = async path => {
      const content=await read(path); return persisted && path===f.page.path ? content+'\nreadback mismatch' : content;
    };
  }
  const result = await commitCardTypeChange(plan,{confirm:true});
  assert.notEqual(result.status,'saved');
  assert.notEqual(result.status,'unchanged');
  assert.equal((await commitCardTypeChange(plan,{confirm:true})).status,'blocked');
  if (!['missing','readback'].includes(failure)) assert.equal(await read(f.page.path), f.page.content);
});

test('injected Tauri adapter shares structured creation, type change, duplicate, package and partial restore format', async () => {
  const f = await createPlayerSheetFixture();
  setPageRepositoryRegistry(playerRegistry);
  const originalTauri = globalThis.__TAURI__;
  const originalStorage = globalThis.localStorage;
  const localValues = new Map();
  globalThis.localStorage = {getItem:key=>localValues.get(key)||null,setItem:(key,value)=>localValues.set(key,String(value))};
  const calls = [];
  globalThis.__TAURI__ = {core:{async invoke(command, payload) {
    calls.push(command);
    if (command === 'set_workspace_root') return payload.workspaceRoot;
    const methods = {ensure_directory:'ensureDirectory',read_text_file:'readText',write_text_file:'writeText',append_text_file:'appendText',list_directory:'listFiles',remove_file:'removeFile',remove_directory:'removeDirectory'};
    if (command === 'read_binary_file') return Array.from(new Uint8Array(await f.adapter.readBinary(payload.path)));
    if (command === 'write_binary_file') return f.adapter.writeBinary(payload.path,Uint8Array.from(payload.content).buffer);
    if (!methods[command]) throw new Error('Unsupported test bridge command '+command);
    return f.adapter[methods[command]](payload.path,payload.content);
  }}};
  const adapter = createDesktopStorageAdapter({workspaceRoot:'C:/Stage9Parity'});
  setStorageAdapter(adapter);
  try {
    const { createPage, duplicatePageAsChild } = await import('../js/storage/pageStorage.js');
    const page = await createPage('card',null);
    assert.equal(parsePageRecordContent(await adapter.readText(page.path)).variablesStatus.mode,'structured');
    const change = await prepareCardTypeChange({pageId:page.id,targetType:'item',expectedBase:createPageStateIdentityFromContent(page.content)});
    assert.equal((await commitCardTypeChange(change,{confirm:true})).status,'saved');
    const current = getPageById(page.id);
    const duplicate = await duplicatePageAsChild(current,null);
    assert.equal(parsePageRecordContent(await adapter.readText(duplicate.path)).type,'item');
    const exact = await adapter.readText(current.path);
    const backup = await createWorkspaceBackup({storageAdapter:adapter,cleanup:false});
    assert.equal(backup.version,2);
    const pkg = createWorldPackageFromPages([current],{registry:getPageIndex().registry});
    assert.equal(pkg.version,2);
    await applyWorldPackagePageImport({packageData:pkg,backupManifest:backup,storageAdapter:adapter,existingPages:getAllPages(),conflictStrategy:'copy',sanitizeBody:v=>v});
    await adapter.writeText(current.path,exact+'\nchanged');
    const restored = await restoreWorkspaceBackupSelection(backup.id,{pageNames:[current.name],assetPaths:[]},adapter);
    assert.equal(restored.restoredPages,1);
    assert.equal(getPageById(current.id).content,exact);
    assert.ok(calls.includes('write_text_file') && calls.includes('read_text_file') && calls.includes('list_directory'));
  } finally { globalThis.__TAURI__=originalTauri; globalThis.localStorage=originalStorage; setStorageAdapter(f.adapter); }
});
for (const type of CANONICAL_CARD_TYPES) test(`new ${type.id} pins activated exact definition and lazy data`, async () => {
  const f = await createPlayerSheetFixture();
  const envelope = await prepareNewCardEnvelope(type.id, f.adapter);
  const content = buildPageRecordContent({ id: 'new-card', type: type.id, body: '<h1>New</h1>', variablesJson: envelope });
  const snapshot = createCardVariableSnapshot({ id: 'new-card', content }, playerRegistry);
  assert.equal(snapshot.mode, 'structured');
  assert.deepEqual(snapshot.diagnostics.filter(issue => issue.severity === 'error'), []);
  assert.equal(envelope.schemaDigest, playerRegistry.getResolvedType(type.id, 1).digest);
  assert.ok(!content.includes('card-properties-block'));
  assert.deepEqual(Object.keys(envelope.values).sort(), ['character', 'player'].includes(type.id) ? ['dnd.equippedItems', 'dnd.items', 'dnd.ownEffects'] : []);
});

test('typed traversal visits exact refs/nested assets without default materialization', async () => {
  const f = await createPlayerSheetFixture();
  const before = f.page.content, refs = [];
  const result = traverseTypedPage(f.page, playerRegistry, entry => { if (entry.field.datatype === 'reference') refs.push(entry.value.pageId); });
  // Opaque historical inactive evidence deliberately prevents unsafe copy/cleanup.
  assert.equal(result.complete, false);
  assert.ok(refs.includes('player-item'));
  assert.equal(f.page.content, before);
  assert.ok(collectAssetReferencesFromPages([f.page], { registry: playerRegistry }).some(entry => entry.incomplete));
});

test('copy preserves unknown frontmatter/body/variables and invalidates source-specific migration claim', async () => {
  const f = await createPlayerSheetFixture();
  const record = parsePageRecordContent(f.page.content);
  const envelope = { ...record.variablesJson, migration: { operationId: 'original-op', pageId: record.id } };
  const source = updatePageRecordContent(f.page.content, { variablesJson: envelope }, { preserveUnchangedMetadata: true });
  const copied = parsePageRecordContent(copyPageContent(source, { id: 'duplicate', parent: 'other' }));
  assert.equal(copied.id, 'duplicate');
  assert.equal(copied.variablesJson.migration, undefined);
  assert.deepEqual(copied.variablesJson.values, record.variablesJson.values);
  assert.ok(copied.variablesJson.inactive.some(entry => entry.originPageId === record.id));
  assert.equal(copied.rawBody, record.rawBody);
  assert.equal(copied.frontMatter.values.playerevidence, 'preserved');
});

test('v2 package carries exact definition/extension closure, metadata and future versions reject', async () => {
  const f = await createPlayerSheetFixture();
  const pkg = createWorldPackageFromPages([f.page], { registry: playerRegistry });
  assert.equal(pkg.version, 2);
  assert.deepEqual(pkg.contents.pages[0].variablesJson, parsePageRecordContent(f.page.content).variablesJson);
  assert.ok(pkg.contents.cardTypes.types.some(type => type.id === 'player'));
  assert.ok(pkg.contents.cardTypes.fieldSets.some(type => type.id === 'dnd.own-effects'));
  assert.deepEqual(normalizeWorldPackageData(pkg), pkg);
  assert.throws(() => createWorldPackageFromPages([f.page], { version: 1 }), /blocked/);
  assert.throws(() => normalizeWorldPackageData({ ...pkg, version: 3 }), /Unsupported/);
});

test('v2 package copy remaps exact nested refs, relationships and parent before writes', async () => {
  const f = await createPlayerSheetFixture();
  const record = parsePageRecordContent(f.page.content);
  delete record.variablesJson.values['dnd.health']['player.health.hitDice'][0]['player.health.hitDice.max'];
  f.page.content = updatePageRecordContent(f.page.content, { variablesJson: { ...record.variablesJson, inactive: [] },
    relationships: [{ id: 'rel', targetId: f.item.id, type: 'owns' }] });
  await f.adapter.writeText(f.page.path, f.page.content);
  const pkg = createWorldPackageFromPages([f.page, f.item], { registry: playerRegistry });
  const backup = await createWorkspaceBackup({ pages: f.pages, storageAdapter: f.adapter, cleanup: false });
  const result = await applyWorldPackagePageImport({ packageData: pkg, backupManifest: backup, storageAdapter: f.adapter,
    existingPages: f.pages, conflictStrategy: 'copy', sanitizeBody: value => value });
  const pages = getAllPages().filter(page => !f.pages.some(old => old.id === page.id));
  const actor = pages.find(page => page.type === 'player'), item = pages.find(page => page.type === 'item');
  assert.ok(actor && item, JSON.stringify(result));
  const after = parsePageRecordContent(actor.content);
  assert.deepEqual(after.variablesJson.values['dnd.items'], [{ pageId: item.id }]);
  assert.equal(after.relationships[0].targetId, item.id);
  assert.equal(after.frontMatter.values.playerevidence, 'preserved');
});

test('ordinary backup v2 and partial restore retain unselected page and additive catalog', async () => {
  const f = await createPlayerSheetFixture();
  const record = parsePageRecordContent(f.page.content);
  delete record.variablesJson.values['dnd.health']['player.health.hitDice'][0]['player.health.hitDice.max'];
  f.page.content = updatePageRecordContent(f.page.content, { variablesJson: { ...record.variablesJson, inactive: [] } });
  await f.adapter.writeText(f.page.path, f.page.content);
  const backup = await createWorkspaceBackup({ pages: f.pages, storageAdapter: f.adapter, includeAssets: true, cleanup: false });
  assert.equal(backup.version, 2);
  const source = f.page.content;
  await f.adapter.writeText(f.page.path, source.replace('Player recovery marker', 'changed marker'));
  const itemAfter = f.item.content.replace('Player Item', 'Unselected item edited');
  await f.adapter.writeText(f.item.path, itemAfter);
  await restoreWorkspaceBackupSelection(backup.id, { pageIds: [f.page.id] }, f.adapter, { pages: f.pages });
  assert.equal(await f.adapter.readText(f.page.path), source);
  assert.equal(await f.adapter.readText(f.item.path), itemAfter);
});

test('guarded type change preserves tags/body/relationships, moves incompatible values to inactive', async () => {
  const f = await createPlayerSheetFixture();
  const before = parsePageRecordContent(f.page.content);
  const plan = await prepareCardTypeChange({ pageId: f.page.id, targetType: 'character', expectedBase: createPageStateIdentityFromContent(f.page.content) });
  assert.equal(f.writes.length, 0);
  const result = await commitCardTypeChange(plan, { confirm: true });
  assert.equal(result.status, 'saved', JSON.stringify(result));
  const backup = await verifyWorkspaceBackup(result.backupId, { storageAdapter: f.adapter });
  assert.equal(backup.pageContents[f.page.name], plan.sourceContent);
  const after = parsePageRecordContent(await f.adapter.readText(f.page.path));
  assert.equal(after.type, 'character');
  assert.deepEqual(after.tags, before.tags);
  assert.equal(after.rawBody, before.rawBody);
  assert.deepEqual(after.variablesJson.values['dnd.health']['dnd.hpCurrent'], 8);
  assert.ok(after.variablesJson.inactive.some(entry => entry.path?.includes('player.progression')));
  assert.equal((await commitCardTypeChange(plan, { confirm: true })).status, 'blocked');
});

test('same-type no-op verifies durable base and stale type switch never writes', async () => {
  const f = await createPlayerSheetFixture();
  const base = createPageStateIdentityFromContent(f.page.content);
  const noop = await prepareCardTypeChange({ pageId: f.page.id, targetType: 'player', expectedBase: base });
  assert.equal((await commitCardTypeChange(noop, { confirm: true })).status, 'unchanged');
  assert.equal(f.writes.length, 0);
  const plan = await prepareCardTypeChange({ pageId: f.page.id, targetType: 'character', expectedBase: base });
  await f.adapter.writeText(f.page.path, f.page.content.replace('recovery marker', 'concurrent marker'));
  f.writes.length = 0;
  assert.equal((await commitCardTypeChange(plan, { confirm: true })).status, 'blocked');
  assert.equal(f.writes.length, 0);
});

test('type switching keeps incompatible inbound typed refs diagnostic and never rewrites their owner', async () => {
  const f = await createPlayerSheetFixture();
  const { createPage } = await import('../js/storage/pageStorage.js');
  const { prepareVariablesChange, commitVariablesChange } = await import('../js/variables/variableCommands.js');
  const inbound = await createPage('card', null, undefined, { type: 'lore' });
  const refPlan = prepareVariablesChange({ pageId: inbound.id, expectedBase: createPageStateIdentityFromContent(inbound.content),
    context: { registry: playerRegistry }, patch: [{ op: 'set', key: 'lore.players', value: [{ pageId: f.page.id }] }] });
  assert.equal((await commitVariablesChange(refPlan)).status, 'saved');
  const original = await f.adapter.readText(inbound.path);
  f.writes.length = 0;
  const plan = await prepareCardTypeChange({ pageId: f.page.id, targetType: 'character', expectedBase: createPageStateIdentityFromContent(f.page.content) });
  assert.deepEqual(plan.diagnostics.filter(issue => issue.pageId === inbound.id), [{ pageId: inbound.id,
    sourceKey: 'values.lore.players.0', targetPageId: f.page.id, reason: 'incompatible-target-type' }]);
  assert.equal(f.writes.length, 0);
  assert.equal((await commitCardTypeChange(plan, { confirm: true })).status, 'saved');
  assert.equal(await f.adapter.readText(inbound.path), original);
  assert.ok(!f.writes.includes(inbound.path));
});

test('PageIndex searches typed scalars and derives exact ref edges without raw envelope noise', async () => {
  const f = await createPlayerSheetFixture();
  setPageRepositoryRegistry(playerRegistry);
  const index = getPageIndex();
  assert.ok(index.getTypedReferenceEdges(f.page.id).some(edge => edge.targetId === f.item.id && edge.sourceKey.includes('dnd.items')));
  assert.ok(index.searchDocuments.get(f.page.id).body.includes('6500'));
  assert.ok(!index.searchDocuments.get(f.page.id).body.includes('schemaDigest'));
  assert.deepEqual(getPageById(f.page.id).relationships, []);
});


test('inactive type return is explicit, exact-definition validated and cannot overwrite new state', async () => {
 const f = await createPlayerSheetFixture();
 const original = parsePageRecordContent(f.page.content).variablesJson.values['player.progression'];
 let plan = await prepareCardTypeChange({pageId:f.page.id,targetType:'character',expectedBase:createPageStateIdentityFromContent(f.page.content)});
 assert.equal((await commitCardTypeChange(plan,{confirm:true})).status,'saved');
 let page=getPageById(f.page.id);
 plan=await prepareCardTypeChange({pageId:page.id,targetType:'player',expectedBase:createPageStateIdentityFromContent(page.content)});
 assert.ok(plan.restorationCandidates.some(entry=>entry.path[1]==='player.progression'));
 assert.equal(parsePageRecordContent(plan.candidateContent).variablesJson.values['player.progression'],undefined);
 const restored=await prepareCardTypeChange({pageId:page.id,targetType:'player',expectedBase:createPageStateIdentityFromContent(page.content),restoreInactive:plan.restorationCandidates.map(entry=>entry.index)});
 assert.equal((await commitCardTypeChange(restored,{confirm:true})).status,'saved');
 assert.deepEqual(parsePageRecordContent(await f.adapter.readText(page.path)).variablesJson.values['player.progression'],original);
});

test('typed assets include nested, array, inactive and canonical icon metadata; body rewrite preserves text', async () => {
 const f=await createPlayerSheetFixture(); const record=parsePageRecordContent(f.page.content);
 delete record.variablesJson.values['dnd.health']['player.health.hitDice'][0]['player.health.hitDice.max'];
 const key='custom.32c33a18-9a3f-50f4-8871-378061eb2ab9';
 const asset={kind:'asset',path:'assets/original.png'};
 const field={key,label:'Assets',datatype:'object',binding:{owner:'variables'},properties:[{key:'custom.image',label:'Image',datatype:'asset'},{key:'custom.rows',label:'Rows',datatype:'array',items:{datatype:'asset'}}]};
 record.variablesJson.extensions.fields.push(field);
 record.variablesJson.values[key]={'custom.image':asset,'custom.rows':[asset]};
 record.variablesJson.inactive=[{status:'incompatible-type',definition:{datatype:'asset'},value:asset}];
 f.page.content=updatePageRecordContent(f.page.content,{variablesJson:record.variablesJson,body:'<h1>assets/original.png</h1><img data-asset="assets/original.png">'}).replace('template: card','template: card\niconJson: '+JSON.stringify(asset));
 const refs=collectAssetReferencesFromPages([f.page],{registry:playerRegistry});
 assert.ok(!refs.some(ref=>ref.incomplete));assert.equal(refs.filter(ref=>ref.path===asset.path).length,5);
 const copied=rewriteTypedPage(f.page,playerRegistry,{assetPaths:new Map([[asset.path,'assets/copied.png']])});
 const after=parsePageRecordContent(copied);assert.equal(after.variablesJson.values[key]['custom.rows'][0].path,'assets/copied.png');
 assert.equal(JSON.parse(after.frontMatter.values.iconjson).path,'assets/copied.png');
 const {rewriteBodyAssetPaths}=await import('../js/storage/assetReferenceScanner.js');
 const body=rewriteBodyAssetPaths(after.rawBody,new Map([[asset.path,'assets/copied.png']]));
 assert.ok(body.includes('<h1>assets/original.png</h1>'));assert.ok(body.includes('data-asset="assets/copied.png"'));
});
