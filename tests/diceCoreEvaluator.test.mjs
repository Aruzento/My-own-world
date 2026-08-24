import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DiceFormulaEvaluationError,
  DiceFormulaLimitError,
  rollDice
} from '../js/dice/diceEngine.js';


function createSequenceRandomInt(
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

      assert.ok(
        index < values.length,
        'RNG was called more times than the test sequence allows'
      );

      const value =
        values[index];

      index += 1;

      return value;
    },
    assertConsumed() {

      assert.equal(
        index,
        values.length,
        'RNG sequence was not fully consumed'
      );
    }
  };
}


function assertEvaluationError(
  callback,
  reasonPattern
) {

  assert.throws(
    callback,
    error =>
      error instanceof DiceFormulaEvaluationError &&
      error.code === 'DICE_FORMULA_EVALUATION_ERROR' &&
      reasonPattern.test(
        error.reason
      )
  );
}


function assertLimitError(
  callback,
  reasonPattern
) {

  assert.throws(
    callback,
    error =>
      error instanceof DiceFormulaLimitError &&
      error.code === 'DICE_FORMULA_LIMIT_EXCEEDED' &&
      error.classification === 'LIMIT_EXCEEDED' &&
      reasonPattern.test(
        error.reason
      )
  );
}


test(
  'dice evaluator rolls a single die through injected randomInt',
  () => {

    const rng =
      createSequenceRandomInt([
        17
      ]);

    const result =
      rollDice(
        {
          formula:
            'd20'
        },
        {
          randomInt:
            rng.randomInt
        }
      );

    assert.equal(
      result.type,
      'rollResult'
    );

    assert.equal(
      result.total,
      17
    );

    assert.deepEqual(
      rng.calls,
      [
        [
          1,
          20
        ]
      ]
    );

    assert.deepEqual(
      result.rolls.map(
        roll => ({
          dieIndex:
            roll.dieIndex,
          count:
            roll.count,
          sides:
            roll.sides,
          value:
            roll.value
        })
      ),
      [
        {
          dieIndex:
            0,
          count:
            1,
          sides:
            20,
          value:
            17
        }
      ]
    );

    rng.assertConsumed();
  }
);


test(
  'dice evaluator totals multiple dice in one term',
  () => {

    const rng =
      createSequenceRandomInt([
        2,
        5
      ]);

    const result =
      rollDice(
        {
          formula:
            '2d6 + 3'
        },
        {
          randomInt:
            rng.randomInt
        }
      );

    assert.equal(
      result.total,
      10
    );

    assert.deepEqual(
      rng.calls,
      [
        [
          1,
          6
        ],
        [
          1,
          6
        ]
      ]
    );

    assert.deepEqual(
      result.rolls.map(
        roll => roll.value
      ),
      [
        2,
        5
      ]
    );

    rng.assertConsumed();
  }
);


test(
  'dice evaluator rolls each dice term independently',
  () => {

    const rng =
      createSequenceRandomInt([
        3,
        6,
        4
      ]);

    const result =
      rollDice(
        {
          formula:
            '2d6 + d4 + 3'
        },
        {
          randomInt:
            rng.randomInt
        }
      );

    assert.equal(
      result.total,
      16
    );

    assert.deepEqual(
      rng.calls,
      [
        [
          1,
          6
        ],
        [
          1,
          6
        ],
        [
          1,
          4
        ]
      ]
    );

    rng.assertConsumed();
  }
);


test(
  'dice evaluator follows parser precedence and parentheses',
  () => {

    const precedenceRng =
      createSequenceRandomInt([
        2
      ]);

    assert.equal(
      rollDice(
        {
          formula:
            '2 + 3 * d4'
        },
        {
          randomInt:
            precedenceRng.randomInt
        }
      ).total,
      8
    );

    precedenceRng.assertConsumed();

    const parenthesizedRng =
      createSequenceRandomInt([
        4
      ]);

    assert.equal(
      rollDice(
        {
          formula:
            '2 * (d6 + 3)'
        },
        {
          randomInt:
            parenthesizedRng.randomInt
        }
      ).total,
      14
    );

    parenthesizedRng.assertConsumed();
  }
);


test(
  'dice evaluator supports unary minus and arithmetic division',
  () => {

    const rng =
      createSequenceRandomInt([
        12,
        15
      ]);

    assert.equal(
      rollDice(
        {
          formula:
            '-d20 + 5'
        },
        {
          randomInt:
            rng.randomInt
        }
      ).total,
      -7
    );

    assert.equal(
      rollDice(
        {
          formula:
            '(d20 + 5) / 2'
        },
        {
          randomInt:
            rng.randomInt
        }
      ).total,
      10
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

    rng.assertConsumed();
  }
);


test(
  'dice evaluator rejects division by zero',
  () => {

    const rng =
      createSequenceRandomInt([
        1
      ]);

    assertEvaluationError(
      () => rollDice(
        {
          formula:
            '1 / (d1 - 1)'
        },
        {
          randomInt:
            rng.randomInt
        }
      ),
      /Division by zero/
    );

    rng.assertConsumed();
  }
);


test(
  'dice evaluator rejects invalid randomInt output',
  () => {

    for (
      const invalidValue of [
        0,
        7,
        1.5,
        Number.NaN
      ]
    ) {

      const rng =
        createSequenceRandomInt([
          invalidValue
        ]);

      assertEvaluationError(
        () => rollDice(
          {
            formula:
              'd6'
          },
          {
            randomInt:
              rng.randomInt
          }
        ),
        /outside the requested die range/
      );

      rng.assertConsumed();
    }
  }
);


test(
  'dice evaluator rejects non-finite and unsafe numeric results',
  () => {

    assertLimitError(
      () => rollDice(
        {
          formula:
            `${Number.MAX_SAFE_INTEGER} + 1`
        },
        {
          randomInt:
            () => 1
        }
      ),
      /numeric range/
    );

    assertLimitError(
      () => rollDice(
        {
          formula:
            '3037000500 * 3037000500'
        },
        {
          randomInt:
            () => 1
        }
      ),
      /numeric range/
    );
  }
);


test(
  'dice evaluator validates public roll request and v1 options',
  () => {

    assertEvaluationError(
      () => rollDice(
        'd20',
        {
          randomInt:
            () => 1
        }
      ),
      /request must be an object/
    );

    assertEvaluationError(
      () => rollDice(
        {
          formula:
            'd20',
          mode:
            'advantage'
        },
        {
          randomInt:
            () => 1
        }
      ),
      /normal roll mode/
    );

    assertEvaluationError(
      () => rollDice(
        {
          formula:
            'd20',
          criticalPolicy:
            'double'
        },
        {
          randomInt:
            () => 1
        }
      ),
      /none critical policy/
    );

    assertEvaluationError(
      () => rollDice(
        {
          formula:
            'd20'
        },
        {
          randomInt:
            null
        }
      ),
      /randomInt must be a function/
    );
  }
);
