---
summary: "Current bug and risk inventory for the stabilization block."
read_when:
  - "Before starting 0.0.1.0.2 manual smoke"
  - "Before fixing P0/P1 bugs"
owner_zone: "delivery"
---

# Bug Inventory

Updated: 2026-08-24

Plan ref: `0.0.1.0.1`

Latest smoke pass: [SMOKE_PASS_2026-07-14.md](./SMOKE_PASS_2026-07-14.md)

## Baseline

Automated checks are currently green after the `0.0.1.11.FINAL` closure gate on 2026-08-24: unit suite, full browser suite, `npm run verify`, UI polish audit, docs index, encoding check, project file audit, desktop release gate with large-workspace confidence, desktop build and native click-through passed. The real large workspace `X:\ДНД\Мастер\По кампаниям\База` remains part of release handoff, but it is no longer an unverified blocker for the existing P1 stabilization phase.

This means the inventory below is not a list of confirmed automated failures. It is a stabilization map: confirmed user complaints, recently fragile areas, untested real-world scenarios, and product mismatches that should be checked before new feature work.

Priority meanings:

- `P0` - blocks normal work, risks data loss, or makes the app feel broken.
- `P1` - important workflow is fragile, confusing, slow, or only partly verified.
- `P2` - quality, documentation, polish, or future hardening.

Status meanings:

- `Needs repro` - reproduce manually first.
- `Needs fix` - known enough to implement.
- `Needs regression` - behavior may already pass manually but needs a test.
- `Covered by smoke` - current automated coverage exists, but keep watching.
- `Fixed / watch` - fix and regression exist, but the area remains important enough to keep visible.

## P0

### BUG-SEC-001. Tree title can render user text through innerHTML

Area: tree, safe HTML, runtime UI

Status: Fixed / watch broader `innerHTML` audit

Source: external audit received on 2026-07-16 and local check of `js/tree/treeRender.js`.

Symptoms: page title is user-controlled data, but the tree title row builds part of the title area with `innerHTML`. A malicious page title could be interpreted as HTML in runtime UI if not escaped by the surrounding path.

Risk: runtime HTML injection in the page tree.

Fix: `0.0.1.0.4.1` replaced title insertion with safe DOM construction and `textContent`, then added a malicious-title browser regression.

Regression target: tree renders a title containing script-like markup as text only; no element/event handler from the title appears in the DOM.

### BUG-FS-001. Desktop filesystem commands trust workspace_root from frontend

Area: desktop, Rust, storage, data safety

Status: Fixed / watch desktop release gate

Source: external audit received on 2026-07-16 and local check of `src-tauri/src/main.rs`.

Symptoms: desktop commands used to accept `workspace_root` from JavaScript for each operation. Writes used direct `fs::write`, and `remove_directory` delegated to `remove_dir_all` after path resolution. The old boundary relied too much on frontend-provided root values.

Risk: a bad command call or future frontend bug could target the wrong path, delete the workspace root, or mishandle symlink/junction boundaries.

Fix: `0.0.1.0.5` moved the allowed workspace root into Rust-managed state. File commands now use workspace-relative paths, reject workspace root deletion, validate the nearest existing parent for new paths, use atomic temp-file writes, and return clearer desktop error codes.

Regression target: Rust unit tests reject root deletion and path escape, prove atomic write behavior, and JS storage adapter tests prove desktop commands no longer send `workspaceRoot` with ordinary file operations.

### BUG-001. Large workspace operations can feel frozen

Area: tree, storage, desktop, performance

Status: VERIFIED ACCEPTABLE

Source: user report and plan `0.0.1.1.0`.

Symptoms: in the large GM workspace, moving and deleting pages looked broken because operations were very slow or progress was not obvious. In a new small workspace the same flows worked. The 2026-07-14 engineering probe showed raw file operations are fast, so the remaining risk is UI/runtime delay.

Risk: the app cannot be trusted as a worldbuild OS if large real workspaces feel stuck.

Latest check: `0.0.1.11.4` on 2026-08-20. The approved real workspace `X:\ДНД\Мастер\По кампаниям\База` passed current CLI diagnostics, desktop large-workspace smoke and native WebView click-through. Current real UX measurements: workspace restore 2336 ms, representative card open 165 ms, Settings diagnostics 718 ms, tree scroll/search 181 ms, heavy Campaign Map open 36 ms, presentation open 1328 ms, with no unexpected runtime errors or failed resources. The real workspace has 697 pages, 27 maps, 144 assets, 528 asset references and 0 missing asset references; diagnostics still reports known advisory schema warnings, large pages, large assets and heavy maps.

Current result: no product bottleneck was reproduced, so no runtime optimization was made. The native click-through runner was tightened as evidence tooling: it now opens one representative normal card and extracts card/map target names from the first `<h1>` when legacy pages do not have front-matter `title:`. Move/delete safety was checked without altering real user content: direct probe writes to the real workspace were blocked by `EPERM` and left no `perf-probe-*` files, then the existing mutation probe ran on a temporary copy of the real `pages` folder with create 1 ms, move 0 ms and delete 0 ms.

Regression coverage: `npm run test:large-workspace`, `npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"`, `node tools\run_desktop_native_clickthrough.mjs --workspace "X:\ДНД\Мастер\По кампаниям\База" --timeout 120000`, `ui-polish-runtime-surfaces-render-large-workloads-inside-budgets`, `tree-pointer-dnd-real-ui-uses-batch-move-and-progress-panel`, `tree-context-delete-removes-page-branch-after-trash-snapshot`, and the smoke runner unit tests.

Follow-up rule: keep large-workspace UX in release handoff, but do not treat `BUG-001` as an active P1 unless new real evidence shows unresponsive UI, missing feedback during a noticeable operation, stale state after completion or operation durations outside the existing budgets.

Planned architecture fix: `0.0.1.1.2`-`0.0.1.1.8` will replace heavy in-action full backup for ordinary tree operations with startup indexes, lightweight operation journal, small rollback snapshots, background validation/checkpointing, and regression budgets. Full backup remains for destructive and multi-file operations.

### BUG-002. Some main functions may be broken outside automated smoke

Area: app-wide

Status: Watch list

Source: user report: "багов сейчас много, не работают функции некоторые".

Symptoms: not yet narrowed to exact flows. The 2026-07-14 smoke pass did not reproduce a concrete small-workspace P0/P1 failure.

Risk: continuing feature work can bury fresh regressions.

Next check: keep the item as a watch list. If the owner reports a specific broken function, split it into a concrete bug with steps, expected result, actual result, and regression target.

Regression target: each confirmed P0/P1 bug gets a specific browser/unit/desktop regression or a documented manual check. The generic manual checklist now lives in [MANUAL_SMOKE_CHECKLIST.md](../03-testing/MANUAL_SMOKE_CHECKLIST.md).

### BUG-003. Desktop release needs a real installed-app verification path

Area: desktop, release, storage adapters

Status: VERIFIED / CLOSED

Source: plan `0.0.1.2.0`, previous image/audio/workspace issues.

Symptoms: desktop-specific failures have happened with workspace picker, card images, map background images, presentation window, and audio assets.

Risk: browser can be green while the desktop build is not usable.

Current result: verified on 2026-08-20 in `0.0.1.11.5`. The current release executable launched through the native WebView runner against `X:\ДНД\Мастер\По кампаниям\База`, restored the workspace, rendered the tree, opened an image card with `loadedImages: 1`, rendered a Campaign Map with `backgroundRenderable: true`, opened presentation with status `ready`, opened Settings diagnostics, and reported no failed resources or unexpected runtime errors. Desktop release gate passed with real large-workspace validation; workspace schema/size warnings were advisory only.

Regression target: desktop native click-through, desktop large-workspace smoke and packaging smoke before every installer.

## P1

### BUG-WS-001. Workspace switch action disappeared after opening a workspace

Area: AppShell, workspace picker, editor save/load lifecycle

Status: FIXED

Source: owner report before `0.0.1.11.1`: while a workspace was active, the visible `Открыть папку` action existed only in the no-workspace tree empty state, so the user had no permanent way to switch/open another workspace from the populated UI.

Root cause: `[data-open-workspace]` was rendered only by the no-workspace tree empty state. The global AppShell had Settings and Tools actions, but no compact workspace switch action. The switch path also opened the picker before flushing the current editor page, so a pending edit could be left behind or saved through the wrong workspace adapter after the adapter changed.

Fix: `0.0.1.11.1` restores a permanent compact AppShell topbar `Открыть папку` action using the existing `[data-open-workspace]` click handler and existing workspace picker/open lifecycle. Before opening the picker, the handler saves the current page through the existing editor save lifecycle; cancel keeps the active workspace and page view; successful A -> B switch loads B, clears the old editor view through the existing empty-editor teardown and keeps asset render cache identity scoped to B.

Regression target: `app-shell-global-workspace-switch-keeps-cancel-and-loads-next-workspace` opens workspace A, verifies the permanent action, cancels without state reset, switches to B, proves A pages disappear, B pages appear, B asset URL is workspace-scoped and A pending text is saved only to A.

### BUG-004. Campaign map presentation is historically fragile

Area: campaign map, presentation

Status: FIXED

Source: user reports and plan `0.0.1.3.1`.

Symptoms seen before: slow presentation, delayed sync, wrong fog/layer order, missing distance arrows, bright grid, hidden player token badge problems.

Current result: `0.0.1.11.6` on 2026-08-20 reproduced and fixed the current user-visible presentation issue in the browser/full presentation clone path. Expected: presentation uses the presentation-safe grid appearance after grid style changes while token movement, player-hidden handling, fog/locked fog, layer ordering, distance arrows and reopen state stay current. Actual before fix: the browser presentation clone inherited the GM editor stage `--campaign-grid-color` (`rgba(...,0.34)`) instead of the softer presentation grid color (`rgba(...,0.22)`) used by the model-first presentation renderer, so the presentation grid could be too bright and inconsistent after sync.

Root cause: `preparePresentationClone` cloned the editor stage DOM and did not normalize presentation grid state from the map model. The model-first renderer had its own presentation grid-color helper, so the two presentation paths drifted.

Owner: `js/editor/campaignMapPresentation.js` / `js/editor/campaignMapPresentationStyle.js`; `js/presentation/campaignMapPresentationRenderer.js` now reuses the shared helper.

Fix: the browser presentation clone now applies grid enabled state, size and presentation-safe color from the model, and both presentation render paths use the same `getPresentationGridColor` helper.

Historical symptom classification: delayed sync - `NOT REPRODUCED`; fog/layer ordering - `NOT REPRODUCED`; hidden-player token handling - `NOT REPRODUCED`; distance arrows - `NOT REPRODUCED`; grid appearance - `FIXED`; stale presentation state after close/reopen - `NOT REPRODUCED`.

Regression coverage: `campaign-map-presentation-representative-map-workflow-stays-current` opens one representative map fixture, verifies presentation open, token movement sync, player-hidden token behavior, fog/locked-fog sync, layer visibility/order, distance arrow rendering, grid style sync, no stale measure after close/reopen, and attaches a Playwright screenshot. Existing presentation browser tests still cover model render, delta patches, dirty fog patches, hidden player token visibility, fog above tokens and presentation sync. Native smoke against `X:\ДНД\Мастер\По кампаниям\База` opened the heavy real map `Горы-Пещеры` and presentation with `status: ready`; workspace schema warnings were advisory only.

### BUG-005. Campaign map drawing tools need real UX verification

Area: campaign map drawing

Status: ALREADY FIXED / VERIFIED

Source: user reports and plan `0.0.1.3.2`.

Symptoms seen before: `Del` deletion missing, drawings not visible in layers, fill invisible without image, pencil fill not working, pen not continuing vector paths.

Current result: `0.0.1.11.7` on 2026-08-20 did not reproduce the historical drawing-tool defects on a disposable Campaign Map fixture. The current product path verified pencil drawing, pen continuation and far-start separation, fill on a pencil/freehand drawing, full-map fill with no background image, eraser, color picker input, recent-color swatches, drawing layer hide/show, shape selection, real `Delete` key removal through `setupCampaignMaps`, and save/reload through the data-first serializer.

Historical symptom classification: `Delete` key removal - `ALREADY FIXED / VERIFIED`; drawings visible in layers - `ALREADY FIXED / VERIFIED`; fill visible without image/background - `ALREADY FIXED / VERIFIED`; pencil fill behavior - `ALREADY FIXED / VERIFIED`; pen path continuation/far-start behavior - `ALREADY FIXED / VERIFIED`.

Current owner paths: drawing semantics live in `js/editor/campaignMapDrawing.js`, selection/Delete in `js/editor/campaignMap.js`, layer visibility in `js/editor/campaignMapLayers.js`, shape records in `CampaignMapModel`/`CampaignMapStore`, and save/reload in `js/editor/campaignMapDataSerializer.js`.

Regression coverage: `campaign-map-drawing-tools-stay-usable-through-layers-keyboard-and-reload` verifies the full disposable drawing matrix and protects selected drawing -> `Delete` -> removed runtime/model -> removed after save/reload. Existing map browser tests continue to cover drawing create/fill/erase and layer controls. No runtime drawing fix was needed in this leaf.

### BUG-006. Map music playlists may still be fragile in desktop/audio formats

Area: campaign map music, assets, desktop audio

Status: FIXED

Source: recent user reports: upload did nothing, add failed, play failed, unsupported source.

Current result: `0.0.1.11.8` on 2026-08-20 reproduced a real desktop playback lifecycle failure on a disposable native workspace. Import/add worked and WAV files were written into `assets/music`, but rapid playback controls could surface `AbortError: The play() request was interrupted by a new load request` as a user-visible failure. Campaign Map music now guards per-map playback requests and media generations so stale interrupted `play()` promises cannot clear the current audio source or overwrite the current popup status.

Historical symptom classification: upload appears to do nothing - `FIXED / VERIFIED` for desktop UI import into `assets/music`; add fails - `FIXED / VERIFIED` for normal and battle playlists; play fails - `FIXED` for the reproduced stale `play()`/`load()` race; unsupported source - `NOT REPRODUCED` for the currently verified WAV smoke format and still platform/codec-dependent for arbitrary GM files.

Current owner paths: UI/import/playback lives in `js/editor/campaignMapMusic.js`; persistent playlist state lives in `CampaignMapModel`/`data-map-music-state`; asset writes use `saveAssetFile`/storage adapter binary writes; desktop smoke coverage lives in `tools/run_desktop_native_clickthrough.mjs`.

Regression coverage: browser regression `campaign-map-music-rapid-next-ignores-stale-playback-abort` protects the stale playback abort path. Existing music browser tests cover normal/battle playlist import, controls and map-switch autoplay. Storage/model tests cover playlist persistence, audio asset references, CSP media allowance and audio import with `resolveUrl: false`. Native desktop audio smoke now has an explicit `--audio-smoke --allow-workspace-write` path and passed on a disposable workspace with four imported WAV tracks, normal/battle controls, map switch/return, workspace reload and blob playback after reload. No persistent format migration or codec dependency was added.

### BUG-007. Properties block layout can still feel wrong on real character cards

Area: properties, character UX

Status: ALREADY FIXED / VERIFIED

Source: user reports and plan `0.0.1.4.0`.

Symptoms seen before: fields overlapped, drag lagged behind cursor, resizing behaved incorrectly, skill groups needed adaptive columns, standard layout needed to match a real sorted character card.

Current result: `0.0.1.11.9` on 2026-08-20 verified the current user-facing Properties layout on a representative character card. Default field arrangement matched the compact character sheet layout; a field could be dragged into empty grid space; a skill group could be resized from a supported edge; an occupied drop moved neighboring fields through the existing collision resolver; save/reopen preserved the same `data-property-layout` JSON; skill groups remained readable; and no field became hidden, horizontally inaccessible or unusable. No product-code defect was reproduced.

Current owner paths: default character layout in `js/templates/blockTypes.js`; drag/resize/runtime handles in `js/editor/propertiesSettingsPopup.js`; collision normalization in `js/properties/propertyLayoutModel.js`; persistent HTML save/reopen in `js/editor/blocks/blockSerializer.js`; visual presentation in `styles/block-properties.css`.

Regression coverage: browser regression `character-properties-real-card-layout-persists-after-drag-resize-and-reopen` covers the representative sequence, asserts no layout overlaps, visible/usable fields, readable skill labels (`Скрытность`, `Внимательность`, `Убеждение`), runtime stripping during save, `data-property-layout` survival and exact layout equality after reopen. Existing property browser coverage still protects settings gear, custom fields, field removal, pointer reorder, edge resize, cursor-grid drop and DnD skill calculations.

### BUG-008. Character calculations are not yet fully trusted by map workflows

Area: PropertiesModel, CharacterModel, campaign map bridge

Status: FIXED

Source: plan `0.0.1.4.3` and `0.0.1.4.5`.

Symptoms: the map should use HP, AC, initiative, effects, and statuses from Properties/CharacterModel. Some parts are covered, but full end-to-end behavior still needs verification.

Risk: user edits character data but the map uses stale or fallback values.

Current result: `0.0.1.11.10` on 2026-08-20 reproduced and fixed stale Campaign Map initiative participant data after character Properties edits. Token snapshots already refreshed from CharacterModel for HP, AC, speed, effects and statuses, but existing initiative participants kept old modifier/total values from `data-initiative-state` after map reopen/reload.

Root cause: Campaign Map runtime refreshed linked token snapshots from the established character bridge, but did not reconcile existing `CampaignMapInitiativeModel` participants with those refreshed token records.

Current owner paths: Character data stays in `CharacterModel`/Properties; snapshot bridge is `js/editor/campaignMapCharacterBridge.js`; token runtime sync is `js/editor/campaignMapRuntime.js`; initiative participant reconciliation is `js/editor/campaignMapInitiativeModel.js`; initiative rendering is `js/editor/campaignMapInitiativePopup.js`.

Regression coverage: browser regression `campaign-map-token-and-initiative-refresh-after-character-properties-save-reopen-and-reload`; unit regression `InitiativeModel refreshes existing token participants from current token snapshots`. Coverage includes HP, AC, Dexterity-derived initiative, supported effects/statuses (`Опутан`, `Боевой фокус`), token popup actions, initiative order and map reload boundary.

### BUG-009. Legacy task tracker keyed-task compatibility

Area: task tracker

Status: FIXED

Source: previous user report that task trackers became empty.

Current automated status: browser smoke covers model persistence and legacy JSON script preservation.

Risk: synthetic tests may not cover the user's older saved tracker format.

Current result: `0.0.1.11.11` on 2026-08-20 reproduced and fixed the available legacy tracker shape from `docs/03-testing/sample-workspace/pages/0003-task-tracker.md`: persistent JSON had `tasks` as an object keyed by task id (`{"task-id": {...}}`) while the current normalizer accepted only an array. That made `tasks` normalize to `[]` and filtered old `column.taskIds`, so columns rendered empty.

Fix: `normalizeTaskTrackerData` now reads both the current `tasks: []` array and the legacy keyed-object shape, using the object key as the stable task id so existing `column.taskIds` stay connected. Save/reload still writes the current canonical array shape; no eager migration or real user tracker rewrite was performed.

Regression coverage: unit `normalizeTaskTrackerData читает legacy tasks object without emptying columns`; browser `task-tracker-opens-legacy-keyed-task-object-and-persists-after-reorder-reload`. Coverage verifies columns, tasks, task titles/details, order, drag/reorder and disposable save/reload.

### BUG-010. Knowledge Graph needs final daily-use operations and lifecycle hardening

Area: knowledge graph, UX

Status: Improved, keep in backlog

Source: user reports, plan `0.0.1.5.0`, and 2026-07-20 recommendations.

Symptoms: the graph now has a visual canvas with nodes, edges, drag, zoom, filters, visible-slice counters, selected-node edge states, a graph inspector dock, node context actions, relationship edit/delete and regression coverage. Remaining problem: it is still more of a visual workbench than a daily world-operations tool, and recent audit notes show lifecycle, maintainability and richer operation risks.

Risk: adding more graph behavior without cleanup can reintroduce stale-state/save/undo errors and make the graph harder to trust in large worlds.

Next check: use `BUGS_AND_IMPROVEMENTS_BACKLOG.md` BI-016 and BI-026 before adding graph features. `BI-017` / `BI-018` are closed for Phase 7 by `0.0.1.8.13.11`: relationship/context-menu ownership, view-state helpers and manual relationship persistence now have dedicated owners and command-lifecycle coverage. The remaining graph risk is concept/product direction, not hidden persistence plumbing.

Regression target: graph canvas tests for filters/edges/orphans, popup lifecycle coverage for node/connect overlays, and PageCommandService tests for relationship metadata rollback.

### BUG-011. Manual restore and recovery UX still needs real-world validation

Area: backup, restore, schema recovery

Status: Partially covered / needs restore validation

Source: plan `0.0.1.6.0` and backup/recovery contract.

Symptoms: the schema recovery UI now groups issues and can apply the persisted broken-parent repair after backup. Browser and unit regressions now cover malformed pages, partial data, missing assets, invalid workspace shape and backup-before-repair failure, but restore preview and non-page repair persistence still need validation.

Risk: recovery tools can still be scary or incomplete if restore, link cleanup, assets or map/task repairs do not explain what will change before writing.

Next check: create a disposable broken workspace fixture and run restore preview, partial restore, incomplete-backup cleanup, link cleanup, asset repair and persistent map/task repair flows.

Regression target: storage/browser tests for restore preview, partial restore, link cleanup, asset repair and future persistent repair actions.

### BUG-012. Documentation readability and encoding guard need another pass

Area: docs, release handoff

Status: Covered by smoke / watch

Source: previous encoding problems and current terminal display risk for older Russian docs.

Symptoms: several older documents have historically shown mojibake or damaged text in tooling. `0.0.1.7.2` kept `npm run check:encoding` green after the manual regeneration, and `0.0.1.7.4` refreshed the current release handoff entry points. The remaining issue may be display/tooling-specific or a future pattern the guard does not catch.

Risk: owner cannot rely on docs, plans, and release handoff if they are hard to read.

Next check: keep opening product dashboard, known issues, smoke tests, work log, and key contracts in the editor/app view during release handoff; if text is actually damaged, repair sources and extend `check_text_encoding.mjs`.

Regression target: encoding check pattern extension plus docs index.

## P2

### BUG-013. Full manual was not regenerated after recent work

Area: manual, release handoff

Status: Fixed / watch release handoff

Source: plan `0.0.1.7.1`.

Symptoms: the docx manual had lagged behind the current desktop, properties, graph, map, and backup behavior. `0.0.1.7.1` regenerated `docs/MY_OWN_WORLD_FULL_MANUAL.docx` and verified it as a valid docx/zip.

Risk: tester or owner follows stale instructions.

Next check: keep the manual regeneration step in release handoff when user-visible features change.

Regression target: keep `python -m zipfile -t docs/MY_OWN_WORLD_FULL_MANUAL.docx` in verify.

### BUG-014. `debug.log` local untracked noise

Area: repo hygiene

Status: Closed by `RCB-014` / `0.0.1.10.38`; generated-artifact policy corrected in `0.0.1.10.CORRECTIVE`

Source: `git status --short`.

Symptoms: local `debug.log` was untracked and ignored. Chromium/browser tooling can recreate the exact root GPU diagnostic log after it is deleted.

Risk: accidental commit noise or confusing file audit output.

Resolution: owner approved deleting only the previously audited root `debug.log`, then approved a narrow generated/local-only exemption for the exact recreated root Chromium/GPU diagnostic log when it remains ignored, untracked and non-product data. Project file audit reports 0 delete candidates with that known artifact present and still flags unexpected/tracked/non-root logs.

Regression target: keep safe commit rules, project file audit checks and the narrow `debug.log` classifier tests.

## Current Automated Coverage Snapshot

Covered by current browser smoke:

- app shell empty state;
- persistent AppShell workspace switch cancel/A-to-B/pending-edit/asset-cache path;
- tree DnD planning, tree delete, and tree virtualization;
- campaign map toolbar lifecycle matrix across map/card/map, mapA/mapB/mapA, task/rule detours, tree hide/show, presentation return and workspace switch;
- campaign map creature token skill menu labels and payload path, including visible `Навыки`, representative skill labels and mojibake guard;
- campaign map data save/reload, token removal, presentation sync, fog patches, hidden player token behavior, layers, drawing, playlist basics, desktop audio smoke, initiative basics;
- editor formatting boundary and history;
- properties block gear, custom fields, field removal, drag/resize, calculations, character sheet edits, effects, inventory, universal list;
- task tracker model persistence and legacy JSON preservation;
- safe HTML sanitizer;
- schema recovery fallback;
- knowledge graph creation and orphan view;
- popup lifecycle and visual layout guards.

Not yet covered enough:

- real older user workspace tracker/card/map fixtures;
- full actual-GM audio library codec matrix beyond currently verified desktop WAV smoke;
- graph daily-use operations and lifecycle hardening;
- user-readable docs/manual review.

## Recommended Next Step

Proceed with the active plan in [PROJECT_PLAN.md](./PROJECT_PLAN.md). Phase `0.0.1.11.0` Existing P1 Stabilization is closed after the final gate on 2026-08-24. Phase `0.0.1.12.0` Data Safety Completion is active; `0.0.1.12.1` established the recovery fixture baseline and `0.0.1.12.2` Restore Preview is next.
