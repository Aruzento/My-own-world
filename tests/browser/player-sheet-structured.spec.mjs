import { expect, test } from '@playwright/test';

async function openPlayer(page, options = {}) {
  await page.goto('/');
  await page.evaluate(async options => {
    const { createPlayerSheetFixture, playerRecoveryBody, playerValues } = await import('/tests/fixtures/playerSheetFixtures.mjs');
    const { createCharacterSheetBlock } = await import('/js/templates/blockTypes.js');
    const { setCurrentPage } = await import('/js/stateActions.js');
    const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { setupAutosave, saveCurrentPage } = await import('/js/editor/autosave.js');
    const { setupCharacterSheetBlocks, renderCharacterSheetBlocks } = await import('/js/editor/characterSheetBlock.js');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const values = playerValues();
    if (options.absent) for (const key of ['player.progression', 'player.abilities', 'player.deathSaves', 'dnd.health']) delete values[key];
    const f = await createPlayerSheetFixture({ ...options, values, body: playerRecoveryBody + createCharacterSheetBlock() });
    if (options.future) f.page.content = f.page.content.replace(/^variablesJson:.*$/m, 'variablesJson: {"formatVersion":2}');
    setCurrentPage(f.page); captureEditorPageBase(f.page, f.page.content);
    const original = document.getElementById('editorArea'); if (original) original.id = 'editorAreaOriginal';
    const editor = document.createElement('div'); editor.id = 'editorArea'; editor.contentEditable = 'true';
    editor.innerHTML = parsePageRecordContent(f.page.content).rawBody; document.body.append(editor);
    setupAutosave(editor); setupCharacterSheetBlocks(editor, () => saveCurrentPage(editor));
    await renderCharacterSheetBlocks(editor);
    window.__playerSheet = { ...f, editor, originalBody: parsePageRecordContent(f.page.content).rawBody };
  }, options);
}

test('production Player Sheet edits nested owners, health and death saves without dual-write, then autosaves and reloads', async ({ page }) => {
  await openPlayer(page);
  const sheet = page.locator('#editorArea .character-sheet-page');
  await expect(sheet).toHaveAttribute('data-character-sheet-source', 'structured');
  await expect(sheet).toHaveAttribute('data-character-sheet-type', 'player');
  await expect(sheet.locator('.character-sheet-kicker')).toContainText('Player');
  await expect(sheet.locator('.character-sheet-pb')).toHaveText('БМ +3');
  for (const [field, value] of [['level', '5'], ['str', '16'], ['dex', '14'], ['con', '12'], ['int', '10'], ['wis', '18'], ['cha', '8'], ['hpCurrent', '8'], ['hpTemp', '2'], ['hpMax', '20']]) {
    const control = sheet.locator(`[data-character-sheet-field="${field}"]`);
    await expect(control).toHaveValue(value); await expect(control).toBeEnabled();
  }
  for (const [key, value] of [['saveStr', '+6'], ['saveDex', '+3'], ['saveCon', '+6'], ['saveInt', '+3'], ['saveWis', '+11'], ['saveCha', '+4'], ['skillAthletics', '+7'], ['skillStealth', '+10'], ['skillPerception', '+4']]) {
    await expect(sheet.locator(`[data-character-sheet-check="${key}"] strong`)).toHaveText(value);
  }
  await expect(sheet.locator('[data-character-sheet-check="skillStealth"] .is-expertise')).toHaveAttribute('aria-label', 'Экспертиза');
  await expect(sheet.locator('[data-character-sheet-check="saveStr"] .is-active')).toHaveCount(1);
  await expect(sheet.locator('[data-character-sheet-check="saveDex"] .is-active')).toHaveCount(0);
  await expect(sheet).toContainText('Player Item');
  await expect(sheet).toContainText('Player own effect');
  await expect(sheet).toContainText('Player item effect');
  await expect(sheet).toContainText('Exact Player Class');
  for (const label of ['Класс защиты', 'Инициатива', 'Скорость']) await expect(sheet.locator('label').filter({ hasText: label }).locator('input')).toBeDisabled();
  await expect(sheet.locator('[data-character-sheet-clear-override]')).toHaveCount(0);

  for (const [field, value] of [['level', '6'], ['str', '18'], ['hpCurrent', '7'], ['hpTemp', '4'], ['hpMax', '30']]) {
    const control = sheet.locator(`[data-character-sheet-field="${field}"]`);
    await control.fill(value); await control.press('Tab');
    await expect.poll(() => page.evaluate(async ([field, value]) => {
      const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
      const f = window.__playerSheet; const values = parsePageRecordContent(await f.adapter.readText(f.page.path)).variablesJson.values;
      const actual = field === 'level' ? values['player.progression']['dnd.level'] : field === 'str' ? values['player.abilities']['player.abilities.strength']['player.abilities.strength.score']
        : values['dnd.health'][{ hpCurrent: 'dnd.hpCurrent', hpTemp: 'dnd.hpTemporary', hpMax: 'dnd.hpMax' }[field]];
      return actual === Number(value);
    }, [field, value])).toBe(true);
    await expect(control).toHaveValue(value);
  }
  const death = sheet.locator('[data-character-sheet-death-field="deathSaveSuccesses"][data-character-sheet-death-index="3"]');
  await death.locator('..').click();
  await expect.poll(() => page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const f = window.__playerSheet; return parsePageRecordContent(await f.adapter.readText(f.page.path)).variablesJson.values['player.deathSaves'];
  })).toEqual({ 'player.deathSaves.successes': 3, 'player.deathSaves.failures': 2 });
  for (const index of [1, 2, 3]) await expect(sheet.locator(`[data-character-sheet-death-field="deathSaveSuccesses"][data-character-sheet-death-index="${index}"]`)).toBeChecked();

  const beforeBodyEdit = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const f = window.__playerSheet; return parsePageRecordContent(await f.adapter.readText(f.page.path)).rawBody === f.originalBody;
  });
  expect(beforeBodyEdit).toBe(true);
  await page.locator('#editorArea [data-persistent-editable]').evaluate(node => {
    node.textContent = 'Body after Player Variables write'; node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'x' }));
  });
  await expect.poll(() => page.evaluate(async () => { const f = window.__playerSheet; return (await f.adapter.readText(f.page.path)).includes('Body after Player Variables write'); })).toBe(true);
  const persisted = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const f = window.__playerSheet; const parsed = parsePageRecordContent(await f.adapter.readText(f.page.path)); return { values: parsed.variablesJson.values, body: parsed.rawBody, extensions: parsed.variablesJson.extensions };
  });
  expect(persisted.values['player.progression']).toMatchObject({ 'dnd.level': 6, 'dnd.proficiencyBonus': 3, 'player.progression.inspiration': true, 'player.progression.experience': { 'player.progression.experience.current': 6500 } });
  expect(persisted.values['player.progression']['player.progression.classLevels'][0]['player.progression.classLevels.level']).toBe(5);
  expect(persisted.values['player.abilities']['player.abilities.strength']).toEqual({ 'player.abilities.strength.score': 18, 'player.abilities.strength.modifier': 99, 'player.abilities.strength.saveProficient': true, 'player.abilities.strength.saveBonus': 0 });
  expect(persisted.values['dnd.health']).toMatchObject({ 'dnd.hpCurrent': 7, 'dnd.hpMax': 30, 'dnd.hpTemporary': 4, 'player.health.criticalThreshold': 20 });
  expect(persisted.values['dnd.health']['player.health.hitDice'][0]['player.health.hitDice.current']).toBe(3);
  expect(persisted.body).toContain('data-property-name="hpCurrent" value="99"');
  expect(persisted.body).toContain('data-property-name="level" value="99"');
  expect(persisted.values['dnd.items']).toEqual([{ pageId: 'player-item' }]);

  await page.evaluate(async () => {
    const { createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { setCurrentPage, setPages } = await import('/js/stateActions.js');
    const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
    const { renderCharacterSheetBlocks } = await import('/js/editor/characterSheetBlock.js');
    const f = window.__playerSheet; const content = await f.adapter.readText(f.page.path);
    f.page = createRuntimePageFromContent({ content, path: f.page.path, name: f.page.name });
    setPages([f.page, f.item, f.classPage]); setCurrentPage(f.page); captureEditorPageBase(f.page, content);
    f.editor.innerHTML = parsePageRecordContent(content).rawBody; await renderCharacterSheetBlocks(f.editor);
  });
  await expect(sheet.locator('[data-character-sheet-field="level"]')).toHaveValue('6');
  await expect(sheet.locator('[data-character-sheet-field="str"]')).toHaveValue('18');
  await expect(sheet.locator('[data-character-sheet-field="hpMax"]')).toHaveValue('30');
  await expect(sheet.locator('[data-character-sheet-check="saveStr"] strong')).toHaveText('+7');
  await expect(sheet.locator('[data-character-sheet-death-field="deathSaveSuccesses"][data-character-sheet-death-index="3"]')).toBeChecked();
});

test('Player unavailable sources never enable legacy writers, and absent typed owners stay read-only', async ({ page }) => {
  for (const options of [{ noCatalog: true }, { future: true }, { legacy: true }]) {
    await openPlayer(page, options);
    await expect(page.locator('#editorArea .character-sheet-empty')).toContainText('недоступен');
    await expect(page.locator('#editorArea [data-character-sheet-field]')).toHaveCount(0);
  }
  await openPlayer(page, { absent: true });
  const sheet = page.locator('#editorArea .character-sheet-page');
  await expect(sheet.locator('[data-character-sheet-field="str"]')).toBeDisabled();
  for (const label of ['Уровень', 'Хиты', 'Временные', 'Максимум']) await expect(sheet.getByRole('spinbutton', { name: new RegExp(`^${label}`) })).toBeDisabled();
  await expect(sheet.locator('[data-character-sheet-death-field]')).toHaveCount(6);
  for (const control of await sheet.locator('[data-character-sheet-death-field]').all()) await expect(control).toBeDisabled();
  expect(await page.evaluate(() => window.__playerSheet.writes.length)).toBe(0);
});
