import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPageById
} from '../js/repository/pageRepository.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  clearPageCommandEvents,
  clearPageUndoEntries
} from '../js/storage/pageCommandService.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  normalizeWorkspacePath
} from '../js/storage/storageAdapterContract.js';

import {
  clearWriteRevisions
} from '../js/storage/writeQueue.js';

import {
  EVENT_TRANSACTION_LOG_PATH,
  readEventTransactions
} from '../js/events/eventStore.js';

import {
  logDiceRoll
} from '../js/events/diceRollEventLog.js';

import {
  PAGE_PROPERTY_RESOURCE_ERROR_CODES,
  logPagePropertyResourceChange,
  readPageNumericPropertyResource
} from '../js/events/pagePropertyResourceTransaction.js';

import {
  TRANSACTION_REVERSAL_ERROR_CODES,
  TransactionReversalError,
  undoTransaction
} from '../js/events/transactionReversal.js';

import {
  createRuntimePage
} from './fixtures/editConflictFixtures.mjs';


const CREATED_AT =
  '2026-08-27T11:00:00.000Z';

const COMPLETED_AT =
  '2026-08-27T11:00:01.000Z';

const UNDO_CREATED_AT =
  '2026-08-27T11:05:00.000Z';

const UNDO_COMPLETED_AT =
  '2026-08-27T11:05:01.000Z';


test(
  'TransactionReversal undoes a resource change with a compensating transaction',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          8
      });

    await logPagePropertyResourceChange({
      page,
      field:
        'gold',
      after:
        5,
      transactionId:
        'txn-resource-spend',
      eventId:
        'evt-resource-spend',
      createdAt:
        CREATED_AT,
      completedAt:
        COMPLETED_AT,
      source:
        'unit-test',
      reason:
        'spend-gold',
      unit:
        'gp'
    },
    {
      storageAdapter:
        adapter
    });

    const result =
      await undoTransaction({
        transactionId:
          'txn-resource-spend',
        reversalTransactionId:
          'txn-undo-resource-spend',
        reversalEventId:
          'evt-undo-resource-spend',
        reversalMetadataEventId:
          'evt-undo-resource-spend-metadata',
        createdAt:
          UNDO_CREATED_AT,
        completedAt:
          UNDO_COMPLETED_AT,
        source:
          'unit-test',
        reason:
          'user-undo'
      },
      {
        storageAdapter:
          adapter
      });

    assert.equal(
      result.status,
      'durable'
    );

    assert.equal(
      result.reversesTransactionId,
      'txn-resource-spend'
    );

    assert.equal(
      readPageNumericPropertyResource(page, {
        field:
          'gold'
      }).value,
      8
    );

    assert.equal(
      readPageNumericPropertyResource({
        ...page,
        content:
          await adapter.readText(page.path)
      },
      {
        field:
          'gold'
      }).value,
      8
    );

    const transactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.equal(
      transactions.length,
      2
    );

    assert.equal(
      transactions[0].transactionId,
      'txn-resource-spend'
    );

    assert.equal(
      transactions[0].reversedByTransactionId,
      null
    );

    assert.equal(
      transactions[1].transactionId,
      'txn-undo-resource-spend'
    );

    assert.equal(
      transactions[1].reversesTransactionId,
      'txn-resource-spend'
    );

    assert.deepEqual(
      transactions[1].events.map(event => event.type),
      [
        'resource.changed',
        'transaction.reversal.recorded'
      ]
    );

    assert.equal(
      transactions[1].events[0].reversesEventId,
      'evt-resource-spend'
    );

    assert.deepEqual(
      transactions[1].events[0].payload,
      {
        after:
          8,
        before:
          5,
        delta:
          3,
        reason:
          'undo: user-undo',
        resource:
          {
            id:
              'stateful-item:gold',
            kind:
              'page-property',
            label:
              'Stateful Item · gold'
          },
        unit:
          'gp'
      }
    );

    assert.deepEqual(
      transactions[1].events[1].payload,
      {
        originalTransactionId:
          'txn-resource-spend',
        reason:
          'user-undo',
        reversalTransactionId:
          'txn-undo-resource-spend',
        reversedEventIds:
          [
            'evt-resource-spend'
          ]
      }
    );
  }
);


test(
  'TransactionReversal blocks double undo without editing existing history',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          12
      });

    await logPagePropertyResourceChange({
      page,
      field:
        'gold',
      after:
        4,
      transactionId:
        'txn-resource-double',
      eventId:
        'evt-resource-double',
      createdAt:
        CREATED_AT
      },
      {
        storageAdapter:
          adapter
      });

    await undoTransaction({
      transactionId:
        'txn-resource-double',
      reversalTransactionId:
        'txn-undo-resource-double',
      reversalEventId:
        'evt-undo-resource-double',
      reversalMetadataEventId:
        'evt-undo-resource-double-metadata',
      createdAt:
        UNDO_CREATED_AT
    },
    {
      storageAdapter:
        adapter
    });

    await assert.rejects(
      () => undoTransaction({
        transactionId:
          'txn-resource-double',
        reversalTransactionId:
          'txn-undo-resource-double-again',
        reversalEventId:
          'evt-undo-resource-double-again',
        reversalMetadataEventId:
          'evt-undo-resource-double-again-metadata',
        createdAt:
          '2026-08-27T11:06:00.000Z'
      },
      {
        storageAdapter:
          adapter
      }),
      error =>
        error instanceof TransactionReversalError &&
        error.code === TRANSACTION_REVERSAL_ERROR_CODES.ALREADY_REVERSED
    );

    const transactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.equal(
      transactions.length,
      2
    );

    assert.equal(
      transactions[0].reversedByTransactionId,
      null
    );

    assert.equal(
      readPageNumericPropertyResource(page, {
        field:
          'gold'
      }).value,
      12
    );
  }
);


test(
  'TransactionReversal can reload history and then undo the resource transaction',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          20
      });

    await logPagePropertyResourceChange({
      page,
      field:
        'gold',
      after:
        14,
      transactionId:
        'txn-resource-reload-undo',
      eventId:
        'evt-resource-reload-undo',
      createdAt:
        CREATED_AT,
      unit:
        'gp'
    },
    {
      storageAdapter:
        adapter
      });

    const reloadedPage =
      createRuntimePage({
        id:
          page.id,
        title:
          'Stateful Item',
        type:
          'item',
        template:
          'card',
        tags:
          [
            'item'
          ],
        body:
          '<p>placeholder</p>'
      });

    reloadedPage.content =
      await adapter.readText(
        page.path
      );

    setPages([
      reloadedPage
    ]);

    const result =
      await undoTransaction({
        transactionId:
          'txn-resource-reload-undo',
        reversalTransactionId:
          'txn-undo-resource-reload',
        reversalEventId:
          'evt-undo-resource-reload',
        reversalMetadataEventId:
          'evt-undo-resource-reload-metadata',
        createdAt:
          UNDO_CREATED_AT
      },
      {
        storageAdapter:
          adapter
      });

    assert.equal(
      result.pageId,
      page.id
    );

    assert.equal(
      readPageNumericPropertyResource(reloadedPage, {
        field:
          'gold'
      }).value,
      20
    );

    assert.equal(
      getPageById(page.id)?.content,
      await adapter.readText(page.path)
    );
  }
);


test(
  'TransactionReversal marks roll-only transactions as non-reversible',
  async () => {

    const {
      adapter
    } =
      await createStatefulResourceFixture({
        value:
          1
      });

    await logDiceRoll({
      request:
        {
          formula:
            'd20',
          mode:
            'normal',
          criticalPolicy:
            'none'
        },
      transactionId:
        'txn-roll-only',
      eventId:
        'evt-roll-only',
      createdAt:
        CREATED_AT
    },
    {
      storageAdapter:
        adapter,
      randomInt:
        () => 12
    });

    await assert.rejects(
      () => undoTransaction({
        transactionId:
          'txn-roll-only',
        reversalTransactionId:
          'txn-undo-roll-only',
        reversalEventId:
          'evt-undo-roll-only',
        reversalMetadataEventId:
          'evt-undo-roll-only-metadata',
        createdAt:
          UNDO_CREATED_AT
      },
      {
        storageAdapter:
          adapter
      }),
      error =>
        error instanceof TransactionReversalError &&
        error.code === TRANSACTION_REVERSAL_ERROR_CODES.NOT_REVERSIBLE
    );

    const transactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.equal(
      transactions.length,
      1
    );
  }
);


test(
  'TransactionReversal blocks stale current resource state before compensation write',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          8
      });

    await logPagePropertyResourceChange({
      page,
      field:
        'gold',
      after:
        5,
      transactionId:
        'txn-resource-stale-current',
      eventId:
        'evt-resource-stale-current',
      createdAt:
        CREATED_AT
    },
    {
      storageAdapter:
        adapter
      });

    await logPagePropertyResourceChange({
      page,
      field:
        'gold',
      after:
        2,
      transactionId:
        'txn-resource-later-change',
      eventId:
        'evt-resource-later-change',
      createdAt:
        '2026-08-27T11:02:00.000Z'
    },
    {
      storageAdapter:
        adapter
      });

    const writesBeforeUndo =
      adapter.writePathsAfterSetup.length;

    await assert.rejects(
      () => undoTransaction({
        transactionId:
          'txn-resource-stale-current',
        reversalTransactionId:
          'txn-undo-resource-stale-current',
        reversalEventId:
          'evt-undo-resource-stale-current',
        reversalMetadataEventId:
          'evt-undo-resource-stale-current-metadata',
        createdAt:
          UNDO_CREATED_AT
      },
      {
        storageAdapter:
          adapter
      }),
      error =>
        error instanceof TransactionReversalError &&
        error.code === TRANSACTION_REVERSAL_ERROR_CODES.CURRENT_STATE_CONFLICT
    );

    assert.equal(
      adapter.writePathsAfterSetup.length,
      writesBeforeUndo
    );

    assert.equal(
      readPageNumericPropertyResource(page, {
        field:
          'gold'
      }).value,
      2
    );
  }
);


test(
  'TransactionReversal failed compensation leaves no reversal event',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          6
      });

    await logPagePropertyResourceChange({
      page,
      field:
        'gold',
      after:
        3,
      transactionId:
        'txn-resource-write-failure-undo',
      eventId:
        'evt-resource-write-failure-undo',
      createdAt:
        CREATED_AT
    },
    {
      storageAdapter:
        adapter
      });

    adapter.failWritePaths.add(
      normalizeWorkspacePath(
        page.path
      )
    );

    await assert.rejects(
      () => undoTransaction({
        transactionId:
          'txn-resource-write-failure-undo',
        reversalTransactionId:
          'txn-undo-resource-write-failure',
        reversalEventId:
          'evt-undo-resource-write-failure',
        reversalMetadataEventId:
          'evt-undo-resource-write-failure-metadata',
        createdAt:
          UNDO_CREATED_AT
      },
      {
        storageAdapter:
          adapter
      }),
      error =>
        error instanceof TransactionReversalError &&
        error.code === TRANSACTION_REVERSAL_ERROR_CODES.COMPENSATION_FAILED &&
        error.cause?.code === PAGE_PROPERTY_RESOURCE_ERROR_CODES.STATE_WRITE_FAILED
    );

    assert.equal(
      readPageNumericPropertyResource(page, {
        field:
          'gold'
      }).value,
      3
    );

    const transactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.equal(
      transactions.length,
      1
    );
  }
);


test(
  'TransactionReversal event append failure rolls back compensation state',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          9
      });

    await logPagePropertyResourceChange({
      page,
      field:
        'gold',
      after:
        1,
      transactionId:
        'txn-resource-event-failure-undo',
      eventId:
        'evt-resource-event-failure-undo',
      createdAt:
        CREATED_AT
    },
    {
      storageAdapter:
        adapter
      });

    adapter.failAppendPaths.add(
      EVENT_TRANSACTION_LOG_PATH
    );

    await assert.rejects(
      () => undoTransaction({
        transactionId:
          'txn-resource-event-failure-undo',
        reversalTransactionId:
          'txn-undo-resource-event-failure',
        reversalEventId:
          'evt-undo-resource-event-failure',
        reversalMetadataEventId:
          'evt-undo-resource-event-failure-metadata',
        createdAt:
          UNDO_CREATED_AT
      },
      {
        storageAdapter:
          adapter
      }),
      error =>
        error instanceof TransactionReversalError &&
        error.code === TRANSACTION_REVERSAL_ERROR_CODES.COMPENSATION_FAILED &&
        error.cause?.code === PAGE_PROPERTY_RESOURCE_ERROR_CODES.EVENT_APPEND_FAILED
    );

    assert.equal(
      readPageNumericPropertyResource(page, {
        field:
          'gold'
      }).value,
      1
    );

    const transactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.equal(
      transactions.length,
      1
    );
  }
);


async function createStatefulResourceFixture({
  value
} = {}) {

  clearPageCommandEvents();
  clearPageUndoEntries();
  clearWriteRevisions();

  const adapter =
    createMemoryStorageAdapter();

  setStorageAdapter(
    adapter
  );

  const page =
    createRuntimePage({
      id:
        'stateful-item',
      title:
        'Stateful Item',
      type:
        'item',
      template:
        'card',
      tags:
        [
          'item'
        ],
      body:
        createItemPropertiesBody({
          gold:
            value
        })
    });

  await adapter.writeText(
    page.path,
    page.content
  );

  adapter.clearWritePaths();

  setPages([
    page
  ]);

  return {
    adapter,
    page
  };
}


function createItemPropertiesBody({
  gold
}) {

  return `
    <section class="entity-main">
      <h1>Stateful Item</h1>
      <div
        class="template-block card-properties-block card-properties-item"
        data-block-type="properties"
        data-block-version="1"
        data-card-type="item"
        contenteditable="false"
      >
        <h2 contenteditable="false">Свойства предмета</h2>
        <div class="card-properties-grid">
          <label class="card-property-field" data-property-id="gold">
            <span class="card-property-label">ЗМ</span>
            <input
              type="number"
              data-property-name="gold"
              data-property-type="number"
              value="${gold}"
            >
          </label>
        </div>
      </div>
    </section>
  `;
}


function createMemoryStorageAdapter() {

  const files =
    new Map();

  const directories =
    new Set([
      ''
    ]);

  const adapter = {
    kind:
      'desktop',
    files,
    writePaths:
      [],
    failWritePaths:
      new Set(),
    failAppendPaths:
      new Set(),

    get writePathsAfterSetup() {
      return [
        ...this.writePaths
      ];
    },

    clearWritePaths() {
      this.writePaths.length =
        0;
    },

    getWorkspaceRoot() {
      return 'memory-transaction-reversal';
    },

    async pickWorkspace() {
      return 'memory-transaction-reversal';
    },

    async restoreWorkspace() {
      return 'memory-transaction-reversal';
    },

    async ensureDirectory(path) {
      ensureDirectoryPath(
        directories,
        path
      );
    },

    async getDirectoryHandle(path) {
      return {
        kind:
          'directory',
        path:
          normalizeWorkspacePath(
            path
          )
      };
    },

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

      if (this.failWritePaths.has(normalized)) {
        throw new Error(
          `forced write failure: ${normalized}`
        );
      }

      ensureDirectoryPath(
        directories,
        getParentPath(
          normalized
        )
      );

      this.writePaths.push(
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

      if (this.failAppendPaths.has(normalized)) {
        throw new Error(
          `forced append failure: ${normalized}`
        );
      }

      ensureDirectoryPath(
        directories,
        getParentPath(
          normalized
        )
      );

      this.writePaths.push(
        normalized
      );

      files.set(
        normalized,
        `${files.get(normalized) || ''}${content}`
      );
    },

    async readBinary() {
      return new ArrayBuffer(0);
    },

    async writeBinary(path, content) {
      files.set(
        normalizeWorkspacePath(
          path
        ),
        content
      );
    },

    async listFiles(path = '') {
      const normalized =
        normalizeWorkspacePath(
          path
        );

      const prefix =
        normalized
          ? `${normalized}/`
          : '';

      return [...files.keys()]
        .filter(filePath =>
          filePath.startsWith(prefix)
        )
        .map(filePath => ({
          name:
            filePath.slice(prefix.length),
          kind:
            'file'
        }));
    },

    async removeFile(path) {
      files.delete(
        normalizeWorkspacePath(
          path
        )
      );
    },

    async removeDirectory(path) {
      const normalized =
        normalizeWorkspacePath(
          path
        );

      for (const filePath of [...files.keys()]) {
        if (
          filePath === normalized ||
          filePath.startsWith(`${normalized}/`)
        ) {
          files.delete(
            filePath
          );
        }
      }
    }
  };

  return adapter;
}


function ensureDirectoryPath(
  directories,
  path
) {

  const parts =
    normalizeWorkspacePath(
      path
    )
      .split('/')
      .filter(Boolean);

  let current =
    '';

  for (const part of parts) {
    current =
      current
        ? `${current}/${part}`
        : part;

    directories.add(
      current
    );
  }
}


function getParentPath(
  path
) {

  const parts =
    normalizeWorkspacePath(
      path
    )
      .split('/');

  parts.pop();

  return parts.join('/');
}
