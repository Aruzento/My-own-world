---
id: sample-task-tracker
parent: null
order: 3
tags: [task-tracker]
template: taskTracker
type: taskTracker
aliases: []
---

<div class="task-tracker-document" data-task-tracker="v1" contenteditable="false">
  <div class="task-tracker-topbar" contenteditable="false">
    <h1 class="task-tracker-title singleline-field" contenteditable="true" data-placeholder="Название трекера">Учебный трекер</h1>
  </div>
  <script class="task-tracker-data" type="application/json" data-task-tracker-data>{
    "version": 1,
    "columns": [
      {
        "id": "sample-backlog",
        "title": "ИДЕИ",
        "taskIds": ["sample-task-1"]
      },
      {
        "id": "sample-progress",
        "title": "В РАБОТЕ",
        "taskIds": []
      },
      {
        "id": "sample-done",
        "title": "СДЕЛАНО",
        "taskIds": []
      }
    ],
    "tasks": {
      "sample-task-1": {
        "id": "sample-task-1",
        "title": "Проверить onboarding",
        "description": "Откройте Инструменты -> Быстрый старт.",
        "checklist": [
          {
            "id": "sample-check-1",
            "text": "Открыть карточку",
            "done": false
          }
        ]
      }
    }
  }</script>
</div>
