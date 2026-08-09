---
summary: "Current desktop release gate report."
read_when:
  - "Before desktop installer handoff"
  - "When validating desktop release readiness"
owner_zone: "delivery"
---

# Desktop Release Gate Current

Run started: 2026-08-09T19:06:24.743Z

Run finished: 2026-08-09T19:08:17.306Z

Plan ref: `0.0.1.2.4`

Large workspace: `X:\ДНД\Мастер\По кампаниям\База`

Overall: PASSED

## Steps

- desktop release handoff preflight: passed (0 ms) - Required release handoff files exist. Required npm scripts exist.
- documentation index: passed (69 ms)
- agent skills validation: passed (46 ms)
- verify: passed (17035 ms)
- browser smoke: passed (91346 ms)
- desktop frontend prepare: passed (311 ms)
- desktop packaging smoke: passed (52 ms)
- desktop environment: passed (402 ms)
- tauri cargo check: passed (1692 ms)
- large workspace desktop smoke: passed (1606 ms)

## Release Rule

- Do not build or hand off a desktop installer if any required step failed.
- If the large workspace smoke is skipped, the release can only be treated as a normal workspace build, not a validated large-GM-workspace build.
- Before sending an installer to another person, run the manual native desktop checklist from `docs/01-delivery/DESKTOP_LARGE_WORKSPACE_SMOKE.md` when the target user has a large workspace.
- Keep `release/latest/release-notes.md` and `release/latest/tester-instructions.md` aligned with the build being sent.

## Skipped Steps

- None
