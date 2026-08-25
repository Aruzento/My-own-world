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


function assertUnsupportedModeFormula(
  formula,
  mode = 'advantage'
) {

  let calls =
    0;

  assert.throws(
    () => rollDice(
      {
        formula,
        mode
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
      error.classification === 'UNSUPPORTED_MODE_FORMULA' &&
      error.mode === mode &&
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
  'advantage mode rolls one d20 twice and keeps the higher natural face',
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
            'advantage'
        },
        [
          7,
          16
        ]
      );

    assert.equal(
      result.request.mode,
      'advantage'
    );

    assert.equal(
      result.total,
      20
    );

    assert.deepEqual(
      result.dice,
      [
        {
          kind:
            'dice-term-result',
          diceTermIndex:
            0,
          notation:
            'd20',
          count:
            1,
          sides:
            20,
          faces:
            [
              7,
              16
            ],
          total:
            16,
          selection: {
            mode:
              'advantage',
            candidateFaces:
              [
                7,
                16
              ],
            keptCandidateIndexes:
              [
                1
              ],
            discardedCandidateIndexes:
              [
                0
              ],
            keptFaces:
              [
                16
              ],
            discardedFaces:
              [
                7
              ],
            selectedNatural:
              16,
            reason:
              'higher-face'
          }
        }
      ]
    );

    assert.deepEqual(
      result.breakdown.left.selection,
      result.dice[0].selection
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
  'disadvantage mode rolls one d20 twice and keeps the lower natural face',
  () => {

    const {
      result
    } =
      rollWithSequence(
        {
          formula:
            'd20 - 2',
          mode:
            'disadvantage'
        },
        [
          18,
          5
        ]
      );

    assert.equal(
      result.request.mode,
      'disadvantage'
    );

    assert.equal(
      result.total,
      3
    );

    assert.deepEqual(
      result.dice[0].selection,
      {
        mode:
          'disadvantage',
        candidateFaces:
          [
            18,
            5
          ],
        keptCandidateIndexes:
          [
            1
          ],
        discardedCandidateIndexes:
          [
            0
          ],
        keptFaces:
          [
            5
          ],
        discardedFaces:
          [
            18
          ],
        selectedNatural:
          5,
        reason:
          'lower-face'
      }
    );
  }
);


test(
  'd20 roll modes keep the first candidate deterministically on ties',
  () => {

    for (
      const mode of [
        'advantage',
        'disadvantage'
      ]
    ) {

      const {
        result
      } =
        rollWithSequence(
          {
            formula:
              '(d20 + 3)',
            mode
          },
          [
            12,
            12
          ]
        );

      assert.equal(
        result.total,
        15
      );

      assert.deepEqual(
        result.dice[0].selection,
        {
          mode,
          candidateFaces:
            [
              12,
              12
            ],
          keptCandidateIndexes:
            [
              0
            ],
          discardedCandidateIndexes:
            [
              1
            ],
          keptFaces:
            [
              12
            ],
          discardedFaces:
            [
              12
            ],
          selectedNatural:
            12,
          reason:
            'tie-first-candidate'
        }
      );
    }
  }
);


test(
  'advantage and disadvantage apply deterministic arithmetic only once',
  () => {

    const advantage =
      rollWithSequence(
        {
          formula:
            '(d20 + 5) / 2',
          mode:
            'advantage'
        },
        [
          8,
          15
        ]
      );

    const disadvantage =
      rollWithSequence(
        {
          formula:
            'd20 * 2 + 1',
          mode:
            'disadvantage'
        },
        [
          11,
          4
        ]
      );

    assert.equal(
      advantage.result.total,
      10
    );

    assert.equal(
      disadvantage.result.total,
      9
    );

    assert.deepEqual(
      advantage.rng.calls,
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

    assert.deepEqual(
      disadvantage.rng.calls,
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
  'normal mode keeps generic formula behavior unchanged',
  () => {

    const {
      result,
      rng
    } =
      rollWithSequence(
        {
          formula:
            'd20 + d4 + 2',
          mode:
            'normal'
        },
        [
          14,
          3
        ]
      );

    assert.equal(
      result.total,
      19
    );

    assert.deepEqual(
      result.dice.map(
        diceTerm => diceTerm.faces
      ),
      [
        [
          14
        ],
        [
          3
        ]
      ]
    );

    assert.equal(
      'selection' in result.dice[0],
      false
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
          4
        ]
      ]
    );
  }
);


test(
  'advantage and disadvantage reject unsupported multi-dice or non-d20 formulas before RNG',
  () => {

    for (
      const formula of [
        '2d20',
        'd20 + d4',
        '2d6 + 3',
        'd12 + 4',
        '20 + 4'
      ]
    ) {

      assertUnsupportedModeFormula(
        formula,
        'advantage'
      );

      assertUnsupportedModeFormula(
        formula,
        'disadvantage'
      );
    }
  }
);
