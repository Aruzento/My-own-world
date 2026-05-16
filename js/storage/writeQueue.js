const writeQueues =
  new Map();


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

  return writeTextFile(
    page.handle,
    content,
    getPageWriteKey(page)
  );
}
