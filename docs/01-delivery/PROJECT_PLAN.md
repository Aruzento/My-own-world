---
summary: "Single active master roadmap for MyOwnWorld implementation work."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---

# Project Plan

Updated: 2026-08-27

Planning version: 2

This file is the only active implementation roadmap for MyOwnWorld. Completed history lives in [WORK_LOG.md](./WORK_LOG.md). Superseded plans live in [docs/archive](../archive/README.md) and are historical only.

## Current State

`0.0.1.8.18` is `DONE` by explicit owner waiver recorded on 2026-08-10.

Owner decision: the current design is accepted for this product stage. The failed Visual Critic evidence from `0.0.1.8.18.6` remains valid historical evidence and future polish debt, but it no longer blocks development. This does not mean the design is final, the critic was wrong, or every finding was fixed. It means the UI is sufficient to continue product work now.

Current phase: `0.0.1.15.0` NF-003 Event / Roll / Combat Log + Transactions is `ACTIVE`.

Current leaf: `0.0.1.15.7` Undo Model is `NEXT`.

Important stop note: `RCB-021`, `RCB-001`, `RCB-001B`, `RCB-002`, `RCB-003`, `RCB-022`, `RCB-004`, `RCB-005`, `RCB-016`, `RCB-023`, `RCB-024`, `RCB-025`, `RCB-006A`, `RCB-006B`, `RCB-006C`, `RCB-006D`, `RCB-007A`, `RCB-007B`, `RCB-007C`, `RCB-007D`, `RCB-026`, `RCB-027`, `RCB-017`, `RCB-018`, `RCB-019`, `RCB-028`, `RCB-008`, `RCB-009`, `RCB-010`, `RCB-020`, `RCB-011`, `RCB-012`, `RCB-013`, `RCB-014`, `RCB-015`, `RCB-029` and `RCB-030` are closed. `RCB-006`, `RCB-007`, `0.0.1.10.0`, `0.0.1.11.0`, `0.0.1.12.0`, `0.0.1.13.5`, `0.0.1.13.6`, `0.0.1.13.7`, `0.0.1.13.8`, `0.0.1.13.9`, `0.0.1.13.10`, `0.0.1.13.FINAL`, `0.0.1.13.0`, `0.0.1.14.2`, `0.0.1.14.3`, `0.0.1.14.4`, `0.0.1.14.5`, `0.0.1.14.6`, `0.0.1.14.7`, `0.0.1.14.8`, `0.0.1.14.9`, `0.0.1.14.10`, `0.0.1.14.FINAL`, `0.0.1.14.0`, `0.0.1.15.1`, `0.0.1.15.2`, `0.0.1.15.3`, `0.0.1.15.4`, `0.0.1.15.5` and `0.0.1.15.6` are closed. `0.0.1.15.0` is active for NF-003 event/roll/combat-log transaction foundation only; `0.0.1.16.0` remains blocked. Do not implement combat sessions, attacks, damage application, HP automation, effects, targeting, dice UI or turns/rounds logic beyond event vocabulary in Phase 15.

## Execution Rules

1. Work strictly in active plan order.
2. Only one major phase may be `ACTIVE` at a time.
3. Inside a major phase, work on one leaf implementation slice at a time.
4. Do not start the next phase until the current phase exit criteria are met.
5. Do not implement `LATER` or spike-only ideas "also".
6. Adjacent bugs may be fixed only if reproduced, low-risk, inside the current subsystem and not expanding architecture scope. Otherwise, record or keep them in [BUGS_AND_IMPROVEMENTS_BACKLOG.md](./BUGS_AND_IMPROVEMENTS_BACKLOG.md).
7. Do not create a second owner for an existing system.
8. Inspect the current repository before designing new architecture.
9. Do not invent a schema, API, dependency or subsystem without evidence.
10. If an unusual action is needed, stop and ask the owner first.

Unusual actions include new production dependencies, rendering engine changes, networking/server architecture, data format migrations, destructive cleanup, mass file movement outside an explicitly authorized archive task, new external services, large binary assets, arbitrary plugin execution and architecture rewrites.

## Status Model

Allowed roadmap statuses:

- `DONE`
- `ACTIVE`
- `NEXT`
- `BLOCKED`
- `LATER`
- `SPIKE`
- `OWNER REVIEW`

Readiness levels for completed work still come from [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md): `Foundation`, `MVP`, `Usable`, `Release-ready`.

## Roadmap

### Phase 0 - 0.0.1.8.18 Owner Design Correction & Evidence Gate

ID: `0.0.1.8.18`

NAME: Owner Design Correction & Evidence Gate

STATUS: `DONE`

GOAL: close the owner design correction gate without pretending the visual quality bar is final.

WHY NOW: the blocked Visual Critic gate prevented non-design work even though the owner accepted the current design for this stage.

SCOPE: record owner waiver; keep Visual Critic report as evidence; move future design polish to a late product-polish phase; archive superseded planning files.

DEPENDENCIES: completed leaves `0.0.1.8.18.1` through `0.0.1.8.18.8`; owner waiver on 2026-08-10.

EXIT CRITERIA: owner waiver recorded; `0.0.1.9.0` unlocked; no product implementation started during closure.

### Phase 1 - 0.0.1.9.0 Repository Audit

ID: `0.0.1.9.0`

NAME: Repository Architecture / Maintainability / AI-Slop Audit

STATUS: `DONE`

GOAL: understand real repository health before new feature work.

WHY NOW: recent UI/design work touched many surfaces; the next product phases will be safer if duplicate ownership, dead code and AI-slop patterns are identified first.

SCOPE: audit-only review for dead code, duplicate ownership, mini design systems, duplicated generic utilities, god-files, over-fragmentation, listener lifecycle, CSS debt, accessibility debt, test/documentation slop, data ownership, unsafe write paths, performance risks, generated/debug artifacts and recent editor/header runtime logic. Reconcile current [BUG_INVENTORY.md](./BUG_INVENTORY.md) items as current/stale/promoted/deferred before cleanup or new product work.

DEPENDENCIES: `0.0.1.8.18` owner waiver and closure.

EXIT CRITERIA: closed at audit-only `Foundation` on 2026-08-11. Evidence: [REPOSITORY_MAINTAINABILITY_AUDIT_0.0.1.9.0.md](../02-architecture/REPOSITORY_MAINTAINABILITY_AUDIT_0.0.1.9.0.md), [REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md](../02-architecture/REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md), [REPOSITORY_CLEANUP_BACKLOG.md](./REPOSITORY_CLEANUP_BACKLOG.md). The audit classifies findings, reconciles bug/backlog state, assesses NF readiness and creates an owner-review cleanup gate. No mass cleanup or product feature implementation was performed.

### Phase 1A - 0.0.1.9.1 Audit Completeness Verification

ID: `0.0.1.9.1`

NAME: Audit Completeness Verification

STATUS: `DONE`

GOAL: prove whether the `0.0.1.9.0` audit covered the first-party repository well enough before cleanup starts.

WHY NOW: owner review found the original coverage ledger too aggregated. Cleanup should not start until the project can prove what was reviewed and whether any P1/P2 blind spots were missed.

SCOPE: docs/evidence-only completeness pass: current HEAD review, granular file/family coverage ledger, second blind sweep, previous P1 recheck, no-P0 challenge, source-of-truth map, write-path map, recent UI polish review and three read-only independent reviewers.

DEPENDENCIES: `0.0.1.9.0` audit artifacts.

EXIT CRITERIA: closed at audit-only `Foundation` on 2026-08-11. Result: `C - AUDIT HAD MATERIAL BLIND SPOTS`. Evidence was appended to [REPOSITORY_MAINTAINABILITY_AUDIT_0.0.1.9.0.md](../02-architecture/REPOSITORY_MAINTAINABILITY_AUDIT_0.0.1.9.0.md), [REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md](../02-architecture/REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md) and [REPOSITORY_CLEANUP_BACKLOG.md](./REPOSITORY_CLEANUP_BACKLOG.md). New P1 findings RA-021 and RA-022 were recorded. No production cleanup, product functionality or real workspace mutation was performed.

### Phase 2 - 0.0.1.10.0 Repository Cleanup & Consolidation

ID: `0.0.1.10.0`

NAME: Repository Cleanup & Consolidation

STATUS: `DONE`

GOAL: perform only owner-approved cleanup from the audit.

WHY NOW: cleanup must be based on evidence, not taste. It should follow the audit and owner review.

SCOPE: correctness/data-safety ownership, dead/debug artifacts, duplicate infrastructure, duplicate utilities, CSS/design-system debt, listener lifecycle debt, god-files/over-fragmentation, tests and docs. Include `BI-024`, `BUG-012` or `BUG-014` only if the audit confirms recurring docs/status drift or owner-approved local-file cleanup.

DEPENDENCIES: Phase 1 audit; Phase 1A completeness verification; owner review approval of cleanup slices from [REPOSITORY_CLEANUP_BACKLOG.md](./REPOSITORY_CLEANUP_BACKLOG.md). Owner approved starting this cleanup phase on 2026-08-11, and the corrective final gate closed it on 2026-08-20.

EXIT CRITERIA: closed on 2026-08-20 after each approved cleanup slice received focused regression coverage, no product functionality was added, persistent format stayed unchanged, independent reviewers passed, and fresh full verification passed: unit, browser, visual evidence, `npm run verify`, UI polish, docs, encoding, desktop gate, native click-through and real large-workspace smoke on `X:\ДНД\Мастер\По кампаниям\База`.

### Phase 3 - 0.0.1.11.0 Existing P1 Stabilization

ID: `0.0.1.11.0`

NAME: Existing P1 Stabilization

STATUS: `DONE`

GOAL: close or deliberately reclassify the known user-visible P1/P2 stabilization items before live-session features.

WHY NOW: new session/combat work should not sit on top of known map and regression fragility.

SCOPE: `BI-003`, `BI-008`, `BI-009`, `BI-010`, `BI-011`, `BI-022`; current P1 bug-inventory items if still reproduced after Phase 1 audit, especially `BUG-001`, `BUG-003`, `BUG-004`, `BUG-005`, `BUG-006`, `BUG-007`, `BUG-008` and `BUG-009`. Reproduce or verify current user-visible stabilization issues, close the P1 regression bundle when its real children are closed, and decide whether small Campaign Map usability fixes belong here or later. First owner-selected leaf: `0.0.1.11.1` Workspace Switch Access.

DEPENDENCIES: Phase 2 cleanup is closed. Owner started this phase on 2026-08-20. The final closure gate passed on 2026-08-24. Phase `0.0.1.12.0` was unlocked after this phase and owner-started on 2026-08-24.

EXIT CRITERIA: met on 2026-08-24. Each included BI/bug has a current repro/result, root cause where applicable, regression target and final disposition. Independent review passed; unit, browser, verification, UI polish, docs, encoding, desktop gate, desktop build, native click-through and real large-workspace smoke passed. No NF/live-session functionality, new product functionality or persistent data format migration was implemented.

CURRENT LEAF RESULTS:

- `0.0.1.11.1` Workspace Switch Access - `FIXED` on 2026-08-20. The AppShell topbar now keeps a permanent compact `Открыть папку` action while a workspace is active. It reuses the existing `[data-open-workspace]` click path and workspace picker/load lifecycle, saves the current page through the existing editor save lifecycle before opening the picker, and clears the old editor view through the existing empty-editor teardown after a successful switch. Regression: `app-shell-global-workspace-switch-keeps-cancel-and-loads-next-workspace`.
- `0.0.1.11.2` `BI-010` Campaign Map Toolbar - `NOT REPRODUCED WITH STRONG EVIDENCE` on 2026-08-20. Current focused matrix verified map -> card -> same map, map A -> map B -> map A, map -> task tracker -> map, map -> rule tree -> map, map -> hide/show tree -> map, map -> presentation -> return, and workspace A map -> workspace B -> map. In every path the split toolbar had exactly one scene bar and one tool rail, both visible, with 11 expected controls, hit-testable main controls, working grid popup, correct current map identity and no stale previous page hiding the current map. Evidence guard: `campaign-map-toolbar-survives-page-workspace-and-presentation-lifecycle`.
- `0.0.1.11.3` `BI-011` Creature Skills Encoding - `FIXED` on 2026-08-20. The Campaign Map creature token skill action/submenu now renders clean UTF-8 Russian `Навыки`, skill labels still come from the existing `DND_SKILL_GROUPS` source (`Скрытность`, `Атлетика`, etc.), and the focused regression verifies visible labels, submenu opening, selected skill payload and absence of mojibake marker sequences. `BI-022` is `DONE` because its current children `BI-010` and `BI-011` are both closed.
- `0.0.1.11.4` `BUG-001` Large Workspace UX - `VERIFIED ACCEPTABLE` on 2026-08-20. The approved real workspace `X:\ДНД\Мастер\По кампаниям\База` passed current desktop large-workspace smoke and native WebView click-through for workspace restore, tree scroll/search, representative card open, Settings diagnostics, heavy Campaign Map open and presentation. Safe move/delete timing was checked on a temporary copy of the real `pages` folder, while UI move/delete feedback remains covered by focused browser regressions. No product bottleneck was reproduced; only the native smoke target selection was tightened so legacy pages without front-matter `title:` are opened by their first `<h1>` text.
- `0.0.1.11.5` `BUG-003` Desktop Real-App Verification - `VERIFIED / CLOSED` on 2026-08-20. The current release/native build produced `src-tauri\target\release\my-own-world.exe` and the NSIS installer, then the native WebView click-through passed against `X:\ДНД\Мастер\По кампаниям\База`: workspace restore, tree, image card (`loadedImages: 1`), Settings diagnostics, tree scroll/search, Campaign Map background (`backgroundRenderable: true`) and presentation (`status: ready`). Desktop large-workspace smoke and desktop release gate also passed; workspace schema/size diagnostics were advisory and no application/environment failure was reproduced. The native smoke runner was tightened to prefer image cards when available and to fail if expected card/map assets do not visibly render.
- `0.0.1.11.6` `BUG-004` Campaign Map Presentation Stabilization - `FIXED` on 2026-08-20. The current representative map matrix reproduced one real presentation defect: browser/full presentation clone inherited the GM editor grid color alpha (`rgba(...,0.34)`) instead of the presentation-safe grid alpha (`rgba(...,0.22)`) used by the model-first renderer. The clone now applies grid enabled state, size and presentation-safe color from the map model, and both presentation paths share the same grid color helper. Regression: `campaign-map-presentation-representative-map-workflow-stays-current` verifies presentation open, token sync, player-hidden behavior, fog/locked fog, layer visibility/order, movement distance arrow, grid style sync, screenshot evidence and close/reopen stale-state cleanup. Delayed sync, fog/layer ordering, hidden-player handling, distance arrows and stale reopen state were not reproduced after the fix.
- `0.0.1.11.7` `BUG-005` Campaign Map Drawing Tools Stabilization - `ALREADY FIXED / VERIFIED` on 2026-08-20. The current disposable map matrix verified pencil, pen continuation and far-start separation, fill on pencil/freehand drawing, full-map fill with no background image, eraser, color picker input, recent-color swatches, drawing layer hide/show, selection, real `Delete` key removal and save/reload through the data-first serializer. No drawing-system runtime defect was reproduced, so no product drawing code changed. Evidence guard: `campaign-map-drawing-tools-stay-usable-through-layers-keyboard-and-reload`.
- `0.0.1.11.8` `BUG-006` Map Music - `FIXED` on 2026-08-20. Disposable native desktop audio smoke reproduced a real stale playback lifecycle bug: rapid music controls could let an older `audio.play()` promise reject after a newer `load()`/track switch and report `The play() request was interrupted by a new load request` as a popup error. Campaign Map music now guards per-map playback requests and media generations so stale interrupted playback cannot clear the current audio source or overwrite current status. Regression: `campaign-map-music-rapid-next-ignores-stale-playback-abort`. Native audio smoke passed with four imported WAV tracks, normal/battle playlists, play/stop/next/previous/shuffle/loop, map switch/return, workspace reload and blob playback after reload.
- `0.0.1.11.9` `BUG-007` Properties Real Character Card - `ALREADY FIXED / VERIFIED` on 2026-08-20. A representative character Properties card passed the current user-facing layout sequence: default compact character layout, drag `armorItem` into empty grid space, resize `dexSkills` from the supported south-east edge, occupied drop of `cha` with collision pushdown for neighboring skill groups, save through `serializePersistentEditorHTML`, close/reopen through the normal block contract, exact `data-property-layout` equality after reopen, no overlaps, no inaccessible fields and readable skill labels. No product-code defect was reproduced. Evidence guard: `character-properties-real-card-layout-persists-after-drag-resize-and-reopen`.
- `0.0.1.11.10` `BUG-008` Character -> Map Data Consistency - `FIXED` on 2026-08-20. The focused E2E reproduced stale initiative participant data: after a character Properties/effects update and map reopen, token snapshot used current CharacterModel data but existing initiative order still showed old modifier/total from `data-initiative-state`. Campaign Map initiative participants now sync from current token snapshots after runtime CharacterModel refresh, preserving roll and active turn while updating modifier/name/page/source/alive state. Regression: `campaign-map-token-and-initiative-refresh-after-character-properties-save-reopen-and-reload`.
- `0.0.1.11.11` `BUG-009` Legacy Task Tracker Compatibility - `FIXED` on 2026-08-20. The available legacy fixture shape from `docs/03-testing/sample-workspace/pages/0003-task-tracker.md` reproduced empty rendered tracker columns because `tasks` was a keyed object while the current normalizer accepted only arrays. Task Tracker read/normalize now accepts keyed-object tasks, keeps object keys as stable task ids for old `column.taskIds`, and still saves the current canonical array shape on disposable save/reload. Regression: `task-tracker-opens-legacy-keyed-task-object-and-persists-after-reorder-reload`.
- `0.0.1.11.12` `BI-008` / `BI-009` Campaign Map Shape Usability Decision - closed on 2026-08-20. `BI-008` is `FIXED` as a small existing-architecture usability fix: selected circle shapes now show a runtime-only center marker derived from existing geometry, with no schema change and no pointer hit-test interference. `BI-009` is `DEFERRED TO LATER CAMPAIGN MAP PHASE`: numeric shape rotation already exists through the Inspector/model/renderer/serializer path, but adding object-like pointer rotation handles for shapes would require a new shape rotation interaction owner rather than reusing the token-specific rotation owner. Regression: `campaign-map-circle-shape-center-marker-is-selected-only-runtime-ui`; existing rotation evidence: `campaign-map-selection-inspector-edits-shape-transform-style` and `campaign-map-data-first-save-reload`.
- `0.0.1.11.FINAL` Existing P1 Stabilization Closure Gate - `PASS` on 2026-08-24. The gate confirmed all Phase 3 stabilization leaves are closed or explicitly reclassified, no included P1 was dropped, legacy Task Tracker support is backward-compatible reading rather than eager migration, and Campaign Map fixes stayed inside existing owners. A corrective presentation sync fix keeps the active drag-measure overlay through late full presentation resyncs. Final verification passed: unit, full browser, `npm run verify`, UI polish audit, docs index, encoding, project file audit, desktop release gate with large-workspace confidence, desktop build and native click-through on `X:\ДНД\Мастер\По кампаниям\База`.

### Phase 4 - 0.0.1.12.0 Data Safety Completion

ID: `0.0.1.12.0`

NAME: Data Safety Completion

STATUS: `DONE`

GOAL: complete the remaining recovery and link-safety work before durable live-session automation.

WHY NOW: future combat/session/event systems will write more frequently; unsafe restore and link repair flows would make that risky.

SCOPE: `BI-006` restore preview, partial restore, backup manifests, asset verification. `BI-020` broken wiki links, relation links, ordinary links, orphan review, grouped diagnostics, non-destructive repair preview and deliberate persistent repair flow. Include `BUG-011` restore/recovery validation if still current after Phase 1 audit.

DEPENDENCIES: Phase 3 stabilization is closed. Owner started this phase on 2026-08-24. The final closure gate passed on 2026-08-24.

EXIT CRITERIA: met on 2026-08-24. Recovery previews are readable and non-destructive; partial restore is explicit and safety-backup-gated; restore failure reporting is honest and does not claim atomicity; asset/link/orphan diagnostics are grouped and non-destructive; selected repair apply is explicit, stale-checked and backup-gated; new durable writes remain behind existing safety owners; persistent format stayed unchanged; the real GM workspace was used only for read-only diagnostics/probes.

CURRENT LEAF RESULTS:

- `0.0.1.12.1` Data Safety Baseline & Recovery Fixtures - `DONE` on 2026-08-24. The current recovery flow map is recorded in [BACKUP_AND_RECOVERY_CONTRACT.md](../02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md), and the reusable disposable input matrix lives in `tests/fixtures/dataSafetyFixtures.mjs` with baseline coverage in `tests/dataSafetyRecoveryFixtures.test.mjs`. It covers clean workspace, changed-after-backup page, multi-page/multi-asset backup, missing backup page file, missing backup asset, broken wiki-link input, broken relationship target input, broken asset reference, orphan asset and malformed/incomplete backup directory. No restore preview, partial restore, link repair, persistent data format migration or real workspace mutation was implemented.

- `0.0.1.12.2` Restore Preview - `DONE` on 2026-08-24. Added a non-destructive runtime restore plan builder in `backupRestorePreview` and surfaced it in the Settings backup restore confirmation. The preview compares persisted backup/current page contents and asset bytes, classifies add/replace/unchanged/problem states, blocks damaged backup preview states, and clearly states that no changes have been applied. It performs no page writes, asset writes, directory removal, backup creation, PageRepository mutation or PageIndex mutation. No deletion semantics, partial restore, persistent format migration or real workspace mutation was added.

- `0.0.1.12.3` Backup Manifest Integrity - `DONE` on 2026-08-24. Added structured manifest validation for existing v1 backups without changing the backup format. Validation checks JSON readability, supported version, selected-directory id match, page list/count coherence, safe page filenames, required backup page files, asset list/count coherence, safe asset paths and expected copied asset files. Restore preview now consumes the validation result, and actual restore blocks unsafe manifests before pre-restore backup creation or workspace writes. Legacy partial v1 asset backups remain warning-compatible when v1 cannot prove which asset entries were copied.

- `0.0.1.12.4` Partial Restore - `DONE` on 2026-08-24. Added explicit page selection to the Settings restore preview and routed partial restore through the existing `backupService` restore owner. Partial restore validates the selected backup manifest, preflights selected page files and clearly referenced selected-page assets before writes, keeps the mandatory pre-restore safety backup, writes only selected pages plus clearly required manifest assets, does not delete/unselected-overwrite workspace content and refreshes runtime through the existing Settings post-restore reload path. No persistent format migration or real workspace mutation was performed.

- `0.0.1.12.5` Restore Failure Safety - `DONE` on 2026-08-24. Hardened restore after the mandatory safety backup without claiming full atomicity. Full restore now preflights backup page bytes and deterministic asset bytes before destructive writes; legacy partial v1 asset backups remain warning-compatible by skipping missing asset sources before mutation. Page/asset write failures after restore starts now stop further restore writes and surface a structured incomplete-restore error with the pre-restore backup id. Settings restore no longer reports success when the durable restore applies but the runtime workspace refresh fails.

- `0.0.1.12.6` Asset Verification - `DONE` on 2026-08-24. Added one reusable asset verification report on top of the existing scanner, broken checker and orphan detector. Settings asset health now distinguishes confirmed referenced assets, missing referenced assets, assets not used right now as review candidates, and asset-folder check failures. Workspace diagnostics surfaces asset check failures separately instead of treating unreadable scans as orphan data. No automatic deletion, repair, replacement guessing, persistent format migration or real workspace mutation was introduced.

- `0.0.1.12.7` Broken Link Diagnostics - `DONE` on 2026-08-24. Added grouped non-destructive diagnostics for raw and converted wiki links, ordinary internal page anchors and relationship endpoints. The scanner reuses PageIndex/PageRepository lookup behavior, treats ambiguous title/alias matches as review issues instead of guessing, ignores external URLs and plain unfinished text, and surfaces counts/groups in Settings diagnostics plus the workspace diagnostics CLI. No repair action, target guessing, persistent data format migration or real workspace mutation was introduced.

- `0.0.1.12.8` Orphan Review - `DONE` on 2026-08-24. Added a non-destructive connectivity/orphan review model that composes existing asset verification, broken internal link diagnostics and schema diagnostics instead of rescanning the workspace through a second database. It shows assets not currently referenced, missing/ambiguous internal link targets, missing relationship endpoints and schema-defined disconnected records such as broken page parents as review candidates with cautious language. Root pages and isolated pages are not treated as orphan merely because they have no parent or inbound wiki links. No repair action, deletion, target guessing, persistent format migration or real workspace mutation was introduced.

- `0.0.1.12.9` Repair Preview - `DONE` on 2026-08-24. Added a runtime-only repair preview model for selected broken internal page/wiki links and relationship endpoints. The user must choose an explicit existing page target; ambiguous matches are not auto-selected. The Settings diagnostics UI shows before/after target, affected field path, local text/relationship context, backup requirement and PageRecord-style stale evidence (`contentHash`, `updatedAt`, content length) for future apply validation. Preview creation, editing, cancelling and reopening performs no page writes, asset writes/deletes, backup creation, PageRepository mutation or PageIndex mutation. Asset replacement and persistent repair application remain outside this leaf.

- `0.0.1.12.10` Persistent Repair Flow - `DONE` on 2026-08-24. Added backup-gated apply for ready repair-preview plans only. Supported writes are selected raw/converted wiki/page link target replacement through `PageCommandService` / PageRecord content updates and selected relationship endpoint replacement through the existing Knowledge Graph relationship command bridge. Apply blocks before backup if preview stale evidence no longer matches the source page, blocks before writes if the safety backup fails, reports backup id on write failure and reruns diagnostics after success. No repair-all, orphan deletion, bulk asset cleanup, low-level direct `writeText`, persistent format migration or real-workspace mutation was added.

- `0.0.1.12.11` Real Recovery Validation - `DONE` on 2026-08-24. Added end-to-end recovery validation on one deliberately damaged disposable workspace assembled from the Phase 12 fixtures. Coverage proves restore preview is non-destructive, partial restore restores only the selected changed page plus required asset and leaves unrelated pages untouched, restore write failure reports incomplete recovery with the pre-restore backup id, asset/link/orphan diagnostics group independent problems, backup-gated repair apply resolves a selected wiki target after reload, and stale repair preview is blocked after a normal page write. Read-only real workspace diagnostics on `X:\ДНД\Мастер\По кампаниям\База` completed in 337 ms with no write probe: 697 pages, 27 maps, 144 assets, 528 asset references, 0 missing asset references, 71 broken wiki links, 203 review candidates, 5 complete backups and 0 incomplete backups. No restore/repair was applied to the real workspace. `BUG-011` is closed for the current Phase 12 validation scope.

- `0.0.1.12.FINAL` Data Safety Completion Gate - `PASS` on 2026-08-24. The final gate reviewed the cumulative Phase 12 diff from pre-phase HEAD `3b9d8db`, confirmed no unapproved product features or persistent format migration, and received an independent reviewer PASS. Fresh verification passed: unit tests, recovery-focused filesystem/runtime regressions, full browser suite, `npm run verify`, UI polish audit, docs index, encoding check, project file audit, desktop release gate, desktop build and native desktop click-through on a disposable workspace. Read-only confidence on `X:\ДНД\Мастер\По кампаниям\База` passed with `--no-write-probe`: 697 pages, 528 asset references, 0 missing asset references, 71 broken wiki links, 203 review candidates and no restore/repair/cleanup/migration.

- `0.0.1.13.0` NF-001 Edit Session Conflict Protection - `DONE` on 2026-08-24. The final gate passed after the cumulative Phase 13 review, independent reviewer PASS and full verification. Stale editor/session writes now carry a runtime page-state base, are checked against the current durable target page at the PageCommandService boundary, surface a safe conflict UI/recovery path, and cannot silently overwrite restore/repair results within the Phase 13 scope. No persistent format migration, generic merge engine, collaboration/sync layer, NF-002 dice work or real workspace mutation was performed.

### Phase 5 - 0.0.1.13.0 NF-001 Edit Session Conflict Protection

ID: `0.0.1.13.0`

NAME: NF-001 Edit Session Conflict Protection

STATUS: `DONE`

GOAL: prevent stale editor writes from silently overwriting newer durable state.

WHY NOW: conflict-safe writes should exist before persistent session logs, combat state and player-facing actions increase write frequency.

SCOPE: protect field/page edits; preserve unrelated changes; surface conflict state; provide safe recovery; keep PageCommandService/write lifecycle as owner.

DEPENDENCIES: Phase 4 data safety is closed. Owner started this phase on 2026-08-24. The final closure gate passed on 2026-08-24. Existing owners preserved: `PageCommandService`, `PageRecord`, `writeQueue`, `StorageAdapter`, `PageRepository` notifications.

EXIT CRITERIA: met on 2026-08-24. Stale full-page/editor saves, same-field stale writes, queued delayed writes, autosave/navigation/workspace-switch saves and representative special page editors are blocked or safely surfaced at the shared page command boundary. Narrow proven disjoint metadata changes may preserve unrelated durable changes; unsupported/full content saves remain conflict-only. Conflict UI/recovery keeps newer durable state and the user's unsaved draft understandable. Phase 12 restore/repair writes remain explicit recovery operations, and later stale editor saves cannot overwrite them.

CURRENT LEAF RESULTS:

- `0.0.1.13.0` Phase Start - `DONE` on 2026-08-24. Current status docs mark this phase `ACTIVE`, keep `0.0.1.14.0` Safe Dice Engine `BLOCKED`, and set the next leaf to `0.0.1.13.1` Conflict Baseline. No conflict product implementation, persistent format migration or real workspace mutation was performed.

- `0.0.1.13.1` Conflict Baseline - `DONE` on 2026-08-24. Current page edit write lifecycle is documented in [LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md](../02-architecture/contracts/LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md). Added deterministic in-memory edit-conflict fixtures and characterization tests for same-base save, stale full-page overwrite, different-field structured loss, same-field overwrite and metadata-vs-content behavior. The leaf confirmed that runtime write revisions protect stale async completion, while stale edit sessions still lack an enforced durable base precondition. No conflict blocking, persistent format migration or real workspace mutation was implemented.

- `0.0.1.13.2` Write Preconditions - `DONE` on 2026-08-24. Added a runtime-only page state identity contract based on existing PageRecord durable content: whole persisted content hash, normalized metadata hash, body content hash, schema version and `updatedAt`. `PageCommandService.persistPageContentCommand()` can now accept `expectedBase` and reports `matched`, `mismatch`, `read-failed` or `not-provided` precondition evidence by reading current durable content through the existing StorageAdapter. Editor open captures the loaded durable base in runtime session state; ordinary editor save and special page save pass that base and advance it after successful commit. This leaf intentionally does not block stale writes in UI yet, does not change persistent page format and does not mutate the real workspace.

- `0.0.1.13.3` Stale Write Blocking - `DONE` on 2026-08-24. Enforced page write preconditions at `PageCommandService.persistPageContentCommand()` before `writePageContent()`. Stale snapshot/editor writes now return a structured `conflict` result with page id, operation kind and expected/current identity evidence; unreadable or missing current durable page returns a separate `precondition-blocked` result. Conflict/blocked writes do not call `StorageAdapter.writeText()`, do not mutate `PageRepository` / `PageIndex`, do not register undo and do not overwrite durable content. `snapshotPageForCommand()` now carries runtime-only page state identity so ordinary snapshot-based command callers get boundary protection without adding persistent fields. Editor save surfaces conflict status and keeps the visible draft in memory for future resolution. No conflict resolution UI, merge behavior, persistent format migration or real workspace mutation was implemented.

- `0.0.1.13.4` Preserve Unrelated Changes - `DONE` on 2026-08-24. Added a narrow structured preservation contract to `PageCommandService.persistPageContentCommand()` for explicit PageRecord metadata field operations. A stale command may now preserve newer durable changes only when it declares supported owned fields (`aliases`, `tags`, `type`), the current durable value of each owned field still matches the command's base snapshot and the command can be deterministically applied to current durable content through PageRecord serialization. Same-field changes, unsupported fields such as title/body, unknown command shapes and full HTML/page saves still return structured conflicts. Repository/index metadata is updated from the rebased PageRecord content after a safe preservation. No general merge engine, UI conflict resolution, persistent format migration or real workspace mutation was implemented.

- `0.0.1.13.5` Conflict UI - `DONE` on 2026-08-24. Added a shared editor conflict dialog for stale user-facing saves. Autosave and explicit editor saves now route structured conflict results into one UI owner that explains in Russian that the page changed after opening, that the draft was not written over the newer saved version and that the draft remains available in the editor. The dialog uses the existing `popupManager` modal lifecycle, offers only conservative actions (`Посмотреть актуальную версию` as a read-only durable preview and `Вернуться к своим изменениям`), suppresses repeated equivalent autosave dialogs and keeps save status blocked. No overwrite action, conflict recovery/apply flow, persistent format migration or real workspace mutation was implemented.

- `0.0.1.13.6` Conflict Recovery - `DONE` on 2026-08-24. Extended the editor conflict dialog into a safe runtime recovery surface with three concepts: BASE from the editor session/conflict evidence, CURRENT from durable storage and MINE from the exact content the save attempted to write. Users can inspect CURRENT and MINE side by side, copy/select their draft text, return to editing without clearing the dirty conflict state, or explicitly confirm loading CURRENT. Confirmed reload discards only the pending autosave debounce for that editor, refreshes the runtime page from durable content, reopens it through the existing editor open lifecycle and advances the editor base to CURRENT. Later normal saves work from the new base. No force overwrite, automatic merge, draft-file format, persistent schema migration or real workspace mutation was implemented.

- `0.0.1.13.7` Autosave and Navigation Conflicts - `DONE` on 2026-08-24. Added one transition gate on top of the existing editor save result instead of duplicating conflict checks in individual UI handlers. `openPage()` now flushes pending autosave through the normal precondition-aware save boundary and stops the page transition if that save returns conflict, precondition-blocked or stale. Workspace switching uses the same editor save-before-transition gate before opening the workspace picker, so a stale dirty page in workspace A cannot silently switch to workspace B. Special page saves now return their real `persistPageContentCommand()` result, so Campaign Map, Task Tracker, Rule Tree and Knowledge Graph implicit saves can be blocked by the same transition rule. Browser regressions cover stale page A -> page B, page A -> Campaign Map, stale Campaign Map -> page, autosave while staying on the page with Settings open, workspace A -> workspace B, and late debounced autosave execution. No separate conflict system, automatic merge, force overwrite, persistent format migration or real workspace mutation was implemented.

- `0.0.1.13.8` Structured Editor Coverage - `DONE` on 2026-08-24. Representative page-based editors were classified by save ownership. Normal card/editor, Properties-backed character/creature pages, Task Tracker, Campaign Map page saves, Rule Tree and Knowledge Graph are protected by the common editor session base + `PageCommandService.persistPageContentCommand()` boundary when they perform PageRecord-backed saves. Internal Rules Workspace read-only pages remain outside the page conflict write scope. The focused browser regression found and fixed a special-save conflict-path bug where Task Tracker/Rule Tree/Campaign Map/Knowledge Graph conflict handling referenced an out-of-scope `editor`, causing a `ReferenceError` instead of the shared safe conflict dialog. Special-save persistence now receives the active editor explicitly, so stale special-page serializers cannot crash before surfacing the conflict UI. New regressions prove Properties-backed serialized HTML, Task Tracker board JSON and Rule Tree JSON stale saves do not write over newer durable state, while MINE remains visible in the current editor. Campaign Map remains covered by the same special-save boundary plus the existing 13.7 stale Campaign Map navigation regression. No new editor product features, generic merge engine, second conflict system, persistent format migration or real workspace mutation was implemented.

- `0.0.1.13.9` Detect Newer Durable Page State - `DONE` on 2026-08-24. Validated that stale-write protection compares edit-session bases against the authoritative target page file at the durable mutation boundary, not merely against a cached runtime page object or PageRepository snapshot. Existing `PageCommandService.persistPageContentCommand()` / `pageWritePreconditions` ownership already rereads current durable content through the active `StorageAdapter`; no filesystem watcher, background polling, collaboration/sync layer or persistent format change was added. Regressions now cover a supported repository reload observing newer durable content, a controlled direct durable file replacement with stale runtime content still present, no workspace scan during the conflict check, the existing PageCommandService newer-write conflict path and the existing deleted-current-page `precondition-blocked` path.

- `0.0.1.13.10` Data Safety Integration - `DONE` on 2026-08-24. Aligned Phase 12 repair-preview stale evidence with the Phase 13 canonical page state identity so repair preview and editor conflict protection now share one runtime concept: this mutation was based on page state X. The old readable evidence fields remain for UI/backward compatibility, while `sourcePageStateIdentity` is used for apply validation and passed to existing page/relationship command owners as `expectedBase`. Restore and partial restore remain explicit recovery operations owned by `backupService` with their mandatory pre-restore backup gate; they are not blocked merely because an editor session is stale. Later stale editor saves after restore/repair conflict at the page command boundary and do not create additional backups. Regressions cover partial restore -> stale editor blocked, persistent repair -> stale editor blocked, editor save -> stale repair preview blocked before backup, graph relationship command precondition blocking, and existing Phase 12 restore/repair behavior.

- `0.0.1.13.FINAL` NF-001 Closure Gate - `PASS` on 2026-08-24. Reviewed the cumulative Phase 13 diff from pre-phase HEAD `71a9625`, confirmed the baseline phase start and all leaves `0.0.1.13.1` through `0.0.1.13.10` are closed, and received an independent read-only reviewer PASS. Fresh verification passed: `npm run test`, `npm run test:browser`, `npm run verify`, `npm run ui:polish:audit`, `npm run docs:index`, `npm run check:encoding`, project file audit, `git diff --check`, desktop release gate, desktop build, native desktop click-through on a disposable workspace and read-only large-workspace smoke on `X:\ДНД\Мастер\По кампаниям\База`. The only closure corrective code changed the native smoke runner so it opens the Settings Center diagnostics section and closes Settings before presentation smoke. No product behavior, persistent data format, generic auto-merge, collaboration/networking or NF-002 dice work was added.

### Phase 6 - 0.0.1.14.0 NF-002 Safe Dice Engine

ID: `0.0.1.14.0`

NAME: NF-002 Safe Dice Engine

STATUS: `DONE`

GOAL: create a safe, deterministic dice/rules engine.

WHY NOW: rolls should be structured and testable before event logs and combat actions consume them.

SCOPE: safe grammar, no `eval`, no `Function`, deterministic RNG tests, limits, arithmetic, modifiers, advantage/disadvantage, critical behavior and reusable structured results. Existing initiative random rolls may move to the engine only after parity verification.

DEPENDENCIES: roadmap order follows Phase 5. Pure dice parsing has no hard technical dependency on NF-001, but durable roll logging waits for Phase 7. Owner started this phase on 2026-08-24, and the final closure gate passed on 2026-08-26.

EXIT CRITERIA: met on 2026-08-26. Parser/evaluator is safe, no arbitrary code execution path exists, formulas and dice work are bounded, RNG is injectable and validated, RollResult is structured runtime data, explicit advantage/disadvantage and natural-d20 critical metadata are covered, initiative is migrated with parity through the public facade, and no UI/persistence/event/combat functionality was started.

CURRENT LEAF RESULTS:

- `0.0.1.14.0` Phase Start - `DONE` on 2026-08-24. Current status docs mark this phase `ACTIVE`, keep `0.0.1.15.0` Event / Roll / Combat Log + Transactions `BLOCKED`, and set the next leaf to `0.0.1.14.1` Dice Baseline & Public Contract. No dice engine implementation, persistent format migration, event log, combat functionality or real workspace mutation was performed.

- `0.0.1.14.2` Safe Dice Formula Parser - `DONE` on 2026-08-24. Added the first Dice Engine public parser facade `parseDiceFormula(formula)` in `js/dice/diceEngine.js`, producing deterministic runtime AST nodes (`number`, `dice`, `unary`, `binary`) for integers, V1 dice terms, arithmetic, unary operators and parentheses. The parser rejects malformed dice and code-shaped payloads as syntax/data, uses no code-execution primitives, and is documented in [DICE_ENGINE_CONTRACT.md](../02-architecture/contracts/DICE_ENGINE_CONTRACT.md). No dice rolling, evaluator, RNG, initiative migration, UI, persistence, event log, combat functionality or real workspace mutation was implemented.

- `0.0.1.14.3` Core Dice Evaluator - `DONE` on 2026-08-24. Added the public runtime roll facade `rollDice(request, { randomInt })` in `js/dice/diceEngine.js`. It evaluates the safe parser AST for numbers, dice terms, unary and binary arithmetic; calls only the injected `randomInt(1, sides)` for each die; returns structured runtime roll data with total and ordered roll details; and rejects division by zero, invalid RNG output, unsupported mode/critical policy and non-finite or unsafe numeric results with `DiceFormulaEvaluationError`. The default RNG uses `Math.random` without claiming cryptographic fairness. No UI, initiative migration, persistence, event/roll log, combat behavior, advantage/disadvantage, critical rules, broad safety limits or real workspace mutation was implemented.

- `0.0.1.14.4` Dice Formula Limits & Invalid Input Safety - `DONE` on 2026-08-25. Added central `DICE_ENGINE_LIMITS` and `DiceFormulaLimitError` classification for formula length, AST node count, parentheses depth, dice terms, total dice, per-term dice count, die sides and safe-number overflow. Pathological formulas such as `1001d6`, `d1000001`, over-deep parentheses, overlong formulas, excessive ASTs, more than 32 dice terms and more than 1000 total dice now fail before rolling. Malicious/code-shaped strings remain invalid formula data. No UI, initiative migration, persistence, event/roll log, combat behavior, advantage/disadvantage, critical rules, deterministic RNG implementation or real workspace mutation was implemented.

- `0.0.1.14.5` Deterministic Dice RNG Contract - `DONE` on 2026-08-25. Made the Dice Engine RNG ownership explicit: `rollDice(request)` uses engine-owned `defaultDiceRandomInt`, tests can inject deterministic `randomInt(minInclusive, maxInclusive)`, and `createDefaultDiceRandomInt()` allows the default provider to be tested through injected entropy without monkey-patching `Math.random`. Added test-only sequence RNG fixtures and regressions for same sequence -> same result, different sequence -> expected faces, exact RNG call order, invalid provider values including `undefined`, provider failure wrapping and absence of timestamps/generated ids/seeds in pure roll data. No global seeded RNG, workspace RNG state, persisted seeds, UI, initiative migration, persistence, event/roll log, combat behavior, advantage/disadvantage, critical rules or real workspace mutation was implemented.

- `0.0.1.14.6` Structured Roll Result - `DONE` on 2026-08-25. Replaced the temporary flattened `rollResult` shape with the canonical immutable runtime `dice-roll-result` payload: request data now carries original and normalized formula, dice output is grouped one entry per dice term with faces and totals, arithmetic `breakdown` explains number/dice/unary/binary structure, and `critical` records the current `none` classification. Added shape regressions for `d20`, `2d6+3`, multiple dice terms, arithmetic-only formulas, deterministic repeatability, immutability, parser-internal key exclusion and absence of subsystem-owned actor/token/workspace/page data. No UI, initiative migration, persistence, event/roll log, combat behavior, advantage/disadvantage, critical rules or real workspace mutation was implemented.

- `0.0.1.14.7` Advantage and Disadvantage - `DONE` on 2026-08-25. Added explicit `mode: "advantage"` and `mode: "disadvantage"` support to `rollDice()` without extending formula grammar. Non-normal modes are limited to formulas with exactly one `d20`/`1d20` dice term plus deterministic arithmetic; unsupported multi-dice, non-d20 and arithmetic-only formulas fail as `UNSUPPORTED_MODE_FORMULA` before RNG. The selected d20 term records candidate faces, kept/discarded candidate indexes/faces, selected natural face and selection reason, while modifiers/arithmetic apply once. No keep/drop syntax, UI, initiative migration, persistence, event/roll log, combat behavior, critical rules or real workspace mutation was implemented.

- `0.0.1.14.8` Explicit Natural d20 Critical Semantics - `DONE` on 2026-08-25. Added explicit `criticalPolicy: "d20-natural"` support to the public Dice Engine facade. Critical classification now uses the selected natural d20 face, not the final modified total, works with normal/advantage/disadvantage d20 rolls, rejects unsupported non-d20/multi-dice/arithmetic-only formulas as `UNSUPPORTED_CRITICAL_POLICY_FORMULA` before RNG, and returns `critical.kind` as `success`, `failure` or `none`. `criticalPolicy: "none"` remains the default and performs no semantic classification. No combat effects, damage, auto hit/miss behavior, UI, initiative migration, persistence, event/roll log or real workspace mutation was implemented.

- `0.0.1.14.9` Existing Initiative Dice Engine Parity - `DONE` on 2026-08-26. Result: `MIGRATED WITH PARITY`. Campaign Map initiative now rolls its natural d20 through the public `rollDice()` facade while preserving the existing initiative-owned state shape: `roll`, `modifier`, `total`, participants, active participant id and sort order remain unchanged. Existing semantics stay intact: total is natural d20 + initiative modifier, manual GM total edits remain authoritative, rerolling does not reset active turn unexpectedly, ordering stays total desc -> modifier desc -> Russian name, Character-to-initiative refresh stays unchanged, and save/reopen still persists the same `data-initiative-state` map payload. No critical policy, RollResult persistence, initiative schema change, event/roll log, combat behavior, UI redesign or real workspace mutation was implemented.

- `0.0.1.14.10` Universal Consumer API - `DONE` on 2026-08-26. Finalized `js/dice/diceEngine.js` as the canonical public Dice Engine module for future consumers. Public callers can use `rollDice(request, { randomInt })`, `validateDiceRoll(request)`, supported mode/policy constants, limits and structured Dice Engine error classes without importing parser internals, evaluator internals, Campaign Map, Character, combat, UI, storage or event-log code. Validation returns a side-effect-free `dice-roll-validation` result and exposes structured error metadata for invalid formulas, limit failures, unsupported modes/policies and RNG failures. Added consumer-boundary coverage for initiative-style d20 modifiers, ability checks with advantage and natural-d20 policy, generic damage formulas and d100 random tables. No UI, persistence, event/roll log, combat behavior, subsystem context parameters or real workspace mutation was implemented.

- `0.0.1.14.FINAL` Safe Dice Engine Closure Gate - `PASS` on 2026-08-26. Reviewed cumulative Phase 14 from pre-phase HEAD `36ded38`, confirmed the Dice Engine public boundary and security contract, and received independent read-only reviewer evidence. The reviewer initially found stale release tester instructions that still described initiative migration, structured results, advantage/disadvantage and critical semantics as future work; those release notes were corrected before closure. Fresh verification passed for focused dice/initiative tests, full unit suite, full browser suite, focused Campaign Map initiative browser coverage, `npm run verify`, UI polish audit, docs index, encoding, project file audit, desktop release gate, native desktop smoke on a disposable workspace, and read-only large-workspace diagnostics/performance checks on `X:\ДНД\Мастер\По кампаниям\База`. No product UI, persistent roll/event log, combat behavior, collaboration, macro/scripting runtime, persistent format migration, dependency change or real workspace mutation was implemented during the gate.

### Phase 7 - 0.0.1.15.0 NF-003 Event / Roll / Combat Log + Transactions

ID: `0.0.1.15.0`

NAME: NF-003 Event / Roll / Combat Log + Transactions

STATUS: `ACTIVE`

GOAL: create the durable live-session event foundation.

WHY NOW: combat and session actions need a coherent log and undo model before complex state changes.

SCOPE: durable event/transaction foundation, roll-result events, action vocabulary, resource-change vocabulary, scene-transition vocabulary, manual correction vocabulary and undo/audit semantics. One user operation equals one coherent transaction. Undo must not silently erase history. This phase is not combat: no combat session, attacks, damage application, HP automation, effects engine, targeting, dice UI or turns/rounds logic beyond event vocabulary.

DEPENDENCIES: Phase 5 conflict-safe durable writes; Phase 6 dice result structures; page command lifecycle; editor history; CharacterModel; CampaignMapStore. Owner started this phase on 2026-08-26 from HEAD `ac8b31f`.

EXIT CRITERIA: event owner and source of truth are explicit; append/read tests exist; at least one safe action type logs and undoes correctly; no log is hidden inside arbitrary card HTML without a contract.

CURRENT LEAF RESULTS:

- `0.0.1.15.0` Phase Start - `DONE` on 2026-08-26. Current status docs mark this phase `ACTIVE`, keep `0.0.1.16.0` Persistent Combat Session `BLOCKED`, and set the next leaf to `0.0.1.15.1` Event Baseline & Contract. The phase mission is a durable event/transaction foundation where one user operation becomes one coherent auditable transaction and undo does not silently delete history. This start commit does not implement event storage, roll history, combat session, attacks/damage, HP automation, effects, targeting, turns/rounds logic, dice UI, schema migration or real workspace mutation.

- `0.0.1.15.1` Event Baseline & Contract - `DONE` on 2026-08-26. Mapped the existing history/write owners and recorded the Event + Transaction contract in [EVENT_TRANSACTION_CONTRACT.md](../02-architecture/contracts/EVENT_TRANSACTION_CONTRACT.md). `PageCommandService` keeps durable page command lifecycle, runtime command diagnostics and page undo; `editorHistory` keeps local editor undo/redo; Dice Engine stays pure and can only contribute `RollResult` payload data; Campaign Map and CharacterModel remain their own domain owners; `.my-own-world-ops` remains an internal recovery journal, not product history. The contract defines transaction/event identity, type, timestamp/order, payload and undo/reversal links conceptually. Durable event storage is not implemented; the proposed `.my-own-world-events/transactions.v1.jsonl` sidecar requires owner approval before any persistent writes. No combat/session mechanics, dice UI, schema migration or real workspace mutation was implemented.

- `0.0.1.15.2` Transaction Model - `DONE` on 2026-08-26. Added the pure runtime transaction model in `js/events/transactionModel.js`. The model creates started transactions from caller-supplied ids/timestamps, appends ordered events, completes or fails transactions, records source/reason metadata, links reversal/undo transactions and serializes deterministic JSON-compatible shapes. Completed and failed transactions are immutable and cannot receive later events. Payloads are validated as JSON-serializable data, while subsystem context stays inside event payloads rather than top-level generic transaction fields. No persistence, event store, UI, combat/session mechanics, dice UI, schema migration or real workspace mutation was implemented. Next storage work must respect the 15.1 owner-approval gate for `.my-own-world-events/transactions.v1.jsonl`.
- `0.0.1.15.3` Durable Event Store - `DONE` on 2026-08-26. Implemented the owner-approved `.my-own-world-events/transactions.v1.jsonl` sidecar in `js/events/eventStore.js`. The store appends one completed/failed transaction record per JSONL line, reads records after restart through `StorageAdapter`, preserves append order and event order, reports corrupt/invalid lines as structured `invalidRecords`, serializes concurrent in-process appends against the same log path and throws `EventStoreError` on write failure instead of reporting durable success. It writes only the event sidecar, never hidden card HTML, and has no UI, PageCommandService, Dice Engine, Campaign Map or CharacterModel ownership. Backup/restore inclusion for the event sidecar remains a later explicit policy decision. No roll event consumer, event UI, combat/session mechanics, dice UI, schema migration or real workspace mutation was implemented.
- `0.0.1.15.4` Event Types v1 - `DONE` on 2026-08-26. Added `js/events/eventTypes.js` as the v1 event vocabulary owner. Implemented strict `payloadVersion: 1` contracts for `roll.performed`, `manual.correction.recorded`, `resource.changed` and `transaction.reversal.recorded`; reserved future namespaces such as `action.*`, `damage.*`, `healing.*`, `effect.*`, `turn.*`, `round.*`, `rest.*`, `movement.*` and `scene.transition.*` as naming direction only. The durable event store now validates every event through this vocabulary before append/read normalization, so `.my-own-world-events/transactions.v1.jsonl` cannot become a generic `type + anything JSON` channel. No roll event consumer, event UI, combat/session mechanics, dice UI, future action/damage behavior, schema migration or real workspace mutation was implemented.
- `0.0.1.15.5` Roll Event Integration - `DONE` on 2026-08-27. Added `js/events/diceRollEventLog.js` as the first real Event Log consumer of Dice Engine `RollResult`. `logDiceRoll()` calls the public `rollDice()` facade, wraps the immutable result in one `roll.performed` event, completes one transaction and appends it through the existing durable event store. The stored payload keeps formula data, faces, total, mode and critical metadata, and does not store parser AST or subsystem objects. Failed append propagates `EventStoreError` without reporting durable success. Dice Engine remains side-effect free and does not import the event layer. No roll UI, dice UI, event log UI, combat/session mechanics, future action/damage behavior, schema migration or real workspace mutation was implemented.
- `0.0.1.15.6` First Stateful Transaction - `DONE` on 2026-08-27. Added `js/events/pagePropertyResourceTransaction.js` as the first state-changing Event Log consumer. The narrow v1 slice changes one numeric Properties-backed page field through the existing PageCommandService write boundary, then appends one completed `resource.changed` transaction through the existing durable event store. The event payload records before/after/delta and a stable `page-property` resource id that includes page id plus field key. Page write failure leaves no event; event append failure rolls the page content back through PageCommandService and reports the failure instead of leaving a silent unlogged state change. The `eventTypes` owner now keeps absent optional fields absent during normalization so typed events remain valid when the event store revalidates them. No UI, combat/session mechanics, HP automation, generic mutation engine, persistent format migration or real workspace mutation was implemented.

### Phase 8 - 0.0.1.16.0 NF-004 Persistent Combat Session

ID: `0.0.1.16.0`

NAME: NF-004 Persistent Combat Session

STATUS: `BLOCKED`

GOAL: make active combat reload-safe without creating a second initiative engine.

WHY NOW: live combat must survive app close/reopen before broader action automation.

SCOPE: start, pause, resume, finish combat, participants, initiative, current turn, rounds, delayed/ready state where supported, temporary battle flags, save/reload and continue session after reopening the app.

DEPENDENCIES: Phase 5 for conflict-safe writes; Phase 7 strongly recommended for session log; existing Campaign Map initiative/model/store and CharacterModel.

EXIT CRITERIA: active combat state persists and reloads; invalid references produce readable warnings; existing initiative architecture remains owner.

### Phase 9 - 0.0.1.17.0 NF-005 Combat Action Pipeline

ID: `0.0.1.17.0`

NAME: NF-005 Combat Action Pipeline

STATUS: `BLOCKED`

GOAL: route combat operations through one safe pipeline.

WHY NOW: damage, healing and checks should not become scattered UI-specific mutations.

SCOPE: actor -> action -> targets -> range/LoS where available -> roll/save -> components -> defenses -> HP/temp HP/resources/effects -> transaction -> event log -> undo. Support attack, check, save, damage, healing, temp HP, resource cost and manual GM correction. Mixed damage components stay independently resolvable.

DEPENDENCIES: Phase 6 dice, Phase 7 event log, Phase 8 persistent combat; CharacterModel; Properties; CampaignMapStore; PageCommandService.

EXIT CRITERIA: one owner pipeline handles at least the selected first action slice; writes/logs/undo stay coherent; full DnD taxonomy remains deferred until owner chooses the next action slice.

### Phase 10 - 0.0.1.18.0 NF-006 Effects & Conditions Engine

ID: `0.0.1.18.0`

NAME: NF-006 Effects & Conditions Engine

STATUS: `BLOCKED`

GOAL: make effects and conditions a real reusable domain model.

WHY NOW: combat actions and rest flows need consistent temporary and persistent modifiers.

SCOPE: source, target, duration, stacking, refresh, modifiers, turn/round triggers, periodic damage/healing, repeated saves, resource modifications, pause/remove, concentration-like relationships where rules require, persistence, log and undo. System-neutral engine first; DnD presets later.

DEPENDENCIES: Phase 8/9 for combat expiry/application; Phase 7 for log/undo; CharacterModel; Properties; Rule Tree provider.

EXIT CRITERIA: existing effects model is hardened; at least one add/remove condition flow works and persists where intended; turn expiry and rest integration have clear follow-up boundaries.

### Phase 11 - 0.0.1.19.0 NF-007 Targeting / Range / AoE

ID: `0.0.1.19.0`

NAME: NF-007 Targeting / Range / AoE

STATUS: `BLOCKED`

GOAL: support tactical targeting and area templates through Campaign Map architecture.

WHY NOW: combat actions need range and target context, but decorative map shapes must not become tactical source of truth.

SCOPE: single/multi target, range, optional LoS, grid snap, free angle, token/caster origin, auto candidate targets and manual include/exclude. The target tactical geometry vocabulary includes circle, cone, line, rectangle and cylinder, but the first usable slice may be smaller after the spike. Persistent aura/template support is a later sub-slice and needs an explicit CampaignMapModel/serializer design before any persistent schema is added.

DEPENDENCIES: CampaignMapModel/Store/Geometry; map toolbar and Inspector; Phase 9 for combat application.

EXIT CRITERIA: measurement/target preview works; the first approved AoE shape set is testable; combat integration waits until action pipeline is ready; any saved template/aura schema is explicitly approved; decorative shape storage is not abused as tactical truth.

### Phase 12 - 0.0.1.20.0 Live Session Map Package

ID: `0.0.1.20.0`

NAME: Live Session Map Package

STATUS: `BLOCKED`

GOAL: add the next map/session slices one at a time after combat foundations exist.

WHY NOW: these features improve live play, but they should not land as one giant map rewrite.

SCOPE: sequential slices only: `NF-008` Short / Long Rest, `NF-009` Adaptive Token UI by zoom, `NF-010` Map Pings, `NF-011` Scene Transitions / Portals. NF-008 needs preview before apply plus transaction/log/undo. NF-009 defines low/mid/high zoom information density. NF-010 covers normal/danger/go/target/GM-secret pings. NF-011 covers map link, spawn, selected/players/all, relative formation and optional presentation/music transition.

DEPENDENCIES: Phase 7 event log; Phase 9 combat pipeline where rest or scene transition affects combat; CampaignMapModel/Store/presentation.

EXIT CRITERIA: each NF slice is implemented separately with owner approval, tests and no unrelated map feature bundle.

### Phase 13 - 0.0.1.21.0 NF-012 Renderer Spike + Walls / Light / Vision

ID: `0.0.1.21.0`

NAME: NF-012 Renderer Spike + Walls / Doors / Windows / Light / Vision

STATUS: `SPIKE`

GOAL: design tactical vision and barriers without confusing data model with renderer choice.

WHY NOW: walls/light/vision are high-value VTT features, but they are risky enough to require evidence first.

SCOPE: first leaf is a research/performance spike. Separate domain data model from rendering backend. Investigate PixiJS or another backend only if evidence supports it. After owner-approved spike: walls, doors, secret doors, windows, terrain barriers, open/close/lock, light sources, token light, bright/dim, cone/angle, player-specific vision, GM omniscience and fog/vision interaction.

DEPENDENCIES: CampaignMapModel/Store/serializer; fog/layers; presentation privacy; Phase 11 geometry/targeting helps but does not replace the spike.

EXIT CRITERIA: spike proves or rejects renderer direction; no persistent map rewrite happens just to adopt a renderer; production implementation starts only after owner-approved evidence.

### Phase 14 - 0.0.1.22.0 NF-013 Local Compendium

ID: `0.0.1.22.0`

NAME: NF-013 Local Compendium

STATUS: `BLOCKED`

GOAL: make local reusable rules/content searchable and safely importable.

WHY NOW: combat and character workflows will need spells, items, creatures, actions and rules without a second package ecosystem.

SCOPE: reuse Rule Workspace, Rule Packages, World Package, PageRepository and current content models. Target content categories include spells, items, creatures, actions, effects, rules, classes, species, feats, backgrounds and custom entries, but the first v1 content set remains TBD during implementation design. Search/filter/favorites/recent are allowed only if justified during implementation design. Package update must not overwrite user-owned copies.

DEPENDENCIES: Phase 5 recommended before bulk imports; Rule Workspace/Rule Packages/World Package/PageRepository/Safe HTML/backup gate.

EXIT CRITERIA: one clear Tools entry exists; preview/apply flow is safe; no second package source of truth is created.

### Phase 15 - 0.0.1.23.0 Knowledge Graph UX 2.0

ID: `0.0.1.23.0`

NAME: Knowledge Graph UX 2.0

STATUS: `BLOCKED`

GOAL: decide what the graph is for before adding more visible graph features.

WHY NOW: owner feedback says the current graph concept still feels off. More controls would hide the concept problem.

SCOPE: resolve `BI-026` and `BUG-010` first with UX research, design note and references. Answer why a GM opens Graph, navigation vs analysis, primary first-screen workflow, dominant vs hidden information, relationship creation/editing and whether the current inspector/filter model is right. After owner approval, consider remaining `BI-016` richer graph operations.

DEPENDENCIES: Phase 2 cleanup; current Knowledge Graph model and relationship persistence; owner approval of concept direction.

EXIT CRITERIA: design note is approved; `BI-026` has a disposition; no new graph feature is added to compensate for unclear purpose.

### Phase 16 - 0.0.1.24.0 Workspace Usability

ID: `0.0.1.24.0`

NAME: Workspace Usability

STATUS: `BLOCKED`

GOAL: improve everyday workbench ergonomics without decorative empty panels.

WHY NOW: the owner explicitly wants future pane support and Properties field locking, but both need deliberate interaction design.

SCOPE: `BI-023` Properties field lock toggle. `BI-025` up to three workspace panes. Multi-pane requires an interaction/design spike for focus model, split behavior, persistence, card+map, map+graph, card+card, keyboard behavior, narrow-window fallback and performance impact.

DEPENDENCIES: Phase 2 cleanup; current AppShell/tree/editor contracts.

EXIT CRITERIA: lock toggle prevents accidental layout movement without changing field values; multi-pane design is approved before runtime implementation; no placeholder panes ship.

### Phase 17 - 0.0.1.25.0 NF-014 Local-Hosted Collaborative Session

ID: `0.0.1.25.0`

NAME: NF-014 Local-Hosted Collaborative Session

STATUS: `LATER`

GOAL: let the Tauri GM app host an explicit LAN session for browser clients.

WHY NOW: collaboration/player surfaces need an authority model before mobile or writable player actions.

SCOPE: research/spike before production. Target direction: Tauri desktop GM host -> explicit LAN session -> browser clients. Roles: GM, player, viewer. Principles: GM authoritative, validated commands, filtered state, revisions/sequencing, reconnect, no direct filesystem access, no cloud requirement and disabled until explicitly started.

DEPENDENCIES: Phase 5 conflict-safe writes; Phase 7 events if client actions are accepted; presentation privacy; Tauri command boundary.

EXIT CRITERIA: owner approves networking/library architecture before production; no external service or server dependency is added without approval.

### Phase 18 - 0.0.1.26.0 NF-015 Mobile Player Companion

ID: `0.0.1.26.0`

NAME: NF-015 Mobile Player Companion

STATUS: `BLOCKED`

GOAL: create a player-facing mobile companion, not a full mobile GM app.

WHY NOW: players need a limited surface after the local-hosted session model exists.

SCOPE: character, HP/resources, actions, rolls, initiative, effects, inventory, map view, permitted own-token interaction, targeting, pings and public event feed. First usable companion should be read-only unless authority and permissions are already proven.

DEPENDENCIES: Phase 17 collaborative protocol; presentation privacy; responsive shell primitives.

EXIT CRITERIA: mobile surface consumes GM-authoritative state; first slice has clear reconnect/status behavior; writable player actions stay deferred until owner selects and approves them.

### Phase 19 - 0.0.1.27.0 NF-016 Declarative Extension API

ID: `0.0.1.27.0`

NAME: NF-016 Declarative Extension API

STATUS: `LATER`

GOAL: allow safe declarative extension definitions without arbitrary executable plugins.

WHY NOW: future content/rules/features may need extension points, but runtime code plugins are too risky early.

SCOPE: declarative definitions for compendium, Properties schemas, actions, effects, roll variables, rule presets, icons and localization. Trusted code extensions, if ever added, require versioned API, user trust, capability scopes, isolation and no raw filesystem access.

DEPENDENCIES: Phase 14 compendium/package source model; Rule Packages; World Package; Properties; CharacterIntegrationAPI; Safe HTML.

EXIT CRITERIA: one supported declarative capability previews and applies safely; unsupported capabilities block with diagnostics; no executable plugin surface is introduced.

### Phase 20 - 0.0.1.28.0 NF-017 Optional 3D Dice

ID: `0.0.1.28.0`

NAME: NF-017 Optional 3D Dice

STATUS: `LATER`

GOAL: add optional dice presentation without making visuals the source of truth.

WHY NOW: this is late polish after dice and event logs are useful on their own.

SCOPE: optional 3D visualizer receives predetermined outcomes/results from NF-002, can be disabled, respects reduced-motion and does not regress Campaign Map performance.

DEPENDENCIES: Phase 6 dice engine; Phase 7 roll/event log; presentation mode; possible future rendering spike.

EXIT CRITERIA: gameplay result always comes from NF-002; visual failure cannot affect gameplay; performance/reduced-motion tests exist.

### Phase 21 - 0.0.1.29.0 Final Product Polish

ID: `0.0.1.29.0`

NAME: Final Product Polish

STATUS: `LATER`

GOAL: return to visual quality when mature real workflows exist.

WHY NOW: owner accepted the current design for this stage, but the final visual bar still matters later.

SCOPE: full visual critic, editor polish, Graph polish, Map/live-session polish, settings, animations, atmosphere/background, accessibility, performance and consistency. Include `BI-007` and unresolved `0.0.1.8.18.6` critic findings as historical input.

DEPENDENCIES: mature real workflows from earlier phases; owner-approved polish scope.

EXIT CRITERIA: critic evaluates mature workflows, not mostly empty/pre-feature surfaces; final design issues are fixed or explicitly waived; release handoff reflects the final visual state.

## Promoted Backlog Items

These living backlog items are now represented in this master roadmap. Their detailed intake record remains in [BUGS_AND_IMPROVEMENTS_BACKLOG.md](./BUGS_AND_IMPROVEMENTS_BACKLOG.md).

| BI | Promoted To |
| --- | --- |
| `BI-003` Campaign map stabilization | Closed in Phase 3 `0.0.1.11.0`; final gate passed on 2026-08-24. |
| `BI-006` data safety remaining work | Phase 4 `0.0.1.12.0` |
| `BI-007` UI/design future polish | Phase 21 `0.0.1.29.0` |
| `BI-008` circle center point | Closed in `0.0.1.11.12` as `FIXED`; selected circle center marker is runtime-only and schema-neutral. |
| `BI-009` shape rotation controls | Reclassified in `0.0.1.11.12` as `DEFERRED TO LATER CAMPAIGN MAP PHASE`; current Inspector rotation is verified, but object-like shape rotate handles require a larger shape interaction feature. |
| `BI-010` disappearing map toolbar | Closed in `0.0.1.11.2` as `NOT REPRODUCED WITH STRONG EVIDENCE`. |
| `BI-011` creature skills mojibake | Closed in `0.0.1.11.3` as `DONE`. |
| `BI-016` richer graph operations | Phase 15 `0.0.1.23.0`, only after `BI-026` concept approval |
| `BI-020` link cleanup and repair | Phase 4 `0.0.1.12.0` |
| `BI-022` P1 regression bundle | Closed in Phase 3 `0.0.1.11.0`; no included P1 was left undecided. |
| `BI-023` Properties field lock toggle | Phase 16 `0.0.1.24.0` |
| `BI-024` documentation/status automation | Phase 2 `0.0.1.10.0`, only if confirmed by audit as recurring drift |
| `BI-025` up to three workspace panes | Phase 16 `0.0.1.24.0` |
| `BI-026` Knowledge Graph UX concept | Phase 15 `0.0.1.23.0` |

## Bug Inventory Reconciliation

[BUG_INVENTORY.md](./BUG_INVENTORY.md) remains the confirmed/high-risk bug register. Phase 1 must verify currentness before fixes. This table prevents hidden disagreement between the bug register and the active roadmap.

| Bug | Roadmap Disposition |
| --- | --- |
| `BUG-001` large workspace operations feel frozen | Closed in `0.0.1.11.4` as `VERIFIED ACCEPTABLE`; keep large-workspace smoke in release handoff and reopen only with new real UX evidence. |
| `BUG-002` broad unknown broken functions | Watch list only; split into a concrete bug when the owner reports steps. |
| `BUG-003` desktop installed-app verification | Closed in `0.0.1.11.5` as `VERIFIED / CLOSED`; keep native click-through, packaging smoke, desktop gate and large-workspace smoke in release handoff. |
| `BUG-004` campaign map presentation fragility | Closed in `0.0.1.11.6` as `FIXED`; grid appearance was reproduced and fixed, while delayed sync, fog/layer ordering, hidden-player handling, distance arrows and stale reopen state were not reproduced under the current matrix. |
| `BUG-005` map drawing UX verification | Closed in `0.0.1.11.7` as `ALREADY FIXED / VERIFIED`; current disposable matrix covers pencil, pen, fill, eraser, color/recent colors, drawing layer visibility, selection, real Delete and save/reload. |
| `BUG-006` map music desktop/audio fragility | Closed in `0.0.1.11.8` as `FIXED`; stale interrupted `audio.play()` requests no longer surface as current popup errors, and native desktop audio smoke passed on a disposable WAV workspace. |
| `BUG-007` Properties real-card layout risk | Closed in `0.0.1.11.9` as `ALREADY FIXED / VERIFIED`; current representative character layout covers default arrangement, drag into empty grid, resize, occupied collision, save/reopen persistence, readable skill groups and accessible fields. |
| `BUG-008` Character calculations to map trust | Closed in `0.0.1.11.10` as `FIXED`; token snapshots and initiative participants now consume current CharacterModel/Properties data after character save, map reopen and reload, without duplicating character calculations in Campaign Map. |
| `BUG-009` legacy task tracker verification | Closed in `0.0.1.11.11` as `FIXED`; legacy keyed-object `tasks` tracker pages now open with columns/tasks intact and save/reload through the current canonical array shape without eager user-file migration. |
| `BUG-010` Knowledge Graph daily-use concept | Phase 15 with `BI-016` and `BI-026`. |
| `BUG-011` restore and recovery validation | Phase 4 with data safety completion. |
| `BUG-012` docs readability/encoding watch | Phase 1 audit; Phase 2 only if recurring drift is confirmed. |
| `BUG-013` manual regeneration watch | Release handoff rule; no separate active implementation unless it becomes stale again. |
| `BUG-014` local `debug.log` noise | Phase 2 owner-approved policy: the exact root ignored/untracked Chromium/GPU `debug.log` is generated/local-only and not a project-file-audit blocker; do not delete unrelated logs during unrelated tasks. |

## NF Items Included

The old mini backlog has been absorbed into this roadmap and archived at [NEXT_PRODUCT_MINI_BACKLOG_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/NEXT_PRODUCT_MINI_BACKLOG_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md).

Included NF items: `NF-001`, `NF-002`, `NF-003`, `NF-004`, `NF-005`, `NF-006`, `NF-007`, `NF-008`, `NF-009`, `NF-010`, `NF-011`, `NF-012`, `NF-013`, `NF-014`, `NF-015`, `NF-016`, `NF-017`.

## Deliberately Not Planned

These ideas are explicitly rejected for now so future planning does not reintroduce them as "obvious" improvements:

1. Ctrl+drag creature duplication - rejected for now.
2. User-configurable health-stage thresholds/colors/names - rejected for now.

## Historical Planning Sources

The following files are historical only and must not be used as active implementation roadmaps:

- [PROJECT_PLAN_BEFORE_MASTER_ROADMAP_2026-08-10.md](../archive/PROJECT_PLAN_BEFORE_MASTER_ROADMAP_2026-08-10.md)
- [NEXT_PRODUCT_MINI_BACKLOG_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/NEXT_PRODUCT_MINI_BACKLOG_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md)
- [ROADMAP_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/ROADMAP_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md)
- [CURRENT_MILESTONE_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/CURRENT_MILESTONE_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md)
- [UI_AUDIT_AND_MODERNIZATION_PLAN_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/UI_AUDIT_AND_MODERNIZATION_PLAN_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md)
