import { expect, test } from '@playwright/test';

async function fixture(page, options = {}) {
  await page.goto('/');
  await page.evaluate(async options => {
    const { effectsAdoptionFixture, ownPayload } = await import('/tests/fixtures/effectsAdoptionFixtures.mjs');
    const { createCharacterEffectsBlock, createCharacterSheetBlock } = await import('/js/templates/blockTypes.js');
    const { applyBlockSystemContract, serializePersistentEditorHTML } = await import('/js/editor/blocks/blockContract.js');
    const { parsePageRecordContent, updatePageRecordContent, createRuntimePageFromContent, buildPageRecordContent } = await import('/js/core/pageRecord.js');
    const { setPages } = await import('/js/stateActions.js');
    const { openPage } = await import('/js/editor/editor.js');
    const values = { 'dnd.armorClass': { 'dnd.armorClass.value': 14 },
      'dnd.initiative': { 'dnd.initiative.modifier': 2 },
      'dnd.movement': [{ 'dnd.movement.rowId': 'walk', 'dnd.movement.type': 'walk', 'dnd.movement.speed': 30, 'dnd.movement.units': 'feet' }],
      'dnd.health': { 'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 2 }, 'dnd.items': [{ pageId: 'A' }], 'dnd.equippedItems': [] };
    const f = await effectsAdoptionFixture({ actors: [{ id: 'actor', type: options.player ? 'player' : 'character', values,
      ...(options.partial ? { extensions: { revision: 1, fields: [{ id: 'dnd.own-effects', version: 1 }] } } : {}) }], noCatalog: options.noCatalog });
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<h1>Effects Actor</h1><p data-persistent-editable="true">Recovery evidence</p>' + createCharacterEffectsBlock() + createCharacterSheetBlock();
    const raw = options.empty ? '{"conditions":[],"effects":[]}' : options.malformed ? '{broken' : JSON.stringify(ownPayload);
    wrapper.querySelector('[data-character-effects]').textContent = raw;
    if (options.multiple) wrapper.insertAdjacentHTML('beforeend', createCharacterEffectsBlock());
    applyBlockSystemContract(wrapper);
    f.actor.content = updatePageRecordContent(f.actor.content, { body: serializePersistentEditorHTML(wrapper) });
    await f.adapter.writeText(f.actor.path, f.actor.content);
    const providers = [
      ['A', 'item', '<h1>Item A</h1><script type="application/json" data-character-effects>{"effects":[{"id":"item-provider","title":"Item buff","modifiers":{"armorClass":3,"speed":10,"initiative":2}}]}</script>', []],
      ['r1', 'lore', '<h1>Rule R1</h1><script type="application/json" data-character-effects>{"effects":[{"id":"rule-provider","title":"Rule buff","modifiers":{"armorClass":4,"speed":15,"initiative":3}}]}</script>', ['rule']]
    ];
    for (const [id, type, body, tags] of providers) {
      const entry = createRuntimePageFromContent({ content: buildPageRecordContent({ id, type, body, tags, template: 'card' }), path: `pages/${id}.md`, name: `${id}.md` });
      f.pages.push(entry); await f.adapter.writeText(entry.path, entry.content);
    }
    setPages([...f.pages]); f.options = { pageIds: ['actor'] }; f.originalBody = parsePageRecordContent(f.actor.content).rawBody;
    f.raw = raw; f.writes.length = 0; window.__adoptFx = f;
    await openPage(f.actor);
  }, options);
}
async function read(page) {
  return page.evaluate(async () => {
    const f = window.__adoptFx;
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { prepareEffectsContext } = await import('/js/character/structuredEffects.js');
    const { readOwnEffectsSource } = await import('/js/character/ownEffectsSource.js');
    const { readCharacterModelFromPage } = await import('/js/character/characterModel.js');
    const { createEffectsModel } = await import('/js/character/effectsModel.js');
    const context = await prepareEffectsContext({ page: f.actor });
    const record = parsePageRecordContent(await f.adapter.readText(f.actor.path));
    const model = readCharacterModelFromPage(f.actor, { ...context, pages: f.pages,
      integrations: { effects: [createEffectsModel({ source: 'external', effects: [{ id: 'external', title: 'External buff', modifiers: { armorClass: 5, speed: 20, initiative: 4 } }] })] } });
    return { own: readOwnEffectsSource(f.actor, context), model, body: record.rawBody, variables: record.variablesJson, writes: f.writes.map(write => write.path) };
  });
}
async function adopt(page) {
  return page.evaluate(async () => {
    const { previewEffectsAdoption, executeEffectsAdoption } = await import('/js/migration/effectsAdoption.js');
    const f = window.__adoptFx;
    const preview = await previewEffectsAdoption(f.options), writes = f.writes.length;
    const result = await executeEffectsAdoption(preview, { confirm: true }); f.backupId = result.backupId;
    return { result, preview, writes };
  });
}
const block = page => page.locator('#editorArea .character-effects-block').first();
for (const player of [false, true]) test(`explicit ${player ? 'Player' : 'Character'} Effects adoption → normal UI Variables edits/autosave/reload, providers stay separate`, async ({ page }) => {
  await fixture(page, { player });
  await expect(block(page)).toContainText('Own buff');
  const before = await read(page);
  expect(before.own.source).toBe('effects-data');
  expect(before.model.armorClass).toBe(28); expect(before.model.speed).toBe(80);
  expect(before.model.calculations.initiative.value).toBe(12);
  const adopted = await adopt(page);
  expect(adopted.writes).toBe(0); expect(adopted.result.status, JSON.stringify(adopted.result)).toBe('completed');
  let state = await read(page);
  expect(state.own.source).toBe('entity');
  for (const key of ['armorClass', 'speed', 'effects']) expect(state.model[key]).toEqual(before.model[key]);
  expect(state.own.conditions).toEqual(before.own.conditions); expect(state.own.effects).toEqual(before.own.effects);
  expect(state.own.selectedRuleIds).toEqual(['r1']); expect(state.own.effects.map(effect => effect.id)).toEqual(['own']);
  expect(state.variables.extensions.fields).toEqual([{ id: 'dnd.own-effects', version: 1 }]);
  expect(state.body).toBe(await page.evaluate(() => window.__adoptFx.originalBody));
  expect(state.writes.filter(path => path.startsWith('pages/'))).toEqual(['pages/actor.md']);
  await block(page).locator('.character-effects-condition-select').selectOption('blinded');
  await block(page).locator('.character-effects-add-condition').click();
  await expect.poll(async () => (await read(page)).own.conditions.map(condition => condition.key)).toEqual(['poisoned', 'exhaustion', 'blinded']);
  await block(page).locator('.character-effects-effect-title').fill('After adoption');
  await block(page).locator('.character-effects-ac').fill('1');
  await block(page).locator('.character-effects-add-effect').click();
  await expect.poll(async () => (await read(page)).own.effects.map(effect => effect.title)).toEqual(['Own buff', 'After adoption']);
  await block(page).locator('[data-remove-rule="r1"]').click();
  await expect.poll(async () => (await read(page)).own.selectedRuleIds).toEqual([]);
  state = await read(page); expect(state.body).toBe(await page.evaluate(() => window.__adoptFx.originalBody));
  await page.locator('#editorArea p[data-persistent-editable]').first().evaluate(node => {
    node.textContent = 'Body after Effects adoption'; node.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'x', inputType: 'insertText' }));
  });
  await page.evaluate(async () => { const { flushPendingAutosave } = await import('/js/editor/autosave.js'); await flushPendingAutosave(); });
  expect((await read(page)).body).toContain('Body after Effects adoption');
  await reload(page);
  state = await read(page); expect(state.own.source).toBe('entity'); expect(state.own.effects.map(effect => effect.title)).toEqual(['Own buff', 'After adoption']);
  expect(await page.locator('[data-character-effects]').textContent()).toBe(await page.evaluate(() => window.__adoptFx.raw));
  await expect(block(page)).toContainText('After adoption');
  expect(state.model.armorClass).toBe(25); // own 3 + Item 3 + integration 5, no selected Rule
});

test('empty is explicit; malformed/ambiguous/missing-catalog/partial sources do not adopt; recovery returns legacy without auto-adoption', async ({ page }) => {
  for (const options of [{ empty: true }, { malformed: true }, { multiple: true }, { noCatalog: true }, { partial: true }]) {
    await fixture(page, options);
    const result = await adopt(page);
    expect(result.writes).toBe(0);
    if (options.empty) {
      expect(result.result.status).toBe('completed'); expect((await read(page)).own.source).toBe('entity');
      const repeated = await adopt(page); expect(repeated.result.status).toBe('skipped');
      expect(repeated.result.backupId).toBeUndefined();
    } else { expect(result.result.status).toBe('skipped'); expect(result.preview.summary.blockedActors).toBe(1); }
  }
  await fixture(page);
  const result = await adopt(page);
  await page.evaluate(async backupId => { const { recoverEffectsAdoption } = await import('/js/migration/effectsAdoption.js'); await recoverEffectsAdoption(backupId, { confirm: true }); }, result.result.backupId);
  await reload(page);
  expect((await read(page)).own.source).toBe('effects-data');
  expect((await read(page)).variables.values['dnd.ownEffects']).toBeUndefined();
  await expect(block(page)).toContainText('Own buff');
});

test('real inert extraction preserves historical attribute evidence and rejects orphan/conflicting/duplicate JSON without executing HTML', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { extractLegacyEffects } = await import('/js/migration/legacyEffectsExtraction.js');
    const { record } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const payload = '{"conditions":[],"effects":[]}';
    const bodies = [
      `<div class="character-effects-block"><span data-character-effects='${payload}'></span></div>`,
      `<div class="character-effects-block"><script data-character-effects='${payload}'>{"conditions":["poisoned"],"effects":[]}</script></div>`,
      `<script data-character-effects>${payload}</script>`,
      '<div class="character-effects-block"><script data-character-effects>{"conditions":[],"effects":[],"effects":[]}</script></div>',
      `<div class="character-effects-block"><script data-character-effects>${payload}</script><img src=x onerror="window.__executed=true"><script>window.__executed=true</script></div>`
    ];
    const before = document.body.innerHTML;
    return { entries: bodies.map(body => extractLegacyEffects(record('actor', 'character', {}, body))), inert: before === document.body.innerHTML && !window.__executed };
  });
  expect(result.inert).toBe(true); expect(result.entries[0].data[0].payloadSource).toBe('attribute');
  expect(result.entries[0].explicitEmpty).toBe(true);
  for (const entry of result.entries.slice(1, 4)) expect(entry.issues.length).toBeGreaterThan(0);
  expect(result.entries[4].issues).toEqual([]);
});

test('active editor pending/stale base blocks adoption; failed presentation after persistence does not rollback or retry', async ({ page }) => {
  for (const mode of ['pending', 'stale', 'presentation']) {
    await fixture(page);
    const result = await page.evaluate(async mode => {
      const { previewEffectsAdoption, executeEffectsAdoption } = await import('/js/migration/effectsAdoption.js');
      const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
      const f = window.__adoptFx, preview = await previewEffectsAdoption(f.options);
      const editor = document.getElementById('editorArea');
      if (mode === 'pending') {
        const paragraph = editor.querySelector('p[data-persistent-editable]');
        paragraph.textContent = 'Pending body edit'; paragraph.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'x', inputType: 'insertText' }));
      }
      if (mode === 'stale') captureEditorPageBase(f.actor, f.actor.content + 'old base');
      const originalQuery = editor.querySelector;
      if (mode === 'presentation') {
        const write = f.adapter.writeText.bind(f.adapter);
        f.adapter.writeText = async (path, content) => {
          const result = await write(path, content);
          if (path === f.actor.path) editor.querySelector = () => { throw new Error('presentation unavailable'); };
          return result;
        };
      }
      const result = await executeEffectsAdoption(preview, { confirm: true });
      editor.querySelector = originalQuery;
      return { result, writes: f.writes.filter(write => write.path.startsWith('pages/')).length };
    }, mode);
    expect(result.result.status).toBe('failed');
    if (mode === 'presentation') {
      expect(result.writes).toBe(1); expect(result.result.completedActors).toEqual(['actor']);
      expect(result.result.presentationFailures).toHaveLength(1); expect((await read(page)).own.source).toBe('entity');
    } else { expect(result.writes).toBe(0); expect(result.result.stage).toBe('preflight'); }
  }
});

async function reload(page) {
  const saved = await page.evaluate(async () => {
    const f = window.__adoptFx, files = [];
    async function directory(path) {
      for (const entry of await f.adapter.listFiles(path)) {
        const target = path ? `${path}/${entry.name}` : entry.name;
        if (entry.kind === 'directory') await directory(target); else files.push([target, await f.adapter.readText(target)]);
      }
    }
    await directory(''); return { files, raw: f.raw, originalBody: f.originalBody };
  });
  await page.reload();
  await page.evaluate(async saved => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
    const { setPages } = await import('/js/stateActions.js');
    const { openPage } = await import('/js/editor/editor.js');
    const adapter = createMemoryStorageAdapter(); setStorageAdapter(adapter);
    for (const [path, content] of saved.files) await adapter.writeText(path, content);
    const pages = saved.files.filter(([path]) => path.startsWith('pages/')).map(([path, content]) => createRuntimePageFromContent({ content, path, name: path.split('/').at(-1) }));
    const actor = pages.find(page => page.id === 'actor');
    window.__adoptFx = { adapter, actor, pages, writes: [], options: { pageIds: ['actor'] }, ...saved };
    setPages(pages); await openPage(actor);
  }, saved);
}
