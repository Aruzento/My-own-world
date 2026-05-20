import {
  createDefaultTaskTrackerData
} from './taskTrackerDefaults.js';


// Нормализация защищает трекер от старых или вручную испорченных данных.

export function normalizeTaskTrackerData(
  data
) {

  const source =
    data &&
    typeof data === 'object'
      ? data
      : createDefaultTaskTrackerData();

  const tasks =
    Array.isArray(source.tasks)
      ? source.tasks.map(normalizeTask)
      : [];

  const taskIds =
    new Set(
      tasks.map(task => task.id)
    );

  const columns =
    Array.isArray(source.columns) && source.columns.length > 0
      ? source.columns.map(column => normalizeColumn(column, taskIds))
      : createDefaultTaskTrackerData().columns;

  const usedIds =
    new Set();

  return {
    version: 1,
    columns: columns.map(column => ensureUniqueColumnId(column, usedIds)),
    tasks
  };
}


function normalizeTask(
  task
) {

  return {
    id: String(task?.id || crypto.randomUUID()),
    title: String(task?.title || 'Новая задача'),
    description: String(task?.description || ''),
    checklist: Array.isArray(task?.checklist)
      ? task.checklist.map(normalizeChecklistItem)
      : []
  };
}


function normalizeChecklistItem(
  item
) {

  return {
    id: String(item?.id || crypto.randomUUID()),
    text: String(item?.text || ''),
    done: Boolean(item?.done)
  };
}


function normalizeColumn(
  column,
  taskIds
) {

  return {
    id: String(column?.id || crypto.randomUUID()),
    title: String(column?.title || 'Колонка'),
    taskIds: Array.isArray(column?.taskIds)
      ? column.taskIds
        .map(id => String(id))
        .filter(id => taskIds.has(id))
      : []
  };
}


function ensureUniqueColumnId(
  column,
  usedIds
) {

  if (!usedIds.has(column.id)) {

    usedIds.add(
      column.id
    );

    return column;
  }

  return {
    ...column,
    id: crypto.randomUUID()
  };
}
