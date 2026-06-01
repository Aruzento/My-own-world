import {
  createSchemaIssue,
  createValidationResult,
  mergeValidationResults
} from './schemaValidation.js';

import {
  validatePageCollection
} from './pageSchema.js';

import {
  validatePageTemplatesData
} from './templateSchema.js';

import {
  validateAssetReferences
} from './assetSchema.js';


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

  const results = [
    validatePageCollection(
      pages
    )
  ];

  if (snapshot.templates !== undefined) {

    results.push(
      validatePageTemplatesData(
        snapshot.templates
      )
    );
  }

  if (snapshot.assetReferences !== undefined) {

    results.push(
      validateAssetReferences(
        snapshot.assetReferences
      )
    );
  }

  return mergeValidationResults(
    ...results
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
