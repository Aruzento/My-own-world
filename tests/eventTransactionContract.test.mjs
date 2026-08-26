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
      'OWNER APPROVAL REQUIRED',
      '.my-own-world-events/',
      'transactions.v1.jsonl',
      'does not implement durable event storage'
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
