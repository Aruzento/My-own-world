import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCharacterModelFromSources,
  getCharacterEffectiveArmorClass,
  getCharacterEffectiveSpeed,
  getCharacterInitiativeModifier
} from '../js/character/characterModel.js';

import {
  createRuleTreeCharacterEffect,
  createWorldPackageCharacterEffect
} from '../js/character/characterIntegrationApi.js';

import {
  createPropertiesModel
} from '../js/properties/propertiesModel.js';


test(
  'CharacterModel accepts Rule Tree and World Package effects through integration API',
  () => {

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          armorClass: '14',
          speed: '30',
          dex: '16'
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
        ],
        integrations: {
          ruleEffects: [
            createRuleTreeCharacterEffect({
              ruleId: 'fighting-style-defense',
              title: 'Оборона',
              modifiers: {
                armorClass: 1
              }
            })
          ],
          worldPackageEffects: [
            createWorldPackageCharacterEffect({
              sourcePackageId: 'core-dnd',
              ruleId: 'fast-travel-training',
              title: 'Легкий шаг',
              modifiers: {
                speed: 5,
                initiative: 2
              }
            })
          ]
        }
      });

    assert.equal(
      model.sources.integrations,
      true
    );

    assert.equal(
      getCharacterEffectiveArmorClass(
        model
      ),
      15
    );

    assert.equal(
      getCharacterEffectiveSpeed(
        model
      ),
      35
    );

    assert.equal(
      getCharacterInitiativeModifier(
        model
      ),
      5
    );

    assert.deepEqual(
      model.effects.effects.map(effect => effect.sourceType),
      [
        'rule',
        'world-package'
      ]
    );
  }
);


test(
  'CharacterModel applies selected Rule Tree page effects through provider',
  () => {

    const properties =
      createPropertiesModel({
        cardType: 'character',
        values: {
          armorClass: '13',
          speed: '30',
          dex: '12'
        }
      });

    const rulePage = {
      id: 'rule-defense-style',
      title: 'Боевой стиль: оборона',
      tags: [
        'rule'
      ],
      content: `
        <script type="application/json" data-character-effects>
          {
            "effects": [
              {
                "id": "defense",
                "title": "Оборона",
                "modifiers": {
                  "armorClass": 1,
                  "initiative": 1
                }
              }
            ]
          }
        </script>
      `
    };

    const model =
      createCharacterModelFromSources({
        page: {
          id: 'hero',
          type: 'character'
        },
        pages: [
          rulePage
        ],
        selectedRuleIds: [
          'rule-defense-style'
        ],
        propertiesModels: [
          properties
        ]
      });

    assert.equal(
      getCharacterEffectiveArmorClass(
        model
      ),
      14
    );

    assert.equal(
      getCharacterInitiativeModifier(
        model
      ),
      2
    );

    assert.equal(
      model.effects.effects[0].ruleId,
      'rule-defense-style'
    );
  }
);
