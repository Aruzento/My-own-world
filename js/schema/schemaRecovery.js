import {
  createValidationResult
} from './schemaValidation.js';

import {
  validateWorkspaceSnapshot
} from './workspaceSchema.js';


const RECOVERY_MESSAGES =
  Object.freeze({
    'page.missing_id':
      'Страница без id не может безопасно сохраняться. Создайте backup и восстановите id вручную или через будущий recovery action.',
    'page.duplicate_id':
      'Дублирующийся id может привести к перезаписи не той страницы. Нужна ручная проверка файлов.',
    'page.broken_parent':
      'Родитель страницы не найден. Страницу можно временно открыть из корня после ручного исправления parent.',
    'page.parent_cycle':
      'В дереве найден цикл родителей. Нужно разорвать цикл в front matter одной из страниц.',
    'map.token_missing_id':
      'Токен карты без tokenId нельзя надежно синхронизировать с презентацией и сохранением.',
    'map.token_missing_page':
      'Токен карты ссылается на отсутствующую карточку.',
    'task.column_broken_task_ref':
      'Колонка таск-трекера содержит ссылку на отсутствующую задачу.',
    'template.missing_id':
      'Шаблон без id нельзя безопасно удалять и выбирать повторно.',
    'template.duplicate_id':
      'Дублирующиеся id шаблонов делают операции удаления неоднозначными.',
    'asset.missing_path':
      'AssetReference без пути нельзя загрузить или проверить.'
  });

const SAFE_REPAIR_ACTIONS =
  Object.freeze({
    'page.broken_parent': {
      id:
        'detach-page-parent-to-root',
      label:
        'Перенести страницу в корень',
      description:
        'После backup можно очистить отсутствующего родителя и показать страницу в корне дерева.',
      safety:
        'safe-after-backup',
      requiresBackup:
        true
    },
    'map.token_missing_page': {
      id:
        'remove-map-token-with-missing-page',
      label:
        'Убрать сломанный токен с карты',
      description:
        'После backup можно удалить токен, который ссылается на отсутствующую карточку.',
      safety:
        'safe-after-backup',
      requiresBackup:
        true
    },
    'task.column_broken_task_ref': {
      id:
        'remove-missing-task-reference',
      label:
        'Очистить ссылку на отсутствующую задачу',
      description:
        'После backup можно удалить из колонки ссылку на задачу, которой больше нет в task tracker.',
      safety:
        'safe-after-backup',
      requiresBackup:
        true
    }
  });


export function createWorkspaceRecoveryReport(
  validation = createValidationResult()
) {

  const issues =
    validation.issues || [];

  const actions =
    issues
      .filter(issue =>
        issue.severity === 'error'
      )
      .map(issue => ({
        code:
          issue.code,
        message:
          RECOVERY_MESSAGES[issue.code] ||
          'Проблема требует ручной проверки данных workspace.',
        details:
          issue.details || {},
        repairAction:
          getWorkspaceRepairAction(
            issue
          )
      }));

  return {
    blocking:
      actions.length > 0,
    issueCount:
      issues.length,
    errorCount:
      validation.errors?.length || 0,
    warningCount:
      validation.warnings?.length || 0,
    actions
  };
}


export function getWorkspaceRepairAction(
  issue
) {

  const action =
    SAFE_REPAIR_ACTIONS[
      issue?.code
    ];

  if (!action) {

    return {
      id:
        'manual-review',
      label:
        'Требуется ручная правка',
      description:
        'Для этой проблемы пока нет безопасного автоматического исправления.',
      safety:
        'manual',
      requiresBackup:
        true
    };
  }

  return {
    ...action
  };
}


export function applyWorkspaceRepairActions(
  snapshot = {},
  actions = [],
  options = {}
) {

  const hasBackup =
    Boolean(
      options.backupManifest?.id
    );

  const safeActions =
    actions.filter(action =>
      action?.repairAction?.safety === 'safe-after-backup'
    );

  if (
    safeActions.some(action =>
      action.repairAction?.requiresBackup
    ) &&
    !hasBackup
  ) {

    throw new Error(
      'Workspace repair action заблокирован: сначала нужна резервная копия.'
    );
  }

  const repairedSnapshot =
    cloneSnapshot(
      snapshot
    );

  const appliedActions =
    [];

  for (const action of safeActions) {

    const applied =
      applySingleRepairAction(
        repairedSnapshot,
        action
      );

    if (!applied) continue;

    appliedActions.push({
      code:
        action.code,
      repairActionId:
        action.repairAction.id,
      details:
        action.details || {}
    });
  }

  const validation =
    validateWorkspaceSnapshot(
      repairedSnapshot
    );

  return {
    repairedSnapshot,
    appliedActions,
    validation
  };
}


function applySingleRepairAction(
  snapshot,
  action
) {

  switch (action?.repairAction?.id) {

    case 'detach-page-parent-to-root':
      return detachPageParentToRoot(
        snapshot,
        action.details
      );

    case 'remove-map-token-with-missing-page':
      return removeMapTokenWithMissingPage(
        snapshot,
        action.details
      );

    case 'remove-missing-task-reference':
      return removeMissingTaskReference(
        snapshot,
        action.details
      );

    default:
      return false;
  }
}


function detachPageParentToRoot(
  snapshot,
  details = {}
) {

  const page =
    (snapshot.pages || [])
      .find(candidate =>
        candidate?.id === details.pageId
      );

  if (!page) return false;

  page.parent =
    null;

  return true;
}


function removeMapTokenWithMissingPage(
  snapshot,
  details = {}
) {

  let changed =
    false;

  for (const mapData of collectMapDataContainers(snapshot)) {

    if (!Array.isArray(mapData.tokens)) continue;

    const initialLength =
      mapData.tokens.length;

    mapData.tokens =
      mapData.tokens.filter((token, index) => {

        if (
          details.tokenId &&
          token?.tokenId !== details.tokenId
        ) {

          return true;
        }

        if (
          !details.tokenId &&
          details.index !== undefined &&
          index !== details.index
        ) {

          return true;
        }

        if (
          !details.tokenId &&
          details.index === undefined &&
          token?.pageId
        ) {

          return true;
        }

        return false;
      });

    changed =
      changed ||
      mapData.tokens.length !== initialLength;
  }

  return changed;
}


function removeMissingTaskReference(
  snapshot,
  details = {}
) {

  let changed =
    false;

  for (const taskData of collectTaskTrackerContainers(snapshot)) {

    if (!Array.isArray(taskData.columns)) continue;

    for (const column of taskData.columns) {

      if (
        details.columnId &&
        column?.id !== details.columnId
      ) {

        continue;
      }

      if (!Array.isArray(column.taskIds)) continue;

      const initialLength =
        column.taskIds.length;

      column.taskIds =
        column.taskIds.filter(taskId =>
          taskId !== details.taskId
        );

      changed =
        changed ||
        column.taskIds.length !== initialLength;
    }
  }

  return changed;
}


function collectMapDataContainers(
  snapshot
) {

  return [
    ...(snapshot.campaignMaps || []),
    ...(snapshot.pages || [])
      .map(page => page?.mapData)
      .filter(Boolean)
  ];
}


function collectTaskTrackerContainers(
  snapshot
) {

  return [
    ...(snapshot.taskTrackers || []),
    ...(snapshot.pages || [])
      .map(page => page?.taskTrackerData)
      .filter(Boolean)
  ];
}


function cloneSnapshot(
  snapshot
) {

  return JSON.parse(
    JSON.stringify(
      snapshot || {}
    )
  );
}


export function shouldShowWorkspaceRecovery(
  report
) {

  return Boolean(
    report?.blocking
  );
}
