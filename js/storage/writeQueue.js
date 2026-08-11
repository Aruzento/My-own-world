const writeQueues =
  new Map();

const writeRevisions =
  new Map();

const acceptedWriteRevisions =
  new Map();


let storageAdapterProvider =
  null;


export function setWriteQueueStorageAdapterProvider(
  provider
) {

  storageAdapterProvider =
    typeof provider === 'function'
      ? provider
      : null;
}


export function getPageWriteKey(
  page
) {

  return page?.id ||
    page?.path ||
    page?.name ||
    crypto.randomUUID();
}

export function createWriteRevision(
  key,
  metadata = {}
) {

  const writeKey =
    normalizeWriteKey(
      key
    );

  const previous =
    writeRevisions.get(
      writeKey
    );

  const entry = {
    key:
      writeKey,
    revision:
      Number(previous?.revision || 0) + 1,
    state:
      'changed',
    createdAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
    metadata:
      {
        ...metadata
      },
    error:
      null
  };

  writeRevisions.set(
    writeKey,
    entry
  );

  return serializeWriteRevision(
    entry
  );
}


export function markWriteRevisionState(
  revision,
  state,
  details = {}
) {

  const entry =
    getCurrentRevisionEntry(
      revision
    );

  if (!entry) return null;

  entry.state =
    state || entry.state;

  entry.updatedAt =
    new Date().toISOString();

  entry.error =
    details.error
      ? String(details.error)
      : null;

  writeRevisions.set(
    entry.key,
    entry
  );

  return serializeWriteRevision(
    entry
  );
}


export function isWriteRevisionCurrent(
  revision
) {

  return Boolean(
    getCurrentRevisionEntry(
      revision
    )
  );
}


export function getWriteRevisionState(
  key
) {

  const entry =
    writeRevisions.get(
      normalizeWriteKey(
        key
      )
    );

  return entry
    ? serializeWriteRevision(
      entry
    )
    : null;
}


export function clearWriteRevisions() {

  writeRevisions.clear();

  acceptedWriteRevisions.clear();
}


export function queueWrite(
  key,
  task
) {

  const writeKey =
    String(key || 'default');

  const previous =
    writeQueues.get(writeKey) || Promise.resolve();

  const next =
    previous
      .catch(() => {})
      .then(task);

  const queued =
    next.finally(() => {

      if (
        writeQueues.get(writeKey) === queued
      ) {

        writeQueues.delete(
          writeKey
        );
      }
    });

  queued.catch(() => {});

  writeQueues.set(
    writeKey,
    queued
  );

  return next;
}


export function writeTextFile(
  handle,
  content,
  key = handle?.name,
  options = {}
) {

  return writeFile(
    handle,
    String(content),
    key,
    options
  );
}


export function writeFile(
  handle,
  content,
  key = handle?.name,
  options = {}
) {

  const writeKey =
    normalizeWriteKey(
      key
    );

  acceptWriteRevisionForQueue(
    writeKey,
    options.revision
  );

  return queueWrite(
    writeKey,
    async () => {

      if (
        isStaleRevision(
          options.revision,
          writeKey
        )
      ) {

        return createWriteResult({
          key:
            writeKey,
          revision:
            options.revision,
          state:
            'stale',
          skipped:
            true
        });
      }

      markWriteRevisionState(
        options.revision,
        'saving'
      );

      if (
        handle?.adapterPath &&
        storageAdapterProvider
      ) {

        const storageAdapter =
          storageAdapterProvider();

        if (!canUseStorageAdapter(storageAdapter)) {

          throw new Error(
            'StorageAdapter недоступен для записи файла.'
          );
        }

        if (content instanceof ArrayBuffer) {

          await storageAdapter.writeBinary(
            handle.adapterPath,
            content
          );

          return finishWriteResult(
            writeKey,
            options.revision
          );
        }

        await storageAdapter.writeText(
          handle.adapterPath,
          String(content)
        );

        return finishWriteResult(
          writeKey,
          options.revision
        );
      }

      const writable =
        await handle.createWritable();

      await writable.write(content);

      await writable.close();

      return finishWriteResult(
        writeKey,
        options.revision
      );
    }
  );
}


export function writePageContent(
  page,
  content,
  options = {}
) {

  const writeKey =
    getPageWriteKey(
      page
    );

  if (
    page?.path &&
    storageAdapterProvider
  ) {

    const storageAdapter =
      storageAdapterProvider();

    if (!canUseStorageAdapter(storageAdapter)) {

      return writeTextFile(
        page.handle,
        content,
        writeKey,
        options
      );
    }

    acceptWriteRevisionForQueue(
      writeKey,
      options.revision
    );

    return queueWrite(
      writeKey,
      async () => {

        if (
          isStaleRevision(
            options.revision,
            writeKey
          )
        ) {

          return createWriteResult({
            key:
              writeKey,
            revision:
              options.revision,
            state:
              'stale',
            skipped:
              true
          });
        }

        markWriteRevisionState(
          options.revision,
          'saving'
        );

        await storageAdapter.writeText(
          page.path,
          String(content)
        );

        return finishWriteResult(
          writeKey,
          options.revision
        );
      }
    );
  }

  return writeTextFile(
    page.handle,
    content,
    writeKey,
    options
  );
}


function finishWriteResult(
  key,
  revision
) {

  if (
    revision &&
    !isAcceptedWriteRevisionCurrent(
      revision,
      key
    )
  ) {

    return createWriteResult({
      key,
      revision,
      state:
        'superseded-after-write',
      written:
        true
    });
  }

  markWriteRevisionState(
    revision,
    'saved'
  );

  return createWriteResult({
    key,
    revision,
    state:
      'saved',
    written:
      true
  });
}


function isStaleRevision(
  revision,
  key
) {

  return Boolean(
    revision &&
    !isAcceptedWriteRevisionCurrent(
      revision,
      key
    )
  );
}


function acceptWriteRevisionForQueue(
  key,
  revision
) {

  if (!revision?.key) return null;

  if (
    !isWriteRevisionCurrent(
      revision
    )
  ) {

    return null;
  }

  const acceptedRevision = {
    key:
      normalizeWriteKey(
        key || revision.key
      ),
    revision:
      Number(
        revision.revision
      )
  };

  acceptedWriteRevisions.set(
    acceptedRevision.key,
    acceptedRevision
  );

  const revisionKey =
    normalizeWriteKey(
      revision.key
    );

  if (
    revisionKey !== acceptedRevision.key
  ) {

    acceptedWriteRevisions.set(
      revisionKey,
      acceptedRevision
    );
  }

  return {
    ...acceptedRevision
  };
}


function isAcceptedWriteRevisionCurrent(
  revision,
  key
) {

  if (!revision?.key) return true;

  const writeKey =
    normalizeWriteKey(
      key || revision.key
    );

  const revisionKey =
    normalizeWriteKey(
      revision.key
    );

  const acceptedRevision =
    acceptedWriteRevisions.get(
      writeKey
    ) ||
    acceptedWriteRevisions.get(
      revisionKey
    );

  if (!acceptedRevision) {

    return isWriteRevisionCurrent(
      revision
    );
  }

  return acceptedRevision.revision === Number(
    revision.revision
  );
}


function getCurrentRevisionEntry(
  revision
) {

  if (!revision?.key) return null;

  const entry =
    writeRevisions.get(
      normalizeWriteKey(
        revision.key
      )
    );

  if (
    !entry ||
    entry.revision !== Number(revision.revision)
  ) {

    return null;
  }

  return entry;
}


function createWriteResult({
  key,
  revision,
  state,
  written = false,
  skipped = false
}) {

  return {
    key:
      normalizeWriteKey(
        key || revision?.key
      ),
    revision:
      revision?.revision ?? null,
    state,
    written:
      Boolean(written),
    skipped:
      Boolean(skipped),
    current:
      revision
        ? isAcceptedWriteRevisionCurrent(
          revision,
          key
        )
        : true
  };
}


function serializeWriteRevision(
  entry
) {

  return {
    key:
      entry.key,
    revision:
      entry.revision,
    state:
      entry.state,
    createdAt:
      entry.createdAt,
    updatedAt:
      entry.updatedAt,
    metadata:
      {
        ...entry.metadata
      },
    error:
      entry.error
  };
}


function normalizeWriteKey(
  key
) {

  return String(
    key || 'default'
  );
}


function canUseStorageAdapter(
  storageAdapter
) {

  if (!storageAdapter) return false;

  if (storageAdapter.kind === 'desktop') {

    return Boolean(
      storageAdapter.getWorkspaceRoot?.()
    );
  }

  if (storageAdapter.kind === 'browser') {

    return Boolean(
      storageAdapter.getWorkspaceHandle?.()
    );
  }

  return true;
}
