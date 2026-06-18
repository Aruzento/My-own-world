import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPropertiesModel
} from '../js/properties/propertiesModel.js';

import {
  createCardVariablesFromPropertiesModel,
  getCardVariable,
  getCardVariableValue
} from '../js/properties/cardVariablesModel.js';

import {
  calculateCardVariableFormula,
  createCardVariableDependencyContext,
  resolveCardVariablePath
} from '../js/properties/cardVariableDependencies.js';


test(
  'CardVariablesModel treats PropertiesModel fields as entity variables',
  () => {

    const properties =
      createPropertiesModel({
        cardType: 'item',
        values: {
          gold: '12',
          silver: '5',
          effect: 'Даёт свет в темноте'
        }
      });

    const variables =
      createCardVariablesFromPropertiesModel({
        pageId: 'torch',
        propertiesModel:
          properties
      });

    assert.equal(
      variables.kind,
      'CardVariablesModel'
    );

    assert.equal(
      variables.cardType,
      'item'
    );

    assert.equal(
      getCardVariableValue(
        variables,
        'gold'
      ),
      12
    );

    assert.equal(
      getCardVariable(
        variables,
        'effect'
      ).label,
      'Эффект'
    );

    assert.equal(
      getCardVariableValue(
        variables,
        'effect'
      ),
      'Даёт свет в темноте'
    );
  }
);


test(
  'CardVariablesModel preserves empty numeric variables as null',
  () => {

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          level: '',
          dex: '16'
        }
      });

    const variables =
      createCardVariablesFromPropertiesModel({
        propertiesModel:
          properties
      });

    assert.equal(
      getCardVariableValue(
        variables,
        'level'
      ),
      null
    );

    assert.equal(
      getCardVariableValue(
        variables,
        'dex'
      ),
      16
    );
  }
);


test(
  'CardVariablesModel includes custom properties as variables',
  () => {

    const properties =
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

    const variables =
      createCardVariablesFromPropertiesModel({
        propertiesModel:
          properties
      });

    assert.equal(
      getCardVariableValue(
        variables,
        'custom-radius'
      ),
      15
    );

    assert.equal(
      getCardVariable(
        variables,
        'custom-radius'
      ).source,
      'custom'
    );
  }
);


test(
  'CardVariablesModel exposes grouped DnD skill values',
  () => {

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          skillStealth: '4',
          skillStealthProficient: '2'
        }
      });

    const variables =
      createCardVariablesFromPropertiesModel({
        propertiesModel:
          properties
      });

    assert.equal(
      getCardVariableValue(
        variables,
        'skillStealth'
      ),
      4
    );

    assert.equal(
      getCardVariableValue(
        variables,
        'skillStealthProficient'
      ),
      2
    );
  }
);


test(
  'card variable dependencies resolve referenced card properties',
  () => {

    const racePage = {
      id: 'human',
      title: 'Человек',
      type: 'character',
      aliases: [
        'human'
      ]
    };

    const heroPage = {
      id: 'hero',
      title: 'Герой',
      type: 'character',
      content: ''
    };

    racePage.variablesModel =
      createCardVariablesFromPropertiesModel({
        pageId:
          racePage.id,
        cardType:
          racePage.type,
        propertiesModel:
          createPropertiesModel({
            cardType: 'character',
            values: {
              str: '1',
              dex: '2'
            }
          })
      });

    heroPage.variablesModel =
      createCardVariablesFromPropertiesModel({
        pageId:
          heroPage.id,
        cardType:
          heroPage.type,
        propertiesModel:
          createPropertiesModel({
            cardType: 'character',
            values: {
              str: '10',
              customFields: {
                race: {
                  key: 'race',
                  label: 'Раса',
                  type: 'text',
                  value: 'human'
                }
              }
            }
          })
      });

    const context =
      createCardVariableDependencyContext({
        page:
          heroPage,
        pages: [
          heroPage,
          racePage
        ]
      });

    const raceStrength =
      resolveCardVariablePath(
        context,
        'race.str'
      );

    assert.equal(
      raceStrength.value,
      1
    );

    assert.equal(
      raceStrength.sourcePageId,
      'human'
    );

    const calculation =
      calculateCardVariableFormula({
        key: 'totalStr',
        label: 'Итоговая СИЛ',
        formula: 'self.str + race.str + 2',
        context
      });

    assert.equal(
      calculation.value,
      13
    );

    assert.equal(
      calculation.parts.length,
      3
    );

    assert.deepEqual(
      calculation.diagnostics,
      []
    );
  }
);


test(
  'card variable dependency calculation reports missing variables',
  () => {

    const context =
      createCardVariableDependencyContext({
        page: {
          id: 'hero',
          type: 'character',
          content: ''
        },
        pages: []
      });

    const calculation =
      calculateCardVariableFormula({
        key: 'broken',
        formula: 'self.str + race.str',
        context
      });

    assert.equal(
      calculation.source,
      'partial'
    );

    assert.equal(
      calculation.diagnostics.length,
      2
    );
  }
);
