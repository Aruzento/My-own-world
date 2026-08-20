---
summary: "Product dashboard with current project focus and links."
read_when:
  - "Before product planning"
  - "When changing product direction"
owner_zone: "product"
---
# Product Dashboard

Updated: 2026-08-20

## Current Product

MyOwnWorld is a local-first worldbuilding OS for tabletop campaigns. It combines cards, campaign maps, presentation mode, task trackers, wiki links, assets, backups, desktop packaging and rule/character foundations in one workspace format.

The repository cleanup phase is closed. The active phase is version-1 stabilization: make the current app fast, safe, understandable and reliable on real large workspaces before adding another layer of features.

## Current Focus

Active plan: `docs/01-delivery/PROJECT_PLAN.md`.

Immediate direction:

1. Use `docs/01-delivery/PROJECT_PLAN.md` as the only active implementation roadmap.
2. Treat `0.0.1.10.0` cleanup as closed after the corrective final gate.
3. Closed cleanup leaves so far: `RCB-021`, `RCB-001`, `RCB-001B`, `RCB-002`, `RCB-003`, `RCB-022`, `RCB-004`, `RCB-005`, `RCB-016`, `RCB-023`, `RCB-024`, `RCB-025`, `RCB-006A`, `RCB-006B`, `RCB-006C`, `RCB-006D`, `RCB-007A`, `RCB-007B`, `RCB-007C`, `RCB-007D`, `RCB-026`, `RCB-027`, `RCB-017`, `RCB-018`, `RCB-019`, `RCB-028`, `RCB-008`, `RCB-009`, `RCB-010`, `RCB-020`, `RCB-011`, `RCB-012`, `RCB-013`, `RCB-014`, `RCB-015`, `RCB-029` and `RCB-030`. `RCB-006` and `RCB-007` are closed.
4. Work in active `0.0.1.11.0` Existing P1 Stabilization one leaf at a time.
5. `0.0.1.11.5` `BUG-003` Desktop Real-App Verification is `VERIFIED / CLOSED`; next leaf: `0.0.1.11.6` Map Presentation.
6. Keep current design accepted for this stage; final visual polish returns later when mature workflows exist.
7. Keep project documentation readable for the product owner, not only for Codex.

Recently closed:

- `0.0.1.11.1` Workspace Switch Access: the topbar now keeps a permanent compact `Открыть папку` action while a workspace is active; cancel keeps the current workspace/page; successful A -> B switch reloads B, clears the old editor view and keeps pending A edits/assets scoped to A.
- `0.0.1.11.2` `BI-010` Campaign Map Toolbar: the historical disappearing-toolbar report was not reproduced on current code across the defined lifecycle matrix; the new browser evidence guard verifies visible, hit-testable scene/tool toolbar regions, working grid popup, no duplicate toolbar and no stale previous page after card/task/rule/tree/presentation/workspace transitions.
- `0.0.1.11.3` `BI-011` Creature Skills Encoding: Campaign Map creature token skill action/submenu now renders clean Russian `Навыки`, representative skill labels such as `Скрытность`, and no mojibake markers; this also closes `BI-022` for the current human-facing P1 regression bundle.
- `0.0.1.11.4` `BUG-001` Large Workspace UX: real workspace smoke on `X:\ДНД\Мастер\По кампаниям\База` is acceptable for current UX. Native click-through now covers workspace restore, representative card open, Settings diagnostics, tree scroll/search, heavy Campaign Map open and presentation; safe move/delete timing was checked on a temporary copy.
- `0.0.1.11.5` `BUG-003` Desktop Real-App Verification: the current release/native desktop executable passed the real-app click-through on `X:\ДНД\Мастер\По кампаниям\База`, including workspace restore, tree render, image card render, Settings diagnostics, Campaign Map background render and presentation sync. Desktop gate and large-workspace smoke are green; workspace schema/size warnings are advisory, not crashes.
- `0.0.1.0.4` runtime UI text security coverage.
- `0.0.1.0.5` desktop filesystem boundary hardening.
- `0.0.1.2.2` native desktop click-through on the real large GM workspace `X:\ДНД\Мастер\По кампаниям\База`.
- `0.0.1.4.1` Properties block constructor: live drag preview, collision pushdown and visual grid-step handling.
- `0.0.1.4.2` standard character Properties layout: compact top metrics, one-row abilities and readable skill groups for new character/creature Properties blocks.
- `0.0.1.4.3` visible DnD calculations in Properties: ability modifiers, proficiency bonus, initiative, skills/expertise, armor-based AC and manual overrides.
- `0.0.1.4.4` armor selection in Properties: the `Armor` field now lists only item cards whose own Properties mark them as armor.
- `0.0.1.4.5` Properties/CharacterModel map connection: map tokens now receive HP, AC, speed, initiative and effect/status summaries from the model snapshot.
- `0.0.1.4.6` simplified block creation: `Add block` now stays at text, list, table, image and properties, while legacy specialized blocks remain compatibility-only.
- `0.0.1.5.1` Knowledge Graph real canvas foundation: visual nodes and edges, zoom/pan/fit, selected node details and one-click page open from the node.
- `0.0.1.5.2` readable Knowledge Graph layout: the first graph screen became a canvas workbench with domain/hub layouts, compact controls and fit/zoom/pan instead of noisy statistics cards.
- `0.0.1.5.3` Knowledge Graph filters and direct canvas interaction: filter by type, relationship, search and orphan pages; right-click a node for actions; drag nodes directly on the canvas.
- `0.0.1.5.4` Knowledge Graph canvas usability polish: standard root-plus-two-level view, no tabs/lists around the canvas, no fixed background domain labels, dynamic canvas expansion near edges, non-overlapping first layout and cleaner controls.
- `0.0.1.5.4.1`-`0.0.1.5.4.3` Knowledge Graph persistence and operations polish: pinned positions, canvas relationship creation, undo/redo, context actions and relationship edit/delete.
- `0.0.1.5.5` Knowledge Graph performance gate: large-workspace graph metrics now fail if the graph build/render slice drifts over budget.
- `0.0.1.5.6` Knowledge Graph regression coverage: browser tests now cover graph canvas filters, edges and orphan paths.
- `0.0.1.6.1` Safe HTML boundary: persistent tags, attributes, project classes/data fields and dangerous URLs are now allowlisted and regression-tested.
- `0.0.1.6.2` Paste sanitization: editor and table paste now route through the clipboard sanitizer, HTML-only clipboard content becomes plain text, and rich image/file-only paste is blocked from direct persistent DOM insertion.
- `0.0.1.6.3` Schema recovery UI: workspace diagnostics now shows grouped human-readable schema issues, separates legacy warnings from unsafe errors, and can run the persisted broken-parent repair only after a backup gate.
- `0.0.1.6.4` Recovery fallback tests: malformed pages, partial data, missing asset paths, invalid workspace shape and backup-failure repair paths now have unit/browser regression coverage.
- `0.0.1.7.1`-`0.0.1.7.2` manual and encoding pass: `docs/MY_OWN_WORLD_FULL_MANUAL.docx` was regenerated, verified as a valid docx/zip, and `npm run check:encoding` stayed green without new guard patterns.
- `0.0.1.7.3` GitHub Actions verify and browser smoke maintenance: CI now has least-privilege permissions, concurrency cancellation, bounded runtime, short-lived failure artifacts, and the local browser smoke runner forwards Playwright filters/file arguments correctly.
- `0.0.1.7.4`-`0.0.1.7.5` release handoff and archive pass: `release/latest` now starts with the current stabilization summary, tester route, known risks and verification snapshot; old plans stay documented as archive-only history.
- `0.0.1.8.1` UI/CSS inventory report: the current UI/CSS file tree, duplicate control families, popup/icon/color approaches, reusable UI pieces, migration risks and redesign migration map are documented in `docs/02-architecture/ui/UI_CSS_INVENTORY_REPORT.md`.
- `0.0.1.8.2` Design system contract: AppShell zones, semantic token families, shared primitives, overlays, visual states, motion/effects/iconography rules, system ownership boundaries and UI migration gates are now documented in `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`.
- `0.0.1.8.3` Theme foundation proof of concept: semantic tokens, theme manager/provider, density aliases, reduced-motion motion aliases and the SVG icon helper foundation now exist in runtime without migrating the whole UI.
- `0.0.1.8.4` Component catalogue proof of concept: Tools historically exposed `Компоненты` as a visible shared Button/Input/Panel/Popover reference; `0.0.1.8.17` later moved it behind a dev/test flag so normal Tools stays product-focused.
- `0.0.1.8.5` AppShell foundation: the empty workspace start screen now uses a clear tokenized action card while the existing sidebar/editor/statusbar remain active; internal workspace/inspector/diagnostics demo zones were removed after review.
- `0.0.1.8.6` Migration Phase 0 audit baselines: `UI_MIGRATION_BASELINES.md` now records UI/CSS/icon/popup/screenshot baselines and the visual smoke covers shell, tree, editor, Properties, map, graph, task tracker and shared popover surfaces.
- `0.0.1.8.7` Migration Phase 1 foundations: the current AppShell, topbar, sidebar, editor shell, statusbar and empty-workbench start surface now share semantic `--mow-shell-*` tokens for layout, density, surface, divider, elevation and control states, with a browser guard for the foundation marker.
- `0.0.1.8.8` Migration Phase 2 primitives: shared IconButton, Select, Checkbox, SegmentedControl, Toolbar and Separator primitives now exist beside Button/Input/Panel/Popover; Tools uses shared Button styling and popupManager has the first overlay contract markers for app topbar/component catalogue popovers.
- `0.0.1.8.9` Migration Phase 3 overlays: `popupManager` now owns the shared overlay lifecycle for modal focus/focus return, dropdown/context-menu keyboard behavior, tooltip/toast markers, editor feature popups, campaign map generic/token popups, item picker, onboarding help and Knowledge Graph node/connect overlays.
- `0.0.1.8.10` Migration Phase 4 AppShell: the global shell now has a real navigation rail, a primary world-tree sidebar, tree-panel show/hide, sidebar keyboard resize and updated AppShell browser coverage.
- `0.0.1.8.10.2` AppShell rail simplification: content-type entries (`Карточки`, `Карты`, `Задачи`, `Правила`, `Граф связей`) were removed from the left rail because they duplicate pages already visible in `Дерево`; follow-up `0.0.1.8.10.4` keeps `Дерево` as the tree-panel toggle until real global tools are added.
- `0.0.1.8.10.3` AppShell Explorer actions correction: workspace opening moved into the no-workspace tree area, and root-level creation moved to the `Корень` row with separate `+` and folder actions.
- `0.0.1.8.10.4` AppShell rail/profile correction: the tree sidebar no longer repeats `MyWorld` / `Дерево мира`, the user/profile bar moved into the left rail, and the `Дерево` rail button now shows/hides the tree sidebar while the editor expands.
- `0.0.1.8.11.1` AppShell right-panel reserve and core tree/search start: the page-info inspector was removed, the right-panel slot is hidden until a future real workflow owns it, and tree search now has a Phase 5 core-content marker plus local search icon.
- `0.0.1.8.11.2` Core editor blocks: block drag-and-drop is restored with pointer preview/drop placeholder behavior, and the `Add block` picker now uses local sprite icons, grouped readable copy, focus states and visual smoke coverage.
- `0.0.1.8.11.3` Card editor surface polish: header/runtime controls, card type/tags/aliases/image actions and floating toolbar placement now follow shared tokens, local sprite icons and browser visual guards.
- `0.0.1.8.11.4` Properties field-state polish: Properties fields now expose readable metric/ability/computed/relation/custom states, local sprite field badges, tokenized field surfaces and corrected character skill/death-save spacing.
- `0.0.1.8.11.5` Card block visual language: text, list, table, image and properties blocks now share one readable style with runtime-only type badges, thin colored markers and lighter Properties fields without heavy background fill.
- `0.0.1.8.11.6` Card selects and template picker: native dropdowns inside card blocks now use the same dark shared select style, and saved page templates are reachable from the create menu through a readable `Из шаблона` picker with local icons and human metadata.
- `0.0.1.8.11.7` Command palette and deep search: the left rail now has a real `Поиск и команды` tool, `Ctrl+K` opens the shared popupManager dialog, deep PageRepository-backed page results show paths/matched fields/excerpts, and core actions run through existing app buttons instead of a parallel command system.
- `0.0.1.8.12.1` Campaign map toolbar foundation: the map toolbar now groups creation, scene/view, tools and live-session actions, uses local sprite icons/shared tokens, exposes toolbar/group/accessibility metadata and keeps active grid/pan/drawing/fog states readable.
- `0.0.1.8.12.2` Campaign map popup surface: add/picker, grid, drawing, fog, shapes, layers, initiative and music popups now share one map popup frame with local icons, readable section labels, per-popup aria labels, migration markers and preserved legacy action selectors.
- `0.0.1.8.12.3` Campaign map selection inspector: selecting a token or shape now opens a compact runtime dock with identity, position, visibility, key token stats and safe contextual actions, including `Убрать с карты` without deleting the card.
- `0.0.1.8.12.4` Campaign map layer/object dock: the map stage now shows a compact runtime summary of layers, token/object/shape counts, hidden objects and quick layer visibility toggles, with a direct path into the existing Layers popup.
- `0.0.1.8.12.5` Campaign map scene-state inspector: the map stage now shows background, grid and fog readiness with direct actions into the existing map-image, Grid and Fog flows.
- `0.0.1.8.12.6` Campaign map advanced contextual actions: multi-selected tokens and shapes now show visible/hidden counters and can be hidden from or shown to players as one group through the existing map store.
- `0.0.1.8.12.7` Campaign map post-review correction: the default map screen now has a thin icon-only toolbar with hover/focus tooltips, pan/`Рука` lives with tools, and duplicate scene/layer stage panels are no longer created.
- `0.0.1.8.12.8` Campaign map property inspector correction: left-click selection now opens a right-side editable Inspector for token/shape properties, shape rotation is persisted, the title/toolbar stay compact, and right-click opens the custom object action popup instead of the browser context menu.
- `0.0.1.8.12.9` Campaign map graphic-editor toolbar correction: canvas tools now live in a left vertical rail, scene/session actions stay in the compact top bar, all buttons remain icon-only with tooltips, and future tools have real section markers instead of fake placeholder panels.
- `0.0.1.8.12.10` Campaign map toolbar full-size correction: the split top bar and left rail no longer show internal scrollbars, labels are body-level floating tooltips instead of clipped pseudo-labels, and both zones now have real expansion space for future map tools.
- `0.0.1.8.13.1` Knowledge Graph visible-slice clarity: the graph now says `показано X из Y`, shows visible/total/hidden counters, explains hidden-by-filter/slice/limit states, and uses local sprite icons plus domain markers in toolbar and node cards.
- `0.0.1.8.13.2` Knowledge Graph edge states and inspector: selecting a graph node now highlights its visible relationships, mutes unrelated canvas content, and opens a compact workbench inspector with incoming/outgoing counts, relationship rows and `Открыть` / `Соседи` actions.
- `0.0.1.8.13.3` Knowledge Graph overlay cleanup: right-click node actions and connection creation now use dark editor-grade overlays with grouped icon actions, compact editable relationship rows, no clipped text and visual-regression coverage.
- `0.0.1.8.13.4` Knowledge Graph laconic correction: graph status, filters, selected-node inspector and node menu now show less permanent text/numbers; details are available through titles, opening pages or expanding `Связи`.
- `0.0.1.8.13.5` Knowledge Graph CSS split foundation: graph styles are now split into base canvas, slice state, inspector and overlay/menu owner files instead of one monolithic CSS file.
- `0.0.1.8.13.6` Knowledge Graph inspector JS split foundation: selected-node inspector rendering/update logic, graph node icon mapping and relationship labels now live in dedicated JS owner modules instead of the graph page monolith.
- `0.0.1.8.13.7` Knowledge Graph canvas controls JS split foundation: filterbar, view presets, slice-meter helpers, hidden-reason labels and layout-button HTML now live in a dedicated JS owner module.
- `0.0.1.8.13.8` Knowledge Graph canvas renderer JS split foundation: visible-node fallback, empty state, SVG edges, edge labels and node-card HTML now live in a dedicated JS owner module.
- `0.0.1.8.13.9` Knowledge Graph canvas actions JS split foundation: runtime filters, layout/filter/slice actions and zoom/fit toolbar actions now live in a dedicated JS owner module.
- `0.0.1.8.13.10` Knowledge Graph canvas overlay actions JS split foundation: connect-state reads, node/connect popup controllers, node-menu show/hide, node-menu actions and connect-popup actions now live in a dedicated JS owner module.
- `0.0.1.8.13.11` Knowledge Graph Phase 7 closure: relationship/context-menu HTML, graph view-state helpers and manual relationship persistence now have dedicated owners, and relationship writes use the command lifecycle/write queue instead of direct graph-page storage writes.
- `0.0.1.8.14.1` secondary screens / task tracker UI: the task tracker now uses a compact workbench toolbar, local sprite icon actions, column/task/checklist counters, checklist progress bars and tokenized board/column/card surfaces while keeping the same data model and save path.
- `0.0.1.8.14.2` secondary screens / Settings maintenance UI: task tracker icon-button clicks work again, and the topbar Settings popup now presents appearance, backup, asset health and workspace diagnostics as one coherent maintenance panel with section, health, backup, restore, asset and danger markers.
- `0.0.1.8.14.3` secondary screens / Help and Support UI: Tools help routes now open a single Help/Support/Release guide with compact navigation, status chips, release-check cards, support diagnostics cards and an explicit planned import/export UI marker.
- `0.0.1.8.14.4` secondary screens / World Package manager MVP: Tools now opens `Пакеты мира` for branch/world export, package library preview/delete, JSON import preview and backup-gated page-only import with conflict/assets/rulePackage blockers and safe HTML sanitization before writing page records.
- `0.0.1.8.14.5` secondary screens / World Package conflict import UX: the World Package manager now offers conflict modes (`Стоп`, `Только новые`, `Копии`) so page-only imports can safely skip conflicts or create copied pages with unique ids/titles and rewired parent links after backup.
- `0.0.1.8.14.6` secondary screens / World Package rulePackage apply and asset preflight: embedded rulePackages now import into `rule-packages/` after backup without overwriting existing files, while required missing asset references block apply and optional missing references warn.
- `0.0.1.8.14.7` secondary screens / World Package asset payload copy: branch/world export now embeds readable asset payloads, and import writes valid base64 payload files after backup without overwriting existing workspace assets, rewriting imported page references when copied paths change.
- `0.0.1.8.15.1` polish and cleanup start: Settings appearance now has a real contrast theme preset, appearance controls expose pressed states for assistive tech, legacy focus gaps in editor/table/property/item/wiki fields are covered, large map/graph inspectors no longer use heavy blur, and `npm run verify` now includes `tools/audit_ui_polish.mjs`.
- `0.0.1.8.15.2` polish performance guard: a focused browser smoke now renders large synthetic tree, map, graph and task-tracker workloads and fails if migrated workbench surfaces miss DOM expectations or drift beyond soft runtime budgets.
- `0.0.1.8.15.3` visual theme-scale guard: the visual regression suite now captures dark compact, contrast large and contrast narrow workbench baselines with an open tree, hidden right-panel foundation and populated card editor.
- `0.0.1.8.15.4` dead CSS cleanup: retired campaign-map layer/object dock and scene-state inspector CSS/JS owners are removed from the active bundle, so the accepted map UI stays on the split toolbar, shared popups and right-side selected-object Inspector instead of quietly carrying old duplicate stage panels.
- `0.0.1.8.15.5` Phase 9 closure sync: plan, dashboard, work log, architecture docs, release notes, tester instructions, project file audit and generated manual are synchronized after the polish/performance/visual/dead-CSS pass.
- `0.0.1.8.16` design-system visual matrix: fixed viewport screenshots now cover empty shell/tree/error state, card editor Properties, campaign map popup plus Inspector, Knowledge Graph context overlay and empty task tracker board across dark/contrast themes and compact/large scale.
- `0.0.1.8.17` owner visual completion gate: the accepted design direction is now closed for this pass with quieter user-facing surfaces, dev-only component catalogue access, better tree semantics, map popups that avoid the Inspector, 1440x900/1280x720 owner evidence screenshots and a separate future mini-backlog.
- `0.0.1.8.18.7` plan-only future backlog expansion: NF-001...NF-017 were broken into owner/reuse/dependency/persistence/UI/test notes without implementing product functionality.
- `0.0.1.8.18.8` final verification gate: focused tests, full browser smoke, visual regression, `npm run verify`, real large-workspace desktop smoke and `npm run desktop:gate` were green, but closure needed an owner decision.
- `0.0.1.8.18` owner waiver closure: the owner accepted the current design for this product stage on 2026-08-10. The failed Visual Critic evidence remains future polish debt, not a blocker.
- `0.0.1.9.0` repository maintainability audit: audit-only evidence, coverage ledger and cleanup backlog were created. No cleanup or product functionality was implemented.
- `0.0.1.9.1` audit completeness verification: second pass found RA-021 through RA-030 and reordered the first cleanup slice.
- `0.0.1.10.1 / RCB-021` editor autosave lifecycle cleanup: quick edit-then-open-page now flushes pending autosave before navigation, survives reopening the original page and keeps rapid B/C transitions isolated.
- `0.0.1.10.2 / RCB-001` page rollback/repository consistency cleanup: failed page-content writes now rollback into one restored live page object shared by `state.pages`, `PageRepository` and `PageIndex`.
- `0.0.1.10.3 / RCB-001B` metadata index consistency cleanup: title, alias, tag and type changes no longer leave stale PageIndex lookup buckets when metadata was mutated before the command snapshot.
- `0.0.1.10.4 / RCB-002` durable tree batch rollback cleanup: failed multi-page tree moves now restore already-written page files, memory and indexes instead of leaving disk half-moved.
- `0.0.1.10.5 / RCB-003` native desktop smoke cleanup: unexpected `pageerror` and `console.error` now fail the click-through runner, warnings stay diagnostic, and the report explains unexpected and allowlisted runtime events.
- `0.0.1.10.6 / RCB-022` tree accessibility cleanup: a focused tree row can open the same page action menu through `Shift+F10` or the ContextMenu key, the menu keeps the existing lifecycle, and row action buttons do not add extra Tab stops.
- `0.0.1.10.7 / RCB-004` desktop gate truthfulness cleanup: `desktop:gate` now reports normal-workspace-only confidence, large-workspace validation, skipped large-workspace coverage and advisory diagnostics separately.
- `0.0.1.10.8 / RCB-005` pre-restore backup gate: restore now creates and verifies a fresh safety backup before destructive writes and stops before touching the workspace if that gate fails.
- `0.0.1.10.9 / RCB-016` async page-open generation guard: stale slow page opens can no longer publish DOM/status/map side effects after a newer page is current.
- `0.0.1.10.10 / RCB-023` workspace load generation guard: overlapping workspace loads now publish only from the latest load, so delayed scans cannot mix old pages into the active workspace.
- `0.0.1.10.11 / RCB-024` workspace-scoped asset render cache: renderable image URL cache now includes workspace identity, preventing same-path image URLs/placeholders from leaking across workspace switches.
- `0.0.1.10.12 / RCB-025` write queue durability semantics: `superseded-after-write` now depends on a newer write accepted into the queue, and successful queue settlement leaves the durable page file at the newest queued revision.
- `0.0.1.10.13 / RCB-006A` Task Tracker page action write boundary: direct Task Tracker page action writes now go through `PageCommandService`, with rollback coverage; page templates, item sets and Campaign Map writes were left as later sub-leaves.
- `0.0.1.10.32 / RCB-006B` Page template creation write boundary: create-from-template now builds the final PageRecord content up front and lets the existing create-page command own the durable write, repository/index notification and rollback; item sets and Campaign Map writes were left as later sub-leaves.
- `0.0.1.10.33 / RCB-006C` Item creation write boundary: item picker creation now builds the final item PageRecord up front and lets the existing create-page command own the durable write, repository/index notification and rollback; Campaign Map serializer/token helper writes were left for `RCB-006D`.
- `0.0.1.10.34 / RCB-006D` Campaign Map write boundary: linked-token HP page updates, closed-map token cleanup and duplicate-token page normalization now go through the existing page command lifecycle; `RCB-006` is closed with no inappropriate feature-level direct page-write bypass remaining from the original scope.
- `0.0.1.10.14 / RCB-007A` Item Sets page read boundary: item set picker/chip lookups now read through `PageRepository`; Knowledge Graph reads were left for `RCB-007B`.
- `0.0.1.10.35 / RCB-007B` Knowledge Graph page read boundary: graph page lookup/query paths now use `PageRepository` for graph model input, labels, relationship endpoints, editor choices, open/focus targets and relationship source lookup; World Package reads were left for `RCB-007C`.
- `0.0.1.10.36 / RCB-007C` World Package page read boundary: World Package export-all, branch traversal and import preview conflict checks now use the `PageRepository` read model; import mutation/snapshot rollback ownership remains in the World Package import service, and tree-adjacent reads remain pending.
- `0.0.1.10.37 / RCB-007D` Tree-adjacent page read boundary: tree move validation, DnD target resolution, context delete branch/fallback reads, reveal-in-tree ancestors, keyboard move page resolution and editor back navigation now resolve page lookup/query reads through `PageRepository`; `RCB-007` is closed.
- `0.0.1.10.38 / RCB-014` local debug artifact cleanup: the owner-approved ignored/untracked root `debug.log` Chromium/GPU diagnostic log was deleted once, and the follow-up owner decision now classifies the recreated exact root Chromium/GPU `debug.log` as allowed generated/local-only evidence instead of a project-file-audit blocker.
- `0.0.1.10.15 / RCB-026` Rule Tree save ownership: Rule Tree autosave now uses the same clean serializer contract as explicit special-save, navigation flush is covered, and special-save failures set an error state instead of leaving `saving`.
- `0.0.1.10.16 / RCB-027` Card Type control accessibility: the custom card type picker now behaves as a select-only combobox/listbox with keyboard selection, Escape cancel, focus return and shared popover layer ownership.
- `0.0.1.10.17`-`0.0.1.10.31` cleanup leaves closed table toolbar access, graph switcher semantics, World Package modal ownership, keyboard reorder, one graph coordinator seam, Properties layout ownership, graph icon-only CSS cleanup, token consistency, exact Campaign Map helper duplication, visual evidence-smoke policy, the lightweight docs status drift guard, historical root-doc placement, Rules Workspace module-boundary cleanup and CSS token/layer drift protection.
- `0.0.1.10.CORRECTIVE + FINAL` cleanup closure: Knowledge Graph document-level history/drag listeners now have explicit teardown, the exact root Chromium/GPU `debug.log` policy is narrow and root-only, full final gate passed with large-workspace confidence, and `0.0.1.10.0` is closed without starting product work.

Next owner action:

- Continue `0.0.1.11.0` one leaf at a time. Next leaf: `0.0.1.11.6` Map Presentation.

Closed `0.0.1.8.10` summary after user review, updated by `0.0.1.8.11.7`: AppShell navigation is now a real rail, but it does not duplicate world content types. The left rail exposes `Дерево` as the content navigation entry, `Поиск и команды` as a real global tool, and the profile as a global rail item; cards, maps, task trackers, rules and knowledge graphs stay inside the world tree and create flows. The `Дерево` rail button shows/hides the primary sidebar, the editor expands when the tree is hidden, and resize state remains controlled by the shell. The old page-info right inspector is removed; the right-panel slot remains hidden until a future workflow has a real purpose for it. The primary sidebar follows an Explorer model: if no workspace is open, the tree area shows `Открыть папку`; once a workspace exists, root-level creation lives on the `Корень` row through `+` and folder actions. Phase 5 core content is now usable: block movement works, the first-level Add block picker is cleaned up, the card editor header/toolbar layer is visually coherent, Properties have a readable field-state language, ordinary card blocks share one visual system, card dropdowns no longer look system-default, saved templates are reachable from create, and deep page search/commands are available from the rail or `Ctrl+K`. The separate diagnostics/history bottom panel is intentionally not added as an empty surface; diagnostics/recovery bottom-panel work remains in the secondary-screens phase.

## Readiness Model

Task status must use the readiness levels from `docs/01-delivery/DEFINITION_OF_DONE.md`:

- `Foundation` - useful base exists, but the human workflow is not complete.
- `MVP` - a basic user path exists and is testable.
- `Usable` - the owner can use it in normal work, with persistence and known risks handled.
- `Release-ready` - ready for handoff after automated and manual release checks.

This prevents "done" from meaning only "a model/helper was created".

## Key Risks

- Large real workspaces can still expose UI delay, especially in map-heavy sessions; the measurable and native `X:\ДНД\Мастер\По кампаниям\База` passes are currently green.
- Page lifecycle now has `PageCommandService`, `PageRecord`, trash/undo, PageIndex lifecycle, runtime write revision protection, workspace access diagnostics and grouped schema recovery UI; richer restore/link repair remains open.
- Desktop release/native verification is currently green, but native click-through, packaging smoke and large-workspace smoke must stay part of release handoff.
- Campaign map presentation, fog/drawing/layers and music require continued regression coverage.
- Properties and CharacterModel now have a usable card-to-map path and a simpler block creation entry, but the broader character workflow still needs release-ready polish.
- Knowledge Graph Phase 7 is now usable as a migrated canvas workbench with CSS/JS ownership split and command-lifecycle relationship persistence. The remaining risk is product direction, not hidden migration plumbing: `BI-026` should rethink what the graph helps a GM decide before new visible graph features.
- README, dashboard, bug inventory and plan must stay synchronized so the project remains understandable to the owner.

## Where To Read Next

- Plan: `docs/01-delivery/PROJECT_PLAN.md`
- Work log: `docs/01-delivery/WORK_LOG.md`
- Bug inventory: `docs/01-delivery/BUG_INVENTORY.md`
- Bugs and improvements backlog: `docs/01-delivery/BUGS_AND_IMPROVEMENTS_BACKLOG.md`
- Definition of Done: `docs/01-delivery/DEFINITION_OF_DONE.md`
- Agent rules: `AGENTS.md`
