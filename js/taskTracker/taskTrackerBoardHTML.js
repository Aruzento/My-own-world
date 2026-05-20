import {
  getColumnHTML
} from './taskTrackerColumnHTML.js';


// Доска строится из модели целиком, чтобы DOM не был источником истины.

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

  return `
    <div class="task-tracker-board" data-runtime="true">
      <div class="task-columns">
        ${data.columns.map(column => getColumnHTML(column, tasksById)).join('')}
        <button class="task-column-add" type="button">+ колонка</button>
      </div>
    </div>
  `;
}
