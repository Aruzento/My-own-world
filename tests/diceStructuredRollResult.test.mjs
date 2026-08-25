import test from 'node:test';
import assert from 'node:assert/strict';

import {
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


function assertDeepFrozen(
  value,
  seen = new WeakSet()
) {

  if (
    value === null ||
    typeof value !== 'object' ||
    seen.has(
      value
    )
  ) {

    return;
  }

  seen.add(
    value
  );

  assert.equal(
    Object.isFrozen(
      value
    ),
    true
  );

  for (
    const child of Object.values(
      value
    )
  ) {

    assertDeepFrozen(
      child,
      seen
    );
  }
}


test(
  'structured roll result captures a single d20 without parser internals',
  () => {

    const {
      result
    } =
      rollWithSequence(
        'd20',
        [
          18
        ]
      );

    assert.deepEqual(
      result,
      {
        kind:
          'dice-roll-result',
        version:
          1,
        request: {
          formulaOriginal:
            'd20',
          formulaNormalized:
            'd20',
          mode:
            'normal',
          criticalPolicy:
            'none'
        },
        total:
          18,
        dice: [
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
                18
              ],
            total:
              18
          }
        ],
        breakdown: {
          kind:
            'dice-term',
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
              18
            ],
          total:
            18
        },
        critical: {
          policy:
            'none',
          kind:
            'none'
        }
      }
    );

    assertDeepFrozen(
      result
    );

    const keys =
      collectObjectKeys(
        result
      );

    for (
      const parserKey of [
        'type',
        'start',
        'end',
        'tokens',
        'ast'
      ]
    ) {

      assert.equal(
        keys.includes(
          parserKey
        ),
        false,
        `RollResult should not expose parser key: ${parserKey}`
      );
    }
  }
);


test(
  'structured roll result preserves dice faces modifier arithmetic and total',
  () => {

    const {
      result
    } =
      rollWithSequence(
        '2d6 + 3',
        [
          2,
          5
        ]
      );

    assert.deepEqual(
      result.request,
      {
        formulaOriginal:
          '2d6 + 3',
        formulaNormalized:
          '2d6+3',
        mode:
          'normal',
        criticalPolicy:
          'none'
      }
    );

    assert.equal(
      result.total,
      10
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
            '2d6',
          count:
            2,
          sides:
            6,
          faces:
            [
              2,
              5
            ],
          total:
            7
        }
      ]
    );

    assert.deepEqual(
      result.breakdown,
      {
        kind:
          'binary-operation',
        operator:
          '+',
        left: {
          kind:
            'dice-term',
          diceTermIndex:
            0,
          notation:
            '2d6',
          count:
            2,
          sides:
            6,
          faces:
            [
              2,
              5
            ],
          total:
            7
        },
        right: {
          kind:
            'number',
          value:
            3,
          total:
            3
        },
        total:
          10
      }
    );
  }
);


test(
  'structured roll result keeps separate entries for multiple dice terms',
  () => {

    const {
      result
    } =
      rollWithSequence(
        'd20 + 2d6 - d4',
        [
          20,
          1,
          6,
          3
        ]
      );

    assert.equal(
      result.total,
      24
    );

    assert.deepEqual(
      result.dice.map(
        diceTerm => ({
          diceTermIndex:
            diceTerm.diceTermIndex,
          notation:
            diceTerm.notation,
          count:
            diceTerm.count,
          sides:
            diceTerm.sides,
          faces:
            diceTerm.faces,
          total:
            diceTerm.total
        })
      ),
      [
        {
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
              20
            ],
          total:
            20
        },
        {
          diceTermIndex:
            1,
          notation:
            '2d6',
          count:
            2,
          sides:
            6,
          faces:
            [
              1,
              6
            ],
          total:
            7
        },
        {
          diceTermIndex:
            2,
          notation:
            'd4',
          count:
            1,
          sides:
            4,
          faces:
            [
              3
            ],
          total:
            3
        }
      ]
    );

    assert.equal(
      result.breakdown.kind,
      'binary-operation'
    );

    assert.equal(
      result.breakdown.left.kind,
      'binary-operation'
    );

    assert.equal(
      result.breakdown.right.diceTermIndex,
      2
    );
  }
);


test(
  'structured roll result supports arithmetic-only formulas without rolling',
  () => {

    const rng =
      createDiceSequenceRandomInt(
        []
      );

    const result =
      rollDice(
        {
          formula:
            '2 * (3 + 4)'
        },
        {
          randomInt:
            rng.randomInt
        }
      );

    assert.equal(
      result.total,
      14
    );

    assert.deepEqual(
      result.dice,
      []
    );

    assert.deepEqual(
      rng.calls,
      []
    );

    assert.deepEqual(
      result.breakdown,
      {
        kind:
          'binary-operation',
        operator:
          '*',
        left: {
          kind:
            'number',
          value:
            2,
          total:
            2
        },
        right: {
          kind:
            'binary-operation',
          operator:
            '+',
          left: {
            kind:
              'number',
            value:
              3,
            total:
              3
          },
          right: {
            kind:
              'number',
            value:
              4,
            total:
              4
          },
          total:
            7
        },
        total:
          14
      }
    );
  }
);


test(
  'structured roll result is deterministic and subsystem independent',
  () => {

    const first =
      rollWithSequence(
        'd20 + 2d6',
        [
          19,
          4,
          6
        ]
      ).result;

    const second =
      rollWithSequence(
        'd20 + 2d6',
        [
          19,
          4,
          6
        ]
      ).result;

    assert.deepEqual(
      first,
      second
    );

    const keys =
      collectObjectKeys(
        first
      );

    for (
      const domainKey of [
        'actor',
        'actorId',
        'target',
        'targetId',
        'character',
        'token',
        'workspace',
        'campaign',
        'hp',
        'combatRound',
        'page',
        'domNode',
        'id',
        'createdAt',
        'timestamp'
      ]
    ) {

      assert.equal(
        keys.includes(
          domainKey
        ),
        false,
        `RollResult should not contain subsystem-owned key: ${domainKey}`
      );
    }
  }
);
