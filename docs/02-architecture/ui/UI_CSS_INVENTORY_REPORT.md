---
summary: "Detailed UI and CSS inventory for the version 1 redesign work."
read_when:
  - "Before changing the design system contract"
  - "Before migrating UI primitives, overlays, AppShell, editor, map or graph UI"
  - "When checking whether a UI fix belongs to the redesign plan or the small backlog"
owner_zone: "architecture"
---

# UI/CSS Inventory Report

Updated: 2026-07-22

Plan ref: `0.0.1.8.1`

Readiness: `Foundation`

## Purpose

This report is the first inventory pass before the system UI/UX redesign. It does not redesign the app. It gives the project owner and future agents a readable map of the current UI/CSS surface, where reusable pieces already exist, where duplication is highest, and how to migrate without making MyOwnWorld harder to use.

## Inventory Snapshot

Collected from the current workspace on 2026-07-21.

| Area | Count |
| --- | ---: |
| CSS files in `styles/` | 52 |
| CSS lines | 22,646 |
| JS files in `js/` | 252 |
| JS lines | 99,903 |
| CSS variable definitions | 119 |
| CSS variable names used through `var(...)` | 94 |
| Hardcoded CSS hex colors | 172 |
| Hardcoded CSS `rgb/rgba(...)` colors | 1,288 |
| CSS gradients | 62 |
| CSS `!important` usages | 32 |
| JS `innerHTML` usages | 146 |
| JS `insertAdjacentHTML` usages | 8 |
| JS `document.createElement(...)` usages | 275 |
| Popup registrations through `popupManager` | 14 |

The numbers are not all bugs. Some hardcoded values are deliberate fallbacks, dynamic map colors or presentation styles. The important finding is that the project already has design-system seeds, but feature CSS still owns too many local visual decisions.

Post-`0.0.1.8.7` delta: app-level shell CSS now has a named `--mow-shell-*` foundation for layout, density, surface, divider, elevation and control states. Future inventory passes should treat `styles/design-tokens.css` as the owner of AppShell shell tokens, while `styles/layout.css`, `styles/app-topbar.css`, `styles/sidebar.css`, `styles/editor.css` and `styles/brand-system.css` consume those tokens during the transition.

## Current CSS Entry Tree

The browser and desktop app load one CSS entry point:

```text
index.html
-> styles/main.css
   -> variables.css
   -> design-tokens.css
   -> layout.css
   -> app-topbar.css
   -> onboarding.css
   -> ui.css
   -> sidebar.css
   -> tree.css
   -> editor.css
   -> document.css
   -> tags.css
   -> toolbar.css
   -> popup.css
      -> popup-create.css
      -> popup-link.css
      -> popup-wiki.css
      -> popup-block.css
      -> popup-item-picker.css
      -> popup-confirm-profile.css
      -> popup-block-type.css
      -> popup-image-crop.css
   -> scrollbar.css
   -> blocks.css
   -> block-special.css
      -> block-items-inline.css
      -> block-character-stats.css
      -> block-dnd-stats-legacy.css
      -> block-dnd-stats.css
   -> block-properties.css
   -> block-character-effects.css
   -> block-character-sheet.css
   -> block-table.css
   -> card-type.css
   -> backlinks.css
   -> legacy-fields.css
   -> campaign-map.css
      -> campaign-map-layout.css
      -> campaign-map-initiative.css
      -> campaign-map-stage.css
      -> campaign-map-tokens.css
      -> campaign-map-shapes.css
      -> campaign-map-token-popup.css
      -> campaign-map-popups.css
      -> campaign-map-responsive.css
   -> task-tracker.css
   -> rule-tree.css
   -> knowledge-graph.css
   -> internal-rules-workspace.css
   -> brand-system.css
```

`brand-system.css` is loaded last and therefore acts as an override skin over feature styles. That is useful for compatibility, but dangerous for long-term maintainability if it keeps growing as a selector patch layer.

## Largest CSS Files

| File | Lines | Role |
| --- | ---: | --- |
| `styles/block-properties.css` | 1,875 | Properties grid, field controls, settings popup, DnD/resize states, character layout polish. |
| `styles/campaign-map-popups.css` | 1,822 | Map popups, playlists, layers, drawing, settings and scene controls. |
| `styles/app-topbar.css` | 1,560 | App topbar, appearance, backup, asset health, workspace diagnostics. |
| `styles/knowledge-graph.css` | 1,341 | Graph workbench, canvas, toolbar, filters, context/edit popup and responsive rules. |
| `styles/blocks.css` | 813 | Generic blocks toolbar, block surfaces and runtime controls. |
| `styles/tree.css` | 808 | Sidebar tree, context menu and virtualized rows. |
| `styles/block-dnd-stats-legacy.css` | 789 | Legacy DnD stat block compatibility. |
| `styles/editor.css` | 713 | Editor shell, empty states and navigation controls. |
| `styles/document.css` | 661 | Persistent document typography and card body styles. |
| `styles/brand-system.css` | 642 | Final brand skin, shared state overrides and popup motion. |
| `styles/campaign-map-token-popup.css` | 633 | Token popup and token quick actions. |
| `styles/block-table.css` | 577 | Table block, selection toolbar and resize states. |

## Largest UI-Related JS Files

| File | Lines | UI Risk |
| --- | ---: | --- |
| `js/wiki/knowledgeGraphPage.js` | 5,408 | Too much graph page, canvas UI, actions and persistence in one file. Already tracked in `BI-017`/`BI-018`. |
| `js/editor/propertiesSettingsPopup.js` | 3,683 | Properties field UI, settings, grid interactions and model bridge are tightly coupled. |
| `js/wiki/knowledgeGraph.js` | 2,366 | Graph model/build logic is large enough to hide lifecycle bypasses. |
| `js/ui/workspaceDiagnosticsPanel.js` | 1,891 | Diagnostics UI is useful, but large and should not become a generic panel model. |
| `js/editor/campaignMapMusic.js` | 1,759 | Playlist UI and playback behavior share one large file. |
| `js/ui/appTopbar.js` | 1,461 | Appearance, backup, diagnostics and app tools are concentrated in the topbar surface. |
| `js/templates/blockTypes.js` | 1,519 | Block catalog and creation UI data are dense. This matters for `BI-014` Add block redesign. |

## Existing Reusable UI

These pieces should be preserved and migrated, not thrown away:

- `styles/design-tokens.css` already defines `--mow-*` tokens for app background, surfaces, text, accents, borders, radii, spacing, motion, z-index and density.
- `styles/ui.css` already has primitive seeds: `.ui-panel`, `.ui-button`, `.ui-input`, `.ui-chip` and operation progress.
- `styles/brand-system.css` already normalizes many shared hover/focus/active/popup states.
- `js/ui/popupManager.js` already gives a common popup lifecycle: register, open/toggle, close, outside click, Escape, z-index and draggable free-space popup behavior.
- `js/ui/popupPosition.js` is the right place for viewport-safe positioning.
- `assets/icons/rpg-ui.svg` contains 40 local project icons in a Lucide-like line style.
- `js/core/icons.js` centralizes page/entity icon sprite rendering.
- `js/ui/operationProgress.js` gives a reusable progress surface for long workspace operations.
- Properties field drag/resize, graph canvas controls, map toolbar controls and tree virtualization are useful interaction precedents, but their styles should be migrated into shared primitives over time.

## Duplicate Control Families

Current controls are useful, but they are implemented as many local families:

| Control | Current Implementations | Migration Target |
| --- | --- | --- |
| Icon buttons | `.icon-btn`, `.app-topbar-btn`, map tool buttons, graph toolbar buttons, inline SVG buttons. | One `IconButton` primitive with size, variant, pressed, danger and disabled states. |
| Text buttons | `.ui-button`, popup action buttons, map popup buttons, task tracker buttons, backup/diagnostics buttons. | One `Button` primitive with primary, secondary, ghost and danger variants. |
| Inputs | `#searchInput`, `.ui-input`, `.block-popup-input`, `.link-popup input`, Properties inputs, table width inputs, graph filters. | One `Input` primitive plus feature-specific layout wrappers. |
| Selects | Properties selects, card type selectors, map settings, appearance segmented controls. | One `Select` primitive and one `SegmentedControl` primitive. |
| Checkboxes/toggles | Properties checkboxes, character skills, layer visibility, task tracker checklist. | One `Checkbox`/`TriStateCheckbox` primitive and one `Switch` primitive. |
| Toolbars | Floating text toolbar, table toolbar, map toolbar, graph toolbar, blocks toolbar. | One compact `Toolbar` primitive with icon groups, separator and overflow rules. |
| Panels | `.ui-panel`, sidebar, editor panels, app diagnostics panels, graph cards, map panels. | `Panel` primitive with surface levels and density. |
| Context menus | Tree context menu, graph context menu, map token/menu surfaces, create menu. | One `ContextMenu` primitive using the overlay lifecycle. |

## Popup And Overlay Inventory

Shared lifecycle exists, but overlays are not yet one system.

Uses or is wired to `popupManager`:

- app settings/tools popups;
- profile popup;
- create menu;
- tree context menu;
- block popup;
- confirm popup;
- link popup;
- wiki preview and wiki create menu;
- properties settings popup;
- image crop popup;
- campaign map generic popup.

Partially separate or locally managed surfaces:

- campaign token popup;
- variable picker popup;
- floating text toolbar;
- table selection toolbar;
- onboarding popup;
- presentation image preview;
- some graph canvas context/edit surfaces.

Current `0.0.1.8.8` foundation:

- app settings/tools and the component catalogue popover now expose `data-overlay-kind`, `data-overlay-lifecycle` and `data-overlay-state`;
- `popupManager` synchronizes `data-overlay-state` and `data-popup-open` during registered open/close paths;
- modal focus trap, focus return, dropdown/context-menu keyboard navigation, first shell tooltips, the operation-progress toast marker, editor feature popup lifecycle consumers, campaign map generic/token popups, item picker, onboarding popup and Knowledge Graph node/connect overlays are now part of the closed `0.0.1.8.9` overlay foundation.

Main overlay gaps after `0.0.1.8.9`:

- broad visual restyling should move to the owning migration phases instead of reopening the overlay lifecycle phase;
- some popups are still styled through feature CSS, then overridden in `brand-system.css`;
- some contextual surfaces are called popup/menu/toolbar but should be visually rationalized when their owner system migrates;
- tooltip/toast coverage currently starts with shell icon controls and operation progress; feature-specific adoption can expand during later owner phases.

## Icon Inventory

Current icon approaches:

- preferred: local SVG sprite through `.app-icon`, `<use href="./assets/icons/rpg-ui.svg#icon-*">`;
- supported helper: `iconSvg(name)` and `getPageIcon(tags)` in `js/core/icons.js`;
- local inline SVG remains in campaign map, presentation and a few older controls;
- text glyph buttons remain in editor toolbar (`B`, `I`, `U`, `H1`, `Tx`), graph/variable/link helpers and music symbols;
- CSS data-URI SVG exists for at least one select arrow in map token popup styles.

Migration rule:

- keep the local sprite and add missing icons there;
- do not introduce CDN icon libraries;
- replace noisy text/glyph buttons with sprite icons when the action is a command;
- keep text labels where the command is ambiguous or destructive.

## Colors And Tokens

Current token situation:

- New namespace: `--mow-*`.
- Compatibility namespace: `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--motion-*`, `--z-*`.
- Older namespace still active: `--bg`, `--panel`, `--border`, `--text`, `--accent`, `--danger`.

Important findings:

- `styles/design-tokens.css` is a good foundation, but it does not yet cover all roles used by newer features.
- `styles/knowledge-graph.css` uses light-surface fallbacks such as `--mow-surface`, `--mow-text`, `--mow-border`, `--mow-shadow-soft`, but those names are not defined in `design-tokens.css` yet.
- Dynamic local variables such as `--token-size`, `--token-rotation`, `--campaign-grid-color`, `--campaign-shape-fill` and Properties field sizing variables are valid feature-state variables and should remain local.
- The high count of direct `rgba(...)` values means feature CSS is still doing visual design locally instead of asking the semantic token layer for surface, border, text and state colors.

Suggested semantic token groups for `0.0.1.8.2`:

- app: `--mow-app-bg`, `--mow-app-text`, `--mow-app-text-muted`;
- surfaces: `--mow-surface-base`, `--mow-surface-raised`, `--mow-surface-overlay`, `--mow-surface-sunken`;
- borders: `--mow-border-subtle`, `--mow-border-default`, `--mow-border-strong`, `--mow-border-focus`;
- controls: `--mow-control-bg`, `--mow-control-bg-hover`, `--mow-control-bg-active`, `--mow-control-border`, `--mow-control-height-*`;
- status: `--mow-status-success-*`, `--mow-status-warning-*`, `--mow-status-danger-*`, `--mow-status-info-*`;
- map: `--mow-map-control-*`, `--mow-map-overlay-*`, `--mow-map-selection-*`;
- graph: `--mow-graph-node-*`, `--mow-graph-edge-*`, `--mow-graph-canvas-*`;
- content blocks: `--mow-block-*`, `--mow-property-*`, `--mow-table-*`;
- motion and density: keep current `--mow-motion-*`, `--mow-ui-scale`, but add component-size tokens instead of local pixel constants.

## Proposed UI Structure

Keep the existing `styles/` entry point during migration. Do not move files just to make folders pretty until visual regression exists.

Target ownership model:

```text
styles/design-tokens.css       semantic tokens, themes, density, motion
styles/ui.css                  shared primitive classes during transition
styles/brand-system.css        temporary compatibility skin, should shrink over time
styles/layout.css              AppShell and global workbench layout
styles/sidebar.css             sidebar only
styles/tree.css                tree only
styles/editor.css              editor shell only
styles/document.css            persistent document content only
styles/blocks.css              generic block frame and runtime controls only
styles/block-*.css             specific block families
styles/campaign-map*.css       map feature UI, no global control rules
styles/knowledge-graph.css     graph feature UI, split later before more behavior
styles/task-tracker.css        task tracker feature UI
```

Future JS ownership model:

```text
js/ui/primitives/*             Button, IconButton, Input, Select, Checkbox, Tabs, Panel
js/ui/overlays/*               Dialog, Popover, ContextMenu, Tooltip, Toast, focus lifecycle
js/ui/app-shell/*              topbar/sidebar/statusbar/right-panel layout behavior
feature modules                compose primitives, do not create new visual systems
```

Do not create this full folder structure in one pass. Introduce it when a primitive has at least two real consumers.

## Migration Map

| Plan Item | Deliverable | Acceptance Criteria |
| --- | --- | --- |
| `0.0.1.8.2` Design system contract | Update `DESIGN_SYSTEM_CONTRACT.md` with this inventory's token, overlay and primitive rules. | Contract names the allowed primitives, token families, prohibited patterns and migration gates. |
| `0.0.1.8.3` Theme foundation POC | Closed: semantic tokens, theme manager, density aliases, motion aliases and icon helper foundation exist in runtime. | No broad restyle; old UI still renders; undefined graph-like semantic tokens have a clear home. |
| `0.0.1.8.4` Component catalogue POC | Closed: `Tools -> Компоненты` exposes shared Button, Input, Panel and Popover examples. | Browser coverage verifies visible path, focus, Escape close, disabled, invalid, pressed, loading and compact/large density states. |
| `0.0.1.8.5` AppShell foundation | Closed and simplified after review: the empty workspace start screen uses a tokenized, single-card action workbench instead of internal workspace/inspector/diagnostics demo zones. | Browser coverage verifies shell markers, existing sidebar/editor/statusbar, starter actions, local icons, mobile width and absence of confusing POC-only panels. |
| `0.0.1.8.6` Migration phase 0 | Closed: [UI_MIGRATION_BASELINES.md](./UI_MIGRATION_BASELINES.md) records UI, CSS, icon, popup and screenshot baselines. | No visual mass migration; visual smoke now attaches baselines for shell, tree, editor, Properties, map, graph, task tracker and shared popover surfaces. |
| `0.0.1.8.8` Primitives | Closed: shared IconButton, Select, Checkbox, SegmentedControl, Toolbar and Separator primitives are added beside Button/Input/Panel/Popover. | Component catalogue covers the new primitives; app Tools popup consumes shared `.mow-button`; popupManager has first overlay state markers for topbar/catalogue popovers. |
| `0.0.1.8.9` Overlays | Closed: modal focus trap/return, dropdown/context-menu keyboard behavior, first shell tooltip styling, operation-progress toast markers, editor feature popups, campaign map generic/token popups, item picker, onboarding and Knowledge Graph node/connect overlays now extend the popupManager overlay foundation. | Acceptance met: feature overlays use shared lifecycle semantics without adding parallel overlay systems; broader visual polish moves to owning migration phases. |
| `0.0.1.8.10` AppShell | Closed and corrected after user review: AppShell now has a left rail where `Дерево` shows/hides the primary tree sidebar, profile/user sits in the rail, Explorer-style no-workspace/root creation actions stay in the tree, resize remains available when the sidebar is visible, and the old page-info right inspector has been removed. Content types are not duplicated as rail tabs. | AppShell browser coverage verifies empty start readability, no-workspace tree open-folder CTA, root-level create/folder actions, one-tree-entry rail, no content-type rail duplicates, no duplicate tree header, rail profile placement, tree search, resize, tree show/hide editor expansion, hidden right-panel default state and explicit right-panel foundation open/close. A fake diagnostics bottom panel was not added. |
| `0.0.1.8.11` Core content | Advanced by `0.0.1.8.11.3`: tree/search has a core-content marker and local search icon; editor block DnD, first-level Add block popup and the card editor header/runtime toolbar layer are migrated to the shared design direction. Remaining: Properties, templates, deeper search and command palette. | `BI-013` and `BI-014` are closed; keep `BI-025` as future pane-planning material. |
| `0.0.1.8.12` Campaign map | Map toolbar, popups, layers and token dock migrate without business logic changes. | Also check `BI-008`, `BI-009`, `BI-010`, `BI-011` and map performance smoke. |
| `0.0.1.8.13` Knowledge graph | Graph toolbar, canvas controls, node cards and filters migrate. | Also check `BI-017`, `BI-018`, `BI-019`. |

## Browser And Tauri Risks

- `backdrop-filter` is used in shared panels. It looks good, but it can be expensive in desktop WebView on large map/graph surfaces. Keep it for small overlays; avoid it on map stage and large scrolling panes.
- CSS import order currently depends on `brand-system.css` loading last. If files are split or reordered, visual regressions may appear even without JS changes.
- Desktop path handling and asset protocol are separate from CSS, but image/audio previews can look broken if UI assumes browser-only URLs.
- `color-mix(...)` and modern selectors should remain covered by browser and Tauri smoke before being used in critical controls.
- Fixed pixel assumptions still exist in tree virtualization, toolbar placement, graph canvas and map controls. Design density changes must not silently break hit targets or virtualization height.
- Presentation window has its own renderer/styles and should be included in later visual baselines; it is not fully covered by app-shell CSS.

## Reusable Current UI By Area

| Area | Keep | Redesign Later |
| --- | --- | --- |
| App shell | Sidebar/editor split, statusbar, workspace diagnostics entry points, tree-first rail without content-type duplicates. | Future global rail tools, unified AppShell zones and less topbar responsibility. |
| Tree | Virtualized row model, context menu actions, active-page highlighting, no-workspace open-folder state and root-level create/folder actions. | Full tree primitive, keyboard DnD, smoother block-level DnD elsewhere. |
| Editor | Persistent/runtime split, safe HTML boundary, floating toolbar concept. | Toolbar grouping, icon consistency, block creation popup. |
| Properties | Free grid, field resize handles, calculations and armor picker behavior. | Shared field primitives, lock toggle (`BI-023`), less local CSS. |
| Campaign map | Data-first map model, toolbar modes, layers, initiative, music, presentation. | Compact map workbench controls and shape/tool polish from backlog. |
| Knowledge graph | Canvas foundation, filters, context actions, performance gate. | File split, lifecycle bridge, hidden-slice clarity and design-system migration. |
| Task tracker | Model-first board and DnD. | Shared card, column, checkbox and toolbar primitives. |

## Proposed Dependencies

No new runtime dependency is recommended for `0.0.1.8.2` through `0.0.1.8.5`.

Use what already exists first:

- local CSS variables;
- local SVG sprite;
- `popupManager`;
- Playwright for browser and future visual baselines.

Future optional tools, only if they solve a measured problem:

- a tiny local CSS audit script for hardcoded colors and undefined tokens;
- Playwright visual snapshots for design-system baselines;
- no CDN fonts or icon packages without a separate contract update.

## Backlog Touchpoints

When the redesign reaches these areas, check the small backlog before marking the plan item done:

- `BI-013`: editor block drag-and-drop regression, closed in `0.0.1.8.11.2`.
- `BI-014`: Add block popup visual cleanup, closed in `0.0.1.8.11.2`.
- Card editor header/toolbar polish advanced in `0.0.1.8.11.3`; remaining card-editor Phase 5 work should focus on Properties/template/search/command palette surfaces rather than reworking this toolbar foundation.
- `BI-017`: Knowledge Graph file/CSS split, belongs to graph redesign or graph lifecycle work.
- `BI-018`: Knowledge Graph should stop bypassing the page lifecycle before more graph behavior.
- `BI-019`: graph hidden-slice clarity belongs to graph UI migration.
- `BI-023`: Properties field lock toggle belongs to Properties/core content redesign.

## Anti-Slop Gate For The Next UI Work

Before any visual patch after this report:

1. Name the exact user action that becomes easier.
2. Name the primitive or feature surface that owns the change.
3. Use an existing token or add a semantic token first.
4. Do not add another local button/input/popup style if a shared primitive can cover it.
5. Run a targeted smoke or explain why the work is docs-only.
6. Do not remove plan items unless the owner can actually use the workflow being claimed.
