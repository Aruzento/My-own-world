import {
  iconSvg
} from '../core/icons.js';

import {
  escapeHTML
} from './taskTrackerEscapeHTML.js';


export function getTaskHTML(
  task
) {

  const checklist =
    Array.isArray(task.checklist)
      ? task.checklist
      : [];

  const doneCount =
    checklist.filter(item =>
      item.done
    ).length;

  const progress =
    checklist.length
      ? Math.round(doneCount / checklist.length * 100)
      : 0;

  return `
    <article class="task-card" data-task-id="${escapeHTML(task.id)}">
      <div class="task-card-head" data-runtime="true">
        <button
          class="task-drag-handle"
          type="button"
          data-tooltip="Перетащить"
          aria-label="Перетащить задачу"
          title="Перетащить"
        >
          ${iconSvg('grip', 'task-tracker-action-icon')}
        </button>
        <input
          class="task-card-title"
          type="text"
          value="${escapeHTML(task.title)}"
          placeholder="Название"
          aria-label="Название задачи"
        >
        <button
          class="task-delete-btn"
          type="button"
          data-tooltip="Удалить задачу"
          aria-label="Удалить задачу"
          title="Удалить задачу"
        >
          ${iconSvg('trash', 'task-tracker-action-icon')}
        </button>
      </div>
      <textarea
        class="task-card-description"
        placeholder="Описание"
        aria-label="Описание задачи"
      >${escapeHTML(task.description)}</textarea>
      ${getTaskProgressHTML(
        checklist.length,
        doneCount,
        progress
      )}
      <div class="task-checklist">
        ${checklist.map(item => getChecklistItemHTML(item)).join('')}
      </div>
      <button class="task-checklist-add" type="button" data-runtime="true">
        ${iconSvg('plus', 'task-tracker-action-icon', { size: 'sm' })}
        <span>Чек</span>
      </button>
    </article>
  `;
}


function getTaskProgressHTML(
  checklistCount,
  doneCount,
  progress
) {

  if (!checklistCount) return '';

  return `
    <div
      class="task-card-progress"
      data-runtime="true"
      style="--task-progress: ${progress}%"
      aria-label="Чеклист ${doneCount} из ${checklistCount}"
    >
      <span class="task-card-progress-track">
        <span class="task-card-progress-fill"></span>
      </span>
      <span class="task-card-progress-count">
        ${iconSvg('check', 'task-card-progress-icon', { size: 'sm' })}
        ${doneCount}/${checklistCount}
      </span>
    </div>
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
      <button
        class="task-check-delete"
        type="button"
        data-runtime="true"
        data-tooltip="Удалить пункт"
        aria-label="Удалить пункт"
        title="Удалить пункт"
      >
        ${iconSvg('x', 'task-tracker-action-icon', { size: 'sm' })}
      </button>
    </label>
  `;
}
