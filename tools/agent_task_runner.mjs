import {
  spawnSync
} from 'node:child_process';

import {
  readFile
} from 'node:fs/promises';

import path from 'node:path';
import process from 'node:process';
import {
  fileURLToPath
} from 'node:url';

import {
  validateAgentTaskContract
} from './validate_agent_tasks.mjs';


export const AGENT_TASK_RUNNER_REPORT_KIND =
  'myownworld.agent-task.dry-run-report';

export const AGENT_TASK_RUNNER_REPORT_VERSION =
  1;

const PATH_SCOPE_PREFIX =
  'path:';

const DRY_RUN_GUARANTEES =
  Object.freeze({
    modifiesProductFiles:
      false,
    createsCommits:
      false,
    createsBranchesOrWorktrees:
      false,
    merges:
      false,
    pushes:
      false,
    resets:
      false,
    invokesCodex:
      false,
    bypassesApproval:
      false
  });

const RECOMMENDED_GATES =
  Object.freeze([
    Object.freeze({
      command:
        'npm run verify:quick',
      when:
        'during implementation'
    }),
    Object.freeze({
      command:
        'npm run verify',
      when:
        'before commit'
    }),
    Object.freeze({
      command:
        'npm run verify:full',
      when:
        'closure, release-like or broad runtime/infrastructure changes'
    })
  ]);


if (isMainModule()) {

  const result =
    await runCli(
      process.argv.slice(
        2
      )
    );

  process.exit(
    result.exitCode
  );
}


export async function runCli(
  rawArgs =
    [],
  {
    root =
      process.cwd(),
    stdout =
      message => console.log(
        message
      ),
    stderr =
      message => console.error(
        message
      )
  } = {}
) {

  const parsed =
    parseRunnerArgs(
      rawArgs
    );

  if (!parsed.ok) {

    stderr(
      parsed.error
    );

    stderr(
      usage()
    );

    return {
      ok:
        false,
      exitCode:
        1,
      report:
        null
    };
  }

  const report =
    await createAgentTaskDryRunReport(
      parsed.taskFile,
      {
        root
      }
    );

  if (parsed.json) {

    stdout(
      JSON.stringify(
        report,
        null,
        2
      )
    );

  } else {

    stdout(
      formatDryRunReport(
        report
      )
    );

    stdout(
      '\nMACHINE_READABLE_REPORT:'
    );

    stdout(
      JSON.stringify(
        report,
        null,
        2
      )
    );
  }

  return {
    ok:
      report.status !== 'invalid',
    exitCode:
      report.status === 'invalid'
        ? 1
        : 0,
    report
  };
}


export async function createAgentTaskDryRunReport(
  taskFile,
  {
    root =
      process.cwd()
  } = {}
) {

  const createdAt =
    new Date().toISOString();

  const taskPath =
    path.resolve(
      root,
      taskFile
    );

  const taskLoad =
    await loadTask(
      taskPath
    );

  if (!taskLoad.ok) {

    return createInvalidReport({
      taskPath,
      createdAt,
      validation:
        taskLoad.validation
    });
  }

  const repository =
    inspectRepositoryState(
      root
    );

  const scopePolicy =
    createScopePolicy(
      taskLoad.task.scope
    );

  const approvalGates =
    createApprovalGates(
      taskLoad.task.requiresApproval
    );

  const verificationPlan =
    createVerificationPlan(
      taskLoad.task.verification
    );

  const plannedWorktree =
    repository.ok
      ? calculateDedicatedWorktree(
          taskLoad.task,
          repository
        )
      : null;

  const blockingReasons =
    [];

  if (!repository.ok) {

    blockingReasons.push({
      code:
        'REPOSITORY_UNAVAILABLE',
      message:
        repository.error
    });
  }

  if (
    repository.ok &&
    !repository.clean
  ) {

    blockingReasons.push({
      code:
        'SOURCE_WORKTREE_DIRTY',
      message:
        'Source worktree must be clean before future task execution.'
    });
  }

  if (approvalGates.blocked) {

    blockingReasons.push({
      code:
        'APPROVAL_REQUIRED',
      message:
        'Task declares approval gates that must be resolved before execution.'
    });
  }

  return {
    kind:
      AGENT_TASK_RUNNER_REPORT_KIND,
    version:
      AGENT_TASK_RUNNER_REPORT_VERSION,
    mode:
      'dry-run',
    status:
      blockingReasons.length
        ? 'blocked'
        : 'ready',
    createdAt,
    task:
      describeTask(
        taskLoad.task,
        taskPath,
        root
      ),
    repository,
    plannedWorktree,
    scopePolicy,
    verificationPlan,
    approvalGates,
    dryRunGuarantees:
      DRY_RUN_GUARANTEES,
    blockingReasons,
    validation:
      taskLoad.validation
  };
}


export function createScopePolicy(
  scope
) {

  const include =
    normalizeScopeEntries(
      scope?.include
    );

  const exclude =
    normalizeScopeEntries(
      scope?.exclude
    );

  const includePathRules =
    extractPathRules(
      include
    );

  const excludePathRules =
    extractPathRules(
      exclude
    );

  return {
    include,
    exclude,
    includePathRules,
    excludePathRules,
    automaticChangedFileDetection:
      includePathRules.length > 0,
    changedFilePolicy:
      includePathRules.length > 0
        ? 'future execution must reject files outside include path rules or inside exclude path rules'
        : 'future execution must require human scope review unless the task provides path: scope rules',
    changedFileCommand:
      'git diff --name-only HEAD --'
  };
}


export function evaluateChangedFilesAgainstScope(
  files,
  scopePolicy
) {

  const normalizedFiles =
    files.map(normalizeRepoPath);

  const allowed =
    [];

  const outside =
    [];

  const excluded =
    [];

  for (const file of normalizedFiles) {

    if (
      matchesAnyPathRule(
        file,
        scopePolicy.excludePathRules
      )
    ) {

      excluded.push(
        file
      );

      continue;
    }

    if (
      !scopePolicy.includePathRules.length ||
      matchesAnyPathRule(
        file,
        scopePolicy.includePathRules
      )
    ) {

      allowed.push(
        file
      );

      continue;
    }

    outside.push(
      file
    );
  }

  return {
    ok:
      outside.length === 0 &&
      excluded.length === 0,
    allowed,
    outside,
    excluded
  };
}


export function createVerificationPlan(
  verification
) {

  const taskCommands =
    verification.commands.map(
      (
        command,
        index
      ) => ({
        index,
        command:
          command.command,
        required:
          command.required,
        reason:
          command.reason,
        source:
          'task'
      })
    );

  return {
    taskCommands,
    manual:
      Array.isArray(
        verification.manual
      )
        ? [...verification.manual]
        : [],
    recommendedGates:
      RECOMMENDED_GATES
  };
}


export function createApprovalGates(
  rules =
    []
) {

  const gates =
    rules.map(
      (
        rule,
        index
      ) => ({
        index,
        when:
          rule.when,
        reason:
          rule.reason,
        status:
          'blocked-until-owner-approval'
      })
    );

  return {
    blocked:
      gates.length > 0,
    gates
  };
}


export function calculateDedicatedWorktree(
  task,
  repository
) {

  const slug =
    createTaskSlug(
      task
    );

  const worktreeRoot =
    path.resolve(
      path.dirname(
        repository.root
      ),
      `${path.basename(repository.root)}-agent-worktrees`
    );

  return {
    branchName:
      `agent-task/${slug}`,
    worktreePath:
      normalizeRepoPath(
        path.join(
          worktreeRoot,
          slug
        )
      ),
    baseHead:
      repository.head,
    sourceBranch:
      repository.branch || null
  };
}


export function inspectRepositoryState(
  root =
    process.cwd()
) {

  const topLevel =
    runGit(
      [
        'rev-parse',
        '--show-toplevel'
      ],
      root
    );

  if (!topLevel.ok) {

    return {
      ok:
        false,
      root:
        path.resolve(
          root
        ),
      error:
        topLevel.error
    };
  }

  const repositoryRoot =
    topLevel.stdout.trim();

  const head =
    runGit(
      [
        'rev-parse',
        '--short',
        'HEAD'
      ],
      repositoryRoot
    );

  const branch =
    runGit(
      [
        'branch',
        '--show-current'
      ],
      repositoryRoot
    );

  const status =
    runGit(
      [
        'status',
        '--porcelain=v1',
        '--untracked-files=normal'
      ],
      repositoryRoot
    );

  if (
    !head.ok ||
    !status.ok
  ) {

    return {
      ok:
        false,
      root:
        repositoryRoot,
      error:
        head.error || status.error
    };
  }

  const statusEntries =
    parseGitStatus(
      status.stdout
    );

  return {
    ok:
      true,
    root:
      repositoryRoot,
    branch:
      branch.ok
        ? branch.stdout.trim()
        : '',
    head:
      head.stdout.trim(),
    clean:
      statusEntries.length === 0,
    statusEntries
  };
}


export function formatDryRunReport(
  report
) {

  const lines =
    [
      'Agent Task Dry Run',
      `Status: ${report.status}`,
      `Task: ${report.task?.id || '<invalid>'}${report.task?.title ? ` - ${report.task.title}` : ''}`
    ];

  if (report.task?.goal) {

    lines.push(
      `Goal: ${report.task.goal}`
    );
  }

  if (report.repository?.ok) {

    lines.push(
      `Repository: ${report.repository.branch || '<detached>'} @ ${report.repository.head}`
    );

    lines.push(
      `Source worktree: ${report.repository.clean ? 'clean' : 'dirty'}`
    );

  } else if (report.repository) {

    lines.push(
      `Repository: unavailable - ${report.repository.error}`
    );
  }

  if (report.plannedWorktree) {

    lines.push(
      `Planned branch: ${report.plannedWorktree.branchName}`
    );

    lines.push(
      `Planned worktree: ${report.plannedWorktree.worktreePath}`
    );
  }

  lines.push(
    'Scope include:'
  );

  for (const entry of report.scopePolicy?.include || []) {

    lines.push(
      `- ${entry}`
    );
  }

  lines.push(
    'Scope exclude:'
  );

  for (const entry of report.scopePolicy?.exclude || []) {

    lines.push(
      `- ${entry}`
    );
  }

  lines.push(
    `Automatic changed-file detection: ${report.scopePolicy?.automaticChangedFileDetection ? 'available' : 'requires path: rules'}`
  );

  lines.push(
    'Verification commands:'
  );

  for (const command of report.verificationPlan?.taskCommands || []) {

    lines.push(
      `- ${command.required ? 'required' : 'optional'}: ${command.command} (${command.reason})`
    );
  }

  if (report.approvalGates?.gates.length) {

    lines.push(
      'Approval gates:'
    );

    for (const gate of report.approvalGates.gates) {

      lines.push(
        `- ${gate.when}: ${gate.reason}`
      );
    }
  }

  if (report.blockingReasons?.length) {

    lines.push(
      'Blocking reasons:'
    );

    for (const reason of report.blockingReasons) {

      lines.push(
        `- ${reason.code}: ${reason.message}`
      );
    }
  }

  lines.push(
    'Dry-run guarantees: no files, commits, branches, worktrees, merges, pushes, resets or Codex execution.'
  );

  return lines.join(
    '\n'
  );
}


async function loadTask(
  taskPath
) {

  let parsed;

  try {

    parsed =
      JSON.parse(
        await readFile(
          taskPath,
          'utf8'
        )
      );

  } catch (error) {

    return {
      ok:
        false,
      validation:
        {
          ok:
            false,
          errors:
            [
              {
                path:
                  '$',
                code:
                  'TASK_JSON_PARSE_FAILED',
                message:
                  error?.message || 'Could not read task JSON.'
              }
            ]
        }
    };
  }

  const validation =
    validateAgentTaskContract(
      parsed
    );

  return {
    ok:
      validation.ok,
    task:
      parsed,
    validation
  };
}


function createInvalidReport({
  taskPath,
  createdAt,
  validation
}) {

  return {
    kind:
      AGENT_TASK_RUNNER_REPORT_KIND,
    version:
      AGENT_TASK_RUNNER_REPORT_VERSION,
    mode:
      'dry-run',
    status:
      'invalid',
    createdAt,
    task:
      {
        path:
          normalizeRepoPath(
            taskPath
          )
      },
    repository:
      null,
    plannedWorktree:
      null,
    scopePolicy:
      null,
    verificationPlan:
      null,
    approvalGates:
      null,
    dryRunGuarantees:
      DRY_RUN_GUARANTEES,
    blockingReasons:
      [
        {
          code:
            'TASK_VALIDATION_FAILED',
          message:
            'Task contract is invalid.'
        }
      ],
    validation
  };
}


function describeTask(
  task,
  taskPath,
  root
) {

  return {
    path:
      normalizeRepoPath(
        path.relative(
          root,
          taskPath
        )
      ),
    id:
      task.id,
    title:
      task.title || '',
    goal:
      task.goal,
    ownerMode:
      task.ownerMode || '',
    risk:
      task.risk
  };
}


function normalizeScopeEntries(
  value
) {

  return Array.isArray(
    value
  )
    ? value.map(entry =>
        entry.trim()
      )
    : [];
}


function extractPathRules(
  entries
) {

  return entries
    .filter(entry =>
      entry.toLowerCase().startsWith(
        PATH_SCOPE_PREFIX
      )
    )
    .map(entry =>
      createPathRule(
        entry.slice(
          PATH_SCOPE_PREFIX.length
        )
      )
    )
    .filter(Boolean);
}


function createPathRule(
  rawPattern
) {

  const pattern =
    normalizeRepoPath(
      rawPattern.trim()
    );

  if (!pattern) {

    return null;
  }

  return {
    pattern,
    kind:
      pattern.includes(
        '*'
      )
        ? 'glob'
        : 'prefix',
    regex:
      pattern.includes(
        '*'
      )
        ? globToRegExp(
            pattern
          ).source
        : null
  };
}


function matchesAnyPathRule(
  file,
  rules
) {

  return rules.some(rule =>
    matchesPathRule(
      file,
      rule
    )
  );
}


function matchesPathRule(
  file,
  rule
) {

  if (rule.kind === 'glob') {

    return globToRegExp(
      rule.pattern
    ).test(
      file
    );
  }

  return file === rule.pattern ||
    file.startsWith(
      rule.pattern.endsWith(
        '/'
      )
        ? rule.pattern
        : `${rule.pattern}/`
    );
}


function globToRegExp(
  pattern
) {

  let source =
    '^';

  for (
    let index = 0;
    index < pattern.length;
    index += 1
  ) {

    const char =
      pattern[index];

    const next =
      pattern[index + 1];

    if (
      char === '*' &&
      next === '*'
    ) {

      source += '.*';
      index += 1;
      continue;
    }

    if (char === '*') {

      source += '[^/]*';
      continue;
    }

    source += escapeRegExp(
      char
    );
  }

  source += '$';

  return new RegExp(
    source
  );
}


function createTaskSlug(
  task
) {

  const base =
    `${task.id}-${task.title || task.goal}`;

  const slug =
    base
      .toLowerCase()
      .normalize(
        'NFKD'
      )
      .replace(
        /[^a-z0-9]+/g,
        '-'
      )
      .replace(
        /-{2,}/g,
        '-'
      )
      .replace(
        /^-|-$/g,
        ''
      );

  return (
    slug || 'task'
  ).slice(
    0,
    80
  );
}


function parseGitStatus(
  value
) {

  return value
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => ({
      code:
        line.slice(
          0,
          2
        ),
      path:
        line.slice(
          3
        )
    }));
}


function runGit(
  args,
  root
) {

  const result =
    spawnSync(
      'git',
      args,
      {
        cwd:
          root,
        encoding:
          'utf8',
        shell:
          false
      }
    );

  if (result.status !== 0) {

    return {
      ok:
        false,
      stdout:
        result.stdout || '',
      stderr:
        result.stderr || '',
      error:
        (result.stderr || result.stdout || '').trim() || `git ${args.join(' ')} failed`
    };
  }

  return {
    ok:
      true,
    stdout:
      result.stdout || '',
    stderr:
      result.stderr || ''
  };
}


function parseRunnerArgs(
  args
) {

  const result =
    {
      dryRun:
        false,
      json:
        false,
      taskFile:
        ''
    };

  for (
    let index = 0;
    index < args.length;
    index += 1
  ) {

    const value =
      args[index];

    if (value === '--dry-run') {

      result.dryRun =
        true;
      continue;
    }

    if (value === '--json') {

      result.json =
        true;
      continue;
    }

    if (value.startsWith('-')) {

      return {
        ok:
          false,
        error:
          `Unknown argument: ${value}`
      };
    }

    if (result.taskFile) {

      return {
        ok:
          false,
        error:
          'Only one task file may be passed.'
      };
    }

    result.taskFile =
      value;
  }

  if (!result.dryRun) {

    return {
      ok:
        false,
      error:
        'Only --dry-run mode is supported.'
    };
  }

  if (!result.taskFile) {

    return {
      ok:
        false,
      error:
        'Task file is required.'
    };
  }

  return {
    ok:
      true,
    ...result
  };
}


function usage() {

  return 'Usage: npm run agent:task -- --dry-run <task-file> [--json]';
}


function escapeRegExp(
  value
) {

  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}


function normalizeRepoPath(
  value
) {

  return String(
    value
  )
    .replaceAll(
      '\\',
      '/'
    )
    .replace(
      /^\.\//,
      ''
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
