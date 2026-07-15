import {
  createProgressMessage
} from '../performance/workspacePerformance.js';

import {
  finishOperationProgress,
  showOperationProgress
} from './operationProgress.js';


export function renderTags(tags = []) {

  // OLD SIDEBAR TAGS
  // (оставлено для совместимости)

  const oldContainer =
    document.getElementById(
      'tagList'
    );

  if (oldContainer) {

    oldContainer.innerHTML = '';

    tags.forEach(tag => {

      const el =
        document.createElement(
          'div'
        );

      el.className = 'tag';

      el.innerHTML = `
        <span>#</span>
        <span>${tag}</span>
      `;

      oldContainer.appendChild(el);
    });
  }


  // INLINE CARD TAGS

  const inlineLists =
    document.querySelectorAll(
      '.inline-tag-list'
    );

  inlineLists.forEach(container => {

    container.innerHTML = '';

    tags.forEach(tag => {

      const el =
        document.createElement(
          'span'
        );

      el.className =
        'inline-tag';

      el.innerHTML = `
        <span class="inline-tag-label">
          #${tag}
        </span>

        <button
          class="inline-tag-remove"
          data-tag="${tag}"
          type="button"
          title="Удалить тег"
        >
          ×
        </button>
      `;

      container.appendChild(el);
    });
  });
}



export function setStatus(text) {

  const statusbar =
    document.getElementById(
      'statusbar'
    );

  if (!statusbar) return;

  statusbar.textContent =
    text;
}


export function setProgressStatus(
  progress
) {

  const message =
    showOperationProgress(
      progress
    ) ||
    createProgressMessage(
      progress
    );

  setStatus(
    message
  );
}


export function finishProgressStatus(
  message,
  options = {}
) {

  if (message) {

    setStatus(
      message
    );
  }

  finishOperationProgress({
    message:
      message || 'Done',
    status:
      options.status || 'complete',
    delayMs:
      options.delayMs
  });
}
