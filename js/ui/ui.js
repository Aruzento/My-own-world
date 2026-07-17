import {
  createProgressMessage
} from '../performance/workspacePerformance.js';

import {
  finishOperationProgress,
  showOperationProgress
} from './operationProgress.js';


export function renderTags(tags = []) {

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

      el.className =
        'tag';

      const marker =
        document.createElement('span');

      marker.textContent =
        '#';

      const label =
        document.createElement('span');

      label.textContent =
        tag;

      el.append(
        marker,
        label
      );

      oldContainer.appendChild(
        el
      );
    });
  }


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

      const label =
        document.createElement('span');

      label.className =
        'inline-tag-label';

      label.textContent =
        `#${tag}`;

      const remove =
        document.createElement('button');

      remove.className =
        'inline-tag-remove';

      remove.dataset.tag =
        tag;

      remove.type =
        'button';

      remove.title =
        'Удалить тег';

      remove.textContent =
        '×';

      el.append(
        label,
        remove
      );

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
