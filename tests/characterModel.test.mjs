import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyCharacterHealthChange,
  calculateAbilityModifier,
  calculateDndCheckValue,
  calculateProficiencyBonus,
  createCharacterModel,
  createCharacterModelFromSources,
  getCharacterInitiativeModifier,
  getCharacterHealth
} from '../js/character/characterModel.js';

import {
  createPropertiesModel
} from '../js/properties/propertiesModel.js';

import {
  getPageCharacterHealth
} from '../js/properties/characterCalculations.js';


test(
  'CharacterModel builds from PropertiesModel with abilities, HP and proficiency',
  () => {

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          level: '9',
          armorClass: '16',
          hpCurrent: '24',
          hpMax: '30',
          hpTemp: '5',
          speed: '35',
          str: '8',
          dex: '16',
          con: '14',
          int: '12',
          wis: '10',
          cha: '18',
          deathSaveFailures: '2'
        }
      });

    const model =
      createCharacterModelFromSources({
        page: {
          id: 'hero',
          type: 'character'
        },
        propertiesModels: [
          properties
        ]
      });

    assert.equal(
      model.kind,
      'CharacterModel'
    );

    assert.equal(
      model.source,
      'properties'
    );

    assert.equal(
      model.proficiencyBonus,
      4
    );

    assert.equal(
      model.abilities.dex.modifier,
      3
    );

    assert.equal(
      getCharacterInitiativeModifier(
        model
      ),
      3
    );

    assert.deepEqual(
      getCharacterHealth(
        model
      ),
      {
        current: 24,
        max: 30,
        temp: 5,
        percent: 0.8,
        isDown: false,
        source: 'properties'
      }
    );

    assert.equal(
      model.deathSaves.failures,
      2
    );
  }
);


test(
  'CharacterModel falls back to legacy DnD health when properties are missing',
  () => {

    const model =
      createCharacterModelFromSources({
        page: {
          id: 'goblin',
          type: 'creature'
        },
        legacyDndHealth: {
          current: 3,
          max: 7,
          temp: 1
        }
      });

    assert.equal(
      model.cardType,
      'creature'
    );

    assert.equal(
      model.source,
      'legacy-dnd'
    );

    assert.equal(
      model.sources.legacyDnd,
      true
    );

    assert.equal(
      model.health.percent,
      3 / 7
    );
  }
);


test(
  'CharacterModel treats empty property fields as missing values, not as zeroes',
  () => {

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          hpCurrent: '',
          hpMax: '',
          str: '',
          dex: ''
        }
      });

    const model =
      createCharacterModelFromSources({
        page: {
          id: 'blank-character',
          type: 'character'
        },
        propertiesModels: [
          properties
        ]
      });

    assert.equal(
      model.health.current,
      10
    );

    assert.equal(
      model.health.max,
      10
    );

    assert.equal(
      model.abilities.str.score,
      10
    );

    assert.equal(
      model.abilities.dex.modifier,
      0
    );
  }
);


test(
  'CharacterModel health changes spend temp HP before current HP',
  () => {

    const model =
      createCharacterModel({
        health: {
          current: 10,
          max: 10,
          temp: 4
        }
      });

    const damaged =
      applyCharacterHealthChange(
        model,
        {
          delta: -6
        }
      );

    assert.equal(
      damaged.health.temp,
      0
    );

    assert.equal(
      damaged.health.current,
      8
    );

    const killed =
      applyCharacterHealthChange(
        damaged,
        {
          mode: 'kill'
        }
      );

    assert.equal(
      killed.health.current,
      0
    );

    assert.equal(
      killed.health.isDown,
      true
    );
  }
);


test(
  'CharacterModel exposes DnD modifiers and proficiency rules',
  () => {

    assert.equal(
      calculateAbilityModifier(1),
      -5
    );

    assert.equal(
      calculateAbilityModifier(30),
      10
    );

    assert.equal(
      calculateProficiencyBonus(17),
      6
    );

    assert.equal(
      calculateDndCheckValue({
        score: 18,
        proficient: true,
        proficiencyBonus: 4
      }),
      8
    );
  }
);


test(
  'character calculation facade does not invent HP for pages without character data',
  () => {

    assert.equal(
      getPageCharacterHealth({
        id: 'note',
        type: 'note',
        content: '<p>no stats</p>'
      }),
      null
    );
  }
);
