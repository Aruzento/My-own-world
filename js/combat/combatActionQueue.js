const queues = new WeakMap();

// Локальная сериализация action/будущего Undo; оптимистичные page preconditions остаются обязательными.
export function serializeCombatPageMutation(workspaceContext, pageId, operation) {
  let pages = queues.get(workspaceContext.adapter);
  if (!pages) { pages = new Map(); queues.set(workspaceContext.adapter, pages); }
  const previous = pages.get(pageId) || Promise.resolve();
  const pending = previous.catch(() => {}).then(operation);
  pages.set(pageId, pending);
  return pending.finally(() => { if (pages.get(pageId) === pending) pages.delete(pageId); });
}
