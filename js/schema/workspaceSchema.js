import {
  createSchemaIssue,
  createValidationResult,
  mergeValidationResults
} from './schemaValidation.js';

import {
  validatePageCollection
} from './pageSchema.js';


export function validateWorkspaceSnapshot(
  snapshot = {}
) {

  const pages =
    snapshot.pages;

  if (!Array.isArray(pages)) {

    return createValidationResult([
      createSchemaIssue(
        'error',
        'workspace.invalid_pages',
        'Workspace должен содержать массив pages.'
      )
    ]);
  }

  return mergeValidationResults(
    validatePageCollection(
      pages
    )
  );
}


export function logWorkspaceValidationResult(
  result,
  label = 'Workspace schema'
) {

  if (!result?.issues?.length) return;

  const logger =
    result.ok
      ? console.warn
      : console.error;

  logger(
    `${label}: найдено проблем схемы: ${result.issues.length}`,
    result.issues
  );
}
