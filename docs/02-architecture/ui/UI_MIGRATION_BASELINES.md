---
summary: "Migration Phase 0 UI baseline manifest for visual redesign work."
read_when:
  - "Before migrating AppShell, tree, editor, properties, map, graph, task tracker or overlays"
  - "Before updating visual-regression browser screenshots"
  - "When checking whether UI inventory, CSS inventory, icon inventory, popup inventory and screenshot baselines are synchronized"
owner_zone: "architecture"
---

# UI Migration Baselines

Status: `0.0.1.8.10` AppShell migration closed and corrected by `0.0.1.8.10.1`-`0.0.1.8.10.4`; `0.0.1.8.11` core content is closed at `Usable` level by `0.0.1.8.11.7`; `0.0.1.8.12` campaign map migration is closed at `Usable` level by `0.0.1.8.12.10`; `0.0.1.8.13` knowledge graph migration is closed at `Usable` level by `0.0.1.8.13.11`; `0.0.1.8.14` secondary screens are active with task tracker, Settings maintenance, Help/Support guide and World Package manager slices migrated through `0.0.1.8.14.5`.

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

`0.0.1.8.11.7` update: the AppShell/core-content baseline now includes a real `Поиск и команды` rail tool and `#commandPalette`. The palette opens from the rail or `Ctrl+K`, uses popupManager modal lifecycle, local sprite icons, deep PageRepository search results with paths/matched fields/excerpts, and existing app action hooks for open workspace, create page/folder, tree toggle, settings and tools. Visual smoke now captures `visual-command-palette`.

`0.0.1.8.12.1` / `0.0.1.8.12.8` update: the Campaign map baseline now includes `.campaign-map-controls[data-map-ui-migration="0.0.1.8.12.8"]`. The toolbar is an accessible `role="toolbar"` surface with semantic creation, scene, tools and live-session groups, but the visible surface is a thin Photoshop-like icon-only strip with local sprite icons, hover/focus tooltips, shared-token styling and `aria-pressed` active states for grid/pan/drawing/fog. Pan/`Рука` belongs to tools, future tools should extend compact icon groups, and the map title is a compact chip that must not consume the toolbar row. Visual smoke keeps using `visual-campaign-map`, and `campaign-map-ui.spec.mjs` guards the toolbar structure, compact height, icon-only buttons, tooltip coverage, right-edge fit and absence of duplicate scene/layer panels in default render.

`0.0.1.8.12.2` update: the Campaign map baseline now includes `#campaignMapPopup[data-map-popup-ui-migration="0.0.1.8.12.2"]` and `.campaign-map-popup-shell[data-map-popup-ui-migration="0.0.1.8.12.2"]`. Add/picker, grid, drawing, fog, shapes, layers, initiative and music popups share one compact map overlay frame with a local icon header, readable section labels, per-popup aria labels and preserved legacy action selectors. `campaign-map-ui.spec.mjs` guards the migrated popup frame and section markers.

`0.0.1.8.12.3` update: the Campaign map baseline introduced `.campaign-map-selection-dock[data-map-selection-ui-migration="0.0.1.8.12.3"]` as a runtime-only selection surface inside `.campaign-map-stage`. It is superseded visually by the `0.0.1.8.12.8` right-side property Inspector, but the safe remove and group-action contract remains: `Убрать` removes selected map objects from the current map only and must not delete the linked card/page.

`0.0.1.8.12.4` update: the Campaign map baseline now includes `.campaign-map-layer-dock[data-map-layer-dock-ui-migration="0.0.1.8.12.4"]`. The dock is runtime-only inside `.campaign-map-stage`, summarizes token/object/shape/hidden counts and per-layer content, can toggle editable layer visibility and opens the existing Layers popup for deeper controls. `campaign-map-ui.spec.mjs` guards the dock marker, counters, visibility toggle, popup path and post-remove refresh, and `visual-campaign-map` now captures the layer/object dock together with the selected-object dock.

`0.0.1.8.12.5` update: the Campaign map baseline now includes `.campaign-map-scene-inspector[data-map-scene-inspector-ui-migration="0.0.1.8.12.5"]`. The inspector is runtime-only inside `.campaign-map-stage`, summarizes map background, grid and fog state, opens the existing map-image, Grid and Fog flows and is excluded from serialized map HTML. `campaign-map-ui.spec.mjs` guards the marker, runtime cleanup, popup paths and state refresh, and `visual-campaign-map` now captures the scene inspector with the layer/object and selected-object docks.

`0.0.1.8.12.6` update: the Campaign map selected-object baseline now includes advanced contextual action coverage for multi-selection. The existing `.campaign-map-selection-dock[data-map-selection-ui-migration="0.0.1.8.12.3"]` shows visible/hidden counters for selected token/shape groups and exposes direct group `Скрыть` / `Показать` actions through the existing `CampaignMapStore`, with one save/sync per action and no saved runtime HTML. `campaign-map-ui.spec.mjs` guards mixed selected token/shape state, group hide, group show and model/DOM agreement.

`0.0.1.8.12.7` post-review correction: the previous layer/object dock and scene-state inspector modules remain historical/internal references, but default `renderCampaignMap()` must not create them. `visual-campaign-map` no longer manually renders the layer/object dock or scene-state inspector.

`0.0.1.8.12.8` post-review correction: current visible map baseline is compact title chip + thin icon-only toolbar + shared popups + right-side property Inspector when something is selected. Click opens editable Inspector fields for token/shape identity, transform, visibility and style; right-click suppresses the browser menu and opens the compact custom object action popup near the pointer. Shape rotation is part of the persistent model through `data-rotation`.

`0.0.1.8.12.9` post-review correction: current visible map toolbar baseline became a graphic-editor split layout: scene/session actions in the top bar, canvas tools in a left vertical rail, no return to one mixed top toolbar.

`0.0.1.8.12.10` post-review correction: current visible map toolbar baseline uses full-size workbench zones. `.campaign-map-controls[data-map-toolbar-region="scene-bar"][data-map-ui-migration="0.0.1.8.12.10"]` owns a full-width scene/session bar, and `.campaign-map-tool-rail[data-map-toolbar-region="tool-rail"][data-map-ui-migration="0.0.1.8.12.10"]` owns a full-height canvas rail inside `.campaign-map-stage`. The rail is runtime-only, icon-only, sectioned by `data-map-tool-section`, guarded for width/height/overflow/tooltip/aria coverage, must not show internal scrollbars, and uses `.campaign-map-toolbar-tooltip` as a body-level runtime tooltip layer so labels are not clipped by button boxes.

`0.0.1.8.13.1` update: the Knowledge graph baseline now includes `.knowledge-graph-workbench[data-knowledge-graph-migration="phase-7-slice"]`, visible/total/hidden filterbar counters, a `.knowledge-graph-canvas-slice-note` when the current canvas is not the whole world, local sprite icons in graph toolbar/node metadata and tokenized domain markers on node cards. `knowledge-graph.spec.mjs` guards standard-slice hidden nodes, full-view canvas limit state and search-refine focus behavior.

`0.0.1.8.13.2` update: the Knowledge graph baseline now includes selected-node edge states on `.knowledge-graph-canvas-edge[data-edge-state]`, related/muted node classes, and `.knowledge-graph-canvas-inspector` as a workbench-local dock. The inspector shows identity, incoming/outgoing visible counts, pinned status, relationship rows and `Открыть` / `Соседи` actions. It is not the AppShell right panel and must not overlay the canvas in a way that blocks drag or right-click. `knowledge-graph.spec.mjs` guards selected-node inspector content, active/muted edge states, related node styling and context-menu anchor correction.

`0.0.1.8.13.3` update: the Knowledge graph baseline now includes `.knowledge-graph-node-menu[data-knowledge-graph-overlay-ui="0.0.1.8.13.3"]` and `.knowledge-graph-connect-popup[data-knowledge-graph-overlay-ui="0.0.1.8.13.3"]`. Node actions are grouped inside a dark editor-grade context menu, manual relationship editing is compact enough for three visible rows without clipped controls, and connection creation uses the same icon/header/field language. Visual smoke now captures `visual-knowledge-graph-node-menu.png`.

`0.0.1.8.13.4` update: the Knowledge graph first layer should be laconic. Filter status is a short chip, slice counts render as a visual meter with detailed numbers only in `aria-label` / `title`, toolbar/filter/node actions are icon-first, the selected-node inspector uses short relation chips instead of a visible stat grid, and node-menu relationship editing is collapsed behind `Связи` until the user asks for it.

`0.0.1.8.13.5` update: the Knowledge graph CSS baseline is no longer one monolith. `styles/knowledge-graph.css` owns the document, workbench, toolbar/filterbar, canvas and node-card base; `styles/knowledge-graph-slice.css` owns slice meters and hidden-slice notes; `styles/knowledge-graph-inspector.css` owns the selected-node inspector dock; `styles/knowledge-graph-overlays.css` owns the connect banner/popup and node context menu. This is the CSS side of `BI-017`; JavaScript split and lifecycle bridge work remain open.

`0.0.1.8.13.6` update: the Knowledge graph JavaScript baseline now has first owner modules outside the page monolith. `js/wiki/knowledgeGraphCanvasInspector.js` owns selected-node inspector render/update helpers, `js/wiki/knowledgeGraphCanvasIcons.js` owns graph node icon mapping, and `js/wiki/knowledgeGraphLabels.js` owns relationship labels/editable type options. `knowledgeGraphPage.js` still owns canvas rendering, actions, overlays and persistence until the remaining `BI-017` / `BI-018` work.

`0.0.1.8.13.7` update: the Knowledge graph JavaScript baseline now includes `js/wiki/knowledgeGraphCanvasControls.js` for the filterbar, readable view presets, slice meter, hidden-reason labels and canvas layout buttons. The controls module receives page-title lookup from the page layer and does not read global `state` directly.

`0.0.1.8.13.8` update: the Knowledge graph JavaScript baseline now includes `js/wiki/knowledgeGraphCanvasRenderer.js` for visible-node fallback, canvas empty state, SVG edges, edge labels and node-card HTML. The renderer consumes the canvas model/connect state and remains event-free; `knowledgeGraphPage.js` still owns action/event/overlay/persistence work until the remaining `BI-017` / `BI-018` work.

`0.0.1.8.13.9` update: the Knowledge graph JavaScript baseline now includes `js/wiki/knowledgeGraphCanvasActions.js` for runtime filter reads, layout/filter/slice actions and zoom/fit toolbar actions. The actions module receives render/transform callbacks from the page layer and remains free of global state reads, event registration and persistence writes.

`0.0.1.8.13.10` update: the Knowledge graph JavaScript baseline now includes `js/wiki/knowledgeGraphCanvasOverlays.js` for connect-state reads, node/connect popup controller registration, node-menu show/hide, node-menu actions, connect-popup actions, relationship panel toggling and overlay target detection. The overlays module receives page opening, relationship creation, render and view-state callbacks from the page layer and remains free of global state reads, page-level event registration and persistence writes.

`0.0.1.8.13.11` update: the Knowledge graph JavaScript baseline now includes `js/wiki/knowledgeGraphRelationshipMenu.js` for relationship/context-menu HTML, `js/wiki/knowledgeGraphViewState.js` for view-state script helpers and `js/wiki/knowledgeGraphCommandBridge.js` for manual relationship persistence through `PageRecord`, `PageCommandService` command events and the write queue. `knowledgeGraphPage.js` remains the coordinator for events, graph history, drag/pan, selection and page lookup.

`0.0.1.8.14.3` update: the Help/Support baseline now includes `#onboardingPopup[data-help-ui-migration="0.0.1.8.14.3"]` and `#appToolsPopup[data-tools-ui-migration="0.0.1.8.14.3"]`. Tools help routes are compact icon rows, and the Help popup has internal section navigation, status chips and support cards.

`0.0.1.8.14.5` update: the World Package baseline now includes `#worldPackagePopup[data-world-package-ui-migration="0.0.1.8.14.5"]` opened from Tools. The manager is a real page-only import/export surface for branch/world export, saved package library, JSON import preview, backup-gated apply and non-destructive conflict modes (`Стоп`, `Только новые`, `Копии`). Asset and rulePackage contents remain preview blockers until their apply workflows are implemented.

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
| `visual-app-settings-maintenance.png` | Settings maintenance popup | `#appSettingsPopup[data-settings-ui-migration="0.0.1.8.14.2"]` after opening Settings | Captures the migrated secondary-screen maintenance surface with appearance, backup, asset health and diagnostics sections, local sprite actions and data-safety markers. |
| `visual-sidebar-tree.png` | Sidebar and tree zone | `.sidebar` | Captures navigation density, search/create controls, tree rows and sidebar spacing. |
| `visual-command-palette.png` | Command palette and deep search | `#commandPalette` after rail open and query input | Captures the global command/search surface, local icons, path/matched-field metadata, excerpt density and modal overlay styling. |
| `visual-card-editor.png` | Card editor | `.editor-surface` after `createCardShellTemplate()` | Captures hero/header, portrait slot, tags/aliases and text block rhythm. |
| `visual-add-block-popup.png` | Add block popup | `#blockPopup` opened from `.add-block-btn` after `renderCustomBlocks()` | Captures the first-level block insertion surface, local sprite icons, focus state, spacing and overlay density. |
| `visual-properties-sheet.png` | Properties block | `.card-properties-block` after `createPropertiesBlock({ cardType: 'character' })` | Captures field grid, settings affordance, labels, values and resize handles. |
| `visual-properties-popup.png` | Properties overlay | `.property-settings-popup` opened from the real settings button | Captures one high-risk legacy overlay before overlay migration. |
| `visual-campaign-map.png` | Campaign map | `.campaign-map-document` with compact title chip, full-width top scene/session bar, full-height left icon-only canvas tool rail, synthetic tokens, shape, right-side property Inspector and locked fog zone | Captures map stage, split toolbar, grid, tokens, hidden/player badge, editable selection Inspector, shape, fog layering, no toolbar scrollbars, unclipped floating tooltips and absence of duplicate scene/layer panels in default render. |
| `visual-knowledge-graph.png` | Knowledge graph | `.knowledge-graph-document` rendered from synthetic `state.pages` | Captures graph workbench, toolbar, filterbar, edges and node cards. |
| `visual-knowledge-graph-node-menu.png` | Knowledge graph node menu | `[data-knowledge-graph-node-menu]` after right-clicking a graph node with manual relationships | Captures the migrated node context menu, grouped actions and compact editable relationship rows. |
| `visual-task-tracker.png` | Task tracker | `.task-tracker-document[data-task-tracker-ui-migration="0.0.1.8.14.1"]` after `renderTaskTracker()` | Captures the migrated task board toolbar, local sprite actions, quiet counters, checklist progress, board columns, task cards and compact production-board density. |
| `visual-help-support.png` | Help, support and release guide | `#onboardingPopup[data-help-ui-migration="0.0.1.8.14.3"]` opened through Tools -> Support | Captures the migrated Help/Support surface with compact internal routes, status chips, release/support cards, local sprite icons and the current World Package MVP status. |
| `visual-world-packages.png` | World Package manager | `#worldPackagePopup[data-world-package-ui-migration="0.0.1.8.14.5"]` opened through Tools -> Пакеты мира | Captures the import/export manager with export controls, package library, JSON preview, backup/apply state, conflict-mode segmented control, local sprite icons, data-safety markers and compact two-column layout. |
| `visual-component-catalogue-popover.png` | Shared primitives and popover | `#componentCataloguePopover` opened through Tools -> Components | Captures shared Button, IconButton, Field, Toolbar, Panel and Popover states that future migrations should consume. |

## System Inventory Baseline

| System | Current UI baseline | Main CSS owners | Icon baseline | Popup / overlay baseline | Reference direction |
| --- | --- | --- | --- | --- | --- |
| AppShell and workbench | `.app[data-ui-foundation="0.0.1.8.7"][data-app-shell-migration="0.0.1.8.10"][data-core-content-migration="0.0.1.8.11.7"]`, `.app-nav-rail`, `#appCommandRailBtn`, `#commandPalette`, `.sidebar`, `.app-sidebar-resize-handle`, `.editor`, `.app-right-panel`, `.statusbar`, `[data-app-shell-zone]`, `[data-app-shell-surface="empty-workspace"]` | `styles/design-tokens.css` owns `--mow-shell-*`; `styles/layout.css`, `styles/app-topbar.css`, `styles/sidebar.css`, `styles/command-palette.css`, `styles/editor.css`, `styles/brand-system.css` consume it | Local sprite via `iconSvg`; current rail uses `folder-open` for `Дерево` show/hide, `search` for `Поиск и команды`, and the profile avatar as the bottom rail item; starter actions still use document/map/task/lore/link icons | App topbar popups, profile popup and command palette use `popupManager`; command palette is modal/dialog and opens from rail or `Ctrl+K`; icon-only shell controls use shared tooltip styling; empty-workspace start has no popup; reserved right-panel slot stays hidden unless an explicit future workflow opens it | VS Code workbench density, Obsidian command focus, Linear quiet search/action framing. |
| Sidebar, tree, search and navigation | `.sidebar`, `.tree`, `.tree-root-drop-zone`, `.tree-root-actions`, `[data-open-workspace]`, `[data-create-page]`, `[data-create-folder]`, `#searchInput` | `styles/sidebar.css`, `styles/tree.css`, `styles/popup-create.css`, `styles/scrollbar.css` | Local sprite via `iconSvg`; root actions use `plus` and `folder`, no-workspace tree action uses `folder-open`, tree rows keep entity icons | Create menu and tree context menu now use explicit dropdown/context-menu overlay kinds and shared keyboard lifecycle; root `+` opens the create menu, root folder action bypasses the menu for `type: folder` | VS Code explorer, Notion sidebar, Obsidian backlinks. |
| Card editor and blocks | `.editor-surface`, `.entity-layout`, `.card-shell`, `.editor-page-nav`, `.card-type-trigger`, `.template-block[data-block-type]`, `.block-kind-badge[data-runtime="true"]`, `.template-block select`, `.universal-list-kind-select`, `.block-drag-handle`, `.block-drag-preview`, `.block-drop-placeholder`, `.floating-toolbar[role="toolbar"]`, `#blockPopup[data-block-popup-view="type-picker"]`, `#createMenu[data-create-menu-view="templates"]` | `styles/design-tokens.css` owns `--mow-block-*` and `--mow-select-*`; `styles/editor.css`, `styles/document.css`, `styles/tags.css`, `styles/card-type.css`, `styles/blocks.css`, `styles/popup-create.css`, `styles/popup-block.css`, `styles/popup-block-type.css`, `styles/toolbar.css`, `styles/block-special.css`, `styles/block-table.css` consume it | Page nav, block controls, runtime block-kind badges, Add block options and saved-template picker rows use local sprite icons through `iconSvg`; block-kind badges use `document`, `grid`, `image`, `hash`, `calculator`, `check`, `skill` and `lore`; template picker uses `copy`, `document`, `trash`, `arrow-left`; find-in-tree uses `search`, back uses `arrow-left` | `blockPopup`, `linkPopup`, `image-crop-popup`, `toolbarColorPopup` and `createMenu` use explicit popupManager lifecycle; the first-level Add block popup and saved-template picker have tokenized type/search styling; floating text toolbar is moved to the overlay layer for stable viewport positioning | Notion pages/slash commands, Confluence autocomplete, but keep local-first persistent HTML boundary. |
| Properties and sheets | `.card-properties-block[data-property-ui-migration="0.0.1.8.11.4"]`, `.card-properties-grid`, `.card-property-field[data-property-variant]`, `.card-property-kind-badge`, `.character-sheet-block` | `styles/design-tokens.css` owns `--mow-property-*` / `--mow-field-*`; `styles/block-properties.css`, `styles/block-character-sheet.css`, `styles/block-character-effects.css`, `styles/ui.css` consume it | Settings uses local `settings`; field badges use local `hash`, `calculator`, `check`, `skill`, `grid`, `link`, `document` and `edit` sprite icons at runtime | `.property-settings-popup` uses explicit dialog overlay semantics; settings action buttons now use local sprite icons while keeping existing add-field/rules behavior | Notion databases for field organization, D&D Beyond/Foundry for sheet density and game-readable stats. |
| Campaign map and live scene | `.campaign-map-document`, `.campaign-map-stage`, `.campaign-map-controls[data-map-toolbar-region="scene-bar"][data-map-ui-migration="0.0.1.8.12.10"]`, `.campaign-map-tool-rail[data-map-toolbar-region="tool-rail"][data-map-ui-migration="0.0.1.8.12.10"]`, `.campaign-map-control-group[data-map-control-group][data-map-tool-section]`, `.campaign-map-toolbar-tooltip`, `#campaignMapPopup[data-map-popup-ui-migration="0.0.1.8.12.2"]`, `.campaign-map-popup-shell[data-map-popup-ui-migration="0.0.1.8.12.2"]`, `.campaign-map-popup-section[data-map-popup-section]`, `.campaign-map-properties-panel[data-map-selection-ui-migration="0.0.1.8.12.8"]`, tokens, shapes, fog canvas | `styles/design-tokens.css` owns `--mow-map-*`; `styles/campaign-map-layout.css`, `styles/campaign-map-responsive.css`, `styles/campaign-map-popups.css`, `styles/campaign-map-selection-inspector.css`, `styles/campaign-map-layer-dock.css`, `styles/campaign-map-scene-inspector.css`, `styles/campaign-map-initiative.css` consume it | Top scene bar, left tool rail, popup headers and Inspector actions use local sprite icons through `iconSvg` for add, character, creature, object, pan, grid, map image, layers, shapes, drawing, fog, presentation, initiative, music, visibility, duplicate and remove actions; do not add external icon packs | Generic `#campaignMapPopup` popups register as modal dialog overlays through `campaignMapPopupController` and now share the migrated map popup frame; `#campaignTokenPopup` registers as a non-modal popover for hover and custom right-click object actions; `.campaign-map-toolbar-tooltip` is a body-level runtime tooltip for map toolbar labels; the tool rail and property Inspector are runtime stage surfaces, while layer/object dock and scene inspector are not auto-created by default render after `0.0.1.8.12.7` | Foundry scenes, Roll20 lighting, Owlbear scene/fog clarity. |
| Knowledge graph and canvas | `.knowledge-graph-document`, `.knowledge-graph-workbench[data-knowledge-graph-migration="phase-7-slice"]`, `.knowledge-graph-canvas-stage`, `.knowledge-graph-canvas-slice-stats`, `.knowledge-graph-canvas-slice-note`, `.knowledge-graph-canvas-inspector`, `.knowledge-graph-node-menu[data-knowledge-graph-overlay-ui="0.0.1.8.13.3"]`, `.knowledge-graph-connect-popup[data-knowledge-graph-overlay-ui="0.0.1.8.13.3"]`, node cards and edges | `styles/knowledge-graph.css`, `styles/knowledge-graph-slice.css`, `styles/knowledge-graph-inspector.css`, `styles/knowledge-graph-overlays.css`; `js/wiki/knowledgeGraph.js` owns slice counts; `js/wiki/knowledgeGraphCanvasControls.js` owns filterbar/view presets/slice meter/layout buttons; `js/wiki/knowledgeGraphCanvasRenderer.js` owns visible-node fallback, empty state, SVG edges/labels and node-card HTML; `js/wiki/knowledgeGraphCanvasActions.js` owns runtime filter reads, layout/filter/slice actions and zoom/fit toolbar actions; `js/wiki/knowledgeGraphCanvasOverlays.js` owns connect-state reads, node/connect popup controllers and node/connect overlay actions; `js/wiki/knowledgeGraphCanvasInspector.js` owns selected-node inspector UI helpers; `js/wiki/knowledgeGraphCanvasIcons.js` owns node icon mapping; `js/wiki/knowledgeGraphLabels.js` owns relationship labels/options; `js/wiki/knowledgeGraphPage.js` still owns event registration, relationship-menu HTML/actions and persistence until the remaining `BI-017` / `BI-018` split | Graph toolbar, filters, node metadata, node-menu actions and connect-popup actions use icon-first local sprite controls; no external icon package | Node menu and connect popup register through `popupManager`; the node menu opens as a compact action palette and expands manual relationship editing only through `Связи`; slice details stay in accessibility labels/titles while the first layer uses chips/meters | Obsidian Graph/Canvas and Miro frames: filters, node/edge tokens, grouping and navigation without becoming a separate whiteboard. |
| Knowledge graph `0.0.1.8.13.11` ownership override | Same selectors as the Knowledge graph row above | Add `js/wiki/knowledgeGraphRelationshipMenu.js` for relationship/context-menu HTML, `js/wiki/knowledgeGraphViewState.js` for graph view-state script helpers and `js/wiki/knowledgeGraphCommandBridge.js` for manual relationship command persistence. `js/wiki/knowledgeGraphPage.js` now coordinates event registration, graph history, drag/pan, selection and page lookup. | Same icon contract as above | Relationship persistence uses `PageRecord` / `PageCommandService` / write queue instead of direct graph-page storage writes. | This row supersedes the old "still owns relationship-menu HTML/actions and persistence" note until the table is compacted in the next inventory pass. |
| Task tracker | `.task-tracker-document[data-task-tracker-ui-migration="0.0.1.8.14.1"]`, `.task-tracker-board[data-task-tracker-board-ui="0.0.1.8.14.1"]`, board toolbar, columns, task cards, checklist progress | `styles/task-tracker.css` consumes shared `--mow-*` tokens and stays the task tracker feature owner | Local sprite via `iconSvg` for board, grip, add, delete, count and checklist states | Uses board/task interaction surfaces rather than central popup baseline today; add-column now lives in the board toolbar, not as a large placeholder tile | Linear boards, Trello cards/checklists, GitHub Projects saved-view discipline. |
| Settings maintenance `0.0.1.8.14.2` | `#appSettingsPopup[data-settings-ui-migration="0.0.1.8.14.2"]`, `.app-settings-body > [data-settings-section]`, `[data-health-badge]`, `[data-backup-manifest-card]`, `[data-restore-preview]`, `[data-asset-verification-row]`, `[data-danger-zone]` | `styles/app-topbar.css` owns the migrated topbar Settings maintenance popup; `js/ui/settingsPanelUI.js` owns reusable maintenance section/action markup | Local sprite via `iconSvg` for settings, backup/copy, asset/image, diagnostics/check, search, restore and danger actions | PopupManager remains the lifecycle owner; backup/restore/asset/diagnostics business logic stays in existing services and panels | VS Code/Obsidian/Notion history and diagnostics references: visible status, recoverable history, preview/danger clarity. |
| Help, support and release guide `0.0.1.8.14.3` | `#appToolsPopup[data-tools-ui-migration="0.0.1.8.14.3"]`, `[data-help-tool-action]`, `#onboardingPopup[data-help-ui-migration="0.0.1.8.14.3"]`, `[data-help-route]`, `[data-help-status]`, `[data-help-card-state]` | `styles/onboarding.css` owns the Help/Support popup; `styles/app-topbar.css` owns the compact Tools menu rows; `js/ui/onboardingGuide.js` owns route data and rendering | Local sprite via `iconSvg` for help routes, release checks, diagnostics, backup/assets and World Package status | PopupManager remains the lifecycle owner; Tools closes before Help opens so topbar overlays do not stack. Import/export should be described as World Package page-only MVP, not a complete asset/rule migration. | VS Code command/help density, release-handoff checklists and support diagnostics clarity without creating a fake support dashboard. |
| World Package manager `0.0.1.8.14.5` | `#worldPackagePopup[data-world-package-ui-migration="0.0.1.8.14.5"]`, `[data-world-package-tool-action]`, `[data-world-package-section]`, `[data-world-package-preview]`, `[data-world-package-apply-state]`, `[data-world-package-resolution]`, `[data-world-package-conflict-mode]`, `[data-world-package-file]` | `styles/world-package.css` owns the manager popup; `js/ui/worldPackageManager.js` owns rendering and user actions; `js/worldPackage/worldPackageImportService.js` owns backup-gated page-only apply and conflict strategies | Local sprite via `iconSvg` for export/library/import/status/action rows and conflict-mode controls | PopupManager owns dialog lifecycle; apply is blocked until preview is valid, selected conflict strategy has an importable plan and a backup manifest is created. Asset/rulePackage contents stay blockers until future apply services exist. | VS Code import/export task panels, Notion template/library preview, backup-first data tools. |
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
- Campaign map Phase 6 contextual polish is closed; future map UI changes should come from concrete map bugs or later polish/cleanup, not from another broad Phase 6 repaint.
- Knowledge Graph Phase 7 migration is closed by `0.0.1.8.13.11`; future graph work should come from a concrete bug or `BI-026` concept rethink rather than more hidden Phase 7 owner-split work.
- App settings/tools popovers and component catalogue popover remain the current shared primitive/overlay reference; the Settings maintenance popup has its own migrated `0.0.1.8.14.2` baseline, Help/Support has its own `0.0.1.8.14.3` baseline and World Packages have their own `0.0.1.8.14.5` baseline. None should regress to unmarked ad hoc sections or plain text-only button lists.

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
