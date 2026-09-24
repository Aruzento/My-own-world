import { expect, test } from '@playwright/test';


async function setup(page, options = {}) {
  await page.goto('/');
  await page.evaluate(async options => {
    const { createCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { getMapControlsHTML } = await import('/js/editor/campaignMapToolbar.js');
    const { handleCampaignMapToolbarClick } = await import('/js/editor/campaignMapToolbarController.js');
    const { getCampaignMapStore } = await import('/js/editor/campaignMapStore.js');
    const { applyTokenHealthState } = await import('/js/editor/campaignMapRuntime.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { readTransactionRecords, EVENT_TRANSACTION_LOG_PATH } = await import('/js/events/eventStore.js');
    const { readCharacterModelFromPage, getCharacterHealth } = await import('/js/character/characterModel.js');
    const { state } = await import('/js/state.js');
    const w = await createCombatActionWorld({ current: options.current ?? 10, temp: options.temp ?? 0,
      dice: options.dice || [10, 3], status: options.status ?? 'active', actorName: 'Goblin', targetName: 'Knight' });
    state.currentPage = w.map;
    const editor = document.querySelector('#editorArea');
    editor.innerHTML = parsePageRecordContent(w.map.content).body;
    const map = editor.querySelector('.campaign-map-document');
    map.querySelector('.campaign-map-topbar').insertAdjacentHTML('beforeend', `<div class="campaign-map-controls">${getMapControlsHTML()}</div>`);
    const store = getCampaignMapStore(map);
    store.clearDirty();
    let sequence = 0;
    let executionCount = 0;
    let releaseExecution;
    const gate = options.gate ? new Promise(resolve => { releaseExecution = resolve; }) : null;
    const run = async (request, executionOptions) => {
      executionCount++;
      if (options.staleActor) {
        store.getModel().initiative.activeParticipantId = 'token:target';
      }
      if (gate) await gate;
      return executeCombatAttack(request, executionOptions);
    };
    if (options.appendFailure) {
      w.adapter.appendText = async () => {
        w.effects.appends++;
        throw new Error('fixture append failure');
      };
    }
    window.attackWorkflow = {
      w, map, store,
      release: () => releaseExecution?.(),
      executionCount: () => executionCount,
      health: () => getCharacterHealth(readCharacterModelFromPage(w.target)),
      durableHealth: async () => getCharacterHealth(readCharacterModelFromPage({ ...w.target,
        content: await w.original.readText(w.target.path) })),
      history: () => readTransactionRecords({ storageAdapter: w.adapter }),
      snapshot: async () => ({ pages: await Promise.all(w.pages.map(async item => ({ ...item,
        content: await w.original.readText(item.path) }))), log: await w.original.readText(EVENT_TRANSACTION_LOG_PATH) })
    };
    map.addEventListener('click', event => {
      if (!event.target.closest('.campaign-initiative-btn')) return;
      event.stopPropagation();
      void handleCampaignMapToolbarClick(event, map, {
        resolvePage: getPageById,
        getMapPageId: () => w.map.id,
        applyTokenHealthState,
        executeCombatAttack: run,
        createCombatActionId: () => `ui-intent-${++sequence}`,
        combatAttackExecutionOptions: {
          randomInt: w.rng.randomInt,
          createId: () => `ui-event-${++sequence}`,
          now: () => '2026-09-24T10:00:00.000Z'
        }
      });
    });
  }, options);
  await page.locator('.campaign-initiative-btn').click();
  await expect(page.locator('#campaignMapPopup')).toBeVisible();
}


async function fillAttack(page) {
  const popup = page.locator('#campaignMapPopup');
  await popup.getByLabel('Цель').selectOption('token:target');
  await popup.getByLabel('Название').fill('Shortbow');
  await popup.getByLabel('Атака', { exact: true }).fill('d20 + 4');
  await popup.getByLabel('Урон', { exact: true }).fill('1d6 + 2');
  await popup.getByLabel('Тип урона').fill('piercing');
  return popup;
}


test('existing Combat popup executes a durable hit and reaches History Undo', async ({ page }) => {
  await setup(page);
  const popup = await fillAttack(page);
  await expect(popup.locator('[data-combat-attack-actor-id="token:actor"]')).toHaveText('Goblin');
  await popup.getByRole('button', { name: 'Атаковать' }).click();
  const result = popup.locator('.campaign-combat-attack-result');
  await expect(result).toHaveAttribute('data-status', 'hit');
  await expect(result).toContainText('Shortbow — Попадание');
  await expect(result).toContainText('Атака: 14');
  await expect(result).toContainText('КЗ: 12');
  await expect(result).toContainText('Урон: 5 piercing');
  await expect(result).toContainText('HP: 10 → 5');
  expect(await page.evaluate(() => window.attackWorkflow.executionCount())).toBe(1);
  expect(await page.evaluate(() => window.attackWorkflow.store.isDirty())).toBe(false);
  expect(await page.evaluate(() => window.attackWorkflow.durableHealth())).toMatchObject({ current: 5, max: 10, temp: 0 });
  expect((await page.evaluate(() => window.attackWorkflow.history())).transactions).toHaveLength(1);

  await popup.getByRole('button', { name: 'История' }).click();
  const history = page.locator('#eventHistoryPopup');
  await expect(history).toBeVisible();
  await expect(history).toContainText('Shortbow');
  await history.getByRole('button', { name: 'Отменить атаку' }).click();
  await expect(history).toContainText('Отменено транзакцией');
  expect(await page.evaluate(() => window.attackWorkflow.durableHealth())).toMatchObject({ current: 10, max: 10, temp: 0 });
  expect((await page.evaluate(() => window.attackWorkflow.history())).transactions).toHaveLength(2);
  await expect(history.getByRole('button', { name: 'Отменить атаку' })).toHaveCount(0);
});


test('miss is durable without damage, page write or Undo', async ({ page }) => {
  await setup(page, { dice: [3] });
  const popup = await fillAttack(page);
  await popup.getByRole('button', { name: 'Атаковать' }).click();
  const result = popup.locator('.campaign-combat-attack-result');
  await expect(result).toHaveAttribute('data-status', 'miss');
  await expect(result).toContainText('Промах');
  await expect(result).toContainText('Атака: 7');
  await expect(result).toContainText('HP не изменены');
  await expect(result).not.toContainText('Урон:');
  const evidence = await page.evaluate(async () => ({ health: await window.attackWorkflow.durableHealth(),
    effects: window.attackWorkflow.w.effects, history: await window.attackWorkflow.history() }));
  expect(evidence.health).toMatchObject({ current: 10, temp: 0 });
  expect(evidence.effects.writes).toBe(0);
  expect(evidence.history.transactions).toHaveLength(1);
  await popup.getByRole('button', { name: 'История' }).click();
  await expect(page.locator('#eventHistoryPopup').getByRole('button', { name: 'Отменить атаку' })).toHaveCount(0);
});


test('temp HP evidence is rendered and double submit executes once', async ({ page }) => {
  await setup(page, { temp: 2, gate: true });
  const popup = await fillAttack(page);
  const attack = popup.getByRole('button', { name: 'Атаковать' });
  await attack.dblclick();
  await expect(attack).toBeDisabled();
  await expect(popup.locator('.campaign-combat-attack-result')).toHaveAttribute('data-status', 'pending');
  await page.evaluate(() => window.attackWorkflow.release());
  await expect(popup.locator('.campaign-combat-attack-result')).toHaveAttribute('data-status', 'hit');
  await expect(popup.locator('.campaign-combat-attack-result')).toContainText('HP: 10 → 7');
  await expect(popup.locator('.campaign-combat-attack-result')).toContainText('Temp HP: 2 → 0');
  expect(await page.evaluate(() => window.attackWorkflow.executionCount())).toBe(1);
  await popup.getByRole('button', { name: 'История' }).click();
  await page.locator('#eventHistoryPopup').getByRole('button', { name: 'Отменить атаку' }).click();
  expect(await page.evaluate(() => window.attackWorkflow.durableHealth())).toMatchObject({ current: 10, max: 10, temp: 2 });
});


test('durable attack health and history survive a browser reload', async ({ page }) => {
  await setup(page);
  const popup = await fillAttack(page);
  await popup.getByRole('button', { name: 'Атаковать' }).click();
  await expect(popup.locator('.campaign-combat-attack-result')).toHaveAttribute('data-status', 'hit');
  const snapshot = await page.evaluate(() => window.attackWorkflow.snapshot());
  await page.reload();
  const restored = await page.evaluate(async snapshot => {
    const { createMemoryWorkspaceAdapter } = await import('/tests/fixtures/dataSafetyFixtures.mjs');
    const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
    const { rebuildPageRepository } = await import('/js/repository/pageRepository.js');
    const { EVENT_TRANSACTION_LOG_PATH } = await import('/js/events/eventStore.js');
    const { createEventHistoryViewModel } = await import('/js/ui/eventHistoryPanel.js');
    const { readCharacterModelFromPage, getCharacterHealth } = await import('/js/character/characterModel.js');
    const adapter = createMemoryWorkspaceAdapter();
    for (const item of snapshot.pages) await adapter.writeText(item.path, item.content);
    await adapter.writeText(EVENT_TRANSACTION_LOG_PATH, snapshot.log);
    setStorageAdapter(adapter);
    rebuildPageRepository(snapshot.pages);
    const target = snapshot.pages.find(item => item.id === 'target-page');
    return { health: getCharacterHealth(readCharacterModelFromPage(target)),
      history: await createEventHistoryViewModel({}, { storageAdapter: adapter }) };
  }, snapshot);
  expect(restored.health).toMatchObject({ current: 5, max: 10, temp: 0 });
  expect(restored.history.items.some(item => item.eventType === 'action.resolved' && item.canUndo)).toBe(true);
});


test('stale current actor rejects before RNG and restores controls', async ({ page }) => {
  await setup(page, { staleActor: true });
  const popup = await fillAttack(page);
  await popup.getByRole('button', { name: 'Атаковать' }).click();
  const result = popup.locator('.campaign-combat-attack-result');
  await expect(result).toHaveAttribute('data-status', 'rejected');
  await expect(result).toContainText('состояние боя изменилось');
  await expect(popup.getByRole('button', { name: 'Атаковать' })).toBeEnabled();
  const evidence = await page.evaluate(async () => ({ rng: window.attackWorkflow.w.rng.calls,
    effects: window.attackWorkflow.w.effects, history: await window.attackWorkflow.history() }));
  expect(evidence.rng).toHaveLength(0);
  expect(evidence.effects).toMatchObject({ writes: 0, appends: 0 });
  expect(evidence.history.transactions).toHaveLength(0);
});


test('append uncertainty reports persisted health without automatic retry', async ({ page }) => {
  await setup(page, { appendFailure: true });
  const popup = await fillAttack(page);
  await popup.getByRole('button', { name: 'Атаковать' }).click();
  const result = popup.locator('.campaign-combat-attack-result');
  await expect(result).toHaveAttribute('data-status', 'audit-unconfirmed');
  await expect(result).toContainText('Не повторяйте атаку');
  expect(await page.evaluate(() => window.attackWorkflow.executionCount())).toBe(1);
  expect(await page.evaluate(() => window.attackWorkflow.durableHealth())).toMatchObject({ current: 5, temp: 0 });
});


for (const status of ['paused', 'finished']) {
  test(`${status} Combat exposes read-only unavailable attack controls`, async ({ page }) => {
    await setup(page, { status });
    const popup = page.locator('#campaignMapPopup');
    await expect(popup.locator('.campaign-combat-attack-unavailable')).toContainText('только в активном бою');
    await expect(popup.getByRole('button', { name: 'Атаковать' })).toBeDisabled();
    expect(await page.evaluate(() => window.attackWorkflow.executionCount())).toBe(0);
  });
}


test('broken roster target is visible as unavailable and never repaired by name', async ({ page }) => {
  await setup(page);
  const popup = page.locator('#campaignMapPopup');
  const option = popup.locator('option[value="token:broken"]');
  expect(await option.evaluate(node => node.disabled)).toBe(true);
  await expect(option).toContainText('недоступен');
  expect(await page.evaluate(() => window.attackWorkflow.executionCount())).toBe(0);
});


test('inactive Combat does not expose attack execution controls', async ({ page }) => {
  await setup(page, { status: 'inactive' });
  await expect(page.locator('#campaignMapPopup .campaign-combat-attack-form')).toHaveCount(0);
  expect(await page.evaluate(() => window.attackWorkflow.executionCount())).toBe(0);
});
