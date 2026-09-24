// Общая связь inverse resources и metadata; здесь нет Combat-специфичного EventStore.
export function assertTransactionReversalRelations(transaction) {
  const events = transaction.events;
  const metadata = events.filter(event => event.type === 'transaction.reversal.recorded');
  if (!metadata.length && transaction.intentType !== 'transaction-reversal') return;
  const invalid = () => {
    const error = new Error('Invalid transaction reversal relations.');
    error.code = 'EVENT_TYPE_INVALID_PAYLOAD';
    throw error;
  };
  if (transaction.status !== 'completed' || !transaction.reversesTransactionId ||
      transaction.reversesTransactionId === transaction.transactionId || transaction.reversedByTransactionId ||
      metadata.length !== 1 || events.at(-1) !== metadata[0]) invalid();
  const payload = metadata[0].payload;
  const resources = events.slice(0, -1);
  if (!resources.length || payload.originalTransactionId !== transaction.reversesTransactionId ||
      payload.reversalTransactionId !== transaction.transactionId || metadata[0].reversesEventId ||
      new Set(payload.reversedEventIds).size !== payload.reversedEventIds.length ||
      payload.reversedEventIds.length !== resources.length) invalid();
  const identities = new Set();
  resources.forEach((event, index) => {
    if (event.type !== 'resource.changed' || !event.reversesEventId ||
        event.reversesEventId !== payload.reversedEventIds[index] ||
        event.payload.before === event.payload.after || event.payload.delta !== event.payload.after - event.payload.before) invalid();
    const identity = JSON.stringify([event.payload.resource.kind, event.payload.resource.id]);
    if (identities.has(identity)) invalid();
    identities.add(identity);
  });
  events.forEach((event, index) => {
    if (event.transactionId !== transaction.transactionId || event.reversedByEventId || event.order < 1 ||
        (index && event.order <= events[index - 1].order)) invalid();
  });
}
