export function createSchemaIssue(
  severity,
  code,
  message,
  details = {}
) {

  return {
    severity,
    code,
    message,
    details
  };
}


export function createValidationResult(
  issues = []
) {

  const normalizedIssues =
    issues.filter(Boolean);

  return {
    ok:
      !normalizedIssues.some(issue =>
        issue.severity === 'error'
      ),
    issues:
      normalizedIssues,
    errors:
      normalizedIssues.filter(issue =>
        issue.severity === 'error'
      ),
    warnings:
      normalizedIssues.filter(issue =>
        issue.severity === 'warning'
      )
  };
}


export function mergeValidationResults(
  ...results
) {

  return createValidationResult(
    results.flatMap(result =>
      result?.issues || []
    )
  );
}


export function isPlainObject(
  value
) {

  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}


export function isNonEmptyString(
  value
) {

  return typeof value === 'string' &&
    value.trim().length > 0;
}


export function isFiniteNumber(
  value
) {

  return Number.isFinite(
    Number(value)
  );
}
