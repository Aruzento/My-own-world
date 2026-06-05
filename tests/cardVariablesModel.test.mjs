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
