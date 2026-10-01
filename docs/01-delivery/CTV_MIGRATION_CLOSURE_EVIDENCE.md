---
summary: "Dated CTV closure evidence for unit, browser, native persistence and the final production dependency audit."
read_when:
  - "When assessing the CTV migration Foundation closure or repeating its parity checks"
owner_zone: "delivery"
---
# CTV migration closure evidence

Date: 2026-10-01. Accepted source baseline: `fd2d3131e5a4b15499b1cd30302bf6c64b9a99a7`.

CTV Stages 1–9: DONE / Foundation. Combat 17.6 remains accepted; 17.7 is UNBLOCKED / NOT STARTED. No new CTV leaves or gameplay mechanics were introduced.

## Automated evidence

| Check | Observed result |
| --- | --- |
| Focused affected unit/integration suites | 96/96 PASS |
| Full unit/integration suite | 1322/1322 PASS, including 33 Stage 9 portability/guard/adapter tests |
| CI-equivalent full Chromium (`npm run test:browser`, also run by desktop gate) | 364/364 PASS |
| Production Stage 9 Chromium scenarios | Settings migration/adoption/retirement, source conflict/ambiguous free content, checkpoint resume/recovery, structured creation/duplicate/Templates v2 on Browser and injected Tauri, Package v2 copy and selected restore |
| Combat 17.6/Undo, Map, Character/Player Sheet, Inventory/Effects/adoption | PASS in focused and full Chromium regressions; RNG/queue/event ordering and compensating Undo remain unchanged |
| Desktop release gate | PASS / NORMAL_WORKSPACE_VALIDATED: verify, Chromium, frontend preparation, packaging/environment and cargo check |
| Final native executable build | PASS; Windows x64 executable and NSIS bundle built |
| Existing native WebView2 click-through | 7/7 PASS on disposable workspace; no unexpected runtime errors |
| Additional native persistent-format exercise | 8/8 PASS through the real DesktopStorageAdapter/Tauri FS: structured create, guarded type change, duplicate, Templates v2, verified Backup v2, Package v2 copy, selected restore with Repository reread, full restore/reload |

Native persistence proof used backup `2026-10-01T17-08-41-193Z-manual`; selected/full restore created safety backups `2026-10-01T17-08-42-013Z-pre-restore` and `2026-10-01T17-08-42-704Z-pre-restore`. These are run-specific disposable artifacts, not backups of a user workspace. Native executable and WebView profiles are not committed. Installer handoff and large-user-workspace release confidence are not claimed by this Foundation evidence.

## Final production dependency audit

| Boundary | Production owner | Permitted remaining old-data support |
| --- | --- | --- |
| Character/Player core, health, checks/death saves | CharacterModel/Entity and guarded Variables/domain commands | Explicit no-envelope parser/fixture; normal legacy Sheet/Map/Combat requires migration |
| Inventory membership/quantity | actor arrays and exact Item quantity | Strict inert adoption evidence; absent plus persisted legacy block is migration-required |
| Actor own Effects | own Effects Field Set/EffectsModel | Inert adoption evidence; partial/future/invalid never falls back |
| Item/Rule/integration Effects | Existing independent approved providers | Explicit provider payload parser, never copied into actor own state |
| Type selection/change | Canonical Registry and guarded immutable candidate | Old ids only in migration mapping; no tag/body-derived formal type |
| Page copy/templates/package | Full PageRecord; Templates/Package v2 closure | Explicit v1 reader rejects lossy structured transport |
| Backup/restore/assets | Definition-aware v2 and shared typed collector | v1 reader with exact available definitions; incomplete scan prohibits destructive assumptions |
| Index/search/graph | Repository/PageIndex/TreeIndex with exact activated Registry | Wiki presentation lookup remains distinct from typed exact references |

`propertiesModel`, legacy calculations/writers and block builders remain only as explicit old-format/migration/recovery/fixture support; normal app setup no longer wires Properties settings, auto calculations or data writers. Remaining Map health-module production usage is its pure presentation color helper. Structured informational provider notes never fall back to Properties. Runtime recovery notices restore original raw HTML for body save until explicit retirement; finalization removes only receipt-backed equivalent fragments and blocks unknown/free nested content.

All existing Character/Player/Item definitions and Field Sets retain their versions/digests. Persistent version changes are limited to actual portability formats. Event History stays excluded from backup/restore. Current owner details and safety rules are in [canonical migration contract](../02-architecture/CARD_TYPES_VARIABLES_MIGRATION.md), [backup/recovery](../02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md), [workspace formats](../02-architecture/contracts/WORKSPACE_SCHEMA_CONTRACT.md) and [CharacterModel](../02-architecture/contracts/CHARACTER_MODEL_CONTRACT.md).
