import {
  createProgressMessage
} from '../performance/workspacePerformance.js';


let progressElement =
  null;

let hideTimer =
  null;


export function showOperationProgress(
  progress = {}
) {

  const element =
    ensureProgressElement();

  clearTimeout(
    hideTimer
  );

  const normalized =
    normalizeProgress(
      progress
    );

  element.classList.remove(
    'is-hidden',
    'is-complete',
    'is-failed',
    'is-collapsed'
  );

  element.querySelector('.operation-progress-title').textContent =
    normalized.label;

  element.querySelector('.operation-progress-stage').textContent =
    normalized.message;

  element.querySelector('.operation-progress-count').textContent =
    normalized.countText;

  element.querySelector('.operation-progress-elapsed').textContent =
    normalized.elapsedText;

  element.querySelector('.operation-progress-fill').style.width =
    `${normalized.percent}%`;

  element.querySelector('.operation-progress-percent').textContent =
    `${normalized.percent}%`;

  element.setAttribute(
    'aria-valuenow',
    String(normalized.percent)
  );

  return normalized.message;
}


export function finishOperationProgress({
  message = 'Done',
  status = 'complete',
  delayMs = 1800
} = {}) {

  if (!progressElement) return;

  clearTimeout(
    hideTimer
  );

  progressElement.classList.remove(
    'is-hidden',
    'is-complete',
    'is-failed'
  );

  progressElement.classList.add(
    status === 'failed'
      ? 'is-failed'
      : 'is-complete'
  );

  progressElement.querySelector('.operation-progress-stage').textContent =
    message;

  progressElement.querySelector('.operation-progress-fill').style.width =
    status === 'failed'
      ? progressElement.querySelector('.operation-progress-fill').style.width || '100%'
      : '100%';

  progressElement.querySelector('.operation-progress-percent').textContent =
    status === 'failed'
      ? progressElement.querySelector('.operation-progress-percent').textContent || ''
      : '100%';

  hideTimer =
    setTimeout(
      hideOperationProgress,
      delayMs
    );
}


export function hideOperationProgress() {

  if (!progressElement) return;

  progressElement.classList.add(
    'is-hidden'
  );
}


function ensureProgressElement() {

  if (progressElement?.isConnected) {

    return progressElement;
  }

  progressElement =
    document.createElement('aside');

  progressElement.className =
    'operation-progress is-hidden';

  progressElement.setAttribute(
    'role',
    'progressbar'
  );

  progressElement.setAttribute(
    'aria-live',
    'polite'
  );

  progressElement.setAttribute(
    'aria-valuemin',
    '0'
  );

  progressElement.setAttribute(
    'aria-valuemax',
    '100'
  );

  progressElement.innerHTML = `
    <div class="operation-progress-head">
      <div>
        <strong class="operation-progress-title">Operation</strong>
        <span class="operation-progress-stage"></span>
      </div>
      <button class="operation-progress-collapse" type="button" title="Свернуть">
        -
      </button>
    </div>
    <div class="operation-progress-track">
      <div class="operation-progress-fill"></div>
    </div>
    <div class="operation-progress-meta">
      <span class="operation-progress-count"></span>
      <span class="operation-progress-percent"></span>
      <span class="operation-progress-elapsed"></span>
    </div>
  `;

  progressElement
    .querySelector('.operation-progress-collapse')
    .addEventListener(
      'click',
      () => progressElement.classList.toggle('is-collapsed')
    );

  document.body.appendChild(
    progressElement
  );

  return progressElement;
}


function normalizeProgress({
  label = 'Операция',
  current = 0,
  total = 0,
  stage = '',
  elapsedMs = null
} = {}) {

  const safeCurrent =
    Math.max(
      0,
      Number(current) || 0
    );

  const safeTotal =
    Math.max(
      0,
      Number(total) || 0
    );

  const percent =
    safeTotal
      ? Math.min(
        100,
        Math.round(
          safeCurrent / safeTotal * 100
        )
      )
      : 0;

  return {
    label,
    percent,
    message:
      createProgressMessage({
        label,
        current:
          safeCurrent,
        total:
          safeTotal,
        stage,
        elapsedMs
      }),
    countText:
      safeTotal
        ? `${safeCurrent}/${safeTotal}`
        : '',
    elapsedText:
      formatElapsedMs(
        elapsedMs
      )
  };
}


function formatElapsedMs(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return '';
  }

  const ms =
    Math.max(
      0,
      Number(value) || 0
    );

  if (ms < 1000) {

    return `${Math.round(ms)} ms`;
  }

  const seconds =
    Math.round(
      ms / 100
    ) / 10;

  return `${seconds} s`;
}
