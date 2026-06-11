import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createListBlock,
  createPropertiesBlock
} from '../js/templates/blockTypes.js';

import {
  createLegacyPropertyReport
} from '../js/properties/propertiesLegacyBridge.js';

import {
  hasPropertyBlockDefinition
} from '../js/templates/propertyBlockDefinitions.js';

import {
  calculateAbilityModifier,
  calculateDndCheckValue,
  calculateProficiencyBonus
} from '../js/properties/characterCalculations.js';

import {
  createPropertiesModel,
  getPropertyNumber
} from '../js/properties/propertiesModel.js';

import {
  getPropertySchema
} from '../js/properties/propertySchemas.js';


test(
  'property block creates type-specific skill fields',
  () => {

    const html =
      createPropertiesBlock({
        title: 'Свойства',
        cardType: 'skill'
      });

    assert.match(
      html,
      /data-block-type="properties"/
    );

    assert.match(
      html,
      /data-card-type="skill"/
    );

    assert.match(
      html,
      /data-property-name="damage"/
    );

    assert.match(
      html,
      /data-property-name="effect"/
    );

    assert.match(
      html,
      /data-property-name="skillLevel"/
    );

    assert.match(
      html,
      /data-property-name="actionType"/
    );
  }
);


test(
  'character properties block uses the properties system instead of legacy DnD block',
  () => {

    const html =
      createPropertiesBlock({
        title: 'Свойства персонажа',
        cardType: 'character'
      });

    assert.match(
      html,
      /data-block-type="properties"/
    );

    assert.match(
      html,
      /data-card-type="character"/
    );

    assert.equal(
      html.includes('dnd-stats-block'),
      false
    );

    assert.match(
      html,
      /data-property-name="hpCurrent"/
    );
  }
);


test(
  'universal list block stores selected list kind in persistent HTML',
  () => {

    const html =
      createListBlock({
        title: 'Связанные сущности',
        kind: 'creatures'
      });

    assert.match(
      html,
      /data-block-type="list"/
    );

    assert.match(
      html,
      /data-list-kind="creatures"/
    );

    assert.match(
      html,
      /class="universal-list-list item-set-list"/
    );
  }
);


test(
  'property block definitions are available only for supported card types',
  () => {

    assert.equal(
      hasPropertyBlockDefinition('character'),
      true
    );

    assert.equal(
      hasPropertyBlockDefinition('item'),
      true
    );

    assert.equal(
      hasPropertyBlockDefinition('location'),
      true
    );

    assert.equal(
      hasPropertyBlockDefinition('region'),
      true
    );

    assert.equal(
      hasPropertyBlockDefinition('unknown'),
      false
    );
  }
);


test(
  'legacy property bridge reports old specialized blocks without converting them',
  () => {

    const report =
      createLegacyPropertyReport([
        {
          type: 'dndStats',
          title: 'Стат. блок DnD',
          target: 'properties',
          canAutoConvert: false
        },
        {
          type: 'spells',
          title: 'Заклинания',
          target: 'list',
          canAutoConvert: false
        }
      ]);

    assert.equal(
      report.hasLegacy,
      true
    );

    assert.deepEqual(
      report.items.map(item => item.target),
      [
        'properties',
        'list'
      ]
    );

    assert.equal(
      report.items[0].canAutoConvert,
      false
    );
  }
);


test(
  'property schemas cover the supported card types',
  () => {

    [
      'character',
      'creature',
      'object',
      'location',
      'region',
      'magic',
      'skill',
      'item'
    ]
      .forEach(type => {

        const schema =
          getPropertySchema(type);

        assert.equal(
          schema.cardType,
          type
        );

        assert.ok(
          schema.fields.length > 0
        );
      });
  }
);


test(
  'PropertiesModel normalizes number fields and keeps stable keys',
  () => {

    const model =
      createPropertiesModel({
        cardType: 'creature',
        values: {
          hpCurrent: '7',
          hpMax: '12',
          hpTemp: 'abc',
          speed: 30
        }
      });

    assert.equal(
      model.kind,
      'PropertiesModel'
    );

    assert.equal(
      getPropertyNumber(model, 'hpCurrent'),
      7
    );

    assert.equal(
      getPropertyNumber(model, 'hpMax'),
      12
    );

    assert.equal(
      getPropertyNumber(model, 'hpTemp', 0),
      0
    );
  }
);


test(
  'PropertiesModel keeps empty number fields empty instead of converting them to zero',
  () => {

    const model =
      createPropertiesModel({
        cardType: 'character',
        values: {
          hpCurrent: '',
          str: ''
        }
      });

    assert.equal(
      model.values.hpCurrent,
      ''
    );

    assert.equal(
      model.values.str,
      ''
    );
  }
);


test(
  'PropertiesModel reads custom user fields from properties block',
  () => {

    const model =
      createPropertiesModel({
        cardType: 'item',
        values: {
          customFields: {
            'custom-radius': {
              key: 'custom-radius',
              label: 'Радиус',
              type: 'number',
              value: '15'
            }
          }
        }
      });

    assert.deepEqual(
      model.customFields,
      [
        {
          key: 'custom-radius',
          label: 'Радиус',
          type: 'number',
          value: '15',
          source: 'custom'
        }
      ]
    );

    assert.equal(
      model.customValues['custom-radius'],
      '15'
    );
  }
);


test(
  'character calculation layer follows DnD modifier and proficiency rules',
  () => {

    assert.equal(
      calculateAbilityModifier(1),
      -5
    );

    assert.equal(
      calculateAbilityModifier(18),
      4
    );

    assert.equal(
      calculateAbilityModifier(30),
      10
    );

    assert.equal(
      calculateProficiencyBonus(1),
      2
    );

    assert.equal(
      calculateProficiencyBonus(9),
      4
    );

    assert.equal(
      calculateProficiencyBonus(20),
      6
    );

    assert.equal(
      calculateDndCheckValue({
        score: 16,
        proficient: true,
        proficiencyBonus: 3
      }),
      6
    );
  }
);
