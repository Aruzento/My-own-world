---
summary: "Current desktop release gate report."
read_when:
  - "Before desktop installer handoff"
  - "When validating desktop release readiness"
owner_zone: "delivery"
---

# Desktop Release Gate Current

Run started: 2026-08-11T10:38:09.450Z

Run finished: 2026-08-11T10:39:41.617Z

Plan ref: `0.0.1.2.4`

Large workspace: not provided

Overall: PASSED - NORMAL WORKSPACE ONLY

Confidence: NORMAL_WORKSPACE_VALIDATED

Normal workspace validation: VALIDATED

Large workspace validation: SKIPPED

Advisory diagnostics: NONE

## Steps

- desktop release handoff preflight: passed (0 ms) - Required release handoff files exist. Required npm scripts exist.
- large workspace desktop smoke: skipped - Skipped because no --workspace path or MOW_DESKTOP_RELEASE_WORKSPACE was provided.
- documentation index: passed (65 ms)
- agent skills validation: passed (43 ms)
- verify: passed (15856 ms)
- browser smoke: passed (73608 ms)
- desktop frontend prepare: passed (264 ms)
- desktop packaging smoke: passed (41 ms)
- desktop environment: passed (825 ms)
- tauri cargo check: passed (1461 ms)

## Release Rule

- Do not build or hand off a desktop installer if any required step failed.
- `NORMAL_WORKSPACE_VALIDATED` is useful for local developer checks, but it is not equivalent to a large-workspace release validation.
- If the large workspace smoke is skipped, the release can only be treated as a normal workspace build, not a validated large-GM-workspace build.
- Advisory diagnostics warnings must be reviewed, but they are reported separately from hard gate failures.
- Before sending an installer to another person, run the manual native desktop checklist from `docs/01-delivery/DESKTOP_LARGE_WORKSPACE_SMOKE.md` when the target user has a large workspace.
- Keep `release/latest/release-notes.md` and `release/latest/tester-instructions.md` aligned with the build being sent.

## Confidence Levels

- `NORMAL_WORKSPACE_VALIDATED`: core desktop gate passed; no real large workspace was validated in this run.
- `LARGE_WORKSPACE_VALIDATED`: core desktop gate and real large-workspace smoke passed.
- `LARGE_WORKSPACE_SKIPPED`: large-workspace smoke did not run and must not be treated as full release confidence.
- `LARGE_WORKSPACE_BLOCKED_OR_FAILED`: required large-workspace coverage was unavailable or the smoke failed.

## Skipped Steps

- large workspace desktop smoke: Skipped because no --workspace path or MOW_DESKTOP_RELEASE_WORKSPACE was provided.

## Advisory Diagnostics

- None
