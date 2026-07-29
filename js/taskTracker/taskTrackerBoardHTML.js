import {
  iconSvg
} from '../core/icons.js';

import {
  getColumnHTML
} from './taskTrackerColumnHTML.js';


export function getTaskTrackerBoardHTML(
  data
) {

  const tasksById =
    new Map(
      data.tasks.map(task => [
        task.id,
        task
      ])
    );

  const totalTasks =
    data.tasks.length;

  const checklistItems =
    data.tasks.flatMap(task =>
      Array.isArray(task.checklist)
        ? task.checklist
        : []
    );

  const completedChecklistItems =
    checklistItems.filter(item =>
      item.done
    ).length;

  const progress =
    checklistItems.length
      ? Math.round(
        completedChecklistItems / checklistItems.length * 100
      )
      : 0;

  return `
    <div
      class="task-tracker-board"
      data-runtime="true"
      data-task-tracker-board-ui="0.0.1.8.14.1"
    >
      <div class="task-tracker-boardbar" data-runtime="true">
        <div class="task-tracker-boardbar-title">
          <span class="task-tracker-boardbar-icon">
            ${iconSvg('task-tracker', 'task-tracker-icon')}
          </span>
          <span>Доска задач</span>
        </div>
        <div class="task-tracker-boardbar-tools">
          <div class="task-tracker-boardbar-stats" aria-label="Сводка доски задач">
            <span class="task-tracker-stat" title="Колонки">
              ${iconSvg('hash', 'task-tracker-stat-icon', { size: 'sm' })}
              ${data.columns.length}
            </span>
            <span class="task-tracker-stat" title="Задачи">
              ${iconSvg('task-tracker', 'task-tracker-stat-icon', { size: 'sm' })}
              ${totalTasks}
            </span>
            <span class="task-tracker-stat task-tracker-stat-progress" title="Чеклист выполнен на ${progress}%">
              ${iconSvg('check', 'task-tracker-stat-icon', { size: 'sm' })}
              ${completedChecklistItems}/${checklistItems.length}
            </span>
          </div>
          <button
            class="task-column-add"
            type="button"
            data-tooltip="Добавить колонку"
            aria-label="Добавить колонку"
            title="Добавить колонку"
          >
            ${iconSvg('plus', 'task-tracker-action-icon')}
            <span>Колонка</span>
          </button>
        </div>
      </div>
      <div class="task-columns">
        ${data.columns.map(column => getColumnHTML(column, tasksById)).join('')}
      </div>
    </div>
  `;
}
