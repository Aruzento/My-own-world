import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';

import {
  rollDice
} from '../js/dice/diceEngine.js';

import {
  EVENT_TRANSACTION_LOG_PATH,
  EventStoreError,
  readTransactionRecords
} from '../js/events/eventStore.js';

import {
  EVENT_TYPES_V1
} from '../js/events/eventTypes.js';

import {
  createDiceRollTransaction,
  logDiceRoll
} from '../js/events/diceRollEventLog.js';

import {
  normalizeWorkspacePath
} from '../js/storage/storageAdapterContract.js';

import {
  createDiceSequenceRandomInt
} from './fixtures/diceSequenceRandomInt.mjs';


const CREATED_AT =
  '2026-08-26T17:00:00.000Z';

const COMPLETED_AT =
  '2026-08-26T17:00:01.000Z';


test(
  'DiceRollEventLog logs a normal dice roll as one durable roll event',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const rng =
      createDiceSequenceRandomInt([
        2,
        5
      ]);

    const result =
      await logDiceRoll(
        {
          request:
            {
              formula:
                '2d6 + 3',
              mode:
                'normal',
              criticalPolicy:
                'none'
            },
          transactionId:
            'txn-roll-normal',
          eventId:
            'evt-roll-normal',
          createdAt:
            CREATED_AT,
          completedAt:
            COMPLETED_AT,
          order:
            1,
          intentType:
            'roll-check',
          label:
            'Roll stealth',
          source:
            'unit-test',
          reason:
            'user-roll',
          context:
            {
              source:
                'unit-test',
              actorId:
                'actor-a',
              label:
                'Stealth'
            }
        },
        {
          randomInt:
            rng.randomInt,
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      result.status,
      'durable'
    );

    assert.equal(
      result.path,
      EVENT_TRANSACTION_LOG_PATH
    );

    assert.equal(
      result.roll.total,
      10
    );

    assert.equal(
      result.transaction.status,
      'completed'
    );

    assert.equal(
      result.transaction.events[0].type,
      EVENT_TYPES_V1.ROLL_PERFORMED
    );

    assert.deepEqual(
      result.transaction.events[0].payload.context,
      {
        actorId:
          'actor-a',
        label:
          'Stealth',
        source:
          'unit-test'
      }
    );

    const raw =
      await adapter.readText(
        EVENT_TRANSACTION_LOG_PATH
      );

    assert.equal(
      raw.trim().split('\n').length,
      1
    );

    const stored =
      JSON.parse(
        raw
      );

    assert.equal(
      stored.events[0].payload.roll.request.formulaOriginal,
      '2d6 + 3'
    );

    assert.deepEqual(
      stored.events[0].payload.roll.dice[0].faces,
      [
        2,
        5
      ]
    );

    assert.equal(
      stored.events[0].payload.roll.total,
      10
    );

    assert.equal(
      JSON.stringify(stored.events[0].payload.roll).includes('"start"'),
      false
    );

    assert.equal(
      JSON.stringify(stored.events[0].payload.roll).includes('"end"'),
      false
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
  }
);


test(
  'DiceRollEventLog persists advantage roll details and reloads the same event',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const rng =
      createDiceSequenceRandomInt([
        7,
        16
      ]);

    const result =
      await logDiceRoll(
        {
          request:
            {
              formula:
                'd20 + 4',
              mode:
                'advantage',
              criticalPolicy:
                'none'
            },
          transactionId:
            'txn-roll-advantage',
          eventId:
            'evt-roll-advantage',
          createdAt:
            CREATED_AT,
          completedAt:
            COMPLETED_AT,
          order:
            2,
          label:
            'Advantage check',
          source:
            'unit-test',
          reason:
            'advantage-roll'
        },
        {
          randomInt:
            rng.randomInt,
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      result.roll.total,
      20
    );

    assert.deepEqual(
      result.roll.dice[0].selection.candidateFaces,
      [
        7,
        16
      ]
    );

    assert.equal(
      result.roll.dice[0].selection.selectedNatural,
      16
    );

    const snapshot =
      await readTransactionRecords({
        storageAdapter:
          adapter
      });

    assert.equal(
      snapshot.recordCount,
      1
    );

    assert.deepEqual(
      snapshot.transactions[0],
      result.transaction
    );

    assert.equal(
      snapshot.transactions[0].events[0].payload.roll.request.mode,
      'advantage'
    );
  }
);


test(
  'DiceRollEventLog persists explicit natural d20 critical metadata',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const rng =
      createDiceSequenceRandomInt([
        20
      ]);

    const result =
      await logDiceRoll(
        {
          request:
            {
              formula:
                'd20 - 3',
              mode:
                'normal',
              criticalPolicy:
                'd20-natural'
            },
          transactionId:
            'txn-roll-critical',
          eventId:
            'evt-roll-critical',
          createdAt:
            CREATED_AT,
          completedAt:
            COMPLETED_AT,
          order:
            3,
          source:
            'unit-test',
          reason:
            'critical-roll',
          context:
            {
              actionId:
                'attack-like-check',
              label:
                'Natural check'
            }
        },
        {
          randomInt:
            rng.randomInt,
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      result.roll.total,
      17
    );

    assert.deepEqual(
      result.roll.critical,
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

    const snapshot =
      await readTransactionRecords({
        storageAdapter:
          adapter
      });

    assert.equal(
      snapshot.transactions[0].events[0].payload.roll.critical.kind,
      'success'
    );
  }
);


test(
  'DiceRollEventLog supports system-neutral d100 rolls',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const rng =
      createDiceSequenceRandomInt([
        88
      ]);

    const result =
      await logDiceRoll(
        {
          request:
            {
              formula:
                'd100',
              mode:
                'normal',
              criticalPolicy:
                'none'
            },
          transactionId:
            'txn-roll-d100',
          eventId:
            'evt-roll-d100',
          createdAt:
            CREATED_AT,
          completedAt:
            COMPLETED_AT,
          order:
            4,
          source:
            'unit-test',
          reason:
            'random-table',
          context:
            {
              source:
                'random-table',
              label:
                'Encounter table'
            }
        },
        {
          randomInt:
            rng.randomInt,
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      result.roll.total,
      88
    );

    assert.deepEqual(
      result.roll.dice,
      [
        {
          kind:
            'dice-term-result',
          diceTermIndex:
            0,
          notation:
            'd100',
          count:
            1,
          sides:
            100,
          faces:
            [
              88
            ],
          total:
            88
        }
      ]
    );
  }
);


test(
  'DiceRollEventLog can build a transaction without appending it',
  () => {

    const rng =
      createDiceSequenceRandomInt([
        13
      ]);

    const result =
      createDiceRollTransaction(
        {
          request:
            {
              formula:
                'd20 + 2'
            },
          transactionId:
            'txn-roll-runtime-only',
          eventId:
            'evt-roll-runtime-only',
          createdAt:
            CREATED_AT,
          completedAt:
            COMPLETED_AT,
          order:
            5,
          source:
            'unit-test'
        },
        {
          randomInt:
            rng.randomInt
        }
      );

    assert.equal(
      result.kind,
      'mow-dice-roll-transaction'
    );

    assert.equal(
      result.roll.total,
      15
    );

    assert.equal(
      result.transaction.events[0].payload.roll.total,
      15
    );
  }
);


test(
  'DiceRollEventLog failed append does not become durable or mutate Dice Engine ownership',
  async () => {

    const adapter =
      createMemoryStorageAdapter({
        failAppendPath:
          EVENT_TRANSACTION_LOG_PATH
      });

    const rng =
      createDiceSequenceRandomInt([
        11
      ]);

    await assert.rejects(
      () => logDiceRoll(
        {
          request:
            {
              formula:
                'd20'
            },
          transactionId:
            'txn-roll-failed-append',
          eventId:
            'evt-roll-failed-append',
          createdAt:
            CREATED_AT,
          completedAt:
            COMPLETED_AT,
          order:
            6,
          source:
            'unit-test',
          reason:
            'write-failure'
        },
        {
          randomInt:
            rng.randomInt,
          storageAdapter:
            adapter
        }
      ),
      error =>
        error instanceof EventStoreError
    );

    assert.equal(
      adapter.files.has(EVENT_TRANSACTION_LOG_PATH),
      false
    );

    assert.deepEqual(
      adapter.writePaths,
      []
    );

    const repeatable =
      rollDice(
        {
          formula:
            'd20'
        },
        {
          randomInt:
            createDiceSequenceRandomInt([
              11
            ]).randomInt
        }
      );

    assert.equal(
      repeatable.total,
      11
    );

    const diceSource =
      readFile(
        new URL(
          '../js/dice/diceEngine.js',
          import.meta.url
        ),
        'utf8'
      );

    await assert.doesNotReject(
      async () => {
        const source =
          await diceSource;

        assert.equal(
          source.includes('../events/'),
          false
        );

        assert.equal(
          source.includes('eventStore'),
          false
        );
      }
    );
  }
);


function createMemoryStorageAdapter(
  options = {}
) {

  const files =
    new Map();

  const writePaths =
    [];

  return {
    kind:
      'desktop',

    files,

    writePaths,

    getWorkspaceRoot() {

      return 'memory-dice-roll-event-log';
    },

    async ensureDirectory() {},

    async readText(path) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      if (!files.has(normalized)) {

        throw new Error(
          `File not found: ${normalized}`
        );
      }

      return files.get(
        normalized
      );
    },

    async writeText(path, content) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      if (normalized === options.failAppendPath) {

        throw new Error(
          'forced dice roll event append failure'
        );
      }

      writePaths.push(
        normalized
      );

      files.set(
        normalized,
        String(content)
      );
    },

    async appendText(path, content) {

      const normalized =
        normalizeWorkspacePath(
          path
        );

      if (normalized === options.failAppendPath) {

        throw new Error(
          'forced dice roll event append failure'
        );
      }

      writePaths.push(
        normalized
      );

      files.set(
        normalized,
        `${files.get(normalized) || ''}${content}`
      );
    }
  };
}
