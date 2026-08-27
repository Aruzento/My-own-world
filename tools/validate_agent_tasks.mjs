import {
  readdir,
  readFile,
  stat
} from 'node:fs/promises';

import path from 'node:path';
import process from 'node:process';
import {
  fileURLToPath
} from 'node:url';


export const AGENT_TASK_SCHEMA =
  'myownworld.agent-task.v1';

export const AGENT_TASK_RISK_LEVELS =
  Object.freeze([
    'low',
    'medium',
    'high',
    'critical'
  ]);

export const AGENT_TASK_APPROVAL_TYPES =
  Object.freeze([
    'newDependency',
    'persistentFormatChange',
    'destructiveFilesystemAction',
    'realWorkspaceMutation',
    'externalNetworkOrApi',
    'broadRefactor',
    'tauriOrBuildPipelineChange',
    'newProductFeature',
    'largeBinaryAsset',
    'ownerDecision'
  ]);

export const AGENT_TASK_ERROR_CODES =
  Object.freeze({
    NOT_OBJECT:
      'TASK_NOT_OBJECT',
    UNKNOWN_FIELD:
      'TASK_UNKNOWN_FIELD',
    SCHEMA_INVALID:
      'TASK_SCHEMA_INVALID',
    ID_REQUIRED:
      'TASK_ID_REQUIRED',
    GOAL_REQUIRED:
      'TASK_GOAL_REQUIRED',
    SCOPE_REQUIRED:
      'TASK_SCOPE_REQUIRED',
    ACCEPTANCE_REQUIRED:
      'TASK_ACCEPTANCE_REQUIRED',
    VERIFICATION_MALFORMED:
      'TASK_VERIFICATION_MALFORMED',
    RISK_INVALID:
      'TASK_RISK_INVALID',
    APPROVAL_RULE_MALFORMED:
      'TASK_APPROVAL_RULE_MALFORMED',
    JSON_PARSE_FAILED:
      'TASK_JSON_PARSE_FAILED'
  });

const DEFAULT_TASK_ROOT =
  path.join(
    'docs',
    '03-testing',
    'agent-tasks'
  );

const TASK_FILE_SUFFIX =
  '.agent-task.json';

const ALLOWED_TOP_LEVEL_FIELDS =
  new Set([
    'schema',
    'id',
    'title',
    'ownerMode',
    'goal',
    'scope',
    'acceptance',
    'verification',
    'risk',
    'requiresApproval',
    'notes'
  ]);

const RISK_LEVELS =
  new Set(
    AGENT_TASK_RISK_LEVELS
  );

const APPROVAL_TYPES =
  new Set(
    AGENT_TASK_APPROVAL_TYPES
  );


if (isMainModule()) {

  await runCli(
    process.argv.slice(
      2
    )
  );
}


export function validateAgentTaskContract(
  task
) {

  const errors =
    [];

  const addError =
    (
      pathName,
      code,
      message
    ) => {

      errors.push({
        path:
          pathName,
        code,
        message
      });
    };

  if (!isPlainObject(task)) {

    addError(
      '$',
      AGENT_TASK_ERROR_CODES.NOT_OBJECT,
      'Task contract must be a JSON object.'
    );

    return createValidationResult(
      errors
    );
  }

  for (const key of Object.keys(task)) {

    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {

      addError(
        `$.${key}`,
        AGENT_TASK_ERROR_CODES.UNKNOWN_FIELD,
        `Unknown top-level field "${key}".`
      );
    }
  }

  if (task.schema !== AGENT_TASK_SCHEMA) {

    addError(
      '$.schema',
      AGENT_TASK_ERROR_CODES.SCHEMA_INVALID,
      `schema must equal "${AGENT_TASK_SCHEMA}".`
    );
  }

  if (!isNonEmptyString(task.id)) {

    addError(
      '$.id',
      AGENT_TASK_ERROR_CODES.ID_REQUIRED,
      'id must be a non-empty string.'
    );
  }

  if (!isNonEmptyString(task.goal)) {

    addError(
      '$.goal',
      AGENT_TASK_ERROR_CODES.GOAL_REQUIRED,
      'goal must be a non-empty string.'
    );
  }

  validateScope(
    task.scope,
    addError
  );

  if (!isNonEmptyStringArray(task.acceptance)) {

    addError(
      '$.acceptance',
      AGENT_TASK_ERROR_CODES.ACCEPTANCE_REQUIRED,
      'acceptance must be a non-empty array of non-empty strings.'
    );
  }

  validateVerification(
    task.verification,
    addError
  );

  validateRisk(
    task.risk,
    addError
  );

  validateApprovalRules(
    task.requiresApproval,
    addError
  );

  validateOptionalString(
    task.title,
    '$.title',
    addError
  );

  validateOptionalString(
    task.ownerMode,
    '$.ownerMode',
    addError
  );

  if (
    task.notes !== undefined &&
    !isNonEmptyStringArray(task.notes)
  ) {

    addError(
      '$.notes',
      AGENT_TASK_ERROR_CODES.UNKNOWN_FIELD,
      'notes must be an array of non-empty strings when present.'
    );
  }

  return createValidationResult(
    errors
  );
}


export async function validateAgentTaskFile(
  filePath
) {

  let parsed;

  try {

    parsed =
      JSON.parse(
        await readFile(
          filePath,
          'utf8'
        )
      );

  } catch (error) {

    return createValidationResult([
      {
        path:
          '$',
        code:
          AGENT_TASK_ERROR_CODES.JSON_PARSE_FAILED,
        message:
          error?.message || 'Could not parse task JSON.'
      }
    ]);
  }

  return validateAgentTaskContract(
    parsed
  );
}


export async function collectAgentTaskFiles(
  entries =
    [DEFAULT_TASK_ROOT]
) {

  const files =
    [];

  for (const entry of entries.length ? entries : [DEFAULT_TASK_ROOT]) {

    const resolved =
      path.resolve(
        entry
      );

    const info =
      await stat(
        resolved
      ).catch(() => null);

    if (!info) continue;

    if (info.isDirectory()) {

      files.push(
        ...await listTaskFiles(
          resolved
        )
      );

      continue;
    }

    if (
      info.isFile() &&
      resolved.endsWith(TASK_FILE_SUFFIX)
    ) {

      files.push(
        resolved
      );
    }
  }

  return files.sort();
}


export async function runCli(
  rawArgs =
    []
) {

  const files =
    await collectAgentTaskFiles(
      rawArgs.length
        ? rawArgs
        : [DEFAULT_TASK_ROOT]
    );

  if (!files.length) {

    console.error(
      `No ${TASK_FILE_SUFFIX} files found.`
    );

    process.exitCode =
      1;

    return {
      ok:
        false,
      files:
        []
    };
  }

  let ok =
    true;

  for (const file of files) {

    const result =
      await validateAgentTaskFile(
        file
      );

    const relative =
      normalizePath(
        path.relative(
          process.cwd(),
          file
        )
      );

    if (result.ok) {

      console.log(
        `OK ${relative}`
      );

      continue;
    }

    ok =
      false;

    console.error(
      `Invalid ${relative}`
    );

    for (const error of result.errors) {

      console.error(
        `- ${error.path} ${error.code}: ${error.message}`
      );
    }
  }

  console.log(
    `Agent task contracts: ${files.length}`
  );

  if (!ok) {

    process.exitCode =
      1;
  }

  return {
    ok,
    files
  };
}


function validateScope(
  scope,
  addError
) {

  if (!isPlainObject(scope)) {

    addError(
      '$.scope',
      AGENT_TASK_ERROR_CODES.SCOPE_REQUIRED,
      'scope must contain include and exclude arrays.'
    );

    return;
  }

  if (!isNonEmptyStringArray(scope.include)) {

    addError(
      '$.scope.include',
      AGENT_TASK_ERROR_CODES.SCOPE_REQUIRED,
      'scope.include must be a non-empty array of non-empty strings.'
    );
  }

  if (!isNonEmptyStringArray(scope.exclude)) {

    addError(
      '$.scope.exclude',
      AGENT_TASK_ERROR_CODES.SCOPE_REQUIRED,
      'scope.exclude must be a non-empty array of non-empty strings.'
    );
  }

  for (const key of Object.keys(scope)) {

    if (
      key !== 'include' &&
      key !== 'exclude'
    ) {

      addError(
        `$.scope.${key}`,
        AGENT_TASK_ERROR_CODES.SCOPE_REQUIRED,
        `Unknown scope field "${key}".`
      );
    }
  }
}


function validateVerification(
  verification,
  addError
) {

  if (!isPlainObject(verification)) {

    addError(
      '$.verification',
      AGENT_TASK_ERROR_CODES.VERIFICATION_MALFORMED,
      'verification must be an object with a non-empty commands array.'
    );

    return;
  }

  if (
    !Array.isArray(verification.commands) ||
    !verification.commands.length
  ) {

    addError(
      '$.verification.commands',
      AGENT_TASK_ERROR_CODES.VERIFICATION_MALFORMED,
      'verification.commands must be a non-empty array.'
    );

  } else {

    verification.commands.forEach(
      (
        command,
        index
      ) => {

        if (
          !isPlainObject(command) ||
          !isNonEmptyString(command.command) ||
          typeof command.required !== 'boolean' ||
          !isNonEmptyString(command.reason)
        ) {

          addError(
            `$.verification.commands[${index}]`,
            AGENT_TASK_ERROR_CODES.VERIFICATION_MALFORMED,
            'Each verification command must contain command, required and reason.'
          );
        }
      }
    );
  }

  if (
    verification.manual !== undefined &&
    !isNonEmptyStringArray(verification.manual) &&
    !isEmptyArray(verification.manual)
  ) {

    addError(
      '$.verification.manual',
      AGENT_TASK_ERROR_CODES.VERIFICATION_MALFORMED,
      'verification.manual must be an array of strings when present.'
    );
  }

  for (const key of Object.keys(verification)) {

    if (
      key !== 'commands' &&
      key !== 'manual'
    ) {

      addError(
        `$.verification.${key}`,
        AGENT_TASK_ERROR_CODES.VERIFICATION_MALFORMED,
        `Unknown verification field "${key}".`
      );
    }
  }
}


function validateRisk(
  risk,
  addError
) {

  if (
    !isPlainObject(risk) ||
    !RISK_LEVELS.has(risk.level) ||
    !isNonEmptyString(risk.notes)
  ) {

    addError(
      '$.risk',
      AGENT_TASK_ERROR_CODES.RISK_INVALID,
      'risk must contain a valid level and non-empty notes.'
    );

    return;
  }

  for (const key of Object.keys(risk)) {

    if (
      key !== 'level' &&
      key !== 'notes'
    ) {

      addError(
        `$.risk.${key}`,
        AGENT_TASK_ERROR_CODES.RISK_INVALID,
        `Unknown risk field "${key}".`
      );
    }
  }
}


function validateApprovalRules(
  rules,
  addError
) {

  if (!Array.isArray(rules)) {

    addError(
      '$.requiresApproval',
      AGENT_TASK_ERROR_CODES.APPROVAL_RULE_MALFORMED,
      'requiresApproval must be an array.'
    );

    return;
  }

  rules.forEach(
    (
      rule,
      index
    ) => {

      if (
        !isPlainObject(rule) ||
        !APPROVAL_TYPES.has(rule.when) ||
        !isNonEmptyString(rule.reason)
      ) {

        addError(
          `$.requiresApproval[${index}]`,
          AGENT_TASK_ERROR_CODES.APPROVAL_RULE_MALFORMED,
          'Each approval rule must contain an allowed when value and non-empty reason.'
        );

        return;
      }

      for (const key of Object.keys(rule)) {

        if (
          key !== 'when' &&
          key !== 'reason'
        ) {

          addError(
            `$.requiresApproval[${index}].${key}`,
            AGENT_TASK_ERROR_CODES.APPROVAL_RULE_MALFORMED,
            `Unknown approval rule field "${key}".`
          );
        }
      }
    }
  );
}


function validateOptionalString(
  value,
  pathName,
  addError
) {

  if (
    value !== undefined &&
    !isNonEmptyString(value)
  ) {

    addError(
      pathName,
      AGENT_TASK_ERROR_CODES.UNKNOWN_FIELD,
      `${pathName} must be a non-empty string when present.`
    );
  }
}


async function listTaskFiles(
  root
) {

  const entries =
    await readdir(
      root,
      {
        withFileTypes: true
      }
    );

  const files =
    [];

  for (const entry of entries) {

    const nextPath =
      path.join(
        root,
        entry.name
      );

    if (entry.isDirectory()) {

      files.push(
        ...await listTaskFiles(
          nextPath
        )
      );

      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(TASK_FILE_SUFFIX)
    ) {

      files.push(
        nextPath
      );
    }
  }

  return files;
}


function createValidationResult(
  errors
) {

  return {
    ok:
      errors.length === 0,
    errors
  };
}


function isPlainObject(
  value
) {

  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}


function isNonEmptyString(
  value
) {

  return typeof value === 'string' &&
    value.trim().length > 0;
}


function isNonEmptyStringArray(
  value
) {

  return Array.isArray(value) &&
    value.length > 0 &&
    value.every(isNonEmptyString);
}


function isEmptyArray(
  value
) {

  return Array.isArray(value) &&
    value.length === 0;
}


function normalizePath(
  value
) {

  return value.replaceAll(
    path.sep,
    '/'
  );
}


function isMainModule() {

  return process.argv[1] &&
    path.resolve(
      process.argv[1]
    ) === fileURLToPath(
      import.meta.url
    );
}
