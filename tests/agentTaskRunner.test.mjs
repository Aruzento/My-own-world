import assert from 'node:assert/strict';
import test from 'node:test';

import {
  spawnSync
} from 'node:child_process';

import {
  existsSync,
  mkdirSync,
  writeFileSync
} from 'node:fs';

import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';

import os from 'node:os';
import path from 'node:path';

import {
  AGENT_TASK_SCHEMA
} from '../tools/validate_agent_tasks.mjs';

import {
  AGENT_TASK_EXECUTION_REPORT_KIND,
  AGENT_TASK_RUNNER_REPORT_KIND,
  createAgentTaskDryRunReport,
  createApprovalGates,
  createScopePolicy,
  evaluateChangedFilesAgainstScope,
  executeAgentTask,
  resolveCodexCli
} from '../tools/agent_task_runner.mjs';


test(
  'agent task runner builds a valid dry-run plan without execution side effects',
  async t => {

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createValidTask({
              requiresApproval:
                []
            })
        }
      );

    const report =
      await createAgentTaskDryRunReport(
        taskFile,
        {
          root
        }
      );

    assert.equal(
      report.kind,
      AGENT_TASK_RUNNER_REPORT_KIND
    );

    assert.equal(
      report.status,
      'ready'
    );

    assert.equal(
      report.scopePolicy.executionScopeStatus,
      'machine-enforceable'
    );

    assert.equal(
      report.repository.clean,
      true
    );

    assert.match(
      report.plannedWorktree.branchName,
      /^agent-task\/offplan-001-runner-fixture/
    );

    assert.equal(
      report.dryRunGuarantees.createsCommits,
      false
    );

    assert.equal(
      report.dryRunGuarantees.invokesCodex,
      false
    );

    assert.equal(
      report.verificationPlan.taskCommands[0].command,
      'npm run verify'
    );

    assert.equal(
      await pathExists(
        report.plannedWorktree.worktreePath
      ),
      false
    );

    const branchList =
      runGit(
        root,
        [
          'branch',
          '--list',
          'agent-task/*'
        ]
      );

    assert.equal(
      branchList.stdout.trim(),
      ''
    );
  }
);


test(
  'agent task runner rejects an invalid task before repository planning',
  async t => {

    const root =
      await createTempRoot(
        t
      );

    const task =
      createValidTask();

    delete task.goal;

    const taskFile =
      path.join(
        root,
        'invalid.agent-task.json'
      );

    await writeFile(
      taskFile,
      JSON.stringify(
        task,
        null,
        2
      )
    );

    const report =
      await createAgentTaskDryRunReport(
        taskFile,
        {
          root
        }
      );

    assert.equal(
      report.status,
      'invalid'
    );

    assert.equal(
      report.repository,
      null
    );

    assert.equal(
      report.validation.errors.some(error =>
        error.code === 'TASK_GOAL_REQUIRED'
      ),
      true
    );
  }
);


test(
  'agent task runner blocks future execution from a dirty source worktree',
  async t => {

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createValidTask({
              requiresApproval:
                []
            })
        }
      );

    await writeFile(
      path.join(
        root,
        'README.md'
      ),
      'dirty fixture\n'
    );

    const report =
      await createAgentTaskDryRunReport(
        taskFile,
        {
          root
        }
      );

    assert.equal(
      report.status,
      'blocked'
    );

    assert.equal(
      report.repository.clean,
      false
    );

    assert.equal(
      report.blockingReasons.some(reason =>
        reason.code === 'SOURCE_WORKTREE_DIRTY'
      ),
      true
    );
  }
);


test(
  'agent task runner calculates include and exclude path scope policy',
  () => {

    const policy =
      createScopePolicy({
        include:
          [
            'path:tools/**',
            'Runner documentation'
          ],
        exclude:
          [
            'path:tools/generated/**',
            'Codex execution'
          ]
      });

    assert.equal(
      policy.automaticChangedFileDetection,
      true
    );

    assert.equal(
      policy.executionScopeStatus,
      'machine-enforceable'
    );

    const result =
      evaluateChangedFilesAgainstScope(
        [
          'tools/agent_task_runner.mjs',
          'js/app.js',
          'tools/generated/output.mjs'
        ],
        policy
      );

    assert.deepEqual(
      result.allowed,
      [
        'tools/agent_task_runner.mjs'
      ]
    );

    assert.deepEqual(
      result.outside,
      [
        'js/app.js'
      ]
    );

    assert.deepEqual(
      result.excluded,
      [
        'tools/generated/output.mjs'
      ]
    );
  }
);


test(
  'agent task runner treats declared approval rules as armed safeguards',
  async t => {

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createValidTask({
              requiresApproval:
                [
                  {
                    when:
                      'newDependency',
                    reason:
                      'Dependency changes need owner approval.'
                  }
                ]
            })
        }
      );

    const report =
      await createAgentTaskDryRunReport(
        taskFile,
        {
          root
        }
      );

    assert.equal(
      report.status,
      'ready'
    );

    assert.equal(
      report.approvalGates.declared,
      true
    );

    assert.equal(
      report.approvalGates.gates[0].status,
      'armed'
    );

    assert.equal(
      report.blockingReasons.some(reason =>
        reason.code === 'APPROVAL_GATE_TRIGGERED'
      ),
      false
    );
  }
);


test(
  'agent task runner blocks prose-only scope for autonomous execution readiness',
  async t => {

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createValidTask({
              scope:
                {
                  include:
                    [
                      'Agent task runner documentation'
                    ],
                  exclude:
                    [
                      'Product runtime changes'
                    ]
                }
            })
        }
      );

    const report =
      await createAgentTaskDryRunReport(
        taskFile,
        {
          root
        }
      );

    assert.equal(
      report.status,
      'blocked'
    );

    assert.equal(
      report.scopePolicy.executionScopeStatus,
      'human-review-required'
    );

    assert.equal(
      report.blockingReasons.some(reason =>
        reason.code === 'SCOPE_HUMAN_REVIEW_REQUIRED'
      ),
      true
    );
  }
);


test(
  'agent task runner can model a triggered unapproved approval gate',
  () => {

    const gates =
      createApprovalGates(
        [
          {
            when:
              'newDependency',
            reason:
              'Dependency changes require owner approval.'
          },
          {
            when:
              'largeBinaryAsset',
            reason:
              'Large binary assets require owner approval.'
          }
        ],
        {
          triggeredApprovalKeys:
            [
              'newDependency'
            ]
        }
      );

    assert.equal(
      gates.overallStatus,
      'blocked'
    );

    assert.equal(
      gates.gates[0].status,
      'blocked'
    );

    assert.equal(
      gates.gates[1].status,
      'armed'
    );
  }
);


test(
  'agent task runner can model an approved triggered gate without bypassing dry-run',
  () => {

    const gates =
      createApprovalGates(
        [
          {
            when:
              'newDependency',
            reason:
              'Dependency changes require owner approval.'
          }
        ],
        {
          triggeredApprovalKeys:
            [
              'newDependency'
            ],
          approvedApprovalKeys:
            [
              'newDependency'
            ]
        }
      );

    assert.equal(
      gates.overallStatus,
      'approved'
    );

    assert.equal(
      gates.blocked,
      false
    );

    assert.equal(
      gates.gates[0].status,
      'approved'
    );
  }
);


test(
  'path-scoped execution-readiness fixture becomes ready',
  async t => {

    const task =
      await readJsonTask(
        'docs/03-testing/agent-tasks/examples/runner-readiness.agent-task.json'
      );

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task
        }
      );

    const report =
      await createAgentTaskDryRunReport(
        taskFile,
        {
          root
        }
      );

    assert.equal(
      report.status,
      'ready'
    );

    assert.equal(
      report.scopePolicy.executionScopeStatus,
      'machine-enforceable'
    );

    assert.equal(
      report.approvalGates.overallStatus,
      'armed'
    );
  }
);


test(
  'completed prose-scope example remains blocked for autonomous execution readiness',
  async t => {

    const task =
      await readJsonTask(
        'docs/03-testing/agent-tasks/examples/dice-roll-event-integration.agent-task.json'
      );

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task
        }
      );

    const report =
      await createAgentTaskDryRunReport(
        taskFile,
        {
          root
        }
      );

    assert.equal(
      report.status,
      'blocked'
    );

    assert.equal(
      report.scopePolicy.executionScopeStatus,
      'human-review-required'
    );

    assert.equal(
      report.approvalGates.overallStatus,
      'armed'
    );
  }
);


test(
  'agent task runner report keeps a stable top-level shape',
  async t => {

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createValidTask({
              requiresApproval:
                []
            })
        }
      );

    const report =
      await createAgentTaskDryRunReport(
        taskFile,
        {
          root
        }
      );

    assert.deepEqual(
      Object.keys(
        report
      ),
      [
        'kind',
        'version',
        'mode',
        'status',
        'createdAt',
        'task',
        'repository',
        'plannedWorktree',
        'scopePolicy',
        'verificationPlan',
        'approvalGates',
        'dryRunGuarantees',
        'blockingReasons',
        'validation'
      ]
    );
  }
);


test(
  'agent task runner selects a working standalone Codex CLI candidate',
  async t => {

    const root =
      await createTempRoot(
        t
      );

    const codexPath =
      path.join(
        root,
        'codex.exe'
      );

    const runner =
      (
        command,
        args
      ) => {

        if (
          command === codexPath &&
          args[0] === '--version'
        ) {

          return createCommandResult({
            stdout:
              'codex-cli 0.test\n'
          });
        }

        return createCommandResult({
          status:
            1,
          stderr:
            'unexpected command\n'
        });
      };

    const result =
      resolveCodexCli({
        explicitPath:
          codexPath,
        root,
        commandRunner:
          runner,
        disableDefaultCandidates:
          true
      });

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.path,
      codexPath
    );

    assert.equal(
      result.version,
      'codex-cli 0.test'
    );
  }
);


test(
  'agent task runner skips failing and packaged Codex candidates',
  async t => {

    const root =
      await createTempRoot(
        t
      );

    const failingPath =
      path.join(
        root,
        'inaccessible-codex.exe'
      );

    const packagedPath =
      'C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.810.7004.0_x64__2p2nqsd0c76g0\\app\\resources\\codex.exe';

    const goodPath =
      path.join(
        root,
        'standalone-codex.exe'
      );

    const result =
      resolveCodexCli({
        root,
        platform:
          'win32',
        commandRunner:
          (
            command,
            args
          ) => {

            if (
              command === failingPath &&
              args[0] === '--version'
            ) {

              return createCommandResult({
                status:
                  1,
                stderr:
                  'Access is denied.\n'
              });
            }

            if (
              command === goodPath &&
              args[0] === '--version'
            ) {

              return createCommandResult({
                stdout:
                  'codex-cli 0.good\n'
              });
            }

            return createCommandResult({
              status:
                1,
              stderr:
                'unexpected command\n'
            });
          },
        pathCandidates:
          [
            failingPath,
            packagedPath,
            goodPath
          ],
        disableDefaultCandidates:
          true
      });

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.path,
      goodPath
    );

    assert.equal(
      result.rejected.some(candidate =>
        candidate.path === packagedPath
      ),
      true
    );
  }
);


test(
  'agent task runner checks the supported Windows user install before PATH aliases',
  async t => {

    const root =
      await createTempRoot(
        t
      );

    const localAppData =
      path.win32.join(
        'C:\\Users',
        'TestUser',
        'AppData',
        'Local'
      );

    const standalonePath =
      path.win32.join(
        localAppData,
        'Programs',
        'OpenAI',
        'Codex',
        'bin',
        'codex.exe'
      );

    const windowsAppsPath =
      'C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.810.7004.0_x64__2p2nqsd0c76g0\\app\\resources\\codex.exe';

    const result =
      resolveCodexCli({
        root,
        platform:
          'win32',
        env:
          {
            LOCALAPPDATA:
              localAppData
          },
        pathCandidates:
          [
            windowsAppsPath
          ],
        commandRunner:
          (
            command,
            args
          ) => {

            if (
              command === standalonePath &&
              args[0] === '--version'
            ) {

              return createCommandResult({
                stdout:
                  'codex-cli 0.user\n'
              });
            }

            return createCommandResult({
              status:
                1,
              stderr:
                'unexpected command\n'
            });
          }
      });

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.path,
      standalonePath
    );

    assert.equal(
      result.source,
      'standalone-user-install'
    );
  }
);


test(
  'agent task execution blocks when no Codex CLI candidate is executable',
  async t => {

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createValidTask({
              id:
                'OFFPLAN-NO-CODEX',
              title:
                'No Codex Fixture',
              requiresApproval:
                []
            })
        }
      );

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          commandRunner:
            createExecutionCommandRunner({
              codexPath:
                path.join(
                  root,
                  'missing-codex.exe'
                )
            }).runner,
          disableDefaultCliCandidates:
            true,
          pathCandidates:
            []
        }
      );

    assert.equal(
      report.status,
      'blocked'
    );

    assert.equal(
      report.codexExecutions,
      0
    );

    assert.equal(
      report.blockingReasons.some(reason =>
        reason.code === 'CODEX_CLI_UNAVAILABLE'
      ),
      true
    );
  }
);


test(
  'agent task execution runs Codex once and passes in-scope changes',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-pass.exe'
      );

    const task =
      createSmokeExecutionTask({
        id:
          'OFFPLAN-EXEC-PASS',
        includePath:
          'docs/smoke.txt'
      });

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task
        }
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        writeFiles:
          [
            {
              file:
                'docs/smoke.txt',
              content:
                'smoke pass\n'
            }
          ]
      });

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.kind,
      AGENT_TASK_EXECUTION_REPORT_KIND
    );

    assert.equal(
      report.status,
      'passed'
    );

    assert.equal(
      report.codexExecutions,
      1
    );

    assert.deepEqual(
      report.codexExecutionCounts,
      {
        initial:
          1,
        repair:
          0,
        total:
          1
      }
    );

    assert.equal(
      report.repairAttempts,
      0
    );

    assert.equal(
      report.repair.attempted,
      false
    );

    assert.equal(
      mock.codexExecutions,
      1
    );

    assert.deepEqual(
      report.changedFiles.files,
      [
        'docs/smoke.txt'
      ]
    );

    assert.equal(
      report.scopeResult.ok,
      true
    );

    assert.equal(
      report.postAgentScopeCheck.status,
      'pass'
    );

    assert.equal(
      report.verificationDependencyEnvironment.status,
      'temporary-source-link'
    );

    assert.equal(
      report.verificationDependencyEnvironment.cleanup.ok,
      true
    );

    assert.equal(
      await pathExists(
        path.join(
          report.worktree.path,
          'node_modules'
        )
      ),
      false
    );

    assert.equal(
      report.verifyQuick.ok,
      true
    );

    assert.equal(
      report.taskVerification.every(result =>
        result.ok
      ),
      true
    );

    assert.equal(
      report.sourceAfter.clean,
      true
    );

    assert.equal(
      report.sourceAfter.head,
      report.sourceBefore.head
    );

    assert.deepEqual(
      mock.nodeModulesPresentDuringCodex(),
      [
        false
      ]
    );

    assert.equal(
      report.executionGuarantees.merges,
      false
    );

    assert.equal(
      report.executionGuarantees.pushes,
      false
    );

    assert.equal(
      mock.calls.some(call =>
        call.command === 'git' &&
        (
          call.args[0] === 'merge' ||
          call.args[0] === 'push'
        )
      ),
      false
    );

    const codexCallIndex =
      mock.calls.findIndex(call =>
        call.command === codexPath &&
        call.args.includes(
          'exec'
        )
      );

    const scopeCollectionIndex =
      mock.calls.findIndex((call, index) =>
        index > codexCallIndex &&
        call.command === 'git' &&
        call.cwd === report.worktree.path &&
        call.args[0] === 'status' &&
        call.args.includes(
          '--untracked-files=all'
        )
      );

    const verifyQuickIndex =
      mock.calls.findIndex(call =>
        call.command === 'npm run verify:quick'
      );

    assert.ok(
      codexCallIndex >= 0
    );

    assert.ok(
      scopeCollectionIndex > codexCallIndex
    );

    assert.ok(
      verifyQuickIndex > scopeCollectionIndex
    );

    assert.equal(
      mock.calls.filter(call =>
        call.command === codexPath &&
        call.args.includes(
          'exec'
        )
      ).length,
      1
    );

    const codexExecCall =
      mock.calls.find(call =>
        call.command === codexPath &&
        call.args.includes(
          'exec'
        )
      );

    assert.ok(
      codexExecCall
    );

    assert.equal(
      codexExecCall.args[0],
      '--ask-for-approval'
    );

    assert.equal(
      codexExecCall.args[1],
      'never'
    );

    assert.equal(
      codexExecCall.args[2],
      'exec'
    );

    assert.ok(
      codexExecCall.args.indexOf(
        '--ask-for-approval'
      ) < codexExecCall.args.indexOf(
        'exec'
      )
    );

    assert.equal(
      codexExecCall.args[
        codexExecCall.args.indexOf(
          '-s'
        ) + 1
      ],
      'workspace-write'
    );

    assert.equal(
      mock.calls.some(call =>
        call.command === codexPath &&
        call.args.includes(
          'danger-full-access'
        )
      ),
      false
    );

    assert.equal(
      mock.calls.some(call =>
        call.command === codexPath &&
        (
          call.args.includes(
            '--approve-for-me'
          ) ||
          call.args.includes(
            '--dangerously-bypass-approvals-and-sandbox'
          )
        )
      ),
      false
    );
  }
);


test(
  'agent task execution performs one bounded repair after required verification fails',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-repair-pass.exe'
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        codexRuns:
          [
            {
              status:
                0,
              writeFiles:
                [
                  {
                    file:
                      'docs/smoke.txt',
                    content:
                      'initial fail\n'
                  }
                ]
            },
            {
              status:
                0,
              writeFiles:
                [
                  {
                    file:
                      'docs/smoke.txt',
                    content:
                      'repair pass\n'
                  }
                ]
            }
          ],
        verifyQuickStatuses:
          [
            1,
            0
          ]
      });

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createSmokeExecutionTask({
              id:
                'OFFPLAN-REPAIR-PASS',
              includePath:
                'docs/smoke.txt'
            })
        }
      );

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'passed'
    );

    assert.equal(
      report.codexExecutions,
      2
    );

    assert.deepEqual(
      report.codexExecutionCounts,
      {
        initial:
          1,
        repair:
          1,
        total:
          2
      }
    );

    assert.equal(
      report.repairAttempts,
      1
    );

    assert.equal(
      report.initial.verifyQuick.ok,
      false
    );

    assert.equal(
      report.repair.attempted,
      true
    );

    assert.equal(
      report.repair.verifyQuick.ok,
      true
    );

    assert.equal(
      report.dependencyBridgeRemovedBeforeRepair,
      true
    );

    assert.deepEqual(
      mock.nodeModulesPresentDuringCodex(),
      [
        false,
        false
      ]
    );

    assert.equal(
      await pathExists(
        path.join(
          report.worktree.path,
          'node_modules'
        )
      ),
      false
    );

    assert.equal(
      mock.codexExecutions,
      2
    );
  }
);


test(
  'agent task execution repairs after a required task verification command fails',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-task-repair-pass.exe'
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        codexRuns:
          [
            {
              status:
                0,
              writeFiles:
                [
                  {
                    file:
                      'docs/smoke.txt',
                    content:
                      'task verification fail\n'
                  }
                ]
            },
            {
              status:
                0,
              writeFiles:
                [
                  {
                    file:
                      'docs/smoke.txt',
                    content:
                      'task verification pass\n'
                  }
                ]
            }
          ],
        verifyQuickStatuses:
          [
            0,
            0
          ],
        taskVerificationStatuses:
          [
            1,
            0
          ]
      });

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createSmokeExecutionTask({
              id:
                'OFFPLAN-TASK-VERIFY-REPAIR',
              includePath:
                'docs/smoke.txt'
            })
        }
      );

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'passed'
    );

    assert.equal(
      report.codexExecutions,
      2
    );

    assert.equal(
      report.repairAttempts,
      1
    );

    assert.equal(
      report.initial.taskVerification[0].ok,
      false
    );

    assert.equal(
      report.repair.taskVerification[0].ok,
      true
    );

    assert.equal(
      mock.verifyQuickExecutions,
      2
    );

    assert.equal(
      mock.taskVerificationExecutions,
      2
    );
  }
);


test(
  'agent task execution stops permanently after one failed repair',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-repair-fail.exe'
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        codexRuns:
          [
            {
              status:
                0,
              writeFiles:
                [
                  {
                    file:
                      'docs/smoke.txt',
                    content:
                      'initial fail\n'
                  }
                ]
            },
            {
              status:
                0,
              writeFiles:
                [
                  {
                    file:
                      'docs/smoke.txt',
                    content:
                      'repair still fails\n'
                  }
                ]
            },
            {
              status:
                0,
              writeFiles:
                [
                  {
                    file:
                      'docs/smoke.txt',
                    content:
                      'third run must never happen\n'
                  }
                ]
            }
          ],
        verifyQuickStatuses:
          [
            1,
            1,
            0
          ]
      });

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createSmokeExecutionTask({
              id:
                'OFFPLAN-REPAIR-FAIL',
              includePath:
                'docs/smoke.txt'
            })
        }
      );

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'failed'
    );

    assert.equal(
      report.codexExecutions,
      2
    );

    assert.equal(
      report.codexExecutionCounts.total,
      2
    );

    assert.equal(
      report.repairAttempts,
      1
    );

    assert.equal(
      mock.codexExecutions,
      2
    );

    assert.equal(
      mock.verifyQuickExecutions,
      2
    );
  }
);


test(
  'agent task execution reports scope violation for out-of-scope files',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-scope.exe'
      );

    const task =
      createSmokeExecutionTask({
        id:
          'OFFPLAN-SCOPE-VIOLATION',
        includePath:
          'docs/allowed.txt'
      });

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task
        }
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        writeFiles:
          [
            {
              file:
                'docs/out-of-scope.txt',
              content:
                'outside\n'
            }
          ]
      });

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'scope_violation'
    );

    assert.equal(
      report.repairAttempts,
      0
    );

    assert.equal(
      mock.codexExecutions,
      1
    );

    assert.deepEqual(
      report.scopeResult.outside,
      [
        'docs/out-of-scope.txt'
      ]
    );

    assert.equal(
      report.postAgentScopeCheck.status,
      'violation'
    );

    assert.equal(
      report.verificationDependencyEnvironment.status,
      'not-run'
    );

    assert.equal(
      report.verifyQuick,
      null
    );

    assert.equal(
      report.taskVerification.length,
      0
    );

    assert.equal(
      mock.calls.some(call =>
        call.command === 'npm run verify:quick'
      ),
      false
    );

    assert.equal(
      mock.calls.some(call =>
        call.shell &&
        call.command === 'git diff --check'
      ),
      false
    );

    assert.equal(
      await pathExists(
        path.join(
          report.worktree.path,
          'node_modules'
        )
      ),
      false
    );
  }
);


test(
  'agent task execution stops when repair introduces an out-of-scope file',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-repair-scope.exe'
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        codexRuns:
          [
            {
              status:
                0,
              writeFiles:
                [
                  {
                    file:
                      'docs/allowed.txt',
                    content:
                      'initial fail\n'
                  }
                ]
            },
            {
              status:
                0,
              writeFiles:
                [
                  {
                    file:
                      'docs/out-of-scope.txt',
                    content:
                      'outside\n'
                  }
                ]
            }
          ],
        verifyQuickStatuses:
          [
            1,
            0
          ]
      });

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createSmokeExecutionTask({
              id:
                'OFFPLAN-REPAIR-SCOPE',
              includePath:
                'docs/allowed.txt'
            })
        }
      );

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'scope_violation'
    );

    assert.equal(
      report.repairAttempts,
      1
    );

    assert.deepEqual(
      report.repair.scopeResult.outside,
      [
        'docs/out-of-scope.txt'
      ]
    );

    assert.equal(
      report.repair.verifyQuick,
      null
    );

    assert.equal(
      mock.verifyQuickExecutions,
      1
    );

    assert.equal(
      mock.taskVerificationExecutions,
      0
    );
  }
);


test(
  'agent task execution removes the temporary dependency bridge after failed verification',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-verify-fail.exe'
      );

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createSmokeExecutionTask({
              id:
                'OFFPLAN-VERIFY-FAIL',
              includePath:
                'docs/smoke.txt'
            })
        }
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        verifyQuickStatus:
          1,
        writeFiles:
          [
            {
              file:
                'docs/smoke.txt',
              content:
                'smoke pass\n'
            }
          ]
      });

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'failed'
    );

    assert.equal(
      report.codexExecutions,
      2
    );

    assert.equal(
      report.repairAttempts,
      1
    );

    assert.equal(
      report.verificationDependencyEnvironment.status,
      'temporary-source-link'
    );

    assert.equal(
      report.verificationDependencyEnvironment.cleanup.ok,
      true
    );

    assert.equal(
      report.verifyQuick.ok,
      false
    );

    assert.equal(
      report.taskVerification.length,
      0
    );

    assert.equal(
      mock.codexExecutions,
      2
    );

    assert.equal(
      mock.verifyQuickExecutions,
      2
    );

    assert.equal(
      await pathExists(
        path.join(
          report.worktree.path,
          'node_modules'
        )
      ),
      false
    );
  }
);


test(
  'agent task execution does not reuse source dependencies after package manifest changes',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-package-change.exe'
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        writeFiles:
          [
            {
              file:
                'package.json',
              content:
                '{"name":"changed"}\n'
            }
          ]
      });

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createSmokeExecutionTask({
              id:
                'OFFPLAN-PACKAGE-CHANGE',
              includePath:
                'package.json'
            })
        }
      );

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'blocked'
    );

    assert.equal(
      report.codexExecutions,
      1
    );

    assert.equal(
      report.repairAttempts,
      0
    );

    assert.equal(
      report.postAgentScopeCheck.status,
      'pass'
    );

    assert.equal(
      report.verificationDependencyEnvironment.status,
      'unavailable'
    );

    assert.equal(
      report.verificationDependencyEnvironment.code,
      'PACKAGE_MANIFEST_CHANGED'
    );

    assert.equal(
      report.verifyQuick,
      null
    );

    assert.equal(
      mock.calls.some(call =>
        call.command === 'npm run verify:quick'
      ),
      false
    );

    assert.equal(
      mock.codexExecutions,
      1
    );
  }
);


test(
  'agent task execution reports missing dependency environment without installing packages',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-no-node-modules.exe'
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        writeFiles:
          [
            {
              file:
                'docs/smoke.txt',
              content:
                'smoke pass\n'
            }
          ]
      });

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createSmokeExecutionTask({
              id:
                'OFFPLAN-NO-NODE-MODULES',
              includePath:
                'docs/smoke.txt'
            })
        }
      );

    await rm(
      path.join(
        root,
        'node_modules'
      ),
      {
        recursive:
          true,
        force:
          true
      }
    );

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'blocked'
    );

    assert.equal(
      report.codexExecutions,
      1
    );

    assert.equal(
      report.repairAttempts,
      0
    );

    assert.equal(
      report.verificationDependencyEnvironment.status,
      'unavailable'
    );

    assert.equal(
      report.verificationDependencyEnvironment.code,
      'SOURCE_NODE_MODULES_MISSING'
    );

    assert.equal(
      report.verifyQuick,
      null
    );

    assert.equal(
      mock.calls.some(call =>
        call.command === 'npm install' ||
        call.command === 'npm ci' ||
        call.command === 'pnpm install' ||
        call.command === 'yarn'
      ),
      false
    );

    assert.equal(
      mock.codexExecutions,
      1
    );
  }
);


test(
  'agent task execution reports failed when Codex exits non-zero',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-fail.exe'
      );

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createSmokeExecutionTask({
              id:
                'OFFPLAN-CODEX-FAIL',
              includePath:
                'docs/smoke.txt'
            })
        }
      );

    const mock =
      createExecutionCommandRunner({
        codexPath,
        codexExitStatus:
          2
      });

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'failed'
    );

    assert.equal(
      report.codexExecutions,
      1
    );

    assert.equal(
      report.repairAttempts,
      0
    );

    assert.equal(
      report.verifyQuick,
      null
    );

    assert.equal(
      mock.codexExecutions,
      1
    );
  }
);


test(
  'agent task execution blocks triggered approval before Codex invocation',
  async t => {

    const codexPath =
      path.join(
        os.tmpdir(),
        'mock-codex-approval.exe'
      );

    const mock =
      createExecutionCommandRunner({
        codexPath
      });

    const {
      root,
      taskFile
    } =
      await createGitFixture(
        t,
        {
          task:
            createSmokeExecutionTask({
              id:
                'OFFPLAN-APPROVAL-BLOCK',
              includePath:
                'docs/smoke.txt',
              requiresApproval:
                [
                  {
                    when:
                      'newDependency',
                    reason:
                      'Dependency changes require owner approval.'
                  }
                ]
            })
        }
      );

    const report =
      await executeAgentTask(
        taskFile,
        {
          root,
          codexCliPath:
            codexPath,
          commandRunner:
            mock.runner,
          triggeredApprovalKeys:
            [
              'newDependency'
            ],
          disableDefaultCliCandidates:
            true
        }
      );

    assert.equal(
      report.status,
      'blocked'
    );

    assert.equal(
      report.codexExecutions,
      0
    );

    assert.equal(
      report.repairAttempts,
      0
    );

    assert.equal(
      mock.codexExecutions,
      0
    );

    assert.equal(
      report.approvalGates.gates[0].status,
      'blocked'
    );
  }
);


test(
  'package scripts expose the agent task dry-run runner',
  async () => {

    const packageJson =
      JSON.parse(
        await readFile(
          'package.json',
          'utf8'
        )
      );

    assert.equal(
      packageJson.scripts['agent:task'],
      'node tools/agent_task_runner.mjs'
    );
  }
);


async function createGitFixture(
  t,
  {
    task =
      createValidTask()
  } = {}
) {

  const root =
    await createTempRoot(
      t
    );

  const taskFile =
    path.join(
      root,
      'task.agent-task.json'
    );

  await writeFile(
    taskFile,
    JSON.stringify(
      task,
      null,
      2
    )
  );

  await writeFile(
    path.join(
      root,
      'README.md'
    ),
    'fixture\n'
  );

  await writeFile(
    path.join(
      root,
      '.gitignore'
    ),
    'node_modules/\n'
  );

  runGit(
    root,
    [
      'init'
    ]
  );

  runGit(
    root,
    [
      'add',
      '.gitignore',
      'README.md',
      'task.agent-task.json'
    ]
  );

  runGit(
    root,
    [
      '-c',
      'user.name=MyOwnWorld Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-m',
      'Initial fixture'
    ]
  );

  await mkdir(
    path.join(
      root,
      'node_modules',
      '.fixture'
    ),
    {
      recursive:
        true
    }
  );

  await writeFile(
    path.join(
      root,
      'node_modules',
      '.fixture',
      'installed.txt'
    ),
    'installed\n'
  );

  return {
    root,
    taskFile
  };
}


async function createTempRoot(
  t
) {

  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        'mow-agent-task-runner-'
      )
    );

  t.after(
    async () => {

      await rm(
        root,
        {
          recursive:
            true,
          force:
            true
        }
      );

      await rm(
        path.resolve(
          path.dirname(
            root
          ),
          `${path.basename(root)}-agent-worktrees`
        ),
        {
          recursive:
            true,
          force:
            true
        }
      );
    }
  );

  return root;
}


async function readJsonTask(
  filePath
) {

  return JSON.parse(
    await readFile(
      filePath,
      'utf8'
    )
  );
}


function createValidTask(
  overrides =
    {}
) {

  return {
    schema:
      AGENT_TASK_SCHEMA,
    id:
      'OFFPLAN-001',
    title:
      'Runner Fixture',
    ownerMode:
      'OWNER-DIRECTED OFF-PLAN MAINTENANCE',
    goal:
      'Build a deterministic dry-run report for a task.',
    scope:
      {
        include:
          [
            'path:tools/**',
            'path:tests/**',
            'Agent task runner foundation'
          ],
        exclude:
          [
            'Codex execution',
            'Product UI changes'
          ]
      },
    acceptance:
      [
        'Dry-run report is created.'
      ],
    verification:
      {
        commands:
          [
            {
              command:
                'npm run verify',
              required:
                true,
              reason:
                'Repository baseline must stay green.'
            }
          ],
        manual:
          []
      },
    risk:
      {
        level:
          'medium',
        notes:
          'The runner plans future automation but must not execute tasks.'
      },
    requiresApproval:
      [],
    notes:
      [
        'Unit-test fixture only.'
      ],
    ...overrides
  };
}


function createSmokeExecutionTask({
  id,
  includePath,
  requiresApproval =
    []
}) {

  return createValidTask({
    id,
    title:
      'Execution Fixture',
    goal:
      'Create one isolated test evidence file.',
    scope:
      {
        include:
          [
            `path:${includePath}`,
            'Execution fixture evidence'
          ],
        exclude:
          [
            'path:js/**',
            'path:styles/**',
            'Product runtime changes'
          ]
      },
    acceptance:
      [
        'The scoped evidence file is changed.'
      ],
    verification:
      {
        commands:
          [
            {
              command:
                'git diff --check',
              required:
                true,
              reason:
                'Execution fixture must not add whitespace errors.'
            }
          ],
        manual:
          []
      },
    risk:
      {
        level:
          'low',
        notes:
          'The fixture is constrained to one test evidence path.'
      },
    requiresApproval
  });
}


function createExecutionCommandRunner({
  codexPath,
  codexExitStatus =
    0,
  codexRuns =
    null,
  verifyQuickStatus =
    0,
  verifyQuickStatuses =
    null,
  taskVerificationStatus =
    0,
  taskVerificationStatuses =
    null,
  writeFiles =
    []
}) {

  const calls =
    [];

  let codexExecutions =
    0;

  let verifyQuickExecutions =
    0;

  let taskVerificationExecutions =
    0;

  const nodeModulesPresentDuringCodex =
    [];

  const runner =
    (
      command,
      args =
        [],
      options =
        {}
    ) => {

      calls.push({
        command,
        args:
          [...args],
        cwd:
          options.cwd || '',
        input:
          options.input || '',
        shell:
          Boolean(
            options.shell
          )
      });

      if (
        command === codexPath &&
        args[0] === '--version'
      ) {

        return createCommandResult({
          stdout:
            'codex-cli 0.test\n'
        });
      }

      if (
        command === codexPath &&
        args.includes(
          'exec'
        )
      ) {

        const run =
          codexRuns?.[codexExecutions] || {
            status:
              codexExitStatus,
            writeFiles
          };

        codexExecutions += 1;

        nodeModulesPresentDuringCodex.push(
          existsSync(
            path.join(
              options.cwd,
              'node_modules'
            )
          )
        );

        for (const file of run.writeFiles || []) {

          const target =
            path.join(
              options.cwd,
              file.file
            );

          mkdirSync(
            path.dirname(
              target
            ),
            {
              recursive:
                true
            }
          );

          writeFileSync(
            target,
            file.content,
            'utf8'
          );
        }

        return createCommandResult({
          status:
            run.status ?? codexExitStatus,
          stdout:
            run.stdout ?? (
              (run.status ?? codexExitStatus) === 0
                ? 'codex complete\n'
                : ''
            ),
          stderr:
            run.stderr ?? (
              (run.status ?? codexExitStatus) === 0
                ? ''
                : 'codex failed\n'
            )
        });
      }

      if (command === 'npm run verify:quick') {

        const status =
          verifyQuickStatuses?.[verifyQuickExecutions] ??
          verifyQuickStatus;

        verifyQuickExecutions += 1;

        return createCommandResult({
          status:
            status,
          stdout:
            status === 0
              ? 'quick ok\n'
              : '',
          stderr:
            status === 0
              ? ''
              : 'quick failed\n'
        });
      }

      if (options.shell) {

        const status =
          taskVerificationStatuses?.[taskVerificationExecutions] ??
          taskVerificationStatus;

        taskVerificationExecutions += 1;

        return createCommandResult({
          status:
            status,
          stdout:
            status === 0
              ? 'task verification ok\n'
              : '',
          stderr:
            status === 0
              ? ''
              : 'task verification failed\n'
        });
      }

      const result =
        spawnSync(
          command,
          args,
          {
            cwd:
              options.cwd,
            encoding:
              'utf8',
            shell:
              false
          }
        );

      return createCommandResult({
        status:
          result.status ?? 1,
        stdout:
          result.stdout || '',
        stderr:
          result.stderr || '',
        error:
          result.error?.message || ''
      });
    };

  return {
    runner,
    calls,
    get codexExecutions() {

      return codexExecutions;
    },
    get verifyQuickExecutions() {

      return verifyQuickExecutions;
    },
    get taskVerificationExecutions() {

      return taskVerificationExecutions;
    },
    nodeModulesPresentDuringCodex() {

      return [
        ...nodeModulesPresentDuringCodex
      ];
    }
  };
}


function createCommandResult({
  status =
    0,
  stdout =
    '',
  stderr =
    '',
  error =
    ''
} = {}) {

  return {
    ok:
      status === 0 &&
      !error,
    status,
    stdout,
    stderr,
    error
  };
}


function runGit(
  root,
  args
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

  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout
  );

  return result;
}


async function pathExists(
  filePath
) {

  return stat(
    filePath
  )
    .then(
      () => true,
      () => false
    );
}
