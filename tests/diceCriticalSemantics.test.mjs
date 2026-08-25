import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DiceFormulaEvaluationError,
  rollDice
} from '../js/dice/diceEngine.js';

import {
  createDiceSequenceRandomInt
} from './fixtures/diceSequenceRandomInt.mjs';


function rollWithSequence(
  request,
  sequence
) {

  const rng =
    createDiceSequenceRandomInt(
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


function assertUnsupportedCriticalPolicyFormula(
  formula
) {

  let calls =
    0;

  assert.throws(
    () => rollDice(
      {
        formula,
        criticalPolicy:
          'd20-natural'
      },
      {
        randomInt() {

          calls += 1;
          return 1;
        }
      }
    ),
    error =>
      error instanceof DiceFormulaEvaluationError &&
      error.code === 'DICE_FORMULA_EVALUATION_ERROR' &&
      error.classification === 'UNSUPPORTED_CRITICAL_POLICY_FORMULA' &&
      error.criticalPolicy === 'd20-natural' &&
      /exactly one d20/.test(
        error.reason
      )
  );

  assert.equal(
    calls,
    0,
    `${formula} should be rejected before rolling`
  );
}


test(
  'd20-natural critical policy classifies natural 20 as success',
  () => {

    const {
      result
    } =
      rollWithSequence(
        {
          formula:
            'd20 + 7',
          criticalPolicy:
            'd20-natural'
        },
        [
          20
        ]
      );

    assert.equal(
      result.total,
      27
    );

    assert.deepEqual(
      result.critical,
      {
        policy:
          'd20-natural',
        kind:
          'success',
        selectedNatural:
          20,
        diceTermIndex:
          0
      }
    );
  }
);


test(
  'd20-natural critical policy classifies natural 1 as failure',
  () => {

    const {
      result
    } =
      rollWithSequence(
        {
          formula:
            'd20 + 7',
          criticalPolicy:
            'd20-natural'
        },
        [
          1
        ]
      );

    assert.equal(
      result.total,
      8
    );

    assert.deepEqual(
      result.critical,
      {
        policy:
          'd20-natural',
        kind:
          'failure',
        selectedNatural:
          1,
        diceTermIndex:
          0
      }
    );
  }
);


test(
  'modified total 20 is not a natural d20 critical',
  () => {

    const {
      result
    } =
      rollWithSequence(
        {
          formula:
            'd20 + 7',
          criticalPolicy:
            'd20-natural'
        },
        [
          13
        ]
      );

    assert.equal(
      result.total,
      20
    );

    assert.equal(
      result.critical.kind,
      'none'
    );

    assert.equal(
      result.critical.selectedNatural,
      13
    );
  }
);


test(
  'natural 20 remains critical when final total is modified away from 20',
  () => {

    const {
      result
    } =
      rollWithSequence(
        {
          formula:
            'd20 - 3',
          criticalPolicy:
            'd20-natural'
        },
        [
          20
        ]
      );

    assert.equal(
      result.total,
      17
    );

    assert.equal(
      result.critical.kind,
      'success'
    );

    assert.equal(
      result.critical.selectedNatural,
      20
    );
  }
);


test(
  'advantage d20-natural critical uses the selected natural face',
  () => {

    const {
      result,
      rng
    } =
      rollWithSequence(
        {
          formula:
            'd20 + 4',
          mode:
            'advantage',
          criticalPolicy:
            'd20-natural'
        },
        [
          20,
          8
        ]
      );

    assert.equal(
      result.total,
      24
    );

    assert.equal(
      result.dice[0].selection.selectedNatural,
      20
    );

    assert.deepEqual(
      result.critical,
      {
        policy:
          'd20-natural',
        kind:
          'success',
        selectedNatural:
          20,
        diceTermIndex:
          0
      }
    );

    assert.deepEqual(
      rng.calls,
      [
        [
          1,
          20
        ],
        [
          1,
          20
        ]
      ]
    );
  }
);


test(
  'disadvantage d20-natural critical ignores discarded natural 20',
  () => {

    const {
      result
    } =
      rollWithSequence(
        {
          formula:
            'd20 + 4',
          mode:
            'disadvantage',
          criticalPolicy:
            'd20-natural'
        },
        [
          20,
          8
        ]
      );

    assert.equal(
      result.total,
      12
    );

    assert.equal(
      result.dice[0].selection.selectedNatural,
      8
    );

    assert.deepEqual(
      result.critical,
      {
        policy:
          'd20-natural',
        kind:
          'none',
        selectedNatural:
          8,
        diceTermIndex:
          0
      }
    );
  }
);


test(
  'policy none exposes faces without critical classification',
  () => {

    const {
      result
    } =
      rollWithSequence(
        {
          formula:
            'd20 - 3',
          criticalPolicy:
            'none'
        },
        [
          20
        ]
      );

    assert.equal(
      result.total,
      17
    );

    assert.deepEqual(
      result.dice[0].faces,
      [
        20
      ]
    );

    assert.deepEqual(
      result.critical,
      {
        policy:
          'none',
        kind:
          'none'
      }
    );
  }
);


test(
  'd20-natural critical policy rejects formulas without one eligible primary d20 before RNG',
  () => {

    for (
      const formula of [
        'd6',
        'd20 + d4',
        '2d20',
        '2d6 + 3',
        '20 + 4'
      ]
    ) {

      assertUnsupportedCriticalPolicyFormula(
        formula
      );
    }
  }
);
