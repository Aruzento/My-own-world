const DEFAULT_WORKSPACE_ID =
  'current-workspace';

const RECENT_LIMIT =
  20;

const jobsByKey =
  new Map();

const queue =
  [];

const recentJobs =
  [];

let activeJob =
  null;

let scheduledHandle =
  null;


export function enqueueBackgroundCheckpoint({
  type,
  workspaceId = DEFAULT_WORKSPACE_ID,
  reason = '',
  payload = {},
  run,
  slowMs = 1000,
  createdAt = new Date().toISOString()
} = {}) {

  if (!type) {

    throw new Error(
      'Background checkpoint type is required.'
    );
  }

  if (typeof run !== 'function') {

    throw new Error(
      'Background checkpoint run callback is required.'
    );
  }

  const key =
    createJobKey(
      type,
      workspaceId
    );

  const existing =
    jobsByKey.get(
      key
    );

  if (existing) {

    existing.reasons =
      mergeReasons(
        existing.reasons,
        reason
      );

    existing.payload = {
      ...existing.payload,
      ...payload
    };

    existing.run =
      run;

    if (existing.status === 'running') {

      existing.rerunRequested =
        true;
    }

    return {
      ...existing,
      deduped:
        true
    };
  }

  const job = {
    key,
    type,
    workspaceId,
    reasons:
      mergeReasons(
        [],
        reason
      ),
    payload:
      payload || {},
    run,
    slowMs,
    status:
      'queued',
    createdAt,
    startedAt:
      null,
    finishedAt:
      null,
    durationMs:
      null,
    result:
      null,
    error:
      null,
    rerunRequested:
      false
  };

  jobsByKey.set(
    key,
    job
  );

  queue.push(
    job
  );

  scheduleQueueRun();

  return {
    ...job,
    deduped:
      false
  };
}


export async function flushBackgroundCheckpoints() {

  cancelScheduledRun();

  while (
    queue.length > 0 ||
    activeJob
  ) {

    if (activeJob) {

      await activeJob.promise;
      continue;
    }

    await runNextJob();
  }

  return getBackgroundCheckpointSnapshot();
}


export function getBackgroundCheckpointSnapshot() {

  return {
    active:
      activeJob
        ? serializeJob(
          activeJob
        )
        : null,
    queued:
      queue.map(
        serializeJob
      ),
    recent:
      recentJobs.map(
        serializeJob
      )
  };
}


export function clearBackgroundCheckpointQueue() {

  cancelScheduledRun();

  queue.length =
    0;

  recentJobs.length =
    0;

  jobsByKey.clear();

  activeJob =
    null;
}


function scheduleQueueRun() {

  if (scheduledHandle) return;

  const runner =
    () => {

      scheduledHandle =
        null;

      void runNextJob();
    };

  if (
    typeof window !== 'undefined' &&
    typeof window.requestIdleCallback === 'function'
  ) {

    scheduledHandle = {
      type:
        'idle',
      id:
        window.requestIdleCallback(
          runner,
          {
            timeout:
              2000
          }
        )
    };

    return;
  }

  scheduledHandle = {
    type:
      'timeout',
    id:
      setTimeout(
        runner,
        0
      )
  };
}


function cancelScheduledRun() {

  if (!scheduledHandle) return;

  if (
    scheduledHandle.type === 'idle' &&
    typeof window !== 'undefined' &&
    typeof window.cancelIdleCallback === 'function'
  ) {

    window.cancelIdleCallback(
      scheduledHandle.id
    );

  } else {

    clearTimeout(
      scheduledHandle.id
    );
  }

  scheduledHandle =
    null;
}


async function runNextJob() {

  if (activeJob) {

    return activeJob.promise;
  }

  const job =
    queue.shift();

  if (!job) return null;

  job.status =
    'running';

  job.startedAt =
    new Date().toISOString();

  const startedAt =
    Date.now();

  const promise =
    Promise.resolve()
      .then(() =>
        job.run({
          type:
            job.type,
          workspaceId:
            job.workspaceId,
          reasons:
            [...job.reasons],
          payload:
            {
              ...job.payload
            }
        })
      )
      .then(result => {

        job.status =
          'completed';

        job.result =
          result || null;

        return job;
      })
      .catch(error => {

        job.status =
          'failed';

        job.error =
          String(error?.message || error || 'Unknown checkpoint error');

        console.warn(
          'Background checkpoint failed.',
          job.type,
          error
        );

        return job;
      })
      .finally(() => {

        job.durationMs =
          Date.now() - startedAt;

        job.finishedAt =
          new Date().toISOString();

        activeJob =
          null;

        jobsByKey.delete(
          job.key
        );

        pushRecentJob(
          job
        );

        if (job.rerunRequested) {

          enqueueBackgroundCheckpoint({
            type:
              job.type,
            workspaceId:
              job.workspaceId,
            reason:
              'rerun-requested',
            payload:
              job.payload,
            run:
              job.run,
            slowMs:
              job.slowMs
          });
        }

        if (queue.length > 0) {

          scheduleQueueRun();
        }
      });

  activeJob = {
    ...job,
    promise
  };

  return promise;
}


function pushRecentJob(
  job
) {

  recentJobs.unshift(
    job
  );

  recentJobs.splice(
    RECENT_LIMIT
  );
}


function createJobKey(
  type,
  workspaceId
) {

  return `${workspaceId || DEFAULT_WORKSPACE_ID}:${type}`;
}


function mergeReasons(
  existing,
  reason
) {

  const reasons =
    Array.isArray(existing)
      ? [...existing]
      : [];

  const normalized =
    String(reason || '')
      .trim();

  if (
    normalized &&
    !reasons.includes(
      normalized
    )
  ) {

    reasons.push(
      normalized
    );
  }

  return reasons;
}


function serializeJob(
  job
) {

  return {
    key:
      job.key,
    type:
      job.type,
    workspaceId:
      job.workspaceId,
    reasons:
      [...(job.reasons || [])],
    status:
      job.status,
    createdAt:
      job.createdAt,
    startedAt:
      job.startedAt,
    finishedAt:
      job.finishedAt,
    durationMs:
      job.durationMs,
    result:
      job.result,
    error:
      job.error
  };
}
