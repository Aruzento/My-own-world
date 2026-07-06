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

import {
  createSchemaVersionState
} from './schemaVersions.js';


export function validateWorkspaceSnapshot(
  snapshot = {}
) {

  const versionIssues =
    validateWorkspaceVersion(
      snapshot
    );

  const pages =
    snapshot.pages;

  if (!Array.isArray(pages)) {

    return createValidationResult([
      ...versionIssues,
      createSchemaIssue(
        'error',
        'workspace.invalid_pages',
        'Workspace must contain a pages array.'
      )
    ]);
  }

  const results = [
    createValidationResult(
      versionIssues
    ),
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
    `${label}: schema issues found: ${result.issues.length}`,
    result.issues
  );
}


function validateWorkspaceVersion(
  snapshot
) {

  const issues =
    [];

  const versionState =
    createSchemaVersionState({
      area:
        'workspace',
      version:
        snapshot.schemaVersion
    });

  if (versionState.isFuture) {

    issues.push(
      createSchemaIssue(
        'error',
        'workspace.future_schema_version',
        'Workspace was created by a newer schema version.',
        versionState
      )
    );
  }

  if (versionState.isLegacy) {

    issues.push(
      createSchemaIssue(
        'warning',
        'workspace.legacy_schema_version',
        'Workspace uses a legacy schema version.',
        versionState
      )
    );
  }

  return issues;
}
