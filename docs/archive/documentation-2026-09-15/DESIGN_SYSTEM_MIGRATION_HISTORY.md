---
summary: "Design system implementation and owner correction history"
read_when:
  - "When investigating the dated implementation evidence extracted from DESIGN_SYSTEM_CONTRACT.md"
owner_zone: "archive"
---

# Design system implementation and owner correction history

Historical snapshot extracted from source HEAD `650507d2458c5a205cd34a6d555f296c56c3c9d9` on 2026-09-15. Current owner: [DESIGN_SYSTEM_CONTRACT.md](../../02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md). Statements such as current, next, future and passed below describe their original dates; they are not current implementation instructions or release approval.

## Acceptance Criteria For `0.0.1.8.2`

This contract satisfies `0.0.1.8.2` when it:

- defines product image and anti-patterns;
- defines AppShell/workbench zones;
- defines token layers and required token families;
- defines theme, density, typography, spacing, radii, elevation and z-index expectations;
- defines motion, effects and iconography rules;
- lists allowed shared primitives and overlay primitives;
- defines accessibility and state expectations;
- sets ownership boundaries for editor, properties, map, graph, task tracker and secondary screens;
- sets migration gates and test expectations;
- keeps broad visual migration out of the contract task and points runtime implementation to later plan items.

## Runtime Foundation Status

`0.0.1.8.3` implemented the first runtime foundation:

- normalize semantic tokens in `styles/design-tokens.css`;
- keep compatibility aliases;
- define theme/density attributes;
- add icon wrapper foundation;
- add reduced-motion handling;
- do not migrate the whole app.

## Component Catalogue Status

`0.0.1.8.4` added the first visible primitive reference surface:

- shared `.mow-button` examples for primary, secondary, ghost, danger, disabled, pressed and loading states;
- shared `.mow-input` examples for default, small, readonly, invalid and disabled states;
- shared `.mow-panel` raised, sunken and embedded surface examples;
- shared `.mow-popover` anatomy using the existing popup lifecycle, Escape close and state-driven overlay motion.

## AppShell Foundation Status

`0.0.1.8.5` added the first visible AppShell foundation:

- semantic shell markers for the current title/context bar, primary sidebar, workspace and status bar;
- an empty-workspace start surface with one clear action card instead of internal workspace/inspector/diagnostics demo zones;
- local sprite icons for the start-surface actions;
- responsive coverage for the narrow viewport version of the start surface.

This is not the final global AppShell migration. It is the safe surface that later migration phases should use as the first reference, but it should stay understandable to a human user.

## Migration Baseline Status

`0.0.1.8.6` added the Phase 0 migration baseline layer:

- `UI_MIGRATION_BASELINES.md` records current UI, CSS, icon, popup and screenshot ownership by system;
- `tests/browser/visual-regression.spec.mjs` attaches current screenshots for shell, tree, editor, Properties, map, graph, task tracker and shared popover surfaces;
- `tests/uiMigrationBaselines.test.mjs` keeps the manifest synchronized with the visual smoke attachment names.

This is not a visual migration. It is the evidence layer future migration phases must update intentionally.

## AppShell Foundation Status

`0.0.1.8.7` applied the Phase 1 foundation layer to app-level shell surfaces:

- added semantic `--mow-shell-*` tokens for app layout, sidebar width, topbar/statusbar height, shell gutter/padding, panel surface, divider, elevation, title, control and statusbar states;
- moved the current `.app`, `.app-topbar`, `.sidebar`, `.editor`, `.statusbar` and empty-workbench start styling toward those tokens without changing feature business logic;
- added `data-ui-foundation="0.0.1.8.7"` to the root app shell so the runtime foundation version is inspectable;
- extended `tests/browser/app-shell.spec.mjs` to guard the foundation marker, semantic shell token application and compact density behavior.

This is still Foundation readiness. It gives later migration phases a shared shell language; it does not migrate every primitive, overlay, map, graph or content surface yet.

## Primitive Migration Phase 2 Status

`0.0.1.8.8` broadened the shared primitive layer:

- added component tokens for IconButton, Select, Checkbox, SegmentedControl, Toolbar and Separator in `styles/design-tokens.css`;
- expanded `styles/ui.css` with `.mow-icon-button`, `.mow-select`, `.mow-checkbox`, `.mow-segmented`, `.mow-toolbar` and `.mow-separator`;
- extended the component catalogue so it shows Button, IconButton, Field, Toolbar, Panel and Popover states; it was originally exposed through `Tools -> Компоненты`, and `0.0.1.8.17` later made that route dev/test-only behind `my-own-world:show-component-catalogue`;
- migrated the app Tools popup actions to shared `.mow-button` as the first real topbar consumer beyond the catalogue.

The same slice also started the `0.0.1.8.9` overlay foundation by adding `data-overlay-kind`, `data-overlay-lifecycle` and `data-overlay-state` synchronization through `popupManager` for topbar/component catalogue popovers. This is not the full overlay migration yet.

## Overlay Migration Phase 3 Status

The first 2026-07-21 `0.0.1.8.9` follow-up added the first shared modal focus lifecycle:

- `popupManager` now writes `data-overlay-modal` in addition to `data-overlay-kind`, `data-overlay-lifecycle` and `data-overlay-state`;
- registered modal popups receive dialog defaults (`role="dialog"`, `aria-modal="true"` and focusable container fallback);
- modal open moves focus to the first focusable control or explicit autofocus target;
- Tab and Shift+Tab stay inside the topmost open modal popup;
- close returns focus to the opener/anchor when possible;
- `tests/browser/popup-lifecycle.spec.mjs` covers focus trap, focus return and modal overlay markers.

The same follow-up fixed and guarded the empty-workspace AppShell start screen so starter actions no longer collapse into unreadable narrow cells.

The next 2026-07-21 `0.0.1.8.9` follow-up added shared dropdown/context-menu keyboard lifecycle:

- `registerPopup({ kind: 'dropdown-menu' })` and `registerPopup({ kind: 'context-menu' })` now opt into explicit overlay kinds;
- menu-like popups get shared menu defaults, disabled-item skipping, initial menu focus, ArrowUp/ArrowDown wrapping, Home/End jumps, Enter/Space activation and focus return when possible;
- create menu, tree context menu and wiki create menu are the first real consumers;
- `tests/browser/popup-lifecycle.spec.mjs` covers the shared menu lifecycle and the real create-menu keyboard path.

The next 2026-07-21 `0.0.1.8.9` follow-up simplified the empty-workspace start screen and added the first tooltip/toast foundation:

- the empty-workspace surface is now one clear action card instead of an internal AppShell demo grid with `Workspace`, `Context` and `Diagnostics` sections;
- the removed sections were architectural placeholders and did not help the user create the first object;
- icon-only shell controls expose shared `data-tooltip` styling while keeping `title` and `aria-label`;
- operation progress exposes toast overlay markers and uses the shared toast z-index/surface language;
- `tests/browser/app-shell.spec.mjs` covers the simplified start screen, first tooltip consumers and operation-progress toast state.

The next 2026-07-21 `0.0.1.8.9` follow-up moved the first editor feature popups onto explicit overlay semantics:

- `blockPopup`, `linkPopup`, `property-settings-popup` and `image-crop-popup` register as dialog overlays with shared modal markers, focus behavior and state synchronization;
- `toolbarColorPopup` registers as a non-modal popover overlay while keeping the existing precise toolbar positioning;
- direct close buttons now route through the popup controller path where needed so `data-overlay-state` does not get stale;
- `tests/browser/popup-lifecycle.spec.mjs` covers these real editor popup paths.

The next 2026-07-21 `0.0.1.8.9` follow-up moved the generic campaign map popup family onto the same overlay base:

- `campaignMapPopupController` registers `#campaignMapPopup` as a modal dialog overlay with shared modal markers, focus behavior and state synchronization;
- map popup close/toggle paths now go through the controller path so `data-overlay-state`, `data-popup-open` and focus return do not drift;
- `styles/campaign-map-popups.css` now uses shared overlay/control tokens for the generic popup surface, spacing, buttons, range accent, picker/search input and focus states;
- `tests/browser/popup-lifecycle.spec.mjs`, `campaign-map-ui`, `campaign-map-initiative` and visual regression cover the slice.

The closing 2026-07-21 `0.0.1.8.9` follow-up completed the overlay migration step:

- campaign map token hover/actions popup now registers as a non-modal popover while keeping delayed hover behavior local;
- item-set picker and onboarding help popup now use registered popup controllers instead of direct open paths;
- Knowledge Graph node actions and connect-details overlays now expose shared `data-overlay-*` lifecycle state;
- `popupManager` has a static `controller.open()` path for fixed-position overlays;
- campaign token, item picker, onboarding and Knowledge Graph overlay base styles now consume shared overlay/control tokens;
- `tests/browser/popup-lifecycle.spec.mjs` and `tests/browser/knowledge-graph.spec.mjs` cover the closing consumers.

`0.0.1.8.9` is closed.

## AppShell Migration Phase 4 Status

`0.0.1.8.10` migrated the real top-level shell surfaces. `0.0.1.8.10.2`-`0.0.1.8.10.4` correct the rail/sidebar model after user review so it does not duplicate tree content or tree context labels:

- `.app` now exposes `data-app-shell-migration="0.0.1.8.10"` and runtime state for active shell mode, sidebar state and reserved right-panel state.
- A `nav-rail` AppShell zone exists, but its current content navigation entry is only `Дерево`. That same rail button shows/hides the primary tree sidebar; content types such as cards, maps, task trackers, rule trees and knowledge graphs remain visible through the world tree and create flows.
- The profile/user entry lives in the rail. The primary sidebar shows the intact world tree and tree search without repeating `MyWorld` / `Дерево мира`.
- The primary sidebar must not be replaced by repository-backed content-type lists unless a future rail tool owns a distinct workflow that is not already available in `Дерево`.
- Tree-panel visibility and resizing are AppShell-owned, keyboard-accessible and clamped through `--mow-shell-sidebar-*` tokens.
- `0.0.1.8.11.1` removed the old page-info right inspector. The reserved `right-panel` slot stays hidden during normal page selection and can be opened only by an explicit future workflow.
- `0.0.1.8.11.2` migrates the first editor block interaction slice: block DnD must use pointer-controlled preview/placeholder feedback rather than browser-native drag ghosts, and the first-level Add block picker must use local sprite icons plus tokenized focus/spacing/surface rules.
- `0.0.1.8.11.3` migrates the card editor header/runtime-control slice: page navigation uses local sprite icons and accessible labels, card type/tags/aliases/image controls use shared tokens, and the floating text toolbar must live in the overlay layer with enough selection gap to avoid title overlap.
- `0.0.1.10.16` corrects the Card Type runtime control contract: the visible custom picker is a select-only combobox/listbox, not a command menu. DOM focus remains on `.card-type-trigger`; the popup options are tracked with `aria-activedescendant`; Escape cancels without changing type; Enter/Space commit the active option; and the listbox belongs to the shared `popupManager` popover layer for viewport placement and z-order.
- `0.0.1.8.11.4` migrates the Properties field-state slice: Properties blocks expose `data-property-ui-migration="0.0.1.8.11.4"`, fields get semantic `data-property-variant`, `data-property-state` and `data-property-kind-icon` markers, visible field badges are runtime-only local sprite icons, and compact character/creature layouts must avoid skill/death-save overlap.
- `0.0.1.8.11.5` migrates the shared card block visual slice: ordinary `.template-block[data-block-type]` surfaces use `--mow-block-*` tokens, thin type markers and runtime-only `.block-kind-badge` icons/labels; block-specific content may stay specialized, but the outer editor block frame must not introduce another local card style.
- `0.0.1.8.11.6` migrates the card select/template slice: native selects inside card blocks must use `--mow-select-*` tokens, dark option colors, custom arrow styling and warm focus states; saved page templates must be reachable from the existing create menu through the shared popup lifecycle, local sprite icons and human-readable metadata.
- `0.0.1.8.11.7` migrates the search/command slice: the rail may expose `Поиск и команды` as a real global tool, but it must not become a content-type tab or tree filter. The command palette must use `popupManager` modal lifecycle, local sprite icons, tokenized command/result rows, `PageRepository` search metadata, `Ctrl+K`, and existing app action hooks rather than a parallel command registry until command complexity proves that registry necessary.
- `0.0.1.8.12.1` / `0.0.1.8.12.8` define the campaign-map toolbar contract: `.campaign-map-controls[data-map-ui-migration="0.0.1.8.12.8"]` must be an accessible toolbar with semantic action groups for creation, scene/view, map tools and live-session actions, but the visible surface should be a thin Photoshop-like icon-only strip with compact separators, no visible button text and no oversized section labels. It must keep existing action selectors, use local sprite icons, shared control/map tokens, hover/focus tooltips, `aria-pressed` for active grid/pan/drawing/fog states and responsive behavior that prevents toolbar overflow inside the editor workspace. Pan/`Рука` is a map tool. Future tools should extend the existing compact groups or add another icon group; they must not introduce a second large toolbar panel over the canvas.
- `0.0.1.8.12.2` migrates the campaign-map popup surface: `#campaignMapPopup[data-map-popup-ui-migration="0.0.1.8.12.2"]` and `.campaign-map-popup-shell[data-map-popup-ui-migration="0.0.1.8.12.2"]` must provide one compact map overlay frame for add/picker, grid, drawing, fog, shapes, layers, initiative and music. The surface must keep legacy action selectors, use local sprite icons, expose readable section labels and keep per-popup aria labels through `campaignMapPopupController`.
- `0.0.1.8.12.3` migrates the selected-object campaign-map dock: `.campaign-map-selection-dock[data-map-selection-ui-migration="0.0.1.8.12.3"]` must be runtime-only, live inside `.campaign-map-stage`, update from selection events, show identity/position/visibility/key token stats and use local sprite actions. `Убрать` means remove from the current map only; destructive card/page deletion must stay in the existing token popup/action layer.
- `0.0.1.8.12.4` and `0.0.1.8.12.5` were retired from the active campaign-map bundle by `0.0.1.8.15.4`: do not recreate the always-visible layer/object dock or scene-state inspector as default stage panels. Layers, grid, fog and map-image state stay reachable through the compact toolbar and shared map popups; selected object details stay in the right-side property Inspector.
- `0.0.1.8.12.6` closes advanced campaign-map contextual action coverage inside the selection Inspector: multi-selected tokens and shapes may show visible/hidden counters and group `Скрыть` / `Показать` actions, but must update the existing `CampaignMapStore`, reuse render adapters, perform a single save/sync per group action and remain runtime-only.
- `0.0.1.8.12.7` supersedes the default visibility of the `0.0.1.8.12.4` / `0.0.1.8.12.5` stage panels: the default map render must not auto-create duplicate scene/layer panels over the canvas. Scene, grid, fog and layer actions should be reachable through the compact toolbar and existing shared popups unless a future concrete workflow justifies a new always-visible surface.
- `0.0.1.8.12.8` corrects the selected-object flow: normal click selects a token/shape and opens a right-side property Inspector with editable name/type, position, size, rotation, visibility and style fields. It is a runtime-only stage panel inspired by Unity/Godot property inspectors, not a decorative object label popup. Right-click on a map object must suppress the browser context menu and open the compact custom object action popup at the pointer.
- `0.0.1.8.12.10` supersedes the campaign-map toolbar layout: `.campaign-map-controls[data-map-toolbar-region="scene-bar"][data-map-ui-migration="0.0.1.8.12.10"]` owns scene/session actions in a full-width top bar, while `.campaign-map-tool-rail[data-map-toolbar-region="tool-rail"][data-map-ui-migration="0.0.1.8.12.10"]` owns canvas tools in a full-height stage rail. Both zones must be icon-only, runtime-only where applicable, sectioned by real `data-map-tool-section` groups, free of internal scrollbars and ready to grow with future tools. Map toolbar labels must use the body-level `.campaign-map-toolbar-tooltip` runtime overlay instead of pseudo-labels clipped inside button boxes.
- The separate diagnostics/history bottom panel was not added as a decorative placeholder. It remains a secondary-screens migration target where it can attach to real diagnostics, backup, recovery and history data.
- `0.0.1.8.15.1` starts Phase 9 with a concrete polish gate: contrast theme support, pressed appearance controls, focus coverage for older editable/select/search fields, removal of heavy blur from large map/graph inspectors and `tools/audit_ui_polish.mjs` inside `npm run verify`.
- `0.0.1.8.15.4` keeps Phase 9 cleanup literal: the retired campaign-map layer/object dock and scene-state inspector CSS/JS owner files are removed, and future map work should extend the existing toolbar/popup/selected-object Inspector surfaces before adding another visible stage panel.
- `0.0.1.8.15.5` closes Phase 9 at `Foundation`: polish, performance, theme-scale visual baselines, dead CSS cleanup and documentation/release sync are in place.
- `0.0.1.8.16` closes the design-system visual regression pass at `Foundation`: fixed viewport screenshot attachments now cover empty shell/tree/error state, editor Properties, campaign map popup plus Inspector, Knowledge Graph context overlay and empty task tracker board across dark/contrast themes and compact/large scale.
- `0.0.1.8.17` closes the owner visual completion gate at `Usable`: the component catalogue is dev/test-only, tree rows have stronger keyboard/ARIA semantics, editor controls and empty Task Tracker are quieter, Knowledge Graph first-layer noise is reduced without adding new graph features, campaign map popups avoid the right-side Inspector, and primary/secondary owner evidence screenshots cover the accepted design direction.
- `0.0.1.8.18.6` produced real independent visual critic evidence. The FAIL result was not erased; it is now future polish debt by owner waiver.
- `0.0.1.8.18.7` closed a plan-only backlog expansion leaf. That source material is now absorbed into [PROJECT_PLAN.md](../../01-delivery/PROJECT_PLAN.md), and the former mini backlog is archived for history.
- `0.0.1.8.18.8` ran the final verification gate with focused leaf tests, full browser smoke, visual regression, UI polish audit, `npm run verify`, real large-workspace desktop smoke and `npm run desktop:gate` green. `0.0.1.8.18` is closed by the 2026-08-10 owner waiver, and `0.0.1.9.0` is unlocked as the next audit-only phase.
- `0.0.1.8.18.2` closes the first owner correction leaf for findings A-C: Add Block uses the shared `.mow-button`, generic Campaign Map popups use `.mow-popover` plus `--mow-surface-overlay-opaque`, and tag/alias metadata controls use shared `.mow-input[data-size="sm"]` / `.mow-icon-button[data-size="sm"]` instead of local generic styling.

`0.0.1.8.10` is closed. `0.0.1.8.11` Migration Phase 5 core content is closed at `Usable` level; tree/search, block DnD, first-level Add block picker, card editor header/toolbar controls, Properties, shared card block frames, card selects, saved template creation, deep search and the command palette now have migrated slices. `0.0.1.8.12` campaign map migration is closed at `Usable` level by `0.0.1.8.12.10`; the current default map UI is a graphic-editor split toolbar with full-size unclipped top/left tool zones, shared popups, right-side selected-object property Inspector, custom object right-click menu and group contextual visibility actions, without duplicate scene/layer panels over the stage. `0.0.1.8.13` knowledge graph migration is closed at `Usable` level by `0.0.1.8.13.11`: visible-slice clarity, selected-node states/inspector, node/connect overlays, laconic first-layer correction, CSS ownership, JS owner modules, relationship/context-menu HTML, view-state helpers and command-lifecycle relationship persistence are in place. `0.0.1.8.14.1` starts secondary screens by migrating task tracker UI to the shared workbench language: compact board toolbar, local sprite actions, quiet counters, checklist progress, tokenized columns/cards and no task data-model change. `0.0.1.8.14.2` fixes the task tracker nested-icon click regression and migrates the existing Settings maintenance popup for appearance, backup, asset health and workspace diagnostics. `0.0.1.8.14.3` migrates the existing Help/Support/Release guide surface inside Tools. `0.0.1.8.14.4` adds the first World Package manager MVP for branch/world export, package library, import preview and backup-gated page-only import. `0.0.1.8.14.5` adds non-destructive conflict modes and preview plan counts for page-only World Package imports. `0.0.1.8.14.6` adds embedded rulePackage apply and asset preflight. `0.0.1.8.14.7` closes Phase 8 secondary screens at `Usable` by adding asset payload export/import, non-overwrite asset copy and imported page reference rewrite. `0.0.1.8.15` closes Phase 9 polish and cleanup at `Foundation` with audit/theme, performance, theme-scale visual baselines, retired CSS/JS owner cleanup and release/documentation sync. `0.0.1.8.16` closes the broader fixed viewport visual-regression track at `Foundation`. `0.0.1.8.17` closes owner visual completion at `Usable`; pause for the owner's planned post-design task before moving to non-design work.


## Original Contract Task Provenance

Updated: 2026-08-10

Plan ref: `0.0.1.8.2`

Readiness: `Foundation`
