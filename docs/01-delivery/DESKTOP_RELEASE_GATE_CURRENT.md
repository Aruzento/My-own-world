---
summary: "Current desktop release gate report."
read_when:
  - "Before desktop installer handoff"
  - "When validating desktop release readiness"
owner_zone: "delivery"
---

# Desktop Release Gate Current

Run started: 2026-08-20T09:14:25.550Z

Run finished: 2026-08-20T09:15:46.631Z

Plan ref: `0.0.1.2.4`

Large workspace: `X:\ДНД\Мастер\По кампаниям\База`

Overall: PASSED - ADVISORY WARNINGS

Confidence: LARGE_WORKSPACE_VALIDATED

Normal workspace validation: VALIDATED

Large workspace validation: VALIDATED

Advisory diagnostics: PRESENT (3, non-blocking)

## Steps

- desktop release handoff preflight: passed (0 ms) - Required release handoff files exist. Required npm scripts exist.
- documentation index: passed (57 ms)
- agent skills validation: passed (40 ms)
- verify: passed (13854 ms)
- browser smoke: passed (65183 ms)
- desktop frontend prepare: passed (229 ms)
- desktop packaging smoke: passed (35 ms)
- desktop environment: passed (261 ms)
- tauri cargo check: passed (362 ms)
- large workspace desktop smoke: passed (1057 ms)

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

- None

## Advisory Diagnostics

- large_pages (2): Some pages are larger than 250 KB. Examples: 1779484665129-7a321d25 321 KB; 1779530830476-a9517dfe 398 KB.
- large_assets (4): Some assets are larger than 12 MB. Examples: Castle_01.jpg 36.9 MB; Group 1.png 33.7 MB; КорабльВерх.png 14.7 MB.
- heavy_maps: At least one map has many render objects or a large page payload. Examples: 1779484665129-7a321d25 321 KB; 1779530830476-a9517dfe 398 KB; 1779482139467-a52d5cd6 200 KB.
