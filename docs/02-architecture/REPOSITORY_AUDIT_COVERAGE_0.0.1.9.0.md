---
summary: "Coverage ledger for the 0.0.1.9.0 repository maintainability audit."
read_when:
  - "When checking what the repository audit actually reviewed"
  - "Before challenging or extending 0.0.1.9.0 findings"
  - "Before starting 0.0.1.10.0 cleanup"
owner_zone: "architecture"
---

# Repository Audit Coverage 0.0.1.9.0

Audit date: 2026-08-11

Head audited: `11c0ce2`

Working tree at start: clean.

## Scope

Included:

- tracked first-party source, styles, tests, docs, release handoff, tools, desktop code and agent workflow files;
- architecture and delivery contracts;
- active docs and archived-plan pointers only enough to verify current source-of-truth ownership;
- ignored local artifacts only enough to identify whether they are tracked or product truth.

Excluded from first-party inventory:

- `.git/`
- `node_modules/`
- `dist-desktop/`
- `src-tauri/target/`
- `test-results/`
- `playwright-report/`
- local ignored `legacy/` and `legasy/`

No real user workspace was opened or mutated.

## Inventory Snapshot

Tracked first-party files at audited head: `581`.

By top-level zone:

| Zone | Files |
| --- | ---: |
| `.agents` | 9 |
| `.github` | 1 |
| `assets` | 4 |
| `docs` | 95 |
| `js` | 271 |
| `release` | 7 |
| root config/docs | 9 |
| `src-tauri` | 11 |
| `styles` | 58 |
| `tests` | 88 |
| `tools` | 20 |
| historical story log | 1 |
| technical maturity evidence | 7 |

By extension:

| Extension | Files |
| --- | ---: |
| `.js` | 271 |
| `.mjs` | 107 |
| `.md` | 108 |
| `.css` | 58 |
| `.json` | 9 |
| `.png` | 6 |
| `.gitkeep` | 6 |
| `.docx` | 2 |
| other tracked project files | 14 |

Largest active files reviewed as debt signals, not automatic delete candidates:

| File | Lines | Audit note |
| --- | ---: | --- |
| `docs/01-delivery/WORK_LOG.md` | 6687 | Historical source; large but intentional. |
| `tests/browser/campaign-map-ui.spec.mjs` | 4226 | Large browser suite; not a cleanup target without test-split plan. |
| `tests/browser/property-blocks.spec.mjs` | 3925 | Large browser suite; useful as Properties regression surface. |
| `js/wiki/knowledgeGraphPage.js` | 3650 | Major coordinator/god-file risk. |
| `tests/browser/visual-regression.spec.mjs` | 3312 | Evidence smoke suite; not strict pixel baseline. |
| `js/editor/propertiesSettingsPopup.js` | 3205 | Popup/layout ownership concentration. |
| `js/wiki/knowledgeGraph.js` | 2019 | Graph model/rendering size risk. |
| `js/storage/pageStorage.js` | 1914 | Storage-critical; contains batch tree-position risk. |
| `tests/storageAdapter.test.mjs` | 1883 | High-value storage regression suite. |
| `js/ui/worldPackageManager.js` | 1783 | Large UI manager; reviewed for data-boundary drift. |

## Specialist Coverage

| Reviewer | Agent id | Coverage | Output used |
| --- | --- | --- | --- |
| A | `019fea5d-d0ad-7951-af56-1f63397e8326` | Page command service, repository/index, feature write boundaries | RA-001, RA-006, RA-007 |
| B | `019fea5d-d608-75f3-9a57-2d598f7c3cfc` | UI architecture, Knowledge Graph, Properties, CSS/helper duplication | RA-008, RA-009, RA-010, RA-011 |
| C | `019fef99-bc9b-7361-9941-970d8e5af9bf` | Source-of-truth/data/domain boundary pass after initial C reviewer 403 | RA-001B, RA-006, RA-007, RA-016 |
| D | `019fea5d-d707-7321-9405-ee31eb985b2e` | Test, release, CI, desktop gate | RA-003, RA-004, RA-014 |
| E | `019fea5d-d782-7160-a083-04f786265668` | Data safety, Tauri/browser storage, large workspace, performance | RA-002, RA-005, RA-012, RA-013 |
| Extra UI/accessibility pass | `019fef97-91d8-7501-bd6a-bdf551ef76c1` | Tables, graph tabs, World Package overlay semantics and token checks | RA-017, RA-018, RA-019, RA-020 |

The initial Reviewer C failed with `403 Forbidden`, so the C slot was replaced instead of being counted as complete.

## Coverage Matrix

| Area | Coverage level | Notes |
| --- | --- | --- |
| AppShell/tree contracts | Read/referenced | No new Tree feature audit finding beyond existing state/page lookup constraints. |
| PageRepository/PageIndex | Deep | Rollback/index desync and direct lookup debt identified. |
| Storage/write queue/page commands | Deep | Batch tree-position rollback and feature low-level writes identified. |
| Backup/restore | Targeted | Restore pre-backup gate mismatch identified. |
| Tauri filesystem boundary | Targeted | No material path escape/root delete finding; Rust boundary looked intentionally constrained. |
| Browser storage adapter | Targeted | Noted as lower-level write owner; no standalone P1 finding beyond command/write-boundary drift. |
| Campaign Map | Broad | Popup/helper duplication, async map render risk and selection/performance risks reviewed; no new product feature recommended. |
| Knowledge Graph | Deep | Coordinator size, CSS icon-only hack, direct state lookup, tab semantics and visual-regression limits identified. |
| Properties | Deep | Popup layout ownership risk identified; character sheet local-token debt identified. |
| Tables | Targeted | Toolbar/keyboard accessibility contract gap identified. |
| Task Tracker | Targeted | Structural icon-only cleanup considered closed; page-action write boundary remains. |
| Popup lifecycle/positioning | Targeted | Shared ownership improved; World Package modality ambiguity remains a cleanup candidate. |
| Safe HTML | Targeted | No confirmed unsafe input-to-sink chain found. |
| CSS/design system | Broad | Remaining token/hack debt identified; no broad rewrite recommended. |
| Tests/browser smoke | Deep | Native smoke/gate/visual-regression semantics risks identified. |
| Docs/plan/archive | Broad | Active source-of-truth reviewed; old plans archive-only; new cleanup docs created. |
| Local artifacts | Targeted | `debug.log` exists locally, ignored and untracked. |

## Searches And Evidence Inputs

Representative searches used:

- tracked inventory via `git ls-files`;
- direct write/read boundary search for `state.pages`, `writePageContent`, `persistPageContentCommand`, `notifyPageUpdated`;
- rollback and tree-position storage inspection;
- restore and backup-gate contract inspection;
- editor open-page async lifecycle inspection;
- CSS hack search for `font-size: 0`, `opacity: 0`, `text-indent`, `outline: none`;
- design-token search for undefined `--mow-*` variables and feature-local palettes;
- duplicate helper search for `escapeHTML`, `escapeHtml`, `rollD20`, `clamp`;
- accessibility search for toolbar/tablist/dialog semantics in table, graph and World Package surfaces;
- desktop gate/smoke search for skipped status, console/page errors and diagnostics warnings;
- stale planning pointer search for archived plan names and old next-block docs.

## Limitations

- This was not a production-code change task.
- Runtime browser/unit/desktop tests were not required for finding validation because no production code was changed.
- The audit did not open a real external large workspace.
- The audit did not use old `PROJECT_FILE_AUDIT.md` as authoritative truth.
- Some older Russian text appears mojibake in PowerShell output; validation uses repository encoding tools instead of terminal rendering.

## Closure Criteria Coverage

| Requirement | Status |
| --- | --- |
| First-party inventory exists | Done |
| Coverage ledger exists | Done |
| Five specialist passes used | Done |
| Findings consolidated and prioritized | Done |
| Cleanup backlog exists | Done |
| Bug inventory reconciled | Done in audit report |
| Source-of-truth maps reviewed | Done |
| No cleanup implemented | Confirmed |
| No product functionality implemented | Confirmed |
| Owner review gate ready | Done |

## 0.0.1.9.1 Completeness Verification Addendum

Verification date: 2026-08-11

Head reviewed: `679e5a1`

Result: `C - AUDIT HAD MATERIAL BLIND SPOTS`

Purpose: prove whether the original audit was complete enough before any `0.0.1.10.0` cleanup starts. This pass challenged the original findings, rebuilt the coverage ledger at current head, ran a second blind sweep and used three read-only independent reviewers.

No production cleanup was implemented. No product functionality was implemented. No real user workspace was opened or mutated.

### Current Coverage Numbers

| Metric | Count | Reviewed |
| --- | ---: | ---: |
| Tracked first-party files | 584 | 584 accounted for |
| Production JS files | 271 | 271 |
| CSS files | 58 | 58 |
| Rust files | 2 | 2 |
| Tool files | 20 | 20 |
| Unit test files | 59 | 59 |
| Browser test files | 26 | 26 |
| Docs markdown files | 88 | 88 accounted for |
| Active doc families | 78 | 78 |
| Archive doc files | 10 | 10 historical |
| Grouped review families | 68 | 68 |
| UNKNOWN | 0 | 0 |

Notes:

- `git ls-files` was the source for tracked first-party counts.
- `node tools/audit_project_files.mjs` may report one extra local ignored file (`debug.log`); that is not tracked first-party source.
- The original audit head was `11c0ce2`. Current head `679e5a1` only changed docs/evidence after that head before this verification pass, so production code coverage remains current.

### Previous P1 Recheck

| Finding | Verification result | Evidence summary |
| --- | --- | --- |
| RA-001 | CLOSED BY RCB-001 / `0.0.1.10.2` | Rollback and repository update paths in `js/storage/pageCommandService.js` plus index bucket behavior in `js/repository/pageIndex.js`. |
| RA-001B | CLOSED BY RCB-001B / `0.0.1.10.3` | Metadata mutation before snapshot is covered by repository regressions for title, aliases, tags, type, empty transitions and TreeIndex parent buckets. |
| RA-002 | CLOSED BY RCB-002 / `0.0.1.10.4` | Tree-position batch storage regressions prove mid-batch write failure restores already-written files, memory and indexes; rollback write failure is surfaced explicitly. |
| RA-003 | CLOSED BY RCB-003 / `0.0.1.10.5` | Native click-through status now fails on unexpected `pageerror` and `console.error`, keeps warnings diagnostic and documents the exact Chromium ResizeObserver allowlist. |

### Second Blind Sweep

Status: completed.

The pass started without the RA-001...RA-020 list and searched for high-risk patterns:

- write/data: `writePageContent`, `persistPageContentCommand`, `notifyPageUpdated`, write queue revisions, metadata mutation, batch writes, backup/restore/imports;
- async/lifecycle: page opening, timers, stale callbacks, workspace load races, render caches;
- UI/accessibility: DOM structural patching, popups, context menus, custom controls, pointer-only workflows;
- CSS: `font-size: 0`, hiding hacks, `!important`, undefined tokens, extreme z-index, raw local palettes;
- security: `innerHTML`, `insertAdjacentHTML`, Tauri path composition, archive/import paths;
- tests: `.only`, `.skip`, waits, swallowed console/page errors, visual-smoke limitations;
- architecture: duplicate sources of truth, feature low-level writes, god files, runtime normalization.

The blind sweep confirmed the original P1 findings and found new material issues RA-021 through RA-030.

### Independent Reviewers For 0.0.1.9.1

| Reviewer | Agent id | Focus | Result after main-agent verification |
| --- | --- | --- | --- |
| 1 | `019fefae-4576-7633-aa58-d674a873fd5c` | Data / persistence / lifecycle | NEW FINDING: RA-021. NEW P2: RA-023, RA-024, RA-025. Existing finding rediscovered: RA-001B. |
| 2 | `019fefae-5f95-7f31-aae7-34d3819ad8ca` | Architecture / AI-slop / module ownership | Existing finding rediscovered: RA-006. NEW P2/P3: RA-026, RA-029. Other ownership notes covered by RA-008/RA-011. |
| 3 | `019fefae-73f8-7c50-9bf9-b18107d0bb2c` | UI / CSS / tests / accessibility | NEW FINDING: RA-022. NEW P2/P3: RA-027, RA-028, RA-030. Existing finding rediscovered: RA-014/RA-020. |

Subagent assertions were not accepted on their own. New P1/P2 candidates were opened and checked by the main agent before being added.

### New Finding Triage

| Finding | Priority | Classification | Cleanup impact |
| --- | --- | --- | --- |
| RA-021 | P1 | CLOSED BY RCB-021 / `0.0.1.10.1` | First cleanup leaf completed; RA-001, RA-001B, RA-002 and RA-003 are now closed. |
| RA-022 | P1 | CLOSED BY RCB-022 / `0.0.1.10.6` | Tree row actions are reachable from keyboard with `Shift+F10` and ContextMenu while preserving roving tree focus. |
| RA-023 | P2 | NEW FINDING | Adds workspace load lifecycle cleanup. |
| RA-024 | P2 | NEW FINDING | Adds workspace-scoped asset cache cleanup. |
| RA-025 | P2 | NEW FINDING | Adds write queue durability cleanup. |
| RA-026 | P2 | NEW FINDING | Adds Rule Tree save ownership cleanup. |
| RA-027 | P2 | NEW FINDING | Adds custom card type control accessibility/layer cleanup. |
| RA-028 | P2 | NEW FINDING | Adds owner decision on keyboard reorder support. |
| RA-029 | P3 | NEW FINDING | Small module boundary leak; defer unless touching rules workspace. |
| RA-030 | P3 | NEW/EXISTING MIX | Extends RA-020 with specific token/layer evidence. |

### Granular File And Family Coverage Ledger

Review status values follow the task contract: `REVIEWED - FINDING`, `REVIEWED - NO MATERIAL FINDING`, `REVIEWED - EXISTING FINDING COVERS IT`, `GENERATED`, `HISTORICAL`, `NOT ARCHITECTURALLY RELEVANT`, `BLOCKED`, `UNKNOWN`.

| PATH / FAMILY | SUBSYSTEM | ROLE | REVIEW STATUS | REVIEW PASSES | SOURCE OF TRUTH RELEVANCE | WRITE/PERSISTENCE RELEVANCE | LIFECYCLE RELEVANCE | TEST COVERAGE CHECKED | FINDING IDS | NOTES |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `js/app.js`, `js/state.js`, `js/stateActions.js` | App bootstrap/state | Startup, global state and workspace open orchestration | REVIEWED - FINDING | Main, reviewer 1 | Runtime state owner | Workspace load publishes pages | Startup/open race | Browser shell tests | RA-023 | No product code changed. |
| `js/core/*.js` | Core page/icon contracts | PageRecord and icon helpers | REVIEWED - NO MATERIAL FINDING | Main | Page serialization support | PageRecord content builder | Low | Page record/unit tests | none | No second source found. |
| `js/repository/*.js` | PageRepository/PageIndex | Read model and index buckets | REVIEWED - FINDING | Main, reviewers 1/2 | Read model over pages | Notifications update indexes | Medium | Repository/search tests | RA-001, RA-001B | Previous P1 confirmed. |
| `js/storage/storageAdapter*.js`, `browserStorageAdapter.js`, `desktopStorageAdapter.js` | Storage adapter | Browser/desktop file boundary | REVIEWED - NO MATERIAL FINDING | Main, reviewer 1 | Adapter source boundary | Low-level file IO | Medium | Storage adapter tests | none | Tauri boundary reviewed separately. |
| `js/storage/writeQueue.js` | Write queue | Revision and serialized writes | REVIEWED - FINDING | Main, reviewer 1 | Write revision state | Page content writes | High | Storage/write tests | RA-025 | Superseded-after-write crash window. |
| `js/storage/pageCommandService.js` | Page command | Command, rollback, undo | REVIEWED - FINDING | Main, reviewers 1/2 | Command owner | Persists pages and rollback | High | Page command tests | RA-001, RA-025 | Previous P1 confirmed. |
| `js/storage/pageStorage.js` | Page storage/tree ops | Page create/delete/move/tree positions | REVIEWED - FINDING | Main, reviewer 1 | Physical page store | Multi-page writes | High | Storage/tree tests | RA-002, RA-006, RA-023 | Batch durable rollback risk confirmed. |
| `js/storage/workspaceStorage.js` | Workspace loading | Load/scan workspace pages | REVIEWED - FINDING | Main, reviewer 1 | Loads runtime pages | Publishes `state.pages` | High | Workspace diagnostics tests | RA-023 | No generation/cancel guard found. |
| `js/storage/backupService.js`, checkpoint/journal files | Backup/checkpoint/operation journal | Backup, restore, checkpoints | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 1 | Backup manifest | Restore/write files | High | Backup/storage tests | RA-005 | No new destructive restore P0. |
| `js/storage/asset*.js` | Assets | Asset storage/cache/reference scan | REVIEWED - FINDING | Main, reviewer 1 | Asset file refs | Asset import/read | Medium | Asset/browser smoke | RA-024 | Renderable cache not workspace-scoped. |
| `js/schema/*.js`, `js/validation/*.js` | Schema/validation | Workspace/page validation and recovery rules | REVIEWED - NO MATERIAL FINDING | Main | Schema contract | Recovery actions gated | Medium | Schema validation tests | none | No new unsafe recovery path confirmed. |
| `js/search/*.js`, `js/templates/*.js` | Search/templates | Search read model and page templates | REVIEWED - EXISTING FINDING COVERS IT | Main | PageRepository search | Template storage writes | Medium | Search/template tests | RA-006, RA-007 | Template writes are part of boundary cleanup. |
| `js/editor/editor.js`, `autosave.js`, `editorOpenPage.js`, `editorSpecialSave.js` | Editor save/open | Page open, autosave, special saves | REVIEWED - FINDING | Main, reviewers 1/2 | Current page/editor DOM | Primary save paths | High | Editor/property browser tests | RA-016, RA-021, RA-026 | New pending autosave P1. |
| `js/editor/editorNavigation.js`, card shell runtime header | Editor recent UI polish | Header nav/tag reparenting | REVIEWED - NO MATERIAL FINDING | Main | Runtime only | No durable write | Medium | Property browser/visual tests | none | Acceptable temporary debt. |
| `js/editor/blocks/blockContract.js`, serializer/factory files | Block system | Persistent block serialization | REVIEWED - NO MATERIAL FINDING | Main | Persistent body HTML | Save sanitizer input | Medium | Block tests | none | Uses sanitizer/runtime removal patterns. |
| `js/editor/blocks/blockRuntimeControls.js`, `js/ui/itemSets.js` list normalization | Runtime block controls | Runtime controls, short description, list kind normalization | REVIEWED - NO MATERIAL FINDING | Main | Runtime UI | Saves through editor | Medium | Property browser tests | none | Runtime normalization is acceptable temporary debt. |
| `js/editor/safeHtml*.js`, paste/format/link files | Safe HTML/editing | Sanitizer, paste and formatting | REVIEWED - NO MATERIAL FINDING | Main | Sanitized HTML | Persistent body writes | Medium | Safe HTML/browser tests | none | No confirmed unsafe sink. |
| `js/editor/images.js`, asset sanitizer | Editor images | Image upload/render/crop | REVIEWED - EXISTING FINDING COVERS IT | Main | Asset references | Asset writes | Medium | Asset/property tests | RA-024 | Cache ownership is in asset storage. |
| `js/editor/editorHistory.js`, keyboard/toolbar files | Editor history and commands | Undo/history/keyboard/toolbars | REVIEWED - EXISTING FINDING COVERS IT | Main | Editor snapshot | Restores editor DOM | Medium | Editor formatting tests | RA-016 | Async stale render remains covered. |
| `js/editor/campaignMap.js`, runtime/render adapter files | Campaign Map runtime | Map stage and runtime orchestrator | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 2 | Map page content/runtime store | Map special save | High | Campaign map browser tests | RA-006, RA-011 | No new map workflow finding. |
| `js/editor/campaignMapDataSerializer.js`, model/store files | Campaign Map model/store | Map durable model and serializer | REVIEWED - EXISTING FINDING COVERS IT | Main | Map page data | Serializer writes | High | Campaign map data tests | RA-006 | Direct write boundary remains. |
| `js/editor/campaignMapToolbar*.js`, popup controller files | Campaign Map toolbar/popups | Map controls and overlays | REVIEWED - EXISTING FINDING COVERS IT | Main | Runtime UI | Save via map flows | Medium | Popup/map browser tests | RA-011 | Shared popup ownership already addressed in 8.18.5. |
| `js/editor/campaignMapToken*.js` | Campaign Map tokens | Token actions/popups/drag | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 2 | Token runtime/map data | Direct token writes | High | Map UI tests | RA-006, RA-011 | No product feature added. |
| `js/editor/campaignMapDrawing/Fog/Shapes*.js` | Campaign Map drawing/fog/shapes | Drawing and visibility state | REVIEWED - EXISTING FINDING COVERS IT | Main | Map page data | Map serializer | Medium | Map drawing/fog tests | RA-006 | No new P1. |
| `js/editor/campaignMapMusic/Initiative/Presentation*.js` | Map session features | Music, initiative, presentation sync | REVIEWED - EXISTING FINDING COVERS IT | Main | Map/session data | Map save/presentation sync | Medium | Map initiative/presentation tests | RA-011 | Helper duplication remains P3. |
| `js/properties/*.js` | Properties model | Properties data/model/calculation | REVIEWED - NO MATERIAL FINDING | Main | Properties model | Editor save | Medium | Property tests | none | Popup layout owner is separate. |
| `js/editor/propertiesSettingsPopup.js` | Properties popup | Layout, drag, popup orchestration | REVIEWED - EXISTING FINDING COVERS IT | Main | Runtime layout | Writes properties into page DOM | High | Property browser tests | RA-009 | Existing cleanup candidate. |
| `js/character/*.js`, character effects/inventory | Character model | Character/effects/inventory data | REVIEWED - NO MATERIAL FINDING | Main, reviewer 2 | CharacterModel/Properties | Editor save | Medium | Character tests | none | No duplicate durable source found. |
| `js/editor/characterSheetBlock.js`, properties calculations | Character sheet | Character UI/calculations | REVIEWED - EXISTING FINDING COVERS IT | Main | Character/Properties | Editor save | Medium | Character/property tests | RA-020 | Token debt covered. |
| `js/taskTracker/*.js` model/render/html | Task Tracker | Board model and rendering | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 3 | Tracker page JSON | Special save/page actions | High | Task tracker browser tests | RA-006 | Structural icon-only cleanup remains closed. |
| `js/taskTracker/taskTrackerDnd.js`, page actions | Task Tracker interaction | DnD and page action writes | REVIEWED - FINDING | Main, reviewer 3 | Tracker runtime | Direct page action write | High | Task tracker tests | RA-006, RA-028 | Keyboard reorder decision added. |
| `js/tree/tree*.js` render/keyboard | Tree | Tree rendering and keyboard contract | REVIEWED - CLOSED BY RCB-022 | Main, reviewer 3 | Runtime tree over pages | Opens/current page | High | Tree accessibility tests | RA-022 | Action menu keyboard gap closed with focused treeitem ContextMenu/Shift+F10 route. |
| `js/tree/treeDragDrop.js`, context/order files | Tree DnD/context | Tree move/reorder/context menu | REVIEWED - FINDING | Main, reviewer 3 | Page parent/order | Tree position writes | High | Tree DnD tests | RA-002, RA-028 | Pointer DnD remains working. |
| `js/ui/appShell.js`, app topbar/sidebar/profile | AppShell/UI shell | Shell zones and top-level controls | REVIEWED - EXISTING FINDING COVERS IT | Main | Runtime shell | Settings/workspace actions | Medium | AppShell tests | RA-020 | Token debt in topbar covered. |
| `js/ui/popupManager.js`, `popupPosition.js`, confirm/popup helpers | Popup system | Overlay lifecycle/positioning | REVIEWED - NO MATERIAL FINDING | Main, reviewer 3 | Runtime overlay owner | No durable write | High | Popup lifecycle tests | none | Shared lifecycle looked coherent. |
| `js/ui/commandPalette.js`, search/tags/aliases/cardType | UI controls | Command palette and metadata controls | REVIEWED - FINDING | Main, reviewer 3 | Current page metadata | Metadata save | Medium | Browser UI tests | RA-001B, RA-027, RA-030 | Card type custom select is a new finding. |
| `js/ui/worldPackageManager.js` | World Package UI | Import/export UI manager | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 2 | Package preview/runtime UI | Import/export services | High | World package tests | RA-019 | God-file note not escalated. |
| `js/worldPackage/*.js` | World Package model/import/storage | Package data and import service | REVIEWED - NO MATERIAL FINDING | Main, reviewers 1/2 | Package data | Requires backup manifest | High | World package tests | none | No new import P0. |
| `js/ruleTree/*.js` | Rule Tree | Rule tree model/render/events/storage | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 2 | Rule tree JSON/package files | Rule package storage | Medium | Rule tree tests | RA-026 | Save route owner covered by RA-026. |
| `js/rulesWorkspace/*.js`, `js/rules/*.js` | Rules workspace | Internal rules and rule provider | REVIEWED - FINDING | Main, reviewer 2 | Internal rules assets/data | Mostly read-only | Medium | Rule provider tests | RA-029 | Small UI side effect. |
| `js/presentation/*.js` | Presentation | Player/presentation rendering | REVIEWED - NO MATERIAL FINDING | Main | Presentation runtime | Reads map payload | Medium | Presentation browser tests | none | No new persistent owner issue. |
| `js/performance/*.js` | Performance | Metrics/perf helpers | REVIEWED - NO MATERIAL FINDING | Main | Runtime metrics | No durable write | Low | Performance smoke | none | No material issue. |
| `js/wiki/knowledgeGraphPage.js` | Knowledge Graph coordinator | Graph page orchestration | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 2 | Graph read/runtime | Relationship writes | High | Graph browser tests | RA-007, RA-008, RA-018 | Coordinator/god-file remains. |
| `js/wiki/knowledgeGraph*.js`, graph overlays/menu modules | Knowledge Graph modules | Graph split owners | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 3 | Relationship/page model | Graph command bridge | High | Graph/browser visual tests | RA-010, RA-018 | CSS semantics covered. |
| `js/wiki/backlinks/references/wikiLink*.js` | Wiki links/backlinks | Link lookup and previews | REVIEWED - NO MATERIAL FINDING | Main | PageRepository/pages | Editor save | Medium | Search/wiki tests | none | No new finding. |
| `styles/design-tokens.css`, `variables.css`, base/layout/ui CSS | Base CSS/tokens | Shared design system | REVIEWED - FINDING | Main, reviewer 3 | N/A | N/A | Medium | UI polish audit | RA-020, RA-030 | Token/layer debt. |
| `styles/document.css`, `editor.css`, block CSS | Editor/card/block CSS | Editor and card layout | REVIEWED - NO MATERIAL FINDING | Main | N/A | N/A | Medium | Property/visual tests | none | Recent polish acceptable. |
| `styles/campaign-map*.css` | Campaign Map CSS | Map stage/toolbars/popups | REVIEWED - EXISTING FINDING COVERS IT | Main | N/A | N/A | Medium | Map visual tests | RA-011 | No new issue. |
| `styles/task-tracker.css` | Task Tracker CSS | Board styling | REVIEWED - NO MATERIAL FINDING | Main | N/A | N/A | Medium | Task tracker tests | none | 8.18.3 structural hacks remain removed. |
| `styles/knowledge-graph*.css` | Knowledge Graph CSS | Graph canvas/inspector/overlay styles | REVIEWED - EXISTING FINDING COVERS IT | Main | N/A | N/A | Medium | Graph visual tests | RA-010 | `font-size: 0` already recorded. |
| `styles/popup*.css`, `world-package.css`, `card-type.css` | Popup/control CSS | Overlay and custom control styles | REVIEWED - FINDING | Main, reviewer 3 | N/A | N/A | Medium | Popup/visual tests | RA-019, RA-027, RA-030 | Card type z-index added. |
| `styles/app-topbar.css`, settings CSS | Settings/topbar CSS | Settings and top shell styles | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 3 | N/A | N/A | Medium | UI polish audit | RA-020, RA-030 | Undefined tokens confirmed. |
| `styles/rule-tree.css`, sidebar/tree CSS | Tree/rules/sidebar CSS | Tree and rule surfaces | REVIEWED - EXISTING FINDING COVERS IT | Main | N/A | N/A | Medium | Tree/rule tests | RA-022 | UI behavior issue is JS/focus, not pure CSS. |
| `src-tauri/src/main.rs`, `src-tauri/build.rs` | Rust desktop | Native filesystem commands | REVIEWED - NO MATERIAL FINDING | Main, reviewer 1 | Workspace root | Atomic writes/remove commands | High | Desktop/storage tests | none | No workspace escape confirmed. |
| `tools/run_checks.mjs`, docs/audit/encoding/safe commit tools | Tools validation | Verify/docs/source guards | REVIEWED - NO MATERIAL FINDING | Main | N/A | Writes reports/docs only | Medium | Tool commands | none | Docs-only validation used. |
| `tools/run_browser_smoke.mjs`, desktop gate/clickthrough tools | Browser/desktop gates | Smoke and release gates | REVIEWED - PARTIAL FINDING CLOSED | Main | N/A | Writes reports | High | Desktop/browser smoke | RA-003, RA-004 | RA-003 and RA-004 are closed; browser smoke policy debt remains under RA-014. |
| `tools/*diagnostics*`, perf/probe/manual docs tools | Diagnostics/perf/manual tools | Workspace diagnostics/perf/report generation | REVIEWED - EXISTING FINDING COVERS IT | Main | Workspace snapshot | Temporary probe writes | Medium | Diagnostics tests | RA-004, RA-013 | No real user workspace mutated. |
| `tests/*.test.mjs` storage/repository/page command | Unit tests | Storage and command coverage | REVIEWED - EXISTING FINDING COVERS IT | Main | N/A | N/A | Medium | 59 files reviewed | RA-001, RA-002, RA-025 | Missing failure-path tests inform backlog. |
| `tests/*.test.mjs` schema/safe html/world/rules/characters/properties | Unit tests | Domain model/sanitizer coverage | REVIEWED - NO MATERIAL FINDING | Main | N/A | N/A | Medium | 59 files reviewed | none | No `.only`/`.skip`. |
| `tests/*.test.mjs` task tracker/graph/ui/design | Unit tests | UI/domain regressions | REVIEWED - EXISTING FINDING COVERS IT | Main | N/A | N/A | Medium | 59 files reviewed | RA-010, RA-027 | Some control gaps are browser-level. |
| `tests/browser/*app-shell*`, tree specs | Browser tests | Shell/tree/accessibility/DnD | REVIEWED - PARTIAL FINDING CLOSED | Main, reviewer 3 | N/A | N/A | High | 26 specs reviewed | RA-022, RA-028 | RA-022 keyboard action gap is now covered; RA-028 keyboard reorder decision remains. |
| `tests/browser/campaign-map*.spec.mjs` | Browser tests | Campaign Map UI/data/presentation | REVIEWED - EXISTING FINDING COVERS IT | Main | N/A | N/A | High | 26 specs reviewed | RA-006, RA-011 | No new map finding. |
| `tests/browser/task-tracker.spec.mjs` | Browser tests | Task Tracker workflows | REVIEWED - FINDING | Main, reviewer 3 | N/A | N/A | High | 26 specs reviewed | RA-006, RA-028 | Pointer DnD covered, keyboard reorder not. |
| `tests/browser/knowledge-graph`, popup, property, tables specs | Browser tests | Graph/popup/properties/tables | REVIEWED - PARTIAL FINDING CLOSED | Main | N/A | N/A | High | 26 specs reviewed | RA-017, RA-018, RA-019 | RA-017 is closed by `RCB-017`; RA-018 is closed by `RCB-018`; RA-019 remains an open overlay finding. |
| `tests/browser/visual-regression.spec.mjs`, security/perf/assets specs | Browser tests | Visual evidence and high-risk smoke | REVIEWED - EXISTING FINDING COVERS IT | Main, reviewer 3 | N/A | N/A | Medium | 26 specs reviewed | RA-014 | Visual suite is evidence smoke, not pixel baseline. |
| `docs/00-product`, `docs/01-delivery` active docs | Active docs | Dashboard, plan, work log, backlog | REVIEWED - FINDING | Main | Planning source of truth | Docs only | Medium | Docs index | RA-015 | Updated for 9.1 status. |
| `docs/02-architecture` active contracts | Active docs | Architecture contracts and audits | REVIEWED - FINDING | Main | Contract source of truth | Docs only | Medium | Docs index/link check | RA-001-RA-030 | Coverage expanded here. |
| `docs/03-testing`, `docs/04-user-release`, `release` | Testing/release docs | Smoke, release handoff | REVIEWED - EXISTING FINDING COVERS IT | Main | Release evidence | Docs only | Medium | Docs index | RA-003, RA-004, RA-014 | No release handoff rewrite beyond status. |
| `docs/archive/*.md`, historical roots | Archive/history | Historical planning/evidence | HISTORICAL | Main | Not active truth | No write | Low | Docs index | RA-012 | Counted as historical, not unknown. |
| `.agents/skills`, `AGENTS.md`, root config/assets/release metadata | Agent/config/assets | Workflow, config and static assets | REVIEWED - NO MATERIAL FINDING | Main | Workflow/config truth | Minimal | Low | Skill/docs validation | none | No unknown tracked first-party files. |

### Source-Of-Truth Map

| DOMAIN | DURABLE SOURCE OF TRUTH | RUNTIME SOURCE | WRITE OWNER | READ OWNER | SERIALIZER | UNDO/ROLLBACK OWNER | KNOWN BYPASSES | FINDING |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pages | `pages/*.md` PageRecord content | `state.pages` plus PageRepository index | Page command/page storage | PageRepository/PageIndex | PageRecord markdown parser/builder | PageCommandService/page storage | Direct feature writes | RA-001, RA-006 |
| Page metadata | PageRecord frontmatter | page fields on runtime objects | Autosave/special save/metadata controls | PageIndex/Tree/feature lookups | PageRecord | PageCommandService snapshots | Mutation before snapshot | RA-001B |
| Tree | page `parent`/`order` metadata | Tree render over `state.pages` | pageStorage tree position writes | Tree/PageRepository | PageRecord metadata | pageStorage tree move rollback | Batch durable rollback gap | RA-002 |
| Character | Properties/legacy compatible page content | CharacterModel snapshots | Properties/editor save | CharacterModel/rule providers | Properties/CharacterModel | Editor page save | Legacy fallback is intentional | none |
| Properties | Properties block data in page HTML | PropertiesModel/layout runtime | Properties block/editor save | PropertiesModel | properties DOM/model serializers | Editor page save/history | Popup owns layout orchestration | RA-009 |
| Campaign Map | Map page content/data HTML | CampaignMap model/store/DOM | Map special save and helpers | Map serializers/model | campaignMapDataSerializer | Page command for special save | Direct token/map writes | RA-006, RA-011 |
| Tokens | Map page token data and linked card pages | Map token DOM/store | Map token actions/save | Map store/Character bridge | Map serializer | Map save/page command mixed | Direct token writes | RA-006 |
| Initiative | Map initiative data | Initiative model/popup runtime | Initiative popup/model save through map | Initiative model | Map/initiative serializer | Map save | Helper duplication | RA-011 |
| Task Tracker | Task tracker page script/data | TaskTracker model/DOM | Special save/page actions | TaskTracker model | TaskTracker serializer | Page command/direct write mixed | Page action direct write | RA-006 |
| Knowledge Graph | Page relationships metadata/content | Graph model/canvas state | Graph command bridge/page writes | Graph modules/PageRepository | Graph relationship/page serializers | Graph command bridge/history | Direct state lookups/coordinator | RA-007, RA-008, RA-018 |
| Relationships | Page relationship metadata | PageRecord/graph runtime | Graph command bridge | PageRepository/Graph | PageRecord relationship fields | Page command/graph command | Coordinator direct paths | RA-008 |
| Rules | Internal rules assets and rule pages | Rule provider/runtime pages | Mostly read-only/provider import | RuleTreeProvider | Rule provider/model | N/A or rule tree storage | Internal rule UI side effect | RA-029 |
| Rule Packages | `rule-packages/*.json` | Rule package storage/model | Rule package storage/import | Rule tree storage/provider | Rule package storage/model | Import rollback best effort | Package storage duplication | RA-011, RA-029 |
| World Packages | package JSON/assets | WorldPackage model/manager preview | Import/export services | WorldPackage manager/model | WorldPackage model/import service | Import service rollback | UI manager size/modality | RA-019 |
| Assets | `assets/*` workspace files | Asset adapters/render cache | Asset storage/adapters/imports | Asset storage/adapters | Asset references | Backup/import cleanup | Render cache not workspace-scoped | RA-024 |
| Settings | local app settings/localStorage | Theme/settings UI runtime | Settings/topbar UI | Settings/topbar UI | local settings values | none | Token/layer drift | RA-020, RA-030 |
| Presentation | Map page data and presentation payload | Presentation window/runtime | Map save/presentation sync | Presentation renderer | Presentation payload | Map save | none confirmed | none |
| Editor History | In-memory editor snapshots | editorHistory stack | Editor history module | Editor module | HTML snapshot serializer | Editor history restore | Stale async render adjacent | RA-016 |

### Write-Path Map

| WRITE PATH | ENTRY POINT | COMMAND OWNER | LOW-LEVEL WRITER | REVISION/CHECK | ROLLBACK | REPOSITORY NOTIFICATION | KNOWN BYPASS | RISK |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Normal editor save | autosave/input or explicit save | `persistPageContentCommand` | `writePageContent` | write revision | PageCommandService rollback | `notifyPageUpdated` | pending autosave timer | RA-001, RA-021 |
| Metadata edit | tags/aliases/card type/title UI | autosave/page command | `writePageContent` | duplicate-title validation | PageCommandService snapshot | `notifyPageUpdated` | mutation before snapshot | RA-001B, RA-027 |
| Page rename | title edit/autosave | PageCommandService | `writePageContent` | duplicate-title validation | rename undo entry | `notifyPageUpdated` | duplicate reject leaves runtime mutation | RA-001B |
| Tree reorder | tree DnD/context reorder | pageStorage tree position | `writePageContent` | backup/journal for parent moves | memory rollback only in batch failure | `notifyPageMoved` | no durable restore of earlier writes | RA-002 |
| Task tracker save | special save/page action | Special save or direct feature action | `writePageContent` | mixed | mixed | command or direct notify | page actions direct write | RA-006 |
| Campaign Map save | special save/map actions | Special save or map helpers | `writePageContent` | mixed | mixed | command or direct notify | token/map helper writes | RA-006 |
| Graph relation mutation | graph command bridge/actions | Graph command bridge/page command adjacent | `writePageContent` | command bridge checks | graph restore/history | `notifyPageUpdated` | graph coordinator direct reads | RA-007, RA-008 |
| World Package import | manager import apply | `executePageCommand` in import service | storage adapter writes | backup manifest required | best-effort file cleanup | `notifyPageCreated` | large UI manager orchestration | RA-019 |
| Rule Package import | rule tree/world package import | package storage/import service | storage adapter writes | id/path normalization | import cleanup | rule tree refresh | package helper duplication | RA-011 |
| Backup | app topbar/backup service | backup service | storage adapter writes | manifest/complete marker | incomplete cleanup | none | large workspace warning semantics | RA-004 |
| Restore | app topbar/backup service | backup service | storage adapter writes | manifest exists | no pre-restore backup found | reload after restore | contract mismatch | RA-005 |
| Asset write/delete | image upload, package import, cleanup | asset storage/adapters | storage adapter/Tauri | path normalization | import cleanup best effort | asset refs via page reload | cache not workspace-scoped | RA-024 |

### Areas Reviewed With No Material Findings

- Safe HTML sink chain: sampled `innerHTML`/`insertAdjacentHTML` paths and sanitizer tests; no direct unsafe user-input-to-persistent-HTML bypass was confirmed.
- Tauri path boundary: `src-tauri/src/main.rs` rejects `..`, absolute/root paths and workspace root deletion; no workspace escape was confirmed.
- World Package import safety: import requires a completed backup manifest and has conflict strategy handling; no destructive import P0 was confirmed.
- PageIndex basics: rebuild/query and duplicate map-set behavior looked coherent aside from confirmed update/metadata findings.
- Popup lifecycle: `popupManager` has Escape/outside-click/focus behavior covered by browser tests; no new generic popup lifecycle finding was confirmed.
- CharacterModel ownership: Properties-first with legacy fallback is documented and tested; no duplicate durable source of truth was confirmed.
- Tests: no `.only` or `.skip` markers were found in unit/browser tests; long waits are present but did not become a new material finding.
- Current archive policy: `docs/archive/` is historical tracked truth; ignored `legacy/`/`legasy/` are local-only and not active product truth.

### Recent UI Polish Verdict

Verdict: `ACCEPTABLE TEMPORARY DEBT`.

Reasoning:

- Entity header restructuring and nav/tag reparenting are runtime-only compatibility normalization around existing card templates. The browser test `card-header-aligns-navigation-tags-identity-and-limits-short-description` checks the toolbar, tags, nav slot and image/meta alignment.
- The short description limit has a clear local owner in `blockRuntimeControls.js`, uses `beforeinput` plus normalization, adds an accessible label and is covered at the 250-character boundary.
- List kind normalization fixes stale DOM/classes when changing entity kind and is covered by a browser regression that asserts the chip class and content shape change.
- WeakSet binding is used to avoid duplicate event listeners on repeated runtime control passes.

This should not block the audit closure, but future cleanup should avoid growing this into a second editor architecture layer. If the header/list compatibility code grows again, extract it behind a small card runtime owner.

### Subsystem Spot Checks

| Subsystem | Result |
| --- | --- |
| Campaign Map | Aggregation did not hide a new P1. Existing direct write/helper debt remains RA-006/RA-011. |
| Task Tracker | Structural icon-only cleanup remains good; direct page actions and keyboard reorder limitation remain RA-006/RA-028. |
| Tauri | No workspace escape/root delete P0 found. |
| Rules | New small module-boundary leak RA-029. |
| Rule Packages | No new data-safety finding; helper duplication remains low severity. |
| World Packages | Import safety looked intentional; overlay/modality and manager size remain existing cleanup concerns. |
| AppShell | No new shell product finding; topbar token debt confirmed. |
| Tree | RA-022 keyboard action-menu finding is closed; pointer DnD remains functional. |
| Presentation | No new material finding. |
| Assets | New workspace-scoped render cache finding RA-024. |

### Completeness Verdict

The `0.0.1.9.0` audit was useful but not complete enough to proceed as-is. The new P1 autosave and Tree accessibility findings changed the cleanup order before `0.0.1.10.0` started. RA-021 is now closed by `RCB-021`; the remaining P1 cleanup order continues from the repository/data-consistency slices.

`0.0.1.10.0` has owner approval for one cleanup leaf at a time. No next RCB leaf should start without an explicit task.
