---
summary: "Migration Phase 0 UI baseline manifest for visual redesign work."
read_when:
  - "Before migrating AppShell, tree, editor, properties, map, graph, task tracker or overlays"
  - "Before updating visual-regression browser screenshots"
  - "When checking whether UI inventory, CSS inventory, icon inventory, popup inventory and screenshot baselines are synchronized"
owner_zone: "architecture"
---

# UI Migration Baselines

Status: `0.0.1.8.10` AppShell migration closed and corrected by `0.0.1.8.10.1`-`0.0.1.8.10.4`; `0.0.1.8.11` core content is active and advanced by `0.0.1.8.11.6`.

This document is the Phase 0 baseline manifest for the version-1 UI migration. It does not approve a mass redesign. It records the current surfaces, CSS ownership, icon/overlay risks and screenshot attachments that future migration phases must compare against.

Owner note: this is the "before we repaint the house, photograph every room and label the wiring" step. It is intentionally practical and specific.

`0.0.1.8.7` update: the AppShell baseline now includes the first runtime shell-token foundation. The shell is still a baseline surface, but `.app`, `.app-topbar`, `.sidebar`, `.editor`, `.statusbar` and the empty-workbench start surface now share `--mow-shell-*` tokens and the root app carries `data-ui-foundation="0.0.1.8.7"`.

`0.0.1.8.9` update: the empty-workbench surface now has regression guards for readable starter actions on desktop/mobile and no longer shows internal POC-only `Workspace`, `Context` or `Diagnostics` sections. `popupManager` now covers modal `data-overlay-modal`, dialog defaults, Tab focus trap, focus return, shared dropdown/context-menu keyboard behavior, first shell tooltips, operation-progress toast markers, editor feature popup lifecycle adoption, campaign map generic and token popup lifecycle, item-set picker, onboarding help and Knowledge Graph node/connect overlays. This closes the overlay lifecycle phase at foundation level; later visual redesign belongs to each owning migration phase.

`0.0.1.8.10` update, corrected by `0.0.1.8.10.2`-`0.0.1.8.10.4` and updated by `0.0.1.8.11.1`: the AppShell baseline now includes the left navigation rail, an intact world tree, tree-panel show/hide state, sidebar resize state and a reserved right-panel slot hidden by default. After user review, content-type entries (`Карточки`, `Карты`, `Задачи`, `Правила`, `Граф связей`) are not rail tabs because they duplicate pages already reachable in `Дерево`. The sidebar header no longer owns workspace/open or create actions and no longer repeats `MyWorld` / `Дерево мира`. With no workspace, the tree area shows `Открыть папку`; with a workspace, the `Корень` row owns root `+` and folder-create actions. The profile/user bar lives in the left rail. The `Дерево` rail button shows/hides the tree sidebar and the editor expands when the tree is hidden. The old page-info inspector is removed; selecting a page must not open the right panel. A separate diagnostics/history bottom panel is not part of the baseline yet because it needs real diagnostics/recovery ownership in the secondary-screens phase.

`0.0.1.8.11.2` update: the Card editor baseline now includes restored pointer-based block drag-and-drop with a floating preview and drop placeholder, plus the redesigned first-level `Add block` popup. The popup keeps the existing allowlist, but uses local sprite icons, grouped readable labels, tokenized spacing/surfaces and visible focus states. Visual smoke now captures `visual-add-block-popup.png`.

`0.0.1.8.11.3` update: the Card editor baseline now also includes the header/runtime-control polish layer. Page navigation uses local sprite icons with accessible labels, card type/tags/aliases/image controls consume design-system tokens, and the floating text toolbar is an overlay-layer accessible toolbar with a browser guard against title overlap.

`0.0.1.8.11.4` update: the Properties baseline now includes semantic field variants/states, `data-property-ui-migration="0.0.1.8.11.4"`, runtime-only local sprite field badges, tokenized field/focus surfaces and corrected character/creature skill-group spacing so death-save fields do not overlap lower skill rows.

`0.0.1.8.11.5` update: the Card editor baseline now includes a shared outer visual language for ordinary card blocks. `.template-block[data-block-type]` uses `--mow-block-*` tokens, a thin colored type marker and runtime-only `.block-kind-badge` local sprite icons/labels; Properties field backgrounds are intentionally transparent so state reads through borders, badges and focus rather than heavy fill.

`0.0.1.8.11.6` update: the Card editor baseline now includes shared card-block select styling and a reachable saved-template creation path. Native selects inside card blocks consume `--mow-select-*` tokens, custom dark arrows/options and warm focus states; `#createMenu[data-create-menu-view="templates"]` exposes the `Из шаблона` picker through popupManager with local sprite icons and human-readable template metadata.

## Baseline Rules

- Do not commit generated PNG screenshots. `tests/browser/visual-regression.spec.mjs` attaches them to the Playwright run as current baseline evidence.
- A future UI migration must update the matching row here when it intentionally changes a surface.
- If a surface gets a new baseline screenshot name, add it both here and to `UI_MIGRATION_BASELINE_ATTACHMENTS` in `tests/browser/visual-regression.spec.mjs`.
- Baselines are reference-backed: check [UI_UX_COMPETITOR_REFERENCE_RESEARCH.md](./UI_UX_COMPETITOR_REFERENCE_RESEARCH.md) before changing the direction for a system.
- Baselines are not pixel locks yet. The current guard is screenshot attachment plus layout assertions; later phases may add stricter visual snapshot comparison when the design stabilizes.

## Screenshot Attachment Contract

These names are the current visual baseline contract. They are produced by `npm run test:browser -- tests/browser/visual-regression.spec.mjs`.

| Attachment | Surface | Selector / source | Why it matters |
| --- | --- | --- | --- |
| `visual-app-shell.png` | Full app shell | page screenshot after `/` load | Captures topbar, navigation rail, sidebar, workspace, statusbar and empty-workspace state together. |
| `visual-app-shell-empty-workbench.png` | Empty workspace start | `[data-app-shell-surface="empty-workspace"]` visible in page screenshot | Captures the simplified first-start action card with five creation paths and no internal POC-only panels. |
| `visual-sidebar-tree.png` | Sidebar and tree zone | `.sidebar` | Captures navigation density, search/create controls, tree rows and sidebar spacing. |
| `visual-card-editor.png` | Card editor | `.editor-surface` after `createCardShellTemplate()` | Captures hero/header, portrait slot, tags/aliases and text block rhythm. |
| `visual-add-block-popup.png` | Add block popup | `#blockPopup` opened from `.add-block-btn` after `renderCustomBlocks()` | Captures the first-level block insertion surface, local sprite icons, focus state, spacing and overlay density. |
| `visual-properties-sheet.png` | Properties block | `.card-properties-block` after `createPropertiesBlock({ cardType: 'character' })` | Captures field grid, settings affordance, labels, values and resize handles. |
| `visual-properties-popup.png` | Properties overlay | `.property-settings-popup` opened from the real settings button | Captures one high-risk legacy overlay before overlay migration. |
| `visual-campaign-map.png` | Campaign map | `.campaign-map-document` with synthetic tokens, shape and locked fog zone | Captures map stage, grid, tokens, hidden/player badge, shape and fog layering. |
| `visual-knowledge-graph.png` | Knowledge graph | `.knowledge-graph-document` rendered from synthetic `state.pages` | Captures graph workbench, toolbar, filterbar, edges and node cards. |
| `visual-task-tracker.png` | Task tracker | `.task-tracker-document` after `renderTaskTracker()` | Captures board columns, task cards and compact production-board density. |
| `visual-component-catalogue-popover.png` | Shared primitives and popover | `#componentCataloguePopover` opened through Tools -> Components | Captures shared Button, IconButton, Field, Toolbar, Panel and Popover states that future migrations should consume. |

## System Inventory Baseline

| System | Current UI baseline | Main CSS owners | Icon baseline | Popup / overlay baseline | Reference direction |
| --- | --- | --- | --- | --- | --- |
| AppShell and workbench | `.app[data-ui-foundation="0.0.1.8.7"][data-app-shell-migration="0.0.1.8.10"][data-core-content-migration="0.0.1.8.11.6"]`, `.app-nav-rail`, `.sidebar`, `.app-sidebar-resize-handle`, `.editor`, `.app-right-panel`, `.statusbar`, `[data-app-shell-zone]`, `[data-app-shell-surface="empty-workspace"]` | `styles/design-tokens.css` owns `--mow-shell-*`; `styles/layout.css`, `styles/app-topbar.css`, `styles/sidebar.css`, `styles/editor.css`, `styles/brand-system.css` consume it | Local sprite via `iconSvg`; current rail uses `folder-open` for `Дерево` show/hide, search uses `icon-search`, and the profile avatar is the bottom rail item; starter actions still use document/map/task/lore/link icons | App topbar popups and profile popup use `popupManager`; icon-only shell controls now use first shared tooltip styling; empty-workspace start has no popup; reserved right-panel slot stays hidden unless an explicit future workflow opens it | VS Code workbench density, Obsidian command focus, Linear quiet search/action framing. |
| Sidebar, tree, search and navigation | `.sidebar`, `.tree`, `.tree-root-drop-zone`, `.tree-root-actions`, `[data-open-workspace]`, `[data-create-page]`, `[data-create-folder]`, `#searchInput` | `styles/sidebar.css`, `styles/tree.css`, `styles/popup-create.css`, `styles/scrollbar.css` | Local sprite via `iconSvg`; root actions use `plus` and `folder`, no-workspace tree action uses `folder-open`, tree rows keep entity icons | Create menu and tree context menu now use explicit dropdown/context-menu overlay kinds and shared keyboard lifecycle; root `+` opens the create menu, root folder action bypasses the menu for `type: folder` | VS Code explorer, Notion sidebar, Obsidian backlinks. |
| Card editor and blocks | `.editor-surface`, `.entity-layout`, `.card-shell`, `.editor-page-nav`, `.card-type-trigger`, `.template-block[data-block-type]`, `.block-kind-badge[data-runtime="true"]`, `.template-block select`, `.universal-list-kind-select`, `.block-drag-handle`, `.block-drag-preview`, `.block-drop-placeholder`, `.floating-toolbar[role="toolbar"]`, `#blockPopup[data-block-popup-view="type-picker"]`, `#createMenu[data-create-menu-view="templates"]` | `styles/design-tokens.css` owns `--mow-block-*` and `--mow-select-*`; `styles/editor.css`, `styles/document.css`, `styles/tags.css`, `styles/card-type.css`, `styles/blocks.css`, `styles/popup-create.css`, `styles/popup-block.css`, `styles/popup-block-type.css`, `styles/toolbar.css`, `styles/block-special.css`, `styles/block-table.css` consume it | Page nav, block controls, runtime block-kind badges, Add block options and saved-template picker rows use local sprite icons through `iconSvg`; block-kind badges use `document`, `grid`, `image`, `hash`, `calculator`, `check`, `skill` and `lore`; template picker uses `copy`, `document`, `trash`, `arrow-left`; find-in-tree uses `search`, back uses `arrow-left` | `blockPopup`, `linkPopup`, `image-crop-popup`, `toolbarColorPopup` and `createMenu` use explicit popupManager lifecycle; the first-level Add block popup and saved-template picker have tokenized type/search styling; floating text toolbar is moved to the overlay layer for stable viewport positioning | Notion pages/slash commands, Confluence autocomplete, but keep local-first persistent HTML boundary. |
| Properties and sheets | `.card-properties-block[data-property-ui-migration="0.0.1.8.11.4"]`, `.card-properties-grid`, `.card-property-field[data-property-variant]`, `.card-property-kind-badge`, `.character-sheet-block` | `styles/design-tokens.css` owns `--mow-property-*` / `--mow-field-*`; `styles/block-properties.css`, `styles/block-character-sheet.css`, `styles/block-character-effects.css`, `styles/ui.css` consume it | Settings uses local `settings`; field badges use local `hash`, `calculator`, `check`, `skill`, `grid`, `link`, `document` and `edit` sprite icons at runtime | `.property-settings-popup` uses explicit dialog overlay semantics; settings action buttons now use local sprite icons while keeping existing add-field/rules behavior | Notion databases for field organization, D&D Beyond/Foundry for sheet density and game-readable stats. |
| Campaign map and live scene | `.campaign-map-document`, `.campaign-map-stage`, `.campaign-map-toolbar`, tokens, shapes, fog canvas | `styles/campaign-map*.css`, `styles/campaign-map-popups.css`, `styles/campaign-map-initiative.css` | Toolbar and popup actions use a mixed icon/text set; do not add external icon packs | Generic `#campaignMapPopup` popups register as modal dialog overlays through `campaignMapPopupController`; `#campaignTokenPopup` registers as a non-modal popover and keeps delayed hover behavior local | Foundry scenes, Roll20 lighting, Owlbear scene/fog clarity. |
| Knowledge graph and canvas | `.knowledge-graph-document`, `.knowledge-graph-workbench`, `.knowledge-graph-canvas-stage`, node cards and edges | `styles/knowledge-graph.css` | Canvas controls are mixed text/symbol; future graph icons should use local sprite names | Node menu and connect popup now register through `popupManager` with shared `data-overlay-*` state; visual graph redesign remains a later owner phase | Obsidian Graph/Canvas and Miro frames: filters, node/edge tokens, grouping and navigation without becoming a separate whiteboard. |
| Task tracker | `.task-tracker-document`, board columns, task cards | `styles/task-tracker.css`, shared tokens as migration target | Minimal icon use today; future card actions should use the sprite consistently | Uses board/task interaction surfaces rather than central popup baseline today | Linear boards, Trello cards/checklists, GitHub Projects saved-view discipline. |
| Shared primitives and overlays | `.mow-button`, `.mow-icon-button`, `.mow-input`, `.mow-select`, `.mow-checkbox`, `.mow-segmented`, `.mow-toolbar`, `.mow-panel`, `.mow-popover`, `.mow-tooltip`, `.mow-toast`, `popupManager` | `styles/ui.css`, `styles/design-tokens.css`, `styles/app-topbar.css`, `styles/brand-system.css`, `styles/popup*.css` | Local sprite is the source of truth; no Lucide package dependency in runtime | `popupManager` is the shared lifecycle for current feature overlays: modal focus markers/trap/return, menu keyboard behavior, editor popups, campaign map generic/token popups, item picker, onboarding and Knowledge Graph node/connect overlays; old feature styling remains migration target for owning phases | Radix primitives, Atlassian tokens/motion, Fluent token naming. |

## CSS Inventory Baseline

Foundation files that should grow carefully:

- `styles/design-tokens.css` for semantic color, spacing, density, motion, component tokens, primitive tokens and the `--mow-shell-*` AppShell foundation.
- `styles/ui.css` for shared primitives during the transition, currently including Button, IconButton, Input, Select, Checkbox, SegmentedControl, Toolbar, Separator, Panel and Popover.
- `styles/brand-system.css` for temporary compatibility skin; it should shrink as feature files migrate.
- `styles/layout.css`, `styles/app-topbar.css`, `styles/sidebar.css` and `styles/editor.css` for current shell/editor composition.

High-risk feature CSS that should not receive broad restyles without a specific migration phase:

- `styles/block-properties.css`
- `styles/campaign-map-popups.css`
- `styles/knowledge-graph.css`
- `styles/task-tracker.css`
- `styles/popup*.css`
- `styles/campaign-map*.css`

## Icon Inventory Baseline

- Current source of truth: `js/core/icons.js` and `iconSvg(name)`.
- Current runtime policy: use local SVG sprite names; do not add external icon packages for normal controls.
- Current transition risk: older surfaces still use text, glyphs or inline SVG fragments. Future migration should consolidate them only while touching the owner surface.
- Required future icon targets: field type, lock, formula, relation, graph node action, map layer/fog, task card action and tree entity icons.

## Popup Inventory Baseline

Shared lifecycle:

- `js/ui/popupManager.js`
- `openPopupNearAnchor`
- `openPopupAtPoint`
- `registerPopup`
- `closePopup`
- `data-overlay-modal`
- modal Tab focus trap
- modal focus return
- first tooltip consumers through `data-tooltip`
- operation progress toast markers
- first editor feature popup lifecycle consumers:
  - `blockPopup`
  - `linkPopup`
  - `property-settings-popup`
  - `image-crop-popup`
  - `toolbarColorPopup`
- generic campaign map popup lifecycle consumer:
  - `campaignMapPopupController` / `#campaignMapPopup`
- closing overlay lifecycle consumers:
  - `campaignMapTokenPopupController` / `#campaignTokenPopup`
  - `itemSetPicker`
  - `onboardingPopup`
  - Knowledge Graph node menu and connect details popup

Current overlay visual polish to migrate later:

- AppShell Settings/Tools, create menu and tree context menu visual styling during AppShell/core content phases.
- Wiki preview and remaining editor overlay visual styling during core content migration.
- Remaining campaign map contextual visual polish during campaign map migration.
- Knowledge Graph overlay visual polish during Knowledge Graph migration.
- App settings/tools popovers and component catalogue popover remain the current shared primitive/overlay reference.

## Migration Gate For Future Phases

Before a UI migration patch:

1. Name the system row from this document.
2. Name the screenshot attachment that should change.
3. Check the reference direction for that system.
4. Keep business logic out of visual migration unless the active plan explicitly says otherwise.
5. Run the focused browser test for the surface plus `npm run test:browser`.
6. Update this document and the work log if the baseline changes intentionally.

## Current Boundary

`0.0.1.8.6` is complete when the baseline manifest exists, the visual smoke produces the listed attachments, and an automated guard keeps the manifest synchronized with the test. It is not complete design migration; that starts in later phases.
