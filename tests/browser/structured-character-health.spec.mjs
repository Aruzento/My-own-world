import {
  expect,
  test
} from '@playwright/test';


test(
  'structured Character health command persists through Variables without Properties dual-write',
  async ({ page }) => {
    await page.goto('/');

    const committed = await page.evaluate(async () => {
      const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
      const { BUNDLED_CARD_TYPE_DEFINITIONS: types, BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
      const { serializeCardTypeCatalog, createCardTypeRegistryFromCatalog, CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
      const { setStorageAdapter, captureStorageWorkspaceContext } = await import('/js/storage/storageAdapter.js');
      const { buildPageRecordContent, createPageStateIdentityFromContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
      const { setPages } = await import('/js/stateActions.js');
      const { prepareStructuredCharacterHealthChange, commitStructuredCharacterHealthChange } = await import('/js/character/structuredCharacterHealth.js');
      const { updatePageCharacterHealth } = await import('/js/properties/characterCalculations.js');

      const adapter = createMemoryStorageAdapter();
      setStorageAdapter(adapter);
      const catalog = {
        formatVersion: 1,
        revision: 1,
        types,
        fieldSets
      };
      const registry = createCardTypeRegistryFromCatalog(catalog);
      await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
      const body = `
        <section class="card-properties-block" data-block-type="properties" data-card-type="character">
          <input type="number" data-property-name="hpCurrent" value="99">
          <input type="number" data-property-name="hpMax" value="99">
          <input type="number" data-property-name="hpTemp" value="0">
        </section>
        <p>Body stays unchanged</p>
      `;
      const definition = registry.getResolvedType('character', 1);
      const content = buildPageRecordContent({
        id: 'structured-health-browser',
        schemaVersion: 2,
        type: 'character',
        template: 'card',
        body,
        variablesJson: {
          formatVersion: 1,
          schemaVersion: 1,
          schemaDigest: definition.digest,
          values: {
            'dnd.level': 5,
            'dnd.health': {
              'dnd.hpCurrent': 8,
              'dnd.hpMax': 20,
              'dnd.hpTemporary': 0,
              'character.health.formula': '5d8 + 10',
              'character.health.hitDice': '5d8'
            }
          },
          overrides: {}
        },
        now: '2026-09-27T00:00:00Z'
      });
      const record = createRuntimePageFromContent({
        content,
        path: '/pages/structured-health-browser.md',
        name: 'structured-health-browser.md'
      });
      await adapter.writeText(record.path, content);
      setPages([record]);
      const context = {
        registry,
        workspaceContext: captureStorageWorkspaceContext()
      };
      const plan = prepareStructuredCharacterHealthChange({
        pageId: record.id,
        expectedBase: createPageStateIdentityFromContent(record.content),
        request: { type: 'delta', delta: -3 },
        context
      });
      const result = await commitStructuredCharacterHealthChange(plan);
      const durable = await adapter.readText(record.path);
      const parsed = parsePageRecordContent(durable);
      const beforeLegacyAttempt = record.content;
      const legacyAttempt = updatePageCharacterHealth(record, { delta: -1 });

      return {
        durable,
        result,
        body,
        legacyAttempt,
        legacyAttemptPreserved: record.content === beforeLegacyAttempt,
        storedHealth: parsed.variablesJson.values['dnd.health']
      };
    });

    expect(committed.result.status, JSON.stringify(committed.result)).toBe('saved');
    expect(committed.result.verification.health).toEqual({
      current: 5,
      max: 20,
      temp: 0,
      percent: 0.25,
      isDown: false
    });
    expect(committed.storedHealth).toEqual({
      'dnd.hpCurrent': 5,
      'dnd.hpMax': 20,
      'dnd.hpTemporary': 0,
      'character.health.formula': '5d8 + 10',
      'character.health.hitDice': '5d8'
    });
    expect(committed.legacyAttempt).toBeNull();
    expect(committed.legacyAttemptPreserved).toBe(true);

    await page.reload();

    const reopened = await page.evaluate(async ({ durable }) => {
      const { createMemoryStorageAdapter } = await import('/tests/fixtures/editConflictFixtures.mjs');
      const { BUNDLED_CARD_TYPE_DEFINITIONS: types, BUNDLED_FIELD_SET_DEFINITIONS: fieldSets } = await import('/js/cardTypes/definitions/bundledDefinitions.js');
      const { serializeCardTypeCatalog, createCardTypeRegistryFromCatalog, CARD_TYPE_CATALOG_PATH } = await import('/js/storage/cardTypeCatalogStorage.js');
      const { setStorageAdapter, captureStorageWorkspaceContext } = await import('/js/storage/storageAdapter.js');
      const { createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
      const { setPages, setCurrentPage } = await import('/js/stateActions.js');
      const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
      const { renderUniversalCardInspector } = await import('/js/ui/cardInspector/universalCardInspector.js');
      const { getCharacterHealth, readCharacterModelFromPage } = await import('/js/character/characterModel.js');

      const adapter = createMemoryStorageAdapter();
      setStorageAdapter(adapter);
      const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
      const registry = createCardTypeRegistryFromCatalog(catalog);
      await adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
      const record = createRuntimePageFromContent({
        content: durable,
        path: '/pages/structured-health-browser.md',
        name: 'structured-health-browser.md'
      });
      await adapter.writeText(record.path, durable);
      setPages([record]);
      setCurrentPage(record);
      captureEditorPageBase(record, durable);
      const editor = document.getElementById('editorArea');
      editor.innerHTML = parsePageRecordContent(durable).rawBody;
      await renderUniversalCardInspector(record, {
        registry,
        editor,
        workspaceContext: captureStorageWorkspaceContext()
      });
      const { getUniversalCardInspectorState } = await import('/js/ui/cardInspector/universalCardInspector.js');
      const healthSection = getUniversalCardInspectorState().sections.find(section => section.fields.some(field => field.key === 'dnd.health'));
      document.getElementById(`inspector-tab-${healthSection.id}`)?.click();
      const model = readCharacterModelFromPage(record, {
        pages: [record],
        registry
      });

      return {
        source: model.source,
        health: getCharacterHealth(model),
        inspectorMode: document.querySelector('.card-inspector')?.dataset.sourceMode,
        inspectorCurrent: document.querySelector('[data-field-key$="dnd.hpCurrent"] input')?.value,
        body: parsePageRecordContent(record.content).rawBody
      };
    }, {
      durable: committed.durable
    });

    expect(reopened.source).toBe('entity');
    expect(reopened.health.current).toBe(5);
    expect(reopened.health.max).toBe(20);
    expect(reopened.inspectorMode).toBe('structured');
    expect(reopened.inspectorCurrent).toBe('5');
    expect(reopened.body).toContain('value="99"');
    expect(reopened.body).toContain('Body stays unchanged');
  }
);
