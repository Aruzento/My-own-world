import { expect, test } from '@playwright/test';

for (const [label, actorStructured, targetStructured] of [
  ['legacy actor to legacy target', false, false],
  ['structured actor to legacy target', true, false],
  ['legacy actor to structured target', false, true],
  ['structured actor to structured target', true, true]
]) {
  test(`Combat source parity: ${label}`, async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async ({ actorStructured, targetStructured }) => {
      const { attackRequest, createStructuredCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
      const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
      const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
      const { readTransactionRecords } = await import('/js/events/eventStore.js');
      const world = await createStructuredCombatActionWorld({ actorStructured, targetStructured,
        current: 8, max: 20, temp: 0, dice: [10, 1] });
      const execution = await executeCombatAttack(attackRequest(), world.options);
      const durable = await world.original.readText(world.target.path);
      const parsed = parsePageRecordContent(durable);
      const transactions = (await readTransactionRecords({ storageAdapter: world.adapter })).transactions;
      return {
        execution,
        activeHealth: targetStructured ? parsed.variablesJson.values['dnd.health'] : null,
        propertiesBody: parsed.rawBody,
        events: transactions[0]?.events || []
      };
    }, { actorStructured, targetStructured });

    expect(result.execution.ok, JSON.stringify(result.execution)).toBe(true);
    expect(result.execution.resolution).toMatchObject({ outcome: 'hit', defense: { value: 12 },
      health: { before: { hpCurrent: 8, hpMax: 20, hpTemp: 0 },
        after: { hpCurrent: 5, hpMax: 20, hpTemp: 0 } } });
    const resources = result.events.filter(event => event.type === 'resource.changed');
    expect(resources.map(event => event.payload.resource.id)).toEqual(['target-page:hpCurrent']);
    expect(resources[0].payload).toMatchObject({ before: 8, after: 5, delta: -3 });
    if (targetStructured) {
      expect(result.activeHealth['dnd.hpCurrent']).toBe(5);
      expect(result.propertiesBody).toContain('data-property-name="hpCurrent"');
      expect(result.propertiesBody).toContain('value="99"');
    }
  });
}

test('structured Combat preserves logical HP evidence, Properties bytes and source-aware Undo across reloads', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { attackRequest, createStructuredCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { undoInput } = await import('/tests/fixtures/combatUndoFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { undoTransaction } = await import('/js/events/transactionReversal.js');
    const { parsePageRecordContent, createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
    const { rebuildPageRepository } = await import('/js/repository/pageRepository.js');
    const { readCharacterModelFromPage, getCharacterHealth } = await import('/js/character/characterModel.js');
    const { readTransactionRecords } = await import('/js/events/eventStore.js');
    const world = await createStructuredCombatActionWorld({ actorStructured: true, targetStructured: true,
      current: 10, max: 20, temp: 3, dice: [10, 3] });
    const attack = await executeCombatAttack(attackRequest(), world.options);
    const afterAttackContent = await world.original.readText(world.target.path);
    const afterAttackRecord = parsePageRecordContent(afterAttackContent);
    const reloadedTarget = createRuntimePageFromContent({ content: afterAttackContent,
      path: world.target.path, name: world.target.name });
    const reloadedPages = [world.actor, reloadedTarget, world.map];
    rebuildPageRepository(reloadedPages);
    const afterAttackModel = readCharacterModelFromPage(reloadedTarget, {
      pages: reloadedPages, registry: world.registry
    });
    const undo = await undoTransaction(undoInput(attack.transactionId), { storageAdapter: world.adapter });
    const afterUndoContent = await world.original.readText(world.target.path);
    const afterUndoRecord = parsePageRecordContent(afterUndoContent);
    const afterUndoTarget = createRuntimePageFromContent({ content: afterUndoContent,
      path: world.target.path, name: world.target.name });
    const afterUndoModel = readCharacterModelFromPage(afterUndoTarget, {
      pages: [world.actor, afterUndoTarget, world.map], registry: world.registry
    });
    const transactions = (await readTransactionRecords({ storageAdapter: world.adapter })).transactions;
    return {
      attack, undo,
      attackHealth: afterAttackRecord.variablesJson.values['dnd.health'],
      undoHealth: afterUndoRecord.variablesJson.values['dnd.health'],
      afterAttackModel: getCharacterHealth(afterAttackModel),
      afterUndoModel: getCharacterHealth(afterUndoModel),
      attackBody: afterAttackRecord.rawBody,
      undoBody: afterUndoRecord.rawBody,
      transactions
    };
  });

  expect(result.attack.ok, JSON.stringify(result.attack)).toBe(true);
  expect(result.attackHealth).toMatchObject({ 'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 0,
    'character.health.formula': '5d8 + 5', 'character.health.hitDice': '5d8' });
  expect(result.afterAttackModel).toMatchObject({ current: 8, max: 20, temp: 0 });
  const attackResources = result.transactions[0].events.filter(event => event.type === 'resource.changed');
  expect(attackResources.map(event => event.payload.resource.id)).toEqual([
    'target-page:hpTemp', 'target-page:hpCurrent'
  ]);
  expect(result.undo).toMatchObject({ ok: true, state: 'persisted', audit: 'durable' });
  expect(result.undoHealth).toMatchObject({ 'dnd.hpCurrent': 10, 'dnd.hpMax': 20, 'dnd.hpTemporary': 3,
    'character.health.formula': '5d8 + 5', 'character.health.hitDice': '5d8' });
  expect(result.afterUndoModel).toMatchObject({ current: 10, max: 20, temp: 3 });
  expect(result.attackBody).toContain('data-property-name="hpCurrent"');
  expect(result.attackBody).toContain('value="99"');
  expect(result.undoBody).toBe(result.attackBody);
  expect(result.transactions).toHaveLength(2);
  expect(result.transactions[1].events.at(-1).type).toBe('transaction.reversal.recorded');
});

test('structured Combat defense resolves exact Item armor and rejects a broken reference before RNG', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { attackRequest, attachStructuredMediumArmor,
      createStructuredCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const validWorld = await createStructuredCombatActionWorld({ targetStructured: true, current: 8,
      max: 20, dice: [15, 1] });
    await attachStructuredMediumArmor(validWorld);
    const valid = await executeCombatAttack(attackRequest(), validWorld.options);
    const brokenWorld = await createStructuredCombatActionWorld({ targetStructured: true, current: 8,
      max: 20, dice: [15, 1] });
    await attachStructuredMediumArmor(brokenWorld, { missing: true });
    const broken = await executeCombatAttack(attackRequest(), brokenWorld.options);
    return { valid, broken, brokenRng: brokenWorld.rng.consumed,
      brokenWrites: brokenWorld.effects.writes, brokenAppends: brokenWorld.effects.appends };
  });

  expect(result.valid.ok, JSON.stringify(result.valid)).toBe(true);
  expect(result.valid.resolution.defense).toEqual({ kind: 'ac', value: 16 });
  expect(result.broken.ok).toBe(false);
  expect(result.broken.reason).toBe('COMBAT_ATTACK_DEFENSE_INVALID');
  expect(result.brokenRng).toBe(0);
  expect(result.brokenWrites).toBe(0);
  expect(result.brokenAppends).toBe(0);
});

test('structured Combat blocks missing explicit health and missing activated catalog before RNG', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { attackRequest, createStructuredCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { parsePageRecordContent, updatePageRecordContent } = await import('/js/core/pageRecord.js');
    const { rebuildPageRepository } = await import('/js/repository/pageRepository.js');
    const missingHealthWorld = await createStructuredCombatActionWorld({ targetStructured: true, dice: [10, 1] });
    const envelope = parsePageRecordContent(missingHealthWorld.target.content).variablesJson;
    delete envelope.values['dnd.health'];
    missingHealthWorld.target.content = updatePageRecordContent(missingHealthWorld.target.content,
      { variablesJson: envelope });
    await missingHealthWorld.original.writeText(missingHealthWorld.target.path, missingHealthWorld.target.content);
    rebuildPageRepository(missingHealthWorld.pages);
    missingHealthWorld.effects.writes = missingHealthWorld.effects.reads = missingHealthWorld.effects.appends = 0;
    const missingHealth = await executeCombatAttack(attackRequest(), missingHealthWorld.options);

    const missingCatalogWorld = await createStructuredCombatActionWorld({ targetStructured: true, dice: [10, 1] });
    await missingCatalogWorld.adapter.removeFile(CARD_TYPE_CATALOG_PATH);
    missingCatalogWorld.effects.writes = missingCatalogWorld.effects.reads = missingCatalogWorld.effects.appends = 0;
    const missingCatalog = await executeCombatAttack(attackRequest(), missingCatalogWorld.options);
    return { missingHealth, missingHealthRng: missingHealthWorld.rng.consumed,
      missingCatalog, missingCatalogRng: missingCatalogWorld.rng.consumed };
  });

  expect(result.missingHealth.ok).toBe(false);
  expect(result.missingHealth.reason).toBe('COMBAT_STRUCTURED_HEALTH_UNAVAILABLE');
  expect(result.missingHealthRng).toBe(0);
  expect(result.missingCatalog.ok).toBe(false);
  expect(result.missingCatalog.reason).toBe('COMBAT_STRUCTURED_CATALOG_UNAVAILABLE');
  expect(result.missingCatalogRng).toBe(0);
});

test('concurrent attacks on a structured target remain serialized by the existing Combat queue', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { attackRequest, createStructuredCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const world = await createStructuredCombatActionWorld({ targetStructured: true, current: 10,
      max: 20, dice: [10, 3, 10, 3] });
    const second = attackRequest(); second.actionId = 'structured-action-2';
    const executions = await Promise.all([
      executeCombatAttack(attackRequest(), world.options), executeCombatAttack(second, world.options)
    ]);
    const durable = parsePageRecordContent(await world.original.readText(world.target.path));
    return { executions, health: durable.variablesJson.values['dnd.health'], effects: world.effects };
  });
  expect(result.executions.map(item => item.ok), JSON.stringify(result.executions)).toEqual([true, true]);
  expect(result.executions.map(item => item.resolution.health.after.hpCurrent)).toEqual([5, 0]);
  expect(result.health['dnd.hpCurrent']).toBe(0);
  expect(result.effects).toMatchObject({ writes: 2, appends: 2 });
});

test('structured attack and Undo share the existing target mutation queue', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { attackRequest, createStructuredCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { undoInput } = await import('/tests/fixtures/combatUndoFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { undoTransaction } = await import('/js/events/transactionReversal.js');
    const { EVENT_TRANSACTION_LOG_PATH } = await import('/js/events/eventStore.js');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const world = await createStructuredCombatActionWorld({ targetStructured: true, current: 10,
      max: 20, temp: 3, dice: [10, 3, 10, 3] });
    const originalAttack = await executeCombatAttack(attackRequest(), world.options);
    let release, entered, eventLogReads = 0;
    const hold = new Promise(resolve => { release = resolve; });
    const insideQueue = new Promise(resolve => { entered = resolve; });
    const readText = world.adapter.readText;
    world.adapter.readText = async path => {
      if (path === EVENT_TRANSACTION_LOG_PATH && ++eventLogReads === 2) {
        entered();
        await hold;
      }
      return readText(path);
    };
    const undoPromise = undoTransaction(undoInput(originalAttack.transactionId), {
      storageAdapter: world.adapter
    });
    await insideQueue;
    const nextRequest = attackRequest();
    nextRequest.actionId = 'structured-after-undo';
    const attackPromise = executeCombatAttack(nextRequest, world.options);
    await Promise.resolve();
    const whileWaiting = { writes: world.effects.writes, rolls: world.rng.consumed };
    release();
    const [undo, attack] = await Promise.all([undoPromise, attackPromise]);
    const durable = parsePageRecordContent(await world.original.readText(world.target.path));
    return { originalAttack, undo, attack, whileWaiting, effects: world.effects,
      health: durable.variablesJson.values['dnd.health'] };
  });

  expect(result.originalAttack.ok, JSON.stringify(result.originalAttack)).toBe(true);
  expect(result.whileWaiting).toEqual({ writes: 1, rolls: 2 });
  expect(result.undo.ok, JSON.stringify(result.undo)).toBe(true);
  expect(result.attack.ok, JSON.stringify(result.attack)).toBe(true);
  expect(result.attack.resolution.health.before).toEqual({ hpCurrent: 10, hpMax: 20, hpTemp: 3 });
  expect(result.attack.resolution.health.after).toEqual({ hpCurrent: 8, hpMax: 20, hpTemp: 0 });
  expect(result.health).toMatchObject({ 'dnd.hpCurrent': 8, 'dnd.hpMax': 20, 'dnd.hpTemporary': 0 });
  expect(result.effects).toMatchObject({ writes: 3, appends: 3 });
});

test('Undo compensates historical legacy evidence through the current structured owner', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { attackRequest, createCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { undoInput } = await import('/tests/fixtures/combatUndoFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { undoTransaction } = await import('/js/events/transactionReversal.js');
    const { BUNDLED_CARD_TYPE_DEFINITIONS: types,
      BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
    const { CARD_TYPE_CATALOG_PATH, createCardTypeRegistryFromCatalog,
      serializeCardTypeCatalog } = await import('/js/storage/cardTypeCatalogStorage.js');
    const { buildPageRecordContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { rebuildPageRepository } = await import('/js/repository/pageRepository.js');
    const world = await createCombatActionWorld({ current: 10, max: 20, temp: 0, dice: [10, 1] });
    const attack = await executeCombatAttack(attackRequest(), world.options);
    const legacyAfter = parsePageRecordContent(await world.original.readText(world.target.path));
    const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
    const registry = createCardTypeRegistryFromCatalog(catalog);
    await world.original.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
    const definition = registry.getResolvedType('character', 1);
    world.target.content = buildPageRecordContent({ id: world.target.id, schemaVersion: 2,
      type: 'character', template: 'card', body: legacyAfter.rawBody,
      variablesJson: { formatVersion: 1, schemaVersion: 1, schemaDigest: definition.digest,
        overrides: {}, values: {
          'dnd.level': 5,
          'dnd.health': { 'dnd.hpCurrent': 7, 'dnd.hpMax': 20, 'dnd.hpTemporary': 0,
            'character.health.formula': 'migration', 'character.health.hitDice': '5d8' },
          'dnd.armorClass': { 'dnd.armorClass.value': 12 }
        } }, now: '2026-09-28T00:00:00Z' });
    await world.original.writeText(world.target.path, world.target.content);
    rebuildPageRepository(world.pages);
    const undo = await undoTransaction(undoInput(attack.transactionId), { storageAdapter: world.adapter });
    const durable = parsePageRecordContent(await world.original.readText(world.target.path));
    return { attack, undo, health: durable.variablesJson.values['dnd.health'], body: durable.rawBody };
  });
  expect(result.attack.ok).toBe(true);
  expect(result.undo).toMatchObject({ ok: true, state: 'persisted', audit: 'durable' });
  expect(result.health).toMatchObject({ 'dnd.hpCurrent': 10, 'dnd.hpMax': 20, 'dnd.hpTemporary': 0,
    'character.health.formula': 'migration', 'character.health.hitDice': '5d8' });
  expect(result.body).toContain('data-property-name="hpCurrent"');
  expect(result.body).toContain('value="7"');
});

test('structured write remains durable when attack or Undo audit append is unconfirmed', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { attackRequest, createStructuredCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { undoInput } = await import('/tests/fixtures/combatUndoFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const { undoTransaction } = await import('/js/events/transactionReversal.js');
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');

    const attackFailureWorld = await createStructuredCombatActionWorld({ targetStructured: true,
      current: 8, max: 20, dice: [10, 1] });
    attackFailureWorld.adapter.appendText = async () => { throw new Error('structured attack audit failed'); };
    const attackFailure = await executeCombatAttack(attackRequest(), attackFailureWorld.options);
    const attackFailureHealth = parsePageRecordContent(
      await attackFailureWorld.original.readText(attackFailureWorld.target.path)
    ).variablesJson.values['dnd.health'];

    const undoFailureWorld = await createStructuredCombatActionWorld({ targetStructured: true,
      current: 10, max: 20, temp: 3, dice: [10, 3] });
    const attack = await executeCombatAttack(attackRequest(), undoFailureWorld.options);
    undoFailureWorld.adapter.appendText = async () => { throw new Error('structured undo audit failed'); };
    const undoFailure = await undoTransaction(undoInput(attack.transactionId), {
      storageAdapter: undoFailureWorld.adapter
    });
    const undoFailureHealth = parsePageRecordContent(
      await undoFailureWorld.original.readText(undoFailureWorld.target.path)
    ).variablesJson.values['dnd.health'];
    return { attackFailure, attackFailureHealth, attack, undoFailure, undoFailureHealth };
  });

  expect(result.attackFailure).toMatchObject({ ok: false, state: 'persisted', audit: 'unconfirmed' });
  expect(result.attackFailureHealth['dnd.hpCurrent']).toBe(5);
  expect(result.attack.ok).toBe(true);
  expect(result.undoFailure).toMatchObject({ ok: false, status: 'unconfirmed',
    state: 'persisted', audit: 'unconfirmed' });
  expect(result.undoFailureHealth).toMatchObject({
    'dnd.hpCurrent': 10, 'dnd.hpMax': 20, 'dnd.hpTemporary': 3
  });
});

test('existing Event History Undo control compensates a structured Combat target', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const { attackRequest, createStructuredCombatActionWorld } = await import('/tests/fixtures/combatActionFixtures.mjs');
    const { executeCombatAttack } = await import('/js/combat/combatActionPipeline.js');
    const world = await createStructuredCombatActionWorld({ targetStructured: true,
      current: 10, max: 20, temp: 3, dice: [10, 3] });
    const attack = await executeCombatAttack(attackRequest(), world.options);
    if (!attack.ok) throw new Error(JSON.stringify(attack));
    window.structuredCombatUiWorld = world;
  });
  await page.locator('#appToolsBtn').click();
  await page.getByRole('button', { name: /Журнал событий/ }).click();
  const popup = page.locator('#eventHistoryPopup');
  await popup.getByRole('button', { name: 'Отменить атаку' }).click();
  await expect(popup).toContainText('Отменено транзакцией');
  await expect(popup.getByRole('button', { name: 'Отменить атаку' })).toHaveCount(0);
  const health = await page.evaluate(async () => {
    const { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const world = window.structuredCombatUiWorld;
    return parsePageRecordContent(await world.original.readText(world.target.path))
      .variablesJson.values['dnd.health'];
  });
  expect(health).toMatchObject({ 'dnd.hpCurrent': 10, 'dnd.hpMax': 20, 'dnd.hpTemporary': 3 });
});
