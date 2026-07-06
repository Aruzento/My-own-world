import {
  createSchemaIssue,
  createValidationResult,
  isNonEmptyString,
  isPlainObject
} from './schemaValidation.js';

import {
  createSchemaVersionState
} from './schemaVersions.js';


export function validateTaskTrackerData(
  data
) {

  const issues = [];

  if (!isPlainObject(data)) {

    return createValidationResult([
      createSchemaIssue(
        'error',
        'task.invalid_data',
        'Данные таск-трекера должны быть объектом.'
      )
    ]);
  }

  validateVersion(
    data.version,
    issues
  );

  if (!Array.isArray(data.columns)) {

    issues.push(
      createSchemaIssue(
        'error',
        'task.invalid_columns',
        'Колонки таск-трекера должны быть массивом.'
      )
    );
  }

  if (!Array.isArray(data.tasks)) {

    issues.push(
      createSchemaIssue(
        'error',
        'task.invalid_tasks',
        'Задачи таск-трекера должны быть массивом.'
      )
    );
  }

  const taskIds =
    new Set(
      Array.isArray(data.tasks)
        ? data.tasks
          .filter(task => isNonEmptyString(task?.id))
          .map(task => task.id)
        : []
    );

  validateTasks(
    data.tasks,
    issues
  );

  validateColumns(
    data.columns,
    taskIds,
    issues
  );

  return createValidationResult(
    issues
  );
}


function validateVersion(
  version,
  issues
) {

  const versionState =
    createSchemaVersionState({
      area:
        'taskTracker',
      version
    });

  if (versionState.isFuture) {

    issues.push(
      createSchemaIssue(
        'error',
        'task.future_schema_version',
        'Task tracker uses a newer schema version.',
        versionState
      )
    );
  }
}


function validateTasks(
  tasks,
  issues
) {

  if (!Array.isArray(tasks)) return;

  const ids =
    new Set();

  tasks.forEach((task, index) => {

    if (!isNonEmptyString(task?.id)) {

      issues.push(
        createSchemaIssue(
          'error',
          'task.task_missing_id',
          'Задача не имеет id.',
          {
            index
          }
        )
      );

      return;
    }

    if (ids.has(task.id)) {

      issues.push(
        createSchemaIssue(
          'error',
          'task.task_duplicate_id',
          'Задача имеет дублирующийся id.',
          {
            taskId: task.id
          }
        )
      );
    }

    ids.add(
      task.id
    );

    if (!isNonEmptyString(task.title)) {

      issues.push(
        createSchemaIssue(
          'warning',
          'task.task_empty_title',
          'Задача имеет пустое название.',
          {
            taskId: task.id
          }
        )
      );
    }

    if (
      task.checklist !== undefined &&
      !Array.isArray(task.checklist)
    ) {

      issues.push(
        createSchemaIssue(
          'error',
          'task.invalid_checklist',
          'Checklist задачи должен быть массивом.',
          {
            taskId: task.id
          }
        )
      );
    }
  });
}


function validateColumns(
  columns,
  taskIds,
  issues
) {

  if (!Array.isArray(columns)) return;

  const columnIds =
    new Set();

  columns.forEach((column, index) => {

    if (!isNonEmptyString(column?.id)) {

      issues.push(
        createSchemaIssue(
          'error',
          'task.column_missing_id',
          'Колонка не имеет id.',
          {
            index
          }
        )
      );

      return;
    }

    if (columnIds.has(column.id)) {

      issues.push(
        createSchemaIssue(
          'error',
          'task.column_duplicate_id',
          'Колонка имеет дублирующийся id.',
          {
            columnId: column.id
          }
        )
      );
    }

    columnIds.add(
      column.id
    );

    if (!Array.isArray(column.taskIds)) {

      issues.push(
        createSchemaIssue(
          'error',
          'task.column_invalid_task_ids',
          'taskIds колонки должен быть массивом.',
          {
            columnId: column.id
          }
        )
      );

      return;
    }

    column.taskIds.forEach(taskId => {

      if (!taskIds.has(taskId)) {

        issues.push(
          createSchemaIssue(
            'error',
            'task.column_broken_task_ref',
            'Колонка ссылается на несуществующую задачу.',
            {
              columnId: column.id,
              taskId
            }
          )
        );
      }
    });
  });
}
