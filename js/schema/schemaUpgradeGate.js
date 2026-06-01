// Gate защищает будущие schema-upgrade операции от запуска по битым данным.
export function createSchemaUpgradeGateResult({
  validation,
  backupManifest = null,
  upgradeName = 'schema-upgrade'
} = {}) {

  const errors =
    validation?.errors || [];

  const warnings =
    validation?.warnings || [];

  const hasBlockingErrors =
    errors.some(error =>
      error.severity !== 'warning'
    );

  const hasBackup =
    Boolean(
      backupManifest?.id
    );

  const allowed =
    !hasBlockingErrors &&
    hasBackup;

  return {
    allowed,
    upgradeName,
    hasBackup,
    errorCount:
      errors.length,
    warningCount:
      warnings.length,
    reasons:
      createGateReasons({
        hasBlockingErrors,
        hasBackup,
        errors
      })
  };
}


export function assertSchemaUpgradeAllowed(
  input = {}
) {

  const result =
    createSchemaUpgradeGateResult(
      input
    );

  if (!result.allowed) {

    throw new Error(
      `Schema upgrade заблокирован: ${result.reasons.join('; ')}`
    );
  }

  return result;
}


function createGateReasons({
  hasBlockingErrors,
  hasBackup,
  errors
}) {

  const reasons =
    [];

  if (hasBlockingErrors) {

    reasons.push(
      `есть критичные ошибки схемы: ${errors.map(error => error.code).join(', ')}`
    );
  }

  if (!hasBackup) {

    reasons.push(
      'нет manifest резервной копии перед upgrade'
    );
  }

  return reasons;
}
