const MAX_WORKSPACE_PERFORMANCE_EVENTS =
  100;

const workspacePerformanceEvents =
  [];


export function nowMs() {

  if (globalThis.performance?.now) {

    return globalThis.performance.now();
  }

  return Date.now();
}


export function recordWorkspacePerformance(
  event
) {

  const normalized =
    {
      id:
        event?.id || crypto.randomUUID?.() || String(Date.now()),
      operation:
        event?.operation || 'workspace-operation',
      startedAt:
        event?.startedAt ?? null,
      endedAt:
        event?.endedAt ?? null,
      durationMs:
        Math.max(
          0,
          Math.round(
            Number(event?.durationMs || 0)
          )
        ),
      counts:
        {
          ...(event?.counts || {})
        },
      status:
        event?.status || 'completed'
    };

  workspacePerformanceEvents.unshift(
    normalized
  );

  workspacePerformanceEvents.splice(
    MAX_WORKSPACE_PERFORMANCE_EVENTS
  );

  return normalized;
}


export async function measureWorkspaceOperation(
  operation,
  callback,
  options = {}
) {

  const startedAt =
    nowMs();

  try {

    const result =
      await callback();

    recordWorkspacePerformance({
      operation,
      startedAt,
      endedAt:
        nowMs(),
      durationMs:
        nowMs() - startedAt,
      counts:
        typeof options.counts === 'function'
          ? options.counts(result)
          : options.counts,
      status:
        'completed'
    });

    return result;

  } catch (error) {

    recordWorkspacePerformance({
      operation,
      startedAt,
      endedAt:
        nowMs(),
      durationMs:
        nowMs() - startedAt,
      counts:
        typeof options.counts === 'function'
          ? options.counts(null, error)
          : options.counts,
      status:
        'failed'
    });

    throw error;
  }
}


export function getWorkspacePerformanceEvents() {

  return [
    ...workspacePerformanceEvents
  ];
}


export function clearWorkspacePerformanceEvents() {

  workspacePerformanceEvents.length =
    0;
}


export function createProgressMessage({
  label = 'Операция',
  current = 0,
  total = 0,
  stage = ''
} = {}) {

  const prefix =
    stage
      ? `${label}: ${stage}`
      : label;

  if (!total) return prefix;

  return `${prefix} ${current}/${total}`;
}
