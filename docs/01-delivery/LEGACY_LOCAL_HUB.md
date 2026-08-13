---
summary: "Policy and audit notes for the local-only legacy file hub."
read_when:
  - "Before moving obsolete local files"
  - "When old or accidental files appear in the project root"
  - "When checking why legacy/ is ignored"
owner_zone: "delivery"
---

# Local Legacy Hub

Updated: 2026-08-13

`legacy/` is a local-only holding area for obsolete, accidental or diagnostic files that should be kept temporarily but must not be part of the project source.

## Rules

- Do not commit `legacy/` or `legasy/`.
- Do not read files from `legacy/` as product truth, source code, documentation, test fixtures or design references.
- Do not move tracked project files into `legacy/` unless a separate audit proves they are no longer referenced and the active docs are updated.
- Prefer `docs/archive/` for intentional historical project documents that should remain versioned and referenceable.
- Prefer `legacy/` for local logs, stray command output, generated experiment leftovers and obsolete files that are not useful in normal development.

## 2026-08-07 Audit

Moved to local `legacy/local-audit-2026-08-07/`:

| File | Status | Reason |
| --- | --- | --- |
| `debug.log` | untracked | Local Chromium/GPU diagnostic log, not a project source file. |
| `k` | untracked | Stray saved command output, not referenced by code, docs or tests. |

Kept in the repo:

| Area | Reason |
| --- | --- |
| `docs/archive/` | It is an intentional tracked archive with references from `AGENTS.md`, README, release notes, tester instructions and work log. |
| `Тех. зрелость/` | It is historical maturity evidence, tracked as project context rather than local build residue. |
| `Лог особенный/` | It is a tracked narrative project log, not an accidental local file. |

## 2026-08-13 RCB-015 Placement Decision

Decision: keep `Тех. зрелость/` and `Лог особенный/` in place as tracked root historical exceptions.

Reason:

- active source of truth remains `docs/00-product/PRODUCT_DASHBOARD.md`, `docs/01-delivery/PROJECT_PLAN.md`, current architecture contracts and release handoff docs;
- `docs/archive/` remains the normal tracked home for retired docs, but these two root folders are older project-evidence artifacts already classified by the file audit as `maturity` and `story log`;
- moving them would touch paths, links and owner memory without improving runtime, tests, docs-index quality or Codex task selection;
- ignored `legacy/` remains local-only and must not receive tracked historical project evidence.

Do not move these folders unless a future owner-approved task identifies a concrete operational benefit.
