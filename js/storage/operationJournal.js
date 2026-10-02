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
  operation,
  adapter = getStorageAdapter(),
  verifyReadback = false
) {

  const storageAdapter =
    adapter;

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
    entry,
    verifyReadback
  );

  return entry;
}


export async function commitWorkspaceOperation(
  entry,
  adapter = getStorageAdapter(),
  verifyReadback = false
) {

  if (!entry?.id) return null;

  const storageAdapter =
    adapter;

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
    committedEntry,
    verifyReadback
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
  error,
  adapter = getStorageAdapter(),
  verifyReadback = false
) {

  if (!entry?.id) return null;

  const storageAdapter =
    adapter;

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
    failedEntry,
    verifyReadback
  );

  return failedEntry;
}


export async function listPendingWorkspaceOperations(
  storageAdapter = getStorageAdapter(), directory = OPERATION_JOURNAL_PENDING_DIR
) {

  try {

    const files =
      await storageAdapter.listFiles(
        directory
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
        `${directory}/${file.name}`;

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

// Destructive cleanup must not use the UI reader's [] fallback on corrupt evidence.
export async function collectProtectedOperationBackupIds(adapter = getStorageAdapter()) {
  const root = adapter.getWorkspaceRoot?.() || adapter.getWorkspaceHandle?.();
  const entries = [];
  for (const status of ['pending', 'failed', 'committed']) {
    const directory = `${OPERATION_JOURNAL_ROOT}/${status}`;
    let files;
    try { files = await adapter.listFiles(directory); }
    catch (error) {
      if (error?.name === 'NotFoundError' || error?.code === 'ENOENT') continue;
      throw new Error('Backup cleanup blocked: operation journal cannot be read', { cause: error });
    }
    for (const file of files) {
      if (file.kind && file.kind !== 'file') continue;
      if (!String(file.name || '').endsWith('.json')) continue;
      if (!/^[^/\\]+\.json$/.test(file.name)) throw new Error('Backup cleanup blocked: invalid journal path');
      let entry;
      try { entry = JSON.parse(await adapter.readText(`${directory}/${file.name}`)); }
      catch (error) { throw new Error('Backup cleanup blocked: invalid operation journal', { cause: error }); }
      if (entry?.version !== 1 || entry.status !== status || `${entry.id}.json` !== file.name ||
          typeof entry.type !== 'string' || !entry.before || typeof entry.before !== 'object' || Array.isArray(entry.before)) {
        throw new Error('Backup cleanup blocked: unsupported operation journal');
      }
      if (entry.before.backupId != null && (typeof entry.before.backupId !== 'string' || !entry.before.backupId)) {
        throw new Error('Backup cleanup blocked: invalid recovery backup identity');
      }
      entries.push(entry);
    }
  }
  const recoveryIdentity = entry => JSON.stringify([entry.id, entry.type, entry.before]);
  const committed = new Set(entries.filter(entry => entry.status === 'committed' && entry.before.backupId).map(recoveryIdentity));
  const protectedIds = new Set();
  for (const entry of entries) {
    if (entry.status === 'committed' || !entry.before.backupId) continue;
    // Resume can leave the failed checkpoint behind. Only the exact same operation's
    // durable terminal receipt releases its source snapshot, never a matching id alone.
    const terminal = committed.has(recoveryIdentity(entry));
    if (!terminal) protectedIds.add(entry.before.backupId);
  }
  if (root !== (adapter.getWorkspaceRoot?.() || adapter.getWorkspaceHandle?.())) {
    throw new Error('Backup cleanup blocked: workspace changed during journal scan');
  }
  return protectedIds;
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
  entry,
  verifyReadback = false
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
  if (verifyReadback && await storageAdapter.readText(getJournalEntryPath(status, entry.id)) !== JSON.stringify(entry, null, 2)) {
    throw new Error('Operation journal readback mismatch');
  }
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
