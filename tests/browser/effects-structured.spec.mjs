import { expect, test } from '@playwright/test';

async function fixture(page, options = {}) {
  await page.goto('/');
  await page.evaluate(async options => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { setPages } = await import('/js/stateActions.js');
    const { BUNDLED_CARD_TYPE_DEFINITIONS: types, BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
    const { createCardTypeRegistryFromCatalog, serializeCardTypeCatalog, CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { createCharacterEffectsBlock, createCharacterSheetBlock } = await import('/js/templates/blockTypes.js');
    const { applyBlockSystemContract, serializePersistentEditorHTML } = await import('/js/editor/blocks/blockContract.js');
    const { createSerializableEffectsData, createEffectsModel } = await import('/js/character/effectsModel.js');
    const { OWN_EFFECTS_KEY, encodeOwnEffects, decodeOwnEffects } = await import('/js/character/ownEffectsDefinition.js');
    const { readCharacterModelFromPage } = await import('/js/character/characterModel.js');
    const { prepareEffectsContext } = await import('/js/character/structuredEffects.js');
    const { openPage } = await import('/js/editor/editor.js');
    const adapter = createMemoryStorageAdapter();
    setStorageAdapter(adapter);
    const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
    const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
    if (!options.noCatalog) await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<h1>Effects Actor</h1><p data-persistent-editable="true">Original body</p>' + createCharacterEffectsBlock() + createCharacterSheetBlock();
    const legacy = options.malformedLegacy ? '{broken' : JSON.stringify({ conditions: ['unconscious'], effects: [{ id: 'old', title: 'Old recovery effect', modifiers: { armorClass: 99 } }], selectedRuleIds: ['old-rule'] });
    wrapper.querySelector('[data-character-effects]').textContent = legacy;
    applyBlockSystemContract(wrapper);
    const actorBody = serializePersistentEditorHTML(wrapper);
    const data = createSerializableEffectsData({ conditions: [], effects: options.empty ? [] : [{ id: 'own', title: 'Own buff', modifiers: { armorClass: 2, speed: 5, initiative: 1 } }], selectedRuleIds: options.empty ? [] : ['r1'] });
    const values = { 'dnd.level': 5, 'dnd.armorClass': { 'dnd.armorClass.value': 14 },
      'dnd.initiative': { 'dnd.initiative.modifier': 2 },
      'dnd.movement': [{ 'dnd.movement.rowId': 'walk', 'dnd.movement.type': 'walk', 'dnd.movement.speed': 30, 'dnd.movement.units': 'feet' }],
      'dnd.health': { 'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 0 },
      'dnd.items': [{ pageId: 'A' }], 'dnd.equippedItems': [],
      ...(!options.absent ? { [OWN_EFFECTS_KEY]: options.partial ? {} : encodeOwnEffects(data) } : {}) };
    const type = options.player ? 'player' : 'character';
    let content = buildPageRecordContent({ id: 'actor', template: 'card', type, body: actorBody, schemaVersion: options.legacy ? 1 : 2,
      ...(!options.legacy ? { variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: registry.getResolvedType(type, 1).digest, values,
        extensions: { revision: 1, fields: options.absent ? [] : [{ id: 'dnd.own-effects', version: 1 }] } } } : {}) });
    if (options.future) content = content.replace(/^variablesJson:.*$/m, 'variablesJson: {"formatVersion":2}');
    const actor = createRuntimePageFromContent({ content, path: '/pages/actor.md', name: 'actor.md' });
    const A = createRuntimePageFromContent({ path: '/pages/A.md', name: 'A.md', content: buildPageRecordContent({ id: 'A', type: 'item', template: 'card',
      body: '<h1>Item A</h1><script type="application/json" data-character-effects>{"effects":[{"id":"item","title":"Item buff","modifiers":{"armorClass":3,"speed":10,"initiative":2}}]}</script>' }) });
    const rule = createRuntimePageFromContent({ path: '/pages/r1.md', name: 'r1.md', content: buildPageRecordContent({ id: 'r1', type: 'lore', template: 'card', tags: ['rule'],
      body: '<h1>Rule R1</h1><script type="application/json" data-character-effects>{"effects":[{"id":"rule","title":"Rule buff","modifiers":{"armorClass":4,"speed":15,"initiative":3}}]}</script>' }) });
    const pages = [actor, A, rule];
    for (const entry of pages) await adapter.writeText(entry.path, entry.content);
    setPages(pages);
    const writes = [];
    const write = adapter.writeText.bind(adapter);
    adapter.writeText = async (path, value) => { writes.push(path); return write(path, value); };
    await openPage(actor);
    window.__fx = { adapter, actor, pages, writes, originalBody: parsePageRecordContent(content).rawBody, legacy,
      async read() {
        const durable = parsePageRecordContent(await adapter.readText(actor.path));
        const context = await prepareEffectsContext({ page: actor });
        const model = readCharacterModelFromPage(actor, { ...context, pages, integrations: { effects: [createEffectsModel({ source: 'external', effects: [{ id: 'external', title: 'External buff', modifiers: { armorClass: 5, speed: 20, initiative: 4 } }] })] } });
        return { body: durable.rawBody, values: durable.variablesJson?.values || null, own: !options.partial && durable.variablesJson?.values[OWN_EFFECTS_KEY] ? decodeOwnEffects(durable.variablesJson.values[OWN_EFFECTS_KEY]) : null,
          model, writes: [...writes], legacy: document.querySelector('[data-character-effects]')?.textContent };
      }, async reopen() { await openPage(actor); } };
  }, options);
}
const block = page => page.locator('.character-effects-block');
async function addCondition(page, key) {
  await block(page).locator('.character-effects-condition-select').selectOption(key);
  await block(page).locator('.character-effects-add-condition').click();
}

test('structured Effects UI edits only own Variables, preserves providers/body/base through autosave and reload', async ({ page }) => {
  await fixture(page);
  await expect(block(page)).toContainText('Own buff');
  await expect(block(page)).not.toContainText('Old recovery effect');
  const initial = await page.evaluate(() => window.__fx.read());
  expect(initial.model.armorClass).toBe(28); // own 2 + Item 3 + selected Rule 4 + integration 5 + base 14
  expect(initial.model.speed).toBe(80);
  expect(initial.model.effects.modifiers.initiative).toBe(10);
  expect(initial.model.calculations.initiative.value).toBe(12);
  await addCondition(page, 'exhaustion');
  await expect.poll(() => page.evaluate(async () => (await window.__fx.read()).own.conditions.map(x => [x.key, x.level]))).toEqual([['exhaustion', 1]]);
  await block(page).locator('.character-effects-effect-title').fill('Manual new');
  await block(page).locator('.character-effects-ac').fill('1');
  await block(page).locator('.character-effects-add-effect').click();
  await expect.poll(() => page.evaluate(async () => (await window.__fx.read()).own.effects.map(x => x.title))).toEqual(['Own buff', 'Manual new']);
  let state = await page.evaluate(() => window.__fx.read());
  expect(state.body).toBe(await page.evaluate(() => window.__fx.originalBody));
  expect(state.legacy).toBe(await page.evaluate(() => window.__fx.legacy));
  expect(state.own.effects.map(x => x.id)).toHaveLength(2);
  expect(state.own.selectedRuleIds).toEqual(['r1']);
  expect(state.model.armorClass).toBe(29);
  await block(page).locator('[data-remove-rule="r1"]').click();
  await expect.poll(() => page.evaluate(async () => (await window.__fx.read()).own.selectedRuleIds)).toEqual([]);
  await page.locator('#editorArea p').first().fill('Body edited after Effects write');
  await page.evaluate(async () => { const { flushPendingAutosave } = await import('/js/editor/autosave.js'); await flushPendingAutosave(); });
  await page.evaluate(() => window.__fx.reopen());
  await expect(block(page)).toContainText('Manual new');
  state = await page.evaluate(() => window.__fx.read());
  expect(state.own.effects.map(x => x.title)).toEqual(['Own buff', 'Manual new']);
  expect(state.legacy).toBe(await page.evaluate(() => window.__fx.legacy));
  expect(state.model.armorClass).toBe(25); // selected Rule removed, Item + integration remain external
});
test('legacy Effects edit/save/reload is catalog independent; structured absent keeps that domain owner', async ({ page }) => {
  for (const options of [{ legacy: true, noCatalog: true }, { absent: true }]) {
    await fixture(page, options);
    await addCondition(page, 'poisoned');
    await expect.poll(() => page.evaluate(async () => (await window.__fx.read()).body.includes('poisoned'))).toBe(true);
    await page.evaluate(() => window.__fx.reopen());
    await expect(block(page)).toContainText('Отравлен');
    expect((await page.evaluate(() => window.__fx.read())).values?.['dnd.ownEffects']).toBeUndefined();
  }
});
test('Player and explicit empty Effects remain Entity-owned; malformed legacy payload is ignored', async ({ page }) => {
  await fixture(page, { player: true, empty: true, malformedLegacy: true });
  await expect(block(page)).toContainText('Эффектов нет');
  await addCondition(page, 'restrained');
  await expect.poll(() => page.evaluate(async () => (await window.__fx.read()).own.conditions.map(x => x.key))).toEqual(['restrained']);
  expect((await page.evaluate(() => window.__fx.read())).legacy).toBe('{broken');
  expect((await page.evaluate(() => window.__fx.read())).model.effects.flags.speedIsZero).toBe(true);
});
test('partial/future/missing catalog render unavailable without legacy editing or writes', async ({ page }) => {
  for (const options of [{ partial: true }, { future: true }, { noCatalog: true }]) {
    await fixture(page, options);
    await expect(block(page)).toContainText('Эффекты недоступны');
    await expect(block(page).locator('.character-effects-add-condition')).toHaveCount(0);
    expect((await page.evaluate(() => window.__fx.read())).writes).toEqual([]);
  }
});
