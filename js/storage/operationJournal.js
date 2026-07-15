import {
  getStorageAdapter
} from './storageAdapter.js';

import {
  normalizeWorkspacePath
} from './storageAdapterContract.js';


export const OPERATION_JOURNAL_ROOT =
  '.my-own-world-ops';

export const OPERATION_JOURNAL_PENDING_DIR =
  `${OPERATION_JOURNAL_ROOT}/pending`;

export const OPERATION_JOURNAL_COMMITTED_DIR =
  `${OPERATION_JOURNAL_ROOT}/committed`;

export const OPERATION_JOURNAL_FAILED_DIR =
  `${OPERATION_JOURNAL_ROOT}/failed`;


export function createOperationId(
  type = 'operation',
  date = new Date()
) {

  const safeType =
    String(type || 'operation')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    'operation';

  const timestamp =
    date
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-');

  return `${timestamp}-${safeType}`;
}


export function createOperationJournalEntry({
  id = createOperationId(),
  type = 'operation',
  affectedPages = [],
  before = {},
  after = {},
  status = 'pending',
  createdAt = new Date().toISOString()
} = {}) {

  return {
    version: 1,
    id,
    type,
    createdAt,
    status,
    affectedPages:
      normalizeStringList(
        affectedPages
      ),
    before:
      before || {},
    after:
      after || {}
  };
}


export async function beginWorkspaceOperation(
  operation
) {

  const storageAdapter =
    getStorageAdapter();

  const entry =
    createOperationJournalEntry(
      operation
    );

  await ensureJournalDirectories(
    storageAdapter
  );

  await writeJournalEntry(
    storageAdapter,
    'pending',
    entry
  );

  return entry;
}


export async function commitWorkspaceOperation(
  entry
) {

  if (!entry?.id) return null;

  const storageAdapter =
    getStorageAdapter();

  const committedEntry = {
    ...entry,
    status: 'committed',
    committedAt:
      new Date().toISOString()
  };

  await ensureJournalDirectories(
    storageAdapter
  );

  await writeJournalEntry(
    storageAdapter,
    'committed',
    committedEntry
  );

  await removeJournalEntry(
    storageAdapter,
    'pending',
    entry.id
  );

  return committedEntry;
}


export async function failWorkspaceOperation(
  entry,
  error
) {

  if (!entry?.id) return null;

  const storageAdapter =
    getStorageAdapter();

  const failedEntry = {
    ...entry,
    status: 'failed',
    failedAt:
      new Date().toISOString(),
    error:
      String(error?.message || error || 'Unknown operation error')
  };

  await ensureJournalDirectories(
    storageAdapter
  );

  await writeJournalEntry(
    storageAdapter,
    'failed',
    failedEntry
  );

  return failedEntry;
}


export async function listPendingWorkspaceOperations(
  storageAdapter = getStorageAdapter()
) {

  try {

    const files =
      await storageAdapter.listFiles(
        OPERATION_JOURNAL_PENDING_DIR
      );

    const entries =
      [];

    for (const file of files) {

      if (
        file.kind &&
        file.kind !== 'file'
      ) continue;

      if (
        !String(file.name || '').endsWith(
          '.json'
        )
      ) continue;

      const path =
        `${OPERATION_JOURNAL_PENDING_DIR}/${file.name}`;

      const content =
        await storageAdapter.readText(
          path
        );

      entries.push(
        JSON.parse(
          content
        )
      );
    }

    return entries;

  } catch (error) {

    return [];
  }
}


async function ensureJournalDirectories(
  storageAdapter
) {

  await storageAdapter.ensureDirectory(
    OPERATION_JOURNAL_PENDING_DIR
  );

  await storageAdapter.ensureDirectory(
    OPERATION_JOURNAL_COMMITTED_DIR
  );

  await storageAdapter.ensureDirectory(
    OPERATION_JOURNAL_FAILED_DIR
  );
}


async function writeJournalEntry(
  storageAdapter,
  status,
  entry
) {

  await storageAdapter.writeText(
    getJournalEntryPath(
      status,
      entry.id
    ),
    JSON.stringify(
      entry,
      null,
      2
    )
  );
}


async function removeJournalEntry(
  storageAdapter,
  status,
  id
) {

  try {

    await storageAdapter.removeFile(
      getJournalEntryPath(
        status,
        id
      )
    );

  } catch (error) {

    // Removing pending journal entry is cleanup. A missing file means the
    // committed entry is already durable enough for this first journal layer.
  }
}


function getJournalEntryPath(
  status,
  id
) {

  const directory =
    status === 'committed'
      ? OPERATION_JOURNAL_COMMITTED_DIR
      : status === 'failed'
        ? OPERATION_JOURNAL_FAILED_DIR
        : OPERATION_JOURNAL_PENDING_DIR;

  return normalizeWorkspacePath(
    `${directory}/${id}.json`
  );
}


function normalizeStringList(
  values
) {

  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map(value =>
          String(value || '').trim()
        )
        .filter(Boolean)
    )
  ];
}
