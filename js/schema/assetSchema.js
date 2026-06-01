import {
  createSchemaIssue,
  createValidationResult,
  isNonEmptyString,
  isPlainObject
} from './schemaValidation.js';

import {
  ASSET_TYPES
} from '../storage/assetReference.js';


export const ASSET_REFERENCE_SCHEMA_VERSION =
  1;

const KNOWN_ASSET_TYPES =
  new Set(
    Object.values(
      ASSET_TYPES
    )
  );


export function validateAssetReferences(
  references = []
) {

  const issues = [];

  if (!Array.isArray(references)) {

    return createValidationResult([
      createSchemaIssue(
        'error',
        'asset.invalid_references',
        'Asset references должны быть массивом.'
      )
    ]);
  }

  references.forEach((reference, index) => {

    if (!isPlainObject(reference)) {

      issues.push(
        createSchemaIssue(
          'error',
          'asset.invalid_reference',
          'AssetReference должен быть объектом.',
          {
            index
          }
        )
      );

      return;
    }

    if (!isNonEmptyString(reference.path)) {

      issues.push(
        createSchemaIssue(
          'error',
          'asset.missing_path',
          'AssetReference не содержит путь к файлу.',
          {
            index,
            id: reference.id || null
          }
        )
      );
    }

    if (!KNOWN_ASSET_TYPES.has(reference.type)) {

      issues.push(
        createSchemaIssue(
          'warning',
          'asset.unknown_type',
          'AssetReference использует неизвестный тип asset.',
          {
            index,
            id: reference.id || null,
            type: reference.type || null
          }
        )
      );
    }

    if (!isPlainObject(reference.owner)) {

      issues.push(
        createSchemaIssue(
          'warning',
          'asset.missing_owner',
          'AssetReference не содержит owner-данные.',
          {
            index,
            id: reference.id || null,
            path: reference.path || null
          }
        )
      );
    }
  });

  return createValidationResult(
    issues
  );
}
