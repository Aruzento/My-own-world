import {
  createValidationResult
} from './schemaValidation.js';


const RECOVERY_MESSAGES =
  Object.freeze({
    'page.missing_id': 'Страница без id не может безопасно сохраняться. Создайте backup и восстановите id вручную или через будущий recovery action.',
    'page.duplicate_id': 'Дублирующийся id может привести к перезаписи не той страницы. Нужна ручная проверка файлов.',
    'page.broken_parent': 'Родитель страницы не найден. Страницу можно временно открыть из корня после ручного исправления parent.',
    'page.parent_cycle': 'В дереве найден цикл родителей. Нужно разорвать цикл в front matter одной из страниц.',
    'map.token_missing_id': 'Токен карты без tokenId нельзя надежно синхронизировать с презентацией и сохранением.',
    'map.token_missing_page': 'Токен карты ссылается на отсутствующую карточку.',
    'task.column_broken_task_ref': 'Колонка таск-трекера содержит ссылку на отсутствующую задачу.',
    'template.missing_id': 'Шаблон без id нельзя безопасно удалять и выбирать повторно.',
    'template.duplicate_id': 'Дублирующиеся id шаблонов делают операции удаления неоднозначными.',
    'asset.missing_path': 'AssetReference без пути нельзя загрузить или проверить.'
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
          issue.details || {}
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


export function shouldShowWorkspaceRecovery(
  report
) {

  return Boolean(
    report?.blocking
  );
}
