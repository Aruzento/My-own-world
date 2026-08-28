import assert from 'node:assert/strict';
import test from 'node:test';

import {
  spawnSync
} from 'node:child_process';

import {
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
  AGENT_TASK_RUNNER_REPORT_KIND,
  createAgentTaskDryRunReport,
  createApprovalGates,
  createScopePolicy,
  evaluateChangedFilesAgainstScope
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
