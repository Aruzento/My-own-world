---
summary: "Current desktop release gate report."
read_when:
  - "Before desktop installer handoff"
  - "When validating desktop release readiness"
owner_zone: "delivery"
---

# Desktop Release Gate Current

Run started: 2026-07-22T14:22:59.855Z

Run finished: 2026-07-22T14:23:52.891Z

Plan ref: `0.0.1.2.4`

Large workspace: not provided

Overall: PASSED

## Steps

- desktop release handoff preflight: passed (0 ms) - Required release handoff files exist. Required npm scripts exist.
- large workspace desktop smoke: skipped - Skipped because no --workspace path or MOW_DESKTOP_RELEASE_WORKSPACE was provided.
- documentation index: passed (59 ms)
- agent skills validation: passed (40 ms)
- verify: passed (13918 ms)
- browser smoke: passed (38081 ms)
- desktop frontend prepare: passed (230 ms)
- desktop packaging smoke: passed (41 ms)
- desktop environment: passed (288 ms)
- tauri cargo check: passed (377 ms)

## Release Rule

- Do not build or hand off a desktop installer if any required step failed.
- If the large workspace smoke is skipped, the release can only be treated as a normal workspace build, not a validated large-GM-workspace build.
- Before sending an installer to another person, run the manual native desktop checklist from `docs/01-delivery/DESKTOP_LARGE_WORKSPACE_SMOKE.md` when the target user has a large workspace.
- Keep `release/latest/release-notes.md` and `release/latest/tester-instructions.md` aligned with the build being sent.

## Skipped Steps

- large workspace desktop smoke: Skipped because no --workspace path or MOW_DESKTOP_RELEASE_WORKSPACE was provided.
