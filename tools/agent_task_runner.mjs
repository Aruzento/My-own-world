import {
  spawnSync
} from 'node:child_process';

import {
  mkdir,
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

export const AGENT_TASK_EXECUTION_REPORT_KIND =
  'myownworld.agent-task.execution-report';

export const AGENT_TASK_EXECUTION_REPORT_VERSION =
  1;

const PATH_SCOPE_PREFIX =
  'path:';

const CODEX_CLI_PATH_ENV =
  'MOW_CODEX_CLI';

const CODEX_EXEC_TIMEOUT_MS =
  10 * 60 * 1000;

const COMMAND_TIMEOUT_MS =
  5 * 60 * 1000;

const PROBE_TIMEOUT_MS =
  15 * 1000;

const COMMAND_MAX_BUFFER =
  20 * 1024 * 1024;

const EXECUTION_SCOPE_MACHINE_ENFORCEABLE =
  'machine-enforceable';

const EXECUTION_SCOPE_HUMAN_REVIEW_REQUIRED =
  'human-review-required';

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

const EXECUTION_GUARANTEES =
  Object.freeze({
    createsCommits:
      false,
    merges:
      false,
    pushes:
      false,
    resets:
      false,
    repairAttempts:
      0,
    taskBranchMerged:
      false,
    taskBranchPushed:
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
    parsed.execute
      ? await executeAgentTask(
          parsed.taskFile,
          {
            root,
            codexCliPath:
              parsed.codexCliPath
          }
        )
      : await createAgentTaskDryRunReport(
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
      parsed.execute
        ? formatExecutionReport(
            report
          )
        : formatDryRunReport(
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
      report.status !== 'invalid' &&
      report.status !== 'blocked' &&
      report.status !== 'failed' &&
      report.status !== 'scope_violation',
    exitCode:
      report.status === 'invalid' ||
      report.status === 'blocked' ||
      report.status === 'failed' ||
      report.status === 'scope_violation'
        ? 1
        : 0,
    report
  };
}


export async function createAgentTaskDryRunReport(
  taskFile,
  {
    root =
      process.cwd(),
    commandRunner =
      runCommand,
    triggeredApprovalKeys =
      [],
    approvedApprovalKeys =
      []
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
      root,
      {
        commandRunner
      }
    );

  const scopePolicy =
    createScopePolicy(
      taskLoad.task.scope
    );

  const approvalGates =
    createApprovalGates(
      taskLoad.task.requiresApproval,
      {
        triggeredApprovalKeys,
        approvedApprovalKeys
      }
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
        'APPROVAL_GATE_TRIGGERED',
      message:
        'A protected operation is triggered and must be approved before execution.'
    });
  }

  if (
    scopePolicy.executionScopeStatus ===
    EXECUTION_SCOPE_HUMAN_REVIEW_REQUIRED
  ) {

    blockingReasons.push({
      code:
        'SCOPE_HUMAN_REVIEW_REQUIRED',
      message:
        'Task scope has no path: include rules, so future changed-file enforcement requires human review.'
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


export async function executeAgentTask(
  taskFile,
  {
    root =
      process.cwd(),
    codexCliPath =
      process.env[CODEX_CLI_PATH_ENV] || '',
    commandRunner =
      runCommand,
    env =
      process.env,
    platform =
      process.platform,
    triggeredApprovalKeys =
      [],
    approvedApprovalKeys =
      [],
    disableDefaultCliCandidates =
      false,
    pathCandidates =
      null
  } = {}
) {

  const createdAt =
    new Date().toISOString();

  const taskPath =
    path.resolve(
      root,
      taskFile
    );

  const dryRunReport =
    await createAgentTaskDryRunReport(
      taskFile,
      {
        root,
        commandRunner,
        triggeredApprovalKeys,
        approvedApprovalKeys
      }
    );

  if (dryRunReport.status !== 'ready') {

    return createPreExecutionReport({
      createdAt,
      dryRunReport,
      status:
        dryRunReport.status === 'invalid'
          ? 'invalid'
          : 'blocked',
      blockingReasons:
        dryRunReport.blockingReasons
    });
  }

  const taskLoad =
    await loadTask(
      taskPath
    );

  const cliResolution =
    resolveCodexCli({
      explicitPath:
        codexCliPath,
      env,
      platform,
      root,
      commandRunner,
      pathCandidates,
      disableDefaultCandidates:
        disableDefaultCliCandidates
    });

  if (!cliResolution.ok) {

    return createPreExecutionReport({
      createdAt,
      dryRunReport,
      status:
        'blocked',
      cliResolution,
      blockingReasons:
        [
          {
            code:
              'CODEX_CLI_UNAVAILABLE',
            message:
              cliResolution.error
          }
        ]
    });
  }

  const worktreeResult =
    await createDedicatedWorktree(
      dryRunReport.plannedWorktree,
      {
        commandRunner,
        root:
          dryRunReport.repository.root
      }
    );

  if (!worktreeResult.ok) {

    return createPreExecutionReport({
      createdAt,
      dryRunReport,
      status:
        'blocked',
      cliResolution,
      worktree:
        worktreeResult,
      blockingReasons:
        [
          {
            code:
              'WORKTREE_CREATE_FAILED',
            message:
              worktreeResult.error
          }
        ]
    });
  }

  const prompt =
    createCodexExecutionPrompt({
      task:
        taskLoad.task,
      taskPath:
        dryRunReport.task.path,
      scopePolicy:
        dryRunReport.scopePolicy,
      verificationPlan:
        dryRunReport.verificationPlan,
      approvalGates:
        dryRunReport.approvalGates
    });

  const codexCommand =
    createCodexExecCommand({
      cliPath:
        cliResolution.path,
      worktreePath:
        worktreeResult.path
    });

  const codexResult =
    runCodexOnce({
      command:
        codexCommand,
      prompt,
      commandRunner
    });

  let verifyQuick =
    null;

  let taskVerification =
    [];

  if (codexResult.ok) {

    verifyQuick =
      runShellVerificationCommand(
        'npm run verify:quick',
        worktreeResult.path,
        commandRunner
      );

    if (verifyQuick.ok) {

      taskVerification =
        runTaskVerificationCommands(
          dryRunReport.verificationPlan.taskCommands,
          worktreeResult.path,
          commandRunner
        );
    }
  }

  const changedFiles =
    collectChangedFiles(
      worktreeResult.path,
      commandRunner
    );

  const scopeResult =
    changedFiles.ok
      ? evaluateChangedFilesAgainstScope(
          changedFiles.files,
          dryRunReport.scopePolicy
        )
      : {
          ok:
            false,
          allowed:
            [],
          outside:
            [],
          excluded:
            [],
          error:
            changedFiles.error
        };

  const sourceAfter =
    inspectRepositoryState(
      dryRunReport.repository.root,
      {
        commandRunner
      }
    );

  return createExecutionReport({
    createdAt,
    dryRunReport,
    cliResolution,
    worktree:
      worktreeResult,
    codexCommand,
    codexResult,
    verifyQuick,
    taskVerification,
    changedFiles,
    scopeResult,
    sourceAfter
  });
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
    executionScopeStatus:
      includePathRules.length > 0
        ? EXECUTION_SCOPE_MACHINE_ENFORCEABLE
        : EXECUTION_SCOPE_HUMAN_REVIEW_REQUIRED,
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
    [],
  {
    triggeredApprovalKeys =
      [],
    approvedApprovalKeys =
      []
  } = {}
) {

  const triggeredKeys =
    new Set(
      triggeredApprovalKeys.map(String)
    );

  const approvedKeys =
    new Set(
      approvedApprovalKeys.map(String)
    );

  const gates =
    rules.map(
      (
        rule,
        index
      ) => {

        const triggered =
          approvalGateKeyMatches(
            triggeredKeys,
            rule,
            index
          );

        const approved =
          triggered &&
          approvalGateKeyMatches(
            approvedKeys,
            rule,
            index
          );

        return {
          index,
          when:
            rule.when,
          reason:
            rule.reason,
          triggered,
          approved,
          status:
            triggered
              ? approved
                ? 'approved'
                : 'blocked'
              : 'armed'
        };
      }
    );

  const blocked =
    gates.some(gate =>
      gate.status === 'blocked'
    );

  const triggered =
    gates.some(gate =>
      gate.triggered
    );

  return {
    declared:
      gates.length > 0,
    triggered,
    blocked,
    overallStatus:
      blocked
        ? 'blocked'
        : triggered
          ? 'approved'
          : gates.length
            ? 'armed'
            : 'none',
    gates
  };
}


export function resolveCodexCli({
  explicitPath =
    '',
  env =
    process.env,
  platform =
    process.platform,
  root =
    process.cwd(),
  commandRunner =
    runCommand,
  pathCandidates =
    null,
  disableDefaultCandidates =
    false
} = {}) {

  const candidates =
    buildCodexCliCandidates({
      explicitPath,
      env,
      platform,
      root,
      commandRunner,
      pathCandidates,
      disableDefaultCandidates
    });

  const rejected =
    [];

  for (const candidate of candidates) {

    if (isPackagedWindowsAppsCodex(candidate.path)) {

      rejected.push({
        ...candidate,
        status:
          'rejected',
        reason:
          'Packaged WindowsApps OpenAI.Codex binary is not an approved standalone CLI target.'
      });

      continue;
    }

    if (
      candidate.source === 'explicit' &&
      !path.isAbsolute(
        candidate.path
      )
    ) {

      rejected.push({
        ...candidate,
        status:
          'rejected',
        reason:
          'Explicit Codex CLI path must be absolute.'
      });

      continue;
    }

    const probe =
      commandRunner(
        candidate.path,
        [
          '--version'
        ],
        {
          cwd:
            root,
          timeout:
            PROBE_TIMEOUT_MS
        }
      );

    if (probe.ok) {

      return {
        ok:
          true,
        path:
          candidate.path,
        source:
          candidate.source,
        version:
          firstOutputLine(
            probe.stdout || probe.stderr
          ),
        candidates,
        rejected
      };
    }

    rejected.push({
      ...candidate,
      status:
        'rejected',
      reason:
        createCommandFailureMessage(
          probe
        )
    });
  }

  return {
    ok:
      false,
    path:
      '',
    version:
      '',
    candidates,
    rejected,
    error:
      rejected.length
        ? 'No executable standalone Codex CLI candidate passed --version.'
        : 'No Codex CLI candidates were discovered.'
  };
}


export function buildCodexCliCandidates({
  explicitPath =
    '',
  env =
    process.env,
  platform =
    process.platform,
  root =
    process.cwd(),
  commandRunner =
    runCommand,
  pathCandidates =
    null,
  disableDefaultCandidates =
    false
} = {}) {

  const candidates =
    [];

  const addCandidate =
    (
      candidatePath,
      source
    ) => {

      const normalized =
        String(
          candidatePath || ''
        ).trim();

      if (!normalized) return;

      if (
        candidates.some(candidate =>
          normalizeCaseInsensitivePath(
            candidate.path
          ) === normalizeCaseInsensitivePath(
            normalized
          )
        )
      ) {

        return;
      }

      candidates.push({
        path:
          normalized,
        source
      });
    };

  addCandidate(
    explicitPath,
    'explicit'
  );

  if (!disableDefaultCandidates) {

    for (const candidatePath of getStandaloneUserCodexCandidates(
      env,
      platform
    )) {

      addCandidate(
        candidatePath,
        'standalone-user-install'
      );
    }
  }

  const discoveredPathCandidates =
    Array.isArray(
      pathCandidates
    )
      ? pathCandidates
      : disableDefaultCandidates
        ? []
        : discoverPathCodexCandidates({
            platform,
            root,
            commandRunner
          });

  for (const candidatePath of discoveredPathCandidates) {

    addCandidate(
      candidatePath,
      'path'
    );
  }

  return candidates;
}


export async function createDedicatedWorktree(
  plannedWorktree,
  {
    root,
    commandRunner =
      runCommand
  }
) {

  const worktreePath =
    path.resolve(
      plannedWorktree.worktreePath
    );

  const parent =
    path.dirname(
      worktreePath
    );

  try {

    await mkdir(
      parent,
      {
        recursive:
          true
      }
    );

  } catch (error) {

    return {
      ok:
        false,
      path:
        normalizeRepoPath(
          worktreePath
        ),
      branch:
        plannedWorktree.branchName,
      error:
        error?.message || 'Could not create task worktree parent directory.'
    };
  }

  const result =
    runGit(
      [
        'worktree',
        'add',
        '-b',
        plannedWorktree.branchName,
        worktreePath,
        plannedWorktree.baseHead
      ],
      root,
      commandRunner
    );

  if (!result.ok) {

    return {
      ok:
        false,
      path:
        normalizeRepoPath(
          worktreePath
        ),
      branch:
        plannedWorktree.branchName,
      error:
        result.error
    };
  }

  return {
    ok:
      true,
    path:
      normalizeRepoPath(
        worktreePath
      ),
    branch:
      plannedWorktree.branchName,
    baseHead:
      plannedWorktree.baseHead
  };
}


export function createCodexExecutionPrompt({
  task,
  taskPath,
  scopePolicy,
  verificationPlan,
  approvalGates
}) {

  return [
    'You are executing exactly one validated MyOwnWorld autonomous agent task.',
    '',
    'First read AGENTS.md and follow its routing. Do not preload the generated DOCX manual unless the task explicitly requires manual-specific work.',
    '',
    'Hard constraints:',
    '- Execute only this one task.',
    '- Modify only files allowed by the machine-checkable path scope below.',
    '- Do not expand scope.',
    '- Do not create commits, branches, worktrees, merges, pushes or repair retries.',
    '- Do not start roadmap phase 0.0.1.16.0.',
    '- Do not perform destructive filesystem actions, dependency installation, external API calls, persistent format changes, real workspace mutations or new product functionality.',
    '- If an approval-gated action becomes necessary, stop and report it instead of proceeding.',
    '',
    `Task file: ${taskPath}`,
    '',
    'Machine-readable task JSON:',
    '```json',
    JSON.stringify(
      task,
      null,
      2
    ),
    '```',
    '',
    'Allowed machine-checkable scope.include path rules:',
    ...scopePolicy.includePathRules.map(rule =>
      `- ${rule.pattern}`
    ),
    '',
    'Blocked machine-checkable scope.exclude path rules:',
    ...scopePolicy.excludePathRules.map(rule =>
      `- ${rule.pattern}`
    ),
    '',
    'Acceptance criteria:',
    ...task.acceptance.map(item =>
      `- ${item}`
    ),
    '',
    'Verification requirements the runner will execute after your single pass:',
    ...verificationPlan.taskCommands.map(command =>
      `- ${command.command} (${command.reason})`
    ),
    '',
    'Approval gates are declared as conditional safeguards, not pre-approved actions:',
    ...approvalGates.gates.map(gate =>
      `- ${gate.when}: ${gate.status} - ${gate.reason}`
    ),
    '',
    'When done, report only what you changed and stop.'
  ].join(
    '\n'
  );
}


export function createCodexExecCommand({
  cliPath,
  worktreePath
}) {

  return {
    executable:
      cliPath,
    args:
      [
        'exec',
        '-C',
        worktreePath,
        '-s',
        'workspace-write',
        '-a',
        'never',
        '--color',
        'never',
        '--ephemeral',
        '-'
      ]
  };
}


function runCodexOnce({
  command,
  prompt,
  commandRunner
}) {

  const result =
    commandRunner(
      command.executable,
      command.args,
      {
        cwd:
          command.args[2],
        input:
          prompt,
        timeout:
          CODEX_EXEC_TIMEOUT_MS,
        maxBuffer:
          COMMAND_MAX_BUFFER,
        shell:
          false
      }
    );

  return summarizeCommandResult(
    result
  );
}


function runShellVerificationCommand(
  command,
  cwd,
  commandRunner
) {

  const result =
    commandRunner(
      command,
      [],
      {
        cwd,
        shell:
          true,
        timeout:
          COMMAND_TIMEOUT_MS,
        maxBuffer:
          COMMAND_MAX_BUFFER
      }
    );

  return {
    command,
    ...summarizeCommandResult(
      result
    )
  };
}


function runTaskVerificationCommands(
  commands,
  cwd,
  commandRunner
) {

  return commands.map(command => ({
    ...command,
    ...runShellVerificationCommand(
      command.command,
      cwd,
      commandRunner
    )
  }));
}


function collectChangedFiles(
  root,
  commandRunner
) {

  const status =
    runGit(
      [
        'status',
        '--porcelain=v1',
        '--untracked-files=all'
      ],
      root,
      commandRunner
    );

  if (!status.ok) {

    return {
      ok:
        false,
      files:
        [],
      error:
        status.error
    };
  }

  const files =
    parseGitStatus(
      status.stdout
    )
      .flatMap(entry =>
        extractChangedPaths(
          entry.path
        )
      )
      .map(normalizeRepoPath)
      .filter(Boolean)
      .filter((file, index, list) =>
        list.indexOf(file) === index
      )
      .sort();

  return {
    ok:
      true,
    files
  };
}


function extractChangedPaths(
  statusPath
) {

  if (
    statusPath.includes(
      ' -> '
    )
  ) {

    const parts =
      statusPath.split(
        ' -> '
      );

    return [
      parts[parts.length - 1]
    ];
  }

  return [
    statusPath
  ];
}


function getStandaloneUserCodexCandidates(
  env,
  platform
) {

  if (platform !== 'win32') {

    return [];
  }

  const candidates =
    [];

  if (env.LOCALAPPDATA) {

    candidates.push(
      path.win32.join(
        env.LOCALAPPDATA,
        'Programs',
        'OpenAI',
        'Codex',
        'bin',
        'codex.exe'
      )
    );
  }

  if (env.USERPROFILE) {

    candidates.push(
      path.win32.join(
        env.USERPROFILE,
        'AppData',
        'Local',
        'Programs',
        'OpenAI',
        'Codex',
        'bin',
        'codex.exe'
      )
    );
  }

  return candidates;
}


function discoverPathCodexCandidates({
  platform,
  root,
  commandRunner
}) {

  const probe =
    platform === 'win32'
      ? commandRunner(
          'where.exe',
          [
            'codex'
          ],
          {
            cwd:
              root,
            timeout:
              PROBE_TIMEOUT_MS
          }
        )
      : commandRunner(
          'which',
          [
            '-a',
            'codex'
          ],
          {
            cwd:
              root,
            timeout:
              PROBE_TIMEOUT_MS
          }
        );

  if (!probe.ok) {

    return [];
  }

  return String(
    probe.stdout || ''
  )
    .split(/\r?\n/)
    .map(line =>
      line.trim()
    )
    .filter(Boolean);
}


function isPackagedWindowsAppsCodex(
  candidatePath
) {

  const normalized =
    normalizeCaseInsensitivePath(
      candidatePath
    );

  return normalized.includes(
    '/program files/windowsapps/openai.codex_'
  );
}


function normalizeCaseInsensitivePath(
  value
) {

  return normalizeRepoPath(
    value
  ).toLowerCase();
}


function firstOutputLine(
  value
) {

  return String(
    value || ''
  )
    .split(/\r?\n/)
    .map(line =>
      line.trim()
    )
    .find(Boolean) || '';
}


function createCommandFailureMessage(
  result
) {

  return result.error ||
    firstOutputLine(
      result.stderr
    ) ||
    firstOutputLine(
      result.stdout
    ) ||
    `Command exited with status ${result.status ?? 'unknown'}.`;
}


function summarizeCommandResult(
  result
) {

  return {
    ok:
      result.ok,
    status:
      result.status ?? (
        result.ok
          ? 0
          : 1
      ),
    stdout:
      truncateOutput(
        result.stdout
      ),
    stderr:
      truncateOutput(
        result.stderr
      ),
    error:
      result.ok
        ? ''
        : createCommandFailureMessage(
            result
          )
  };
}


function truncateOutput(
  value,
  maxLength =
    8000
) {

  const text =
    String(
      value || ''
    );

  if (text.length <= maxLength) {

    return text;
  }

  return `${text.slice(0, maxLength)}\n[output truncated]`;
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
    process.cwd(),
  {
    commandRunner =
      runCommand
  } = {}
) {

  const topLevel =
    runGit(
      [
        'rev-parse',
        '--show-toplevel'
      ],
      root,
      commandRunner
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
      repositoryRoot,
      commandRunner
    );

  const branch =
    runGit(
      [
        'branch',
        '--show-current'
      ],
      repositoryRoot,
      commandRunner
    );

  const status =
    runGit(
      [
        'status',
        '--porcelain=v1',
        '--untracked-files=normal'
      ],
      repositoryRoot,
      commandRunner
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
    `Execution scope status: ${report.scopePolicy?.executionScopeStatus || '<unknown>'}`
  );

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
        `- ${gate.when}: ${gate.status} - ${gate.reason}`
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


export function formatExecutionReport(
  report
) {

  const lines =
    [
      'Agent Task Execution',
      `Status: ${report.status}`,
      `Task: ${report.task?.id || '<invalid>'}${report.task?.title ? ` - ${report.task.title}` : ''}`
    ];

  if (report.cli?.ok) {

    lines.push(
      `Codex CLI: ${report.cli.path} (${report.cli.version || 'version unknown'})`
    );
  }

  if (report.worktree?.ok) {

    lines.push(
      `Task branch: ${report.worktree.branch}`
    );

    lines.push(
      `Task worktree: ${report.worktree.path}`
    );
  }

  lines.push(
    `Codex executions: ${report.codexExecutions}`
  );

  if (report.codexResult) {

    lines.push(
      `Codex exit status: ${report.codexResult.status}`
    );
  }

  if (report.verifyQuick) {

    lines.push(
      `verify:quick: ${report.verifyQuick.ok ? 'PASS' : 'FAIL'}`
    );
  }

  if (report.scopeResult) {

    lines.push(
      `Scope result: ${report.scopeResult.ok ? 'PASS' : 'FAIL'}`
    );
  }

  if (report.changedFiles?.files?.length) {

    lines.push(
      'Changed files:'
    );

    for (const file of report.changedFiles.files) {

      lines.push(
        `- ${file}`
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
    'Execution guarantees: no commits, merges, pushes, resets or repair attempts.'
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


function createPreExecutionReport({
  createdAt,
  dryRunReport,
  status,
  cliResolution =
    null,
  worktree =
    null,
  blockingReasons =
    []
}) {

  return {
    kind:
      AGENT_TASK_EXECUTION_REPORT_KIND,
    version:
      AGENT_TASK_EXECUTION_REPORT_VERSION,
    mode:
      'execute',
    status,
    createdAt,
    task:
      dryRunReport.task,
    sourceBefore:
      dryRunReport.repository,
    sourceAfter:
      null,
    plannedWorktree:
      dryRunReport.plannedWorktree,
    worktree,
    cli:
      cliResolution,
    cliCommand:
      null,
    codexExecutions:
      0,
    codexResult:
      null,
    verifyQuick:
      null,
    taskVerification:
      [],
    changedFiles:
      null,
    scopeResult:
      null,
    approvalGates:
      dryRunReport.approvalGates,
    executionGuarantees:
      EXECUTION_GUARANTEES,
    blockingReasons,
    dryRunReport
  };
}


function createExecutionReport({
  createdAt,
  dryRunReport,
  cliResolution,
  worktree,
  codexCommand,
  codexResult,
  verifyQuick,
  taskVerification,
  changedFiles,
  scopeResult,
  sourceAfter
}) {

  const blockingReasons =
    [];

  if (!codexResult.ok) {

    blockingReasons.push({
      code:
        'CODEX_EXEC_FAILED',
      message:
        codexResult.error
    });
  }

  if (
    codexResult.ok &&
    changedFiles.ok &&
    !scopeResult.ok
  ) {

    blockingReasons.push({
      code:
        'SCOPE_VIOLATION',
      message:
        'Codex changed files outside the declared path scope.'
    });
  }

  if (
    codexResult.ok &&
    !changedFiles.ok
  ) {

    blockingReasons.push({
      code:
        'CHANGED_FILE_COLLECTION_FAILED',
      message:
        changedFiles.error
    });
  }

  if (
    codexResult.ok &&
    scopeResult.ok &&
    verifyQuick &&
    !verifyQuick.ok
  ) {

    blockingReasons.push({
      code:
        'VERIFY_QUICK_FAILED',
      message:
        verifyQuick.error
    });
  }

  const failedTaskVerification =
    taskVerification.find(result =>
      result.required &&
      !result.ok
    );

  if (
    codexResult.ok &&
    scopeResult.ok &&
    verifyQuick?.ok &&
    failedTaskVerification
  ) {

    blockingReasons.push({
      code:
        'TASK_VERIFICATION_FAILED',
      message:
        failedTaskVerification.error
    });
  }

  let status =
    'passed';

  if (!codexResult.ok) {

    status =
      'failed';

  } else if (
    !changedFiles.ok
  ) {

    status =
      'failed';

  } else if (
    !scopeResult.ok
  ) {

    status =
      'scope_violation';

  } else if (
    !verifyQuick?.ok ||
    failedTaskVerification
  ) {

    status =
      'failed';
  }

  return {
    kind:
      AGENT_TASK_EXECUTION_REPORT_KIND,
    version:
      AGENT_TASK_EXECUTION_REPORT_VERSION,
    mode:
      'execute',
    status,
    createdAt,
    task:
      dryRunReport.task,
    sourceBefore:
      dryRunReport.repository,
    sourceAfter,
    plannedWorktree:
      dryRunReport.plannedWorktree,
    worktree,
    cli:
      cliResolution,
    cliCommand:
      {
        executable:
          codexCommand.executable,
        args:
          codexCommand.args
      },
    codexExecutions:
      1,
    codexResult,
    verifyQuick,
    taskVerification,
    changedFiles,
    scopeResult,
    approvalGates:
      dryRunReport.approvalGates,
    executionGuarantees:
      EXECUTION_GUARANTEES,
    blockingReasons,
    dryRunReport
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


function approvalGateKeyMatches(
  keys,
  rule,
  index
) {

  const numericIndex =
    String(
      index
    );

  const typedIndex =
    `${rule.when}:${index}`;

  return keys.has(
    rule.when
  ) ||
    keys.has(
      numericIndex
    ) ||
    keys.has(
      typedIndex
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
  root,
  commandRunner =
    runCommand
) {

  const result =
    commandRunner(
      'git',
      args,
      {
        cwd:
          root,
        shell:
          false,
        timeout:
          COMMAND_TIMEOUT_MS,
        maxBuffer:
          COMMAND_MAX_BUFFER
      }
    );

  if (!result.ok) {

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


function runCommand(
  command,
  args =
    [],
  options =
    {}
) {

  try {

    const result =
      spawnSync(
        command,
        args,
        {
          cwd:
            options.cwd,
          encoding:
            'utf8',
          input:
            options.input,
          shell:
            Boolean(
              options.shell
            ),
          timeout:
            options.timeout,
          maxBuffer:
            options.maxBuffer || COMMAND_MAX_BUFFER
        }
      );

    if (result.error) {

      return {
        ok:
          false,
        status:
          result.status,
        stdout:
          result.stdout || '',
        stderr:
          result.stderr || '',
        error:
          result.error.message
      };
    }

    return {
      ok:
        result.status === 0,
      status:
        result.status,
      stdout:
        result.stdout || '',
      stderr:
        result.stderr || '',
      error:
        result.status === 0
          ? ''
          : (result.stderr || result.stdout || '').trim() || `${command} failed`
    };

  } catch (error) {

    return {
      ok:
        false,
      status:
        null,
      stdout:
        '',
      stderr:
        '',
      error:
        error?.message || `${command} failed`
    };
  }
}


function parseRunnerArgs(
  args
) {

  const result =
    {
      dryRun:
        false,
      execute:
        false,
      json:
        false,
      codexCliPath:
        '',
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

    if (value === '--execute') {

      result.execute =
        true;
      continue;
    }

    if (value === '--codex-cli') {

      const cliPath =
        args[index + 1];

      if (!cliPath) {

        return {
          ok:
            false,
          error:
            '--codex-cli requires a path.'
        };
      }

      result.codexCliPath =
        cliPath;
      index += 1;
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

  if (
    result.dryRun === result.execute
  ) {

    return {
      ok:
        false,
      error:
        'Choose exactly one mode: --dry-run or --execute.'
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

  return 'Usage: npm run agent:task -- (--dry-run | --execute) <task-file> [--json] [--codex-cli <absolute-path>]';
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
