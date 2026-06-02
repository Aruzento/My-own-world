const writeQueues =
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

  writeQueues.set(
    writeKey,
    queued
  );

  return next;
}


export function writeTextFile(
  handle,
  content,
  key = handle?.name
) {

  return writeFile(
    handle,
    String(content),
    key
  );
}


export function writeFile(
  handle,
  content,
  key = handle?.name
) {

  return queueWrite(
    key,
    async () => {

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

          return;
        }

        await storageAdapter.writeText(
          handle.adapterPath,
          String(content)
        );

        return;
      }

      const writable =
        await handle.createWritable();

      await writable.write(content);

      await writable.close();
    }
  );
}


export function writePageContent(
  page,
  content
) {

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
        getPageWriteKey(page)
      );
    }

    return queueWrite(
      getPageWriteKey(page),
      async () => {

        await storageAdapter.writeText(
          page.path,
          String(content)
        );
      }
    );
  }

  return writeTextFile(
    page.handle,
    content,
    getPageWriteKey(page)
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
