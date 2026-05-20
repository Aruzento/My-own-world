import {
  escapeHTML
} from './taskTrackerEscapeHTML.js';


// HTML одной задачи. Данные приходят только из модели.

export function getTaskHTML(
  task
) {

  return `
    <article class="task-card" data-task-id="${escapeHTML(task.id)}">
      <div class="task-card-head" data-runtime="true">
        <button class="task-drag-handle" type="button" title="Перетащить">☰</button>
        <input
          class="task-card-title"
          type="text"
          value="${escapeHTML(task.title)}"
          placeholder="Название"
          aria-label="Название задачи"
        >
        <button class="task-delete-btn" type="button" title="Удалить задачу">×</button>
      </div>
      <textarea
        class="task-card-description"
        placeholder="Описание"
        aria-label="Описание задачи"
      >${escapeHTML(task.description)}</textarea>
      <div class="task-checklist">
        ${task.checklist.map(item => getChecklistItemHTML(item)).join('')}
      </div>
      <button class="task-checklist-add" type="button" data-runtime="true">
        + чек
      </button>
    </article>
  `;
}


function getChecklistItemHTML(
  item
) {

  return `
    <label class="task-check-item" data-check-id="${escapeHTML(item.id)}">
      <input
        class="task-check-toggle"
        type="checkbox"
        ${item.done ? 'checked' : ''}
      >
      <input
        class="task-check-text"
        type="text"
        value="${escapeHTML(item.text)}"
        placeholder="Пункт"
        aria-label="Пункт чеклиста"
      >
      <button class="task-check-delete" type="button" data-runtime="true">×</button>
    </label>
  `;
}
