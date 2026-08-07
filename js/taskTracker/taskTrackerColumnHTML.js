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
          class="task-column-drag-handle"
          type="button"
          data-tooltip="Перетащить колонку"
          aria-label="Перетащить колонку"
          title="Перетащить колонку"
        >
          ${iconSvg('grip', 'task-tracker-action-icon')}
        </button>
        <input
          class="task-column-title"
          type="text"
          value="${escapeHTML(column.title)}"
          aria-label="Название колонки"
        >
        <span class="task-column-count" title="Задач в колонке">${tasks.length}</span>
        <button
          class="task-add-btn"
          type="button"
          data-runtime="true"
          data-tooltip="Добавить задачу"
          aria-label="Добавить задачу"
          title="Добавить задачу"
        >
          ${iconSvg('plus', 'task-tracker-action-icon')}
        </button>
        <button
          class="task-column-delete"
          type="button"
          data-runtime="true"
          data-tooltip="Удалить колонку"
          aria-label="Удалить колонку"
          title="Удалить колонку"
        >
          ${iconSvg('trash', 'task-tracker-action-icon')}
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
      aria-label="Empty column"
    >
      ${iconSvg('plus', 'task-column-empty-icon', { size: 'sm' })}
      <span>Пусто</span>
    </div>
  `;
}
