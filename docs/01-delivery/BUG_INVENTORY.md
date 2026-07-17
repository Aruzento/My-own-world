---
summary: "Current bug and risk inventory for the stabilization block."
read_when:
  - "Before starting 0.0.1.0.2 manual smoke"
  - "Before fixing P0/P1 bugs"
owner_zone: "delivery"
---

# Bug Inventory

Updated: 2026-07-17

Plan ref: `0.0.1.0.1`

Latest smoke pass: [SMOKE_PASS_2026-07-14.md](./SMOKE_PASS_2026-07-14.md)

## Baseline

Automated checks are currently green: `npm run verify` passed on 2026-07-16, and browser smoke passed 77 tests during the campaign map regression coverage work. Desktop gate was previously green, but real installed-app and large-workspace verification remain separate risks.

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

Status: Needs fix

Source: external audit received on 2026-07-16 and local check of `src-tauri/src/main.rs`.

Symptoms: desktop commands accept `workspace_root` from JavaScript for each operation. Writes use direct `fs::write`, and `remove_directory` delegates to `remove_dir_all` after path resolution. The current boundary relies too much on frontend-provided root values.

Risk: a bad command call or future frontend bug could target the wrong path, delete the workspace root, or mishandle symlink/junction boundaries.

Planned fix: `0.0.1.0.5` moves the allowed workspace root into Rust-managed state, requires relative paths, forbids root deletion, hardens symlink/junction checks and adds atomic writes.

Regression target: Rust/JS tests reject root deletion, path escape and unsafe symlink/junction parents, and prove atomic write behavior.

### BUG-001. Large workspace operations can feel frozen

Area: tree, storage, desktop, performance

Status: Partially reproduced / needs UI probe

Source: user report and plan `0.0.1.1.0`.

Symptoms: in the large GM workspace, moving and deleting pages looked broken because operations were very slow or progress was not obvious. In a new small workspace the same flows worked. The 2026-07-14 engineering probe showed raw file operations are fast, so the remaining risk is UI/runtime delay.

Risk: the app cannot be trusted as a worldbuild OS if large real workspaces feel stuck.

Latest check: [LARGE_WORKSPACE_DESKTOP_SMOKE_2026-07-14.md](./LARGE_WORKSPACE_DESKTOP_SMOKE_2026-07-14.md). Direct page read/create/move/delete is fast; assets are heavy.

Latest fix: progress messages for long backup/move/delete/restore operations now include percent and elapsed time, and a visible progress panel now appears for backup, restore, backup cleanup, branch delete, and tree move operations. A permanent synthetic large-workspace smoke now runs in `npm run verify`, `npm run diagnostics:workspace -- --workspace "X:\path\to\workspace"` reports real workspace size, and Settings now includes an in-app workspace diagnostics panel. Real pointer tree drag/drop is covered by browser smoke through the batch move path. Same-level tree reorders now write only the moved page and skip the risky-operation backup when the parent does not change. One-page parent-changing moves now use a lightweight operation journal instead of full workspace backup; destructive branch delete and bulk parent-changing moves still keep the full backup gate.

Next check: run visible native desktop click-through on the known large GM workspace: open, scroll tree, search, create test page, UI drag move, UI delete, open map, start presentation, open Settings diagnostics, and record visible delays.

Regression target: permanent desktop or scripted large-workspace smoke for load, tree render, move, delete, search, wiki lookup, and map open. Synthetic CI coverage now exists; native desktop UI coverage is still pending.

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

Status: Needs repro

Source: plan `0.0.1.2.0`, previous image/audio/workspace issues.

Symptoms: desktop-specific failures have happened with workspace picker, card images, map background images, presentation window, and audio assets.

Risk: browser can be green while the desktop build is not usable.

Next check: test the release executable and installed app against a real workspace with images, map background, card image, map presentation, and playlist.

Regression target: desktop large-workspace smoke plus packaging smoke before every installer.

## P1

### BUG-004. Campaign map presentation is historically fragile

Area: campaign map, presentation

Status: Needs repro

Source: user reports and plan `0.0.1.3.1`.

Symptoms seen before: slow presentation, delayed sync, wrong fog/layer order, missing distance arrows, bright grid, hidden player token badge problems.

Current automated status: browser smoke covers model render, delta patches, dirty fog patches, hidden player token visibility, fog above tokens, and presentation sync.

Risk: real desktop presentation during a live game can still fail even if model-level browser tests pass.

Next check: manual presentation pass with a real map: move token, draw fog, edit locked fog zone, toggle hidden player, move with distance arrow, switch grid.

Regression target: add desktop-oriented presentation scenario after manual reproduction.

### BUG-005. Campaign map drawing tools need real UX verification

Area: campaign map drawing

Status: Needs repro

Source: user reports and plan `0.0.1.3.2`.

Symptoms seen before: `Del` deletion missing, drawings not visible in layers, fill invisible without image, pencil fill not working, pen not continuing vector paths.

Current automated status: browser smoke covers drawing create/fill/erase and some layer controls.

Risk: drawing may be technically saved but still awkward or unreliable in live use.

Next check: manually test pencil, pen, fill, eraser, color picker, recent colors, drawing layer visibility, and `Del` deletion.

Regression target: browser scenario for drawing layer list and keyboard deletion.

### BUG-006. Map music playlists may still be fragile in desktop/audio formats

Area: campaign map music, assets, desktop audio

Status: Needs repro

Source: recent user reports: upload did nothing, add failed, play failed, unsupported source.

Current automated status: browser smoke covers playlist management and autostart first active playlist track.

Risk: browser smoke may not catch real desktop file protocol, codec, or imported asset issues.

Next check: add several audio files through desktop, create normal and battle playlists, switch map, play, stop, next, previous, shuffle, loop.

Regression target: storage-level audio asset tests plus a documented desktop manual audio smoke.

### BUG-007. Properties block layout can still feel wrong on real character cards

Area: properties, character UX

Status: Needs repro

Source: user reports and plan `0.0.1.4.0`.

Symptoms seen before: fields overlapped, drag lagged behind cursor, resizing behaved incorrectly, skill groups needed adaptive columns, standard layout needed to match a real sorted character card.

Current automated status: browser smoke covers settings gear, custom fields, field removal, pointer reorder, edge resize, cursor-grid drop, and DnD skill calculations.

Risk: tests cover mechanics, but real cards may still look cramped, confusing, or not match the desired sheet organization.

Next check: open a real character card, compare field positions and sizes with the desired standard layout, drag fields into empty grid gaps, resize from each edge, save/reload.

Regression target: visual/layout regression using a representative character properties fixture.

### BUG-008. Character calculations are not yet fully trusted by map workflows

Area: PropertiesModel, CharacterModel, campaign map bridge

Status: Needs regression

Source: plan `0.0.1.4.3` and `0.0.1.4.5`.

Symptoms: the map should use HP, AC, initiative, effects, and statuses from Properties/CharacterModel. Some parts are covered, but full end-to-end behavior still needs verification.

Risk: user edits character data but the map uses stale or fallback values.

Next check: edit character HP, AC armor, Dexterity, initiative, and effects, then verify token popup and initiative read the same values after save/reload.

Regression target: browser end-to-end test from character properties to map token and initiative.

### BUG-009. Task tracker needs legacy workspace verification

Area: task tracker

Status: Needs repro

Source: previous user report that task trackers became empty.

Current automated status: browser smoke covers model persistence and legacy JSON script preservation.

Risk: synthetic tests may not cover the user's older saved tracker format.

Next check: open a real older workspace with existing trackers and verify tasks, columns, drag, save, reload.

Regression target: fixture based on an old tracker page if the real broken shape is found.

### BUG-010. Knowledge Graph is not the intended visual graph

Area: knowledge graph, UX

Status: Needs fix

Source: user report and plan `0.0.1.5.0`.

Symptoms: current graph foundation is too list-like; expected result is a visual map of nodes and relationships.

Risk: the feature exists by name but does not satisfy the user goal.

Next check: design and implement visual graph canvas after stabilization.

Regression target: graph model data generation plus browser test for opening a page from a visual node.

### BUG-011. Manual restore and recovery UX still needs real-world validation

Area: backup, restore, schema recovery

Status: Needs repro

Source: plan `0.0.1.6.0` and backup/recovery contract.

Symptoms: safe repair actions exist, but full recovery UX on messy real workspaces is not fully proven.

Risk: recovery tools can be scary or unclear if they do not explain what will change.

Next check: create a disposable broken workspace fixture and run schema recovery, backup-before-repair, restore, and incomplete-backup cleanup.

Regression target: storage/browser tests for recovery fallback and repair actions.

### BUG-012. Documentation readability and encoding guard need another pass

Area: docs, release handoff

Status: Needs repro

Source: previous encoding problems and current terminal display risk for older Russian docs.

Symptoms: several older documents have historically shown mojibake or damaged text in tooling. `npm run check:encoding` currently passes, so the remaining issue may be display/tooling-specific or a pattern the guard does not catch.

Risk: owner cannot rely on docs, plans, and release handoff if they are hard to read.

Next check: open product dashboard, known issues, smoke tests, work log, and key contracts in the editor/app view; if text is actually damaged, repair sources and extend `check_text_encoding.mjs`.

Regression target: encoding check pattern extension plus docs index.

## P2

### BUG-013. Full manual was not regenerated after recent work

Area: manual, release handoff

Status: Needs fix

Source: plan `0.0.1.7.1`.

Symptoms: the docx manual may lag behind the current desktop, properties, graph, map, and backup behavior.

Risk: tester or owner follows stale instructions.

Next check: clean the manual generator if needed, regenerate the docx, and verify it opens as a valid zip/docx.

Regression target: keep `python -m zipfile -t docs/MY_OWN_WORLD_FULL_MANUAL.docx` in verify.

### BUG-014. `debug.log` is still local untracked noise

Area: repo hygiene

Status: Needs cleanup decision

Source: `git status --short`.

Symptoms: local `debug.log` is untracked.

Risk: accidental commit noise or confusing file audit output.

Next check: inspect if needed, then delete only with explicit cleanup approval or ignore it deliberately.

Regression target: keep safe commit rules and file audit checks.

## Current Automated Coverage Snapshot

Covered by current browser smoke:

- app shell empty state;
- tree DnD planning, tree delete, and tree virtualization;
- campaign map data save/reload, token removal, presentation sync, fog patches, hidden player token behavior, layers, drawing, playlist basics, initiative basics;
- editor formatting boundary and history;
- properties block gear, custom fields, field removal, drag/resize, calculations, character sheet edits, effects, inventory, universal list;
- task tracker model persistence and legacy JSON preservation;
- safe HTML sanitizer;
- schema recovery fallback;
- knowledge graph creation and orphan view;
- popup lifecycle and visual layout guards.

Not yet covered enough:

- real desktop UI behavior on the known large GM workspace;
- real installed-app smoke;
- real older user workspace tracker/card/map fixtures;
- real desktop audio playback and codec/path behavior;
- visual graph canvas;
- full end-to-end character properties to map token behavior;
- user-readable docs/manual review.

## Recommended Next Step

Proceed to `0.0.1.1.1`: run a real desktop smoke on the known large GM workspace.
