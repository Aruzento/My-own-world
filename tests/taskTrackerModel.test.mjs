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
  'normalizeTaskTrackerData читает legacy tasks object without emptying columns',
  () => {

    const data =
      normalizeTaskTrackerData({
        version: 1,
        columns: [
          {
            id: 'sample-backlog',
            title: 'ИДЕИ',
            taskIds: [
              'sample-task-2',
              'sample-task-1',
              'missing-task'
            ]
          }
        ],
        tasks: {
          'sample-task-1': {
            title: 'Проверить onboarding',
            description: 'Откройте Инструменты -> Быстрый старт.',
            checklist: [
              {
                id: 'sample-check-1',
                text: 'Открыть карточку',
                done: false
              }
            ]
          },
          'sample-task-2': {
            id: 'ignored-stale-value-id',
            title: 'Подготовить сцену',
            description: 'Legacy object keeps task order through columns.',
            checklist: []
          }
        }
      });

    assert.deepEqual(
      data.columns[0].taskIds,
      [
        'sample-task-2',
        'sample-task-1'
      ]
    );

    assert.deepEqual(
      data.tasks.map(task => task.id),
      [
        'sample-task-1',
        'sample-task-2'
      ]
    );

    assert.equal(
      data.tasks.find(task => task.id === 'sample-task-1')?.title,
      'Проверить onboarding'
    );

    assert.equal(
      data.tasks.find(task => task.id === 'sample-task-2')?.id,
      'sample-task-2'
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
