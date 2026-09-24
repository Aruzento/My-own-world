import { expect, test } from '@playwright/test';

for (const scenario of ['current', 'both', 'temp', 'miss', 'zero', 'clamped']) {
  test(`attack Undo after reload: ${scenario}`, async ({ page }) => {
    await page.goto('/');
    const saved = await page.evaluate(async scenario => {
      const { createCombatUndoWorld } = await import('/tests/fixtures/combatUndoFixtures.mjs');
      const { EVENT_TRANSACTION_LOG_PATH } = await import('/js/events/eventStore.js');
      const w = await createCombatUndoWorld({ scenario });
      return { page: { ...w.target, content: await w.original.readText(w.target.path) },
        log: await w.original.readText(EVENT_TRANSACTION_LOG_PATH), transactionId: w.attack.transactionId };
    }, scenario);
    await page.reload();
    const r = await page.evaluate(async saved => {
      const { createMemoryWorkspaceAdapter } = await import('/tests/fixtures/dataSafetyFixtures.mjs');
      const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
      const { rebuildPageRepository } = await import('/js/repository/pageRepository.js');
      const { readTransactionRecords, EVENT_TRANSACTION_LOG_PATH } = await import('/js/events/eventStore.js');
      const { undoTransaction } = await import('/js/events/transactionReversal.js');
      const { undoInput } = await import('/tests/fixtures/combatUndoFixtures.mjs');
      const { createEventHistoryViewModel } = await import('/js/ui/eventHistoryPanel.js');
      const adapter = createMemoryWorkspaceAdapter();
      await adapter.writeText(saved.page.path, saved.page.content);
      await adapter.writeText(EVENT_TRANSACTION_LOG_PATH, saved.log);
      setStorageAdapter(adapter); rebuildPageRepository([saved.page]);
      let writes = 0, appends = 0;
      const write = adapter.writeText.bind(adapter), read = adapter.readText.bind(adapter);
      adapter.writeText = async (...args) => { writes++; return write(...args); };
      adapter.appendText = async (path, line) => { appends++; await write(path, await read(path) + line); };
      const before = await createEventHistoryViewModel({}, { storageAdapter: adapter });
      const undo = await undoTransaction(undoInput(saved.transactionId), { storageAdapter: adapter });
      const snapshot = await readTransactionRecords({ storageAdapter: adapter });
      const after = await createEventHistoryViewModel({}, { storageAdapter: adapter });
      return { undo, writes, appends, before, after, snapshot,
        originalUnchanged: (await read(EVENT_TRANSACTION_LOG_PATH)).startsWith(saved.log),
        content: await read(saved.page.path) };
    }, saved);
    const changed = ['current', 'both', 'temp'].includes(scenario);
    expect(r.before.items.filter(item => item.canUndo)).toHaveLength(changed ? 1 : 0);
    expect(r.undo.ok, JSON.stringify(r.undo)).toBe(changed);
    expect(r.writes).toBe(changed ? 1 : 0);
    expect(r.appends).toBe(changed ? 1 : 0);
    expect(r.snapshot.transactions).toHaveLength(changed ? 2 : 1);
    expect(r.originalUnchanged).toBe(true);
    expect(r.after.items.some(item => item.canUndo)).toBe(false);
    if (changed) {
      expect(r.undo).toMatchObject({ state: 'persisted', audit: 'durable' });
      const events = r.undo.transaction.events;
      expect(events.map(e => e.type)).toEqual(scenario === 'both'
        ? ['resource.changed', 'resource.changed', 'transaction.reversal.recorded']
        : ['resource.changed', 'transaction.reversal.recorded']);
      const originalResources = r.snapshot.transactions[0].events.filter(e => e.type === 'resource.changed');
      expect(events.slice(0, -1).map(e => e.reversesEventId)).toEqual(originalResources.map(e => e.eventId));
      expect(events.slice(0, -1).map(e => e.payload.resource.id)).toEqual(originalResources.map(e => e.payload.resource.id));
      expect(r.after.items.find(item => item.eventType === 'action.resolved').relation).toContain('Отменено транзакцией');
    }
    await page.reload();
    const health = await page.evaluate(async content => {
      const { readCharacterModelFromPage, getCharacterHealth } = await import('/js/character/characterModel.js');
      return getCharacterHealth(readCharacterModelFromPage({ id: 'target-page', content }));
    }, r.content);
    expect(health).toMatchObject({ current: scenario === 'clamped' ? 0 : 10, max: 10, temp: scenario === 'both' ? 2 : scenario === 'temp' ? 8 : 0 });
  });
}

for (const scenario of ['hpCurrent', 'hpTemp', 'hpMax', 'unrelated', 'deleted', 'deleted-file', 'malformed', 'divergent', 'sequential', 'concurrent']) {
  test(`attack Undo guards: ${scenario}`, async ({ page }) => {
    await page.goto('/');
    const r = await page.evaluate(async scenario => {
      const { createCombatUndoWorld } = await import('/tests/fixtures/combatUndoFixtures.mjs');
      const { readTransactionRecords } = await import('/js/events/eventStore.js');
      const w = await createCombatUndoWorld();
      const original = JSON.stringify(w.attack.transaction);
      if (['hpCurrent', 'hpTemp', 'hpMax', 'malformed'].includes(scenario)) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = w.target.content.slice(w.target.content.indexOf('<'));
        wrapper.querySelector(`[data-property-name="${scenario === 'malformed' ? 'hpTemp' : scenario}"]`).setAttribute('value', scenario === 'malformed' ? 'bad' : '9');
        w.target.content = w.target.content.slice(0, w.target.content.indexOf('<')) + wrapper.innerHTML;
      }
      if (['unrelated', 'divergent'].includes(scenario)) w.target.content += '<p>Later biography survives Undo</p>';
      if (scenario !== 'divergent') await w.original.writeText(w.target.path, w.target.content);
      if (scenario === 'deleted-file') await w.adapter.removeFile(w.target.path);
      const before = w.target.content;
      // Session/actor no longer participate in the compensation precondition.
      w.mapModel.combatSession = null; w.mapModel.initiative = null;
      const outcomes = scenario === 'concurrent' ? await Promise.all([w.undo('1'), w.undo('2')])
        : [await w.undo('1', scenario === 'deleted' ? { pageResolver: () => null } : {})];
      if (scenario === 'sequential') outcomes.push(await w.undo('2'));
      const snapshot = await readTransactionRecords({ storageAdapter: w.adapter });
      return { outcomes, effects: w.effects, originalUnchanged: JSON.stringify(snapshot.transactions[0]) === original,
        content: w.target.content, unchanged: w.target.content === before, count: snapshot.transactions.length };
    }, scenario);
    expect(r.originalUnchanged).toBe(true);
    const success = ['unrelated', 'sequential', 'concurrent'].includes(scenario);
    expect(r.outcomes.filter(o => o.ok)).toHaveLength(success ? 1 : 0);
    expect(r.effects).toMatchObject({ writes: success ? 1 : 0, appends: success ? 1 : 0 });
    expect(r.count).toBe(success ? 2 : 1);
    if (!success) expect(r.unchanged).toBe(true);
    if (['hpCurrent', 'hpTemp', 'hpMax'].includes(scenario)) expect(r.outcomes[0].reason).toBe('TRANSACTION_REVERSAL_CURRENT_STATE_CONFLICT');
    if (scenario.startsWith('deleted')) expect(r.outcomes[0].reason).toBe('TRANSACTION_REVERSAL_TARGET_NOT_FOUND');
    if (scenario === 'unrelated') expect(r.content).toContain('Later biography survives Undo');
    if (['sequential', 'concurrent'].includes(scenario)) expect(r.outcomes.find(o => !o.ok).reason).toBe('already-reversed');
  });
}

test('invalid reversal candidate ids reject before compensation writes', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { createCombatUndoWorld, undoInput } = await import('/tests/fixtures/combatUndoFixtures.mjs');
    const { undoTransaction } = await import('/js/events/transactionReversal.js');
    const w = await createCombatUndoWorld();
    const outcomes = [];
    for (const ids of [{ reversalEventId: 'metadata-1' }, { reversalTransactionId: w.attack.transactionId },
      { reversalEventId: w.attack.transaction.events[0].eventId }]) {
      outcomes.push(await undoTransaction({ ...undoInput(w.attack.transactionId), ...ids }, { storageAdapter: w.adapter }));
    }
    return { outcomes, effects: w.effects };
  });
  expect(r.outcomes.every(o => !o.ok && o.stage === 'candidate-validation')).toBe(true);
  expect(r.effects).toMatchObject({ writes: 0, appends: 0 });
});

for (const scenario of ['stale-write', 'superseded', 'write-rejected', 'write-after-bytes', 'write-unreadable',
  'append-absent', 'append-after-bytes', 'append-corrupt', 'append-unreadable',
  'workspace-before-write', 'workspace-during-write', 'workspace-before-append']) {
  test(`attack Undo durability: ${scenario}`, async ({ page }) => {
    await page.goto('/');
    const r = await page.evaluate(async scenario => {
      const { createCombatUndoWorld } = await import('/tests/fixtures/combatUndoFixtures.mjs');
      const { createWriteRevision, getPageWriteKey } = await import('/js/storage/writeQueue.js');
      const w = await createCombatUndoWorld();
      const before = w.target.content;
      const write = w.adapter.writeText, read = w.adapter.readText, append = w.adapter.appendText;
      let failed = false, diagnosticReads = 0, targetReads = 0;
      w.adapter.readText = async path => {
        if (failed) {
          diagnosticReads++;
          if (scenario.endsWith('unreadable')) throw new Error('unreadable fixture');
        }
        if (path === w.target.path && ++targetReads === 2) {
          if (scenario === 'stale-write') await w.original.writeText(path, before + '<p>External edit</p>');
          if (scenario === 'superseded') createWriteRevision(getPageWriteKey(w.target));
          if (scenario === 'workspace-before-write') w.adapter.getWorkspaceRoot = () => 'C:/different-fixture';
        }
        return read(path);
      };
      w.adapter.writeText = async (path, content) => {
        if (['write-rejected', 'write-unreadable'].includes(scenario)) {
          w.effects.writes++; failed = true; throw new Error('write failed');
        }
        await write(path, content);
        if (scenario === 'write-after-bytes') { failed = true; throw new Error('write after bytes'); }
        if (scenario === 'workspace-during-write') w.adapter.getWorkspaceRoot = () => 'C:/different-fixture';
      };
      if (scenario.startsWith('append-')) w.adapter.appendText = async (path, line) => {
        if (scenario === 'append-after-bytes') await append(path, line);
        else {
          w.effects.appends++;
          if (scenario === 'append-corrupt') await w.original.writeText(path, '{broken\n');
        }
        failed = true; throw new Error('append failed');
      };
      if (scenario === 'workspace-before-append') w.adapter.ensureDirectory = async () => { w.adapter.getWorkspaceRoot = () => 'C:/different-fixture'; };
      const undo = await w.undo();
      const diagnosticCount = diagnosticReads;
      let retry = null;
      if (scenario === 'append-absent') { failed = false; retry = await w.undo('2'); }
      return { undo, retry, effects: w.effects, diagnosticCount, content: await w.original.readText(w.target.path), before };
    }, scenario);
    expect(r.undo.ok, JSON.stringify(r.undo)).toBe(false);
    const prewrite = ['stale-write', 'superseded', 'workspace-before-write'].includes(scenario);
    expect(r.effects.writes).toBe(prewrite ? 0 : 1);
    const audit = scenario.startsWith('append-') || scenario === 'workspace-before-append';
    expect(r.effects.appends).toBe(scenario.startsWith('append-') ? 1 : 0);
    expect(r.undo.audit).toBe(audit ? 'unconfirmed' : 'not-attempted');
    expect(r.undo.state).toBe(prewrite || scenario === 'write-rejected' ? 'unchanged'
      : ['write-unreadable', 'workspace-during-write'].includes(scenario) ? 'uncertain' : 'persisted');
    if (scenario.startsWith('append-') || scenario.startsWith('write-')) expect(r.diagnosticCount).toBe(1);
    if (audit) {
      expect(r.content).toBe(r.undo.mutationPlan.nextContent);
      const states = { 'append-after-bytes': 'exact-transaction-found', 'append-corrupt': 'corrupt-or-inconsistent',
        'append-unreadable': 'unreadable', 'workspace-before-append': 'unreadable' };
      expect(r.undo.auditReadback.status).toBe(states[scenario] || 'absent');
      expect(r.undo.transaction.transactionId).toBe('undo-1');
    }
    if (r.retry) expect(r.retry).toMatchObject({ ok: false, state: 'unchanged', reason: 'TRANSACTION_REVERSAL_CURRENT_STATE_CONFLICT' });
    if (scenario === 'stale-write') expect(r.content).toContain('External edit');
  });
}

test('attack and compensation use the same target queue', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { createCombatUndoWorld } = await import('/tests/fixtures/combatUndoFixtures.mjs');
    const { attackRequest } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { EVENT_TRANSACTION_LOG_PATH } = await import('/js/events/eventStore.js');
    const w = await createCombatUndoWorld({ dice: [10, 3, 10, 3] });
    let release, entered, logReads = 0;
    const hold = new Promise(resolve => { release = resolve; });
    const insideQueue = new Promise(resolve => { entered = resolve; });
    const read = w.adapter.readText;
    w.adapter.readText = async path => {
      if (path === EVENT_TRANSACTION_LOG_PATH && ++logReads === 2) { entered(); await hold; }
      return read(path);
    };
    const undoPromise = w.undo();
    await insideQueue;
    const request = attackRequest(); request.actionId = 'second-attack';
    const attackPromise = executeCombatAttack(request, w.options);
    await Promise.resolve();
    const whileWaiting = { writes: w.effects.writes, rolls: w.rng.calls.length };
    release();
    const [undo, attack] = await Promise.all([undoPromise, attackPromise]);
    return { undo, attack, effects: w.effects, whileWaiting };
  });
  expect(r.whileWaiting).toEqual({ writes: 0, rolls: 2 });
  expect(r.undo.ok, JSON.stringify(r.undo)).toBe(true);
  expect(r.attack.ok, JSON.stringify(r.attack)).toBe(true);
  expect(r.attack.resolution.health.before).toEqual({ hpCurrent: 10, hpMax: 10, hpTemp: 2 });
  expect(r.effects).toMatchObject({ writes: 2, appends: 2 });
});

for (const failure of [false, true]) {
  test(`existing Event History attack Undo control, append failure=${failure}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async failure => {
      const { createCombatUndoWorld } = await import('/tests/fixtures/combatUndoFixtures.mjs');
      const w = await createCombatUndoWorld();
      window.undoFixture = w;
      if (failure) w.adapter.appendText = async () => { w.effects.appends++; throw new Error('append failure'); };
    }, failure);
    await page.locator('#appToolsBtn').click();
    await page.getByRole('button', { name: /Журнал событий/ }).click();
    const popup = page.locator('#eventHistoryPopup');
    await popup.getByRole('button', { name: 'Отменить атаку' }).click();
    if (failure) {
      await expect(popup).toContainText('Здоровье восстановлено, журнал не подтверждён');
      await expect(popup).toContainText('Не повторяйте операцию');
    } else {
      await expect(popup).toContainText('Отменено транзакцией');
      await expect(popup.getByRole('button', { name: 'Отменить атаку' })).toHaveCount(0);
    }
    const effects = await page.evaluate(() => window.undoFixture.effects);
    expect(effects).toMatchObject({ writes: 1, appends: 1 });
  });
}
