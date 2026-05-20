import {
  escapeHTML
} from './taskTrackerEscapeHTML.js';

import {
  getTaskHTML
} from './taskTrackerTaskHTML.js';


// HTML колонки канбана. Колонка знает только свои id задач.

export function getColumnHTML(
  column,
  tasksById
) {

  return `
    <section class="task-column" data-column-id="${escapeHTML(column.id)}">
      <header class="task-column-header">
        <button class="task-column-drag-handle" type="button" title="Перетащить колонку">☰</button>
        <input
          class="task-column-title"
          type="text"
          value="${escapeHTML(column.title)}"
          aria-label="Название колонки"
        >
        <button class="task-add-btn" type="button" data-runtime="true">+</button>
        <button class="task-column-delete" type="button" data-runtime="true" title="Удалить колонку">×</button>
      </header>
      <div class="task-list">
        ${column.taskIds
          .map(taskId => tasksById.get(taskId))
          .filter(Boolean)
          .map(task => getTaskHTML(task))
          .join('')}
      </div>
    </section>
  `;
}
