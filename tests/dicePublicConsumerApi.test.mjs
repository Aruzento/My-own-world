import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DICE_CRITICAL_POLICIES,
  DICE_ENGINE_PUBLIC_API_VERSION,
  DICE_ROLL_MODES,
  DiceFormulaEvaluationError,
  rollDice,
  validateDiceRoll
} from '../js/dice/diceEngine.js';


function createConsumerSequenceRandomInt(
  values
) {

  const calls =
    [];

  let index =
    0;

  return {
    calls,
    randomInt(
      minInclusive,
      maxInclusive
    ) {

      calls.push([
        minInclusive,
        maxInclusive
      ]);

      const value =
        values[index];

      index += 1;

      return value;
    }
  };
}


function rollAsConsumer(
  request,
  sequence
) {

  const rng =
    createConsumerSequenceRandomInt(
      sequence
    );

  const result =
    rollDice(
      request,
      {
        randomInt:
          rng.randomInt
      }
    );

  return {
    result,
    rng
  };
}


test(
  'public Dice Engine facade exposes stable consumer constants',
  () => {

    assert.equal(
      DICE_ENGINE_PUBLIC_API_VERSION,
      1
    );

    assert.deepEqual(
      DICE_ROLL_MODES,
      [
        'normal',
        'advantage',
        'disadvantage'
      ]
    );

    assert.deepEqual(
      DICE_CRITICAL_POLICIES,
      [
        'none',
        'd20-natural'
      ]
    );

    assert.equal(
      Object.isFrozen(
        DICE_ROLL_MODES
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        DICE_CRITICAL_POLICIES
      ),
      true
    );
  }
);


test(
  'public Dice Engine facade serves initiative ability check damage and random table consumers',
  () => {

    const initiative =
      rollAsConsumer(
        {
          formula:
            'd20 + 3',
          mode:
            'normal',
          criticalPolicy:
            'none'
        },
        [
          14
        ]
      );

    assert.equal(
      initiative.result.total,
      17
    );

    assert.deepEqual(
      initiative.result.dice[0].faces,
      [
        14
      ]
    );

    assert.deepEqual(
      initiative.result.critical,
      {
        policy:
          'none',
        kind:
          'none'
      }
    );

    const abilityCheck =
      rollAsConsumer(
        {
          formula:
            'd20 + 5',
          mode:
            'advantage',
          criticalPolicy:
            'd20-natural'
        },
        [
          7,
          20
        ]
      );

    assert.equal(
      abilityCheck.result.total,
      25
    );

    assert.equal(
      abilityCheck.result.dice[0].selection.selectedNatural,
      20
    );

    assert.equal(
      abilityCheck.result.critical.kind,
      'success'
    );

    const damage =
      rollAsConsumer(
        {
          formula:
            '2d6 + 1d4 + 3',
          mode:
            'normal',
          criticalPolicy:
            'none'
        },
        [
          2,
          5,
          4
        ]
      );

    assert.equal(
      damage.result.total,
      14
    );

    assert.deepEqual(
      damage.result.dice.map(
        diceTerm => ({
          notation:
            diceTerm.notation,
          faces:
            diceTerm.faces
        })
      ),
      [
        {
          notation:
            '2d6',
          faces:
            [
              2,
              5
            ]
        },
        {
          notation:
            '1d4',
          faces:
            [
              4
            ]
        }
      ]
    );

    const randomTable =
      rollAsConsumer(
        {
          formula:
            'd100',
          mode:
            'normal',
          criticalPolicy:
            'none'
        },
        [
          88
        ]
      );

    assert.equal(
      randomTable.result.total,
      88
    );

    assert.deepEqual(
      randomTable.rng.calls,
      [
        [
          1,
          100
        ]
      ]
    );
  }
);


test(
  'public validation reports request safety without rolling dice',
  () => {

    const valid =
      validateDiceRoll({
        formula:
          '2d6 + 3',
        mode:
          'normal',
        criticalPolicy:
          'none'
      });

    assert.deepEqual(
      valid,
      {
        kind:
          'dice-roll-validation',
        version:
          1,
        ok:
          true,
        request: {
          formulaOriginal:
            '2d6 + 3',
          formulaNormalized:
            '2d6+3',
          mode:
            'normal',
          criticalPolicy:
            'none'
        }
      }
    );

    const invalidFormula =
      validateDiceRoll({
        formula:
          'foo'
      });

    assert.equal(
      invalidFormula.ok,
      false
    );

    assert.equal(
      invalidFormula.error.code,
      'DICE_FORMULA_SYNTAX_ERROR'
    );

    const overLimit =
      validateDiceRoll({
        formula:
          '1001d6'
      });

    assert.equal(
      overLimit.ok,
      false
    );

    assert.equal(
      overLimit.error.classification,
      'LIMIT_EXCEEDED'
    );

    assert.equal(
      overLimit.error.limitKind,
      'MAX_DICE_PER_TERM'
    );

    const unsupportedModeFormula =
      validateDiceRoll({
        formula:
          'd20 + d4',
        mode:
          'advantage'
      });

    assert.equal(
      unsupportedModeFormula.ok,
      false
    );

    assert.equal(
      unsupportedModeFormula.error.classification,
      'UNSUPPORTED_MODE_FORMULA'
    );
  }
);


test(
  'public API errors distinguish unsupported options and RNG failures without parsing messages',
  () => {

    const unsupportedMode =
      validateDiceRoll({
        formula:
          'd20',
        mode:
          'cinematic'
      });

    assert.equal(
      unsupportedMode.ok,
      false
    );

    assert.equal(
      unsupportedMode.error.code,
      'DICE_FORMULA_EVALUATION_ERROR'
    );

    assert.equal(
      unsupportedMode.error.classification,
      'UNSUPPORTED_ROLL_MODE'
    );

    const unsupportedCriticalPolicy =
      validateDiceRoll({
        formula:
          'd20',
        criticalPolicy:
          'auto-critical'
      });

    assert.equal(
      unsupportedCriticalPolicy.ok,
      false
    );

    assert.equal(
      unsupportedCriticalPolicy.error.classification,
      'UNSUPPORTED_CRITICAL_POLICY'
    );

    assert.throws(
      () => rollDice(
        {
          formula:
            'd6'
        },
        {
          randomInt:
            () => 7
        }
      ),
      error =>
        error instanceof DiceFormulaEvaluationError &&
        error.code === 'DICE_FORMULA_EVALUATION_ERROR' &&
        error.classification === 'RNG_FAILURE' &&
        error.minimum === 1 &&
        error.maximum === 6 &&
        error.observed === 7
    );
  }
);
