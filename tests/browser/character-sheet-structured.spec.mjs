import { expect, test } from '@playwright/test';


test('structured Character Sheet edits approved fields without Properties dual-write and survives autosave/reload', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(async () => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { BUNDLED_CARD_TYPE_DEFINITIONS: types, BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
    const { CARD_TYPE_CATALOG_PATH, createCardTypeRegistryFromCatalog, serializeCardTypeCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { setCurrentPage, setPages } = await import('/js/stateActions.js');
    const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { setupAutosave, saveCurrentPage } = await import('/js/editor/autosave.js');
    const { renderCharacterSheetBlocks, setupCharacterSheetBlocks } = await import('/js/editor/characterSheetBlock.js');
    const { createCharacterSheetBlock } = await import('/js/templates/blockTypes.js');

    const adapter = createMemoryStorageAdapter();
    setStorageAdapter(adapter);
    const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
    const registry = createCardTypeRegistryFromCatalog(catalog);
    await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
    const definition = registry.getResolvedType('character', 1);
    const properties = `
      <section class="card-properties-block" data-block-type="properties" data-card-type="character">
        <input data-property-name="level" value="99">
        <input data-property-name="str" value="3">
        <input data-property-name="hpCurrent" value="99">
        <input data-property-name="hpMax" value="99">
        <input data-property-name="hpTemp" value="0">
        <input data-property-name="armorClass" value="77">
        <input data-property-name="override-speed" value="88">
      </section>
    `;
    const body = `
      <h1>Structured Sheet</h1>
      <p data-persistent-editable="true">Original body</p>
      ${properties}
      ${createCharacterSheetBlock()}
    `;
    const content = buildPageRecordContent({
      id: 'structured-sheet-browser', schemaVersion: 2, type: 'character', template: 'card', body,
      variablesJson: {
        formatVersion: 1, schemaVersion: 1, schemaDigest: definition.digest,
        values: {
          'dnd.level': 5,
          'character.category': 'npc',
          'character.abilities': {
            'character.abilities.strength': 16,
            'character.abilities.dexterity': 14,
            'character.abilities.constitution': 12,
            'character.abilities.intelligence': 10,
            'character.abilities.wisdom': 10,
            'character.abilities.charisma': 10
          },
          'dnd.health': {
            'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 2,
            'character.health.formula': '5d8 + 10', 'character.health.hitDice': '5d8'
          },
          'dnd.armorClass': { 'dnd.armorClass.value': 14 },
          'dnd.initiative': { 'dnd.initiative.modifier': 2, 'dnd.initiative.bonus': 0, 'dnd.initiative.mode': 'normal' },
          'dnd.movement': [{
            'dnd.movement.rowId': 'walk-sheet', 'dnd.movement.type': 'walk',
            'dnd.movement.speed': 30, 'dnd.movement.units': 'feet'
          }]
        }, overrides: {}
      },
      now: '2026-09-29T00:00:00Z'
    });
    const record = createRuntimePageFromContent({
      content, path: '/pages/structured-sheet-browser.md', name: 'structured-sheet-browser.md'
    });
    await adapter.writeText(record.path, content);
    setPages([record]);
    setCurrentPage(record);
    captureEditorPageBase(record, content);

    const original = document.getElementById('editorArea');
    if (original) original.id = 'editorAreaAppOriginal';
    const editor = document.createElement('div');
    editor.id = 'editorArea';
    editor.contentEditable = 'true';
    editor.innerHTML = parsePageRecordContent(content).rawBody;
    document.body.append(editor);
    setupAutosave(editor);
    setupCharacterSheetBlocks(editor, () => saveCurrentPage(editor));
    await renderCharacterSheetBlocks(editor);
    window.__stage85 = { adapter, record, editor, catalog };
  });

  const sheet = page.locator('#editorArea .character-sheet-page');
  await expect(sheet).toHaveAttribute('data-character-sheet-source', 'structured');
  await expect(sheet.locator('[data-character-sheet-field="level"]')).toHaveValue('5');
  await expect(sheet.locator('[data-character-sheet-field="str"]')).toHaveValue('16');
  await expect(sheet.locator('[data-character-sheet-field="hpCurrent"]')).toHaveValue('8');
  await expect(sheet.locator('[data-character-sheet-field="hpTemp"]')).toHaveValue('2');

  const readonlyLabels = ['Максимум', 'Класс защиты', 'Инициатива', 'Скорость'];
  for (const label of readonlyLabels) {
    await expect(sheet.locator('label').filter({ hasText: label }).locator('input')).toBeDisabled();
  }
  await expect(sheet.locator('[data-character-sheet-death-field]')).toHaveCount(0);
  await expect(sheet.locator('[data-character-sheet-clear-override]')).toHaveCount(0);

  for (const [selector, value] of [
    ['[data-character-sheet-field="level"]', '6'],
    ['[data-character-sheet-field="str"]', '18'],
    ['[data-character-sheet-field="hpCurrent"]', '7'],
    ['[data-character-sheet-field="hpTemp"]', '4']
  ]) {
    const input = sheet.locator(selector);
    await input.fill(value);
    await input.press('Tab');
    await expect(input).toHaveValue(value);
  }

  await expect.poll(() => page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const durable = await window.__stage85.adapter.readText(window.__stage85.record.path);
    const values = parsePageRecordContent(durable).variablesJson.values;
    return {
      level: values['dnd.level'],
      strength: values['character.abilities']['character.abilities.strength'],
      current: values['dnd.health']['dnd.hpCurrent'],
      temp: values['dnd.health']['dnd.hpTemporary']
    };
  })).toEqual({ level: 6, strength: 18, current: 7, temp: 4 });

  const body = page.locator('#editorArea [data-persistent-editable="true"]');
  await body.evaluate(node => {
    node.textContent = 'Body edited after structured Sheet write';
    node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }));
  });
  await expect.poll(() => page.evaluate(async () => {
    const durable = await window.__stage85.adapter.readText(window.__stage85.record.path);
    return durable.includes('Body edited after structured Sheet write');
  })).toBe(true);

  const persisted = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { prepareCampaignMapCharacterContext, getCampaignMapCharacterState } = await import('/js/editor/campaignMapCharacterBridge.js');
    const { createCombatCharacterContext, readCombatCharacter } = await import('/js/combat/combatCharacterHealth.js');
    const { captureStorageWorkspaceContext } = await import('/js/storage/storageAdapter.js');
    const fixture = window.__stage85;
    const durable = await fixture.adapter.readText(fixture.record.path);
    const parsed = parsePageRecordContent(durable);
    const map = document.createElement('div');
    map.innerHTML = `<div class="campaign-map-token" data-page-id="${fixture.record.id}"></div>`;
    const mapContext = await prepareCampaignMapCharacterContext(map, {
      pages: [fixture.record], workspaceContext: captureStorageWorkspaceContext()
    });
    const mapState = getCampaignMapCharacterState(fixture.record, {
      map, pages: [fixture.record]
    });
    const combatContext = await createCombatCharacterContext({
      pages: [fixture.record], pageIds: [fixture.record.id],
      workspaceContext: captureStorageWorkspaceContext()
    });
    const combat = readCombatCharacter(fixture.record, {
      pages: [fixture.record], context: combatContext
    });
    return {
      durable,
      values: parsed.variablesJson.values,
      properties: Object.fromEntries(
        [...document.createRange().createContextualFragment(parsed.rawBody).querySelectorAll('[data-property-name]')]
          .map(control => [control.dataset.propertyName, control.getAttribute('value')])
      ),
      mapHealth: mapState.health,
      combatHealth: combat.character.health
    };
  });

  expect(persisted.values['dnd.level']).toBe(6);
  expect(persisted.values['character.abilities']['character.abilities.strength']).toBe(18);
  expect(persisted.values['dnd.health']['dnd.hpCurrent']).toBe(7);
  expect(persisted.values['dnd.health']['dnd.hpTemporary']).toBe(4);
  expect(persisted.properties.level).toBe('99');
  expect(persisted.properties.str).toBe('3');
  expect(persisted.properties.hpCurrent).toBe('99');
  expect(persisted.properties['override-speed']).toBe('88');
  expect(persisted.mapHealth.current).toBe(7);
  expect(persisted.combatHealth.current).toBe(7);

  await page.evaluate(async durable => {
    const { createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { setCurrentPage, setPages } = await import('/js/stateActions.js');
    const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { renderCharacterSheetBlocks } = await import('/js/editor/characterSheetBlock.js');
    const record = createRuntimePageFromContent({
      content: durable,
      path: '/pages/structured-sheet-browser.md',
      name: 'structured-sheet-browser.md'
    });
    await window.__stage85.adapter.writeText(record.path, durable);
    setPages([record]);
    setCurrentPage(record);
    captureEditorPageBase(record, durable);
    window.__stage85.record = record;
    window.__stage85.editor.innerHTML = parsePageRecordContent(durable).rawBody;
    await renderCharacterSheetBlocks(window.__stage85.editor);
  }, persisted.durable);

  await expect(sheet.locator('[data-character-sheet-field="level"]')).toHaveValue('6');
  await expect(sheet.locator('[data-character-sheet-field="str"]')).toHaveValue('18');
  await expect(sheet.locator('[data-character-sheet-field="hpCurrent"]')).toHaveValue('7');
  await expect(sheet.locator('[data-character-sheet-field="hpTemp"]')).toHaveValue('4');
});


test('structured Character Sheet unavailable state never exposes legacy controls when catalog is missing', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
    const { CardTypeRegistry } = await import('/js/cardTypes/cardTypeRegistry.js');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { buildPageRecordContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { setCurrentPage, setPages } = await import('/js/stateActions.js');
    const { renderCharacterSheetBlocks } = await import('/js/editor/characterSheetBlock.js');
    const { createCharacterSheetBlock } = await import('/js/templates/blockTypes.js');
    const adapter = createMemoryStorageAdapter();
    setStorageAdapter(adapter);
    const registry = new CardTypeRegistry();
    const definition = registry.getResolvedType('character', 1);
    const content = buildPageRecordContent({
      id: 'sheet-no-catalog', schemaVersion: 2, type: 'character', template: 'card',
      body: `<section data-block-type="properties" data-card-type="character"><input data-property-name="level" value="99"></section>${createCharacterSheetBlock()}`,
      variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: definition.digest,
        values: { 'dnd.level': 5 }, overrides: {} }
    });
    const record = { id: 'sheet-no-catalog', type: 'character', template: 'card', path: '/pages/sheet-no-catalog.md', content };
    await adapter.writeText(record.path, content);
    setPages([record]);
    setCurrentPage(record);
    const editor = document.createElement('div');
    editor.id = 'editorArea';
    editor.innerHTML = parsePageRecordContent(content).rawBody;
    document.body.append(editor);
    await renderCharacterSheetBlocks(editor);
    return {
      text: editor.querySelector('.character-sheet-runtime')?.textContent || '',
      editable: editor.querySelectorAll('[data-character-sheet-field]').length,
      propertiesLevel: editor.querySelector('[data-property-name="level"]')?.getAttribute('value')
    };
  });
  expect(result.text).toContain('Structured Character Sheet недоступен');
  expect(result.editable).toBe(0);
  expect(result.propertiesLevel).toBe('99');
});
