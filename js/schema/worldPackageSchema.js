import {
  validateWorldPackageData
} from '../worldPackage/worldPackageModel.js';

import {
  createSchemaIssue,
  createValidationResult,
  mergeValidationResults
} from './schemaValidation.js';


export function validateWorldPackagesData(
  worldPackages
) {

  if (worldPackages === undefined) {

    return createValidationResult();
  }

  if (!Array.isArray(worldPackages)) {

    return createValidationResult([
      createSchemaIssue(
        'error',
        'worldPackages.invalid_collection',
        'World packages collection must be an array.'
      )
    ]);
  }

  const ids =
    new Set();

  const results =
    worldPackages.map(worldPackage => {

      const validation =
        validateWorldPackageData(
          worldPackage
        );

      const packageId =
        worldPackage?.packageId ||
        worldPackage?.id ||
        null;

      const duplicateIssues =
        [];

      if (packageId) {

        if (ids.has(packageId)) {

          duplicateIssues.push(
            createSchemaIssue(
              'error',
              'worldPackages.duplicate_package_id',
              'World packages collection contains duplicated package id.',
              {
                packageId
              }
            )
          );
        }

        ids.add(
          packageId
        );
      }

      return mergeValidationResults(
        validation,
        createValidationResult(
          duplicateIssues
        )
      );
    });

  return mergeValidationResults(
    ...results
  );
}
