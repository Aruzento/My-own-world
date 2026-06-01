import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateCampaignMapData
} from '../js/schema/campaignMapSchema.js';

import {
  validateTaskTrackerData
} from '../js/schema/taskTrackerSchema.js';

import {
  validateWorkspaceSnapshot
} from '../js/schema/workspaceSchema.js';

import {
  validatePageTemplatesData
} from '../js/schema/templateSchema.js';

import {
  validateAssetReferences
} from '../js/schema/assetSchema.js';

import {
  createWorkspaceRecoveryReport
} from '../js/schema/schemaRecovery.js';

import {
  assertSchemaUpgradeAllowed,
  createSchemaUpgradeGateResult
} from '../js/schema/schemaUpgradeGate.js';

import {
  validateJSONText
} from '../js/schema/schemaJson.js';


test(
  'workspace schema находит страницу без id',
  () => {

    const result =
      validateWorkspaceSnapshot({
        pages: [
          {
            title: 'Без id',
            parent: null,
            tags: [],
            aliases: []
          }
        ]
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.errors[0].code,
      'page.missing_id'
    );
  }
);


test(
  'schema upgrade gate требует чистую validation и backup',
  () => {

    const validation =
      validateWorkspaceSnapshot({
        pages: [
          {
            id: 'page-1',
            title: 'Карточка',
            parent: null,
            tags: [],
            aliases: []
          }
        ]
      });

    const withoutBackup =
      createSchemaUpgradeGateResult({
        validation
      });

    assert.equal(
      withoutBackup.allowed,
      false
    );

    const withBackup =
      assertSchemaUpgradeAllowed({
        validation,
        backupManifest: {
          id: 'backup-1'
        }
      });

    assert.equal(
      withBackup.allowed,
      true
    );
  }
);


test(
  'schema upgrade gate блокирует критичные ошибки данных',
  () => {

    const validation =
      validateWorkspaceSnapshot({
        pages: [
          {
            title: 'Без id',
            parent: null,
            tags: [],
            aliases: []
          }
        ]
      });

    assert.throws(
      () => assertSchemaUpgradeAllowed({
        validation,
        backupManifest: {
          id: 'backup-1'
        }
      }),
      /page\.missing_id/
    );
  }
);


test(
  'workspace schema находит broken parent',
  () => {

    const result =
      validateWorkspaceSnapshot({
        pages: [
          {
            id: 'child',
            title: 'Дочерняя',
            parent: 'missing',
            tags: [],
            aliases: []
          }
        ]
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.errors[0].code,
      'page.broken_parent'
    );
  }
);


test(
  'workspace schema подсвечивает дубли названий как warning',
  () => {

    const result =
      validateWorkspaceSnapshot({
        pages: [
          {
            id: 'a',
            title: 'Остров',
            parent: null,
            tags: [],
            aliases: []
          },
          {
            id: 'b',
            title: ' остров ',
            parent: null,
            tags: [],
            aliases: []
          }
        ]
      });

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.warnings[0].code,
      'page.duplicate_title'
    );
  }
);


test(
  'campaign map schema находит токен без tokenId',
  () => {

    const result =
      validateCampaignMapData({
        version: 1,
        grid: {
          enabled: true,
          size: 50,
          color: '#999999'
        },
        fog: {
          mode: 'draw',
          brushSize: 40,
          brushShape: 'round',
          lockedZones: []
        },
        view: {
          x: 0,
          y: 0,
          zoom: 1
        },
        layers: [
          {
            id: 'tokens'
          }
        ],
        tokens: [
          {
            pageId: 'page-1',
            size: 50
          }
        ],
        shapes: []
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.errors[0].code,
      'map.token_missing_id'
    );
  }
);


test(
  'task tracker schema находит ссылку на отсутствующую задачу',
  () => {

    const result =
      validateTaskTrackerData({
        version: 1,
        columns: [
          {
            id: 'todo',
            title: 'Бэклог',
            taskIds: ['missing']
          }
        ],
        tasks: []
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.errors[0].code,
      'task.column_broken_task_ref'
    );
  }
);


test(
  'schema JSON helper возвращает ошибку для поврежденного JSON',
  () => {

    const result =
      validateJSONText(
        '{"columns": [}',
        validateTaskTrackerData
      );

    assert.equal(
      result.data,
      null
    );

    assert.equal(
      result.validation.ok,
      false
    );

    assert.equal(
      result.validation.errors[0].code,
      'json.invalid'
    );
  }
);


test(
  'template schema находит шаблон без id',
  () => {

    const result =
      validatePageTemplatesData({
        version: 1,
        templates: [
          {
            title: 'Шаблон персонажа',
            tags: [],
            aliases: [],
            body: '<section></section>'
          }
        ]
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.errors[0].code,
      'template.missing_id'
    );
  }
);


test(
  'asset schema находит ссылку без пути',
  () => {

    const result =
      validateAssetReferences([
        {
          id: 'asset-1',
          type: 'image',
          owner: {
            pageId: 'page-1'
          }
        }
      ]);

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.errors[0].code,
      'asset.missing_path'
    );
  }
);


test(
  'workspace schema проверяет templates и asset references',
  () => {

    const result =
      validateWorkspaceSnapshot({
        pages: [
          {
            id: 'page-1',
            title: 'Карточка',
            parent: null,
            tags: [],
            aliases: []
          }
        ],
        templates: {
          version: 1,
          templates: [
            {
              id: 'template-1',
              title: 'Шаблон',
              tags: 'broken',
              body: '<section></section>'
            }
          ]
        },
        assetReferences: [
          {
            id: 'asset-1',
            type: 'unknown',
            path: 'assets/image.png',
            owner: {
              pageId: 'page-1'
            }
          }
        ]
      });

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.errors[0].code,
      'template.invalid_tags'
    );

    assert.equal(
      result.warnings[0].code,
      'asset.unknown_type'
    );
  }
);


test(
  'workspace recovery report предлагает действия для критичных ошибок',
  () => {

    const validation =
      validateWorkspaceSnapshot({
        pages: [
          {
            title: 'Без id',
            parent: null,
            tags: [],
            aliases: []
          }
        ]
      });

    const report =
      createWorkspaceRecoveryReport(
        validation
      );

    assert.equal(
      report.blocking,
      true
    );

    assert.equal(
      report.actions[0].code,
      'page.missing_id'
    );
  }
);
