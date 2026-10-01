---
summary: "Dated CTV closure evidence for unit, browser, native persistence and the final production dependency audit."
read_when:
  - "When assessing the CTV migration Foundation closure or repeating its parity checks"
owner_zone: "delivery"
---
# CTV migration closure evidence

Date: 2026-10-01. Accepted source baseline: `fd2d3131e5a4b15499b1cd30302bf6c64b9a99a7`.

This is historical **technical** closure evidence, not owner acceptance. Manual owner acceptance subsequently failed. Stage 9 acceptance corrective and repeated owner review supersede the earlier CLOSED/17.7-unblocked claim; current status is in [PROJECT_PLAN](./PROJECT_PLAN.md). Combat 17.6 remains accepted; 17.7 is BLOCKED / NOT STARTED pending owner acceptance. No new CTV leaves or gameplay mechanics were introduced.

## 2026-10-02 acceptance corrective

Corrective baseline: `a4250ddfca3e8793fc5629ebb7fc28c6b97dabc8`. Implementation verification is complete; repeated manual owner acceptance is **pending**, and Combat 17.7 remains blocked.

| Check | Observed corrective result |
| --- | --- |
| Focused unit/integration | 65/65 PASS |
| Affected Chromium across focused reruns | 27/27 PASS, including 12 new create/type/binding/tab/migration/performance owner-flow cases |
| Full verify / unit/integration | 1335/1335 PASS |
| CI-equivalent full Chromium | 376/376 PASS; accepted Combat 17.6/Undo, Map, Sheet, Inventory/Effects/adoption and Stage 9 portability/recovery retained |
| docs:index / agents:validate / check:js / verify:quick | PASS |
| Desktop automated gate | PASS / NORMAL_WORKSPACE_VALIDATED: frontend preparation, packaging, environment and cargo check |
| Binding persistence adapters | Browser and injected Tauri Image/Icon/file-picker/save/autosave/reload scenarios PASS |
| Inspector instrumentation | Local Player render: ~95–97 ms / 200 fields / 7 full Repository traversals before; ~4–7 ms / 11 fields / 0 traversals after. Synthetic 5,000-candidate fixture guards traversal/catalog-read counts rather than wall-clock thresholds. |

This corrective does not claim native-window manual acceptance, real large-user-workspace validation or an installer handoff. Schema definitions/versions/digests and native storage format are unchanged. Repeat the six reported owner flows before accepting CTV or enabling Combat 17.7.

## Historical 2026-10-01 automated evidence

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
