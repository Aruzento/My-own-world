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
  EventStoreError,
  readEventTransactions
} from '../js/events/eventStore.js';

import {
  EVENT_TYPES_V1
} from '../js/events/eventTypes.js';

import {
  PagePropertyResourceTransactionError,
  logPagePropertyResourceChange,
  readPageNumericPropertyResource
} from '../js/events/pagePropertyResourceTransaction.js';

import {
  createRuntimePage,
  parseFixtureContent
} from './fixtures/editConflictFixtures.mjs';


const CREATED_AT =
  '2026-08-27T10:00:00.000Z';

const COMPLETED_AT =
  '2026-08-27T10:00:01.000Z';


test(
  'PagePropertyResourceTransaction changes a page property and appends a durable resource event',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          10
      });

    const result =
      await logPagePropertyResourceChange({
        page,
        field:
          'gold',
        after:
          17,
        transactionId:
          'txn-resource-success',
        eventId:
          'evt-resource-success',
        createdAt:
          CREATED_AT,
        completedAt:
          COMPLETED_AT,
        order:
          1,
        source:
          'unit-test',
        reason:
          'manual-resource-adjustment',
        unit:
          'gp'
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
      result.before,
      10
    );

    assert.equal(
      result.after,
      17
    );

    assert.equal(
      result.delta,
      7
    );

    assert.equal(
      readPageNumericPropertyResource(page, {
        field:
          'gold'
      }).value,
      17
    );

    const durableContent =
      await adapter.readText(
        page.path
      );

    assert.equal(
      readPageNumericPropertyResource({
        ...page,
        content:
          durableContent
      },
      {
        field:
          'gold'
      }).value,
      17
    );

    const parsed =
      parseFixtureContent(
        durableContent
      );

    assert.equal(
      parsed.title,
      'Stateful Item'
    );

    assert.equal(
      getPageById(
        page.id
      )?.content,
      durableContent
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

    const [
      transaction
    ] =
      transactions;

    assert.equal(
      transaction.transactionId,
      'txn-resource-success'
    );

    assert.equal(
      transaction.status,
      'completed'
    );

    assert.equal(
      transaction.events[0].type,
      EVENT_TYPES_V1.RESOURCE_CHANGED
    );

    assert.deepEqual(
      transaction.events[0].payload,
      {
        after:
          17,
        before:
          10,
        delta:
          7,
        reason:
          'manual-resource-adjustment',
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
  }
);


test(
  'PagePropertyResourceTransaction reloads the same changed state and event',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          4
      });

    await logPagePropertyResourceChange({
      page,
      field:
        'gold',
      after:
        9,
      transactionId:
        'txn-resource-reload',
      eventId:
        'evt-resource-reload',
      createdAt:
        CREATED_AT,
      completedAt:
        COMPLETED_AT,
      order:
        2,
      source:
        'unit-test'
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
          'placeholder',
        body:
          '<p>placeholder</p>'
      });

    reloadedPage.content =
      await adapter.readText(
        page.path
      );

    assert.equal(
      readPageNumericPropertyResource(reloadedPage, {
        field:
          'gold'
      }).value,
      9
    );

    const reloadedTransactions =
      await readEventTransactions({
        storageAdapter:
          adapter
      });

    assert.equal(
      reloadedTransactions[0].events[0].payload.before,
      4
    );

    assert.equal(
      reloadedTransactions[0].events[0].payload.after,
      9
    );
  }
);


test(
  'PagePropertyResourceTransaction rejects invalid targets before page or event writes',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          3
      });

    const beforeContent =
      page.content;

    await assert.rejects(
      () => logPagePropertyResourceChange({
        page,
        field:
          'silver',
        after:
          5,
        transactionId:
          'txn-resource-invalid-target',
        eventId:
          'evt-resource-invalid-target',
        createdAt:
          CREATED_AT
      },
      {
        storageAdapter:
          adapter
      }),
      error =>
        error instanceof PagePropertyResourceTransactionError &&
        error.code === 'RESOURCE_TARGET_NOT_FOUND'
    );

    assert.equal(
      page.content,
      beforeContent
    );

    assert.equal(
      await adapter.readText(page.path),
      beforeContent
    );

    assert.equal(
      adapter.files.has(EVENT_TRANSACTION_LOG_PATH),
      false
    );

    assert.deepEqual(
      adapter.writePathsAfterSetup,
      []
    );
  }
);


test(
  'PagePropertyResourceTransaction write failure leaves no resource event',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          6
      });

    const beforeContent =
      page.content;

    adapter.failWritePaths.add(
      normalizeWorkspacePath(
        page.path
      )
    );

    await assert.rejects(
      () => logPagePropertyResourceChange({
        page,
        field:
          'gold',
        after:
          11,
        transactionId:
          'txn-resource-write-failure',
        eventId:
          'evt-resource-write-failure',
        createdAt:
          CREATED_AT,
        source:
          'unit-test'
      },
      {
        storageAdapter:
          adapter
      }),
      error =>
        error instanceof PagePropertyResourceTransactionError &&
        error.code === 'RESOURCE_STATE_WRITE_FAILED'
    );

    assert.equal(
      page.content,
      beforeContent
    );

    assert.equal(
      await adapter.readText(page.path),
      beforeContent
    );

    assert.equal(
      adapter.files.has(EVENT_TRANSACTION_LOG_PATH),
      false
    );
  }
);


test(
  'PagePropertyResourceTransaction event failure rolls back the page change through page command owner',
  async () => {

    const {
      adapter,
      page
    } =
      await createStatefulResourceFixture({
        value:
          8
      });

    const beforeContent =
      page.content;

    adapter.failAppendPaths.add(
      EVENT_TRANSACTION_LOG_PATH
    );

    await assert.rejects(
      () => logPagePropertyResourceChange({
        page,
        field:
          'gold',
        after:
          15,
        transactionId:
          'txn-resource-event-failure',
        eventId:
          'evt-resource-event-failure',
        createdAt:
          CREATED_AT,
        source:
          'unit-test'
      },
      {
        storageAdapter:
          adapter
      }),
      error =>
        error instanceof PagePropertyResourceTransactionError &&
        error.code === 'RESOURCE_EVENT_APPEND_FAILED' &&
        error.cause instanceof EventStoreError &&
        error.rollback?.writeStatus === 'saved'
    );

    assert.equal(
      page.content,
      beforeContent
    );

    assert.equal(
      await adapter.readText(page.path),
      beforeContent
    );

    assert.equal(
      readPageNumericPropertyResource(page, {
        field:
          'gold'
      }).value,
      8
    );

    assert.equal(
      adapter.files.has(EVENT_TRANSACTION_LOG_PATH),
      false
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
      return 'memory-page-property-resource-transaction';
    },

    async pickWorkspace() {
      return 'memory-page-property-resource-transaction';
    },

    async restoreWorkspace() {
      return 'memory-page-property-resource-transaction';
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
