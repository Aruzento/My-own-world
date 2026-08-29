---
summary: "Machine-readable task contract for autonomous MyOwnWorld agents."
read_when:
  - "Before handing a task to an autonomous agent"
  - "Before adding or validating .agent-task.json files"
owner_zone: "architecture"
---
# Agent Task Contract

Status: accepted on 2026-08-28 as owner-directed off-plan maintenance.

Readiness: `Foundation`. This contract gives future agents a strict executable task format and validator. It does not implement an autonomous runner, scheduling, task execution, roadmap automation or phase changes.

## Canonical Format

Executable task files use JSON and the suffix `.agent-task.json`.

YAML examples may appear in human documentation, but they are illustrative only. The project does not currently depend on a YAML parser, and this contract must not add one solely for task validation.

## Required Shape

```json
{
  "schema": "myownworld.agent-task.v1",
  "id": "0.0.1.15.5",
  "title": "Dice Roll Event Integration",
  "goal": "Make Dice Engine RollResult the first real Event Log consumer.",
  "scope": {
    "include": ["RollResult to roll event orchestration"],
    "exclude": ["Dice UI", "combat automation"]
  },
  "acceptance": ["roll events append durably"],
  "verification": {
    "commands": [
      {
        "command": "npm run verify",
        "required": true,
        "reason": "Project baseline must stay green."
      }
    ],
    "manual": []
  },
  "risk": {
    "level": "medium",
    "notes": "Touches durable event append semantics."
  },
  "requiresApproval": [
    {
      "when": "persistentFormatChange",
      "reason": "Event storage schema changes require owner approval."
    }
  ]
}
```

Required fields:

| Field | Contract |
|---|---|
| `schema` | Must equal `myownworld.agent-task.v1`. |
| `id` | Non-empty stable task id. Use roadmap ids, RCB ids or owner-approved off-plan ids. |
| `goal` | Non-empty user outcome. It must describe the intended result, not the implementation trick. |
| `scope.include` | Non-empty list of work explicitly inside the task. |
| `scope.exclude` | Non-empty list of work explicitly outside the task. This prevents scope creep. |
| `acceptance` | Non-empty list of observable completion criteria. |
| `verification.commands` | Non-empty list of command objects: `command`, `required`, `reason`. |
| `risk.level` | One of `low`, `medium`, `high`, `critical`. |
| `risk.notes` | Non-empty human explanation of the risk level. |
| `requiresApproval` | Array of approval rules. Use an empty array only when no unusual action is expected. |

Optional fields:

| Field | Contract |
|---|---|
| `title` | Short human title. |
| `ownerMode` | Short mode label such as `OWNER-DIRECTED OFF-PLAN MAINTENANCE`. |
| `notes` | Short non-executable context strings. |

Unknown top-level fields are rejected in v1. New fields require a contract and validator update.

## Scope Policy For Runners

`scope.include` and `scope.exclude` remain the required human-readable task boundary.

When a task needs machine-checkable changed-file scope, an entry may use a `path:` prefix with a repo-relative path or simple glob:

```json
{
  "scope": {
    "include": ["path:tools/**", "Agent task runner documentation"],
    "exclude": ["path:js/**", "Product runtime changes"]
  }
}
```

The runner treats `path:` entries as future changed-file guards:

- files outside `include` path rules are outside scope;
- files matching `exclude` path rules are explicitly blocked;
- if no `path:` include exists, future execution must require human scope review instead of pretending file scope is enforceable.

Dry-run reports this as `executionScopeStatus`:

- `machine-enforceable`: at least one `scope.include` entry is a `path:` rule, so future execution can compare changed files against the declared path boundary;
- `human-review-required`: the task may still be a valid human task, but autonomous execution readiness is blocked because prose-only scope cannot be enforced mechanically.

This convention reuses the existing `scope.include` / `scope.exclude` arrays and does not add a second task schema.

## Approval Rules

Each `requiresApproval` entry must be:

```json
{
  "when": "newDependency",
  "reason": "Adding dependencies changes supply-chain and build behavior."
}
```

Allowed `when` values:

- `newDependency`
- `persistentFormatChange`
- `destructiveFilesystemAction`
- `realWorkspaceMutation`
- `externalNetworkOrApi`
- `broadRefactor`
- `tauriOrBuildPipelineChange`
- `newProductFeature`
- `largeBinaryAsset`
- `ownerDecision`

The validator rejects malformed approval rules instead of treating them as advisory prose.

Approval rules are conditional safeguards, not automatic execution blockers. The dry-run runner reports declared rules as `armed`. A future executor must block only when a protected operation is actually requested or detected.

Approval gate states:

- `armed`: declared and watching for a protected operation;
- `triggered`: protected operation was detected or requested;
- `approved`: triggered operation has explicit owner approval;
- `blocked`: triggered operation has not been approved.

Dry-run never approves an operation and never bypasses approval.

## Verification Contract

Every task must name at least one verification command. Each command object must include:

- `command`: exact repository command;
- `required`: boolean;
- `reason`: why the command is relevant.

Manual checks are optional and belong in `verification.manual` as strings. They do not replace required automated checks when automation is practical.

## Human YAML Example

This YAML-style example is for readability only:

```yaml
schema: myownworld.agent-task.v1
id: 0.0.1.15.5
goal: Make Dice Engine RollResult the first real Event Log consumer.
scope:
  include:
    - RollResult to roll event orchestration
  exclude:
    - Dice UI
    - Combat automation
acceptance:
  - roll events append durably
verification:
  commands:
    - command: npm run verify
      required: true
      reason: Project baseline must stay green.
risk:
  level: medium
  notes: Touches durable event append semantics.
requiresApproval:
  - when: persistentFormatChange
    reason: Event storage schema changes require owner approval.
```

Agents must execute and validate the JSON version, not this YAML example.

## Validator

Use:

```powershell
npm run tasks:validate
```

Default validation scans `docs/03-testing/agent-tasks` for `*.agent-task.json` files. Specific files or directories may be passed to the script:

```powershell
node tools/validate_agent_tasks.mjs docs/03-testing/agent-tasks/examples
```

The validator is intentionally lightweight and dependency-free. It validates the v1 task shape; it does not run the task, mutate the roadmap, create commits or approve risky actions.

## Dry-Run Runner

Use:

```powershell
npm run agent:task -- --dry-run docs/03-testing/agent-tasks/examples/dice-roll-event-integration.agent-task.json
```

The completed Dice Roll example intentionally has prose-only scope, so it validates but reports `executionScopeStatus: human-review-required` and is blocked for autonomous execution readiness. Use the path-scoped runner readiness fixture to see a clean `ready` dry-run:

```powershell
npm run agent:task -- --dry-run docs/03-testing/agent-tasks/examples/runner-readiness.agent-task.json
```

The v1 runner is a planning foundation only. It:

- validates the task through the existing contract validator;
- inspects the current Git repository state;
- blocks future execution planning when the source worktree is dirty;
- calculates a dedicated branch name and sibling worktree path;
- reports scope include/exclude policy and any `path:` rules;
- reports whether changed-file scope is `machine-enforceable` or `human-review-required`;
- reports verification commands and standard quick/normal/full gates;
- reports `requiresApproval` entries as armed approval gates until a protected operation is triggered;
- emits both a human-readable report and a machine-readable JSON report.

The dry-run runner must not modify product files, create commits, create branches, create worktrees, merge, push, reset, invoke Codex or bypass owner approval.

## Single-Pass Codex Execution Runner

Use:

```powershell
npm run agent:task -- --execute docs/03-testing/agent-tasks/examples/autonomous-runner-smoke.agent-task.json
```

Execution mode is intentionally narrower than a general autonomous workflow. It:

- reuses the same task validator and dry-run readiness checks;
- requires a clean source worktree;
- requires machine-checkable `path:` include scope;
- resolves a supported standalone Codex CLI executable and records the exact path/version;
- creates one dedicated sibling git worktree and task branch;
- invokes `codex exec -C <worktree> -s workspace-write --color never --ephemeral -` exactly once in that worktree;
- runs `npm run verify:quick` and the task-declared verification commands;
- compares all changed/untracked files against `scope.include` / `scope.exclude` path rules;
- emits a machine-readable execution report.

Execution mode must not commit, merge, push, reset, retry with a repair pass, approve owner-gated actions or expand scope. Any changed file outside the declared path rules is reported as `scope_violation`.

The first live smoke task is deliberately docs/testing-only and writes only:

```text
docs/03-testing/agent-tasks/smoke-output/first-autonomous-smoke.txt
```

The smoke task branch/worktree remains unmerged and unpushed for owner inspection.

## Non-Goals

This contract does not:

- start `0.0.1.16.0` or any roadmap phase;
- create a multi-pass autonomous repair runner;
- allow hidden approval by schema;
- add YAML parsing;
- replace `AGENTS.md`, `PROJECT_PLAN.md`, `WORK_LOG.md` or Definition of Done;
- grant permission for destructive actions, real-workspace writes, new dependencies or persistent format changes.
