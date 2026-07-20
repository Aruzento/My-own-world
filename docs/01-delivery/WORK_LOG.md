---
summary: "Historical work log and decision record."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---

## 2026-07-20: Item Properties Readable Defaults Hotfix

### What Changed

- Fixed new item `Properties` blocks so all standard fields show the field name and input without manual resizing, not only the compound `Armor` field.
- Money and weight fields now start at 4 grid columns and 2 grid rows, `Armor` starts at 8 columns and 2 rows, and `Effect` starts full width.
- The generic `Properties` model/CSS fallback now uses the same 4-column, 2-row default, so newly added fields without a stored layout do not start cramped or vertically clipped.
- Short `Properties` fields now center their label/input pair vertically to avoid an empty lower half.
- Resize dots now render above the field border with a small backing ring instead of being clipped by the field border.
- Long text `Properties` fields now reserve a stable label row and let the editor fill the remaining height, so fields like `Description` keep their title visible even after custom resizing.
- Added `BI-013` to the lightweight backlog for the separate block-level drag-and-drop regression.

### Readiness

Usable. This affects new item `Properties` blocks and fields without saved layout; existing manually resized layouts remain untouched.

### Checks

- Passed: `node --test tests\propertyBlocks.test.mjs`
- Passed: `npm run check:js`
- Passed: browser regression for tall item `Properties` text fields keeping the label visible.
- Passed: `npm run test:browser` with 83 browser tests.
- Passed: `npm run verify`
- Passed: `node tools\docs_index.mjs`
- Passed: `node tools\validate_agent_skills.mjs`

### Risk / Remaining

- Block-level drag-and-drop is recorded as `BI-013` and still needs a separate reproduction/fix pass.

## 2026-07-20: 0.0.1.4.5 Properties/CharacterModel Map Connection

### What Changed

- Completed `0.0.1.4.5`.
- New character and creature `Properties` blocks no longer start with unreadably narrow standard fields; the default grid uses wider top metrics, a separate armor row, one-row abilities and readable skill groups.
- Item `Properties` now treats armor as one compound `Armor` field with stable nested keys: `armorKind`, `armorBaseAc` and `armorDexMax`. The owner can delete or restore that armor group as one field from the gear popup.
- Map tokens created from character/creature cards now receive a `CharacterModel` snapshot for HP, max HP, temp HP, AC, speed, initiative modifier and active effect/status summary.
- Restored map tokens refresh the same snapshot through `campaignMapCharacterBridge`, so the map does not read random card HTML for these combat values.
- Release notes, tester instructions, dashboard, backlog and subsystem contracts were updated.

### Readiness

Usable. The owner can create an item armor profile in one Properties group, pick that item on a character/creature, place the card on the map and see HP/AC/speed/effect data travel through the model-backed token path.

### Checks

- Passed: `node --test tests\propertyBlocks.test.mjs tests\propertiesCalculationEngine.test.mjs tests\campaignMapModel.test.mjs tests\campaignMapInitiativeModel.test.mjs`
- Passed: `npm run check:js`
- Passed: `npm run check:encoding`
- Passed: `node tools\docs_index.mjs`
- Passed: `node tools\validate_agent_skills.mjs`
- Passed: `npm run verify`
- Passed: `npm run test:browser` with 82 browser tests.

### Risk / Remaining

- Existing cards keep their saved manual Properties layouts. The wider defaults affect new blocks and fields without stored layout.
- This closes the current Properties/Character map integration path, but `0.0.1.4.6` still needs to simplify the visible block creation menu for the owner.

### Next

- Continue with `0.0.1.4.6` Simplify block creation.

## 2026-07-20: 0.0.1.4.4 Armor Picker For Character Properties

### What Changed

- Completed `0.0.1.4.4`.
- Character and creature `Properties` blocks now rebuild the `Armor` select list from workspace item cards.
- Only item cards whose own item `Properties` block has an armor type are offered in the `Armor` field.
- Existing stale/manual references to ordinary items are preserved visibly as unavailable values, but they no longer feed AC calculations.
- DnD armor calculations now use an internal armor-kind key, so normal Russian values and legacy mojibake values are both handled.

### Readiness

Usable. The owner can create or open item cards, mark one item as armor in its `Properties`, then pick only that item from a character/creature `Armor` field and see AC update.

### Checks

- Passed: `node --check js/properties/propertiesCalculationEngine.js`
- Passed: `node --check js/editor/propertiesAutoCalculations.js`
- Passed: `node --test tests/propertiesCalculationEngine.test.mjs`
- Passed: `npm run verify`
- Passed: `npm run docs:index`
- Passed: `npm run agents:validate`
- Passed: `npm run test:browser` with 81 browser tests.

### Risk / Remaining

- The repo still contains old mojibake strings in several docs/code areas. This task protects armor-kind calculations from those legacy values, but it does not clean the wider encoding backlog.
- `0.0.1.4.5` remains open: map tokens still need the explicit Properties/CharacterModel integration path for HP, AC, initiative, effects and statuses.

### Next

- Continue with `0.0.1.4.5` Connect Properties/CharacterModel to the map.

## 2026-07-20: 0.0.1.4.3 Visible DnD Character Calculations

### What Changed

- Completed `0.0.1.4.3`.
- Character and creature `Properties` blocks now show `БМ` and `Инициатива` as standard visible fields.
- Ability fields show runtime modifier badges, so the owner can see `+3`, `-1`, etc. directly beside STR/DEX/CON/INT/WIS/CHA.
- Runtime auto-calculation now updates proficiency bonus from level, initiative from DEX, and skills/saves from ability modifier plus proficiency or expertise.
- Manual edits to calculated visible fields are preserved as explicit `manualOverrides` in `PropertiesModel`, so `CharacterModel` respects them instead of recalculating over the owner's value.
- The release notes, tester instructions, product dashboard, active plan, backlog and Properties contract were updated to keep the handoff readable.

### Readiness

Usable. The owner can test the feature in a normal character card: change level, change DEX, toggle a skill between none/proficient/expertise, and type a manual value to see it stay protected.

### Checks

- `node --test tests\propertyBlocks.test.mjs`
- `node --test tests\characterModel.test.mjs`
- `npm run test:browser`
- `npm run verify`
- `npm run docs:index`
- `npm run agents:validate`

### Remaining Risk

- `0.0.1.4.4` is still open: the `Доспех` field calculates correctly when it has an item reference/title, but the user-facing picker should become the same clear item picker used by item list flows.
- `0.0.1.4.5` is still open: map tokens must be wired to the model snapshot for HP/AC/initiative/effects/statuses as one explicit integration path.

### Next

- Continue with `0.0.1.4.4` Make armor selection use item picker behavior.

---

## 2026-07-20: 0.0.1.4.2 Standard Character Properties Layout

### What Changed

- Completed `0.0.1.4.2`.
- New character and creature `Properties` blocks now start with a readable sheet-like default layout instead of six very narrow skill columns.
- The first row is compact and action-oriented: level, AC, speed, armor picker, current HP, max HP and temporary HP.
- DnD abilities now fit on one row in the natural order `STR / DEX / CON / INT / WIS / CHA`.
- Skill groups now use wider readable blocks arranged in two rows, while still adapting to one-column skill rows when the field is narrow.
- Standard fields now carry `data-property-id`, so runtime styling, settings and regressions can target them consistently without reading visible Russian labels.

### Readiness

Usable. The default layout is visible in one obvious action: create/open a character or creature `Properties` block. Existing cards keep their saved manual layout and are not silently overwritten.

### Checks

- `node --check js\templates\blockTypes.js`
- `node --check tests\propertyBlocks.test.mjs`
- `node --check tests\browser\property-blocks.spec.mjs`
- `node --test tests\propertyBlocks.test.mjs`
- `npm run test:browser`
- `npm run docs:index`
- `npm run check:encoding`
- `npm run agents:validate`
- `npm run verify`

### Remaining Risk

- Existing cards with saved layouts intentionally keep their current positions. A future reset-to-default action can be added if the owner wants to apply the new layout to old cards.
- The next character tasks still need to finish calculations, armor picker behavior and map integration before the whole `Properties & Character UX` block can be considered release-ready.

### Next

- Continue with `0.0.1.4.3` Finish DnD calculations.

---

## 2026-07-19: 0.0.1.4.1 Properties Block Constructor

### What Changed

- Completed `0.0.1.4.1`.
- Properties field drag now previews the real resulting layout while the mouse is moving: if the target cells are occupied, the existing fields visually move down instead of staying overlapped under the placeholder.
- Drop and resize now use the actual CSS grid step, including row/column gaps, so visual placement follows the displayed grid more closely.
- Resize keeps the existing edge behavior and collision resolution, but now uses the same visual spacing as drag.
- Added browser regression coverage for live collision preview during drag and cursor-grid placement with real grid gaps.

### Readiness

Usable. The constructor is still intentionally simple for the owner: drag by the field border, resize by edge/corner dots, and the grid can keep empty gaps. The broader Properties & Character UX block remains open for standard character layout, armor picker, calculations and map integration.

### Checks

- `node --check js\editor\propertiesSettingsPopup.js`
- `node --check tests\browser\property-blocks.spec.mjs`
- `npm run test:browser`
- `npm run docs:index`
- `npm run agents:validate`
- `npm run verify`

### Remaining Risk

- This pass validates the browser behavior. A subjective desktop feel-check is still useful after `0.0.1.4.2` because Properties layout is primarily a visual/editor workflow.

### Next

- Continue with `0.0.1.4.2` Improve standard character layout.

---

## 2026-07-19: 0.0.1.2.2 Native Desktop Click-Through On Real Large Workspace

### What Changed

- Completed `0.0.1.2.2`.
- Used the owner-provided current large workspace: `X:\ДНД\Мастер\По кампаниям\База`.
- Added `tools/run_desktop_native_clickthrough.mjs`, a WebView2/CDP runner that launches the real Tauri release exe, restores the workspace, opens Settings diagnostics, searches the tree, opens a heavy campaign map and opens the Tauri presentation window.
- Added `npm run desktop:native-smoke`.
- Rebuilt the release desktop executable before the native pass so the smoke ran against current code, not an older July 11 binary.
- Fixed desktop restore for workspaces outside HOME: `set_workspace_root` now registers the canonical workspace root in Tauri asset protocol scope for the current session, preventing asset 403 failures after restoring a workspace from localStorage.
- Updated the large-workspace smoke procedure, product dashboard, active plan, backlog and release handoff to use `X:\ДНД\Мастер\По кампаниям\База`.
- Added `docs/01-delivery/DESKTOP_NATIVE_CLICKTHROUGH_CURRENT.md` as the latest native desktop evidence report.
- Fixed `tools/run_desktop_release_gate.mjs` so the gate runs project-local checks through direct `node tools/...` commands instead of nested Windows shell `npm run` calls. This keeps Cyrillic workspace paths stable when the gate invokes the large-workspace smoke.
- Re-ran the full desktop release gate on `X:\ДНД\Мастер\По кампаниям\База`; `docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md` is now `PASSED`.

### Readiness

Usable. The real native Tauri click path is now automated and passed on the current large GM workspace. It is not `Release-ready` yet because subjective owner feel-checks, audio output-device behavior and destructive create/move/delete checks on a copied workspace still need human confirmation.

### Real Workspace Result

- Workspace: `X:\ДНД\Мастер\По кампаниям\База`.
- CLI diagnostics: write probe OK, 690 pages, 25 maps, 141 assets, 527 asset references, 0 missing asset references, 5 complete backups, 0 incomplete backups.
- Tree probe: read directory 3 ms, read/parse pages 149 ms, parent index 0 ms.
- Native click-through: launch 601 ms, workspace restore 1482 ms, diagnostics 670 ms, tree search 181 ms, heavy map open 25 ms, presentation open 984 ms.
- Native map target opened: `Горы-Пещеры`, 26 rendered tokens, toolbar visible, stage visible, background element present, fog canvas present.
- Native presentation: opened `presentation.html`, status `ready`, 18 rendered tokens.
- Resource issues after asset-scope fix: none captured.

### Checks

- `node --check tools\run_desktop_native_clickthrough.mjs`
- `node --check tools\run_desktop_large_workspace_smoke.mjs`
- `node --check tests\desktopLargeWorkspaceSmoke.test.mjs`
- `cargo check`
- `npm run desktop:build`
- `node tools\run_workspace_diagnostics.mjs --workspace "X:\ДНД\Мастер\По кампаниям\База" --json false`
- `node tools\probe_large_workspace_tree_performance.mjs --workspace "X:\ДНД\Мастер\По кампаниям\База"`
- `npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"`
- `node tools\run_desktop_native_clickthrough.mjs --workspace "X:\ДНД\Мастер\По кампаниям\База"`
- `npm run desktop:native-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"`
- `npm run desktop:gate -- --workspace "X:\ДНД\Мастер\По кампаниям\База"`

### Remaining Risk

- Desktop diagnostics on the real large workspace report 2074 schema issues. They are captured in `0.0.1.6.3`/`BI-012` and need a grouped human-readable recovery report before any automatic repair.
- The native runner does not create, move or delete pages; destructive checks should still use a copied workspace.
- The native runner does not judge subjective smoothness, speaker output, or long play-session memory behavior.

### Next

- Continue with `0.0.1.4.0` Properties & Character UX unless a campaign-map backlog bug is promoted first.

---

## 2026-07-19: 0.0.1.2.1 Real Desktop Workspace Access Matrix

### What Changed

- Completed the measurable CLI/report part of `0.0.1.2.1`.
- Found that the older planned path `X:\ДНД\Мастер\База` is stale in the current mounted `X:` drive.
- Identified the current real large GM workspace as `X:\ДНД\Мастер\По кампаниям\2`.
- Ran the real workspace access matrix on that workspace with write probe enabled.
- Updated the desktop large-workspace smoke runner so Cyrillic workspace paths survive child-process calls on Windows.
- Updated the smoke report to show `Location`, `Write probe` and the access matrix in the workspace summary.
- Fixed the human CLI output for missing workspace paths so it prints an explicit `Errors` section instead of only showing zero counts.
- Added regression coverage for Cyrillic desktop smoke paths and missing-workspace human diagnostics.
- Wrote the current measurable smoke report to `docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md`.
- Removed `0.0.1.2.1` from the active plan and added `0.0.1.2.2` for visible native Tauri click-through.

### Readiness

MVP. The measurable large-workspace matrix is green and repeatable from the project, but native Tauri UI click-through in the actual window remains a separate manual pass.

### Real Workspace Result

- Workspace: `X:\ДНД\Мастер\По кампаниям\2`
- Location: different drive, possible external drive, outside HOME.
- Write probe: OK.
- Pages: 287.
- Campaign maps: 15.
- Assets: 76.
- Asset references: 463.
- Missing asset references: 0.
- Complete backups: 20.
- Incomplete backups: 0.
- Diagnostics duration: 79 ms in the final runner pass.
- Tree probe: read directory 1 ms, read/parse pages 41 ms, parent index 0 ms.

### Checks

- `node --check tools\run_workspace_diagnostics.mjs`
- `node --check tools\run_desktop_large_workspace_smoke.mjs`
- `node --check tests\workspaceDiagnosticsCli.test.mjs`
- `node --check tests\desktopLargeWorkspaceSmoke.test.mjs`
- `node --test tests\desktopLargeWorkspaceSmoke.test.mjs tests\workspaceDiagnosticsCli.test.mjs` 2 passed
- `node tools\run_workspace_diagnostics.mjs --workspace "X:\ДНД\Мастер\База" --no-write-probe --json false` returns a clear missing-path error
- `node tools\run_workspace_diagnostics.mjs --workspace "X:\ДНД\Мастер\По кампаниям\2" --json false`
- `node tools\probe_large_workspace_tree_performance.mjs --workspace "X:\ДНД\Мастер\По кампаниям\2"`
- `npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\2"`
- `npm run desktop:check`
- `npm run desktop:packaging-smoke`
- `node tools\check_text_encoding.mjs docs\01-delivery\LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md tools\run_desktop_large_workspace_smoke.mjs tools\run_workspace_diagnostics.mjs tests\desktopLargeWorkspaceSmoke.test.mjs tests\workspaceDiagnosticsCli.test.mjs`

### Remaining Risk

- No real network folder was available in this session (`net use` reported no mapped network connections).
- A deliberately read-only real folder was not created because that requires ACL changes and should be a separate controlled test.
- The Settings diagnostics popup in the actual Tauri window was not clicked by automation; this remains the next active plan item.

### Next

- Continue with `0.0.1.2.2` Run visible native desktop click-through on the current large GM workspace.

---

## 2026-07-19: 0.0.1.1.7 Workspace Access Matrix

### What Changed

- Completed the automated and diagnostic part of `0.0.1.1.7`.
- Added `js/storage/workspaceAccessDiagnostics.js` for workspace access classification and write-probe diagnostics.
- The diagnostics layer now identifies another disk, network folder, possible external drive, outside-HOME paths and read-only/no-write states.
- Workspace diagnostics UI now shows `Location`, `Access matrix` and `Write probe` in the existing diagnostics panel.
- `tools/run_workspace_diagnostics.mjs` now reports the same access matrix in JSON and human output.
- Added `docs/03-testing/WORKSPACE_ACCESS_MATRIX.md` with the human test matrix and exact CLI commands.
- Added unit coverage for another disk, network path, successful write probe, read-only failure and disconnected-path-style errors.
- Removed `0.0.1.1.7` from the active plan and added `0.0.1.2.1` for the real desktop workspace matrix run.

### Readiness

MVP. The owner can run diagnostics from the app or CLI and see whether the workspace is on another disk, network path, outside HOME, or not writable. Real external-drive and network-folder hardware smoke remains a desktop hardening task.

### Checks

- `node --check js\storage\workspaceAccessDiagnostics.js`
- `node --check js\ui\workspaceDiagnosticsPanel.js`
- `node --check tools\run_workspace_diagnostics.mjs`
- `node --check tests\workspaceAccessDiagnostics.test.mjs`
- `node --test tests\workspaceAccessDiagnostics.test.mjs` 5 passed
- `node tools\run_workspace_diagnostics.mjs --workspace docs\03-testing\sample-workspace --no-write-probe --json false`
- `node tools\run_workspace_diagnostics.mjs --workspace docs\03-testing\sample-workspace --json false`

### Remaining Risk

- The automated tests simulate external/network/read-only conditions. The next desktop task must run the matrix on real paths, especially the known large GM workspace.
- The diagnostics write probe creates and removes a tiny temp file in the workspace root. If cleanup fails, the diagnostics report warns about it.

### Next

- Continue with `0.0.1.2.1` Run real desktop workspace access matrix.

---

## 2026-07-19: 0.0.1.1.6 Write Revision Protection

### What Changed

- Completed `0.0.1.1.6`.
- Added runtime write revisions in `writeQueue`: page saves can now mark `changed`, `saving`, `saved`, `error`, `stale` and `superseded-after-write` states.
- `persistPageContentCommand()` now reserves a revision before writing and refuses to update runtime page content, PageRepository/PageIndex or rename undo entries when an older save has been superseded.
- Autosave now marks the statusbar as `Changed`, `Saving...`, `Saved`, `Save error` or `Save conflict`.
- Autosave keeps a local page reference while saving, reducing the risk of an async save from an older page changing the current page's status.
- Special page saves for campaign maps, task trackers, Rule Tree and Knowledge Graph now use the same save-state status behavior.
- Added regression coverage for stale queued writes and racing page content commands.
- Closed backlog item `BI-001`.
- Removed `0.0.1.1.6` from the active plan.

### Readiness

Usable. Normal and special page saves now expose visible save states and have regression coverage for stale write protection. The owner can verify the behavior by typing quickly, waiting for `Saved`, reloading and checking that the latest text remains.

### Checks

- `node --check js\storage\writeQueue.js`
- `node --check js\storage\pageCommandService.js`
- `node --check js\storage\storage.js`
- `node --check js\editor\autosave.js`
- `node --check js\editor\editorSpecialSave.js`
- `node --check js\ui\ui.js`
- `node --check tests\pageCommandService.test.mjs`
- `node --check tests\storageAdapter.test.mjs`
- `node --test tests\pageCommandService.test.mjs tests\storageAdapter.test.mjs` 33 passed
- `node tools\docs_index.mjs`
- `node tools\validate_agent_skills.mjs`
- `npm run check:encoding`
- `git diff --check`
- `npm run verify` 239 passed
- `npm run test:browser` 80 passed

### Remaining Risk

- Write revisions are runtime protection. They do not yet create a durable per-page revision history or conflict-resolution UI after app restart.
- Direct low-level `writePageContent()` callers without revisions remain allowed for non-autosave paths; future hot-path page content writes should use `persistPageContentCommand()`.

### Next

- Continue with `0.0.1.1.7` Add read-only/external workspace test matrix.

---

## 2026-07-19: 0.0.1.1.5 PageIndex Search Lifecycle

### What Changed

- Completed `0.0.1.1.5`.
- `PageIndex` now builds a cached search document for every page during rebuild/add/update, including title, aliases, tags, body text, file name and `updatedAt`.
- Sidebar search now uses ranked PageIndex results instead of reparsing every page on every keystroke.
- Search results are shown as a flat ranked list with the page path under the title, so the owner can see where a match lives.
- Empty focused search now shows a compact recent/recently edited popup; clicking a row opens that page.
- Page open lifecycle now marks recent pages through `PageRepository`.
- Added repository APIs for ranked search results, page path, recent pages and recently edited pages.
- Tree rendering now reuses duplicate-title diagnostics once per render pass, including virtualized search/tree rows.
- Removed `0.0.1.1.5` from the active plan.

### Readiness

Usable. The owner can use the sidebar search in one action, see ranked matches with paths, and open recent/recently edited pages from the search field. The search index updates through existing page lifecycle notifications.

### Checks

- `node --check js\repository\pageIndex.js`
- `node --check js\repository\pageRepository.js`
- `node --check js\search\searchPages.js`
- `node --check js\search\search.js`
- `node --check js\tree\tree.js`
- `node --check js\tree\treeRender.js`
- `node --check js\editor\editorOpenPage.js`
- `node --check tests\pageIndex.test.mjs`
- `node --check tests\pageRepository.test.mjs`
- `node --check tests\searchPages.test.mjs`
- `node --test tests\pageIndex.test.mjs tests\pageRepository.test.mjs tests\searchPages.test.mjs` 15 passed
- `node tools\docs_index.mjs`
- `node tools\validate_agent_skills.mjs`
- `npm run check:encoding`
- `git diff --check`
- `npm run verify` 237 passed
- `npm run test:browser` 80 passed

Note: the first browser smoke run caught a virtualized tree regression (`renderOptions` was not read from `treeVirtualState`). The bug was fixed and the full browser smoke passed afterward.

### Remaining Risk

- Search indexing still runs on the main thread during workspace open/rebuild. This is acceptable for the current indexed cache pass; Web Worker indexing should be considered only if measured startup budgets fail on the known large workspace.
- Legacy callers that invoke `notifyPageUpdated()` without previous/next page still fall back to repository rebuild. This remains safe, but new page lifecycle code should pass explicit before/after pages.

### Next

- Continue with `0.0.1.1.6` Add write revision and transaction protection.

---

## 2026-07-19: 0.0.1.1.4 Page Trash And Undo Foundation

### What Changed

- Completed `0.0.1.1.4`.
- Added a lightweight page operation undo stack in `PageCommandService`.
- `rename-page` commands now register an undo entry that restores previous metadata and file content.
- Tree move commands now register undo entries that restore previous `parent` and `order` through the same PageRecord/write queue path.
- Page branch delete now writes a scoped trash snapshot under `.my-own-world-trash/page-deletes/<trashId>/` before removing files.
- Delete undo restores trashed page files to their original paths and rebuilds `state.pages` through existing runtime page parsing.
- Delete no longer creates `.my-own-world-backups` for ordinary page deletion; trash is the scoped restorable snapshot for this operation.
- If a delete partially fails, already removed files are restored from trash before the command reports failure.
- Updated delete regression coverage from backup expectations to trash expectations.
- Removed `0.0.1.1.4` from the active plan.

### Readiness

Foundation. The durable trash snapshot and command-level undo APIs exist and are tested for delete, move and rename. A polished user-facing trash/undo panel is not implemented yet.

### Checks

- `node --check js\storage\pageCommandService.js`
- `node --check js\storage\pageStorage.js`
- `node --check js\storage\storage.js`
- `node --check tests\pageCommandService.test.mjs`
- `node --check tests\storageAdapter.test.mjs`
- `node --check tests\browser\tree-delete.spec.mjs`
- `node --test tests\pageCommandService.test.mjs` 5 passed
- `node --test tests\pageCommandService.test.mjs tests\storageAdapter.test.mjs tests\workspaceCheckpointTasks.test.mjs tests\backupService.test.mjs` 41 passed
- `npm run test:browser` 80 passed
- `node tools\docs_index.mjs` 74 markdown files, docs metadata OK
- `npm run check:encoding`
- `node tools\validate_agent_skills.mjs` 9 skills OK
- `git diff --check`
- `npm run verify` 233 tests passed; large workspace performance smoke passed

### Remaining Risk

- Trash restore currently restores page files and page tree records, but does not restore map token references that may have been cleaned after page deletion.
- There is no dedicated human-facing trash manager yet; the foundation is available through page operation APIs and future UI can build on it.

### Next

- Continue with `0.0.1.1.5` Improve PageIndex and search lifecycle.

---

## 2026-07-19: 0.0.1.1.3 Required Page Metadata

### What Changed

- Completed `0.0.1.1.3`.
- Extended `PageRecord` front matter with required diagnostic fields: `schemaVersion`, `updatedAt` and `contentHash`.
- New and rewritten page files now stamp the current page schema version, update timestamp and a deterministic `fnv1a32` body checksum without adding new dependencies.
- Old pages without these fields still open normally and are migrated on the next PageRecord write.
- Page runtime records now expose `schemaVersion`, `updatedAt`, `contentHash` and `pageRecordStatus` for diagnostics.
- Workspace schema validation now reports missing page diagnostic metadata, invalid/future page schema versions and content hash mismatch from `pageRecordStatus`.
- `parseMarkdown()` now passes through the PageRecord diagnostic fields for compatibility callers.
- Added regression coverage for metadata writing, migration, hash mismatch diagnostics and command-driven metadata migration.
- Removed `0.0.1.1.3` from the active plan.

### Readiness

MVP infrastructure. The page file format now carries the required diagnostic metadata and validation can detect missing, future or mismatched page records. There is no new user-facing repair UI yet; trash/undo and richer recovery stay in the active plan.

### Checks

- `node --check js\core\pageRecord.js`
- `node --check js\core\markdown.js`
- `node --check js\schema\pageSchema.js`
- `node --check js\editor\editorOpenPage.js`
- `node --check tests\pageRecord.test.mjs`
- `node --check tests\schemaValidation.test.mjs`
- `node --check tests\pageCommandService.test.mjs`
- `node --test tests\pageRecord.test.mjs tests\schemaValidation.test.mjs` 30 passed
- `node --test tests\pageCommandService.test.mjs tests\storageAdapter.test.mjs tests\workspaceCheckpointTasks.test.mjs` 29 passed
- `node --test tests\searchPages.test.mjs tests\knowledgeGraph.test.mjs tests\ruleTreeProvider.test.mjs` 17 passed
- `node --test tests\pageIndex.test.mjs tests\pageRepository.test.mjs tests\treeIndex.test.mjs` 13 passed
- `node tools\docs_index.mjs` 74 markdown files, docs metadata OK
- `node tools\validate_agent_skills.mjs` 9 skills OK
- `npm run check:encoding`
- `git diff --check`
- `npm run verify` 230 tests passed; large workspace performance smoke passed
- `npm run test:browser` 80 passed

### Remaining Risk

- `contentHash` is a deterministic checksum for diagnostics, not a cryptographic security boundary.
- Existing old pages are not rewritten during workspace load; they are migrated when a normal PageRecord write touches them.
- Native desktop click-through was not rerun for this infrastructure pass.

### Next

- Continue with `0.0.1.1.4` Add trash and undo foundation for page operations.

---

## 2026-07-19: 0.0.1.1.2 PageRecord Pipeline

### What Changed

- Completed `0.0.1.1.2`.
- Added `js/core/pageRecord.js` as the shared parser/serializer/update boundary for page markdown records.
- Kept `js/core/markdown.js` as a compatibility wrapper so older callers still receive the legacy parsed page shape.
- Routed page creation, workspace scanning, desktop/browser page writes, aliases, tree parent/order updates, autosave, special entity saves, template-created pages, task tracker quick pages and token-converted pages through PageRecord metadata updates.
- Preserved unknown front matter fields during ordinary metadata updates, so future metadata and imported fields are not lost by a local edit.
- Added regression coverage for PageRecord parsing, relationship front matter, metadata updates, invalid relationship preservation and PageCommandService metadata preservation.
- Removed `0.0.1.1.2` from the active plan.

### Readiness

MVP infrastructure. Main page read/write paths now share a PageRecord pipeline, and existing user workflows should continue to behave the same. Required `schemaVersion`, `updatedAt` and content hash/checksum are intentionally still active work in `0.0.1.1.3`.

### Checks

- `node --check js\core\pageRecord.js`
- `node --check js\core\markdown.js`
- `node --check js\storage\pageStorage.js`
- `node --check js\editor\autosave.js`
- `node --check js\editor\editorSpecialSave.js`
- `node --check js\templates\pageTemplateStorage.js`
- `node --check js\taskTracker\taskTrackerPageActions.js`
- `node --check js\editor\campaignMapTokenActions.js`
- `node --check tests\pageRecord.test.mjs`
- `node --check tests\pageCommandService.test.mjs`
- `node --test tests\pageRecord.test.mjs tests\pageCommandService.test.mjs tests\storageAdapter.test.mjs` 33 passed
- `node --test tests\searchPages.test.mjs tests\knowledgeGraph.test.mjs tests\ruleTreeProvider.test.mjs` 17 passed
- `npm run check:js`
- `node tools\docs_index.mjs` 74 markdown files, metadata OK
- `node tools\validate_agent_skills.mjs` 9 skills OK
- `npm run check:encoding`
- `git diff --check` passed with Windows CRLF warnings only
- `npm run verify` 224 unit/static tests passed plus large-workspace performance smoke
- `npm run test:browser` 80 passed

### Remaining Risk

- `schemaVersion`, `updatedAt` and content hash/checksum are not added yet; they belong to `0.0.1.1.3`.
- A few body-only helpers still preserve existing front matter while replacing the body. They do not patch metadata, but can be pulled into PageRecord later if body serialization becomes fully centralized.
- Native desktop click-through was not rerun for this infrastructure pass.

### Next

- Continue with `0.0.1.1.3` Add required page metadata fields.

---

## 2026-07-17: Bugs And Improvements Backlog

### What Changed

- Added `docs/01-delivery/BUGS_AND_IMPROVEMENTS_BACKLOG.md` as a lightweight intake file for bugs, rough edges and improvements that should be fixed when the related plan block is touched.
- Linked the backlog from `PROJECT_PLAN.md` and `PRODUCT_DASHBOARD.md`.

### Readiness

Foundation. This creates the tracking habit and routing rules; it does not fix the listed issues by itself.

### Checks

- `node tools\docs_index.mjs`
- `npm run check:encoding`

### Next

- Continue with `0.0.1.1.2` Introduce a PageRecord pipeline.

---

## 2026-07-17: 0.0.1.1.1 PageCommandService Foundation

### What Changed

- Completed `0.0.1.1.1`.
- Added `js/storage/pageCommandService.js` as the explicit command boundary for page mutations.
- Routed page create, tree delete branch, single move, batch move, aliases update, autosave content update and title rename saves through command events.
- Command events now record command type, affected page ids, phase order, status, duration and errors.
- Added rollback hooks for failed command execution and content persistence.
- Added regression coverage for command phase order, rollback and real page create/move/batch/aliases/delete routing.
- Updated the lightweight workspace operations contract with the PageCommandService rules.
- Removed `0.0.1.1.1` from the active plan.

### Readiness

MVP infrastructure. The existing user workflows keep working, and page mutations now have a command boundary. Full trash/undo, PageRecord parsing/serialization and richer recovery remain active follow-up work.

### Checks

- `node --check js\storage\pageCommandService.js`
- `node --check js\storage\pageStorage.js`
- `node --check js\editor\autosave.js`
- `node --check js\editor\editorSpecialSave.js`
- `node --check tests\pageCommandService.test.mjs`
- `node --test tests\pageCommandService.test.mjs tests\storageAdapter.test.mjs tests\lightweightWorkspaceOperationsGate.test.mjs` 30 passed
- `npm run check:js`
- `node tools\docs_index.mjs`
- `npm run check:encoding`
- `npm run verify` 219 unit/static tests passed plus large-workspace performance smoke
- `npm run test:browser` 80 passed

### Remaining Risk

- Existing page serialization still uses the current markdown/front matter helpers; `0.0.1.1.2` will introduce the dedicated PageRecord pipeline.
- Delete branch still uses full/scoped backup rather than trash/undo. That is intentional until `0.0.1.1.4`.
- Browser and verify checks pass, but native desktop click-through was not rerun in this pass.

### Next

- Continue with `0.0.1.1.2` Introduce a PageRecord pipeline.

---

## 2026-07-17: 0.0.1.0.6-0.0.1.0.7 Project Status Docs And Definition Of Done

### What Changed

- Completed `0.0.1.0.6` and `0.0.1.0.7`.
- Rebuilt the root `README.md` so it reflects the current browser and desktop workflows, current npm scripts, desktop installer path, active docs map and AI workflow.
- Rebuilt `docs/00-product/PRODUCT_DASHBOARD.md` around the current version-1 stabilization focus.
- Added `docs/01-delivery/DEFINITION_OF_DONE.md` with `Foundation`, `MVP`, `Usable` and `Release-ready` readiness levels.
- Updated `AGENTS.md`, `.agents/skills/anti-slop/SKILL.md` and the code review template to require explicit readiness evidence.
- Updated `BUG_INVENTORY.md` baseline to the current 2026-07-17 verification state.
- Removed `0.0.1.0.6` and `0.0.1.0.7` from the active plan.

### Readiness

Usable project-process cleanup. The active plan, dashboard and README now describe where the project is and how to judge completed work.

### Checks

- `node tools\docs_index.mjs` 73 markdown files, metadata OK
- `node tools\validate_agent_skills.mjs` 9 skills OK
- `npm run check:encoding`
- `npm run verify` 217 unit/static checks passed plus large-workspace performance smoke

### Remaining Risk

- Some older archived or secondary docs can still contain stale status or mojibake; this pass cleaned the active entry points, not every archived file.
- `package.json` still uses version `0.0.0`; semantic product versioning remains a future desktop release task.
- `npm run test:browser` was not rerun for this docs/process pass because no browser UI/runtime behavior changed.

### Next

- Continue with `0.0.1.1.1` Create PageCommandService.

---

## 2026-07-17: 0.0.1.0.5 Desktop Filesystem Boundary Hardening

### What Changed

- Completed `0.0.1.0.5.1`-`0.0.1.0.5.6`.
- Added Rust-managed workspace root state through `set_workspace_root`.
- Changed desktop storage and asset adapters so ordinary file commands send only workspace-relative paths.
- Rejected workspace-root directory deletion through `remove_directory`.
- Hardened new-path resolution by validating the nearest existing parent before writing or creating directories.
- Replaced direct desktop text/binary writes with temp-file atomic writes in the same directory.
- Split several desktop filesystem error codes, including root not selected, root delete rejected, permission denied, file locked and file not found.
- Added Rust unit tests and JS storage adapter regression coverage for the new boundary.
- Removed `0.0.1.0.5` from the active plan.

### Readiness

Usable security hardening for the desktop filesystem boundary. The browser workspace format and browser storage path were not changed.

### Checks

- `node --check js\storage\desktopStorageAdapter.js`
- `node --check js\storage\desktopAssetAdapter.js`
- `node --check tests\storageAdapter.test.mjs`
- `cargo fmt`
- `cargo test` 3 Rust tests passed
- `cargo check`
- `node --test tests\storageAdapter.test.mjs` 26 passed
- `node tools\docs_index.mjs`
- `npm run check:encoding`
- `npm run verify` 217 unit/static checks passed plus large-workspace performance smoke

### Remaining Risk

- This does not replace a real installed-app click-through on a large workspace.
- Atomic rename behavior is covered at Rust unit-test level; production release gate should still run `desktop:gate` before installer handoff.

### Next

- Continue with `0.0.1.0.6` clean stale project status docs from the audit.

---

## 2026-07-17: 0.0.1.0.4.3 Runtime UI Text Security Regressions

### What Changed

- Completed `0.0.1.0.4.3`.
- Added browser regression coverage for the remaining external-audit runtime text surfaces: Task Tracker text, Campaign Map titles and Knowledge Graph page/relationship labels.
- Added a unit/static regression for World Package import preview strings so script-like titles stay data-only.
- Updated the innerHTML audit note with the completed regression coverage.
- Removed `0.0.1.0.4.3` from the active plan.

### User Impact

- No workflow change is intended.
- More user-entered labels are now covered by regression tests that prove HTML-looking text stays inert.

### Checks

- `node --check tests\browser\tree-security.spec.mjs`
- `node --check tests\securityInnerHtmlAudit.test.mjs`
- `node --test tests\securityInnerHtmlAudit.test.mjs` 2 passed
- `npm run check:encoding`
- `node tools\docs_index.mjs`
- `npm run test:browser -- --grep "tree-render-escapes-user-title-html|runtime-label-renderers|remaining-runtime-text-renderers"` 80 passed
- `npm run verify` 216 unit/static checks passed plus large-workspace performance smoke

### Remaining Risk

- Persistent HTML parser paths still use `innerHTML` by design and depend on sanitizer/serializer coverage.
- The next external-audit P0 is desktop filesystem boundary hardening.

### Next

- Continue with `0.0.1.0.5` desktop filesystem boundary hardening.

---

## 2026-07-17: 0.0.1.0.4.2 User-Controlled InnerHTML Audit

### What Changed

- Completed `0.0.1.0.4.2`.
- Audited runtime `innerHTML` surfaces for page titles, aliases, tags, task text, relationship labels, map titles, imported package strings and adjacent UI labels.
- Replaced unsafe runtime insertion for aliases, tags, backlinks, wiki-link page picker and campaign map card picker with DOM construction / `textContent`.
- Escaped page title and short description in item set / universal list renderers.
- Fixed mojibake labels in `js/ui/itemSets.js` while touching that file.
- Added audit note `docs/03-testing/INNER_HTML_AUDIT_2026-07-17.md`.
- Added browser regression for malicious aliases/tags and a static guard for known runtime label files.
- Removed `0.0.1.0.4.2` from the active plan and narrowed `0.0.1.0.4.3` to remaining regression coverage.

### User Impact

- User-entered aliases, tags and linked card titles now render as text in the audited runtime UI surfaces, even when they look like HTML.
- Universal list/card picker labels keep the same workflow, but page titles/descriptions are escaped before rendering.

### Checks

- `node --check` for changed JS and test files
- `node --test tests\securityInnerHtmlAudit.test.mjs`
- `npm run check:encoding`
- `npm run test:browser -- --grep "tree-render-escapes-user-title-html|runtime-label-renderers"` 79 passed
- `node tools\docs_index.mjs`
- `npm run verify`

### Remaining Risk

- Persistent HTML parser paths still use `innerHTML` by design and depend on sanitizer/serializer coverage.
- Remaining security regression targets for task text, relationship labels, map titles and imported package strings stay in `0.0.1.0.4.3`.

### Next

- Continue with `0.0.1.0.4.3` expanded security regression tests for remaining runtime UI text.

---

## 2026-07-17: 0.0.1.0.4.1 Tree Title HTML Injection Fix

### What Changed

- Completed `0.0.1.0.4.1`.
- Replaced the page tree title `innerHTML` path with DOM construction.
- Runtime tree icons still render through the trusted icon helper, but user-controlled page titles now enter the tree through `textContent`.
- Added browser regression `tree-render-escapes-user-title-html`.
- Updated `BUG_INVENTORY.md` and removed the completed item from the active plan.

### User Impact

- Page titles that look like HTML now appear as plain text in the tree.
- No intended visual workflow change beyond safer title rendering.

### Checks

- `node --check js\tree\treeRender.js`
- `node --check tests\browser\tree-security.spec.mjs`
- `npm run check:encoding`
- `node tools\docs_index.mjs`
- `npm run test:browser -- --grep "tree-render-escapes-user-title-html"` 78 passed
- `npm run verify`

### Next

- Continue with `0.0.1.0.4.3` expanded security regression tests for remaining runtime UI text.

---

## 2026-07-17: Anti-Slop Agent Workflow Gate

### What Changed

- Added `.agents/skills/anti-slop/SKILL.md`.
- Adapted the public `kill-ai-slop` idea for MyOwnWorld without copying external files directly.
- Added an Anti-Slop Gate section to `AGENTS.md`.
- The new gate tells Codex to reject vague completion claims, decorative UI churn, untested abstractions, overbroad refactors and plan items marked done while only a foundation exists.

### User Impact

- No direct app UI change.
- Future development should be easier to audit: work should name readiness level, user-visible workflow, tests, remaining risk and next plan item.

### Checks

- `node tools\validate_agent_skills.mjs`
- `node tools\docs_index.mjs`
- `npm run check:encoding`

### Next

- Continue with `0.0.1.0.4.3` expanded security regression tests for remaining runtime UI text.

---

## 2026-07-16: 0.0.1.3.6 Map Regression Coverage

### What Changed

- Completed `0.0.1.3.6`.
- Added browser regression `campaign-map-regression-gate-persists-core-systems-through-save-reload`.
- The new gate builds a campaign map with token HP/source data, grid, fog, locked fog zones, layers, drawing shapes, normal/battle playlists and initiative state.
- The gate serializes that map through persistent HTML, reloads it through `CampaignMapModel.fromElement()` and verifies the core state survived together.
- Updated `tests/browser/scenarios.mjs` with a dedicated `campaign-map-core-regression-gate` scenario and corrected the initiative scenario automation name.
- Removed `0.0.1.3.6` from the active plan.

### User Impact

- No direct UI change.
- Future changes to map save/reload, fog, layers, drawing, playlists or initiative should fail browser smoke sooner if they break persistent map data.

### Checks

- `node --check tests\browser\campaign-map-data.spec.mjs`
- `node --check tests\browser\scenarios.mjs`
- `npm run check:js`
- `npm run test:browser -- --grep 'campaign-map-regression-gate|campaign-map-data-first|campaign-map-initiative|campaign-map-presentation|campaign-map-music|campaign-map-layers|campaign-map-drawing'` 77 passed

### Next

- Continue with `0.0.1.4.1` finish the Properties block constructor.

---

## 2026-07-16: 0.0.1.3.5 Initiative UX Completion

### What Changed

- Completed `0.0.1.3.5`.
- The campaign map initiative button now opens the turn-order window directly when initiative already has participants, instead of forcing the participant picker every time.
- The participant picker now defaults living creature tokens to selected and excludes tokens with `hp <= 0`.
- Manual initiative values are editable in the turn-order window; `Сохранить порядок` persists the edited values and sorts the order.
- Next/previous turn controls preserve edited values before switching active participant.
- Clicking a participant in the turn window makes that participant active and keeps token highlight synced.
- Campaign map token model/serialization now preserves optional `hp` as `data-hp`, so living/dead filtering survives model commits and reload paths.
- Replaced old mojibake strings in the initiative popup with stable Russian UI strings.
- Browser regression now covers participant selection, dead-token filtering, manual value editing, direct reopen to the turn window, active turn switching and persisted initiative JSON.
- Removed `0.0.1.3.5` from the active plan.

### User Impact

- During a live game, opening initiative after combat starts now shows the current turn order immediately.
- The DM can type real dice results directly into the turn window, save/sort, then use previous/next without losing edits.
- Dead tokens no longer appear as default initiative participants.

### Checks

- `npm run check:js`
- `node --test tests\campaignMapModel.test.mjs tests\campaignMapDataSerializer.test.mjs tests\campaignMapInitiativeModel.test.mjs`
- `npm run test:browser -- --grep "campaign-map-initiative"` 76 passed

### Next

- Continue with `0.0.1.3.6` add map regression coverage.

---

## 2026-07-15: 0.0.1.3.4 Music Playlist Stabilization

### What Changed

- Completed `0.0.1.3.4`.
- Reworked campaign map music into a compact AIMP-like player surface with two playlists per map: normal and battle.
- Music import now adds selected audio files directly into the active playlist and imports files in parallel instead of one by one.
- Playback now uses the storage adapter binary path more defensively, calls `audio.load()` before play, clears stale blob URLs, and reports playback failures without breaking the map.
- Empty playlists now stop previous map music when switching maps.
- Fixed music popup text and map picker/title validation strings so Russian UI labels do not depend on mojibake-prone source text.
- Browser regression now covers adding/copying playlists, controls, mode switching, and autostart of the first active playlist track on map open/switch.
- Removed `0.0.1.3.4` from the active plan.

### User Impact

- The music popup should feel smaller and clearer: current track, basic controls, normal/battle mode, playlist rows, import, and copy from another map.
- Adding selected files should be faster and should not show a second redundant "added files" list.
- Switching maps stops music from the old map and tries to start the first track from the new map's active playlist.
- If the browser/desktop runtime blocks playback or cannot load a file, the map stays usable and the popup shows a status instead of silently doing nothing.

### Checks

- `npm run check:js`
- `node --test tests\campaignMapModel.test.mjs`
- `npm run test:browser`

### Next

- Continue with `0.0.1.3.5` finish initiative UX.

---

## 2026-07-15: 0.0.1.3.3 Map Layers Completion

### What Changed

- Completed `0.0.1.3.3`.
- Added a dedicated system layer for locked fog zones: `map-locked-fog`.
- Layer normalization now keeps `map-fog` and `map-locked-fog` above objects, creatures, shapes and drawings even if an older map has stale z-index values.
- Editor layer application now controls visibility and z-index for tokens, shapes, fog canvas and locked fog zones.
- Browser presentation and model-first desktop/Tauri presentation now use the same layer state for fog and locked fog zones.
- Layer visibility changes now schedule presentation sync, so the player view does not wait for a manual refresh.
- Schema validation now accepts the current `layerId` field for campaign map layers.
- Removed `0.0.1.3.3` from the active plan.

### User Impact

- The Layers popup now includes both `Туман` and `Запретные зоны тумана`.
- Fog stays above map objects and creatures.
- Locked fog zones are visible/editable above the fog canvas in the GM editor, but render as normal fog in presentation.
- Hiding the locked-fog layer hides locked zones without deleting their data.

### Checks

- `npm run check:js`
- `node --test tests\campaignMapLayerModel.test.mjs tests\campaignMapModel.test.mjs tests\schemaValidation.test.mjs`
- `npm run test:browser`

### Next

- Continue with `0.0.1.3.4` stabilize music playlists.

---

## 2026-07-15: 0.0.1.3.2 Drawing Tools Stabilization

### What Changed

- Completed `0.0.1.3.2`.
- Drawing shape color, fill color and stroke width now persist through data-first campaign map save/reload.
- Pen drawing now creates a real two-point first segment and only continues an existing vector when the pointer starts near a line endpoint. A far click creates a new vector instead of merging unrelated drawings.
- Fill visuals are more visible on empty maps and in presentation mode.
- Browser regression coverage now checks pencil, pen continuation, far pen start, fill, eraser, drawing layer assignment, fog layer presence and save/reload of drawing style data.
- Removed `0.0.1.3.2` from the active plan.

### User Impact

- Drawn map marks should survive reopening a map with their color and fill intact.
- The pen behaves closer to a simple vector tool: continue from the endpoint, start a separate line elsewhere.
- Filled drawing areas and full-map drawing fill are easier to see even when the map has no background image.

### Checks

- `npm run check:js`
- `node --test tests\campaignMapDataSerializer.test.mjs tests\campaignMapModel.test.mjs tests\campaignMapLayerModel.test.mjs`
- `npm run test:browser`

### Next

- Continue with `0.0.1.3.3` finish map layers.

---

## 2026-07-15: 0.0.1.3.1 Presentation Mode Stabilization

### What Changed

- Completed `0.0.1.3.1`.
- Browser presentation fog sync now refreshes locked fog zones together with the fog image, so moved/resized locked zones no longer wait for a full presentation rerender.
- Presentation entry now shows a lightweight waiting state until the first map render arrives, instead of a silent blank black window.
- Added browser regression coverage for locked fog zone updates through fog sync and for the initial presentation loading state.
- Removed `0.0.1.3.1` from the active plan.

### User Impact

- Presentation mode should feel less broken during map changes: locked fog zones stay in the right place and the presentation window tells you it is waiting for the map before the first render.
- Existing protections remain: fog renders above tokens, hidden NPC tokens stay hidden, hidden player tokens remain visible with the hidden badge, and distance arrows stay covered by regression tests.

### Checks

- `node --check js\editor\campaignMapPresentation.js`
- `node --check js\presentation\presentationEntry.js`
- `node --check tests\browser\campaign-map-presentation.spec.mjs`
- `npm run test:browser`

### Next

- Continue with `0.0.1.3.2` finish drawing tools.

---

## 2026-07-15: 0.0.1.2.4 Desktop Release Gate Hardening

### What Changed

- Completed `0.0.1.2.4`.
- Hardened `npm run desktop:gate` so it now validates release handoff files, npm scripts, docs index, agent skills, verify, browser smoke, desktop prepare, packaging smoke, desktop environment and Tauri cargo check.
- Added an optional large workspace smoke hook to the gate through `--workspace "<path>"` or `MOW_DESKTOP_RELEASE_WORKSPACE`.
- Added a generated release gate report at `docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md`.
- Updated desktop release policy, install guide, release notes and tester instructions.
- Removed `0.0.1.2.4` from the active plan.

### User Impact

- Before building or handing off an installer, there is now one stronger command: `npm run desktop:gate`.
- If a large GM workspace is available, the same gate can include it: `npm run desktop:gate -- --workspace "X:\ДНД\Мастер\База"`.
- If no large workspace is provided, the report explicitly says the build is not validated as a large-workspace handoff.

### Checks

- `node --check tools\run_desktop_release_gate.mjs`
- `npm run desktop:gate`
- `npm run test:browser`
- `node tools\docs_index.mjs`
- `npm run check:encoding`

### Next

- Continue with `0.0.1.3.1` stabilize presentation mode.

---

## 2026-07-15: 0.0.1.2.3 Desktop Large Workspace Smoke

### What Changed

- Completed `0.0.1.2.3`.
- Added `tools/run_desktop_large_workspace_smoke.mjs`.
- Added `npm run desktop:large-workspace-smoke`.
- Added [DESKTOP_LARGE_WORKSPACE_SMOKE.md](./DESKTOP_LARGE_WORKSPACE_SMOKE.md) as the repeatable large workspace desktop smoke procedure.
- The runner collects read-only workspace diagnostics, tree probe timings, desktop environment checks, packaging smoke and desktop artifact presence.
- The runner writes `docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md` by default.
- Updated release notes, tester instructions and desktop release policy.
- Removed `0.0.1.2.3` from the active plan.

### User Impact

- Large workspace desktop checks now have one command and one report instead of scattered manual notes.
- The report still honestly separates automated metrics from native Tauri click-through, which remains manual until a real desktop UI runner exists.

### Checks

- `node --check tools\run_desktop_large_workspace_smoke.mjs`
- `npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\База"` was attempted, but the workspace path is not mounted in this session.
- `npm run verify`
- `npm run test:browser`
- `node tools\docs_index.mjs`
- `npm run check:encoding`

### Next

- Continue with `0.0.1.2.4` harden desktop release gate.

---

## 2026-07-15: 0.0.1.2.2 Desktop Workspace Diagnostics

### What Changed

- Completed `0.0.1.2.2`.
- Expanded the existing workspace diagnostics panel in app settings.
- Added a compact workspace status section with runtime mode, selected workspace path, write access, schema status, background checkpoint status, backup location, latest backup and latest operation.
- Diagnostics now include backup count, incomplete backup count, pending operation count and schema error count in the summary.
- Added warnings for missing write access, failed checkpoints, pending operations, incomplete backups and backup scan errors.
- Updated browser regression coverage for the diagnostics panel.
- Removed `0.0.1.2.2` from the active plan.

### User Impact

- In desktop settings, the user can quickly see whether the selected workspace is available, writable, schema-clean, backed up and free of pending operations.
- This should make reports like "workspace does not delete/move/save" easier to diagnose without guessing.

### Checks

- `npm run check:js`
- `npm run test:browser`

### Next

- Continue with `0.0.1.2.3` desktop large workspace smoke.

---

## 2026-07-15: 0.0.1.2.1 Desktop Install And Update Flow

### What Changed

- Completed `0.0.1.2.1`.
- Replaced the old desktop-spike install stub with a clear desktop install, update, handoff, and rollback guide.
- Documented which file to send to another person: `src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe`.
- Documented that the installer contains the app, while the workspace is a separate folder selected by the user.
- Updated the desktop release policy with the same install/update rules.
- Removed `0.0.1.2.1` from the active plan.

### User Impact

- It is now clear how to build an installer, what to send to another person, how to update safely, and how to roll back if a build is bad.
- Testers should use a copied workspace, not the only important workspace.

### Checks

- `node tools\docs_index.mjs`
- `npm run check:encoding`

### Next

- Continue with `0.0.1.2.2` desktop workspace diagnostics.

---

## 2026-07-15: 0.0.1.1.1 Large Workspace Native Desktop Click-Through Accepted

### What Changed

- Closed `0.0.1.1.1` based on owner baseline testing.
- The app was handed to another person for additional real-world bug discovery.
- Removed the accepted click-through item from the active plan.

### User Impact

- Large workspace desktop work remains watch-listed: new bugs from the external tester will be triaged as bug inventory items instead of keeping the old broad task open.

### Checks

- Owner manual pass, external tester handoff.

### Next

- Keep large-workspace bugs prioritized when they appear.

---

## 2026-07-15: Scoped Delete Backup For Large Workspaces

### What Changed

- Fixed tree branch deletion so it no longer creates a page backup for the entire workspace.
- `deletePageBranch()` now passes only the pages that are about to be deleted into the risky-operation backup.
- Added a regression test proving that unrelated pages stay out of the delete backup.
- Updated the backup/recovery and lightweight operations contracts with the scoped-delete rule.
- Updated release notes and tester instructions.

### User Impact

- Deleting a small page or small branch in a large workspace should feel much faster.
- The action is still protected: the deleted branch pages are saved in `.my-own-world-backups/`.
- Manual full workspace backup is unchanged and still available from settings.

### Checks

- `node --test tests\storageAdapter.test.mjs tests\backupService.test.mjs`
- `npm run verify`
- `npm run test:browser`
- `node tools\docs_index.mjs`
- `npm run check:encoding`

### Next

- Continue large-workspace desktop click-through and watch whether delete still feels slow in `X:\ДНД\Мастер\База`.

---

## 2026-07-15: 0.0.1.1.1 Large Workspace Native Desktop Click-Through Prep

### What Changed

- Continued `0.0.1.1.1`.
- Re-ran the real large workspace diagnostics for `X:\ДНД\Мастер\База`.
- Re-ran the read-only large workspace tree probe.
- Re-ran desktop environment, packaging smoke, and full desktop release gate checks.
- Launched the current native release executable for owner-visible click-through.
- Updated [LARGE_WORKSPACE_DESKTOP_SMOKE_2026-07-15.md](./LARGE_WORKSPACE_DESKTOP_SMOKE_2026-07-15.md) with the current pass status.

### User Impact

- The engineering side still points away from raw file IO as the main bottleneck: diagnostics and tree parsing are fast on the known GM workspace.
- The remaining proof is visual and interactive: the owner needs to confirm the native window can open the large workspace and complete the visible smoke path without feeling frozen.

### Checks

- `npm run diagnostics:workspace -- --workspace "X:\ДНД\Мастер\База" --no-json`
- `node tools\probe_large_workspace_tree_performance.mjs --workspace "X:\ДНД\Мастер\База"`
- `npm run desktop:check`
- `npm run desktop:packaging-smoke`
- `npm run desktop:gate`

### Next

- Complete the owner-visible manual pass in the launched native window: open the large workspace, scroll/search/find in tree, run diagnostics, open a heavy map, open presentation, test audio, and create/move/delete only on a workspace copy.

---

## 2026-07-15: 0.0.1.1.8 Lightweight Operations Regression And Performance Gates

### What Changed

- Completed `0.0.1.1.8`.
- Added `tests/lightweightWorkspaceOperationsGate.test.mjs` as a permanent regression/performance gate for the lightweight workspace operations contract.
- Covered startup `PageIndex`/`TreeIndex` build timing on a large fixture.
- Covered create page with no full backup, repository/tree index visibility, and background checkpoint scheduling.
- Covered same-level reorder as one page write with no backup.
- Covered one-page parent-changing move as a journaled operation with no full backup.
- Covered pending journal visibility for future recovery UI.
- Covered large visible tree row generation budget.
- Removed completed `0.0.1.1.8` from the active plan.

### User Impact

- Future changes that accidentally make normal tree/create/move work heavy should fail `npm run verify`.
- The large-workspace performance direction is now guarded by automated budgets, not just documentation.
- This closes the current lightweight-operations implementation batch; remaining work in `0.0.1.1.0` is the visible native desktop click-through on the real GM workspace.

### Checks

- `node --test tests\lightweightWorkspaceOperationsGate.test.mjs`
- `npm run verify`
- `npm run test:browser`
- `node tools\docs_index.mjs`
- `npm run check:encoding`
- `git diff --check`

### Next

- `0.0.1.1.1`: finish visible native desktop click-through on the known large GM workspace, or continue to `0.0.1.2.1` if we accept the native click-through as manual-owner work for now.

---

## 2026-07-15: 0.0.1.1.7 Tree Order Compaction

### What Changed

- Completed `0.0.1.1.7`.
- Added `js/tree/treeOrderCompaction.js` to detect dense fractional tree order values and build a per-parent compaction plan.
- Connected tree order compaction to `pageStorage`: after a completed reorder/move, the app checks only the affected parent and schedules background compaction when gaps become too small.
- Compaction rewrites only the sibling set for one parent, spaces order values back out by large steps, and skips full workspace backup for this bounded same-parent metadata rewrite.
- Added unit and storage regression coverage for dense-order detection, scoped sibling rewriting, no-op healthy siblings, and background execution.
- Removed completed `0.0.1.1.7` from the active plan.

### User Impact

- Repeated same-level tree sorting can stay cheap over time: fractional `order` values are cleaned up in the background before they become fragile.
- Drag/drop still responds immediately; compaction never runs during pointer drag and does not scan or rewrite the whole workspace.
- This supports the large-workspace target: fast visible tree actions first, maintenance work second.

### Checks

- `node --test tests\treeOrderCompaction.test.mjs tests\storageAdapter.test.mjs tests\backgroundCheckpointQueue.test.mjs`
- `npm run verify`
- `npm run test:browser`
- `node tools\docs_index.mjs`
- `npm run check:encoding`
- `git diff --check`

### Next

- `0.0.1.1.8`: add regression and performance gates for lightweight operations.

---

## 2026-07-15: 0.0.1.1.6 Background Validation And Checkpoint Queue

### What Changed

- Completed `0.0.1.1.6`.
- Added `js/performance/backgroundCheckpointQueue.js` as a deduplicated idle/background job queue.
- Added `js/storage/workspaceCheckpointTasks.js` for workspace validation checkpoints after mutations.
- Connected create page, delete branch, same-level reorder, parent-changing move, and parent update to schedule background checkpoints without awaiting them in the hot path.
- Kept checkpoint work non-repairing: it validates schema/tree/journal state and records status, but does not silently change user data.
- Removed completed `0.0.1.1.6` from the active plan.

### User Impact

- Tree and page actions can finish quickly while heavier validation runs just after the action.
- If the background checkpoint finds schema/tree/journal issues, it records them for diagnostics instead of freezing the current click/drag operation.
- This moves the project closer to the target behavior for large workspaces: immediate visible action first, consistency check second.

### Checks

- `node --test tests\backgroundCheckpointQueue.test.mjs tests\workspaceCheckpointTasks.test.mjs tests\storageAdapter.test.mjs`
- `npm run verify`
- `npm run test:browser`
- `node tools\docs_index.mjs`
- `npm run check:encoding`
- `git diff --check`

### Next

- `0.0.1.1.7`: add order compaction for dense tree order values.

---

## 2026-07-15: 0.0.1.1.3-0.0.1.1.5 Page/Tree Index Validation And Lightweight Tree Operations

### What Changed

- Completed `0.0.1.1.3`: added a dedicated `TreeIndex` read model next to `PageIndex`.
- Completed `0.0.1.1.4`: added a lightweight workspace operation journal in `.my-own-world-ops/`.
- Completed `0.0.1.1.5`: replaced full workspace backup for ordinary create and one-page parent-changing tree moves with journaled lightweight snapshots.
- Kept full backup for branch delete and multi-page parent-changing batch moves.
- Removed completed `0.0.1.1.3`-`0.0.1.1.5` from the active plan.

### User Impact

- Moving one page into another folder no longer pays the cost of copying the whole workspace.
- Same-level reorder still writes only the moved page.
- Create/move actions now leave a small operation trail that can support recovery work without blocking the hot path.
- Large workspace tree work should feel closer to an immediate local action instead of a backup operation.

### Checks

- `node --test tests\treeIndex.test.mjs tests\operationJournal.test.mjs tests\pageRepository.test.mjs tests\storageAdapter.test.mjs`
- `npm run verify`
- `npm run test:browser`
- `node tools\docs_index.mjs`
- `npm run check:encoding`
- `git diff --check`

### Next

- `0.0.1.1.6`: add background validation and checkpoint queue.

---

## 2026-07-15: 0.0.1.1.2 Lightweight Workspace Operations Contract

### What Changed

- Completed `0.0.1.1.2`.
- Added [LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md](../02-architecture/contracts/LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md).
- Removed completed `0.0.1.1.2` from the active plan; implementation continues at `0.0.1.1.3`.

### User Impact

- The project now has a clear rule for fast workspace work: ordinary tree/create/rename/save operations should stay light, while full backup is reserved for destructive and bulk changes.
- This directly supports the goal of very smooth and fast app behavior on large workspaces.

### Checks

- `node tools\docs_index.mjs`
- `npm run check:encoding`
- `git diff --check`

### Next

- `0.0.1.1.3`: add startup `PageIndex` and `TreeIndex` validation pass.

---

## 2026-07-15: Added UI/UX Redesign Plan From Brief

### What Changed

- Read `C:\Users\Aruko\Downloads\MyOwnWorld UI-UX Redesign.docx`.
- Added active plan block `0.0.1.8.0. System UI/UX Redesign`.
- Decomposed the redesign into audit, design contract, foundations proof of concept, component catalogue proof of concept, AppShell proof of concept, migration phases, and visual regression.

### Decision

- The redesign is planned after the current stabilization and release/documentation work.
- The first redesign result must be an audit/report and a small proof of concept, not a full interface rewrite.
- Map, graph, cards, task tracker, and settings must migrate to one shared UI system instead of growing separate visual systems.

---

## 2026-07-15: Lightweight Workspace Operations Planning

### What Changed

- Researched safer patterns for local-first performance and recovery.
- Added priority plan items `0.0.1.1.2`-`0.0.1.1.8`.
- Updated BUG-001 with the new architecture direction.

### Decision

- Full workspace backup should not be the default cost of normal tree work.
- Ordinary create/rename/reorder/move should use indexes, operation journal entries, and small rollback snapshots.
- Full backup stays for branch delete, restore, schema upgrade, bulk repair, import, and other destructive or multi-file operations.
- Heavy validation, index refresh, order compaction, and cleanup should run as background/checkpoint work, not inside the pointer move path.

### Sources Considered

- SQLite WAL documentation: cheap append writes, WAL-index for reads, and checkpointing outside the main write path.
- Microsoft Event Sourcing and CQRS patterns: events plus read models/snapshots for traceable state and fast reads.
- Local-first software principles: local operations should feel fast and should not depend on heavyweight external coordination.

---

## 2026-07-15: Same-Level Tree Move Performance Fix

### What Changed

- Optimized tree sorting on the same level: a reorder now writes only the dragged page instead of rewriting all siblings.
- Changed same-level tree ordering to use an order value between neighboring pages.
- Skipped the risky-operation workspace backup when a tree move keeps the same parent.
- Kept backup protection for moves that change parent/root placement.
- Added browser regression coverage proving same-level reorder writes one page and creates no backup.

### User Impact

- Moving a page up/down within the same folder should feel much faster on a large workspace.
- Moving a page into another folder is still protected by backup, because that changes the page hierarchy.
- Future refinement: add rare order compaction if many repeated reorders make fractional order values too dense.

### Checks

- `node --test tests\treeMovePlanner.test.mjs tests\storageAdapter.test.mjs tests\workspacePerformance.test.mjs`
- `npm run test:browser -- tests/browser/tree-dnd-regression.spec.mjs`
- `npm run verify`
- `node tools\docs_index.mjs`
- `npm run check:encoding`

---

## 2026-07-15: 0.0.1.1.1 Large Workspace Desktop Click-Through Engineering Pass

### What Changed

- Advanced `0.0.1.1.1` through all automatable checks available in the current environment.
- Added [LARGE_WORKSPACE_DESKTOP_SMOKE_2026-07-15.md](./LARGE_WORKSPACE_DESKTOP_SMOKE_2026-07-15.md).
- Confirmed the real workspace `X:\ДНД\Мастер\База` is accessible.
- Ran read-only diagnostics and tree probe against the real workspace.
- Confirmed desktop environment, packaging smoke, full desktop release gate, and executable launch.
- Left the destructive create/move/delete pass for a workspace copy or explicit approval.
- Kept `0.0.1.1.1` active because visible native window click-through cannot be honestly completed by the current agent without a Tauri UI runner or manual owner pass.

### User Impact

- The large workspace itself looks healthy: no missing asset refs, backups are complete, page parsing is fast.
- The remaining risk is visual/runtime behavior inside the native desktop window, especially heavy maps, presentation, and audio.

### Checks

- `npm run diagnostics:workspace -- --workspace "X:\ДНД\Мастер\База" --no-json`
- `node tools\probe_large_workspace_tree_performance.mjs --workspace "X:\ДНД\Мастер\База"`
- `npm run desktop:check`
- `npm run desktop:packaging-smoke`
- `npm run desktop:gate`
- Native executable launch probe: `my-own-world.exe` stayed alive after 10 seconds.

### Next

- Finish the visible manual/native pass for `0.0.1.1.1`.
- Then continue to `0.0.1.2.1`: finalize desktop install and update flow.

---

## 2026-07-15: 0.0.1.1.4-0.0.1.1.6 Large Workspace UI Validation And Diagnostics

### What Changed

- Closed `0.0.1.1.4`: added real browser UI coverage for pointer tree drag/drop, including the batch move path and visible progress panel.
- Closed `0.0.1.1.5`: added an in-app workspace diagnostics panel in Settings.
- Closed `0.0.1.1.6`: diagnostics now shows heavy maps, large pages, asset groups, broken/orphan asset refs, schema issues, recent slow operations, and presentation startup timing.
- Added `js/ui/workspaceDiagnosticsPanel.js`.
- Connected the diagnostics panel in `js/ui/appTopbar.js`.
- Added compact diagnostics styles in `styles/app-topbar.css`.
- Added performance recording for `campaign-map-presentation-open` in `js/editor/campaignMapPresentation.js`.
- Added browser smoke coverage in `tests/browser/tree-dnd-regression.spec.mjs` and `tests/browser/asset-health.spec.mjs`.

### User Impact

- Tree move/delete batch behavior is now checked through real pointer UI, not only model/unit probes.
- The owner can open Settings and run workspace diagnostics without using the terminal.
- Heavy worlds now have a readable in-app summary: pages, maps, assets, broken refs, orphan refs, heavy maps, large pages, and recent slow operations.

### Checks

- `node --check js\ui\workspaceDiagnosticsPanel.js`
- `node --check js\ui\appTopbar.js`
- `node --check js\editor\campaignMapPresentation.js`
- `npm run test:browser` - 74 passed

### Next

- `0.0.1.1.1`: finish visible native desktop click-through on the known large GM workspace.
- Then `0.0.1.2.0`: Desktop Product Hardening.

---

## 2026-07-15: 0.0.1.1.3 Visible Progress UI For Long Operations

### What Changed

- Closed `0.0.1.1.3`: long workspace operations now show a visible progress panel in addition to the statusbar.
- Added `js/ui/operationProgress.js`.
- Added progress panel styles to `styles/ui.css`.
- Connected the panel to existing progress callbacks for manual backup, restore, backup cleanup, incomplete backup scan/cleanup, tree branch delete, and tree drag/drop move.
- The panel shows operation title, stage/message, `current/total`, percent, elapsed time, a progress bar, success/failure state, and a collapse button.
- Added browser smoke coverage in `tests/browser/app-shell.spec.mjs`.

### User Impact

- Large delete, move, backup, restore, and cleanup operations should no longer feel silent or frozen.
- The statusbar still keeps the short text, while the progress panel gives a clearer visual signal.

### Checks

- `node --check js\ui\operationProgress.js`
- `node --check js\ui\ui.js`
- `node --check js\ui\appTopbar.js`
- `node --check js\tree\treeDragDrop.js`
- `node --check js\tree\treeContextMenu.js`
- `node --test tests\workspacePerformance.test.mjs tests\storageAdapter.test.mjs`
- `npm run test:browser` - 72 passed

### Next

- `0.0.1.1.4`: validate batch tree move/delete through real UI drag.

---

## 2026-07-15: 0.0.1.1.2 Large Workspace Performance Smoke

### What Changed

- Closed `0.0.1.1.2`: added a permanent large-workspace performance smoke that does not need the private GM workspace.
- Added `tools/run_large_workspace_performance_smoke.mjs`.
- Added `npm run test:large-workspace`.
- Included the large-workspace smoke in `npm run verify`.
- The smoke creates a synthetic 900-page workspace with maps and assets, then measures page loading, parsing, index/search/wiki lookup, tree visible rows, virtual range, asset checks, map parsing, and create/move/delete mutation.
- Added `tools/run_workspace_diagnostics.mjs` and `npm run diagnostics:workspace` as the CLI foundation for `0.0.1.1.5` and `0.0.1.1.6`.

### User Impact

- CI can now catch large-world performance regressions before they reach the owner workspace.
- For a real workspace, diagnostics can be run with:
  `npm run diagnostics:workspace -- --workspace "X:\path\to\workspace"`.
- The diagnostics report shows counts, largest pages/assets, missing asset refs, heavy maps, and backup health.

### Checks

- `npm run test:large-workspace`

### Next

- `0.0.1.1.3`: finish visible progress UI for long operations.
- `0.0.1.1.5` / `0.0.1.1.6`: expose the new diagnostics inside the app.

---

## 2026-07-15: 0.0.1.0.3 P0/P1 Progress Feedback Fix

### What Changed

- Treated `0.0.1.0.3` as a concrete P0/P1 stabilization fix for large workspace operations that feel frozen.
- Improved shared progress messages in `js/performance/workspacePerformance.js`.
- Statusbar progress now includes `current/total`, percent, and elapsed time when the operation provides progress.
- Backup/restore/backup cleanup progress now gets elapsed time automatically through `backupService.reportProgress()`.
- Tree delete and batch tree move progress now pass elapsed time from `pageStorage.js`.
- Added regression coverage so tree delete and tree move progress events must include `elapsedMs`.

### User Impact

- During risky operations like backup, restore, large delete, and large move, the user gets clearer proof that work is still happening.
- This does not solve every large workspace delay yet, but it reduces the "it broke" feeling while the next performance work continues.

### Checks

- `node --test tests\workspacePerformance.test.mjs tests\backupService.test.mjs tests\storageAdapter.test.mjs`
- `npm run verify`
- `npm run test:browser` - 72 passed

### Next

- Continue inside `0.0.1.1.0`: add permanent large-workspace performance smoke and a fuller visible progress panel for long operations.

---

## 2026-07-14: 0.0.1.1.1 Large Workspace Desktop Smoke Probe

### What Changed

- Ran the measurable part of `0.0.1.1.1` on the real GM workspace `X:\ДНД\Мастер\База`.
- Created [LARGE_WORKSPACE_DESKTOP_SMOKE_2026-07-14.md](./LARGE_WORKSPACE_DESKTOP_SMOKE_2026-07-14.md).
- Confirmed the workspace has 691 pages, 24 maps, 2 task trackers, 669 pages with image refs, 138 asset files, and 458.6 MB of assets.
- Confirmed backup health: 13 complete backups, 0 incomplete backups.
- Ran a safe mutate probe: temporary `perf-probe-*` pages were created, moved, and deleted; no temporary files remained.
- Confirmed file-level operations are fast: read/parse 691 pages in 108 ms, temp page create in 1 ms, move/delete in 0 ms.
- Prepared desktop frontend and confirmed the release `.exe` starts and stays alive for 8 seconds.

### Main Finding

The large workspace slowdown is unlikely to be raw file write performance. The next likely bottlenecks are UI tree render/re-render, asset checks, heavy map images, presentation startup, backup copying, and missing progress feedback.

### Limits

- The visible native desktop click-through is not complete because there is no automated Tauri UI runner yet.
- Real UI drag/drop, context-menu delete, heavy map opening, presentation, and audio playback still need a visible desktop pass.

### Checks

- `node tools\probe_large_workspace_tree_performance.mjs --workspace "X:\ДНД\Мастер\База" --mutate`
- `npm run desktop:prepare`
- desktop executable launch probe

### Next

- Continue inside `0.0.1.1.0`: add permanent large-workspace performance smoke and progress UI for long operations.

---

## 2026-07-14: 0.0.1.0.3-0.0.1.0.5 Stabilization Follow-Up

### What Changed

- Closed the remaining `0.0.1.0.x` stabilization housekeeping after the green smoke pass.
- `BUG-002` is no longer treated as a vague active blocker without reproduction. It stays in [BUG_INVENTORY.md](./BUG_INVENTORY.md) as a watch-list item until a concrete broken flow is reported.
- Added [MANUAL_SMOKE_CHECKLIST.md](../03-testing/MANUAL_SMOKE_CHECKLIST.md) so human checks are short, readable, and repeatable.
- The active plan now moves to the first concrete unresolved risk: real desktop smoke on the large GM workspace.

### Checks

- Documentation-only change. Run after this update:
  - `node tools\docs_index.mjs`
  - `npm run check:encoding`
  - `git diff --check`

### Next

- `0.0.1.1.1`: run a real desktop smoke on the known large GM workspace.

---

## 2026-07-14: 0.0.1.0.2 Browser And Desktop Smoke Pass

### What Changed

- Closed `0.0.1.0.2` by creating [SMOKE_PASS_2026-07-14.md](./SMOKE_PASS_2026-07-14.md).
- Browser smoke is green, and a live Playwright probe confirmed the app shell, sidebar, topbar, create menu, statusbar, and no console errors on startup.
- Desktop gate is green: verify, browser smoke, desktop prepare, packaging smoke, desktop environment check, and Tauri `cargo check` passed.
- The release executable started and stayed alive for 5 seconds.

### Limits

- The Codex in-app browser blocked localhost with `ERR_BLOCKED_BY_CLIENT`, so the manual browser probe used Playwright.
- The desktop `.exe` check was a launch probe, not a full visible real-workspace walkthrough.
- Real large workspace desktop testing remains active as `0.0.1.1.1`.

### Checks

- `npm run desktop:gate`
- Playwright live browser probe

### Next

- `0.0.1.0.3`: fix confirmed P0/P1 broken flows before new feature work.

---

## 2026-07-14: 0.0.1.0.1 Bug Inventory

### What Changed

- Closed `0.0.1.0.1` by creating [BUG_INVENTORY.md](./BUG_INVENTORY.md).
- The inventory separates confirmed user complaints, high-risk areas, automated coverage, and missing manual/desktop verification.
- The active plan now points to the inventory instead of keeping the full bug list inline.

### Main Findings

- Browser smoke is currently green: `npm run test:browser` passed 72 tests.
- P0 focus is still stabilization, especially large workspace behavior, desktop verification, and broad user-reported broken functions that need concrete reproduction.
- P1 focus includes campaign map presentation/drawing/music, Properties/CharacterModel UX, task tracker legacy workspaces, Knowledge Graph visual expectations, recovery UX, and docs readability checks.
- `debug.log` remains local untracked noise and was not committed.

### Checks

- `npm run test:browser`

### Next

- `0.0.1.0.2`: run a manual smoke pass in browser and desktop using `BUG_INVENTORY.md` as the checklist.

---

## 2026-07-14: 0.0.0.7.6 Tree Virtualization For Large Workspaces

### Что сделано

- Закрыт `0.0.0.7.6`: дерево теперь виртуализируется для больших workspace.
- Добавлен `js/tree/treeVirtualization.js`: строит плоский список видимых строк с уровнями вложенности, учитывает collapsed branches и считает видимое окно по scroll.
- `renderTree()` включает virtual-mode только после порога 250 видимых строк. Маленькие деревья остаются в старом полном рендере, чтобы не менять привычное поведение.
- Для больших деревьев DOM содержит только строки вокруг текущего viewport с overscan, а не сотни/тысячи `.tree-item`.
- `renderTreePage()` разделен на рекурсивный renderer и `createTreePageElement()`, поэтому virtual-mode использует те же обработчики open page, context menu, toggle, duplicate title warning и pointer DnD.
- `revealPageInTree()` научен прокручивать виртуальное дерево к странице, которой еще нет в DOM, и затем подсвечивать ее.
- Добавлены стили `.tree.is-virtualized`, фиксирующие высоту строки только в virtual-mode, чтобы scroll math был стабильным.
- Добавлен browser smoke на 520 страниц: проверяет, что дерево включило virtual-mode, DOM короткий, а дальняя страница находится через reveal.

### Проверки

- `node --check js\tree\tree.js`
- `node --check js\tree\treeRender.js`
- `node --check js\tree\treeVirtualization.js`
- `node --test tests\treeVirtualization.test.mjs`
- `npm run verify`
- `npm run test:browser` - 72 passed

### Следующее

- `0.0.0.7.8`: добавить desktop/performance smoke на реальном большом workspace, включая загрузку, поиск/wiki lookup и карту.

---

## 2026-07-14: 0.0.0.7.3-0.0.0.7.4 Real Workspace Backup And Tree Performance

### Что сделано

- Закрыт `0.0.0.7.3`: page-first risky backup закреплен для tree delete/move, а перенос дерева больше не делает полный `loadWorkspace()` после drop. Вместо этого дерево обновляет текущую страницу из уже измененного `state.pages` и перерисовывается локально.
- Закрыт `0.0.0.7.4`: добавлены `listIncompleteWorkspaceBackups()` и `cleanupIncompleteWorkspaceBackups()`.
- В popup настроек backup добавлены кнопки проверки и удаления недособранных backup. Сначала показывается список папок без `manifest.json` и размер, удаление требует отдельного подтверждения.
- Добавлена защита: cleanup недособранных backup повторно сверяет список и не удаляет валидные backup даже если их id случайно передали в команду удаления.
- Добавлен regression-тест, который передает в cleanup одновременно валидный backup и недособранный backup; удаляется только недособранный.
- Добавлен инструмент `tools/probe_large_workspace_tree_performance.mjs` для безопасного замера большого workspace: он создает временные `perf-probe-*` страницы, замеряет write/move/delete и удаляет их в `finally`.
- На реальном workspace `X:\ДНД\Мастер\База` выполнен probe: 691 markdown-страница, `pages.readDirectory` 246 мс, `pages.readAndParse` 5337 мс, parent-index 1 мс, создание temp-страниц 2 мс, move 0 мс, delete 0 мс. Вывод: дорогая часть была не запись move/delete, а полная перечитка всех страниц после drop.
- В `X:\ДНД\Мастер\База\.my-own-world-backups` найдено 12 недособранных backup без `manifest.json`; после явного подтверждения они удалены, контрольный скан больше не находит недособранные backup.

### Проверки

- `node --check js\storage\backupService.js`
- `node --check js\ui\appTopbar.js`
- `node --check js\tree\treeDragDrop.js`
- `node --check tools\probe_large_workspace_tree_performance.mjs`
- `node --test tests\backupService.test.mjs`
- `node --test tests\storageAdapter.test.mjs`
- `node --test tests\workspacePerformance.test.mjs`
- `node tools\probe_large_workspace_tree_performance.mjs --workspace "X:\ДНД\Мастер\База" --mutate`
- Read-only scan `.my-own-world-backups` before and after cleanup.

### Следующее

- `0.0.0.7.6`: виртуализировать дерево для больших workspace, чтобы рендер/target calculation не упирались в сотни DOM-узлов.
- `0.0.0.7.8`: добавить постоянный desktop/browser performance smoke на большой workspace или синтетический workspace 1k+ страниц.

---

## 2026-07-14: 0.0.0.7 Workspace Scale Performance Pass 2

### Что сделано

- Продолжен P0-блок `0.0.0.7.1-0.0.0.7.2`.
- Добавлен общий слой `js/performance/workspacePerformance.js`: операции workspace теперь можно измерять единообразно через `measureWorkspaceOperation()`, хранить последние события и форматировать понятный progress message.
- Метрики подключены к долгим операциям: `backup.create`, `backup.restore`, `backup.cleanup`, `tree.deleteBranch`, `tree.moveBatch`.
- Progress callbacks прокинуты в UI: перенос в дереве, удаление ветки, ручной backup, restore и cleanup backup пишут этап и счетчик в statusbar.
- Добавлены regression-тесты на performance history, failed/completed events, bounded history, progress callbacks для большого удаления ветки и batch move.
- В план внесен честный статус: foundation для `0.0.0.7.1-0.0.0.7.2` сделан частично; реальный desktop/browser замер на `X:\ДНД\Мастер\База`, asset scan progress и более заметный long-running UI остаются следующими хвостами.

### Проверки

- `node --check js\performance\workspacePerformance.js`
- `node --check js\storage\backupService.js`
- `node --check js\storage\pageStorage.js`
- `node --check js\tree\treeDragDrop.js`
- `node --check js\tree\treeContextMenu.js`
- `node --check js\ui\appTopbar.js`
- `node --test tests\workspacePerformance.test.mjs`
- `node --test tests\storageAdapter.test.mjs`
- `node --test tests\backupService.test.mjs`

### Следующее

- Прогнать полный `npm run verify`, browser smoke и docs index.
- После подтверждения перейти к оставшимся хвостам `0.0.0.7`: asset scan/cleanup progress, cleanup недособранных backup и реальные desktop-метрики большого workspace.

---

## 2026-07-14: 0.0.0.7 Workspace Scale Performance Pass 1

### Что сделано

- Начат P0-блок `0.0.0.7 Workspace Scale & Performance Gate`.
- Ускорен `PageRepository / PageIndex`: `PageIndex` теперь умеет точечно добавлять, обновлять и удалять страницы без полной пересборки индекса.
- `notifyPageMoved(previousPage, nextPage)` и `notifyPageUpdated(previousPage, nextPage)` обновляют индекс инкрементально. Fallback на полный rebuild оставлен для старого кода, который пока не передает состояние до/после.
- Удаление ветки страницы ускорено: `collectPageBranch()` больше не делает рекурсивный `state.pages.filter(...)` на каждом узле, а строит parent-index за один проход.
- DnD дерева больше не создает risky backup на каждый измененный sibling. Новый `updatePageTreePositions()` применяет план переноса пачкой: один backup на весь drop, затем минимальные записи измененных страниц.
- Обновлены `PAGE_REPOSITORY_CONTRACT.md` и `BACKUP_AND_RECOVERY_CONTRACT.md`, чтобы новое правило было видно в архитектуре.
- В план внесены статусы: `0.0.0.7.7` закрыт, `0.0.0.7.5` и `0.0.0.7.8` частично закрыты.

### Проверки

- `node --test tests\pageRepository.test.mjs`
- `node --test tests\storageAdapter.test.mjs`

### Следующее

- Добить `0.0.0.7.1-0.0.0.7.2`: реальные desktop-метрики и progress UI для долгих операций.
- Добить `0.0.0.7.4`: безопасная очистка недособранных backup.
- Проверить сценарий на реальном большом workspace `X:\ДНД\Мастер\База`.

---

## 2026-07-11: Entity Create Move Delete Lifecycle Hardening

- Audited the full entity lifecycle: creation writes the page into `state.pages`, tree move writes through `updatePageTreePosition()`, map drop creates a duplicate/token from the current page index, and deletion removes the branch plus cleans map tokens.
- Fixed stale page-object handling: delete and tree move now resolve the live page from `state.pages` by id before mutating or writing, so context menus/popups/desktop shell snapshots cannot write through an old object.
- Decoupled page deletion from campaign-map token cleanup: if token cleanup fails after the page file is already deleted, the tree deletion remains successful and shows a partial cleanup status instead of the misleading generic delete failure.
- Added regression coverage for missing page files, stale delete snapshots, stale move snapshots, context-menu delete, map-token cleanup failure, and cursor-based Properties field placement.
- Checks: `node --test tests/storageAdapter.test.mjs`, full `npm run test:browser`, `npm run verify`.

## 2026-07-11: Delete And Properties Drag Fix

### Что сделано

- Удаление страницы теперь чистит `state.pages` по `id`, а не по ссылке на объект. Это закрывает случай, когда контекстное меню держит старый snapshot страницы после перерендера/обновления индекса.
- Сохранен предыдущий hardening удаления: отсутствующий `.md` файл больше не блокирует удаление записи из дерева.
- DnD полей блока `Свойства` теперь рассчитывает целевую ячейку по координате курсора внутри сетки, а не по левому верхнему углу перетаскиваемого поля. При перетаскивании за правый/нижний край поле больше не "отстает" от точки сброса.
- Добавлены regression-тесты: удаление по stale object и точный drop поля в указанную ячейку сетки.

### Проверки

- `node --test tests\storageAdapter.test.mjs`
- `npm run test:browser -- --grep "property-field-drag-drops-to-cursor-grid-cell|tree-context-delete"` (runner выполнил полный browser smoke: 70 passed)
- `npm run verify`

## 2026-07-10: Delete Flow Hardening

### Что сделано

- Исправлен крайний случай удаления: если карточка осталась в дереве/`state.pages`, но ее `.md` файл уже отсутствует в workspace после частичной операции или ручного удаления, повторное удаление больше не блокируется.
- `deletePageBranch()` теперь считает missing file успешным удалением записи, но продолжает пробрасывать реальные ошибки доступа/записи.
- Добавлен browser regression на пользовательский сценарий дерева: `... -> Удалить -> подтвердить`, включая создание backup и удаление всей ветки.
- Добавлен unit regression на stale page record без файла.

### Проверки

- `node --test tests\storageAdapter.test.mjs`
- `cargo check` в `src-tauri`
- `npm run verify`
- `npm run test:browser`
- `npm run desktop:build`
- `node tools\check_desktop_packaging_smoke.mjs`

## 2026-07-10: Knowledge Graph 0.0.0.6.6-0.0.0.6.11 Completion

### Что сделано

- Закрыт остаток блока `0.0.0.6`.
- В `Граф связей` добавлен readable foundation исследования мира: быстрые центры мира, количество одиноких страниц и подсказка следующего действия.
- Добавлены человеко-читаемые доменные сценарии: `Персонажи`, `Предметы`, `Организации`, `Правила`.
- У каждого домена есть быстрый переход в отфильтрованный список связей.
- Rule Tree связан с будущей моделью ролей и прав через явную access policy: owner `admin`, чтение `admin/player/viewer`, редактирование `admin`.
- Модель графа получила `getKnowledgeGraphDomainInsights()`, `getKnowledgeGraphExplorationHints()` и `getKnowledgeGraphAccessPolicy()`.
- Unit/browser regression расширены проверками доменных сценариев, организаций и Rule Tree access foundation.

### Проверки

- `node --test tests\knowledgeGraph.test.mjs`
- `npm run test:browser -- --grep knowledge-graph` запускал весь browser smoke; первый прогон нашел ошибку тестового ожидания после доменного shortcut, тест исправлен.
- `npm run verify`
- `node tools\docs_index.mjs`
- `node tools\validate_agent_skills.mjs`

### Следующий пункт

После финального полного прогона проверок можно переходить к следующему активному блоку плана после `0.0.0.6`.

## 2026-07-10: Knowledge Graph 0.0.0.6.1-0.0.0.6.5 Recheck

### Что сделано

- Повторно проверен блок `0.0.0.6.1-0.0.0.6.5`.
- `Граф связей` остается отдельной сущностью, доступной из `+`.
- Первый экран графа - readable `Карта связей`, а не сложный canvas-инструмент.
- Вкладка `Связи` содержит простую форму typed relationship: источник, тип, цель, подпись.
- Ручные связи сохраняются в front matter исходной карточки как `relationshipsJson`, читаются в `parseMarkdown()` как `page.relationships` и сохраняются обычным autosave/special-page save.
- Вкладка `Одинокие страницы` оставлена отдельным человеко-читаемым orphan pages view.
- Rule Tree / Rules Knowledge Base закрыт на текущем уровне: Rule Tree существует как отдельная сущность, граф показывает домен `Правила` и умеет связывать правила с другими страницами через typed relationships.
- Контракт `docs/02-architecture/KNOWLEDGE_GRAPH_ENTITY_CONTRACT.md` восстановлен в читаемой кодировке.

### Проверки

- `npm run verify`
- `npm run test:browser`
- `node tools/docs_index.mjs`
- `node tools/validate_agent_skills.mjs`

### Что остается дальше

- `0.0.0.6.6`: роли и права для Rule Tree, когда появится roles/permissions слой.
- `0.0.0.6.7-0.0.0.6.10`: специализированные сценарии исследования связей персонажей, предметов, организаций и правил.
- `0.0.0.6.11`: дальнейший foundation визуального исследования мира без перегруза интерфейса.


## 2026-07-06: Data Recovery And Storage Hardening 0.0.0.5.6-0.0.0.5.7

### Что сделано

- Закрыт блок `0.0.0.5`: добавлены обязательные automatic snapshots перед рискованными операциями дерева и UI настройки backup retention.
- `deletePageBranch()`, `updatePageParent()` и `updatePageTreePosition()` теперь используют `requireWorkspaceBackupBeforeRiskyOperation()`: если backup не создан, операция останавливается до изменения файлов или in-memory metadata.
- `backupService` получил persisted retention limit: `myOwnWorld.backup.retentionLimit`, нормализация `1..200`, использование лимита при cleanup после создания backup.
- Popup настроек получил compact retention-control: изменить лимит, сохранить его и вручную очистить старые backup по текущему лимиту.
- `BACKUP_AND_RECOVERY_CONTRACT.md` обновлен правилом mandatory snapshot gate и retention UI.
- Добавлены unit/browser checks для retention settings и settings popup.

### Проверки

- `node --check js\storage\backupService.js`
- `node --check js\storage\pageStorage.js`
- `node --check js\ui\appTopbar.js`
- `node --check tests\backupService.test.mjs`
- `node --check tests\browser\app-shell.spec.mjs`
- `node --test tests\backupService.test.mjs tests\storageAdapter.test.mjs`
- `npm run test:browser -- --grep "app-shell-empty-state|schema-recovery"` (runner completed full browser suite: 67 passed)

### Следующий пункт

Следующий активный блок плана: `0.0.0.6. Knowledge Graph И Rule Tree`.
## 2026-06-30: Campaign Map Music AIMP-Like Playlist

### Что сделано

- Пересмотрен текущий музыкальный popup карты: MVP работал, но был слишком похож на форму управления настройками, а не на живой плейлист.
- Popup музыки карты переработан в компактный AIMP-like вид: сверху mini-player с текущим треком, ниже плотные controls, режим normal/battle и динамический список.
- Строки плейлиста стали кликабельными: клик по треку запускает его, активная строка подсвечивается.
- Убран лишний промежуточный список добавленных файлов под import flow; видимым источником правды остается основной список плейлиста.
- Сохранены два режима музыки карты, loop/shuffle/order, previous/next/play/stop, copy playlist from other map и autostart первой песни при переключении карты.
- Browser regression расширен проверкой запуска трека кликом по строке, подсветки активного трека и отображения текущего трека в mini-player.

### Проверки

- `node --check js\editor\campaignMapMusic.js`
- `npm run test:browser -- --grep "campaign-map-music"`

## 2026-06-23: Recovery Screen Repair-Action Foundation

### Что сделано

- По плану закрыт пункт `0.0.0.5.1` как foundation.
- `createWorkspaceRecoveryReport()` теперь добавляет к критичным ошибкам `repairAction`.
- Recovery screen показывает безопасные действия после backup и отдельно помечает проблемы, где пока нужна ручная правка.
- Первый набор безопасных действий: broken parent -> вывести страницу в корень, token missing page -> убрать сломанный токен карты, task broken reference -> очистить ссылку на отсутствующую задачу.
- Фактическая запись repair-actions в workspace оставлена на `0.0.0.5.2`, чтобы делать ее вместе с backup gate и storage/browser tests.

### Проверки

- `node --check js\schema\schemaRecovery.js`
- `node --check js\editor\editorEmptyPage.js`
- `node --check tests\schemaValidation.test.mjs`
- `node --check tests\browser\schema-recovery.spec.mjs`
- `node --test tests\schemaValidation.test.mjs`
- `npm run test:browser`

## 2026-06-23: Campaign Map Music Autostart On Map Switch

### Что сделано

- При открытии карты запускается первая песня активного плейлиста этой карты.
- При переключении с одной карты на другую предыдущая карта останавливает свой audio перед стартом музыки новой карты.
- Autoplay-ошибка не ломает открытие карты: исключение перехватывается и выводится в консоль.
- Добавлен browser regression на сценарий переключения карт и запуск первого трека активного плейлиста.

### Проверки

- `node --check js\editor\campaignMapMusic.js`
- `node --check js\editor\campaignMap.js`
- `node --check tests\browser\campaign-map-ui.spec.mjs`
- `npm run test:browser`

## 2026-06-19: Campaign Map Music Popup Polish

### Что сделано

- Убран второй список песен под блоком добавления: popup больше не сканирует `assets/music` при каждом render и показывает только активный плейлист.
- Выбранные файлы теперь отображаются одной компактной строкой `Выбрано файлов: N`, без длинного списка под кнопкой добавления.
- Play/previous/next/mode switch больше не глотают ошибку запуска аудио молча: popup показывает статус `грает`, `Остановлено`, пустой плейлист или конкретную ошибку воспроизведения.
- Элемент `Audio` прикрепляется к DOM в браузерном окружении, а кнопки управления музыкой выровнены как одинаковые квадратные icon buttons.

### Проверки

- `node --check js\editor\campaignMapMusic.js`
- `node --check tests\browser\campaign-map-ui.spec.mjs`
- `npm run test:browser` (после исправления regression ожидания)
- `npm run verify`

## 2026-07-07: Knowledge Graph Domain Focus 0.0.0.6.5-0.0.0.6.11

- Rule Tree уже существовал как отдельная сущность и система; граф теперь умеет показывать rule/domain связи через readable focus.
- В `Граф связей` добавлены доменные карточки: персонажи, предметы, организации, правила.
- В список связей добавлен фильтр `Все связи / Персонажи / Предметы / Организации / Правила`.
- Домены строятся из `type`, `template` и `tags`, поэтому граф понимает обычные карточки, ruleTree-страницы и будущие typed relationships.
- Пункт `0.0.0.6.6` не закрывался кодом: связь Rule Tree с ролями и правами зависит от будущего блока `0.0.0.16 Account / Roles / Permissions`.

Проверки:

- `node --check js/wiki/knowledgeGraph.js`
- `node --check js/wiki/knowledgeGraphPage.js`
- `node --test tests/knowledgeGraph.test.mjs`
- `npm run test:browser -- --grep knowledge-graph` (runner выполнил полный набор: 68 passed)

## 2026-06-19: Campaign Map Music Playlists

### Что сделано

- В план добавлен и закрыт пункт `0.0.0.4.10`.
- У карты появился model-first music state: два плейлиста `Обычная музыка` и `Боевая музыка`, активный режим, порядок `по списку/случайно`, loop и список треков.
- Popup `Музыка карты` показывает песни из `assets/music`, позволяет выбрать новые audio-файлы, увидеть их в очереди, кнопкой `Добавить` сохранить их в workspace/активный плейлист, удалить треки, переименовать плейлист и скопировать плейлист с другой карты.
- Переключатель `Обычная / Бой` сразу меняет активный плейлист и запускает первую песню; добавлены кнопки play, stop, previous, next, shuffle и repeat.
- `assetReferenceScanner` теперь собирает `audio` references из `data-map-music-state`, чтобы broken/orphan assets учитывали музыку карты.

### Проверки

- `node --test tests/campaignMapModel.test.mjs tests/assetReferenceScanner.test.mjs`

## 2026-06-18: Campaign Map v2 Hardening - initiative, drawing, token skills, presentation sync

### Что сделано

- Закрыта пачка `0.0.0.4.6`-`0.0.0.4.9` перед переходом к `0.0.0.5`.
- Инициатива карты получила ручной ввод значений, roll d20, отдельное окно порядка ходов и сохранение состояния.
- В карту добавлен popup `Рисование`: карандаш, перо, ластик, заливка, выбор цвета и последние цвета.
- Рисунки сохраняются в модели карты, отображаются в слоях и восстанавливаются после открытия.
- В контекстное меню токена добавлен раздел `Навык / действие`: список навыков берется из `CharacterModel`, результат показывается на карте.
- Presentation delta-sync обновляет движение токенов/фигур и связанные визуальные эффекты без полной перерисовки сцены.
- Добавлены browser regressions для drawing tools и token skill action.

### Проверки

- `node --check js\editor\campaignMapDrawing.js`
- `node --check js\editor\campaignMapTokenPopupController.js`
- `node --check js\editor\campaignMapTokenDrag.js`
- `node --check js\editor\campaignMapShapeDrag.js`
- `node --check js\editor\campaignMapInitiativePopup.js`
- `node --check tests\browser\campaign-map-ui.spec.mjs`
- `npm run test:browser` ? 63 passed.

## 2026-06-18: Campaign Map v2 Hardening - locked fog, dirty-region model metadata, mass select

### Что сделано

- По плану закрыты пункты `0.0.0.4.3`-`0.0.0.4.5`.
- справлен `clearFog()`: больше нет обращения к несуществующим `point/size`, очистка тумана помечает весь canvas как измененный регион.
- Locked fog zones теперь защищают всю область кисти, а не только центральную точку brush stroke.
- `CampaignMapModel` сохраняет `fog.dirtyRegionCount` и `fog.lastDirtyRegion`; `CampaignMapStore.updateFog()` получил безопасный `commit: false`, чтобы мазки тумана не вызывали дорогой DOM commit на каждый pointer move.
- Добавлен browser regression на locked fog zone: move, resize, double-click delete и блокировка paint/erase внутри защищенной области.
- Добавлен browser regression на mass select: Shift-selection box выделяет токены и фигуры, а drag выбранного токена двигает всю группу.

### Проверки

- `node --check js\editor\campaignMapFog.js`
- `node --check js\editor\campaignMapModel.js`
- `node --check js\editor\campaignMapStore.js`
- `node --check tests\browser\campaign-map-ui.spec.mjs`
- `node --test tests\campaignMapModel.test.mjs`
- `npm run test:browser`
- `npm run docs:index`

## 2026-06-18: Campaign Map v2 Hardening - real pointer fog paint stress

### Что сделано

- По плану закрыт пункт `0.0.0.4.2`.
- В performance scenarios добавлен `fogPointerPaintStress`.
- Browser regression теперь проверяет реальный pointer-маршрут тумана: `pointerdown` на stage, `pointermove` и `pointerup` на document, как в рабочей карте.
- Тест проверяет, что реальная кисть тумана увеличивает `fogVersion`, записывает `dirtyFogRegionCount` и остается внутри performance budget.
- Сценарий специально не использует прямой `canvas.arc()` как единственный путь: synthetic canvas smoke остался отдельно, а новый тест защищает wiring controller -> fog drawing -> dirty regions.

### Проверки

- `node --check js\editor\campaignMapPerformance.js`
- `node --check tests\browser\campaign-map-performance.spec.mjs`
- `node --test tests\campaignMapPerformance.test.mjs`
- `npm run test:browser`

## 2026-06-18: Campaign Map v2 Hardening - large map stress gate

### Что сделано

- По плану закрыт пункт `0.0.0.4.1`.
- В `campaignMapPerformance` добавлен сценарий `largeMapStress` для больших карт: 260+ токенов, 120+ фигур, 10+ слоев и 180+ dirty fog regions.
- В performance snapshot добавлена метрика `layerCount`, чтобы regression видел не только токены/фигуры/fog, но и сложность слоев.
- Добавлен детерминированный `createCampaignMapStressModelData()`, чтобы unit/browser тесты использовали один и тот же большой fixture.
- Unit regression проверяет budgets и падение при превышении `dirtyFogRegionCount`.
- Browser smoke строит большую DOM-карту из `CampaignMapModel` и проверяет, что counts и budget report остаются в рамках сценария.
- Обновлена performance strategy: `large-map-stress` описан как отдельный сценарий.

### Проверки

- `node --check js\editor\campaignMapPerformance.js`
- `node --check tests\campaignMapPerformance.test.mjs`
- `node --check tests\browser\campaign-map-performance.spec.mjs`
- `node --test tests\campaignMapPerformance.test.mjs`
- `npm run test:browser`
- `npm run verify`
- `npm run docs:index`

## 2026-06-16: Asset Lifecycle UI и Media Foundation

### Что сделано

- По плану закрыта пачка `0.0.0.3.2`-`0.0.0.3.7`.
- Панель `Проверка ассетов` теперь показывает не только broken references, но и orphan-файлы из `assets/`.
- Для orphan-файлов добавлено безопасное удаление: пользователь подтверждает действие, перед удалением создается backup workspace.
- Для отсутствующих картинок добавлен видимый missing/fallback placeholder, чтобы карточка или карта не превращалась в “пустое место”.
- `AssetReference` расширен: `audio` и `playlist` стали first-class asset types, scanner читает `data-audio-asset`, `data-playlist-asset` и asset-поля свойств.
- Добавлен foundation для `Music by Location`: serializable model/helper, ссылки на audio/playlist, volume/loop/autoplay и поля музыки в `Свойствах локации`.
- Asset lifecycle вынесен на общий adapter-level API, чтобы browser и desktop использовали одну точку входа для list/delete assets.

### Проверки

- `node --check js\ui\assetHealthPanel.js`
- `node --check js\storage\assetWorkspaceService.js`
- `node --check js\storage\locationMusic.js`
- `node --check js\storage\assetReferenceScanner.js`
- `node --check js\storage\assetStorage.js`
- `npm run verify`
- `npm run test:browser`
- `npm run docs:index`

## 2026-06-16: UI проверки broken assets

### Что сделано

- По плану закрыт пункт `0.0.0.3.1`: в окно настроек приложения добавлена панель `Проверка ассетов`.
- Панель использует существующий `findBrokenAssetReferences`, читает папку `assets/` через активный storage adapter и показывает список persistent-ссылок на файлы, которых нет в workspace.
- Проверка работает как безопасная диагностика: она не удаляет файлы, не переписывает карточки и не пытается автоматически чинить пути.
- Добавлен browser-regression `asset-health-panel-reports-broken-references`, который проверяет, что UI показывает потерянный asset path.
- Обновлены `PROJECT_PLAN.md`, `ASSET_LIFECYCLE_CONTRACT.md`, release notes и tester instructions.

### Проверки

- `node --check js\ui\assetHealthPanel.js`
- `node --check js\ui\appTopbar.js`
- `npm run verify`
- `npm run test:browser`

## 2026-06-15: Стандартная раскладка `Свойств` взята из пользовательского эталона

### Что сделано

- з карточки `X:/ДНД/Мастер/База/pages/1781529905510-e2c14cf8.md` извлечены координаты `data-property-x/y/span/rows` для блока `Свойства`.
- Стартовый layout персонажа/существа в `createPropertiesBlock` заменен на эту раскладку:
  - верх: `Уровень`, `КЗ`, HP, временные HP и death saves;
  - вторая строка: `Скорость` и `Доспех`;
  - характеристики: `СЛ`, `ЛОВ`, `НТ`, `МДР`, `ТЛС`, `ХАР`;
  - навыки: узкими колонками под соответствующими характеристиками.
- Regression-тест стартовой раскладки обновлен, чтобы защищать новый эталон и проверять layout skill-групп через `data-property-id`.

### Проверки

- `node --check js\templates\blockTypes.js`
- `node --check tests\propertyBlocks.test.mjs`
- `node --test tests\propertyBlocks.test.mjs`

## 2026-06-15: UX-hotfix блока `Свойства`

### Что сделано

- справлено ощущение запаздывания при переносе полей: drop-позиция теперь считается от фактической точки захвата поля, а не от координаты курсора как от левого верхнего угла.
- Убрана явная grid-кнопка переноса. Drag запускается с границы поля, а resize-точки продолжают отвечать только за изменение размера.
- Поле `Доспех` переведено на select по карточкам типа `Предмет`, чтобы персонаж выбирал существующий предмет так же естественно, как в списочных блоках.
- `Состояния` и `Эффекты` убраны из стартовых `Свойств` персонажа/существа, но оставлены как пресеты для ручного добавления через шестеренку.
- Для навыков введено три состояния владения: нет, владение, экспертность. Экспертность учитывается в расчетах как двойной бонус мастерства и сохраняется в переменных карточки.
- справлены подписи полей в popup шестеренки, адаптивность групп навыков при сужении и переполнение элементов ввода за рамки поля.

### Проверки

- `node --check js\editor\propertiesSettingsPopup.js`
- `node --check js\templates\blockTypes.js`
- `node --check js\editor\propertiesAutoCalculations.js`
- `node --check js\properties\propertiesCalculationEngine.js`
- `node --test tests\propertyBlocks.test.mjs`
- `node --test tests\propertiesCalculationEngine.test.mjs`
- `npm run test:browser`
- `npm run verify`

## 2026-06-15: Свободная сетка `Свойств` персонажа

### Что сделано

- `Свойства` переведены с DOM-перестановки на координатное размещение `x/y/w/h`: drag кладет поле в клетку под курсором, а не в индекс между соседями.
- Если поле попадает на занятую область, конфликтующие поля сдвигаются вниз, поэтому свободная сетка не допускает визуального наложения.
- `synchronizePropertyBlockLayout` больше не стягивает поля к началу сетки, поэтому пустые строки и разрывы сохраняются как пользовательский layout.
- Resize слева/сверху теперь меняет соответствующую сторону поля через координаты, а не двигает поле в DOM.
- Новые пользовательские поля получают ближайшее свободное место.
- Для персонажа/существа задана стартовая раскладка: компактные боевые поля сверху, HP отдельной строкой, шесть характеристик на одной строке.

### Проверки

- `node --check js\editor\propertiesSettingsPopup.js`
- `node --check js\templates\blockTypes.js`
- `node --check js\properties\propertyLayoutModel.js`
- `node --test tests\propertyBlocks.test.mjs`
- `npm run test:browser`

### Следующее развитие

- Следующий плановый пункт остается в `docs/01-delivery/PROJECT_PLAN.md`; новых хвостов по свободной сетке не добавлено.

## 2026-06-15: Добавлен skill минимального достаточного изменения

### Что сделано

- зучен подход `Ponytail`: перед реализацией агент должен сначала проверить, можно ли не строить новую систему, использовать стандартную платформу, существующую зависимость или самый маленький безопасный патч.
- Подход адаптирован под MyOwnWorld как собственный skill `.agents/skills/minimal-change/SKILL.md`, без копирования чужого репозитория и без подключения внешнего плагина.
- Skill закрепляет проектную лестницу решения: `не строить` -> `существующий проектный слой` -> `платформа` -> `установленная зависимость` -> `маленький патч` -> `новая модель/сервис`.
- В skill отдельно зафиксировано, что нельзя упрощать: validation, sanitizer, backup/recovery, storage adapters, accessibility, P0/P1 tests и release handoff.
- `AGENTS.md` и `README.md` обновлены, чтобы будущий агент видел skill в обычном workflow.

### Проверки

- Запланированы `node tools/validate_agent_skills.mjs`, `node tools/docs_index.mjs` и `npm run verify`.

### Следующее развитие

- спользовать `minimal-change` перед крупными фичами и refactoring-задачами, особенно когда есть риск создать новый слой вместо расширения `PropertiesModel`, `CharacterModel`, `CampaignMapModel`, `StorageAdapter` или существующих popup/block contracts.

## 2026-06-15: Лист персонажа получил DnD-организацию

### Что сделано

- `Лист персонажа` перестроен как runtime-витрина в духе бумажного DnD-листа: шапка персонажа, уровень/БМ, КЗ, хиты, death saves, строка инициативы/скорости/пассивного восприятия/состояний, затем характеристики с навыками.
- Навыки и спасброски теперь выводятся прямо внутри карточек характеристик и читаются из `PropertiesModel`.
- `Свойства` остались единственным persistent-источником игровых чисел: лист по-прежнему записывает редактируемые значения обратно в блок `Свойства`.
- справлен fallback пустых числовых свойств: пустой навык в `Свойствах` не превращается в `0`, а наследует расчетный fallback от модификатора характеристики.
- Browser regression `character-sheet-block-renders-character-model-summary` обновлен под новую полную подпись `Класс защиты`.

### Проверки

- `node --check js\editor\characterSheetBlock.js`
- `node --test tests\characterModel.test.mjs tests\propertyBlocks.test.mjs tests\propertiesCalculationEngine.test.mjs`
- `npm run test:browser`

### Следующее развитие

- Следующий плановый шаг остается в активном `PROJECT_PLAN.md`; новых хвостов по этой внеплановой UI-правке не добавлено.

## 2026-06-15: Internal rules workspace content layer закрыт

### Что сделано

- Закрыт оставшийся хвост блока `0.0.0.1.17.3`, включая `0.0.0.1.17.3.6`.
- Добавлен program-owned файл `assets/rules/internal-rules-workspace.json` с owner `admin`, version, rootId и стартовым DnD-справочником.
- Добавлен `rulesWorkspaceContent.js`: загрузка JSON content layer через `fetch`, нормализация и fallback на JS seed при ошибке.
- `rulesWorkspaceIndex.js` теперь читает текущий content layer, а не напрямую JS seed.
- `rulesWorkspaceSeed.js` остается аварийным fallback, чтобы приложение открывалось даже при ошибке поставляемого файла.
- Popup `Свойств` -> `Правила` получил поиск и открытие выбранного правила как read-only internal page.
- Обновлены `PROJECT_PLAN.md`, `RULE_TREE_CONTRACT.md`, release notes, tester instructions и manual.

### Проверки

- Запланированы `npm run verify`, `npm run test:browser`, `docs:index`, `agents:validate`.

### Следующее развитие

- Следующий пункт плана после закрытого блока: `0.0.0.2` уже закрыт как foundation, поэтому переходить нужно к первому незакрытому пункту ниже по активному плану.

## 2026-06-15: Полный визуальный редизайн Archive Hearth

### Что сделано

- Вне активного плана выполнен полный визуальный редизайн приложения по прямой задаче владельца продукта.
- Обновлена базовая палитра в `styles/variables.css` и `styles/design-tokens.css`: основной стиль стал теплым темным, с parchment-текстом, candle gold акцентом, moss selected-состояниями и ruby danger-действиями.
- Добавлен `styles/brand-system.css` как финальный общий слой оформления:
  - единые hover/focus/active состояния;
  - мягкие анимации кнопок и popup;
  - единый вид input/select/textarea;
  - общие поверхности для карточек, блоков, popup, tree, task tracker и toolbar;
  - плавные DnD placeholder/preview без тряски;
  - `prefers-reduced-motion` для пользователей, отключающих анимации.
- Создан продуктовый брендбук `docs/00-product/BRANDBOOK.md`.
- Обновлен дизайн-контракт `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`.
- Обновлены README, release notes и tester instructions, чтобы будущие UI-изменения следовали новой системе.

### Проверки

- Запланированы `npm run verify`, `npm run test:browser`, `docs:index`, `agents:validate` и пересборка manual.

### Следующее развитие

- Если визуально все принято, следующий плановый пункт остается `0.0.0.1.17.3.6`: перевести internal rules workspace с JS seed на program-owned файловый content layer с admin-update.
- Для UI следующим отдельным этапом стоит сделать visual baseline screenshots, чтобы редизайн можно было защищать автоматическими проверками.

## 2026-06-15: Internal rules workspace foundation

### Что сделано

- Закрыты foundation/MVP подпункты `0.0.0.1.17.3.1` - `0.0.0.1.17.3.5`.
- Добавлена подсистема `js/rulesWorkspace/`:
  - `rulesWorkspaceSeed.js` - стартовое admin-owned наполнение DnD rules workspace;
  - `rulesWorkspaceIndex.js` - lookup, tree, page-like adapter для внутренних правил;
  - `internalRulePage.js` - read-only открытие внутренних правил.
- `wikiLinkLookup` теперь ищет обычные страницы мира, а затем fallback-ом ищет внутренние правила по title/alias.
- Внутренние правила открываются как read-only `internalRule`, не добавляются в дерево мира и не сохраняются в пользовательский workspace.
- В popup шестеренки блока `Свойства` добавлена кнопка `Правила`, раскрывающая дерево internal rules workspace.
- Добавлены стили для дерева правил в popup и read-only страницы внутреннего правила.
- Добавлены unit/browser tests для seed lookup, wiki-link lookup и popup `Правила`.

### Проверки

- Запланированы `npm run verify`, `npm run test:browser`, `docs:index`, `agents:validate`.

### Следующее развитие

- `0.0.0.1.17.3.6`: перевести internal rules workspace с JS seed на program-owned файловый content layer с admin-update.
- Добавить поиск и открытие выбранного правила прямо из popup `Свойств`.

## 2026-06-14: Rule Tree переопределен как internal rules workspace

### Что сделано

- Закрыт пункт `0.0.0.1.17.3` как product/architecture decision.
- Зафиксировано новое направление: правила DnD должны жить во внутреннем workspace правил внутри корня программы, заполняемом с ролью `admin`.
- Обычный пользователь должен открывать правила через wiki-link или через `Свойства` -> шестеренка -> popup дерева правил.
- Текущий Rule Tree остается compatibility/foundation-слоем до миграции во внутренний rules workspace.
- Добавлен отдельный аудит-файл `docs/02-architecture/contracts/DND_CALCULATION_RULES.md` для правил расчетов характеристик, бонуса мастерства, навыков, КЗ, хитов, инициативы и эффектов.

### Проверки

- Запланированы `docs:index` и `verify` после обновления документации.

### Следующее развитие

- Реализовать `0.0.0.1.17.3.1`: storage для internal rules workspace.
- Затем `0.0.0.1.17.3.2`: подключить wiki-link lookup к внутреннему workspace правил.

## 2026-06-14: Legacy `Стат. блок DnD` выведен из меню новых блоков

### Что сделано

- Закрыт пункт `0.0.0.1.17.2`.
- Popup `Добавить блок` больше не предлагает новые блоки `Статистика персонажа` и `Стат. блок DnD`.
- Старые генераторы, upgrades и runtime-поддержка этих блоков оставлены, чтобы существующие карточки не ломались.
- Новый пользовательский путь для характеристик, навыков, КЗ, хитов и ручных значений закреплен за блоком `Свойства`.

### Проверки

- Добавлена browser regression проверка, что старые stat-блоки не возвращаются в список добавления блоков.

### Следующее развитие

- Подготовить ручную конвертацию старых stat-блоков в `Свойства` после отдельной проверки реальных `.md` карточек.

## 2026-06-14: Калькулятивность навыков, КЗ и доспеха в `Свойствах`

### Что сделано

- Закрыт пункт `0.0.0.1.17.1`.
- У персонажа и существа в `Свойствах` поле `КЗ` стало расчетным: без доспеха считается `10 + модификатор ЛОВ`, при выбранном доспехе берутся параметры карточки-предмета.
- В `Свойства` персонажа/существа добавлено стандартное поле `Доспех`.
- В `Свойства` предмета добавлены поля доспеха: `Тип доспеха`, `Базовая КЗ доспеха`, `Лимит ЛОВ к КЗ`.
- Runtime блока `Свойства` теперь пересчитывает DnD-навыки и спасброски при изменении характеристики, уровня или checkbox владения.
- Если пользователь вручную меняет расчетное поле навыка или КЗ, оно подсвечивается как ручное и больше не перезаписывается авторасчетом. Очистка поля возвращает авторасчет.
- `PropertiesCalculationModel` и `CharacterModel` получили тот же расчетный слой, чтобы лист персонажа, карта и будущие проверки читали единые значения.
- Legacy `Стат. блок DnD` и сущность `Правила` не удалены: они остаются совместимостью/advanced-слоем до отдельной миграционной задачи.

### Проверки

- `node --test tests\propertiesCalculationEngine.test.mjs tests\characterModel.test.mjs tests\propertyBlocks.test.mjs`
- `npm run test:browser`

### Следующее развитие

- Сделать человеко-понятный picker доспеха вместо текстового поля id/title/alias.
- Поддержать отдельный щит/экипировку, чтобы КЗ считалась из доспеха + щита + эффектов.
- Запустить отдельную задачу безопасного вывода legacy `Стат. блок DnD` из меню и миграции старых карточек.

## 2026-06-14: Навыки DnD в блоке `Свойства`

### Что сделано

- Закрыт foundation пункта `0.0.0.1.17`.
- В схемы `Персонаж` и `Существо` добавлены мульти-поля навыков по характеристикам: СЛ, ЛОВ, ТЛС, НТ, МДР, ХАР.
- Внутри каждой группы есть строки навыков и спасбросков из legacy `Стат. блок DnD`.
- Каждая строка сохраняет checkbox владения и числовое значение через стабильные ключи `PropertiesModel`.
- `CardVariablesModel` теперь видит навыки как переменные карточки.

### Проверки

- `npm run check:js`
- `node --test tests/propertyBlocks.test.mjs tests/cardVariablesModel.test.mjs`

### Следующее развитие

- Добавить авторасчет значений навыков по формуле `модификатор характеристики + бонус мастерства при владении`, с ручным override по тем же правилам, что у остальных расчетных полей.

---

## 2026-06-14: Расчетные переменные и зависимости между карточками

### Что сделано

- Закрыт foundation пункта `0.0.0.1.16`.
- Добавлен `js/properties/cardVariableDependencies.js`.
- Новый API строит контекст переменных карточки и зависимых карточек.
- Поддержаны пути `self.key`, `race.key`, `class.key` и прямой lookup по id/title/alias карточки.
- Добавлен безопасный расчет additive-формул без `eval`, с частями расчета и diagnostics.
- Добавлены unit tests для зависимости персонажа от карточки расы и для missing-variable diagnostics.

### Проверки

- `npm run check:js`
- `node --test tests/cardVariablesModel.test.mjs`

### Следующее развитие

- UI-конструктор формул в `Свойствах`.
- Persistent-хранение формул в model-first формате.
- Подключение расчетных зависимостей к `CharacterModel` и карте только после явного UI/contract этапа.

---

## 2026-06-14: Character Sheet UX foundation+

### Что сделано

- Доделан пункт `0.0.0.1.15`.
- `Лист персонажа` получил редактируемые death saves: три успеха и три провала отображаются как DnD-трек и записываются в поля `Свойств`.
- Расчетные метрики листа показывают источник `авто` / `ручн.` и формулу в подсказке.
- Для ручных override добавлена кнопка очистки, которая возвращает поле к авторасчету.
- Добавлен browser regression на death saves и очистку manual override.

### Проверки

- `npm run check:js`
- `npm run test:browser -- tests/browser/property-blocks.spec.mjs`

### Следующее развитие

- Пункт `0.0.0.1.16`: формулы, зависимости от выбранных карточек race/class/rule и просмотр цепочки расчета.

---

## 2026-06-13: Model-first layout для `Свойств`

### Что сделано

- Доделан пункт `0.0.0.0.9` до model-first foundation.
- Добавлен `js/properties/propertyLayoutModel.js`: единый формат layout поля `x/y/w/h/order/collapsed/groupId`.
- Новые и существующие поля `Свойств` теперь получают persistent `data-property-layout`; старые `data-property-span` и `data-property-rows` остаются совместимыми производными.
- Drag, resize, добавление и удаление поля синхронизируют layout всех полей блока.
- `PropertiesModel` читает layout базовых и пользовательских полей в `model.layout`; custom-поля дополнительно несут свой layout внутри `customFields`.
- Browser regression проверяет, что после pointer-drag/resize layout виден через `PropertiesModel`.

### Проверки

- `npm run check:js`
- `npm test`
- `npm run test:browser`

### Следующее развитие

- Пользовательский UI группировки и свертывания полей можно делать поверх уже существующих `groupId` и `collapsed`.

---

## 2026-06-12: Smooth DnD для layout-сетки `Свойств`

### Что сделано

- Убрана причина дергания при переносе полей `Свойств`: реальное поле больше не переставляется в DOM на каждом движении мыши.
- Во время переноса поле временно скрывается в сетке, под курсором движется легкий runtime ghost, а место будущего drop показывает placeholder.
- Перестройка placeholder теперь кадрируется через `requestAnimationFrame`, поэтому частые pointer-события не заставляют сетку перескакивать несколько раз за кадр.
- Финальный persistent-порядок полей меняется только один раз при отпускании мыши.
- Browser regression дополнен проверкой ghost/placeholder и очистки runtime-элементов после drop.

### Проверки

- `npm run check:js`
- `npm run test:browser`

---

## 2026-06-11: Hotfix layout-сетки `Свойств`

### Что сделано

- Убрана рудиментарная кнопка размера из popup шестеренки: размер поля теперь меняется только через resize-точки прямо на поле.
- Drag полей `Свойств` теперь принимает drop в пустую область сетки блока, а не только поверх соседнего поля.
- Runtime grip и resize-точки переведены с button на non-labelable `span role="button"`, чтобы клик по текстовому полю внутри label не запускал служебный control.
- Resize за левую или верхнюю сторону теперь двигает именно выбранную сторону поля через изменение span/rows и DOM-позиции.

### Проверки

- `npm run check:js`
- `npm test`
- `npm run test:browser`

---

## 2026-06-11: Hotfix layout-редактора `Свойств`

### Что сделано

- У стандартных полей блока `Свойства` появилась такая же кнопка удаления в popup шестеренки, как у пользовательских параметров.
- Удаление стандартного поля работает локально для текущего блока: поле убирается из persistent HTML карточки, но схема типа карточки не ломается глобально.
- Drag полей `Свойств` переведен с HTML5 `draggable` на pointer-based поведение, поэтому ручка теперь реально переставляет поля внутри сетки.
- Ручка перетаскивания заменена на компактную `grip`-иконку и встроена внутрь поля.
- Размер поля теперь хранится как `data-property-span` / `data-property-rows` и меняется через восемь resize-точек по сторонам и углам.
- Поля работают в 12-колоночной сетке: размер больше не ограничен двумя состояниями.
- Во время drag появляется placeholder будущей позиции, поэтому соседние поля визуально сдвигаются понятнее.
- Убрана визуальная метка `свой` у пользовательских параметров.
- Стиль блока `Свойства` успокоен: блок больше не выглядит отдельной желтой панелью и визуально ближе к обычным блокам `Текст` и `Таблица`.
- При добавлении поля появился выбор готового параметра из существующих схем и расчетных ключей: уровень, КЗ, хиты, характеристики, инициатива, бонус мастерства и другие.
- Добавлены browser regression проверки на удаление стандартного поля, создание поля из preset, controls у новых полей, pointer-drag и resize через corner-handle.

### Что стало лучше

- `Свойства` стали ближе к реальному редактору листа, а не к статичному списку полей с декоративными controls.
- Пользователю больше не нужно помнить точные названия расчетных параметров.

### Следующее развитие

- Полные `x/y`, группировка полей и JSON-layout остаются будущим расширением `0.0.0.0.9`.

---

## 2026-06-11: Unified Properties 0.0.0.0.5-0.0.0.0.11

### Что сделано

- Закрыта пачка `0.0.0.0.5`-`0.0.0.0.11`.
- `Лист персонажа` стал редактируемым runtime-режимом: изменение уровня, КЗ, скорости, инициативы, HP и характеристик записывается в блок `Свойства`.
- Если пользователь меняет лист на карточке без блока `Свойства`, блок создается автоматически и становится основным persistent-источником.
- Расчетные поля листа поддерживают ручной override через hidden custom-поля `override-*`; ручные значения подсвечиваются в листе.
- Popup `Добавить блок` упрощен до основного набора: текст, список, таблица, картинка, свойства.
- Добавлен универсальный `Блок списка` (`data-block-type="list"`) с режимами предметов, заклинаний, навыков, персонажей, существ и объектов.
- Старые специализированные блоки `Предметы`, `Заклинания`, `Навыки`, `Состояния и эффекты`, `Лист персонажа`, `Стат. блок DnD` оставлены как legacy-совместимость.
- Блок `Свойства` получил layout MVP: поля можно переставлять drag handle-ом и переключать ширину `1x/2x` в настройках.
- Добавлен `propertiesLegacyBridge`, который распознает старые блоки и готовит безопасный отчет для будущей кнопки `Перенести в Свойства`, но ничего не переписывает автоматически.
- Обновлены contracts, release notes, tester instructions и manual.

### Что стало лучше

- У пользователя появляется один главный путь для игровых параметров: `Свойства`, а не набор конкурирующих DnD/лист/эффекты-блоков.
- Меню блоков стало короче и понятнее.
- Старые карточки не ломаются, потому что legacy-блоки читаются и поддерживаются.
- Следующий этап сможет развивать поля `Свойств`, не расширяя список блоков.

### Что осталось

- Полный визуальный layout editor с произвольным resize по сетке еще не сделан; текущий MVP поддерживает порядок и ширину.
- Автоконвертация legacy-блоков не включена. Ее нужно делать отдельной задачей с backup/recovery gate.
- Следующий пункт плана: `0.0.0.1. Character Domain Model` или ближайший уточненный подпункт из нового плана после проверки пользователем.

---

## 2026-06-11: Backend расчётов для свойств

### Что сделано

- Закрыт foundation-пункт `0.0.0.0.4`.
- Добавлен `js/properties/propertiesCalculationEngine.js` - отдельный слой расчётов для блока `Свойства`.
- `PropertiesCalculationModel` считает уровень, бонус мастерства, модификаторы характеристик, инициативу, КЗ, скорость и summary хитов.
- Каждый расчет возвращает не только итоговое значение, но и `formula`, `parts` и `source`, чтобы будущий UI мог объяснять пользователю, откуда взялось число.
- Добавлена модельная поддержка manual override: если override заполнен, расчет возвращает `source: manual`; если override очищен, снова используется `source: calculated`.
- `CharacterModel` теперь получает `calculations` как backend-данные рядом с текущими полями, не ломая старые API карты, инициативы и листа персонажа.
- `CardVariablesModel` теперь включает пользовательские custom-поля из `Свойств`, чтобы будущие формулы могли обращаться не только к базовым схемам.
- Добавлены unit tests для calculation engine, CharacterModel calculations и custom-переменных.

### Что стало лучше

- Расчёты перестали быть только набором разрозненных helper-функций. Появился единый объект, который можно показывать в UI, использовать в карте и расширять до editable character sheet.
- Следующий UI-этап сможет подсвечивать ручные значения и показывать объяснение формулы, не читая HTML.

### Что осталось

- Следующий пункт: `0.0.0.0.5` - переработать `Лист персонажа` в редактируемую систему.
- Визуальная подсветка manual override, редактирование calculated-полей и очистка override в UI еще не сделаны.

## 2026-06-11: Popup-ы стали перетаскиваемыми

### Что сделано

- Вне основного плана добавлен общий UX-механизм: popup-ы, которые подключены к `PopupManager`, теперь можно перетаскивать мышью за свободное место.
- Перетаскивание не стартует с кнопок, input, select, textarea, ссылок и редактируемых областей, чтобы не ломать обычные клики и ввод.
- Popup нельзя утащить за границы видимой области: позиция зажимается внутри viewport.
- Popup выбора цвета toolbar тоже подключен к общему drag-механизму через `enablePopupDragging()`.
- справлен сопутствующий баг: шестеренка блока `Свойства` теперь появляется и тогда, когда `applyBlockSystemContract()` применяется прямо к новому блоку, а не ко всему editor.
- Добавлены browser regression проверки на drag popup-а и на появление шестеренки у только что созданного блока `Свойства`.

### Что стало лучше

- Если popup перекрывает нужную часть карточки, карты или toolbar, его можно просто отодвинуть мышью.
- Новое поведение централизовано в popup lifecycle, поэтому будущие popup-ы автоматически получают ту же механику при регистрации.

## 2026-06-11: Свойства получили пользовательские параметры

### Что сделано

- Пункт `0.0.0.0.3` закрыт как MVP: popup настроек блока `Свойства` теперь не только показывает параметры, но и добавляет новые пользовательские поля.
- Пользователь может создать параметр типов `короткий текст`, `число`, `длинный текст` и `да/нет`.
- Новые параметры сохраняются как persistent HTML внутри `.card-properties-grid`, поэтому они переживают clean-save и повторное открытие карточки.
- Runtime-шестеренка и popup остаются runtime UI и не попадают в сохраненный HTML.
- `PropertiesModel` теперь читает пользовательские поля как `customFields` и `customValues`, чтобы будущий расчетный слой мог работать не только с базовой схемой типа карточки.
- Пользовательские параметры можно удалить через popup настроек.
- Добавлены unit/browser regression проверки на чтение custom-полей и сохранение пользовательского параметра после сериализации.

### Что стало лучше

- Блок `Свойства` стал первым реальным человеко-понятным местом для расширения карточки без создания отдельного Rule Tree или нового типа блока.
- Пользователь может добавить недостающий параметр прямо в карточке, не меняя тип карточки и не ломая базовую схему.

### Что осталось

- Следующий пункт: `0.0.0.0.4` - backend расчётов для свойств и персонажа.
- Более глубокие типы параметров (`select`, `entity`, `entity-list`), формулы, ручные override и layout editor остаются будущими пунктами плана.

## 2026-06-06: Продуктовый поворот к Unified Properties

### Что решено

- Текущий `Rule Tree` признан слишком инженерным для основного пользовательского сценария: владелец мира не должен сначала понимать отдельную сущность правил, чтобы добавить понятный параметр, эффект или расчет в карточку.
- В `PROJECT_PLAN.md` добавлен новый высший приоритет `0.0.0.0. Unified Properties & Human-Friendly Character System`.
- Пункт `0.0.0.0.1` закрыт: `PROPERTIES_MODEL_CONTRACT.md` переписан как контракт человеко-понятной системы свойств, а не только как технический слой модели.
- Главный popup `+` упрощен: из первого уровня убраны быстрые пункты `Задача` и `По шаблону`, чтобы основной вход не разрастался списком редких вариантов.
- Пункт `0.0.0.0.2` закрыт foundation-слоем: у блока `Свойства` появилась runtime-шестеренка и мягкий popup настроек, который показывает текущие параметры блока.
- Главный пользовательский путь переносится в блок `Свойства`: у каждого типа карточки есть свои базовые свойства, но пользователь может добавить дополнительные параметры вручную.
- Для блока `Свойства` запланирована кнопка настроек-шестеренка, popup параметров, ручные значения, подсветка manual override и будущая динамическая сетка с drag and drop полей.
- Блок `Лист персонажа` должен стать редактируемым и работать через расчетный backend, а не конкурировать со старым `Стат. блок DnD`.
- Будущая система блоков должна быть проще: текст, универсальный список, таблица, картинка и свойства. Специализированные блоки постепенно переходят в режимы универсальных блоков или в `Свойства`.

### Что это меняет

- `Rule Tree` не удаляется сразу: в проекте уже есть код, тесты и совместимость. Но он больше не считается главным человеко-понятным способом настройки правил.
- `CharacterModel` остается нужным backend-слоем, но его развитие теперь должно идти через понятный UI `Свойств`, а не через набор разрозненных специальных блоков.
- Следующий рабочий пункт: `0.0.0.0.3` - добавить пользовательские параметры в `Свойства`.

## 2026-06-06: Rule Tree и блок состояний стали доступны для ручного создания

### Что сделано

- На пустой стартовый экран добавлена кнопка `Правила`, чтобы отдельную сущность Rule Tree можно было создать даже в полностью пустом workspace.
- Popup `Добавить блок` теперь явно показывает блок `Состояния и эффекты`; новые блоки создаются с этим названием, а внутренний тип остается `characterEffects`.
- Добавлены browser regression проверки на ручное создание `Правила` через главный `+` и на доступность блока `Состояния и эффекты` в списке блоков.
- Обновлены README, release notes, tester instructions и contracts, чтобы документация совпадала с тем, что пользователь реально может нажать.

### Что стало лучше

- Rule Tree и Effects/Conditions больше не являются только архитектурными словами: у них есть проверенный пользовательский вход в интерфейсе.
- Закрыт риск, при котором подсистема была создана в модели, но владелец продукта не мог создать ее руками.

## 2026-06-05: Rule Tree закрыт полным package manager и визуальной диагностикой

### Что сделано

- Оценен полный объем пункта `0.0.0.1.14`: он состоит из 10 подпунктов, и все 10 подпунктов теперь закрыты.
- В UI Rule Tree добавлена панель `Диагностика правил`: она показывает предупреждения engine, missing inheritance, циклы наследования, собственные/унаследованные условия и эффекты.
- В UI Rule Tree добавлен workspace package manager: сохранение текущего набора правил в `rule-packages/*.rule-package.json`, обновление списка файлов, импорт выбранного файла и удаление файла.
- мпорт package-файла теперь проверяет конфликт rule id и не перезаписывает существующее правило без явного решения пользователя.
- Добавлен browser regression `rule-tree-package-manager-saves-loads-and-reports-conflicts`, который проверяет сохранение, список package-файлов, конфликт id и импорт нового правила.
- Обновлены `RULE_TREE_CONTRACT.md`, README, release notes, tester instructions, пользовательские test scenarios и полный manual.

### Что стало лучше

- Rule Tree стал не только редактором JSON и engine foundation, а самостоятельной рабочей системой: мастер видит, почему структура правил подозрительна, и может переносить наборы правил через workspace-файлы.
- Пакеты правил теперь связаны с `StorageAdapter`, поэтому одинаковая модель работает для браузерной и desktop-версии.
- Пункт `0.0.0.1.14` можно считать закрытым как первая полноценная версия Rule Tree.

### Следующее развитие

- Следующий пункт плана: продолжить `0.0.0.1. Character Domain Model` с ближайшего незакрытого подпункта после Rule Tree.
- Более глубокое развитие Rule Tree переносится в будущие версии: объяснение применимости на конкретной карточке, связь с World Packages и расширенный editor формул.

## 2026-06-05: Rule Tree получил исполняемый engine и package-файлы workspace

### Что сделано

- Добавлен `js/ruleTree/ruleTreeEngine.js`: исполняемый слой Rule Tree для проверки условий и расчета применимости правил.
- Engine поддерживает условия `manual`, `level`, `state`, `card-variable` и безопасную простую `formula` без `eval`.
- `inheritsRuleIds` теперь разворачивается в реальные унаследованные условия и эффекты, а циклы/missing rules попадают в diagnostics.
- `RuleTreeProvider` теперь отдает в `CharacterModel` только применимые правила, а не все выбранные/активные правила подряд.
- В `CharacterModel` передается текущая карточка как контекст Rule Tree, чтобы правила могли смотреть на уровень, состояния и свойства.
- Добавлен `js/ruleTree/ruleTreePackageStorage.js`: foundation storage для пакетов правил в `rule-packages/*.rule-package.json`.
- Workspace initialization теперь создает папку `rule-packages`.
- Добавлены unit tests для engine, package storage и provider-фильтрации условий.
- В `AGENTS.md` закреплено правило: если владелец продукта говорит "делай весь пункт", агент закрывает все подпункты внутри пункта.

### Что стало лучше

- Rule Tree перестал быть только metadata-редактором. Активное правило теперь может не примениться, если его условия не подходят текущей карточке.
- Наследование правил стало расчетным foundation-слоем, а не просто полем в JSON.
- World Package направление получило первый файловый мост через workspace package files.

### Что осталось

- Следующий пункт: `0.0.0.1.14.10` - пользовательский package manager и визуальные diagnostics, чтобы мастер видел причины срабатывания/несрабатывания правил прямо в UI.

## 2026-06-05: Rule Tree получил редактор условий и package import/export

### Что сделано

- В `RuleTreeModel` добавлены методы `updateRule()`, `addCondition()`, `removeCondition()`, `importPackage()` и `exportPackage()`.
- В UI Rule Tree добавлен редактор метаданных правила: группа, категория, наследуемые rule id и package id.
- В UI Rule Tree добавлен редактор условий правила: тип, значение, пояснение, добавление и удаление условия.
- Добавлен предпросмотр активных эффектов Rule Tree, чтобы сразу видеть, какие эффекты включенных правил попадут в расчетный pipeline.
- Добавлены экспорт и импорт JSON-пакета правил. мпортированные правила получают `sourceType: "rulePackage"`, если источник не был задан явно.
- Добавлены unit/browser regression tests на редактирование условий, экспорт и импорт пакета.

### Что стало лучше

- Пункт `0.0.0.1.14` теперь закрыт как foundation: Rule Tree больше не только хранит правила, но и дает базовый интерфейс для управления условиями, наследованием и переносом набора правил.
- Следующий слой можно делать уже не вокруг DOM, а вокруг rule engine: валидация условий, вычисление наследования, привязка к World Packages и расчет применимости правила к персонажу.

### Что осталось

- `0.0.0.1.14.9`: полноценный rule engine с валидацией условий, расчетом наследования и package-файлами workspace.
﻿# Журнал работ

## 2026-06-05: Rule Tree стал персональным для персонажей и получил foundation-дерево

### Что сделано

- В блок `Эффекты и состояния` добавлен выбор правил из Rule Tree для конкретной карточки персонажа или существа.
- Выбранные правила сохраняются в persistent JSON блока как `selectedRuleIds`.
- `EffectsModel` сохраняет `selectedRuleIds`, не теряя их при добавлении состояний или эффектов.
- `CharacterModel` объединяет глобальные активные правила Rule Tree и персональные правила карточки.
- Rule Tree data model расширен до foundation-дерева: `groups`, `groupId`, `category`, `conditions`, `inheritsRuleIds`, `sourcePackageId`.
- UI Rule Tree показывает правила по группам и позволяет добавить новую группу.
- Добавлены regression tests для персонального выбора правила и tree metadata.

### Что стало лучше

- Правила теперь можно применять не только глобально через Rule Tree, но и точечно к конкретному персонажу.
- Rule Tree перестал быть плоским списком: появилась основа для категорий, наследования, условий и будущих пакетов правил.

### Что осталось

- `0.0.0.1.14.7`: полноценный редактор условий применения правила.
- `0.0.0.1.14.8`: Rule Package import/export и предпросмотр итоговых эффектов.

## 2026-06-05: Rule Tree как отдельная сущность

### Что сделано

- Добавлена отдельная сущность `ruleTree`, которая создается через меню `+` и лежит в дереве рядом с карточками, картами и task tracker.
- Создана подсистема `js/ruleTree/`: defaults, normalize, read/write data, model, render, events, contract и общий entrypoint.
- Rule Tree сохраняет persistent JSON в `<script type="application/json" data-rule-tree-data>`, а runtime UI очищается перед сохранением.
- `editorOpenPage.js` и `editorSpecialSave.js` теперь открывают и сохраняют Rule Tree как special entity, а не как карточку.
- `safeHtmlSanitizer.js` разрешает безопасный JSON `data-rule-tree-data` и продолжает удалять runtime-панели.
- `ruleTreeProvider.js` теперь читает правила из новых сущностей `ruleTree` и из legacy карточек с тегами `rule/rules/правило/правила`.
- Добавлен bridge импорта: старые rule-карточки показываются в UI Rule Tree как кандидаты на перенос в новую модель.
- Активные правила Rule Tree (`activeRuleIds`) подключены к CharacterModel через общий EffectsModel pipeline.
- Добавлены tests для `RuleTreeModel`, provider-чтения ruleTree entity, legacy bridge и browser smoke Rule Tree.
- Создан `docs/02-architecture/contracts/RULE_TREE_CONTRACT.md`.

### Что стало лучше

- Rule Tree перестал быть только набором карточек с тегом `rule`: появилась самостоятельная сущность с собственным контрактом, serializer и UI.
- Старые rule-карточки не ломаются и не пропадают: они стали временным источником импорта.
- CharacterModel теперь может получать эффекты не только из legacy rule-карточек, но и из настоящей Rule Tree сущности.

### Что осталось

- `0.0.0.1.14.5`: добавить персональный выбор правил для конкретной карточки персонажа.
- `0.0.0.1.14.6`: развить Rule Tree до настоящего дерева с группами, условиями применения и Rule Package import/export.

## 2026-06-05: Rule Tree Provider foundation

### Что сделано

- Добавлен `js/rules/ruleTreeProvider.js`.
- Provider строит `RuleTreeModel` из страниц workspace с тегами `rule`, `rules`, `правило`, `правила`.
- Если rule-страница содержит блок `Эффекты и состояния`, provider читает `[data-character-effects]`.
- Добавлен API `createRuleTreeCharacterIntegrations({ pages, selectedRuleIds })`.
- `CharacterModel` теперь принимает `selectedRuleIds` и автоматически подключает эффекты выбранных rule-страниц.
- Добавлены tests `tests/ruleTreeProvider.test.mjs` и regression в `tests/characterIntegrationApi.test.mjs`.
- В плане закрыт foundation-пункт `0.0.0.1.14`; UI выбора правил вынесен в `0.0.0.1.14.1`.

### Что стало лучше

- Rule Tree перестал быть только будущей абстракцией в плане: появился реальный provider, который уже умеет влиять на расчеты персонажа.
- Карта, инициатива и лист персонажа по-прежнему читают итоговый `CharacterModel`, не зная, что бонус пришел из rule-страницы.

### Что осталось

- `0.0.0.1.14.1`: сделать пользовательский выбор правил из Rule Tree.
- `0.0.0.1.16`: добавить расчетные переменные и зависимости между карточками.

## 2026-06-05: CharacterModel Integration API

### Что сделано

- Добавлен `js/character/characterIntegrationApi.js` - явный слой подключения будущих доменных систем к `CharacterModel`.
- Подготовлены helpers `createRuleTreeCharacterEffect()` и `createWorldPackageCharacterEffect()`.
- `CharacterModel` теперь принимает параметр `integrations` в `createCharacterModelFromSources()` и `readCharacterModelFromPage()`.
- нтеграционные эффекты объединяются с эффектами карточки и автоэффектами предметов в одном pipeline.
- Добавлен unit test `tests/characterIntegrationApi.test.mjs`.
- В плане закрыты foundation-пункты `0.0.0.1.11`, `0.0.0.1.12`, `0.0.0.1.13`.

### Что стало лучше

- Rule Tree и World Packages смогут влиять на КЗ, скорость, инициативу и будущие проверки через модельный API, а не через DOM.
- Карта, инициатива и лист персонажа не должны знать источник эффекта: они читают итоговый `CharacterModel`.

### Что осталось

- `0.0.0.1.14`: подключить реальный Rule Tree provider.
- `0.0.0.1.16`: добавить расчетные переменные и зависимости между карточками.

## 2026-06-05: CardVariablesModel и решение судьбы DnD v2 / Variables

### Что сделано

- Принято архитектурное решение: старые эксперименты `DnD v2` и `Переменные` не возвращаются как отдельные активные блоки.
- дея переменных встроена в сущности карточек: переменные карточки задаются через блок `Свойства`.
- Добавлен `js/properties/cardVariablesModel.js` - слой, который превращает `PropertiesModel` в единый список переменных карточки.
- Для разных типов карточек остаются разные схемы свойств, но расчетные подсистемы получают единый API: `key`, `label`, `type`, `value`, `rawValue`.
- Обновлены контракты `PROPERTIES_MODEL_CONTRACT.md`, `CHARACTER_MODEL_CONTRACT.md` и архив экспериментов.
- Добавлены unit tests `tests/cardVariablesModel.test.mjs`.

### Что стало лучше

- Проект не плодит вторую систему переменных рядом со свойствами.
- `CharacterModel`, будущий `Rule Tree` и `World Packages` смогут ссылаться на стабильные ключи свойств как на переменные сущности.
- Старые идеи сохранены, но стали частью model-first архитектуры.

### Что осталось

- `0.0.0.1.16`: добавить расчетные переменные, формулы и зависимости между карточками после появления Rule Tree.

## 2026-06-05: сточники эффектов, автоэффекты предметов и Full Character Sheet UX

### Что сделано

- Добавлен `js/character/effectSourceResolver.js` - слой выбора и связывания источников эффектов из карточек предметов, заклинаний и навыков.
- Блок `Эффекты и состояния` получил выбор карточки-источника. При выборе карточки в текущий блок добавляются эффекты из persistent JSON `[data-character-effects]` источника.
- Для будущего Rule Tree и World Packages у эффекта сохраняются `ruleId` и `sourcePackageId`.
- `CharacterModel` теперь объединяет ручные эффекты карточки и автоэффекты предметов из `InventoryModel`.
- Автоэффекты предметов включаются только если у предмета есть явный блок `Эффекты и состояния`; произвольный текст описания не трактуется как правило.
- Добавлен блок `Лист персонажа` (`characterSheet`) - runtime-сводка поверх `CharacterModel`: уровень, бонус мастерства, КЗ, скорость, инициатива, HP, характеристики, инвентарь и эффекты.
- Добавлены browser regression-сценарии для выбора источника эффекта, автоэффекта от предмета и рендера листа персонажа.

### Что стало лучше

- Предметы, заклинания и навыки получили общий путь передачи эффектов в персонажа.
- Карта и инициатива могут учитывать эффекты экипировки через `CharacterModel`, без чтения HTML карты.
- Full Character Sheet пока не ломает старые карточки: это витрина, а не миграция.

### Что осталось

- `0.0.0.1.14`: подключить Rule Tree provider, когда появится сам Rule Tree.
- `0.0.0.1.15`: превратить Full Character Sheet из runtime-витрины в редактируемый model-first лист.

## 2026-06-05: Effects / Conditions UI и подключение к карте

### Что сделано

- Добавлен блок карточки `Эффекты и состояния` (`data-block-type="characterEffects"`).
- Блок хранит persistent JSON в `[data-character-effects]`, а runtime UI пересобирается при открытии карточки.
- В UI можно добавить DnD-состояние, уровень истощения и ручной эффект с модификаторами КЗ, скорости и инициативы.
- Safe HTML boundary теперь разрешает безопасный JSON-скрипт `data-character-effects`, но продолжает удалять обычные `<script>`.
- `CharacterModel` учитывает модификаторы EffectsModel в инициативе, эффективной КЗ и скорости.
- Карта получает effects summary через `campaignMapCharacterBridge.js`, показывает индикатор состояний на токене и передает эти данные в режим презентации.
- В EffectsModel добавлены source links для будущей связи с инвентарем, Rule Tree и World Packages.

### Что стало лучше

- Эффекты больше не являются только планом: их можно добавить в карточку и увидеть влияние на инициативу карты.
- Карта не читает HTML эффектов напрямую: она получает данные через CharacterModel bridge.
- Будущие предметы, правила и world packages смогут отдавать эффекты в один общий формат.

### Что осталось

- `0.0.0.1.8.4`: сделать выбор источников эффекта из реальных карточек предметов, заклинаний, навыков и будущего Rule Tree.
- `0.0.0.1.8.5`: после Rule Tree добавить автоматическое применение эффектов от экипировки и правил.

## 2026-06-05: Effects / Conditions System foundation

### Что сделано

- Создан `js/character/effectsModel.js` - foundation-модель активных состояний DnD, эффектов, модификаторов и флагов боевого состояния.
- `CharacterModel` теперь содержит `effects` и отдает его через `getCharacterEffects(model)` и `hasCharacterCondition(model, conditionKey)`.
- Добавлены чистые операции `addCharacterCondition`, `removeCharacterCondition`, `toggleCharacterCondition`, `addCharacterEffect`, `removeCharacterEffect`.
- Добавлен persistent JSON-reader `[data-character-effects]` для будущего UI без привязки к HTML-разметке.
- Добавлены unit tests `tests/effectsModel.test.mjs` и browser regression на чтение эффектов из persistent JSON.

### Что стало лучше

- Состояния и эффекты перестали быть будущей абстракцией в плане: у них есть отдельная модель и тесты.
- Карта, инициатива и будущий Rule Tree смогут подключаться к эффектам через API, а не через поиск по русским подписям.

### Что осталось

- `0.0.0.1.8.1`: сделать UI активных эффектов и состояний.
- `0.0.0.1.8.2`: подключить EffectsModel к карте, инициативе и проверкам.
- `0.0.0.1.8.3`: связать эффекты с инвентарем, Rule Tree и World Packages.

## 2026-06-05: Design System foundation и InventoryModel

### Что сделано

- По ТЗ дизайна проведен UI audit и создан `docs/02-architecture/ui/UI_AUDIT_AND_MODERNIZATION_PLAN.md`.
- Создан `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md` с правилами токенов, popup, кнопок, карты, motion и accessibility.
- Добавлен `styles/design-tokens.css` и подключен в `styles/main.css` без резкого изменения текущего визуала.
- В план добавлен блок `0.0.0.10. Design System & UI Modernization`; старые активные пункты `10-17` сдвинуты на `11-18`, архив не изменялся.
- Создан `js/character/inventoryModel.js`: foundation-модель инвентаря поверх существующего блока `Предметы`.
- `CharacterModel` теперь содержит `inventory` и отдает его через `getCharacterInventory(model)`.
- Добавлены tests `tests/inventoryModel.test.mjs` и browser regression на чтение `.item-set-chip` из карточки.

### Что стало лучше

- Дизайн больше не будет развиваться случайными CSS-правками: появился контракт, tokens и phased rollout.
- нвентарь перестал быть только HTML-чипами в блоке и получил модельный слой.
- Существующий UI блока `Предметы` не сломан и остается источником данных для InventoryModel.

### Что осталось

- `0.0.0.1.8`: добавить Effects / Conditions System.
- Для Inventory System позже нужны экипировка, вес, валюты, attunement/слоты и связь с эффектами.
- Для дизайна следующий практический шаг: `0.0.0.10.6` Phase 2 - Popup & buttons refresh.

## 2026-06-04: Карта связана с CharacterModel для HP и инициативы

### Что сделано

- Добавлен `js/editor/campaignMapCharacterBridge.js` - единый мост карты к `CharacterModel`.
- `CharacterModel` получил `getCharacterInitiativeModifier(model)`: инициатива берется из DEX-модификатора.
- Создание токена на карте теперь записывает `initiativeModifier` из карточки персонажа или существа.
- При восстановлении/отрисовке токена карта подтягивает актуальный модификатор инициативы из карточки и синхронизирует его с `CampaignMapModel`.
- зменение HP для блока `Свойства` теперь использует `applyCharacterHealthChange()`, то есть математика урона, лечения, временных хитов и `kill/restore` живет в `CharacterModel`.
- Legacy `Стат. блок DnD` оставлен через совместимый путь, чтобы старые карточки не ломались.
- Добавлен browser regression: токен, созданный из карточки с DEX 16, получает модификатор инициативы `+3`, и popup инициативы показывает этот модификатор.

### Что стало лучше

- Карта меньше зависит от ручного `modifier` на токене.
- нициатива становится производной от карточки, а не отдельным несвязанным числом.
- зменение хитов на карте постепенно уходит от дублированной математики к единому доменному API.

### Что осталось

- `0.0.0.1.7`: добавить Inventory System.
- `0.0.0.1.8`: добавить Effects / Conditions System.
- Полностью заменить legacy `Стат. блок DnD` можно только отдельной задачей миграции или новым Character Sheet UX.

## 2026-06-04: CharacterModel foundation

### Что сделано

- Создан контракт `docs/02-architecture/contracts/CHARACTER_MODEL_CONTRACT.md`.
- Добавлен новый слой `js/character/characterModel.js`.
- `CharacterModel` нормализует `level`, `proficiencyBonus`, `armorClass`, `speed`, базовые характеристики, HP, temp HP и death saves.
- `CharacterModel` строится из `PropertiesModel`, а если свойств нет - может использовать legacy `Стат. блок DnD`.
- `js/properties/characterCalculations.js` оставлен как совместимый facade, но теперь читает здоровье через `CharacterModel`.
- `PropertiesModel` для `character` и `creature` получил стабильные ключи характеристик `str`, `dex`, `con`, `int`, `wis`, `cha`.
- Добавлены unit tests `tests/characterModel.test.mjs`.

### Что стало лучше

- Карта и будущие подсистемы получают единый путь к HP/характеристикам, а не читают произвольный HTML.
- Legacy stat block пока поддерживается как fallback, поэтому старые карточки не ломаются.
- Пустая карточка больше не получает выдуманные `10/10 HP`: facade возвращает `null`, если источника данных нет.

### Что осталось

- Подключить карту глубже к `CharacterModel`: изменение хитов, инициатива и рамки здоровья должны постепенно уходить от legacy facade.
- Сделать Inventory System.
- Сделать Effects / Conditions System.
- Решить судьбу archived `DnD v2` и `Variables` через модель.

## 2026-06-04: Project Structure & Release Handoff Reorganization

### Что сделано

- Живые документы перенесены из корня `docs/` в зоны `00-product`, `01-delivery`, `02-architecture`, `03-testing`, `04-user-release`.
- `docs/01-delivery/PROJECT_PLAN.md` и `docs/01-delivery/WORK_LOG.md` стали настоящими источниками, а не указателями.
- Контракты подсистем перенесены в `docs/02-architecture/contracts/`.
- Desktop-документы перенесены в `docs/02-architecture/desktop/`.
- Тестовые документы перенесены в `docs/03-testing/`, добавлен `DESKTOP_SMOKE.md`.
- Созданы продуктовые документы: vision, strategy, roadmap, PO discovery, personas, current milestone.
- Созданы пользовательские release-документы: tester readme, install guide, known issues, test scenarios.
- Создана структура `release/latest`, `release/candidates`, `release/archive`.
- Все markdown-документы в `docs/`, кроме страниц sample workspace, получили metadata `summary`, `read_when`, `owner_zone`.
- Обновлены ссылки в README, agent skills, release process, desktop checks и служебных документах.

### Проверочный смысл

- `npm run docs:index` проверяет metadata и зоны документации.
- `npm run agents:validate` проверяет skill layer.
- Новые документы нельзя класть прямо в корень `docs/`, если есть целевая зона.

### Что осталось

- Перед реальным внешним релизом наполнить `release/latest/release-notes.md`, `release/latest/tester-instructions.md` и пользовательские инструкции конкретной версией.
- Поддерживать release handoff после каждого изменения пользовательского поведения.

## 2026-06-04: Добавлен agent workflow layer и PO-приоритеты встроены в план

### Что сделано

- Создан `AGENTS.md` с правилами работы Codex/AI-агента.
- Создана папка `.agents/skills/` с маршрутами для `character-model`, `docs-restructure`, `release-handoff`, `desktop-release`, `map-hardening`, `world-package`.
- Добавлены инструменты `tools/docs_index.mjs`, `tools/validate_agent_skills.mjs`, `tools/safe_commit.mjs`.
- Добавлен шаблон `docs/03-testing/CODE_REVIEW_TEMPLATE.md`.
- Созданы стартовые routing-документы `docs/00-product/PRODUCT_DASHBOARD.md`, `docs/01-delivery/PROJECT_PLAN.md`, `docs/01-delivery/WORK_LOG.md`.
- В `package.json` добавлены scripts `docs:index` и `agents:validate`.
- В `README.md` добавлен раздел `AI / Codex Workflow`.
- `docs/01-delivery/PROJECT_PLAN.md` обновлен по Product Owner инструкциям: добавлены продуктовая философия, продуктовые опоры, `Project Structure & Release Handoff Reorganization`, `World Package Foundation`, новый порядок приоритетов и подпункт `0.0.0.2.16`.

### Следующее развитие

- Следующий плановый пункт остается `0.0.0.1. Character Domain Model`.
- После него высоким P0 идет `0.0.0.2. Project Structure & Release Handoff Reorganization`, где нужно полноценно разложить docs/release по зонам и добавить metadata всем markdown-документам.

---

## 2026-06-04: Пересобран план в версионную дорожную карту и обновлена оценка зрелости

### Что сделано

- `docs/01-delivery/PROJECT_PLAN.md` полностью пересобран: активный план теперь начинается с `0.0.0.1`, а выполненные задачи перенесены вниз в архив.
- Частично сделанные задачи возвращены в активный план как будущие версии: `CharacterModel`, asset UI, desktop release hardening, recovery repair-actions, visual baseline, large workspace E2E, карта v2, roles, web/cloud.
- В план добавлено простое описание текущего состояния проекта, направления развития и структуры папок.
- Создана новая оценка зрелости: `Тех. зрелость/04.06.2026 - оценка после закрытия Desktop Foundation.md`.

### Вывод

Текущий следующий рабочий пункт плана: `0.0.0.1. Character Domain Model`.

---

## 2026-06-04: Закрыт блок 20 Desktop Foundation

### Что сделано

- Закрыт пункт `20.14.10 Dirty-region fog sync`: кисть тумана теперь помечает измененную область canvas, presentation payload отправляет `fogPatch`, а renderer презентации дорисовывает только эту область.
- справлена видимость стрелки расстояния в презентации: overlay поднят выше слоя тумана.
- Пункт `20` в `docs/01-delivery/PROJECT_PLAN.md` отмечен как закрытый desktop foundation.
- `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md` переписан в чистом UTF-8 и больше не содержит устаревших или битых фрагментов.
- `docs/02-architecture/desktop/DESKTOP_MAP_PERFORMANCE_NOTES.md` обновлен: dirty-region fog sync перенесен из будущих оптимизаций в сделанные.

### Проверки

- `node --test tests\campaignMapPerformance.test.mjs`
- `npm run test:browser -- tests/browser/campaign-map-presentation.spec.mjs`

### Следующее развитие

- Desktop foundation завершен. Дальнейшие desktop-задачи нужно вести отдельными future hardening пунктами: Tauri UI click-runner, native picker при необходимости, audio/playlist assets, updater/signing и реальные desktop measurements.

---

## 2026-06-04: справлен фон карты и закрыт пункт 20.14.3

### Что сделано

- Фон карты переведен на `getRenderableImageURL()` в `campaignMapBackground.js` и `campaignMapRuntime.js`, поэтому background map image теперь получает тот же fallback, что портреты, image blocks и токены.
- Добавлен browser regression `campaign-map-background-falls-back-to-renderable-data-url`: если primary asset URL не отрисовался, фон карты ставится через `data:image/...`.
- Privacy rules desktop-презентации вынесены в `js/presentation/campaignMapPresentationPrivacy.js`.
- Model-first renderer презентации теперь использует единый контракт приватности: скрытые non-player сущности не показываются, скрытые player/original токены остаются с badge `скрыт`, locked fog и fog остаются выше токенов.
- Browser smoke для model-first renderer усилен проверками badge, скрытых NPC/фигур и z-index тумана.

### Проверки

- `npm run check:js`: прошло.
- `npm run test:browser`: прошло, 31 browser-тест.
- `npm test`: прошло, 88 unit-тестов.

### Следующее развитие

- **20.14.4**: расширить ручной desktop smoke checklist по реальному Tauri-окну после исправлений фона и privacy.
- **20.14.5**: готовить automated Tauri UI runner, когда ручной desktop smoke станет стабильным.

---


## 2026-07-06: Dark Fantasy Design System Foundation

### Что сделано

- Вне плана выполнена задача из `Задача.docx`: добавлен foundation для dark fantasy DnD OS style без копирования чужих ассетов, названий или картинок.
- `styles/design-tokens.css` переведен на namespace `--mow-*`: фон, glass panels, текст, old-gold акцент, состояния, радиусы, spacing, motion, shadows и theme attributes.
- Старые `--color-*` aliases сохранены для совместимости существующих CSS-файлов.
- Добавлен theme switching через `body[data-theme][data-accent][data-bg][data-ui-scale]`.
- В popup настроек добавлена appearance panel: выбор accent color, фонового пресета и плотности интерфейса.
- Shell/sidebar/editor/statusbar получают dark fantasy фон и panel treatment через токены.
- Добавлен `.agents/skills/design-system/SKILL.md` для будущих UI-задач.
- `DESIGN_SYSTEM_CONTRACT.md` и `README.md` обновлены правилами работы с новым визуальным слоем.

### Проверки

- `node --check js\ui\appTopbar.js`
- `node tools\validate_agent_skills.mjs`
- `npm run test:browser -- --grep "app-shell-empty-state"`
- `npm run verify`

### Следующий пункт

После внеплановой задачи возвращаемся к текущему активному плану: `0.0.0.6. Knowledge Graph И Rule Tree`.
## 2026-06-02: Надежное восстановление картинок и 20.14.2 model-first presentation

### Что сделано

- Добавлен `getRenderableImageURL()` в `js/storage/assetStorage.js`: сначала он пробует основной asset URL, а если браузер/WebView не может отрисовать картинку, восстанавливает изображение из workspace как `data:` URL.
- Портреты карточек, image blocks и токены карты теперь используют renderable image URL, поэтому они не зависят только от Tauri asset protocol.
- Добавлен regression test на fallback: если primary asset URL не загрузился, возвращается `data:image/...`.
- Desktop-презентация переведена с HTML snapshot на `render-model` payload из `CampaignMapModel`.
- Добавлены `js/editor/campaignMapPresentationPayload.js` и `js/presentation/campaignMapPresentationRenderer.js`.
- В browser smoke добавлен тест `campaign-map-presentation-model-renderer-builds-view-from-model-payload`.
- `docs/01-delivery/PROJECT_PLAN.md` обновлен: пункт `20.14.2` отмечен как сделанный базово, следующим остается `20.14.3`.

### Проверки

- `npm test`: прошло, 88 unit-тестов.
- `npm run test:browser`: прошло, 30 browser-тестов.

### Следующее развитие

- **20.14.3**: закрепить privacy rules desktop-презентации уже поверх model-first renderer.
- После этого двигаться к **20.14.4/20.14.5**: расширенный ручной smoke и будущий Tauri UI-runner.

---

## 2026-06-02: Desktop image parity и детализация пункта 20.14

### Что сделано

- справлен сценарий, где фон карты в Tauri отображался, а картинки карточек и токенов карты не появлялись.
- `openPageInEditor()` теперь ожидает завершения рендера специальных страниц и карточек.
- `renderCampaignMap()` теперь реально дожидается восстановления background, tokens и fog до завершения открытия страницы карты.
- В карточках `restoreAssetImages()` перенесен после runtime-render блоков, чтобы `src` ставился на финальные DOM-элементы, а не на старые узлы до `renderCustomBlocks()`.
- `AssetAdapter` получил `syncAssetAdapterWorkspaceRoot()`.
- `workspaceStorage.js` синхронизирует asset adapter с выбранным workspace root после `openWorkspace()` и `restoreWorkspace()`.
- Добавлен regression test `DesktopAssetAdapter обновляет workspace root после выбора desktop workspace`.
- В `docs/01-delivery/PROJECT_PLAN.md` добавлены явные подпункты `20.14.1`-`20.14.8`.

### Проверки

- `npm run verify`: прошел, 87 unit-тестов.
- `npm run test:browser`: прошел, 29 browser-тестов.
- `npm run desktop:packaging-smoke`: прошел.
- `npm run desktop:check`: прошел.
- `cargo check`: прошел.

### Что это меняет

- Карточки, image blocks, portrait images и токены карты в desktop-режиме должны восстанавливать изображения через `AssetAdapter` так же надежно, как background карты.
- Пункт `20.14` перестал быть общим направлением и стал рабочей дорожной картой desktop-перехода.

### Следующее развитие

- **20.14.2**: перевести desktop presentation transport с HTML snapshot на JSON payload из `CampaignMapModel`.
- **20.14.3**: закрепить privacy rules презентации поверх model-first renderer.

---

## 2026-06-02: Desktop presentation transport 20.10.1 и packaging smoke 20.11

### Что сделано

- справлен реальный путь отображения картинок в Tauri: `convertTauriFileSrc()` теперь использует `__TAURI__.core.convertFileSrc`, `__TAURI_INTERNALS__.convertFileSrc` и явно передает protocol `asset`.
- Добавлен regression test на fallback через `__TAURI_INTERNALS__.convertFileSrc`, чтобы desktop WebView не терял картинки, если публичный global API отличается от runtime internals.
- Добавлены `presentation.html` и `js/presentation/presentationEntry.js`.
- `campaignMapPresentation.js` научен открывать отдельное Tauri `WebviewWindow` для режима презентации.
- Между окном мастера и окном презентации добавлен `BroadcastChannel`.
- Presentation runtime поддерживает собственные zoom/pan и popup просмотра изображения.
- Добавлена команда `npm run desktop:packaging-smoke`.
- Обновлены `docs/01-delivery/PROJECT_PLAN.md`, `docs/02-architecture/desktop/DESKTOP_PRESENTATION_WINDOW_SPIKE.md`, `docs/02-architecture/desktop/DESKTOP_PACKAGING_SMOKE.md`, `docs/02-architecture/desktop/DESKTOP_TRANSITION_STRATEGY.md` и README.

### Что это меняет

- Картинки в desktop-режиме больше не должны зависеть от прямого `file://` и должны проходить через Tauri asset protocol.
- Презентация получила первый самостоятельный desktop runtime вместо попытки писать напрямую в DOM второго окна.
- 20.11 теперь проверяется командой, а не только текстовым checklist.

### Следующее развитие

- Следующий desktop hardening: заменить HTML snapshot презентации на JSON payload из `CampaignMapModel`.
- После этого можно двигаться к Tauri UI-runner или production frontend output для настоящего installer.

---

## 2026-06-02: Desktop assets fix и пункты 20.10-20.14

### Что сделано

- справлен desktop asset URL: `resolve_asset_url` в Rust теперь возвращает абсолютный путь, а `DesktopAssetAdapter` превращает его в Tauri asset URL через `convertFileSrc`.
- Добавлен тест, который проверяет, что desktop asset path превращается в `asset://...`, а не остается прямым `file://`.
- В `tauriBridge.js` добавлены `convertTauriFileSrc()` и `openTauriWebviewWindow()` как foundation для desktop assets и будущего native presentation window.
- В Tauri capabilities добавлен label `campaign-map-presentation`.
- Добавлены документы:
  - `docs/02-architecture/desktop/DESKTOP_PRESENTATION_WINDOW_SPIKE.md`;
  - `docs/02-architecture/desktop/DESKTOP_PACKAGING_SMOKE.md`;
  - `docs/02-architecture/security/CLOUD_THREAT_MODEL.md`;
  - `docs/02-architecture/adapters/BACKEND_STORAGE_API_PLAN.md`;
  - `docs/02-architecture/desktop/DESKTOP_TRANSITION_STRATEGY.md`.
- `docs/01-delivery/PROJECT_PLAN.md` обновлен по пунктам 20.8-20.14.

### Что это меняет

- Картинки и фоны карты в desktop теперь должны отображаться через безопасный Tauri asset URL.
- 20.10 закрыт как честный spike: текущую browser-презентацию нельзя просто перенести в Tauri `WebviewWindow`; нужен data-first transport.
- 20.11-20.14 получили документы-решения и дальнейшую декомпозицию.

### Следующий пункт

- **20.10.1. Presentation runtime transport**: отдельная presentation page, snapshot карты, message channel и renderer из модели.

---

## 2026-06-02: Desktop workspace picker и 20.9 Backup / Restore Gate

### Что сделано

- справлен выбор workspace в Tauri: добавлен `js/storage/tauriBridge.js`, который использует глобальный `window.__TAURI__` в desktop WebView и оставляет dynamic import как fallback.
- В `src-tauri/tauri.conf.json` включен `withGlobalTauri`, чтобы desktop-прототип без bundler мог открывать системный dialog.
- `desktopStorageAdapter.js` переведен на `openTauriDirectoryDialog()` и `invokeTauriCommand()`.
- `desktopAssetAdapter.js` переведен на `invokeTauriCommand()`.
- Добавлен regression test на выбор workspace через глобальный Tauri dialog API.
- Добавлен `docs/02-architecture/desktop/DESKTOP_BACKUP_RESTORE_GATE.md`.
- `docs/02-architecture/desktop/DESKTOP_PROTOTYPE_SMOKE.md` расширен шагами restore.
- `docs/01-delivery/PROJECT_PLAN.md`, `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md` и README обновлены по статусам 20.8 и 20.9.

### Что это меняет

- В desktop-прототипе кнопка выбора workspace больше не зависит от browser-only API и должна открывать Tauri dialog.
- Backup/restore подтвержден как adapter-backed gate: автоматические тесты проверяют страницы и assets без `FileSystemHandle`, а реальный desktop-click остается ручным smoke до появления Tauri UI-runner.

### Следующий пункт

- **20.10 Desktop Presentation Window Spike**: проверить отдельное Tauri-окно презентации и live-sync карты между окнами.

---

# Desktop Foundation Log

## 2026-06-02: Desktop Storage Hardening 20.7.1 ? Desktop Prototype 20.8

### Что сделано

- `StorageAdapter` расширен методами `readBinary`, `writeBinary`, `removeDirectory`.
- `writeQueue.js` научился работать через adapter-backed `page.path`; `createWritable()` остался fallback для browser handles.
- `pageStorage.js` приведен к UTF-8 и отвязан от прямых desktop pseudo-handles.
- `backupService.js` переведен на `StorageAdapter`: страницы, manifest, assets, restore и cleanup проходят через единый storage facade.
- `AssetAdapter` получил первый слой работы с файлами: сохранение выбранного файла и получение отображаемого URL через `saveAssetFile()` / `resolveUrl()`.
- `campaignMapRuntime.js` и `images.js` начали брать assets через адаптер вместо прямого доступа к `state.workspaceHandle/assets`.
- В Tauri backend добавлены команды `read_binary_file`, `write_binary_file`, `remove_directory`.
- Добавлены regression-тесты adapter-backed storage и backup/restore без FileSystemHandle.

### Что стало лучше

- Browser и desktop storage используют один контракт.
- Backup/restore меньше зависят от браузерного FileSystemHandle.
- Desktop prototype начал работать с реальными файлами страниц, assets и backup, а не только с оболочкой Tauri.

### Что осталось

- Нужен ручной `npm run desktop:dev` checklist в окне Tauri на настоящем workspace.
- Нужно постепенно убрать оставшиеся прямые обращения к `state.workspaceHandle` из template storage и вспомогательных tree/open-in-folder сценариев.
- Нужен автоматизированный Tauri UI-runner для desktop smoke.

### Следующее развитие

- Следующий desktop-пункт после 20.8: **20.9 Desktop Backup / Restore Gate**.

---

# Журнал работ

Этот файл хранит исторический лог выполненных задач, старые фрагменты планов, решения, риски и заметки "что сделано". Актуальный единый backlog находится в `docs/01-delivery/PROJECT_PLAN.md`.

Новые подробные записи после крупных изменений добавлять сюда, а в `docs/01-delivery/PROJECT_PLAN.md` менять только статусы и следующие задачи.

---
## 2026-06-01: Campaign Map Performance Tail 3.5-3.7

### Что сделано

- `syncPresentationItemsById()` батчит item-level обновления по карте.
- Missing item в презентации теперь вызывает один fallback full-sync, а не серию полных перерисовок.
- Добавлен `syncPresentationFog()` и `schedulePresentationFogSync()`: при рисовании/очистке тумана presentation обновляет только fog image.
- `flushLiveFogPresentationSync()` теперь отправляет fog-only sync.
- Повторный drag locked fog zone исправлен: старт drag перечитывает актуальную зону из модели, а не stale-объект из старого render.

### Что стало лучше

- `3.5` закрыт базово: presentation live sync стал batch/fallback-aware.
- `3.7` закрыт базово: fog paint больше не требует полного sync всей карты в live-режиме.
- Поведение запретных зон стало устойчивее после нескольких переносов подряд.

### Что осталось

- Настоящий dirty-region save для тумана: сейчас dirty regions считаются и используются для diagnostics, но persistent fog image все еще сохраняется целиком на завершении рисования.
- Diff by id для структурных изменений слоев и locked fog zones можно усилить позже, когда начнем развивать слои карты.

### Следующее развитие

- Следующий пункт плана: `4. Visual Regression / UX Safety`.

---
## 2026-06-01: Campaign Map Performance Gate 3.4-3.8

### Что сделано

- `campaignMapPerformance.js` расширен scenario budgets: `smallMapBaseline`, `largeMapDrag`, `fogPaintLarge`, `presentationLiveSync`, `zoomPanHeavy`.
- Добавлены `createCampaignMapPerformanceReport()` и `assertCampaignMapPerformanceBudget()` для обязательных performance checks в тестах.
- Browser smoke карты расширен: теперь есть отдельный сценарий `campaign-map-fog-paint-large-stays-inside-budget`.
- Добавлен dev-only diagnostics panel `campaignMapPerformanceDiagnostics.js`, включается через `localStorage.setItem('myOwnWorld.debug.performance','true')`.
- Туман получил dirty-region counters для diagnostics.
- Locked fog zone drag оптимизирован: больше не пересобирает все зоны и не коммитит DOM на каждом pointermove.
- Обновлены `docs/01-delivery/PROJECT_PLAN.md`, `docs/02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md`, browser scenarios и мануал.

### Что стало лучше

- Performance gate теперь проверяет не только presentation sync, но и fog paint.
- У карты появился включаемый debug-инструмент без шума в обычном интерфейсе.
- Один из источников лагов на fog zones убран: движение зоны стало дешевле для DOM.

### Что осталось

- `3.5`: нужен batch/diff layer для presentation sync, чтобы несколько изменений за кадр не превращались в лишние операции.
- `3.7`: нужны настоящие dirty-region save/sync для fog image, а не только counters.
- Нужен stress smoke с реальным pointer drag/painting на большой карте.

### Следующее развитие

- Следующий пункт плана: `4. Visual Regression / UX Safety`, если не продолжаем углублять подпункты `3.5` и `3.7`.

---
## 2026-06-01: Schema gate и Backup / Restore 1.7, 1.8, 2.5-2.7

### Что сделано

- Добавлен `js/schema/schemaUpgradeGate.js`: будущие schema upgrades теперь должны проходить через gate с успешной validation и backup manifest.
- Добавлен browser smoke `tests/browser/schema-recovery.spec.mjs` для fallback-экрана recovery.
- `backupService` расширен: manifest хранит `assets` / `assetCount`, backup копирует persistent assets по `AssetReference`, restore возвращает assets обратно в workspace.
- Добавлена retention-политика backup: по умолчанию сохраняются 20 последних точек, старые удаляются через `cleanupWorkspaceBackups()`.
- `tests/backupService.test.mjs` теперь проверяет восстановление карточки, карты, task tracker, assets и очистку старых backup.
- Обновлены `docs/01-delivery/PROJECT_PLAN.md`, `docs/02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md` и `docs/02-architecture/contracts/WORKSPACE_SCHEMA_CONTRACT.md`.

### Что стало лучше

- P0 data safety стал заметно крепче: есть диагностика схемы, gate перед будущими upgrade и реальный backup/restore страниц с ассетами.
- Recovery остается осторожным: данные не чинятся автоматически, а destructive rollback по-прежнему не включен.

### Что осталось

- Для будущих repair-actions нужны отдельные browser/storage сценарии на каждое действие.
- Backup assets нужно усилить для больших файлов, audio/playlist и missing/fallback policy.
- Нужен UI для настройки retention-лимита и ручной очистки backup.

### Следующее развитие

- Следующий пункт плана: `3. Campaign Map Performance Gate`.

---
## 2026-06-01: Schema Validation / Recovery 1.2-1.5

### Что сделано

- Добавлен `js/schema/templateSchema.js` для проверки `.my-own-world-templates.json`.
- Добавлен `js/schema/assetSchema.js` для проверки `AssetReference`.
- `validateWorkspaceSnapshot()` теперь умеет принимать `templates` и `assetReferences`.
- `loadWorkspace()` собирает asset references из страниц и включает их в workspace validation.
- Добавлен `js/schema/schemaRecovery.js` с `WorkspaceRecoveryReport`.
- При критичных ошибках workspace приложение показывает fallback-экран диагностики в editor вместо молчаливого продолжения.
- `docs/02-architecture/contracts/WORKSPACE_SCHEMA_CONTRACT.md` обновлен: описаны templates, assets и текущий recovery flow.
- Unit tests расширены на templates, assets и recovery report.

### Что стало лучше

- Пункты `1.2-1.5` теперь закрыты базовым слоем, а не только page/map/task проверками.
- Поврежденный workspace получает понятное диагностическое состояние.
- Recovery остается безопасным: данные не исправляются автоматически без backup и явного действия.

### Что осталось

- Добавить browser/storage tests для recovery fallback.
- Подключить validation gate перед будущими schema upgrades.
- Сделать безопасные repair-actions после backup.

---
## 2026-06-01: Объединение планов проекта

### Что сделано

- Создан единый актуальный план `docs/01-delivery/PROJECT_PLAN.md`.
- Старые плановые документы перенесены в `docs/archive/`:
  - `PLANS_AND_TECH_DEBT.md`;
  - `PROJECT_DEVELOPMENT_AND_MATURITY_PLAN.md`.
- В новый план сведены рабочий backlog, оценка зрелости, техдолг, частично сделанные задачи и будущие отложенные пункты.
- Зафиксировано правило: частично сделанная задача остается в плане до полного закрытия, а отложенная важная задача остается в будущем плане с причиной.
- Ссылки в onboarding/release документации переведены на `docs/01-delivery/PROJECT_PLAN.md`.

### Что стало лучше

- У проекта снова один источник правды по плану.
- Старые документы сохранены как архив, но больше не конкурируют с актуальным backlog.
- Частичные задачи вроде schema validation, backup/restore, performance gate и locked fog zones явно не теряются.

### Следующее развитие

- Продолжать P0 data safety: пункты `1.2-1.5` и `2.5-2.7` в `docs/01-delivery/PROJECT_PLAN.md`.

---
## 2026-06-01: Backup / Restore, первый слой

### Что сделано

- Добавлен `docs/02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md`.
- Добавлен `js/storage/backupService.js`.
- Backup сохраняет snapshot в `.my-own-world-backups/<snapshot-id>/`.
- Snapshot содержит `manifest.json` и копии markdown-страниц в `pages/`.
- Добавлен осторожный restore helper: он восстанавливает страницы из backup, но не удаляет новые файлы, созданные после backup.
- В popup настроек добавлена ручная команда "Создать резервную копию".
- В popup настроек добавлен список restore-точек и inline-диалог подтверждения восстановления.
- Auto snapshot подключен перед удалением ветки страниц и перед переносом страниц в дереве.
- Добавлены unit-тесты manifest/id для backup-сервиса.

### Что стало лучше

- Schema recovery теперь получает обязательную базу: перед будущей автоматической починкой можно будет создавать snapshot.
- Рискованные операции удаления/переноса получили первый защитный слой.
- Backup слой не зависит от DOM и работает на storage/page data.

### Что осталось

- Нужно добавить backup assets по `AssetReference`.
- Нужны browser/storage regression tests на реальное удаление/перенос с проверкой snapshot.

---
## 2026-06-01: Schema Validation / Recovery, первый слой

### Что сделано

- зучен бриф `MY_OWN_WORLD_AI_ARCHITECTURE_RISK_BRIEF_01_06_2026_UPDATED.docx`.
- План развития скорректирован: backup/recovery поставлен сразу после schema validation, popup lifecycle выделен отдельным приоритетом.
- Добавлен `docs/02-architecture/contracts/WORKSPACE_SCHEMA_CONTRACT.md`.
- Добавлены чистые валидаторы: workspace/page, campaign map, task tracker и JSON helper.
- `loadWorkspace()` подключает validation в warning-only режиме: старые workspace не блокируются, но проблемы схемы выводятся в консоль.
- Добавлены unit-тесты на missing id, broken parent, duplicated title, broken map token, broken task reference и invalid JSON.

### Что стало лучше

- Появился первый слой защиты от поврежденных workspace-данных.
- Валидаторы не чинят данные молча, а возвращают явные `error` и `warning`.
- Следующий recovery layer теперь можно строить поверх диагностики, а не поверх догадок.

### Что осталось

- Нужен UI-экран диагностики workspace.
- Нужен backup/snapshot перед любым автоматическим recovery.
- Нужно расширить validation на templates и asset references как обязательный gate.

---
## 2026-05-31: справления UX карты после пункта 22

### Что сделано

- Массовое выделение токенов и фигур перенесено с `click` на `pointerdown`, чтобы `Shift` / `Ctrl` / `Cmd` работали даже при pointer-based drag.
- Popup изображения токена увеличен и получил кнопку `Показать игрокам`, которая открывает preview в окне презентации.
- Скрытые player-токены (`sourceMode="original"`) больше не удаляются из презентации: они остаются видимыми с бейджем `скрыт`.
- Рисование и стирание тумана больше не запускают тяжелую синхронизацию презентации на каждом `pointermove`; синхронизация идет после завершения мазка.
- Locked fog zones стали редактируемыми: их можно двигать, менять размер за угол и видеть в презентации.
- Добавлен `docs/01-delivery/PROJECT_FILE_AUDIT.md` с аудитом файлов проекта в формате `Название файла | За что отвечает | Нужно ли его оптимизировать | Можно ли удалить?`.

### Проверки

- `npm run verify`.
- `npm run test:browser`.

---
## 2026-05-31: Пункт 22 - Campaign Map UX и адаптация пункта 23 под свойства

### Что сделано

- На карте добавлено массовое выделение токенов и фигур через `Shift` / `Ctrl` / `Cmd`-клик.
- В контекстное меню токенов добавлено действие `Открыть изображение` с popup-превью.
- Скрытые на презентации токены получили бейдж `скрыт` на карте мастера.
- Popup тумана получил выбор формы кисти: круг или квадрат.
- Добавлен MVP locked fog zones: зона защищает туман от стирания кистью и удаляется отдельным кликом.
- Locked fog zones помечаются как runtime UI и очищаются sanitizer-слоем перед сохранением persistent HTML.
- Пункт 23 переработан: будущая модель персонажа теперь должна строиться вокруг type-aware блоков `Свойства`, а не вокруг архивного блока `Переменные`.

### Что стало лучше

- Карта получила недостающие быстрые UX-действия без возврата к DOM-first сохранению.
- Туман войны стал управляемее: мастер может использовать квадратную кисть и защищать отдельные зоны от случайного стирания.
- План развития персонажей стал согласован с уже добавленным блоком `Свойства`.

### Проверки

- `npm run verify`.
- `npm run test:browser`.

### Следующее развитие

- Пункт 23: описать `PropertiesModel` и слой расчетов, который читает `Свойства`, legacy `Стат. блок DnD` и будущие character-данные как model-first источник.

---
## 2026-05-27: Пункты 17-20 — шаблоны, граф, AI onboarding и desktop plan

### Что сделано

- Шаблоны страниц перенесены на workspace-level файл `.my-own-world-templates.json`.
- Добавлены serializer/parser шаблонов, migration из `localStorage`, поиск по шаблонам и browser regression.
- Добавлен `docs/02-architecture/KNOWLEDGE_GRAPH_MODEL.md`.
- Добавлен foundation `js/wiki/knowledgeGraph.js` с typed relationships `treeParent` и `wikiLink`, а также orphan detection.
- Добавлен `tests/knowledgeGraph.test.mjs`.
- Добавлен `docs/02-architecture/AI_ONBOARDING.md`.
- Добавлен `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md` с выбором Tauri для первого spike, планом `StorageAdapter`, `AssetAdapter` и desktop smoke checklist.
- `README.md`, `docs/PLANS_AND_TECH_DEBT.md` и manual обновлены.

### Что стало лучше

- Шаблоны теперь переносятся вместе с миром, а не привязаны к браузеру.
- Knowledge Graph получил первый тестируемый model-слой, на который позже можно посадить UI.
- AI-вход в проект стал менее зависим от длинной истории переписки.
- Desktop-направление больше не абстрактная идея, а план adapter-first миграции.

### Проверки

- `npm run verify`.
- `npm run test:browser`.

### Следующее развитие

- Пункт 22: Campaign Map UX-доработки.

---

## 2026-05-27: UX / Onboarding Layer

### Что сделано

- Добавлен `docs/03-testing/UX_ONBOARDING_CHECKLIST.md`.
- Добавлен пример workspace в `docs/03-testing/sample-workspace` со стартовой карточкой, учебной картой, учебным task tracker и пустой папкой assets.
- Верхний popup `нструменты` заменен с временных кнопок на `Быстрый старт`, `Как устроено`, `Checklist`.
- Добавлен `js/ui/onboardingGuide.js` с отдельной встроенной справкой.
- Добавлен `styles/onboarding.css` для мягкого onboarding-popup.
- `README.md` и `docs/PLANS_AND_TECH_DEBT.md` обновлены: пункт 16 закрыт базово, следующим пунктом стал `17. Workspace Templates`.

### Что стало лучше

- У пользователя появился встроенный путь входа без чтения истории разработки.
- Product onboarding отделен от редактора, карты и дерева, поэтому его можно развивать или удалить как самостоятельный слой.
- Sample workspace дает безопасную папку для знакомства с основными сущностями.

### Проверки

- Добавлен browser smoke на открытие onboarding из верхнего popup.

### Следующее развитие

- Пункт 17: перенести шаблоны из `localStorage` в workspace-файл, чтобы шаблоны были частью мира.

---

## 2026-05-26: CSS Separation и type-aware блоки свойств

### Что сделано

- `campaign-map.css` превращен в entrypoint, а стили карты вынесены в `campaign-map-layout.css`, `campaign-map-initiative.css`, `campaign-map-stage.css`, `campaign-map-tokens.css`, `campaign-map-shapes.css`, `campaign-map-token-popup.css`, `campaign-map-popups.css`, `campaign-map-responsive.css`.
- `popup.css` превращен в entrypoint, а popup-семейства вынесены в `popup-create.css`, `popup-link.css`, `popup-wiki.css`, `popup-block.css`, `popup-item-picker.css`, `popup-confirm-profile.css`, `popup-block-type.css`, `popup-image-crop.css`.
- `block-special.css` превращен в entrypoint, а стили специальных блоков вынесены в `block-items-inline.css`, `block-character-stats.css`, `block-dnd-stats-legacy.css`, `block-dnd-stats.css`.
- Добавлен `styles/block-properties.css` для нового блока `Свойства`.
- Добавлен `js/templates/propertyBlockDefinitions.js` со схемами свойств по типам карточек.
- Добавлен type-aware блок `Свойства`: `skill`, `magic`, `item` получают свои поля; `character` создает существующий DnD stat block как свойства персонажа.
- Popup добавления блока показывает `Свойства` только для поддержанных типов карточек.
- Добавлен unit test `tests/propertyBlocks.test.mjs`.

### Что стало лучше

- CSS больше не требует открывать один огромный файл карты или popup-системы ради маленькой правки.
- Стили получили ownership-комментарии и короткие entrypoint-файлы.
- Свойства карточек теперь зависят от типа карточки, а не выбираются пользователем как чужая схема.

### Проверки

- `npm run verify` — успешно, 52 unit/model tests passed.
- `npm run test:browser` — успешно, 19 browser tests passed.

### Следующее развитие

- Пункт 16: UX / Onboarding Layer, потому что техническая основа стала крепче, а вход пользователя в систему все еще слишком резкий.

---

## 2026-05-26: Tables Contract и regression tests

### Что сделано

- Добавлен `docs/02-architecture/contracts/TABLES_CONTRACT.md`.
- В контракте зафиксированы persistent/runtime правила таблиц, resize колонок, selection, paste, keyboard navigation и save/load boundary.
- Добавлен browser regression `tests/browser/tables.spec.mjs`.
- Тест проверяет resize одной колонки без изменения соседней, пересчет общей ширины таблицы, выделение диапазона 2x2, plain-text paste из tab/newline текста и Enter-переход с созданием новой строки.
- `docs/PLANS_AND_TECH_DEBT.md` обновлен: пункт 15 закрыт, следующим рекомендуемым шагом выбран CSS Separation.

### Что стало лучше

- Таблицы теперь не просто разрезаны по файлам, а имеют формальный контракт поведения.
- Следующие изменения таблиц должны расширять один конкретный browser regression, а не проверяться только вручную.
- Persistent HTML таблиц отделен от runtime UI на уровне документации и тестового ожидания.

### Проверки

- `npm run test:browser` — успешно, 19 browser tests passed.

### Следующее развитие

- Пункт 21: разрезать крупные CSS-файлы и ввести ownership-комментарии для визуальных подсистем.

---

## 2026-05-26: Завершение пункта 14 — разрез крупных JS-файлов

### Что сделано

- `blockContract.js` стал фасадом контракта блоков.
- Runtime selectors, runtime marking, table contract, selective upgrades, runtime controls и persistent serializer вынесены в отдельные файлы внутри `js/editor/blocks/`.
- `campaignMapPresentation.js` уменьшен: стили презентации вынесены в `campaignMapPresentationStyle.js`, а точечная синхронизация token/shape — в `campaignMapPresentationItemSync.js`.
- `js/ui/tables.js` стал точкой подключения событий таблиц.
- Табличная логика разнесена по модулям: `tableCells.js`, `tableColumns.js`, `tableResize.js`, `tableSelectionState.js`, `tableToolbar.js`, `tableConstants.js`, `tableRows.js`, `tableClipboard.js`.
- План `docs/PLANS_AND_TECH_DEBT.md` обновлен: 14.4, 14.5 и 14.6 отмечены как выполненные, следующим шагом выбран Tables Contract.

### Что стало лучше

- Крупные файлы на границе persistent/runtime стали проще читать и безопаснее менять.
- Таблицы получили инженерную основу для будущего `TABLES_CONTRACT.md` и regression tests.
- Презентация карты стала меньше зависеть от одного большого файла, поэтому следующие изменения sync-логики легче локализовать.

### Проверки

- `npm run verify` — успешно после разреза `blockContract.js`.
- `npm run verify` — успешно после разреза `campaignMapPresentation.js`.
- `npm run verify` — успешно после разреза `tables.js`.
- `npm run test:browser` — успешно, 18 browser tests passed.
- Проверка типичных UTF-8/mojibake-маркеров — совпадений нет.

### Следующее развитие

- Пункт 15: описать контракт таблиц и добавить regression tests для resize, selection, paste и keyboard navigation.

---

## 2026-05-26: справление Task Tracker и инициативы

### Что сделано

- Старые таск-трекеры снова открывают сохраненные задачи: sanitizer теперь считает безопасным legacy `<script class="task-tracker-data" type="application/json">`.
- Новые и пересохраненные таск-трекеры получают явный атрибут `data-task-tracker-data`.
- Добавлен browser regression, который открывает legacy task tracker через настоящий `openPage()` и проверяет, что задача не пропадает.
- Popup инициативы карты разделен на два окна: выбор/ручной ввод значений и отдельный `Порядок ходов`.
- Значение инициативы теперь можно редактировать вручную; `Roll d20` просто заполняет поля.
- После `Применить` открывается порядок ходов с активным участником и кнопками предыдущий/следующий.

### Проверки

- `npm run verify` — успешно.
- `npm run test:browser` — успешно, 18 browser tests passed.

### Следующее развитие

- Следующий плановый пункт остается `14.4`: разрезать `blockContract.js`.

---

## 2026-05-26: Разрез editor.js и toolbar.js

### Что сделано

- `editor.js` сокращен до фасада публичного API: `setupEditor()`, `openPage()`, `renderEmptyEditor()`, `saveCurrentPage()`, `insertImage()`.
- Открытие страниц вынесено в `js/editor/editorOpenPage.js`.
- Сохранение спец-сущностей карты и таск-трекера вынесено в `js/editor/editorSpecialSave.js`.
- Пустой экран и действия его кнопок вынесены в `js/editor/editorEmptyPage.js`.
- Навигационная панель карточки с "Назад" и "Найти в дереве" вынесена в `js/editor/editorNavigation.js`.
- Paste/plain-text логика вынесена в `js/editor/editorPastePlainText.js`.
- Отложенная нормализация wiki-links вынесена в `js/editor/editorWikiLinkNormalization.js`.
- Открытие обычных внешних ссылок вынесено в `js/editor/editorLinksRuntime.js`.
- Очистка asset images перед render вынесена в `js/editor/editorAssetSanitizer.js`.
- `toolbar.js` стал контроллером событий toolbar.
- Позиционирование toolbar/color-popup вынесено в `js/editor/toolbarPosition.js`.
- Подсветка активных кнопок toolbar вынесена в `js/editor/toolbarActiveState.js`.
- Работа с последними цветами и применением цвета вынесена в `js/editor/toolbarTextColor.js`.

### Что стало лучше

- Редактор больше не является единым комбайном для setup, open, save, paste, пустого экрана и навигации.
- Toolbar стало проще развивать: геометрия, состояние и цветовой слой разделены.
- Публичные импорты `editor.js` сохранены, поэтому остальные подсистемы не требуют массовой перепривязки.

### Проверки

- `npm run verify` — успешно.
- `npm run test:browser` — успешно, 17 browser tests passed.

### Следующее развитие

- Продолжить пункт `14.4`: разрезать `blockContract.js`, потому что это следующий крупный файл на границе persistent/runtime HTML.

---

## 2026-05-26: Доработка инициативы карты

### Что сделано

- Popup инициативы стал показывать результаты броска: итог, d20 и модификатор.
- Добавлено отображение активного хода и кнопки предыдущий/следующий участник.
- Повторное применение участников больше не стирает уже сделанные броски выбранных участников.
- Токены карты получили persistent поле `initiativeModifier` / `data-initiative-modifier`.
- Browser regression инициативы расширен: проверяет видимые строки, результаты и переключение активного хода.

### Что стало лучше

- нициатива теперь работает как полезный боевой popup, а не как скрытая запись состояния в модель.
- Состояние боя понятнее мастеру: видно, чей ход, и можно двигаться по очереди.

### Риски / Что осталось

- Модификатор инициативы пока хранится на токене и не вычисляется автоматически из характеристик персонажа.
- Нет отдельного режима "начать/закончить бой" и ручного редактирования модификатора прямо в popup.

### Следующее развитие

- Позже связать `initiativeModifier` с будущей CharacterModel / DnD stats layer.

---

## 2026-05-26: Campaign Map Layers 13.1-13.2

### Что сделано

- Добавлен `js/editor/campaignMapLayerModel.js`.
- Введены базовые слои карты: `Объекты`, `Существа`, `Фигуры`.
- `CampaignMapModel` теперь хранит `layers`, а токены и фигуры получают `layerId` и `zIndex`.
- Data-first serializer сохраняет `data-layer-state`, `data-layer-id` и `data-z-index`.
- Render adapter применяет `style.zIndex`, чтобы порядок слоев начал работать визуально без будущего UI.
- В toolbar карты добавлена кнопка `Слои`.
- Popup слоев умеет включать/выключать слой и менять порядок слоя вверх/вниз.
- Видимость слоя применяется через `data-layer-hidden`.
- Добавлены unit-тесты `tests/campaignMapLayerModel.test.mjs` и расширены тесты модели/сериализатора карты.
- Добавлен browser regression `campaign-map-layers-control-visibility-and-z-order`.

### Что стало лучше

- У карты появился model-first контракт слоев, на который можно опереться при UI управления слоями, массовом выделении и будущей настройке видимости.
- Порядок объектов больше не является только CSS-договоренностью: он сохраняется в данных карты.

### Риски / Что осталось

- Visibility отдельного объекта/токена пока остается через существующие `presentationHidden` и будущий layer/object UI.
- Lock на уровне слоя описан в модели, но пока не подключен к pointer-контроллерам.

### Следующее развитие

- Следующий крупный долг по плану: `14.2` разрезать `editor.js`.

---

## 2026-05-26: CI fix для Linux import path case

### Что сделано

- справлен регистр tracked-файла `js/ui/dndStats.js`: раньше в git он был записан как `js/ui/dndstats.js`, хотя код импортировал `dndStats.js`.
- Добавлен `tools/check_import_paths.mjs`.
- `npm run verify` теперь запускает проверку точного регистра относительных и browser-absolute import-путей.
- справлен UTF-8 комментарий в `tools/run_checks.mjs`.

### Что стало лучше

- GitHub Actions на Ubuntu больше не должен получать 404 при загрузке `js/ui/dndStats.js`.
- Такая же ошибка не сможет тихо пройти локально на Windows: `verify` остановится до browser smoke.

### Риски / Что осталось

- Нужно дождаться нового запуска GitHub Actions после push и убедиться, что внешний `Verify` стал зеленым.

### Следующее развитие

- Продолжать усиливать CI проверками, которые ловят Windows/Linux различия до запуска браузера.

---

## 2026-05-25: GitHub Actions CI 8.1-8.2

### Что сделано

- Добавлен `.github/workflows/verify.yml`.
- Workflow запускается на push в `main` и на pull request.
- Добавлен `actions/checkout@v4`.
- Добавлен `actions/setup-node@v4` с Node.js 22 и npm cache.
- Добавлен шаг `npm ci`, чтобы зависимости ставились строго по `package-lock.json`.
- В workflow уже включен `npm run verify`, чтобы базовая проверка работала сразу.

### Что стало лучше

- У проекта появился первый CI-контур на GitHub Actions.
- Локальный `npm run verify` начинает превращаться в обязательную внешнюю проверку.

### Риски / Что осталось

- Browser smoke пока не вынесен отдельным CI-шагом с artifacts. Это следующий пункт `8.4-8.5`.
- Правило "перед merge/push зеленый CI обязателен" еще нужно зафиксировать в release/checklist документах.

### Следующее развитие

- Выполнить `8.4`: добавить `npm run test:browser` в CI.
- Затем `8.5`: сохранять Playwright traces/logs как artifacts при падении.

---

## 2026-05-25: Safe HTML Security Regression 7.6

### Что сделано

- Расширен `tests/browser/safe-html.spec.mjs` до набора security regression tests.
- Добавлены проверки forbidden tags: executable `<script>`, `iframe`, `object`, `embed`, `link`, `meta`, `style`, `form`.
- Зафиксировано исключение task tracker JSON: `script[type="application/json"][data-task-tracker-data]` сохраняется, лишние атрибуты удаляются.
- Добавлены проверки unsafe attributes and URLs: `on*`, `javascript:`, `vbscript:`, `data:text/html`, `blob:` sources.
- Добавлены проверки runtime leakage: block controls, toolbar, image controls, table controls, campaign map toolbar/popup/drag vector, task tracker runtime board.
- Добавлена проверка malformed HTML и plain text paste sanitizer.
- `safeHtmlSanitizer.js` расширен runtime selectors для campaign map и task tracker runtime UI.

### Что стало лучше

- Sanitizer теперь прикрыт browser regression tests, а не только ручной уверенностью.
- Будущие изменения сохранения, карты, task tracker и paste сразу покажут, если runtime UI или опасный HTML снова начнет попадать в persistent content.

### Риски / Что осталось

- Строгий allowlist классов и `data-*` все еще не включен, чтобы не сломать текущие legacy-блоки. Его стоит делать отдельным подпунктом после анализа реальных сохраненных `.md`.

### Следующее развитие

- Перейти к P0-блоку `8. CI На GitHub Actions`.

---

## 2026-05-25: Safe HTML Sanitizer 7.3-7.5

### Что сделано

- Добавлен `js/editor/safeHtmlSanitizer.js`.
- Реализованы `sanitizePersistentHTMLOnSave()`, `sanitizePersistentHTMLOnLoad()` и `sanitizePlainTextPaste()`.
- Sanitizer удаляет runtime UI, forbidden tags, inline `on*` handlers, `javascript:` / `vbscript:` URLs, dangerous `data:text/html`, `blob:` sources на save и небезопасные style-атрибуты.
- Task tracker JSON script сохранен как разрешенное исключение: `type="application/json"` + `data-task-tracker-data`.
- Save boundary подключен к autosave, сохранению карт, task tracker, block serializer и созданию страниц по шаблону.
- Load/open boundary подключен перед вставкой HTML в editor.
- Paste boundary подключен для редактора и таблиц.
- Добавлен browser regression `tests/browser/safe-html.spec.mjs`.

### Что стало лучше

- Persistent HTML теперь проходит через единый защитный слой перед сохранением и открытием.
- В `.md` сложнее случайно протащить runtime-кнопки, обработчики событий, `javascript:` ссылки и временные `blob:` sources.
- Вставка текста продолжает быть plain text и теперь дополнительно чистит control chars.

### Риски / Что осталось

- Sanitizer пока мягкий к `class` и большинству `data-*`, чтобы не сломать текущую разметку. Строгий allowlist классов и data-полей лучше вводить после расширения security tests.
- 7.6 остается следующим шагом: нужно добавить больше regression cases из `SAFE_HTML_CONTRACT.md`.

### Следующее развитие

- Выполнить `7.6`: forbidden tags, script injection, unsafe attributes, malformed HTML, runtime controls leakage, task tracker JSON exception, map toolbar leakage.

---

## 2026-05-25: Safe HTML Contract 7.1-7.2

### Что сделано

- Создан `docs/02-architecture/contracts/SAFE_HTML_CONTRACT.md`.
- Описана граница `persistent content` и `runtime UI`.
- Зафиксированы общие запреты: executable tags, inline event handlers, `javascript:` URLs, runtime DOM, временные drag/selection/toolbar элементы.
- Описан allowlist для базовых текстовых тегов, ссылок, wiki-links, card shell, блоков, form controls, таблиц, изображений, campaign map и task tracker.
- Зафиксированы будущие boundary-точки: save, load/open и paste.
- Описаны security regression scenarios для будущего пункта `7.6`.

### Что стало лучше

- Следующий sanitizer можно реализовывать по документу, а не по догадкам из текущего DOM.
- У команды появился единый язык: что считается runtime, что можно сохранять, что надо восстанавливать при open.
- Контракт уже учитывает текущую архитектуру data-first карты и JSON-модель task tracker.

### Риски / Что осталось

- Контракт пока не исполняемый: код sanitizer еще не написан.
- Некоторые текущие подсистемы могут временно хранить больше атрибутов, чем будущий sanitizer разрешит. При реализации 7.3 нужно сверять реальные сохраненные HTML-кейсы.

### Следующее развитие

- Выполнить `7.3`: реализовать sanitizer на save и добавить первые unit-тесты на удаление runtime UI и dangerous HTML.

---

## 2026-05-25: PageRepository Migration 6.6-6.8

### Что сделано

- `pageTitleValidation.js` переведен на `PageRepository`: проверка дублей идет через `getPagesByTitle()` и `findDuplicateTitles()`.
- Campaign map picker/player lookup переведен на repository API: список доступных карточек, проверка ветки карты, получение выбранных страниц и подсчет следующих индексов дублей.
- External drop из дерева на карту теперь получает страницу через `getPageById()`.
- Token actions карты используют repository lookup для удаления, открытия и дублирования карточек токенов.
- Bucket lookup карты переведен на `getChildren(mapPageId)`.
- Create menu для задач ищет task tracker через `queryPages({ type: 'taskTracker' })`.
- Создание карточки по шаблону уведомляет `PageRepository` после изменения metadata созданной страницы.
- Backlinks/future graph references читают страницы через `getAllPages()`.
- Тесты `pageTitleValidation` переведены на `setPages`, чтобы проверять актуальный lifecycle repository.

### Что поменялось для пользователя

- Проверка одинаковых названий должна работать так же, но теперь опирается на единый индекс.
- Добавление существ/объектов/игроков на карту через `+` и перетаскивание из дерева должно сохранить прежнее поведение, но lookup стал единообразнее.
- Создание задачи через `+ -> задача` и создание карточки по шаблону должны стабильнее видеть актуальные страницы после изменений.

### Риски / Что осталось

- В проекте еще остаются legacy-прямые обращения к `state.pages`, особенно в дереве, editor navigation и некоторых модулях карты. Они не входят в 6.6-6.8 и будут закрываться отдельными задачами разреза крупных файлов или repository hardening.
- Следующий P0-блок — Safe HTML Boundary / Sanitizer.

### Следующее развитие

- Начать `7.1`: описать `SAFE_HTML_CONTRACT.md`, затем реализовать sanitizer на save/load/paste.

---

## 2026-05-25: PageRepository Migration 6.4-6.5

### Что сделано

- `wikiLinkLookup.js` переведен с прямого обхода `state.pages` на `PageRepository`.
- Refresh wiki-links, клик по wiki-link, hover preview и popup "Связать с существующей" теперь ищут страницы через единый индекс.
- Popup выбора существующей wiki-link цели больше не собирает отдельный lookup ветки карты, а использует `isUnderTemplate(page.id, 'campaignMap')`.
- Sidebar search переведен на `searchPages()`, который берет страницы из `PageRepository`.
- Добавлены unit-тесты `tests/wikiLinkLookup.test.mjs` и `tests/searchPages.test.mjs`.

### Что поменялось для пользователя

- Wiki-links должны стабильнее находить карточки по названию и alias.
- В popup "Связать с существующей" не должны попадать технические дубли из веток карт.
- Поиск в sidebar визуально работает как раньше, но его логика стала единообразной и тестируемой.

### Риски / Что осталось

- В wiki/create/search еще есть локальная фильтрация и parse body. Это нормально для текущего этапа, но будущий `PageRepository` может получить отдельный full-text/search индекс.
- Следующий важный шаг — `6.6`: перевести проверку дублей названий на `PageIndex`.

---

## 2026-05-25: PageRepository Lifecycle 6.3

### Что сделано

- Создан `js/repository/pageRepository.js` как единый runtime-слой поверх `PageIndex`.
- Repository подписан на `setPages`, поэтому массовая замена списка страниц автоматически пересобирает индекс.
- `loadWorkspace()` теперь фиксирует результат сканирования через `setPages([...state.pages])`, чтобы индекс видел загруженные страницы.
- `writePageFile()` при создании страницы больше не делает только прямой `state.pages.push`, а обновляет список через `setPages`.
- Переносы, aliases, autosave, сохранение карт/таск-трекеров, создание предметов и нормализация дублей карты теперь вызывают lifecycle notify для repository.
- Добавлены unit-тесты `tests/pageRepository.test.mjs` на rebuild после `setPages`, rename/tag/type/alias update, move и delete.
- Обновлен `docs/02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md`: зафиксирована текущая реализация 6.3 и Definition of Done.

### Что стало лучше

- У проекта появился живой индекс страниц, а не только тестируемая структура данных.
- Новый код может обращаться к `PageRepository` сразу, не дожидаясь полного перевода всех legacy-модулей.
- ндекс меньше рискует рассинхронизироваться после загрузки, создания, удаления, переименования и переноса страниц.

### Риски / Что осталось

- Update-операции пока делают полный rebuild. Это безопасно, но в будущем можно заменить часть операций на точечное обновление индекса.
- Большая часть feature-кода все еще читает `state.pages` напрямую. Следующий пункт — перевести wiki-links на `PageRepository / PageIndex`.

### Следующее развитие

- Выполнить `6.4`: перевести wiki-links на `PageIndex`, чтобы поиск target по title/aliases шел через единый repository.

---

## 2026-05-25: PageIndex 6.2

### Что сделано

- Создан `js/repository/pageIndex.js`.
- Добавлен чистый `PageIndex` без DOM и browser API.
- Реализованы индексы по `id`, `title`, `aliases`, `parent`, `template`, `type`, `tags`.
- Добавлены методы чтения: `getPageById`, `getPageByTitle`, `findPageByTitleOrAlias`, `getChildren`, `getSiblings`, `getParentChain`, `isDescendantOf`, `isUnderTemplate`, `queryPages`, `findDuplicateTitles`.
- Добавлены unit-тесты `tests/pageIndex.test.mjs`.
- В плане пункт `6.2` отмечен как сделанный, а `6.9` как частично сделанный.

### Что стало лучше

- Появился первый кодовый слой для будущего `PageRepository`.
- Lookup по основным metadata теперь можно тестировать без UI и workspace.
- Следующие миграции wiki-links, search, duplicates и campaign map picker смогут опираться на один индекс.

### Оставшиеся риски

- `PageIndex` пока не подключен к runtime lifecycle.
- Существующий UI-код все еще напрямую обходит `state.pages`.
- Browser regression для UI-потребителей появятся после перевода первых подсистем.

### Следующее развитие из этой работы

- Выполнить `6.3`: сделать lifecycle индекса через `PageRepository` или repository singleton.
- Подключить rebuild после `setPages` / `loadWorkspace`.
- После lifecycle начать перевод `wikiLinkLookup.js` на индекс.

---

## 2026-05-25: PageRepository 6.1

### Что сделано

- Проверен актуальный план перед стартом `6.1`: пункты 1-5 не блокируют проектирование `PageRepository`.
- Создан `docs/02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md`.
- В контракте описаны ответственность repository, будущий public API, lifecycle, правила запрета новых хаотичных lookup по `state.pages`, исключения переходного периода и первые подсистемы для миграции.
- В `README.md` добавлен раздел `PageRepository` с кратким правилом для нового кода.
- В `docs/PLANS_AND_TECH_DEBT.md` пункт `6.1` отмечен как сделанный, а текущий следующий шаг изменен на `6.2 Создать PageIndex`.

### Что стало лучше

- У будущей миграции к `PageIndex` появился явный контракт.
- Новые фичи теперь должны добавлять недостающий метод в repository, а не писать локальный обход `state.pages`.
- Переходный период описан честно: legacy-код пока остается, но новый код должен идти через repository.

### Оставшиеся риски

- Кодового `PageRepository / PageIndex` еще нет.
- В проекте остается много прямых lookup по `state.pages`; это будет закрываться пунктами `6.2-6.8`.
- Пока нет автоматической проверки, запрещающей новые lookup по `state.pages`.

### Следующее развитие из этой работы

- Реализовать `6.2 Создать PageIndex`: индексы по `id`, `title`, `aliases`, `parent`, `type`, `tags`.
- Добавить unit tests для базовых index-операций.
- После этого начать переводить `wikiLinkLookup.js`, `search.js`, `pageTitleValidation.js` и `campaignMapPicker.js`.

---

# Архив исходного файла планов и техдолга

Этот файл является рабочим журналом архитектурных решений. После крупных изменений нужно добавлять сюда короткий анализ: что стало лучше, какие риски остались и какой следующий шаг логично сделать.

## Актуальный приоритетный план (обновлен 2026-05-25)

Этот раздел — верхний навигатор проекта. При новых задачах добавлять их как подпункты в существующую структуру, а не заводить параллельный устный план.

Оценка обновленного списка: порядок в целом правильный. Первые шесть пунктов являются фундаментом зрелости продукта: данные, безопасность, CI, assets, производительность и релизы. Фичи карты, onboarding, graph и desktop лучше делать после них или параллельно только маленькими безопасными кусками. Самый важный практический эффект даст `PageRepository / PageIndex`, потому что он разгрузит `state.pages`, ускорит lookup и станет базой для wiki-links, поиска, карты, шаблонов, проверки дублей, graph и будущих фич.

### 1. PageRepository / PageIndex

- Статус: **не сделано**.
- Приоритет: **P0**.
- Почему здесь: это главный слой данных, который должен заменить хаотичные lookup по `state.pages`.

1.1. Спроектировать `PageRepository`: **не сделано**.
Определить ответственность, описать public API, запретить хаотичные lookup по `state.pages` в новом коде.

1.2. Создать `PageIndex`: **не сделано**.
ндексы: по `id`, `title`, `aliases`, `parent`, `type`, `tags`.

1.3. Сделать lifecycle индекса: **не сделано**.
`rebuild` после load, `update` после create, rename, move, delete, tag/type change.

1.4. Перевести wiki-links на `PageIndex`: **не сделано**.

1.5. Перевести поиск на `PageIndex`: **не сделано**.

1.6. Перевести проверку дублей на `PageIndex`: **не сделано**.

1.7. Перевести campaign map picker/player lookup на `PageIndex`: **не сделано**.

1.8. Добавить unit/browser regression для `PageIndex`: **не сделано**.

### 2. Safe HTML Boundary / Sanitizer

- Статус: **не сделано**.
- Приоритет: **P0**.
- Почему здесь: это главный security blocker перед web/cloud и важная защита local workspace от мусора в HTML.

2.1. Описать Safe HTML Contract: **не сделано**.
Что можно сохранять, что нельзя сохранять, что является runtime UI, что является persistent content.

2.2. Составить allowlist HTML: **не сделано**.
Text blocks, headings, links, wiki-links, tables, images, campaign map shell, task tracker shell.

2.3. Реализовать sanitizer на save: **не сделано**.

2.4. Реализовать sanitizer на load/open: **не сделано**.

2.5. Реализовать paste sanitization: **не сделано**.

2.6. Добавить security regression tests: **не сделано**.
Forbidden tags, script injection, unsafe attributes, malformed HTML, runtime controls leakage.

### 3. CI на GitHub Actions

- Статус: **не сделано**.
- Приоритет: **P0**.
- Почему здесь: локальные проверки уже есть, но они должны стать обязательным защитным контуром.

3.1. Добавить `.github/workflows/verify.yml`: **не сделано**.

3.2. Запускать `npm ci`: **не сделано**.

3.3. Запускать `npm run verify`: **не сделано**.

3.4. Запускать browser tests: **не сделано**.

3.5. Добавить artifact/logs при падении Playwright: **не сделано**.

3.6. Зафиксировать правило: перед merge/push зеленый CI обязателен: **не сделано**.

### 4. Asset Lifecycle Contract

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: картинки уже активно используются, а новая идея про музыку локаций добавляет audio/playlist assets.

4.1. Описать `ASSET_LIFECYCLE_CONTRACT.md`: **не сделано**.

4.2. Определить типы assets: **не сделано**.
`image`, `portrait`, `map background`, `audio`, `playlist`, future media.

4.3. Ввести единый `AssetReference`: **не сделано**.
`id/path`, `type`, `owner`, `fallback`, `missing state`.

4.4. Сделать broken asset checker: **не сделано**.

4.5. Сделать orphan asset detection: **не сделано**.

4.6. Подготовить основу под музыку локаций: **не сделано**.

4.7. Добавить asset tests: **не сделано**.

### 5. Performance Strategy Для Карты

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: карта уже является тяжелой runtime-системой, оптимизации должны стать измеримыми.

5.1. Описать performance risks карты: **не сделано**.
Много токенов, много фигур, большой background, fog, presentation sync, zoom/pan.

5.2. Ввести performance scenarios: **не сделано**.

5.3. Добавить измерения: **не сделано**.
Render time, sync time, number of visible objects, background load.

5.4. Ввести performance budgets: **не сделано**.

5.5. Оптимизировать presentation full-sync: **не сделано**.

5.6. Добавить performance regression smoke: **не сделано**.

### 6. Release Process / Changelog

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: версии уже используются в коммитах, но релизный процесс не формализован.

6.1. Создать `docs/01-delivery/CHANGELOG.md`: **не сделано**.

6.2. Описать release checklist: **не сделано**.

6.3. Согласовать `package.json` version с git tags: **не сделано**.

6.4. Ввести правило версий: **не сделано**.
`patch`, `minor`, `major`, `experimental`.

6.5. Добавить rollback guide: **не сделано**.

6.6. Добавить release notes template: **не сделано**.

### 7. Campaign Map Initiative

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: важная игровая фича, но лучше строить ее на `PageIndex` и текущем map model.

7.1. Спроектировать `InitiativeModel`: **не сделано**.

7.2. Подключить живые токены карты: **не сделано**.

7.3. Учесть `sourceMode="original"` для игроков: **не сделано**.

7.4. Сделать popup выбора участников: **не сделано**.

7.5. Добавить `roll d20`: **не сделано**.

7.6. Добавить initiative modifier: **не сделано**.

7.7. Сделать сортировку порядка: **не сделано**.

7.8. Сделать active turn / next / previous: **не сделано**.

7.9. Сохранение/восстановление инициативы: **не сделано**.

7.10. Browser regression initiative: **не сделано**.

### 8. Campaign Map Layers

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: слои нужны перед массовым select и сложными fog/object сценариями.

8.1. Спроектировать `LayerModel`: **не сделано**.

8.2. Ввести z-order для token/shape/object: **не сделано**.

8.3. UI управления слоями: **не сделано**.

8.4. Visibility per layer/object: **не сделано**.

8.5. Serializer/restore layers: **не сделано**.

8.6. Browser regression layers: **не сделано**.

### 9. Разрез Крупных Файлов

- Статус: **в работе**.
- Приоритет: **P1**.
- Почему здесь: проект уже большой, а крупные файлы повышают риск регрессий.

9.1. Разрезать `editor.js`: **не сделано**.

9.2. Разрезать `toolbar.js`: **не сделано**.

9.3. Разрезать `blockContract.js`: **не сделано**.

9.4. Разрезать `campaignMapPresentation.js`: **не сделано**.

9.5. Разрезать `tables.js`: **не сделано**.

9.6. После каждого разреза запускать full regression: **правило принято**.

### 10. UX / Onboarding Layer

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: продукт становится мощным, но новому пользователю нужна входная траектория.

10.1. Создать sample workspace: **не сделано**.

10.2. Сделать стартовый tutorial: **не сделано**.

10.3. Добавить "как устроен продукт" внутри приложения: **не сделано**.

10.4. Добавить onboarding для карточек, дерева, wiki-links, карты, task tracker: **не сделано**.

10.5. Добавить UX checklist: **не сделано**.

### 11. Workspace Templates

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: шаблоны должны жить вместе с миром, а не только в браузере.

11.1. Перенести templates из `localStorage` в workspace-файл: **не сделано**.

11.2. Сделать template serializer: **не сделано**.

11.3. Сделать migration старых templates: **не сделано**.

11.4. Добавить поиск по шаблонам: **не сделано**.

11.5. Добавить browser tests: **не сделано**.

### 12. Knowledge Graph

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: wiki-links уже есть, но мир пока больше tree-first, чем graph-first.

12.1. Описать graph model: **не сделано**.

12.2. Добавить typed relationships: **не сделано**.

12.3. Добавить orphan pages view: **не сделано**.

12.4. Добавить backlinks improvements: **не сделано**.

12.5. Позже — graph view: **не сделано**.

### 13. AI Onboarding Guide

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: проект активно развивается через AI, поэтому входной документ снизит риск потери контекста.

13.1. Создать `AI_ONBOARDING.md`: **не сделано**.

13.2. Кратко описать архитектуру: **не сделано**.

13.3. Описать "что нельзя ломать": **не сделано**.

13.4. Описать обязательные проверки перед изменениями: **не сделано**.

13.5. Описать формат задач для Codex: **не сделано**.

### 14. Desktop Adapter Plan

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: desktop естественно подходит local-first продукту, но сначала нужен план адаптеров.

14.1. Описать desktop target: **не сделано**.

14.2. Выбрать Tauri/Electron для spike: **не сделано**.

14.3. Спроектировать `StorageAdapter`: **не сделано**.

14.4. Спроектировать `AssetAdapter`: **не сделано**.

14.5. Сделать desktop smoke checklist: **не сделано**.

14.6. Позже — prototype: **не сделано**.

### 15. CSS Separation

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: CSS уже разросся, но лучше резать после стабилизации core-архитектуры.

15.1. Разрезать `campaign-map.css`: **не сделано**.

15.2. Разрезать `popup.css`: **не сделано**.

15.3. Разрезать `block-special.css`: **не сделано**.

15.4. Ввести CSS ownership comments: **не сделано**.

15.5. Проверить visual regression: **не сделано**.

### 16. Campaign Map UX-Доработки

- Статус: **не сделано**.
- Приоритет: **P2/P3**.
- Почему здесь: это полезные UX-фичи, но они должны идти после слоев, assets и performance strategy.

16.1. Mass select: **не сделано**.

16.2. Context menu "открыть изображение": **не сделано**.

16.3. Hidden hero visibility icon: **не сделано**.

16.4. Square fog brush: **не сделано**.

16.5. Locked fog zones: **не сделано**.

## Предыдущий рабочий план и история выполнения

### 1. Smoke / Regression Tests

- Статус: **в работе**.
- Текущий активный подпункт: **6.2 нициатива на карте**.

1.1. Smoke app shell: **сделано**.

1.2. Unit-тесты дерева: drop intent / move planner: **сделано**.

1.3. Unit-тесты карты: model / serializer / store: **сделано**.

1.4. Browser smoke карты save/reload: token, shape, grid, fog, viewport: **сделано**.

1.5. Browser regression удаления токена: удалить дочернюю карточку из дерева -> токен исчезает с открытой и закрытой карты: **сделано**.

1.6. Browser UI flow карты через кнопку `+`: picker, копии, папки `Существа.Карта` / `Объекты.Карта`: **сделано**.

1.7. Browser smoke presentation sync: **сделано**.

1.8. Browser tests форматирования текста: **сделано**.

1.9. Browser tests task tracker: **сделано**.

1.10. Browser tests шаблонов: **сделано**.

### 2. Tree Pointer-Based DnD

- Статус: **архитектурно сделано**.

2.1. Pointer DnD вместо HTML5 DnD: **сделано**.

2.2. Preview / placeholder / stable drop intent: **сделано**.

2.3. Тесты расчетов drop intent и move planner: **сделано**.

2.4. Дополнительные browser regression tests дерева: **сделано**.

### 3. Campaign Map Data-First Save

- Статус: **архитектурно сделано**.

3.1. `CampaignMapModel`: **сделано**.

3.2. `CampaignMapStore`: **сделано**.

3.3. Data-first serializer: **сделано**.

3.4. Drag стартует из store, не из `dataset`: **сделано**.

3.5. Закрытые карты патчатся через model/data-first путь: **сделано**.

3.6. Browser save/reload regression: **сделано**.

3.7. Render adapter `CampaignMapModel -> DOM`: **сделано**.

3.8. Убрать compatibility helpers `commitTokenModelToElement()` / `commitShapeModelToElement()`: **сделано**.

### 4. Editor History Contract

- Статус: **архитектурно сделано, нужны дальнейшие regression tests по мере расширения редактора**.

4.1. Описать единый контракт истории: **сделано**.

4.2. Ctrl+Z / Ctrl+Y через управляемую историю: **сделано**.

4.3. Вставка текста как history action: **сделано**.

4.4. Форматирование как history action: **сделано**.

4.5. Блоки / таблицы / wiki-links как structural actions: **сделано**.

### 5. FormattingService

- Статус: **архитектурно сделано, deprecated fallback еще нужно заменить собственной реализацией позже**.

5.1. золировать `execCommand` как fallback: **сделано**.

5.2. Описать правила форматирования: **сделано**.

5.3. Убрать прямую зависимость toolbar от deprecated API: **сделано**.

### 6. Campaign Map Tactical Features

- Статус: **новый приоритетный блок, не сделано**.
- Приоритет: **средне-высокий после 5.2/5.3**, потому что это активно развивает карту, но часть пунктов лучше делать после PageRepository/PageIndex и дальнейшего укрепления map model.

6.1. гроки на карте без дубля в дереве: **сделано**.
Приоритет: **P1**. Добавить в `+` отдельное действие "грок"; при выборе карточки с тегом `player` токен привязывается к оригинальной карточке, а не создает дочерний дубль. При drag из дерева карточки с тегом `player` применять тот же режим. Важно для хитов и инвентаря оригинала.

6.2. нициатива на карте: **не сделано**.
Приоритет: **P1**. Кнопка "нициатива", popup выбора живых существ на карте, `roll d20`, сортировка порядка. Лучше опираться на живые токены и будущий PageIndex/характеристики.

6.3. Слои карты и порядок объектов: **не сделано**.
Приоритет: **P1**. Нужен явный model-first слой для token/shape/object order, UI управления слоями и сохранение порядка в карте.

6.4. Массовый select существ и объектов: **не сделано**.
Приоритет: **P2**. Делать после слоев, потому что массовые действия должны понимать порядок, группы и типы элементов.

6.5. Контекстное меню "открыть изображение": **не сделано**.
Приоритет: **P2**. Быстрое улучшение UX: popup с картинкой существа/объекта из карточки или asset. Можно делать независимо.

6.6. Скрытый герой в презентации не исчезает, а получает значок скрытия: **не сделано**.
Приоритет: **P2**. Это меняет правило presentation visibility только для player/hero-сущностей; нужно аккуратно не сломать скрытие монстров и объектов.

6.7. Квадратная кисть тумана войны: **не сделано**.
Приоритет: **P3**. Расширение fog brush shape: circle/square. Низкий риск, но не блокирует основные сценарии.

6.8. Locked fog zones: **не сделано**.
Приоритет: **P3**. Зоны тумана, которые нельзя стереть кистью, а можно скрывать/удалять отдельно. Архитектурно ближе к shapes/fog layers, делать после слоев.

6.9. Музыкальные плейлисты локаций из workspace: **не сделано**.
Приоритет: **P2**. дея из `docs/Новые идеи к адаптации.txt`: добавить проигрывание музыки из workspace с привязкой к локации, чтобы для выбранной локации или карты мог по кругу крутиться плейлист. Перед реализацией нужно спроектировать audio asset lifecycle, правила хранения ссылок на файлы, UI управления плейлистом и связь с карточками локаций через будущий `PageRepository / PageIndex`.

### 7. Шаблоны В Workspace

- Статус: **не сделано**.

7.1. Хранить шаблоны не в `localStorage`, а в файле workspace: **не сделано**.

7.2. UI удаления/создания шаблонов привязать к workspace-файлу: **не сделано**.

### 8. PageRepository / PageIndex

- Статус: **не сделано**.

8.1. ндекс по title / aliases / parent / type / tags: **не сделано**.

8.2. Перевести wiki-links, карту, поиск и проверку дублей на index: **не сделано**.

### 9. Safe HTML Boundary / Sanitizer

- Статус: **не сделано**.

9.1. Определить разрешенный HTML: **частично описано концептуально**.

9.2. Ввести sanitizer перед сохранением/открытием: **не сделано**.

### 10. Разрез Крупных Файлов

- Статус: **в работе**.

10.1. `campaignMap.js`: **сильно продвинулось**.

10.2. `blockContract.js`: **не сделано**.

10.3. `editor.js`: **не сделано**.

10.4. `toolbar.js`: **не сделано**.

10.5. `tables.js`: **не сделано**.

10.6. `campaignMapPresentation.js`: **не сделано**.

### 11. CSS Разделение

- Статус: **не сделано**.

11.1. `campaign-map.css`: **не сделано**.

11.2. `popup.css`: **не сделано**.

11.3. `block-special.css`: **не сделано**.

## 2026-05-21: Smoke/regression checklist и первый слой автотестов

### Что делаем

- Закрепляем `docs/03-testing/SMOKE_TESTS.md` как обязательный checklist перед коммитами, которые затрагивают editor, tree, campaign map, task tracker, storage, block system или templates.
- Добавляем первый легкий автотестовый слой без браузерных зависимостей.
- Проверяем в автотестах только model/helper-код, чтобы тесты запускались быстро и не требовали выбранного workspace.
- Добавляем единую команду `npm run verify`, которая собирает базовые проверки в один запуск.
- Добавляем foundation для будущих browser smoke tests в `tests/browser/`.
- Подключаем Playwright как реальный browser runner и добавляем первый smoke `app-shell-empty-state`.

### Зачем это нужно

- Проект уже несколько раз ловил повторные регрессии в одних и тех же местах: tree drag/drop, сохранение после переноса, карта, презентация, форматирование, task tracker.
- Без тестового контура каждое крупное изменение требует длинной ручной проверки и все равно может пропустить старый сценарий.
- Первый слой тестов должен стать базой для дальнейшего Playwright/browser smoke, а не заменой ручного UI-чеклиста.

### Правила для тестов

- Тесты не должны изменять пользовательский workspace.
- Тесты не должны требовать реального File System Access API.
- Чистые модели и helper-слои проверяются через `node:test`.
- Перед коммитом основной командой считается `npm run verify`.
- Browser/UI-сценарии сначала описываются в checklist, затем постепенно переводятся в автоматизацию.
- Browser smoke сценарии фиксируются в `tests/browser/scenarios.mjs`, чтобы будущий Playwright runner не начинался с устной памяти.

### Browser smoke foundation

- `tests/browser/README.md` описывает правила будущих браузерных тестов, тестовый workspace и рекомендуемый runner.
- `tests/browser/scenarios.mjs` хранит приоритетный список сценариев:
  - `P0`: дерево после переноса и сохранения, свернутость дерева, карта с токеном, presentation sync;
  - `P1`: toolbar formatting boundary, task tracker DnD, popup viewport fit;
  - `P2`: создание карточки по шаблону.
- `tests/browser/app-shell.spec.mjs` уже проверяет базовый запуск приложения без workspace, пустой стартовый экран и отсутствие console/page errors.
- Browser smoke запускается командой `npm run test:browser`; она поднимает локальный static server через `tools/run_browser_smoke.mjs`.

### Следующее развитие из этой работы

- Добавить browser smoke для дерева, карты, task tracker и toolbar.
- После перевода дерева на pointer-based DnD добавить автотесты на расчет drop intent.
- После data-first save карты добавить тесты сериализации карты без DOM-клона.
- Добавить fixture workspace и начать автоматизацию `P0` сценариев из `tests/browser/scenarios.mjs`.

## 2026-05-21: Нумерация сущностей карты при добавлении через плюс

### Что сделано

- справлено создание дочерних дублей при добавлении существ и объектов на карту через toolbar `+`.
- Если пользователь указывает несколько копий, дубли теперь получают названия вида:
  - `Существо1.Название карты`;
  - `Существо2.Название карты`;
  - `Объект1.Название карты`;
  - `Объект2.Название карты`.
- Нумерация продолжает уже существующие дочерние сущности в папках `Существа.Название карты` и `Объекты.Название карты`, а не начинается каждый раз с `1`.
- Добавлен helper `getCampaignMapNumberedEntityTitle()` и unit-проверка формата названия.

### Риски

- Внешний drop из дерева на карту пока сохраняет старое правило с названием исходной карточки и `сущность.Название карты`; это отдельный сценарий и он не менялся.
- Если пользователь вручную переименует дочерние сущности не по шаблону, автоматическая нумерация просто пропустит такие имена.

### Следующее развитие из этой работы

- Добавить browser smoke fixture для сценария `campaign-map-token-flow`, чтобы проверить не только helper, но и реальные дочерние строки в дереве.

## 2026-05-21: Перевод дерева на pointer-based DnD

### Что сделано

- `js/tree/treeDragDrop.js` переведен с HTML5 `dragstart/dragover/drop` на pointer-based `pointerdown/pointermove/pointerup`.
- Дерево теперь использует floating preview и стабильный placeholder без зависимости от `dataTransfer`.
- Кнопки раскрытия и меню `...` не запускают перенос.
- Клик по строке после реального drag подавляется, чтобы страница не открывалась случайно после drop.
- Вынесен чистый helper `js/tree/treeDropIntent.js` для расчета `before` / `inside` / `after`.
- Добавлены unit-тесты для правил drop intent.
- Drop из дерева на карту сохранен через custom event `my-own-world:tree-page-pointer-drop`.

### Риски

- В `campaignMapExternalDrop.js` временно оставлены старые HTML5 drag/drop обработчики как fallback, но основной путь дерева теперь pointer-based.
- Для полного P0 browser regression нужен fixture workspace, чтобы автоматически проверить перенос внутри дерева и drop на карту.

### Следующее развитие из этой работы

- Добавить browser smoke для `tree-dnd-save-after-move`.
- После browser fixture проверить сортировку на одном уровне, вложение в дочернюю ветку и перенос в корень.
- Затем можно упростить fallback HTML5 drop-код карты, если pointer-based сценарий полностью покрыт тестами.

## 2026-05-21: Тестируемый planner переносов дерева

### Что сделано

- Добавлен `js/tree/treeMovePlanner.js`: чистый расчет того, какие `parent/order` нужно применить после drop.
- `treeDragDrop.js` больше не содержит собственную сортировку соседей, а применяет план из `createTreeMovePlan()`.
- Добавлены unit-тесты:
  - перенос внутрь target;
  - перенос в корень;
  - сортировка перед target на одном уровне;
  - сортировка после target на одном уровне.
- Вместе с уже добавленным `treeDropIntent.test.mjs` покрыты базовые сценарии: выше, ниже, внутрь, root и сортировка на одном уровне.

### Риски

- Это unit-покрытие расчета, а не браузерный full-flow. Реальный drag мышью по дереву всё ещё должен получить browser smoke с fixture workspace.

### Следующее развитие из этой работы

- Добавить Playwright fixture workspace и автоматизировать `tree-dnd-save-after-move`.
- После этого можно безопаснее переходить к `Campaign Map data-first save`.

## 2026-05-20: Task Tracker как третья самостоятельная сущность

### Что сделано

- Добавить отдельную сущность `taskTracker`, независимую от карточек и карты.
- В дереве Task Tracker будет жить рядом с карточками и картами, но иметь собственный editor UI.
- Делать систему model-first: persistent data хранится как структурированный JSON, а визуальный интерфейс строится runtime-рендером.
- Держать подсистему максимально detachable: отдельные файлы для модели, сериализации, шаблона, рендера, DnD, task UI и стилей.
- По умолчанию трекер создается с колонками:
  - `РР”Р•Р`;
  - `В РАБОТЕ`;
  - `СДЕЛАНО`.
- В колонках можно создавать задачи с названием, описанием и чекбоксами.
- Задачи можно перетаскивать между колонками и внутри колонки.
- Колонки можно переименовывать и добавлять новые.
- Добавлена папка `js/taskTracker/` как самостоятельная подсистема.
- Добавлен шаблон `js/templates/taskTracker.js`.
- Добавлен стиль `styles/task-tracker.css`.
- Добавлен тип создания `taskTracker` в общий create menu и на пустой стартовый экран.
- Добавлена иконка `task-tracker` в общий SVG sprite.
- `editor.js` и `autosave.js` получили отдельные ветки открытия и сохранения Task Tracker.
- Persistent HTML трекера хранит только оболочку, заголовок и `<script type="application/json" class="task-tracker-data">`.
- Runtime-доска с колонками, задачами, кнопками и placeholder не является источником истины.

### Архитектурное правило для этой системы

- Не смешивать Task Tracker с карточными блоками и Campaign Map.
- Не сохранять runtime-кнопки и drag-placeholder в persistent HTML.
- Если функция может жить одна в файле и это не ухудшает понимание, выносить ее в отдельный файл.
- Если файл содержит несколько функций, они должны обслуживать одну маленькую ответственность.

### Риски

- Drag and drop больше не использует HTML5 API: задачи и колонки перенесены на pointer-based сценарий со стабильным placeholder.
- Если сохранить задачи как HTML, система быстро получит тот же долг, что старый `contenteditable`; поэтому JSON должен быть источником истины.
- Нужны smoke-сценарии: создать трекер, создать задачу, добавить чеклист, перенести задачу, переименовать колонку, сохранить и открыть заново.
- Удаление задач и колонок добавлено через model actions. При удалении колонки удаляются и задачи внутри нее.
- HTML5 drag/drop заменен на pointer-based DnD в `taskTrackerDnd.js`.
- Задачи и колонки теперь двигаются только за drag-handle ``, чтобы ввод текста, textarea и чекбоксы не конфликтовали с переносом.
- Добавлен floating preview и стабильные placeholder-ы для задач и колонок.
- Колонки раскладываются CSS-сеткой по 5 в ряд, затем переносятся на новую строку. На узких экранах сетка адаптивно уменьшается до 4/3/2 колонок.
- Остался UX-вопрос: нужно ли спрашивать подтверждение при удалении колонки с задачами или делать undo.

### Следующее развитие из этой работы

- После MVP связать задачи с карточками лора через wiki/page links.
- Позже добавить дедлайны, приоритеты, фильтры и архив задач.

## 2026-05-20: Campaign Map runtime и model-based presentation live-sync

### Что сделано

- Добавлен `js/editor/campaignMapRuntime.js`.
- з `campaignMap.js` вынесены runtime-сценарии:
  - добавление токенов;
  - восстановление токенов;
  - расчет и применение состояния здоровья токена;
  - выбор токенов и фигур;
  - добавление и восстановление фигур;
  - смена изображения карты;
  - восстановление фонового изображения карты.
- `campaignMap.js` теперь ближе к роли bootstrap/orchestration:
  - подключает события;
  - связывает controllers;
  - маршрутизирует pointer/input/wheel события;
  - вызывает save/sync;
  - не хранит реализацию runtime-рендера токенов, фигур и фона.
- `scheduleLivePresentationSync()` переведен на новый контракт: `map + itemType + itemId`.
- `campaignMapTokenDrag.js` и `campaignMapShapeDrag.js` больше не передают в live-sync DOM-элемент как основной источник данных.
- `campaignMapPresentation.js` получил `syncPresentationItemById()`, который берет token/shape из `CampaignMapModel` и применяет состояние к презентации.
- Старый `syncPresentationItem(sourceItem)` оставлен как совместимый wrapper, чтобы забытый старый вызов не ломал карту, но новый рабочий путь идет через id и модель.
- `scheduleVisibleMapObjectsUpdate()` явно экспортируется из `campaignMapViewport.js`, чтобы качество фона и culling вызывались через понятный контракт.
- Добавлен `js/editor/campaignMapPointerController.js`.
- з `campaignMap.js` вынесен pointer router:
  - pointerdown по токенам, фигурам, handles, карте и fog brush;
  - pointerover/pointerout для hover popup и подсветки дерева;
  - double click по токену;
  - wheel zoom;
  - document pointermove/pointerup lifecycle для token drag, shape drag, fog draw и pan.
- Добавлен `js/editor/campaignMapDragMeasure.js`.
- Вектор перемещения больше не синхронизируется в презентацию DOM-клоном SVG. Token drag передает данные о линии: начало, конец, позицию подписи и текст расстояния.
- `syncPresentationDragMeasure()` теперь получает payload оверлея и сам рисует/очищает measure в presentation window.

### Что стало лучше

- Presentation live-sync больше не клонирует исходный DOM-токен/фигуру при каждом drag/resize/rotate.
- Drag-слои теперь сообщают презентации только идентификатор сущности, а данные берутся из `CampaignMapModel`.
- Модель стала реальным посредником между интерактивным слоем карты и presentation window.
- `campaignMap.js` уменьшился и потерял часть ответственности за runtime DOM.
- `campaignMap.js` больше не владеет pointer router и fog drawing state.
- Последний DOM-хвост live-sync для drag-measure убран: presentation overlay строится из данных, а не из клона DOM.
- Следующие оптимизации можно делать в модели и render/controllers, не вскрывая один большой файл.

### Оставшиеся риски

- Full presentation sync всё ещё клонирует stage целиком. Это нормально для полного обновления, но не для частых операций.
- `campaignMap.js` всё ещё содержит title/input flow, save deps и сборку dependency-contracts для controllers.
- Нужен browser smoke test live-sync:
  - открыть презентацию;
  - двигать токен;
  - менять размер объекта;
  - вращать объект;
  - двигать/resize фигуру;
  - скрыть/показать token/shape.

### Следующее развитие из этой работы

1. Добавить browser smoke tests для карты и презентации.
2. Вынести title/input flow в `campaignMapTitleController.js`.
3. Когда save станет полностью data-first, рассмотреть `CampaignMapStore` как владелец model + dirty state.

## 2026-05-18: разрез Campaign Map на подсистемы

### Что сделано

- `js/editor/campaignMapGeometry.js` — вынесены геометрия, координаты, viewport helpers, расчет видимой области, spawn point, размеры токенов и базовая математика фигур.
- `js/editor/campaignMapBackground.js` — вынесены фон карты, full/low detail cache, переключение качества изображения и сброс кэша при смене картинки.
- `js/editor/campaignMapPresentationSync.js` — вынесены очереди live-sync презентации, throttling и отложенная синхронизация.
- `js/editor/campaignMapToolbar.js` — вынесены HTML-шаблоны toolbar и popup-ов карты.
- `js/editor/campaignMapShapes.js` — вынесен DOM-render фигур и применение их геометрии.
- `js/editor/campaignMapTokens.js` — вынесены DOM helpers токенов: позиция, размер, поворот, fallback-текст, картинка токена и resize/rotate handles.
- `js/editor/campaignMapFog.js` — вынесены fog canvas операции, кисть/ластик, fill/clear fog и UI-состояние fog/pan кнопок.
- `js/editor/campaignMapSerializerHelpers.js` — вынесены helpers для точечного изменения persistent HTML карты при удалении токенов из сохраненной страницы.
- `js/editor/campaignMapTreeIntegration.js` — вынесены связи карты с деревом: lookup страниц, проверка предков-карт, bucket-папки и подсветка карточек в дереве.
- `js/editor/campaignMapPicker.js` — вынесен popup добавления существ/объектов на карту, поиск, выбор нескольких карточек, количество копий и создание дочерних дублей.
- `js/editor/campaignMapTokenActions.js` — вынесены действия над токенами: открыть карточку, удалить, скрыть, дублировать, изменить хиты и создать стат-блок при необходимости.
- `js/editor/campaignMapTokenDrag.js` — вынесена state machine для drag/resize/rotate токенов и вектор перемещения.
- `js/editor/campaignMapShapeDrag.js` — вынесена state machine для drag/resize фигур.
- `js/editor/campaignMapModel.js` — добавлен первый `CampaignMapModel`: нормализованный слепок `asset`, `grid`, `fog`, `view`, `tokens`, `shapes` из текущего DOM.
- `js/editor/campaignMapConstants.js` расширен константами, которые раньше жили внутри большого файла карты.
- После коммита `v.2.0.6` модель расширена методами `addToken`, `moveToken`, `resizeToken`, `rotateToken`, `addShape`, `moveShape`, `resizeShape`, `setGrid`, `updateFog`, `setView` и commit helpers для DOM-элементов.
- Добавлены `removeToken`, `removeShape`, `replaceTokens`, `replaceShapes`.
- `js/editor/campaignMapElementFactory.js` — выделено создание DOM-токенов и DOM-фигур из записей модели.
- `js/editor/campaignMapRenderer.js` — выделено применение визуального состояния токенов и фигур к DOM.
- `js/editor/campaignMapSaveController.js` — выделен порядок save/sync: title карты, refresh модели, сохранение страницы, sync презентации.
- `js/editor/campaignMapViewport.js` — вынесены viewport structure, pan/zoom, culling offscreen-объектов и визуальные настройки сетки.
- `js/editor/campaignMapPopupController.js` — вынесен общий контейнер popup-ов карты, повторный клик по кнопке, позиционирование и закрытие по клику снаружи.
- `js/editor/campaignMapToolbarController.js` — вынесены действия тулбара карты: добавить, рука, сетка, смена карты, презентация, фигуры, туман.
- `js/editor/campaignMapTokenPopupController.js` — вынесены hover-попапы токенов/фигур, меню существа, действия и изменение хитов.

### Текущее состояние после разреза

- `campaignMap.js` уменьшен примерно с 6565 до 3199 строк.
- Главный файл всё ещё остается orchestration-центром: viewport, popups, создание сущностей, render карты, save и связывание модулей.
- Поведение токенов и фигур больше не хранит локальное состояние в `campaignMap.js`; оно управляется отдельными модулями через явные dependency-контракты.
- Добавление существ/объектов вынесено в отдельный picker, поэтому следующий шаг к `CampaignMapModel` можно делать без повторного вскрытия popup-логики.
- `CampaignMapModel` уже обновляется после render, после создания токенов/фигур и перед сохранением. Пока это совместимый слой поверх DOM, а не полная замена DOM как источника истины.
- Создание/дублирование токенов и фигур, drag/resize/rotate токенов, drag/resize фигур, сетка, fog mode/brush и viewport уже проходят через модельные методы.
- Удаление токенов/фигур теперь тоже обновляет модель перед удалением DOM.
- Presentation full-sync обновляет модель перед сборкой презентационного clone и использует модель для удаления скрытых элементов из презентации.
- Save/sync orchestration вынесен из `campaignMap.js` в отдельный controller.
- `campaignMap.js` больше не хранит состояние pan/culling и не создает общий popup-контейнер напрямую.
- `campaignMap.js` больше не хранит token popup timers и не строит popup-разметку для токенов.
- Кнопки тулбара карты теперь маршрутизируются через отдельный controller.

### Что стало лучше

- У карты появились явные технические границы: geometry, background, presentation sync, toolbar, shapes, tokens, fog.
- Производительные части карты больше не смешаны с UI-разметкой popup-ов.
- Восстановление картинки токена больше не зависит от внутреннего кэша фоновой карты и использует asset storage напрямую.
- Патчинг сохраненного HTML карты отделен от runtime UI-событий.
- Следующие изменения можно делать точечно: например менять fog без чтения token popup логики.
- Drag/resize/rotate больше изолированы как маленькие интерактивные state machines.
- Token actions отделены от pointer interactions: удалить/дублировать/HP теперь можно развивать без риска сломать перетаскивание.
- Tree integration получила отдельный слой, а значит фильтры выбора карточек и подсветка дерева больше не размазаны по карте.
- Появилась точка перехода к data-first архитектуре: новые оптимизации карты можно будет делать через `CampaignMapModel`, а не через поиск по DOM.
- У интерактивных операций появился единый путь: изменить модель, затем применить модель к DOM. Это снижает риск, что разные модули запишут несовместимые `dataset`.
- DOM creation и DOM render больше не смешаны с action/drag-логикой.
- Viewport стал отдельной подсистемой, поэтому будущая оптимизация карты может менять culling/zoom/pan без чтения popup и token action кода.
- Крупный разрез `campaignMap.js` на подсистемы завершен: основной файл стал bootstrap/orchestration, а не владельцем всех behavior-сценариев.

### Оставшиеся риски

- `campaignMap.js` всё ещё слишком большой для спокойной разработки.
- В главном файле остались крупные зоны:
  - popup rendering и позиционирование popup-ов карты;
  - создание карты, фон, grid controls и viewport/pan;
  - save orchestration и сериализация HTML;
  - часть presentation coordination;
  - поиск активных DOM-элементов при render/reload.
- Нужно прогнать ручной browser smoke test на карте, потому что разрез затронул runtime modules и import graph.
- В проекте всё ещё много `innerHTML`; для локального режима это терпимо, для web это security blocker.
- `CampaignMapModel` всё ещё восстанавливается из DOM при render/save, поэтому DOM не полностью потерял роль источника истины.
- Presentation live-sync отдельных элементов всё ещё получает source DOM item. Full-sync уже сверяется с моделью, но live-sync лучше позже перевести на `tokenId/shapeId + model`.
- Save карты теперь строит persistent HTML через `CampaignMapModel`, но runtime-события ещё частично обновляют DOM и затем освежают модель.
- Документация и некоторые старые строки в исходниках могут отображаться как mojibake в консоли Windows. Нельзя лечить это runtime-декодированием; нужно исправлять источник только при отдельной задаче на документацию/кодировку.

### Следующее развитие из этой работы

1. Перевести presentation live-sync на `tokenId/shapeId + CampaignMapModel`, чтобы drag не передавал DOM-элементы между слоями.
2. Добавить browser smoke tests для карты:
   - открыть карту;
   - добавить token;
   - переместить token;
   - сохранить/reload;
   - проверить координаты, fog и presentation sync.
3. После стабилизации карты перейти к desktop app spike: проверить Tauri/Electron как оболочку для локального приложения.

## 2026-05-25: Campaign Map 6.1

### Что сделано

- Закрыт пункт 6.1: в `+` карты добавлен отдельный режим `грок`.
- Picker игроков показывает карточки `character` / `creature` с тегом `player`, если они не лежат внутри карты.
- При добавлении игрока карта создает только токен и привязывает его к оригинальной карточке через `data-source-mode="original"`.
- Drag карточки с тегом `player` из дерева на карту использует тот же режим: без bucket и без дочернего дубля.
- Обычные существа и объекты продолжают создаваться как дочерние копии в папках карты.
- Удаление и дублирование original-linked токена не удаляет и не дублирует оригинальную карточку игрока.

### Что стало лучше

- гроки на карте теперь могут работать с оригинальной карточкой, а значит хиты и будущий инвентарь меняются в одном источнике.
- В модели токена появился `sourceMode`, который явно разделяет дочерние копии карты и ссылки на оригинал.

### Оставшиеся риски

- Нужен отдельный UX для отображения original-linked игроков в контекстном меню и списках будущей инициативы.
- Нужно продумать, можно ли одному и тому же игроку находиться на нескольких картах одновременно и как это показывать в поиске.

### Следующее развитие из этой работы

1. Перейти к `6.2`: инициатива на карте.
2. При реализации инициативы учитывать `sourceMode="original"`, чтобы игроки брались из оригинальных карточек.

## 2026-05-25: FormattingService 5.3

### Что сделано

- Закрыт пункт 5.3: toolbar больше не записывает history snapshots для formatting actions напрямую.
- Inline-команды, reset format и применение цвета проходят через history-aware методы `formattingService.js`.
- Block formatting (`p`, `h1`-`h4`) перенесен из `toolbar.js` в `formattingService.js`.
- Логика выбора block targets, замены тега, восстановления выделения и нормализации вложенных заголовков теперь находится рядом с остальными правилами форматирования.
- `toolbar.js` стал тоньше: он восстанавливает selection, вызывает сервис и обновляет UI.

### Что стало лучше

- FormattingService теперь отвечает не только за deprecated fallback, но и за единое поведение форматирования.
- Следующие изменения toolbar меньше рискуют сломать историю редактора или границы persistent editable.
- Block formatting стало проще тестировать и заменять независимо от UI.

### Оставшиеся риски

- Inline formatting все еще использует `execCommand` как fallback внутри сервиса.
- Нужны дополнительные browser regression tests на цвет, reset format, списки и заголовки.

### Следующее развитие из этой работы

1. По основному плану можно переходить к `6.1`: игроки на карте без дубля в дереве.
2. Внутри блока тестов добавить отдельные regression tests для FormattingService, когда снова будем расширять редактор.

## 2026-05-25: FormattingService 5.2

### Что сделано

- Закрыт пункт 5.2: добавлен `docs/02-architecture/contracts/FORMATTING_SERVICE_CONTRACT.md`.
- В контракте зафиксированы правила для persistent editable-зон, inline formatting, block formatting, цвета, reset format, paste и состояния toolbar.
- `formattingService.js` получил allowlist поддерживаемых inline-команд, чтобы неизвестные команды не уходили в deprecated fallback.
- `queryInlineFormattingState()` и `insertPlainTextFallback()` теперь также проверяют persistent selection.
- README ссылается на новый контракт форматирования.

### Что стало лучше

- Правила форматирования больше не живут только в памяти и в поведении toolbar.
- Следующая замена `execCommand` сможет сохранить public API сервиса и не переписывать UI.
- Риск случайно применить форматирование вне editable-зоны стал ниже.

### Оставшиеся риски

- Block formatting (`p`, `h1`-`h4`) пока физически остается в `toolbar.js`.
- Deprecated fallback все еще используется внутри `formattingService.js`, пока не появится собственная Range/DOM-реализация.

### Следующее развитие из этой работы

1. Закрыть пункт 5.3: перенести block formatting и историю formatting actions из toolbar в сервисный слой.
2. После этого расширить browser regression tests на цвет, reset format, списки и заголовки.

## 2026-05-25: FormattingService 5.1

### Что сделано

- Закрыт пункт 5.1: прямые обращения к deprecated command API из редактора убраны.
- `document.execCommand()` и `document.queryCommandState()` теперь находятся только внутри `formattingService.js`.
- `toolbar.js` получает состояние форматирования через `queryInlineFormattingState()`.
- `editor.js` использует `insertPlainTextFallback()` для paste, а ручной DOM fallback остается ниже.
- Browser formatting regression расширен проверкой public API состояния форматирования.

### Что стало лучше

- Deprecated API теперь изолирован в одном сервисе, его будет проще заменить на собственный formatting layer.
- Toolbar и editor больше не знают, каким браузерным механизмом выполняется inline formatting или paste fallback.

### Оставшиеся риски

- Само форматирование все еще выполняется через browser fallback, а не через собственную модель.
- Правила форматирования еще нужно формально описать в пункте 5.2.

### Следующее развитие из этой работы

1. Делать пункт 5.2: описать правила FormattingService для заголовков, обычного текста, списков, цвета и reset format.
2. Затем закрывать 5.3: убрать оставшуюся архитектурную зависимость toolbar от деталей форматирования.

## 2026-05-25: приоритизация новых доработок карты

### Что добавлено в план

- Добавлен новый блок `6. Campaign Map Tactical Features`.
- Новые доработки карты разложены по важности:
  - P1: игроки без дубля, инициатива, слои;
  - P2: массовый select, открыть изображение, особое отображение скрытого героя;
  - P3: квадратная кисть тумана, locked fog zones.

### Почему такой порядок

- гроки без дубля важны первыми, потому что меняют модель привязки токена к карточке и дают прямое редактирование хитов/инвентаря оригинала.
- нициатива и слои усиливают карту как боевой инструмент, но требуют аккуратного model-first хранения порядка и участников.
- Массовый select лучше делать после слоев, иначе групповые операции быстро начнут конфликтовать с порядком и видимостью.
- Fog-улучшения полезны, но меньше влияют на базовую кампанию, поэтому они ниже.

### Следующее развитие из этой работы

1. По текущему плану сначала закрыть `5.2` и `5.3` для FormattingService.
2. Затем можно брать `6.1`: игроки на карте без создания дублей в дереве.

## 2026-05-25: Editor History 4.2-4.5

### Что сделано

- `editorHistory.js` переведен на page-scoped undo/redo stacks.
- Добавлен `redoEditorHistory()` и поддержка `Ctrl+Y` / `Ctrl+Shift+Z`.
- стория теперь хранит persistent snapshots через `serializePersistentEditorHTML()` для карточек, а runtime UI восстанавливается после undo/redo.
- Добавлен transaction API: `beginHistoryTransaction()`, `commitHistoryTransaction()`, `runHistoryTransaction()`.
- Paste, toolbar formatting/link actions, block add/delete/drag, table row/width/alignment/paste и wiki-link connect теперь пишут историю через общий слой.
- Добавлен browser regression `editor-history-undo-redo-restores-persistent-html-without-runtime-ui`.

### Что стало лучше

- `Ctrl+Z` и `Ctrl+Y` больше не являются смесью случайного браузерного undo и ручных DOM-патчей для основных действий приложения.
- Undo/redo привязаны к текущей странице и не должны переносить снимки между карточками.
- Persistent snapshot защищен от runtime controls: UI может восстановиться после undo, но сохраненный HTML остается чистым.

### Оставшиеся риски

- стория все еще snapshot-based, а не diff/model-based. Для больших страниц это может быть тяжелее, чем будущая модель документа.
- Обычный набор текста пока сохраняется через snapshots на `beforeinput`; группировка по паузам еще не сделана.
- Некоторые редкие подсистемы вроде image crop и variables могут потребовать отдельного подключения к transaction API при следующей работе с ними.

### Следующее развитие из этой работы

1. Перейти к пункту 5.2: описать и закрепить правила FormattingService.
2. Позже добавить дополнительные browser regression tests на реальные UI-сценарии: удалить блок -> undo, resize таблицы -> undo, wiki-link connect -> undo.

## 2026-05-25: Editor History Contract

### Что сделано

- Закрыт пункт 4.1: создан `docs/02-architecture/contracts/EDITOR_HISTORY_CONTRACT.md`.
- В контракте описаны `History Action`, `Snapshot`, `Transaction`, `Selection Bookmark`, page-scoped history, save/redo/selection contract.
- Зафиксировано, что runtime UI и элементы с `data-runtime="true"` не должны попадать в undo/redo snapshot.
- В README добавлена ссылка на контракт истории.
- В `editorHistory.js` уточнен комментарий: текущий модуль является временным слоем до полного history service.

### Что стало лучше

- Следующие пункты 4.2-4.5 можно делать не как набор разрозненных исправлений, а как перевод конкретных действий на один контракт.
- Появился явный список P0/P1 regression сценариев для будущего `Ctrl+Z / Ctrl+Y`.
- Граница между persistent content и runtime UI закреплена именно для history, а не только для save.

### Оставшиеся риски

- Это документационный шаг: полноценный redo, page-scoped stacks и transaction API еще не реализованы.
- Текущий `editorHistory.js` по-прежнему snapshot-based и частично зависит от браузерного undo для обычного ввода.

### Следующее развитие из этой работы

1. Делать пункт 4.2: реализовать управляемый `Ctrl+Z / Ctrl+Y` с undo/redo stack на страницу.
2. После 4.2 перевести paste на transaction как пункт 4.3.

## 2026-05-24: tree regression и render adapter карты

### Что сделано

- Закрыт пункт 2.4: добавлен browser regression test `tree-pointer-dnd-planner-keeps-stable-drop-intents-and-order`.
- Тест проверяет drop-intent дерева в браузере и сценарии `before`, `inside`, `after`, `root`, сортировку на одном уровне.
- Закрыт пункт 3.7: создан `campaignMapRenderAdapter.js`, который отражает записи `CampaignMapModel` в DOM токенов и фигур.
- Закрыт пункт 3.8: `CampaignMapModel` больше не экспортирует `commitTokenModelToElement()` и `commitShapeModelToElement()`.
- Token/shape drag и token actions теперь получают запись из `CampaignMapStore` и передают ее в render adapter.

### Что стало лучше

- `CampaignMapModel` снова отвечает только за данные карты, а не за DOM-разметку.
- DOM стал отображением model/store snapshot, что упрощает следующий переход к render adapter для всей карты.
- Browser regression дерева теперь прикрывает не только unit-расчеты, но и browser import/runtime слой.

### Оставшиеся риски

- Render adapter пока точечный: он обновляет dataset токенов и фигур, а полный `CampaignMapModel -> DOM` renderer для пересборки всей object-layer еще не выделен.
- Для треугольников resize вершин всё еще использует DOM-helper `getTrianglePoints(shape)`, потому что вершины физически редактируются в DOM.

### Следующее развитие из этой работы

1. Перейти к пункту 4.1: описать единый Editor History Contract.
2. Позже расширить render adapter до полного renderer-а object-layer, чтобы карта могла пересобираться из модели без ручных DOM-патчей.

## 2026-05-24: data-first save карты

### Что сделано

- Добавлен `js/editor/campaignMapDataSerializer.js`: отдельный сериализатор persistent HTML карты из `CampaignMapModel`.
- `serializeCampaignMapHTML()` больше не сохраняет карту через общий DOM-clone `serializePersistentEditorHTML()`, если открыта `.campaign-map-document`.
- `CampaignMapModel` теперь хранит `assetSettings`: сохраненные туман/размер сетки/цвет сетки для разных изображений одной карты.
- В HTML карты сохраняются только данные: stage dataset, токены, фигуры, fog image, grid, view и per-asset settings.
- Runtime-элементы карты вроде resize/rotate handles, popup-ов и временных классов не участвуют в сохранении карты.
- Добавлен unit-тест `tests/campaignMapDataSerializer.test.mjs`, который проверяет data-first HTML и отсутствие runtime-разметки.

### Что стало лучше

- Сохранение карты стало предсказуемее: результат зависит от модели, а не от случайного текущего состояния DOM.
- Следующая оптимизация карты может переводить drag/fog/grid на модель как источник правды без переписывания save-слоя.
- Переключение изображений карты безопаснее: настройки тумана и сетки для разных map asset теперь описаны в модели.

### Оставшиеся риски

- Drag/fog/grid ещё не являются полностью model-owned: многие операции сначала меняют DOM, затем вызывают refresh модели.
- `campaignMapSerializerHelpers.js` для точечного удаления токенов из сохраненных закрытых карт всё ещё работает через DOM-parse HTML.
- Нет browser smoke test, который создает карту, добавляет токен/фигуру, сохраняет, перезагружает и проверяет восстановление.

### Следующее развитие из этой работы

1. Перевести закрытые patch-сценарии карты на модельный serializer, начиная с удаления токенов из сохраненной страницы.
2. Добавить browser smoke test `карта -> token -> shape -> save/reload -> проверка координат/тумана/сетки`.
3. Ввести `CampaignMapStore`: единый владелец `CampaignMapModel`, dirty-state и commit/render операций.

## 2026-05-24: CampaignMapStore

### Что сделано

- Добавлен `js/editor/campaignMapStore.js`: единый владелец `CampaignMapModel`, dirty-state и commit в DOM.
- Основные операции карты переведены на store:
  - drag/resize/rotate токенов;
  - drag/resize фигур;
  - добавление токенов и фигур;
  - удаление, скрытие и дублирование токенов/фигур;
  - grid size/color/toggle;
  - fog mode/brush/fill/clear;
  - viewport pan/zoom;
  - save и presentation sync.
- `campaignMapDataSerializer.js` теперь берет модель через `refreshCampaignMapStore()`.
- Добавлены unit-тесты `tests/campaignMapStore.test.mjs` для dirty-state, токенов, фигур, сетки, тумана и viewport.

### Что стало лучше

- У карты появился явный model-owner вместо россыпи прямых обращений к `CampaignMapModel`.
- Новые операции карты можно добавлять в store и не размазывать commit/dirty-state по UI-модулям.
- Presentation sync и data-first save теперь ближе к одному источнику правды.

### Оставшиеся риски

- Store пока совместимый слой поверх текущего DOM: часть операций всё ещё читает стартовые значения из dataset перед записью в модель.
- `campaignMapModel.js` оставляет старые compatibility helpers для DOM-commit, потому что renderer/factory ещё используют их.
- Точечное изменение сохраненного HTML закрытых карт (`campaignMapSerializerHelpers.js`) всё ещё не переведено на store/model.

### Следующее развитие из этой работы

1. Добавить browser smoke test карты с save/reload и проверкой token/shape/grid/fog.
2. Начать убирать compatibility helpers из `campaignMapModel.js`, когда factory/renderer смогут работать напрямую со store snapshots.
3. Выделить model-owned render adapter для token/shape, чтобы DOM полностью стал отображением модели.

## 2026-05-24: закрепление model-owned карты

### Что сделано

- Стартовое состояние drag/resize/rotate токенов теперь берется из `CampaignMapStore`, а не из `dataset`.
- Стартовое состояние drag/resize фигур теперь берется из `CampaignMapStore`.
- `campaignMapSerializerHelpers.js` переведен на model/data-first путь:
  - закрытая карта разбирается как persistent HTML;
  - удаление токенов проходит через `CampaignMapStore.removeToken()`;
  - результат собирается через `serializeCampaignMapDocumentHTML()`, а не через `wrapper.innerHTML`.

### Что стало лучше

- Drag-слои меньше зависят от DOM как источника истины: `dataset` остается только идентификатором DOM-элемента.
- Патч закрытых карт теперь совпадает с обычным сохранением карты и не обходит data-first serializer.
- Следующий шаг по карте можно делать уже не вокруг save, а вокруг render adapter: model snapshot -> DOM.

### Оставшиеся риски

- Для треугольников точки вершин всё ещё вычисляются через DOM-helper `getTrianglePoints(shape)`, потому что shape handles физически живут в DOM.
- `commitTokenModelToElement()` и `commitShapeModelToElement()` остаются compatibility-мостами.
- Нет отдельного browser regression test на удаление карточки-токена из дерева и последующий патч закрытой карты.

### Следующее развитие из этой работы

1. Добавить regression test на удаление дочерней карточки токена и исчезновение токена с карты.
2. После тестов выделить render adapter `CampaignMapModel -> DOM` и постепенно убрать direct commit helpers.
3. Затем расширить UI-browser тесты карты: picker через `+`, дочерние дубли в дереве, презентация.

## 2026-05-24: browser smoke карты

### Что сделано

- Добавлен `tests/browser/campaign-map-data.spec.mjs`.
- Новый browser smoke проверяет полный data-cycle карты:
  - создать DOM карты в браузере;
  - изменить данные через `CampaignMapStore`;
  - добавить token и shape через официальные element factory;
  - сохранить HTML через `serializeCampaignMapDocumentHTML()`;
  - заново вставить HTML как после reload;
  - восстановить модель через `refreshCampaignMapStore()`;
  - проверить token, shape, grid, fog и viewport.
- `tests/browser/scenarios.mjs` помечает `campaign-map-token-flow` как частично автоматизированный.
- `campaign-map-token-removal-updates-open-and-closed-map-data` покрывает удаление токена с открытой карты и патч закрытой карты после удаления дочерней карточки.

### Что стало лучше

- Data-first save карты теперь защищен не только unit-тестами, но и браузерным smoke-сценарием.
- Тест ловит рассинхрон между моделью, DOM factory и serializer.
- Есть база для следующих UI-browser тестов карты.

### Что осталось не закрыто

- Тест пока не кликает реальный UI `+` и не проверяет создание дочерних дублей в дереве.
- Presentation sync всё ещё проверяется unit/архитектурно, но не отдельным browser-сценарием с popup window.

### Следующее развитие из этой работы

1. Переходить к большому пункту `4. Editor History Contract`, если не появится критичный regression.
2. При будущих изменениях карты расширять browser tests как подпункты раздела `1. Smoke / Regression Tests`.

## 2026-05-24: закрытие browser smoke подпунктов 1.6-1.10

### Что сделано

- `tests/browser/campaign-map-ui.spec.mjs` покрывает добавление карточки на карту:
  - picker показывает только допустимые карточки;
  - потомки карты исключаются;
  - создается bucket `Существа.Карта`;
  - создается дочерний дубль;
  - на карту добавляется токен дубля.
- `tests/browser/campaign-map-presentation.spec.mjs` покрывает presentation sync по `tokenId/shapeId`.
- `tests/browser/editor-formatting.spec.mjs` покрывает базовую границу inline formatting: форматируется выделенный текст, соседний текст не меняется, команда вне выделения не применяется.
- `tests/browser/task-tracker.spec.mjs` покрывает сохранение порядка колонок, перенос задачи, описание и checklist через модель Task Tracker.
- `tests/browser/page-templates.spec.mjs` покрывает создание шаблона, удаление шаблона и создание карточки по шаблону.

### Что стало лучше

- Все подпункты `1.6-1.10` получили browser smoke/regression слой.
- Основные пользовательские зоны теперь имеют хотя бы один быстрый браузерный страховочный сценарий.
- Большой переход к `Editor History Contract` можно начинать с меньшим риском повторно сломать карту, task tracker, шаблоны или базовое форматирование.

### Оставшиеся риски

- Тесты карты используют fake workspace и module-level flow, а не полностью ручной путь через реальную папку пользователя.
- Formatting smoke пока покрывает inline bold boundary, но не весь будущий history contract.
- Task Tracker smoke проверяет модель и serializer, но не pointer DnD жест мышью.

### Следующее развитие из этой работы

1. Начать `4. Editor History Contract`.
2. Внутри `4` добавлять новые regression tests на каждый исправленный сценарий Ctrl+Z / paste / formatting.

## Правила развития

- Любой новый runtime UI должен иметь `data-runtime="true"` и не попадать в persistent HTML.
- Любая новая подсистема карты должна быть отдельным файлом, если она может жить без прямого доступа к глобальному drag/save state.
- В новых файлах нужны короткие русские комментарии, которые объясняют ответственность модуля и сложные места.
- Не добавлять новые крупные функции в `campaignMap.js`, если их можно оформить как отдельный модуль.
- После каждого крупного изменения обновлять этот файл: что изменилось, что стало лучше, что осталось опасным.
- После изменения функций, подсистем или пользовательских сценариев обновлять `docs/MY_OWN_WORLD_FULL_MANUAL.docx`. Для пересборки использовать `tools/generate_manual_docx.py`.

## 2026-05-19: Полный технический мануал

### Что сделано

- Добавлен `docs/MY_OWN_WORLD_FULL_MANUAL.docx` — подробный мануал по проекту в формате Word.
- Добавлен `tools/generate_manual_docx.py` — служебный генератор мануала без внешних зависимостей.
- Мануал включает:
  - общую архитектуру проекта;
  - учебные пояснения по синтаксису JavaScript;
  - основные пользовательские и технические сценарии;
  - каталог функций и файлов;
  - построчный разбор исходников, стилей, HTML, SVG и документации.

### Оставшиеся риски

- Построчные пояснения генерируются эвристически, поэтому для особо сложных функций стоит вручную улучшать формулировки при будущих крупных изменениях.
- Документ большой; при активном развитии проекта его нужно пересобирать после каждого значимого изменения, иначе он быстро устареет.

### Следующее развитие из этой работы

- Постепенно добавлять ручные разделы по самым сложным подсистемам: Campaign Map, clean-save, wiki-links, таблицы и DnD-блоки.
- При каждом новом модуле добавлять русские комментарии в код, чтобы генератор получал больше качественного контекста.

## 2026-05-19: MVP блока "Переменные"

> Статус: архивировано. Подробности перенесены в `docs/archive/ARCHIVED_EXPERIMENTS.md`.

### Что сделано

- Добавлен новый тип блока `variables`.
- Добавлена отдельная подсистема:
  - `js/ui/variables.js` — runtime UI блока, popup выбора, добавление/удаление переменных;
  - `js/ui/variables/variableDefinitions.js` — каталог системных переменных и саб-блоков;
  - `js/ui/variables/variableCalculations.js` — MVP расчетов переменных.
- В каталог добавлены тестовые переменные:
  - уровень, опыт, раса, класс, вид, подкласс;
  - шесть характеристик;
  - боевые поля, хиты, скорость, инициатива, кость хитов;
  - расчетные характеристики `Сила (расчет)` и аналоги.
- Добавлены 5 саб-блоков переменных:
  - `Происхождение`;
  - `Характеристики`;
  - `Характеристики (расчет)`;
  - `Боевые показатели`;
  - `Хиты`.
- Переменная `Раса` строит select по карточкам с тегом `race`.
- Расчетная характеристика персонажа складывает базовую характеристику текущей карточки и одноименную переменную выбранной расы.
- Toolbar больше не появляется во время протягивания выделения мышью: показ откладывается до `pointerup`.

### Оставшиеся риски

- Это MVP, а не финальный formula engine. Сейчас расчет захардкожен для связи `персонаж -> раса -> характеристика`.
- Нужен будущий слой формул, где переменная сможет ссылаться на цепочки вроде `race.str`, `class.proficiency`, `level.modifier`.
- Нужен единый serializer для переменных, если появятся сложные типы данных: массивы, dice formula, ссылки на несколько карточек.
- Popup выбора переменных пока простой и не поддерживает категории/избранное.

### Следующее развитие из этой работы

- Ввести `VariableModel`, который будет читать переменные карточки как данные, а не как DOM.
- Добавить формулы вида `base.str + race.str + class.str`.
- Позже заменить DnD stat block v2 на UI, который собирается из переменных и формул.

## 2026-05-19: Архивация DnD v2 и блока "Переменные"

### Что сделано

- `Стат. блок DnD v 2.0` убран из popup выбора блоков.
- Блок `Переменные` убран из popup выбора блоков.
- Runtime-подключение `setupDndStatsV2()` и `setupVariables()` отключено в `app.js`.
- Runtime-render `renderDndStatsV2()` и `renderVariables()` отключен в `editor.js`.
- CSS `dnd-stats-v2.css` и `variables-block.css` больше не импортируются в `styles/main.css`.
- Добавлен архивный документ `docs/archive/ARCHIVED_EXPERIMENTS.md`.

### Почему

- Обе ветки оказались полезными как исследование, но не как готовая UX/архитектурная основа.
- Для продолжения нужна отдельная модель персонажа/переменных, а не усложнение HTML-блоков.

### Следующее развитие

- Сначала спроектировать `CharacterModel` или `VariableModel`.
- Только после этого возвращаться к UI листа персонажа и формулам.

## 2026-05-19: Drag карточки из дерева на карту

### Что сделано

- В режиме карты можно перетащить карточку из дерева на рабочую область карты.
- Разрешены только карточки типов `character`, `creature` и `object`, которые не находятся внутри дочерней ветки карты.
- При drop создается дочерний дубль карточки в бакете карты `Существа` или `Объекты`, а токен на карте привязывается именно к дублю.
- Точка появления токена берется из места drop на карте, а не из центра видимой области.
- Tree drag теперь допускает `copyMove`: внутри дерева карточка всё ещё перемещается, а drop на карту работает как копирование.

### Оставшиеся риски

- Drop из дерева вынесен в отдельный `campaignMapExternalDrop.js`, но пока использует DOM-события HTML5 drag/drop. Для мобильного режима позже может понадобиться pointer-based fallback.
- Нужно ручное тестирование: перетащить персонажа, существо и объект; убедиться, что исходная карточка не меняется, а дубль появляется в дочках карты.

### Следующее развитие из этой работы

- Добавить визуальный preview токена под курсором во время перетаскивания из дерева.
- Перевести этот сценарий на будущий `CampaignMapModel.addTokenFromPageDuplicate()`, когда модель станет основным источником правды.

## 2026-05-18: Стат. блок DnD v 2.0

### Что сделано

- Добавлен новый тип блока `dndStatsV2`, старый `dndStats` не мигрируется и не меняется.
- Блок содержит выбор расы, класса, вида и подкласса:
  - раса берется из карточек с тегом `race`;
  - класс берется из карточек с тегом `class`;
  - вид берется из карточек с тегом `type`, у которых parent равен выбранной расе;
  - подкласс берется из карточек с тегом `subclass`, у которых parent равен выбранному классу.
- Добавлены поля уровня, бонуса мастерства, КЗ, хитов, скорости, хитов от смерти, костей хитов, владений, характеристик и навыков/спасбросков.
- Разметка блока приведена ближе к листу персонажа:
  - происхождение и развитие идут двумя строками по три поля, где `Вид` расположен под `Расой`, а `Подкласс` под `Классом`;
  - вместо `Уровня` в происхождении добавлено `стощение` на 6 чекбоксов;
  - боевые показатели идут двумя строками: КЗ/хиты/кость хитов и скорость/уровень с опытом/хиты от смерти/кости хитов;
  - составные поля подписывают значения `факт`, `макс`, `врем.`;
  - хиты от смерти представлены чекбоксами с иконками провалов и успехов;
  - характеристики и навыки объединены в один широкий раздел.
- Визуальный стиль блока переведен в общую темную тему приложения с мягкими панелями и пастельно-желтыми акцентами.
- Расчет DnD 5e:
  - бонус мастерства: уровни 1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6;
  - модификатор характеристики: `floor((значение характеристики - 10) / 2)`;
  - навык или спасбросок = модификатор характеристики + бонус мастерства, если отмечено владение.
- Модификатор характеристики теперь редактируемый: если пользователь меняет его вручную, значение подсвечивается и используется для навыков; если поле очистить, включается авторасчет.

### Оставшиеся риски

- Карточки `race`, `class`, `type`, `subclass` пока не имеют формального schema для автоматических бонусов. Бонусы рас/классов больше не задаются отдельным полем в характеристике, чтобы не плодить временную модель.
- Следующий шаг — описать schema бонусов в карточках расы/класса и подтягивать их автоматически.

## 2026-05-20: Дерево сущностей, уникальные названия и навигационный стек

### Что сделано

- Для дерева добавлен более плавный drag/drop: строка под курсором теперь остается видимой как floating preview, а placeholder больше не перехватывает события мыши и меньше провоцирует дрожание layout.
- Для карточек добавлен стек переходов: если пользователь попал в карточку не из дерева, рядом с заголовком появляется кнопка «Назад», которая возвращает по цепочке предыдущих карточек.
- Кнопка «Назад» усилена: она показывается для любой карточной сущности, а не только для страниц с явным `template: card`.
- В контекстное меню строки дерева добавлено действие `Дублировать`; дубль создается на том же уровне с названием вида `Копия1 - название`.
- Добавлена проверка одинаковых названий карточек, карт и таск-трекеров: конфликтующие заголовки подсвечиваются в открытой сущности и в дереве, а сохранение с дублем имени блокируется.
- Дубли сущностей, которые добавляются на карту, теперь получают название вида `название - сущность.[название карты родителя]`, а складываются в папки `Существа.Название карты` и `Объекты.Название карты`, чтобы не конфликтовать с исходной карточкой и сущностями других карт.
- В контекстное меню дерева добавлено действие `Открыть в папке`; из-за ограничений браузерного File System Access API оно показывает путь внутри workspace и копирует имя файла.

### Оставшиеся риски

- Дерево все еще использует HTML5 drag/drop. Для полной одинаковости с таск-трекером лучше позже перевести его на pointer-based controller.
- `Открыть в папке` нельзя сделать полноценным раскрытием Explorer из чистого браузера без отдельного desktop/native bridge.
- Уникальность сейчас проверяется по видимому названию. Для будущего интернет-режима понадобится серверная проверка и миграция старых конфликтов.

### Следующее развитие из этой работы

- Вынести навигационный стек в отдельный `navigationHistory`-модуль, чтобы wiki-links, карта и дерево использовали один контракт переходов.
- Перевести tree drag/drop на pointer events с тем же подходом, который уже используется в таск-трекере.
- Добавить отдельный lightweight index по названиям страниц, чтобы проверки дублей и wiki-links не проходили по всему `state.pages` при каждом вводе.

## 2026-05-20: Форматирование текста, undo и навигация карточки

### Что сделано

- справлен выбор цели для форматирования `Заголовок` / `Обычный текст`: toolbar больше не должен превращать весь соседний editable-контейнер, если выделена только одна внутренняя строка.
- Добавлен `editorHistory.js` — легкий слой истории для операций, где приложение само меняет DOM: вставка plain text, форматирование блоков, цвет, сброс и inline-команды toolbar.
- Ctrl+Z сначала пробует откатить внутреннюю историю редактора и затем сохраняет результат; если внутренней истории нет, браузерное undo продолжает работать штатно.
- Блок навигации карточки стал постоянной маленькой панелью: кнопка `Найти в дереве` показывается всегда на карточках, а `Назад` появляется только при переходе не из дерева.
- `Найти в дереве` раскрывает родительские ветки, скроллит к текущей карточке и временно подсвечивает строку.
- В popup `Связать с существующей` для wiki-link больше не попадают технические дубли, у которых среди родителей есть карта.

### Оставшиеся риски

- `editorHistory.js` — промежуточный слой, а не полноценная модель документа. При больших будущих изменениях лучше перейти к нормальному editor model/history contract.
- Форматирование блоков теперь ограничено внутренними блоками editable-root. Для сложных HTML-фрагментов из paste могут понадобиться дополнительные правила нормализации.

### Следующее развитие из этой работы

- Вынести toolbar formatting в полноценный `FormattingService` без прямой работы с произвольными `div`.
- Сделать единый `EditorHistoryContract`: какие операции пишутся в историю, как группируются ввод/вставка/структурные действия, нужен ли redo.
- Добавить тестовый чеклист по форматированию: частичное выделение, несколько строк, заголовки, таблицы, wiki-links и paste plain text.

## 2026-05-21: Создание задач и карточек по шаблонам

### Что сделано

- В меню `+` добавлен пункт `Задача`: он открывает выбор таск-трекера и создает задачу внутри выбранной доски.
- Новая задача попадает в колонку `Бэклог` / `Backlog`, если она есть; если такой колонки нет, используется первая колонка трекера.
- В меню `+` добавлен пункт `По шаблону`: он открывает список сохраненных шаблонов, позволяет создать карточку по шаблону или удалить шаблон.
- Шаблон можно создать из карточки через меню `...` в дереве командой `Сделать шаблоном`.
- Шаблоны не создают страниц и не появляются в дереве: они хранятся как отдельная lightweight-сущность в localStorage.
- Карточка по шаблону создается на том же уровне, что и текущая открытая карточка, и получает уникальное название по правилу копии.

### Оставшиеся риски

- Хранение шаблонов в localStorage удобно для MVP, но не переносится вместе с workspace на другой компьютер.
- Если шаблоны должны быть общими для workspace, следующим шагом нужно перенести их в отдельный файл вроде `.my-own-world-templates.json`.

### Следующее развитие из этой работы

- Сделать workspace-level template storage, чтобы шаблоны жили рядом с миром, а не в браузере.
- Добавить форму имени при создании карточки по шаблону.
- Добавить быстрый поиск по шаблонам, если их станет много.

## 2026-05-21: справление переносов в дереве

### Что сделано

- Drag/drop в дереве стабилизирован: сортировка идет через узкие зоны `before/after`, а центральная зона строки снова остается вложением внутрь, даже если элементы находятся на одном уровне.
- Drop по визуальной плашке `Перенести сюда` теперь определяется по координатам самой плашки, а не по `event.target`, потому что placeholder не перехватывает мышь ради плавности.
- Placeholder больше не переставляется повторно, если он уже стоит в нужной позиции; это снижает тряску layout во время dragover.
- После любого tree move открытая страница синхронизируется с обновленным объектом из `state.pages` после `loadWorkspace()`.
- Это закрывает баг, где после переноса открытой карточки или карты следующий save мог записать старый `parent/order` и фактически откатить перенос.

### Оставшиеся риски

- Дерево все еще работает на HTML5 drag/drop. Оно стало стабильнее, но для полной управляемости лучше перевести его на pointer-based controller, как таск-трекер.

### Следующее развитие из этой работы

- Вынести `reloadTreeAfterMove()` в общий tree move controller.
- Добавить ручной тест: открыть карточку, перенести ее, не переоткрывая изменить текст, обновить страницу и проверить parent/order.

---

## 2026-05-25: GitHub Actions CI 8.4-8.6

### Что сделано

- В `.github/workflows/verify.yml` добавлен отдельный шаг установки Chromium для Playwright.
- В CI добавлен запуск `npm run test:browser` после `npm run verify`.
- При падении workflow сохраняет `playwright-report/`, `test-results/` и `debug.log` как artifact `browser-smoke-artifacts`.
- В README зафиксировано правило: перед merge/push целевой ветки CI должен быть зеленым.

### Что стало лучше

- Browser smoke теперь является частью обязательной внешней проверки, а не только локальной командой.
- При падениях браузерных тестов будет проще разбирать причину по артефактам GitHub Actions.

### Следующее развитие

- Перейти к `9.1`: описать Asset Lifecycle Contract для изображений, портретов, фонов карт, object PNG и будущих медиа.

---

## 2026-05-25: Asset Lifecycle Contract 9.1-9.2

### Что сделано

- Создан `docs/02-architecture/contracts/ASSET_LIFECYCLE_CONTRACT.md`.
- Зафиксированы типы ассетов: `image`, `portrait`, `mapBackground`, `mapObjectPng`, `audio`, `playlist`, `futureMedia`.
- Описан будущий формат `AssetReference` с `id/path/type/owner/fallback/missing`.
- Описаны правила сохранения: не сохранять `blob:`, абсолютные локальные пути и временные browser URL.
- Описаны правила загрузки, missing state, broken asset checker и orphan asset detection без автоматического удаления.
- README и план обновлены под новый контракт.

### Что стало лучше

- Работа с изображениями получила явную архитектурную границу перед рефакторингом asset storage.
- Будущая музыка локаций теперь вписана в общий media lifecycle, а не остается отдельной неподключенной идеей.

### Следующее развитие

- Перейти к `9.3`: ввести единый `AssetReference` helper и постепенно переводить portrait, image block, map background и object PNG на один формат ссылок.

---

## 2026-05-25: AssetReference 9.3

### Что сделано

- Добавлен `js/storage/assetReference.js`.
- Введены типы `ASSET_TYPES`: `image`, `portrait`, `mapBackground`, `mapObjectPng`, `audio`, `playlist`, `futureMedia`.
- Добавлены helpers `createAssetReference()`, `normalizeAssetReference()`, `normalizeAssetPath()`, `normalizeAssetType()`, `normalizeAssetOwner()` и `isAssetReference()`.
- Добавлен re-export из `js/storage/storage.js`.
- Добавлены unit tests `tests/assetReference.test.mjs`.

### Что стало лучше

- Появился единый объект, к которому можно постепенно приводить портреты, image block, фон карты и PNG-объекты.
- Broken asset checker и orphan detection теперь можно писать не как набор частных случаев, а вокруг одного формата.

### Следующее развитие

- Перейти к `9.4`: собрать broken asset checker, который находит отсутствующие файлы и показывает владельца ссылки.

---

## 2026-05-25: Asset Checker 9.4-9.7

### Что сделано

- Добавлен `js/storage/assetReferenceScanner.js` для сбора persistent-ссылок из страниц.
- Добавлен `js/storage/assetBrokenChecker.js` для поиска отсутствующих файлов.
- Добавлен `js/storage/assetOrphanDetector.js` для поиска orphan-кандидатов без удаления.
- В scanner добавлены будущие атрибуты `data-audio-asset` и `data-playlist-asset`.
- Добавлены unit tests: `assetReferenceScanner.test.mjs`, `assetBrokenChecker.test.mjs`, `assetOrphanDetector.test.mjs`.
- `ASSET_LIFECYCLE_CONTRACT.md` дополнен основой под музыку локаций.

### Что стало лучше

- Проект теперь умеет программно отличать используемые, отсутствующие и лишние assets на уровне данных.
- Можно безопасно строить UI проверки workspace: сначала показывать список проблем, а удаление делать только после подтверждения пользователя.

### Следующее развитие

- Перейти к `10.1`: описать performance risks карты и затем добавить измеряемые performance scenarios.

---

## 2026-05-25: Campaign Map Performance Strategy 10.1-10.4

### Что сделано

- Создан `docs/02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md`.
- Описаны риски: много токенов, много фигур, большой background, fog, presentation sync, zoom/pan.
- Введены performance scenarios: `small-map-baseline`, `large-map-drag`, `fog-paint-large`, `presentation-live-sync`, `zoom-pan-heavy`.
- Добавлен `js/editor/campaignMapPerformance.js` со snapshot-метриками и budgets.
- Добавлены unit tests `tests/campaignMapPerformance.test.mjs`.

### Что стало лучше

- Оптимизация карты получила измеримый ориентир: теперь можно сравнивать фактические метрики с budgets.
- Следующая оптимизация presentation full-sync будет опираться на понятные сценарии, а не только на субъективное ощущение лагов.

### Следующее развитие

- Перейти к `10.5`: оптимизировать presentation full-sync, а затем добавить performance regression smoke.

---

## 2026-05-25: Presentation Full-Sync 10.5

### Что сделано

- В `js/editor/campaignMapPresentation.js` full-sync презентации переведен с `refreshCampaignMapStore()` на `getCampaignMapStore()`.
- Презентация теперь использует уже актуальный data-first store/model и не перечитывает модель из DOM при каждом full-sync.

### Что стало лучше

- Синхронизация презентации делает меньше лишней работы на больших картах.
- Это снижает риск лагов при full-sync после изменений сетки, тумана, фона или toolbar-действий.

### Следующее развитие

- Перейти к `10.6`: добавить performance regression smoke, который проверит sync/reload на большой сцене и не даст вернуть тяжелый full DOM refresh.

---

## 2026-05-25: Campaign Map Performance Smoke 10.6

### Что сделано

- Добавлен browser smoke `tests/browser/campaign-map-performance.spec.mjs`.
- Тест создает синтетическую сцену на 120 токенов и 40 фигур.
- Тест открывает презентацию, выполняет full-sync и серию item-level sync.
- Тест проверяет количество элементов в презентации и мягкие performance budgets.
- Сценарий добавлен в `tests/browser/scenarios.mjs`.

### Что стало лучше

- У карты появился первый regression-тест не только на корректность данных, но и на грубую деградацию производительности.
- Дальнейшие оптимизации презентации теперь можно делать смелее: тест будет ловить явный откат к тяжелому full-sync поведению.

### Следующее развитие

- Перейти к `11.1`: создать CHANGELOG и формализовать release process.

---

## 2026-05-25: Release Process 11.1-11.6

### Что сделано

- Создан `docs/01-delivery/CHANGELOG.md` с разделом `Unreleased` и release notes template.
- Создан `docs/01-delivery/RELEASE_PROCESS.md`.
- Описаны правила версий: patch, minor, major, experimental.
- Описан release checklist.
- Описано правило будущей синхронизации `package.json.version`, git tag и changelog.
- Добавлен rollback guide для code regression и workspace data regression.
- README обновлен ссылкой на release process.

### Что стало лучше

- У проекта появился формальный путь от изменения до релиза.
- Версии больше не остаются только текстом в commit message: есть место для changelog, checklist и rollback.

### Следующее развитие

- Перейти к `12.1`: спроектировать Campaign Map Initiative как model-first подсистему.

---

## 2026-05-25: Campaign Map Initiative Model 12.1-12.3, 12.5-12.8

### Что сделано

- Добавлен `js/editor/campaignMapInitiativeModel.js`.
- Модель умеет собирать участников из живых токенов карты.
- Для player/original flow сохраняется `sourceMode="original"`.
- Добавлены броски d20, initiative modifier, total, сортировка порядка и active turn / next / previous.
- Добавлены unit tests `tests/campaignMapInitiativeModel.test.mjs`.

### Что стало лучше

- нициатива начата model-first, без смешивания боевой логики с popup UI.
- Будущий popup сможет быть тонким интерфейсом над уже проверенной моделью.

### Следующее развитие

- Закрыть `12.4`: сделать popup выбора участников инициативы, затем `12.9`: сохранить и восстановить состояние инициативы в карте.

---

## 2026-05-25: Campaign Map Initiative UI 12.4, 12.9-12.10

### Что сделано

- Добавлена кнопка `ниц.` в toolbar карты.
- Добавлен `js/editor/campaignMapInitiativePopup.js`: popup выбора существ, `Применить`, `Roll d20`, `Закрыть`.
- `CampaignMapModel` теперь хранит `initiative`, пишет его в `data-initiative-state` и восстанавливает из HTML.
- `CampaignMapStore` получил `setInitiative()`.
- Data-first serializer сохраняет состояние инициативы.
- Добавлен browser regression `tests/browser/campaign-map-initiative.spec.mjs`.

### Что стало лучше

- нициатива стала видимой пользовательской MVP-фичей карты, но боевые данные все еще остаются в модели, а не в DOM-popup.
- Состояние инициативы переживает save/reload карты.

### Следующее развитие

- Перейти к `13.1`: спроектировать LayerModel для карты.

---

## 2026-05-25: CI Fix - Python Setup

### Что сделано

- В `.github/workflows/verify.yml` добавлен `actions/setup-python@v5` с Python 3.12 перед `npm run verify`.
- README и план обновлены: CI теперь явно поднимает Python для проверки docx.

### Причина

- Локально `npm run verify` использует команду `python -m zipfile -t docs/MY_OWN_WORLD_FULL_MANUAL.docx`. На GitHub Actions наличие команды `python` лучше не предполагать неявно, поэтому workflow должен устанавливать Python явно.

### Следующее развитие

- После push проверить, что GitHub Actions `Verify` стал зеленым.

---

## 2026-06-01: Visual Regression / UX Safety 4.1-4.5

### Что сделано

- Создан browser smoke `tests/browser/visual-regression.spec.mjs`.
- Добавлены screenshot attachments для app shell, card editor, campaign map и task tracker.
- Добавлены layout guards: popup должен оставаться внутри viewport, floating toolbar сохраняет фиксированную ширину, selection-box карты выделяет токены и фигуры, туман находится выше токенов и locked fog zone, badge `скрыт` имеет ограниченный размер.
- Создан `docs/03-testing/VISUAL_REGRESSION.md` с ручным review перед push.
- `tests/browser/scenarios.mjs` и `tests/browser/README.md` обновлены новым visual-сценарием.
- `docs/01-delivery/PROJECT_PLAN.md` обновлен: пункт 4 закрыт базово, а полный pointer-based group drag оставлен как расширение.

### Что стало лучше

- Визуальные баги теперь ловятся не только глазами после факта, но и browser smoke слоем.
- CI получает быстрые проверки самых болезненных UI-инвариантов: popup, toolbar, selection, fog layering и hidden badge.
- Screenshot attachments дают материал для расследования, если визуальный smoke упадет на GitHub Actions.

### Следующее развитие

- Перейти к `5. Popup Lifecycle Standardization`: унифицировать popup lifecycle и расширить boundary tests уже по конкретным popup-типам.

---

## 2026-06-01: Обновление будущего плана

### Что сделано

- В `docs/01-delivery/PROJECT_PLAN.md` встроены новые продуктовые идеи пользователя без создания второго плана.
- В `6.6` добавлены улучшения блоков `Свойства`: селектор, уровень навыка, вид действия и визуальный дизайн.
- В `15.11` добавлен будущий слой рисования карты: полотно, карандаш, перо, ластик, заливка, selector цвета и последние цвета.
- В `15.12` добавлено будущее контекстное меню существ на карте с выбором навыков карточки, зоной действия и расстоянием.
- В `18.5` уточнен будущий тип сущности "граф связей".
- В `19.7` добавлена идея двух рабочих областей editor.
- В `20.7` закреплен перевод в Desktop как стратегический путь после стабилизации storage/data layers.

### Следующее развитие

- Рабочий фокус плана остается `5. Popup Lifecycle Standardization`.

---

## 2026-06-01: Popup Lifecycle Standardization 5.1-5.5

### Что сделано

- Создан `docs/02-architecture/contracts/POPUP_LIFECYCLE_CONTRACT.md`.
- `js/ui/popupManager.js` расширен до общего lifecycle-слоя: register, open, toggle, close, destroy, z-index, Escape, outside click и controller API.
- `js/ui/popupPosition.js` получил совместимость `offset` как alias для `gap`.
- `js/ui/createModal.js` теперь создает `createMenu` в JS, если контейнера нет в `index.html`.
- `js/tree/treeContextMenu.js` теперь создает `treeContextMenu` в JS и закрывается через общий `PopupManager`.
- `index.html` очищен от static containers `createMenu` и `treeContextMenu`.
- `js/editor/links.js` переведен на общий popup lifecycle вместо собственного document click listener.
- `js/editor/campaignMapPopupController.js` переведен на общий `PopupManager` с динамическими anchors.
- Добавлен browser regression `tests/browser/popup-lifecycle.spec.mjs`.
- Обновлены `tests/browser/scenarios.mjs`, `tests/browser/README.md` и единый план.

### Что стало лучше

- Popup-ы получили единый базовый закон поведения: открытие, повторный trigger, Escape, outside click, viewport boundary и z-index.
- Часть legacy static UI убрана из `index.html`, не ломая существующий app shell.
- Новые popup-регрессии теперь можно ловить через один focused browser spec.

### Следующее развитие

- Перейти к `6. Properties Model / Character Calculations` или, если появятся UI-баги popup, расширить `popup-lifecycle.spec.mjs` конкретными сценариями block/wiki/item/template popup.

---

## 2026-06-01: Properties Model / Character Calculations 6.1-6.6

### Что сделано

- Создан `docs/02-architecture/contracts/PROPERTIES_MODEL_CONTRACT.md`.
- Добавлен каталог схем `js/properties/propertySchemas.js` для `character`, `creature`, `object`, `location`, `region`, `magic`, `skill`, `item`.
- Добавлен `js/properties/propertiesModel.js`: нормализация блока `Свойства` в стабильную модель данных.
- Добавлен `js/properties/characterCalculations.js`: модификаторы DnD, бонус мастерства, расчет проверок, чтение источников персонажа и хитов.
- `js/templates/propertyBlockDefinitions.js` превращен в совместимый re-export нового слоя.
- `js/templates/blockTypes.js` теперь рендерит поля `Свойств` из схем, включая select options, min/max и новые поля навыков.
- `js/editor/campaignMapHealth.js` подключен к расчетному слою: карта сначала читает хиты из `PropertiesModel`, затем из legacy `Стат. блок DnD`.
- `styles/block-properties.css` обновлен: блоки стали мягче, компактнее и ближе к визуальному языку проекта.
- `tests/propertyBlocks.test.mjs` расширен проверками схем, модели и правил DnD-расчетов.

### Что стало лучше

- Блок `Свойства` больше не является просто HTML-формой: у него появился слой схем и модель данных.
- Будущий `CharacterModel` получил точку входа, не завязанную на верстку.
- Карта начала использовать расчетный слой для хитов, поэтому новые свойства существ можно будет развивать без переписывания логики карты.

### Следующее развитие

- Следующий крупный шаг по этой линии: `CharacterModel`, который объединит свойства, legacy DnD, навыки, инвентарь, классы и расы в одну модель персонажа.

---

## 2026-06-01: FormattingService 12.7-12.8 и Desktop-план

### Что сделано

- `js/editor/formattingService.js` получил собственные Range/DOM-операции для `bold`, `italic`, `underline`, списков, цвета, reset format и plain-text insertion.
- `document.execCommand()` оставлен только как аварийный fallback внутри `formattingService.js`.
- `tests/browser/editor-formatting.spec.mjs` расширен проверками списков, цвета, reset format и plain-text insertion.
- `docs/02-architecture/contracts/FORMATTING_SERVICE_CONTRACT.md` обновлен: deprecated API больше не является основным механизмом форматирования.
- `docs/Новые идеи к адаптации.txt` разобран и встроен в `docs/01-delivery/PROJECT_PLAN.md`.
- В план добавлены будущие направления: audio/playlist assets, музыка локаций, rule tree, аккаунты/роли/admin, CharacterModel, Inventory, Effects, performance hardening, graph relationships, AI/collaboration/web.
- Переход на desktop подробно разложен в `docs/01-delivery/PROJECT_PLAN.md` и `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md`: 20.4-20.11.

### Что стало лучше

- Редактор меньше зависит от deprecated browser API и стал предсказуемее для будущего desktop/WebView.
- Desktop-направление стало не абстрактным желанием, а очередью конкретных шагов: окружение, adapters, Tauri FS commands, prototype, backup/restore gate, presentation window и packaging smoke.

### Следующее развитие

- Следующий рабочий пункт: `20.4. Подготовить окружение Desktop Spike`.

---

## 2026-06-02: Desktop Adapter 20.4

### Что сделано

- Добавлен `@tauri-apps/cli` в devDependencies.
- Добавлены npm-команды `dev:web`, `desktop:check`, `desktop:dev`, `desktop:info`, `desktop:build`.
- Создана минимальная Tauri-оболочка в `src-tauri/`: конфигурация, Rust entrypoint, build script и default capability.
- Desktop-spike настроен так, чтобы открывать текущий web UI через `tools/static_server.mjs` на `127.0.0.1:5173`.
- `src-tauri/target/` добавлен в `.gitignore`.
- Добавлен `tools/check_desktop_environment.mjs`, чтобы быстро видеть, чего не хватает для desktop-сборки.
- README, `docs/01-delivery/PROJECT_PLAN.md` и `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md` обновлены под реальные команды.

### Что стало лучше

- Desktop-направление перестало быть только планом: теперь в репозитории есть минимальная Tauri-структура.
- Browser mode не затронут: текущий `index.html`, smoke tests и `verify` остаются основной рабочей веткой.
- Ограничение окружения стало явным: на текущей машине есть Node/npm/Tauri CLI/WebView2, но пока нет Rust/Cargo/rustup и Visual Studio Build Tools с MSVC/Windows SDK.

### Следующее развитие

- Следующий пункт: `20.5. Создать StorageAdapter interface в JS`.

---

## 2026-06-02: Desktop Adapter 20.5-20.7

### Что сделано

- Добавлен `StorageAdapter` foundation: contract, facade, browser implementation и desktop implementation.
- `openWorkspace`, `restoreWorkspace` и создание базовых папок workspace переведены на `StorageAdapter`.
- Добавлен `AssetAdapter` foundation: contract, facade, browser implementation и desktop implementation.
- Добавлен `@tauri-apps/api` для вызова backend-команд из desktop WebView.
- В `src-tauri/src/main.rs` добавлены FS-команды: чтение/запись UTF-8 текста, список папки, создание папки, удаление файла, проверка существования и resolution asset URL.
- Rust-команды ограничивают путь workspace root и запрещают `..` в относительных путях.
- Добавлены unit tests для adapter contracts.
- Добавлен Tauri dialog plugin: desktop adapter теперь выбирает workspace root через native dialog и сохраняет путь в `localStorage`.
- Desktop page load/create/delete получили adapter bridge через lightweight file handles.
- Rust/Cargo/rustup установлены через официальный `rustup-init.exe`.
- Visual Studio Build Tools 2022 C++ и Windows SDK установлены и обнаруживаются через `desktop:check`.
- Добавлена `src-tauri/icons/icon.ico`, без которой Tauri build script не проходил Windows resource generation.
- `cargo check` в `src-tauri` проходит.

### Что стало лучше

- Browser и desktop storage получили первую общую границу, поэтому дальнейший перенос можно делать постепенно, без резкого переписывания `pageStorage`, backup и assets.
- Desktop backend перестал быть пустой оболочкой: появилась первая безопасная файловая поверхность для будущего `StorageAdapter`.
- Asset lifecycle получил отдельный adapter facade, к которому можно подключить изображения, карты, музыку и плейлисты.

### Ограничения

- `npm run desktop:info` выводит зеленый отчет, но в текущем shell может не завершаться сам; обязательным gate считаем `npm run desktop:check` и `cargo check`.
- Глубокий перевод backup/assets/writeQueue на adapter остается следующим hardening-этапом.
- Структурированные Rust error objects пока не введены: команды возвращают строки.

### Следующее развитие

- Следующий пункт: продолжить desktop foundation с переносом `writeQueue`, `backupService`, `assetStorage`, `images` и `campaignMapRuntime` на adapter-backed storage.

---

## 2026-06-04: Desktop hardening 20.14.4-20.14.8

### Что сделано

- Добавлен production frontend output `dist-desktop/` через `npm run desktop:prepare` и `tools/prepare_desktop_dist.mjs`.
- Tauri production build переведен на `frontendDist: "../dist-desktop"` и `beforeBuildCommand: "npm run desktop:prepare"`.
- Включен Tauri bundle, target ограничен `nsis`.
- Добавлен полный desktop release gate `npm run desktop:gate`: `verify`, browser smoke, desktop prepare, packaging smoke, desktop environment и `cargo check`.
- Расширен `desktop:packaging-smoke`: он проверяет scripts, Tauri config, asset protocol, dist-файлы и desktop docs.
- Добавлены `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md` и `docs/02-architecture/desktop/DESKTOP_MAP_PERFORMANCE_NOTES.md`.
- `npm run desktop:build` успешно собрал `src-tauri/target/release/my-own-world.exe` и `src-tauri/target/release/bundle/nsis/MyOwnWorld_0.0.0_x64-setup.exe`.

### Что стало лучше

- Desktop-сборка больше не тянет сырой корень проекта, тесты, docs и служебные файлы в production frontend.
- Перед desktop build появился один понятный gate, который одновременно защищает browser-версию и Tauri-цепочку.
- Пункт 20.14.7 теперь закрыт не только конфигурацией, но и фактической сборкой release `.exe` и installer.

### Ограничения

- Первый NSIS build может скачивать bundler из GitHub; в restricted sandbox он падает по сетевому доступу, вне sandbox сборка проходит.
- Настоящий автоматизированный Tauri UI click-runner еще не сделан.
- Большие карты в desktop могут открываться медленнее из-за asset fallback, base64/data URL, canvas/fog и WebView/IPC overhead.

### Следующее развитие

- Следующий пункт плана: `20.14.9. Desktop map performance optimization`.

---

## 2026-06-04: справление desktop-презентации

### Что сделано

- справлен `src-tauri/capabilities/default.json`: добавлен permission `core:webview:allow-create-webview-window`.
- `tools/check_desktop_packaging_smoke.mjs` теперь проверяет, что permission создания окна презентации есть и capability привязан к `campaign-map-presentation`.
- `docs/02-architecture/desktop/DESKTOP_PACKAGING_SMOKE.md`, `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md` и `docs/01-delivery/PROJECT_PLAN.md` обновлены, чтобы причина не потерялась.

### Почему ломалось

Tauri v2 требует явного разрешения на создание нового `WebviewWindow`. Окно `campaign-map-presentation` было перечислено в capability, но сама команда `create_webview_window` не была разрешена. Поэтому кнопка презентации могла не открыть отдельное окно в desktop.

---

## 2026-06-04: Стабилизация режима презентации карты

### Что сделано

- `getRenderableImageURL()` получил cache, чтобы большие изображения карты и токенов не перечитывались при каждом полном payload.
- Tauri-презентация больше не делает полный render-model при каждом движении токена/фигуры.
- Добавлены delta-сообщения `update-items`, `update-fog` и `drag-measure`.
- `js/presentation/campaignMapPresentationRenderer.js` умеет применять эти patch-сообщения без пересоздания всей сцены.
- Сетка в presentation renderer теперь превращает hex-цвета в полупрозрачный `rgba(..., 0.22)`, чтобы она не становилась яркой непрозрачной сеткой.
- Добавлен browser regression `campaign-map-presentation-applies-delta-patches-without-full-rerender`.

### Что стало лучше

- Перемещение сущностей и фигур в desktop-презентации должно обновляться легче и быстрее.
- Туман синхронизируется отдельным сообщением, без пересборки background и всех токенов.
- Вектор движения отправляется отдельным маленьким payload.
- Переключение карты все еще требует полного render-model, но повторные обновления после открытия стали дешевле.

### Следующее развитие

- Следующий хвост пункта `20.14.9`: сделать desktop performance scenario на большом workspace и перейти к dirty-region fog, чтобы рисование/стирание тумана не отправляло весь canvas целиком.

### Дополнение

- Добавлен scenario `desktopPresentationLargeWorkspace` в `campaignMapPerformance.js`.
- Тест `desktop presentation scenario separates full render and delta sync budgets` проверяет отдельный budget `deltaSyncTimeMs`.
- Стрелка расстояния в презентации поднята выше тумана: `.campaign-map-drag-measure` теперь использует `z-index: 10002`.
- Browser regression дополнен проверкой, что стрелка находится выше `.campaign-map-fog-image`.

### Следующее развитие

- Следующий пункт плана: `20.14.10. Dirty-region fog sync`.

## 2026-06-23: Data Recovery And Storage Hardening 0.0.0.5.2-0.0.0.5.5

- Closed `0.0.0.5.2`: added model/browser coverage for safe repair-actions with mandatory backup manifest.
- Closed `0.0.0.5.3`: centralized schema version states in `js/schema/schemaVersions.js` and blocked future workspace/map/task schema versions.
- Closed `0.0.0.5.4`: desktop Rust commands now return structured errors with `code`, `message`, and `path`; JS bridge normalizes them into Error objects.
- Closed `0.0.0.5.5`: moved workspace access checks toward `StorageAdapter`; direct `state.workspaceHandle` usage remains only in state synchronization and the browser adapter backend.

Checks so far: focused schema/storage tests and `cargo check` pass. Full verify/browser smoke still must run before handoff.

## 2026-07-07: Knowledge Graph Entity 0.0.0.6.1-0.0.0.6.4

- Добавлена отдельная сущность `Граф связей` (`knowledgeGraph`) в главное меню создания и пустой стартовый экран.
- `Граф связей` открывается как человеко-читаемая страница: сверху сводка, дальше вкладки `Связи` и `Одинокие страницы`.
- Связи строятся из дерева страниц, wiki-links и будущих typed relationships из `page.relationships`.
- Одинокие страницы можно увидеть отдельным списком и открыть в один клик.
- Сохранение `knowledgeGraph` сделано как special-page serialization: runtime UI очищается, в файле остается чистая persistent shell.
- Добавлен contract `docs/02-architecture/KNOWLEDGE_GRAPH_ENTITY_CONTRACT.md`.
- Добавлены unit/browser regression tests для модели графа и пользовательского сценария создания/открытия графа.

Проверки:

- `node --test tests/knowledgeGraph.test.mjs`
- `node tools/docs_index.mjs`
- `npm run test:browser`
- `npm run verify`
## 2026-07-07: Correction - 0.0.0.6 Not Closed

- Исправлена ошибка статуса: блок `0.0.0.6 Knowledge Graph / Rule Tree` не считается завершенным.
- По `0.0.0.6` есть только foundation/readable MVP: сущность `Граф связей`, списки связей, orphan pages и domain focus.
- Полноценный сценарий работы с графом, редактирование/исследование связей и завершение подпунктов `0.0.0.6.5-0.0.0.6.11` остаются активной работой.
- `0.0.0.7 World Package Foundation` был начат вне очереди; код foundation оставлен, но следующий активный план возвращается к `0.0.0.6`.

## 2026-07-07: World Package Foundation

- Проверил состояние после возможного обрыва интернета: `docs_index`, `knowledgeGraph` unit, `npm run verify` и полный `npm run test:browser` проходят.
- Закрыт foundation блока `0.0.0.7`: добавлены `WorldPackageModel`, workspace storage в `world-packages/*.world-package.json`, import preview, dependency report и schema validation.
- Workspace initialization теперь создает папку `world-packages` рядом с `rule-packages`.
- Добавлен контракт `docs/02-architecture/contracts/WORLD_PACKAGE_CONTRACT.md`: формат пакета, правила preview-before-import, backup-before-write, зависимости и fork metadata.
- Добавлены unit tests `tests/worldPackage.test.mjs` на нормализацию, storage, preview конфликтов, dependency report и workspace schema.
- Пользовательский UI export/import намеренно не добавлен в этом проходе: сначала закреплен безопасный data/storage слой, чтобы будущий импорт не писал в workspace без preview и backup.
---

## 2026-07-11: 0.0.0.8.1 Project File Audit

### Что сделано

- Проведен полный аудит файлов проекта двумя независимыми проходами.
- Проход 1: механическая инвентаризация по фактическому дереву файлов, зонам владения, назначению, необходимости оптимизации и возможности удаления.
- Проход 2: смысловая сверка по ссылкам/import-цепочкам, крупным файлам, untracked/debug-файлам, generated-зонам и признакам битой кодировки.
- Обновлен `docs/01-delivery/PROJECT_FILE_AUDIT.md`: теперь он содержит сводку по зонам, кандидатов на уборку, сигналы второго прохода и полную таблицу файлов.
- Добавлен повторяемый инструмент `tools/audit_project_files.mjs`, чтобы аудит можно было пересобирать после следующих этапов уборки.

### Найдено

- Явные кандидаты на уборку без удаления: `debug.log` и старый `tools/generate_project_file_audit.py`.
- Найдены файлы с признаками mojibake для следующего подпункта `0.0.0.8.2`.
- Крупные файлы для отдельной проверки: `docs/MY_OWN_WORLD_FULL_MANUAL.docx`, `assets/background.jpg`, `docs/01-delivery/WORK_LOG.md`, `debug.log`.

### Проверки

- `node tools/audit_project_files.mjs`
- `node tools/docs_index.mjs`

### Следующее

- Следующий пункт плана: `0.0.0.8.2. Починить кодировки в документации`.
---

## 2026-07-11: 0.0.0.8.2 Encoding Cleanup And Mojibake Guard

### Что сделано

- Восстановлены строки с реальным mojibake в `docs/01-delivery/WORK_LOG.md`, `js/editor/campaignMapLayerModel.js`, `js/editor/campaignMapTokenPopupController.js`, `js/ui/appTopbar.js`, `tests/propertyBlocks.test.mjs`.
- Конвертированы смешанные/не-UTF-8 строки в `js/storage/pageStorage.js` и `js/tree/treeContextMenu.js` в нормальный UTF-8.
- Убраны буквальные примеры битой кодировки из `README.md` и `docs/02-architecture/contracts/BLOCK_SYSTEM_CONTRACT.md`, чтобы документация не становилась источником ложных срабатываний.
- Добавлен `tools/check_text_encoding.mjs`: проверяет текстовые файлы на invalid UTF-8 и сильные mojibake-маркеры.
- Добавлена команда `npm run check:encoding`; `npm run verify` теперь запускает encoding-check перед JS syntax/import/test проверками.
- `tools/audit_project_files.mjs` обновлен: mojibake-поиск больше не хранит реальные битые символы в исходнике.

### Проверки

- `node tools/check_text_encoding.mjs`
- `node tools/audit_project_files.mjs`
- `node tools/docs_index.mjs`
- `node tools/validate_agent_skills.mjs`
- `npm run verify`
- `npm run test:browser`

### Следующее

- Следующий пункт плана: `0.0.0.8.3. Разложить docs по зонам`.

---

## 2026-07-11: 0.0.0.8.2.1 And 0.0.0.8.3 Docs Cleanup

### Что сделано

- Переписаны старые необратимые question-mark фрагменты в `release/latest/release-notes.md`, `release/latest/tester-instructions.md`, `docs/01-delivery/WORK_LOG.md` и `Лог особенный/Летопись королевства My own world.md`.
- Поврежденные места не восстанавливались “как будто дословно”: для них записаны короткие смысловые версии по окружающему контексту и названию задач.
- Добавлен `docs/README.md` с картой зон документации: product, delivery, architecture, testing, user-release, archive.
- В `PROJECT_PLAN.md` закрыты `0.0.0.8.2.1` и `0.0.0.8.3`.

### Проверки

- `rg -n "\?{4,}" -S .`
- `node tools/docs_index.mjs`
- `node tools/check_text_encoding.mjs`
- `npm run verify`

### Следующее

- Следующий пункт плана: `0.0.0.8.4. Архивировать устаревшие документы`.

---

## 2026-07-11: 0.0.0.8.4 Archive Outdated Docs

### Что сделано

- Архивирован документ `docs/02-architecture/ARCHIVED_EXPERIMENTS.md`: он перенесен в `docs/archive/ARCHIVED_EXPERIMENTS.md`, потому что уже является описанием отложенных экспериментов и не должен лежать среди активных архитектурных контрактов.
- Добавлен `docs/archive/README.md` — реестр архивных документов с причиной архивации и ссылкой на актуальный рабочий источник.
- Обновлена ссылка в `.agents/skills/character-model/SKILL.md`, чтобы агент читал новый архивный путь.
- Остальные документы desktop/adapters оставлены активными: на них есть живые ссылки из README, skills и testing-документов, поэтому архивировать их сейчас рискованно.
- В `PROJECT_PLAN.md` пункт `0.0.0.8.4` отмечен как выполненный.

### Проверки

- `node tools/docs_index.mjs`
- `node tools/check_text_encoding.mjs`
- `node tools/audit_project_files.mjs`
- `npm run verify`

### Следующее

- Следующий пункт плана: `0.0.0.8.5. Убрать временные и debug-файлы`.

---

## 2026-07-11: 0.0.0.8.5 Temporary And Debug Files Cleanup

### Что сделано

- Перед удалением проверены кандидаты из аудита и поиска по файловым шаблонам.
- Удален `debug.log`: локальный debug-лог не является исходником проекта и не должен попадать в коммит.
- Удален старый `tools/generate_project_file_audit.py`: он был заменен `tools/audit_project_files.mjs`, содержал битую кириллицу и больше не нужен как активный инструмент.
- Обновлен `tools/audit_project_files.mjs`, чтобы новые нужные untracked-файлы `docs/README.md` и `tools/check_text_encoding.mjs` не считались мусором до коммита.
- Пересобран `docs/01-delivery/PROJECT_FILE_AUDIT.md`: в отчете 480 файлов, `Delete candidates: 0`, `Mojibake candidates: 0`.
- В `PROJECT_PLAN.md` пункт `0.0.0.8.5` отмечен как выполненный.

### Проверки

- `Get-ChildItem` по шаблонам временных/debug-файлов
- `node tools/audit_project_files.mjs`
- `node tools/docs_index.mjs`
- `node tools/check_text_encoding.mjs`
- `npm run verify`

### Следующее

- Следующий пункт плана: `0.0.0.8.6. Обновить AGENTS.md и skills после уборки`.

---

## 2026-07-11: 0.0.0.8.6-0.0.0.8.7 Agent Workflow And Tester Instructions Refresh

### Что сделано

- Обновлен `AGENTS.md`: перед задачами агент теперь явно читает `docs/README.md`, активный план, work log и релевантные contract-файлы; после уборки добавлены правила не возвращать архивные документы и временный мусор в активную зону без отдельной задачи.
- Обновлены `.agents/skills/docs-restructure/SKILL.md` и `.agents/skills/release-handoff/SKILL.md`: skills теперь знают про карту документации, архивный реестр, аудит файлов и проверку кодировки.
- Обновлен `README.md`: добавлен короткий маршрут по AI/Codex workflow, docs map, archive policy и проверочным командам `docs:index`, `agents:validate`, `check:encoding`, `audit_project_files`.
- Обновлены пользовательские инструкции `docs/04-user-release/README_FOR_TESTERS.md` и `docs/04-user-release/TEST_SCENARIOS.md`: добавлены простые проверки навигации по документации и структуры `docs/`.
- Обновлены release handoff-файлы `release/latest/tester-instructions.md` и `release/latest/release-notes.md`: зафиксировано, что после уборки tester flow должен проверять документационную карту, архив и отсутствие мусора.
- `docs/MY_OWN_WORLD_FULL_MANUAL.docx` не пересобирался намеренно: генератор `tools/generate_manual_docx.py` содержит старые строки, которые нужно отдельно привести в порядок перед безопасной регенерацией полного docx-мануала.

### Проверки

- `node tools/validate_agent_skills.mjs`
- `node tools/docs_index.mjs`
- `node tools/check_text_encoding.mjs`
- `node tools/audit_project_files.mjs`
- `npm run verify`

### Следующее

- Следующий пункт плана: `0.0.0.9. Desktop Product Hardening`.
