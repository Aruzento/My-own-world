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

  delete statusbar.dataset.saveState;

  statusbar.textContent =
    text;
}


export function setSaveStatus(
  state,
  text
) {

  const statusbar =
    document.getElementById(
      'statusbar'
    );

  if (!statusbar) return;

  const normalizedState =
    normalizeSaveStatusState(
      state
    );

  statusbar.dataset.saveState =
    normalizedState;

  statusbar.textContent =
    text || getDefaultSaveStatusText(
      normalizedState
    );
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


function normalizeSaveStatusState(
  state
) {

  const value =
    String(state || '').trim().toLowerCase();

  if (
    [
      'changed',
      'saving',
      'saved',
      'error',
      'conflict'
    ].includes(value)
  ) {

    return value;
  }

  return 'saved';
}


function getDefaultSaveStatusText(
  state
) {

  if (state === 'changed') return 'Changed';
  if (state === 'saving') return 'Saving...';
  if (state === 'error') return 'Save error';
  if (state === 'conflict') return 'Save conflict';

  return 'Saved';
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
