import { expect, test } from '@playwright/test';


test('Campaign Map HP UI persists structured Character health without Properties dual-write', async ({ page }) => {
  await page.goto('/');

  const first = await page.evaluate(async () => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { BUNDLED_CARD_TYPE_DEFINITIONS: types, BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
    const { CARD_TYPE_CATALOG_PATH, createCardTypeRegistryFromCatalog, serializeCardTypeCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { setCurrentPage, setPages } = await import('/js/stateActions.js');
    const { refreshCampaignMapStore } = await import('/js/editor/campaignMapStore.js');
    const { applyTokenHealthState, restoreMapTokens } = await import('/js/editor/campaignMapRuntime.js');
    const { openTokenPopup, closeTokenPopup } = await import('/js/editor/campaignMapTokenPopupController.js');

    const adapter = createMemoryStorageAdapter();
    setStorageAdapter(adapter);
    const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
    const registry = createCardTypeRegistryFromCatalog(catalog);
    await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
    const definition = registry.getResolvedType('character', 1);
    const body = `
      <section class="card-properties-block" data-block-type="properties" data-card-type="character">
        <input data-property-name="hpCurrent" value="99">
        <input data-property-name="hpMax" value="99">
        <input data-property-name="hpTemp" value="0">
      </section>
      <script type="application/json" data-character-effects>
        {"effects":[{"id":"map-stage-84-effect","title":"Map effect","modifiers":{"armorClass":1,"initiative":1,"speed":5}}]}
      </script>
      <p>Structured Map body marker</p>
    `;
    const characterContent = buildPageRecordContent({
      id: 'map-structured-character', schemaVersion: 2,
      type: 'character', template: 'card', tags: ['card', 'character'],
      body,
      variablesJson: {
        formatVersion: 1, schemaVersion: 1, schemaDigest: definition.digest,
        values: {
          'dnd.level': 5,
          'dnd.health': {
            'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 0,
            'character.health.formula': '5d8 + 10'
          },
          'dnd.armorClass': { 'dnd.armorClass.value': 14 },
          'dnd.initiative': {
            'dnd.initiative.modifier': 2,
            'dnd.initiative.bonus': 0,
            'dnd.initiative.mode': 'normal'
          },
          'dnd.movement': [{
            'dnd.movement.rowId': 'walk-map',
            'dnd.movement.type': 'walk',
            'dnd.movement.speed': 30,
            'dnd.movement.units': 'feet'
          }]
        },
        overrides: {}, inactive: []
      },
      now: '2026-09-28T00:00:00Z'
    });
    const character = createRuntimePageFromContent({
      content: characterContent,
      path: '/pages/map-structured-character.md',
      name: 'map-structured-character.md'
    });
    const mapBody = `
      <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
        <div class="campaign-map-topbar"><h1 class="campaign-map-title">Stage 8.4 Map</h1></div>
        <div class="campaign-map-stage"><div class="campaign-map-viewport">
          <div class="campaign-map-object-layer">
            <div class="campaign-map-token" data-token-id="structured-map-token"
              data-page-id="map-structured-character" data-token-type="creature"
              data-name="Structured Hero" data-x="20" data-y="20" data-size="1"></div>
            <div class="campaign-map-token" data-token-id="structured-map-token-copy"
              data-page-id="map-structured-character" data-token-type="creature"
              data-name="Structured Hero Copy" data-x="30" data-y="30" data-size="1"></div>
          </div>
        </div></div>
      </div>
    `;
    const mapContent = buildPageRecordContent({
      id: 'stage-84-map', type: 'campaignMap', template: 'campaignMap',
      tags: ['campaign-map'], body: mapBody,
      now: '2026-09-28T00:00:00Z'
    });
    const mapPage = createRuntimePageFromContent({
      content: mapContent, path: '/pages/stage-84-map.md', name: 'stage-84-map.md'
    });
    await adapter.writeText(character.path, character.content);
    await adapter.writeText(mapPage.path, mapPage.content);
    setPages([character, mapPage]);
    setCurrentPage(mapPage);
    const editor = document.getElementById('editorArea');
    editor.innerHTML = mapBody;
    const map = editor.querySelector('.campaign-map-document');
    const token = map.querySelector('.campaign-map-token');
    refreshCampaignMapStore(map);
    await restoreMapTokens(map);

    let mapSaves = 0;
    let characterWrites = 0;
    const writeText = adapter.writeText.bind(adapter);
    adapter.writeText = async (path, content) => {
      if (path === character.path) characterWrites += 1;
      return writeText(path, content);
    };
    adapter.getCharacterWrites = () => characterWrites;
    const actionDeps = {
      applyTokenHealthState,
      closeTokenPopup,
      async saveAndSync() {
        mapSaves += 1;
        refreshCampaignMapStore(map);
        window.__stage84MapSaves = mapSaves;
      }
    };
    const popupDeps = {
      hasActiveShapeInteraction: () => false,
      hasActiveTokenInteraction: () => false,
      getTokenActionDeps: () => actionDeps
    };
    window.__stage84 = {
      adapter, character, mapPage, map, token, actionDeps, popupDeps
    };
    window.__stage84MapSaves = 0;
    openTokenPopup(token, popupDeps);

    return {
      initialHp: token.dataset.hp,
      initialMax: token.dataset.hpMax,
      initialArmor: token.dataset.armorClass,
      initialInitiative: token.dataset.initiativeModifier,
      initialSpeed: token.dataset.speed,
      initialEffectCount: token.dataset.effectCount,
      body: parsePageRecordContent(character.content).rawBody,
      characterWrites,
      mapSaves
    };
  });

  expect(first.initialHp).toBe('8');
  expect(first.initialMax).toBe('20');
  expect(first.initialArmor).toBe('15');
  expect(first.initialInitiative).toBe('3');
  expect(first.initialSpeed).toBe('35');
  expect(first.initialEffectCount).toBe('1');

  await page.locator('.campaign-token-popup-more').click();
  await page.locator('button[data-action="hp"]').click();
  await page.locator('.campaign-token-hp-sign').selectOption('-');
  await page.locator('.campaign-token-hp-value').fill('3');
  await page.locator('.campaign-token-hp-ok').click();
  await page.waitForFunction(() => window.__stage84MapSaves === 1);

  const changed = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { saveCampaignMapAndSync } = await import('/js/editor/campaignMapSaveController.js');
    const fixture = window.__stage84;
    const durable = await fixture.adapter.readText(fixture.character.path);
    const parsed = parsePageRecordContent(durable);
    const writesBeforeOrdinarySave = fixture.adapter.getCharacterWrites();
    await saveCampaignMapAndSync({
      async saveCurrentPage() {
        await fixture.adapter.writeText(
          fixture.mapPage.path,
          fixture.mapPage.content
        );
        return { written: true };
      }
    });
    const writesAfterOrdinarySave = fixture.adapter.getCharacterWrites();
    return {
      durable,
      hp: fixture.token.dataset.hp,
      linkedHp: fixture.map.querySelector('[data-token-id="structured-map-token-copy"]')?.dataset.hp,
      hpMax: fixture.token.dataset.hpMax,
      health: parsed.variablesJson.values['dnd.health'],
      body: parsed.rawBody,
      writesBeforeOrdinarySave,
      writesAfterOrdinarySave
    };
  });

  expect(changed.hp).toBe('5');
  expect(changed.linkedHp).toBe('5');
  expect(changed.hpMax).toBe('20');
  expect(changed.health['dnd.hpCurrent']).toBe(5);
  expect(changed.health['character.health.formula']).toBe('5d8 + 10');
  expect(changed.body).toBe(first.body);
  expect(changed.body).toContain('value="99"');
  expect(changed.writesAfterOrdinarySave).toBe(changed.writesBeforeOrdinarySave);

  await page.reload();

  const reopened = await page.evaluate(async durable => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { BUNDLED_CARD_TYPE_DEFINITIONS: types, BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
    const { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { buildPageRecordContent, createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { setCurrentPage, setPages } = await import('/js/stateActions.js');
    const { refreshCampaignMapStore } = await import('/js/editor/campaignMapStore.js');
    const { applyTokenHealthState, restoreMapTokens } = await import('/js/editor/campaignMapRuntime.js');
    const { openTokenPopup, closeTokenPopup } = await import('/js/editor/campaignMapTokenPopupController.js');

    const adapter = createMemoryStorageAdapter();
    setStorageAdapter(adapter);
    await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog({
      formatVersion: 1, revision: 1, types, fieldSets
    }));
    const character = createRuntimePageFromContent({
      content: durable,
      path: '/pages/map-structured-character.md',
      name: 'map-structured-character.md'
    });
    const mapBody = `
      <div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
        <div class="campaign-map-topbar"><h1 class="campaign-map-title">Stage 8.4 Map</h1></div>
        <div class="campaign-map-stage"><div class="campaign-map-viewport">
          <div class="campaign-map-object-layer"><div class="campaign-map-token"
            data-token-id="structured-map-token-reload" data-page-id="map-structured-character"
            data-token-type="creature" data-name="Structured Hero" data-x="20" data-y="20" data-size="1"></div></div>
        </div></div>
      </div>
    `;
    const mapPage = createRuntimePageFromContent({
      content: buildPageRecordContent({
        id: 'stage-84-map-reload', type: 'campaignMap', template: 'campaignMap',
        tags: ['campaign-map'], body: mapBody
      }),
      path: '/pages/stage-84-map-reload.md', name: 'stage-84-map-reload.md'
    });
    await adapter.writeText(character.path, character.content);
    await adapter.writeText(mapPage.path, mapPage.content);
    setPages([character, mapPage]);
    setCurrentPage(mapPage);
    const editor = document.getElementById('editorArea');
    editor.innerHTML = mapBody;
    const map = editor.querySelector('.campaign-map-document');
    const token = map.querySelector('.campaign-map-token');
    refreshCampaignMapStore(map);
    await restoreMapTokens(map);
    let saves = 0;
    const actionDeps = {
      applyTokenHealthState,
      closeTokenPopup,
      async saveAndSync() {
        saves += 1;
        refreshCampaignMapStore(map);
        window.__stage84ReloadSaves = saves;
      }
    };
    const popupDeps = {
      hasActiveShapeInteraction: () => false,
      hasActiveTokenInteraction: () => false,
      getTokenActionDeps: () => actionDeps
    };
    window.__stage84Reload = { adapter, character, token, popupDeps };
    window.__stage84ReloadSaves = 0;
    openTokenPopup(token, popupDeps);
    return { hp: token.dataset.hp, hpMax: token.dataset.hpMax };
  }, changed.durable);

  expect(reopened).toEqual({ hp: '5', hpMax: '20' });

  await page.locator('.campaign-token-popup-more').click();
  await page.locator('button[data-action="hp"]').click();
  await page.locator('.campaign-token-hp-restore').click();
  await page.waitForFunction(() => window.__stage84ReloadSaves === 1);
  expect(await page.evaluate(() => window.__stage84Reload.token.dataset.hp)).toBe('20');

  await page.evaluate(async () => {
    const fixture = window.__stage84Reload;
    const { token, popupDeps } = fixture;
    const {
      clearTokenPopupTimer,
      openTokenPopup,
      scheduleTokenPopup
    } = await import('/js/editor/campaignMapTokenPopupController.js');
    scheduleTokenPopup(token, popupDeps);
    clearTokenPopupTimer();
    openTokenPopup(token, popupDeps);
  });
  await expect(page.locator('.campaign-token-popup-more')).toBeVisible();
  await page.locator('.campaign-token-popup-more').dispatchEvent('click');
  await expect(page.locator('button[data-action="hp"]')).toBeVisible();
  await page.locator('button[data-action="hp"]').dispatchEvent('click');
  await expect(page.locator('.campaign-token-hp-kill')).toBeVisible();
  await page.locator('.campaign-token-hp-kill').dispatchEvent('click');
  await page.waitForFunction(() => window.__stage84ReloadSaves === 2);
  expect(await page.evaluate(() => window.__stage84Reload.token.dataset.hp)).toBe('0');

  const failureBoundary = await page.evaluate(async () => {
    const { changeTokenHp } = await import('/js/editor/campaignMapTokenActions.js');
    const { applyTokenHealthState } = await import('/js/editor/campaignMapRuntime.js');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const fixture = window.__stage84Reload;
    const result = await changeTokenHp(
      fixture.token,
      fixture.character,
      { delta: 5 },
      {
        applyTokenHealthState,
        closeTokenPopup() {},
        async saveAndSync() {
          throw new Error('forced map save failure');
        }
      }
    );
    const durable = parsePageRecordContent(
      await fixture.adapter.readText(fixture.character.path)
    );
    const bodyAfterPersistedFailure = durable.rawBody;
    await fixture.adapter.removeFile(CARD_TYPE_CATALOG_PATH);
    const blocked = await changeTokenHp(
      fixture.token,
      fixture.character,
      { delta: -1 },
      {
        applyTokenHealthState,
        closeTokenPopup() {},
        async saveAndSync() {}
      }
    );
    const afterBlocked = parsePageRecordContent(
      await fixture.adapter.readText(fixture.character.path)
    );
    return {
      result,
      blocked,
      tokenHp: fixture.token.dataset.hp,
      durableCurrent: durable.variablesJson.values['dnd.health']['dnd.hpCurrent'],
      afterBlockedCurrent: afterBlocked.variablesJson.values['dnd.health']['dnd.hpCurrent'],
      bodyAfterPersistedFailure,
      bodyAfterBlocked: afterBlocked.rawBody
    };
  });

  expect(failureBoundary.result.status).toBe('presentation-unconfirmed');
  expect(failureBoundary.result.healthPersisted).toBe(true);
  expect(failureBoundary.result.mapSaved).toBe(false);
  expect(failureBoundary.durableCurrent).toBe(5);
  expect(failureBoundary.tokenHp).toBe('5');
  expect(failureBoundary.blocked.status).toBe('blocked');
  expect(failureBoundary.afterBlockedCurrent).toBe(5);
  expect(failureBoundary.bodyAfterBlocked).toBe(failureBoundary.bodyAfterPersistedFailure);
});
