import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEffectsModel
} from '../js/character/effectsModel.js';

import {
  createPropertiesCalculationModel,
  calculateDndArmorClass,
  createManualOverride,
  getArmorItemPages,
  resolveCalculatedProperty
} from '../js/properties/propertiesCalculationEngine.js';

import {
  createPropertiesModel
} from '../js/properties/propertiesModel.js';


test(
  'PropertiesCalculationModel explains DnD derived values from properties and effects',
  () => {

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          level: '9',
          armorClass: '15',
          speed: '30',
          hpCurrent: '12',
          hpMax: '20',
          hpTemp: '3',
          dex: '16'
        }
      });

    const effects =
      createEffectsModel({
        effects: [
          {
            id: 'haste',
            title: 'Ускорение',
            modifiers: {
              armorClass: 2,
              speed: 10,
              initiative: 1
            }
          }
        ]
      });

    const model =
      createPropertiesCalculationModel({
        propertiesModel:
          properties,
        effectsModel:
          effects
      });

    assert.equal(
      model.kind,
      'PropertiesCalculationModel'
    );

    assert.equal(
      model.proficiencyBonus.value,
      4
    );

    assert.equal(
      model.abilityModifiers.dex.value,
      3
    );

    assert.equal(
      model.initiative.value,
      4
    );

    assert.equal(
      model.armorClass.value,
      17
    );

    assert.equal(
      model.speed.value,
      40
    );

    assert.equal(
      model.health.value.percent,
      0.6
    );

    assert.equal(
      model.byKey.initiative.formula,
      'dexModifier + effects.initiative'
    );
  }
);


test(
  'PropertiesCalculationModel calculates DnD skills and armor from properties',
  () => {

    const armorPage = {
      id: 'studded-leather',
      title: 'Проклепанная кожа',
      type: 'item',
      propertiesModels: [
        createPropertiesModel({
          cardType: 'item',
          values: {
            armorKind: 'Легкий',
            armorBaseAc: '12'
          }
        })
      ]
    };

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          level: '5',
          dex: '16',
          armorItem: 'Проклепанная кожа',
          skillStealthProficient: true
        }
      });

    const model =
      createPropertiesCalculationModel({
        propertiesModel:
          properties,
        pages: [
          armorPage
        ]
      });

    assert.equal(
      model.armorClass.value,
      15
    );

    assert.equal(
      model.checks.byKey.skillStealth.value,
      6
    );

    assert.equal(
      model.byKey.skillStealth.value,
      6
    );
  }
);


test(
  'armor item helpers expose only item cards with armor type in Properties',
  () => {

    const armorPage = {
      id: 'chain-shirt',
      title: 'Chain Shirt',
      type: 'item',
      propertiesModels: [
        createPropertiesModel({
          cardType: 'item',
          values: {
            armorKind: 'Легкий',
            armorBaseAc: '13'
          }
        })
      ]
    };

    const ordinaryItemPage = {
      id: 'torch',
      title: 'Torch',
      type: 'item',
      propertiesModels: [
        createPropertiesModel({
          cardType: 'item',
          values: {
            armorKind: 'Нет',
            armorBaseAc: '99'
          }
        })
      ]
    };

    const notePage = {
      id: 'armor-note',
      title: 'Armor note',
      type: 'note'
    };

    assert.deepEqual(
      getArmorItemPages([
        ordinaryItemPage,
        armorPage,
        notePage
      ]).map(page => page.id),
      [
        'chain-shirt'
      ]
    );
  }
);


test(
  'PropertiesCalculationModel ignores armorItem references to non-armor items',
  () => {

    const ordinaryItemPage = {
      id: 'magic-ring',
      title: 'Magic Ring',
      type: 'item',
      propertiesModels: [
        createPropertiesModel({
          cardType: 'item',
          values: {
            armorKind: 'Нет',
            armorBaseAc: '99'
          }
        })
      ]
    };

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          dex: '16',
          armorClass: '',
          armorItem: 'magic-ring'
        }
      });

    const model =
      createPropertiesCalculationModel({
        propertiesModel:
          properties,
        pages: [
          ordinaryItemPage
        ]
      });

    assert.equal(
      model.armorClass.value,
      13
    );
  }
);


test(
  'calculateDndArmorClass follows basic DnD armor rules',
  () => {

    assert.equal(
      calculateDndArmorClass({
        dexModifier: 4
      }),
      14
    );

    assert.equal(
      calculateDndArmorClass({
        dexModifier: 4,
        armorKind: 'Средний',
        armorBaseAc: 14
      }),
      16
    );

    assert.equal(
      calculateDndArmorClass({
        dexModifier: 4,
        armorKind: 'Тяжелый',
        armorBaseAc: 18
      }),
      18
    );
    assert.equal(
      calculateDndArmorClass({
        dexModifier: 2,
        armorKind: 'Легкий',
        armorBaseAc: 11
      }),
      13
    );
  }
);


test(
  'calculated property uses manual override until override is cleared',
  () => {

    const manual =
      resolveCalculatedProperty({
        key: 'initiative',
        calculatedValue: 3,
        override:
          createManualOverride(
            '7'
          )
      });

    assert.equal(
      manual.value,
      7
    );

    assert.equal(
      manual.source,
      'manual'
    );

    const automatic =
      resolveCalculatedProperty({
        key: 'initiative',
        calculatedValue: 3,
        override:
          createManualOverride(
            ''
          )
      });

    assert.equal(
      automatic.value,
      3
    );

    assert.equal(
      automatic.source,
      'calculated'
    );
  }
);


test(
  'PropertiesCalculationModel treats empty numeric properties as defaults',
  () => {

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          level: '',
          armorClass: '',
          speed: '',
          hpCurrent: '',
          hpMax: '',
          dex: ''
        }
      });

    const model =
      createPropertiesCalculationModel({
        propertiesModel:
          properties
      });

    assert.equal(
      model.level.value,
      1
    );

    assert.equal(
      model.proficiencyBonus.value,
      2
    );

    assert.equal(
      model.armorClass.value,
      10
    );

    assert.equal(
      model.speed.value,
      30
    );

    assert.equal(
      model.abilityModifiers.dex.value,
      0
    );

    assert.equal(
      model.health.value.max,
      10
    );
  }
);
