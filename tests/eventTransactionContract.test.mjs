import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


const CONTRACT_PATH =
  new URL(
    '../docs/02-architecture/contracts/EVENT_TRANSACTION_CONTRACT.md',
    import.meta.url
  );


test(
  'event transaction contract records owners, fields and storage approval gate',
  async () => {

    const contract =
      await readFile(
        CONTRACT_PATH,
        'utf8'
      );

    for (const phrase of [
      'Transaction = one user intent.',
      'Event = one fact produced inside that transaction.',
      'PageCommandService',
      'editorHistory',
      'Dice Engine',
      'CampaignMapStore',
      'CharacterModel',
      'operationJournal',
      'event identity',
      'transaction identity',
      'timestamp/order',
      'payload',
      'Undo must not silently delete history.',
      'js/events/transactionModel.js',
      'createTransaction(input)',
      'appendTransactionEvent(transaction, eventInput)',
      'completeTransaction(transaction, { completedAt })',
      'failTransaction(transaction, { failedAt, error, code })',
      'serializeTransaction(transaction)',
      'Owner approved the `0.0.1.15.1` sidecar decision',
      'js/events/eventStore.js',
      'appendTransactionRecord(transaction, { storageAdapter })',
      'readTransactionRecords({ storageAdapter, strict })',
      'readEventTransactions({ storageAdapter })',
      'js/events/eventTypes.js',
      'createTypedEvent(input)',
      'validateTypedEvent(input)',
      'roll.performed',
      'manual.correction.recorded',
      'resource.changed',
      'transaction.reversal.recorded',
      'payloadVersion: 1',
      'Reserved future namespaces',
      'damage.*',
      'scene.transition.*',
      'EVENT_TYPE_UNKNOWN',
      'type + anything JSON',
      'js/events/diceRollEventLog.js',
      'createDiceRollTransaction(input, options)',
      'logDiceRoll(input, options)',
      'caller intent',
      'RollResult',
      'Dice Engine remains side-effect free',
      'does not store parser AST',
      'js/events/pagePropertyResourceTransaction.js',
      'logPagePropertyResourceChange()',
      'read current numeric page property',
      'PageCommandService',
      'resource.changed',
      'kind: "page-property"',
      'event append failure triggers a compensating rollback',
      'js/events/transactionReversal.js',
      'V1 supported reversal',
      'reversesTransactionId',
      'reversesEventId',
      'transaction.reversal.recorded',
      'Double undo is blocked',
      'roll-only transactions are not state-reversible',
      'event append failure rolls the compensation page write back',
      '.my-own-world-events/',
      'transactions.v1.jsonl',
      'does not store hidden state inside card HTML',
      'write failure throws `EventStoreError`'
    ]) {

      assert.match(
        contract,
        new RegExp(
          escapeRegExp(
            phrase
          )
        )
      );
    }
  }
);


test(
  'event transaction contract keeps phase 15 out of combat and dice UI scope',
  async () => {

    const contract =
      await readFile(
        CONTRACT_PATH,
        'utf8'
      );

    for (const forbiddenScope of [
      'combat session logic',
      'attack resolution',
      'damage application',
      'HP automation',
      'effects',
      'targeting',
      'turns/rounds behavior',
      'dice UI'
    ]) {

      assert.match(
        contract,
        new RegExp(
          escapeRegExp(
            forbiddenScope
          )
        )
      );
    }
  }
);


function escapeRegExp(
  value
) {

  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
}
