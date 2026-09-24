import { expect, test } from '@playwright/test';

test('durable attack writes one target page and one coherent transaction', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createCombatActionWorld, attackRequest } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { readTransactionRecords } = await import('/js/events/eventStore.js');
    const w = await createCombatActionWorld({ temp: 2 });
    const beforeMap = JSON.stringify(w.mapModel.toJSON());
    const beforeActor = w.actor.content;
    const execution = await executeCombatAttack(attackRequest(), w.options);
    const history = await readTransactionRecords({ storageAdapter: w.adapter });
    return { execution, effects: w.effects, historyCount: history.transactions.length,
      calls: w.rng.calls, target: w.target.content, durable: await w.original.readText(w.target.path),
      actorUnchanged: beforeActor === w.actor.content, mapUnchanged: beforeMap === JSON.stringify(w.mapModel.toJSON()) };
  });
  expect(result.execution, JSON.stringify(result.execution)).toMatchObject({ ok: true, state: 'persisted', audit: 'durable' });
  expect(result.effects).toMatchObject({ writes: 1, appends: 1 });
  expect(result.historyCount).toBe(1);
  expect(result.calls).toEqual([[1, 20], [1, 6]]);
  expect(result.target).toBe(result.durable);
  expect(result.actorUnchanged && result.mapUnchanged).toBe(true);
  expect(result.execution.resolution.health.after).toEqual({ hpCurrent: 7, hpMax: 10, hpTemp: 0 });
  expect(result.execution.transaction.events.map(e => e.type)).toEqual([
    'roll.performed', 'roll.performed', 'resource.changed', 'resource.changed', 'action.resolved'
  ]);
});

for (const scenario of ['hit', 'equality', 'miss', 'zero', 'clamped']) {
  test(`attack ${scenario} keeps page writes and audit evidence exact`, async ({ page }) => {
    await page.goto('/');
    const r = await page.evaluate(async scenario => {
      const { createCombatActionWorld, attackRequest } = await import('/tests/fixtures/combatActionFixtures.mjs');
      const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
      const { createEventHistoryViewModel } = await import('/js/ui/eventHistoryPanel.js');
      const w = await createCombatActionWorld({ current: scenario === 'clamped' ? 0 : 10,
        dice: scenario === 'miss' ? [3] : scenario === 'equality' ? [8, 3] : [10, 3] });
      const request = attackRequest();
      if (scenario === 'zero') request.action.damageComponents[0].roll.formula = '0';
      const before = w.target.content;
      const execution = await executeCombatAttack(request, w.options);
      const history = await createEventHistoryViewModel({ entityId: 'target-page' }, { storageAdapter: w.adapter });
      return { execution, effects: w.effects, rng: w.rng.calls.length, unchanged: before === w.target.content, history };
    }, scenario);
    expect(r.execution, JSON.stringify(r.execution)).toMatchObject({ ok: true, audit: 'durable' });
    const unchanged = ['miss', 'zero', 'clamped'].includes(scenario);
    expect(r.execution.state).toBe(unchanged ? 'unchanged' : 'persisted');
    expect(r.effects).toMatchObject({ writes: unchanged ? 0 : 1, appends: 1 });
    expect(r.unchanged).toBe(unchanged);
    expect(r.rng).toBe(['miss', 'zero'].includes(scenario) ? 1 : 2);
    expect(r.execution.transaction.events.filter(e => e.type === 'resource.changed')).toHaveLength(unchanged ? 0 : 1);
    expect(JSON.stringify(r.history)).toContain(scenario === 'miss' ? 'промах' : 'попадание');
    expect(r.history.items.filter(item => item.canUndo)).toHaveLength(unchanged ? 0 : 1);
  });
}

test('miss rejects a runtime target that diverges from its durable Character base before RNG', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { createCombatActionWorld, attackRequest } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const w = await createCombatActionWorld({ dice: [3] });
    const durable = await w.original.readText(w.target.path);
    w.target.content += '<p>Unsaved AC edit</p>';
    const execution = await executeCombatAttack(attackRequest(), w.options);
    return { execution, effects: w.effects, rng: w.rng.calls.length,
      durableUnchanged: durable === await w.original.readText(w.target.path) };
  });
  expect(r.execution, JSON.stringify(r.execution)).toMatchObject({ ok: false, state: 'unchanged', audit: 'not-attempted', reason: 'COMBAT_TARGET_STALE' });
  expect(r.rng).toBe(0);
  expect(r.effects).toMatchObject({ writes: 0, appends: 0 });
  expect(r.durableUnchanged).toBe(true);
});

test('miss rejects a durable target change after its roll and before audit append', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { createCombatActionWorld, attackRequest } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const w = await createCombatActionWorld({ dice: [3] });
    const originalNow = w.options.now;
    let changed = false;
    w.options.now = () => {
      if (!changed) {
        changed = true;
        w.original.writeText(w.target.path, '<!-- external durable target change -->');
      }
      return originalNow();
    };
    const execution = await executeCombatAttack(attackRequest(), w.options);
    return { execution, effects: w.effects, rng: w.rng.calls.length,
      durable: await w.original.readText(w.target.path) };
  });
  expect(r.execution, JSON.stringify(r.execution)).toMatchObject({ ok: false, state: 'unchanged', audit: 'not-attempted', reason: 'COMBAT_TARGET_STALE' });
  expect(r.rng).toBe(1);
  expect(r.effects).toMatchObject({ writes: 0, appends: 0 });
  expect(r.durable).toBe('<!-- external durable target change -->');
});

for (const scenario of ['dirty-map', 'unsaved-map', 'divergent-map', 'durable-map-stale', 'target-stale',
  'actor-changed', 'session-changed', 'round-changed', 'mapping-changed', 'ac-changed',
  'candidate-invalid', 'workspace-root-before', 'workspace-adapter-before', 'workspace-handle-before', 'late-current', 'late-target']) {
  test(`attack rejects ${scenario} without page write or audit`, async ({ page }) => {
    await page.goto('/');
    const r = await page.evaluate(async scenario => {
      const { createCombatActionWorld, attackRequest } = await import('/tests/fixtures/combatActionFixtures.mjs');
      const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
      const { setStorageAdapter } = await import('/js/storage/storageAdapter.js');
      const { createMemoryWorkspaceAdapter } = await import('/tests/fixtures/dataSafetyFixtures.mjs');
      const w = await createCombatActionWorld();
      if (scenario === 'workspace-handle-before') {
        const handle = {};
        w.adapter.kind = 'browser';
        w.adapter.getWorkspaceRoot = undefined;
        w.adapter.getWorkspaceHandle = () => handle;
      }
      const before = w.target.content;
      if (scenario === 'dirty-map') w.context.dirty = true;
      if (scenario === 'unsaved-map') w.map.path = null;
      if (scenario === 'divergent-map') w.mapModel.combatSession = { ...w.mapModel.combatSession, round: 4 };
      if (scenario === 'durable-map-stale') await w.original.writeText(w.map.path, w.map.content + '<p>newer map</p>');
      const originalNow = w.options.now;
      let candidateStarted = false, altered = false;
      w.options.now = () => {
        candidateStarted = true;
        if (!altered) {
          altered = true;
          if (scenario === 'actor-changed') w.mapModel.initiative = { ...w.mapModel.initiative, activeParticipantId: 'token:target' };
          if (scenario === 'session-changed') w.mapModel.combatSession = { ...w.mapModel.combatSession, sessionId: 'other-session' };
          if (scenario === 'round-changed') w.mapModel.combatSession = { ...w.mapModel.combatSession, round: 4 };
          if (scenario === 'mapping-changed') w.mapModel.tokens[1].pageId = 'actor-page';
          if (scenario === 'ac-changed') w.target.content += '<p>AC inputs edited</p>';
          if (scenario === 'workspace-root-before') w.adapter.getWorkspaceRoot = () => 'C:/other-fixture';
          if (scenario === 'workspace-adapter-before') setStorageAdapter(createMemoryWorkspaceAdapter({ workspaceRoot: 'C:/other-fixture' }));
          if (scenario === 'workspace-handle-before') w.adapter.getWorkspaceHandle = () => ({});
        }
        return originalNow();
      };
      if (scenario === 'candidate-invalid') w.options.createId = () => 'duplicate-id';
      let targetReadsAfterCandidate = 0;
      const read = w.adapter.readText;
      w.adapter.readText = async path => {
        if (candidateStarted && path === w.target.path) {
          targetReadsAfterCandidate++;
          if (scenario === 'target-stale' || (scenario === 'late-target' && targetReadsAfterCandidate === 3)) {
            await w.original.writeText(path, before + '<p>concurrent edit</p>');
          }
          if (scenario === 'late-current' && targetReadsAfterCandidate === 3) {
            w.mapModel.initiative = { ...w.mapModel.initiative, activeParticipantId: 'token:target' };
          }
        }
        return read(path);
      };
      const execution = await executeCombatAttack(attackRequest(), w.options);
      return { execution, effects: w.effects, unchanged: w.target.content === before, rng: w.rng.calls.length };
    }, scenario);
    expect(r.execution, JSON.stringify(r.execution)).toMatchObject({ ok: false, state: 'unchanged', audit: 'not-attempted' });
    expect(r.effects).toMatchObject({ writes: 0, appends: 0 });
    if (scenario !== 'ac-changed') expect(r.unchanged).toBe(true);
    expect(r.rng).toBe(['dirty-map', 'unsaved-map', 'divergent-map', 'durable-map-stale'].includes(scenario) ? 0 : 2);
    expect(r.execution.reason).toBeTruthy();
  });
}

for (const scenario of ['write-rejected', 'write-after-bytes', 'write-unreadable', 'workspace-during-write',
  'append-absent', 'append-after-bytes', 'append-corrupt', 'append-unreadable', 'append-miss', 'append-zero', 'workspace-before-append']) {
  test(`attack reports ${scenario} without retry or rollback of durable HP`, async ({ page }) => {
    await page.goto('/');
    const r = await page.evaluate(async scenario => {
      const { createCombatActionWorld, attackRequest } = await import('/tests/fixtures/combatActionFixtures.mjs');
      const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
      const w = await createCombatActionWorld({ dice: scenario === 'append-miss' ? [3] : [10, 3] });
      const request = attackRequest();
      if (scenario === 'append-zero') request.action.damageComponents[0].roll.formula = '0';
      const before = w.target.content;
      const write = w.adapter.writeText, read = w.adapter.readText, append = w.adapter.appendText;
      let failed = false, diagnosticReads = 0;
      w.adapter.writeText = async (path, content) => {
        if (scenario === 'write-rejected' || scenario === 'write-unreadable') {
          w.effects.writes++; failed = true; throw new Error('injected page-write failure');
        }
        await write(path, content);
        if (scenario === 'write-after-bytes') { failed = true; throw new Error('injected error after bytes'); }
        if (scenario === 'workspace-during-write') w.adapter.getWorkspaceRoot = () => 'C:/other-fixture';
      };
      w.adapter.readText = async path => {
        if (failed) {
          diagnosticReads++;
          if (scenario === 'write-unreadable' || scenario === 'append-unreadable') throw new Error('injected unreadable');
        }
        return read(path);
      };
      if (scenario.startsWith('append-')) w.adapter.appendText = async (path, line) => {
        if (scenario === 'append-after-bytes') await append(path, line);
        else {
          w.effects.appends++;
          if (scenario === 'append-corrupt') await w.original.writeText(path, '{broken json\n');
        }
        failed = true;
        throw new Error('injected audit failure');
      };
      if (scenario === 'workspace-before-append') {
        w.adapter.ensureDirectory = async () => { w.adapter.getWorkspaceRoot = () => 'C:/other-fixture'; };
      }
      const execution = await executeCombatAttack(request, w.options);
      return { execution, effects: w.effects, diagnosticReads, rng: w.rng.calls.length,
        liveUnchanged: before === w.target.content, durableUnchanged: before === await w.original.readText(w.target.path) };
    }, scenario);
    expect(r.execution.ok, JSON.stringify(r.execution)).toBe(false);
    const noChange = ['append-miss', 'append-zero'].includes(scenario);
    expect(r.effects.writes).toBe(noChange ? 0 : 1);
    expect(r.rng).toBe(noChange ? 1 : 2);
    if (scenario.startsWith('write-') || scenario === 'workspace-during-write') {
      expect(r.effects.appends).toBe(0);
      expect(r.execution.audit).toBe('not-attempted');
      expect(r.execution.state).toBe(scenario === 'write-rejected' ? 'unchanged' : scenario === 'write-after-bytes' ? 'persisted' : 'uncertain');
      expect(r.liveUnchanged).toBe(true);
      if (scenario.startsWith('write-')) expect(r.diagnosticReads).toBe(1);
    } else {
      expect(r.execution).toMatchObject({ audit: 'unconfirmed', state: noChange ? 'unchanged' : 'persisted' });
      expect(r.durableUnchanged).toBe(noChange);
      expect(r.effects.appends).toBe(scenario === 'workspace-before-append' ? 0 : 1);
      if (scenario.startsWith('append-')) {
        expect(r.diagnosticReads).toBe(1);
        const statuses = { 'append-after-bytes': 'exact-transaction-found', 'append-corrupt': 'corrupt-or-inconsistent', 'append-unreadable': 'unreadable' };
        expect(r.execution.auditReadback.status).toBe(statuses[scenario] || 'absent');
      }
    }
    expect(r.execution.actionId).toBe('action-1');
    expect(r.execution.transactionId).toBeTruthy();
  });
}

test('overlapping attacks serialize target health and retain independent event identities', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(async () => {
    const { createCombatActionWorld, attackRequest } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { readTransactionRecords } = await import('/js/events/eventStore.js');
    const w = await createCombatActionWorld({ dice: [10, 3, 10, 3] });
    const second = attackRequest(); second.actionId = 'action-2';
    const executions = await Promise.all([executeCombatAttack(attackRequest(), w.options), executeCombatAttack(second, w.options)]);
    const snapshot = await readTransactionRecords({ storageAdapter: w.adapter });
    return { executions, effects: w.effects, historyCount: snapshot.transactions.length };
  });
  expect(r.executions.map(e => e.ok), JSON.stringify(r.executions)).toEqual([true, true]);
  expect(r.executions.map(e => e.resolution.health.after.hpCurrent)).toEqual([5, 0]);
  expect(r.effects).toMatchObject({ writes: 2, appends: 2 });
  expect(r.historyCount).toBe(2);
});

test('fresh page load uses durable Properties health even when history is corrupt or absent', async ({ page }) => {
  await page.goto('/');
  const saved = await page.evaluate(async () => {
    const { createCombatActionWorld, attackRequest } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { EVENT_TRANSACTION_LOG_PATH } = await import('/js/events/eventStore.js');
    const w = await createCombatActionWorld({ temp: 2 });
    const execution = await executeCombatAttack(attackRequest(), w.options);
    if (!execution.ok) throw new Error(JSON.stringify(execution));
    return { page: { ...w.target, content: await w.original.readText(w.target.path) }, log: await w.original.readText(EVENT_TRANSACTION_LOG_PATH) };
  });
  await page.reload();
  const r = await page.evaluate(async saved => {
    const { readCharacterModelFromPage, getCharacterHealth } = await import('/js/character/characterModel.js');
    const { createMemoryWorkspaceAdapter } = await import('/tests/fixtures/dataSafetyFixtures.mjs');
    const { readTransactionRecords, EVENT_TRANSACTION_LOG_PATH } = await import('/js/events/eventStore.js');
    const adapter = createMemoryWorkspaceAdapter();
    const outputs = [];
    for (const log of [saved.log, '{broken json\n', '']) {
      await adapter.writeText(EVENT_TRANSACTION_LOG_PATH, log);
      const history = await readTransactionRecords({ storageAdapter: adapter });
      const health = getCharacterHealth(readCharacterModelFromPage(saved.page));
      outputs.push({ health, count: history.transactions.length });
    }
    return outputs;
  }, saved);
  expect(r.map(item => item.count)).toEqual([1, 0, 0]);
  for (const item of r) expect(item.health).toMatchObject({ current: 7, max: 10, temp: 0 });
});
