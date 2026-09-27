import {
  expect,
  test
} from '@playwright/test';


test(
  'structured Character Inspector reload feeds CharacterModel from Entity API without Properties fallback',
  async ({ page }) => {
    await page.goto('/');

    const first = await page.evaluate(async () => {
      const { CardTypeRegistry } = await import('/js/cardTypes/cardTypeRegistry.js');
      const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
      const { setPages, setCurrentPage } = await import('/js/stateActions.js');
      const { captureEditorPageBase } = await import('/js/editor/editorSessionBase.js');
      const { renderUniversalCardInspector } = await import('/js/ui/cardInspector/universalCardInspector.js');
      const {
        getCharacterEffectiveArmorClass,
        getCharacterEffectiveSpeed,
        getCharacterHealth,
        getCharacterInitiativeModifier,
        readCharacterModelFromPage
      } = await import('/js/character/characterModel.js');
      const { updatePageCharacterHealth } = await import('/js/properties/characterCalculations.js');
      const { getCampaignMapCharacterState } = await import('/js/editor/campaignMapCharacterBridge.js');

      const registry = new CardTypeRegistry();
      const definition = registry.getResolvedType('character', 1);
      const body = `
        <section class="card-properties-block" data-block-type="properties" data-card-type="character">
          <input data-property-name="hpCurrent" value="99">
          <input data-property-name="hpMax" value="99">
          <input data-property-name="armorClass" value="99">
          <input data-property-name="speed" value="99">
          <input data-property-name="dex" value="30">
        </section>
        <script type="application/json" data-character-effects>
          {"effects":[{"id":"structured-read-effect","title":"Read effect","modifiers":{"armorClass":1,"initiative":1,"speed":5}}]}
        </script>
      `;
      const content = buildPageRecordContent({
        id: 'structured-character-browser',
        schemaVersion: 2,
        type: 'character',
        body,
        variablesJson: {
          formatVersion: 1,
          schemaVersion: 1,
          schemaDigest: definition.digest,
          values: {
            'dnd.level': 9,
            'dnd.proficiencyBonus': 4,
            'character.abilities': {
              'character.abilities.strength': 8,
              'character.abilities.dexterity': 14,
              'character.abilities.constitution': 16,
              'character.abilities.intelligence': 12,
              'character.abilities.wisdom': 10,
              'character.abilities.charisma': 18
            },
            'dnd.health': {
              'dnd.hpCurrent': 8,
              'dnd.hpMax': 20,
              'dnd.hpTemporary': 3
            },
            'dnd.armorClass': {
              'dnd.armorClass.value': 14
            },
            'dnd.initiative': {
              'dnd.initiative.modifier': 2,
              'dnd.initiative.bonus': 0,
              'dnd.initiative.mode': 'normal'
            },
            'dnd.movement': [{
              'dnd.movement.rowId': 'walk-browser',
              'dnd.movement.type': 'walk',
              'dnd.movement.speed': 30,
              'dnd.movement.units': 'feet'
            }]
          }
        },
        now: '2026-09-27T00:00:00Z'
      });
      const record = createRuntimePageFromContent({
        content,
        path: '/pages/structured-character-browser.md',
        name: 'structured-character-browser.md'
      });
      setPages([record]);
      setCurrentPage(record);
      captureEditorPageBase(record, content);
      const editor = document.getElementById('editorArea');
      editor.innerHTML = parsePageRecordContent(content).body;
      await renderUniversalCardInspector(record, {
        registry,
        editor
      });
      const model = readCharacterModelFromPage(record, {
        pages: [record],
        registry
      });
      const beforeLegacyWriteAttempt = record.content;
      const legacyWriteAttempt = updatePageCharacterHealth(
        record,
        { delta: -1 }
      );

      return {
        content,
        inspectorMode: document.querySelector('.card-inspector')?.dataset.sourceMode,
        source: model.source,
        properties: model.sources.properties,
        entity: model.sources.entity,
        health: getCharacterHealth(model),
        armorClass: getCharacterEffectiveArmorClass(model),
        initiative: getCharacterInitiativeModifier(model),
        speed: getCharacterEffectiveSpeed(model),
        effectOwner: model.effects.source,
        legacyWriteAttempt,
        bodyUnchanged: record.content === beforeLegacyWriteAttempt,
        mapBridgeState: getCampaignMapCharacterState(record)
      };
    });

    expect(first.inspectorMode).toBe('structured');
    expect(first.source).toBe('entity');
    expect(first.properties).toBe(false);
    expect(first.entity).toBe(true);
    expect(first.health.current).toBe(8);
    expect(first.health.max).toBe(20);
    expect(first.armorClass).toBe(15);
    expect(first.initiative).toBe(3);
    expect(first.speed).toBe(35);
    expect(first.effectOwner).not.toBe('empty');
    expect(first.legacyWriteAttempt).toBeNull();
    expect(first.bodyUnchanged).toBe(true);
    expect(first.mapBridgeState).toBeNull();

    await page.reload();
    const reopened = await page.evaluate(async content => {
      const { CardTypeRegistry } = await import('/js/cardTypes/cardTypeRegistry.js');
      const { createRuntimePageFromContent } = await import('/js/core/pageRecord.js');
      const { setPages } = await import('/js/stateActions.js');
      const {
        getCharacterHealth,
        readCharacterModelFromPage
      } = await import('/js/character/characterModel.js');
      const registry = new CardTypeRegistry();
      const record = createRuntimePageFromContent({
        content,
        path: '/pages/structured-character-browser.md',
        name: 'structured-character-browser.md'
      });
      setPages([record]);
      const model = readCharacterModelFromPage(record, {
        pages: [record],
        registry
      });
      return {
        source: model.source,
        properties: model.sources.properties,
        health: getCharacterHealth(model),
        schemaDigest: model.provenance.entity.schemaDigest
      };
    }, first.content);

    expect(reopened.source).toBe('entity');
    expect(reopened.properties).toBe(false);
    expect(reopened.health.current).toBe(8);
    expect(reopened.schemaDigest).toMatch(/^sha256:/);
  }
);
