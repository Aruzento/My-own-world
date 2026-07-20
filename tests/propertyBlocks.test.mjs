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
  getPropertyValue,
  getPropertyNumber
} from '../js/properties/propertiesModel.js';

import {
  getPropertySchema,
  getPropertyValueFields
} from '../js/properties/propertySchemas.js';


function pickLayouts(
  layoutByName,
  names
) {

  return Object.fromEntries(
    names.map(name => [
      name,
      {
        x:
          layoutByName[name].x,
        y:
          layoutByName[name].y,
        w:
          layoutByName[name].w,
        h:
          layoutByName[name].h
      }
    ])
  );
}


function layoutsOverlap(
  first,
  second
) {

  return !(
    first.x + first.w <= second.x ||
    second.x + second.w <= first.x ||
    first.y + first.h <= second.y ||
    second.y + second.h <= first.y
  );
}


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

    assert.match(
      html,
      /data-property-name="proficiencyBonus"/
    );

    assert.match(
      html,
      /data-property-name="initiative"/
    );

    assert.match(
      html,
      /data-property-group-name="strSkills"/
    );

    assert.match(
      html,
      /data-property-name="skillAthletics"/
    );

    assert.match(
      html,
      /data-property-name="skillStealthProficient"/
    );
  }
);


test(
  'character properties block starts with readable sheet-like default layout',
  () => {

    const html =
      createPropertiesBlock({
        title: 'Свойства персонажа',
        cardType: 'character'
      });

    const layoutByName = {};

    [
      ...html.matchAll(
        /<(label|section)\b[^>]*class="[^"]*card-property-field[^"]*"[^>]*>/g
      )
    ].forEach(match => {

      const tag =
        match[0];

      const layoutMatch =
        tag.match(
          /data-property-layout='([^']+)'/
        );

      if (!layoutMatch) return;

      const idMatch =
        tag.match(
          /data-property-id="([^"]+)"/
        );

      let key =
        idMatch?.[1];

      if (!key) {

        const after =
          html.slice(
            match.index + tag.length,
            match.index + tag.length + 900
          );

        key =
          after.match(
            /data-property-name="([^"]+)"/
          )?.[1];
      }

      if (!key) return;

      layoutByName[key] =
        JSON.parse(
          layoutMatch[1]
        );
    });

    assert.deepEqual(
      pickLayouts(
        layoutByName,
        [
          'level',
          'proficiencyBonus',
          'initiative',
          'armorClass',
          'speed',
          'armorItem',
          'hpCurrent',
          'hpMax',
          'hpTemp'
        ]
      ),
      {
        level: {
          x: 0,
          y: 0,
          w: 2,
          h: 1
        },
        proficiencyBonus: {
          x: 2,
          y: 0,
          w: 2,
          h: 1
        },
        initiative: {
          x: 4,
          y: 0,
          w: 2,
          h: 1
        },
        armorClass: {
          x: 6,
          y: 0,
          w: 2,
          h: 1
        },
        speed: {
          x: 8,
          y: 0,
          w: 2,
          h: 1
        },
        armorItem: {
          x: 0,
          y: 1,
          w: 4,
          h: 1
        },
        hpCurrent: {
          x: 10,
          y: 0,
          w: 2,
          h: 1
        },
        hpMax: {
          x: 4,
          y: 1,
          w: 2,
          h: 1
        },
        hpTemp: {
          x: 6,
          y: 1,
          w: 3,
          h: 1
        }
      }
    );

    const abilityColumns = {
      str: 0,
      dex: 2,
      con: 4,
      int: 6,
      wis: 8,
      cha: 10
    };

    Object
      .entries(
        abilityColumns
      )
      .forEach(([name, x]) => {

      assert.equal(
        layoutByName[name].y,
        2
      );

      assert.equal(
        layoutByName[name].x,
        x
      );

      assert.equal(
        layoutByName[name].w,
        2
      );
    });

    assert.deepEqual(
      Object.fromEntries(
        [
          'strSkills',
          'dexSkills',
          'intSkills',
          'wisSkills',
          'conSkills',
          'chaSkills'
        ].map(name => [
          name,
          {
            x:
              layoutByName[name].x,
            y:
              layoutByName[name].y,
            w:
              layoutByName[name].w,
            h:
              layoutByName[name].h
          }
        ])
      ),
      {
        strSkills: {
          x: 0,
          y: 4,
          w: 4,
          h: 3
        },
        dexSkills: {
          x: 4,
          y: 4,
          w: 4,
          h: 4
        },
        intSkills: {
          x: 0,
          y: 8,
          w: 4,
          h: 5
        },
        wisSkills: {
          x: 4,
          y: 8,
          w: 4,
          h: 5
        },
        conSkills: {
          x: 8,
          y: 4,
          w: 4,
          h: 2
        },
        chaSkills: {
          x: 8,
          y: 8,
          w: 4,
          h: 5
        }
      }
    );

    assert.deepEqual(
      pickLayouts(
        layoutByName,
        [
          'deathSaveSuccesses',
          'deathSaveFailures'
        ]
      ),
      {
        deathSaveSuccesses: {
          x: 0,
          y: 13,
          w: 3,
          h: 1
        },
        deathSaveFailures: {
          x: 3,
          y: 13,
          w: 3,
          h: 1
        }
      }
    );

    Object
      .entries(
        layoutByName
      )
      .forEach(([name, layout]) => {

        assert.ok(
          layout.x >= 0 &&
          layout.y >= 0 &&
          layout.w >= 1 &&
          layout.x + layout.w <= 12,
          `${name} should fit inside the 12-column grid`
        );
      });

    const visibleLayouts =
      Object
        .entries(
          layoutByName
        );

    for (let first = 0; first < visibleLayouts.length; first += 1) {

      for (let second = first + 1; second < visibleLayouts.length; second += 1) {

        const [firstName, firstLayout] =
          visibleLayouts[first];

        const [secondName, secondLayout] =
          visibleLayouts[second];

        assert.equal(
          layoutsOverlap(
            firstLayout,
            secondLayout
          ),
          false,
          `${firstName} should not overlap ${secondName}`
        );
      }
    }
  }
);


test(
  'item armor properties render as one compound field with stable model keys',
  () => {

    const html =
      createPropertiesBlock({
        title: 'Свойства предмета',
        cardType: 'item'
      });

    assert.match(
      html,
      /data-property-id="armorProfile"/
    );

    assert.match(
      html,
      /data-property-compound-name="armorProfile"/
    );

    assert.match(
      html,
      /data-property-name="armorKind"/
    );

    assert.match(
      html,
      /data-property-name="armorBaseAc"/
    );

    assert.match(
      html,
      /data-property-name="armorDexMax"/
    );

    const fields =
      getPropertyValueFields(
        'item'
      );

    assert.ok(
      fields.some(field =>
        field.name === 'armorKind'
      )
    );

    assert.ok(
      fields.some(field =>
        field.name === 'armorBaseAc'
      )
    );

    assert.ok(
      fields.some(field =>
        field.name === 'armorDexMax'
      )
    );
  }
);


test(
  'character properties schema exposes grouped DnD skills as model values',
  () => {

    const fields =
      getPropertyValueFields(
        'character'
      );

    assert.ok(
      fields.some(field =>
        field.name === 'skillAthletics' &&
        field.type === 'number'
      )
    );

    assert.ok(
      fields.some(field =>
        field.name === 'skillAthleticsProficient' &&
        field.type === 'number'
      )
    );

    const model =
      createPropertiesModel({
        cardType: 'character',
        values: {
          skillAthletics: '5',
          skillAthleticsProficient: '2',
          skillStealth: '2'
        }
      });

    assert.equal(
      getPropertyNumber(
        model,
        'skillAthletics',
        0
      ),
      5
    );

    assert.equal(
      getPropertyValue(
        model,
        'skillAthleticsProficient',
        '0'
      ),
      '2'
    );

    assert.equal(
      getPropertyNumber(
        model,
        'skillStealth',
        0
      ),
      2
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
          layout: {
            x: 0,
            y: 0,
            w: 4,
            h: 1,
            order: 0,
            collapsed: false,
            groupId: null
          },
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
  'PropertiesModel keeps model-first layout in normalized data',
  () => {

    const model =
      createPropertiesModel({
        cardType: 'item',
        values: {
          gold: '10',
          layout: {
            gold: {
              x: 3,
              y: 2,
              w: 4,
              h: 2,
              order: 1,
              collapsed: false,
              groupId: null
            },
            'custom-radius': {
              x: 0,
              y: 3,
              w: 6,
              h: 1,
              order: 2,
              collapsed: false,
              groupId: 'combat'
            }
          },
          customFields: {
            'custom-radius': {
              key: 'custom-radius',
              label: 'Радиус',
              type: 'number',
              value: '15',
              layout: {
                x: 0,
                y: 3,
                w: 6,
                h: 1,
                order: 2,
                collapsed: false,
                groupId: 'combat'
              }
            }
          }
        }
      });

    assert.deepEqual(
      model.layout.gold,
      {
        x: 3,
        y: 2,
        w: 4,
        h: 2,
        order: 1,
        collapsed: false,
        groupId: null
      }
    );

    assert.deepEqual(
      model.customFields[0].layout,
      {
        x: 0,
        y: 3,
        w: 6,
        h: 1,
        order: 2,
        collapsed: false,
        groupId: 'combat'
      }
    );
  }
);


test(
  'PropertiesModel exposes manual calculation overrides without custom field UI',
  () => {

    const model =
      createPropertiesModel({
        cardType: 'character',
        values: {
          initiative: '8',
          manualOverrides: {
            'override-initiative': '8'
          }
        }
      });

    assert.deepEqual(
      model.manualOverrides,
      {
        'override-initiative': '8'
      }
    );

    assert.equal(
      model.customValues['override-initiative'],
      '8'
    );

    assert.equal(
      model.customFields.length,
      0
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
