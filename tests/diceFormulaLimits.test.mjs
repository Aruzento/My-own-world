import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DICE_ENGINE_LIMITS,
  DiceFormulaLimitError,
  DiceFormulaSyntaxError,
  parseDiceFormula,
  rollDice
} from '../js/dice/diceEngine.js';


function assertLimitError(
  callback,
  {
    limitKind,
    maximum,
    observed
  }
) {

  assert.throws(
    callback,
    error =>
      error instanceof DiceFormulaLimitError &&
      error.code === 'DICE_FORMULA_LIMIT_EXCEEDED' &&
      error.classification === 'LIMIT_EXCEEDED' &&
      error.limitKind === limitKind &&
      error.maximum === maximum &&
      (
        observed === undefined ||
        Object.is(
          error.observed,
          observed
        )
      )
  );
}


function assertNoRngLimitError(
  formula,
  expected
) {

  let calls =
    0;

  assertLimitError(
    () => rollDice(
      {
        formula
      },
      {
        randomInt() {

          calls += 1;
          return 1;
        }
      }
    ),
    expected
  );

  assert.equal(
    calls,
    0,
    `${formula} should fail before rolling any dice`
  );
}


test(
  'dice limits reject per-term dice count before rolling',
  () => {

    assertNoRngLimitError(
      '1001d6',
      {
        limitKind:
          'MAX_DICE_PER_TERM',
        maximum:
          DICE_ENGINE_LIMITS.MAX_DICE_PER_TERM,
        observed:
          1001
      }
    );
  }
);


test(
  'dice limits reject die sides over the configured maximum before rolling',
  () => {

    assertNoRngLimitError(
      'd1000001',
      {
        limitKind:
          'MAX_DIE_SIDES',
        maximum:
          DICE_ENGINE_LIMITS.MAX_DIE_SIDES,
        observed:
          1000001
      }
    );
  }
);


test(
  'dice limits reject excessive parentheses depth',
  () => {

    const formula =
      `${'('.repeat(
        DICE_ENGINE_LIMITS.MAX_PARENTHESES_DEPTH + 1
      )}d6${')'.repeat(
        DICE_ENGINE_LIMITS.MAX_PARENTHESES_DEPTH + 1
      )}`;

    assertLimitError(
      () => parseDiceFormula(
        formula
      ),
      {
        limitKind:
          'MAX_PARENTHESES_DEPTH',
        maximum:
          DICE_ENGINE_LIMITS.MAX_PARENTHESES_DEPTH,
        observed:
          DICE_ENGINE_LIMITS.MAX_PARENTHESES_DEPTH + 1
      }
    );
  }
);


test(
  'dice limits reject formulas over the configured length',
  () => {

    const formula =
      `${'1+'.repeat(
        DICE_ENGINE_LIMITS.MAX_FORMULA_LENGTH / 2
      )}1`;

    assert.equal(
      formula.length,
      DICE_ENGINE_LIMITS.MAX_FORMULA_LENGTH + 1
    );

    assertLimitError(
      () => parseDiceFormula(
        formula
      ),
      {
        limitKind:
          'MAX_FORMULA_LENGTH',
        maximum:
          DICE_ENGINE_LIMITS.MAX_FORMULA_LENGTH,
        observed:
          DICE_ENGINE_LIMITS.MAX_FORMULA_LENGTH + 1
      }
    );
  }
);


test(
  'dice limits reject ASTs over the configured node count',
  () => {

    const formula =
      Array.from(
        {
          length:
            65
        },
        () => '1'
      ).join(
        '+'
      );

    assert.equal(
      formula.length < DICE_ENGINE_LIMITS.MAX_FORMULA_LENGTH,
      true
    );

    assertLimitError(
      () => parseDiceFormula(
        formula
      ),
      {
        limitKind:
          'MAX_AST_NODES',
        maximum:
          DICE_ENGINE_LIMITS.MAX_AST_NODES,
        observed:
          129
      }
    );
  }
);


test(
  'dice limits reject more than the configured dice term count before rolling',
  () => {

    const formula =
      Array.from(
        {
          length:
            DICE_ENGINE_LIMITS.MAX_DICE_TERMS + 1
        },
        () => 'd1'
      ).join(
        '+'
      );

    assertNoRngLimitError(
      formula,
      {
        limitKind:
          'MAX_DICE_TERMS',
        maximum:
          DICE_ENGINE_LIMITS.MAX_DICE_TERMS,
        observed:
          DICE_ENGINE_LIMITS.MAX_DICE_TERMS + 1
      }
    );
  }
);


test(
  'dice limits reject total dice over the configured maximum before rolling',
  () => {

    assertNoRngLimitError(
      '1000d6+d6',
      {
        limitKind:
          'MAX_TOTAL_DICE',
        maximum:
          DICE_ENGINE_LIMITS.MAX_TOTAL_DICE,
        observed:
          1001
      }
    );
  }
);


test(
  'dice limits still accept unusual tabletop values within v1 bounds',
  () => {

    let calls =
      0;

    const result =
      rollDice(
        {
          formula:
            '1000d1000000 + 7'
        },
        {
          randomInt(
            minInclusive,
            maxInclusive
          ) {

            calls += 1;

            assert.equal(
              minInclusive,
              1
            );

            assert.equal(
              maxInclusive,
              1000000
            );

            return 1000000;
          }
        }
      );

    assert.equal(
      calls,
      DICE_ENGINE_LIMITS.MAX_TOTAL_DICE
    );

    assert.equal(
      result.total,
      1000000007
    );

    assert.equal(
      result.rolls.length,
      DICE_ENGINE_LIMITS.MAX_TOTAL_DICE
    );
  }
);


test(
  'dice limits reject unsafe numeric arithmetic',
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
      {
        limitKind:
          'MAX_SAFE_NUMBER',
        maximum:
          DICE_ENGINE_LIMITS.MAX_SAFE_NUMBER
      }
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
      {
        limitKind:
          'MAX_SAFE_NUMBER',
        maximum:
          DICE_ENGINE_LIMITS.MAX_SAFE_NUMBER
      }
    );
  }
);


test(
  'dice parser rejects malicious code-shaped inputs as invalid formula data',
  () => {

    for (
      const formula of [
        'constructor.constructor("return process")()',
        'globalThis',
        'window',
        'document',
        'process',
        'require("node:fs")',
        'import("node:fs")',
        '()=>d20',
        '`${process.exit()}`'
      ]
    ) {

      assert.throws(
        () => parseDiceFormula(
          formula
        ),
        error =>
          error instanceof DiceFormulaSyntaxError ||
          error instanceof DiceFormulaLimitError
      );
    }
  }
);
