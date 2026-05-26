import {
  createDefaultTaskTrackerData
} from '../taskTracker/taskTrackerDefaults.js';


// Шаблон создает только persistent-оболочку трекера.
// Вся доска задач строится runtime-рендером из JSON-модели.

export function createTaskTrackerTemplate() {

  return {
    name: 'Таски',
    template: 'taskTracker',
    type: 'taskTracker',
    tags: ['task-tracker'],
    iconSvg: `
      <svg viewBox="0 0 24 24">
        <path d="M5 5h14"></path>
        <path d="M5 12h14"></path>
        <path d="M5 19h14"></path>
        <path d="M4 4.5l1 1l2-2"></path>
        <path d="M4 11.5l1 1l2-2"></path>
        <path d="M4 18.5l1 1l2-2"></path>
      </svg>
    `,
    content: `
      <div
        class="task-tracker-document"
        data-task-tracker="v1"
        contenteditable="false"
      >
        <div class="task-tracker-topbar" contenteditable="false">
          <h1
            class="task-tracker-title singleline-field"
            contenteditable="true"
            data-placeholder="Название трекера"
          >
            Новый трекер
          </h1>
        </div>
        <script
          class="task-tracker-data"
          type="application/json"
          data-task-tracker-data
        >${JSON.stringify(createDefaultTaskTrackerData())}</script>
      </div>
    `
  };
}
