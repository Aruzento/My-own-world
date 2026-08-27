import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_TASK_ERROR_CODES,
  AGENT_TASK_SCHEMA,
  validateAgentTaskContract,
  validateAgentTaskFile
} from '../tools/validate_agent_tasks.mjs';


test(
  'agent task example validates against the executable JSON contract',
  async () => {

    const result =
      await validateAgentTaskFile(
        'docs/03-testing/agent-tasks/examples/dice-roll-event-integration.agent-task.json'
      );

    assert.equal(
      result.ok,
      true,
      JSON.stringify(
        result.errors,
        null,
        2
      )
    );
  }
);


test(
  'agent task validator rejects missing goal',
  () => {

    const task =
      createValidTask();

    delete task.goal;

    assertValidationCode(
      validateAgentTaskContract(
        task
      ),
      AGENT_TASK_ERROR_CODES.GOAL_REQUIRED
    );
  }
);


test(
  'agent task validator rejects empty acceptance',
  () => {

    const task =
      createValidTask();

    task.acceptance =
      [];

    assertValidationCode(
      validateAgentTaskContract(
        task
      ),
      AGENT_TASK_ERROR_CODES.ACCEPTANCE_REQUIRED
    );
  }
);


test(
  'agent task validator rejects missing scope',
  () => {

    const task =
      createValidTask();

    delete task.scope;

    assertValidationCode(
      validateAgentTaskContract(
        task
      ),
      AGENT_TASK_ERROR_CODES.SCOPE_REQUIRED
    );
  }
);


test(
  'agent task validator rejects malformed verification',
  () => {

    const task =
      createValidTask();

    task.verification.commands =
      [
        {
          command:
            'npm run verify',
          required:
            true
        }
      ];

    assertValidationCode(
      validateAgentTaskContract(
        task
      ),
      AGENT_TASK_ERROR_CODES.VERIFICATION_MALFORMED
    );
  }
);


test(
  'agent task validator rejects invalid risk',
  () => {

    const task =
      createValidTask();

    task.risk.level =
      'spicy';

    assertValidationCode(
      validateAgentTaskContract(
        task
      ),
      AGENT_TASK_ERROR_CODES.RISK_INVALID
    );
  }
);


test(
  'agent task validator rejects malformed approval rules',
  () => {

    const task =
      createValidTask();

    task.requiresApproval =
      [
        {
          when:
            'newDependency'
        }
      ];

    assertValidationCode(
      validateAgentTaskContract(
        task
      ),
      AGENT_TASK_ERROR_CODES.APPROVAL_RULE_MALFORMED
    );
  }
);


function createValidTask() {

  return {
    schema:
      AGENT_TASK_SCHEMA,
    id:
      'OFFPLAN-001',
    title:
      'Example maintenance task',
    ownerMode:
      'OWNER-DIRECTED OFF-PLAN MAINTENANCE',
    goal:
      'Create one small task contract fixture for validation.',
    scope:
      {
        include:
          [
            'Task contract fixture'
          ],
        exclude:
          [
            'Autonomous task runner'
          ]
      },
    acceptance:
      [
        'Validator accepts the valid fixture.'
      ],
    verification:
      {
        commands:
          [
            {
              command:
                'npm run tasks:validate',
              required:
                true,
              reason:
                'The task contract must be executable by the validator.'
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
          'Documentation and validator-only maintenance.'
      },
    requiresApproval:
      [
        {
          when:
            'newDependency',
          reason:
            'No dependency should be added for this validator.'
        }
      ],
    notes:
      [
        'Fixture used by unit tests.'
      ]
  };
}


function assertValidationCode(
  result,
  code
) {

  assert.equal(
    result.ok,
    false,
    'Expected validation to fail.'
  );

  assert.equal(
    result.errors.some(error =>
      error.code === code
    ),
    true,
    JSON.stringify(
      result.errors,
      null,
      2
    )
  );
}
