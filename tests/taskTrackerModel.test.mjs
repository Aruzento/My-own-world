import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TaskTrackerModel
} from '../js/taskTracker/taskTrackerModel.js';

import {
  normalizeTaskTrackerData
} from '../js/taskTracker/taskTrackerNormalize.js';


test(
  'normalizeTaskTrackerData удаляет ссылки на отсутствующие задачи',
  () => {

    const data =
      normalizeTaskTrackerData({
        columns: [
          {
            id: 'todo',
            title: 'План',
            taskIds: ['known', 'missing']
          }
        ],
        tasks: [
          {
            id: 'known',
            title: 'Проверить карту'
          }
        ]
      });

    assert.deepEqual(
      data.columns[0].taskIds,
      ['known']
    );

    assert.equal(
      data.tasks[0].title,
      'Проверить карту'
    );
  }
);


test(
  'TaskTrackerModel переносит задачу между колонками без дублей',
  () => {

    const model =
      new TaskTrackerModel({
        version: 1,
        columns: [
          {
            id: 'ideas',
            title: 'ИДЕИ',
            taskIds: ['task-1']
          },
          {
            id: 'done',
            title: 'СДЕЛАНО',
            taskIds: []
          }
        ],
        tasks: [
          {
            id: 'task-1',
            title: 'Задача',
            description: '',
            checklist: []
          }
        ]
      });

    model.moveTask(
      'task-1',
      'done',
      0
    );

    assert.deepEqual(
      model.data.columns[0].taskIds,
      []
    );

    assert.deepEqual(
      model.data.columns[1].taskIds,
      ['task-1']
    );
  }
);


test(
  'TaskTrackerModel удаляет колонку вместе с ее задачами',
  () => {

    const model =
      new TaskTrackerModel({
        version: 1,
        columns: [
          {
            id: 'keep',
            title: 'Оставить',
            taskIds: []
          },
          {
            id: 'remove',
            title: 'Удалить',
            taskIds: ['task-1']
          }
        ],
        tasks: [
          {
            id: 'task-1',
            title: 'Лишняя задача',
            description: '',
            checklist: []
          }
        ]
      });

    model.deleteColumn(
      'remove'
    );

    assert.equal(
      model.data.columns.length,
      1
    );

    assert.equal(
      model.data.tasks.length,
      0
    );
  }
);
