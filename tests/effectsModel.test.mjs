import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addCharacterCondition,
  addCharacterEffect,
  createLinkedCharacterEffect,
  createSerializableEffectsData,
  createEffectsModel,
  getCharacterEffectSources,
  getCharacterEffectsSummary,
  hasCharacterCondition,
  removeCharacterCondition,
  removeCharacterEffect,
  toggleCharacterCondition
} from '../js/character/effectsModel.js';

import {
  createCharacterModel,
  getCharacterEffects,
  hasCharacterCondition as hasModelCondition
} from '../js/character/characterModel.js';


test(
  'EffectsModel normalizes conditions and calculates flags',
  () => {

    const effects =
      createEffectsModel({
        conditions: [
          'poisoned',
          {
            key: 'exhaustion',
            level: '7'
          },
          {
            key: 'unknown'
          }
        ],
        source: 'manual'
      });

    assert.equal(
      effects.source,
      'manual'
    );

    assert.deepEqual(
      effects.conditions.map(condition => [
        condition.key,
        condition.level
      ]),
      [
        ['poisoned', null],
        ['exhaustion', 6]
      ]
    );

    assert.equal(
      effects.flags.hasDisadvantageOnAttacks,
      true
    );

    assert.equal(
      effects.flags.exhaustionLevel,
      6
    );
  }
);


test(
  'EffectsModel serializes UI data and keeps source links for future systems',
  () => {

    const model =
      addCharacterEffect(
        addCharacterCondition(
          createEffectsModel(),
          'restrained'
        ),
        createLinkedCharacterEffect(
          {
            id: 'boots-speed',
            title: 'Сапоги скорости',
            modifiers: {
              speed: 10,
              initiative: 1
            }
          },
          {
            sourceType: 'item',
            sourcePageId: 'item-boots',
            sourcePackageId: 'core-pack',
            ruleId: 'speed-bonus'
          }
        )
      );

    const serializable =
      createSerializableEffectsData(
        model
      );

    const summary =
      getCharacterEffectsSummary(
        model
      );

    assert.deepEqual(
      getCharacterEffectSources(
        model
      ),
      [
        {
          sourceType: 'item',
          sourcePageId: 'item-boots',
          sourcePackageId: 'core-pack',
          ruleId: 'speed-bonus'
        }
      ]
    );

    assert.equal(
      serializable.conditions[0].label,
      'Опутан'
    );

    assert.equal(
      summary.modifiers.initiative,
      1
    );

    assert.equal(
      summary.conditionLabels[0],
      'Опутан'
    );
  }
);


test(
  'EffectsModel sums effect modifiers and supports add/remove operations',
  () => {

    const withBless =
      addCharacterEffect(
        createEffectsModel(),
        {
          id: 'bless',
          title: 'Благословение',
          sourceType: 'spell',
          modifiers: {
            initiative: 1,
            abilityChecks: {
              str: 2
            }
          },
          flags: {
            magical: true
          }
        }
      );

    const withShield =
      addCharacterEffect(
        withBless,
        {
          id: 'shield',
          title: 'Щит',
          modifiers: {
            armorClass: 5,
            abilityChecks: {
              str: 1,
              dex: 1
            }
          }
        }
      );

    assert.deepEqual(
      withShield.modifiers,
      {
        armorClass: 5,
        speed: 0,
        initiative: 1,
        proficiencyBonus: 0,
        abilityScores: {},
        abilityChecks: {
          str: 3,
          dex: 1
        },
        savingThrows: {},
        skills: {}
      }
    );

    const withoutBless =
      removeCharacterEffect(
        withShield,
        'bless'
      );

    assert.equal(
      withoutBless.effects.length,
      1
    );

    assert.equal(
      withoutBless.modifiers.initiative,
      0
    );
  }
);


test(
  'EffectsModel toggles and removes conditions by stable key',
  () => {

    const poisoned =
      addCharacterCondition(
        createEffectsModel(),
        'poisoned'
      );

    assert.equal(
      hasCharacterCondition(
        poisoned,
        'poisoned'
      ),
      true
    );

    const toggled =
      toggleCharacterCondition(
        poisoned,
        'poisoned'
      );

    assert.equal(
      hasCharacterCondition(
        toggled,
        'poisoned'
      ),
      false
    );

    const restrained =
      removeCharacterCondition(
        addCharacterCondition(
          toggled,
          'restrained'
        ),
        'restrained'
      );

    assert.equal(
      restrained.conditions.length,
      0
    );
  }
);


test(
  'CharacterModel exposes normalized effects as a submodel',
  () => {

    const character =
      createCharacterModel({
        effects: {
          conditions: [
            'stunned'
          ],
          effects: [
            {
              id: 'boots',
              title: 'Сапоги скорости',
              sourceType: 'item',
              modifiers: {
                speed: 10
              }
            }
          ],
          source: 'manual'
        }
      });

    assert.equal(
      hasModelCondition(
        character,
        'stunned'
      ),
      true
    );

    assert.equal(
      getCharacterEffects(
        character
      ).flags.isIncapacitated,
      true
    );

    assert.equal(
      getCharacterEffects(
        character
      ).modifiers.speed,
      10
    );
  }
);
