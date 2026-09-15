---
summary: "UI migration status and dated inventory history"
read_when:
  - "When investigating the dated implementation evidence extracted from UI_MIGRATION_BASELINES.md"
owner_zone: "archive"
---

# UI migration status and dated inventory history

Historical snapshot extracted from source HEAD `650507d2458c5a205cd34a6d555f296c56c3c9d9` on 2026-09-15. Current owner: [UI_MIGRATION_BASELINES.md](../../02-architecture/ui/UI_MIGRATION_BASELINES.md). Statements such as current, next, future and passed below describe their original dates; they are not current implementation instructions or release approval.

Status: `0.0.1.8.10` AppShell migration closed and corrected by `0.0.1.8.10.1`-`0.0.1.8.10.4`; `0.0.1.8.11` core content is closed at `Usable` level by `0.0.1.8.11.7`; `0.0.1.8.12` campaign map migration is closed at `Usable` level by `0.0.1.8.12.10`; `0.0.1.8.13` knowledge graph migration is closed at `Usable` level by `0.0.1.8.13.11`; `0.0.1.8.14` secondary screens are closed at `Usable` level by `0.0.1.8.14.7`; `0.0.1.8.15` polish/cleanup is closed at `Foundation` by `0.0.1.8.15.5`; `0.0.1.8.16` design-system visual evidence smoke is closed at `Foundation`; `0.0.1.8.17` owner visual completion is closed at `Usable` with primary/secondary evidence screenshots and a post-design handoff pause.

This document is the Phase 0 baseline manifest for the version-1 UI migration. It does not approve a mass redesign. It records the current surfaces, CSS ownership, icon/overlay risks and screenshot attachments that future migration phases must review against as evidence. Current automation must not automatically pixel-compare these attachments unless a future owner-approved strict pixel-baseline task adds that policy and infrastructure.

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

`0.0.1.8.12.4` historical update: the Campaign map briefly introduced `.campaign-map-layer-dock[data-map-layer-dock-ui-migration="0.0.1.8.12.4"]` as a runtime-only layer/object summary. It was superseded by the post-review graphic-editor map layout and retired from the active bundle by `0.0.1.8.15.4`; use the existing Layers popup and compact toolbar instead of recreating this always-visible stage panel.

`0.0.1.8.12.5` historical update: the Campaign map briefly introduced `.campaign-map-scene-inspector[data-map-scene-inspector-ui-migration="0.0.1.8.12.5"]` as a runtime-only scene-state summary. It was superseded by the compact scene/session bar plus Grid/Fog/map-image popups and retired from the active bundle by `0.0.1.8.15.4`.

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

`0.0.1.8.14.7` update: the World Package baseline now includes `#worldPackagePopup[data-world-package-ui-migration="0.0.1.8.14.7"]` opened from Tools. The manager supports branch/world export with readable asset payload embedding, saved package library, JSON import preview, backup-gated page/rulePackage/asset import, non-destructive conflict modes (`Стоп`, `Только новые`, `Копии`), embedded rulePackage apply into `rule-packages/`, asset preflight, binary asset payload copy, non-overwrite copied asset paths and imported page reference rewrite.

`0.0.1.8.15.1` update: the Settings appearance baseline now includes `body[data-theme="contrast"]` and a `contrast` segmented theme option. The app-shell browser spec verifies the contrast token preset, `aria-pressed` state on appearance controls and visual-safety baseline after switching theme/accent/background/scale. The broader Phase 9 baseline is also guarded by `tools/audit_ui_polish.mjs`, which blocks broad motion, large-surface blur and focus-removal regressions.

`0.0.1.8.15.2` update: the Phase 9 performance baseline now includes `tests/browser/ui-polish-performance.spec.mjs`. The spec renders a large virtualized tree, heavy campaign map, expanded Knowledge Graph canvas and dense task tracker board, then checks DOM counts and soft runtime budgets. This is a runtime baseline, not a new screenshot attachment.

`0.0.1.8.15.3` update: the visual baseline now includes theme/scale workbench attachments from `tests/browser/visual-regression.spec.mjs`. The new browser test builds one synthetic workspace with the left rail, expanded tree, hidden right panel and card editor, then captures dark compact, contrast large and contrast narrow states while checking horizontal overflow, shell state and required design tokens.

`0.0.1.8.15.4` update: the current campaign-map visual baseline explicitly excludes the retired layer/object dock and scene-state inspector. `js/editor/campaignMapLayerDock.js`, `js/editor/campaignMapSceneInspector.js`, `styles/campaign-map-layer-dock.css` and `styles/campaign-map-scene-inspector.css` are removed from the active bundle; `campaign-map-ui.spec.mjs` keeps the default-render guard that counts zero duplicate stage panels.

`0.0.1.8.15.5` update: Phase 9 closure sync is complete. Current visual baseline evidence is still attachment-based rather than pixel-locked; `0.0.1.8.16` should broaden fixed viewport/theme/scale screenshots across shell, tree, editor, Properties, map, graph, popups and empty/loading/error states.

`0.0.1.8.16` update: the design-system visual baseline now includes `visual-design-system-captures-fixed-viewport-state-matrix` in `tests/browser/visual-regression.spec.mjs`. It captures fixed viewport screenshots for empty shell/tree/error state, card editor Properties, campaign map popup plus selected-object Inspector, Knowledge Graph context overlay and empty task tracker board across dark/contrast themes and compact/large scale. The guard checks theme/scale markers, no horizontal overflow, labeled icon-only buttons, hidden right-panel foundation and absence of retired campaign-map stage panels.

`0.0.1.8.17` update: the owner visual-completion gate adds `visual-owner-completion-captures-primary-secondary-evidence` in `tests/browser/visual-regression.spec.mjs`. It captures the same prepared states at `1440x900` and `1280x720` for AppShell/tree empty/error/loading, editor plus Properties, campaign map popup/Inspector, Knowledge Graph context overlay, empty Task Tracker and Settings/diagnostics. The guard stays visual-only: it does not implement future backlog ideas or new visible Knowledge Graph behavior. The shared component catalogue is now dev/test-only instead of a normal Tools route, and map popup positioning checks that a popup does not overlap the right-side Inspector.

`0.0.1.10.29` / `RCB-012` update: current screenshot coverage is explicitly an evidence smoke policy, not strict pixel regression. `tests/browser/visual-regression.spec.mjs` combines structured browser assertions with screenshot attachments for human review. It does not use Playwright snapshot matchers, `pixelmatch` or committed golden PNG comparisons.

Owner-directed off-plan update, 2026-08-28: the first narrow true screenshot comparison layer now exists as approved popup baselines in `tests/browser/popup-visual-baselines.spec.mjs`. This does not approve a broad pixel-baseline policy; it records six owner-approved PNGs for three popup surfaces at normal and constrained desktop viewports.



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
- App settings/tools popovers and the dev/test-only component catalogue popover remain the current shared primitive/overlay reference; the Settings maintenance popup has its own migrated `0.0.1.8.14.2` baseline, Help/Support has its own `0.0.1.8.14.3` baseline and World Packages have their own `0.0.1.8.14.7` baseline. None should regress to unmarked ad hoc sections, normal user-facing primitive demos or plain text-only button lists.



## Current Boundary

`0.0.1.8.6` is complete when the baseline manifest exists, the visual smoke produces the listed attachments, and an automated guard keeps the manifest synchronized with the test. It is not complete design migration; that starts in later phases.
