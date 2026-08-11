---
summary: "Audit-only repository maintainability and AI-slop review for 0.0.1.9.0."
read_when:
  - "Before starting repository cleanup"
  - "When deciding whether a maintainability finding is real debt or taste"
  - "When planning 0.0.1.10.0 cleanup slices"
owner_zone: "architecture"
---

# Repository Maintainability Audit 0.0.1.9.0

Audit date: 2026-08-11

Head audited: `11c0ce2`

Status: `DONE - OWNER REVIEW REQUIRED`

This is an audit-only artifact. It records findings, evidence, risk and cleanup candidates. It does not implement any cleanup and does not change product behavior.

## Executive Result

The repository is usable and has many strong contracts, but the next work should not jump straight into new product features. The real risks are not "ugly files"; they are boundary drift around page writes, recoverability gaps in multi-file operations, and test gates that can look green while missing some desktop/runtime failures.

Most UI design debt is now documented and contained by contracts, but several feature zones still carry local mini-systems from fast AI-assisted iteration: Knowledge Graph coordination, Properties popup layout ownership, map popup helper duplication and CSS token drift.

Recommended next action: owner reviews [REPOSITORY_CLEANUP_BACKLOG.md](../01-delivery/REPOSITORY_CLEANUP_BACKLOG.md), approves a narrow first cleanup slice, and only then starts `0.0.1.10.0`.

## Readiness For Future NF Work

NF work is not ready to start ahead of cleanup. The system can support continued stabilization, but feature expansion should wait until at least the P1 data-safety/test-gate items are closed or explicitly waived.

Minimum before large NF work:

- fix page rollback/index consistency;
- fix durable rollback for multi-page tree-position writes;
- harden desktop smoke/gate failure criteria;
- decide whether restore must create a pre-restore backup in the current backup service before Phase 4;
- reduce direct feature reads/writes around `state.pages` and low-level page writes.

## Preconditions Checked

- `0.0.1.8.18` is closed by explicit owner waiver recorded in [PROJECT_PLAN.md](../01-delivery/PROJECT_PLAN.md).
- [PROJECT_PLAN.md](../01-delivery/PROJECT_PLAN.md) identifies `0.0.1.9.0` as the next phase and `0.0.1.10.0` as blocked pending audit and owner review.
- Previous active plans are archived in [docs/archive](../archive/README.md) and are not current source of truth.
- [PROJECT_FILE_AUDIT.md](../01-delivery/PROJECT_FILE_AUDIT.md) was treated only as an input. This audit has its own coverage ledger.

## Specialist Review Passes

Five independent passes were used before consolidation:

| Reviewer | Focus | Result |
| --- | --- | --- |
| A | Storage, PageRepository, rollback and write boundaries | Completed |
| B | UI architecture, CSS ownership, god files and duplication | Completed |
| C | Source-of-truth, data/domain boundaries and stale state risks | Completed after replacement reviewer `019fef99-bc9b-7361-9941-970d8e5af9bf` |
| D | Test, release, CI and desktop gate coverage | Completed |
| E | Data safety, Tauri/browser storage, large-workspace and performance risks | Completed |
| Extra UI/accessibility side pass | Tables, graph tabs, overlay semantics, design tokens | Completed as additional evidence |

Coverage details live in [REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md](./REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md).

## Top Findings

### RA-001 - P1 - Page command rollback can desync PageRepository/PageIndex

Evidence:

- `js/storage/pageCommandService.js:295`
- `js/storage/pageCommandService.js:302`
- `js/repository/pageIndex.js:624`

During rollback, the live page object in `state.pages` is restored, but the repository notification can pass rollback snapshot data instead of the restored live object. `PageIndex.updatePage()` stores the `nextPage` it receives. That can leave the search/read model pointing at a snapshot while runtime state points at the restored object.

Impact: page search/read behavior can become stale after failed command rollback.

Recommended cleanup leaf: route rollback notifications through the restored live page object and add a regression that proves `PageRepository` and `state.pages` point at the same restored page after a failed `persistPageContentCommand`.

### RA-001B - P1 - Metadata edits can leave PageIndex/TreeIndex stale

Evidence:

- `js/ui/tags.js:70`
- `js/ui/aliases.js:85`
- `js/ui/cardType.js:53`
- `js/editor/autosave.js:151`
- `js/repository/pageIndex.js:638`

Tag, alias, card type and title controls can mutate `state.currentPage` before the page command snapshot is taken. Repository update then removes old index keys using an already-mutated "previous" shape, so old title/alias/tag/type buckets can remain in `PageIndex`/`TreeIndex`.

Impact: search, wiki lookup, tree/current metadata and duplicate-title/type/tag queries can see stale metadata after ordinary card edits.

Recommended cleanup leaf: snapshot current metadata before mutation or introduce a narrow metadata update command; add regressions for removing old tag, alias, type and title lookup keys.

### RA-002 - P1 - Multi-page tree-position writes can partially persist before memory rollback

Evidence:

- `js/storage/pageStorage.js:1508`
- `js/storage/pageStorage.js:2001`
- `js/storage/pageStorage.js:2024`
- `js/storage/pageStorage.js:2039`

`updatePageTreePositionsMeasured()` applies tree-position changes one page at a time. If an earlier `writePageContent()` succeeds and a later write fails, rollback restores memory, but the already-written files can remain durably changed.

Impact: failed bulk move/reorder can leave disk and memory out of sync.

Recommended cleanup leaf: track successfully written page snapshots and durably restore them on failure, or change the batch operation to a journaled all-or-rollback path.

### RA-003 - P1 - Native desktop smoke records console/page errors without failing the run

Evidence:

- `tools/run_desktop_native_clickthrough.mjs:76`
- `tools/run_desktop_native_clickthrough.mjs:603`
- `tools/run_desktop_native_clickthrough.mjs:617`
- `tools/run_desktop_native_clickthrough.mjs:1064`

The native click-through report collects console errors and page errors, but the final status path does not make those captured errors fail the smoke. A run can therefore look successful while runtime errors are only printed in the report.

Impact: desktop regressions can escape the strongest real-app smoke.

Recommended cleanup leaf: fail on page errors and console errors, with a small allowlist if the app has known harmless noise.

### RA-004 - P2 - Large-workspace/desktop gate semantics can appear greener than release reality

Evidence:

- `package.json:13`
- `tools/run_desktop_release_gate.mjs:140`
- `tools/run_desktop_large_workspace_smoke.mjs:398`
- `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md`
- `docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md`

`desktop:gate` can skip large-workspace coverage when no workspace path is provided, and large-workspace diagnostics warnings are not clearly separated into release-blocking versus advisory categories.

Impact: release confidence can be overstated if a real large workspace was not tested or if warnings are present but not surfaced as gate status.

Recommended cleanup leaf: make the gate result explicitly `normal-workspace-only`, `large-workspace-blocked`, or `large-workspace-validated`; classify diagnostics warnings.

### RA-005 - P2 - Restore flow appears to lack an explicit pre-restore backup gate

Evidence:

- `js/ui/appTopbar.js:1449`
- `js/storage/backupService.js:704`
- `docs/02-architecture/contracts/LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md:310`
- `docs/02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md:12`

The lightweight operations contract requires `Restore backup` to use a pre-restore backup. The current UI path calls `restoreWorkspaceBackup()` directly after confirmation, and the restore implementation overwrites page/asset files. The audit did not find a pre-restore backup gate in that path.

Impact: restore can be difficult to reverse if the chosen backup is incomplete or wrong.

Recommended cleanup leaf: either implement the pre-restore backup gate or explicitly update the contract if the owner decides a different restore safety model is acceptable.

### RA-006 - P2 - Feature modules still bypass the page command/read boundary

Evidence:

- `js/taskTracker/taskTrackerPageActions.js:100`
- `js/templates/pageTemplateStorage.js:255`
- `js/ui/itemSets.js:703`
- `js/editor/campaignMapSerializerHelpers.js:56`
- `js/editor/campaignMapTokenActions.js:211`
- `docs/02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md:66`
- `docs/02-architecture/contracts/LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md:152`

Several feature modules still call low-level `writePageContent()` or notify without a strong command boundary. The contract allows low-level writes only for narrow cases, but feature code has drifted into that layer.

Impact: write revisions, undo/rollback, repository notifications and autosave semantics can differ by feature.

Recommended cleanup leaf: classify direct feature writes as allowed exceptions or migrate them to `persistPageContentCommand()` / a feature-specific command wrapper.

### RA-007 - P2 - `state.pages` direct lookup remains common in feature code

Evidence:

- `js/wiki/knowledgeGraphPage.js:141`
- `js/wiki/knowledgeGraphPage.js:4014`
- `js/ui/worldPackageManager.js:2118`
- `js/ui/itemSets.js:108`
- `js/tree/treeDragDrop.js:351`
- `docs/02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md:64`

`state.pages` remains the physical runtime store, but the contract says new feature lookup should go through `PageRepository`. The audit found direct feature lookups in graph, package, item and tree-adjacent paths.

Impact: large-workspace performance and stale read behavior become harder to reason about.

Recommended cleanup leaf: create a narrow migration list by consumer and replace read-only lookups with PageRepository APIs where behavior is equivalent.

### RA-008 - P2 - Knowledge Graph still has a large coordinator/god-file risk

Evidence:

- `js/wiki/knowledgeGraphPage.js`
- `js/wiki/knowledgeGraphPage.js:1352`
- `docs/01-delivery/BUGS_AND_IMPROVEMENTS_BACKLOG.md:52`

The graph was partially split during design work, but `knowledgeGraphPage.js` still owns broad event registration, state orchestration, lookup, history and interaction code. This may be acceptable as a coordinator for now, but it remains one of the largest runtime files.

Impact: future graph concept work can become risky because unrelated concerns still meet in one module.

Recommended cleanup leaf: before `0.0.1.23.0`, split only one proven owner seam at a time, starting with event delegation/history or read-model access, not a broad rewrite.

### RA-009 - P2 - Properties popup owns feature-local layout infrastructure

Evidence:

- `js/editor/propertiesSettingsPopup.js:2146`
- `js/editor/propertiesSettingsPopup.js:3458`
- `js/properties/propertyLayoutModel.js`

The Properties popup contains drag/resize delegation, collision handling, placeholder behavior and direct layout DOM writes while a separate layout model already exists.

Impact: the popup is both UI shell and layout engine, which makes character-sheet polish harder to stabilize.

Recommended cleanup leaf: move pure layout decisions behind the existing `propertyLayoutModel` owner and keep the popup as orchestration/UI.

### RA-010 - P2 - CSS/design-system migration is incomplete outside corrected Task Tracker zones

Evidence:

- `styles/knowledge-graph.css:841`
- `styles/app-topbar.css`
- `styles/block-properties.css`
- `styles/campaign-map-popups.css`
- `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`

Task Tracker structural icon-only hacks were corrected earlier, but Knowledge Graph still has an icon-only `font-size: 0` pattern, and several large CSS owners still carry raw values and local component styling.

Impact: individual surfaces can still drift into mini design systems.

Recommended cleanup leaf: target one CSS owner per cleanup commit. Start with Knowledge Graph icon-only structural cleanup, then token migration where visual regressions exist.

### RA-011 - P3 - Map helper duplication remains in popup/initiative modules

Evidence:

- `js/editor/campaignMapPopupMarkup.js:61`
- `js/editor/campaignMapToolbar.js:567`
- `js/editor/campaignMapMusic.js:1766`
- `js/editor/campaignMapInitiativePopup.js:994`
- `js/editor/campaignMapInitiativeModel.js:325`

The map popup family has a shared markup helper, but several consumers keep local escape helpers. Initiative also has a local dice roll helper despite an exported initiative model helper.

Impact: small behavior drift can appear in markup escaping or dice semantics.

Recommended cleanup leaf: centralize only exact duplicates already owned by a nearby module. Do not create a broad utility dumping ground.

### RA-012 - P3 - Root-level historical docs remain intentional but outside the docs map

Evidence:

- `AGENTS.md:8`
- `docs/01-delivery/LEGACY_LOCAL_HUB.md:21`
- root folders `Log special` and `Tech maturity` in the tracked inventory

The repository intentionally keeps historical maturity/story evidence outside `docs/`, and current policy says not to move it into local `legacy/`. That is acceptable, but it is still a docs-map exception that future cleanup should not mistake for accidental residue.

Impact: file audits can keep resurfacing these folders as suspicious unless the policy remains explicit.

Recommended cleanup leaf: owner decision only. Either keep the exception documented or move the historical evidence into a tracked docs zone in a separate docs task.

### RA-013 - P3 - Local ignored debug artifact exists again

Evidence:

- `debug.log`
- `.gitignore`
- `docs/01-delivery/LEGACY_LOCAL_HUB.md`

`debug.log` is ignored and not tracked, but it exists locally again. This is not product code and was not moved/deleted during the audit.

Impact: local audits will continue reporting it until the owner allows local cleanup or it is moved to `legacy/`.

Recommended cleanup leaf: owner-approved local file cleanup only; do not commit the file and do not treat it as source truth.

### RA-014 - P3 - Visual regression is mostly structured UI smoke, not strict pixel regression

Evidence:

- `tests/browser/visual-regression.spec.mjs`
- `docs/03-testing/VISUAL_REGRESSION.md`

The visual suite captures surfaces and evidence, but it is not a strict pixel-diff system for every owner-critical viewport and does not universally fail on console/page errors.

Impact: visual polish regressions can still require human review.

Recommended cleanup leaf: decide whether the project wants true screenshot baselines, a stricter critic gate, or the current evidence-smoke model with explicit limits.

### RA-015 - P3 - Documentation/status drift has improved but still needs a light guard

Evidence:

- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/00-product/PRODUCT_DASHBOARD.md`
- `docs/01-delivery/BUGS_AND_IMPROVEMENTS_BACKLOG.md:62`

The latest master-plan reset fixed the biggest drift. The audit did not find active code depending on archived plans, but the project still has many docs that can disagree on "next block" after each closure.

Impact: Codex can follow stale docs if status is not synchronized.

Recommended cleanup leaf: implement `BI-024` only if owner approves Phase 2 docs consistency automation; keep it lightweight.

### RA-016 - P2 - Async page opening can leak stale render completion into a newer page

Evidence:

- `js/editor/editor.js:187`
- `js/editor/editorOpenPage.js:119`
- `js/editor/campaignMap.js:408`

`openPage()` starts the async page-render path without awaiting it. The open path sets global current page before async map restore phases. Rapid navigation can let an older open finish after a newer one and run completion/status/presentation side effects against stale intent.

Impact: intermittent stale DOM/state behavior can appear when moving quickly between cards, maps and rich pages.

Recommended cleanup leaf: add an `openPageToken` or `AbortController` guard and re-check the current page after awaited render phases.

### RA-017 - P2 - Table toolbar has weak keyboard/accessibility ownership

Evidence:

- `js/ui/tables/tableToolbar.js:80`
- `js/ui/tables/tableToolbar.js:106`
- `js/ui/tables.js:239`
- `js/ui/tables.js:269`

The table toolbar is shown through pointer selection, uses plain `L/C/R` buttons with only `title` text, and does not expose a clear toolbar role/name or keyboard selection/command contract beyond Enter-to-next-cell behavior.

Impact: table editing remains pointer-first and less consistent with the accessibility direction established for Tree and Task Tracker.

Recommended cleanup leaf: add table toolbar semantics and keyboard coverage, or explicitly document the current pointer-only limitation before table UX work.

### RA-018 - P2 - Knowledge Graph tablist markup does not implement tab semantics

Evidence:

- `js/wiki/knowledgeGraphPage.js:1200`
- `js/wiki/knowledgeGraphPage.js:1201`
- `js/wiki/knowledgeGraphPage.js:3972`

The graph domain switcher uses `role="tablist"`, but the buttons are not real `role="tab"` controls and do not expose `aria-selected`, roving tabindex or arrow-key tab navigation. `activateDomain()` toggles CSS and `hidden` state only.

Impact: assistive-tech semantics overpromise behavior that is not implemented.

Recommended cleanup leaf: either implement APG-style tabs or remove tab ARIA and treat this as a simpler button group.

### RA-019 - P2 - World Package overlay has ambiguous dialog modality

Evidence:

- `index.html:212`
- `js/ui/worldPackageManager.js:91`
- `js/ui/worldPackageManager.js:101`
- `js/ui/popupManager.js:447`

`worldPackagePopup` declares `data-overlay-kind="dialog"` and `role="dialog"` while `aria-modal="false"` and popup registration sets `modal: false`. PopupManager modal focus defaults apply only to modal popups.

Impact: World Package can look like a dialog while behaving like a non-modal panel, making focus/Escape/return expectations ambiguous.

Recommended cleanup leaf: choose the contract deliberately: modal dialog lifecycle or documented non-modal tool panel.

### RA-020 - P2 - Design token debt remains in character sheet and settings styles

Evidence:

- `styles/block-character-sheet.css:14`
- `styles/app-topbar.css:2251`
- `styles/app-topbar.css:2385`
- `styles/design-tokens.css:18`
- `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md:129`

The character sheet defines a local palette (`--sheet-*`) while the design contract discourages feature-local palettes. Settings CSS also uses no-fallback tokens `--mow-line-height-normal` and `--mow-input-color` that are not defined in `design-tokens.css`.

Impact: contrast/theme polish can silently drift by surface, and undefined variables can produce inconsistent rendering.

Recommended cleanup leaf: either formalize sheet tokens as semantic design tokens or document the exception, and add a static undefined-token check.

## No-Material-Finding Areas

- Tauri filesystem boundary was reviewed at source level: path escapes and workspace-root deletion are rejected, and writes use temp/rename semantics.
- `popupManager` and `popupPosition` now have clearer shared lifecycle/geometry ownership than before `0.0.1.8.18.5`.
- Archive policy is explicit: `docs/archive/` is tracked history; local `legacy/` and `legasy/` are ignored and not product truth.
- Safe HTML boundaries have broad sanitizer and contract coverage; the audit did not confirm a direct unsafe user-input-to-HTML sink.
- Task Tracker UI structure was recently corrected; remaining Task Tracker risk is the page-action write boundary, not a new visible feature request.
- No new dependencies, product features, persistent format migrations, collaboration, combat, dice or effects implementation were found during this audit.

## Bug Inventory Reconciliation

| Item | Current disposition after audit |
| --- | --- |
| `BUG-001` large workspace operations | Still current. RA-002 and RA-004 strengthen the case for cleanup before more large-workspace feature work. |
| `BUG-003` desktop release verification | Still current. RA-003 and RA-004 should be promoted into cleanup/release hardening. |
| `BUG-004` Campaign Map presentation | Still current but not directly changed by this audit. Keep in Phase 3. |
| `BUG-005` Campaign Map drawing tools | Still current but not directly changed by this audit. Keep in Phase 3. |
| `BUG-006` map music | Still current. RA-011 notes local helper duplication, but feature validation remains Phase 3. |
| `BUG-007` Properties block layout | Still current. RA-009 gives architecture cleanup direction. |
| `BUG-008` Character calculations into map | Still current, no new audit finding beyond data-boundary caution. |
| `BUG-009` Task tracker legacy workspace | Still current as a verification risk. Audit found no new tracker redesign need. |
| Table accessibility | Not currently represented as a specific bug item. RA-017 should become Phase 2 cleanup or a later table UX task after owner review. |
| `BI-003`, `BI-008`, `BI-009`, `BI-010`, `BI-011`, `BI-022` | Already promoted to Phase 3. Keep there. |
| `BI-006`, `BI-020` | Already promoted to Phase 4. RA-005 may need earlier owner-approved cleanup if restore safety is considered release-critical. |
| `BI-016`, `BI-026` | Already promoted to Phase 15. RA-008 should be considered before graph concept work. |
| `BI-024` | Confirmed as a reasonable Phase 2 candidate, but only lightweight status drift checks should be added. |
| `BI-025` | Future workbench panes remain plan-only. No implementation started. |

## Owner Decisions Needed

1. Approve the first `0.0.1.10.0` cleanup slice. Recommended first slice: RA-001 and RA-002 data consistency.
2. Decide whether RA-005 restore pre-backup gate is immediate cleanup or stays in Phase 4 data safety.
3. Decide whether local `debug.log` should be moved to ignored `legacy/` or deleted in a separate local cleanup task.
4. Decide whether tracked root historical docs stay as documented exceptions or move into `docs/` later.
5. Decide whether stricter pixel visual regression is worth the cost now or should wait for the next visual maturity phase.
6. Decide whether table accessibility and ambiguous overlay semantics belong in early cleanup or wait for their related feature phases.

## Explicit Non-Implementation Notes

- No repository cleanup findings were implemented.
- No product functionality was implemented.
- No real user workspace was mutated.
- `0.0.1.10.0` cleanup was not started.
