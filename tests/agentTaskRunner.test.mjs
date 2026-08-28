import assert from 'node:assert/strict';
import test from 'node:test';

import {
  spawnSync
} from 'node:child_process';

import {
  mkdtemp,
  readFile,
  rm,
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
  'agent task runner surfaces requiresApproval as an execution block',
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
      'blocked'
    );

    assert.equal(
      report.approvalGates.blocked,
      true
    );

    assert.equal(
      report.approvalGates.gates[0].status,
      'blocked-until-owner-approval'
    );

    assert.equal(
      report.blockingReasons.some(reason =>
        reason.code === 'APPROVAL_REQUIRED'
      ),
      true
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
}
