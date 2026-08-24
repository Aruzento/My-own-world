import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';

import {
  DiceFormulaSyntaxError,
  parseDiceFormula
} from '../js/dice/diceEngine.js';


function compactAst(
  node
) {

  if (
    node.type === 'number'
  ) {

    return {
      type:
        'number',
      value:
        node.value
    };
  }

  if (
    node.type === 'dice'
  ) {

    return {
      type:
        'dice',
      count:
        node.count,
      sides:
        node.sides
    };
  }

  if (
    node.type === 'unary'
  ) {

    return {
      type:
        'unary',
      operator:
        node.operator,
      argument:
        compactAst(
          node.argument
        )
    };
  }

  if (
    node.type === 'binary'
  ) {

    return {
      type:
        'binary',
      operator:
        node.operator,
      left:
        compactAst(
          node.left
        ),
      right:
        compactAst(
          node.right
        )
    };
  }

  throw new Error(
    `Unknown test node type: ${node.type}`
  );
}


function parseCompact(
  formula
) {

  return compactAst(
    parseDiceFormula(
      formula
    )
  );
}


function assertInvalidFormula(
  formula
) {

  assert.throws(
    () => parseDiceFormula(
      formula
    ),
    error =>
      error instanceof DiceFormulaSyntaxError &&
      error.code === 'DICE_FORMULA_SYNTAX_ERROR' &&
      Number.isInteger(
        error.position
      ) &&
      typeof error.reason === 'string' &&
      error.reason.length > 0
  );
}


test(
  'dice parser parses valid simple dice and arithmetic formulas into AST',
  () => {

    assert.deepEqual(
      parseCompact(
        'd20'
      ),
      {
        type:
          'dice',
        count:
          1,
        sides:
          20
      }
    );

    assert.deepEqual(
      parseCompact(
        '2d6 + 3'
      ),
      {
        type:
          'binary',
        operator:
          '+',
        left: {
          type:
            'dice',
          count:
            2,
          sides:
            6
        },
        right: {
          type:
            'number',
          value:
            3
        }
      }
    );

    assert.deepEqual(
      parseCompact(
        '1d8 + 2d4 - 1'
      ),
      {
        type:
          'binary',
        operator:
          '-',
        left: {
          type:
            'binary',
          operator:
            '+',
          left: {
            type:
              'dice',
            count:
              1,
            sides:
              8
          },
          right: {
            type:
              'dice',
            count:
              2,
            sides:
              4
          }
        },
        right: {
          type:
            'number',
          value:
            1
        }
      }
    );
  }
);


test(
  'dice parser ignores whitespace between grammar tokens',
  () => {

    assert.deepEqual(
      parseCompact(
        '\n 2d6\t+\r\n 3 '
      ),
      parseCompact(
        '2d6+3'
      )
    );
  }
);


test(
  'dice parser respects operator precedence and left associativity',
  () => {

    assert.deepEqual(
      parseCompact(
        '2 + 3 * d4'
      ),
      {
        type:
          'binary',
        operator:
          '+',
        left: {
          type:
            'number',
          value:
            2
        },
        right: {
          type:
            'binary',
          operator:
            '*',
          left: {
            type:
              'number',
            value:
              3
          },
          right: {
            type:
              'dice',
            count:
              1,
            sides:
              4
          }
        }
      }
    );

    assert.deepEqual(
      parseCompact(
        '10 - 3 - 2'
      ),
      {
        type:
          'binary',
        operator:
          '-',
        left: {
          type:
            'binary',
          operator:
            '-',
          left: {
            type:
              'number',
            value:
              10
          },
          right: {
            type:
              'number',
            value:
              3
          }
        },
        right: {
          type:
            'number',
          value:
            2
        }
      }
    );
  }
);


test(
  'dice parser applies parentheses before surrounding arithmetic',
  () => {

    assert.deepEqual(
      parseCompact(
        '2 * (d6 + 3)'
      ),
      {
        type:
          'binary',
        operator:
          '*',
        left: {
          type:
            'number',
          value:
            2
        },
        right: {
          type:
            'binary',
          operator:
            '+',
          left: {
            type:
              'dice',
            count:
              1,
            sides:
              6
          },
          right: {
            type:
              'number',
            value:
              3
          }
        }
      }
    );

    assert.deepEqual(
      parseCompact(
        '(d20 + 5) / 2'
      ).operator,
      '/'
    );
  }
);


test(
  'dice parser supports unary operators without rolling dice',
  () => {

    assert.deepEqual(
      parseCompact(
        '-d20'
      ),
      {
        type:
          'unary',
        operator:
          '-',
        argument: {
          type:
            'dice',
          count:
            1,
          sides:
            20
        }
      }
    );

    assert.deepEqual(
      parseCompact(
        '2 * -3'
      ),
      {
        type:
          'binary',
        operator:
          '*',
        left: {
          type:
            'number',
          value:
            2
        },
        right: {
          type:
            'unary',
          operator:
            '-',
          argument: {
            type:
              'number',
            value:
              3
          }
        }
      }
    );

    assert.deepEqual(
      parseCompact(
        '+5'
      ),
      {
        type:
          'unary',
        operator:
          '+',
        argument: {
          type:
            'number',
          value:
            5
        }
      }
    );
  }
);


test(
  'dice parser rejects malformed dice and arithmetic syntax with structured errors',
  () => {

    for (
      const formula of [
        '',
        'd',
        '2dd6',
        'd0',
        '0d6',
        '2d-6',
        '1 / /',
        '((d20)',
        '1 2',
        '2 d6',
        '999999999999999999999999'
      ]
    ) {

      assertInvalidFormula(
        formula
      );
    }
  }
);


test(
  'dice parser rejects code-shaped payloads as data syntax',
  () => {

    for (
      const formula of [
        'foo',
        'process.exit()',
        '1 + alert(1)',
        'globalThis.eval("1+1")',
        'setTimeout("alert(1)")',
        'setInterval("alert(1)")',
        'import("node:fs")',
        'this.constructor.constructor("return process")()',
        '[1, 2, 3]',
        '"1d6"',
        '1 ? 2 : 3',
        '1 ** 2',
        'a.b',
        'd20 // comment',
        'd20 /* comment */'
      ]
    ) {

      assertInvalidFormula(
        formula
      );
    }
  }
);


test(
  'dice parser implementation does not contain code execution primitives',
  async () => {

    const source =
      await readFile(
        new URL(
          '../js/dice/diceEngine.js',
          import.meta.url
        ),
        'utf8'
      );

    const forbiddenPatterns =
      [
        /\beval\s*\(/,
        /\bwindow\.eval\s*\(/,
        /\bglobalThis\.eval\s*\(/,
        /\bFunction\s*\(/,
        /\bnew\s+Function\s*\(/,
        /\bsetTimeout\s*\(\s*['"`]/,
        /\bsetInterval\s*\(\s*['"`]/,
        /\bimport\s*\(/
      ];

    for (
      const pattern of forbiddenPatterns
    ) {

      assert.equal(
        pattern.test(
          source
        ),
        false,
        `Forbidden parser primitive matched ${pattern}`
      );
    }
  }
);
