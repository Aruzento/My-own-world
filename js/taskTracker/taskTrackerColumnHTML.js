import {
  iconSvg
} from '../core/icons.js';

import {
  escapeHTML
} from './taskTrackerEscapeHTML.js';

import {
  getTaskHTML
} from './taskTrackerTaskHTML.js';


export function getColumnHTML(
  column,
  tasksById
) {

  const tasks =
    column.taskIds
      .map(taskId => tasksById.get(taskId))
      .filter(Boolean);

  return `
    <section
      class="task-column"
      data-column-id="${escapeHTML(column.id)}"
      data-task-count="${tasks.length}"
    >
      <header class="task-column-header">
        <button
          class="task-column-drag-handle mow-icon-button"
          data-size="sm"
          data-variant="ghost"
          type="button"
          aria-keyshortcuts="Control+Shift+ArrowLeft Control+Shift+ArrowRight"
          data-tooltip="Перетащить колонку"
          aria-label="Перетащить колонку"
          title="Перетащить колонку"
        >
          ${iconSvg('grip', 'task-tracker-action-icon', { size: 'sm' })}
        </button>
        <input
          class="task-column-title"
          type="text"
          value="${escapeHTML(column.title)}"
          aria-label="Название колонки"
        >
        <span class="task-column-count" title="Задач в колонке">${tasks.length}</span>
        <button
          class="task-add-btn mow-icon-button"
          data-size="sm"
          type="button"
          data-runtime="true"
          data-tooltip="Добавить задачу"
          aria-label="Добавить задачу"
          title="Добавить задачу"
        >
          ${iconSvg('plus', 'task-tracker-action-icon', { size: 'sm' })}
        </button>
        <button
          class="task-column-delete mow-icon-button"
          data-size="sm"
          data-variant="danger"
          type="button"
          data-runtime="true"
          data-tooltip="Удалить колонку"
          aria-label="Удалить колонку"
          title="Удалить колонку"
        >
          ${iconSvg('trash', 'task-tracker-action-icon', { size: 'sm' })}
        </button>
      </header>
      <div class="task-list">
        ${tasks.length
          ? tasks
            .map(task => getTaskHTML(task))
            .join('')
          : getColumnEmptyHTML()}
      </div>
    </section>
  `;
}


function getColumnEmptyHTML() {

  return `
    <div
      class="task-column-empty"
      data-runtime="true"
      role="status"
      aria-label="Колонка пуста"
    >
      ${iconSvg('plus', 'task-column-empty-icon', { size: 'sm' })}
    </div>
  `;
}
