import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';

import {
  DiceFormulaEvaluationError,
  createDefaultDiceRandomInt,
  rollDice
} from '../js/dice/diceEngine.js';

import {
  createDiceSequenceRandomInt
} from './fixtures/diceSequenceRandomInt.mjs';


function rollWithSequence(
  formula,
  sequence
) {

  const rng =
    createDiceSequenceRandomInt(
      sequence
    );

  const result =
    rollDice(
      {
        formula
      },
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


function collectObjectKeys(
  value,
  keys = []
) {

  if (
    value === null ||
    typeof value !== 'object'
  ) {

    return keys;
  }

  if (
    Array.isArray(
      value
    )
  ) {

    for (
      const item of value
    ) {

      collectObjectKeys(
        item,
        keys
      );
    }

    return keys;
  }

  for (
    const [
      key,
      child
    ] of Object.entries(
      value
    )
  ) {

    keys.push(
      key
    );

    collectObjectKeys(
      child,
      keys
    );
  }

  return keys;
}


function collectRollFaces(
  result
) {

  return result.dice.flatMap(
    diceTerm => diceTerm.faces
  );
}


test(
  'same dice formula and RNG sequence produces structurally equivalent roll output',
  () => {

    const first =
      rollWithSequence(
        'd20 + 2d6 + d4',
        [
          20,
          1,
          6,
          4
        ]
      );

    const second =
      rollWithSequence(
        'd20 + 2d6 + d4',
        [
          20,
          1,
          6,
          4
        ]
      );

    assert.deepEqual(
      first.result,
      second.result
    );

    assert.deepEqual(
      first.rng.calls,
      second.rng.calls
    );
  }
);


test(
  'different deterministic RNG sequences produce the expected different faces',
  () => {

    const low =
      rollWithSequence(
        'd20 + d6',
        [
          1,
          2
        ]
      );

    const high =
      rollWithSequence(
        'd20 + d6',
        [
          20,
          6
        ]
      );

    assert.notDeepEqual(
      collectRollFaces(
        low.result
      ),
      collectRollFaces(
        high.result
      )
    );

    assert.deepEqual(
      collectRollFaces(
        high.result
      ),
      [
        20,
        6
      ]
    );

    assert.equal(
      high.result.total,
      26
    );
  }
);


test(
  'dice engine calls randomInt in exact formula order for several dice terms',
  () => {

    const {
      result,
      rng
    } =
      rollWithSequence(
        'd20 + 2d6 + d4',
        [
          20,
          1,
          6,
          4
        ]
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

    assert.equal(
      rng.remaining,
      0
    );

    assert.deepEqual(
      result.dice.map(
        diceTerm => ({
          sides:
            diceTerm.sides,
          faces:
            diceTerm.faces
        })
      ),
      [
        {
          sides:
            20,
          faces:
            [
              20
            ]
        },
        {
          sides:
            6,
          faces:
            [
              1,
              6
            ]
        },
        {
          sides:
            4,
          faces:
            [
              4
            ]
        }
      ]
    );
  }
);


test(
  'dice engine rejects invalid randomInt provider values without normalizing them',
  () => {

    for (
      const invalidValue of [
        0,
        7,
        1.5,
        Number.NaN,
        undefined
      ]
    ) {

      assert.throws(
        () => rollDice(
          {
            formula:
              'd6'
          },
          {
            randomInt:
              () => invalidValue
          }
        ),
        error =>
          error instanceof DiceFormulaEvaluationError &&
          error.code === 'DICE_FORMULA_EVALUATION_ERROR' &&
          error.reason === 'randomInt returned a value outside the requested die range' &&
          error.minimum === 1 &&
          error.maximum === 6 &&
          Object.is(
            error.observed,
            invalidValue
          )
      );
    }
  }
);


test(
  'dice engine wraps randomInt provider failure with a clear evaluation error',
  () => {

    const providerError =
      new Error(
        'test provider failed'
      );

    assert.throws(
      () => rollDice(
        {
          formula:
            'd20'
        },
        {
          randomInt() {

            throw providerError;
          }
        }
      ),
      error =>
        error instanceof DiceFormulaEvaluationError &&
        error.code === 'DICE_FORMULA_EVALUATION_ERROR' &&
        error.reason === 'randomInt provider failed' &&
        error.minimum === 1 &&
        error.maximum === 20 &&
        error.cause === providerError
    );
  }
);


test(
  'default dice RNG provider is owned by the engine and can be tested through injected entropy',
  () => {

    const minimumRng =
      createDefaultDiceRandomInt({
        random:
          () => 0
      });

    assert.equal(
      minimumRng(
        1,
        6
      ),
      1
    );

    const maximumRng =
      createDefaultDiceRandomInt({
        random:
          () => 0.999999
      });

    assert.equal(
      maximumRng(
        1,
        6
      ),
      6
    );
  }
);


test(
  'default dice RNG provider rejects invalid entropy source output',
  () => {

    for (
      const invalidEntropy of [
        -0.01,
        1,
        Number.NaN,
        undefined
      ]
    ) {

      const randomInt =
        createDefaultDiceRandomInt({
          random:
            () => invalidEntropy
        });

      assertEvaluationError(
        () => randomInt(
          1,
          6
        ),
        /invalid fraction/
      );
    }
  }
);


test(
  'roll results do not embed volatile time uuid or seed fields',
  async () => {

    const {
      result
    } =
      rollWithSequence(
        'd20 + d4',
        [
          12,
          3
        ]
      );

    const keys =
      collectObjectKeys(
        result
      );

    for (
      const volatileKey of [
        'id',
        'seed',
        'timestamp',
        'createdAt',
        'updatedAt'
      ]
    ) {

      assert.equal(
        keys.includes(
          volatileKey
        ),
        false
      );
    }

    const source =
      await readFile(
        new URL(
          '../js/dice/diceEngine.js',
          import.meta.url
        ),
        'utf8'
      );

    for (
      const pattern of [
        /\bDate\.now\s*\(/,
        /\bnew\s+Date\s*\(/,
        /\bcrypto\.randomUUID\s*\(/
      ]
    ) {

      assert.equal(
        pattern.test(
          source
        ),
        false,
        `Dice Engine source should not use volatile result primitive ${pattern}`
      );
    }
  }
);
